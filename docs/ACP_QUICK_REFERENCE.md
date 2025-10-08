# ACP - Referência Rápida

## 🚀 Setup Rápido (5 minutos)

```bash
# 1. Autenticar Claude Code
bunx @zed-industries/claude-code-acp@latest
# Digite: /login

# 2. Verificar autenticação
ls ~/.claude.json  # Deve existir

# 3. Iniciar app
bun run tauri dev

# 4. Testar no painel de agentes
# - Selecionar "Claude Code"
# - Enviar "oi"
# - Deve responder "Olá! Como posso ajudar..."
```

---

## 🐛 Erros Comuns e Soluções

### ❌ "Method not found: newSession"
```typescript
// Corrigir em: src/lib/acp/agent.ts:199
method: "session/new"  // ✅ Correto (não "newSession")
```

### ❌ "Invalid params: protocolVersion"
```typescript
// Corrigir em: src/lib/acp/agent.ts:31, 91
const DEFAULT_PROTOCOL_VERSION = 0.1;  // ✅ Number (não "0.1.0")
```

### ❌ "Invalid params: clientCapabilities required"
```typescript
// Corrigir em: src/lib/acp/agent.ts:92
clientCapabilities: { ... }  // ✅ Correto (não "capabilities")
```

### ❌ Resposta não aparece na UI
```typescript
// Adicionar em: src/lib/acp/agent.ts:407
case "session/update": {
  await this.handleSessionUpdate(agentId, inflight, params);
  break;
}
```

### ❌ "Auth required"
```bash
# Re-autenticar
rm ~/.claude.json
bunx @zed-industries/claude-code-acp@latest
# Digite: /login
```

---

## 📝 Métodos RPC

| Método | Direção | Parâmetros Principais | Resposta |
|--------|---------|----------------------|----------|
| `initialize` | C→S | `protocolVersion: 0.1`, `clientCapabilities` | `agentCapabilities` |
| `session/new` | C→S | `cwd`, `mcpServers` | `sessionId` |
| `session/prompt` | C→S | `sessionId`, `prompt[]` | `stopReason` |
| `session/update` | S→C | `sessionId`, `update.sessionUpdate` | - |
| `fs/read_text_file` | S→C | `path`, `line`, `limit` | `content` |
| `fs/write_text_file` | S→C | `path`, `content` | `{}` |
| `session/request_permission` | S→C | `tool`, `options` | `optionId` |

**C→S** = Cliente → Servidor | **S→C** = Servidor → Cliente

---

## 📊 Session Update Types

| sessionUpdate | O que é | Handler |
|---------------|---------|---------|
| `agent_message_chunk` | Resposta do Claude | `callbacks.onChunk(text)` |
| `agent_thought_chunk` | Raciocínio interno | Ignorado |
| `tool_call` | Chamando ferramenta | `handleToolCall()` |
| `tool_call_update` | Status da ferramenta | Log apenas |

---

## 🔍 Debug Logs

```bash
# Ver todos os logs ACP
tail -f ~/Library/Logs/com.code.athas/Athas.log | grep ACP

# Ver apenas envios
tail -f ~/Library/Logs/com.code.athas/Athas.log | grep "Sending request"

# Ver apenas recebimentos
tail -f ~/Library/Logs/com.code.athas/Athas.log | grep "Received message"

# Ver apenas erros
tail -f ~/Library/Logs/com.code.athas/Athas.log | grep "ERROR\|WARN" | grep ACP
```

---

## ✅ Checklist de Funcionamento

Quando tudo estiver OK, você deve ver:

```
✅ [ACP] Sending: {"method":"initialize"}
✅ [ACP] Received: {"result":{"agentCapabilities"...}}
✅ [ACP] Sending: {"method":"session/new"}
✅ [ACP] Received: {"result":{"sessionId":"..."}}
✅ [ACP] Sending: {"method":"session/prompt"}
✅ [ACP] Received: session/update - "Olá!..."
✅ [ACP] Received: {"result":{"stopReason":"end_turn"}}
```

---

## 📂 Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/lib/acp/agent.ts` | Cliente ACP (TypeScript) |
| `src-tauri/src/acp_bridge.rs` | Bridge Rust↔ACP process |
| `src-tauri/src/commands/acp.rs` | Comandos Tauri expostos |
| `docs/ACP_COMPLETE_GUIDE.md` | Documentação completa |

---

## 🔗 Links Úteis

- [Guia Completo](./ACP_COMPLETE_GUIDE.md)
- [ACP Spec](https://agentclientprotocol.com)
- [Claude Code SDK](https://github.com/anthropics/claude-code)
- [Zed ACP](https://github.com/zed-industries/agent-client-protocol)

---

## 🆘 Precisa de Ajuda?

1. Confira [ACP_COMPLETE_GUIDE.md](./ACP_COMPLETE_GUIDE.md)
2. Veja os logs: `tail -f ~/Library/Logs/com.code.athas/Athas.log`
3. Abra issue com template completo do guia

**Última atualização**: 2025-10-07
