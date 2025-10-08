import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { Maximize2, MenuIcon, Minimize2, Minus, Settings, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import SettingsDialog from "@/settings/components/settings-dialog";
import { useSettingsStore } from "@/settings/store";
import { useProjectStore } from "@/stores/project-store";
import { cn } from "@/utils/cn";
import BranchSelector from "./branch-selector";
import CustomMenuBar from "./menu-bar";
import ProjectSelector from "./project-selector";

interface CustomTitleBarProps {
  title?: string;
  showMinimal?: boolean;
  isWelcomeScreen?: boolean;
  onOpenSettings?: () => void;
}

const CustomTitleBar = ({
  showMinimal = false,
  isWelcomeScreen = false,
  onOpenSettings,
}: CustomTitleBarProps) => {
  const { getProjectName } = useProjectStore();
  const { settings, updateSetting } = useSettingsStore();

  const [_projectName, setProjectName] = useState<string>("");
  const [menuBarActiveMenu, setMenuBarActiveMenu] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [currentWindow, setCurrentWindow] = useState<any>(null);
  const [currentPlatform, setCurrentPlatform] = useState<string>(() => {
    if (typeof navigator !== "undefined") {
      if (navigator.userAgent.includes("Mac")) {
        return "macos";
      } else if (navigator.userAgent.includes("Linux")) {
        return "linux";
      } else {
        return "windows";
      }
    }
    return "other";
  });

  useEffect(() => {
    const initWindow = async () => {
      const window = getCurrentWindow();
      setCurrentWindow(window);

      try {
        const platformName = await platform();
        setCurrentPlatform(platformName);
      } catch (error) {
        console.error("Error getting platform:", error);
        if (typeof navigator !== "undefined") {
          if (navigator.userAgent.includes("Mac")) {
            setCurrentPlatform("macos");
          } else if (navigator.userAgent.includes("Linux")) {
            setCurrentPlatform("linux");
          } else {
            setCurrentPlatform("windows");
          }
        }
      }

      try {
        const maximized = await window.isMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        console.error("Error checking maximized state:", error);
      }

      // Get project name asynchronously
      try {
        const name = await getProjectName();
        setProjectName(name);
      } catch (error) {
        console.error("Error getting project name:", error);
        setProjectName("Explorer");
      }
    };

    initWindow();
  }, [getProjectName]);

  const handleMinimize = async () => {
    try {
      await currentWindow?.minimize();
    } catch (error) {
      console.error("Error minimizing window:", error);
    }
  };

  const handleToggleMaximize = async () => {
    try {
      await currentWindow?.toggleMaximize();
      const maximized = await currentWindow?.isMaximized();
      setIsMaximized(maximized);
    } catch (error) {
      console.error("Error toggling maximize:", error);
    }
  };

  const handleClose = async () => {
    try {
      await currentWindow?.close();
    } catch (error) {
      console.error("Error closing window:", error);
    }
  };

  const isMacOS = currentPlatform === "macos";
  const isLinux = currentPlatform === "linux";

  if (showMinimal) {
    const backgroundClass = isWelcomeScreen ? "bg-paper-bg" : "bg-primary-bg";

    return (
      <div
        data-tauri-drag-region
        className={`relative z-50 flex select-none items-center justify-between ${
          isMacOS ? "h-11" : "h-7"
        } ${backgroundClass}`}
      >
        <div className="flex-1" />

        {/* Window controls - only show on Linux */}
        {isLinux && (
          <div className="window-controls flex items-center">
            <button
              onClick={handleMinimize}
              className="flex h-7 w-10 items-center justify-center transition-colors hover:bg-hover"
              title="Minimize"
            >
              <Minus className="h-3.5 w-3.5 text-text-lighter" />
            </button>
            <button
              onClick={handleToggleMaximize}
              className="flex h-7 w-10 items-center justify-center transition-colors hover:bg-hover"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? (
                <Minimize2 className="h-3.5 w-3.5 text-text-lighter" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5 text-text-lighter" />
              )}
            </button>
            <button
              onClick={handleClose}
              className="group flex h-7 w-10 items-center justify-center transition-colors hover:bg-red-600"
              title="Close"
            >
              <X className="h-3.5 w-3.5 text-text-lighter group-hover:text-white" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full mode with custom controls - Zed style
  if (isMacOS) {
    return (
      <div
        data-tauri-drag-region
        className="relative z-50 flex h-8 select-none items-center justify-between bg-secondary-bg"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        {/* Left - Menu bar with traffic light spacing + Project/Branch selectors */}
        <div className="flex items-center gap-1 pl-20">
          {!settings.nativeMenuBar && (
            <CustomMenuBar activeMenu={menuBarActiveMenu} setActiveMenu={setMenuBarActiveMenu} />
          )}
          {/* Zed-style project and branch selectors */}
          <ProjectSelector />
          <BranchSelector />
        </div>

        {/* Center - Empty for macOS (optional, can show project name here too) */}
        <div className="-translate-x-1/2 pointer-events-none absolute left-1/2 flex transform items-center">
          {/* Mantém vazio ou pode duplicar o projectName aqui */}
        </div>

        {/* Right - Settings button */}
        <div className="flex items-center gap-1 pr-3">
          <button
            onClick={onOpenSettings}
            className={cn(
              "flex items-center justify-center rounded-md p-1.5",
              "text-text-lighter/70 transition-colors hover:bg-hover/50 hover:text-text",
            )}
            style={{ minHeight: 0, minWidth: 0 }}
            title="Settings"
          >
            <Settings size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    );
  }

  // Windows/Linux full title bar - Zed style
  return (
    <div
      data-tauri-drag-region
      className="z-50 flex h-8 select-none items-center justify-between bg-secondary-bg"
      style={{ fontFamily: "var(--font-ui)" }}
    >
      {!settings.nativeMenuBar && (
        <CustomMenuBar activeMenu={menuBarActiveMenu} setActiveMenu={setMenuBarActiveMenu} />
      )}

      {/* Left side */}
      <div className="flex flex-1 items-center gap-1 px-3">
        {/* Menu bar button */}
        {!settings.nativeMenuBar && settings.compactMenuBar && (
          <button
            onClick={() => {
              setMenuBarActiveMenu("File");
            }}
            className="mr-2 flex items-center justify-center rounded-md p-1 text-text-lighter hover:bg-hover/50 hover:text-text"
            title="Open Menu Bar"
          >
            <MenuIcon size={15} strokeWidth={1.5} />
          </button>
        )}

        {/* Zed-style project and branch selectors */}
        <ProjectSelector />
        <BranchSelector />
      </div>

      {/* Right side */}
      <div className="z-20 flex items-center gap-1 pr-3">
        {/* Agent Panel button */}
        <button
          onClick={() => {
            updateSetting("isAgentPanelVisible", !settings.isAgentPanelVisible);
          }}
          className={cn(
            "flex items-center justify-center rounded-md p-1.5 transition-colors",
            settings.isAgentPanelVisible
              ? "bg-hover/80 text-text"
              : "text-text-lighter/70 hover:bg-hover/50 hover:text-text",
          )}
          style={{ minHeight: 0, minWidth: 0 }}
          title="Toggle Agent Panel"
        >
          <Sparkles size={15} strokeWidth={1.5} />
        </button>
        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className={cn(
            "flex items-center justify-center rounded-md p-1.5",
            "text-text-lighter/70 transition-colors hover:bg-hover/50 hover:text-text",
          )}
          style={{ minHeight: 0, minWidth: 0 }}
          title="Settings"
        >
          <Settings size={15} strokeWidth={1.5} />
        </button>

        {/* Window controls - only show on Linux */}
        {isLinux && (
          <div className="window-controls ml-2 flex items-center">
            <button
              onClick={handleMinimize}
              className="flex h-8 w-10 items-center justify-center transition-colors hover:bg-hover/50"
              title="Minimize"
            >
              <Minus className="h-4 w-4 text-text-lighter" strokeWidth={1.5} />
            </button>
            <button
              onClick={handleToggleMaximize}
              className="flex h-8 w-10 items-center justify-center transition-colors hover:bg-hover/50"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4 text-text-lighter" strokeWidth={1.5} />
              ) : (
                <Maximize2 className="h-4 w-4 text-text-lighter" strokeWidth={1.5} />
              )}
            </button>
            <button
              onClick={handleClose}
              className="group flex h-8 w-10 items-center justify-center transition-colors hover:bg-red-600"
              title="Close"
            >
              <X className="h-4 w-4 text-text-lighter group-hover:text-white" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const CustomTitleBarWithSettings = (props: Omit<CustomTitleBarProps, "onOpenSettings">) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Handle Cmd+, (Mac) or Ctrl+, (Windows/Linux) to open settings
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.includes("Mac");
      const isSettingsShortcut = event.key === "," && (isMac ? event.metaKey : event.ctrlKey);

      if (isSettingsShortcut) {
        event.preventDefault();
        setIsSettingsOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <CustomTitleBar {...props} onOpenSettings={() => setIsSettingsOpen(true)} />
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

export default CustomTitleBarWithSettings;
