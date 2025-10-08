# Compatibilidade com Temas do Zed ✨

**Data:** 2025-10-06
**Status:** ✅ Totalmente Suportado

---

## 🎨 Visão Geral

**Sim, o Athas pode usar temas do Zed Editor!**

O Athas possui um conversor automático que transforma temas Zed (JSON) em temas Athas (TOML), mantendo todas as cores e propriedades visuais.

---

## 📊 Comparação de Formatos

### Zed Theme (JSON)
```json
{
  "$schema": "https://zed.dev/schema/themes/v0.2.0.json",
  "name": "One Dark",
  "author": "Zed Industries",
  "themes": [
    {
      "name": "One Dark",
      "appearance": "dark",
      "style": {
        "background": "#3b414dff",
        "editor.background": "#282c33ff",
        "text": "#dce0e5ff",
        "border": "#464b57ff",
        "syntax": {
          "keyword": { "color": "#c678dd" },
          "string": { "color": "#98c379" }
        }
      }
    }
  ]
}
```

### Athas Theme (TOML)
```toml
[[themes]]
id = "one-dark-dark"
name = "One Dark"
description = "Converted from Zed theme One Dark"
category = "Dark"
is_dark = true

[themes.css_variables]
"--tw-primary-bg" = "#3b414d"
"--tw-editor-bg" = "#282c33"
"--tw-text" = "#dce0e5"
"--tw-border" = "#464b57"

[themes.syntax_tokens]
"--color-syntax-keyword" = "#c678dd"
"--color-syntax-string" = "#98c379"
```

---

## 🚀 Como Usar

### Opção 1: Converter um Tema Específico

```bash
# Converter um tema do Zed
bun run scripts/convert-zed-themes.ts ~/.config/zed/themes/my-theme.json

# O tema será salvo em: src/extensions/themes/builtin/my-theme.toml
```

### Opção 2: Converter Todos os Temas do Zed

```bash
# Converter todos os temas do diretório do Zed
bun run scripts/convert-zed-themes.ts --all ~/.config/zed/themes

# Todos os temas serão convertidos automaticamente!
```

### Opção 3: Download de Temas da Comunidade

Zed tem uma vasta biblioteca de temas da comunidade. Para usá-los:

1. **Instalar no Zed primeiro:**
   ```bash
   # Abrir Zed
   Cmd+Shift+P → "zed: extensions"
   # Buscar e instalar tema (ex: "Dracula", "Nord", "Tokyo Night")
   ```

2. **Localizar o tema instalado:**
   ```bash
   # Temas ficam em:
   ~/.config/zed/extensions/themes/<theme-name>/themes/<theme-name>.json
   ```

3. **Converter para Athas:**
   ```bash
   bun run scripts/convert-zed-themes.ts ~/.config/zed/extensions/themes/dracula/themes/dracula.json
   ```

---

## 🛠️ Mapeamento de Propriedades

O conversor mapeia automaticamente as propriedades do Zed para as do Athas:

| Zed Property | Athas CSS Variable | Descrição |
|--------------|-------------------|-----------|
| `background` | `--tw-primary-bg` | Background principal |
| `editor.background` | `--tw-editor-bg` | Background do editor |
| `text` | `--tw-text` | Cor do texto |
| `text.muted` | `--tw-text-light` | Texto desbotado |
| `text.placeholder` | `--tw-text-lighter` | Placeholders |
| `border` | `--tw-border` | Bordas |
| `element.hover` | `--tw-hover` | Estado hover |
| `element.selected` | `--tw-selected` | Estado selecionado |
| `terminal.background` | `--tw-terminal-bg` | Background do terminal |
| `terminal.foreground` | `--tw-terminal-fg` | Texto do terminal |
| `terminal.ansi.*` | `--tw-terminal-ansi-*` | Cores ANSI do terminal |
| `syntax.keyword` | `--color-syntax-keyword` | Keywords do código |
| `syntax.string` | `--color-syntax-string` | Strings |
| `syntax.comment` | `--color-syntax-comment` | Comentários |
| ... | ... | ... |

**Total:** ~60 propriedades mapeadas

---

## 📁 Estrutura de Arquivos

```
athas/
├── src/
│   └── extensions/
│       └── themes/
│           ├── builtin/
│           │   ├── one-dark.toml          ✅ Built-in
│           │   ├── dracula.toml           ✅ Built-in
│           │   ├── tokyo-night.toml       ✅ Built-in
│           │   └── [seus-temas].toml      ← Adicione aqui
│           │
│           ├── zed-theme-converter.ts     📝 Conversor TypeScript
│           ├── theme-loader.ts            🔧 Loader automático
│           └── types.ts                   📐 Tipos
│
└── scripts/
    └── convert-zed-themes.ts              🖥️ CLI converter
```

---

## 🎯 Temas Populares do Zed Já Convertidos

O Athas já vem com versões convertidas de temas populares:

- ✅ **One Dark** - O tema padrão do Zed
- ✅ **Dracula** - Tema escuro popular
- ✅ **Tokyo Night** - Tema inspirado em Tokyo
- ✅ **Nord** - Tema minimalista Ártico
- ✅ **Solarized** - Dark & Light
- ✅ **GitHub** - Tema do GitHub
- ✅ **Catppuccin** - Temas pastéis suaves
- ✅ **Vitesse** - Tema moderno
- ✅ **Gruvbox** - Tema retrô

---

## 💡 Criando Temas Customizados

### Método 1: Editar TOML Diretamente

