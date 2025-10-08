# Zed Agent Panel UI/UX & ACP Protocol Reference

## 📋 Visão Geral

Esta pasta contém referência completa para implementar:

- ✅ **Agent Panel UI**: Interface completa de chat com agentes AI
- ✅ **Protocolo ACP**: Agent Client Protocol para comunicação com agentes
- ✅ **Native Agent**: Agente nativo do Zed (Agent 2)
- ✅ **Agent Connection**: Sistema de conexão com agentes externos
- ✅ **Tool System**: Sistema de ferramentas e capabilities
- ✅ **History & Persistence**: Gerenciamento de histórico e threads

## 🏗️ Arquitetura Geral

```
Agent Panel
│
├── AgentPanel (UI Principal)
│   ├── ActiveView (view ativa)
│   │   ├── ExternalAgentThread → AcpThreadView
│   │   ├── TextThread → TextThreadEditor
│   │   ├── History → Thread history browser
│   │   └── Configuration → Agent settings
│   │
│   ├── Stores
│   │   ├── ThreadStore (external agent threads)
│   │   ├── TextThreadStore (text-based threads)
│   │   ├── HistoryStore (thread history)
│   │   └── AcpHistoryStore (ACP thread history)
│   │
│   └── UI Components
│       ├── Message Thread
│       ├── Tool Calls
│       ├── Diffs
│       └── Terminals
│
└── Agent Connection System
    │
    ├── ACP Protocol (external agents)
    │   ├── AcpConnection
    │   ├── AcpThread
    │   └── AcpThreadView
    │
    └── Native Agent (Zed's built-in)
        ├── NativeAgentServer
        ├── NativeAgent
        └── NativeAgentConnection
```

## 📁 Estrutura de Arquivos

```
agent-panel-reference/
├── README.md                          # Este arquivo
│
├── docs/
│   ├── agent-panel.md                # 📄 Docs oficiais do Zed
│   ├── external-agents.md            # 🔗 Docs de agentes externos
│   ├── MCP_ARCHITECTURE.md           # ✅ Arquitetura MCP/Context Servers
│   └── CONFIGURATION_UI.md           # ✅ UI de Configuração completa
│
├── core-files/
│   ├── agent-panel/
│   │   └── agent_panel.rs            # UI principal do painel
│   │
│   ├── acp-protocol/
│   │   └── acp.rs                    # Implementação do protocolo
│   │
│   ├── native-agent/
│   │   └── native_agent_server.rs    # Servidor do agente nativo
│   │
│   ├── acp-thread/
│   │   └── acp_thread.rs             # Thread/conversação ACP
│   │
│   └── tools/
│       └── acp_tools.rs              # Ferramentas e debug
│
├── protocol-specs/
│   ├── ACP_PROTOCOL.md               # ✅ Especificação completa do protocolo
│   └── TOOL_SYSTEM.md                # ✅ Sistema de tools e MCP servers
│
└── examples/
    ├── basic-agent-implementation.md       # ✅ Cliente ACP completo + UI React
    ├── advanced-agent-features.md          # ✅ Diff viewer, tool approval, multi-agent
    ├── mcp-server-integration.md           # ✅ Integração com MCP servers
    └── configuration-panel-implementation.md # ✅ Configuration Panel completo
```

## 🎯 Componentes Principais

### 1. **Agent Panel** (`agent_panel.rs`)

Painel principal que gerencia a UI e estado:

**Estrutura:**
```rust
pub struct AgentPanel {
    workspace: WeakEntity<Workspace>,
    active_view: ActiveView,           // View ativa (thread, history, etc)
    thread_store: Entity<ThreadStore>,  // Store de threads externas
    context_store: Entity<TextThreadStore>, // Store de text threads
    history_store: Entity<HistoryStore>, // Store de histórico
    acp_history_store: Entity<agent2::HistoryStore>, // Histórico ACP
    // ... outros campos
}
```

**ActiveView (tipos de views):**
- `ExternalAgentThread`: Thread com agente externo (ACP)
- `TextThread`: Thread de texto puro (editor)
- `History`: Navegador de histórico
- `Configuration`: Configurações do agente

