import { invoke } from "@tauri-apps/api/core";
import { produce } from "immer";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  ACPSession,
  Agent,
  AgentActiveView,
  AgentGeneralSettings,
  LLMProvider,
  MCPServer,
  Thread,
  ThreadMessage,
  ToolApproval,
} from "@/components/agent-panel/types";
import type { AgentPanelActions, AgentPanelState } from "./types";

// ============================================================================
// Default Native Agent
// ============================================================================

const createDefaultNativeAgent = (): Agent => ({
  id: "native",
  name: "Native Agent",
  type: "native",
  description: "Built-in agent with Anthropic Claude",
  systemPrompt:
    "You are a helpful AI assistant integrated into the Athas code editor. You have access to the user's workspace and can help with coding tasks, file operations, and more.",
  modelId: "claude-3-5-sonnet-20241022",
  tools: ["read_file", "write_file", "list_directory", "search_files"],
  mcpServerIds: [],
  status: "ready",
});

const createDefaultGeneralSettings = (): AgentGeneralSettings => ({
  alwaysAllowToolActions: false,
  singleFileReview: true,
  playSoundWhenAgentDone: true,
  useModifierToSend: false,
  toolApprovalMode: "always_ask",
});

const createDefaultLLMProviders = (): LLMProvider[] => [
  {
    id: "anthropic",
    name: "Anthropic Claude",
    description: "Authenticate with Anthropic to access Claude models.",
    status: "requires_auth",
  },
];

