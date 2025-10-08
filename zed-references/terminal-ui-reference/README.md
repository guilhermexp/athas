# Zed Terminal UI/UX Reference

## 📋 Visão Geral

Esta pasta contém todos os arquivos e documentação necessários para replicar o sistema de gerenciamento de terminais do Zed, incluindo:

- ✅ **Sistema de Panes**: Gerenciamento de splits horizontais/verticais recursivos
- ✅ **Sistema de Abas**: Múltiplas abas dentro de cada pane
- ✅ **Sistema de Dock**: Painéis fixos nas laterais e parte inferior
- ✅ **Drag & Drop**: Arrastar terminais entre panes e criar novos splits
- ✅ **Redimensionamento**: Redimensionamento interativo de panes com mouse
- ✅ **Persistência**: Salvar e restaurar layout de terminais

## 🏗️ Arquitetura Geral

O sistema de terminais do Zed é construído sobre uma arquitetura hierárquica de componentes:

```
Workspace (janela principal)
│
├── Dock (Left/Right/Bottom)
│   └── Panel (pode conter TerminalPanel)
│       └── PaneGroup (gerenciamento de splits)
│           ├── Member::Pane (contêiner de abas)
│           │   └── Tabs [TerminalView, TerminalView, ...]
│           └── Member::Axis (split recursivo)
│               ├── Member::Pane
│               └── Member::Pane
│
└── Center Pane Group (área principal de edição)
```

## 📁 Estrutura de Arquivos

```
terminal-ui-reference/
├── README.md                          # Este arquivo
├── docs/
│   ├── ARCHITECTURE.md               # Arquitetura detalhada
│   ├── IMPLEMENTATION_GUIDE.md       # Guia passo a passo
│   └── API_REFERENCE.md              # Referência das APIs principais
├── core-files/
│   ├── terminal/
│   │   ├── terminal_panel.rs        # Painel principal com PaneGroup
│   │   ├── terminal_view.rs         # View individual do terminal
│   │   └── terminal_element.rs      # Elemento de renderização GPUI
│   ├── pane-system/
│   │   ├── pane.rs                  # Gerenciamento de abas
│   │   └── pane_group.rs            # Sistema de splits recursivo
│   ├── dock-system/
│   │   └── dock.rs                  # Sistema de docks laterais
│   └── panel/
│       └── panel.rs                 # Trait base para painéis
└── examples/
    ├── basic-terminal.md            # Exemplo básico
    ├── splits-and-tabs.md           # Exemplo com splits e abas
    └── full-implementation.md       # Implementação completa
```

## 🎯 Componentes Principais

### 1. **PaneGroup** (`pane_group.rs`)
Sistema recursivo de gerenciamento de splits:
- Suporta splits horizontais e verticais
- Estrutura em árvore: `Member::Pane` (folha) ou `Member::Axis` (split)
- Redimensionamento dinâmico com flexbox
- Serialização do estado para persistência

**Funcionalidades chave:**
- `split()`: Divide um pane em dois
- `resize()`: Redimensiona panes interativamente
- `swap()`: Troca posições de dois panes
- `remove()`: Remove um pane e reorganiza o layout

### 2. **Pane** (`pane.rs`)
Contêiner de abas individuais:
- Gerencia múltiplas abas (tabs)
- Controle de aba ativa
- Navegação entre abas (próxima/anterior)
- Fechamento de abas

**Funcionalidades chave:**
- Sistema de items (cada aba é um item)
- Controle de foco
- Serialização de estado
- Eventos de alteração de abas

### 3. **TerminalPanel** (`terminal_panel.rs`)
Painel específico para terminais:
- Usa PaneGroup internamente
- Gerencia criação de novos terminais
- Controla o estado de zoom
- Serializa/deserializa layout completo

**Funcionalidades chave:**
- `add_terminal()`: Adiciona novo terminal
- `split()`: Cria split com novo terminal
- `activate_terminal()`: Muda foco para terminal específico
- Suporte a zoom de terminal individual

### 4. **TerminalView** (`terminal_view.rs`)
View individual de um terminal:
- Estado do terminal (buffer, cursor, etc)
- Interação com teclado/mouse
- Renderização via TerminalElement
- Conexão com processo PTY

### 5. **Dock** (`dock.rs`)
Sistema de painéis laterais/inferiores:
- Posições fixas: Left, Right, Bottom
- Gerencia múltiplos panels
- Controle de visibilidade
- Redimensionamento do dock

