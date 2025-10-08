# Arquitetura Completa do Agent Panel - Athas

## 1. Visão Geral

O Agent Panel será implementado como um sistema **paralelo e independente** do AI Chat existente, oferecendo 100% das funcionalidades do Zed Agent Panel:

- **ACP Protocol**: Comunicação JSON-RPC 2.0 com agentes externos via stdio
- **Native Agent**: Agente nativo integrado ao Athas
- **MCP Servers**: Suporte a servidores de ferramentas externos
- **Tool System**: Sistema completo de execução e aprovação de ferramentas
- **Thread System**: Sistema de threads (não chats) com histórico
- **Configuration UI**: Interface completa de configuração

## 2. Estrutura de Arquivos

```
src/
├── components/
│   ├── agent-panel/                    # NOVO - Agent Panel completo
│   │   ├── agent-panel.tsx             # Componente principal
│   │   ├── agent-panel-header.tsx      # Header com controls
│   │   ├── agent-panel-input.tsx       # Input com @ mentions
│   │   ├── thread-selector.tsx         # Seletor de threads
│   │   ├── message-thread.tsx          # Thread de mensagens
│   │   ├── message-item.tsx            # Item individual de mensagem
│   │   ├── tool-call-card.tsx          # Card de tool call
│   │   ├── tool-approval-dialog.tsx    # Dialog de aprovação de tools
│   │   ├── agent-config-panel.tsx      # Painel de configuração
│   │   ├── mcp-server-manager.tsx      # Gerenciador de MCP servers
│   │   ├── mcp-server-card.tsx         # Card de servidor MCP
│   │   ├── agent-selector.tsx          # Seletor de agentes
│   │   └── types.ts                    # Tipos do Agent Panel
│   │
│   └── ai-chat/                        # EXISTENTE - Mantém como está
│       └── ...
│
├── stores/
│   ├── agent-panel/                    # NOVO - State do Agent Panel
│   │   ├── store.ts                    # Store principal
│   │   ├── types.ts                    # Tipos do store
│   │   └── actions.ts                  # Actions separadas
│   │
│   └── ai-chat/                        # EXISTENTE - Sem mudanças
│       └── ...
│
├── lib/
│   ├── acp/                            # NOVO - ACP Protocol
│   │   ├── client.ts                   # Cliente ACP
│   │   ├── types.ts                    # Tipos do protocolo
│   │   ├── messages.ts                 # Builders de mensagens
│   │   ├── parser.ts                   # Parser de respostas
│   │   └── stream-handler.ts           # Handler de streaming
│   │
│   ├── mcp/                            # NOVO - MCP Integration
│   │   ├── client.ts                   # Cliente MCP
│   │   ├── types.ts                    # Tipos MCP
│   │   ├── registry.ts                 # Registry de servers
│   │   ├── tool-executor.ts            # Executor de tools
│   │   └── server-manager.ts           # Gerenciador de processos
│   │
│   └── native-agent/                   # NOVO - Native Agent
│       ├── agent.ts                    # Implementação do agente
│       ├── tools.ts                    # Tools nativos
│       └── context-builder.ts          # Builder de contexto
│
└── utils/
    └── agent-panel/                    # NOVO - Utilitários
        ├── thread-persistence.ts       # Persistência de threads
        ├── tool-schemas.ts             # Schemas de ferramentas
        └── message-formatter.ts        # Formatação de mensagens
```

## 3. Store do Agent Panel (Zustand)

### State Structure

```typescript
interface AgentPanelState {
  // Threads
  threads: Thread[];
  activeThreadId: string | null;

  // Agent Configuration
  selectedAgentId: string; // 'native' | 'claude-code' | custom agent ID
  availableAgents: Agent[];

  // MCP Servers
  mcpServers: MCPServer[];
  activeMCPServerIds: Set<string>;

  // Tool System
  pendingToolApprovals: ToolApproval[];
  autoApproveTools: boolean;

  // UI State
  isConfigPanelOpen: boolean;
  isThreadHistoryOpen: boolean;

  // Streaming State
  isStreaming: boolean;
  streamingMessageId: string | null;
}

interface Thread {
  id: string;
  title: string;
  agentId: string; // Which agent is used in this thread
  messages: ThreadMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata: ThreadMetadata;
}

interface ThreadMessage {
  id: string;
  role: 'user' | 'assistant';
  content: MessageContent[];
  timestamp: Date;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
}

interface MessageContent {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  text?: string;
  image?: ImageData;
  toolUse?: ToolUse;
  toolResult?: ToolResult;
}

interface Agent {
  id: string;
  name: string;
  type: 'native' | 'acp' | 'claude-code';

  // For ACP agents
  command?: string;
  args?: string[];
  env?: Record<string, string>;

  // Configuration
  systemPrompt?: string;
  tools: string[]; // IDs of available tools
  mcpServerIds: string[]; // IDs of MCP servers to use

  // Authentication (for ACP)
  auth?: AuthConfig;
}

interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  status: 'stopped' | 'starting' | 'running' | 'error';
  tools: MCPTool[];
  resources?: MCPResource[];
}

interface ToolApproval {
  id: string;
  messageId: string;
  toolName: string;
  toolInput: any;
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected';
}
```