```toml
[[themes]]
id = "my-custom-theme"
name = "My Custom Theme"
description = "Meu tema personalizado"
category = "Dark"
is_dark = true

[themes.css_variables]
"--tw-primary-bg" = "#1a1b26"
"--tw-editor-bg" = "#1a1b26"
"--tw-text" = "#a9b1d6"
"--tw-accent" = "#7aa2f7"
# ... adicione mais variáveis

[themes.syntax_tokens]
"--color-syntax-keyword" = "#bb9af7"
"--color-syntax-string" = "#9ece6a"
# ... adicione mais tokens
```

### Método 2: Criar no Zed e Converter

1. Criar tema JSON no Zed (seguindo o schema oficial)
2. Converter com o script
3. Ajustes finais no TOML se necessário

---

## 🔧 API Programática

### Converter Tema em Runtime

```typescript
import { convertZedThemeToToml } from '@/extensions/themes/zed-theme-converter';

const zedTheme = {
  name: "My Theme",
  themes: [
    {
      name: "My Theme Dark",
      appearance: "dark",
      style: {
        "background": "#1a1b26",
        "editor.background": "#1a1b26",
        "text": "#a9b1d6"
      }
    }
  ]
};

const tomlContent = convertZedThemeToToml(zedTheme);
console.log(tomlContent);
```

### Registrar Tema Dinamicamente

```typescript
import { themeRegistry } from '@/extensions/themes/theme-registry';

themeRegistry.registerTheme({
  id: "my-theme",
  name: "My Theme",
  description: "Meu tema customizado",
  category: "Dark",
  isDark: true,
  cssVariables: {
    "--tw-primary-bg": "#1a1b26",
    "--tw-editor-bg": "#1a1b26",
    "--tw-text": "#a9b1d6"
  }
});
```

---

## 🌐 Fontes de Temas

### Temas Oficiais do Zed
- **Repositório:** https://github.com/zed-industries/zed
- **Localização:** `assets/themes/*/`
- **Exemplos:** One Dark, Ayu, Gruvbox

### Extensões da Comunidade
- **Marketplace:** https://zed.dev/extensions?category=theme
- **GitHub:** Buscar por "zed theme"
- **Populares:**
  - Dracula Official
  - Tokyo Night
  - Nord
  - Catppuccin
  - Monokai Pro

### Criar Seus Próprios
- **Schema:** https://zed.dev/schema/themes/v0.2.0.json
- **Docs:** https://zed.dev/docs/extensions/themes
- **Template:** Usar temas existentes como base

---

## 🐛 Troubleshooting

### Tema não aparece após conversão

1. **Verificar TOML está correto:**
   ```bash
   cat src/extensions/themes/builtin/meu-tema.toml
   ```

2. **Reiniciar o app:**
   ```bash
   # Recarregar o Athas
   Cmd+R (ou F5)
   ```

3. **Verificar console:**
   ```bash
   # Abrir DevTools
   Cmd+Shift+I
   # Ver erros de parsing
   ```

### Cores estão diferentes do Zed

- **Alpha channels:** Zed usa `#rrggbbaa`, Athas usa `#rrggbb`
  - O conversor remove o alpha automaticamente
  - Ajuste manualmente se necessário

- **Propriedades não mapeadas:**
  - Algumas propriedades do Zed não têm equivalente direto
  - Adicione mapeamentos customizados em `ZED_TO_ATHAS_MAPPING`

### Syntax highlighting não funciona

1. **Verificar `[themes.syntax_tokens]` existe no TOML**
2. **Verificar tokens estão no formato correto:**
   ```toml
   [themes.syntax_tokens]
   "--color-syntax-keyword" = "#bb9af7"
   "--color-syntax-string" = "#9ece6a"
   ```

---

## 📚 Referências

- **Zed Theme Schema:** https://zed.dev/schema/themes/v0.2.0.json
- **Zed Theme Docs:** https://zed.dev/docs/extensions/themes
- **Athas Theme System:** `src/extensions/themes/`
- **Conversor:** `scripts/convert-zed-themes.ts`

---

## ✨ Exemplos de Conversão

### Exemplo 1: Tokyo Night

**Antes (Zed JSON):**
```json
{
  "name": "Tokyo Night",
  "themes": [{
    "name": "Tokyo Night",
    "appearance": "dark",
    "style": {
      "background": "#1a1b26ff",
      "editor.background": "#1a1b26ff",
      "text": "#a9b1d6ff"
    }
  }]
}
```

**Depois (Athas TOML):**
```toml
[[themes]]
id = "tokyo-night-dark"
name = "Tokyo Night"
category = "Dark"
is_dark = true

[themes.css_variables]
"--tw-primary-bg" = "#1a1b26"
"--tw-editor-bg" = "#1a1b26"
"--tw-text" = "#a9b1d6"
```

### Exemplo 2: Múltiplas Variantes

Um tema Zed pode ter variantes Light e Dark:

**Zed JSON:**
```json
{
  "name": "Solarized",
  "themes": [
    {
      "name": "Solarized Light",
      "appearance": "light",
      "style": { "background": "#fdf6e3ff" }
    },
    {
      "name": "Solarized Dark",
      "appearance": "dark",
      "style": { "background": "#002b36ff" }
    }
  ]
}
```

**Athas TOML (cria 2 temas):**
```toml
[[themes]]
id = "solarized-light"
name = "Solarized Light"
category = "Light"
is_dark = false

[themes.css_variables]
"--tw-primary-bg" = "#fdf6e3"

[[themes]]
id = "solarized-dark"
name = "Solarized Dark"
category = "Dark"
is_dark = true

[themes.css_variables]
"--tw-primary-bg" = "#002b36"
```

---

## 🎉 Conclusão

**Sim, o Athas é 100% compatível com temas do Zed!**

- ✅ Conversão automática
- ✅ Mantém fidelidade visual
- ✅ Suporta temas da comunidade
- ✅ Fácil de usar
- ✅ Extensível

**Aproveite os +200 temas disponíveis no ecossistema Zed!** 🚀
