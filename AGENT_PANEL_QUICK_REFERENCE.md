# Agent Panel UI - Quick Reference Card

**For Developers:** Quick reference for using the new Agent Panel UI components.

---

## 🚀 Quick Start

### Import Components
```typescript
import { AgentPanel } from "@/components/agent-panel/agent-panel";
import { ToolApprovalDialog } from "@/components/agent-panel/tool-approval-dialog";
import { AgentPanelErrorBoundary } from "@/components/agent-panel/agent-panel-error-boundary";
```

### Basic Usage
```typescript
// Wrap your app with ToastProvider
<ToastProvider>
  <AgentPanel />
</ToastProvider>

// Error boundary is already integrated in AgentPanel
// No additional wrapping needed!
```

---

## 📦 Store Hooks

### Get Store State
```typescript
import { useAgentPanelStore } from "@/stores/agent-panel/store";

const {
  isStreaming,              // boolean
  streamingMessageId,       // string | null
  pendingToolApprovals,     // ToolApproval[]
  ui,                       // AgentPanelUIState
} = useAgentPanelStore();
```

### Store Actions
```typescript
const {
  cancelStreaming,          // () => Promise<void>
  approveToolCall,          // (id: string) => void
  rejectToolCall,           // (id: string) => void
  setIsStreaming,           // (streaming: boolean) => void
  setStreamingMessageId,    // (id: string | null) => void
} = useAgentPanelStore();
```

---

## 🎨 Toast Notifications

### Show Toast
```typescript
import { useToast } from "@/contexts/toast-context";

const { showToast, dismissToast, updateToast } = useToast();

// Success
showToast({
  message: "Operation completed",
  type: "success",
  duration: 2000
});

// Error
showToast({
  message: "Something went wrong",
  type: "error",
  duration: 3000
});

// Info
showToast({
  message: "Processing...",
  type: "info",
  duration: 0  // Won't auto-dismiss
});

// Warning
showToast({
  message: "Please review before continuing",
  type: "warning",
  duration: 5000
});
```

### Toast with Action
```typescript
const toastId = showToast({
  message: "Failed to save changes",
  type: "error",
  duration: 0,
  action: {
    label: "Retry",
    onClick: () => handleRetry()
  }
});

// Manually dismiss
dismissToast(toastId);

// Update toast
updateToast(toastId, {
  message: "Retrying...",
  type: "info"
});
```

---

## 🛠️ Tool Approval

### Check Pending Approvals
```typescript
const { pendingToolApprovals } = useAgentPanelStore();
const hasPending = pendingToolApprovals.length > 0;

// Get specific approval
const approval = pendingToolApprovals.find(a => a.id === approvalId);
```

### Approve/Reject Tools
```typescript
const { approveToolCall, rejectToolCall } = useAgentPanelStore();

// Approve single tool
approveToolCall(approvalId);

// Reject single tool
rejectToolCall(approvalId);

// Approve all pending
pendingToolApprovals.forEach(approval => {
  if (approval.status === "pending") {
    approveToolCall(approval.id);
  }
});
```

### Create Tool Approval
```typescript
import type { ToolApproval } from "@/components/agent-panel/types";

const approval: ToolApproval = {
  id: `approval_${Date.now()}`,
  messageId: "msg_123",
  threadId: "thread_456",
  toolName: "read_file",
  toolInput: { path: "/config.json" },
  timestamp: new Date(),
  status: "pending"
};

addToolApproval(approval);
```

---

## 🎯 Streaming Control

### Check Streaming State
```typescript
const { isStreaming, streamingMessageId } = useAgentPanelStore();

if (isStreaming) {
  console.log(`Currently streaming message: ${streamingMessageId}`);
}
```

### Cancel Streaming
```typescript
const { cancelStreaming } = useAgentPanelStore();
const { showToast } = useToast();

const handleCancel = async () => {
  try {
    await cancelStreaming();
    showToast({
      message: "Streaming cancelled",
      type: "info",
      duration: 3000
    });
  } catch (error) {
    showToast({
      message: "Failed to cancel",
      type: "error",
      duration: 3000
    });
  }
};
```

### Start Streaming
```typescript
const { setIsStreaming, setStreamingMessageId } = useAgentPanelStore();

// Before starting stream
setIsStreaming(true);
setStreamingMessageId(messageId);

// After stream completes
setIsStreaming(false);
setStreamingMessageId(null);
```

---

## 📝 Message Types

### Thread Message
```typescript
import type { ThreadMessage } from "@/components/agent-panel/types";

const message: ThreadMessage = {
  id: "msg_123",
  role: "assistant",
  content: [{
    type: "text",
    text: "Response text"
  }],
  timestamp: new Date(),
  isStreaming: false,
  toolCalls: []
};
```

### Tool Call
```typescript
import type { ToolCall } from "@/components/agent-panel/types";

const toolCall: ToolCall = {
  id: "tool_123",
  name: "read_file",
  input: { path: "/file.txt" },
  output: "File contents",
  status: "complete",
  timestamp: new Date(),
  duration: 234  // milliseconds
};
```

---

## 🎨 Styling

### CSS Variables
```css
--color-text              /* Primary text */
--color-text-lighter      /* Secondary text */
--color-border            /* Borders */
--color-hover             /* Hover states */
--color-selected          /* Selected states */
--color-primary-bg        /* Main background */
--color-secondary-bg      /* Secondary background */
--font-ui                 /* UI font */
--font-mono               /* Code font */
```

### Common Classes
```typescript
cn(
  "text-text",           // Primary text color
  "text-text-lighter",   // Secondary text color
  "bg-primary-bg",       // Main background
  "bg-secondary-bg",     // Secondary background
  "border-border",       // Border color
  "hover:bg-hover",      // Hover state
  "rounded-md",          // Medium border radius
  "transition-colors",   // Smooth color transitions
)
```

