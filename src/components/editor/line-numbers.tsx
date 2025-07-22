import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEditorInstanceStore } from "../../stores/editor-instance-store";
import { useEditorSettingsStore } from "../../stores/editor-settings-store";

export function LineNumbers() {
  const fontSize = useEditorSettingsStore(state => state.fontSize);
  const wordWrap = useEditorSettingsStore(state => state.wordWrap);
  const fontFamily = useEditorSettingsStore(state => state.fontFamily);
  const { value, lineNumbersRef, editorRef } = useEditorInstanceStore();
  const [lineElements, setLineElements] = useState<React.ReactElement[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Create line number elements that match editor content height
  const updateLineNumbers = useMemo(() => {
    return () => {
      if (!value) {
        const singleLine = (
          <div
            key={1}
            style={{
              height: `${fontSize * 1.4}px`,
              lineHeight: `${fontSize * 1.4}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              fontSize: "inherit",
            }}
          >
            1
          </div>
        );
        setLineElements([singleLine]);
        return;
      }

      const lineHeight = fontSize * 1.4;
      const textLines = value.split("\n");

      if (wordWrap && editorRef?.current) {
        // For word wrap, we need to calculate visual lines based on content wrapping
        const editor = editorRef.current;
        const editorWidth = editor.clientWidth - 16; // Account for padding
        const charWidth = fontSize * 0.6; // Approximate character width in monospace
        const charsPerLine = Math.floor(editorWidth / charWidth);

        const elements: React.ReactElement[] = [];
        let visualLineIndex = 0;

        textLines.forEach((textLine, textLineIndex) => {
          const lineNumber = textLineIndex + 1;

          if (textLine.length === 0) {
            // Empty line
            elements.push(
              <div
                key={`${lineNumber}-${visualLineIndex}`}
                style={{
                  height: `${lineHeight}px`,
                  lineHeight: `${lineHeight}px`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  fontSize: "inherit",
                }}
              >
                {lineNumber}
              </div>,
            );
            visualLineIndex++;
          } else {
            // Calculate how many visual lines this text line will take
            const wrappedLines = Math.max(1, Math.ceil(textLine.length / charsPerLine));

            for (let wrapIndex = 0; wrapIndex < wrappedLines; wrapIndex++) {
              elements.push(
                <div
                  key={`${lineNumber}-${visualLineIndex}`}
                  style={{
                    height: `${lineHeight}px`,
                    lineHeight: `${lineHeight}px`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    fontSize: "inherit",
                    opacity: wrapIndex === 0 ? 1 : 0.3, // Dim wrapped line numbers
                  }}
                >
                  {wrapIndex === 0 ? lineNumber : ""}
                </div>,
              );
              visualLineIndex++;
            }
          }
        });

        setLineElements(elements);
      } else {
        // No word wrap - simple 1:1 mapping
        const elements = textLines.map((_, index) => {
          const lineNumber = index + 1;
          return (
            <div
              key={lineNumber}
              style={{
                height: `${lineHeight}px`,
                lineHeight: `${lineHeight}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                fontSize: "inherit",
              }}
            >
              {lineNumber}
            </div>
          );
        });

        setLineElements(elements);
      }
    };
  }, [value, fontSize, wordWrap, editorRef]);

  // Update line numbers when content changes
  useEffect(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      updateLineNumbers();
    }, 50);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [updateLineNumbers]);

  // Set up resize observer for word wrap scenarios
  useEffect(() => {
    if (!editorRef?.current || !wordWrap) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        updateLineNumbers();
      }, 100);
    });

    resizeObserverRef.current.observe(editorRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [wordWrap, editorRef, updateLineNumbers]);

  // Calculate container width based on text line count (not visual lines)
  const containerWidth = useMemo(() => {
    const textLines = value.split("\n");
    const maxLineNumber = Math.max(1, textLines.length);
    return `${Math.max(3, Math.floor(Math.log10(maxLineNumber)) + 1) * fontSize * 0.6 + 24}px`;
  }, [value, fontSize]);

  return (
    <div
      className="relative flex-shrink-0 overflow-hidden border-border border-r bg-terniary-bg"
      style={{ width: containerWidth }}
    >
      <div
        ref={lineNumbersRef}
        className="line-numbers-container absolute inset-0 overflow-hidden font-override"
        style={{
          padding: "8px 8px 50vh 16px", // Match editor padding
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily,
          lineHeight: `${fontSize * 1.4}px`,
          color: "var(--tw-text-lighter)",
          textAlign: "right",
          userSelect: "none",
          pointerEvents: "none",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitFontFeatureSettings: '"tnum"',
          fontFeatureSettings: '"tnum"',
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {lineElements}
      </div>
    </div>
  );
}
