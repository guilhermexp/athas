import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ClaudeStatus, InterceptorMessage } from "@/types/claude";
import { buildContextPrompt } from "./context-builder";
import type { ContextInfo } from "./types";

interface ClaudeCodeHandlers {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
  onNewMessage?: () => void;
  onToolUse?: (toolName: string, toolInput?: any) => void;
  onToolComplete?: (toolName: string) => void;
}

interface ClaudeListeners {
  interceptor?: () => void;
}

export class ClaudeCodeStreamHandler {
  private currentStopReason: string | null = null;
  private listeners: ClaudeListeners = {};
  private timeout?: NodeJS.Timeout;
  private expectingMoreMessages = false;
  private lastActivityTime = Date.now();
  private isFirstMessage = true;
  private currentToolName: string | null = null;

  constructor(private handlers: ClaudeCodeHandlers) {}

  async start(userMessage: string, context: ContextInfo): Promise<void> {
    try {
      await this.ensureClaudeCodeRunning();
      const fullMessage = this.buildMessage(userMessage, context);
      await this.setupListeners();

      // Reset activity time before sending message and starting timeout
      this.lastActivityTime = Date.now();
      console.log("🚀 Sending message to Claude Code and starting timeout");

      await invoke("send_claude_input", { input: fullMessage });
      this.setupTimeout();
    } catch (error) {
      console.error("❌ Claude Code error:", error);
      this.handlers.onError("Claude Code is currently unavailable");
    }
  }

