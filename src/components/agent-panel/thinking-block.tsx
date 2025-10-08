import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { memo, useState } from "react";
import MarkdownRenderer from "@/components/ui/markdown-renderer";

interface ThinkingBlockProps {
  text: string;
  defaultExpanded?: boolean;
}

/**
 * Thinking Block - Based on Zed's design
 * Displays the assistant's thinking process in a collapsible block
 */
export const ThinkingBlock = memo(({ text, defaultExpanded = false }: ThinkingBlockProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-purple-500/30 bg-purple-500/5">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 bg-purple-500/10 px-3 py-2 text-left transition-colors hover:bg-purple-500/15"
      >
        <div className="flex items-center gap-1.5 text-purple-500">
          {isExpanded ? (
            <ChevronDown size={12} strokeWidth={2} />
          ) : (
            <ChevronRight size={12} strokeWidth={2} />
          )}
          <Brain size={12} strokeWidth={1.5} />
        </div>
        <span className="flex-1 font-medium text-purple-500 text-xs">Thinking</span>
        {!isExpanded && (
          <span className="text-purple-500/60 text-xs">
            {text.length > 50 ? `${text.substring(0, 50)}...` : text}
          </span>
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 py-2">
          <div className="text-purple-100/90 text-xs leading-relaxed" style={{ lineHeight: "1.6" }}>
            <MarkdownRenderer content={text} />
          </div>
        </div>
      )}
    </div>
  );
});

ThinkingBlock.displayName = "ThinkingBlock";
