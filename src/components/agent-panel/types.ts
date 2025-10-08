// Agent Panel Types - Based on Zed's implementation

// ============================================================================
// Thread & Message Types
// ============================================================================

export interface Thread {
  id: string;
  title: string;
  agentId: string; // Which agent is used in this thread
  messages: ThreadMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata: ThreadMetadata;
}

export interface ThreadMetadata {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ThreadMessage {
  id: string;
  role: "user" | "assistant";
  content: MessageContent[];
  timestamp: Date;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
}

export interface MessageContent {
  type: "text" | "image" | "tool_use" | "tool_result" | "thinking";
  text?: string;
  image?: ImageContent;
  toolUse?: ToolUse;
  toolResult?: ToolResult;
  thinking?: ThinkingContent;
}

export interface ThinkingContent {
  type: "thinking";
  text: string;
}

export interface ImageContent {
  type: "image";
  source: {
    type: "base64" | "url";
    media_type: string;
    data: string;
  };
}

export interface ToolUse {
  type: "tool_use";
  id: string;
  name: string;
  input: any;
}

export interface ToolResult {
  type: "tool_result";
  tool_use_id: string;
  content: string | any;
  is_error?: boolean;
}

// ============================================================================
// Tool System Types
// ============================================================================

export interface ToolCall {
  id: string;
  name: string;
  input: any;
  output?: any;
  error?: string;
  status: "pending" | "running" | "complete" | "error" | "rejected";
  timestamp: Date;
  duration?: number;
}

export interface ToolApproval {
  id: string;
  messageId: string;
  threadId: string;
  toolName: string;
  toolInput: any;
  timestamp: Date;
  status: "pending" | "approved" | "rejected";
}

export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

// ============================================================================
// Agent Types
// ============================================================================

export type AgentType = "native" | "acp" | "claude-code";

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  description?: string;

  // For ACP agents
  command?: string;
  args?: string[];
  env?: Record<string, string>;

  // Configuration
  systemPrompt?: string;
  modelId?: string;
  tools: string[]; // IDs of available tools
  mcpServerIds: string[]; // IDs of MCP servers to use

  // Authentication (for ACP)
  auth?: AuthConfig;

  // Status
  status: "idle" | "connecting" | "ready" | "error";
  errorMessage?: string;
}

export interface AuthConfig {
  type: "api_key" | "oauth" | "none";
  fields?: AuthField[];
  provider?: string;
  authUrl?: string;
  scopes?: string[];
}

export interface AuthField {
  name: string;
  label: string;
  type: "text" | "password" | "email";
  required: boolean;
}

// ============================================================================
// MCP Server Types
// ============================================================================

export interface MCPServer {
  id: string;
  name: string;
  description?: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  status: "stopped" | "starting" | "running" | "error";
  errorMessage?: string;
  tools: MCPTool[];
  resources?: MCPResource[];
  prompts?: MCPPrompt[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description?: string;
  required: boolean;
}

// ============================================================================
// ACP Protocol Types
// ============================================================================

export interface ACPSession {
  sessionId: string;
  agentId: string;
  model: {
    id: string;
    name: string;
  };
  createdAt: Date;
}

export interface ACPCapabilities {
  sessions?: {
    types: string[];
    models: ACPModel[];
    maxConcurrentSessions?: number;
  };
  tools?: {
    definitions: Tool[];
  };
  streaming?: boolean;
  multimodal?: {
    images?: boolean;
    audio?: boolean;
  };
}

export interface ACPModel {
  id: string;
  name: string;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  supportedFeatures?: string[];
}

// ============================================================================
// Context Types
// ============================================================================

export interface AgentContext {
  // Editor context
  activeFile?: {
    path: string;
    content: string;
    language: string;
    selection?: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
  };

  openFiles?: {
    path: string;
    content: string;
    language: string;
  }[];

  // Project context
  projectRoot?: string;
  workspaceFiles?: string[];

  // Agent configuration
  modelId?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;

  // Tools
  enabledTools: string[];
  mcpServers: Map<string, MCPServer>;
  autoApproveTools: boolean;

  // History
  history: ThreadMessage[];
}

// ============================================================================
// Callback Types
// ============================================================================

export interface AgentCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: (finalText: string) => void;
  onError: (error: string) => void;
  onToolStart: (toolCallId: string, toolName: string, input: any) => void;
  onToolComplete: (toolCallId: string, toolName: string, output: any) => void;
  onToolError: (toolCallId: string, toolName: string, error: string) => void;
  onToolRejected: (toolCallId: string, toolName: string) => void;
  onToolApprovalRequest: (toolName: string, input: any) => Promise<boolean>;
  onNewMessage?: () => void;
}

// ============================================================================
// UI State Types
// ============================================================================

export type AgentActiveView = "thread" | "history" | "configuration" | "text-thread";

export interface AgentGeneralSettings {
  alwaysAllowToolActions: boolean;
  singleFileReview: boolean;
  playSoundWhenAgentDone: boolean;
  useModifierToSend: boolean;
  /**
   * Tool approval mode for the chat input dropdown
   * - always_ask: ask before running any tools
   * - accept_edits: prefer applying edits automatically (future behavior)
   * - bypass: run tools without asking
   * - plan: do not run tools, only plan/explain
   */
  toolApprovalMode?: "always_ask" | "accept_edits" | "bypass" | "plan";
}

export type AgentGeneralSettingKey = keyof AgentGeneralSettings;

export type LLMProviderStatus = "connected" | "requires_auth" | "error";

export interface LLMProvider {
  id: string;
  name: string;
  description?: string;
  status: LLMProviderStatus;
  lastUpdated?: Date | string;
  isDefault?: boolean;
  documentationUrl?: string;
  errorMessage?: string;
}

export interface AgentPanelUIState {
  activeView: AgentActiveView;
  showThreadOverlay: boolean;
  selectedThreadId: string | null;
  searchQuery: string;
}
