import { useEffect, useRef, useState } from "react";
import { useEditorDecorations } from "../../hooks/use-editor-decorations";
import { useEditorScroll } from "../../hooks/use-editor-scroll";
import { useEditorContentStore } from "../../stores/editor-content-store";
import { useEditorInstanceStore } from "../../stores/editor-instance-store";
import { useEditorSettingsStore } from "../../stores/editor-settings-store";
import { cn } from "../../utils/cn";

export function TextEditor() {
  const { fontSize, tabSize, wordWrap } = useEditorSettingsStore();
  const { value: codeEditorValue, setValue: setCodeEditorValue } = useEditorContentStore();
  const { onChange, disabled, placeholder, filePath, editorRef, lineNumbersRef } =
    useEditorInstanceStore();

  const localRef = useRef<HTMLDivElement>(null);
  const fallbackLineNumbersRef = useRef<HTMLDivElement>(null);

  const { tokens, fetchTokens } = useEditorDecorations();

  // Local state for debouncing
  const [localContent, setLocalContent] = useState(codeEditorValue);
  const [isTyping, setIsTyping] = useState(false);

  // Use the ref from the store or fallback to local ref
  const divRef = editorRef || localRef;

  // Use scroll hook for line numbers sync
  const { handleScroll } = useEditorScroll(divRef, null, lineNumbersRef || fallbackLineNumbersRef);

  // Sync local content with store value when it changes externally
  useEffect(() => {
    if (!isTyping && codeEditorValue !== localContent) {
      setLocalContent(codeEditorValue);
    }
  }, [codeEditorValue, isTyping, localContent]);

  // Fetch tokens when content or file changes
  useEffect(() => {
    if (filePath) {
      fetchTokens(filePath);
    }
  }, [codeEditorValue, filePath, fetchTokens]);

  // Debounce store updates
  useEffect(() => {
    if (!isTyping) return;

    const timer = setTimeout(() => {
      setCodeEditorValue(localContent);
      onChange?.(localContent);
      setIsTyping(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [localContent, isTyping, setCodeEditorValue, onChange]);

  // Apply syntax highlighting only when not typing
  useEffect(() => {
    if (!divRef.current || isTyping || tokens.length === 0) return;

    const element = divRef.current;
    const content = codeEditorValue;

    // Build highlighted HTML
    const highlightedHTML = buildHighlightedHTML(content, tokens);

    // Only update if content has actually changed
    if (element.innerHTML !== highlightedHTML) {
      element.innerHTML = highlightedHTML;
    }
  }, [tokens, codeEditorValue, isTyping, divRef]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.textContent || "";
    setLocalContent(content);
    setIsTyping(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Tab key
    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertText", false, "  ");
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
      onKeyDown={handleKeyDown}
      onScroll={handleScroll}
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

// Build highlighted HTML from content and tokens
function buildHighlightedHTML(content: string, tokens: any[]): string {
  if (!tokens.length || !content) return escapeHtml(content);

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

  return highlightedHTML;
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
