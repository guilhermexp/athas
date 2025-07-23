import type React from "react";
import { memo } from "react";
import type { Decoration } from "../../types/editor-types";

interface LineGutterProps {
  lineNumber: number;
  showLineNumbers: boolean;
  gutterWidth: number;
  decorations: Decoration[];
  isBreakpoint?: boolean;
  hasError?: boolean;
  hasWarning?: boolean;
}

export const LineGutter = memo<LineGutterProps>(
  ({
    lineNumber,
    showLineNumbers,
    gutterWidth,
    decorations,
    isBreakpoint = false,
    hasError = false,
    hasWarning = false,
  }) => {
    const gutterDecorations = decorations.filter(
      d => d.type === "gutter" && d.range.start.line === lineNumber,
    );

    const renderGutterContent = () => {
      const content: React.ReactNode[] = [];

      if (showLineNumbers) {
        content.push(
          <span key="line-number" className="line-number">
            {lineNumber + 1}
          </span>,
        );
      }

      gutterDecorations.forEach((decoration, index) => {
        if (decoration.content) {
          content.push(
            <span
              key={`decoration-${index}`}
              className={`gutter-decoration ${decoration.className || ""}`}
            >
              {decoration.content}
            </span>,
          );
        }
      });

      return content;
    };

    const getGutterClasses = () => {
      const classes = ["editor-gutter"];
      if (isBreakpoint) classes.push("has-breakpoint");
      if (hasError) classes.push("has-error");
      if (hasWarning) classes.push("has-warning");
      return classes.join(" ");
    };

    return (
      <div
        className={getGutterClasses()}
        style={{ width: `${gutterWidth}px` }}
        data-line-number={lineNumber}
      >
        {renderGutterContent()}
      </div>
    );
  },
);

LineGutter.displayName = "LineGutter";
