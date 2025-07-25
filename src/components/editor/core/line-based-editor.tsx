import { memo, useEffect, useRef, useState } from "react";
import { EDITOR_CONSTANTS } from "../../../constants/editor-constants";
import { useEditorInteractions } from "../../../hooks/use-editor-interactions";
import { useEditorContentStore } from "../../../stores/editor-content-store";
import { useEditorCursorStore } from "../../../stores/editor-cursor-store";
import { useEditorSettingsStore } from "../../../stores/editor-settings-store";
import type { Position } from "../../../types/editor-types";
import { getLineHeight } from "../../../utils/editor-position";
import { Cursor } from "../overlays/cursor";
import { DebugOverlay } from "../overlays/debug-overlay";
import { DecorationLayer } from "../overlays/decoration-layer";
import { EditorViewport } from "../rendering/editor-viewport";
import { EditorLayer, EditorLayers } from "./editor-layers";
import "../../../styles/editor-line-based.css";
import "../../../styles/token-theme.css";

interface LineBasedEditorProps {
  viewportHeight: number;
  filePath?: string;
  onPositionClick?: (position: Position) => void;
  onSelectionDrag?: (start: Position, end: Position) => void;
}

export const LineBasedEditor = memo<LineBasedEditorProps>(
  ({ viewportHeight, onPositionClick, onSelectionDrag }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const lineCount = useEditorContentStore((state) => state.lines.length);
    const { fontSize, lineNumbers } = useEditorSettingsStore();

    const lineHeight = getLineHeight(fontSize);
    const gutterWidth = lineNumbers
      ? Math.max(
          EDITOR_CONSTANTS.MIN_GUTTER_WIDTH,
          String(lineCount).length * EDITOR_CONSTANTS.GUTTER_CHAR_WIDTH +
            EDITOR_CONSTANTS.GUTTER_PADDING,
        )
      : 0;

    // Setup interaction handlers
    const { handleClick, handleMouseDown, handleMouseMove, handleMouseUp } = useEditorInteractions({
      lineHeight,
      fontSize,
      gutterWidth,
      onPositionClick,
      onSelectionDrag,
    });

    // No longer need to sync - content is already in the same store

    // Subscribe to cursor line changes only
    useEffect(() => {
      const unsubscribe = useEditorCursorStore.subscribe(
        (state) => state.cursorPosition.line,
        (cursorLine) => {
          const cursorTop = cursorLine * lineHeight;
          const cursorBottom = cursorTop + lineHeight;

          if (cursorTop < scrollTop) {
            setScrollTop(cursorTop);
          } else if (cursorBottom > scrollTop + viewportHeight) {
            setScrollTop(cursorBottom - viewportHeight);
          }
        },
      );
      return unsubscribe;
    }, [lineHeight, scrollTop, viewportHeight]);

    const handleScroll = (newScrollTop: number, newScrollLeft: number) => {
      setScrollTop(newScrollTop);
      setScrollLeft(newScrollLeft);
    };

    return (
      <div
        ref={containerRef}
        className="editor-content-new"
        style={{
          position: "relative",
          width: "100%",
          height: `${viewportHeight}px`,
          overflow: "hidden",
          fontSize: `${fontSize}px`,
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        <EditorLayers>
          <EditorLayer type="base">
            <EditorViewport
              showLineNumbers={lineNumbers}
              gutterWidth={gutterWidth}
              lineHeight={lineHeight}
              scrollTop={scrollTop}
              scrollLeft={scrollLeft}
              viewportHeight={viewportHeight}
              onScroll={handleScroll}
              onClick={handleClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
          </EditorLayer>
          <EditorLayer type="decoration">
            <DecorationLayer
              lineHeight={lineHeight}
              fontSize={fontSize}
              gutterWidth={gutterWidth}
              scrollTop={scrollTop}
              scrollLeft={scrollLeft}
            />
          </EditorLayer>
          <EditorLayer type="overlay">
            <Cursor
              lineHeight={lineHeight}
              fontSize={fontSize}
              gutterWidth={gutterWidth}
              scrollTop={scrollTop}
              scrollLeft={scrollLeft}
            />
            <DebugOverlay
              lineHeight={lineHeight}
              fontSize={fontSize}
              gutterWidth={gutterWidth}
              scrollTop={scrollTop}
              scrollLeft={scrollLeft}
            />
          </EditorLayer>
        </EditorLayers>
      </div>
    );
  },
);

LineBasedEditor.displayName = "LineBasedEditor";
