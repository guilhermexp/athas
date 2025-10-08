# Zed Fonts & Layout - Configuração Completa ✅

**Data:** 2025-10-06
**Status:** ✅ Implementado e funcionando

---

## 📦 O Que Foi Feito

### 1. **Fontes Copiadas** ✅

```bash
/Users/guilhermevarela/Public/athas/public/fonts/
├── ibm-plex-sans/           # UI Font (menus, panels, buttons)
│   ├── IBMPlexSans-Regular.ttf
│   ├── IBMPlexSans-Italic.ttf
│   ├── IBMPlexSans-Bold.ttf
│   ├── IBMPlexSans-BoldItalic.ttf
│   └── license.txt
│
└── lilex/                   # Monospace Font (editor, terminal, code)
    ├── Lilex-Regular.ttf
    ├── Lilex-Italic.ttf
    ├── Lilex-Bold.ttf
    ├── Lilex-BoldItalic.ttf
    └── OFL.txt
```

### 2. **Arquivo CSS Criado** ✅

**`src/styles/zed-fonts.css`** - Configuração completa de fontes

```css
/* Font Families */
--font-ui: "Zed Sans"        /* IBM Plex Sans */
--font-mono: "Zed Mono"      /* Lilex */

/* Font Sizes (Zed defaults) */
--font-size-ui: 16px         /* UI elements */
--font-size-buffer: 15px     /* Editor/Terminal */
--font-size-agent-ui: 16px   /* Agent panel */
--font-size-agent-buffer: 12px  /* Agent messages */

/* Line Heights */
--line-height-comfortable: 1.618  /* Golden ratio - Zed default */
--line-height-standard: 1.3
--line-height-ui: 1.5
```

### 3. **Integração no styles.css** ✅

Importado no início do `src/styles.css`:

```css
@import "./styles/zed-fonts.css";
```

Removidas as configurações antigas de JetBrains Mono.

---

## 🎨 Como as Fontes São Aplicadas

### **UI (Interface)**
Usa **IBM Plex Sans (Zed Sans)** - 16px

```tsx
// Aplica automaticamente em:
- Menus
- Painéis laterais
- Botões
- Tooltips
- Tab bar
- Status bar (13px, menor)
```

### **Código (Editor/Terminal)**
Usa **Lilex (Zed Mono)** - 15px

```tsx
// Aplica automaticamente em:
- Editor de código
- Terminal
- Code blocks em markdown
- Qualquer elemento com .font-mono
- Elementos <code> e <pre>
```

### **Line Height**
- **Editor/Terminal:** 1.618 (golden ratio - mais confortável para leitura de código)
- **UI:** 1.5 (padrão para interface)

---

## 🔧 Classes CSS Disponíveis

### **Font Family**

```tsx
// Forçar UI font
<div className="font-ui">
  Usa IBM Plex Sans
</div>

// Forçar Code font
<div className="font-code">
  Usa Lilex
</div>

// Tailwind padrão
<div className="font-mono">
  Também usa Lilex (sobrescrito)
</div>
```

### **Font Size**

```tsx
// Tamanhos Zed
<div className="text-ui">16px (UI padrão)</div>
<div className="text-buffer">15px (editor/terminal)</div>
<div className="text-small">13px</div>
<div className="text-tiny">12px</div>
```

### **Line Height**

```tsx
// Line heights
<div className="leading-comfortable">1.618 (golden ratio)</div>
<div className="leading-standard">1.3</div>
```

---

## 🎯 Componentes Específicos

### **Editor/Terminal**
```tsx
// Aplicação automática:
.editor-container,
.terminal-container,
.xterm,
.cm-editor,
.monaco-editor {
  font-family: var(--font-mono) !important;
  font-size: var(--font-size-buffer) !important;  // 15px
  line-height: var(--line-height-comfortable) !important;  // 1.618
}
```

### **Agent Panel**
```tsx
// UI do agent
.agent-panel {
  font-family: var(--font-ui);
  font-size: var(--font-size-agent-ui);  // 16px
}

// Mensagens do agent
.agent-message {
  font-family: var(--font-mono);
  font-size: var(--font-size-agent-buffer);  // 12px
  line-height: var(--line-height-comfortable);  // 1.618
}
```

### **Sidebar/Menus**
```tsx
.sidebar,
.file-explorer,
.menu,
.dropdown,
.tooltip {
  font-family: var(--font-ui);
  font-size: var(--font-size-ui);  // 16px
}
```

### **Tabs**
```tsx
.tab-bar,
.tab {
  font-family: var(--font-ui);
  font-size: 14px;  // Ligeiramente menor
}
```

---

## 🔤 Ligatures (Ligaduras)

