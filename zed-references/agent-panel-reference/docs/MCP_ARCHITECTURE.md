# Arquitetura MCP (Model Context Protocol)

## Visão Geral

O Zed implementa suporte completo para MCP (Model Context Protocol) servers, que fornecem ferramentas e recursos adicionais para agentes de IA.

---

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Panel                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │            AgentConfiguration                    │   │
│  │  (UI de configuração)                           │   │
│  └─────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│             ContextServerStore                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  servers: HashMap<ContextServerId, State>      │    │
│  │  - Starting                                     │    │
│  │  - Running                                      │    │
│  │  - Stopped                                      │    │
│  │  - Error                                        │    │
│  └────────────────────────────────────────────────┘    │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│           ContextServer (Individual)                    │
│  ┌────────────────────────────────────────────────┐    │
│  │  - id: ContextServerId                         │    │
│  │  - client: MCP Protocol Client                 │    │
│  │  - transport: stdio | custom                   │    │
│  └────────────────────────────────────────────────┘    │
└────────────┬────────────────────────────────────────────┘
             │ stdio
┌────────────▼────────────────────────────────────────────┐
│           External MCP Server Process                   │
│  (Node.js, Python, etc)                                │
└─────────────────────────────────────────────────────────┘
```

---

## Componentes Principais

### 1. ContextServerStore

Gerenciador central de todos os MCP servers.

**Responsabilidades:**
- Track status de cada servidor (Starting, Running, Stopped, Error)
- Start/Stop/Restart servidores
- Sincronizar com settings (ProjectSettings.context_servers)
- Emitir eventos quando status muda
- Resolver configurações de extensions

**Estrutura:**
```rust
pub struct ContextServerStore {
    // Settings de cada servidor (do settings.json)
    context_server_settings: HashMap<Arc<str>, ContextServerSettings>,

    // Estado atual de cada servidor
    servers: HashMap<ContextServerId, ContextServerState>,

    // Referências a outros componentes
    worktree_store: Entity<WorktreeStore>,
    project: WeakEntity<Project>,
    registry: Entity<ContextServerDescriptorRegistry>,

    // Task de atualização
    update_servers_task: Option<Task<Result<()>>>,
}
```

**Estados possíveis:**
```rust
enum ContextServerState {
    Starting {
        server: Arc<ContextServer>,
        configuration: Arc<ContextServerConfiguration>,
        _task: Task<()>,
    },
    Running {
        server: Arc<ContextServer>,
        configuration: Arc<ContextServerConfiguration>,
    },
    Stopped {
        server: Arc<ContextServer>,
        configuration: Arc<ContextServerConfiguration>,
    },
    Error {
        server: Arc<ContextServer>,
        configuration: Arc<ContextServerConfiguration>,
        error: Arc<str>,
    },
}
```

**Métodos principais:**
```rust
// Pegar servidor
pub fn get_server(&self, id: &ContextServerId) -> Option<Arc<ContextServer>>
pub fn get_running_server(&self, id: &ContextServerId) -> Option<Arc<ContextServer>>

// Status
pub fn status_for_server(&self, id: &ContextServerId) -> Option<ContextServerStatus>

// Controle
pub fn start_server(&mut self, server: Arc<ContextServer>, cx: &mut Context<Self>)
pub fn stop_server(&mut self, id: &ContextServerId, cx: &mut Context<Self>) -> Result<()>
pub fn restart_server(&mut self, id: &ContextServerId, cx: &mut Context<Self>) -> Result<()>

// Listar
pub fn server_ids(&self, cx: &App) -> HashSet<ContextServerId>
pub fn running_servers(&self) -> Vec<Arc<ContextServer>>
```

**Events:**
```rust
pub enum Event {
    ServerStatusChanged {
        server_id: ContextServerId,
        status: ContextServerStatus,
    },
}
```

---

### 2. ContextServer

Representa um servidor MCP individual.

**Responsabilidades:**
- Spawn processo do servidor (stdio)
- Handshake de inicialização (protocol.initialize)
- Manter client connection ativo
- Stop servidor quando necessário

**Estrutura:**
```rust
pub struct ContextServer {
    id: ContextServerId,
    client: RwLock<Option<Arc<InitializedContextServerProtocol>>>,
    configuration: ContextServerTransport,
}