  private async ensureClaudeCodeRunning(): Promise<void> {
    try {
      const status = await invoke<ClaudeStatus>("get_claude_status");
      console.log("📊 Claude Code status:", status);

      if (!status.running) {
        console.log("🚀 Starting Claude Code...");
        try {
          const startStatus = await invoke<ClaudeStatus>("start_claude_code");
          console.log("✅ Claude Code started:", startStatus);

          if (!startStatus.running) {
            throw new Error("Claude Code is currently unavailable");
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (startError: any) {
          // If error is "already running", that's OK
          if (startError?.toString().includes("already running")) {
            console.log("✅ Claude Code is already running");
            return;
          }
          throw startError;
        }
      } else {
        console.log("✅ Claude Code is already running");
      }
    } catch (error) {
      console.error("❌ ensureClaudeCodeRunning error:", error);
      throw new Error("Claude Code is currently unavailable");
    }
  }

  private buildMessage(userMessage: string, context: ContextInfo): string {
    const contextPrompt = buildContextPrompt(context);
    return contextPrompt ? `${contextPrompt}\n\n${userMessage}` : userMessage;
  }

  private async setupListeners(): Promise<void> {
    this.listeners.interceptor = await listen<InterceptorMessage>("claude-message", (event) => {
      this.handleInterceptorMessage(event.payload);
    });
  }

  private handleInterceptorMessage(message: InterceptorMessage): void {
    console.log("📡 RAW Interceptor message:", JSON.stringify(message, null, 2));
    console.log(
      "📡 Interceptor message type:",
      message.type,
      "request_id:",
      message.request_id || message.data?.id,
    );

    switch (message.type) {
      case "stream_chunk":
        console.log("🌊 Processing stream_chunk:", message.chunk);
        this.handleStreamChunk(message.chunk);
        break;
      case "response":
        console.log("📨 Processing response:", message.data?.parsed_response);
        this.handleResponseMessage(message.data);
        break;
      case "request":
        // No-op; requests are logged above for traceability
        break;
      case "error":
        console.log("❌ Error from interceptor, cleaning up...");
        this.cleanup();
        this.handlers.onError(message.error || "Unknown error from interceptor");
        break;
      default:
        console.log("⚠️ Unknown message type:", message.type);
    }
  }

  private handleStreamChunk(chunk: any): void {
    console.log("🌊 handleStreamChunk called with:", chunk);
    if (!chunk) {
      console.log("⚠️ Chunk is null/undefined");
      return;
    }

    this.lastActivityTime = Date.now();

    if (chunk.type === "message_start" && chunk.message) {
      this.currentStopReason = chunk.message.stop_reason || null;
      console.log("📋 message_start with stop_reason:", this.currentStopReason);

      // If this is not the first message, signal a new message
      if (!this.isFirstMessage && this.handlers.onNewMessage) {
        console.log("📝 Starting new message in conversation");
        this.handlers.onNewMessage();
      }
      this.isFirstMessage = false;
    }

    // Handle tool use blocks
    if (chunk.type === "content_block_start" && chunk.content_block?.type === "tool_use") {
      this.currentToolName = chunk.content_block.name || "unknown";
      console.log("🔧 Tool use detected:", this.currentToolName);
      if (this.handlers.onToolUse) {
        this.handlers.onToolUse(this.currentToolName!, chunk.content_block.input);
      }
    }

    // Handle tool completion
    if (chunk.type === "content_block_stop") {
      if (this.currentToolName && this.handlers.onToolComplete) {
        console.log("✅ Tool complete:", this.currentToolName);
        this.handlers.onToolComplete(this.currentToolName!);
      }
      this.currentToolName = null;
    }

    if (chunk.delta?.text) {
      console.log("📝 Text chunk received:", chunk.delta.text);
      this.handlers.onChunk(chunk.delta.text);
    }

    if (chunk.type === "message_stop") {
      console.log("🛑 message_stop in stream_chunk, stop_reason was:", this.currentStopReason);

      if (this.currentStopReason === "tool_use") {
        console.log("🔧 Tool use detected, expecting more messages...");
        this.expectingMoreMessages = true;
        this.currentStopReason = null;
      } else if (this.expectingMoreMessages) {
        console.log("📝 Follow-up message complete after tool use");
        this.expectingMoreMessages = false;
      } else {
        console.log(
          "⏳ Message complete, but not cleaning up yet - waiting for explicit completion signal",
        );
      }
      this.currentStopReason = null;
    }
  }

  private handleResponseMessage(data: any): void {
    if (!data) return;

    this.lastActivityTime = Date.now();

    console.log("📨 Response data:", {
      stop_reason: data.parsed_response?.stop_reason,
      usage: data.parsed_response?.usage,
      content_blocks: data.parsed_response?.content?.length,
    });

    // Prefer parsed_response if present
    const response = data.parsed_response;
    if (response && Array.isArray(response.content) && response.content.length > 0) {
      try {
        for (const block of response.content) {
          if (!block || typeof block !== "object") continue;
          const kind = block.type || block.block_type || block.content_type;
          if (kind === "text" && block.text) {
            this.handlers.onChunk(block.text);
          } else if (kind === "tool_use") {
            this.currentToolName = block.name || "unknown";
            if (this.handlers.onToolUse && this.currentToolName) {
              this.handlers.onToolUse(this.currentToolName, block.input);
            }
            if (this.handlers.onToolComplete && this.currentToolName) {
              this.handlers.onToolComplete(this.currentToolName);
            }
            this.currentToolName = null;
          }
        }
      } catch (e) {
        console.warn("Failed to synthesize response content:", e);
      }
    }

    // Fallback: some runs attach chunks only to response.streaming_chunks
    if ((!response || !response.content) && Array.isArray(data.streaming_chunks)) {
      try {
        for (const chunk of data.streaming_chunks) {
          if (!chunk) continue;
          if (chunk.delta?.text) {
            this.handlers.onChunk(chunk.delta.text);
          }
          const ctype = chunk.content_block?.type || chunk.content_block?.content_type;
          if (ctype === "text" && (chunk.content_block as any)?.text) {
            this.handlers.onChunk((chunk.content_block as any).text);
          }
          if (ctype === "tool_use") {
            const name = (chunk.content_block as any)?.name || "unknown";
            if (this.handlers.onToolUse)
              this.handlers.onToolUse(name, (chunk.content_block as any)?.input);
            if (this.handlers.onToolComplete) this.handlers.onToolComplete(name);
          }
        }
      } catch (e) {
        console.warn("Failed to read response.streaming_chunks:", e);
      }
    }

    if (response?.stop_reason === "tool_use") {
      console.log("🔧 Tool use detected in response, expecting more messages...");
      this.expectingMoreMessages = true;
    } else {
      // Finalize immediately for non-streaming responses
      console.log("✅ Final response received; completing conversation");
      this.cleanup();
      this.handlers.onComplete();
    }
  }

  private setupTimeout(): void {
    // Check for inactivity every second
    const checkInactivity = () => {
      const now = Date.now();
      const inactiveTime = now - this.lastActivityTime;

      // If no activity for 5 seconds and not expecting more messages, complete
      if (inactiveTime > 5000 && !this.expectingMoreMessages) {
        console.log("✅ No activity for 5 seconds, conversation appears complete");
        this.cleanup();
        this.handlers.onComplete();
        return;
      }

      // If still expecting messages but no activity for 30 seconds, timeout
      if (inactiveTime > 30000) {
        console.log("⏰ Timeout: No activity for 30 seconds");
        this.cleanup();
        this.handlers.onError("Request timed out - no activity");
        return;
      }

      // Continue checking
      this.timeout = setTimeout(checkInactivity, 1000);
    };

    this.timeout = setTimeout(checkInactivity, 1000);
  }

  private cleanup(): void {
    console.log("Cleaning up Claude Code listeners...");

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }

    Object.values(this.listeners).forEach((unlisten) => {
      if (unlisten) unlisten();
    });

    this.listeners = {};
  }
}
