import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentCallbacks,
  AgentContext,
  ThreadMessage,
  ToolCall,
} from "@/components/agent-panel/types";
import { getNativeAgent } from "@/lib/native-agent/agent";
import { useAgentPanelStore } from "@/stores/agent-panel/store";
import { useBufferStore } from "@/stores/buffer-store";
import { useProjectStore } from "@/stores/project-store";

/**
 * Hook Options
 */
export interface UseNativeAgentOptions {
  /**
   * Agent ID to use (defaults to currently selected agent)
   */
  agentId?: string;

  /**
   * Thread ID to use (defaults to active thread)
   */
  threadId?: string;

  /**
   * Auto-initialize the agent on mount
   */
  autoInitialize?: boolean;

  /**
   * Custom callbacks to merge with default callbacks
   */
  callbacks?: Partial<AgentCallbacks>;
}

/**
 * Hook Return Type
 */
export interface UseNativeAgentReturn {
  // State
  isStreaming: boolean;
  currentMessage: string;
  error: string | null;
  isInitialized: boolean;
  threadId: string | null;
  messages: ThreadMessage[];

  // Methods
  sendMessage: (message: string) => Promise<void>;
  cancelStreaming: () => void;
  initialize: () => Promise<void>;
  reset: () => void;

  // Store helpers
  createThread: (title?: string) => string;
  switchThread: (threadId: string) => void;
}

/**
 * useNativeAgent Hook
 *
 * Manages Native Agent state and interactions with proper separation of concerns.
 * This hook handles:
 * - Agent initialization
 * - Message sending with streaming
 * - Tool execution and approval
 * - Error handling with retry logic
 * - Cancellation support
 * - Thread and message management
 *
 * @example
 * ```tsx
 * const { sendMessage, isStreaming, messages } = useNativeAgent();
 *
 * const handleSubmit = async (text: string) => {
 *   await sendMessage(text);
 * };
 * ```
 */
