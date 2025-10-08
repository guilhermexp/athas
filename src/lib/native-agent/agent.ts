import Anthropic from "@anthropic-ai/sdk";
import type { AgentCallbacks, AgentContext } from "@/components/agent-panel/types";
import { retry } from "@/lib/utils/retry";
import { getProviderApiToken } from "@/utils/provider-utils";
import { buildAgentContext, buildSystemPrompt } from "./context-builder";
import { ToolRegistry } from "./tools";

/**
 * Native Agent - Built-in agent using Anthropic Claude
 * Based on Zed's native agent implementation
 */

export class NativeAgent {
  private anthropic: Anthropic | null = null;
  private toolRegistry: ToolRegistry;
  private apiKey: string | null = null;
  private abortController: AbortController | null = null;

  constructor() {
    this.toolRegistry = new ToolRegistry();
  }

  /**
   * Cancel the current streaming request
   */
  cancelStreaming(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  async initialize(): Promise<void> {
    // Get Anthropic API key
    try {
      this.apiKey = await getProviderApiToken("anthropic");
      if (this.apiKey) {
        this.anthropic = new Anthropic({
          apiKey: this.apiKey,
          dangerouslyAllowBrowser: true,
        });
      }
    } catch (error) {
      console.error("Failed to get Anthropic API key:", error);
    }
  }

  async processMessage(
    userMessage: string,
    context: AgentContext,
    callbacks: AgentCallbacks,
  ): Promise<void> {
    if (!this.anthropic) {
      await this.initialize();
      if (!this.anthropic) {
        callbacks.onError("Anthropic API key not found. Please add it in settings.");
        return;
      }
    }

    try {
      // Build context and system prompt
      const contextInfo = buildAgentContext({
        activeBuffer: context.activeFile
          ? {
              path: context.activeFile.path,
              content: context.activeFile.content,
              name: context.activeFile.path.split("/").pop() || "",
              id: context.activeFile.path,
              isVirtual: false,
              isDiff: false,
              isImage: false,
              isSQLite: false,
              isDirty: false,
              isActive: true,
              language: context.activeFile.language,
            }
          : undefined,
        openBuffers: context.openFiles?.map((f) => ({
          path: f.path,
          content: f.content,
          name: f.path.split("/").pop() || "",
          id: f.path,
          isVirtual: false,
          isDiff: false,
          isImage: false,
          isSQLite: false,
          isDirty: false,
          isActive: false,
          language: f.language,
        })),
        projectRoot: context.projectRoot,
        selectedFiles: context.workspaceFiles,
      });

      const enabledToolDefinitions = context.enabledTools
        .map((toolId) => this.toolRegistry.getTool(toolId))
        .filter(Boolean) as any[];

      const systemPrompt = await buildSystemPrompt(
        context.systemPrompt ||
          "You are a helpful AI assistant integrated into the Athas code editor.",
        contextInfo,
        enabledToolDefinitions,
        context.projectRoot,
        context.activeFile
          ? {
              path: context.activeFile.path,
              content: context.activeFile.content,
              name: context.activeFile.path.split("/").pop() || "",
              id: context.activeFile.path,
              isVirtual: false,
              isDiff: false,
              isImage: false,
              isSQLite: false,
              isDirty: false,
              isActive: true,
              language: context.activeFile.language,
            }
          : undefined,
        context.openFiles?.map((f) => ({
          path: f.path,
          content: f.content,
          name: f.path.split("/").pop() || "",
          id: f.path,
          isVirtual: false,
          isDiff: false,
          isImage: false,
          isSQLite: false,
          isDirty: false,
          isActive: false,
          language: f.language,
        })),
      );

      // Build tools array for Anthropic
      const tools = this.buildToolDefinitions(context);

      // Convert history to Anthropic format
      const messages = this.convertHistoryToMessages(context.history);

      // Add current user message
      messages.push({
        role: "user",
        content: userMessage,
      });

      // Create abort controller for cancellation
      this.abortController = new AbortController();

      // Create streaming request with retry
      const stream = await retry(
        async () => {
          return this.anthropic!.messages.stream(
            {
              model: context.modelId || "claude-3-5-sonnet-20241022",
              max_tokens: context.maxTokens || 4096,
              temperature: context.temperature || 0.7,
              system: systemPrompt,
              messages,
              tools: tools.length > 0 ? tools : undefined,
            },
            {
              signal: this.abortController!.signal,
            },
          );
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          onRetry: (attempt, error, delay) => {
            console.log(
              `Retrying request (attempt ${attempt}) after ${delay}ms due to:`,
              error.message,
            );
          },
        },
      );

      let currentText = "";
      const toolUseBlocks: any[] = [];

      // Handle streaming events
      try {
        for await (const event of stream) {
          if (event.type === "content_block_start") {
            if (event.content_block.type === "text") {
              // Text block starting
            } else if (event.content_block.type === "tool_use") {
              // Tool use block starting
              toolUseBlocks.push(event.content_block);
            }
          }

          if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
              // Text chunk
              currentText += event.delta.text;
              callbacks.onChunk(event.delta.text);
            }
          }

          if (event.type === "message_stop") {
            // Message completed
            break;
          }
        }

        // Process tool calls if any
        if (toolUseBlocks.length > 0) {
          await this.processToolCalls(toolUseBlocks, context, callbacks, messages);
          return;
        }

        // No tools - just complete
        callbacks.onComplete(currentText);
      } catch (error: any) {
        // Check if error was due to cancellation
        if (error.name === "AbortError" || error.message?.includes("aborted")) {
          console.log("Streaming cancelled by user");
          callbacks.onError("Request cancelled");
          return;
        }

        console.error("Native agent error:", error);
        callbacks.onError(error.message || "Failed to process message");
      } finally {
        // Clean up abort controller
        this.abortController = null;
      }
    } catch (error: any) {
      console.error("Native agent error:", error);
      callbacks.onError(error.message || "Failed to process message");
    }
  }

  private async processToolCalls(
    toolUseBlocks: any[],
    context: AgentContext,
    callbacks: AgentCallbacks,
    messages: any[],
  ): Promise<void> {
    const toolResults: any[] = [];

    for (const toolUse of toolUseBlocks) {
      const { id, name, input } = toolUse;

      // Request approval if needed
      if (!context.autoApproveTools) {
        const approved = await callbacks.onToolApprovalRequest(name, input);
        if (!approved) {
          callbacks.onToolRejected(id, name);
          toolResults.push({
            type: "tool_result",
            tool_use_id: id,
            content: "Tool execution rejected by user",
            is_error: true,
          });
          continue;
        }
      }

      // Execute tool
      callbacks.onToolStart(id, name, input);

      try {
        const result = await this.toolRegistry.execute(name, input, {
          workspaceRoot: context.projectRoot,
          activeFile: context.activeFile,
          openFiles: context.openFiles,
        });

        callbacks.onToolComplete(id, name, result);

        toolResults.push({
          type: "tool_result",
          tool_use_id: id,
          content: result,
        });
      } catch (error: any) {
        callbacks.onToolError(id, name, error.message);

        toolResults.push({
          type: "tool_result",
          tool_use_id: id,
          content: error.message,
          is_error: true,
        });
      }
    }

    // Add assistant message with tool uses
    messages.push({
      role: "assistant",
      content: toolUseBlocks.map((tu) => ({
        type: "tool_use",
        id: tu.id,
        name: tu.name,
        input: tu.input,
      })),
    });

    // Add tool results as user message
    messages.push({
      role: "user",
      content: toolResults,
    });

    // Continue conversation with tool results
    if (this.anthropic) {
      try {
        const stream = await this.anthropic.messages.stream({
          model: context.modelId || "claude-3-5-sonnet-20241022",
          max_tokens: context.maxTokens || 4096,
          temperature: context.temperature || 0.7,
          system:
            context.systemPrompt ||
            "You are a helpful AI assistant integrated into the Athas code editor.",
          messages,
          tools: this.buildToolDefinitions(context),
        });

        let currentText = "";

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            currentText += event.delta.text;
            callbacks.onChunk(event.delta.text);
          }

          if (event.type === "message_stop") {
            callbacks.onComplete(currentText);
            break;
          }
        }
      } catch (error: any) {
        console.error("Tool result processing error:", error);
        callbacks.onError(error.message || "Failed to process tool results");
      }
    }
  }

  private buildToolDefinitions(context: AgentContext): any[] {
    const tools: any[] = [];

    // Add native tools
    for (const toolId of context.enabledTools) {
      const tool = this.toolRegistry.getTool(toolId);
      if (tool) {
        tools.push({
          name: tool.name,
          description: tool.description,
          input_schema: tool.input_schema,
        });
      }
    }

    // Add MCP server tools
    for (const [serverId, server] of context.mcpServers) {
      if (server.status === "running" && server.tools && server.tools.length > 0) {
        console.log(
          `[NativeAgent] Adding ${server.tools.length} tools from MCP server: ${serverId}`,
        );

        for (const mcpTool of server.tools) {
          // Register MCP tool in registry if not already registered
          const prefixedName = `${serverId}__${mcpTool.name}`;
          if (!this.toolRegistry.getTool(prefixedName)) {
            this.toolRegistry.registerMCPTool(serverId, mcpTool);
          }

          // Add to Anthropic tools array
          tools.push({
            name: prefixedName,
            description: `[${serverId}] ${mcpTool.description}`,
            input_schema: mcpTool.inputSchema,
          });
        }
      }
    }

    console.log(`[NativeAgent] Built ${tools.length} total tools (native + MCP)`);
    return tools;
  }

  private convertHistoryToMessages(history: any[]): any[] {
    return history.map((msg) => ({
      role: msg.role,
      content:
        msg.content
          .map((c: any) => {
            if (c.type === "text") {
              return c.text;
            }
            return null;
          })
          .filter(Boolean)
          .join("\n") || "...",
    }));
  }

  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }
}

// Singleton instance
let nativeAgentInstance: NativeAgent | null = null;

export function getNativeAgent(): NativeAgent {
  if (!nativeAgentInstance) {
    nativeAgentInstance = new NativeAgent();
  }
  return nativeAgentInstance;
}