## 4. ACP Protocol Client

### Implementação

```typescript
// lib/acp/client.ts

class ACPClient {
  private process: ChildProcess | null = null;
  private messageQueue: Map<number, MessageHandler> = new Map();
  private notificationHandlers: Map<string, NotificationHandler[]> = new Map();
  private currentId = 0;

  async initialize(command: string, args: string[]): Promise<InitializeResult> {
    // 1. Spawn process via Tauri invoke
    const processId = await invoke<string>('spawn_agent_process', {
      command,
      args,
      env: {},
    });

    // 2. Setup stdio listeners via Tauri events
    await listen(`agent-stdout-${processId}`, this.handleStdout);
    await listen(`agent-stderr-${processId}`, this.handleStderr);

    // 3. Send initialize request
    const result = await this.sendRequest<InitializeResult>('initialize', {
      protocolVersion: '0.1.0',
      capabilities: {
        tools: {},
      },
      clientInfo: {
        name: 'Athas',
        version: '1.0.0',
      },
    });

    return result;
  }

  async createSession(params: CreateSessionParams): Promise<CreateSessionResult> {
    return this.sendRequest('sessions/create', params);
  }

  async sendInput(params: SessionInputParams): Promise<void> {
    // No response - expect streaming notifications
    await this.sendNotification('sessions/input', params);
  }

  async sendToolResult(params: ToolResultParams): Promise<void> {
    await this.sendNotification('tools/result', params);
  }

  // Handle incoming notifications (streaming)
  onNotification(method: string, handler: NotificationHandler): void {
    if (!this.notificationHandlers.has(method)) {
      this.notificationHandlers.set(method, []);
    }
    this.notificationHandlers.get(method)!.push(handler);
  }

  private async sendRequest<T>(method: string, params?: any): Promise<T> {
    const id = ++this.currentId;
    const message: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.messageQueue.set(id, { resolve, reject });
      this.sendToStdin(JSON.stringify(message) + '\n');
    });
  }

  private handleStdout = (data: string) => {
    const lines = data.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const message = JSON.parse(line);

        // Response to request
        if ('id' in message) {
          const handler = this.messageQueue.get(message.id);
          if (handler) {
            if ('result' in message) {
              handler.resolve(message.result);
            } else if ('error' in message) {
              handler.reject(new Error(message.error.message));
            }
            this.messageQueue.delete(message.id);
          }
        }
        // Notification
        else if ('method' in message) {
          const handlers = this.notificationHandlers.get(message.method) || [];
          for (const handler of handlers) {
            handler(message.params);
          }
        }
      } catch (error) {
        console.error('Failed to parse ACP message:', error);
      }
    }
  };
}
```

## 5. MCP Integration

### MCP Server Manager

```typescript
// lib/mcp/server-manager.ts

class MCPServerManager {
  private servers: Map<string, MCPServerInstance> = new Map();

  async startServer(config: MCPServerConfig): Promise<MCPServer> {
    // 1. Spawn process via Tauri
    const processId = await invoke<string>('spawn_mcp_server', {
      command: config.command,
      args: config.args,
      env: config.env || {},
    });

    // 2. Initialize MCP connection
    const client = new MCPClient(processId);
    await client.initialize();

    // 3. Get available tools
    const tools = await client.listTools();
    const resources = await client.listResources();

    // 4. Store server instance
    const server: MCPServer = {
      id: config.id,
      name: config.name,
      command: config.command,
      args: config.args,
      status: 'running',
      tools,
      resources,
    };

    this.servers.set(config.id, { server, client });

    return server;
  }

  async executeTool(
    serverId: string,
    toolName: string,
    input: any,
  ): Promise<ToolResult> {
    const instance = this.servers.get(serverId);
    if (!instance) {
      throw new Error(`MCP Server not found: ${serverId}`);
    }

    return instance.client.executeTool(toolName, input);
  }

  async stopServer(serverId: string): Promise<void> {
    const instance = this.servers.get(serverId);
    if (instance) {
      await instance.client.close();
      await invoke('kill_process', { processId: instance.client.processId });
      this.servers.delete(serverId);
    }
  }
}
```

## 6. Native Agent Implementation

### Native Agent with Anthropic

