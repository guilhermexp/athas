import type React from "react";
import type { Position } from "../../types/editor-types";

interface CursorOverlayProps {
  position: Position;
  lineHeight: number;
  fontSize: number;
  gutterWidth: number;
  scrollTop: number;
  scrollLeft: number;
  visible?: boolean;
}

export const CursorOverlay: React.FC<CursorOverlayProps> = ({
  position,
  lineHeight,
  fontSize,
  gutterWidth,
  scrollTop,
  scrollLeft,
  visible = true,
}) => {
  if (!visible) return null;

  const charWidth = fontSize * 0.6;
  const x = gutterWidth + position.column * charWidth - scrollLeft;
  const y = position.line * lineHeight - scrollTop;

  return (
    <div
      className="editor-cursor"
      style={{
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        width: "2px",
        height: `${lineHeight}px`,
        backgroundColor: "var(--cursor-color, var(--color-cursor))",
        pointerEvents: "none",
      }}
    />
  );
};
