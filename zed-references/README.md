# Referências do Zed Editor

Componentes extraídos do Zed Editor para servir de referência na implementação do Athas.

---

## 📁 Estrutura

```
zed-references/
├── README.md                     # ← Este arquivo
│
├── terminal-ui-reference/        # Sistema de terminal com splits e tabs
│   ├── README.md                 # Visão geral do terminal
│   ├── docs/                     # Arquitetura e guias
│   ├── core-files/               # Código Rust original
│   ├── examples/                 # Exemplos de implementação
│   └── HOW_TO_APPLY.md          # Como aplicar em outros frameworks
│
├── agent-panel-reference/        # Painel de agentes + ACP + MCP
│   ├── README.md                 # Visão geral do agent panel
│   ├── docs/                     # MCP Architecture, Configuration UI
│   ├── core-files/               # Código Rust original
│   ├── protocol-specs/           # ACP Protocol, Tool System
│   └── examples/                 # Implementações completas
│
└── git-panel-reference/          # Git panel + Diff Viewer + Blame
    ├── README.md                 # Visão geral do git panel
    ├── docs/                     # Arquitetura (a criar)
    ├── core-files/               # Código Rust original
    │   ├── git-panel/           # Panel principal
    │   ├── diff-views/          # File/Text/Project diff
    │   └── blame/               # Git blame inline
    └── examples/                 # Implementações (a criar)
```

---

## 🎯 Status de Adaptação no Athas

### ✅ Terminal UI - **COMPLETO (95%)**

**Implementado em:**
- `src/lib/pane-group.ts` - Sistema recursivo de splits
- `src/components/terminal/pane-group.tsx` - UI de splits
- `src/stores/terminal-panel-store.ts` - State management

**Estrutura idêntica ao Zed!** 🎉

---

### ✅ Git Panel - **BEM IMPLEMENTADO (90%)**

**Implementado em:**
- `src/version-control/git/views/git-view.tsx`
- `src/version-control/git/views/git-status-panel.tsx`
- `src/version-control/git/views/inline-git-blame.tsx`
- `src/version-control/git/controllers/git-store.ts`

**Falta:**
- Stage/unstage de hunks individuais
- Conflict resolution UI
- Amend commit

---

### ⚠️ Agent Panel - **PARCIAL (60%)**

**Implementado em:**
- `src/components/ai-chat/ai-chat.tsx` - UI do chat
- `src/components/ai-chat/tool-call-display.tsx` - Tool calls

**Falta:**
- ACP Protocol completo (JSON-RPC)
- MCP Servers integration
- External agent servers

---

## 📚 Como Usar

### 1. Para Terminal
A implementação atual do Athas **já está correta**. Use as referências apenas para:
- Entender conceitos avançados
- Comparar performance
- Ver features adicionais

### 2. Para Git
**Implementar features faltantes:**

```bash
# Ver exemplo de stage de hunks
cat git-panel-reference/core-files/diff-views/project_diff.rs

# Ver conflict resolution
cat git-panel-reference/core-files/git-panel/conflict_view.rs
```

Consultar `../ZED_ADAPTATION_GUIDE.md` para exemplos TypeScript.

### 3. Para Agent Panel
**Implementar ACP Protocol:**

```bash
# Ler spec do protocol
cat agent-panel-reference/protocol-specs/ACP_PROTOCOL.md

# Ver exemplo de implementação
cat agent-panel-reference/examples/basic-agent-implementation.md
```

Consultar `../ZED_ADAPTATION_GUIDE.md` para `AcpClient` completo.

---

## 🛠️ Ferramentas de Busca

### Buscar implementação específica:

```bash
# Buscar "stage" em git-panel
grep -r "stage" git-panel-reference/core-files/

# Buscar "split" em terminal
grep -r "split" terminal-ui-reference/core-files/

# Buscar "tool" em agent
grep -r "tool" agent-panel-reference/core-files/
```

### Ver arquivos principais:

```bash
# Git Panel principal
cat git-panel-reference/core-files/git-panel/git_panel.rs

# Terminal PaneGroup
cat terminal-ui-reference/core-files/pane-system/pane_group.rs

# Agent ACP
cat agent-panel-reference/core-files/agent-panel/agent_panel.rs
```

---

## 📖 Documentação Completa

Cada referência tem seu próprio README com:
- Arquitetura completa
- Estruturas de dados
- Fluxos de trabalho
- Exemplos de código
- Diagramas ASCII

**Comece lendo:**
1. `terminal-ui-reference/README.md`
2. `git-panel-reference/README.md`
3. `agent-panel-reference/README.md`

---

## 🔗 Links Úteis

- **Guia de Adaptação:** `../ZED_ADAPTATION_GUIDE.md`
- **Zed Source Code:** https://github.com/zed-industries/zed
- **GPUI Framework:** https://gpui.rs
- **ACP Protocol Spec:** `agent-panel-reference/protocol-specs/ACP_PROTOCOL.md`
- **MCP Architecture:** `agent-panel-reference/docs/MCP_ARCHITECTURE.md`

---

**Criado em:** 2025-10-06
**Fonte:** Zed Editor (https://github.com/zed-industries/zed)
**Licença Zed:** GPL-3.0-or-later
