# Exemplo Básico: Terminal Simples com Abas

Este exemplo demonstra a implementação mais básica: um único pane com múltiplas abas de terminais.

## Estrutura de Dados

```typescript
// Terminal básico
interface Terminal {
  id: string;
  title: string;
  content: string[];  // Linhas do terminal
  cursorPosition: { line: number; col: number };
}

// Pane com abas
interface SimplePane {
  terminals: Terminal[];
  activeIndex: number;
}
```

## Implementação Completa

```typescript
// ============================================
// 1. State Management
// ============================================

class SimplePaneManager {
  private terminals: Terminal[] = [];
  private activeIndex: number = 0;
  private listeners: Array<() => void> = [];

  constructor() {
    // Cria terminal inicial
    this.addTerminal();
  }

  // Adiciona novo terminal
  addTerminal(): void {
    const terminal: Terminal = {
      id: `terminal-${Date.now()}`,
      title: `Terminal ${this.terminals.length + 1}`,
      content: ['$ '],  // Prompt inicial
      cursorPosition: { line: 0, col: 2 }
    };

    this.terminals.push(terminal);
    this.activeIndex = this.terminals.length - 1;
    this.notify();
  }

  // Remove terminal
  closeTerminal(index: number): void {
    if (this.terminals.length === 1) {
      // Não fecha último terminal
      return;
    }

    this.terminals.splice(index, 1);

    // Ajusta índice ativo
    if (this.activeIndex >= this.terminals.length) {
      this.activeIndex = this.terminals.length - 1;
    }

    this.notify();
  }

  // Ativa terminal
  activateTerminal(index: number): void {
    if (index >= 0 && index < this.terminals.length) {
      this.activeIndex = index;
      this.notify();
    }
  }

  // Navegação
  nextTerminal(): void {
    this.activeIndex = (this.activeIndex + 1) % this.terminals.length;
    this.notify();
  }

  previousTerminal(): void {
    this.activeIndex =
      (this.activeIndex - 1 + this.terminals.length) % this.terminals.length;
    this.notify();
  }

  // Getters
  getTerminals(): Terminal[] {
    return this.terminals;
  }

  getActiveTerminal(): Terminal | null {
    return this.terminals[this.activeIndex] || null;
  }

  getActiveIndex(): number {
    return this.activeIndex;
  }

  // Observer pattern
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }
}

// ============================================
// 2. React Components
// ============================================

import React, { useState, useEffect, useCallback } from 'react';

// Componente principal
function SimpleTerminalPane() {
  const [manager] = useState(() => new SimplePaneManager());
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // Subscribe to manager changes
  useEffect(() => {
    return manager.subscribe(() => forceUpdate());
  }, [manager]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+T: New terminal
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        manager.addTerminal();
      }

      // Ctrl+W: Close terminal
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        const activeIndex = manager.getActiveIndex();
        manager.closeTerminal(activeIndex);
      }

      // Ctrl+Tab: Next terminal
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        manager.nextTerminal();
      }

      // Ctrl+Shift+Tab: Previous terminal
      if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        manager.previousTerminal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manager]);

  const terminals = manager.getTerminals();
  const activeIndex = manager.getActiveIndex();
  const activeTerminal = manager.getActiveTerminal();

  return (
    <div className="simple-terminal-pane">
      {/* Tab bar */}
      <div className="tab-bar">
        {terminals.map((terminal, index) => (
          <Tab
            key={terminal.id}
            terminal={terminal}
            isActive={index === activeIndex}
            onClick={() => manager.activateTerminal(index)}
            onClose={() => manager.closeTerminal(index)}
          />
        ))}
        <button
          className="new-tab-btn"
          onClick={() => manager.addTerminal()}
          title="New Terminal (Ctrl+T)"
        >
          +
        </button>
      </div>

      {/* Terminal content */}
      <div className="terminal-content">
        {activeTerminal && (
          <TerminalView terminal={activeTerminal} />
        )}
      </div>
    </div>
  );
}

// Tab component
interface TabProps {
  terminal: Terminal;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

function Tab({ terminal, isActive, onClick, onClose }: TabProps) {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      className={`tab ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <span className="tab-icon">$</span>
      <span className="tab-title">{terminal.title}</span>
      <button
        className="tab-close"
        onClick={handleClose}
        title="Close (Ctrl+W)"
      >
        ×
      </button>
    </div>
  );
}

