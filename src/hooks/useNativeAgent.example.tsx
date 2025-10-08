/**
 * useNativeAgent Hook - Example Usage
 *
 * This file demonstrates various ways to use the useNativeAgent hook
 * in different scenarios.
 */

import { useNativeAgent } from "./useNativeAgent";

// ============================================================================
// Example 1: Basic Usage
// ============================================================================

export function BasicAgentExample() {
  const { sendMessage, isStreaming, messages, error } = useNativeAgent();

  const handleSubmit = async (text: string) => {
    await sendMessage(text);
  };

  return (
    <div>
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.role}:</strong> {msg.content[0]?.text}
          </div>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      <input
        type="text"
        disabled={isStreaming}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e.currentTarget.value);
          }
        }}
      />

      {isStreaming && <div>Streaming...</div>}
    </div>
  );
}

// ============================================================================
// Example 2: With Custom Callbacks
// ============================================================================

export function CustomCallbacksExample() {
  const { sendMessage, isStreaming, currentMessage } = useNativeAgent({
    callbacks: {
      onChunk: (chunk) => {
        console.log("Received chunk:", chunk);
      },
      onComplete: (finalText) => {
        console.log("Message completed:", finalText);
        // Could trigger a sound notification here
      },
      onError: (error) => {
        console.error("Error occurred:", error);
        // Could show a toast notification
      },
      onToolStart: (toolName, input) => {
        console.log(`Tool ${toolName} started with input:`, input);
      },
      onToolComplete: (toolName, output) => {
        console.log(`Tool ${toolName} completed with output:`, output);
      },
    },
  });

  return (
    <div>
      <button onClick={() => sendMessage("Hello!")} disabled={isStreaming}>
        Send Message
      </button>
      {currentMessage && <div>Currently streaming: {currentMessage}</div>}
    </div>
  );
}

// ============================================================================
// Example 3: With Thread Management
// ============================================================================

export function ThreadManagementExample() {
  const { sendMessage, isStreaming, messages, threadId, createThread, switchThread, reset } =
    useNativeAgent();

  const handleNewThread = () => {
    const newThreadId = createThread("My New Thread");
    switchThread(newThreadId);
  };

  const handleReset = () => {
    reset();
  };

  return (
    <div>
      <div>Current Thread: {threadId || "None"}</div>
      <button onClick={handleNewThread}>New Thread</button>
      <button onClick={handleReset}>Reset</button>

      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.role}:</strong> {msg.content[0]?.text}
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="tool-calls">
                {msg.toolCalls.map((tc) => (
                  <div key={tc.id}>
                    Tool: {tc.name} - Status: {tc.status}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <input
        type="text"
        disabled={isStreaming}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            sendMessage(e.currentTarget.value);
          }
        }}
      />
    </div>
  );
}

// ============================================================================
// Example 4: With Cancellation
// ============================================================================

export function CancellationExample() {
  const { sendMessage, isStreaming, cancelStreaming, currentMessage } = useNativeAgent();

  const handleCancel = () => {
    cancelStreaming();
  };

  return (
    <div>
      <button onClick={() => sendMessage("Write a long story about...")} disabled={isStreaming}>
        Start Long Task
      </button>

      {isStreaming && (
        <div>
          <div>Streaming: {currentMessage}</div>
          <button onClick={handleCancel}>Cancel</button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Example 5: With Manual Initialization
// ============================================================================

export function ManualInitExample() {
  const { sendMessage, initialize, isInitialized, error } = useNativeAgent({
    autoInitialize: false,
  });

  const handleInit = async () => {
    await initialize();
  };

  if (!isInitialized) {
    return (
      <div>
        <button onClick={handleInit}>Initialize Agent</button>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => sendMessage("Hello!")}>Send Message</button>
    </div>
  );
}

// ============================================================================
// Example 6: With Specific Agent/Thread
// ============================================================================

export function SpecificAgentThreadExample() {
  const { sendMessage, messages } = useNativeAgent({
    agentId: "native", // Use specific agent
    threadId: "thread_123", // Use specific thread
  });

  return (
    <div>
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id}>{msg.content[0]?.text}</div>
        ))}
      </div>
      <button onClick={() => sendMessage("Hello from specific thread!")}>Send</button>
    </div>
  );
}

// ============================================================================
// Example 7: With Error Handling and Retry
// ============================================================================

export function ErrorHandlingExample() {
  const { sendMessage, error, isStreaming, reset } = useNativeAgent({
    callbacks: {
      onError: (errorMsg) => {
        console.error("Agent error:", errorMsg);
        // Could implement custom retry logic here
      },
    },
  });

  const handleRetry = async () => {
    if (error) {
      reset();
      // Retry the last message
      await sendMessage("Retry the last request");
    }
  };

  return (
    <div>
      {error && (
        <div className="error-banner">
          <span>Error: {error}</span>
          <button onClick={handleRetry}>Retry</button>
        </div>
      )}

      <button onClick={() => sendMessage("Test message")} disabled={isStreaming}>
        Send Message
      </button>
    </div>
  );
}

// ============================================================================
// Example 8: Complete Chat Interface
// ============================================================================

export function CompleteChatExample() {
  const { sendMessage, isStreaming, messages, error, currentMessage, cancelStreaming, reset } =
    useNativeAgent({
      autoInitialize: true,
      callbacks: {
        onComplete: () => {
          // Play notification sound
          console.log("Message complete!");
        },
      },
    });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const message = formData.get("message") as string;
    if (message.trim()) {
      await sendMessage(message);
      e.currentTarget.reset();
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <h2>Agent Chat</h2>
        <button onClick={reset}>Reset</button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message message-${msg.role}`}>
            <div className="message-content">
              {msg.content[0]?.text}
              {msg.isStreaming && <span className="streaming-indicator">...</span>}
            </div>

            {/* Tool Calls */}
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="tool-calls">
                {msg.toolCalls.map((tc) => (
                  <div key={tc.id} className={`tool-call tool-call-${tc.status}`}>
                    <strong>{tc.name}</strong>
                    <span className="status">{tc.status}</span>
                    {tc.output && <pre>{JSON.stringify(tc.output, null, 2)}</pre>}
                    {tc.error && <div className="error">{tc.error}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Current Streaming Message */}
        {isStreaming && currentMessage && (
          <div className="current-stream">
            <div>{currentMessage}</div>
            <button onClick={cancelStreaming}>Cancel</button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => reset()}>Dismiss</button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="chat-input">
        <input
          type="text"
          name="message"
          placeholder="Type your message..."
          disabled={isStreaming}
          autoComplete="off"
        />
        <button type="submit" disabled={isStreaming}>
          {isStreaming ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
