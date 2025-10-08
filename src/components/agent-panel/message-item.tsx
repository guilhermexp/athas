import { Check, Copy, Loader2 } from "lucide-react";
import { memo, useState } from "react";
import type { ThreadMessage } from "@/components/agent-panel/types";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import { cn } from "@/utils/cn";
import { ThinkingBlock } from "./thinking-block";
import { ToolCallCard } from "./tool-call-card";

interface MessageItemProps {
  message: ThreadMessage;
  isFirstInSequence?: boolean;
  isLastMessage?: boolean;
}

/**
 * Message Item - Based on Zed's design
 * Renders a single message (user or assistant)
 */
export const MessageItem = memo(
  ({ message, isFirstInSequence = false, isLastMessage = false }: MessageItemProps) => {
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

    const handleCopy = async (content: string, messageId: string) => {
      try {
        await navigator.clipboard.writeText(content);
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
      } catch (err) {
        console.error("Failed to copy message:", err);
      }
    };

    // Extract text content
    const textContent = message.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    // Extract thinking blocks
    const thinkingBlocks = message.content.filter((c) => c.type === "thinking");

    // Check if this message is primarily tool calls
    const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
    const hasTextContent = textContent.trim().length > 0;
    const hasThinking = thinkingBlocks.length > 0;
    const isWaitingForFirstChunk =
      message.isStreaming && !hasTextContent && !hasToolCalls && !hasThinking;

    if (message.role === "user") {
      return (
        <div className="w-full border-border/30 border-b bg-primary-bg px-5 py-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="mb-1 text-text-lighter text-xs opacity-70">You</div>
              <div
                className="whitespace-pre-wrap break-words text-text text-xs"
                style={{ lineHeight: "1.6" }}
              >
                {textContent}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Assistant message
    return (
      <div
        className={cn(
          "group relative w-full bg-secondary-bg px-5",
          isFirstInSequence ? "pt-3" : "pt-1.5",
          isLastMessage ? "pb-4" : "pb-1.5",
        )}
      >
        {/* Assistant Header - Only show for first message in sequence */}
        {isFirstInSequence && (
          <div className="mb-2 flex select-none items-center gap-2">
            <div className="flex items-center gap-1 text-text-lighter text-xs opacity-70">
              <span>Assistant</span>
            </div>
          </div>
        )}

        {/* Thinking Blocks */}
        {hasThinking && (
          <div className={cn("space-y-2", (hasTextContent || hasToolCalls) && "mb-3")}>
            {thinkingBlocks.map((block, idx) => (
              <ThinkingBlock key={idx} text={block.thinking?.text || block.text || ""} />
            ))}
          </div>
        )}

        {/* Tool Calls */}
        {hasToolCalls && (
          <div className={cn("space-y-2", hasTextContent && "mb-3")}>
            {message.toolCalls!.map((toolCall) => (
              <ToolCallCard key={toolCall.id} toolCall={toolCall} />
            ))}
          </div>
        )}

        {/* Waiting for first chunk - Loading skeleton */}
        {isWaitingForFirstChunk && (
          <div className="animate-pulse space-y-2">
            <div className="flex items-center gap-2 text-text-lighter text-xs">
              <Loader2 size={14} className="animate-spin text-blue-500" strokeWidth={2} />
              <span>Waiting for response...</span>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-3/4 rounded bg-hover/50" />
              <div className="h-3 w-full rounded bg-hover/50" />
              <div className="h-3 w-2/3 rounded bg-hover/50" />
            </div>
          </div>
        )}

        {/* Text Content */}
        {hasTextContent && (
          <>
            <div className="leading-relaxed" style={{ fontSize: "12px", lineHeight: "1.6" }}>
              <MarkdownRenderer content={textContent} />
            </div>

            {/* Copy Button */}
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => handleCopy(textContent, message.id)}
                className="rounded-md p-1 text-text-lighter/60 opacity-60 transition-all hover:bg-hover/50 hover:text-text hover:opacity-100"
                title="Copy message"
              >
                {copiedMessageId === message.id ? (
                  <Check size={12} className="text-green-400" strokeWidth={1.5} />
                ) : (
                  <Copy size={12} strokeWidth={1.5} />
                )}
              </button>
            </div>
          </>
        )}

        {/* Streaming indicator - typing animation */}
        {message.isStreaming && hasTextContent && (
          <div className="mt-2 flex items-center gap-2 text-text-lighter text-xs opacity-60">
            <div className="flex gap-1">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
              <div
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span>Typing...</span>
          </div>
        )}
      </div>
    );
  },
);

MessageItem.displayName = "MessageItem";
