import { memo, useEffect, useRef } from "react";
import type { Position } from "../../types/editor-types";
import { measureText } from "../../utils/text-operations";

interface CursorOverlayProps {
  position: Position;
  lines: string[];
  lineHeight: number;
  fontSize: number;
  gutterWidth: number;
  scrollTop: number;
  scrollLeft: number;
}

export const CursorOverlay = memo<CursorOverlayProps>(
  ({ position, lines, lineHeight, fontSize, gutterWidth, scrollTop, scrollLeft }) => {
    const cursorRef = useRef<HTMLDivElement>(null);

    // Calculate cursor pixel position
    const calculateCursorPosition = () => {
      const line = lines[position.line];
      if (!line) {
        return { x: gutterWidth, y: position.line * lineHeight };
      }

      // Measure text width up to cursor column
      const textBeforeCursor = line.substring(0, position.column);
      const x = gutterWidth + measureText(textBeforeCursor, `${fontSize}px monospace`) - scrollLeft;
      const y = position.line * lineHeight - scrollTop;

      return { x, y };
    };

    const { x, y } = calculateCursorPosition();

    // Ensure cursor blinks
    useEffect(() => {
      if (cursorRef.current) {
        // Reset animation to ensure blinking
        cursorRef.current.style.animation = "none";
        void cursorRef.current.offsetHeight; // Trigger reflow
        cursorRef.current.style.animation = "";
      }
    }, [position]);

    return (
      <div
        ref={cursorRef}
        className="editor-cursor"
        style={{
          position: "absolute",
          left: `${x}px`,
          top: `${y}px`,
          width: "2px",
          height: `${lineHeight}px`,
          backgroundColor: "var(--color-cursor, #000)",
          zIndex: 10,
        }}
      />
    );
  },
);

CursorOverlay.displayName = "CursorOverlay";
