# Guia de Implementação: Sistema de Terminais do Zed

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estruturas de Dados Fundamentais](#estruturas-de-dados-fundamentais)
3. [Implementação Passo a Passo](#implementação-passo-a-passo)
4. [Exemplos de Código](#exemplos-de-código)
5. [Testes e Debugging](#testes-e-debugging)

---

## Visão Geral

Este guia fornece um roteiro completo para implementar o sistema de gerenciamento de terminais do Zed em qualquer framework ou linguagem. Os conceitos são framework-agnostic, mas exemplos são fornecidos em TypeScript/React, JavaScript puro, e pseudo-código.

### Requisitos Mínimos

- Sistema de gerenciamento de estado
- Capacidade de renderização de componentes dinâmicos
- Suporte a eventos de mouse (drag, resize, click)
- Sistema de layout flexível (flexbox ou grid)

---

## Estruturas de Dados Fundamentais

### 1. PaneGroup - Sistema de Splits Recursivo

```typescript
// Enum para direção de split
enum SplitDirection {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right'
}

// Enum para eixo (axis)
enum Axis {
  Horizontal = 'horizontal',
  Vertical = 'vertical'
}

// Member pode ser um Pane ou um Axis (split)
type Member = PaneMember | AxisMember;

interface PaneMember {
  type: 'pane';
  pane: Pane;
}

interface AxisMember {
  type: 'axis';
  axis: Axis;
  members: Member[];
  flexes: number[];  // Proporções de tamanho [1.2, 0.8, 1.0]
  boundingBoxes: BoundingBox[];  // Coordenadas de cada membro
}

interface PaneGroup {
  root: Member;  // Raiz da árvore
}
```

**Invariantes importantes:**
- `flexes.length === members.length`
- `sum(flexes) === flexes.length` (cada flex tem valor médio de 1.0)
- `boundingBoxes.length === members.length`

### 2. Pane - Gerenciamento de Abas

```typescript
interface Pane {
  id: string;
  items: Item[];  // Lista de abas (terminais, editores, etc)
  activeItemIndex: number;  // Índice da aba ativa
  focusHandle: FocusHandle;  // Controle de foco
}

interface Item {
  id: string;
  type: 'terminal' | 'editor' | 'preview';
  title: string;
  view: any;  // Componente da view (React, Vue, etc)
  isDirty?: boolean;  // Tem alterações não salvas
}
```

### 3. TerminalPanel - Painel do Terminal

```typescript
interface TerminalPanel {
  paneGroup: PaneGroup;
  activePane: string | null;  // ID do pane ativo
  serializedState: SerializedPaneGroup | null;  // Para persistência

  // Métodos principais
  addTerminal(): void;
  split(paneId: string, direction: SplitDirection): void;
  closeTerminal(terminalId: string): void;
  activateTerminal(terminalId: string): void;
  resize(paneId: string, axis: Axis, amount: number): void;
}
```

### 4. BoundingBox - Coordenadas e Dimensões

```typescript
interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface BoundingBox {
  origin: Point;
  size: Size;
}

// Funções auxiliares
function contains(box: BoundingBox, point: Point): boolean {
  return point.x >= box.origin.x &&
         point.x <= box.origin.x + box.size.width &&
         point.y >= box.origin.y &&
         point.y <= box.origin.y + box.size.height;
}

function center(box: BoundingBox): Point {
  return {
    x: box.origin.x + box.size.width / 2,
    y: box.origin.y + box.size.height / 2
  };
}
```

---

## Implementação Passo a Passo

### Fase 1: Sistema Básico de Panes

#### Passo 1.1: Criar estrutura de Pane simples

```typescript
class Pane {
  private items: Item[] = [];
  private activeIndex: number = 0;
  public id: string;

  constructor() {
    this.id = generateId();
  }

  addItem(item: Item): void {
    this.items.push(item);
    this.activeIndex = this.items.length - 1;
  }

  removeItem(itemId: string): void {
    const index = this.items.findIndex(i => i.id === itemId);
    if (index === -1) return;

    this.items.splice(index, 1);

    // Ajusta índice ativo
    if (this.activeIndex >= this.items.length) {
      this.activeIndex = Math.max(0, this.items.length - 1);
    }
  }

  getActiveItem(): Item | null {
    return this.items[this.activeIndex] || null;
  }

  activateItem(itemId: string): void {
    const index = this.items.findIndex(i => i.id === itemId);
    if (index !== -1) {
      this.activeIndex = index;
    }
  }

  // Navegação entre abas
  activateNextItem(): void {
    if (this.items.length === 0) return;
    this.activeIndex = (this.activeIndex + 1) % this.items.length;
  }

  activatePrevItem(): void {
    if (this.items.length === 0) return;
    this.activeIndex =
      (this.activeIndex - 1 + this.items.length) % this.items.length;
  }
}
```

#### Passo 1.2: Renderizar Pane com Abas (React)

```tsx
interface PaneProps {
  pane: Pane;
  isActive: boolean;
  onItemClick: (itemId: string) => void;
  onItemClose: (itemId: string) => void;
  onNewItem: () => void;
}

function PaneComponent({ pane, isActive, onItemClick, onItemClose, onNewItem }: PaneProps) {
  const activeItem = pane.getActiveItem();

  return (
    <div className={`pane ${isActive ? 'active' : ''}`}>
      {/* Barra de abas */}
      <div className="tab-bar">
        {pane.items.map(item => (
          <Tab
            key={item.id}
            item={item}
            isActive={item.id === activeItem?.id}
            onClick={() => onItemClick(item.id)}
            onClose={() => onItemClose(item.id)}
          />
        ))}
        <button onClick={onNewItem} className="new-tab-btn">+</button>
      </div>

      {/* Conteúdo da aba ativa */}
      <div className="pane-content">
        {activeItem?.view}
      </div>
    </div>
  );
}

function Tab({ item, isActive, onClick, onClose }: TabProps) {
  return (
    <div
      className={`tab ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <span className="tab-title">{item.title}</span>
      <button
        className="close-btn"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >×</button>
    </div>
  );
}
```

### Fase 2: Sistema de Splits (PaneGroup)

#### Passo 2.1: Implementar PaneGroup básico

```typescript
class PaneGroup {
  public root: Member;

  constructor(initialPane: Pane) {
    this.root = {
      type: 'pane',
      pane: initialPane
    };
  }

  // Adiciona um split ao pane especificado
  split(
    targetPaneId: string,
    newPane: Pane,
    direction: SplitDirection
  ): boolean {
    return this.splitMember(this.root, targetPaneId, newPane, direction);
  }

  private splitMember(
    member: Member,
    targetPaneId: string,
    newPane: Pane,
    direction: SplitDirection
  ): boolean {
    if (member.type === 'pane') {
      // Chegamos em um pane, verifica se é o alvo
      if (member.pane.id === targetPaneId) {
        // Transforma este pane em um axis com dois membros
        const axis = direction === SplitDirection.Left ||
                     direction === SplitDirection.Right
                     ? Axis.Horizontal
                     : Axis.Vertical;

        const members = direction === SplitDirection.Up ||
                       direction === SplitDirection.Left
                       ? [
                           { type: 'pane' as const, pane: newPane },
                           { type: 'pane' as const, pane: member.pane }
                         ]
                       : [
                           { type: 'pane' as const, pane: member.pane },
                           { type: 'pane' as const, pane: newPane }
                         ];

        // Substitui este membro por um axis
        Object.assign(member, {
          type: 'axis',
          axis,
          members,
          flexes: [1.0, 1.0],
          boundingBoxes: [null, null]
        });

        return true;
      }
      return false;
    }

    // Se for um axis, procura recursivamente
    if (member.type === 'axis') {
      for (let i = 0; i < member.members.length; i++) {
        const found = this.splitMember(
          member.members[i],
          targetPaneId,
          newPane,
          direction
        );
        if (found) return true;
      }
    }

    return false;
  }

  // Remove um pane e reorganiza a estrutura
  remove(paneId: string): boolean {
    return this.removeMember(this.root, paneId);
  }

  private removeMember(member: Member, paneId: string): boolean {
    if (member.type === 'pane') {
      return false; // Não pode remover a raiz
    }

    if (member.type === 'axis') {
      for (let i = 0; i < member.members.length; i++) {
        const child = member.members[i];

        if (child.type === 'pane' && child.pane.id === paneId) {
          // Remove este membro
          member.members.splice(i, 1);
          member.flexes.splice(i, 1);
          member.boundingBoxes.splice(i, 1);

          // Se sobrou apenas um membro, colapsa o axis
          if (member.members.length === 1) {
            const remaining = member.members[0];
            Object.assign(member, remaining);
          }

          return true;
        }

        if (child.type === 'axis') {
          const found = this.removeMember(child, paneId);
          if (found) {
            // Verifica se o child axis colapsou
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

  // Encontra pane em uma posição
  paneAtPosition(point: Point): Pane | null {
    return this.findPaneAtPosition(this.root, point);
  }

  private findPaneAtPosition(member: Member, point: Point): Pane | null {
    if (member.type === 'pane') {
      return member.pane;
    }

    if (member.type === 'axis') {
      for (let i = 0; i < member.members.length; i++) {
        const box = member.boundingBoxes[i];
        if (box && contains(box, point)) {
          return this.findPaneAtPosition(member.members[i], point);
        }
      }
    }

    return null;
  }

  // Retorna todos os panes em ordem
  getAllPanes(): Pane[] {
    const panes: Pane[] = [];
    this.collectPanes(this.root, panes);
    return panes;
  }

  private collectPanes(member: Member, panes: Pane[]): void {
    if (member.type === 'pane') {
      panes.push(member.pane);
    } else if (member.type === 'axis') {
      member.members.forEach(child => this.collectPanes(child, panes));
    }
  }
}
```

#### Passo 2.2: Renderizar PaneGroup com Layout

```tsx
interface PaneGroupProps {
  paneGroup: PaneGroup;
  containerBounds: BoundingBox;
  activePaneId: string | null;
  onPaneClick: (paneId: string) => void;
}

function PaneGroupComponent({
  paneGroup,
  containerBounds,
  activePaneId,
  onPaneClick
}: PaneGroupProps) {
  return (
    <div className="pane-group" style={{ width: '100%', height: '100%' }}>
      <MemberComponent
        member={paneGroup.root}
        bounds={containerBounds}
        activePaneId={activePaneId}
        onPaneClick={onPaneClick}
      />
    </div>
  );
}

function MemberComponent({ member, bounds, activePaneId, onPaneClick }: MemberProps) {
  if (member.type === 'pane') {
    return (
      <div
        className="pane-container"
        style={{
          position: 'absolute',
          left: bounds.origin.x,
          top: bounds.origin.y,
          width: bounds.size.width,
          height: bounds.size.height
        }}
      >
        <PaneComponent
          pane={member.pane}
          isActive={member.pane.id === activePaneId}
          onItemClick={(itemId) => onPaneClick(member.pane.id)}
          onItemClose={(itemId) => member.pane.removeItem(itemId)}
          onNewItem={() => {/* criar novo item */}}
        />
      </div>
    );
  }

  if (member.type === 'axis') {
    return (
      <AxisComponent
        axis={member}
        bounds={bounds}
        activePaneId={activePaneId}
        onPaneClick={onPaneClick}
      />
    );
  }

  return null;
}

function AxisComponent({ axis, bounds, activePaneId, onPaneClick }: AxisProps) {
  // Calcula bounds de cada child baseado nos flexes
  const childBounds = calculateChildBounds(
    bounds,
    axis.axis,
    axis.flexes
  );

  // Atualiza bounding boxes no modelo
  axis.boundingBoxes = childBounds;

  return (
    <div
      className={`axis axis-${axis.axis}`}
      style={{
        position: 'absolute',
        left: bounds.origin.x,
        top: bounds.origin.y,
        width: bounds.size.width,
        height: bounds.size.height,
        display: 'flex',
        flexDirection: axis.axis === Axis.Horizontal ? 'row' : 'column'
      }}
    >
      {axis.members.map((child, index) => (
        <React.Fragment key={index}>
          <MemberComponent
            member={child}
            bounds={childBounds[index]}
            activePaneId={activePaneId}
            onPaneClick={onPaneClick}
          />

          {/* Render resize handle entre panes */}
          {index < axis.members.length - 1 && (
            <ResizeHandle
              axis={axis.axis}
              onResize={(delta) => handleResize(axis, index, delta)}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Calcula bounding boxes dos children baseado nos flexes
function calculateChildBounds(
  containerBounds: BoundingBox,
  axis: Axis,
  flexes: number[]
): BoundingBox[] {
  const totalFlex = flexes.length; // Soma sempre = length
  const isHorizontal = axis === Axis.Horizontal;

  const containerSize = isHorizontal
    ? containerBounds.size.width
    : containerBounds.size.height;

  const spacePerFlex = containerSize / totalFlex;

  const bounds: BoundingBox[] = [];
  let offset = 0;

  for (const flex of flexes) {
    const size = spacePerFlex * flex;

    bounds.push({
      origin: {
        x: isHorizontal
          ? containerBounds.origin.x + offset
          : containerBounds.origin.x,
        y: isHorizontal
          ? containerBounds.origin.y
          : containerBounds.origin.y + offset
      },
      size: {
        width: isHorizontal ? size : containerBounds.size.width,
        height: isHorizontal ? containerBounds.size.height : size
      }
    });

    offset += size;
  }

  return bounds;
}
```

### Fase 3: Redimensionamento Interativo

#### Passo 3.1: Handle de Resize

```tsx
interface ResizeHandleProps {
  axis: Axis;
  onResize: (delta: number) => void;
}

function ResizeHandle({ axis, onResize }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState<Point>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = axis === Axis.Horizontal
        ? e.clientX - startPos.x
        : e.clientY - startPos.y;

      onResize(delta);
      setStartPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startPos, axis, onResize]);

  const cursor = axis === Axis.Horizontal ? 'col-resize' : 'row-resize';

  return (
    <div
      className={`resize-handle resize-${axis}`}
      style={{
        cursor,
        width: axis === Axis.Horizontal ? '6px' : '100%',
        height: axis === Axis.Vertical ? '6px' : '100%',
        backgroundColor: '#444',
        flexShrink: 0
      }}
      onMouseDown={handleMouseDown}
    />
  );
}
```

#### Passo 3.2: Lógica de Resize

```typescript
function handleResize(
  axis: AxisMember,
  handleIndex: number,  // Índice do handle (entre panes i e i+1)
  deltaPixels: number    // Quanto o mouse moveu em pixels
): void {
  const MIN_SIZE = axis.axis === Axis.Horizontal ? 80 : 100;

  const flexes = [...axis.flexes];
  const totalFlex = flexes.length;

  // Calcula tamanho total do container baseado nos bounding boxes
  const containerSize = axis.boundingBoxes
    .filter(box => box !== null)
    .reduce((acc, box) => {
      const bounds = box!;
      const size = axis.axis === Axis.Horizontal
        ? bounds.size.width
        : bounds.size.height;
      return Math.max(acc, size);
    }, 0) * totalFlex;

  // Converte delta de pixels para delta de flex
  const flexChange = (deltaPixels * totalFlex) / containerSize;

  // Aplica mudança aos dois panes adjacentes
  const currentFlex = flexes[handleIndex];
  const nextFlex = flexes[handleIndex + 1];

  // Calcula novos valores
  let newCurrentFlex = currentFlex + flexChange;
  let newNextFlex = nextFlex - flexChange;

  // Aplica tamanho mínimo
  const spacePerFlex = containerSize / totalFlex;
  const minFlex = MIN_SIZE / spacePerFlex;

  newCurrentFlex = Math.max(newCurrentFlex, minFlex);
  newNextFlex = Math.max(newNextFlex, minFlex);

  // Ajusta se exceder limites
  const total = newCurrentFlex + newNextFlex;
  const target = currentFlex + nextFlex;

  if (total !== target) {
    const scale = target / total;
    newCurrentFlex *= scale;
    newNextFlex *= scale;
  }

  // Aplica novos flexes
  flexes[handleIndex] = newCurrentFlex;
  flexes[handleIndex + 1] = newNextFlex;

  axis.flexes = flexes;
}
```

### Fase 4: Drag & Drop de Terminais

#### Passo 4.1: Sistema de Drag

```typescript
interface DragState {
  itemId: string;
  sourcePaneId: string;
  currentPosition: Point;
  targetPane: Pane | null;
  dropPosition: 'tab' | 'split-up' | 'split-down' | 'split-left' | 'split-right';
}

class DragDropManager {
  private dragState: DragState | null = null;
  private paneGroup: PaneGroup;

  startDrag(itemId: string, paneId: string, position: Point): void {
    this.dragState = {
      itemId,
      sourcePaneId: paneId,
      currentPosition: position,
      targetPane: null,
      dropPosition: 'tab'
    };
  }

  updateDrag(position: Point): void {
    if (!this.dragState) return;

    this.dragState.currentPosition = position;

    // Encontra pane na posição atual
    const targetPane = this.paneGroup.paneAtPosition(position);
    this.dragState.targetPane = targetPane;

    if (targetPane) {
      // Determina tipo de drop baseado na posição dentro do pane
      this.dragState.dropPosition = this.calculateDropPosition(
        position,
        targetPane
      );
    }
  }

  private calculateDropPosition(
    position: Point,
    pane: Pane
  ): DragState['dropPosition'] {
    // Implementação simplificada - divide pane em 5 zonas
    const paneBounds = this.getPaneBounds(pane);
    const center = {
      x: paneBounds.origin.x + paneBounds.size.width / 2,
      y: paneBounds.origin.y + paneBounds.size.height / 2
    };

    const EDGE_THRESHOLD = 50; // pixels da borda

    // Verifica bordas
    if (position.x < paneBounds.origin.x + EDGE_THRESHOLD) {
      return 'split-left';
    }
    if (position.x > paneBounds.origin.x + paneBounds.size.width - EDGE_THRESHOLD) {
      return 'split-right';
    }
    if (position.y < paneBounds.origin.y + EDGE_THRESHOLD) {
      return 'split-up';
    }
    if (position.y > paneBounds.origin.y + paneBounds.size.height - EDGE_THRESHOLD) {
      return 'split-down';
    }

    // Centro = adicionar como tab
    return 'tab';
  }

  completeDrag(): void {
    if (!this.dragState) return;

    const { itemId, sourcePaneId, targetPane, dropPosition } = this.dragState;

    if (!targetPane) {
      this.dragState = null;
      return;
    }

    // Remove item do pane origem
    const sourcePane = this.findPane(sourcePaneId);
    const item = sourcePane?.items.find(i => i.id === itemId);

    if (!item || !sourcePane) {
      this.dragState = null;
      return;
    }

    sourcePane.removeItem(itemId);

    // Aplica drop
    if (dropPosition === 'tab') {
      // Adiciona como nova tab
      targetPane.addItem(item);
    } else {
      // Cria novo pane com o item e faz split
      const newPane = new Pane();
      newPane.addItem(item);

      const direction = {
        'split-up': SplitDirection.Up,
        'split-down': SplitDirection.Down,
        'split-left': SplitDirection.Left,
        'split-right': SplitDirection.Right
      }[dropPosition];

      if (direction) {
        this.paneGroup.split(targetPane.id, newPane, direction);
      }
    }

    // Limpa drag state
    this.dragState = null;
  }

  cancelDrag(): void {
    this.dragState = null;
  }

  getDropIndicator(): DropIndicator | null {
    if (!this.dragState || !this.dragState.targetPane) {
      return null;
    }

    const paneBounds = this.getPaneBounds(this.dragState.targetPane);

    return {
      bounds: this.calculateIndicatorBounds(
        paneBounds,
        this.dragState.dropPosition
      ),
      type: this.dragState.dropPosition
    };
  }

  private calculateIndicatorBounds(
    paneBounds: BoundingBox,
    dropPosition: DragState['dropPosition']
  ): BoundingBox {
    const SPLIT_SIZE = 0.5; // 50% do tamanho do pane

    switch (dropPosition) {
      case 'split-left':
        return {
          origin: paneBounds.origin,
          size: {
            width: paneBounds.size.width * SPLIT_SIZE,
            height: paneBounds.size.height
          }
        };

      case 'split-right':
        return {
          origin: {
            x: paneBounds.origin.x + paneBounds.size.width * SPLIT_SIZE,
            y: paneBounds.origin.y
          },
          size: {
            width: paneBounds.size.width * SPLIT_SIZE,
            height: paneBounds.size.height
          }
        };

      case 'split-up':
        return {
          origin: paneBounds.origin,
          size: {
            width: paneBounds.size.width,
            height: paneBounds.size.height * SPLIT_SIZE
          }
        };

      case 'split-down':
        return {
          origin: {
            x: paneBounds.origin.x,
            y: paneBounds.origin.y + paneBounds.size.height * SPLIT_SIZE
          },
          size: {
            width: paneBounds.size.width,
            height: paneBounds.size.height * SPLIT_SIZE
          }
        };

      case 'tab':
      default:
        return paneBounds;
    }
  }
}
```

### Fase 5: Persistência de Estado

#### Passo 5.1: Serialização

```typescript
interface SerializedPaneGroup {
  root: SerializedMember;
}

type SerializedMember = SerializedPaneMember | SerializedAxisMember;

interface SerializedPaneMember {
  type: 'pane';
  paneId: string;
  items: SerializedItem[];
  activeItemIndex: number;
}

interface SerializedAxisMember {
  type: 'axis';
  axis: 'horizontal' | 'vertical';
  flexes: number[];
  members: SerializedMember[];
}

interface SerializedItem {
  id: string;
  type: string;
  title: string;
  state: any;  // Estado específico do item
}

class PaneGroupSerializer {
  serialize(paneGroup: PaneGroup): SerializedPaneGroup {
    return {
      root: this.serializeMember(paneGroup.root)
    };
  }

  private serializeMember(member: Member): SerializedMember {
    if (member.type === 'pane') {
      return {
        type: 'pane',
        paneId: member.pane.id,
        items: member.pane.items.map(item => ({
          id: item.id,
          type: item.type,
          title: item.title,
          state: this.serializeItemState(item)
        })),
        activeItemIndex: member.pane.activeIndex
      };
    }

    if (member.type === 'axis') {
      return {
        type: 'axis',
        axis: member.axis,
        flexes: member.flexes,
        members: member.members.map(m => this.serializeMember(m))
      };
    }

    throw new Error('Unknown member type');
  }

  private serializeItemState(item: Item): any {
    // Serializa estado específico do tipo de item
    switch (item.type) {
      case 'terminal':
        return {
          workingDirectory: item.view.workingDirectory,
          scrollback: item.view.scrollback
        };

      case 'editor':
        return {
          filePath: item.view.filePath,
          cursorPosition: item.view.cursorPosition
        };

      default:
        return {};
    }
  }

  deserialize(data: SerializedPaneGroup): PaneGroup {
    const root = this.deserializeMember(data.root);
    return { root };
  }

  private deserializeMember(data: SerializedMember): Member {
    if (data.type === 'pane') {
      const pane = new Pane();
      pane.id = data.paneId;
      pane.items = data.items.map(itemData =>
        this.deserializeItem(itemData)
      );
      pane.activeIndex = data.activeItemIndex;

      return { type: 'pane', pane };
    }

    if (data.type === 'axis') {
      return {
        type: 'axis',
        axis: data.axis === 'horizontal' ? Axis.Horizontal : Axis.Vertical,
        flexes: data.flexes,
        members: data.members.map(m => this.deserializeMember(m)),
        boundingBoxes: new Array(data.members.length).fill(null)
      };
    }

    throw new Error('Unknown member type');
  }

  private deserializeItem(data: SerializedItem): Item {
    // Reconstrói item baseado no tipo
    switch (data.type) {
      case 'terminal':
        return {
          id: data.id,
          type: 'terminal',
          title: data.title,
          view: new TerminalView(data.state)
        };

      case 'editor':
        return {
          id: data.id,
          type: 'editor',
          title: data.title,
          view: new EditorView(data.state)
        };

      default:
        throw new Error(`Unknown item type: ${data.type}`);
    }
  }
}

// Uso
const serializer = new PaneGroupSerializer();

// Salvar
const serialized = serializer.serialize(paneGroup);
localStorage.setItem('terminal-layout', JSON.stringify(serialized));

// Restaurar
const saved = localStorage.getItem('terminal-layout');
if (saved) {
  const paneGroup = serializer.deserialize(JSON.parse(saved));
  // Usar paneGroup restaurado
}
```

---

## Exemplos de Código

### Exemplo Completo: Terminal Panel Manager

```typescript
class TerminalPanelManager {
  private paneGroup: PaneGroup;
  private activePaneId: string | null = null;
  private dragDropManager: DragDropManager;
  private serializer: PaneGroupSerializer;

  constructor() {
    // Inicializa com um pane vazio
    const initialPane = new Pane();
    this.paneGroup = new PaneGroup(initialPane);
    this.activePaneId = initialPane.id;

    this.dragDropManager = new DragDropManager(this.paneGroup);
    this.serializer = new PaneGroupSerializer();

    // Tenta restaurar estado salvo
    this.restoreState();
  }

  // Adiciona novo terminal
  addTerminal(options?: { split?: SplitDirection }): Terminal {
    const terminal = new Terminal();
    const item: Item = {
      id: generateId(),
      type: 'terminal',
      title: `Terminal ${this.getTerminalCount() + 1}`,
      view: terminal
    };

    if (options?.split && this.activePaneId) {
      // Cria novo pane com split
      const newPane = new Pane();
      newPane.addItem(item);
      this.paneGroup.split(this.activePaneId, newPane, options.split);
      this.activePaneId = newPane.id;
    } else {
      // Adiciona ao pane ativo
      const activePane = this.getActivePane();
      if (activePane) {
        activePane.addItem(item);
      }
    }

    this.saveState();
    return terminal;
  }

  // Fecha terminal
  closeTerminal(terminalId: string): void {
    const panes = this.paneGroup.getAllPanes();

    for (const pane of panes) {
      const item = pane.items.find(i => i.id === terminalId);
      if (item) {
        pane.removeItem(terminalId);

        // Se pane ficou vazio, remove ele
        if (pane.items.length === 0) {
          this.paneGroup.remove(pane.id);
        }

        break;
      }
    }

    this.saveState();
  }

  // Split do pane ativo
  split(direction: SplitDirection): Terminal {
    if (!this.activePaneId) {
      return this.addTerminal();
    }

    return this.addTerminal({ split: direction });
  }

  // Ativa um pane
  activatePane(paneId: string): void {
    this.activePaneId = paneId;
  }

  // Navega para próxima aba
  nextTab(): void {
    const pane = this.getActivePane();
    if (pane) {
      pane.activateNextItem();
    }
  }

  // Navega para aba anterior
  previousTab(): void {
    const pane = this.getActivePane();
    if (pane) {
      pane.activatePrevItem();
    }
  }

  // Helpers
  private getActivePane(): Pane | null {
    if (!this.activePaneId) return null;
    return this.paneGroup.getAllPanes()
      .find(p => p.id === this.activePaneId) || null;
  }

  private getTerminalCount(): number {
    return this.paneGroup.getAllPanes()
      .reduce((count, pane) => count + pane.items.length, 0);
  }

  private saveState(): void {
    const serialized = this.serializer.serialize(this.paneGroup);
    localStorage.setItem('terminal-panel-state', JSON.stringify(serialized));
  }

  private restoreState(): void {
    const saved = localStorage.getItem('terminal-panel-state');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.paneGroup = this.serializer.deserialize(data);

        // Restaura pane ativo (primeiro pane por padrão)
        const panes = this.paneGroup.getAllPanes();
        if (panes.length > 0) {
          this.activePaneId = panes[0].id;
        }
      } catch (error) {
        console.error('Failed to restore terminal state:', error);
      }
    }
  }
}
```

### Exemplo: Uso em React

```tsx
function TerminalPanelApp() {
  const [manager] = useState(() => new TerminalPanelManager());
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  // Força re-render quando estado muda
  useEffect(() => {
    const observer = () => forceUpdate();
    manager.subscribe(observer);
    return () => manager.unsubscribe(observer);
  }, [manager]);

  const handleNewTerminal = () => {
    manager.addTerminal();
  };

  const handleSplit = (direction: SplitDirection) => {
    manager.split(direction);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+T: novo terminal
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      handleNewTerminal();
    }

    // Ctrl+Shift+Arrow: split
    if (e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      switch (e.key) {
        case 'ArrowUp':
          handleSplit(SplitDirection.Up);
          break;
        case 'ArrowDown':
          handleSplit(SplitDirection.Down);
          break;
        case 'ArrowLeft':
          handleSplit(SplitDirection.Left);
          break;
        case 'ArrowRight':
          handleSplit(SplitDirection.Right);
          break;
      }
    }

    // Ctrl+Tab: próxima aba
    if (e.ctrlKey && e.key === 'Tab') {
      e.preventDefault();
      manager.nextTab();
    }

    // Ctrl+Shift+Tab: aba anterior
    if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
      e.preventDefault();
      manager.previousTab();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="terminal-panel">
      <div className="toolbar">
        <button onClick={handleNewTerminal}>New Terminal</button>
        <button onClick={() => handleSplit(SplitDirection.Right)}>
          Split Right
        </button>
        <button onClick={() => handleSplit(SplitDirection.Down)}>
          Split Down
        </button>
      </div>

      <div className="terminal-content">
        <PaneGroupComponent
          paneGroup={manager.paneGroup}
          containerBounds={{
            origin: { x: 0, y: 0 },
            size: { width: window.innerWidth, height: window.innerHeight - 50 }
          }}
          activePaneId={manager.activePaneId}
          onPaneClick={(paneId) => manager.activatePane(paneId)}
        />
      </div>
    </div>
  );
}
```

---

## Testes e Debugging

### Testes Unitários

```typescript
describe('PaneGroup', () => {
  it('should split pane correctly', () => {
    const pane1 = new Pane();
    const pane2 = new Pane();
    const group = new PaneGroup(pane1);

    const success = group.split(pane1.id, pane2, SplitDirection.Right);

    expect(success).toBe(true);
    expect(group.getAllPanes()).toHaveLength(2);
    expect(group.root.type).toBe('axis');
  });

  it('should remove pane and collapse axis', () => {
    const pane1 = new Pane();
    const pane2 = new Pane();
    const group = new PaneGroup(pane1);
    group.split(pane1.id, pane2, SplitDirection.Right);

    group.remove(pane2.id);

    expect(group.getAllPanes()).toHaveLength(1);
    expect(group.root.type).toBe('pane');
  });

  it('should find pane at position', () => {
    const pane1 = new Pane();
    const pane2 = new Pane();
    const group = new PaneGroup(pane1);
    group.split(pane1.id, pane2, SplitDirection.Right);

    // Mock bounding boxes
    (group.root as AxisMember).boundingBoxes = [
      { origin: { x: 0, y: 0 }, size: { width: 500, height: 500 } },
      { origin: { x: 500, y: 0 }, size: { width: 500, height: 500 } }
    ];

    const found = group.paneAtPosition({ x: 250, y: 250 });
    expect(found).toBe(pane1);

    const found2 = group.paneAtPosition({ x: 750, y: 250 });
    expect(found2).toBe(pane2);
  });
});
```

### Debugging Tips

1. **Visualizar Estrutura da Árvore**
```typescript
function debugPaneGroup(group: PaneGroup): void {
  console.log('PaneGroup Structure:');
  printMember(group.root, 0);
}

function printMember(member: Member, depth: number): void {
  const indent = '  '.repeat(depth);

  if (member.type === 'pane') {
    console.log(`${indent}Pane(${member.pane.id}):`);
    member.pane.items.forEach((item, i) => {
      const active = i === member.pane.activeIndex ? ' [ACTIVE]' : '';
      console.log(`${indent}  - ${item.title}${active}`);
    });
  } else {
    console.log(`${indent}Axis(${member.axis}):`);
    console.log(`${indent}  flexes: [${member.flexes.join(', ')}]`);
    member.members.forEach(child => printMember(child, depth + 1));
  }
}
```

2. **Validar Flexes**
```typescript
function validateFlexes(member: Member): boolean {
  if (member.type === 'axis') {
    const sum = member.flexes.reduce((a, b) => a + b, 0);
    const expected = member.flexes.length;

    if (Math.abs(sum - expected) > 0.001) {
      console.error(`Invalid flexes: sum=${sum}, expected=${expected}`);
      return false;
    }

    return member.members.every(child => validateFlexes(child));
  }

  return true;
}
```

3. **Visualizar Bounding Boxes**
```tsx
function DebugOverlay({ paneGroup }: { paneGroup: PaneGroup }) {
  const boxes: Array<{ bounds: BoundingBox; label: string }> = [];

  function collect(member: Member, path: string = 'root'): void {
    if (member.type === 'pane') {
      // Boxes são coletados do member pai (axis)
    } else {
      member.boundingBoxes.forEach((box, i) => {
        if (box) {
          boxes.push({
            bounds: box,
            label: `${path}[${i}]`
          });
        }
      });
      member.members.forEach((child, i) =>
        collect(child, `${path}[${i}]`)
      );
    }
  }

  collect(paneGroup.root);

  return (
    <div className="debug-overlay" style={{ pointerEvents: 'none' }}>
      {boxes.map((box, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: box.bounds.origin.x,
            top: box.bounds.origin.y,
            width: box.bounds.size.width,
            height: box.bounds.size.height,
            border: '2px dashed red',
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: 'red'
          }}
        >
          {box.label}
        </div>
      ))}
    </div>
  );
}
```

---

## Próximos Passos

1. **Melhorias de Performance**
   - Virtualização de terminais não visíveis
   - Memoização de cálculos de layout
   - Throttle de eventos de resize

2. **Features Adicionais**
   - Zoom de terminal individual
   - Personalização de atalhos de teclado
   - Temas e cores customizáveis
   - Histórico de comandos persistente

3. **Integração**
   - WebSocket para terminais remotos
   - Sincronização multi-dispositivo
   - Colaboração em tempo real

---

**Conclusão**: Este guia fornece uma base sólida para implementar o sistema de terminais do Zed. Adapte os conceitos para seu framework específico e expanda conforme necessário.
