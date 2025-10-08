# Athas Theme System 🎨

Sistema de temas do Athas com suporte completo a temas do Zed Editor.

---

## 🚀 Quick Start

### Usar um tema do Zed no Athas:

```bash
# Converter um tema
bun run scripts/convert-zed-themes.ts ~/.config/zed/themes/my-theme.json

# Converter todos
bun run scripts/convert-zed-themes.ts --all ~/.config/zed/themes
```

---

## 📁 Estrutura

```
themes/
├── builtin/                    # Temas incluídos
│   ├── catppuccin.toml
│   ├── dracula.toml
│   ├── tokyo-night.toml
│   ├── one.toml
│   └── ... (12 temas)
│
├── zed-theme-converter.ts      # Conversor Zed → Athas
├── theme-loader.ts             # Carregador de temas TOML
├── theme-registry.ts           # Registro de temas
├── theme-initializer.ts        # Inicializador
├── types.ts                    # Tipos TypeScript
└── README.md                   # Este arquivo
```

---

## 🎨 Temas Incluídos

1. **One Dark** - Tema padrão do Zed
2. **Dracula** - Cores vibrantes
3. **Tokyo Night** - Moderno
4. **Nord** - Minimalista
5. **Solarized** - Light & Dark
6. **GitHub** - Tema do GitHub
7. **Catppuccin** - Pastéis suaves
8. **Gruvbox** - Retrô
9. **Vitesse** - Elegante
10. **VS Code** - Popular
11. **Contrast Themes** - Alto contraste
12. **One** - One Dark + Light

---

## 🔧 Criar Tema Customizado

### Opção 1: TOML Manual
```toml
[[themes]]
id = "my-theme"
name = "My Theme"
description = "Meu tema personalizado"
category = "Dark"
is_dark = true

[themes.css_variables]
"--tw-primary-bg" = "#1a1b26"
"--tw-editor-bg" = "#1a1b26"
"--tw-text" = "#a9b1d6"
"--tw-accent" = "#7aa2f7"

[themes.syntax_tokens]
"--color-syntax-keyword" = "#bb9af7"
"--color-syntax-string" = "#9ece6a"
```

### Opção 2: Converter do Zed
```bash
bun run scripts/convert-zed-themes.ts my-zed-theme.json
```

---

## 🌐 Fontes de Temas

### Oficial Zed:
- Repo: https://github.com/zed-industries/zed
- Path: `assets/themes/*/`

### Marketplace:
- URL: https://zed.dev/extensions?category=theme
- +200 temas disponíveis

### Comunidade:
- GitHub: buscar "zed theme"
- Popular: Dracula, Nord, Tokyo Night

---

## 📚 Documentação Completa

Ver arquivos na raiz do projeto:
- `ZED_THEMES_COMPATIBILITY.md` - Documentação técnica detalhada
- `QUICK_THEME_GUIDE.md` - Guia rápido (3 min)
- `THEME_SYSTEM_SUMMARY.md` - Resumo completo

---

## 💡 API

### Converter tema programaticamente:

```typescript
import { convertZedThemeToToml } from './zed-theme-converter';

const zedTheme = { /* ... */ };
const tomlContent = convertZedThemeToToml(zedTheme);
```

### Registrar tema dinamicamente:

```typescript
import { themeRegistry } from './theme-registry';

themeRegistry.registerTheme({
  id: "my-theme",
  name: "My Theme",
  description: "Custom theme",
  category: "Dark",
  isDark: true,
  cssVariables: { /* ... */ }
});
```

---

## ✅ Status

- **Temas incluídos:** 12
- **Temas disponíveis:** +200 (via Zed)
- **Compatibilidade:** ~95%
- **Funcionalidades:**
  - ✅ Conversão Zed → Athas
  - ✅ Suporte TOML
  - ✅ Syntax highlighting
  - ✅ Terminal colors
  - ✅ Git indicators
  - ✅ Múltiplas variantes

---

**Aproveite os +200 temas do ecossistema Zed!** 🚀
