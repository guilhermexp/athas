import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

interface UseMenuEventsProps {
  onNewFile: () => void;
  onOpenFolder: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onCloseTab: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFind: () => void;
  onFindReplace: () => void;
  onCommandPalette: () => void;
  onToggleSidebar: () => void;
  onToggleTerminal: () => void;
  onToggleAiChat: () => void;
  onSplitEditor: () => void;
  onToggleVim: () => void;
  onGoToFile: () => void;
  onGoToLine: () => void;
  onNextTab: () => void;
  onPrevTab: () => void;
  onThemeChange: (theme: string) => void;
  onAbout: () => void;
  onHelp: () => void;
}

export function useMenuEvents(props: UseMenuEventsProps) {
  useEffect(() => {
    const unlistenPromises = [
      listen("menu_new_file", () => props.onNewFile()),
      listen("menu_open_folder", () => props.onOpenFolder()),
      listen("menu_save", () => props.onSave()),
      listen("menu_save_as", () => props.onSaveAs()),
      listen("menu_close_tab", () => props.onCloseTab()),
      listen("menu_undo", () => props.onUndo()),
      listen("menu_redo", () => props.onRedo()),
      listen("menu_find", () => props.onFind()),
      listen("menu_find_replace", () => props.onFindReplace()),
      listen("menu_command_palette", () => props.onCommandPalette()),
      listen("menu_toggle_sidebar", () => props.onToggleSidebar()),
      listen("menu_toggle_terminal", () => props.onToggleTerminal()),
      listen("menu_toggle_ai_chat", () => props.onToggleAiChat()),
      listen("menu_split_editor", () => props.onSplitEditor()),
      listen("menu_toggle_vim", () => props.onToggleVim()),
      listen("menu_go_to_file", () => props.onGoToFile()),
      listen("menu_go_to_line", () => props.onGoToLine()),
      listen("menu_next_tab", () => props.onNextTab()),
      listen("menu_prev_tab", () => props.onPrevTab()),
      listen("menu_theme_change", (event) => {
        props.onThemeChange(event.payload as string);
      }),
      listen("menu_about", () => props.onAbout()),
      listen("menu_help", () => props.onHelp()),
    ];

    return () => {
      Promise.all(unlistenPromises).then((unlisteners) => {
        unlisteners.forEach((unlisten) => unlisten());
      });
    };
  }, [props]);
}
