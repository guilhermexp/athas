import { Check, ChevronDown, ChevronRight, Copy, Loader2, Wrench, X } from "lucide-react";
import { memo, useState } from "react";
import type { ToolCall } from "@/components/agent-panel/types";
import { cn } from "@/utils/cn";

interface ToolCallCardProps {
  toolCall: ToolCall;
  onApprove?: () => void;
  onReject?: () => void;
}

/**
 * Tool Call Card - Based on Zed's design
 * Displays a tool call with its input, output, and status
 */
export const ToolCallCard = memo(({ toolCall, onApprove, onReject }: ToolCallCardProps) => {
  // Auto-expand when waiting for approval
  const [isExpanded, setIsExpanded] = useState(toolCall.status === "pending");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getStatusIcon = () => {
    switch (toolCall.status) {
      case "pending":
      case "running":
        return <Loader2 size={12} className="animate-spin text-blue-500" strokeWidth={1.5} />;
      case "complete":
        return <Check size={12} className="text-green-500" strokeWidth={2} />;
      case "error":
      case "rejected":
        return <X size={12} className="text-red-500" strokeWidth={2} />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (toolCall.status) {
      case "pending":
        return "Waiting for approval";
      case "running":
        if (toolCall.duration) {
          return `Running... (${Math.floor(toolCall.duration / 1000)}s)`;
        }
        return "Running...";
      case "complete":
        return toolCall.duration ? `Completed in ${toolCall.duration}ms` : "Completed";
      case "error":
        return "Error";
      case "rejected":
        return "Rejected";
      default:
        return "";
    }
  };

  // Show estimated time for long-running tools
  const showEstimatedTime =
    toolCall.status === "running" && toolCall.duration && toolCall.duration > 2000;

  const getStatusColor = () => {
    switch (toolCall.status) {
      case "pending":
        return "text-yellow-500";
      case "running":
        return "text-blue-500";
      case "complete":
        return "text-green-500";
      case "error":
      case "rejected":
        return "text-red-500";
      default:
        return "text-text-lighter";
    }
  };

  const needsConfirmation = toolCall.status === "pending";
  const useCardLayout =
    needsConfirmation || toolCall.status === "error" || toolCall.status === "rejected";

  return (
    <div
      className={cn(
        "transition-all",
        useCardLayout
          ? "my-2 overflow-hidden rounded-lg border bg-editor-bg"
          : "my-1.5 rounded-md border-l-2 pl-3",
        toolCall.status === "error" || toolCall.status === "rejected"
          ? useCardLayout
            ? "border-red-500/30"
            : "border-l-red-500/50"
          : toolCall.status === "pending"
            ? useCardLayout
              ? "border-yellow-500/30"
              : "border-l-yellow-500/50"
            : useCardLayout
              ? "border-border"
              : "border-l-border",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between",
          useCardLayout ? "bg-hover/30 px-3 py-2" : "py-1",
        )}
      >
        <div className="flex flex-1 items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-text-lighter transition-colors hover:text-text"
          >
            {isExpanded ? (
              <ChevronDown size={12} strokeWidth={2} />
            ) : (
              <ChevronRight size={12} strokeWidth={2} />
            )}
            <Wrench size={12} strokeWidth={1.5} />
          </button>
          <span
            className="flex-1 font-medium text-text text-xs"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {toolCall.name}
          </span>
          {getStatusIcon()}
        </div>
      </div>

      {/* Status - Only show when not using card layout */}
      {!useCardLayout && (
        <>
          <div className="mt-1 flex items-center gap-2 px-7">
            <div className={cn("font-medium text-xs", getStatusColor())}>{getStatusText()}</div>

            {/* Progress bar for running tools */}
            {toolCall.status === "running" && (
              <div className="max-w-[100px] flex-1">
                <div className="h-1 overflow-hidden rounded-full bg-border/30">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500" />
                </div>
              </div>
            )}
          </div>

          {/* Estimated time warning for long-running tools */}
          {showEstimatedTime && (
            <div className="mt-1 flex items-center gap-1 px-7 text-xs text-yellow-500">
              <span>This operation may take a while...</span>
            </div>
          )}
        </>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div
          className={cn(
            "space-y-3",
            useCardLayout ? "px-3 pt-2 pb-3" : "mt-2 border-border/30 border-t px-7 pt-2",
          )}
        >
          {/* Approval Buttons - Show when status is pending */}
          {toolCall.status === "pending" && (onApprove || onReject) && (
            <div className="flex items-center gap-2">
              {onApprove && (
                <button
                  onClick={onApprove}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-green-500/10 px-3 py-1.5 font-medium text-green-500 text-xs transition-colors hover:bg-green-500/20"
                >
                  <Check size={12} strokeWidth={2} />
                  Allow
                </button>
              )}
              {onReject && (
                <button
                  onClick={onReject}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-red-500/10 px-3 py-1.5 font-medium text-red-500 text-xs transition-colors hover:bg-red-500/20"
                >
                  <X size={12} strokeWidth={2} />
                  Reject
                </button>
              )}
            </div>
          )}

          {/* Input */}
          {toolCall.input && (
            <div className="group/section relative">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-text-lighter text-xs">Input:</span>
                <button
                  onClick={() => handleCopy(JSON.stringify(toolCall.input, null, 2), "input")}
                  className="rounded p-1 text-text-lighter/60 opacity-0 transition-all hover:bg-hover/50 hover:text-text group-hover/section:opacity-100"
                  title="Copy input"
                >
                  {copiedSection === "input" ? (
                    <Check size={11} className="text-green-400" strokeWidth={2} />
                  ) : (
                    <Copy size={11} strokeWidth={1.5} />
                  )}
                </button>
              </div>
              <pre
                className="scrollbar-thin max-h-[200px] overflow-auto rounded border border-border bg-primary-bg p-2 text-text text-xs"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {JSON.stringify(toolCall.input, null, 2)}
              </pre>
            </div>
          )}

          {/* Output */}
          {toolCall.output && toolCall.status === "complete" && (
            <div className="group/section relative">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-text-lighter text-xs">Output:</span>
                <button
                  onClick={() =>
                    handleCopy(
                      typeof toolCall.output === "string"
                        ? toolCall.output
                        : JSON.stringify(toolCall.output, null, 2),
                      "output",
                    )
                  }
                  className="rounded p-1 text-text-lighter/60 opacity-0 transition-all hover:bg-hover/50 hover:text-text group-hover/section:opacity-100"
                  title="Copy output"
                >
                  {copiedSection === "output" ? (
                    <Check size={11} className="text-green-400" strokeWidth={2} />
                  ) : (
                    <Copy size={11} strokeWidth={1.5} />
                  )}
                </button>
              </div>
              <pre
                className="scrollbar-thin max-h-[200px] overflow-auto rounded border border-border bg-primary-bg p-2 text-text text-xs"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {typeof toolCall.output === "string"
                  ? toolCall.output
                  : JSON.stringify(toolCall.output, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {toolCall.error && (
            <div className="group/section relative">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-red-500 text-xs">Error:</span>
                <button
                  onClick={() => handleCopy(toolCall.error!, "error")}
                  className="rounded p-1 text-red-500/60 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover/section:opacity-100"
                  title="Copy error"
                >
                  {copiedSection === "error" ? (
                    <Check size={11} className="text-green-400" strokeWidth={2} />
                  ) : (
                    <Copy size={11} strokeWidth={1.5} />
                  )}
                </button>
              </div>
              <pre
                className="scrollbar-thin max-h-[200px] overflow-auto rounded border border-red-500/30 bg-red-500/5 p-2 text-red-500 text-xs"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {toolCall.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ToolCallCard.displayName = "ToolCallCard";
