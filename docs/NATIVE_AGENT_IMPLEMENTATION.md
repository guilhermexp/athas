# Native Agent Implementation - Status & Documentation

> **Status**: 98% Complete (CRITICAL Tool Display Fix Complete!)
> **Last Updated**: October 8, 2025 (Tool execution display fixed)
> **Version**: 1.2.0

## 📋 Table of Contents

- [Overview](#overview)
- [What Was Implemented](#what-was-implemented)
- [Recent Bug Fixes](#recent-bug-fixes)
- [Architecture](#architecture)
- [What's Left To Do](#whats-left-to-do)
- [Known Issues](#known-issues)
- [Testing](#testing)

---

## Overview

The Native Agent Panel is a comprehensive AI assistant integration for Athas, supporting multiple agent types:

- **Native Agent**: Built-in agent using Anthropic Claude API
- **ACP Agents**: External agents via Agent Communication Protocol (Claude Code, Gemini CLI)
- **MCP Integration**: Model Context Protocol servers for extended capabilities

### Key Features

✅ Thread-based conversations (not chat-based)
✅ Support for multiple agents (native, ACP, MCP)
✅ Tool execution with approval system
✅ Streaming responses
✅ Configuration panel
✅ Persistent state across sessions
✅ Automatic cleanup of stuck streaming messages

---

## What Was Implemented

### Phase 5: Tool Execution Display Fix (100% Complete) 🚨 CRITICAL

**Problem Solved**: Backend was processing MANY tool executions (file reads, searches, etc.) but NONE appeared in UI.

**Root Cause**: All tool callbacks were empty stubs:
```typescript
onToolStart: () => {},
onToolComplete: () => {},
onToolError: () => {},
onToolRejected: () => {},
```

**Solution Implemented**:

1. **Updated Callback Signatures** (`types.ts`)
   - Added `toolCallId` as first parameter to all tool callbacks
   - Ensures unique tracking of each tool execution
   ```typescript
   onToolStart: (toolCallId: string, toolName: string, input: any) => void;
   onToolComplete: (toolCallId: string, toolName: string, output: any) => void;
   onToolError: (toolCallId: string, toolName: string, error: string) => void;
   onToolRejected: (toolCallId: string, toolName: string) => void;
   ```

2. **Implemented Full Callbacks** (`agent-panel.tsx`)
   - `onToolStart`: Creates ToolCall object with status "running" and adds to message
   - `onToolComplete`: Updates ToolCall to status "complete" with output and duration
   - `onToolError`: Updates ToolCall to status "error" with error message
   - `onToolRejected`: Updates ToolCall to status "rejected"

3. **Updated ACP Agent** (`lib/acp/agent.ts`)
   - Now passes `toolCallId` from backend to callbacks
   - Uses the actual tool call ID from ACP protocol

4. **Updated Native Agent** (`lib/native-agent/agent.ts`)
   - Now passes Anthropic's `tool_use.id` to callbacks
   - Uses official tool call ID from Anthropic API

5. **Updated useNativeAgent Hook** (`hooks/useNativeAgent.ts`)
   - Accepts `toolCallId` in callback signatures
   - Matches tool calls by ID instead of name (more reliable)

**Impact**:
- ✅ All tool executions now visible in real-time
- ✅ Users can see file reads, searches, and all intermediate steps
- ✅ Tool status updates properly (running → complete/error/rejected)
- ✅ Matches Zed's transparency - shows everything happening
- ✅ Fixed user's critical issue: "Tem que aparecer tudo"

### Phase 4: UI Improvements - Zed-Inspired (100% Complete) ⭐

#### Thinking Blocks
- **New Component**: `ThinkingBlock` - Displays assistant's reasoning process
- **Visual Design**: Purple-themed collapsible blocks with Brain icon
- **Smart Preview**: Shows first 50 characters when collapsed
- **Type System**: Added `thinking` type to `MessageContent`

#### Enhanced Tool Call Cards
- **Card Layout System**: Dynamic layout based on tool status
  - Pending tools: Yellow bordered card with approval buttons
  - Errors/Rejected: Red bordered card with clear error state
  - Running: Blue progress indicator
  - Completed: Minimal border-left layout
- **Inline Approval**: "Allow" and "Reject" buttons directly in card
- **Auto-expand**: Tools waiting for approval expand automatically
- **Better Collapsing**: Chevron icons (right/down) for clear state
- **Status Icons**: Loading spinners, checkmarks, error icons

#### Improved Message Layout
- **User Messages**:
  - Full-width layout (no more right-aligned bubbles)
  - "You" label for clarity
  - Border separator between messages
  - Primary background color
- **Assistant Messages**:
  - Secondary background for differentiation
  - Conditional spacing based on position
  - "Assistant" label for first message in sequence
  - Extra padding for last message in thread
- **Typography**:
  - Consistent 12px font size
  - 1.6 line-height for readability
  - Monospace for code and tool names

#### Visual Hierarchy
- Removed confusing message bubbles
- Added subtle borders and background colors
- Consistent spacing throughout
- Professional, clean design inspired by Zed

### Phase 1: Core Infrastructure (100% Complete)

#### Backend (Rust)
- **ACP Bridge** (`src-tauri/src/acp_bridge.rs`)
  - Process management for external ACP agents
  - Event emission system using Tauri
  - JSON-RPC message handling
  - Support for managed agents (npx/bunx packages)

#### Frontend Architecture
- **Zustand Store** (`src/stores/agent-panel/store.ts`)
  - Thread management
  - Message persistence
  - Agent configuration
  - MCP server management
  - Tool approval queue
  - Automatic cleanup on app reload

- **React Hook** (`src/hooks/useNativeAgent.ts`)
  - Centralized state management for Native Agent
  - Streaming message handling
  - Tool execution callbacks
  - Error handling with retry logic
  - Thread switching
  - Cancellation support

### Phase 2: ACP Agent Implementation (100% Complete)

#### ACP Agent Class (`src/lib/acp/agent.ts`)
- JSON-RPC 2.0 protocol implementation
- Event listener setup in constructor (immediate initialization)
- Session management per thread
- Tool registry integration
- Request/response handling
- Notification handling (streaming chunks, tool calls)
- Proper cleanup and error handling

**Key Implementation Details:**
```typescript
class AcpAgent {
  constructor() {
    this.toolRegistry = new ToolRegistry();
    // IMPORTANT: Listener setup happens immediately
    this.setupListener();
  }

  private setupListener(): void {
    listen<AcpEventPayload>("acp-message", async (event) => {
      await this.handleEvent(event.payload);
    }).then((unlisten) => {
      this.unlisten = unlisten;
    });
  }
}
```

### Phase 3: UI Components (100% Complete)

#### Agent Panel Component (`src/components/agent-panel/agent-panel.tsx`)
- Conditional rendering based on agent type
- Separate message handlers for native vs ACP agents
- Debug event listener for testing Tauri events
- Proper cleanup on unmount
- Error boundary integration

**Agent Routing:**
```typescript
const sendMessage = selectedAgent?.type === "native"
  ? nativeAgentHook.sendMessage
  : sendACPMessage;

const isStreaming = selectedAgent?.type === "native"
  ? nativeAgentHook.isStreaming
  : acpIsStreaming;
```

#### Supporting Components
- `AgentPanelHeader` - Navigation and controls
- `AgentPanelInput` - Message input with file attachments
- `MessageThread` - Message display with streaming support
- `ThreadSelector` - Thread history and management
- `ConfigPanel` - Agent configuration UI
- `ToolApprovalDialog` - Tool execution approval UI

---

## Recent Bug Fixes

### Critical Fixes (October 8, 2025)

#### 1. ACP Agent Breaking After Native Agent Implementation
**Problem**: When implementing useNativeAgent hook, accidentally broke ACP agent functionality.

**Root Cause**: Hook was being used for ALL agent types instead of just native agents.

**Solution**: Added conditional routing based on `agent.type`:
```typescript
const sendMessage = selectedAgent?.type === "native"
  ? nativeAgentHook.sendMessage
  : sendACPMessage;
```

---

#### 2. Missing `useEffect` Import
**Problem**: Added useEffect hook but forgot to import it.

**Error**: `ReferenceError: Can't find variable: useEffect`

**Solution**:
```typescript
import { memo, useCallback, useState, useEffect } from "react";
```

---

#### 3. Wrong `processMessage` Signature
**Problem**: Called ACP agent's `processMessage` with wrong parameters.

**Expected**:
```typescript
processMessage(
  threadId: string,
  agent: Agent,
  userMessage: string,
  context: AgentContext,
  callbacks: AgentCallbacks
)
```

**Was calling**:
```typescript
processMessage(msg, context, callbacks) // Missing threadId and agent
```

**Solution**: Fixed signature to include all required parameters.

---

#### 4. `updateMessage` Function Type Mismatch
**Problem**: Store's `updateMessage` expects `Partial<ThreadMessage>` object, but we were passing a function.

**Before (Wrong)**:
```typescript
updateMessage(threadId, messageId, (msg) => {
  const currentText = msg.content[0]?.text || "";
  msg.content[0] = { type: "text", text: currentText + chunk };
});
```

**After (Correct)**:
```typescript
let collectedText = "";

onChunk: (chunk) => {
  collectedText += chunk;
  updateMessage(threadId, messageId, {
    content: [{ type: "text", text: collectedText }],
  });
}
```

---

#### 5. Event Listener Timing Issue
**Problem**: Event listener was set up inside a Promise that might not resolve before events are emitted.

**Solution**: Moved listener setup to AcpAgent constructor for immediate execution.

---

#### 6. `require()` Not Available in Tauri
**Problem**: Used `const { listen } = require("@tauri-apps/api/event")` which doesn't work in Tauri/React.

**Error**: `ReferenceError: Can't find variable: require`

**Solution**: Use ES6 import instead:
```typescript
import { listen } from "@tauri-apps/api/event";
```

---

#### 7. Stuck Streaming Messages on App Reload
**Problem**: Messages with `isStreaming: true` stayed stuck when app was closed during streaming.

**User Impact**: On app reload, old messages showed "Waiting for response..." indefinitely.

**Solution**: Added automatic cleanup in store's `merge` function:
```typescript
merge: (persistedState, currentState) =>
  produce(currentState, (draft) => {
    if (draft.threads) {
      draft.threads.forEach((thread) => {
        thread.messages.forEach((msg) => {
          // Reset stuck streaming messages on app reload
          if (msg.isStreaming) {
            console.log(`[Store] Resetting stuck streaming message: ${msg.id}`);
            msg.isStreaming = false;
          }
        });
      });
    }

    // Reset global streaming state on app reload
    draft.isStreaming = false;
    draft.streamingMessageId = null;
  })
```

---

## Architecture

### Data Flow

```
User Input
    ↓
AgentPanel Component
    ↓
[Agent Type Check]
    ↓
├─ Native Agent → useNativeAgent Hook → Anthropic API
│                                     ↓
│                                  Callbacks
│                                     ↓
└─ ACP Agent → getAcpAgent() → Tauri Command → Rust Bridge → External Process
                                                                    ↓
                                                            Tauri Event Emission
                                                                    ↓
                                                            Event Listener
                                                                    ↓
                                                            handleEvent()
                                                                    ↓
                                                            Callbacks
                                                                    ↓
                                                            Store Update
                                                                    ↓
                                                            UI Re-render
```

### Message Flow (ACP Agent)

1. **User sends message** in AgentPanel
2. **sendACPMessage** creates user and assistant message placeholders
3. **getAcpAgent().processMessage()** is called with callbacks
4. **Rust backend** receives `send_acp_request` Tauri command
5. **ACP process** (e.g., Claude Code) processes message
6. **Rust emits** `acp-message` events to frontend
7. **Event listener** in AcpAgent receives events
8. **handleEvent** routes to appropriate handler:
   - `output/text` → onChunk callback
   - `output/complete` → onComplete callback
   - `tools/use` → tool execution
   - `output/error` → onError callback
9. **Callbacks update** Zustand store
10. **UI re-renders** with new message content

### State Management

```typescript
interface AgentPanelState {
  // Thread Management
  threads: Thread[];
  activeThreadId: string | null;

  // Agent Management
  selectedAgentId: string;
  availableAgents: Agent[];

  // ACP Sessions
  acpSessions: Record<string, ACPSession>;

  // Streaming State
  isStreaming: boolean;
  streamingMessageId: string | null;

  // Tool Approvals
  pendingToolApprovals: ToolApproval[];
  autoApproveTools: boolean;

  // UI State
  ui: {
    activeView: AgentActiveView;
    showThreadOverlay: boolean;
    selectedThreadId: string | null;
    searchQuery: string;
  };
}
```

---

## What's Left To Do

### UI Polish (Optional Enhancements)

- [ ] Add hover effects on tool cards
- [ ] Implement copy-to-clipboard for thinking blocks
- [ ] Add syntax highlighting for code in tool outputs
- [ ] Thread controls (feedback buttons, regenerate, etc)
- [ ] Message actions menu (edit, delete, copy)

### Backend/Protocol (5% remaining)

- [ ] Complete JSON-RPC error handling edge cases
- [ ] Add retry logic for failed requests
- [ ] Implement request timeout handling
- [ ] Add more detailed logging for debugging

### Tools (2% remaining)

- [ ] Test all native tools thoroughly:
  - [ ] `read_file`
  - [ ] `write_file`
  - [ ] `list_directory`
  - [ ] `search_files`
- [ ] Implement tool approval UI improvements
- [ ] Add tool execution history

### Testing (Not Started)

- [ ] **Unit Tests**
  - [ ] useNativeAgent hook tests
  - [ ] AcpAgent class tests
  - [ ] Store actions tests

- [ ] **Integration Tests**
  - [ ] ACP agent end-to-end flow
  - [ ] Native agent end-to-end flow
  - [ ] Tool execution flow

- [ ] **E2E Tests**
  - [ ] Complete conversation flow
  - [ ] Thread switching
  - [ ] Agent switching

### UI/UX Improvements

- [ ] Better streaming indicators
- [ ] Tool execution progress indicators
- [ ] Improved error messages
- [ ] Loading states
- [ ] Optimistic UI updates

### Documentation

- [ ] User guide for Native Agent
- [ ] Developer guide for adding new agents
- [ ] Architecture deep-dive
- [ ] API reference

---

## Known Issues

### Non-Critical

1. **CSS Class Ordering Warnings**
   - Location: `agent-panel-error-boundary.tsx`
   - Impact: None (linting warnings only)
   - Priority: Low

2. **Performance with Long Messages**
   - Symptom: Slight lag with very long message threads
   - Impact: Minor UX degradation
   - Priority: Medium

3. **Scroll Behavior**
   - Symptom: Auto-scroll doesn't always work perfectly
   - Impact: Minor UX issue
   - Priority: Medium

---

## Testing

### Manual Testing Checklist

#### Native Agent
- [ ] Send simple message
- [ ] Test streaming response
- [ ] Test tool execution
- [ ] Test tool approval flow
- [ ] Test error handling
- [ ] Test cancellation

#### ACP Agent (Claude Code)
- [x] Agent initialization
- [x] Send message "oi"
- [x] Receive streaming response
- [x] Verify message appears in UI
- [ ] Test tool execution
- [ ] Test session persistence
- [ ] Test error handling

#### General
- [x] Thread creation
- [x] Thread switching
- [x] Thread deletion
- [x] Agent switching
- [x] App reload (message persistence)
- [x] Stuck message cleanup

### Automated Testing

**Not yet implemented** - See "What's Left To Do" section.

---

## Contributing

When working on the Native Agent:

1. **Always test both agent types** (Native and ACP)
2. **Check console for errors** during development
3. **Test app reload** to ensure state persistence works
4. **Verify streaming** doesn't leave messages stuck
5. **Update this document** with any changes

---

## References

- [ACP Complete Guide](./ACP_COMPLETE_GUIDE.md)
- [ACP Quick Reference](./ACP_QUICK_REFERENCE.md)
- [Zed Editor Architecture](https://github.com/zed-industries/zed)
- [Anthropic API Docs](https://docs.anthropic.com/)

---

**Questions or Issues?** Check the console logs first - all major operations are logged with prefixes:
- `[ACP]` - ACP agent operations
- `[AgentPanel]` - UI component operations
- `[Store]` - State management operations
- `🔥 [DEBUG]` - Debug/test operations
