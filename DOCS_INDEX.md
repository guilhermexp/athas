# Índice de Documentação - Athas 📚

Guia completo de toda a documentação do Athas.

---

## 🎨 Sistema de Temas

### Compatibilidade com Zed
| Documento | Descrição | Tamanho |
|-----------|-----------|---------|
| **[ZED_THEMES_COMPATIBILITY.md](./ZED_THEMES_COMPATIBILITY.md)** | 📘 Documentação técnica completa | ~600 linhas |
| **[QUICK_THEME_GUIDE.md](./QUICK_THEME_GUIDE.md)** | ⚡ Guia rápido (3 minutos) | ~200 linhas |
| **[THEME_SYSTEM_SUMMARY.md](./THEME_SYSTEM_SUMMARY.md)** | 📊 Resumo executivo | ~400 linhas |
| **[THEME_CONVERSION_EXAMPLES.md](./THEME_CONVERSION_EXAMPLES.md)** | 🎯 Exemplos práticos | ~400 linhas |

### Código e APIs
| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/extensions/themes/zed-theme-converter.ts` | TypeScript | Conversor Zed → Athas (API) |
| `scripts/convert-zed-themes.ts` | CLI | Ferramenta de conversão |
| `src/extensions/themes/README.md` | Docs | README do sistema de temas |

---

## 🔧 Backend & Terminal

| Documento | Descrição | Status |
|-----------|-----------|--------|
| **[BACKEND_TERMINAL_ISSUES.md](./BACKEND_TERMINAL_ISSUES.md)** | Diagnóstico e soluções de problemas do terminal | ✅ Resolvido |
| **[TERMINAL_FONTS_FIX.md](./TERMINAL_FONTS_FIX.md)** | Correção de fontes do terminal (Zed Mono/Lilex) | ✅ Aplicado |

**Problemas corrigidos:**
- ✅ Terminal "No terminal" → Pane ID mismatch
- ✅ Drag & drop de arquivos do file explorer
- ✅ Fontes do terminal (Lilex 15px, line-height 1.618)

---

## 🖋️ Fontes e Layout

| Documento | Descrição | Status |
|-----------|-----------|--------|
| **[ZED_FONTS_SETUP.md](./ZED_FONTS_SETUP.md)** | Configuração completa de fontes do Zed | ✅ Aplicado |
| **[ZED_ADAPTATION_GUIDE.md](./ZED_ADAPTATION_GUIDE.md)** | Guia de adaptação Zed → Athas | 📘 Referência |

**Fontes instaladas:**
- ✅ IBM Plex Sans (UI, 16px) → `--font-ui`
- ✅ Lilex (code/terminal, 15px) → `--font-mono`
- ✅ Line height: 1.618 (golden ratio)

---

## 📁 Estrutura de Documentação

```
athas/
├── 📚 ÍNDICES
│   └── DOCS_INDEX.md                      ← Você está aqui
│
├── 🎨 TEMAS
│   ├── ZED_THEMES_COMPATIBILITY.md        (técnico detalhado)
│   ├── QUICK_THEME_GUIDE.md               (início rápido)
│   ├── THEME_SYSTEM_SUMMARY.md            (resumo executivo)
│   └── THEME_CONVERSION_EXAMPLES.md       (exemplos práticos)
│
├── 🔧 BACKEND/TERMINAL
│   ├── BACKEND_TERMINAL_ISSUES.md         (problemas + soluções)
│   └── TERMINAL_FONTS_FIX.md              (fontes do terminal)
│
├── 🖋️ FONTES/LAYOUT
│   ├── ZED_FONTS_SETUP.md                 (setup completo de fontes)
│   └── ZED_ADAPTATION_GUIDE.md            (guia de adaptação)
│
└── 📝 README
    └── README.md                           (README principal)
