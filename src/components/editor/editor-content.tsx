import { useRef } from "react";
import { useEditorConfigStore } from "../../stores/editor-config-store";
import { EditorInput } from "./editor-input";
import { VimCursor } from "./vim-cursor";

export function EditorContent() {
  const { vimEnabled, vimMode, lineNumbers } = useEditorConfigStore();
  const editorRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="relative h-full flex-1 bg-primary-bg">
      {/* Single contenteditable layer with syntax highlighting */}
      <EditorInput />

      {/* Vim cursor for normal mode */}
      {vimEnabled && vimMode === "normal" && (
        <VimCursor
          editorRef={editorRef}
          cursorPosition={0}
          visible={true}
          fontSize={14} // Will be handled by the component itself
          lineNumbers={lineNumbers}
        />
      )}
    </div>
  );
}
