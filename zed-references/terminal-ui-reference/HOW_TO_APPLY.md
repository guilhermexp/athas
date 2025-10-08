# Como Aplicar em Seu Projeto

Este guia fornece instruções práticas para implementar o sistema de terminais do Zed em diferentes frameworks e contextos.

---

## 🎯 Roadmap de Implementação

### Fase 1: Setup Básico (1-2 dias)
✅ Criar estruturas de dados fundamentais
✅ Implementar gerenciamento de abas simples
✅ Renderizar UI básica com CSS
✅ Adicionar atalhos de teclado

**Referência**: `examples/basic-terminal.md`

### Fase 2: Sistema de Splits (2-3 dias)
✅ Implementar PaneGroup com estrutura em árvore
✅ Adicionar operações de split
✅ Implementar layout recursivo
✅ Adicionar remoção e colapso de panes

**Referência**: `examples/splits-and-tabs.md`

### Fase 3: Interatividade (2-3 dias)
✅ Implementar resize handles
✅ Adicionar drag & drop de terminais
✅ Implementar hit testing
✅ Melhorar feedback visual

**Referência**: `docs/IMPLEMENTATION_GUIDE.md` (seções 3 e 4)

### Fase 4: Persistência (1 dia)
✅ Implementar serialização
✅ Salvar/restaurar estado
✅ Migração de versões

**Referência**: `docs/IMPLEMENTATION_GUIDE.md` (seção 5)

### Fase 5: Terminal Real (2-3 dias)
✅ Integrar xterm.js ou similar
✅ Conectar com backend (PTY)
✅ Implementar scrollback
✅ Adicionar busca no terminal

---

## 📚 Roteiro de Leitura

### 1️⃣ Primeiro: Entenda a Arquitetura
```
Leia nesta ordem:
1. README.md (visão geral)
2. docs/ARCHITECTURE.md (arquitetura detalhada)
3. examples/basic-terminal.md (exemplo simples)
```

### 2️⃣ Depois: Implemente Passo a Passo
```
Siga o guia:
1. docs/IMPLEMENTATION_GUIDE.md
   - Fase 1: Panes básicos
   - Fase 2: Sistema de splits
   - Fase 3: Redimensionamento
   - Fase 4: Drag & drop
   - Fase 5: Persistência
```

### 3️⃣ Por Fim: Estude os Arquivos Core
```
Consulte os arquivos Rust originais em core-files/:
- terminal/terminal_panel.rs (painel principal)
- pane-system/pane_group.rs (splits recursivos)
- pane-system/pane.rs (gerenciamento de abas)
- dock-system/dock.rs (sistema de docks)
```

---

## 🔧 Adaptação por Framework

### React / Next.js

**Estrutura sugerida:**
```
src/
├── components/
│   ├── terminal/
│   │   ├── Terminal.tsx
│   │   ├── TerminalPane.tsx
│   │   ├── TerminalTab.tsx
│   │   └── PaneGroup.tsx
│   └── ui/
│       ├── ResizeHandle.tsx
│       └── Divider.tsx
├── lib/
│   ├── pane-group.ts
│   ├── layout-calculator.ts
│   └── serializer.ts
└── hooks/
    ├── useTerminalManager.ts
    ├── useKeyboardShortcuts.ts
    └── usePaneLayout.ts
```

**Começe com:**
1. Copie o código de `examples/basic-terminal.md`
2. Adapte para TypeScript se necessário
3. Adicione state management (Zustand, Redux, etc)
4. Implemente splits seguindo `examples/splits-and-tabs.md`

**Bibliotecas recomendadas:**
- `xterm` + `xterm-addon-fit`: Terminal emulator
- `zustand` ou `jotai`: State management leve
- `react-use`: Hooks úteis (useKey, useWindowSize)

### Vue 3 / Nuxt

**Estrutura sugerida:**
```
src/
├── components/
│   ├── Terminal/
│   │   ├── TerminalView.vue
│   │   ├── TerminalPane.vue
│   │   └── PaneGroup.vue
│   └── ui/
│       └── ResizeHandle.vue
├── composables/
│   ├── useTerminalManager.ts
│   ├── usePaneGroup.ts
│   └── useLayoutCalculator.ts
└── stores/
    └── terminal.ts (Pinia)
```

**Adaptações necessárias:**
```typescript
// Exemplo: useTerminalManager composable
import { ref, computed } from 'vue';

export function useTerminalManager() {
  const manager = ref(new PaneGroupManager());

  const paneGroup = computed(() => manager.value.getPaneGroup());
  const activePaneId = computed(() => manager.value.getActivePaneId());

  const addTerminal = () => manager.value.addTerminal();
  const split = (dir: SplitDirection) => manager.value.split(dir);

  return {
    paneGroup,
    activePaneId,
    addTerminal,
    split
  };
}
```

### Angular

