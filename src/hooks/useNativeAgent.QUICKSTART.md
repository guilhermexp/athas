# useNativeAgent - Quick Start Guide

## Installation

The hook is already available in the project. Just import it:

```typescript
import { useNativeAgent } from '@/hooks/useNativeAgent';
```

## Basic Usage (30 seconds)

```typescript
function MyComponent() {
  const { sendMessage, isStreaming, messages } = useNativeAgent();

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content[0]?.text}</div>
      ))}
      <button
        onClick={() => sendMessage('Hello!')}
        disabled={isStreaming}
      >
        Send
      </button>
    </div>
  );
}
```

## Common Patterns

### 1. Simple Chat
```typescript
const { sendMessage, messages } = useNativeAgent();
```

### 2. With Loading State
```typescript
const { sendMessage, isStreaming } = useNativeAgent();

return (
  <button disabled={isStreaming}>
    {isStreaming ? 'Sending...' : 'Send'}
  </button>
);
```

### 3. With Error Handling
```typescript
const { sendMessage, error } = useNativeAgent();

return (
  <div>
    {error && <div className="error">{error}</div>}
    <button onClick={() => sendMessage('Hi')}>Send</button>
  </div>
);
```

### 4. With Cancellation
```typescript
const { sendMessage, isStreaming, cancelStreaming } = useNativeAgent();

return (
  <div>
    <button onClick={() => sendMessage('Long task...')}>Start</button>
    {isStreaming && (
      <button onClick={cancelStreaming}>Cancel</button>
    )}
  </div>
);
```

### 5. With Custom Callbacks
```typescript
const { sendMessage } = useNativeAgent({
  callbacks: {
    onComplete: () => {
      console.log('Done!');
      playNotificationSound();
    },
  },
});
```

## API Cheat Sheet

### State
| Property | Type | Description |
|----------|------|-------------|
| `isStreaming` | `boolean` | Whether streaming is active |
| `currentMessage` | `string` | Current chunk being streamed |
| `error` | `string \| null` | Current error, if any |
| `isInitialized` | `boolean` | Whether agent is ready |
| `threadId` | `string \| null` | Active thread ID |
| `messages` | `ThreadMessage[]` | All thread messages |

### Methods
| Method | Signature | Description |
|--------|-----------|-------------|
| `sendMessage` | `(msg: string) => Promise<void>` | Send a message |
| `cancelStreaming` | `() => void` | Cancel current stream |
| `initialize` | `() => Promise<void>` | Initialize agent |
| `reset` | `() => void` | Reset all state |
| `createThread` | `(title?: string) => string` | Create new thread |
| `switchThread` | `(id: string) => void` | Switch threads |

## Options

```typescript
useNativeAgent({
  agentId: 'native',           // Which agent to use
  threadId: 'thread_123',      // Which thread to use
  autoInitialize: true,        // Auto-init on mount
  callbacks: {                 // Custom callbacks
    onChunk: (chunk) => {},
    onComplete: (text) => {},
    onError: (error) => {},
    onToolStart: (tool, input) => {},
    onToolComplete: (tool, output) => {},
  },
});
```

## Examples

See `/src/hooks/useNativeAgent.example.tsx` for 8 complete examples.

## Full Documentation

See `/src/hooks/useNativeAgent.README.md` for complete documentation.

## TypeScript Support

```typescript
import type {
  UseNativeAgentOptions,
  UseNativeAgentReturn
} from '@/hooks/useNativeAgent';
```

## Need Help?

1. Check examples: `useNativeAgent.example.tsx`
2. Read docs: `useNativeAgent.README.md`
3. View types: `useNativeAgent.types.ts`
4. Read reports: Root directory `.md` files
