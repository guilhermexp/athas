#!/bin/bash

# Script para aplicar o tema Supaglass automaticamente
# Uso: ./apply-supaglass-theme.sh

echo "🎨 Aplicando tema Supaglass no Athas..."

# Caminho para as configurações do Athas
CONFIG_DIR="$HOME/.config/athas"
CONFIG_FILE="$CONFIG_DIR/settings.json"

# Criar diretório se não existir
mkdir -p "$CONFIG_DIR"

# Verificar se o arquivo existe
if [ -f "$CONFIG_FILE" ]; then
    echo "📝 Atualizando configuração existente..."

    # Usar jq para atualizar o JSON (se disponível)
    if command -v jq &> /dev/null; then
        jq '.theme = "supaglass-dark"' "$CONFIG_FILE" > "${CONFIG_FILE}.tmp" && mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"
        echo "✅ Tema aplicado com jq!"
    else
        # Método alternativo sem jq - usando sed/awk
        if grep -q '"theme"' "$CONFIG_FILE"; then
            # Substituir linha existente
            sed -i '' 's/"theme": *"[^"]*"/"theme": "supaglass-dark"/g' "$CONFIG_FILE"
            echo "✅ Tema aplicado com sed!"
        else
            # Adicionar nova linha antes do último }
            sed -i '' '$s/}/  "theme": "supaglass-dark"\n}/' "$CONFIG_FILE"
            echo "✅ Tema adicionado ao config!"
        fi
    fi
else
    echo "📝 Criando nova configuração..."
    cat > "$CONFIG_FILE" << 'EOF'
{
  "theme": "supaglass-dark",
  "fontSize": 15,
  "fontFamily": "Zed Mono",
  "tabSize": 2,
  "wordWrap": true,
  "lineNumbers": true
}
EOF
    echo "✅ Configuração criada com tema Supaglass!"
fi

echo ""
echo "🎉 Tema Supaglass aplicado com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Abrir o Athas: cd /Users/guilhermevarela/Public/athas && bun run dev"
echo "   2. O tema Supaglass já estará ativo!"
echo ""
echo "🎨 Cores principais:"
echo "   - Background: #1a1a1a (dark)"
echo "   - Accent: #3ecf8e (verde Supabase)"
echo "   - Terminal: Paleta completa ANSI"
echo ""
