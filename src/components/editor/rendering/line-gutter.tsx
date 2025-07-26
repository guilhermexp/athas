import type React from "react";
import type { Decoration } from "../../../types/editor-types";
import { cn } from "../../../utils/cn";

interface LineGutterProps {
  lineNumber: number;
  showLineNumbers: boolean;
  gutterWidth: number;
  decorations: Decoration[];
  isBreakpoint?: boolean;
  hasError?: boolean;
  hasWarning?: boolean;
}

export const LineGutter = ({
  lineNumber,
  showLineNumbers,
  gutterWidth,
  decorations,
  isBreakpoint = false,
  hasError = false,
  hasWarning = false,
}: LineGutterProps) => {
  const gutterDecorations = decorations.filter(
    (d) => d.type === "gutter" && d.range.start.line === lineNumber,
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

  return (
    <div
      className={cn(
        "editor-gutter",
        isBreakpoint && "has-breakpoint",
        hasError && "has-error",
        hasWarning && "has-warning",
      )}
      style={{ width: `${gutterWidth}px` }}
      data-line-number={lineNumber}
    >
      {renderGutterContent()}
    </div>
  );
};
