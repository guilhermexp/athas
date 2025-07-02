import { useState } from "react";
import { BottomPaneTab, QuickEditSelection } from "../types/ui-state";

export const useUIState = () => {
  // UI State
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const [isRightPaneVisible, setIsRightPaneVisible] = useState<boolean>(false);
  const [isCommandBarVisible, setIsCommandBarVisible] = useState<boolean>(false);
  const [isCommandPaletteVisible, setIsCommandPaletteVisible] = useState<boolean>(false);

  // View States
  const [isGitViewActive, setIsGitViewActive] = useState<boolean>(false);
  const [isSearchViewActive, setIsSearchViewActive] = useState<boolean>(false);
  const [isRemoteViewActive, setIsRemoteViewActive] = useState<boolean>(false);
  const [isGitHubCopilotSettingsVisible, setIsGitHubCopilotSettingsVisible] =
    useState<boolean>(false);

  // Bottom Pane
  const [isBottomPaneVisible, setIsBottomPaneVisible] = useState<boolean>(false);
  const [bottomPaneActiveTab, setBottomPaneActiveTab] = useState<BottomPaneTab>("terminal");

  // Quick Edit
  const [isQuickEditVisible, setIsQuickEditVisible] = useState<boolean>(false);
  const [quickEditSelection, setQuickEditSelection] = useState<QuickEditSelection>({
    text: "",
    start: 0,
    end: 0,
    cursorPosition: { x: 0, y: 0 },
  });

  // Context Menus
  const [folderHeaderContextMenu, setFolderHeaderContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [projectNameMenu, setProjectNameMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Helper functions for common UI operations
  const toggleSidebar = () => setIsSidebarVisible(!isSidebarVisible);
  const toggleRightPane = () => setIsRightPaneVisible(!isRightPaneVisible);
  const toggleCommandBar = () => setIsCommandBarVisible(!isCommandBarVisible);
  const toggleCommandPalette = () => setIsCommandPaletteVisible(!isCommandPaletteVisible);

  const showBottomPane = (tab: BottomPaneTab) => {
    setBottomPaneActiveTab(tab);
    setIsBottomPaneVisible(!isBottomPaneVisible || bottomPaneActiveTab !== tab);
  };

  const closeAllModals = () => {
    setIsCommandBarVisible(false);
    setIsCommandPaletteVisible(false);
    setIsGitHubCopilotSettingsVisible(false);
    setIsQuickEditVisible(false);
    setFolderHeaderContextMenu(null);
    setProjectNameMenu(null);
  };

  const setActiveView = (view: "files" | "git" | "search" | "remote") => {
    setIsGitViewActive(view === "git");
    setIsSearchViewActive(view === "search");
    setIsRemoteViewActive(view === "remote");
  };

  return {
    // UI State
    isSidebarVisible,
    setIsSidebarVisible,
    isRightPaneVisible,
    setIsRightPaneVisible,
    isCommandBarVisible,
    setIsCommandBarVisible,
    isCommandPaletteVisible,
    setIsCommandPaletteVisible,

    // View States
    isGitViewActive,
    setIsGitViewActive,
    isSearchViewActive,
    setIsSearchViewActive,
    isRemoteViewActive,
    setIsRemoteViewActive,
    isGitHubCopilotSettingsVisible,
    setIsGitHubCopilotSettingsVisible,

    // Bottom Pane
    isBottomPaneVisible,
    setIsBottomPaneVisible,
    bottomPaneActiveTab,
    setBottomPaneActiveTab,

    // Quick Edit
    isQuickEditVisible,
    setIsQuickEditVisible,
    quickEditSelection,
    setQuickEditSelection,

    // Context Menus
    folderHeaderContextMenu,
    setFolderHeaderContextMenu,
    projectNameMenu,
    setProjectNameMenu,

    // Helper functions
    toggleSidebar,
    toggleRightPane,
    toggleCommandBar,
    toggleCommandPalette,
    showBottomPane,
    closeAllModals,
    setActiveView,
  };
};