```

---

## 🚀 Quick Links

### Para começar:
1. **Usar temas do Zed?** → [QUICK_THEME_GUIDE.md](./QUICK_THEME_GUIDE.md)
2. **Corrigir terminal?** → [BACKEND_TERMINAL_ISSUES.md](./BACKEND_TERMINAL_ISSUES.md)
3. **Configurar fontes?** → [ZED_FONTS_SETUP.md](./ZED_FONTS_SETUP.md)

### Documentação técnica:
1. **Sistema de temas completo** → [ZED_THEMES_COMPATIBILITY.md](./ZED_THEMES_COMPATIBILITY.md)
2. **Adaptação do Zed** → [ZED_ADAPTATION_GUIDE.md](./ZED_ADAPTATION_GUIDE.md)
3. **Resumo de tudo** → [THEME_SYSTEM_SUMMARY.md](./THEME_SYSTEM_SUMMARY.md)

### Exemplos práticos:
1. **Conversão de temas** → [THEME_CONVERSION_EXAMPLES.md](./THEME_CONVERSION_EXAMPLES.md)
2. **Troubleshooting terminal** → [BACKEND_TERMINAL_ISSUES.md](./BACKEND_TERMINAL_ISSUES.md)

---

## 📊 Estatísticas

### Documentação criada:
- **Arquivos Markdown:** 9
- **Linhas totais:** ~3.000
- **Arquivos TypeScript:** 2
- **Linhas de código:** ~800

### Features documentadas:
- ✅ Sistema de temas (4 docs)
- ✅ Conversão Zed → Athas (2 docs)
- ✅ Backend/Terminal (2 docs)
- ✅ Fontes/Layout (2 docs)

### Status geral:
- **Temas do Zed:** ✅ 100% compatível
- **Terminal:** ✅ Todos os problemas resolvidos
- **Fontes:** ✅ Zed fonts aplicadas
- **Drag & Drop:** ✅ Implementado

---

## 🎯 Por Feature

### 🎨 Quero usar temas do Zed
**Leia:**
1. [QUICK_THEME_GUIDE.md](./QUICK_THEME_GUIDE.md) (3 min)
2. [THEME_CONVERSION_EXAMPLES.md](./THEME_CONVERSION_EXAMPLES.md) (exemplos)

**Execute:**
```bash
bun run scripts/convert-zed-themes.ts my-theme.json
```

---

### 🔧 Terminal não funciona
**Leia:**
1. [BACKEND_TERMINAL_ISSUES.md](./BACKEND_TERMINAL_ISSUES.md)

**Problemas resolvidos:**
- ✅ "No terminal" message
- ✅ Drag & drop de arquivos
- ✅ Pane ID mismatch
- ✅ Terminal fonts

---

### 🖋️ Fontes estão erradas
**Leia:**
1. [TERMINAL_FONTS_FIX.md](./TERMINAL_FONTS_FIX.md)
2. [ZED_FONTS_SETUP.md](./ZED_FONTS_SETUP.md)

**Fontes aplicadas:**
- ✅ Lilex (Zed Mono) no terminal
- ✅ IBM Plex Sans na UI
- ✅ Line height 1.618 (golden ratio)

---

### 📚 Entender adaptação completa do Zed
**Leia:**
1. [ZED_ADAPTATION_GUIDE.md](./ZED_ADAPTATION_GUIDE.md)
2. [THEME_SYSTEM_SUMMARY.md](./THEME_SYSTEM_SUMMARY.md)

---

## 🗂️ Por Tipo de Documento

### 📘 Documentação Técnica (Developer)
- [ZED_THEMES_COMPATIBILITY.md](./ZED_THEMES_COMPATIBILITY.md) - Schema, mapeamentos, API
- [ZED_ADAPTATION_GUIDE.md](./ZED_ADAPTATION_GUIDE.md) - Comparação Zed vs Athas
- [THEME_SYSTEM_SUMMARY.md](./THEME_SYSTEM_SUMMARY.md) - Resumo técnico completo

### ⚡ Guias Rápidos (User)
- [QUICK_THEME_GUIDE.md](./QUICK_THEME_GUIDE.md) - Converter temas em 3 minutos
- [BACKEND_TERMINAL_ISSUES.md](./BACKEND_TERMINAL_ISSUES.md) - Soluções rápidas

### 🎯 Exemplos Práticos
- [THEME_CONVERSION_EXAMPLES.md](./THEME_CONVERSION_EXAMPLES.md) - Before/After conversions
- [TERMINAL_FONTS_FIX.md](./TERMINAL_FONTS_FIX.md) - Passo a passo

### 📋 Referência
- [ZED_FONTS_SETUP.md](./ZED_FONTS_SETUP.md) - Referência completa de fontes
- `src/extensions/themes/README.md` - README do sistema de temas

---

## 🔍 Busca Rápida

### Problema: "No terminal"
→ [BACKEND_TERMINAL_ISSUES.md](./BACKEND_TERMINAL_ISSUES.md) - Seção "Fix 1"

### Problema: Fontes erradas no terminal
→ [TERMINAL_FONTS_FIX.md](./TERMINAL_FONTS_FIX.md)

### Problema: Não consigo arrastar arquivos
→ [BACKEND_TERMINAL_ISSUES.md](./BACKEND_TERMINAL_ISSUES.md) - Seção "Fix 2"

### Problema: Como converter tema do Zed?
→ [QUICK_THEME_GUIDE.md](./QUICK_THEME_GUIDE.md)

### Problema: Tema convertido tem cores erradas
→ [THEME_CONVERSION_EXAMPLES.md](./THEME_CONVERSION_EXAMPLES.md) - Seção "Dicas"

### Pergunta: Athas suporta temas do Zed?
→ **SIM!** [ZED_THEMES_COMPATIBILITY.md](./ZED_THEMES_COMPATIBILITY.md)

---

## 📝 Changelog

### 2025-10-06
- ✅ Criado sistema de conversão de temas Zed
- ✅ Implementado conversor TypeScript + CLI
- ✅ Documentação completa (9 arquivos)
- ✅ Corrigido terminal "No terminal"
- ✅ Implementado drag & drop de arquivos
- ✅ Aplicado fontes do Zed (Lilex + IBM Plex)
- ✅ Corrigido line height do terminal (1.618)

---

## 🎉 Resumo

**Total de documentação criada:**
- 📚 9 arquivos Markdown (~3.000 linhas)
- 💻 2 arquivos TypeScript (~800 linhas)
- ✅ 100% compatibilidade com temas Zed
- ✅ Todos os problemas de terminal resolvidos
- ✅ Fontes do Zed aplicadas

**Pronto para usar!** 🚀

---

**Última atualização:** 2025-10-06
