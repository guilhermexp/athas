# Zed Git Panel & Diff Viewer Reference

## 📋 Visão Geral

Esta pasta contém referência completa para implementar:

- ✅ **Git Panel**: Painel lateral com lista de mudanças git
- ✅ **Diff Viewer**: Visualização de diferenças entre versões
- ✅ **Inline Diff**: Diffs inline no editor
- ✅ **Commit Modal**: Interface para commits
- ✅ **Git Blame**: Visualização de blame inline
- ✅ **Conflict Resolution**: Resolução de conflitos
- ✅ **Stage/Unstage**: Gerenciamento de staging area

---

## 🏗️ Arquitetura Geral

```
Git Panel System
│
├── GitPanel (UI Principal)
│   ├── Commit Editor
│   ├── Changes List
│   │   ├── Conflicts
│   │   ├── Tracked Changes
│   │   └── Untracked Files
│   ├── Staging Actions
│   ├── Branch Selector
│   └── Remote Actions
│
├── Diff Views
│   ├── FileDiffView (comparar dois arquivos)
│   ├── TextDiffView (clipboard vs seleção)
│   └── ProjectDiff (diff do projeto inteiro)
│
├── Inline Features
│   ├── Git Blame (inline no editor)
│   ├── Diff Hunks (visualização inline)
│   └── Conflict Markers
│
└── Git Store
    ├── Repository Management
    ├── Status Tracking
    ├── Staging Operations
    └── Commit History
```

---

## 📁 Estrutura de Arquivos

```
git-panel-reference/
├── README.md                          # Este arquivo
│
├── docs/
│   ├── GIT_PANEL_ARCHITECTURE.md     # Arquitetura completa
│   ├── DIFF_SYSTEM.md                # Sistema de diff
│   ├── INLINE_FEATURES.md            # Blame e diff inline
│   └── STAGING_WORKFLOW.md           # Fluxo de staging
│
├── core-files/
│   ├── git-panel/
│   │   ├── git_panel.rs              # Painel principal
│   │   ├── commit_modal.rs           # Modal de commit
│   │   ├── commit_view.rs            # Visualização de commit
│   │   └── conflict_view.rs          # Resolução de conflitos
│   │
│   ├── diff-views/
│   │   ├── file_diff_view.rs         # Diff entre arquivos
│   │   ├── text_diff_view.rs         # Diff de texto
│   │   └── project_diff.rs           # Diff do projeto
│   │
│   ├── blame/
│   │   └── blame_ui.rs               # Git blame UI
│   │
│   └── git-store/
│       └── (arquivos de backend)     # Lógica Git
│
├── examples/
│   ├── git-panel-implementation.md   # Implementação completa
│   ├── diff-viewer-component.md      # Component de diff
│   └── inline-diff-component.md      # Diff inline
│
└── protocol-specs/
    └── GIT_OPERATIONS.md             # Operações Git
```

---

## 🎯 Componentes Principais

### 1. **GitPanel** (`git_panel.rs`)

Painel lateral principal que mostra o estado do repositório.

**Estrutura:**
```rust
pub struct GitPanel {
    active_repository: Option<Entity<Repository>>,
    commit_editor: Entity<Editor>,
    entries: Vec<GitListEntry>,
    focus_handle: FocusHandle,

    // Counts
    conflicted_count: usize,
    tracked_count: usize,
    new_count: usize,

    // Staging
    tracked_staged_count: usize,
    new_staged_count: usize,

    // State
    selected_entry: Option<usize>,
    marked_entries: Vec<usize>,
    amend_pending: bool,
    signoff_enabled: bool,

    project: Entity<Project>,
    workspace: WeakEntity<Workspace>,
}
```

**Sections:**
```rust
enum Section {
    Conflict,   // Arquivos com conflito
    Tracked,    // Mudanças em arquivos rastreados
    New,        // Arquivos novos (untracked)
}
```

**Entries:**
```rust
#[derive(Debug, PartialEq, Eq, Clone)]
enum GitListEntry {
    Status(GitStatusEntry),  // Arquivo individual
    Header(GitHeaderEntry),  // Cabeçalho de seção
}

pub struct GitStatusEntry {
    repo_path: RepoPath,
    status: FileStatus,    // Created, Modified, Deleted, etc
    staging: StageStatus,  // Staged, Unstaged, PartiallyStaged
}
```

