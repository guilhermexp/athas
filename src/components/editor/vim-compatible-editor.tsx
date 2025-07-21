import { useEffect, useRef } from "react";
import { useEditorDecorations } from "../../hooks/use-editor-decorations";
import { getCursorPosition } from "../../hooks/use-vim";
import { useCodeEditorStore } from "../../stores/code-editor-store";
import { useEditorConfigStore } from "../../stores/editor-config-store";
import { useEditorInstanceStore } from "../../stores/editor-instance-store";
import { cn } from "../../utils/cn";

// Helper function for optimized cursor positioning
const setOptimizedCursorPosition = (
  element: HTMLDivElement,
  position: number,
  selection: Selection,
): void => {
  const textContent = element.textContent || "";
  const clampedPosition = Math.max(0, Math.min(position, textContent.length));

  const range = document.createRange();

  // For plain text content, we can directly set the range
  if (element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE) {
    const textNode = element.childNodes[0] as Text;
    range.setStart(textNode, clampedPosition);
    range.setEnd(textNode, clampedPosition);
    selection.removeAllRanges();
    selection.addRange(range);
    return;
  }

  // Fallback for complex DOM structures
  let currentPos = 0;
  let found = false;

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  let node = walker.nextNode();

  while (node && !found) {
    const textLength = node.textContent?.length || 0;
    if (currentPos + textLength >= clampedPosition) {
      range.setStart(node, Math.min(clampedPosition - currentPos, textLength));
      range.setEnd(node, Math.min(clampedPosition - currentPos, textLength));
      found = true;
    } else {
      currentPos += textLength;
      node = walker.nextNode();
    }
  }

  if (!found && element.childNodes.length > 0) {
    // Place cursor at end
    range.selectNodeContents(element);
    range.collapse(false);
  }

  selection.removeAllRanges();
  selection.addRange(range);
};

