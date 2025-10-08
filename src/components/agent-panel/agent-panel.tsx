import { listen } from "@tauri-apps/api/event";
import { memo, useCallback, useEffect, useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { useNativeAgent } from "@/hooks/useNativeAgent";
import { getAcpAgent } from "@/lib/acp/agent";
import { useAgentPanelStore } from "@/stores/agent-panel/store";
import { useBufferStore } from "@/stores/buffer-store";
import { useProjectStore } from "@/stores/project-store";
import { cn } from "@/utils/cn";
import { AgentPanelErrorBoundary } from "./agent-panel-error-boundary";
import { AgentPanelHeader } from "./agent-panel-header";
import { AgentPanelInput } from "./agent-panel-input";
import { ConfigPanel } from "./config-panel";
import { MessageThread } from "./message-thread";
import { ThreadSelector } from "./thread-selector";
import { ToolApprovalDialog } from "./tool-approval-dialog";
import type { AgentContext, ToolCall } from "./types";

/**
 * Agent Panel - Main Component
 * Based on Zed's Agent Panel implementation
 *
 * Features:
 * - Thread-based conversations (not chat-based)
 * - Support for multiple agents (native, ACP, MCP)
 * - Tool execution with approval system
 * - Streaming responses
 * - Configuration panel
 */
export const AgentPanel = memo(() => {
  const {
    ui,
    pendingToolApprovals,
    approveToolCall,
    rejectToolCall,
    selectedAgentId,
    getAgent,
    getActiveThread,
  } = useAgentPanelStore();
  const [showToolApprovalDialog, setShowToolApprovalDialog] = useState(false);
  const { showToast } = useToast();

  // Get the selected agent
  const selectedAgent = getAgent(selectedAgentId);
  const activeThread = getActiveThread();

  // Use native agent hook only for native agents
  const nativeAgentHook = useNativeAgent({
    autoInitialize: selectedAgent?.type === "native",
  });

  // Workspace context for ACP agent
  const { rootFolderPath } = useProjectStore();
  const buffers = useBufferStore.use.buffers();
  const activeBufferId = useBufferStore.use.activeBufferId();
  const activeBuffer = buffers.find((b) => b.id === activeBufferId);

  // DEBUG: Test event listener on mount
  useEffect(() => {
    console.log("🔥 [DEBUG] Testing Tauri event system...");

    const setupTestListener = async () => {
      console.log("🔥 [DEBUG] Setting up test listener for 'acp-message'");

      const unlisten = await listen("acp-message", (event: any) => {
        console.log("🔥 [DEBUG] ✅ RECEIVED acp-message event!", event);
      });

      console.log("🔥 [DEBUG] Test listener registered successfully!");

      return unlisten;
    };

    let cleanup: (() => void) | undefined;
    setupTestListener().then((unlisten) => {
      cleanup = unlisten;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // ACP agent message handler
  const sendACPMessage = useCallback(
    async (msg: string) => {
      if (!selectedAgent || !activeThread) return;

      const {
        addMessage,
        updateMessage,
        setIsStreaming,
        setStreamingMessageId,
        autoApproveTools,
        mcpServers,
        getActiveThread,
      } = useAgentPanelStore.getState();

      // Add user message
      const userMessageId = `${Date.now()}-user`;
      addMessage(activeThread.id, {
        id: userMessageId,
        role: "user",
        content: [{ type: "text", text: msg }],
        timestamp: new Date(),
      });

      // Add assistant message placeholder
      const assistantMessageId = `${Date.now()}-assistant`;
      addMessage(activeThread.id, {
        id: assistantMessageId,
        role: "assistant",
        content: [{ type: "text", text: "" }],
        timestamp: new Date(),
        isStreaming: true,
      });

      setIsStreaming(true);
      setStreamingMessageId(assistantMessageId);

      // Track the collected text for this message
      let collectedText = "";

      const context: AgentContext = {
        activeFile: activeBuffer
          ? {
              path: activeBuffer.path,
              content: activeBuffer.content || "",
              language: activeBuffer.language || "plaintext",
            }
          : undefined,
        openFiles: buffers.map((b) => ({
          path: b.path,
          content: b.content || "",
          language: b.language || "plaintext",
        })),
        projectRoot: rootFolderPath,
        modelId: selectedAgent.modelId,
        systemPrompt: selectedAgent.systemPrompt,
        enabledTools: selectedAgent.tools,
        mcpServers: new Map(mcpServers.map((server) => [server.id, server])),
        autoApproveTools: autoApproveTools,
        history: activeThread.messages,
      };

      const acpAgent = getAcpAgent();

      console.log("[AgentPanel] Calling ACP agent with:", {
        threadId: activeThread.id,
        agentId: selectedAgent.id,
        message: msg,
      });

      try {
        await acpAgent.processMessage(activeThread.id, selectedAgent, msg, context, {
          onChunk: (chunk) => {
            console.log("[AgentPanel] onChunk received:", chunk);
            collectedText += chunk;
            updateMessage(activeThread.id, assistantMessageId, {
              content: [{ type: "text", text: collectedText }],
            });
          },
          onComplete: (finalText) => {
            updateMessage(activeThread.id, assistantMessageId, {
              content: [{ type: "text", text: finalText }],
              isStreaming: false,
            });
            setIsStreaming(false);
            setStreamingMessageId(null);
          },
          onError: (error) => {
            updateMessage(activeThread.id, assistantMessageId, {
              content: [{ type: "text", text: `Error: ${error}` }],
              isStreaming: false,
            });
            setIsStreaming(false);
            setStreamingMessageId(null);
            showToast({ message: error, type: "error", duration: 3000 });
          },
          onToolStart: (toolCallId: string, toolName: string, toolInput: any) => {
            console.log("[AgentPanel] 🔧 Tool started:", toolCallId, toolName, toolInput);

            // Create the tool call object
            const toolCall: ToolCall = {
              id: toolCallId,
              name: toolName,
              input: toolInput,
              status: "running",
              timestamp: new Date(),
            };

            // Get current message to append tool call
            const currentThread = getActiveThread();
            const currentMessage = currentThread?.messages.find((m) => m.id === assistantMessageId);
            const existingToolCalls = currentMessage?.toolCalls || [];

            // Add tool call to message
            updateMessage(activeThread.id, assistantMessageId, {
              toolCalls: [...existingToolCalls, toolCall],
            });
          },
          onToolComplete: (toolCallId: string, toolName: string, toolOutput: any) => {
            console.log("[AgentPanel] ✅ Tool completed:", toolCallId, toolName, toolOutput);

            // Get current message and find the tool call
            const currentThread = getActiveThread();
            const currentMessage = currentThread?.messages.find((m) => m.id === assistantMessageId);
            const existingToolCalls = currentMessage?.toolCalls || [];

            // Update the tool call status
            const updatedToolCalls = existingToolCalls.map((tc) => {
              if (tc.id === toolCallId) {
                return {
                  ...tc,
                  status: "complete" as const,
                  output: toolOutput,
                  duration: Date.now() - tc.timestamp.getTime(),
                };
              }
              return tc;
            });

            updateMessage(activeThread.id, assistantMessageId, {
              toolCalls: updatedToolCalls,
            });
          },
          onToolError: (toolCallId: string, toolName: string, error: string) => {
            console.log("[AgentPanel] ❌ Tool error:", toolCallId, toolName, error);

            // Get current message and find the tool call
            const currentThread = getActiveThread();
            const currentMessage = currentThread?.messages.find((m) => m.id === assistantMessageId);
            const existingToolCalls = currentMessage?.toolCalls || [];

            // Update the tool call status
            const updatedToolCalls = existingToolCalls.map((tc) => {
              if (tc.id === toolCallId) {
                return {
                  ...tc,
                  status: "error" as const,
                  error: error,
                  duration: Date.now() - tc.timestamp.getTime(),
                };
              }
              return tc;
            });

            updateMessage(activeThread.id, assistantMessageId, {
              toolCalls: updatedToolCalls,
            });
          },
          onToolRejected: (toolCallId: string, toolName: string) => {
            console.log("[AgentPanel] 🚫 Tool rejected:", toolCallId, toolName);

            // Get current message and find the tool call
            const currentThread = getActiveThread();
            const currentMessage = currentThread?.messages.find((m) => m.id === assistantMessageId);
            const existingToolCalls = currentMessage?.toolCalls || [];

            // Update the tool call status
            const updatedToolCalls = existingToolCalls.map((tc) => {
              if (tc.id === toolCallId) {
                return {
                  ...tc,
                  status: "rejected" as const,
                  duration: Date.now() - tc.timestamp.getTime(),
                };
              }
              return tc;
            });

            updateMessage(activeThread.id, assistantMessageId, {
              toolCalls: updatedToolCalls,
            });
          },
          onToolApprovalRequest: async (toolName: string, _toolInput: any) => {
            console.log("[AgentPanel] 🔐 Tool approval requested:", toolName);

            // If auto-approve is enabled, approve immediately
            if (autoApproveTools) {
              console.log("[AgentPanel] Auto-approving tool:", toolName);
              return true;
            }

            // Otherwise, show approval dialog
            // For now, we'll auto-approve, but later this should show a dialog
            console.log("[AgentPanel] Auto-approving tool (dialog not implemented):", toolName);
            return true;
          },
        });
      } catch (error: any) {
        updateMessage(activeThread.id, assistantMessageId, {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isStreaming: false,
        });
        setIsStreaming(false);
        setStreamingMessageId(null);
        showToast({ message: error.message, type: "error", duration: 3000 });
      }
    },
    [selectedAgent, activeThread, activeBuffer, buffers, rootFolderPath, showToast],
  );

  // Get ACP streaming state
  const acpIsStreaming = useAgentPanelStore((state) => state.isStreaming);

  // Determine which implementation to use based on agent type
  const sendMessage =
    selectedAgent?.type === "native" ? nativeAgentHook.sendMessage : sendACPMessage;

  const isStreaming =
    selectedAgent?.type === "native" ? nativeAgentHook.isStreaming : acpIsStreaming;

  const messages =
    selectedAgent?.type === "native" ? nativeAgentHook.messages : activeThread?.messages || [];

  // Auto-show tool approval dialog when there are pending approvals
  const hasPendingApprovals = pendingToolApprovals.length > 0;
  if (hasPendingApprovals && !showToolApprovalDialog) {
    setShowToolApprovalDialog(true);
  }

  // Show toast when tools are approved/rejected
  const handleApprove = (approvalId: string) => {
    approveToolCall(approvalId);
    const approval = pendingToolApprovals.find((a) => a.id === approvalId);
    if (approval) {
      showToast({
        message: `Tool "${approval.toolName}" approved`,
        type: "success",
        duration: 2000,
      });
    }
  };

  const handleReject = (approvalId: string) => {
    rejectToolCall(approvalId);
    const approval = pendingToolApprovals.find((a) => a.id === approvalId);
    if (approval) {
      showToast({
        message: `Tool "${approval.toolName}" rejected`,
        type: "info",
        duration: 2000,
      });
    }
  };

  return (
    <AgentPanelErrorBoundary>
      <div
        className={cn(
          "agent-panel-container flex h-full text-xs",
          "bg-secondary-bg text-text",
          "max-w-full overflow-x-hidden",
        )}
        style={{
          background: "var(--color-secondary-bg)",
          color: "var(--color-text)",
          fontFamily: "var(--font-ui)",
        }}
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          <AgentPanelHeader />

          <div className="flex h-full flex-1 overflow-hidden">
            {ui.activeView === "history" ? (
              <ThreadSelector />
            ) : ui.activeView === "configuration" ? (
              <ConfigPanel />
            ) : (
              <div className="flex h-full flex-1 flex-col">
                <MessageThread messages={messages} />
                <AgentPanelInput onSendMessage={sendMessage} disabled={isStreaming} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tool Approval Dialog */}
      {showToolApprovalDialog && pendingToolApprovals.length > 0 && (
        <ToolApprovalDialog
          approvals={pendingToolApprovals}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setShowToolApprovalDialog(false)}
        />
      )}
    </AgentPanelErrorBoundary>
  );
});

AgentPanel.displayName = "AgentPanel";

export default AgentPanel;
