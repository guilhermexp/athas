# useNativeAgent Hook

A reusable React hook for managing Native Agent state and interactions in the Athas code editor.

## Overview

The `useNativeAgent` hook provides a clean, type-safe interface for integrating the Native Agent (Anthropic Claude) into React components. It handles all the complexity of agent initialization, message streaming, tool execution, and state management.

## Features

- **Automatic Initialization**: Agent initializes automatically on mount (configurable)
- **Streaming Support**: Real-time streaming of agent responses with chunk-by-chunk updates
- **Tool Execution**: Built-in support for tool calls with approval workflow
- **Error Handling**: Comprehensive error handling with retry logic
- **Cancellation**: Cancel streaming requests at any time
- **Thread Management**: Create, switch, and manage conversation threads
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Workspace Context**: Automatic integration with editor buffers and project state
- **Custom Callbacks**: Extend default behavior with custom callback functions

## Basic Usage

```tsx
import { useNativeAgent } from "@/hooks/useNativeAgent";

function MyComponent() {
  const { sendMessage, isStreaming, messages, error } = useNativeAgent();

  const handleSubmit = async (text: string) => {
    await sendMessage(text);
  };

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content[0]?.text}</div>
      ))}
      {error && <div className="error">{error}</div>}
      <button onClick={() => handleSubmit("Hello!")} disabled={isStreaming}>
        Send
      </button>
    </div>
  );
}
```

## API Reference

### Hook Options

```typescript
interface UseNativeAgentOptions {
  /** Agent ID to use (defaults to currently selected agent) */
  agentId?: string;

  /** Thread ID to use (defaults to active thread) */
  threadId?: string;

  /** Auto-initialize the agent on mount (default: true) */
  autoInitialize?: boolean;

  /** Custom callbacks to merge with default callbacks */
  callbacks?: Partial<AgentCallbacks>;
}
```

### Return Value

```typescript
interface UseNativeAgentReturn {
  // State
  isStreaming: boolean;        // Whether a message is currently streaming
  currentMessage: string;      // Current streaming message content
  error: string | null;        // Current error message, if any
  isInitialized: boolean;      // Whether the agent is initialized
  threadId: string | null;     // Current thread ID
  messages: ThreadMessage[];   // All messages in the current thread

  // Methods
  sendMessage: (message: string) => Promise<void>;  // Send a message to the agent
  cancelStreaming: () => void;                      // Cancel the current streaming
  initialize: () => Promise<void>;                  // Manually initialize the agent
  reset: () => void;                                // Reset all state

  // Thread helpers
  createThread: (title?: string) => string;         // Create a new thread
  switchThread: (threadId: string) => void;         // Switch to a different thread
}
```

## Advanced Usage

### Custom Callbacks

You can provide custom callbacks to extend the default behavior:

```tsx
const { sendMessage } = useNativeAgent({
  callbacks: {
    onChunk: (chunk) => {
      console.log("Received:", chunk);
    },
    onComplete: (finalText) => {
      playNotificationSound();
    },
    onToolStart: (toolName, input) => {
      showToolNotification(toolName);
    },
  },
});
```

### Manual Initialization

Disable auto-initialization and initialize manually:

```tsx
const { initialize, isInitialized, sendMessage } = useNativeAgent({
  autoInitialize: false,
});

// Later...
await initialize();
```

### Thread Management

Create and switch between threads:

```tsx
const { createThread, switchThread, threadId } = useNativeAgent();

const handleNewThread = () => {
  const newThreadId = createThread("My Custom Thread");
  switchThread(newThreadId);
};
```

### Cancellation

Cancel a long-running streaming request:

```tsx
const { sendMessage, isStreaming, cancelStreaming } = useNativeAgent();

const handleCancel = () => {
  if (isStreaming) {
    cancelStreaming();
  }
};
```

## Type Definitions

All types are exported from the hook file:

```typescript
import type {
  UseNativeAgentOptions,
  UseNativeAgentReturn,
} from "@/hooks/useNativeAgent";
```

Additional types are available from the agent panel types:

```typescript
import type {
  ThreadMessage,
  ToolCall,
  AgentCallbacks,
  AgentContext,
} from "@/components/agent-panel/types";
```

## Implementation Details

### State Management

The hook integrates with the global `AgentPanelStore` via Zustand for:
- Thread persistence
- Message history
- Agent configuration
- Tool approval settings

### Workspace Context

The hook automatically gathers workspace context:
- Active file and its content
- All open buffers
- Project root path
- Selected files

This context is passed to the agent for better-informed responses.

### Error Handling

The hook implements retry logic via the `retry` utility with:
- 3 maximum attempts
- 1000ms initial delay
- Exponential backoff

### Cleanup

The hook properly cleans up on unmount:
- Cancels any ongoing streaming
- Clears message refs
- Resets local state

## Best Practices

1. **Use auto-initialization**: Let the hook initialize automatically unless you have a specific reason not to
2. **Handle errors**: Always display the `error` state to users
3. **Show streaming state**: Disable inputs and show loading indicators when `isStreaming` is true
4. **Cleanup**: The hook handles cleanup automatically, but you can call `reset()` manually if needed
5. **Custom callbacks**: Use custom callbacks for side effects, not state management
6. **Thread switching**: Always cancel streaming before switching threads

## Examples

See `useNativeAgent.example.tsx` for comprehensive examples including:
- Basic usage
- Custom callbacks
- Thread management
- Error handling
- Cancellation
- Complete chat interface

## Related

- **Native Agent**: `/src/lib/native-agent/agent.ts`
- **Agent Panel Store**: `/src/stores/agent-panel/store.ts`
- **Agent Types**: `/src/components/agent-panel/types.ts`