enum ContextServerTransport {
    Stdio(ContextServerCommand, Option<PathBuf>),  // Processo externo
    Custom(Arc<dyn Transport>),                    // Transport customizado
}
```

**Lifecycle:**

1. **Create:**
```rust
let server = Arc::new(ContextServer::stdio(
    ContextServerId("filesystem".into()),
    ContextServerCommand {
        path: "npx".into(),
        args: vec!["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
        env: None,
        timeout: None,
    },
    Some(root_path),
));
```

2. **Start:**
```rust
server.start(cx).await?;
// Spawns process
// Sends initialize message
// Waits for initialized response
// Sets client to Ready
```

3. **Use:**
```rust
if let Some(client) = server.client() {
    // Use client to:
    // - List tools
    // - Call tools
    // - Handle notifications
}
```

4. **Stop:**
```rust
server.stop()?;
// Kills process
// Clears client
```

---

### 3. ContextServerConfiguration

Configuração de como executar um servidor.

**Tipos:**

```rust
pub enum ContextServerConfiguration {
    // Servidor customizado definido manualmente
    Custom {
        command: ContextServerCommand,
    },

    // Servidor instalado via extension
    Extension {
        command: ContextServerCommand,
        settings: serde_json::Value,  // Settings específicas
    },
}
```

**ContextServerCommand:**
```rust
pub struct ContextServerCommand {
    pub path: PathBuf,              // Executável (ex: "npx")
    pub args: Vec<String>,          // Args (ex: ["-y", "server-name"])
    pub env: Option<HashMap<String, String>>,  // Env vars
    pub timeout: Option<Duration>,  // Timeout opcional
}
```

**Resolução:**
```rust
// From settings
let configuration = ContextServerConfiguration::from_settings(
    settings,
    server_id,
    registry,
    worktree_store,
    cx,
).await?;
```

---

### 4. ContextServerDescriptorRegistry

Registry de servidores disponíveis via extensions.

**Responsabilidades:**
- Track extensions instaladas que fornecem MCP servers
- Fornecer descriptors com metadata (nome, descrição, ícone, etc)
- Resolver configuration de extension servers

**Estrutura:**
```rust
pub struct ContextServerDescriptorRegistry {
    descriptors: HashMap<Arc<str>, Arc<ContextServerDescriptor>>,
}

pub struct ContextServerDescriptor {
    pub id: Arc<str>,
    pub name: SharedString,
    pub description: Option<SharedString>,
    // ... extension metadata
}
```

**Uso:**
```rust
let registry = ContextServerDescriptorRegistry::default_global(cx);
let descriptor = registry.read(cx).context_server_descriptor("filesystem");
```

---

## Settings Structure

### ProjectSettings.context_servers

```json
{
  "project": {
    "context_servers": {
      // Custom server
      "my-custom-server": {
        "command": "/path/to/server",
        "args": ["--port", "8080"],
        "env": {
          "API_KEY": "xxx"
        },
        "enabled": true
      },

      // Extension server
      "mcp-server-filesystem": {
        "enabled": true,
        "settings": {
          "rootPath": "/workspace"
        }
      }
    }
  }
}
```

### ContextServerSettings (Rust)

```rust
pub enum ContextServerSettings {
    Custom {
        enabled: bool,
        command: ContextServerCommand,
    },
    Extension {
        enabled: bool,
        settings: serde_json::Value,
    },
}

impl ContextServerSettings {
    pub fn enabled(&self) -> bool {
        match self {
            ContextServerSettings::Custom { enabled, .. } => *enabled,
            ContextServerSettings::Extension { enabled, .. } => *enabled,
        }
    }
}
```

---

## Protocol Flow

### 1. Initialize Handshake

```
Client (Zed)                     Server (MCP)
     |                                |
     ├─── initialize ─────────────►   |
     |    {                           |
     |      "protocolVersion": "...", |
     |      "capabilities": {},       |
     |      "clientInfo": {           |
     |        "name": "Zed",          |
     |        "version": "..."        |
     |      }                         |
     |    }                           |
     |                                |
     |  ◄────── initialized ─────────┤
     |    {                           |
     |      "protocolVersion": "...", |
     |      "capabilities": {         |
     |        "tools": {}             |
     |      },                        |
     |      "serverInfo": {           |
     |        "name": "...",          |
     |        "version": "..."        |
     |      }                         |
     |    }                           |
```

### 2. List Tools

```
Client                           Server
     |                                |
     ├─── tools/list ──────────────► |
     |                                |
     |  ◄────── response ────────────┤
     |    {                           |
     |      "tools": [                |
     |        {                       |
     |          "name": "read_file",  |
     |          "description": "...", |
     |          "inputSchema": {...}  |
     |        }                       |
     |      ]                         |
     |    }                           |
```

### 3. Call Tool

```
Client                           Server
     |                                |
     ├─── tools/call ──────────────► |
     |    {                           |
     |      "name": "read_file",      |
     |      "arguments": {            |
     |        "path": "file.txt"      |
     |      }                         |
     |    }                           |
     |                                |
     |  ◄────── response ────────────┤
     |    {                           |
     |      "content": [              |
     |        {                       |
     |          "type": "text",       |
     |          "text": "..."         |
     |        }                       |
     |      ]                         |
     |    }                           |
```

---

## Lifecycle Completo

### Startup Sequence

1. **Load Settings**
```rust
// Settings são carregados do settings.json
let settings = ProjectSettings::get_global(cx).context_servers;
```

2. **Create Store**
```rust
let store = cx.new(|cx| {
    ContextServerStore::new(worktree_store, weak_project, cx)
});
```

3. **Observe Changes**
```rust
cx.observe_global::<SettingsStore>(|this, cx| {
    let new_settings = resolve_context_server_settings(&this.worktree_store, cx);
    if &this.context_server_settings != new_settings {
        this.context_server_settings = new_settings.clone();
        this.available_context_servers_changed(cx);
    }
})
```

4. **Start Enabled Servers**
```rust
for (id, settings) in context_server_settings {
    if settings.enabled() {
        let configuration = ContextServerConfiguration::from_settings(...).await?;
        let server = Arc::new(ContextServer::stdio(id, configuration.command(), root_path));
        store.start_server(server, cx);
    }
}
```

### Server Start Sequence

1. **Create ContextServer**
```rust
let server = Arc::new(ContextServer::stdio(id, command, root_path));
```

2. **State: Starting**
```rust
store.update_server_state(
    id.clone(),
    ContextServerState::Starting {
        server: server.clone(),
        configuration,
        _task,
    },
    cx,
);
```

3. **Start Process & Initialize**
```rust
let task = cx.spawn(async move {
    match server.start(cx).await {
        Ok(_) => {
            // State: Running
            store.update_server_state(
                id,
                ContextServerState::Running { server, configuration },
                cx,
            )
        }
        Err(err) => {
            // State: Error
            store.update_server_state(
                id,
                ContextServerState::Error { server, configuration, error },
                cx,
            )
        }
    }
});
```

4. **Emit Event**
```rust
cx.emit(Event::ServerStatusChanged {
    server_id: id,
    status: ContextServerStatus::Running,
});
```

### Server Stop Sequence

1. **Stop Server**
```rust
store.stop_server(&id, cx)?;
```

2. **Kill Process**
```rust
server.stop()?;  // Kills child process, drops client
```

3. **Update State**
```rust
store.update_server_state(
    id,
    ContextServerState::Stopped { server, configuration },
    cx,
);
```

4. **Emit Event**
```rust
cx.emit(Event::ServerStatusChanged {
    server_id: id,
    status: ContextServerStatus::Stopped,
});
```

---

## Error Handling

### Common Errors

1. **Server Binary Not Found**
```
Error: No such file or directory (os error 2)
Solution: Install the server binary or check path
```

2. **Port Already in Use**
```
Error: Address already in use
Solution: Kill existing process or use different port
```

3. **Initialize Timeout**
```
Error: Timeout waiting for initialization
Solution: Check server logs, increase timeout
```

4. **Invalid Settings**
```
Error: JSON schema validation failed
Solution: Fix settings to match schema
```

### Recovery

```rust
// Auto-restart on failure
cx.observe(&context_server_store, |this, store, cx| {
    for (id, status) in store.server_statuses() {
        if let ContextServerStatus::Error(error) = status {
            log::error!("Server {} failed: {}", id, error);

            // Optionally retry
            cx.spawn(|this, cx| async move {
                smol::Timer::after(Duration::from_secs(5)).await;
                this.update(cx, |this, cx| {
                    store.restart_server(&id, cx)
                })?
            }).detach();
        }
    }
});
```

---

## Extension vs Custom Servers

### Custom Servers

**Definição:**
- Definidos manualmente em settings.json
- Path completo do executável
- Full control sobre args e env

**Exemplo:**
```json
{
  "project": {
    "context_servers": {
      "my-server": {
        "command": "/usr/local/bin/my-mcp-server",
        "args": ["--config", "/path/to/config.json"],
        "env": {
          "API_KEY": "xxx"
        },
        "enabled": true
      }
    }
  }
}
```

### Extension Servers

**Definição:**
- Instalados via Zed extensions
- Metadata fornecida pela extension (nome, descrição, ícone, schema)
- Settings validadas via JSON schema
- Command resolved automaticamente

**Exemplo:**
```json
{
  "project": {
    "context_servers": {
      "mcp-server-filesystem": {
        "enabled": true,
        "settings": {
          "rootPath": "/workspace",
          "allowedPaths": ["/workspace", "/tmp"]
        }
      }
    }
  }
}
```

**Extension Manifest:**
```json
{
  "context_servers": {
    "mcp-server-filesystem": {
      "command": {
        "path": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem"]
      },
      "settings_schema": {
        "type": "object",
        "properties": {
          "rootPath": { "type": "string" },
          "allowedPaths": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      },
      "installation_instructions": "Run `npm install -g @modelcontextprotocol/server-filesystem`"
    }
  }
}
```

---

## Performance Considerations

### Process Management

- Each server runs in separate process
- stdio communication overhead
- Consider process pooling for many servers

### Caching

- Cache tool definitions after initialize
- Debounce settings changes
- Batch operations when possible

### Resource Limits

```rust
pub struct ContextServerCommand {
    pub timeout: Option<Duration>,  // Per-request timeout
}

// Example:
ContextServerCommand {
    path: "npx".into(),
    args: vec!["server"],
    env: None,
    timeout: Some(Duration::from_secs(30)),  // 30s timeout
}
```

---

## Testing

### Mock MCP Server

```rust
use context_server::test::TestContextServer;

let server = TestContextServer::new()
    .with_tool("read_file", |args| {
        Ok(json!({
            "content": [{"type": "text", "text": "file contents"}]
        }))
    })
    .with_tool("write_file", |args| {
        Ok(json!({}))
    });

server.start().await?;
```

### Integration Test

```rust
#[gpui::test]
async fn test_context_server_lifecycle(cx: &mut TestAppContext) {
    let store = cx.new(|cx| {
        ContextServerStore::test(registry, worktree_store, weak_project, cx)
    });

    // Create server
    let server = Arc::new(ContextServer::stdio(
        ContextServerId("test".into()),
        command,
        None,
    ));

    // Start
    store.update(cx, |store, cx| {
        store.start_server(server.clone(), cx);
    });

    // Wait for running
    cx.executor().advance_clock(Duration::from_secs(1));

    // Verify
    store.read_with(cx, |store, _| {
        let status = store.status_for_server(&server.id()).unwrap();
        assert_eq!(status, ContextServerStatus::Running);
    });
}
```

---

## Debugging

### Enable Logging

```bash
RUST_LOG=context_server=debug zed
```

### Check Server Status

```rust
// In agent panel configuration
for (id, status) in store.server_ids(cx) {
    log::info!("Server {}: {:?}", id, store.status_for_server(&id));
}
```

### View Protocol Messages

```rust
// Add logging in ContextServer::initialize
log::debug!("Sending initialize: {:?}", initialize_params);
log::debug!("Received initialized: {:?}", initialized_response);
```

---

## Referências

- Model Context Protocol: https://modelcontextprotocol.io/
- Zed Extensions: https://zed.dev/docs/extensions
- MCP Servers Registry: https://github.com/modelcontextprotocol/servers
