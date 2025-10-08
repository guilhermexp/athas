# Exemplo Avançado: Splits e Abas

Este exemplo implementa o sistema completo de splits recursivos com múltiplas abas por pane, similar ao Zed.

## Visual do Resultado

```
┌─────────────────────────────────────────┐
│  Terminal 1 │ Terminal 2 │ +            │
├─────────────────────┬───────────────────┤
│                     │  Term 3 │ Term 4  │
│    Terminal 1       ├─────────────────────┤
│    Content          │                   │
│                     │    Terminal 3     │
└─────────────────────┴───────────────────┘
```

## Implementação Completa

```typescript
// ============================================
// 1. Core Data Structures
// ============================================

enum SplitDirection {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right'
}

enum Axis {
  Horizontal = 'horizontal',
  Vertical = 'vertical'
}

interface Terminal {
  id: string;
  title: string;
}

interface Pane {
  id: string;
  terminals: Terminal[];
  activeIndex: number;
}

interface PaneMember {
  type: 'pane';
  pane: Pane;
}

interface AxisMember {
  type: 'axis';
  axis: Axis;
  members: Member[];
  flexes: number[];
}

type Member = PaneMember | AxisMember;

interface PaneGroup {
  root: Member;
}

// ============================================
// 2. PaneGroup Manager
// ============================================

class PaneGroupManager {
  private paneGroup: PaneGroup;
  private activePaneId: string | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    const initialPane = this.createPane();
    this.paneGroup = {
      root: {
        type: 'pane',
        pane: initialPane
      }
    };
    this.activePaneId = initialPane.id;
  }

  // Cria novo pane
  private createPane(): Pane {
    const terminal = this.createTerminal();
    return {
      id: `pane-${Date.now()}-${Math.random()}`,
      terminals: [terminal],
      activeIndex: 0
    };
  }

  // Cria novo terminal
  private createTerminal(): Terminal {
    return {
      id: `terminal-${Date.now()}-${Math.random()}`,
      title: `Terminal ${this.getTerminalCount() + 1}`
    };
  }

  // Adiciona terminal ao pane ativo
  addTerminal(): void {
    const pane = this.findPane(this.activePaneId);
    if (!pane) return;

    const terminal = this.createTerminal();
    pane.terminals.push(terminal);
    pane.activeIndex = pane.terminals.length - 1;

    this.notify();
  }

  // Split do pane ativo
  split(direction: SplitDirection): void {
    if (!this.activePaneId) return;

    const newPane = this.createPane();
    const success = this.splitMember(
      this.paneGroup.root,
      this.activePaneId,
      newPane,
      direction
    );

    if (success) {
      this.activePaneId = newPane.id;
      this.notify();
    }
  }

  // Implementação recursiva de split
  private splitMember(
    member: Member,
    targetPaneId: string,
    newPane: Pane,
    direction: SplitDirection
  ): boolean {
    if (member.type === 'pane') {
      if (member.pane.id !== targetPaneId) {
        return false;
      }

      // Determina eixo
      const axis =
        direction === SplitDirection.Left || direction === SplitDirection.Right
          ? Axis.Horizontal
          : Axis.Vertical;

      // Determina ordem dos membros
      const members =
        direction === SplitDirection.Up || direction === SplitDirection.Left
          ? [
              { type: 'pane' as const, pane: newPane },
              { type: 'pane' as const, pane: member.pane }
            ]
          : [
              { type: 'pane' as const, pane: member.pane },
              { type: 'pane' as const, pane: newPane }
            ];

      // Transforma member em axis
      Object.assign(member, {
        type: 'axis',
        axis,
        members,
        flexes: [1.0, 1.0]
      });

      return true;
    }

    // Se é axis, busca recursivamente
    if (member.type === 'axis') {
      for (let i = 0; i < member.members.length; i++) {
        if (this.splitMember(member.members[i], targetPaneId, newPane, direction)) {
          return true;
        }
      }
    }

    return false;
  }

  // Fecha terminal
  closeTerminal(terminalId: string): void {
    const panes = this.getAllPanes();

    for (const pane of panes) {
      const index = pane.terminals.findIndex(t => t.id === terminalId);
      if (index !== -1) {
        pane.terminals.splice(index, 1);

        // Ajusta índice ativo
        if (pane.activeIndex >= pane.terminals.length) {
          pane.activeIndex = Math.max(0, pane.terminals.length - 1);
        }

        // Se pane ficou vazio, remove
        if (pane.terminals.length === 0) {
          this.removePane(pane.id);
        }

        this.notify();
        break;
      }
    }
  }

  // Remove pane vazio
  private removePane(paneId: string): void {
    const removed = this.removeMember(this.paneGroup.root, paneId);
    if (removed && this.activePaneId === paneId) {
      const panes = this.getAllPanes();
      this.activePaneId = panes[0]?.id || null;
    }
  }

  // Implementação recursiva de remoção
  private removeMember(member: Member, paneId: string): boolean {
    if (member.type === 'pane') {
      return false; // Não pode remover raiz
    }

    if (member.type === 'axis') {
      for (let i = 0; i < member.members.length; i++) {
        const child = member.members[i];

        // Se achou o pane, remove
        if (child.type === 'pane' && child.pane.id === paneId) {
          member.members.splice(i, 1);
          member.flexes.splice(i, 1);

          // Colapsa axis se sobrou apenas 1 membro
          if (member.members.length === 1) {
            const remaining = member.members[0];
            Object.assign(member, remaining);
          }

          return true;
        }

        // Busca recursivamente
        if (child.type === 'axis') {
          if (this.removeMember(child, paneId)) {
            // Verifica se child colapsou
            if (child.members.length === 1) {
              member.members[i] = child.members[0];
            }
            return true;
          }
        }
      }
    }

    return false;
  }

  // Ativa pane
  activatePane(paneId: string): void {
    this.activePaneId = paneId;
    this.notify();
  }

  // Helpers
  private findPane(paneId: string | null): Pane | null {
    if (!paneId) return null;
    return this.getAllPanes().find(p => p.id === paneId) || null;
  }

  private getAllPanes(): Pane[] {
    const panes: Pane[] = [];
    this.collectPanes(this.paneGroup.root, panes);
    return panes;
  }

  private collectPanes(member: Member, panes: Pane[]): void {
    if (member.type === 'pane') {
      panes.push(member.pane);
    } else {
      member.members.forEach(child => this.collectPanes(child, panes));
    }
  }

  private getTerminalCount(): number {
    return this.getAllPanes().reduce((sum, pane) => sum + pane.terminals.length, 0);
  }

  // Getters públicos
  getPaneGroup(): PaneGroup {
    return this.paneGroup;
  }

  getActivePaneId(): string | null {
    return this.activePaneId;
  }

  // Observer
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }
}

// ============================================
// 3. Layout Calculator
// ============================================

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

class LayoutCalculator {
  static calculateLayout(
    member: Member,
    bounds: Bounds
  ): Map<string, Bounds> {
    const layouts = new Map<string, Bounds>();
    this.calculateMemberLayout(member, bounds, layouts);
    return layouts;
  }

  private static calculateMemberLayout(
    member: Member,
    bounds: Bounds,
    layouts: Map<string, Bounds>
  ): void {
    if (member.type === 'pane') {
      layouts.set(member.pane.id, bounds);
      return;
    }

    if (member.type === 'axis') {
      const totalFlex = member.flexes.length;
      const spacePerFlex =
        member.axis === Axis.Horizontal
          ? bounds.width / totalFlex
          : bounds.height / totalFlex;

      let offset = 0;

      for (let i = 0; i < member.members.length; i++) {
        const flex = member.flexes[i];
        const size = spacePerFlex * flex;

        const childBounds: Bounds =
          member.axis === Axis.Horizontal
            ? {
                x: bounds.x + offset,
                y: bounds.y,
                width: size,
                height: bounds.height
              }
            : {
                x: bounds.x,
                y: bounds.y + offset,
                width: bounds.width,
                height: size
              };

        this.calculateMemberLayout(member.members[i], childBounds, layouts);
        offset += size;
      }
    }
  }
}

// ============================================
// 4. React Components
// ============================================

import React, { useState, useEffect, useCallback } from 'react';

// Componente principal
function SplitTerminalApp() {
  const [manager] = useState(() => new PaneGroupManager());
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    return manager.subscribe(() => forceUpdate());
  }, [manager]);

  // Handle resize
  useEffect(() => {
    const updateSize = () => {
      setContainerSize({
        width: window.innerWidth,
        height: window.innerHeight - 50
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        switch (e.key) {
          case 'ArrowUp':
            manager.split(SplitDirection.Up);
            break;
          case 'ArrowDown':
            manager.split(SplitDirection.Down);
            break;
          case 'ArrowLeft':
            manager.split(SplitDirection.Left);
            break;
          case 'ArrowRight':
            manager.split(SplitDirection.Right);
            break;
        }
      } else if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        manager.addTerminal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manager]);

  const paneGroup = manager.getPaneGroup();
  const activePaneId = manager.getActivePaneId();

  return (
    <div className="split-terminal-app">
      <Toolbar
        onNewTerminal={() => manager.addTerminal()}
        onSplit={(dir) => manager.split(dir)}
      />
      <div className="terminal-container" style={{ height: containerSize.height }}>
        <PaneGroupView
          member={paneGroup.root}
          bounds={{
            x: 0,
            y: 0,
            width: containerSize.width,
            height: containerSize.height
          }}
          activePaneId={activePaneId}
          onPaneClick={(paneId) => manager.activatePane(paneId)}
          onTerminalClose={(termId) => manager.closeTerminal(termId)}
          onAddTerminal={() => manager.addTerminal()}
        />
      </div>
    </div>
  );
}

// Toolbar
interface ToolbarProps {
  onNewTerminal: () => void;
  onSplit: (direction: SplitDirection) => void;
}

function Toolbar({ onNewTerminal, onSplit }: ToolbarProps) {
  return (
    <div className="toolbar">
      <button onClick={onNewTerminal}>New Terminal</button>
      <div className="split-buttons">
        <button onClick={() => onSplit(SplitDirection.Left)}>Split ←</button>
        <button onClick={() => onSplit(SplitDirection.Right)}>Split →</button>
        <button onClick={() => onSplit(SplitDirection.Up)}>Split ↑</button>
        <button onClick={() => onSplit(SplitDirection.Down)}>Split ↓</button>
      </div>
    </div>
  );
}

// PaneGroup view (recursivo)
interface PaneGroupViewProps {
  member: Member;
  bounds: Bounds;
  activePaneId: string | null;
  onPaneClick: (paneId: string) => void;
  onTerminalClose: (terminalId: string) => void;
  onAddTerminal: () => void;
}

function PaneGroupView({
  member,
  bounds,
  activePaneId,
  onPaneClick,
  onTerminalClose,
  onAddTerminal
}: PaneGroupViewProps) {
  if (member.type === 'pane') {
    return (
      <div
        style={{
          position: 'absolute',
          left: bounds.x,
          top: bounds.y,
          width: bounds.width,
          height: bounds.height
        }}
      >
        <PaneView
          pane={member.pane}
          isActive={member.pane.id === activePaneId}
          onPaneClick={() => onPaneClick(member.pane.id)}
          onTerminalClose={onTerminalClose}
          onAddTerminal={onAddTerminal}
        />
      </div>
    );
  }

  // É um axis - renderiza recursivamente
  const totalFlex = member.flexes.length;
  const spacePerFlex =
    member.axis === Axis.Horizontal
      ? bounds.width / totalFlex
      : bounds.height / totalFlex;

  let offset = 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        display: 'flex',
        flexDirection: member.axis === Axis.Horizontal ? 'row' : 'column'
      }}
    >
      {member.members.map((child, index) => {
        const flex = member.flexes[index];
        const size = spacePerFlex * flex;

        const childBounds: Bounds =
          member.axis === Axis.Horizontal
            ? { x: offset, y: 0, width: size, height: bounds.height }
            : { x: 0, y: offset, width: bounds.width, height: size };

        offset += size;

        return (
          <React.Fragment key={index}>
            <PaneGroupView
              member={child}
              bounds={childBounds}
              activePaneId={activePaneId}
              onPaneClick={onPaneClick}
              onTerminalClose={onTerminalClose}
              onAddTerminal={onAddTerminal}
            />
            {index < member.members.length - 1 && (
              <div
                className={`divider divider-${member.axis}`}
                style={{
                  width: member.axis === Axis.Horizontal ? '1px' : '100%',
                  height: member.axis === Axis.Vertical ? '1px' : '100%'
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Pane view
interface PaneViewProps {
  pane: Pane;
  isActive: boolean;
  onPaneClick: () => void;
  onTerminalClose: (terminalId: string) => void;
  onAddTerminal: () => void;
}

function PaneView({
  pane,
  isActive,
  onPaneClick,
  onTerminalClose,
  onAddTerminal
}: PaneViewProps) {
  const activeTerminal = pane.terminals[pane.activeIndex];

  return (
    <div
      className={`pane ${isActive ? 'active' : ''}`}
      onClick={onPaneClick}
    >
      <div className="tab-bar">
        {pane.terminals.map((terminal, index) => (
          <div
            key={terminal.id}
            className={`tab ${index === pane.activeIndex ? 'active' : ''}`}
          >
            <span>{terminal.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTerminalClose(terminal.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button className="add-tab" onClick={(e) => {
          e.stopPropagation();
          onPaneClick();
          onAddTerminal();
        }}>
          +
        </button>
      </div>
      <div className="terminal-content">
        {activeTerminal && (
          <div className="terminal-output">
            <div>$ {activeTerminal.title}</div>
            <div className="cursor">_</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// 5. Styles
// ============================================

const styles = `
.split-terminal-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', monospace;
}

