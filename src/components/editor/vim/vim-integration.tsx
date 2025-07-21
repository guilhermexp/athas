import { useRef } from "react";
import { useVim } from "../../../hooks/use-vim";
import { useCodeEditorStore } from "../../../stores/code-editor-store";
import { useEditorConfigStore } from "../../../stores/editor-config-store";
import { useEditorInstanceStore } from "../../../stores/editor-instance-store";
import { VimCommandLine } from "./vim-command-line";
import { VimCursor } from "./vim-cursor";

export function VimIntegration() {
  const { vimEnabled, vimMode } = useEditorConfigStore();
  const { editorRef } = useEditorInstanceStore();
  const { value: codeEditorValue } = useCodeEditorStore();
  const { onChange } = useEditorInstanceStore();
  const fallbackRef = useRef<HTMLDivElement>(null);

  // Use fallback ref if editorRef is null
  const safeEditorRef = editorRef || fallbackRef;

  // Initialize vim engine
  const { vimEngine } = useVim(
    safeEditorRef,
    codeEditorValue,
    onChange || (() => {}),
    vimEnabled,
    (_pos: number) => {},
    () => {}, // onModeChange - Already synced via store
    (initialCommand?: string) => {
      console.log("Vim command:", initialCommand);
    },
  );

  if (!vimEnabled) {
    return null;
  }

  return (
    <>
      {/* Vim cursor for normal mode */}
      {vimMode === "normal" && vimEngine && (
        <VimCursor
          editorRef={safeEditorRef}
          cursorPosition={0}
          visible={true}
          fontSize={14}
          lineNumbers={false}
        />
      )}

      {/* Vim command line */}
      {vimMode === "command" && <VimCommandLine />}
    </>
  );
}
