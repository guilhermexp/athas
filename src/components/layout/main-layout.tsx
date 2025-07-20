import { useState } from "react";
import { createCoreFeaturesList } from "../../constants/core-features";
import { ProjectNameMenu } from "../../hooks/use-context-menus";
import { useKeyboardShortcutsWrapper } from "../../hooks/use-keyboard-shortcuts-wrapper";
import { useMenuEventsWrapper } from "../../hooks/use-menu-events-wrapper";
import { useBufferStore } from "../../stores/buffer-store";
import { useFileSystemStore } from "../../stores/file-system-store";
import { usePersistentSettingsStore } from "../../stores/persistent-settings-store";
import { useSettingsStore } from "../../stores/settings-store";
import { useUIState } from "../../stores/ui-state-store";
import type { ThemeType } from "../../types/theme";
import { type GitHunk, stageHunk, unstageHunk } from "../../utils/git";
import AIChat from "../ai-chat/ai-chat";
import BottomPane from "../bottom-pane";
import CommandBar from "../command/command-bar";
import CommandPalette from "../command/command-palette";
import type { Diagnostic } from "../diagnostics/diagnostics-pane";
import DiffViewer from "../diff-viewer";
import CodeEditor from "../editor/code-editor";
import EditorFooter from "../editor-footer";
import ExtensionsView from "../extensions-view";
import FileReloadToast from "../file-reload-toast";
import FindBar from "../find-bar";
import GitHubCopilotSettings from "../github-copilot-settings";
import ResizableRightPane from "../resizable-right-pane";
import ResizableSidebar from "../resizable-sidebar";
import TabBar from "../tab-bar";
import CustomTitleBar from "../window/custom-title-bar";
import { MainSidebar } from "./main-sidebar";

export function MainLayout() {
  const { activeBufferId, buffers } = useBufferStore();
  const activeBuffer = buffers.find(b => b.id === activeBufferId);

  const { isSidebarVisible } = useUIState();
  const { isAIChatVisible, coreFeatures: persistentCoreFeatures } = usePersistentSettingsStore();
  const { settings, updateTheme } = useSettingsStore();
  const { rootFolderPath } = useFileSystemStore();

  // TODO: Replace with actual diagnostics from language server or linter
  const [diagnostics] = useState<Diagnostic[]>([]);

  // TODO: Get sidebar position from settings
  const sidebarPosition = "left" as "left" | "right"; // Default to left for now

  // Create core features list
  const coreFeaturesList = createCoreFeaturesList(persistentCoreFeatures);

  // Handle core feature toggle
  const handleCoreFeatureToggle = (featureId: string, enabled: boolean) => {
    const { setCoreFeatures } = usePersistentSettingsStore.getState();
    setCoreFeatures({
      ...persistentCoreFeatures,
      [featureId]: enabled,
    });
  };

  // Handle theme change
  const handleThemeChange = (theme: ThemeType) => {
    updateTheme(theme);
  };

  // Handle hunk staging/unstaging
  const handleStageHunk = async (hunk: GitHunk) => {
    if (!rootFolderPath) {
      console.error("No rootFolderPath available");
      return;
    }

    try {
      const success = await stageHunk(rootFolderPath, hunk);
      if (success) {
        // Emit a custom event to notify Git view and DiffViewer to refresh
        window.dispatchEvent(new CustomEvent("git-status-changed"));
      } else {
        console.error("Failed to stage hunk");
      }
    } catch (error) {
      console.error("Error staging hunk:", error);
    }
  };

  const handleUnstageHunk = async (hunk: GitHunk) => {
    if (!rootFolderPath) {
      console.error("No rootFolderPath available");
      return;
    }

    try {
      const success = await unstageHunk(rootFolderPath, hunk);
      if (success) {
        // Emit a custom event to notify Git view and DiffViewer to refresh
        window.dispatchEvent(new CustomEvent("git-status-changed"));
      } else {
        console.error("Failed to unstage hunk");
      }
    } catch (error) {
      console.error("Error unstaging hunk:", error);
    }
  };

  // Initialize event listeners
  useMenuEventsWrapper();
  useKeyboardShortcutsWrapper();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-primary-bg">
      <CustomTitleBar />
      <div className="h-px flex-shrink-0 bg-border" />

      <div className="flex flex-1 flex-row overflow-hidden">
        {/* Left sidebar or AI chat based on settings */}
        {sidebarPosition === "right" ? (
          <ResizableRightPane position="left" isVisible={isAIChatVisible}>
            <AIChat mode="chat" />
          </ResizableRightPane>
        ) : (
          isSidebarVisible && (
            <ResizableSidebar>
              <MainSidebar />
            </ResizableSidebar>
          )
        )}

        {/* Main content area */}
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          <TabBar />
          {(() => {
            if (!activeBuffer) {
              return (
                <div className="paper-text-secondary flex flex-1 items-center justify-center"></div>
              );
            }
            if (activeBuffer.isDiff) {
              return <DiffViewer onStageHunk={handleStageHunk} onUnstageHunk={handleUnstageHunk} />;
            } else if (activeBuffer.path === "extensions://marketplace") {
              return (
                <ExtensionsView
                  onServerInstall={server => console.log("Install server:", server)}
                  onServerUninstall={serverId => console.log("Uninstall server:", serverId)}
                  onThemeChange={handleThemeChange}
                  currentTheme={settings.theme}
                  coreFeatures={coreFeaturesList}
                  onCoreFeatureToggle={handleCoreFeatureToggle}
                />
              );
            } else {
              return <CodeEditor />;
            }
          })()}
        </div>

        {/* Right sidebar or AI chat based on settings */}
        {sidebarPosition === "right" ? (
          isSidebarVisible && (
            <ResizableRightPane position="right">
              <MainSidebar />
            </ResizableRightPane>
          )
        ) : (
          <ResizableRightPane position="right" isVisible={isAIChatVisible}>
            <AIChat mode="chat" />
          </ResizableRightPane>
        )}
      </div>

      <BottomPane diagnostics={diagnostics} />
      <EditorFooter />

      {/* Global modals and overlays */}
      <CommandBar />
      <CommandPalette />
      <FindBar />
      <GitHubCopilotSettings />
      <ProjectNameMenu />
      <FileReloadToast />
    </div>
  );
}
