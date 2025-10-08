# Arquitetura do Sistema de Terminais do Zed

## 📐 Visão Geral Arquitetural

O sistema de terminais do Zed é construído sobre uma arquitetura hierárquica e recursiva que permite flexibilidade máxima no layout de terminais, splits e abas. Esta arquitetura é baseada em três conceitos principais:

1. **PaneGroup**: Sistema de splits recursivo baseado em árvore
2. **Pane**: Contêiner de abas individuais
3. **Dock**: Sistema de painéis laterais fixos

---

## 🌳 Estrutura em Árvore do PaneGroup

### Conceito Fundamental

O PaneGroup usa uma estrutura em árvore onde cada nó pode ser:

```
Member (tipo enum)
├── Pane (folha): Contêiner de abas de terminais
└── Axis (nó interno): Split horizontal ou vertical
    └── members: Array de Members (recursivo)
```

### Diagrama da Estrutura

```
PaneGroup
│
└── root: Member
    │
    ├── [Se type = 'pane']
    │   └── Pane
    │       ├── items: [Terminal1, Terminal2, ...]
    │       └── activeItemIndex: number
    │
    └── [Se type = 'axis']
        ├── axis: 'horizontal' | 'vertical'
        ├── members: [Member1, Member2, ...]
        ├── flexes: [1.2, 0.8, 1.0, ...]
        └── boundingBoxes: [Box1, Box2, ...]
```

### Exemplo Prático

Considere este layout de terminais:

```
┌─────────────────────────────────┐
│  Terminal 1  │  Terminal 2      │
│             │                  │
│             ├──────────────────┤
│             │  Terminal 3      │
└─────────────────────────────────┘
```

Estrutura em árvore correspondente:

```
root: Axis(Horizontal)
├── flexes: [1.0, 2.0]
├── members:
│   ├── [0] Pane
│   │   └── items: [Terminal1]
│   │
│   └── [1] Axis(Vertical)
│       ├── flexes: [1.0, 1.0]
│       └── members:
│           ├── [0] Pane
│           │   └── items: [Terminal2]
│           └── [1] Pane
│               └── items: [Terminal3]
```

---

## 🔄 Operações no PaneGroup

### 1. Split

Divide um pane em dois, criando ou expandindo a árvore.

**Algoritmo:**

```
function split(targetPaneId, newPane, direction):
  1. Encontra o pane alvo na árvore (busca recursiva)
  2. Determina o eixo do split baseado na direção:
     - Up/Down → Vertical
     - Left/Right → Horizontal
  3. Se o pane é folha (não tem pai axis):
     - Cria novo Axis com dois membros
     - Substitui o pane pelo novo Axis
  4. Se o pane já está em um Axis:
     - Se eixo é igual: insere novo membro no array
     - Se eixo é diferente: cria novo Axis aninhado
  5. Atualiza flexes (inicializa com 1.0 para cada membro)
```

**Exemplo de Código (Rust do Zed):**

```rust
pub fn split(
    &mut self,
    old_pane: &Entity<Pane>,
    new_pane: &Entity<Pane>,
    direction: SplitDirection,
) -> Result<()> {
    match &mut self.root {
        Member::Pane(pane) => {
            if pane == old_pane {
                // Transforma pane único em axis
                self.root = Member::new_axis(
                    old_pane.clone(),
                    new_pane.clone(),
                    direction
                );
                Ok(())
            } else {
                anyhow::bail!("Pane not found");
            }
        }
        Member::Axis(axis) => axis.split(old_pane, new_pane, direction),
    }
}
```

### 2. Remove

Remove um pane e reorganiza a árvore, colapsando axes com apenas um membro.

**Algoritmo:**

```
function remove(paneId):
  1. Encontra o pane na árvore
  2. Remove o pane do array de members do pai
  3. Remove flex e bounding box correspondentes
  4. Se o pai Axis ficou com apenas 1 membro:
     - Colapsa o Axis: substitui o pai pelo único membro restante
  5. Propaga colapso para cima na árvore se necessário
```

**Casos Especiais:**
- Não pode remover o root se for o único pane
- Colapso em cascata: múltiplos níveis podem colapsar

