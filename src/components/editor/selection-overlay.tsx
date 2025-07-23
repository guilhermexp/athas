import type React from "react";
import { memo } from "react";
import type { Range } from "../../types/editor-types";
import { measureText } from "../../utils/text-operations";

interface SelectionOverlayProps {
  selection: Range;
  lines: string[];
  lineHeight: number;
  fontSize: number;
  gutterWidth: number;
  scrollTop: number;
  scrollLeft: number;
}

export const SelectionOverlay = memo<SelectionOverlayProps>(
  ({ selection, lines, lineHeight, fontSize, gutterWidth, scrollTop, scrollLeft }) => {
    const renderSelectionRects = () => {
      const rects: React.ReactNode[] = [];
      const { start, end } = selection;

      // Single line selection
      if (start.line === end.line) {
        const line = lines[start.line];
        if (!line) return null;

        const startX =
          gutterWidth +
          measureText(line.substring(0, start.column), `${fontSize}px monospace`) -
          scrollLeft;
        const endX =
          gutterWidth +
          measureText(line.substring(0, end.column), `${fontSize}px monospace`) -
          scrollLeft;
        const y = start.line * lineHeight - scrollTop;

        rects.push(
          <div
            key={`selection-${start.line}`}
            className="selection-rect"
            style={{
              position: "absolute",
              left: `${startX}px`,
              top: `${y}px`,
              width: `${endX - startX}px`,
              height: `${lineHeight}px`,
              backgroundColor: "var(--color-selection, rgba(100, 149, 237, 0.3))",
              pointerEvents: "none",
            }}
          />,
        );
      } else {
        // Multi-line selection
        for (let lineIndex = start.line; lineIndex <= end.line; lineIndex++) {
          const line = lines[lineIndex];
          if (!line && lineIndex !== end.line) continue;

          let startCol = 0;
          let endCol = line?.length || 0;

          if (lineIndex === start.line) {
            startCol = start.column;
          }
          if (lineIndex === end.line) {
            endCol = end.column;
          }

          const startX =
            gutterWidth +
            measureText(line?.substring(0, startCol) || "", `${fontSize}px monospace`) -
            scrollLeft;
          const endX =
            gutterWidth +
            measureText(line?.substring(0, endCol) || "", `${fontSize}px monospace`) -
            scrollLeft;
          const y = lineIndex * lineHeight - scrollTop;

          rects.push(
            <div
              key={`selection-${lineIndex}`}
              className="selection-rect"
              style={{
                position: "absolute",
                left: `${startX}px`,
                top: `${y}px`,
                width: `${Math.max(endX - startX, 0)}px`,
                height: `${lineHeight}px`,
                backgroundColor: "var(--color-selection, rgba(100, 149, 237, 0.3))",
                pointerEvents: "none",
              }}
            />,
          );
        }
      }

      return rects;
    };

    return <>{renderSelectionRects()}</>;
  },
);

SelectionOverlay.displayName = "SelectionOverlay";