**Funcionalidades principais:**
- `new_thread()`: Cria nova thread com agente
- `external_thread()`: Thread com agente externo
- `new_prompt_editor()`: Novo editor de texto
- `open_history()`: Abre histórico
- Serialização de estado

### 2. **Protocolo ACP** (`acp.rs`)

Implementação do Agent Client Protocol:

**Estrutura:**
```rust
pub struct AcpConnection {
    server_name: SharedString,
    connection: Rc<acp::ClientSideConnection>,
    sessions: Rc<RefCell<HashMap<SessionId, AcpSession>>>,
    auth_methods: Vec<acp::AuthMethod>,
    agent_capabilities: acp::AgentCapabilities,
    // ... outros campos
}
```

**Mensagens principais:**
- `initialize`: Inicializa conexão e negotia versão
- `new_session`: Cria nova sessão
- `prompt`: Envia prompt ao agente
- `cancel`: Cancela execução
- `set_session_mode`: Muda modo da sessão

**Capabilities:**
```rust
pub struct AgentCapabilities {
    prompt_capabilities: PromptCapabilities,
    // ... outras capabilities
}

pub struct PromptCapabilities {
    supports_thinking: bool,
    supports_tool_calls: bool,
    supports_attachments: bool,
    // ... outras
}
```

### 3. **Native Agent** (`native_agent_server.rs`)

Agente nativo do Zed (Agent 2):

```rust
pub struct NativeAgentServer {
    fs: Arc<dyn Fs>,
    history: Entity<HistoryStore>,
}

impl AgentServer for NativeAgentServer {
    fn connect(...) -> Task<Result<AgentConnection>> {
        // Cria NativeAgent e retorna connection
    }
}
```

**Diferenças do ACP:**
- Não usa comunicação stdio
- Integrado diretamente no Zed
- Acesso direto ao filesystem e project
- Usa LLM providers do Zed

### 4. **ACP Thread** (`acp_thread.rs`)

Thread de conversação com agente ACP:

```rust
pub struct AcpThread {
    connection: Rc<dyn AgentConnection>,
    session_id: SessionId,
    entries: Vec<AgentThreadEntry>,  // Histórico da conversa
    terminals: HashMap<TerminalId, Entity<Terminal>>,
    // ... outros campos
}

pub enum AgentThreadEntry {
    UserMessage(UserMessage),
    AssistantMessage(AssistantMessage),
    ToolCall(ToolCall),
}
```

**Fluxo de mensagens:**
1. User envia mensagem → `UserMessage`
2. Agent responde → `AssistantMessage` + `ToolCall`s
3. Tools são executados
4. Resultados são mostrados na UI

### 5. **Tool System**

Sistema de ferramentas disponíveis para agentes:

**Built-in tools:**
- `read_file`: Lê arquivo
- `write_file`: Escreve arquivo
- `search_code`: Busca no código
- `run_terminal`: Executa comando
- `list_directory`: Lista diretório

**MCP Servers:**
- Servidores externos que fornecem tools
- Comunicação via stdio
- Registrados em `context_servers` settings

Ver `docs/MCP_ARCHITECTURE.md` para arquitetura completa do sistema MCP.

---

## 🔧 MCP (Model Context Protocol)

### Visão Geral

O Zed implementa suporte completo para MCP servers que fornecem ferramentas adicionais para agentes.

### Componentes

**ContextServerStore** - Gerenciador central de MCP servers
- Track status (Starting, Running, Stopped, Error)
- Start/Stop/Restart servidores
- Sincronizar com settings
- Emitir eventos de mudança de status

**ContextServer** - Servidor individual
- Spawn processo externo (stdio)
- Handshake de inicialização
- Manter conexão ativa
- List/Call tools

**ContextServerConfiguration** - Configuração
- Custom: Definido manualmente pelo usuário
- Extension: Instalado via Zed extension

### Arquitetura