```typescript
// lib/native-agent/agent.ts

class NativeAgent {
  private anthropic: Anthropic;
  private toolRegistry: ToolRegistry;

  async processMessage(
    message: string,
    context: AgentContext,
    callbacks: AgentCallbacks,
  ): Promise<void> {
    const tools = this.buildToolDefinitions(context);

    const stream = await this.anthropic.messages.create({
      model: context.modelId || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: context.systemPrompt,
      messages: context.history,
      tools,
      stream: true,
    });

    let currentText = '';

    for await (const chunk of stream) {
      // Handle text streaming
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        currentText += chunk.delta.text;
        callbacks.onChunk(chunk.delta.text);
      }

      // Handle tool use
      if (chunk.type === 'content_block_start' && chunk.content_block.type === 'tool_use') {
        const toolUse = chunk.content_block;

        // Request approval if needed
        if (!context.autoApproveTools) {
          const approved = await callbacks.onToolApprovalRequest(
            toolUse.name,
            toolUse.input,
          );

          if (!approved) {
            callbacks.onToolRejected(toolUse.name);
            continue;
          }
        }

        callbacks.onToolStart(toolUse.name, toolUse.input);

        // Execute tool
        try {
          const result = await this.toolRegistry.execute(
            toolUse.name,
            toolUse.input,
            context,
          );

          callbacks.onToolComplete(toolUse.name, result);

          // Continue conversation with tool result
          context.history.push({
            role: 'assistant',
            content: [{ type: 'tool_use', ...toolUse }],
          });
          context.history.push({
            role: 'user',
            content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: result }],
          });
        } catch (error) {
          callbacks.onToolError(toolUse.name, error.message);
        }
      }

      // Handle completion
      if (chunk.type === 'message_stop') {
        callbacks.onComplete(currentText);
      }
    }
  }

  private buildToolDefinitions(context: AgentContext): Tool[] {
    const tools: Tool[] = [];

    // Add native tools
    for (const toolId of context.enabledTools) {
      const tool = this.toolRegistry.getTool(toolId);
      if (tool) {
        tools.push(tool);
      }
    }

    // Add MCP server tools
    for (const serverId of context.mcpServerIds) {
      const server = context.mcpServers.get(serverId);
      if (server) {
        tools.push(...server.tools);
      }
    }

    return tools;
  }
}
```

## 7. UI Components

### Agent Panel Main Component

```typescript
// components/agent-panel/agent-panel.tsx

export function AgentPanel() {
  const {
    threads,
    activeThreadId,
    selectedAgentId,
    isStreaming,
    createThread,
    sendMessage,
    switchThread,
  } = useAgentPanelStore();

  const activeThread = threads.find(t => t.id === activeThreadId);
  const messages = activeThread?.messages || [];

  const handleSendMessage = async (content: string) => {
    if (!activeThreadId) {
      const newThreadId = createThread(selectedAgentId);
      switchThread(newThreadId);
    }

    await sendMessage(content);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <AgentPanelHeader />

      {/* Thread Selector */}
      <ThreadSelector
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={switchThread}
        onNewThread={() => createThread(selectedAgentId)}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <MessageThread messages={messages} />
      </div>

      {/* Input */}
      <AgentPanelInput
        onSend={handleSendMessage}
        disabled={isStreaming}
      />

      {/* Config Panel (sidebar) */}
      <AgentConfigPanel />
    </div>
  );
}
```

### Tool Call Card

```typescript
// components/agent-panel/tool-call-card.tsx

export function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded border border-border bg-secondary-bg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench size={14} />
          <span className="font-medium">{toolCall.name}</span>
          {toolCall.status === 'pending' && (
            <Loader2 size={12} className="animate-spin" />
          )}
          {toolCall.status === 'complete' && (
            <Check size={12} className="text-green-500" />
          )}
          {toolCall.status === 'error' && (
            <X size={12} className="text-red-500" />
          )}
        </div>

        <button onClick={() => setIsExpanded(!isExpanded)}>
          <ChevronDown
            size={14}
            className={isExpanded ? 'rotate-180' : ''}
          />
        </button>
      </div>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {/* Input */}
          <div>
            <div className="text-xs text-text-lighter">Input:</div>
            <pre className="text-xs">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>

          {/* Output */}
          {toolCall.output && (
            <div>
              <div className="text-xs text-text-lighter">Output:</div>
              <pre className="text-xs">
                {JSON.stringify(toolCall.output, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {toolCall.error && (
            <div>
              <div className="text-xs text-red-500">Error:</div>
              <pre className="text-xs text-red-500">{toolCall.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## 8. Integration Points

### Adicionar Botão na UI

**Opção 1: Botão no sidebar (como Extensions)**

Adicionar em `sidebar-pane-selector.tsx`:

```typescript
<Button
  onClick={() => toggleAgentPanel()}
  variant="ghost"
  size="sm"
  className="..."
  title="Agent Panel"
>
  <Bot size={14} />
