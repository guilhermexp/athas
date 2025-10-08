#!/bin/bash

echo "🚀 Iniciando Athas com tema Supaglass..."
echo ""

# Ir para o diretório do Athas
cd /Users/guilhermevarela/Public/athas

# Matar processos antigos
echo "🔄 Limpando processos antigos..."
pkill -f "tauri dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Rodar o Athas
echo "✨ Iniciando Athas..."
echo ""
echo "🎨 Tema ativo: Supaglass (verde Supabase)"
echo "📍 Localização: ~/.config/athas/settings.json"
echo ""

bun run dev
