import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  ACPSession,
  Agent,
  AgentCallbacks,
  AgentContext,
  Tool,
} from "@/components/agent-panel/types";
import { ToolRegistry } from "@/lib/native-agent/tools";
import { useAgentPanelStore } from "@/stores/agent-panel/store";

interface AcpEventPayload {
  agent_id: string;
  message: any;
}

interface InflightMessage {
  sessionId: string;
  agentId: string;
  callbacks: AgentCallbacks;
  context: AgentContext;
  autoApproveTools: boolean;
  requestId: number;
  responsePromise?: Promise<any>;
  collectedText: string;
  completed: boolean;
}

const DEFAULT_PROTOCOL_VERSION = 0.1;

const textFromContent = (content: Array<{ type: string; text?: string }>): string => {
  return content
    .map((item) => {
      if (item.type === "text" && item.text) {
        return item.text;
      }
      return "";
    })
    .join("");
};

class AcpAgent {
  private toolRegistry: ToolRegistry;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used in cleanup
  private unlisten?: () => void;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used for request tracking
  private nextRequestId = 1;
  private pendingRequests = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (reason: any) => void;
      expectResult: boolean;
    }
  >();
  private inflightMessages = new Map<string, InflightMessage>();
  private initializedAgents = new Set<string>();

  constructor() {
    this.toolRegistry = new ToolRegistry();
    // Initialize listener immediately in constructor
    this.setupListener();
  }

  private setupListener(): void {
    console.log("[ACP] Setting up listener in constructor");
    listen<AcpEventPayload>("acp-message", async (event) => {
      console.log("[ACP] ✅ Listener received event:", event);
      await this.handleEvent(event.payload);
    })
      .then((unlisten) => {
        this.unlisten = unlisten;
        console.log("[ACP] ✅ Listener setup complete");
      })
      .catch((err) => {
        console.error("[ACP] ❌ Failed to setup listener:", err);
      });
  }

  async initializeAgent(agent: Agent): Promise<void> {
    await this.ensureListener();

    if (this.initializedAgents.has(agent.id)) {
      console.log("[ACP] Agent already initialized:", agent.id);
      return;
    }

    console.log("[ACP] Initializing agent:", agent.id);

    if (!agent.command) {
      throw new Error("ACP agent is missing the command to start the server");
    }

    await invoke("start_acp_agent", {
      agentId: agent.id,
      command: agent.command,
      args: agent.args ?? [],
      env: agent.env ?? {},
    });

    const initializeRequest = {
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: DEFAULT_PROTOCOL_VERSION,
        clientCapabilities: {
          tools: {},
          fs: {
            readTextFile: true,
            writeTextFile: true,
          },
          terminal: true,
        },
        clientInfo: {
          name: "Athas",
          version: "0.1.0",
        },
      },
    };

    const { responsePromise } = await this.sendRequest(agent.id, initializeRequest, true);
    if (responsePromise) {
      await responsePromise;
    }

    // Mark agent as ready in the store
    useAgentPanelStore
      .getState()
      .updateAgent(agent.id, { status: "ready", errorMessage: undefined });

    this.initializedAgents.add(agent.id);
  }

  async processMessage(
    threadId: string,
    agent: Agent,
    userMessage: string,
    context: AgentContext,
    callbacks: AgentCallbacks,
  ): Promise<void> {
    console.log("[ACP] Processing message for agent:", agent.id);
    await this.initializeAgent(agent);
    console.log("[ACP] Agent initialized:", agent.id);

    const session = await this.ensureSession(threadId, agent, context);
    console.log("[ACP] Session ensured:", session.sessionId);

    const responsePromise = await this.sendSessionInput(
      agent,
      session,
      userMessage,
      context,
      callbacks,
    );
    console.log("[ACP] Session input sent, waiting for response");

    if (responsePromise) {
      await responsePromise;
      console.log("[ACP] Response received");
    }
  }

  private async ensureListener(): Promise<void> {
    // Listener is now setup in constructor, so this just waits for it
    console.log("[ACP] ensureListener called (listener already set up in constructor)");
    return Promise.resolve();
  }

  private async ensureSession(
    threadId: string,
    agent: Agent,
    context: AgentContext,
  ): Promise<ACPSession> {
    const store = useAgentPanelStore.getState();
    const existing = store.getACPSession(threadId);
    if (existing && existing.agentId === agent.id) {
      return existing;
    }

    let response: any;
    try {
      const enabledTools = context.enabledTools ?? [];
      const toolDefinitions = enabledTools
        .map((toolName) => this.toolRegistry.getTool(toolName))
        .filter((tool): tool is Tool => Boolean(tool))
        .map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.input_schema,
        }));

      const sessionParams: Record<string, any> = {
        type: "chat",
        modelId: agent.modelId,
        systemPrompt: context.systemPrompt,
        tools: enabledTools,
      };

      if (toolDefinitions.length > 0) {
        sessionParams.toolDefinitions = toolDefinitions;
      }

      const { responsePromise } = await this.sendRequest(
        agent.id,
        {
          jsonrpc: "2.0",
          method: "session/new",
          params: {
            cwd: context.projectRoot || ".",
            mcpServers: [],
          },
        },
        true,
      );
      response = responsePromise ? await responsePromise : undefined;
    } catch (e: any) {
      const msg = (e?.message || "").toString().toUpperCase();
      const code = e?.code ?? e?.error?.code;
      if (msg.includes("AUTH") || code === 401 || code === -32001) {
        // Mark agent as requiring auth and bubble a friendly error
        useAgentPanelStore.getState().updateAgent(agent.id, {
          status: "error",
          errorMessage: "AUTH_REQUIRED",
        });
        throw new Error("ACP_AUTH_REQUIRED");
      }
      throw e;
    }
    const result = response?.result ?? response;
    if (!result?.sessionId) {
      throw new Error("ACP agent did not return a sessionId");
    }

    const session: ACPSession = {
      sessionId: result.sessionId,
      agentId: agent.id,
      model: result.model ?? {
        id: agent.modelId || "unknown",
        name: agent.modelId || "Unknown Model",
      },
      createdAt: new Date(),
    };

    store.setACPSession(threadId, session);

    return session;
  }

  private async sendSessionInput(
    agent: Agent,
    session: ACPSession,
    userMessage: string,
    context: AgentContext,
    callbacks: AgentCallbacks,
  ): Promise<Promise<any> | undefined> {
    const request = {
      jsonrpc: "2.0",
      method: "session/prompt",
      params: {
        sessionId: session.sessionId,
        prompt: [
          {
            type: "text",
            text: userMessage,
          },
        ],
      },
    };

    const { id, responsePromise } = await this.sendRequest(agent.id, request, true);

    this.inflightMessages.set(session.sessionId, {
      sessionId: session.sessionId,
      agentId: agent.id,
      callbacks,
      context,
      autoApproveTools: context.autoApproveTools,
      requestId: id,
      responsePromise,
      collectedText: "",
      completed: false,
    });

    return responsePromise;
  }

  private async handleEvent(payload: AcpEventPayload | undefined): Promise<void> {
    console.log("[ACP] handleEvent called with payload:", payload);

    if (!payload) {
      console.log("[ACP] Received empty payload");
      return;
    }

    const { agent_id: agentId, message } = payload;
    if (!message) {
      console.log("[ACP] Received payload without message");
      return;
    }

    console.log(
      "[ACP] Event from agent:",
      agentId,
      "message:",
      JSON.stringify(message).substring(0, 200),
    );

    const messageId = message.id as number | string | undefined;
    const hasId = typeof messageId === "number" || typeof messageId === "string";
    const isResponse = hasId && ("result" in message || "error" in message);

    if (isResponse) {
      console.log("[ACP] Response message, id:", messageId);
      const numericId = typeof messageId === "number" ? messageId : Number(messageId);
      const pending = Number.isNaN(numericId) ? undefined : this.pendingRequests.get(numericId);
      if (!pending) {
        console.log("[ACP] No pending request for id:", numericId);
        return;
      }

      if (!Number.isNaN(numericId)) {
        this.pendingRequests.delete(numericId);
      }

      if (message.error) {
        console.log("[ACP] Error in response:", message.error);
        pending.reject(message.error);
      } else {
        console.log("[ACP] Resolving pending request");
        pending.resolve(message);
      }

      if (message.result && message.id) {
        this.handleFinalResult(agentId, message.id, message.result);
      }
      return;
    }

    if (typeof message.method === "string") {
      console.log("[ACP] Method call:", message.method, "hasId:", hasId);
      if (hasId) {
        await this.handleRequest(agentId, messageId!, message.method, message.params);
      } else {
        await this.handleNotification(agentId, message.method, message.params);
      }
    }
  }

  private async handleRequest(
    agentId: string,
    id: number | string,
    method: string,
    params: any,
  ): Promise<void> {
    switch (method) {
      case "tools/list": {
        await this.respondWithToolList(agentId, id);
        break;
      }
      case "fs/read_text_file": {
        await this.handleReadTextFile(agentId, id, params);
        break;
      }
      case "fs/write_text_file": {
        await this.handleWriteTextFile(agentId, id, params);
        break;
      }
      case "session/request_permission": {
        await this.handleRequestPermission(agentId, id, params);
        break;
      }
      default: {
        await this.sendMessage(agentId, {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Unsupported request: ${method}`,
          },
        });
        break;
      }
    }
  }

  private handleFinalResult(agentId: string, requestId: number | string, result: any): void {
    const numericRequestId = typeof requestId === "number" ? requestId : Number(requestId);
    if (Number.isNaN(numericRequestId)) {
      return;
    }

    const inflight = Array.from(this.inflightMessages.values()).find(
      (entry) => entry.agentId === agentId && entry.requestId === numericRequestId,
    );

    if (!inflight) {
      return;
    }

    const output = result?.output;
    let finalText = "";

    if (output?.content) {
      finalText = textFromContent(output.content);
    }

    if (!finalText && inflight.collectedText) {
      finalText = inflight.collectedText;
    }

    this.completeInflight(inflight.sessionId, inflight, finalText);
  }

  private async handleNotification(agentId: string, method: string, params: any): Promise<void> {
    console.log("[ACP] Notification:", method, "params:", JSON.stringify(params).substring(0, 100));

    if (!params || typeof params.sessionId !== "string") {
      console.log("[ACP] Missing sessionId in notification");
      return;
    }

    const inflight = this.inflightMessages.get(params.sessionId);
    if (!inflight) {
      console.log("[ACP] No inflight message for session:", params.sessionId);
      return;
    }

    switch (method) {
      case "session/update": {
        await this.handleSessionUpdate(agentId, inflight, params);
        break;
      }
      case "output/text": {
        const delta = params.delta ?? "";
        if (delta) {
          console.log("[ACP] Text delta:", delta.substring(0, 50));
          inflight.collectedText += delta;
          inflight.callbacks.onChunk(delta);
        }
        break;
      }
      case "output/thinking": {
        console.log("[ACP] Thinking notification (ignored)");
        // Claude Code may stream thinking tokens; ignore for now.
        break;
      }
      case "output/complete": {
        console.log("[ACP] Output complete");
        this.completeInflight(inflight.sessionId, inflight, inflight.collectedText);
        break;
      }
      case "tools/use": {
        console.log("[ACP] Tool call");
        await this.handleToolCall(agentId, inflight, params);
        break;
      }
      case "output/error": {
        const errorMessage = params.error?.message || "Unknown error";
        console.log("[ACP] Output error:", errorMessage);
        inflight.callbacks.onError(errorMessage);
        inflight.completed = true;
        this.inflightMessages.delete(params.sessionId);
        break;
      }
      default:
        console.log("[ACP] Unknown notification method:", method);
        break;
    }
  }

  private async handleSessionUpdate(
    agentId: string,
    inflight: InflightMessage,
    params: any,
  ): Promise<void> {
    const update = params.update;
    if (!update) {
      console.log("[ACP] session/update missing update field");
      return;
    }

    // Handle both old style (sessionUpdate) and new style (kind)
    const updateType = update.sessionUpdate || update.kind;

    if (!updateType) {
      console.log(
        "[ACP] session/update missing type field, update:",
        JSON.stringify(update).substring(0, 200),
      );
      return;
    }

    console.log("[ACP] Session update type:", updateType);

    switch (updateType) {
      case "agent_message_chunk": {
        // Agent is streaming a response
        const content = update.content;
        if (content && content.type === "text" && content.text) {
          console.log("[ACP] Agent message chunk:", content.text.substring(0, 50));
          inflight.collectedText += content.text;
          inflight.callbacks.onChunk(content.text);
        }
        break;
      }
      case "agent_thought_chunk": {
        // Agent is thinking (optional to display)
        console.log("[ACP] Agent thinking (ignored for now)");
        break;
      }
      case "user_message_chunk": {
        // Echo of user's message (can be ignored)
        console.log("[ACP] User message chunk (ignored)");
        break;
      }
      case "tool_call": {
        // Tool is being called
        console.log("[ACP] 🔧 Tool call:", {
          title: update.title,
          toolName: update.toolName,
          toolCallId: update.toolCallId,
          input: update.input,
        });
        await this.handleToolCall(agentId, inflight, update);
        break;
      }
      case "tool_call_update": {
        // Tool call status update
        console.log("[ACP] Tool call update:", update.status);
        break;
      }
      case "available_commands_update": {
        // Available slash commands updated
        console.log("[ACP] Available commands updated");
        break;
      }
      case "read": {
        // File read operation
        console.log("[ACP] 📖 File read:", {
          locations: update.locations,
          content: update.content?.length || 0,
        });

        // Create a tool call for file read
        const toolCallId = `read_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const locations = update.locations || [];
        const paths = locations.map((loc: any) => loc.path).join(", ");

        inflight.callbacks.onToolStart(toolCallId, "Read File", { locations });

        // Simulate completion (we'll get the actual content later)
        setTimeout(() => {
          const output = update.content || `Read ${locations.length} file(s): ${paths}`;
          inflight.callbacks.onToolComplete(toolCallId, "Read File", output);
        }, 100);
        break;
      }
      case "search": {
        // Search operation
        console.log("[ACP] 🔍 Search:", {
          pattern: update.rawInput?.pattern,
          locations: update.locations?.length || 0,
        });

        // Create a tool call for search
        const toolCallId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const pattern = update.rawInput?.pattern || "unknown";

        inflight.callbacks.onToolStart(toolCallId, "Search Files", { pattern });

        // Simulate completion
        setTimeout(() => {
          const locations = update.locations || [];
          const output = `Found ${locations.length} results for "${pattern}"`;
          inflight.callbacks.onToolComplete(toolCallId, "Search Files", output);
        }, 100);
        break;
      }
      default:
        // Check if this is a text content update (common pattern)
        if (update.content) {
          const content = update.content;

          // Handle single text content
          if (content.type === "text" && content.text) {
            console.log("[ACP] Text content:", content.text.substring(0, 50));
            inflight.collectedText += content.text;
            inflight.callbacks.onChunk(content.text);
            break;
          }

          // Handle array of content
          if (Array.isArray(content)) {
            for (const item of content) {
              if (item.type === "text" && item.content?.text) {
                console.log("[ACP] Text content (array):", item.content.text.substring(0, 50));
                inflight.collectedText += item.content.text;
                inflight.callbacks.onChunk(item.content.text);
              }
            }
            break;
          }
        }

        console.log(
          "[ACP] Unknown session update type:",
          updateType,
          "update:",
          JSON.stringify(update).substring(0, 200),
        );
        break;
    }
  }

  private async respondWithToolList(agentId: string, id: number | string): Promise<void> {
    const tools = this.toolRegistry.getAllTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.input_schema,
    }));

    await this.sendMessage(agentId, {
      jsonrpc: "2.0",
      id,
      result: {
        tools,
      },
    });
  }

  private async handleReadTextFile(
    agentId: string,
    id: number | string,
    params: any,
  ): Promise<void> {
    try {
      const content = await invoke<string>("read_file_content", {
        path: params.path,
        line: params.line,
        limit: params.limit,
      });

      await this.sendMessage(agentId, {
        jsonrpc: "2.0",
        id,
        result: {
          content,
        },
      });
    } catch (error: any) {
      await this.sendMessage(agentId, {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32000,
          message: error.message || "Failed to read file",
        },
      });
    }
  }

  private async handleWriteTextFile(
    agentId: string,
    id: number | string,
    params: any,
  ): Promise<void> {
    try {
      await invoke("write_file_content", {
        path: params.path,
        content: params.content,
      });

      await this.sendMessage(agentId, {
        jsonrpc: "2.0",
        id,
        result: {},
      });
    } catch (error: any) {
      await this.sendMessage(agentId, {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32000,
          message: error.message || "Failed to write file",
        },
      });
    }
  }

  private async handleRequestPermission(
    agentId: string,
    id: number | string,
    params: any,
  ): Promise<void> {
    // Auto-approve for now - could add UI prompt later
    console.log("[ACP] Permission requested:", params.tool, params.description);

    await this.sendMessage(agentId, {
      jsonrpc: "2.0",
      id,
      result: {
        optionId: "allow_once", // Auto-approve once
      },
    });
  }

  private completeInflight(sessionId: string, inflight: InflightMessage, finalText: string): void {
    if (inflight.completed) {
      return;
    }

    inflight.completed = true;
    inflight.callbacks.onComplete(finalText);
    this.inflightMessages.delete(sessionId);
  }

  private async sendMessage(agentId: string, payload: any): Promise<void> {
    await invoke("send_acp_request", {
      agentId,
      request: payload,
    });
  }

  async closeSession(threadId: string, existingSession?: ACPSession): Promise<void> {
    const store = useAgentPanelStore.getState();
    const session = existingSession ?? store.getACPSession(threadId);
    if (!session) {
      return;
    }

    this.inflightMessages.delete(session.sessionId);

    try {
      const { responsePromise } = await this.sendRequest(
        session.agentId,
        {
          jsonrpc: "2.0",
          method: "sessions/delete",
          params: {
            sessionId: session.sessionId,
          },
        },
        true,
      );

      if (responsePromise) {
        await responsePromise.catch(() => {});
      }
    } catch (error) {
      console.warn("Failed to delete ACP session", error);
    }

    if (store.getACPSession(threadId)) {
      store.clearACPSession(threadId);
    }
  }

  async stopAgent(agentId: string): Promise<void> {
    if (!this.initializedAgents.has(agentId)) {
      return;
    }

    this.initializedAgents.delete(agentId);

    for (const [sessionId, inflight] of this.inflightMessages.entries()) {
      if (inflight.agentId === agentId) {
        inflight.completed = true;
        this.inflightMessages.delete(sessionId);
      }
    }

    this.pendingRequests.clear();

    try {
      await invoke("stop_acp_agent", { agentId });
    } catch (error) {
      console.warn("Failed to stop ACP agent", error);
    }

    useAgentPanelStore.getState().updateAgent(agentId, { status: "idle", errorMessage: undefined });
  }

  private async handleToolCall(
    agentId: string,
    inflight: InflightMessage,
    params: any,
  ): Promise<void> {
    const { callbacks, context } = inflight;
    const toolName: string | undefined = params.toolName;
    const toolCallId: string | undefined = params.toolCallId;
    const input = params.input;

    if (!toolName || !toolCallId) {
      return;
    }

    console.log("[ACP] 🔧 onToolStart:", toolCallId, toolName, input);
    callbacks.onToolStart(toolCallId, toolName, input);

    let approved = inflight.autoApproveTools;
    if (!approved) {
      approved = await callbacks.onToolApprovalRequest(toolName, input);
    }

    if (!approved) {
      console.log("[ACP] 🚫 onToolRejected:", toolCallId, toolName);
      callbacks.onToolRejected(toolCallId, toolName);
      await this.sendToolResult(agentId, inflight, toolCallId, [
        {
          type: "text",
          text: "Tool execution rejected by user",
        },
      ]);
      return;
    }

    try {
      const result = await this.toolRegistry.execute(toolName, input, {
        workspaceRoot: context.projectRoot,
        activeFile: context.activeFile,
        openFiles: context.openFiles,
      });

      console.log("[ACP] ✅ onToolComplete:", toolCallId, toolName, result);
      callbacks.onToolComplete(toolCallId, toolName, result);

      const formattedResult = Array.isArray(result)
        ? result
        : [
            {
              type: "text",
              text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
            },
          ];

      await this.sendToolResult(agentId, inflight, toolCallId, formattedResult);
    } catch (error: any) {
      const message = error?.message || "Tool execution failed";
      console.log("[ACP] ❌ onToolError:", toolCallId, toolName, message);
      callbacks.onToolError(toolCallId, toolName, message);

      await this.sendToolResult(
        agentId,
        inflight,
        toolCallId,
        [
          {
            type: "text",
            text: message,
          },
        ],
        true,
      );
    }
  }

  private async sendToolResult(
    agentId: string,
    inflight: InflightMessage,
    toolCallId: string,
    content: Array<{ type: string; text?: string }>,
    isError = false,
  ): Promise<void> {
    const request = {
      jsonrpc: "2.0",
      method: "tools/result",
      params: {
        sessionId: inflight.sessionId,
        toolCallId,
        content,
        isError,
      },
    };

    await this.sendRequest(agentId, request, false);
  }

  private async sendRequest(
    agentId: string,
    request: any,
    expectResult: boolean,
  ): Promise<{ id: number; responsePromise?: Promise<any> }> {
    const requestWithId = { ...request };
    if (requestWithId.id === undefined) {
      requestWithId.id = this.nextRequestId++;
    }

    let responsePromise: Promise<any> | undefined;
    if (expectResult) {
      responsePromise = new Promise((resolve, reject) => {
        this.pendingRequests.set(requestWithId.id, {
          resolve,
          reject,
          expectResult,
        });
      });
    }

    await invoke("send_acp_request", {
      agentId,
      request: requestWithId,
    });

    return { id: requestWithId.id, responsePromise };
  }
}

let acpAgentInstance: AcpAgent | null = null;

export function getAcpAgent(): AcpAgent {
  if (!acpAgentInstance) {
    console.log("[ACP] Creating new AcpAgent instance (singleton)");
    acpAgentInstance = new AcpAgent();
  } else {
    console.log("[ACP] Returning existing AcpAgent instance");
  }
  return acpAgentInstance;
}
