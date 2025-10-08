# Guia de Adaptação Zed → Athas

**Data**: 2025-10-06
**Objetivo**: Comparar componentes do Zed com implementação atual do Athas e sugerir melhorias

---

## 📊 Status Atual - O Que Já Está Implementado

### ✅ 1. Terminal UI (COMPLETO - 95%)

**Implementação Athas:**
- ✅ `src/lib/pane-group.ts` - Sistema recursivo de splits IDÊNTICO ao Zed
- ✅ `src/components/terminal/pane-group.tsx` - Renderização com dividers
- ✅ `src/stores/terminal-panel-store.ts` - State management com Zustand
- ✅ Split horizontal/vertical
- ✅ Tabs por pane
- ✅ Resize de panes
- ✅ xterm.js integrado

**Estrutura de dados:**
```typescript
// Athas (TypeScript)
type PanelNode = PaneNode | SplitNode;

interface SplitNode {
  type: "split";
  axis: "horizontal" | "vertical";
  children: PanelNode[];
  sizes: number[]; // normalized ratios
}
```

**Equivalência com Zed:**
```rust
// Zed (Rust)
pub enum Member {
    Axis(PaneAxis),
    Pane(Entity<Pane>),
}
```

**✨ Status:** ✅ **IMPLEMENTADO** - Estrutura idêntica ao Zed!

---

### ✅ 2. Git Panel (COMPLETO - 90%)

**Implementação Athas:**
- ✅ `src/version-control/git/views/git-view.tsx` - Painel principal
- ✅ `src/version-control/git/views/git-status-panel.tsx` - Lista de mudanças
- ✅ `src/version-control/git/views/git-commit-panel.tsx` - Commit UI
- ✅ `src/version-control/git/views/inline-git-blame.tsx` - Blame inline
- ✅ `src/version-control/git/controllers/git-store.ts` - State management
- ✅ Branch manager, stash manager, tag manager
- ✅ Diff viewer (componente separado)

**O que falta (baseado no Zed):**
- ⚠️ Stage/unstage parcial de hunks
- ⚠️ Conflict resolution UI
- ⚠️ Amend commit
- ⚠️ Signoff support

**✨ Status:** ✅ **BEM IMPLEMENTADO** - Faltam apenas features avançadas

---

### ⚠️ 3. Agent Panel (PARCIAL - 60%)

**Implementação Athas:**
- ✅ `src/components/ai-chat/ai-chat.tsx` - Chat UI
- ✅ `src/components/ai-chat/tool-call-display.tsx` - Tool calls
- ✅ `src/components/ai-chat/context-selector.tsx` - Context
- ✅ Markdown rendering
- ✅ Agent tabs

**O que falta (baseado no Zed):**
- ❌ **ACP Protocol** - Protocolo JSON-RPC completo
- ❌ External agent servers
- ❌ MCP servers integration
- ❌ Configuration UI completo

**✨ Status:** ⚠️ **PARCIAL** - UI está boa, falta backend protocol

---

## 🎯 Prioridades de Adaptação

### 🔥 Prioridade 1: Git - Features Avançadas

Usar como base: `/Users/guilhermevarela/Downloads/git-panel-reference/`

#### 1.1. Stage/Unstage de Hunks

**Arquivo referência:** `git-panel-reference/core-files/diff-views/project_diff.rs`

**Adaptação:**
```typescript
// src/version-control/git/controllers/git-hunks.ts
interface DiffHunk {
  range: { start: number; end: number };
  status: 'added' | 'modified' | 'deleted';
  oldRange?: { start: number; end: number };
}

async function stageHunk(
  repoPath: string,
  filePath: string,
  hunk: DiffHunk
): Promise<void> {
  // Use git apply --cached para stage apenas o hunk
  const patch = generatePatch(hunk);
  await invoke('git_apply_patch', { repoPath, patch, cached: true });
}
```

**UI Component:**
```tsx
// src/version-control/git/views/diff-hunk-controls.tsx
export function DiffHunkControls({ hunk, filePath }: Props) {
  const handleStage = async () => {
    await stageHunk(repoPath, filePath, hunk);
    // Refresh git status
  };

  return (
    <div className="flex gap-2 p-2 bg-muted">
      <Button size="sm" onClick={handleStage}>Stage Hunk</Button>
      <Button size="sm" variant="ghost">Revert</Button>
    </div>
  );
}
```

#### 1.2. Conflict Resolution

**Arquivo referência:** `git-panel-reference/core-files/git-panel/conflict_view.rs`