export function VimCompatibleEditor() {
  const { fontSize, tabSize, wordWrap, vimEnabled, vimMode } = useEditorConfigStore();
  const {
    value: codeEditorValue,
    setValue: setCodeEditorValue,
    searchMatches,
    currentMatchIndex,
  } = useCodeEditorStore();
  const { tokens, debouncedFetchTokens, clearTokens } = useEditorDecorations();
  const previousFilePathRef = useRef<string | undefined>(undefined);
  const {
    editorRef,
    onChange,
    onKeyDown,
    placeholder,
    disabled,
    className,
    handleUserInteraction,
    handleScroll,
    handleHover,
    handleMouseEnter,
    handleMouseLeave,
    vimEngine,
    handleLspCompletion,
    onCursorPositionChange,
    filePath,
    isLanguageSupported,
    setInlineAssistant,
  } = useEditorInstanceStore();

  const getEditorStyles = {
    fontSize: `${fontSize}px`,
    tabSize: tabSize,
    lineHeight: `${fontSize * 1.4}px`,
  };

  const getEditorClasses = () => {
    let classes = `absolute top-0 bottom-0 right-0 left-0 m-0 font-mono border-none outline-none overflow-visible shadow-none rounded-none transition-none`;

    if (vimEnabled) {
      if (vimMode === "normal") {
        classes += " caret-transparent";
      } else {
        classes += " caret-[var(--tw-text)]";
      }
      if (vimMode === "visual") {
        classes += " vim-visual-selection";
      }
    } else {
      classes += " caret-[var(--tw-text)]";
    }

    return classes;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Cmd+K for inline assistant
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString();
        const rect = range.getBoundingClientRect();

        setInlineAssistant(true, selectedText, {
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
      } else {
        if (editorRef?.current) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setInlineAssistant(true, "", {
              x: rect.left,
              y: rect.top,
            });
          }
        }
      }
      return;
    }

    // Handle Enter key for new lines
    if (e.key === "Enter" && !e.shiftKey && !vimEnabled) {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode("\n"));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        const content = editorRef?.current?.textContent || "";
        setCodeEditorValue(content);
        onChange?.(content);
      }
      return;
    }

    // Handle Tab key for indentation
    if (e.key === "Tab" && !vimEnabled) {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode("  "));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        const content = editorRef?.current?.textContent || "";
        setCodeEditorValue(content);
        onChange?.(content);
      }
      return;
    }

    if (vimEnabled && vimEngine) {
      const handled = vimEngine.handleKeyDown(e as any, editorRef?.current as any, codeEditorValue);
      if (handled) {
        return;
      }
    }

    onKeyDown?.(e);
  };

  // Enhanced applyDecorations that includes search highlighting using DOM manipulation
  const applyDecorationsWithSearch = (
    editorRef: React.RefObject<HTMLDivElement | null>,
    content: string,
    tokens: any[],
    searchMatches: { start: number; end: number }[],
    currentMatchIndex: number,
  ) => {
    if (!editorRef.current || !content) return;

    // Create segments for syntax highlighting
    const segments: any[] = [];
    let lastEnd = 0;

    // Sort tokens by start position
    const sortedTokens = [...tokens].sort((a, b) => a.start - b.start);

    for (const token of sortedTokens) {
      // Add plain text before token
      if (token.start > lastEnd) {
        segments.push({
          text: content.substring(lastEnd, token.start),
          start: lastEnd,
          end: token.start,
        });
      }

      // Add token
      if (token.end <= content.length) {
        segments.push({
          text: content.substring(token.start, token.end),
          className: token.class_name,
          start: token.start,
          end: token.end,
        });
        lastEnd = token.end;
      }
    }

    // Add remaining text
    if (lastEnd < content.length) {
      segments.push({
        text: content.substring(lastEnd),
        start: lastEnd,
        end: content.length,
      });
    }

    // Clear current content
    editorRef.current.innerHTML = "";

    // Create a document fragment for better performance
    const fragment = document.createDocumentFragment();

    // Render segments with search highlighting using DOM methods only
    segments.forEach(segment => {
      if (segment.text) {
        const lines = segment.text.split("\n");
        lines.forEach((line: string, lineIndex: number) => {
          if (lineIndex > 0) {
            fragment.appendChild(document.createTextNode("\n"));
          }

          if (line) {
            // Check if this segment overlaps with any search matches
            const segmentStart =
              segment.start +
              lines.slice(0, lineIndex).join("\n").length +
              (lineIndex > 0 ? lineIndex : 0);
            const segmentEnd = segmentStart + line.length;

            // Find overlapping search matches
            const overlappingMatches = searchMatches
              .map((match, index) => ({ ...match, originalIndex: index }))
              .filter(match => {
                const matchStart = Math.max(match.start, segmentStart) - segmentStart;
                const matchEnd = Math.min(match.end, segmentEnd) - segmentStart;
                return matchStart < matchEnd && matchStart >= 0 && matchEnd <= line.length;
              })
              .sort((a, b) => a.start - b.start);

            if (overlappingMatches.length === 0) {
              // No search highlights, create simple span
              const span = document.createElement("span");
              span.textContent = line;
              if (segment.className) {
                span.className = segment.className;
              }
              fragment.appendChild(span);
            } else {
              // Has search highlights, build using DOM
              const container = document.createElement("span");
              if (segment.className) {
                container.className = segment.className;
              }

              let lastPos = 0;
              overlappingMatches.forEach(match => {
                const matchStart = Math.max(match.start, segmentStart) - segmentStart;
                const matchEnd = Math.min(match.end, segmentEnd) - segmentStart;

                // Add text before match
                if (matchStart > lastPos) {
                  container.appendChild(
                    document.createTextNode(line.substring(lastPos, matchStart)),
                  );
                }

                // Add highlighted match
                const isCurrentMatch = match.originalIndex === currentMatchIndex;
                const highlightSpan = document.createElement("span");
                highlightSpan.className = isCurrentMatch
                  ? "search-highlight-current"
                  : "search-highlight";
                highlightSpan.textContent = line.substring(matchStart, matchEnd);
                container.appendChild(highlightSpan);

                lastPos = matchEnd;
              });

              // Add remaining text
              if (lastPos < line.length) {
                container.appendChild(document.createTextNode(line.substring(lastPos)));
              }

              fragment.appendChild(container);
            }
          }
        });
      }
    });

    // Append the entire fragment at once
    editorRef.current.appendChild(fragment);
  };

  // Apply syntax highlighting decorations with proper cursor preservation
  useEffect(() => {
    if (editorRef?.current) {
      const isEditorFocused = document.activeElement === editorRef.current;
      const isComposing = editorRef.current.hasAttribute("data-composing");

      // Skip highlighting only during active text composition
      if (!isComposing) {
        // Save cursor position if editor is focused
        let cursorPos = 0;
        if (isEditorFocused) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(editorRef.current);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            cursorPos = preCaretRange.toString().length;
          }
        }

        if (tokens.length > 0) {
          // Apply syntax highlighting with search highlighting
          applyDecorationsWithSearch(
            editorRef,
            codeEditorValue,
            tokens,
            searchMatches,
            currentMatchIndex,
          );
        } else {
          // No tokens, just apply search highlighting to plain text using DOM
          if (searchMatches.length > 0) {
            editorRef.current.innerHTML = "";
            const fragment = document.createDocumentFragment();

            // Sort matches by position
            const sortedMatches = [...searchMatches]
              .map((match, index) => ({ ...match, originalIndex: index }))
              .sort((a, b) => a.start - b.start);

            let lastPos = 0;
            sortedMatches.forEach(match => {
              // Add text before match
              if (match.start > lastPos) {
                fragment.appendChild(
                  document.createTextNode(codeEditorValue.substring(lastPos, match.start)),
                );
              }

              // Add highlighted match
              const isCurrentMatch = match.originalIndex === currentMatchIndex;
              const highlightSpan = document.createElement("span");
              highlightSpan.className = isCurrentMatch
                ? "search-highlight-current"
                : "search-highlight";
              highlightSpan.textContent = codeEditorValue.substring(match.start, match.end);
              fragment.appendChild(highlightSpan);

              lastPos = match.end;
            });

            // Add remaining text
            if (lastPos < codeEditorValue.length) {
              fragment.appendChild(document.createTextNode(codeEditorValue.substring(lastPos)));
            }

            editorRef.current.appendChild(fragment);
          } else if (editorRef.current.textContent !== codeEditorValue) {
            editorRef.current.textContent = codeEditorValue;
          }
        }

        // Restore cursor position if editor was focused
        if (isEditorFocused && cursorPos > 0 && editorRef.current) {
          setTimeout(() => {
            if (document.activeElement === editorRef.current && editorRef.current) {
              setOptimizedCursorPosition(editorRef.current, cursorPos, window.getSelection()!);
            }
          }, 0);
        }
      }
    }
  }, [tokens, codeEditorValue, searchMatches, currentMatchIndex, editorRef]);

  // Handle file path changes
  useEffect(() => {
    if (filePath !== previousFilePathRef.current) {
      // File changed, immediately show plain text
      if (editorRef?.current) {
        editorRef.current.textContent = codeEditorValue;
      }
      previousFilePathRef.current = filePath;
    }

    // Fetch new tokens
    debouncedFetchTokens(codeEditorValue, filePath);
  }, [codeEditorValue, filePath, debouncedFetchTokens, clearTokens, editorRef]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleCursorPositionChange = () => {
    if (editorRef?.current) {
      const position = getCursorPosition(editorRef.current);
      onCursorPositionChange?.(position);
    }
  };
  const triggerLsp = () => {
    if (!editorRef?.current) return;
    const position = getCursorPosition(editorRef.current);
    const lastChar = codeEditorValue.charAt(position - 1);
    const delay = /[.::>()<]/.test(lastChar) ? 50 : 300;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const currentPosition = getCursorPosition(editorRef.current!);
      const isRemoteFile = filePath?.startsWith("remote://");
      if (
        !isRemoteFile &&
        handleLspCompletion &&
        isLanguageSupported?.(filePath || "") &&
        (!vimEnabled || vimMode === "insert")
      ) {
        handleLspCompletion(currentPosition, editorRef!);
      }
    }, delay);
  };

  return (
    <div
      ref={editorRef}
      contentEditable={!disabled}
      suppressContentEditableWarning={true}
      onCompositionStart={() => {
        if (editorRef?.current) {
          editorRef.current.setAttribute("data-composing", "true");
        }
      }}
      onCompositionEnd={() => {
        if (editorRef?.current) {
          editorRef.current.removeAttribute("data-composing");
        }
      }}
      onBeforeInput={e => {
        // Mark as composing during input to prevent highlighting interference
        const target = e.currentTarget as HTMLDivElement;
        target.setAttribute("data-composing", "true");

        // Remove composition flag after input is processed
        setTimeout(() => {
          target.removeAttribute("data-composing");
        }, 0);
      }}
      onInput={e => {
        handleUserInteraction();
        const target = e.currentTarget;
        const content = target.textContent || "";
        setCodeEditorValue(content);
        onChange?.(content);
      }}
      onKeyDown={e => {
        handleUserInteraction();
        handleKeyDown(e);
      }}
      onKeyUp={() => {
        handleCursorPositionChange();
        triggerLsp();
      }}
      onClick={() => {
        handleUserInteraction();
        handleCursorPositionChange();
      }}
      onScroll={handleScroll}
      onMouseMove={handleHover}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onBlur={() => {
        // Highlighting is now maintained continuously, no special blur handling needed
      }}
      onFocus={() => {
        // Keep syntax highlighting when focusing - no need to convert to plain text
        handleCursorPositionChange();
      }}
      className={cn(
        getEditorClasses(),
        "code-editor-content",
        vimEnabled && vimMode === "normal" && "vim-normal-mode",
        vimEnabled && vimMode === "insert" && "vim-insert-mode",
        className,
      )}
      style={{
        ...getEditorStyles,
        padding: "8px",
        minHeight: "100%",
        outline: "none",
        whiteSpace: wordWrap ? "pre-wrap" : "pre",
        wordBreak: wordWrap ? "break-word" : "normal",
        overflowWrap: wordWrap ? "break-word" : "normal",
        color: "var(--tw-text)",
        background: "transparent",
        caretColor: vimEnabled && vimMode === "normal" ? "transparent" : "var(--tw-text)",
        border: "none",
        resize: "none",
      }}
      spellCheck={false}
      autoCapitalize="off"
      data-placeholder={placeholder}
    />
  );
}
