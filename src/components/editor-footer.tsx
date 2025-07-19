import { AlertCircle, Terminal as TerminalIcon } from "lucide-react";
import { useBufferStore } from "../stores/buffer-store";
import { usePersistentSettingsStore } from "../stores/persistent-settings-store";
import { useUIState } from "../stores/ui-state-store";
import { getFilenameFromPath, getLanguageFromFilename } from "../utils/file-utils";

const EditorFooter = () => {
  const { activeBufferId, buffers } = useBufferStore();
  const activeBuffer = buffers.find(b => b.id === activeBufferId);
  const { coreFeatures } = usePersistentSettingsStore();
  const uiState = useUIState();
  return (
    <div className="flex min-h-[32px] items-center justify-between border-border border-t bg-secondary-bg px-2 py-1">
      <div className="flex items-center gap-0.5 font-mono text-text-lighter text-xs">
        {/* Terminal indicator */}
        {coreFeatures.terminal && (
          <button
            onClick={() => {
              uiState.setBottomPaneActiveTab("terminal");
              uiState.setIsBottomPaneVisible(
                !uiState.isBottomPaneVisible || uiState.bottomPaneActiveTab !== "terminal",
              );
            }}
            className={`flex items-center gap-0.5 rounded px-1 py-0.5 transition-colors ${
              uiState.isBottomPaneVisible && uiState.bottomPaneActiveTab === "terminal"
                ? "bg-selected text-text"
                : "text-text-lighter hover:bg-hover"
            }`}
            style={{ minHeight: 0, minWidth: 0 }}
            title="Toggle Terminal"
          >
            <TerminalIcon size={12} />
          </button>
        )}

        {/* Diagnostics indicator (placeholder for now) */}
        {coreFeatures.diagnostics && (
          <div
            className="flex items-center gap-0.5 rounded px-1 py-0.5 text-text-lighter"
            style={{ minHeight: 0, minWidth: 0 }}
            title="Diagnostics (coming soon)"
          >
            <AlertCircle size={12} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-0.5 font-mono text-[10px] text-text-lighter">
        {activeBuffer && (
          <>
            <span className="px-1">{activeBuffer.content.split("\n").length} lines</span>
            {(() => {
              const language = getLanguageFromFilename(getFilenameFromPath(activeBuffer.path));
              return language !== "Text" && <span className="px-1">{language}</span>;
            })()}
          </>
        )}
      </div>
    </div>
  );
};

export default EditorFooter;