### 3. Resize

Ajusta proporções de tamanho entre panes adjacentes.

**Algoritmo Detalhado:**

```
function resize(paneId, axis, deltaPixels):
  1. Encontra o pane e seu Axis pai
  2. Verifica se o eixo corresponde (só pode resize no eixo do pai)
  3. Calcula conversão pixel → flex:
     flexChange = (deltaPixels × totalFlex) / containerSize
  4. Aplica mudança aos dois panes adjacentes:
     flex[i] += flexChange
     flex[i+1] -= flexChange
  5. Aplica restrições de tamanho mínimo:
     - Horizontal: 80px
     - Vertical: 100px
  6. Normaliza flexes se necessário:
     - Garante sum(flexes) = flexes.length
```

**Fórmulas Importantes:**

```
size(i) = containerSize × (flexes[i] / totalFlex)

onde:
  totalFlex = flexes.length
  containerSize = tamanho total disponível
```

**Exemplo:**

```
Container: 1000px
Flexes: [1.2, 0.8, 1.0]
Total: 3.0

Tamanhos:
  Pane 0: 1000 × (1.2 / 3.0) = 400px
  Pane 1: 1000 × (0.8 / 3.0) = 267px
  Pane 2: 1000 × (1.0 / 3.0) = 333px
```

### 4. Swap

Troca posições de dois panes na árvore.

**Algoritmo:**

```
function swap(paneA, paneB):
  1. Encontra referências a ambos os panes na árvore
  2. Troca os membros nos respectivos pais
  3. Mantém flexes e bounding boxes nas posições originais
```

---

## 📦 Sistema de Pane (Abas)

### Estrutura Interna

```rust
pub struct Pane {
    items: Vec<Box<dyn ItemHandle>>,  // Lista de abas
    active_item_index: usize,         // Índice da aba ativa
    focus_handle: FocusHandle,        // Controle de foco
    // ... outros campos
}
```

### Gerenciamento de Items

**Adicionar Item:**
```rust
pub fn add_item(&mut self, item: Box<dyn ItemHandle>, cx: &mut Context<Self>) {
    self.items.push(item);
    self.active_item_index = self.items.len() - 1;
    cx.notify();
}
```

**Ativar Item:**
```rust
pub fn activate_item(&mut self, index: usize, cx: &mut Context<Self>) {
    if index < self.items.len() {
        self.active_item_index = index;
        cx.notify();
        cx.emit(PaneEvent::ActivateItem { index });
    }
}
```

**Fechar Item:**
```rust
pub fn close_item(&mut self, index: usize, cx: &mut Context<Self>) -> Option<Box<dyn ItemHandle>> {
    if index >= self.items.len() {
        return None;
    }

    let item = self.items.remove(index);

    // Ajusta índice ativo
    if self.active_item_index >= self.items.len() {
        self.active_item_index = self.items.len().saturating_sub(1);
    }

    cx.notify();
    Some(item)
}
```

### Sistema de Eventos

O Pane emite eventos para comunicar mudanças:

```rust
pub enum PaneEvent {
    AddItem { item_id: EntityId },
    ActivateItem { index: usize },
    RemoveItem { index: usize },
    Focus,
    // ...
}
```

---

## 🎨 Sistema de Renderização

### Cálculo de Layout

O layout é calculado recursivamente baseado nos flexes:

```rust
fn layout_axis(
    bounds: Bounds<Pixels>,
    axis: Axis,
    flexes: &[f32],
    members: &[Member]
) -> Vec<Bounds<Pixels>> {
    let total_flex: f32 = flexes.len() as f32;
    let space_per_flex = bounds.size.along(axis) / total_flex;

    let mut origin = bounds.origin;
    let mut child_bounds = Vec::new();

    for &flex in flexes {
        let size = space_per_flex * flex;

        let child = Bounds {
            origin,
            size: match axis {
                Axis::Horizontal => Size::new(size, bounds.size.height),
                Axis::Vertical => Size::new(bounds.size.width, size),
            },
        };

        child_bounds.push(child);
        origin = origin.apply_along(axis, |val| val + size);
    }

    child_bounds
}
```

