import { useEffect, useRef } from "react";
import { useEditorCursorStore } from "../../../stores/editor-cursor-store";
import { getCharWidth } from "../../../utils/editor-position";

interface CursorRendererProps {
  lineHeight: number;
  fontSize: number;
  gutterWidth: number;
  scrollTop: number;
  scrollLeft: number;
  visible?: boolean;
}

export function Cursor({
  lineHeight,
  fontSize,
  gutterWidth,
  scrollTop,
  scrollLeft,
  visible = true,
}: CursorRendererProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const movementTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const charWidth = getCharWidth(fontSize);

  // Update position without re-rendering
  useEffect(() => {
    if (!cursorRef.current || !visible) return;

    const unsubscribe = useEditorCursorStore.subscribe(
      (state) => state.cursorPosition,
      (position) => {
        if (!cursorRef.current) return;

        const x = gutterWidth + position.column * charWidth - scrollLeft;
        const y = position.line * lineHeight - scrollTop;

        // Add moving class to pause blinking
        cursorRef.current.classList.add("moving");

        // Clear existing timeout
        if (movementTimeoutRef.current) {
          clearTimeout(movementTimeoutRef.current);
        }

        // Remove moving class after cursor stops moving
        movementTimeoutRef.current = setTimeout(() => {
          cursorRef.current?.classList.remove("moving");
        }, 100);

        // Use direct positioning for immediate updates
        cursorRef.current.style.left = `${x}px`;
        cursorRef.current.style.top = `${y}px`;
      },
    );

    // Set initial position
    const position = useEditorCursorStore.getState().cursorPosition;
    const x = gutterWidth + position.column * charWidth - scrollLeft;
    const y = position.line * lineHeight - scrollTop;
    cursorRef.current.style.left = `${x}px`;
    cursorRef.current.style.top = `${y}px`;

    return () => {
      unsubscribe();
      if (movementTimeoutRef.current) {
        clearTimeout(movementTimeoutRef.current);
      }
    };
  }, [lineHeight, fontSize, gutterWidth, scrollTop, scrollLeft, charWidth, visible]);

  if (!visible) return null;

  return (
    <div
      ref={cursorRef}
      className="editor-cursor"
      style={{
        position: "absolute",
        width: "2px",
        height: `${lineHeight}px`,
        backgroundColor: "var(--cursor-color, var(--color-cursor))",
        pointerEvents: "none",
      }}
    />
  );
}