```
┌─────────────────────────────────────┐
│      AgentConfiguration             │
│  (UI de configuração)               │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│    ContextServerStore               │
│  - servers: HashMap<Id, State>      │
│  - start_server()                   │
│  - stop_server()                    │
│  - restart_server()                 │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│    ContextServer (Individual)       │
│  - id: ContextServerId              │
│  - client: MCP Protocol             │
│  - transport: stdio                 │
└────────────┬────────────────────────┘
             │ stdio
┌────────────▼────────────────────────┐
│  External MCP Server Process        │
│  (Node.js, Python, etc)             │
└─────────────────────────────────────┘
```

### Estados

```rust
enum ContextServerState {
    Starting { server, configuration, _task },
    Running { server, configuration },
    Stopped { server, configuration },
    Error { server, configuration, error },
}
```

### Settings

```json
{
  "project": {
    "context_servers": {
      "filesystem": {
        "enabled": true,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]
      },
      "github": {
        "enabled": true,
        "settings": {
          "token": "ghp_xxx"
        }
      }
    }
  }
}
```

Ver `docs/MCP_ARCHITECTURE.md` para detalhes completos.

---

## ⚙️ Configuration Panel

### UI de Configuração

O Agent Panel possui uma UI completa para configurar:
- ✅ General Settings (permissões, notificações, etc)
- ✅ External Agents (ACP)
- ✅ MCP Servers (Model Context Protocol)
- ✅ LLM Providers (Anthropic, OpenAI, etc)

### Estrutura

```
┌────────────────────────────────────────┐
│    Agent Configuration                  │
├────────────────────────────────────────┤
│  General Settings                       │
│  - ☑ Allow commands without asking     │
│  - ☑ Single-file reviews               │
│  - ☑ Play sound when done              │
│  - ☑ Use modifier to send              │
├────────────────────────────────────────┤
│  External Agents                 [+]    │
│  - 🤖 Claude Code               ✓      │
│  - 🔮 Gemini CLI                ✓      │
├────────────────────────────────────────┤
│  MCP Servers                     [+]    │
│  - ● filesystem    [⚙️] [toggle]      │
│  - ● github        [⚙️] [toggle]      │
├────────────────────────────────────────┤
│  LLM Providers                   [+]    │
│  - 🤖 Anthropic                 ▼      │
│  - 🔮 OpenAI                    ▼      │
└────────────────────────────────────────┘
```

### AgentConfiguration Component

```rust
pub struct AgentConfiguration {
    fs: Arc<dyn Fs>,
    language_registry: Arc<LanguageRegistry>,
    agent_server_store: Entity<AgentServerStore>,
    context_server_store: Entity<ContextServerStore>,
    tools: Entity<ToolWorkingSet>,

    // UI State
    configuration_views_by_provider: HashMap<LanguageModelProviderId, AnyView>,
    expanded_provider_configurations: HashMap<LanguageModelProviderId, bool>,
    expanded_context_server_tools: HashMap<ContextServerId, bool>,
}
```

### Seções

**1. General Settings**
- Command permissions
- Single file review
- Sound notifications
- Modifier to send

**2. External Agents**
- Lista de agentes ACP
- Add new agent
- Status indicators

**3. MCP Servers**
- Lista de servidores configurados
- Status (Starting, Running, Stopped, Error)
- Toggle enable/disable
- Configure/View tools/Uninstall

**4. LLM Providers**
- Anthropic, OpenAI, Google, etc
- API Key configuration
- Start new thread

Ver `docs/CONFIGURATION_UI.md` para detalhes completos da UI

## 🔌 Protocolo ACP (Agent Client Protocol)

### Visão Geral

O ACP é um protocolo baseado em JSON-RPC 2.0 para comunicação entre cliente (Zed) e agentes AI.

### Handshake Inicial

```
Client                    Agent
  |                         |
  ├─── initialize ───────>  |
  |    (protocol_version,   |
  |     capabilities)       |
  |                         |
  | <─── response ─────────┤
  |    (protocol_version,   |
  |     auth_methods,       |
  |     capabilities)       |
  |                         |
  ├─── authenticate ──────> | (se necessário)
  |    (method_id)          |
  |                         |
  | <─── response ─────────┤
  |                         |
  ├─── new_session ───────> |
  |    (mcp_servers, cwd)   |
  |                         |
  | <─── response ─────────┤
  |    (session_id, modes,  |
  |     models)             |
```

