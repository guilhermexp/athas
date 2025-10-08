import { memo, useEffect, useRef } from "react";
import type { ThreadMessage } from "@/components/agent-panel/types";
import { MessageItem } from "./message-item";

interface MessageThreadProps {
  messages: ThreadMessage[];
}

/**
 * Message Thread - Based on Zed's design
 * Displays all messages in the current thread
 */
export const MessageThread = memo(({ messages }: MessageThreadProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden bg-primary-bg"
      style={{
        padding: "0",
        fontFamily: "var(--font-ui)",
      }}
    >
      {/* Messages */}
      {messages.map((message, index) => {
        // Check if this is the first assistant message in a sequence
        const isFirstAssistantInSequence =
          message.role === "assistant" && (index === 0 || messages[index - 1].role !== "assistant");

        // Check if this is the last message
        const isLastMessage = index === messages.length - 1;

        return (
          <MessageItem
            key={message.id}
            message={message}
            isFirstInSequence={isFirstAssistantInSequence}
            isLastMessage={isLastMessage}
          />
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  );
});

MessageThread.displayName = "MessageThread";
