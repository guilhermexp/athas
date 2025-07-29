import { extensionManager } from "../extension-manager";
import { athasThemesExtension } from "./builtin/athas-themes";
import { catppuccinExtension } from "./builtin/catppuccin";
import { contrastThemesExtension } from "./builtin/contrast-themes";
import { draculaExtension } from "./builtin/dracula";
import { githubExtension } from "./builtin/github";
import { nordExtension } from "./builtin/nord";
import { oneDarkExtension } from "./builtin/one-dark";
import { solarizedExtension } from "./builtin/solarized";
import { tokyoNightExtension } from "./builtin/tokyo-night";
import { vscodeExtension } from "./builtin/vscode";
import { themeRegistry } from "./theme-registry";

export const initializeThemeSystem = async () => {
  try {
    console.log("initializeThemeSystem: Starting...");

    // Initialize extension manager if not already done
    if (!extensionManager.isInitialized()) {
      console.log("initializeThemeSystem: Initializing extension manager...");
      extensionManager.initialize();
    }

    // Create a dummy editor API for theme extensions (they don't need editor functionality)
    const dummyEditorAPI = {
      getContent: () => "",
      setContent: () => {},
      insertText: () => {},
      deleteRange: () => {},
      replaceRange: () => {},
      getSelection: () => null,
      setSelection: () => {},
      getCursorPosition: () => ({ line: 0, column: 0, offset: 0 }),
      setCursorPosition: () => {},
      addDecoration: () => "",
      removeDecoration: () => {},
      updateDecoration: () => {},
      clearDecorations: () => {},
      getLines: () => [],
      getLine: () => undefined,
      getLineCount: () => 0,
      undo: () => {},
      redo: () => {},
      canUndo: () => false,
      canRedo: () => false,
      getSettings: () => ({
        fontSize: 14,
        tabSize: 2,
        lineNumbers: true,
        wordWrap: false,
        theme: "athas-dark",
      }),
      updateSettings: () => {},
      on: () => () => {},
      off: () => {},
      emitEvent: () => {},
    };

    console.log("initializeThemeSystem: Setting editor API...");
    extensionManager.setEditor(dummyEditorAPI);

    // Load built-in theme extensions
    const extensions = [
      { name: "GitHub", extension: githubExtension },
      { name: "VS Code", extension: vscodeExtension },
      { name: "Tokyo Night", extension: tokyoNightExtension },
      { name: "Dracula", extension: draculaExtension },
      { name: "One Dark", extension: oneDarkExtension },
      { name: "Catppuccin", extension: catppuccinExtension },
      { name: "Nord", extension: nordExtension },
      { name: "Solarized", extension: solarizedExtension },
      { name: "Contrast", extension: contrastThemesExtension },
    ];

    for (const { name, extension } of extensions) {
      try {
        console.log(`initializeThemeSystem: Loading ${name} themes extension...`);
        await extensionManager.loadExtension(extension);
        console.log(
          `initializeThemeSystem: ${name} themes loaded - ${extension.themes.length} themes`,
        );
      } catch (error) {
        console.error(`initializeThemeSystem: Failed to load ${name} themes:`, error);
      }
    }

    // Check what's in the registry
    console.log("initializeThemeSystem: Themes in registry:", themeRegistry.getAllThemes());

    console.log("Theme system initialized successfully");
  } catch (error) {
    console.error("Failed to initialize theme system:", error);
  }
};