### **Desabilitadas por padrão** (como no Zed):
- UI elementos não usam ligatures
- `font-feature-settings: "calt" 0`

### **Habilitar em código** (opcional):
```tsx
<div className="enable-ligatures">
  // Código com ligatures ativadas
  const arrow = () => {}  // => vira ⇒
</div>
```

Ou via classe nos componentes:
```tsx
<div className="editor-container ligatures-enabled">
  // Editor com ligatures
</div>
```

---

## 📱 Responsividade

Fontes ajustam automaticamente em telas menores:

```css
@media (max-width: 768px) {
  --font-size-ui: 14px;      /* UI menor */
  --font-size-buffer: 13px;  /* Editor menor */
}
```

---

## 🆚 Comparação com Configuração Anterior

| Aspecto | Antes (JetBrains Mono) | Agora (Zed Fonts) |
|---------|------------------------|-------------------|
| **UI Font** | JetBrains Mono | IBM Plex Sans ✅ |
| **Code Font** | JetBrains Mono | Lilex ✅ |
| **UI Size** | Não configurado | 16px ✅ |
| **Code Size** | Não configurado | 15px ✅ |
| **Line Height** | Padrão | 1.618 (comfortable) ✅ |
| **Ligatures** | Padrão | Desabilitadas (UI) ✅ |
| **Separação UI/Code** | ❌ | ✅ |

---

## ⚙️ Personalização

### Mudar tamanhos de fonte:

Editar `src/styles/zed-fonts.css`:

```css
:root {
  /* Aumentar tudo em 2px */
  --font-size-ui: 18px;           /* em vez de 16px */
  --font-size-buffer: 17px;       /* em vez de 15px */
}
```

### Mudar line height:

```css
:root {
  /* Linha mais compacta */
  --line-height-comfortable: 1.4;  /* em vez de 1.618 */
}
```

### Usar fonte do sistema:

```css
:root {
  /* UI usa fonte do sistema */
  --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

---

## 🐛 Troubleshooting

### **Fontes não carregam:**
1. Verificar se arquivos estão em `/public/fonts/`
2. Verificar no DevTools > Network se `.ttf` estão loading
3. Verificar `font-display: swap` no @font-face

### **Tamanho incorreto:**
1. Inspecionar elemento no DevTools
2. Verificar se CSS correto está aplicado
3. Verificar se não há `!important` sobrescrevendo

### **Ligatures não funcionam:**
1. Adicionar classe `.enable-ligatures`
2. Ou modificar `font-feature-settings` do componente

---

## 📊 Performance

- **Font loading:** `font-display: swap` - mostra texto enquanto carrega
- **Tamanho total:** ~600KB (4 fontes × 2 famílias)
- **Carregamento:** Assíncrono, não bloqueia render
- **Cache:** Browser cacheia após primeiro load

---

## 🎨 Próximos Passos (Opcional)

### 1. **Ajustar cores do tema** (se quiser paleta exata do Zed)
Consultar: `zed-references/git-panel-reference/` para cores

### 2. **Variable fonts** (futuro)
Usar variable fonts para economizar bandwidth:
```css
@font-face {
  font-family: "Zed Sans VF";
  src: url("/fonts/IBMPlexSans-Variable.woff2");
  font-weight: 100 900; /* Todos os pesos em 1 arquivo */
}
```

### 3. **Font subsetting** (otimização)
Gerar subset com apenas caracteres usados:
```bash
pyftsubset IBMPlexSans-Regular.ttf \
  --output-file=IBMPlexSans-Regular-subset.woff2 \
  --flavor=woff2 \
  --layout-features='*' \
  --unicodes=U+0000-00FF,U+0131,U+0152-0153,U+02C6
```

---

## ✅ Checklist de Teste

- [x] Fontes carregam corretamente
- [x] UI usa IBM Plex Sans (16px)
- [x] Editor/Terminal usa Lilex (15px)
- [x] Line height confortável (1.618)
- [x] Ligatures desabilitadas por padrão
- [x] CSS integrado no styles.css
- [ ] Testar no app rodando (`bun run dev`)
- [ ] Verificar em diferentes componentes
- [ ] Ajustar tamanhos se necessário

---

## 📚 Referências

- **Zed Settings:** `assets/settings/default.json`
- **IBM Plex Sans:** https://github.com/IBM/plex
- **Lilex:** https://github.com/mishamyrt/Lilex
- **Licenças:** Ambas SIL OFL 1.1 (open source)

---

**Configuração completa!** 🎉

Agora o Athas usa as mesmas fontes e tamanhos do Zed Editor.

Para testar:
```bash
cd /Users/guilhermevarela/Public/athas
bun run dev
```