function createDefaultExternalAgents(): Agent[] {
  const claude: Agent = {
    id: "acp_claude",
    name: "Claude Code",
    type: "acp",
    description: "Claude Code over ACP (uses local authentication)",
    command: "managed:claude_code",
    args: [],
    env: {},
    systemPrompt: undefined,
    modelId: undefined,
    tools: ["read_file", "write_file", "list_directory", "search_files"],
    mcpServerIds: [],
    status: "idle",
  };
  const gemini: Agent = {
    id: "acp_gemini",
    name: "Gemini CLI",
    type: "acp",
    description: "Gemini CLI over ACP (managed)",
    command: "managed:gemini",
    args: [],
    env: {},
    systemPrompt: undefined,
    modelId: undefined,
    tools: ["read_file", "write_file", "list_directory", "search_files"],
    mcpServerIds: [],
    status: "idle",
  };
  return [claude, gemini];
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useAgentPanelStore = create<AgentPanelState & AgentPanelActions>()(
  immer(
    persist(
      (set, get) => ({
        // ────────────────────────────────────────────────────────────────
        // Initial State
        // ────────────────────────────────────────────────────────────────
        threads: [],
        activeThreadId: null,
        selectedAgentId: "native",
        availableAgents: [createDefaultNativeAgent(), ...createDefaultExternalAgents()],
        acpSessions: {},
        mcpServers: [],
        activeMCPServerIds: new Set<string>(),
        pendingToolApprovals: [],
        autoApproveTools: false,
        generalSettings: createDefaultGeneralSettings(),
        llmProviders: createDefaultLLMProviders(),
        ui: {
          activeView: "thread",
          showThreadOverlay: false,
          selectedThreadId: null,
          searchQuery: "",
        },
        isStreaming: false,
        streamingMessageId: null,

        // ────────────────────────────────────────────────────────────────
        // Thread Management
        // ────────────────────────────────────────────────────────────────
        createThread: (agentId: string, title?: string) => {
          const thread: Thread = {
            id: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: title || "New Thread",
            agentId,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {},
          };

          set((state) => {
            state.threads.unshift(thread);
            state.activeThreadId = thread.id;
          });

          return thread.id;
        },

        switchThread: (threadId: string) => {
          set((state) => {
            state.activeThreadId = threadId;
            state.ui.selectedThreadId = threadId;
            state.ui.activeView = "thread";
            state.ui.showThreadOverlay = false;
          });
        },

        deleteThread: (threadId: string) => {
          const currentState = get();
          const thread = currentState.threads.find((t) => t.id === threadId);
          const session = currentState.acpSessions[threadId];
          const agentId = thread?.agentId;

          set((state) => {
            const index = state.threads.findIndex((t) => t.id === threadId);
            if (index !== -1) {
              state.threads.splice(index, 1);
              delete state.acpSessions[threadId];

              if (threadId === state.activeThreadId) {
                if (state.threads.length > 0) {
                  state.activeThreadId = state.threads[0].id;
                } else {
                  state.activeThreadId = null;
                }
              }
            }
          });

          const hasRemainingThreadsForAgent = agentId
            ? get().threads.some((t) => t.agentId === agentId)
            : false;

          if (session || (agentId && !hasRemainingThreadsForAgent)) {
            void (async () => {
              const { getAcpAgent } = await import("@/lib/acp/agent");
              const acp = getAcpAgent();

              if (session) {
                await acp.closeSession(threadId, session).catch(() => {});
              }

              if (agentId && !hasRemainingThreadsForAgent) {
                await acp.stopAgent(agentId).catch(() => {});
              }
            })();
          }
        },

        updateThreadTitle: (threadId: string, title: string) => {
          set((state) => {
            const thread = state.threads.find((t) => t.id === threadId);
            if (thread) {
              thread.title = title;
              thread.updatedAt = new Date();
            }
          });
        },

        getActiveThread: () => {
          const state = get();
          return state.threads.find((t) => t.id === state.activeThreadId);
        },

        // ────────────────────────────────────────────────────────────────
        // Message Management
        // ────────────────────────────────────────────────────────────────
        addMessage: (threadId: string, message: ThreadMessage) => {
          set((state) => {
            const thread = state.threads.find((t) => t.id === threadId);
            if (thread) {
              thread.messages.push(message);
              thread.updatedAt = new Date();

              // Auto-update title from first user message
              if (
                thread.messages.length === 1 &&
                message.role === "user" &&
                message.content[0]?.text
              ) {
                const text = message.content[0].text;
                thread.title = text.length > 50 ? `${text.substring(0, 50)}...` : text;
              }
            }
          });
        },

        updateMessage: (threadId: string, messageId: string, updates: Partial<ThreadMessage>) => {
          set((state) => {
            const thread = state.threads.find((t) => t.id === threadId);
            if (thread) {
              const message = thread.messages.find((m) => m.id === messageId);
              if (message) {
                Object.assign(message, updates);
                thread.updatedAt = new Date();
              }
            }
          });
        },

        getThreadMessages: (threadId: string) => {
          const state = get();
          const thread = state.threads.find((t) => t.id === threadId);
          return thread?.messages || [];
        },

        // ────────────────────────────────────────────────────────────────
        // Agent Management
        // ────────────────────────────────────────────────────────────────
        selectAgent: (agentId: string) => {
          set((state) => {
            state.selectedAgentId = agentId;
          });
        },

        addAgent: (agent: Agent) => {
          set((state) => {
            state.availableAgents.push(agent);
          });
        },

        updateAgent: (agentId: string, updates: Partial<Agent>) => {
          set((state) => {
            const agent = state.availableAgents.find((a) => a.id === agentId);
            if (agent) {
              Object.assign(agent, updates);
            }
          });
        },

        deleteAgent: (agentId: string) => {
          set((state) => {
            const index = state.availableAgents.findIndex((a) => a.id === agentId);
            if (index !== -1) {
              state.availableAgents.splice(index, 1);

              // If we deleted the selected agent, switch to native
              if (agentId === state.selectedAgentId) {
                state.selectedAgentId = "native";
              }
            }
          });
        },

        getAgent: (agentId: string) => {
          const state = get();
          return state.availableAgents.find((a) => a.id === agentId);
        },

        // ────────────────────────────────────────────────────────────────
        // ACP Session Management
        // ────────────────────────────────────────────────────────────────
        setACPSession: (threadId, session) => {
          set((state) => {
            state.acpSessions[threadId] = session;
          });
        },

        clearACPSession: (threadId) => {
          set((state) => {
            delete state.acpSessions[threadId];
          });
        },

        getACPSession: (threadId) => {
          const state = get();
          return state.acpSessions[threadId];
        },

        // ────────────────────────────────────────────────────────────────
        // MCP Server Management
        // ────────────────────────────────────────────────────────────────
        addMCPServer: (server: MCPServer) => {
          set((state) => {
            state.mcpServers.push(server);
          });
        },

        updateMCPServer: (serverId: string, updates: Partial<MCPServer>) => {
          set((state) => {
            const server = state.mcpServers.find((s) => s.id === serverId);
            if (server) {
              Object.assign(server, updates);
            }
          });
        },

        removeMCPServer: (serverId: string) => {
          set((state) => {
            const index = state.mcpServers.findIndex((s) => s.id === serverId);
            if (index !== -1) {
              state.mcpServers.splice(index, 1);
              state.activeMCPServerIds.delete(serverId);
            }
          });
        },

        toggleMCPServer: (serverId: string) => {
          set((state) => {
            const server = state.mcpServers.find((s) => s.id === serverId);
            if (!server) return;
            const currentlyActive = state.activeMCPServerIds.has(serverId);
            if (currentlyActive) {
              state.activeMCPServerIds.delete(serverId);
              server.status = "stopped";
              void invoke("stop_mcp_server", { serverId }).catch(() => {
                // best-effort; UI already reflects intent
              });
            } else {
              state.activeMCPServerIds.add(serverId);
              server.status = "running";
              void invoke("start_mcp_server", {
                serverId,
                command: server.command || "",
                args: server.args || [],
                env: server.env || {},
              }).catch((e) => {
                server.status = "error";
                server.errorMessage = String(e);
              });
            }
          });
        },

        getMCPServer: (serverId: string) => {
          const state = get();
          return state.mcpServers.find((s) => s.id === serverId);
        },

        // ────────────────────────────────────────────────────────────────
        // Tool Approval System
        // ────────────────────────────────────────────────────────────────
        addToolApproval: (approval: ToolApproval) => {
          set((state) => {
            state.pendingToolApprovals.push(approval);
          });
        },

        approveToolCall: (approvalId: string) => {
          set((state) => {
            const approval = state.pendingToolApprovals.find((a) => a.id === approvalId);
            if (approval) {
              approval.status = "approved";
            }
          });
        },

        rejectToolCall: (approvalId: string) => {
          set((state) => {
            const approval = state.pendingToolApprovals.find((a) => a.id === approvalId);
            if (approval) {
              approval.status = "rejected";
            }
          });
        },

        clearToolApprovals: (threadId: string) => {
          set((state) => {
            state.pendingToolApprovals = state.pendingToolApprovals.filter(
              (a) => a.threadId !== threadId,
            );
          });
        },

        setAutoApproveTools: (autoApprove: boolean) => {
          set((state) => {
            state.autoApproveTools = autoApprove;
          });
        },

        // ────────────────────────────────────────────────────────────────
        // General Settings
        // ────────────────────────────────────────────────────────────────
        setGeneralSetting: (key, value) => {
          set((state) => {
            state.generalSettings[key] = value;
            if (key === "alwaysAllowToolActions") {
              state.autoApproveTools = Boolean(value);
            }
            if (key === "toolApprovalMode") {
              state.generalSettings.toolApprovalMode = (value as any) ?? "always_ask";
              state.autoApproveTools = state.generalSettings.toolApprovalMode === "bypass";
            }
          });
        },

        // ────────────────────────────────────────────────────────────────
        // LLM Providers
        // ────────────────────────────────────────────────────────────────
        addLLMProvider: (provider) => {
          set((state) => {
            const exists = state.llmProviders.some((p) => p.id === provider.id);
            if (!exists) {
              state.llmProviders.push(provider);
            }
          });
        },

        setProviders: (providers) => {
          set((state) => {
            state.llmProviders = providers;
          });
        },

        updateLLMProvider: (providerId, updates) => {
          set((state) => {
            const provider = state.llmProviders.find((p) => p.id === providerId);
            if (provider) {
              Object.assign(provider, updates);
              if (updates.lastUpdated) {
                provider.lastUpdated = updates.lastUpdated;
              } else {
                provider.lastUpdated = new Date();
              }
            }
          });
        },

        removeLLMProvider: (providerId) => {
          set((state) => {
            state.llmProviders = state.llmProviders.filter((p) => p.id !== providerId);
          });
        },

        // ────────────────────────────────────────────────────────────────
        // Streaming State
        // ────────────────────────────────────────────────────────────────
        setIsStreaming: (isStreaming: boolean) => {
          set((state) => {
            state.isStreaming = isStreaming;
          });
        },

        setStreamingMessageId: (messageId: string | null) => {
          set((state) => {
            state.streamingMessageId = messageId;
          });
        },

        cancelStreaming: async () => {
          const { selectedAgentId, isStreaming, activeThreadId, streamingMessageId } = get();

          if (!isStreaming) return;

          const agent = get().availableAgents.find((a) => a.id === selectedAgentId);

          if (agent?.type === "acp") {
            const { getAcpAgent } = await import("@/lib/acp/agent");
            const acp = getAcpAgent();
            await acp.stopAgent(selectedAgentId);
          }

          set((state) => {
            state.isStreaming = false;
            state.streamingMessageId = null;

            if (activeThreadId && streamingMessageId) {
              const thread = state.threads.find((t) => t.id === activeThreadId);
              if (thread) {
                const message = thread.messages.find((m) => m.id === streamingMessageId);
                if (message) {
                  message.isStreaming = false;
                  const textContent = message.content.find((c) => c.type === "text");
                  if (textContent && textContent.type === "text") {
                    textContent.text += "\n\n[Cancelled by user]";
                  }
                }
              }
            }
          });
        },

        // ────────────────────────────────────────────────────────────────
        // UI State
        // ────────────────────────────────────────────────────────────────
        setActiveView: (view: AgentActiveView) => {
          set((state) => {
            state.ui.activeView = view;
            if (view !== "history") {
              state.ui.showThreadOverlay = false;
              state.ui.searchQuery = "";
            }
          });
        },

        setThreadOverlayVisible: (visible: boolean) => {
          set((state) => {
            state.ui.showThreadOverlay = visible;
          });
        },

        setSearchQuery: (query: string) => {
          set((state) => {
            state.ui.searchQuery = query;
          });
        },

        // ────────────────────────────────────────────────────────────────
        // Persistence
        // ────────────────────────────────────────────────────────────────
        loadFromStorage: async () => {
          // Handled by zustand persist middleware
        },

        saveToStorage: async () => {
          // Handled by zustand persist middleware
        },
      }),
      {
        name: "athas-agent-panel-v1",
        version: 1,
        partialize: (state) => ({
          threads: state.threads,
          activeThreadId: state.activeThreadId,
          selectedAgentId: state.selectedAgentId,
          availableAgents: state.availableAgents,
          acpSessions: Object.fromEntries(
            Object.entries(state.acpSessions).map(([threadId, session]) => [
              threadId,
              {
                ...session,
                createdAt:
                  session.createdAt instanceof Date
                    ? session.createdAt.toISOString()
                    : session.createdAt,
              },
            ]),
          ),
          mcpServers: state.mcpServers,
          autoApproveTools: state.autoApproveTools,
          generalSettings: state.generalSettings,
          llmProviders: state.llmProviders.map((provider) => ({
            ...provider,
            lastUpdated:
              provider.lastUpdated instanceof Date
                ? provider.lastUpdated.toISOString()
                : (provider.lastUpdated ?? undefined),
          })),
          // Convert Set to Array for serialization
          activeMCPServerIds: Array.from(state.activeMCPServerIds),
          ui: {
            activeView: state.ui.activeView,
            selectedThreadId: state.ui.selectedThreadId,
            searchQuery: state.ui.searchQuery,
            showThreadOverlay: state.ui.showThreadOverlay,
          },
        }),
        merge: (persistedState, currentState) =>
          produce(currentState, (draft) => {
            Object.assign(draft, persistedState);

            // Convert date strings back to Date objects
            if (draft.threads) {
              draft.threads.forEach((thread) => {
                thread.createdAt = new Date(thread.createdAt);
                thread.updatedAt = new Date(thread.updatedAt);
                thread.messages.forEach((msg) => {
                  msg.timestamp = new Date(msg.timestamp);

                  // Reset stuck streaming messages on app reload
                  if (msg.isStreaming) {
                    console.log(`[Store] Resetting stuck streaming message: ${msg.id}`);
                    msg.isStreaming = false;
                  }

                  if (msg.toolCalls) {
                    msg.toolCalls.forEach((tc) => {
                      tc.timestamp = new Date(tc.timestamp);
                    });
                  }
                });
              });
            }

            // Reset global streaming state on app reload
            draft.isStreaming = false;
            draft.streamingMessageId = null;

            if (!draft.generalSettings) {
              draft.generalSettings = createDefaultGeneralSettings();
            }

            draft.autoApproveTools = draft.generalSettings.alwaysAllowToolActions;

            if (!draft.llmProviders) {
              draft.llmProviders = createDefaultLLMProviders();
            } else {
              draft.llmProviders = draft.llmProviders.map((provider) => ({
                ...provider,
                lastUpdated:
                  provider.lastUpdated instanceof Date || provider.lastUpdated === undefined
                    ? provider.lastUpdated
                    : new Date(provider.lastUpdated as string),
              }));
            }

            const defaultAgents = [createDefaultNativeAgent(), ...createDefaultExternalAgents()];
            draft.availableAgents = defaultAgents;
            draft.selectedAgentId = "native";

            if (!draft.acpSessions) {
              draft.acpSessions = {};
            } else {
              Object.entries(draft.acpSessions).forEach(([threadId, session]) => {
                if (session) {
                  const typedSession = session as ACPSession & {
                    createdAt: Date | string;
                  };
                  typedSession.createdAt =
                    typedSession.createdAt instanceof Date
                      ? typedSession.createdAt
                      : new Date(typedSession.createdAt as string);
                  draft.acpSessions[threadId] = typedSession;
                }
              });
            }

            if (!draft.ui) {
              draft.ui = {
                activeView: "thread",
                showThreadOverlay: false,
                selectedThreadId: null,
                searchQuery: "",
              };
            } else {
              draft.ui = {
                activeView: draft.ui.activeView ?? "thread",
                showThreadOverlay: draft.ui.showThreadOverlay ?? false,
                selectedThreadId: draft.ui.selectedThreadId ?? null,
                searchQuery: draft.ui.searchQuery ?? "",
              };
            }

            // Restore Sets from arrays
            draft.activeMCPServerIds = new Set(
              Array.isArray(draft.activeMCPServerIds) ? draft.activeMCPServerIds : [],
            );
          }),
      },
    ),
  ),
);
