import type React from "react";
import { useCallback } from "react";
import { useCodeEditorStore } from "../stores/code-editor-store";

export const useEditorScroll = (
  editorRef: React.RefObject<HTMLDivElement | null>,
  _highlightRef: React.RefObject<HTMLPreElement | null> | null,
  lineNumbersRef: React.RefObject<HTMLDivElement | null>,
) => {
  // Store subscriptions
  const setCursorPosition = useCodeEditorStore(state => state.setCursorPosition);
  const setIsTyping = useCodeEditorStore(state => state.setIsTyping);

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
    (
      onCursorPositionChange?: (position: number) => void,
      filePath?: string,
      isLanguageSupported?: (filePath: string) => boolean,
      handleLspCompletion?: (
        pos: number,
        editorRef: React.RefObject<HTMLDivElement | null>,
      ) => void,
    ) => {
      if (editorRef.current) {
        // Get cursor position from selection
        const selection = window.getSelection();
        const position = selection?.focusOffset || 0;
        setCursorPosition(position);

        if (onCursorPositionChange) {
          onCursorPositionChange(position);
        }

        // Skip LSP for remote files to avoid delays
        const isRemoteFile = filePath?.startsWith("remote://");

        // Trigger LSP completion if supported
        if (!isRemoteFile && handleLspCompletion && isLanguageSupported?.(filePath || "")) {
          handleLspCompletion(position, editorRef);
        }
      }
    },
    [editorRef, setCursorPosition],
  );

  // Handle user interaction (typing, clicking, etc.)
  const handleUserInteraction = useCallback(() => {
    setIsTyping(true);

    // Reset typing state after a short delay
    setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  }, [setIsTyping]);

  return {
    handleScroll,
    handleCursorPositionChange,
    handleUserInteraction,
  };
};
