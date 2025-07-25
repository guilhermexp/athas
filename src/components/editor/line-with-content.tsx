import { memo } from "react";
import { useShallow } from "zustand/shallow";
import { useEditorDecorationsStore } from "@/stores/editor-decorations-store";
import { useEditorContentStore } from "../../stores/editor-content-store";
import { LineGutter } from "./line-gutter";
import { LineRenderer } from "./line-renderer";

interface LineWithContentProps {
  lineNumber: number;
  showLineNumbers: boolean;
  gutterWidth: number;
  lineHeight: number;
  isSelected: boolean;
}

export const LineWithContent = memo<LineWithContentProps>(
  ({ lineNumber, showLineNumbers, gutterWidth, lineHeight, isSelected }) => {
    const content = useEditorContentStore((state) => state.lines[lineNumber]);
    const tokens = useEditorContentStore((state) => state.lineTokens.get(lineNumber)) ?? [];

    // Subscribe only to decorations for this line with shallow comparison
    const decorations = useEditorDecorationsStore(
      useShallow((state) => state.getDecorationsForLine(lineNumber)),
    );

    return (
      <div
        className="editor-line-wrapper"
        style={{
          position: "absolute",
          top: `${lineNumber * lineHeight}px`,
          left: 0,
          right: 0,
          height: `${lineHeight}px`,
          display: "flex",
        }}
      >
        {showLineNumbers && (
          <LineGutter
            lineNumber={lineNumber}
            showLineNumbers={showLineNumbers}
            gutterWidth={gutterWidth}
            decorations={decorations}
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
            lineNumber={lineNumber}
            content={content}
            tokens={tokens}
            decorations={decorations}
            isSelected={isSelected}
          />
        </div>
      </div>
    );
  },
);

LineWithContent.displayName = "LineWithContent";