### Pipeline de Renderização

```
1. Request Layout
   ├─> Calcula espaço necessário (flexbox)
   └─> Retorna LayoutId

2. Prepaint
   ├─> Calcula bounds finais de cada membro
   ├─> Cria hitboxes para resize handles
   ├─> Prepara elementos filhos
   └─> Retorna estado de prepaint

3. Paint
   ├─> Renderiza panes
   ├─> Renderiza dividers entre panes
   ├─> Renderiza overlays (foco, drag, etc)
   └─> Registra event handlers
```

### Resize Handles

Os handles de resize são renderizados entre panes adjacentes:

```rust
const HANDLE_HITBOX_SIZE: f32 = 4.0;
const DIVIDER_SIZE: f32 = 1.0;

fn layout_handle(
    axis: Axis,
    pane_bounds: Bounds<Pixels>
) -> (Hitbox, Bounds<Pixels>) {
    // Hitbox: área clicável (4px)
    let handle_bounds = Bounds {
        origin: pane_bounds.origin.apply_along(axis, |origin| {
            origin + pane_bounds.size.along(axis) - px(HANDLE_HITBOX_SIZE / 2.)
        }),
        size: pane_bounds.size.apply_along(axis, |_| px(HANDLE_HITBOX_SIZE)),
    };

    // Divider: linha visual (1px)
    let divider_bounds = Bounds {
        origin: pane_bounds.origin.apply_along(axis, |origin| {
            origin + pane_bounds.size.along(axis)
        }),
        size: pane_bounds.size.apply_along(axis, |_| px(DIVIDER_SIZE)),
    };

    (window.insert_hitbox(handle_bounds), divider_bounds)
}
```

---

## 🎯 Sistema de Hit Testing

### Encontrar Pane em Coordenada

Usado para drag & drop e cliques:

```rust
pub fn pane_at_pixel_position(&self, coordinate: Point<Pixels>) -> Option<&Entity<Pane>> {
    match &self.root {
        Member::Pane(pane) => Some(pane),
        Member::Axis(axis) => axis.pane_at_pixel_position(coordinate),
    }
}

// Na implementação de PaneAxis:
fn pane_at_pixel_position(&self, coordinate: Point<Pixels>) -> Option<&Entity<Pane>> {
    for (idx, member) in self.members.iter().enumerate() {
        if let Some(box) = self.bounding_boxes[idx] {
            if box.contains(&coordinate) {
                return match member {
                    Member::Pane(pane) => Some(pane),
                    Member::Axis(axis) => axis.pane_at_pixel_position(coordinate),
                };
            }
        }
    }
    None
}
```

### Encontrar Pane Adjacente

Para navegação por teclado (Ctrl+H/J/K/L):

```rust
pub fn find_pane_in_direction(
    &mut self,
    active_pane: &Entity<Pane>,
    direction: SplitDirection,
    cx: &App,
) -> Option<&Entity<Pane>> {
    let bounding_box = self.bounding_box_for_pane(active_pane)?;
    let center = bounding_box.center();

    let target = match direction {
        SplitDirection::Left => Point::new(
            bounding_box.left() - DISTANCE_TO_NEXT,
            center.y
        ),
        SplitDirection::Right => Point::new(
            bounding_box.right() + DISTANCE_TO_NEXT,
            center.y
        ),
        SplitDirection::Up => Point::new(
            center.x,
            bounding_box.top() - DISTANCE_TO_NEXT
        ),
        SplitDirection::Down => Point::new(
            center.x,
            bounding_box.bottom() + DISTANCE_TO_NEXT
        ),
    };

    self.pane_at_pixel_position(target)
}
```

---

## 🔒 Sistema de Dock

### Estrutura

```rust
pub struct Dock {
    position: DockPosition,          // Left, Right, Bottom
    panel_entries: Vec<PanelEntry>,  // Lista de painéis
    active_panel_index: Option<usize>,
    is_open: bool,
    workspace: WeakEntity<Workspace>,
}
```

### Posições de Dock