.toolbar {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #2d2d2d;
  border-bottom: 1px solid #3e3e3e;
}

.toolbar button {
  padding: 6px 12px;
  background: #3e3e3e;
  border: none;
  color: #d4d4d4;
  cursor: pointer;
  border-radius: 4px;
}

.toolbar button:hover {
  background: #4e4e4e;
}

.split-buttons {
  display: flex;
  gap: 4px;
}

.terminal-container {
  position: relative;
  flex: 1;
  overflow: hidden;
}

.pane {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #1e1e1e;
  border: 2px solid transparent;
}

.pane.active {
  border-color: #007acc;
}

.tab-bar {
  display: flex;
  background: #2d2d2d;
  border-bottom: 1px solid #3e3e3e;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #2d2d2d;
  border-right: 1px solid #3e3e3e;
  cursor: pointer;
}

.tab.active {
  background: #1e1e1e;
  border-bottom: 2px solid #007acc;
}

.tab button {
  background: none;
  border: none;
  color: #858585;
  cursor: pointer;
  padding: 0;
}

.add-tab {
  padding: 6px 12px;
  background: none;
  border: none;
  color: #858585;
  cursor: pointer;
}

.terminal-content {
  flex: 1;
  padding: 8px;
  overflow: auto;
}

.terminal-output {
  font-size: 14px;
  line-height: 1.5;
}

.cursor {
  display: inline-block;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

.divider {
  background: #3e3e3e;
  flex-shrink: 0;
}

.divider-horizontal {
  cursor: col-resize;
}

.divider-vertical {
  cursor: row-resize;
}
`;
```

## Funcionalidades Implementadas

✅ Splits recursivos (horizontal/vertical)
✅ Múltiplas abas por pane
✅ Ativar panes clicando
✅ Fechar terminais/panes vazios
✅ Atalhos de teclado
✅ Layout responsivo
✅ Visual feedback do pane ativo

## Atalhos de Teclado

- `Ctrl+T`: Novo terminal no pane ativo
- `Ctrl+Shift+←`: Split para esquerda
- `Ctrl+Shift+→`: Split para direita
- `Ctrl+Shift+↑`: Split para cima
- `Ctrl+Shift+↓`: Split para baixo

## Próximos Passos

1. **Resize interativo**: Adicionar drag handles
2. **Drag & drop**: Arrastar terminais entre panes
3. **Persistência**: Salvar layout
4. **Xterm.js**: Terminal real

Veja `IMPLEMENTATION_GUIDE.md` para detalhes completos!
