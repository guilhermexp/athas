import type { Chat, Message } from "@/components/ai-chat/types";
import type { FileEntry } from "@/file-system/models/app";

export type AgentStatus = "idle" | "typing" | "thinking" | "responding" | "finished";

export interface QueuedMessage {
  id: string;
  content: string;
  timestamp: Date;
}

export interface AgentSession {
  id: string;
  name: string;
  chats: Chat[];
  currentChatId: string | null;
  input: string;
  isTyping: boolean;
  streamingMessageId: string | null;
  selectedBufferIds: Set<string>;
  selectedFilesPaths: Set<string>;
  isContextDropdownOpen: boolean;
  isSendAnimating: boolean;
  createdAt: Date;
  status: AgentStatus;
  lastActivity: Date;
  messageQueue: QueuedMessage[];
  isProcessingQueue: boolean;
}

export interface AIChatState {
  // Multi-agent state
  agentSessions: AgentSession[];
  activeAgentSessionId: string | null;

  // Global state
  hasApiKey: boolean;
  isChatHistoryVisible: boolean;

  // Provider API keys state
  providerApiKeys: Map<string, boolean>;
  apiKeyModalState: { isOpen: boolean; providerId: string | null };

  // Mention state
  mentionState: {
    active: boolean;
    position: { top: number; left: number };
    search: string;
    startIndex: number;
    selectedIndex: number;
  };
}

export interface AIChatActions {
  // Agent session actions
  createAgentSession: (name?: string) => string;
  switchToAgentSession: (sessionId: string) => void;
  deleteAgentSession: (sessionId: string) => void;
  renameAgentSession: (sessionId: string, name: string) => void;
  getActiveAgentSession: () => AgentSession | undefined;
  updateAgentStatus: (sessionId: string, status: AgentStatus) => void;
  updateAgentActivity: (sessionId: string) => void;

  // Message queue actions
  addMessageToQueue: (sessionId: string, message: string) => void;
  processNextMessage: (sessionId: string) => QueuedMessage | null;
  clearMessageQueue: (sessionId: string) => void;

  // Input actions (for active session)
  setInput: (input: string) => void;
  setIsTyping: (isTyping: boolean) => void;
  setStreamingMessageId: (streamingMessageId: string | null) => void;
  toggleBufferSelection: (bufferId: string) => void;
  toggleFileSelection: (filePath: string) => void;
  setIsContextDropdownOpen: (isContextDropdownOpen: boolean) => void;
  setIsSendAnimating: (isSendAnimating: boolean) => void;
  setHasApiKey: (hasApiKey: boolean) => void;
  clearSelectedBuffers: () => void;
  clearSelectedFiles: () => void;
  setSelectedBufferIds: (selectedBufferIds: Set<string>) => void;
  setSelectedFilesPaths: (selectedFilesPaths: Set<string>) => void;
  autoSelectBuffer: (bufferId: string) => void;

  // Chat actions (for active session)
  createNewChat: () => string;
  switchToChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  regenerateResponse: () => string | null;
  setIsChatHistoryVisible: (isChatHistoryVisible: boolean) => void;

  // Provider API key actions
  setApiKeyModalState: (apiKeyModalState: { isOpen: boolean; providerId: string | null }) => void;
  checkApiKey: (providerId: string) => Promise<void>;
  checkAllProviderApiKeys: () => Promise<void>;
  saveApiKey: (providerId: string, apiKey: string) => Promise<boolean>;
  removeApiKey: (providerId: string) => Promise<void>;
  hasProviderApiKey: (providerId: string) => boolean;

  // Mention actions
  showMention: (
    position: { top: number; left: number },
    search: string,
    startIndex: number,
  ) => void;
  hideMention: () => void;
  updateSearch: (search: string) => void;
  updatePosition: (position: { top: number; left: number }) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  setSelectedIndex: (index: number) => void;
  getFilteredFiles: (allFiles: FileEntry[]) => FileEntry[];

  // Helper getters (for active session)
  getCurrentChat: () => Chat | undefined;
  getCurrentMessages: () => Message[];
}
