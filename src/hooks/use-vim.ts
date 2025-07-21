import type React from "react";
import { useEffect, useRef } from "react";
import { VimEngine } from "./vim/vim-engine";
import type { VimMode } from "./vim/vim-types";

export const useVim = (
  _editorRef: React.RefObject<HTMLDivElement | null>,
  _content: string,
  onChange: (content: string) => void,
  enabled: boolean,
  onCursorPositionChange: (pos: number) => void,
  onModeChange: (mode: VimMode) => void,
  onShowCommandLine: (initialCommand?: string) => void,
) => {
  const vimEngineRef = useRef<VimEngine | null>(null);

  // Initialize vim engine
  useEffect(() => {
    if (enabled && !vimEngineRef.current) {
      vimEngineRef.current = new VimEngine(
        onCursorPositionChange,
        onChange,
        onModeChange,
        onShowCommandLine,
      );
    } else if (!enabled) {
      vimEngineRef.current = null;
    }
  }, [enabled, onCursorPositionChange, onChange, onModeChange, onShowCommandLine]);

  return {
    vimEngine: vimEngineRef.current,
  };
};

// Helper function to get cursor position in contenteditable
export const getCursorPosition = (element: HTMLDivElement): number => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  return preCaretRange.toString().length;
};

// Helper function to set cursor position in contenteditable
export const setCursorPosition = (element: HTMLDivElement, position: number): void => {
  const selection = window.getSelection();
  if (!selection) return;

  // Only restore cursor if the element already has focus
  // This prevents stealing focus from other inputs like the AI chat
  const isElementFocused =
    document.activeElement === element || element.contains(document.activeElement);
  if (!isElementFocused) return;

  // Ensure position is within bounds
  const textContent = element.textContent || "";
  const clampedPosition = Math.max(0, Math.min(position, textContent.length));

  const range = document.createRange();
  const result = findTextNodeAtPosition(element, clampedPosition);

  if (result.node) {
    try {
      range.setStart(result.node, result.offset);
      range.setEnd(result.node, result.offset);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (error) {
      console.warn("Error setting cursor position:", error);
      // Fallback to placing cursor at end
      setCursorAtEnd(element, selection);
    }
  } else {
    // Fallback to placing cursor at end
    setCursorAtEnd(element, selection);
  }
};

// Helper function to find text node at position (optimized for large files)
const findTextNodeAtPosition = (
  element: HTMLDivElement,
  position: number,
): { node: Text | null; offset: number } => {
  let currentPos = 0;

  const findNodeRecursive = (node: Node): { node: Text | null; offset: number } => {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const textLength = textNode.textContent?.length || 0;

      if (currentPos + textLength >= position) {
        return { node: textNode, offset: Math.min(position - currentPos, textLength) };
      } else {
        currentPos += textLength;
        return { node: null, offset: 0 };
      }
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      for (let i = 0; i < node.childNodes.length; i++) {
        const result = findNodeRecursive(node.childNodes[i]);
        if (result.node) {
          return result;
        }
      }
    }

    return { node: null, offset: 0 };
  };

  return findNodeRecursive(element);
};

// Helper function to set cursor at end of element
const setCursorAtEnd = (element: HTMLDivElement, selection: Selection): void => {
  const range = document.createRange();

  // Find the last text node
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  let lastNode: Text | null = null;
  let node = walker.nextNode();

  while (node) {
    lastNode = node as Text;
    node = walker.nextNode();
  }

  if (lastNode) {
    const textLength = lastNode.textContent?.length || 0;
    range.setStart(lastNode, textLength);
    range.setEnd(lastNode, textLength);
  } else {
    // If no text nodes, place cursor at end of element
    range.selectNodeContents(element);
    range.collapse(false);
  }

  selection.removeAllRanges();
  selection.addRange(range);
};
