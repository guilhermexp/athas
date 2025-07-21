import { useEffect, useRef } from "react";
import { useEditorDecorations } from "../../hooks/use-editor-decorations";
import { getCursorPosition } from "../../hooks/use-vim";
import { useCodeEditorStore } from "../../stores/code-editor-store";
import { useEditorConfigStore } from "../../stores/editor-config-store";
import { useEditorInstanceStore } from "../../stores/editor-instance-store";
import { cn } from "../../utils/cn";

export function EditorInput() {
  const { fontSize, tabSize, wordWrap, vimEnabled, vimMode } = useEditorConfigStore();
  const {
    value: codeEditorValue,
    setValue: setCodeEditorValue,
    fontFamily,
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
    fontFamily: fontFamily,
    tabSize: tabSize,
    lineHeight: `${fontSize * 1.4}px`,
  };

  // Debug font changes
  useEffect(() => {
    console.log("Editor font family changed to:", fontFamily);
  }, [fontFamily]);

  const getEditorClasses = () => {
    let classes = `absolute top-0 bottom-0 right-0 left-0 m-0 border-none outline-none overflow-visible shadow-none rounded-none transition-none`;

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

  // Apply syntax highlighting decorations
  useEffect(() => {
    if (editorRef?.current) {
      // Only apply decorations if the editor is not focused to avoid breaking input
      const isEditorFocused = document.activeElement === editorRef.current;

      if (!isEditorFocused) {
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
      } else {
        // When editor is focused, ensure we show plain text to avoid span interference
        if (editorRef.current.innerHTML.includes('<span class="search-highlight')) {
          editorRef.current.textContent = codeEditorValue;
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
      onBeforeInput={e => {
        // Ensure we start with plain text before any input
        const target = e.currentTarget as HTMLDivElement;
        if (target.innerHTML.includes('<span class="search-highlight')) {
          const content = target.textContent || "";
          target.textContent = content;
          // Reset cursor position
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            range.selectNodeContents(target);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }}
      onInput={e => {
        handleUserInteraction();
        const target = e.currentTarget;

        // Ensure we're working with plain text only during input
        if (target.innerHTML.includes('<span class="search-highlight')) {
          const content = target.textContent || "";
          target.textContent = content;
          setCodeEditorValue(content);
          onChange?.(content);
        } else {
          const content = target.textContent || "";
          setCodeEditorValue(content);
          onChange?.(content);
        }
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
        // Apply syntax highlighting with search highlighting when editor loses focus
        if (editorRef?.current) {
          if (tokens.length > 0) {
            applyDecorationsWithSearch(
              editorRef,
              codeEditorValue,
              tokens,
              searchMatches,
              currentMatchIndex,
            );
          } else if (searchMatches.length > 0) {
            // Apply just search highlighting if no syntax tokens using DOM
            editorRef.current.innerHTML = "";
            const fragment = document.createDocumentFragment();

            const sortedMatches = [...searchMatches]
              .map((match, index) => ({ ...match, originalIndex: index }))
              .sort((a, b) => a.start - b.start);

            let lastPos = 0;
            sortedMatches.forEach(match => {
              if (match.start > lastPos) {
                fragment.appendChild(
                  document.createTextNode(codeEditorValue.substring(lastPos, match.start)),
                );
              }

              const isCurrentMatch = match.originalIndex === currentMatchIndex;
              const highlightSpan = document.createElement("span");
              highlightSpan.className = isCurrentMatch
                ? "search-highlight-current"
                : "search-highlight";
              highlightSpan.textContent = codeEditorValue.substring(match.start, match.end);
              fragment.appendChild(highlightSpan);

              lastPos = match.end;
            });

            if (lastPos < codeEditorValue.length) {
              fragment.appendChild(document.createTextNode(codeEditorValue.substring(lastPos)));
            }

            editorRef.current.appendChild(fragment);
          }
        }
      }}
      onFocus={() => {
        // Remove highlighting and show plain text when focusing
        if (editorRef?.current?.innerHTML.includes('<span class="search-highlight')) {
          editorRef.current.textContent = codeEditorValue;
        }
        handleCursorPositionChange();
      }}
      className={cn(
        getEditorClasses(),
        "code-editor-content code-editor-font-override",
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
