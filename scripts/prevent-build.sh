#!/bin/bash

# Read the JSON input from stdin
input=$(cat)

# Extract the command from the input using jq
command=$(echo "$input" | jq -r '.tool_input.command // ""')

# Check if command starts with package managers and contains build, dev, or dev:app
if [[ "$command" =~ ^(bun|npm|pnpm|yarn)[[:space:]] ]] && \
   [[ "$command" =~ (build|dev|dev:app) ]]; then
    echo "Build and dev commands are blocked. Use 'bun check:all' or 'cargo clippy' instead" >&2
    exit 2
fi

# If it doesn't match, allow the command to proceed
exit 0
