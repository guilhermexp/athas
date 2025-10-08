import { Check, ChevronDown, KeyRound, Maximize2, Plus, Send, Square } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { getSlashCommandRegistry } from "@/lib/slash-commands";
import { useAgentPanelStore } from "@/stores/agent-panel/store";
import { useBufferStore } from "@/stores/buffer-store";
import { useProjectStore } from "@/stores/project-store";
import { cn } from "@/utils/cn";
import { SlashCommandAutocomplete } from "./slash-command-autocomplete";

interface AgentPanelInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

/**
 * Agent Panel Input - Based on Zed's minimal design
 *
 * Layout:
 * ┌─────────────────────────────────────────┐
 * │ [📎] [Input field................] [⏹/▶]│
 * │ ─────────────────────────────────────── │
 * │  Model: Claude 3.5 Sonnet              │
 * └─────────────────────────────────────────┘
 */
export const AgentPanelInput = memo(({ onSendMessage, disabled = false }: AgentPanelInputProps) => {
  const [input, setInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showApprovalMenu, setShowApprovalMenu] = useState(false);
  const [showSlashAutocomplete, setShowSlashAutocomplete] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const { showToast } = useToast();
  const {
    isStreaming,
    generalSettings,
    setGeneralSetting,
    selectedAgentId,
    getAgent,
    cancelStreaming,
  } = useAgentPanelStore();
  const selectedAgent = getAgent(selectedAgentId);
  const rootFolderPath = useProjectStore((state) => state.rootFolderPath);
  const buffers = useBufferStore.use.buffers();
  const requireModifierToSend = generalSettings.useModifierToSend;
  const approvalMode = generalSettings.toolApprovalMode ?? "always_ask";
  const approvalLabel =
    approvalMode === "bypass"
      ? "Bypass Permissions"
      : approvalMode === "accept_edits"
        ? "Accept Edits"
        : approvalMode === "plan"
          ? "Plan Mode"
          : "Always Ask";
  const handleApprovalClick = () => setShowApprovalMenu((v) => !v);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close approval menu on outside click
  useEffect(() => {
    if (!showApprovalMenu) return;
    const onDocClick = () => setShowApprovalMenu(false);
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showApprovalMenu]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxHeight = isExpanded ? 480 : 200; // ~60vh vs default
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, [input, isExpanded]);

  // Show/hide slash command autocomplete
  useEffect(() => {
    const registry = getSlashCommandRegistry();
    const shouldShow = registry.isSlashCommand(input.trim()) && !isComposing;
    setShowSlashAutocomplete(shouldShow);
  }, [input, isComposing]);

  const handleSend = useCallback(async () => {
    if (isStreaming) {
      setIsCancelling(true);
      try {
        await cancelStreaming();
        showToast({
          message: "Streaming cancelled",
          type: "info",
          duration: 3000,
        });
      } catch (_error) {
        showToast({
          message: "Failed to cancel streaming",
          type: "error",
          duration: 3000,
        });
      } finally {
        setIsCancelling(false);
      }
      return;
    }

    if (!input.trim() || disabled) return;

    const trimmedInput = input.trim();

    // Check if this is a slash command
    const registry = getSlashCommandRegistry();
    if (registry.isSlashCommand(trimmedInput)) {
      try {
        const openFiles = Array.from(
          new Set(
            buffers
              .filter((buffer) => !buffer.isVirtual && Boolean(buffer.path))
              .map((buffer) => buffer.path),
          ),
        );

        const result = await registry.executeFromInput(trimmedInput, {
          workingDirectory: rootFolderPath ?? undefined,
          projectRoot: rootFolderPath ?? undefined,
          openFiles,
        });

        let message = result.content;

        if (result.attachments && result.attachments.length > 0) {
          const attachmentSummary = result.attachments
            .map((attachment) => attachment.name ?? attachment.type)
            .filter(Boolean)
            .map((name) => `- ${name}`)
            .join("\n");

          if (attachmentSummary) {
            message = `${message}\n\nAttachments:\n${attachmentSummary}`;
          }
        }

        onSendMessage(message);
        setInput("");

        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
        return;
      } catch (error) {
        // Show error to user
        console.error("[SlashCommand] Execution failed:", error);
        const errorMessage = error instanceof Error ? error.message : "Command execution failed";
        // TODO: Show toast notification instead of alert
        alert(`Slash command error:\n${errorMessage}`);
        return;
      }
    }

    // Normal message
    try {
      onSendMessage(trimmedInput);
      setInput("");

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      showToast({
        message: "Message sent",
        type: "success",
        duration: 2000,
      });
    } catch (_error) {
      showToast({
        message: "Failed to send message",
        type: "error",
        duration: 3000,
      });
    }
  }, [
    input,
    disabled,
    isStreaming,
    onSendMessage,
    cancelStreaming,
    rootFolderPath,
    buffers,
    showToast,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // ESC to cancel streaming
    if (e.key === "Escape" && isStreaming) {
      e.preventDefault();
      handleSend(); // handleSend already handles cancellation when streaming
      return;
    }

    if (e.key === "Enter" && !isComposing) {
      if (requireModifierToSend) {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          handleSend();
        }
      } else if (!e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const canSend = input.trim().length > 0 && !disabled && !isStreaming;

  const handleAutocompleteSelect = useCallback((commandText: string) => {
    setInput(commandText);
    setShowSlashAutocomplete(false);
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="border-border/40 border-t bg-primary-bg">
      <div ref={inputContainerRef} className="relative px-3 pt-2">
        {/* Slash command autocomplete */}
        {showSlashAutocomplete && (
          <SlashCommandAutocomplete
            input={input.trim()}
            onSelect={handleAutocompleteSelect}
            visible={showSlashAutocomplete}
            position={{ bottom: "100%", left: 0, marginBottom: "8px" }}
          />
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={`Message ${selectedAgent?.name ?? "agent"} — @ to include context, / for commands`}
          disabled={disabled}
          rows={2}
          className={cn(
            "scrollbar-hidden w-full resize-none bg-transparent px-0 outline-none",
            // Typography: reduce font size per user feedback
            "font-mono text-[18px] text-text leading-[34px] caret-sky-300",
            "placeholder:text-text-lighter/60",
            "mb-2",
          )}
          style={{
            minHeight: "84px",
            maxHeight: isExpanded ? "560px" : "320px",
          }}
        />
        {/* Expand button in the top-right of the input box */}
        <button
          className={cn(
            "absolute top-2 right-3 flex h-6 w-6 items-center justify-center",
            "rounded-sm text-text-lighter/70 transition-colors hover:bg-hover/60 hover:text-text",
          )}
          type="button"
          title={isExpanded ? "Shrink" : "Expand"}
          onClick={() => setIsExpanded((v) => !v)}
        >
          <Maximize2 size={14} strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex items-center justify-between border-border/40 border-t px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <button
            className="flex h-6 w-6 items-center justify-center rounded-full border border-border/40 text-text-lighter/70 transition-colors hover:border-border/60 hover:text-text"
            title="Add context"
            disabled={disabled}
          >
            <Plus size={13} strokeWidth={1.75} />
          </button>

          {selectedAgent?.type === "acp" ? (
            <button
              className="flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] text-text-lighter/70 transition-colors hover:bg-hover/60 hover:text-text"
              type="button"
              disabled={disabled}
              title={`Login to ${selectedAgent?.name ?? "agent"}`}
              onClick={() => {
                if (!disabled) {
                  onSendMessage("/login");
                }
              }}
            >
              <KeyRound size={12} strokeWidth={1.75} /> Login
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button
              className="flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] text-text-lighter/70 transition-colors hover:bg-hover/60 hover:text-text"
              type="button"
              title="Tool approval preference"
              onClick={handleApprovalClick}
            >
              {approvalLabel}
              <ChevronDown size={11} strokeWidth={1.5} />
            </button>
            {showApprovalMenu && (
              <div
                className="absolute right-0 bottom-7 z-50 min-w-[200px] rounded-md border border-border/50 bg-secondary-bg/95 p-1 shadow-lg backdrop-blur-sm"
                onMouseDown={(e) => e.preventDefault()}
              >
                {(
                  [
                    { key: "always_ask", label: "Always Ask" },
                    { key: "accept_edits", label: "Accept Edits" },
                    { key: "bypass", label: "Bypass Permissions" },
                    { key: "plan", label: "Plan Mode" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-3 py-1.5 text-left text-[13px] transition-colors",
                      "text-text hover:bg-hover/70",
                    )}
                    onClick={() => {
                      setGeneralSetting("toolApprovalMode", opt.key);
                      // Also mirror legacy flag for full bypass
                      if (opt.key === "bypass") {
                        setGeneralSetting("alwaysAllowToolActions", true);
                      } else {
                        setGeneralSetting("alwaysAllowToolActions", false);
                      }
                      setShowApprovalMenu(false);
                    }}
                  >
                    <span>{opt.label}</span>
                    {approvalMode === opt.key ? <Check size={14} /> : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={(!canSend && !isStreaming) || isCancelling}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md border transition-all",
              isStreaming
                ? "border-transparent bg-red-500 text-white hover:bg-red-600 active:scale-95"
                : canSend
                  ? "border-transparent bg-text text-primary-bg hover:bg-text/80 active:scale-95"
                  : "cursor-not-allowed border-border/40 bg-transparent text-text-lighter/40",
              isCancelling && "cursor-wait opacity-50",
            )}
            title={isStreaming ? "Stop streaming (Esc)" : "Send message (Enter)"}
            type="button"
          >
            {isCancelling ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : isStreaming ? (
              <Square size={14} strokeWidth={2.5} fill="currentColor" />
            ) : (
              <Send size={12} strokeWidth={2} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

AgentPanelInput.displayName = "AgentPanelInput";