## 🔑 Conceitos-Chave

### Split Recursivo
O sistema usa uma estrutura em árvore onde cada nó pode ser:
- **Pane**: Folha da árvore, contém abas
- **Axis**: Nó intermediário, contém split horizontal ou vertical

```rust
pub enum Member {
    Axis(PaneAxis),  // Split com múltiplos membros
    Pane(Entity<Pane>), // Pane individual com abas
}
```

### Sistema de Flexbox
Cada split usa valores flex para controlar proporções:
- Flexes são armazenados como `Vec<f32>` onde soma total = número de membros
- Redimensionamento ajusta valores flex proporcionalmente
- Serialização mantém proporções entre sessões

### Drag & Drop
Ao arrastar um terminal:
1. Sistema detecta posição do mouse
2. Calcula pane de destino baseado em coordenadas
3. Pode criar novo split ou adicionar como nova aba
4. Atualiza estrutura do PaneGroup

## 🚀 Como Usar

### 1. Leia a Documentação
Comece com os documentos em ordem:
1. `docs/ARCHITECTURE.md` - Entenda a arquitetura completa
2. `docs/IMPLEMENTATION_GUIDE.md` - Siga o guia passo a passo
3. `docs/API_REFERENCE.md` - Consulte APIs específicas

### 2. Estude os Arquivos Core
Os arquivos em `core-files/` são a implementação real do Zed:
- Código em Rust com GPUI (framework UI do Zed)
- Comentários explicativos sobre lógica complexa
- Padrões de design utilizados

### 3. Adapte para Seu Framework
O guia de implementação fornece:
- Conceitos framework-agnostic
- Exemplos em React, Vue e Vanilla JS
- Estruturas de dados necessárias
- Algoritmos de split e resize

### 4. Consulte os Exemplos
Em `examples/` você encontra:
- Implementações simplificadas
- Casos de uso comuns
- Código comentado passo a passo

## 🎨 Features Visuais

### Redimensionamento de Panes
- Handle visual entre panes (4-6px de largura)
- Cursor muda para resize quando hover no handle
- Duplo clique reseta proporções para igual
- Tamanho mínimo por pane (80px horizontal, 100px vertical)

### Estado Visual de Panes
- Border destacada no pane ativo
- Opacidade reduzida em panes inativos (opcional)
- Indicadores de seguimento colaborativo (para features de collab)

### Sistema de Abas
- Barra de abas no topo de cada pane
- Aba ativa destacada visualmente
- Botão de fechar em cada aba
- Botão "+" para novo terminal

## 🔧 Tecnologias Usadas no Zed

- **Rust**: Linguagem principal
- **GPUI**: Framework UI customizado do Zed
- **Alacritty**: Backend do emulador de terminal
- **Serde**: Serialização de estado

## 📝 Notas de Implementação

### Considerações Importantes

1. **Performance**: PaneGroup usa Arc e Mutex para compartilhamento eficiente de estado
2. **Serialização**: Todo estado é serializável para persistência entre sessões
3. **Event System**: Usa sistema de observers/subscriptions do GPUI
4. **Focus Management**: Controle explícito de foco entre panes/abas
5. **Memory Safety**: Usa WeakEntity para evitar ciclos de referência

### Desafios Comuns

- **Cálculo de Layout**: Sistema flexbox customizado com valores flex
- **Hit Testing**: Detectar qual pane está em determinada coordenada de mouse
- **State Synchronization**: Manter estado consistente entre múltiplos observers
- **Resize Logic**: Algoritmo complexo de redistribuição de tamanho

## 📚 Recursos Adicionais

- [Zed Repository](https://github.com/zed-industries/zed)
- [GPUI Documentation](https://www.gpui.rs/)
- [Alacritty](https://github.com/alacritty/alacritty)

## 💡 Próximos Passos

1. Leia `docs/ARCHITECTURE.md` para entender a estrutura completa
2. Siga `docs/IMPLEMENTATION_GUIDE.md` para implementar no seu projeto
3. Consulte os exemplos em `examples/` para casos específicos
4. Adapte os conceitos para seu framework/linguagem

## 🤝 Contribuindo

Se você implementar isso em outro framework e quiser compartilhar:
- Adicione exemplos em `examples/`
- Documente diferenças e adaptações necessárias
- Compartilhe desafios e soluções encontradas

---

**Autor**: Referência extraída do Zed Editor
**Versão**: 1.0.0
**Última Atualização**: 2025