</Button>
```

**Opção 2: Botão na barra de título**

Similar ao AI Chat atual, adicionar toggle na barra superior.

### Settings Store

Adicionar em `settings/types.ts`:

```typescript
interface Settings {
  // ... existing
  isAgentPanelVisible: boolean;
  agentPanelPosition: 'left' | 'right';
}
```

### Main Layout Integration

```typescript
// main-layout.tsx

{/* Agent Panel */}
<ResizableRightPane
  position={settings.agentPanelPosition}
  isVisible={settings.isAgentPanelVisible}
>
  <Suspense fallback={<div>Loading Agent Panel...</div>}>
    <AgentPanel />
  </Suspense>
</ResizableRightPane>
```

## 9. Tauri Backend Commands

### Novos Commands Necessários

```rust
// src-tauri/src/main.rs

#[tauri::command]
async fn spawn_agent_process(
    command: String,
    args: Vec<String>,
    env: HashMap<String, String>,
) -> Result<String, String> {
    // Spawn process, return process ID
}

#[tauri::command]
async fn spawn_mcp_server(
    command: String,
    args: Vec<String>,
    env: HashMap<String, String>,
) -> Result<String, String> {
    // Spawn MCP server process
}

#[tauri::command]
async fn send_to_process_stdin(
    process_id: String,
    data: String,
) -> Result<(), String> {
    // Send data to process stdin
}

#[tauri::command]
async fn kill_process(process_id: String) -> Result<(), String> {
    // Kill process
}

// Events emitted:
// - agent-stdout-{process_id}: stdout data
// - agent-stderr-{process_id}: stderr data
// - agent-exit-{process_id}: process exit
```

## 10. Roadmap de Implementação

### Fase 1: Fundação (3-4 dias)
1. ✅ Análise da arquitetura existente
2. ⬜ Criar estrutura de arquivos
3. ⬜ Implementar Agent Panel Store (Zustand)
4. ⬜ Criar componentes básicos de UI
5. ⬜ Adicionar botão de toggle no UI

### Fase 2: ACP Protocol (2-3 dias)
1. ⬜ Implementar ACP Client básico
2. ⬜ Adicionar Tauri commands para processos
3. ⬜ Implementar handshake e session management
4. ⬜ Testar com agente de exemplo

### Fase 3: Native Agent (2-3 dias)
1. ⬜ Implementar Native Agent com Anthropic
2. ⬜ Adicionar tool registry
3. ⬜ Implementar streaming
4. ⬜ Integrar com UI

### Fase 4: MCP Servers (2-3 dias)
1. ⬜ Implementar MCP Client
2. ⬜ Criar MCP Server Manager
3. ⬜ Adicionar UI de configuração de MCP
4. ⬜ Testar com servidores exemplo

### Fase 5: Tool System (2 dias)
1. ⬜ Implementar tool execution
2. ⬜ Adicionar tool approval dialog
3. ⬜ Criar tool call cards
4. ⬜ Integrar ferramentas nativas e MCP

### Fase 6: Configuration UI (1-2 dias)
1. ⬜ Criar painel de configuração
2. ⬜ Adicionar agent selector
3. ⬜ Implementar MCP server manager UI
4. ⬜ Adicionar settings persistence

### Fase 7: Persistence & Polish (1-2 dias)
1. ⬜ Implementar thread persistence
2. ⬜ Adicionar thread history
3. ⬜ Polish UI/UX
4. ⬜ Testes finais

## 11. Diferenças do AI Chat

| Característica | AI Chat Atual | Agent Panel Novo |
|---------------|---------------|------------------|
| Protocolo | APIs diretas (OpenAI, Anthropic) | ACP Protocol (JSON-RPC) |
| Agentes | Apenas providers de API | Native + External + Claude Code |
| Ferramentas | Básico (apenas display) | Sistema completo com approval |
| MCP | ❌ Não | ✅ Sim |
| Threading | Chat-based | Thread-based |
| Config UI | Básica | Completa |
| Streaming | HTTP SSE | stdio + JSON-RPC |
| Process Mgmt | Apenas Claude Code | Múltiplos processos |

## 12. Garantias de Qualidade

- ✅ **100% Feature Parity**: Todas as funcionalidades do Zed
- ✅ **Independente do AI Chat**: Não afeta código existente
- ✅ **Type Safe**: TypeScript completo
- ✅ **Performance**: Lazy loading e memoização
- ✅ **Persistence**: Threads salvos localmente
- ✅ **Error Handling**: Tratamento robusto de erros
- ✅ **Testing**: Testável com agentes mock

## 13. Próximos Passos Imediatos

1. **Criar estrutura de pastas**
2. **Implementar Agent Panel Store básico**
3. **Criar componentes de UI básicos**
4. **Adicionar toggle button**
5. **Implementar Native Agent simples**

---

**Data**: 2025-10-06
**Status**: Planejamento Completo ✅
**Pronto para Implementação**: ✅
