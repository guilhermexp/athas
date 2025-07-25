import { memo } from "react";
import { useEditorCursorStore } from "../../stores/editor-cursor-store";
import { getCharWidth } from "../../utils/editor-position";

interface CursorOverlayProps {
  lineHeight: number;
  fontSize: number;
  gutterWidth: number;
  scrollTop: number;
  scrollLeft: number;
  visible?: boolean;
}

export const CursorOverlay = memo<CursorOverlayProps>(
  ({ lineHeight, fontSize, gutterWidth, scrollTop, scrollLeft, visible = true }) => {
    const position = useEditorCursorStore((state) => state.cursorPosition);

    if (!visible) return null;

    const charWidth = getCharWidth(fontSize);
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
  },
);

CursorOverlay.displayName = "CursorOverlay";
