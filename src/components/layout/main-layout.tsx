import { useState } from "react";
import { ProjectNameMenu } from "../../hooks/use-context-menus";
import { useKeyboardShortcutsWrapper } from "../../hooks/use-keyboard-shortcuts-wrapper";
import { useMenuEventsWrapper } from "../../hooks/use-menu-events-wrapper";
import { useBufferStore } from "../../stores/buffer-store";
import { usePersistentSettingsStore } from "../../stores/persistent-settings-store";
import { useUIState } from "../../stores/ui-state-store";
import AIChat from "../ai-chat/ai-chat";
import BottomPane from "../bottom-pane";
import CommandBar from "../command/command-bar";
import CommandPalette from "../command/command-palette";
import type { Diagnostic } from "../diagnostics/diagnostics-pane";
import DiffViewer from "../diff-viewer";
import CodeEditor from "../editor/code-editor";
import EditorFooter from "../editor-footer";
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
  const { isAIChatVisible } = usePersistentSettingsStore();

  // TODO: Replace with actual diagnostics from language server or linter
  const [diagnostics] = useState<Diagnostic[]>([]);

  // TODO: Get sidebar position from settings
  const sidebarPosition = "left" as "left" | "right"; // Default to left for now

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
              return <DiffViewer />;
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
