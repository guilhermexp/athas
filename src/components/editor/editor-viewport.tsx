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
    scrollLeft: _scrollLeft,
    viewportHeight,
    selectedLines,
    onScroll,
    onClick,
    onMouseDown,
    onMouseMove,
    onMouseUp,
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [, forceUpdate] = useState({});
    const isScrollingRef = useRef(false);

    // Sync scroll position from prop only when not actively scrolling
    useEffect(() => {
      if (containerRef.current && !isScrollingRef.current) {
        containerRef.current.scrollTop = scrollTop;
      }
    }, [scrollTop]);

    const visibleRange = useMemo(() => {
      // Use the actual scroll position from the DOM element if available
      const actualScrollTop = containerRef.current?.scrollTop ?? scrollTop;
      const startLine = Math.floor(actualScrollTop / lineHeight);
      const endLine = Math.ceil((actualScrollTop + viewportHeight) / lineHeight);
      // Dynamic overscan based on viewport size - 25% of visible lines
      const visibleLineCount = endLine - startLine;
      const overscan = Math.max(3, Math.ceil(visibleLineCount * 0.25));

      return {
        start: Math.max(0, startLine - overscan),
        end: Math.min(lines.length, endLine + overscan),
      };
    }, [scrollTop, lineHeight, viewportHeight, lines.length, forceUpdate]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const newScrollTop = target.scrollTop;
      const newScrollLeft = target.scrollLeft;

      isScrollingRef.current = true;
      setIsScrolling(true);

      // Force re-render to update visible range
      forceUpdate({});

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        isScrollingRef.current = false;
      }, 150);

      // Still notify parent component
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
                paddingLeft: showLineNumbers ? 0 : `16px`,
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
