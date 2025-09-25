import { Send, Settings, Square } from "lucide-react";
import { memo, useCallback, useEffect, useRef } from "react";
import { useSettingsStore } from "@/settings/store";
import { useAIChatStore } from "@/stores/ai-chat/store";
import { useEditorSettingsStore } from "@/stores/editor-settings-store";
import { useUIState } from "@/stores/ui-state-store";
import { getModelById } from "@/types/ai-provider";
import { cn } from "@/utils/cn";
import Button from "../ui/button";
import { ContextSelector } from "./context-selector";
import { FileMentionDropdown } from "./file-mention-dropdown";
import { ModeSelector } from "./mode-selector";
import type { AIChatInputBarProps } from "./types";

const AIChatInputBar = memo(function AIChatInputBar({
  buffers,
  allProjectFiles,
  onSendMessage,
  onStopStreaming,
}: AIChatInputBarProps) {
  const inputRef = useRef<HTMLDivElement>(null);
  const contextDropdownRef = useRef<HTMLDivElement>(null);
  const aiChatContainerRef = useRef<HTMLDivElement>(null);
  const isUpdatingContentRef = useRef(false);
  const performanceTimer = useRef<number | null>(null);

  // Get state from stores with optimized selectors
  const { settings } = useSettingsStore();
  const { openSettingsDialog } = useUIState();
  const { fontSize, fontFamily } = useEditorSettingsStore();

  // Get active agent session data
  const activeAgentSession = useAIChatStore((state) => state.getActiveAgentSession());
  const hasApiKey = useAIChatStore((state) => state.hasApiKey);
  const mentionState = useAIChatStore((state) => state.mentionState);

  // Get active session data or fallback to defaults
  const input = activeAgentSession?.input || "";
  const isTyping = activeAgentSession?.isTyping || false;
  const streamingMessageId = activeAgentSession?.streamingMessageId || null;
  const selectedBufferIds = activeAgentSession?.selectedBufferIds || new Set<string>();
  const selectedFilesPaths = activeAgentSession?.selectedFilesPaths || new Set<string>();
  const isContextDropdownOpen = activeAgentSession?.isContextDropdownOpen || false;
  const isSendAnimating = activeAgentSession?.isSendAnimating || false;
  const messageQueue = activeAgentSession?.messageQueue || [];
  const queueCount = messageQueue.length;

  // Memoize action selectors
  const setInput = useAIChatStore((state) => state.setInput);
  const setIsContextDropdownOpen = useAIChatStore((state) => state.setIsContextDropdownOpen);
  const setIsSendAnimating = useAIChatStore((state) => state.setIsSendAnimating);
  const toggleBufferSelection = useAIChatStore((state) => state.toggleBufferSelection);
  const toggleFileSelection = useAIChatStore((state) => state.toggleFileSelection);
  const showMention = useAIChatStore((state) => state.showMention);
  const hideMention = useAIChatStore((state) => state.hideMention);
  const updatePosition = useAIChatStore((state) => state.updatePosition);
  const selectNext = useAIChatStore((state) => state.selectNext);
  const selectPrevious = useAIChatStore((state) => state.selectPrevious);
  const getFilteredFiles = useAIChatStore((state) => state.getFilteredFiles);
  const setAgentMode = useAIChatStore((state) => state.setAgentMode);
  const setAgentOutputStyle = useAIChatStore((state) => state.setAgentOutputStyle);

  // Optimized function to get plain text from contentEditable div
  const getPlainTextFromDiv = useCallback(() => {
    if (!inputRef.current) return "";

    // Use a simpler approach for better performance
    const element = inputRef.current;
    let text = "";

    // Walk through child nodes directly instead of using TreeWalker
    const processNode = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || "";
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.hasAttribute("data-mention")) {
          const fileName = element.textContent?.trim();
          if (fileName) {
            text += `@[${fileName}]`;
          }
        } else {
          // Process child nodes
          for (const child of Array.from(node.childNodes)) {
            processNode(child);
          }
        }
      }
    };

    for (const child of Array.from(element.childNodes)) {
      processNode(child);
    }

    return text;
  }, []);

  // Function to recalculate mention dropdown position
  const recalculateMentionPosition = useCallback(() => {
    if (!mentionState.active || !inputRef.current) return;

    const div = inputRef.current;
    const value = getPlainTextFromDiv();
    const selection = window.getSelection();
    const cursorPos = selection?.rangeCount ? selection.getRangeAt(0).startOffset : 0;
    const beforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf("@");

    if (lastAtIndex === -1) return;

    const divRect = div.getBoundingClientRect();
    const aiChatContainer = div.closest(".ai-chat-container");
    const containerRect = aiChatContainer?.getBoundingClientRect();

    const position = {
      top: divRect.bottom + 4, // Position below the input area
      left: containerRect ? containerRect.left : divRect.left, // Position at the left edge of the sidebar
    };

    updatePosition(position);
  }, [mentionState.active, updatePosition, getPlainTextFromDiv]);

  // ResizeObserver to track container size changes
  useEffect(() => {
    if (!aiChatContainerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      recalculateMentionPosition();
    });

    resizeObserver.observe(aiChatContainerRef.current);

    // Also observe the window resize
    const handleWindowResize = () => {
      recalculateMentionPosition();
    };

    window.addEventListener("resize", handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      // Cleanup performance timer
      if (performanceTimer.current) {
        clearTimeout(performanceTimer.current);
      }
    };
  }, [recalculateMentionPosition]);

  // Sync contentEditable div with input state when it changes (e.g., when switching agents)
  useEffect(() => {
    if (!inputRef.current || isUpdatingContentRef.current) return;

    const currentContent = getPlainTextFromDiv();
    if (currentContent !== input) {
      isUpdatingContentRef.current = true;

      // Update contentEditable content
      if (input === "") {
        inputRef.current.innerHTML = "";
      } else {
        inputRef.current.textContent = input;
      }

      // Position cursor at the end
      setTimeout(() => {
        if (inputRef.current) {
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            range.selectNodeContents(inputRef.current);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          inputRef.current.focus();
        }
        isUpdatingContentRef.current = false;
      }, 0);
    }
  }, [input, getPlainTextFromDiv]);

  // Click outside handler for context dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextDropdownRef.current &&
        !contextDropdownRef.current.contains(event.target as Node)
      ) {
        setIsContextDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsContextDropdownOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (mentionState.active) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectNext();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectPrevious();
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        // Handle file selection
        const filteredFiles = getFilteredFiles(allProjectFiles);
        if (filteredFiles[mentionState.selectedIndex]) {
          handleFileMentionSelect(filteredFiles[mentionState.selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        hideMention();
      }
    } else if (e.key === "Backspace") {
      // Handle mention badge deletion
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && inputRef.current) {
        const range = selection.getRangeAt(0);
        const container = range.startContainer;
        const offset = range.startOffset;

        // Check if cursor is at the beginning of a text node that follows a mention badge
        if (container.nodeType === Node.TEXT_NODE && offset === 0) {
          const previousSibling = container.previousSibling;

          if (
            previousSibling &&
            previousSibling.nodeType === Node.ELEMENT_NODE &&
            (previousSibling as Element).hasAttribute("data-mention")
          ) {
            e.preventDefault();

            // Remove the mention badge
            previousSibling.remove();

            // Update the input state by getting the new plain text
            const newPlainText = getPlainTextFromDiv();
            setInput(newPlainText);

            return;
          }
        }

        // Check if cursor is right after a mention badge (in separator text node)
        if (
          container.nodeType === Node.TEXT_NODE &&
          container.textContent === "\u200B" &&
          offset === 1
        ) {
          const previousSibling = container.previousSibling?.previousSibling; // Skip the space node

          if (
            previousSibling &&
            previousSibling.nodeType === Node.ELEMENT_NODE &&
            (previousSibling as Element).hasAttribute("data-mention")
          ) {
            e.preventDefault();

            // Remove the mention badge
            previousSibling.remove();

            // Update the input state
            const newPlainText = getPlainTextFromDiv();
            setInput(newPlainText);

            return;
          }
        }
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Throttled mention detection to improve performance
  const debouncedMentionDetection = useCallback(
    (plainText: string) => {
      if (performanceTimer.current) {
        clearTimeout(performanceTimer.current);
      }

      performanceTimer.current = window.setTimeout(() => {
        if (!inputRef.current) return;

        // Simple approach - just check the end of the text for @ mentions
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        // Get a simple cursor position estimation
        const _range = selection.getRangeAt(0);
        const beforeCursor = plainText.slice(0, plainText.length);
        const lastAtIndex = beforeCursor.lastIndexOf("@");

        if (lastAtIndex !== -1) {
          const afterAt = beforeCursor.slice(lastAtIndex + 1);
          // Check if there's no space between @ and cursor and it's not part of a mention badge
          if (!afterAt.includes(" ") && !afterAt.includes("]") && afterAt.length < 50) {
            // Use cached position to avoid getBoundingClientRect on every call
            const position = {
              top: inputRef.current.offsetTop + inputRef.current.offsetHeight + 4,
              left: inputRef.current.offsetLeft,
            };

            showMention(position, afterAt, lastAtIndex);
          } else {
            hideMention();
          }
        } else {
          hideMention();
        }
      }, 100); // 100ms debounce for mention detection
    },
    [showMention, hideMention],
  );

  // Optimized input change handler
  const handleInputChange = useCallback(() => {
    if (!inputRef.current || isUpdatingContentRef.current) return;

    // Get the plain text from the contentEditable div
    const plainTextFromDiv = getPlainTextFromDiv();

    // Only update store if content actually changed
    if (plainTextFromDiv !== input) {
      setInput(plainTextFromDiv);

      // Only do mention detection if the text contains @ and is not too long
      if (plainTextFromDiv.includes("@") && plainTextFromDiv.length < 500) {
        debouncedMentionDetection(plainTextFromDiv);
      } else {
        hideMention();
      }
    }
  }, [input, setInput, getPlainTextFromDiv, debouncedMentionDetection, hideMention]);

  // Handle file mention selection
  const handleFileMentionSelect = useCallback(
    (file: any) => {
      if (!inputRef.current) return;

      isUpdatingContentRef.current = true;

      const beforeMention = input.slice(0, mentionState.startIndex);
      const afterMention = input.slice(mentionState.startIndex + mentionState.search.length + 1);
      const newInput = `${beforeMention}@[${file.name}] ${afterMention}`;

      // Update input state and hide mention dropdown
      setInput(newInput);
      hideMention();

      // Completely rebuild the DOM content to ensure clean structure
      setTimeout(() => {
        if (!inputRef.current) return;

        // Clear all content
        inputRef.current.innerHTML = "";

        // Build new content piece by piece
        // Add text before mention if any
        if (beforeMention) {
          const beforeTextNode = document.createTextNode(beforeMention);
          inputRef.current.appendChild(beforeTextNode);
        }

        // Add the mention badge
        const mentionSpan = document.createElement("span");
        mentionSpan.setAttribute("data-mention", "true");
        mentionSpan.className =
          "inline-flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-blue-400 select-none";
        mentionSpan.style.fontFamily = `${fontFamily}, "Fira Code", "Cascadia Code", "JetBrains Mono", Consolas, "Courier New", monospace`;
        mentionSpan.style.fontSize = `${Math.max(fontSize - 4, 10)}px`; // Smaller than input text
        mentionSpan.textContent = file.name;
        inputRef.current.appendChild(mentionSpan);

        // Always add a space and remaining text as separate text node
        // Ensure there's always substantial content to prevent cursor from jumping to span
        const remainingText = ` ${afterMention}${afterMention ? "" : " "}`;
        const afterTextNode = document.createTextNode(remainingText);
        inputRef.current.appendChild(afterTextNode);

        // Add an invisible zero-width space to ensure cursor stays in text node
        const separatorNode = document.createTextNode("\u200B"); // Zero-width space
        inputRef.current.appendChild(separatorNode);

        // Position cursor in the separator node to ensure it doesn't jump to span
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          try {
            // Position at the end of the separator node
            range.setStart(separatorNode, 1);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          } catch (_e) {
            // Fallback - position at end of input
            range.selectNodeContents(inputRef.current);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }

        inputRef.current.focus();
        isUpdatingContentRef.current = false;
      }, 0);
    },
    [input, mentionState.startIndex, mentionState.search.length, setInput, hideMention],
  );

  // Handle slash commands
  const handleSlashCommand = useCallback(
    (command: string) => {
      if (!activeAgentSession) return false;

      const parts = command.slice(1).split(" "); // Remove leading '/'
      const cmd = parts[0];
      const args = parts.slice(1);

      switch (cmd) {
        case "plan":
          setAgentMode(activeAgentSession.id, "plan");
          setInput("");
          return true;
        case "chat":
          setAgentMode(activeAgentSession.id, "chat");
          setInput("");
          return true;
        case "output-style":
          if (args.length === 0) {
            // Show current output style or cycle through them
            const styles = ["default", "explanatory", "learning"];
            const currentIndex = styles.indexOf(activeAgentSession.outputStyle);
            const nextStyle = styles[(currentIndex + 1) % styles.length];
            setAgentOutputStyle(activeAgentSession.id, nextStyle as any);
          } else {
            const style = args[0];
            if (["default", "explanatory", "learning"].includes(style)) {
              setAgentOutputStyle(activeAgentSession.id, style as any);
            }
          }
          setInput("");
          return true;
        default:
          return false;
      }
    },
    [activeAgentSession, setAgentMode, setAgentOutputStyle, setInput],
  );

  const handleSendMessage = async () => {
    if (!input.trim() || !hasApiKey) return;

    // Check for slash commands first
    if (input.startsWith("/")) {
      const handled = handleSlashCommand(input);
      if (handled) return; // Command was processed, don't send as message
    }

    // Trigger send animation
    setIsSendAnimating(true);

    // Reset animation after the flying animation completes
    setTimeout(() => setIsSendAnimating(false), 800);

    await onSendMessage();
  };

  return (
    <div
      ref={aiChatContainerRef}
      className="ai-chat-container border-border border-t bg-terniary-bg"
    >
      <div className="px-2 py-1.5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <ContextSelector
              buffers={buffers}
              selectedBufferIds={selectedBufferIds}
              selectedFilesPaths={selectedFilesPaths}
              onToggleBuffer={toggleBufferSelection}
              onToggleFile={toggleFileSelection}
              isOpen={isContextDropdownOpen}
              onToggleOpen={() => setIsContextDropdownOpen(!isContextDropdownOpen)}
            />
          </div>
          <div
            ref={inputRef}
            contentEditable={hasApiKey}
            onInput={handleInputChange}
            onKeyDown={handleKeyDown}
            data-placeholder={
              hasApiKey
                ? "Enter your prompt ('@' tag files)"
                : "Configure API key to enable AI chat..."
            }
            className={cn(
              "max-h-[120px] min-h-[60px] w-full resize-none overflow-y-auto border-none bg-transparent",
              "p-1 text-text",
              "focus:outline-none",
              !hasApiKey ? "cursor-not-allowed opacity-50" : "cursor-text",
              // Custom styles for contentEditable placeholder
              "empty:before:pointer-events-none empty:before:text-text-lighter empty:before:content-[attr(data-placeholder)]",
            )}
            style={
              {
                // Use dynamic font settings (slightly smaller than editor for UI consistency)
                fontFamily: `${fontFamily}, "Fira Code", "Cascadia Code", "JetBrains Mono", Consolas, "Courier New", monospace`,
                fontSize: `${Math.max(fontSize - 2, 11)}px`,
                // Ensure proper line height and text rendering
                lineHeight: "1.4",
                wordWrap: "break-word",
                overflowWrap: "break-word",
              } as React.CSSProperties
            }
            role="textbox"
            aria-multiline="true"
            aria-label="Message input"
            tabIndex={hasApiKey ? 0 : -1}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center">
            <ModeSelector />
          </div>
          <div className="flex select-none items-center gap-1">
            {/* Queue indicator */}
            {queueCount > 0 && (
              <div className="flex items-center gap-1 rounded bg-blue-500/10 px-2 py-1 text-blue-400 text-xs">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                <span>{queueCount} queued</span>
              </div>
            )}

            {/* Model selector button */}
            <button
              onClick={() => openSettingsDialog("ai")}
              className="flex min-w-[160px] items-center gap-1.5 rounded bg-transparent px-2 py-1 font-mono text-xs transition-colors hover:bg-hover"
              title="Open AI settings to change model"
            >
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-text text-xs">
                  {getModelById(settings.aiProviderId, settings.aiModelId)?.name || "Select Model"}
                </div>
              </div>
              <Settings size={10} className="text-text-lighter" />
            </button>
            <Button
              type="submit"
              disabled={!input.trim() || !hasApiKey}
              onClick={isTyping && streamingMessageId ? onStopStreaming : handleSendMessage}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded p-0 text-text-lighter hover:bg-hover hover:text-text",
                "send-button-hover button-transition focus:outline-none focus:ring-2 focus:ring-accent/50",
                isTyping && streamingMessageId && !isSendAnimating && "button-morphing",
                input.trim() &&
                  hasApiKey &&
                  "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500/50",
                !input.trim() || !hasApiKey ? "cursor-not-allowed opacity-50" : "cursor-pointer",
              )}
              title={
                isTyping && streamingMessageId
                  ? "Stop generation (Escape)"
                  : queueCount > 0
                    ? "Add to queue (Enter)"
                    : "Send message (Enter)"
              }
              aria-label={isTyping && streamingMessageId ? "Stop generation" : "Send message"}
              tabIndex={0}
            >
              {isTyping && streamingMessageId && !isSendAnimating ? (
                <Square size={14} className="transition-all duration-300" />
              ) : (
                <Send
                  size={14}
                  className={cn(
                    "send-icon transition-all duration-200",
                    isSendAnimating && "flying",
                  )}
                />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* File Mention Dropdown */}
      {mentionState.active && <FileMentionDropdown onSelect={handleFileMentionSelect} />}
    </div>
  );
});

export default AIChatInputBar;
