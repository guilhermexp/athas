import { useAppStore } from "../stores/app-store";
import { useBufferStore } from "../stores/buffer-store";
import { useFileSystemStore } from "../stores/file-system-store";
import { usePersistentSettingsStore } from "../stores/persistent-settings-store";
import { useSettingsStore } from "../stores/settings-store";
import { useUIState } from "../stores/ui-state-store";
import { useMenuEvents } from "./use-menu-events";

export function useMenuEventsWrapper() {
  const uiState = useUIState();
  const fileSystemStore = useFileSystemStore();
  const appStore = useAppStore();
  const bufferStore = useBufferStore();
  const settingsStore = useSettingsStore();
  const { isAIChatVisible, setIsAIChatVisible } = usePersistentSettingsStore();

  useMenuEvents({
    onNewFile: fileSystemStore.handleCreateNewFile,
    onOpenFolder: fileSystemStore.handleOpenFolder,
    onSave: appStore.handleSave,
    onSaveAs: () => console.log("Save As not implemented"),
    onCloseTab: () => {
      const activeBuffer = bufferStore.getActiveBuffer();
      if (activeBuffer) {
        bufferStore.closeBuffer(activeBuffer.id);
      }
    },
    onUndo: () => console.log("Undo not implemented"),
    onRedo: () => console.log("Redo not implemented"),
    onFind: () => uiState.setIsFindVisible(true),
    onFindReplace: () => console.log("Find/Replace not implemented"),
    onCommandPalette: () => uiState.setIsCommandPaletteVisible(true),
    onToggleSidebar: () => uiState.setIsSidebarVisible(!uiState.isSidebarVisible),
    onToggleTerminal: () => {
      const showingTerminal =
        !uiState.isBottomPaneVisible || uiState.bottomPaneActiveTab !== "terminal";
      uiState.setBottomPaneActiveTab("terminal");
      uiState.setIsBottomPaneVisible(showingTerminal);

      // Request terminal focus after showing
      if (showingTerminal) {
        setTimeout(() => {
          uiState.requestTerminalFocus();
        }, 100);
      }
    },
    onToggleAiChat: () => setIsAIChatVisible(!isAIChatVisible),
    onSplitEditor: () => console.log("Split Editor not implemented"),
    onToggleVim: () => console.log("Toggle Vim not implemented"),
    onGoToFile: () => uiState.setIsCommandBarVisible(true),
    onGoToLine: () => console.log("Go to Line not implemented"),
    onNextTab: bufferStore.switchToNextBuffer,
    onPrevTab: bufferStore.switchToPreviousBuffer,
    onThemeChange: (theme: string) => settingsStore.updateTheme(theme as any),
    onAbout: () => console.log("About not implemented"),
    onHelp: () => console.log("Help not implemented"),
  });
}
