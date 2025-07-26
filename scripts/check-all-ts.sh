#!/bin/bash

# Get the hook input
input=$(cat)

# Extract session_id from the input
session_id=$(echo "$input" | jq -r '.session_id')

# Check if any .ts or .tsx files were modified during this session
# Look through git status to see if TypeScript files were touched
if git status --porcelain | grep -E '\.tsx?$' > /dev/null; then
    echo "TypeScript files were modified, running checks..."

    # Run both check and typecheck
    bun check
    check_exit=$?
    
    bun typecheck
    typecheck_exit=$?

    # If either had errors, exit with code 2 to block and have Claude fix them
    if [ $check_exit -ne 0 ] || [ $typecheck_exit -ne 0 ]; then
        echo "Found TypeScript/lint errors that need to be fixed" >&2
        exit 2
    fi
fi