---

## 🔔 Event Handlers

### Message Events
```typescript
const handleSendMessage = async (content: string) => {
  try {
    await sendMessage(content);
    showToast({
      message: "Message sent",
      type: "success",
      duration: 2000
    });
  } catch (error) {
    showToast({
      message: "Failed to send",
      type: "error",
      duration: 3000
    });
  }
};
```

### Tool Events
```typescript
const handleToolStart = (toolName: string, input: any) => {
  console.log(`Starting tool: ${toolName}`, input);
  showToast({
    message: `Executing ${toolName}...`,
    type: "info",
    duration: 0
  });
};

const handleToolComplete = (toolName: string, output: any) => {
  console.log(`Tool completed: ${toolName}`, output);
  showToast({
    message: `${toolName} completed`,
    type: "success",
    duration: 2000
  });
};

const handleToolError = (toolName: string, error: string) => {
  console.error(`Tool error: ${toolName}`, error);
  showToast({
    message: `${toolName} failed: ${error}`,
    type: "error",
    duration: 5000,
    action: {
      label: "Retry",
      onClick: () => retryTool(toolName)
    }
  });
};
```

---

## 🎹 Keyboard Shortcuts

### Input Field
```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  // Send message
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }

  // New line
  if (e.key === "Enter" && e.shiftKey) {
    // Default behavior
  }

  // Cancel streaming
  if (e.key === "Escape" && isStreaming) {
    e.preventDefault();
    cancelStreaming();
  }
};
```

---

## 🧪 Testing Utilities

### Mock Store State
```typescript
import { useAgentPanelStore } from "@/stores/agent-panel/store";

// Set mock state
useAgentPanelStore.setState({
  isStreaming: true,
  streamingMessageId: "msg_123",
  pendingToolApprovals: [{
    id: "approval_1",
    messageId: "msg_123",
    threadId: "thread_1",
    toolName: "read_file",
    toolInput: { path: "/test.txt" },
    timestamp: new Date(),
    status: "pending"
  }]
});
```

### Mock Toast
```typescript
const mockShowToast = jest.fn();

jest.mock("@/contexts/toast-context", () => ({
  useToast: () => ({
    showToast: mockShowToast,
    dismissToast: jest.fn(),
    updateToast: jest.fn()
  })
}));

// Verify toast was shown
expect(mockShowToast).toHaveBeenCalledWith({
  message: "Message sent",
  type: "success",
  duration: 2000
});
```

---

## 🐛 Common Issues

### Toast Not Showing
**Problem:** Toast notifications don't appear
**Solution:** Ensure `<ToastProvider>` wraps your app
```typescript
// App.tsx
<ToastProvider>
  <YourApp />
</ToastProvider>
```

### Store State Not Updating
**Problem:** Store updates don't trigger re-renders
**Solution:** Use store hooks, not direct store access
```typescript
// ❌ Bad
const state = useAgentPanelStore.getState();

// ✅ Good
const { isStreaming } = useAgentPanelStore();
```

### Error Boundary Not Catching Errors
**Problem:** Errors bypass error boundary
**Solution:** Errors in event handlers need try-catch
```typescript
// Event handlers don't trigger error boundaries
const handleClick = async () => {
  try {
    await riskyOperation();
  } catch (error) {
    showToast({
      message: error.message,
      type: "error"
    });
  }
};
```

---

## 📊 Performance Tips

### Memoize Components
```typescript
export const MyComponent = memo(({ data }) => {
  // Component content
});
```

### Memoize Callbacks
```typescript
const handleAction = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### Selective Store Subscriptions
```typescript
// ❌ Re-renders on any store change
const store = useAgentPanelStore();

// ✅ Only re-renders when isStreaming changes
const isStreaming = useAgentPanelStore(state => state.isStreaming);
```

---

## 📚 Type Definitions

### Import Types
```typescript
import type {
  ThreadMessage,
  ToolCall,
  ToolApproval,
  AgentCallbacks,
  AgentContext,
} from "@/components/agent-panel/types";
```

### Common Types
```typescript
type ToolStatus = "pending" | "running" | "complete" | "error" | "rejected";
type ToastType = "info" | "success" | "warning" | "error";
type ConnectionStatus = "streaming" | "waiting" | "idle";
```

---

## 🔗 Useful Links

### Documentation
- [Main Implementation Report](./AGENT_PANEL_UI_IMPROVEMENTS.md)
- [Visual Guide](./AGENT_PANEL_UI_VISUAL_GUIDE.md)
- [Component Source](./src/components/agent-panel/)

### Store Documentation
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [Immer Docs](https://immerjs.github.io/immer/)

### UI Components
- [Lucide Icons](https://lucide.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 📋 Cheat Sheet

```typescript
// Import everything you need
import { useAgentPanelStore } from "@/stores/agent-panel/store";
import { useToast } from "@/contexts/toast-context";
import type { ToolApproval, ToolCall } from "@/components/agent-panel/types";

// Get store state and actions
const {
  isStreaming,
  pendingToolApprovals,
  cancelStreaming,
  approveToolCall,
  rejectToolCall
} = useAgentPanelStore();

// Show toasts
const { showToast } = useToast();

// Success
showToast({ message: "Done!", type: "success", duration: 2000 });

// Error
showToast({ message: "Oops!", type: "error", duration: 3000 });

// Cancel streaming
await cancelStreaming();

// Approve tool
approveToolCall(approvalId);
```

---

**Last Updated:** 2025-10-07
**For:** Athas Code Editor - Agent Panel UI
