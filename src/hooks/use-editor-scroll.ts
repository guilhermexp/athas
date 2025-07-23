import type React from "react";
import { useCallback } from "react";

export const useEditorScroll = (
  editorRef: React.RefObject<HTMLDivElement | null>,
  _highlightRef: React.RefObject<HTMLPreElement | null> | null,
  lineNumbersRef: React.RefObject<HTMLDivElement | null>,
) => {
  // Sync scroll between contenteditable and line numbers
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollingElement = e.currentTarget;
      if (lineNumbersRef.current) {
        const scrollTop = scrollingElement.scrollTop;
        lineNumbersRef.current.scrollTop = scrollTop;
      }
    },
    [lineNumbersRef],
  );

  // Handle cursor position changes
  const handleCursorPositionChange = useCallback(
    (onCursorPositionChange?: (position: number) => void) => {
      if (editorRef.current) {
        // Get cursor position from selection
        const selection = window.getSelection();
        const position = selection?.focusOffset || 0;

        if (onCursorPositionChange) {
          onCursorPositionChange(position);
        }
      }
    },
    [editorRef],
  );

  // Handle user interaction (typing, clicking, etc.)
  const handleUserInteraction = useCallback(() => {
    // Placeholder for future use
  }, []);

  return {
    handleScroll,
    handleCursorPositionChange,
    handleUserInteraction,
  };
};
