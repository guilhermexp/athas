import { useEffect, useRef } from "react";
import { useEditorDecorations } from "../../hooks/use-editor-decorations";
import { getCursorPosition } from "../../hooks/use-vim";
import { useCodeEditorStore } from "../../stores/code-editor-store";
import { useEditorConfigStore } from "../../stores/editor-config-store";
import { useEditorInstanceStore } from "../../stores/editor-instance-store";
import { cn } from "../../utils/cn";

export function EditorInput() {
  const { fontSize, tabSize, wordWrap, vimEnabled, vimMode } = useEditorConfigStore();
  const { value: codeEditorValue, setValue: setCodeEditorValue } = useCodeEditorStore();
  const { tokens, debouncedFetchTokens, applyDecorations } = useEditorDecorations();
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

  // Apply syntax highlighting decorations
  useEffect(() => {
    if (editorRef?.current && tokens.length > 0) {
      applyDecorations(editorRef, codeEditorValue, tokens);
    } else if (editorRef?.current && editorRef.current.textContent !== codeEditorValue) {
      // If no tokens, just set plain text
      editorRef.current.textContent = codeEditorValue;
    }
  }, [tokens, codeEditorValue, editorRef, applyDecorations]);

  // Fetch tokens when content or file path changes
  useEffect(() => {
    debouncedFetchTokens(codeEditorValue, filePath);
  }, [codeEditorValue, filePath, debouncedFetchTokens]);

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
      onInput={e => {
        handleUserInteraction();
        const content = e.currentTarget.textContent || "";
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
      className={cn(
        getEditorClasses(),
        "code-editor-content",
        vimEnabled && vimMode === "normal" && "vim-normal-mode",
        vimEnabled && vimMode === "insert" && "vim-insert-mode",
        className,
      )}
      style={{
        ...getEditorStyles,
        padding: "16px",
        minHeight: "100%",
        outline: "none",
        whiteSpace: wordWrap ? "pre-wrap" : "pre",
        wordBreak: wordWrap ? "break-word" : "normal",
        overflowWrap: wordWrap ? "break-word" : "normal",
        color: "var(--tw-text)",
        background: "transparent",
        caretColor: vimEnabled && vimMode === "normal" ? "transparent" : "var(--tw-text)",
        border: "none",
        maxWidth: "fit-content",
        minWidth: "100%",
        resize: "none",
      }}
      spellCheck={false}
      autoCapitalize="off"
      data-placeholder={placeholder}
    />
  );
}
