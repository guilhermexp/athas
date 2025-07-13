import { useEditorConfigStore } from "../../stores/editor-config";
import { EditorInput } from "./editor-input";
import { SyntaxHighlight } from "./syntax-highlight";
import { VimCursor } from "./vim-cursor";

export function EditorContent() {
  const { vimEnabled, vimMode, lineNumbers } = useEditorConfigStore();

  return (
    <div className="relative h-full flex-1 overflow-hidden bg-primary-bg">
      {/* Syntax highlighting layer (behind contenteditable) */}
      <SyntaxHighlight />

      {/* Contenteditable div for input */}
      <EditorInput />

      {/* Vim cursor for normal mode */}
      {vimEnabled && vimMode === "normal" && (
        <VimCursor
          editorRef={null} // Will be handled by the component itself
          cursorPosition={0}
          visible={true}
          fontSize={14} // Will be handled by the component itself
          lineNumbers={lineNumbers}
        />
      )}
    </div>
  );
}
