# ACP Communication Test Simulation

## Test Scenario: User sends "Hello" message to Claude Code agent

### Step 1: User clicks on Claude agent in the UI

**UI Action**: User selects Claude Code agent from agent panel

**Expected Flow**:
```typescript
// src/components/agent-panel/chat-interface.tsx
const handleSendMessage = async () => {
  const message = "Hello, can you help me?";

  // Calls ACP agent
  await acpAgent.processMessage(
    threadId: "thread-123",
    agent: {
      id: "acp_claude",
      name: "Claude Code",
      type: "acp",
      command: "managed:claude_code",
      modelId: "claude-sonnet-4-5-20250929"
    },
    userMessage: message,
    context: {
      projectRoot: "/Users/guilhermevarela/Documents/Projetos/zola",
      enabledTools: ["read_file", "write_file", "list_directory", "search_files"],
      mcpServers: new Map()
    },
    callbacks: {
      onMessageStart: () => {},
      onMessageChunk: (chunk) => console.log(chunk),
      onMessageComplete: () => {},
      onToolCall: (toolCall) => console.log(toolCall),
      onError: (error) => console.error(error)
    }
  );
};
```

### Step 2: Initialize Agent (first time only)

**Code Location**: `src/lib/acp/agent.ts:66-118`

**Rust Backend Call**:
```rust
// src-tauri/src/acp_bridge.rs:40-188
invoke("start_acp_agent", {
  agentId: "acp_claude",
  command: "managed:claude_code",
  args: [],
  env: {}
})
```

**Process Spawned**:
```bash
/Users/guilhermevarela/.bun/bin/bunx @zed-industries/claude-code-acp@latest
```

**Initialize RPC Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": 0.1,
    "clientCapabilities": {
      "tools": {},
      "fs": {
        "readTextFile": true,
        "writeTextFile": true
      },
      "terminal": true
    },
    "clientInfo": {
      "name": "Athas",
      "version": "0.1.0"
    }
  }
}
```

**Expected Response** (based on `/tmp/claude-code-acp/src/acp-agent.ts:95-117`):
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": 1,
    "agentCapabilities": {
      "promptCapabilities": {
        "image": true,
        "embeddedContext": true
      },
      "mcpCapabilities": {
        "http": true,
        "sse": true
      }
    },
    "authMethods": [
      {
        "description": "Run `claude /login` in the terminal",
        "name": "Log in with Claude Code",
        "id": "claude-login"
      }
    ]
  }
}
```

**Rust Log Output**:
```
[INFO] [athas_code::acp_bridge]: Starting ACP agent 'acp_claude' with command 'managed:claude_code []'
[INFO] [athas_code::acp_bridge]: Using Claude Code ACP via '/Users/guilhermevarela/.bun/bin/bunx'
[INFO] [athas_code::acp_bridge]: [ACP] Sending request to 'acp_claude': {"id":1,"jsonrpc":"2.0","method":"initialize",...
[INFO] [athas_code::acp_bridge]: [ACP] Message sent and flushed
[INFO] [athas_code::acp_bridge]: [ACP] Received message from 'acp_claude': {"id":1,"jsonrpc":"2.0","result":{"agentCapabilities":...
```

**UI State Update**:
```typescript
// Agent status changes to "ready"
useAgentPanelStore.getState().updateAgent("acp_claude", {
  status: "ready",
  errorMessage: undefined
});
```

### Step 3: Create Session

**Code Location**: `src/lib/acp/agent.ts:161-236`

**newSession RPC Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "newSession",
  "params": {
    "cwd": "/Users/guilhermevarela/Documents/Projetos/zola",
    "mcpServers": []
  }
}
```

**Expected Response** (based on `/tmp/claude-code-acp/src/acp-agent.ts:119-254`):
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "sessionId": "01940b3e-7a8f-7123-8abc-123456789abc",
    "modes": {
      "currentModeId": "default",
      "availableModes": [
        {
          "id": "default",
          "name": "Always Ask",
          "description": "Prompts for permission on first use of each tool"
        },
        {
          "id": "acceptEdits",
          "name": "Accept Edits",
          "description": "Automatically accepts file edit permissions for the session"
        },
        {
          "id": "bypassPermissions",
          "name": "Bypass Permissions",
          "description": "Skips all permission prompts"
        },
        {
          "id": "plan",
          "name": "Plan Mode",
          "description": "Claude can analyze but not modify files or execute commands"
        }
      ]
    }
  }
}
```

**Rust Log Output**:
```
[INFO] [athas_code::acp_bridge]: [ACP] Sending request to 'acp_claude': {"id":2,"jsonrpc":"2.0","method":"newSession","params":{"cwd":"/Users/guilhermevarela/Documents/Projetos/zola","mcpServers":[]}
[INFO] [athas_code::acp_bridge]: [ACP] Message sent and flushed
[INFO] [athas_code::acp_bridge]: [ACP] Received message from 'acp_claude': {"id":2,"jsonrpc":"2.0","result":{"sessionId":"01940b3e-7a8f-7123-8abc-123456789abc",...
```

