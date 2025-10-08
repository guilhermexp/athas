# Agent Client Protocol (ACP) - Guia Completo

## 📚 Índice

1. [O que é ACP](#o-que-é-acp)
2. [Configuração Inicial](#configuração-inicial)
3. [Arquitetura](#arquitetura)
4. [Troubleshooting](#troubleshooting)
5. [Referência de Métodos](#referência-de-métodos)
6. [Logs e Debugging](#logs-e-debugging)

---

## O que é ACP

O **Agent Client Protocol (ACP)** é um protocolo padronizado para comunicação entre editores de código e agentes de IA. Ele permite que o Claude Code execute ações no seu editor como:

- ✅ Ler e escrever arquivos
- ✅ Buscar código (grep/glob)
- ✅ Executar comandos no terminal
- ✅ Solicitar permissões ao usuário

### Especificação Oficial

- **Site**: https://agentclientprotocol.com
- **Repositório**: https://github.com/zed-industries/agent-client-protocol
- **Formato**: JSON-RPC 2.0 sobre stdio (newline-delimited JSON)

---

## Configuração Inicial

### Pré-requisitos

1. **Claude Code CLI autenticado**:
   ```bash
   bunx @zed-industries/claude-code-acp@latest
   # No terminal interativo, digite: /login
   ```

2. **Verificar autenticação**:
   ```bash
   ls -la ~/.claude.json
   # Deve existir este arquivo
   ```

3. **Dependências do projeto**:
   - Bun instalado (`bun --version`)
   - Tauri CLI (`cargo tauri --version`)

### Passo 1: Configurar Agent no Frontend

**Arquivo**: `src/components/agent-panel/config/agents.ts` (ou similar)

```typescript
export const BUILTIN_AGENTS: Agent[] = [
  {
    id: "acp_claude",
    name: "Claude Code",
    type: "acp",
    command: "managed:claude_code", // Usa bunx automaticamente
    description: "Claude via Agent Client Protocol",
    modelId: "claude-sonnet-4-5-20250929",
    status: "idle",
  },
];
```

### Passo 2: Verificar Backend Rust

**Arquivo**: `src-tauri/src/acp_bridge.rs`

Certifique-se que o método `start_agent` suporta `managed:claude_code`:

```rust
if command == "managed:claude_code" {
    let runner = which::which("bunx")
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "npx".to_string());

    let mut c = Command::new(runner);
    c.arg("@zed-industries/claude-code-acp@latest");
    // ...
}
```

### Passo 3: Testar Comunicação

1. Inicie o app: `bun run tauri dev`
2. Abra o painel de agentes
3. Selecione "Claude Code"
4. Envie uma mensagem: "oi"
5. Verifique os logs: `tail -f ~/Library/Logs/com.code.athas/Athas.log | grep ACP`

**Output esperado**:
```
[ACP] Sending: {"method":"initialize"...}
[ACP] Received: {"result":{"agentCapabilities"...}}
[ACP] Sending: {"method":"session/new"...}
[ACP] Received: {"result":{"sessionId":"..."}}
[ACP] Sending: {"method":"session/prompt"...}
[ACP] Received: session/update - "Olá! Como posso ajudar..."
```

---

## Arquitetura

### Fluxo de Comunicação

```
┌─────────────────┐                    ┌──────────────────┐
│   Frontend (TS) │                    │   Backend (Rust) │
│                 │                    │                  │
│  agent.ts       │──── invoke() ────▶│  acp_bridge.rs   │
│  processMessage │                    │  start_agent     │
└─────────────────┘                    └──────────────────┘
                                              │
                                              │ spawn
                                              ▼
                                       ┌──────────────────┐
                                       │   bunx process   │
                                       │                  │
                                       │  claude-code-acp │
                                       │                  │
                                       └──────────────────┘
                                              │
                                              │ stdio (newline JSON)
                                              │
                                       ┌──────────────────┐
                                       │  Claude Code SDK │
                                       │                  │
                                       │  Anthropic API   │
                                       └──────────────────┘
```

### Protocolo de Mensagens

#### 1. Inicialização

**Cliente → Servidor**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": 0.1,
    "clientCapabilities": {
      "fs": {
        "readTextFile": true,
        "writeTextFile": true
      },
      "terminal": true
    },
    "clientInfo": {
      "name": "Athas",
      "version": "0.1.0"
    }
  }
}
```

**Servidor → Cliente**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": 1,
    "agentCapabilities": {
      "promptCapabilities": {
        "image": true,
        "embeddedContext": true
      },
      "mcpCapabilities": {
        "http": true,
        "sse": true
      }
    },
    "authMethods": [...]
  }
}
```

#### 2. Criar Sessão

**Cliente → Servidor**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "session/new",
  "params": {
    "cwd": "/path/to/project",
    "mcpServers": []
  }
}
```

**Servidor → Cliente**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "sessionId": "0199c07a-1a5c-7749-95f9-ed1aafd11459",
    "modes": {
      "currentModeId": "default",
      "availableModes": [...]
    }
  }
}
```

#### 3. Enviar Prompt

**Cliente → Servidor**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "session/prompt",
  "params": {
    "sessionId": "0199c07a-...",
    "prompt": [
      {
        "type": "text",
        "text": "Analyze this code"
      }
    ]
  }
}
```

#### 4. Receber Resposta (Streaming)

**Servidor → Cliente** (notificação, sem `id`):
```json
{
  "jsonrpc": "2.0",
  "method": "session/update",
  "params": {
    "sessionId": "0199c07a-...",
    "update": {
      "sessionUpdate": "agent_message_chunk",
      "content": {
        "type": "text",
        "text": "Vou analisar o código..."
      }
    }
  }
}
```

**Servidor → Cliente** (resposta final):
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "stopReason": "end_turn"
  }
}
```

### Tipos de Session Updates

| sessionUpdate | Descrição | Handler |
|---------------|-----------|---------|
| `agent_message_chunk` | Texto da resposta do Claude | `callbacks.onChunk()` |
| `agent_thought_chunk` | Raciocínio interno (opcional) | Ignorado |
| `user_message_chunk` | Echo da mensagem do usuário | Ignorado |
| `tool_call` | Claude está chamando uma ferramenta | `handleToolCall()` |
| `tool_call_update` | Atualização do status da ferramenta | Log |
| `available_commands_update` | Slash commands disponíveis | Log |

---

## Troubleshooting

### Erro: "Method not found: newSession"

**Causa**: Nome do método incorreto (camelCase em vez de slash notation)

**Solução**:
```typescript
// ❌ ERRADO
method: "newSession"

// ✅ CORRETO
method: "session/new"
```

**Arquivo**: `src/lib/acp/agent.ts:199`

---

### Erro: "Invalid params: protocolVersion"

**Causa**: `protocolVersion` enviado como string em vez de número

**Erro**:
```json
"protocolVersion": "0.1.0"  // ❌ String
```

**Solução**:
```typescript
const DEFAULT_PROTOCOL_VERSION = 0.1; // ✅ Number

params: {
  protocolVersion: DEFAULT_PROTOCOL_VERSION,
  // ...
}
```

**Arquivo**: `src/lib/acp/agent.ts:31, 91`

---

### Erro: "Invalid params: clientCapabilities required"

**Causa**: Parâmetro chamado `capabilities` em vez de `clientCapabilities`

**Erro**:
```json
{
  "capabilities": { ... }  // ❌ Errado
}
```

**Solução**:
```json
{
  "clientCapabilities": { ... }  // ✅ Correto
}
```

**Arquivo**: `src/lib/acp/agent.ts:92`

---

### Erro: "Unsupported request: fs/read_text_file"

**Causa**: Handler não implementado

**Solução**: Adicionar case no `handleRequest`:

```typescript
case "fs/read_text_file": {
  await this.handleReadTextFile(agentId, id, params);
  break;
}
```

**Arquivo**: `src/lib/acp/agent.ts:350-352`

---

### Erro: "Unsupported request: session/request_permission"

**Causa**: Handler de permissões não implementado

**Solução**: Auto-aprovar por enquanto:

```typescript
case "session/request_permission": {
  await this.sendMessage(agentId, {
    jsonrpc: "2.0",
    id,
    result: {
      optionId: "allow_once"
    }
  });
  break;
}
```

**Arquivo**: `src/lib/acp/agent.ts:358-360`

---

### Resposta não aparece na UI

**Causa**: Handler `session/update` não processando chunks

**Sintoma**: Logs mostram mensagens chegando mas nada aparece na tela

**Solução**: Implementar `handleSessionUpdate`:

```typescript
private async handleNotification(agentId: string, method: string, params: any) {
  switch (method) {
    case "session/update": {
      await this.handleSessionUpdate(agentId, inflight, params);
      break;
    }
    // ...
  }
}

private async handleSessionUpdate(agentId, inflight, params) {
  const updateType = params.update.sessionUpdate;

  if (updateType === "agent_message_chunk") {
    const text = params.update.content.text;
    inflight.callbacks.onChunk(text);
  }
}
```

**Arquivo**: `src/lib/acp/agent.ts:407-416, 449-516`

---

### Claude não consegue autenticar

**Sintoma**:
```
Error handling request { ... }
{ code: -32001, message: 'Auth required' }
```

**Solução**:

1. **Fazer login**:
   ```bash
   bunx @zed-industries/claude-code-acp@latest
   # Digite: /login
   ```

2. **Verificar arquivo de autenticação**:
   ```bash
   cat ~/.claude.json
   # Deve ter um token
   ```

3. **Se perdeu autenticação**:
   ```bash
   # Restaurar backup se existir
   cp ~/.claude.json.backup ~/.claude.json

   # Ou fazer login novamente
   rm ~/.claude.json
   bunx @zed-industries/claude-code-acp@latest
   # /login
   ```

---

## Referência de Métodos

### Métodos RPC Suportados

#### `initialize`

**Direção**: Cliente → Servidor
**Tipo**: Request (tem `id`)

**Parâmetros**:
- `protocolVersion` (number): `0.1`
- `clientCapabilities` (object): Capacidades do cliente
- `clientInfo` (object): Nome e versão do cliente

**Resposta**:
- `agentCapabilities` (object): Capacidades do agente
- `authMethods` (array): Métodos de autenticação disponíveis

---

#### `session/new`

**Direção**: Cliente → Servidor
**Tipo**: Request

**Parâmetros**:
- `cwd` (string): Diretório de trabalho
- `mcpServers` (array): Servidores MCP adicionais

**Resposta**:
- `sessionId` (string): UUID da sessão criada
- `modes` (object): Modos de permissão disponíveis

---

#### `session/prompt`

**Direção**: Cliente → Servidor
**Tipo**: Request

**Parâmetros**:
- `sessionId` (string): ID da sessão
- `prompt` (array): Array de content blocks

**Resposta**:
- `stopReason` (string): `"end_turn"`, `"max_tokens"`, etc.

---

#### `session/update`

**Direção**: Servidor → Cliente
**Tipo**: Notification (sem `id`)

**Parâmetros**:
- `sessionId` (string): ID da sessão
- `update` (object):
  - `sessionUpdate` (string): Tipo do update
  - `content` (varies): Conteúdo específico do tipo

---

#### `fs/read_text_file`

**Direção**: Servidor → Cliente
**Tipo**: Request

**Parâmetros**:
- `path` (string): Caminho do arquivo
- `line` (number, opcional): Linha inicial
- `limit` (number, opcional): Número de linhas

**Resposta**:
- `content` (string): Conteúdo do arquivo

---

#### `fs/write_text_file`

**Direção**: Servidor → Cliente
**Tipo**: Request

**Parâmetros**:
- `path` (string): Caminho do arquivo
- `content` (string): Novo conteúdo

**Resposta**: `{}` (vazio em caso de sucesso)

---

#### `session/request_permission`

**Direção**: Servidor → Cliente
**Tipo**: Request

**Parâmetros**:
- `tool` (string): Nome da ferramenta
- `description` (string): Descrição da ação
- `options` (array): Opções de permissão

**Resposta**:
- `optionId` (string): `"allow_once"`, `"allow_always"`, `"deny"`

---

## Logs e Debugging

### Localização dos Logs

**macOS**:
```bash
tail -f ~/Library/Logs/com.code.athas/Athas.log
```

**Linux**:
```bash
tail -f ~/.local/share/athas/logs/athas.log
```

### Filtrar Logs ACP

```bash
# Todas as mensagens ACP
tail -f ~/Library/Logs/com.code.athas/Athas.log | grep ACP

# Apenas erros
tail -f ~/Library/Logs/com.code.athas/Athas.log | grep "ERROR\|WARN" | grep ACP

# Mensagens enviadas
tail -f ~/Library/Logs/com.code.athas/Athas.log | grep "Sending request"

# Mensagens recebidas
tail -f ~/Library/Logs/com.code.athas/Athas.log | grep "Received message"
```

### Interpretar Logs

#### ✅ Sucesso na Inicialização

```
[INFO] [acp_bridge]: Starting ACP agent 'acp_claude'
[INFO] [acp_bridge]: Using Claude Code ACP via '/Users/.../bunx'
[INFO] [acp_bridge]: [ACP] Sending request to 'acp_claude': {"method":"initialize"...}
[INFO] [acp_bridge]: [ACP] Received message: {"result":{"agentCapabilities"...}}
```

#### ✅ Sucesso na Criação de Sessão

```
[INFO] [acp_bridge]: [ACP] Sending request: {"method":"session/new"...}
[INFO] [acp_bridge]: [ACP] Received message: {"result":{"sessionId":"0199c07a-..."}}
```

#### ✅ Sucesso na Resposta

```
[INFO] [acp_bridge]: [ACP] Sending request: {"method":"session/prompt"...}
[INFO] [acp_bridge]: [ACP] Received message: session/update - "Olá!..."
[INFO] [acp_bridge]: [ACP] Received message: {"result":{"stopReason":"end_turn"}}
```

#### ❌ Erro de Método

```
[WARN] [acp_bridge]: [ACP:acp_claude][stderr] Error handling request {
  method: 'newSession'  // ← Nome errado!
} {
  code: -32601,
  message: 'Method not found'
}
```

**Solução**: Usar `session/new` em vez de `newSession`

#### ❌ Erro de Parâmetros

```
[WARN] [acp_bridge]: [ACP:acp_claude][stderr] Error handling request {
  params: {
    protocolVersion: '0.1.0'  // ← String em vez de number!
  }
} {
  code: -32602,
  message: 'Invalid params',
  data: { protocolVersion: { _errors: ["Expected number"] } }
}
```

**Solução**: Usar `protocolVersion: 0.1` (número)

#### ❌ Erro de Autenticação

```
[WARN] [acp_bridge]: [ACP:acp_claude][stderr] Error: Please run /login
```

**Solução**: Autenticar Claude Code CLI

---

## Checklist de Verificação

### Antes de Reportar um Bug

- [ ] Logs do Tauri (`~/Library/Logs/com.code.athas/Athas.log`)
- [ ] Console do navegador (DevTools)
- [ ] Versão do Claude Code autenticada (`~/.claude.json` existe?)
- [ ] Versão do Bun (`bun --version`)
- [ ] Última versão do código do repositório

### Informações para Incluir

```markdown
## Descrição do Problema

[Descreva o que está acontecendo]

## Passos para Reproduzir

1. [Passo 1]
2. [Passo 2]
3. [Erro ocorre aqui]

## Logs Relevantes

```
[Cole os logs aqui, especialmente linhas com [ERROR] ou [WARN]]
```

## Ambiente

- SO: macOS 14.x / Linux / Windows
- Bun: v1.x.x
- Claude Code autenticado: Sim/Não
- Branch: main / feature-xyz
```

---

## Arquivos Modificados (Histórico)

### Correções Aplicadas em 2025-10-07

| Arquivo | Mudança | Motivo |
|---------|---------|--------|
| `src/lib/acp/agent.ts:199` | `newSession` → `session/new` | Nome de método incorreto |
| `src/lib/acp/agent.ts:250` | `prompt` → `session/prompt` | Nome de método incorreto |
| `src/lib/acp/agent.ts:92` | `capabilities` → `clientCapabilities` | Nome de parâmetro incorreto |
| `src/lib/acp/agent.ts:31` | `"0.1.0"` → `0.1` | Tipo incorreto (string→number) |
| `src/lib/acp/agent.ts:407-516` | Adicionado `handleSessionUpdate` | Processar respostas streaming |
| `src/lib/acp/agent.ts:534-608` | Adicionados handlers RPC | Suportar `fs/*` e permissões |
| `src-tauri/src/acp_bridge.rs:217-220` | Newline-delimited JSON | Formato correto do protocolo |
| `src-tauri/packages/interceptor/src/types.rs` | Removido `Haiku` | Modelo deprecated |

---

## Referências Externas

- **ACP Spec**: https://agentclientprotocol.com/protocol/overview
- **Claude Code SDK**: https://github.com/anthropics/claude-code
- **ACP TypeScript**: https://github.com/zed-industries/agent-client-protocol/tree/main/typescript
- **ACP Rust**: https://github.com/zed-industries/agent-client-protocol/tree/main/rust
- **Zed Integration**: https://github.com/zed-industries/zed (exemplo de implementação)

---

## Próximos Passos (Roadmap)

- [ ] UI para aprovação de permissões (`session/request_permission`)
- [ ] Suporte completo a terminal (`terminal/execute`)
- [ ] Integração com MCP servers externos
- [ ] Persistência de sessões entre recarregamentos
- [ ] Rate limiting e error handling melhorado
- [ ] Testes automatizados E2E do fluxo ACP
