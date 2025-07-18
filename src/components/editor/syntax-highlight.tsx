import { cn } from "@/utils/cn";
import { useCodeHighlighting } from "../../hooks/use-code-highlighting";
import { useEditorConfigStore } from "../../stores/editor-config-store";
import { useEditorInstanceStore } from "../../stores/editor-instance-store";

export function SyntaxHighlight() {
  const { fontSize, tabSize, wordWrap } = useEditorConfigStore();
  const { highlightRef } = useEditorInstanceStore();

  // Initialize PrismJS highlighting
  useCodeHighlighting(highlightRef || { current: null });
  const getEditorStyles = {
    fontSize: `${fontSize}px`,
    tabSize: tabSize,
    lineHeight: `${fontSize * 1.4}px`,
  };

  return (
    <pre
      ref={highlightRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-[1]",
        "m-0 overflow-visible rounded-none border-none bg-transparent",
        "font-mono shadow-none outline-none transition-none",
      )}
      style={{
        ...getEditorStyles,
        padding: "16px",
        minHeight: "100%",
        whiteSpace: wordWrap ? "pre-wrap" : "pre",
        wordBreak: wordWrap ? "break-word" : "normal",
        overflowWrap: wordWrap ? "break-word" : "normal",
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        maxWidth: "fit-content",
        minWidth: "100%",
        color: "var(--tw-text)",
      }}
      aria-hidden="true"
    />
  );
}
