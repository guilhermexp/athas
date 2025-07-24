import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { extensionManager } from "../../extensions/extension-manager";
import { useEditorInteractions } from "../../hooks/use-editor-interactions";
import { useEditorContentStore } from "../../stores/editor-content-store";
import { useEditorDecorationsStore } from "../../stores/editor-decorations-store";
import { useEditorLinesStore } from "../../stores/editor-lines-store";
import { useEditorSettingsStore } from "../../stores/editor-settings-store";
import type { Decoration, Position } from "../../types/editor-types";
import { DecorationLayer } from "./decoration-layer";
import { EditorLayer, EditorLayers } from "./editor-layers";
import { CursorOverlay } from "./editor-overlay";
import { EditorViewport } from "./editor-viewport";
import "../../styles/editor-line-based.css";
import "../../styles/token-theme.css";

interface EditorContentNewProps {
  cursorPosition: Position;
  selection: { start: Position; end: Position } | null;
  viewportHeight: number;
  filePath?: string;
  onPositionClick?: (position: Position) => void;
  onSelectionDrag?: (start: Position, end: Position) => void;
}

export const EditorContentNew: React.FC<EditorContentNewProps> = ({
  cursorPosition,
  selection,
  viewportHeight,
  onPositionClick,
  onSelectionDrag,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const { lines, lineTokens, setContent } = useEditorLinesStore();
  const { fontSize, lineNumbers } = useEditorSettingsStore();
  const { bufferContent } = useEditorContentStore();
  const { getDecorations } = useEditorDecorationsStore();

  const lineHeight = fontSize * 1.4;
  const gutterWidth = lineNumbers ? Math.max(40, String(lines.length).length * 8 + 16) : 0;

  // Setup interaction handlers
  const { handleClick, handleMouseDown, handleMouseMove, handleMouseUp } = useEditorInteractions({
    lines,
    lineHeight,
    fontSize,
    gutterWidth,
    scrollTop,
    scrollLeft,
    onPositionClick,
    onSelectionDrag,
  });

  // Sync buffer content with lines store
  useEffect(() => {
    setContent(bufferContent);
  }, [bufferContent, setContent]);

  // Calculate selected lines
  const selectedLines = useMemo(() => {
    const selected = new Set<number>();
    if (selection) {
      for (let i = selection.start.line; i <= selection.end.line; i++) {
        selected.add(i);
      }
    }
    return selected;
  }, [selection]);

  // Get decorations from store, extensions, and add selection
  const decorations = useMemo(() => {
    const storeDecorations = getDecorations();
    const extensionDecorations = extensionManager.getAllDecorations();

    console.log(
      `EditorContent: ${storeDecorations.length} store decorations, ${extensionDecorations.length} extension decorations`,
    );

    const decs: Decoration[] = [...storeDecorations, ...extensionDecorations];

    // Add selection decoration
    if (selection) {
      decs.push({
        range: selection,
        type: "inline",
        className: "selection",
      });
    }

    return decs;
  }, [getDecorations, selection]);

  // Ensure cursor is visible
  useEffect(() => {
    const cursorLine = cursorPosition.line;
    const cursorTop = cursorLine * lineHeight;
    const cursorBottom = cursorTop + lineHeight;

    if (cursorTop < scrollTop) {
      setScrollTop(cursorTop);
    } else if (cursorBottom > scrollTop + viewportHeight) {
      setScrollTop(cursorBottom - viewportHeight);
    }
  }, [cursorPosition.line, lineHeight, scrollTop, viewportHeight]);

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
            lines={lines}
            lineTokens={lineTokens}
            decorations={[]} // Pass empty decorations to viewport
            showLineNumbers={lineNumbers}
            gutterWidth={gutterWidth}
            lineHeight={lineHeight}
            scrollTop={scrollTop}
            scrollLeft={scrollLeft}
            viewportHeight={viewportHeight}
            selectedLines={selectedLines}
            onScroll={handleScroll}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </EditorLayer>
        <EditorLayer type="decoration">
          <DecorationLayer
            decorations={decorations}
            lines={lines}
            lineHeight={lineHeight}
            fontSize={fontSize}
            gutterWidth={gutterWidth}
            scrollTop={scrollTop}
            scrollLeft={scrollLeft}
          />
        </EditorLayer>
        <EditorLayer type="overlay">
          <CursorOverlay
            position={cursorPosition}
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
};
