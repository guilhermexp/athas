import type React from "react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { Decoration, LineToken } from "../../types/editor-types";
import { LineGutter } from "./line-gutter";
import { LineRenderer } from "./line-renderer";

interface EditorViewportProps {
  lines: string[];
  lineTokens: Map<number, LineToken[]>;
  decorations: Decoration[];
  showLineNumbers: boolean;
  gutterWidth: number;
  lineHeight: number;
  scrollTop: number;
  scrollLeft: number;
  viewportHeight: number;
  selectedLines: Set<number>;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLElement>) => void;
}

export const EditorViewport = memo<EditorViewportProps>(
  ({
    lines,
    lineTokens,
    decorations,
    showLineNumbers,
    gutterWidth,
    lineHeight,
    scrollTop,
    scrollLeft,
    viewportHeight,
    selectedLines,
    onScroll,
    onClick,
    onMouseDown,
    onMouseMove,
    onMouseUp,
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const visibleRange = useMemo(() => {
      const startLine = Math.floor(scrollTop / lineHeight);
      const endLine = Math.ceil((scrollTop + viewportHeight) / lineHeight);
      const overscan = 5;

      return {
        start: Math.max(0, startLine - overscan),
        end: Math.min(lines.length, endLine + overscan),
      };
    }, [scrollTop, lineHeight, viewportHeight, lines.length]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const newScrollTop = target.scrollTop;
      const newScrollLeft = target.scrollLeft;

      setIsScrolling(true);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);

      onScroll?.(newScrollTop, newScrollLeft);
    };

    useEffect(() => {
      return () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, []);

    const totalHeight = lines.length * lineHeight;

    const renderVisibleLines = () => {
      const elements: React.ReactNode[] = [];

      for (let i = visibleRange.start; i < visibleRange.end; i++) {
        const line = lines[i];
        const tokens = lineTokens.get(i) || [];
        const lineDecorations = decorations.filter(
          d => d.range.start.line <= i && d.range.end.line >= i,
        );

        elements.push(
          <div
            key={i}
            className="editor-line-wrapper"
            style={{
              position: "absolute",
              top: `${i * lineHeight}px`,
              left: 0,
              right: 0,
              height: `${lineHeight}px`,
              display: "flex",
            }}
          >
            {showLineNumbers && (
              <LineGutter
                lineNumber={i}
                showLineNumbers={showLineNumbers}
                gutterWidth={gutterWidth}
                decorations={lineDecorations}
              />
            )}
            <div
              className="editor-line-content-wrapper"
              style={{
                flex: 1,
                transform: `translateX(-${scrollLeft}px)`,
                willChange: isScrolling ? "transform" : "auto",
              }}
            >
              <LineRenderer
                lineNumber={i}
                content={line}
                tokens={tokens}
                decorations={lineDecorations}
                isSelected={selectedLines.has(i)}
              />
            </div>
          </div>,
        );
      }

      return elements;
    };

    return (
      <div
        ref={containerRef}
        className="editor-viewport"
        onScroll={handleScroll}
        style={{
          position: "relative",
          overflow: "auto",
          height: `${viewportHeight}px`,
        }}
      >
        <div
          className="editor-content"
          style={{
            position: "relative",
            height: `${totalHeight}px`,
            minWidth: "100%",
          }}
          onClick={onClick}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {renderVisibleLines()}
        </div>
      </div>
    );
  },
);

EditorViewport.displayName = "EditorViewport";