**Estrutura sugerida:**
```
src/app/
├── terminal/
│   ├── services/
│   │   ├── terminal-manager.service.ts
│   │   ├── pane-group.service.ts
│   │   └── layout-calculator.service.ts
│   ├── components/
│   │   ├── terminal-panel/
│   │   ├── terminal-pane/
│   │   └── pane-group/
│   └── models/
│       ├── pane-group.model.ts
│       └── terminal.model.ts
```

**Exemplo de Service:**
```typescript
@Injectable({ providedIn: 'root' })
export class PaneGroupService {
  private paneGroupSubject = new BehaviorSubject<PaneGroup>(initialPaneGroup);
  paneGroup$ = this.paneGroupSubject.asObservable();

  split(direction: SplitDirection): void {
    const current = this.paneGroupSubject.value;
    // ... lógica de split
    this.paneGroupSubject.next(updated);
  }
}
```

### Svelte / SvelteKit

**Estrutura sugerida:**
```
src/
├── lib/
│   ├── terminal/
│   │   ├── PaneGroupManager.ts
│   │   └── LayoutCalculator.ts
│   └── stores/
│       └── terminalStore.ts
└── components/
    ├── Terminal.svelte
    ├── TerminalPane.svelte
    └── PaneGroup.svelte
```

**Exemplo de Store:**
```typescript
// terminalStore.ts
import { writable, derived } from 'svelte/store';

function createTerminalStore() {
  const manager = new PaneGroupManager();
  const { subscribe, set, update } = writable(manager);

  return {
    subscribe,
    addTerminal: () => update(m => { m.addTerminal(); return m; }),
    split: (dir: SplitDirection) => update(m => { m.split(dir); return m; })
  };
}

export const terminal = createTerminalStore();
```

### Vanilla JavaScript / Web Components

**Estrutura sugerida:**
```
src/
├── components/
│   ├── terminal-panel.js
│   ├── terminal-pane.js
│   └── pane-group.js
└── core/
    ├── pane-group-manager.js
    └── layout-calculator.js
```

**Exemplo de Web Component:**
```javascript
class TerminalPane extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="pane">
        <div class="tab-bar">
          ${this.renderTabs()}
        </div>
        <div class="content">
          ${this.renderActiveTerminal()}
        </div>
      </div>
    `;
  }
}

customElements.define('terminal-pane', TerminalPane);
```

---

## 🎨 Customização de UI

### Temas

Adapte as cores para seu tema:

```css
/* Theme variables */
:root {
  --terminal-bg: #1e1e1e;
  --terminal-fg: #d4d4d4;
  --tab-bar-bg: #2d2d2d;
  --border-color: #3e3e3e;
  --active-border: #007acc;
  --hover-bg: #4e4e4e;
}

/* Dark theme */
[data-theme="dark"] {
  --terminal-bg: #0d1117;
  --terminal-fg: #c9d1d9;
  --tab-bar-bg: #161b22;
  --border-color: #30363d;
  --active-border: #58a6ff;
}

/* Light theme */
[data-theme="light"] {
  --terminal-bg: #ffffff;
  --terminal-fg: #24292f;
  --tab-bar-bg: #f6f8fa;
  --border-color: #d0d7de;
  --active-border: #0969da;
}
```

### Animações

Adicione transições suaves:

```css
.pane {
  transition: border-color 0.2s ease;
}

.tab {
  transition: all 0.15s ease;
}

.resize-handle:hover {
  background: var(--active-border);
  transition: background 0.1s ease;
}
```

---

## 🔌 Integração com Backend

### Terminal via WebSocket

```typescript
class TerminalConnection {
  private ws: WebSocket;
  private terminal: Terminal; // xterm.js

  connect(url: string): void {
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      this.terminal.write(event.data);
    };

    this.terminal.onData((data) => {
      this.ws.send(data);
    });
  }

  resize(rows: number, cols: number): void {
    this.ws.send(JSON.stringify({
      type: 'resize',
      rows,
      cols
    }));
  }
}
```

### Backend Node.js (PTY)

```typescript
import { Server } from 'socket.io';
import * as pty from 'node-pty';

const io = new Server(server);

io.on('connection', (socket) => {
  const shell = pty.spawn('bash', [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env as any
  });

  shell.on('data', (data) => {
    socket.emit('output', data);
  });

  socket.on('input', (data) => {
    shell.write(data);
  });

  socket.on('resize', ({ rows, cols }) => {
    shell.resize(cols, rows);
  });

  socket.on('disconnect', () => {
    shell.kill();
  });
});
```

---

## 📦 Dependências Recomendadas

### Terminal Emulator
```bash
npm install xterm xterm-addon-fit xterm-addon-web-links
```

### Utilities
```bash
npm install uuid  # IDs únicos
npm install lodash.debounce lodash.throttle  # Performance
```

### State Management (escolha um)
```bash
npm install zustand  # React
npm install pinia  # Vue
npm install @ngrx/store  # Angular
```

---

## 🐛 Debugging

### Visualizar Estrutura da Árvore

Adicione este helper:

```typescript
function debugPaneGroup(paneGroup: PaneGroup): void {
  console.log('=== PaneGroup Structure ===');
  printMember(paneGroup.root, 0);
}

