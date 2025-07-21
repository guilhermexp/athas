import { useEffect, useRef } from "react";
import { useEditorDecorations } from "../../hooks/use-editor-decorations";
import { useEditorScroll } from "../../hooks/use-editor-scroll";
import { useCodeEditorStore } from "../../stores/code-editor-store";
import { useEditorConfigStore } from "../../stores/editor-config-store";
import { useEditorInstanceStore } from "../../stores/editor-instance-store";
import { cn } from "../../utils/cn";

export function TextEditor() {
  const { fontSize, tabSize, wordWrap } = useEditorConfigStore();
  const { value: codeEditorValue, setValue: setCodeEditorValue } = useCodeEditorStore();
  const { onChange, disabled, placeholder, filePath, editorRef, lineNumbersRef } =
    useEditorInstanceStore();
  const localRef = useRef<HTMLDivElement>(null);
  const fallbackLineNumbersRef = useRef<HTMLDivElement>(null);
  const { tokens, debouncedFetchTokens } = useEditorDecorations();

  // Use the ref from the store or fallback to local ref
  const divRef = editorRef || localRef;

  // Use scroll hook for line numbers sync
  const { handleScroll } = useEditorScroll(divRef, null, lineNumbersRef || fallbackLineNumbersRef);

  // Fetch tokens when content or file changes
  useEffect(() => {
    if (filePath) {
      debouncedFetchTokens(codeEditorValue, filePath);
    }
  }, [codeEditorValue, filePath, debouncedFetchTokens]);

  // Apply syntax highlighting with proper timing to preserve highlighting during editing
  useEffect(() => {
    if (!divRef.current || tokens.length === 0 || !codeEditorValue) return;

    const element = divRef.current;
    const selection = window.getSelection();
    const isEditorFocused = document.activeElement === element;

    // Skip highlighting only during active text input/composition
    const isComposing = element.hasAttribute("data-composing");

    // Apply highlighting immediately unless actively composing
    if (!isComposing) {
      const content = codeEditorValue;

      // Save cursor position if editor is focused
      let cursorPos = 0;
      if (isEditorFocused && selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        cursorPos = preCaretRange.toString().length;
      }

      // Create highlighted content
      let highlightedHTML = "";
      let lastEnd = 0;

      // Sort tokens by start position
      const sortedTokens = [...tokens].sort((a, b) => a.start - b.start);

      for (const token of sortedTokens) {
        // Add plain text before token
        if (token.start > lastEnd) {
          const plainText = content.substring(lastEnd, token.start);
          highlightedHTML += escapeHtml(plainText);
        }

        // Add highlighted token
        if (token.end <= content.length) {
          const tokenText = content.substring(token.start, token.end);
          highlightedHTML += `<span class="${token.class_name}">${escapeHtml(tokenText)}</span>`;
          lastEnd = token.end;
        }
      }

      // Add remaining text
      if (lastEnd < content.length) {
        highlightedHTML += escapeHtml(content.substring(lastEnd));
      }

      if (element.innerHTML !== highlightedHTML) {
        element.innerHTML = highlightedHTML;

        // Restore cursor position if editor was focused
        if (isEditorFocused && cursorPos > 0) {
          setTimeout(() => {
            if (document.activeElement === element) {
              const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
              let currentPos = 0;
              let node = walker.nextNode();

              while (node) {
                const textLength = node.textContent?.length || 0;
                if (currentPos + textLength >= cursorPos) {
                  const range = document.createRange();
                  const offset = Math.min(cursorPos - currentPos, textLength);
                  range.setStart(node, offset);
                  range.setEnd(node, offset);

                  const newSelection = window.getSelection();
                  if (newSelection) {
                    newSelection.removeAllRanges();
                    newSelection.addRange(range);
                  }
                  break;
                }
                currentPos += textLength;
                node = walker.nextNode();
              }
            }
          }, 0);
        }
      }
    }
  }, [tokens, codeEditorValue, divRef]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.textContent || "";
    setCodeEditorValue(content);
    onChange?.(content);
  };

  const handleCompositionStart = () => {
    if (divRef.current) {
      divRef.current.setAttribute("data-composing", "true");
    }
  };

  const handleCompositionEnd = () => {
    if (divRef.current) {
      divRef.current.removeAttribute("data-composing");
    }
  };

  const handleFocus = () => {
    // Keep syntax highlighting when focusing - no need to convert to plain text
  };

  const handleBlur = () => {
    // Highlighting is now maintained continuously, no special blur handling needed
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Tab key
    if (e.key === "Tab") {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode("  ")); // 2 spaces
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        // Update content
        const content = divRef.current?.textContent || "";
        setCodeEditorValue(content);
        onChange?.(content);
      }
    }
  };

  const getEditorStyles = {
    fontSize: `${fontSize}px`,
    tabSize: tabSize,
    lineHeight: `${fontSize * 1.4}px`,
    fontFamily: "monospace",
  };

  return (
    <div
      ref={divRef}
      contentEditable={!disabled}
      suppressContentEditableWarning={true}
      onInput={handleInput}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onScroll={handleScroll}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      className={cn(
        "absolute inset-0 m-0 overflow-auto",
        "border-none font-mono outline-none",
        "bg-transparent text-[var(--color-text)]",
        "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400",
      )}
      style={{
        ...getEditorStyles,
        whiteSpace: wordWrap ? "pre-wrap" : "pre",
        wordBreak: wordWrap ? "break-word" : "normal",
        overflowWrap: wordWrap ? "break-word" : "normal",
        padding: "8px 8px 50vh 8px", // Match line numbers padding exactly
      }}
      data-placeholder={placeholder}
      spellCheck={false}
    />
  );
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