```
Workspace Layout:

┌──────────────────────────────────┐
│          Toolbar                 │
├──────┬──────────────────┬────────┤
│      │                  │        │
│ Left │   Center Pane    │ Right  │
│ Dock │   Group          │ Dock   │
│      │                  │        │
├──────┴──────────────────┴────────┤
│       Bottom Dock                │
└──────────────────────────────────┘
```

### Gerenciamento de Painéis

```rust
impl Dock {
    pub fn add_panel<T: Panel>(
        &mut self,
        panel: Entity<T>,
        cx: &mut Context<Self>,
    ) -> usize {
        let subscriptions = [
            cx.observe(&panel, |_, _, cx| cx.notify()),
            cx.subscribe(&panel, |this, panel, event, cx| {
                match event {
                    PanelEvent::Activate => this.activate_panel(panel),
                    PanelEvent::Close => this.close_panel(panel),
                    // ...
                }
            }),
        ];

        self.panel_entries.push(PanelEntry {
            panel: Arc::new(panel),
            subscriptions,
        });

        self.panel_entries.len() - 1
    }

    pub fn activate_panel(&mut self, index: usize, cx: &mut Context<Self>) {
        self.active_panel_index = Some(index);
        self.is_open = true;

        if let Some(entry) = self.panel_entries.get(index) {
            entry.panel.set_active(true, cx);
        }

        cx.notify();
    }
}
```

---

## 💾 Sistema de Persistência

### Serialização

O estado completo do PaneGroup é serializável:

```rust
#[derive(Serialize, Deserialize)]
pub struct SerializedPaneGroup {
    root: SerializedMember,
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SerializedMember {
    #[serde(rename = "pane")]
    Pane {
        items: Vec<SerializedItem>,
        active: usize,
    },
    #[serde(rename = "axis")]
    Axis {
        axis: SerializedAxis,
        flexes: Vec<f32>,
        members: Vec<SerializedMember>,
    },
}
```

### Salvar Estado

```rust
pub fn serialize(&self) -> SerializedPaneGroup {
    SerializedPaneGroup {
        root: self.serialize_member(&self.root)
    }
}

fn serialize_member(&self, member: &Member) -> SerializedMember {
    match member {
        Member::Pane(pane) => {
            let pane = pane.read(cx);
            SerializedMember::Pane {
                items: pane.items.iter()
                    .map(|item| item.serialize())
                    .collect(),
                active: pane.active_item_index,
            }
        }
        Member::Axis(axis) => {
            SerializedMember::Axis {
                axis: axis.axis.into(),
                flexes: axis.flexes.clone(),
                members: axis.members.iter()
                    .map(|m| self.serialize_member(m))
                    .collect(),
            }
        }
    }
}
```

### Restaurar Estado

```rust
pub fn deserialize(data: SerializedPaneGroup, cx: &mut App) -> Self {
    let root = Self::deserialize_member(data.root, cx);
    PaneGroup { root }
}

fn deserialize_member(data: SerializedMember, cx: &mut App) -> Member {
    match data {
        SerializedMember::Pane { items, active } => {
            let pane = cx.new(|cx| {
                let mut pane = Pane::new();
                for item_data in items {
                    let item = deserialize_item(item_data, cx);
                    pane.add_item(item, cx);
                }
                pane.active_item_index = active;
                pane
            });
            Member::Pane(pane)
        }
        SerializedMember::Axis { axis, flexes, members } => {
            Member::Axis(PaneAxis {
                axis: axis.into(),
                flexes,
                members: members.into_iter()
                    .map(|m| Self::deserialize_member(m, cx))
                    .collect(),
                bounding_boxes: vec![None; members.len()],
            })
        }
    }
}
```

---

## 🔐 Gerenciamento de Memória

### Weak References

Para evitar ciclos de referência, o sistema usa weak references:

```rust
pub struct Workspace {
    center: PaneGroup,              // Strong reference
    active_pane: Entity<Pane>,      // Strong reference
    // ...
}

pub struct Pane {
    workspace: WeakEntity<Workspace>,  // Weak reference!
    // ...
}
```

### Lifetime de Entities

