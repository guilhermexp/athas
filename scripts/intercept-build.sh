#!/bin/bash

# Read the JSON input from stdin
input=$(cat)

# Extract the command from the input using jq
command=$(echo "$input" | jq -r '.tool_input.command // ""')

# Check if the command matches build or dev commands
if [[ "$command" =~ ^(bun|npm)[[:space:]]+run[[:space:]]+build$ ]] || \
   [[ "$command" =~ ^(bun|npm)[[:space:]]+tauri[[:space:]]+build$ ]]; then
    # Block build commands and provide feedback to run bun check:all instead
    echo "Use 'bun check:all' instead of '$command'" >&2
    exit 2
elif [[ "$command" =~ ^(bun|npm)[[:space:]]+run[[:space:]]+dev$ ]] || \
     [[ "$command" =~ ^(bun|npm)[[:space:]]+tauri[[:space:]]+dev$ ]]; then
    # Block dev commands
    echo "Dev commands are blocked. Use 'bun check:all' instead" >&2
    exit 2
fi

# If it doesn't match, allow the command to proceed
exit 0
