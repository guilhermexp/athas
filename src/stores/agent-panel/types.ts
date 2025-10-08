import type {
  ACPSession,
  Agent,
  AgentActiveView,
  AgentGeneralSettingKey,
  AgentGeneralSettings,
  AgentPanelUIState,
  LLMProvider,
  MCPServer,
  Thread,
  ThreadMessage,
  ToolApproval,
} from "@/components/agent-panel/types";

// ============================================================================
// Store State
// ============================================================================

export interface AgentPanelState {
  // Threads
  threads: Thread[];
  activeThreadId: string | null;

  // Agents
  selectedAgentId: string;
  availableAgents: Agent[];
  acpSessions: Record<string, ACPSession>;

  // MCP Servers
  mcpServers: MCPServer[];
  activeMCPServerIds: Set<string>;

  // Tool System
  pendingToolApprovals: ToolApproval[];
  autoApproveTools: boolean;

  // General Settings
  generalSettings: AgentGeneralSettings;

  // LLM Providers
  llmProviders: LLMProvider[];
  setProviders?: (providers: LLMProvider[]) => void;

  // UI State
  ui: AgentPanelUIState;

  // Streaming State
  isStreaming: boolean;
  streamingMessageId: string | null;
}

// ============================================================================
// Store Actions
// ============================================================================

export interface AgentPanelActions {
  // ────────────────────────────────────────────────────────────────────────
  // Thread Management
  // ────────────────────────────────────────────────────────────────────────
  createThread: (agentId: string, title?: string) => string;
  switchThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  updateThreadTitle: (threadId: string, title: string) => void;
  getActiveThread: () => Thread | undefined;

  // ────────────────────────────────────────────────────────────────────────
  // Message Management
  // ────────────────────────────────────────────────────────────────────────
  addMessage: (threadId: string, message: ThreadMessage) => void;
  updateMessage: (threadId: string, messageId: string, updates: Partial<ThreadMessage>) => void;
  getThreadMessages: (threadId: string) => ThreadMessage[];

  // ────────────────────────────────────────────────────────────────────────
  // Agent Management
  // ────────────────────────────────────────────────────────────────────────
  selectAgent: (agentId: string) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;
  deleteAgent: (agentId: string) => void;
  getAgent: (agentId: string) => Agent | undefined;

  // ────────────────────────────────────────────────────────────────────────
  // ACP Sessions
  // ────────────────────────────────────────────────────────────────────────
  setACPSession: (threadId: string, session: ACPSession) => void;
  clearACPSession: (threadId: string) => void;
  getACPSession: (threadId: string) => ACPSession | undefined;

  // ────────────────────────────────────────────────────────────────────────
  // MCP Server Management
  // ────────────────────────────────────────────────────────────────────────
  addMCPServer: (server: MCPServer) => void;
  updateMCPServer: (serverId: string, updates: Partial<MCPServer>) => void;
  removeMCPServer: (serverId: string) => void;
  toggleMCPServer: (serverId: string) => void;
  getMCPServer: (serverId: string) => MCPServer | undefined;

  // ────────────────────────────────────────────────────────────────────────
  // Tool Approval System
  // ────────────────────────────────────────────────────────────────────────
  addToolApproval: (approval: ToolApproval) => void;
  approveToolCall: (approvalId: string) => void;
  rejectToolCall: (approvalId: string) => void;
  clearToolApprovals: (threadId: string) => void;
  setAutoApproveTools: (autoApprove: boolean) => void;

  // ────────────────────────────────────────────────────────────────────────
  // General Settings
  // ────────────────────────────────────────────────────────────────────────
  setGeneralSetting: <K extends AgentGeneralSettingKey>(
    key: K,
    value: AgentGeneralSettings[K],
  ) => void;

  // ────────────────────────────────────────────────────────────────────────
  // LLM Providers
  // ────────────────────────────────────────────────────────────────────────
  addLLMProvider: (provider: LLMProvider) => void;
  updateLLMProvider: (providerId: string, updates: Partial<LLMProvider>) => void;
  removeLLMProvider: (providerId: string) => void;

  // ────────────────────────────────────────────────────────────────────────
  // Streaming State
  // ────────────────────────────────────────────────────────────────────────
  setIsStreaming: (isStreaming: boolean) => void;
  setStreamingMessageId: (messageId: string | null) => void;
  cancelStreaming: () => Promise<void>;

  // ────────────────────────────────────────────────────────────────────────
  // UI State
  // ────────────────────────────────────────────────────────────────────────
  setActiveView: (view: AgentActiveView) => void;
  setThreadOverlayVisible: (visible: boolean) => void;
  setSearchQuery: (query: string) => void;

  // ────────────────────────────────────────────────────────────────────────
  // Persistence
  // ────────────────────────────────────────────────────────────────────────
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}