function printMember(member: Member, depth: number): void {
  const indent = '  '.repeat(depth);

  if (member.type === 'pane') {
    console.log(`${indent}📦 Pane(${member.pane.id})`);
    member.pane.terminals.forEach((t, i) => {
      const active = i === member.pane.activeIndex ? '⭐' : '  ';
      console.log(`${indent}  ${active} ${t.title}`);
    });
  } else {
    console.log(`${indent}↔️  Axis(${member.axis})`);
    console.log(`${indent}  flexes: [${member.flexes.join(', ')}]`);
    member.members.forEach(child => printMember(child, depth + 1));
  }
}

// Uso:
debugPaneGroup(manager.getPaneGroup());
```

### DevTools Extension

Para React, use React DevTools com custom hooks:

```typescript
// Hook para debug
function useDebugPaneGroup(manager: PaneGroupManager) {
  useEffect(() => {
    // @ts-ignore
    window.__PANE_GROUP_MANAGER__ = manager;
    // @ts-ignore
    window.debugPaneGroup = () => debugPaneGroup(manager.getPaneGroup());
  }, [manager]);
}

// No console:
// > debugPaneGroup()
```

---

## ⚡ Otimização de Performance

### 1. Memoização

```typescript
// React
const MemoizedPaneGroup = React.memo(PaneGroupView, (prev, next) => {
  return prev.member === next.member &&
         prev.activePaneId === next.activePaneId;
});
```

### 2. Virtualização

Para muitos terminais, virtualize os não visíveis:

```typescript
function PaneView({ pane }: PaneViewProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    });

    // ... setup
  }, []);

  return isVisible ? <TerminalContent /> : <PlaceholderContent />;
}
```

### 3. Debounce de Resize

```typescript
const handleResize = useMemo(
  () => debounce((delta: number) => {
    manager.resize(paneId, axis, delta);
  }, 16), // ~60fps
  [manager, paneId, axis]
);
```

---

## 🧪 Testes

### Teste de Split

```typescript
describe('PaneGroupManager', () => {
  it('should split pane horizontally', () => {
    const manager = new PaneGroupManager();
    const initialPaneId = manager.getActivePaneId();

    manager.split(SplitDirection.Right);

    const panes = manager.getAllPanes();
    expect(panes).toHaveLength(2);
    expect(manager.getPaneGroup().root.type).toBe('axis');
  });

  it('should collapse axis when pane is removed', () => {
    const manager = new PaneGroupManager();
    manager.split(SplitDirection.Right);

    const panes = manager.getAllPanes();
    const terminalId = panes[1].terminals[0].id;

    manager.closeTerminal(terminalId);

    expect(manager.getPaneGroup().root.type).toBe('pane');
  });
});
```

---

## 📝 Checklist de Implementação

### Fase 1: Básico
- [ ] Estruturas de dados (Pane, Terminal)
- [ ] Adicionar/remover terminais
- [ ] Sistema de abas
- [ ] Atalhos de teclado básicos
- [ ] UI básica com CSS

### Fase 2: Splits
- [ ] Estrutura PaneGroup (Member, Axis)
- [ ] Operação de split
- [ ] Operação de remove com colapso
- [ ] Layout calculator
- [ ] Renderização recursiva

### Fase 3: Interatividade
- [ ] Resize handles
- [ ] Drag & drop de terminais
- [ ] Hit testing (pane at position)
- [ ] Feedback visual de drag
- [ ] Indicadores de drop zone

### Fase 4: Persistência
- [ ] Serialização de PaneGroup
- [ ] Salvar em localStorage
- [ ] Restaurar ao carregar
- [ ] Migração de versões antigas

### Fase 5: Terminal Real
- [ ] Integração com xterm.js
- [ ] Conexão com backend (PTY)
- [ ] Suporte a scrollback
- [ ] Busca no terminal
- [ ] Copy/paste

---

## 🚀 Deploy

### Considerações

1. **Bundle Size**: Xterm.js adiciona ~500KB. Use code splitting:
   ```typescript
   const Terminal = lazy(() => import('./components/Terminal'));
   ```

2. **WebSocket**: Configure proxy em produção:
   ```javascript
   // vite.config.ts
   export default {
     server: {
       proxy: {
         '/ws': {
           target: 'ws://localhost:3001',
           ws: true
         }
       }
     }
   }
   ```

3. **Performance**: Limite número de terminais simultâneos para evitar overhead.

---

## 💡 Dicas Finais

1. **Comece Simples**: Implemente abas antes de splits
2. **Teste Incrementalmente**: Valide cada fase antes de avançar
3. **Use TypeScript**: Ajuda muito com a estrutura recursiva
4. **Consulte os Exemplos**: Código completo e funcional
5. **Leia o Código do Zed**: Referência original em `core-files/`

---

## 📞 Suporte

Se tiver dúvidas:
1. Consulte `docs/IMPLEMENTATION_GUIDE.md`
2. Veja exemplos em `examples/`
3. Leia código original em `core-files/`
4. Abra issue no repositório do projeto

---

**Boa sorte com a implementação! 🚀**
