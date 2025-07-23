import type React from "react";
import { useMemo } from "react";
import type { Position } from "../../types/editor-types";

interface OverlayItem {
  id: string;
  position: Position;
  content: React.ReactNode;
  className?: string;
  offset?: { x: number; y: number };
}

interface EditorOverlayProps {
  items: OverlayItem[];
  lineHeight: number;
  fontSize: number;
  gutterWidth: number;
  scrollTop: number;
  scrollLeft: number;
}

export const EditorOverlay: React.FC<EditorOverlayProps> = ({
  items,
  lineHeight,
  fontSize,
  gutterWidth,
  scrollTop,
  scrollLeft,
}) => {
  const charWidth = fontSize * 0.6;

  const positionedItems = useMemo(() => {
    return items.map(item => {
      const x = gutterWidth + item.position.column * charWidth - scrollLeft + (item.offset?.x ?? 0);
      const y = item.position.line * lineHeight - scrollTop + (item.offset?.y ?? 0);

      return {
        ...item,
        x,
        y,
      };
    });
  }, [items, lineHeight, charWidth, gutterWidth, scrollTop, scrollLeft]);

  return (
    <>
      {positionedItems.map(item => (
        <div
          key={item.id}
          className={`editor-overlay-item ${item.className ?? ""}`}
          style={{
            position: "absolute",
            left: `${item.x}px`,
            top: `${item.y}px`,
            pointerEvents: "auto",
          }}
        >
          {item.content}
        </div>
      ))}
    </>
  );
};

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
        backgroundColor: "var(--cursor-color, #000)",
        pointerEvents: "none",
      }}
    />
  );
};
