import type React from "react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { EDITOR_CONSTANTS } from "../../../constants/editor-constants";
import { useEditorContentStore } from "../../../stores/editor-content-store";
import { useEditorCursorStore } from "../../../stores/editor-cursor-store";
import { LineWithContent } from "./line-with-content";

interface EditorViewportProps {
  showLineNumbers: boolean;
  gutterWidth: number;
  lineHeight: number;
  scrollTop: number;
  scrollLeft: number;
  viewportHeight: number;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLElement>) => void;
}

export const EditorViewport = memo<EditorViewportProps>(
  ({
    showLineNumbers,
    gutterWidth,
    lineHeight,
    scrollTop,
    scrollLeft: _scrollLeft,
    viewportHeight,
    onScroll,
    onClick,
    onMouseDown,
    onMouseMove,
    onMouseUp,
  }) => {
    const selection = useEditorCursorStore((state) => state.selection);
    const lineCount = useEditorContentStore((state) => state.lines.length);

    const selectedLines = useMemo(() => {
      const lines = new Set<number>();
      if (selection) {
        for (let i = selection.start.line; i <= selection.end.line; i++) {
          lines.add(i);
        }
      }
      return lines;
    }, [selection]);
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
      // Dynamic overscan based on viewport size
      const visibleLineCount = endLine - startLine;
      const overscan = Math.max(
        EDITOR_CONSTANTS.MIN_OVERSCAN_LINES,
        Math.ceil(visibleLineCount * EDITOR_CONSTANTS.VIEWPORT_OVERSCAN_RATIO),
      );

      return {
        start: Math.max(0, startLine - overscan),
        end: Math.min(lineCount, endLine + overscan),
      };
    }, [scrollTop, lineHeight, viewportHeight, lineCount, forceUpdate]);

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

    const totalHeight = lineCount * lineHeight;

    const renderVisibleLines = () => {
      const elements: React.ReactNode[] = [];

      for (let i = visibleRange.start; i < visibleRange.end; i++) {
        elements.push(
          <LineWithContent
            key={i}
            lineNumber={i}
            showLineNumbers={showLineNumbers}
            gutterWidth={gutterWidth}
            lineHeight={lineHeight}
            isSelected={selectedLines.has(i)}
          />,
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