**Adaptação:**
```typescript
// src/version-control/git/views/conflict-resolver.tsx
interface ConflictMarkers {
  ours: { start: number; end: number; content: string };
  theirs: { start: number; end: number; content: string };
  base?: { start: number; end: number; content: string };
}

export function ConflictResolver({ file, conflicts }: Props) {
  const handleAcceptOurs = async (conflict: ConflictMarkers) => {
    // Resolve keeping "ours" changes
    await resolveConflict(file.path, conflict, 'ours');
  };

  return (
    <div className="conflict-resolver">
      {conflicts.map((conflict, idx) => (
        <ConflictBlock key={idx} conflict={conflict}>
          <Button onClick={() => handleAcceptOurs(conflict)}>
            Accept Current
          </Button>
          <Button onClick={() => handleAcceptTheirs(conflict)}>
            Accept Incoming
          </Button>
          <Button>Accept Both</Button>
        </ConflictBlock>
      ))}
    </div>
  );
}
```

---

### 🔥 Prioridade 2: Agent Panel - ACP Protocol

Usar como base: `/Users/guilhermevarela/Downloads/agent-panel-reference/`

#### 2.1. ACP Client Implementation

**Arquivo referência:** `agent-panel-reference/protocol-specs/ACP_PROTOCOL.md`

**Adaptação:**
```typescript
// src/lib/acp/acp-client.ts
export class AcpClient {
  private ws: WebSocket;
  private messageId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();

  async initialize() {
    const response = await this.sendRequest('initialize', {
      capabilities: {
        streaming: true,
        tools: true,
        context: true
      }
    });
    return response;
  }

  async createSession(config: SessionConfig) {
    return this.sendRequest('sessions/create', {
      model_id: config.modelId,
      system_prompt: config.systemPrompt,
      context: config.context
    });
  }

  async sendInput(sessionId: string, input: string, attachments?: any[]) {
    return this.sendRequest('sessions/input', {
      session_id: sessionId,
      input,
      attachments
    });
  }

  private async sendRequest(method: string, params: any) {
    const id = ++this.messageId;
    const message = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(message));
    });
  }

  private handleMessage(data: string) {
    const message = JSON.parse(data);

    if (message.method === 'sessions/output') {
      // Handle streaming output
      this.emit('output', message.params);
    } else if (message.id) {
      // Handle response
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        if (message.error) {
          pending.reject(message.error);
        } else {
          pending.resolve(message.result);
        }
        this.pendingRequests.delete(message.id);
      }
    }
  }
}
```

#### 2.2. MCP Server Integration

**Arquivo referência:** `agent-panel-reference/docs/MCP_ARCHITECTURE.md`

**Adaptação:**
```typescript
// src/lib/mcp/mcp-server-store.ts
interface McpServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  state: 'stopped' | 'starting' | 'running' | 'error';
  tools: McpTool[];
}

export const useMcpStore = create<McpState>((set, get) => ({
  servers: new Map(),

  async startServer(config: ServerConfig) {
    const serverId = genId('mcp');
    set((s) => ({
      servers: new Map(s.servers).set(serverId, {
        ...config,
        id: serverId,
        state: 'starting',
        tools: []
      })
    }));

    try {
      // Start server via Tauri backend
      await invoke('start_mcp_server', { config });

      // Initialize and list tools
      const tools = await invoke('mcp_list_tools', { serverId });

      set((s) => {
        const server = s.servers.get(serverId);
        if (server) {
          return {
            servers: new Map(s.servers).set(serverId, {
              ...server,
              state: 'running',
              tools
            })
          };
        }
        return s;
      });
    } catch (error) {
      set((s) => {
        const server = s.servers.get(serverId);
        if (server) {
          return {
            servers: new Map(s.servers).set(serverId, {
              ...server,
              state: 'error'
            })
          };
        }
        return s;
      });
    }
  },

  async callTool(serverId: string, toolName: string, args: any) {
    return invoke('mcp_call_tool', {
      serverId,
      toolName,
      arguments: args
    });
  }
}));
```

---

### 🔥 Prioridade 3: UI/UX Polish

#### 3.1. Usar Fontes do Zed

**Adicionar ao projeto:**
```bash
# Copiar fontes
cp -r /Users/guilhermevarela/Downloads/Zed\ temporary/zed/assets/fonts/* /Users/guilhermevarela/Public/athas/public/fonts/
```

**Atualizar CSS:**
```css
/* src/styles.css */
@font-face {
  font-family: 'Zed Sans';
  src: url('/fonts/ibm-plex-sans/IBMPlexSans-Regular.ttf') format('truetype');
  font-weight: 400;
}

@font-face {
  font-family: 'Zed Sans';
  src: url('/fonts/ibm-plex-sans/IBMPlexSans-Bold.ttf') format('truetype');
  font-weight: 700;
}

@font-face {
  font-family: 'Zed Mono';
  src: url('/fonts/lilex/Lilex-Regular.ttf') format('truetype');
  font-weight: 400;
}

:root {
  --font-ui: 'Zed Sans', system-ui, sans-serif;
  --font-mono: 'Zed Mono', 'Courier New', monospace;
}

body {
  font-family: var(--font-ui);
}

code, pre {
  font-family: var(--font-mono);
}
```

