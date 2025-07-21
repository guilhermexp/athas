import { useEditorConfigStore } from "../../stores/editor-config-store";
import { TextEditor } from "./text-editor";
import { VimIntegration } from "./vim/vim-integration";
import { VimCompatibleEditor } from "./vim-compatible-editor";

export function EditorContent() {
  const { vimEnabled } = useEditorConfigStore();

  return (
    <div className="relative h-full flex-1 bg-primary-bg">
      {/* Use standard text editor when vim is disabled, vim-specific editor when enabled */}
      {vimEnabled ? <VimCompatibleEditor /> : <TextEditor />}

      {/* Vim integration layer */}
      <VimIntegration />
    </div>
  );
}