**Funcionalidades principais:**
- `schedule_update()`: Atualiza lista de mudanças
- `stage_entry()`: Stage um arquivo
- `unstage_entry()`: Unstage um arquivo
- `commit()`: Cria commit
- `amend_commit()`: Amend no commit anterior
- `toggle_staged()`: Toggle stage de múltiplos arquivos

---

### 2. **Diff Views**

#### FileDiffView (`file_diff_view.rs`)

Compara dois arquivos lado a lado (ou unified).

**Estrutura:**
```rust
pub struct FileDiffView {
    editor: Entity<Editor>,
    old_buffer: Entity<Buffer>,
    new_buffer: Entity<Buffer>,
    buffer_changes_tx: watch::Sender<()>,
    _recalculate_diff_task: Task<Result<()>>,
}
```

**Uso:**
```rust
FileDiffView::open(
    old_path,  // Path do arquivo antigo
    new_path,  // Path do arquivo novo
    workspace,
    window,
    cx,
)
```

**Recalcula diff automaticamente** quando buffers mudam (250ms debounce).

---

#### TextDiffView (`text_diff_view.rs`)

Compara clipboard com seleção atual.

**Estrutura:**
```rust
pub struct TextDiffView {
    diff_editor: Entity<Editor>,
    title: SharedString,
    path: Option<SharedString>,
}
```

**Uso:**
```rust
// Triggered by action
editor::DiffClipboardWithSelection
```

---

#### ProjectDiff (`project_diff.rs`)

Mostra todas as mudanças do projeto em uma única view unificada.

**Estrutura:**
```rust
pub struct ProjectDiff {
    project: Entity<Project>,
    multibuffer: Entity<MultiBuffer>,
    editor: Entity<Editor>,
    git_store: Entity<GitStore>,
}
```

**Features:**
- Agrupa mudanças por namespace (Conflicts, Tracked, New)
- Stage/unstage inline
- Navigate entre hunks
- Toolbar com actions

---

### 3. **Git Blame** (`blame_ui.rs`)

Mostra informações de blame inline no editor.

**Estrutura:**
```rust
pub struct BlameUi {
    enabled: bool,
    entries: Vec<BlameEntry>,
    commit_details: HashMap<CommitId, CommitDetails>,
}

pub struct BlameEntry {
    line_number: u32,
    commit_id: CommitId,
    author: String,
    timestamp: OffsetDateTime,
}
```

**Renderização:**
- Mostra autor e timestamp inline
- Hover mostra commit message completo
- Click abre commit details

---

### 4. **Inline Diff Hunks**

Diff hunks são renderizados inline no editor com:

```rust
pub struct DiffHunk {
    range: Range<Anchor>,
    status: DiffHunkStatus,  // Added, Modified, Deleted
}

pub enum DiffHunkStatus {
    Added,
    Removed,
    Modified {
        old_range: Range<u32>,
    },
}
```

**Controls:**
- Expand/collapse hunk
- Stage/unstage hunk
- Revert hunk
- Navigate to next/previous hunk

---

## 🔄 Fluxo de Staging

### Workflow Típico

```
1. User modifica arquivo
   ↓
2. GitStore detecta mudança
   ↓
3. GitPanel atualiza lista
   ↓
4. User seleciona entry
   ↓
5. User clica "Stage" ou pressiona Enter
   ↓
6. Repository.stage_file() é chamado
   ↓
7. GitStore emite RepositoryEvent::Updated
   ↓
8. GitPanel atualiza counts e UI
   ↓
9. ProjectDiff atualiza multibuffer
```

### Estados Possíveis

```rust
pub enum StageStatus {
    Unstaged,           // Não staged
    Staged,             // Completamente staged
    PartiallyStaged,    // Algumas mudanças staged
}

pub enum FileStatus {
    Added,              // Novo arquivo
    Modified,           // Arquivo modificado
    Deleted,            // Arquivo deletado
    Renamed,            // Arquivo renomeado
    Copied,             // Arquivo copiado
    Untracked,          // Arquivo não rastreado
    Conflicted,         // Arquivo com conflito
}
```

---

## 🎨 UI Components

### Changes List