export function useNativeAgent(options: UseNativeAgentOptions = {}): UseNativeAgentReturn {
  const {
    agentId: optionsAgentId,
    threadId: optionsThreadId,
    autoInitialize = true,
    callbacks: customCallbacks,
  } = options;

  // ============================================================================
  // Store State
  // ============================================================================
  const {
    activeThreadId: storeActiveThreadId,
    selectedAgentId: storeSelectedAgentId,
    isStreaming: storeIsStreaming,
    autoApproveTools,
    createThread: storeCreateThread,
    switchThread: storeSwitchThread,
    addMessage,
    updateMessage,
    getActiveThread,
    getAgent,
    setIsStreaming: storeSetIsStreaming,
    setStreamingMessageId,
  } = useAgentPanelStore();

  // Determine which agent and thread to use
  const activeAgentId = optionsAgentId || storeSelectedAgentId;
  const activeThreadId = optionsThreadId || storeActiveThreadId;
  const selectedAgent = getAgent(activeAgentId);
  const activeThread = getActiveThread();
  const messages = activeThread?.messages || [];

  // Get workspace context
  const { rootFolderPath } = useProjectStore();
  const buffers = useBufferStore.use.buffers();
  const activeBufferId = useBufferStore.use.activeBufferId();
  const activeBuffer = buffers.find((b) => b.id === activeBufferId);

  // ============================================================================
  // Local State
  // ============================================================================
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Refs to track current assistant message
  const currentAssistantMessageRef = useRef<ThreadMessage | null>(null);
  const currentThreadIdRef = useRef<string | null>(null);

  // ============================================================================
  // Agent Initialization
  // ============================================================================
  const initialize = useCallback(async () => {
    try {
      const agent = getNativeAgent();
      await agent.initialize();
      setIsInitialized(true);
      setError(null);
    } catch (err: any) {
      console.error("Failed to initialize agent:", err);
      setError(err.message || "Failed to initialize agent");
      setIsInitialized(false);
    }
  }, []);

  useEffect(() => {
    if (autoInitialize) {
      void initialize();
    }
  }, [autoInitialize, initialize]);

  // ============================================================================
  // Build Agent Context
  // ============================================================================
  const buildContext = useCallback((): AgentContext => {
    return {
      activeFile: activeBuffer
        ? {
            path: activeBuffer.path,
            content: activeBuffer.content,
            language: activeBuffer.path.split(".").pop() || "text",
          }
        : undefined,
      openFiles: buffers
        .filter((b) => !b.isVirtual)
        .map((b) => ({
          path: b.path,
          content: b.content,
          language: b.path.split(".").pop() || "text",
        })),
      projectRoot: rootFolderPath || undefined,
      workspaceFiles: [],
      modelId: selectedAgent?.modelId,
      systemPrompt: selectedAgent?.systemPrompt,
      temperature: 0.7,
      maxTokens: 4096,
      enabledTools: selectedAgent?.tools || [
        "read_file",
        "write_file",
        "list_directory",
        "search_files",
      ],
      mcpServers: new Map(),
      autoApproveTools,
      history: messages,
    };
  }, [activeBuffer, buffers, rootFolderPath, selectedAgent, autoApproveTools, messages]);

  // ============================================================================
  // Build Callbacks
  // ============================================================================
  const buildCallbacks = useCallback(
    (
      threadId: string,
      assistantMessageId: string,
      _assistantMessage: ThreadMessage,
    ): AgentCallbacks => {
      const defaultCallbacks: AgentCallbacks = {
        onChunk: (chunk: string) => {
          setCurrentMessage((prev) => prev + chunk);
          updateMessage(threadId, assistantMessageId, {
            content: [
              {
                type: "text",
                text: (currentAssistantMessageRef.current?.content[0]?.text || "") + chunk,
              },
            ],
          });
        },

        onComplete: (finalText: string) => {
          setCurrentMessage("");
          updateMessage(threadId, assistantMessageId, {
            content: [
              {
                type: "text",
                text: finalText,
              },
            ],
            isStreaming: false,
          });
          storeSetIsStreaming(false);
          setStreamingMessageId(null);
          currentAssistantMessageRef.current = null;
          currentThreadIdRef.current = null;
        },

        onError: (errorMsg: string) => {
          setError(errorMsg);
          setCurrentMessage("");
          updateMessage(threadId, assistantMessageId, {
            content: [
              {
                type: "text",
                text: `Error: ${errorMsg}`,
              },
            ],
            isStreaming: false,
          });
          storeSetIsStreaming(false);
          setStreamingMessageId(null);
          currentAssistantMessageRef.current = null;
          currentThreadIdRef.current = null;
        },

        onToolStart: (toolCallId: string, toolName: string, input: any) => {
          const toolCall: ToolCall = {
            id: toolCallId,
            name: toolName,
            input,
            status: "running",
            timestamp: new Date(),
          };

          const currentToolCalls = currentAssistantMessageRef.current?.toolCalls || [];
          updateMessage(threadId, assistantMessageId, {
            toolCalls: [...currentToolCalls, toolCall],
          });

          // Update ref
          if (currentAssistantMessageRef.current) {
            currentAssistantMessageRef.current.toolCalls = [...currentToolCalls, toolCall];
          }
        },

        onToolComplete: (toolCallId: string, _toolName: string, output: any) => {
          const currentToolCalls = currentAssistantMessageRef.current?.toolCalls || [];
          const updatedToolCalls = currentToolCalls.map((tc) =>
            tc.id === toolCallId ? { ...tc, status: "complete" as const, output } : tc,
          );

          updateMessage(threadId, assistantMessageId, {
            toolCalls: updatedToolCalls,
          });

          // Update ref
          if (currentAssistantMessageRef.current) {
            currentAssistantMessageRef.current.toolCalls = updatedToolCalls;
          }
        },

        onToolError: (toolCallId: string, _toolName: string, errorMsg: string) => {
          const currentToolCalls = currentAssistantMessageRef.current?.toolCalls || [];
          const updatedToolCalls = currentToolCalls.map((tc) =>
            tc.id === toolCallId ? { ...tc, status: "error" as const, error: errorMsg } : tc,
          );

          updateMessage(threadId, assistantMessageId, {
            toolCalls: updatedToolCalls,
          });

          // Update ref
          if (currentAssistantMessageRef.current) {
            currentAssistantMessageRef.current.toolCalls = updatedToolCalls;
          }
        },

        onToolRejected: (toolCallId: string, _toolName: string) => {
          const currentToolCalls = currentAssistantMessageRef.current?.toolCalls || [];
          const updatedToolCalls = currentToolCalls.map((tc) =>
            tc.id === toolCallId ? { ...tc, status: "rejected" as const } : tc,
          );

          updateMessage(threadId, assistantMessageId, {
            toolCalls: updatedToolCalls,
          });

          // Update ref
          if (currentAssistantMessageRef.current) {
            currentAssistantMessageRef.current.toolCalls = updatedToolCalls;
          }
        },

        onToolApprovalRequest: async (_toolName: string, _input: any) => {
          return autoApproveTools;
        },
      };

      // Merge with custom callbacks
      if (customCallbacks) {
        Object.keys(customCallbacks).forEach((key) => {
          const callbackKey = key as keyof AgentCallbacks;
          const customCallback = customCallbacks[callbackKey];
          const defaultCallback = defaultCallbacks[callbackKey];

          if (customCallback && defaultCallback) {
            // Wrap callbacks to call both default and custom
            (defaultCallbacks as any)[callbackKey] = (...args: any[]) => {
              (defaultCallback as any)(...args);
              (customCallback as any)(...args);
            };
          }
        });
      }

      return defaultCallbacks;
    },
    [updateMessage, storeSetIsStreaming, setStreamingMessageId, autoApproveTools, customCallbacks],
  );

  // ============================================================================
  // Send Message
  // ============================================================================
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || storeIsStreaming) {
        return;
      }

      // Ensure agent is initialized
      if (!isInitialized) {
        await initialize();
        if (!isInitialized) {
          setError("Agent not initialized");
          return;
        }
      }

      // Create thread if none exists
      let threadId = activeThreadId;
      if (!threadId) {
        threadId = storeCreateThread(activeAgentId);
        storeSwitchThread(threadId);
      }

      currentThreadIdRef.current = threadId;

      // Add user message
      const userMessage: ThreadMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: "user",
        content: [
          {
            type: "text",
            text: content,
          },
        ],
        timestamp: new Date(),
      };

      addMessage(threadId, userMessage);

      // Create assistant message placeholder
      const assistantMessageId = `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`;
      const assistantMessage: ThreadMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: [
          {
            type: "text",
            text: "",
          },
        ],
        timestamp: new Date(),
        isStreaming: true,
        toolCalls: [],
      };

      addMessage(threadId, assistantMessage);
      currentAssistantMessageRef.current = assistantMessage;

      storeSetIsStreaming(true);
      setStreamingMessageId(assistantMessageId);
      setCurrentMessage("");
      setError(null);

      // Build context and callbacks
      const context = buildContext();
      const callbacks = buildCallbacks(threadId, assistantMessageId, assistantMessage);

      try {
        const agent = getNativeAgent();
        await agent.processMessage(content, context, callbacks);
      } catch (err: any) {
        console.error("Agent processing error:", err);
        callbacks.onError(err?.message || "Failed to process message");
      }
    },
    [
      storeIsStreaming,
      isInitialized,
      activeThreadId,
      activeAgentId,
      initialize,
      storeCreateThread,
      storeSwitchThread,
      addMessage,
      storeSetIsStreaming,
      setStreamingMessageId,
      buildContext,
      buildCallbacks,
    ],
  );

  // ============================================================================
  // Cancel Streaming
  // ============================================================================
  const cancelStreaming = useCallback(() => {
    const agent = getNativeAgent();
    agent.cancelStreaming();

    // Update state
    storeSetIsStreaming(false);
    setStreamingMessageId(null);
    setCurrentMessage("");

    // Update message if exists
    if (currentThreadIdRef.current && currentAssistantMessageRef.current) {
      updateMessage(currentThreadIdRef.current, currentAssistantMessageRef.current.id, {
        content: [
          {
            type: "text",
            text:
              (currentAssistantMessageRef.current.content[0]?.text || "") +
              "\n\n[Cancelled by user]",
          },
        ],
        isStreaming: false,
      });
    }

    currentAssistantMessageRef.current = null;
    currentThreadIdRef.current = null;
  }, [storeSetIsStreaming, setStreamingMessageId, updateMessage]);

  // ============================================================================
  // Thread Management Helpers
  // ============================================================================
  const createThread = useCallback(
    (title?: string) => {
      return storeCreateThread(activeAgentId, title);
    },
    [storeCreateThread, activeAgentId],
  );

  const switchThread = useCallback(
    (threadId: string) => {
      // Cancel any ongoing streaming
      if (storeIsStreaming) {
        cancelStreaming();
      }
      storeSwitchThread(threadId);
    },
    [storeSwitchThread, storeIsStreaming, cancelStreaming],
  );

  // ============================================================================
  // Reset
  // ============================================================================
  const reset = useCallback(() => {
    if (storeIsStreaming) {
      cancelStreaming();
    }
    setCurrentMessage("");
    setError(null);
    currentAssistantMessageRef.current = null;
    currentThreadIdRef.current = null;
  }, [storeIsStreaming, cancelStreaming]);

  // ============================================================================
  // Cleanup on unmount
  // ============================================================================
  useEffect(() => {
    return () => {
      if (storeIsStreaming) {
        cancelStreaming();
      }
    };
  }, [storeIsStreaming, cancelStreaming]);

  // ============================================================================
  // Return
  // ============================================================================
  return {
    // State
    isStreaming: storeIsStreaming,
    currentMessage,
    error,
    isInitialized,
    threadId: activeThreadId,
    messages,

    // Methods
    sendMessage,
    cancelStreaming,
    initialize,
    reset,

    // Store helpers
    createThread,
    switchThread,
  };
}
