import { memo } from "react";
import { useEditorContentStore } from "../../stores/editor-content-store";
import { useEditorCursorStore } from "../../stores/editor-cursor-store";
import { EditorViewport } from "./editor-viewport";

interface ViewportWithSelectionProps {
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

export const ViewportWithSelection = memo<ViewportWithSelectionProps>((props) => {
  const selection = useEditorCursorStore((state) => state.selection);
  const lineCount = useEditorContentStore((state) => state.lines.length);

  const selectedLines = new Set<number>();
  if (selection) {
    for (let i = selection.start.line; i <= selection.end.line; i++) {
      selectedLines.add(i);
    }
  }

  return <EditorViewport {...props} lineCount={lineCount} selectedLines={selectedLines} />;
});

ViewportWithSelection.displayName = "ViewportWithSelection";
