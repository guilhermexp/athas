import { useCallback, useRef } from "react";
import type { Position } from "../types/editor-types";
import { measureText } from "../utils/text-operations";

interface UseEditorInteractionsProps {
  lines: string[];
  lineHeight: number;
  fontSize: number;
  gutterWidth: number;
  scrollTop: number;
  scrollLeft: number;
  onPositionClick?: (position: Position) => void;
  onSelectionDrag?: (start: Position, end: Position) => void;
}

export const useEditorInteractions = ({
  lines,
  lineHeight,
  fontSize,
  gutterWidth,
  scrollTop,
  scrollLeft,
  onPositionClick,
  onSelectionDrag,
}: UseEditorInteractionsProps) => {
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<Position | null>(null);

  const getPositionFromCoordinates = useCallback(
    (clientX: number, clientY: number, containerRect: DOMRect): Position | null => {
      // Calculate relative position
      const relativeX = clientX - containerRect.left - gutterWidth + scrollLeft;
      const relativeY = clientY - containerRect.top + scrollTop;

      // Calculate line number
      const line = Math.floor(relativeY / lineHeight);
      if (line < 0 || line >= lines.length) {
        return null;
      }

      // Get line content
      const lineContent = lines[line];
      if (!lineContent) {
        return { line, column: 0, offset: 0 };
      }

      // Calculate column using binary search with text measurement
      let left = 0;
      let right = lineContent.length;
      let column = 0;

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const textWidth = measureText(lineContent.substring(0, mid), `${fontSize}px monospace`);

        if (textWidth <= relativeX) {
          column = mid;
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }

      // Calculate offset
      let offset = 0;
      for (let i = 0; i < line; i++) {
        offset += lines[i].length + 1; // +1 for newline
      }
      offset += column;

      return { line, column, offset };
    },
    [lines, lineHeight, fontSize, gutterWidth, scrollTop, scrollLeft],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const container = e.currentTarget;
      const rect = container.getBoundingClientRect();
      const position = getPositionFromCoordinates(e.clientX, e.clientY, rect);

      if (position && onPositionClick) {
        onPositionClick(position);
      }
    },
    [getPositionFromCoordinates, onPositionClick],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const container = e.currentTarget;
      const rect = container.getBoundingClientRect();
      const position = getPositionFromCoordinates(e.clientX, e.clientY, rect);

      if (position) {
        isDraggingRef.current = true;
        dragStartRef.current = position;

        // Prevent default text selection
        e.preventDefault();
      }
    },
    [getPositionFromCoordinates],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!isDraggingRef.current || !dragStartRef.current) {
        return;
      }

      const container = e.currentTarget;
      const rect = container.getBoundingClientRect();
      const position = getPositionFromCoordinates(e.clientX, e.clientY, rect);

      if (position && onSelectionDrag) {
        onSelectionDrag(dragStartRef.current, position);
      }
    },
    [getPositionFromCoordinates, onSelectionDrag],
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
  }, []);

  return {
    handleClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    getPositionFromCoordinates,
  };
};