**Session Stored**:
```typescript
// src/stores/agent-panel/store.ts
store.setACPSession("thread-123", {
  sessionId: "01940b3e-7a8f-7123-8abc-123456789abc",
  agentId: "acp_claude",
  model: {
    id: "claude-sonnet-4-5-20250929",
    name: "claude-sonnet-4-5-20250929"
  },
  createdAt: new Date()
});
```

### Step 4: Send User Message

**Code Location**: `src/lib/acp/agent.ts:241-277`

**prompt RPC Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "prompt",
  "params": {
    "sessionId": "01940b3e-7a8f-7123-8abc-123456789abc",
    "prompt": [
      {
        "type": "text",
        "text": "Hello, can you help me?"
      }
    ]
  }
}
```

**Rust Log Output**:
```
[INFO] [athas_code::acp_bridge]: [ACP] Sending request to 'acp_claude': {"id":3,"jsonrpc":"2.0","method":"prompt","params":{"sessionId":"01940b3e-7a8f-7123-8abc-123456789abc",...
[INFO] [athas_code::acp_bridge]: [ACP] Message sent and flushed
```

### Step 5: Receive Streaming Response

**Expected Notifications** (based on `/tmp/claude-code-acp/src/acp-agent.ts:552-665`):

**Agent Message Chunk (Text)**:
```json
{
  "method": "sessionUpdate",
  "params": {
    "sessionId": "01940b3e-7a8f-7123-8abc-123456789abc",
    "update": {
      "sessionUpdate": "agent_message_chunk",
      "content": {
        "type": "text",
        "text": "Hello! I'm Claude, and I'd be happy to help you. "
      }
    }
  }
}
```

**Agent Message Chunk (More Text)**:
```json
{
  "method": "sessionUpdate",
  "params": {
    "sessionId": "01940b3e-7a8f-7123-8abc-123456789abc",
    "update": {
      "sessionUpdate": "agent_message_chunk",
      "content": {
        "type": "text",
        "text": "What would you like assistance with today?"
      }
    }
  }
}
```

**Rust Log Output**:
```
[INFO] [athas_code::acp_bridge]: [ACP] Received message from 'acp_claude': {"method":"sessionUpdate","params":{"sessionId":"01940b3e-7a8f-7123-8abc-123456789abc","update":{"sessionUpdate":"agent_message_chunk",...
```

**UI Updates**:
```typescript
// src/lib/acp/agent.ts:344-406 (handleSessionUpdate)
callbacks.onMessageChunk({
  content: "Hello! I'm Claude, and I'd be happy to help you. ",
  type: "text"
});

callbacks.onMessageChunk({
  content: "What would you like assistance with today?",
  type: "text"
});
```

### Step 6: Response Complete

**Final RPC Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "stopReason": "end_turn"
  }
}
```

**Rust Log Output**:
```
[INFO] [athas_code::acp_bridge]: [ACP] Received message from 'acp_claude': {"id":3,"jsonrpc":"2.0","result":{"stopReason":"end_turn"}}
```

**UI State**:
```typescript
// Message complete
callbacks.onMessageComplete();

// Final message displayed in chat:
// User: "Hello, can you help me?"
// Claude: "Hello! I'm Claude, and I'd be happy to help you. What would you like assistance with today?"
```

## Summary of Fixes Applied

### Previous Issues (FIXED ✓):
1. ❌ `capabilities` → ✅ `clientCapabilities` in initialize
2. ❌ `sessions/create` → ✅ `newSession` method
3. ❌ `sessions/input` → ✅ `prompt` method
4. ❌ `protocolVersion: "0.1.0"` → ✅ `protocolVersion: 0.1` (number)
5. ❌ LSP-style headers → ✅ Newline-delimited JSON

### Expected Success Indicators:
- ✅ Agent initializes without errors
- ✅ Session created successfully
- ✅ User message sent to Claude
- ✅ Streaming response chunks received
- ✅ No "Method not found" errors
- ✅ No "Invalid params" errors

## Next Steps for Manual Testing

1. Start the application: `bun run tauri dev`
2. Open Agent Panel
3. Select "Claude Code" agent
4. Type "Hello" and send
5. Watch console logs for the expected flow above
6. Verify response appears in chat interface

## Debugging Commands

Watch logs in real-time:
```bash
tail -f ~/.athas/logs/athas.log | grep ACP
```

Check if claude-code-acp is authenticated:
```bash
ls -la ~/.claude.json
```

If not authenticated, run:
```bash
bunx @zed-industries/claude-code-acp@latest
# Then in the terminal: /login
```