// Terminal view component
interface TerminalViewProps {
  terminal: Terminal;
}

function TerminalView({ terminal }: TerminalViewProps) {
  return (
    <div className="terminal-view">
      {terminal.content.map((line, index) => (
        <div key={index} className="terminal-line">
          {line}
          {index === terminal.cursorPosition.line && (
            <span
              className="cursor"
              style={{
                left: `${terminal.cursorPosition.col}ch`
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// 3. Styles (CSS)
// ============================================

const styles = `
.simple-terminal-pane {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', monospace;
}

.tab-bar {
  display: flex;
  background: #2d2d2d;
  border-bottom: 1px solid #3e3e3e;
  overflow-x: auto;
  flex-shrink: 0;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #2d2d2d;
  border-right: 1px solid #3e3e3e;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.tab:hover {
  background: #3e3e3e;
}

.tab.active {
  background: #1e1e1e;
  border-bottom: 2px solid #007acc;
}

.tab-icon {
  opacity: 0.7;
  font-size: 14px;
}

.tab-title {
  font-size: 13px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-close {
  background: none;
  border: none;
  color: #858585;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s;
}

.tab-close:hover {
  background: #ff6b6b;
  color: white;
}

.new-tab-btn {
  background: none;
  border: none;
  color: #858585;
  font-size: 18px;
  cursor: pointer;
  padding: 8px 16px;
  transition: all 0.15s;
}

.new-tab-btn:hover {
  background: #3e3e3e;
  color: #d4d4d4;
}

.terminal-content {
  flex: 1;
  overflow: auto;
  padding: 8px;
}

.terminal-view {
  height: 100%;
}

.terminal-line {
  position: relative;
  line-height: 1.5;
  font-size: 14px;
  white-space: pre;
}

.cursor {
  position: absolute;
  width: 8px;
  height: 1.2em;
  background: #d4d4d4;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

/* Scrollbar styling */
.terminal-content::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.terminal-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.terminal-content::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 6px;
}

.terminal-content::-webkit-scrollbar-thumb:hover {
  background: #4e4e4e;
}
`;

// ============================================
// 4. Usage Example
// ============================================

import ReactDOM from 'react-dom/client';

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Render app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<SimpleTerminalPane />);
```

## HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simple Terminal Pane</title>
</head>
<body style="margin: 0; padding: 0; height: 100vh; overflow: hidden;">
  <div id="root" style="width: 100%; height: 100%;"></div>
</body>
</html>
```

## Funcionalidades Implementadas

✅ **Múltiplas abas**: Adicionar e remover terminais
✅ **Navegação**: Clicar em abas ou usar Ctrl+Tab
✅ **Atalhos de teclado**:
  - `Ctrl+T`: Novo terminal
  - `Ctrl+W`: Fechar terminal
  - `Ctrl+Tab`: Próximo terminal
  - `Ctrl+Shift+Tab`: Terminal anterior
✅ **Visual feedback**: Aba ativa destacada
✅ **Proteção**: Não fecha último terminal

## Próximos Passos

Este é o exemplo mais básico. Para expandir:

1. **Adicionar terminal real**: Integrar com xterm.js
2. **Implementar splits**: Seguir exemplo `splits-and-tabs.md`
3. **Adicionar persistência**: Salvar estado no localStorage
4. **Melhorar UI**: Adicionar drag & drop de abas

## Integração com Xterm.js

Para ter um terminal funcional de verdade:

```typescript
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

function createTerminal(): Terminal {
  const term = new Terminal({
    cursorBlink: true,
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: 14,
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
    }
  });

  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);

  return term;
}

// No componente TerminalView:
function TerminalView({ terminal }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal>();

  useEffect(() => {
    if (!containerRef.current) return;

    const xterm = createTerminal();
    xterm.open(containerRef.current);
    xtermRef.current = xterm;

    // Exemplo: echo
    xterm.onData(data => {
      xterm.write(data);
    });

    return () => xterm.dispose();
  }, []);

  return <div ref={containerRef} className="terminal-view" />;
}
```

---

**Referência**: Este exemplo implementa apenas o gerenciamento de abas. Para splits, veja `splits-and-tabs.md`.
