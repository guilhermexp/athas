import { useEffect, useRef, useState } from "react";
import { useEditorInstanceStore } from "../../stores/editor-instance-store";

export function QuickEditInline() {
  const {
    isInlineAssistantVisible,
    selectedText,
    assistantCursorPosition,
    setInlineAssistant,
    editorRef,
    value,
    onChange,
  } = useEditorInstanceStore();

  const [inputValue, setInputValue] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate position based on selection
  useEffect(() => {
    if (isInlineAssistantVisible && editorRef?.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = editorRef.current.getBoundingClientRect();

        // Position at the top of the first line of selection, relative to editor
        setPosition({
          top: rect.top - editorRect.top - 32, // 32px above the selection
          left: Math.max(0, rect.left - editorRect.left),
        });
      } else {
        // Fallback to cursor position
        setPosition({
          top: assistantCursorPosition.y - 32,
          left: assistantCursorPosition.x,
        });
      }
    }
  }, [isInlineAssistantVisible, selectedText, assistantCursorPosition, editorRef]);

  // Auto-focus when component becomes visible
  useEffect(() => {
    if (isInlineAssistantVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInlineAssistantVisible]);

  // Reset input when component closes
  useEffect(() => {
    if (!isInlineAssistantVisible) {
      setInputValue("");
    }
  }, [isInlineAssistantVisible]);

  const handleClose = () => {
    setInlineAssistant(false);
    if (editorRef?.current) {
      editorRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleApplyEdit();
    }
  };

  const handleApplyEdit = () => {
    if (!inputValue.trim()) return;

    if (selectedText) {
      // Replace selected text
      const newValue = value.replace(selectedText, inputValue);
      onChange(newValue);
    } else {
      // Insert at cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(inputValue));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        // Trigger onChange
        const content = editorRef?.current?.textContent || "";
        onChange(content);
      }
    }
    setInlineAssistant(false);
  };

  if (!isInlineAssistantVisible) return null;

  return (
    <div
      className="absolute z-50 flex items-center gap-2 rounded border border-border bg-secondary-bg px-3 py-2 shadow-lg"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Inline indicator */}
      <div className="h-2 w-2 flex-shrink-0 rounded-full bg-accent"></div>

      {/* Inline input */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-w-48 bg-transparent text-sm text-text placeholder-text-lighter outline-none"
        placeholder={selectedText ? "Describe the edit..." : "Type to insert..."}
      />

      {/* Selection info */}
      {selectedText && (
        <span className="flex-shrink-0 text-text-lighter text-xs">{selectedText.length} chars</span>
      )}

      {/* Close button */}
      <button
        onClick={handleClose}
        className="ml-1 flex-shrink-0 text-text-lighter hover:text-text"
        title="Close (Esc)"
      >
        <svg
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-label="Close"
          role="img"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