```
Entity<T>  → Strong reference (contagem de referência)
WeakEntity<T> → Weak reference (não previne drop)

Regras:
1. Parent → Child: Strong
2. Child → Parent: Weak
3. Siblings: Strong se necessário, Weak preferível
```

---

## 🎭 Sistema de Eventos

### Event Flow

```
Mouse Event (ex: click em aba)
│
├─> Captura em hitbox
├─> Bubble phase: parent → child
├─> Capture phase: child → parent
│
└─> Handler registrado executa
    ├─> Pode prevenir propagação: cx.stop_propagation()
    └─> Pode causar side effects: cx.notify(), cx.emit()
```

### Subscriptions

```rust
// Observer: notificado quando entity muda
cx.observe(&entity, |this, entity, cx| {
    // entity mudou, atualiza estado
});

// Subscriber: recebe eventos específicos
cx.subscribe(&entity, |this, entity, event: &SomeEvent, cx| {
    match event {
        SomeEvent::Something => { /* handle */ }
    }
});

// Focus in: quando entity ou children recebem foco
cx.on_focus_in(&focus_handle, |this, cx| {
    // foco entrou na árvore
});
```

---

## 📊 Complexidade Algorítmica

### Operações Principais

| Operação | Complexidade | Nota |
|----------|--------------|------|
| Split | O(depth) | Busca na árvore até encontrar pane |
| Remove | O(depth) | Busca + possível colapso |
| Find at position | O(n) | Pior caso: visita todos nós |
| Resize | O(1) | Apenas ajusta flexes locais |
| Serialize | O(n) | Visita todos nós uma vez |
| Layout calculation | O(n) | Calcula bounds de todos nós |

Onde:
- `depth` = profundidade da árvore (tipicamente < 5)
- `n` = número total de panes/axes

### Otimizações

1. **Caching de Bounding Boxes**: Evita recalcular em cada frame
2. **Early Return**: Para em hit testing assim que encontra pane
3. **Arc/Mutex para Flexes**: Compartilhamento eficiente sem clonagem

---

## 🧩 Padrões de Design Utilizados

### 1. Composite Pattern
- Estrutura em árvore com Member (Pane ou Axis)
- Operações recursivas aplicadas uniformemente

### 2. Observer Pattern
- Sistema de subscriptions e notificações
- Desacoplamento entre componentes

### 3. Command Pattern
- Actions encapsulam operações (split, close, etc)
- Permite undo/redo (não implementado mas estrutura permite)

### 4. Strategy Pattern
- Diferentes modos de rendering (terminal, editor)
- ItemHandle trait permite extensibilidade

---

## 🔧 Extensibilidade

### Adicionar Novo Tipo de Item

```rust
pub trait ItemHandle {
    fn id(&self) -> EntityId;
    fn title(&self, cx: &App) -> String;
    fn render(&self, cx: &mut Context<Self>) -> impl IntoElement;
    fn serialize(&self) -> SerializedItem;
}

// Implementação para novo tipo
impl ItemHandle for CustomView {
    fn id(&self) -> EntityId { self.entity_id }
    fn title(&self, _: &App) -> String { "Custom".into() }
    fn render(&self, cx: &mut Context<Self>) -> impl IntoElement {
        div().child("Custom content")
    }
    fn serialize(&self) -> SerializedItem { /* ... */ }
}
```

### Adicionar Nova Posição de Dock

```rust
pub enum DockPosition {
    Left,
    Right,
    Bottom,
    Top,  // Nova posição!
}

// Workspace precisa adicionar:
pub struct Workspace {
    // ...
    top_dock: Entity<Dock>,  // Novo campo
}
```

---

## 📝 Conclusão

A arquitetura do sistema de terminais do Zed demonstra:

- **Flexibilidade**: Estrutura recursiva suporta layouts arbitrários
- **Eficiência**: Operações O(depth) ou O(1) na maioria dos casos
- **Manutenibilidade**: Separação clara de responsabilidades
- **Extensibilidade**: Fácil adicionar novos tipos de itens/painéis
- **Persistência**: Estado completamente serializável

Esta arquitetura pode ser adaptada para diversos frameworks mantendo os conceitos fundamentais de árvore recursiva, sistema de flexes, e gerenciamento de eventos.