#### 3.2. GPUI-like Styling System

O Zed usa métodos como `.bg()`, `.px_4()`, `.border_1()`. No Athas (Tailwind), você já tem equivalente:

**Zed (Rust/GPUI):**
```rust
div()
  .bg(cx.theme().colors().panel_background)
  .border_1()
  .px_4()
  .rounded_md()
```

**Athas (React/Tailwind):**
```tsx
<div className="bg-panel border px-4 rounded-md">
```

**✨ Já está bem alinhado!** Apenas ajustar tema de cores se quiser copiar paleta exata do Zed.

---

## 📦 Estrutura de Pastas Recomendada

Para integrar as referências:

```
athas/
├── zed-references/              # ← Mover referências para cá
│   ├── terminal-ui-reference/
│   ├── agent-panel-reference/
│   └── git-panel-reference/
│
├── src/
│   ├── lib/
│   │   ├── pane-group.ts       # ✅ Já implementado
│   │   ├── acp/                # ❌ CRIAR
│   │   │   ├── acp-client.ts
│   │   │   └── acp-types.ts
│   │   └── mcp/                # ❌ CRIAR
│   │       ├── mcp-server.ts
│   │       └── mcp-types.ts
│   │
│   ├── components/
│   │   ├── terminal/           # ✅ Já implementado
│   │   ├── ai-chat/            # ⚠️ Melhorar com ACP
│   │   └── git/                # ⚠️ Adicionar hunks + conflicts
│   │
│   └── version-control/
│       └── git/
│           ├── views/
│           │   ├── conflict-resolver.tsx    # ❌ CRIAR
│           │   └── diff-hunk-controls.tsx  # ❌ CRIAR
│           └── controllers/
│               └── git-hunks.ts            # ❌ CRIAR
│
└── public/
    └── fonts/                  # ❌ ADICIONAR fontes do Zed
        ├── ibm-plex-sans/
        └── lilex/
```

---

## 🛠️ Como Usar as Referências

### 1. Terminal (✅ Completo)
Você **JÁ IMPLEMENTOU** corretamente! Estrutura idêntica ao Zed.

### 2. Git Panel
**Para adicionar features:**

```bash
# Ver exemplo de stage de hunks
cat /Users/guilhermevarela/Downloads/git-panel-reference/core-files/diff-views/project_diff.rs

# Ver exemplo de conflict resolution
cat /Users/guilhermevarela/Downloads/git-panel-reference/core-files/git-panel/conflict_view.rs
```

Adaptar conceitos Rust → TypeScript conforme exemplos acima.

### 3. Agent Panel
**Para implementar ACP Protocol:**

```bash
# Ler spec completo do protocolo
cat /Users/guilhermevarela/Downloads/agent-panel-reference/protocol-specs/ACP_PROTOCOL.md

# Ver exemplo de implementação
cat /Users/guilhermevarela/Downloads/agent-panel-reference/examples/basic-agent-implementation.md
```

Implementar `AcpClient` conforme exemplo TypeScript acima.

---

## 📊 Resumo de Compatibilidade

| Component | Athas Status | Compatibilidade Zed | Próximos Passos |
|-----------|-------------|---------------------|-----------------|
| **Terminal UI** | ✅ Completo | 95% | Manter como está |
| **Pane Splits** | ✅ Completo | 100% | Perfeito! |
| **Git Status** | ✅ Completo | 90% | Adicionar hunks |
| **Git Blame** | ✅ Completo | 95% | Apenas polish |
| **Git Conflicts** | ❌ Falta | 0% | Implementar |
| **AI Chat UI** | ✅ Completo | 85% | Melhorar tool calls |
| **ACP Protocol** | ❌ Falta | 0% | Implementar backend |
| **MCP Servers** | ❌ Falta | 0% | Implementar |
| **Fonts** | ⚠️ Diferente | 50% | Copiar do Zed |

---

## 🚀 Roadmap Sugerido

### Sprint 1: Git Advanced Features
- [ ] Implementar stage/unstage de hunks
- [ ] Adicionar conflict resolution UI
- [ ] Suporte a amend commit

### Sprint 2: Agent Protocol
- [ ] Implementar AcpClient básico
- [ ] Conectar com backend Tauri
- [ ] Testar com agent simples

### Sprint 3: MCP Integration
- [ ] Implementar MCP server lifecycle
- [ ] UI de configuração de servers
- [ ] Integrar com agent panel

### Sprint 4: Polish
- [ ] Adicionar fontes do Zed
- [ ] Ajustar tema de cores
- [ ] Performance optimization

---

**Conclusão:** O Athas está **muito bem implementado**! A estrutura de terminal é idêntica ao Zed. Falta principalmente o backend de agent protocol (ACP + MCP) que requer integração Rust/Tauri.