### Exemplo de Mensagem Prompt

```json
// Client -> Agent
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "prompt",
  "params": {
    "session_id": "session-123",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Create a hello world function"
          }
        ]
      }
    ],
    "attachments": []
  }
}

// Agent -> Client (streaming response)
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "stop_reason": "completed",
    "meta": null
  }
}
```

### Notifications (Agent → Client)

**progress**:
```json
{
  "jsonrpc": "2.0",
  "method": "progress",
  "params": {
    "session_id": "session-123",
    "type": "message_start"
  }
}
```

**tool_call**:
```json
{
  "jsonrpc": "2.0",
  "method": "tool_call",
  "params": {
    "session_id": "session-123",
    "tool_call": {
      "id": "call-1",
      "kind": "write_file",
      "title": "Create hello.ts",
      "content": [...],
      "status": "pending"
    }
  }
}
```

## 🎨 UI Components

### Message Thread

Exibe histórico de mensagens entre usuário e agente:

```
┌─────────────────────────────────────┐
│ ## User                             │
│                                     │
│ Create a hello world function       │
│ @hello.ts                          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ## Assistant                        │
│                                     │
│ I'll create a hello world function. │
│                                     │
│ Tool Call: write_file               │
│ ├─ hello.ts                        │
│ └─ Status: Completed ✓             │
└─────────────────────────────────────┘
```

### Tool Call Card

Exibe execução de ferramentas:

```
┌─────────────────────────────────────┐
│ 🔧 write_file                       │
│                                     │
│ ┌─ Content ─────────────────────┐  │
│ │ function hello() {            │  │
│ │   console.log("Hello World"); │  │
│ │ }                             │  │
│ └───────────────────────────────┘  │
│                                     │
│ Status: ✓ Completed                │
└─────────────────────────────────────┘
```

### Diff View

Mostra mudanças feitas pelo agente:

```
┌─────────────────────────────────────┐
│ hello.ts                            │
│ ─────────────────────────────────── │
│ - // Old code                       │
│ + // New code                       │
│                                     │
│ [Accept] [Reject]                  │
└─────────────────────────────────────┘
```

## 🔐 Autenticação

### Métodos suportados

1. **OAuth**: Fluxo de autenticação via browser
2. **API Key**: Chave de API fornecida pelo usuário
3. **Vertex AI**: Google Cloud authentication

### Fluxo OAuth

```
1. Agent retorna auth_methods com "oauth"
2. User seleciona "Log in with [Provider]"
3. Zed chama authenticate(method_id: "oauth")
4. Agent abre browser para autenticação
5. Agent retorna sucesso
6. Zed pode criar sessões
```

## 💾 Persistência

### Thread Metadata

```rust
pub struct DbThreadMetadata {
    pub id: String,
    pub title: Option<String>,
    pub path: Option<PathBuf>,
    pub agent_name: String,
    pub session_id: SessionId,
    pub last_modified: SystemTime,
}
```

### Serialização

Threads são salvos em:
- **Text Threads**: `~/.config/zed/conversations/`
- **ACP Threads**: Database SQLite

## 🚀 Getting Started

### Para Usuários

1. Configure um agente:
   - Zed Pro (hosted)
   - API key própria
   - Agente externo (Gemini CLI, Claude Code)

2. Abra o Agent Panel: `Cmd+Alt+A`

3. Digite sua mensagem e pressione Enter

### Para Desenvolvedores

1. **Leia a documentação**:
   - `docs/ACP_PROTOCOL.md` - Protocolo ACP
   - `docs/ARCHITECTURE.md` - Arquitetura
   - `docs/IMPLEMENTATION_GUIDE.md` - Implementação

2. **Estude os arquivos core**:
   - `core-files/agent-panel/` - UI
   - `core-files/acp-protocol/` - Protocolo
   - `core-files/native-agent/` - Agente nativo