```
┌─────────────────────────────────────┐
│  Conflicts (2)                  ▼   │
├─────────────────────────────────────┤
│  ⚠️  src/main.rs            [Stage] │
│  ⚠️  src/lib.rs             [Stage] │
├─────────────────────────────────────┤
│  Tracked (5)                    ▼   │
├─────────────────────────────────────┤
│  M  src/app.rs              [Stage] │
│  M  src/utils.rs            [Stage] │
│  D  src/old.rs              [Stage] │
│  R  src/foo.rs → bar.rs     [Stage] │
│  M  README.md                 [✓]   │ ← Staged
├─────────────────────────────────────┤
│  Untracked (3)                  ▼   │
├─────────────────────────────────────┤
│  A  src/new.rs              [Stage] │
│  A  test.txt                [Stage] │
│  A  .env                    [Stage] │
└─────────────────────────────────────┘
```

### Commit Editor

```
┌─────────────────────────────────────┐
│  [Commit Message Editor]            │
│  ┌───────────────────────────────┐  │
│  │ feat: add new feature         │  │
│  │                               │  │
│  │ - Implemented X               │  │
│  │ - Fixed bug in Y              │  │
│  │                               │  │
│  │ Co-authored-by: Name <email>  │  │
│  └───────────────────────────────┘  │
│                                     │
│  ☐ Amend previous commit            │
│  ☐ Add signoff                      │
│                                     │
│  [Cancel]              [Commit (5)] │
└─────────────────────────────────────┘
```

### Diff Hunk

```
fn old_function() {
-   let x = 10;         ← Removed line (red background)
+   let x = 20;         ← Added line (green background)
    println!("{}", x);

    [Expand 3 more lines]

    ▼ [Stage] [Revert]  ← Hunk controls
}
```

---

## ⚡ Funcionalidades

### Git Panel

- ✅ Lista de mudanças organizada por seção
- ✅ Stage/unstage individual ou em lote
- ✅ Commit com mensagem e co-authors
- ✅ Amend commit anterior
- ✅ Signoff commits
- ✅ Branch picker e switching
- ✅ Push/pull/fetch
- ✅ Stash save/pop/apply
- ✅ Discard changes
- ✅ Trash untracked files
- ✅ Sort por path ou status

### Diff Viewer

- ✅ Unified diff view
- ✅ Side-by-side comparison
- ✅ Syntax highlighting
- ✅ Expandir/colapsar hunks
- ✅ Navigate entre hunks
- ✅ Stage/unstage inline
- ✅ Revert changes inline
- ✅ Real-time recalculation

### Inline Features

- ✅ Git blame inline
- ✅ Diff markers na gutter
- ✅ Hunk controls inline
- ✅ Conflict markers
- ✅ Stage status indicators

---

## 🔌 Integrações

### Com Editor

```rust
// Editor registra addon para Git
editor.register_addon(GitPanelAddon {
    workspace: workspace.downgrade(),
});

// Editor mostra diff hunks
editor.set_expand_all_diff_hunks(cx);
editor.set_render_diff_hunk_controls(render_fn, cx);
```

### Com Project

```rust
// Project tem GitStore
let git_store = project.read(cx).git_store();

// GitStore gerencia repositories
let active_repo = git_store.read(cx).active_repository();
```

### Com Workspace

```rust
// Workspace pode abrir diff views
workspace.add_item_to_active_pane(
    Box::new(diff_view),
    None,
    true,
    window,
    cx,
);
```

---

## 📚 Próximos Passos

### Para Git Panel:
1. Leia `docs/GIT_PANEL_ARCHITECTURE.md`
2. Estude `docs/STAGING_WORKFLOW.md`
3. Implemente usando `examples/git-panel-implementation.md`

### Para Diff Viewer:
1. Leia `docs/DIFF_SYSTEM.md`
2. Estude `core-files/diff-views/`
3. Implemente usando `examples/diff-viewer-component.md`

### Para Inline Features:
1. Leia `docs/INLINE_FEATURES.md`
2. Estude `core-files/blame/blame_ui.rs`
3. Implemente usando `examples/inline-diff-component.md`

---

## 💡 Dicas

1. **Comece simples**: Implemente lista de mudanças primeiro
2. **Use debouncing**: Evite recalcular diff a cada keystroke
3. **Otimize rendering**: Use virtual scrolling para listas grandes
4. **Cache diffs**: Reutilize diff snapshots quando possível
5. **Handle conflicts**: UI especial para merge conflicts

---

**Criado em**: 2025-10-06
**Fonte**: Zed Editor (https://github.com/zed-industries/zed)