3. **Implemente seu agente**:
   - Siga `examples/acp-client.md`
   - Implemente mensagens do protocolo
   - Teste com `dev: open acp logs`

## 📖 Documentação Completa

### Protocol Specs

- **`protocol-specs/ACP_PROTOCOL.md`**: Especificação completa do ACP
  - Todas as mensagens JSON-RPC
  - Handshake e inicialização
  - Streaming de respostas
  - Autenticação (OAuth, API Key, Vertex AI)
  - Error handling
  - Capabilities negotiation

- **`protocol-specs/TOOL_SYSTEM.md`**: Sistema de ferramentas
  - Tools padrão (read_file, write_file, etc)
  - Tool execution flow
  - Permission system
  - MCP Servers integration
  - Custom tools
  - Tool telemetry

### Documentation (Documentação)

- **`docs/agent-panel.md`**: Documentação oficial do Zed
  - Visão geral do Agent Panel
  - Como usar o painel
  - Integrações disponíveis

- **`docs/external-agents.md`**: Agentes externos
  - Como conectar agentes via ACP
  - Claude Code, Gemini CLI
  - Criar agentes customizados

- **`docs/MCP_ARCHITECTURE.md`**: Arquitetura MCP completa
  - ContextServerStore, ContextServer, ContextServerConfiguration
  - Lifecycle completo (startup, run, stop)
  - Settings structure
  - Protocol flow (initialize, list tools, call tools)
  - Extension vs Custom servers
  - Error handling e recovery

- **`docs/CONFIGURATION_UI.md`**: UI de Configuração
  - AgentConfiguration component
  - Seções da UI (General, Agents, MCP, Providers)
  - Modals (ConfigureContextServerModal, etc)
  - Settings integration
  - Events e keyboard shortcuts

### Examples (Exemplos Práticos)

- **`examples/basic-agent-implementation.md`**: Implementação completa
  - ACP Client em TypeScript
  - Tool Registry
  - React UI com streaming
  - Agent Server em Python
  - Código pronto para usar

- **`examples/advanced-agent-features.md`**: Features avançadas
  - Diff Viewer com visualização de mudanças
  - Tool Approval System com permissões
  - Multi-Agent Support (troca entre agentes)
  - Session History com persistência
  - Advanced Agent Panel completo

- **`examples/mcp-server-integration.md`**: MCP Servers
  - MCP Client e Manager
  - Configuração de servidores
  - Criação de custom MCP server
  - UI para gerenciar servidores
  - Integração com agente

- **`examples/configuration-panel-implementation.md`**: Configuration Panel
  - Types & Interfaces
  - Store (State Management com Zustand)
  - Components React completos
  - Backend integration
  - Testing

## 📚 Recursos Adicionais

- [ACP Website](https://agentclientprotocol.com)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP Servers Registry](https://github.com/modelcontextprotocol/servers)
- [Gemini CLI](https://github.com/google-gemini/gemini-cli)
- [Claude Code](https://anthropic.com/claude-code)
- [Zed Agent Docs](https://zed.dev/docs/ai)

## 🎯 Guia de Uso

### Iniciante

1. **Leia** `README.md` (este arquivo) para visão geral
2. **Explore** `protocol-specs/ACP_PROTOCOL.md` para entender o protocolo
3. **Implemente** o exemplo em `examples/basic-agent-implementation.md`
4. **Teste** com um agente simples

### Intermediário

1. **Estude** `protocol-specs/TOOL_SYSTEM.md` para tools avançadas
2. **Implemente** features de `examples/advanced-agent-features.md`
3. **Adicione** Diff Viewer e Tool Approval
4. **Configure** Session History

### Avançado

1. **Integre** MCP Servers usando `examples/mcp-server-integration.md`
2. **Crie** custom MCP server com suas próprias tools
3. **Implemente** multi-agent support
4. **Estude** arquivos core em `core-files/` para otimizações

---

**Autor**: Referência extraída do Zed Editor
**Versão**: 1.0.0
**Última Atualização**: 2025
