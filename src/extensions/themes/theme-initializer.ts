import { extensionManager } from "../extension-manager";
import {
  cursorDark,
  macosClassicDark,
  macosClassicLight,
  oneDarkPro,
  oneDarkProMonokaiDarker,
  supaglass,
} from "./builtin-themes";
import { themeLoader } from "./theme-loader";
import { themeRegistry } from "./theme-registry";

let isThemeSystemInitialized = false;

export const initializeThemeSystem = async () => {
  if (isThemeSystemInitialized) {
    console.log("initializeThemeSystem: Already initialized, skipping...");
    return;
  }

  try {
    console.log("initializeThemeSystem: Starting...");
    isThemeSystemInitialized = true;

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

    // Load theme loader
    try {
      console.log("initializeThemeSystem: Loading theme loader...");
      await extensionManager.loadExtension(themeLoader);
      console.log(`initializeThemeSystem: Themes loaded - ${themeLoader.themes.length} themes`);
    } catch (error) {
      console.error("initializeThemeSystem: Failed to load themes:", error);
    }

    // Register additional built-in themes (JS-based)
    console.log("initializeThemeSystem: Registering JS-based themes...");
    themeRegistry.registerTheme(supaglass);
    themeRegistry.registerTheme(cursorDark);
    themeRegistry.registerTheme(oneDarkPro);
    themeRegistry.registerTheme(oneDarkProMonokaiDarker);
    themeRegistry.registerTheme(macosClassicLight);
    themeRegistry.registerTheme(macosClassicDark);
    console.log(
      "initializeThemeSystem: Registered 6 themes (Supaglass, Cursor Dark, One Dark Pro, One Dark Pro Monokai Darker, macOS Classic Light, macOS Classic Dark)",
    );

    // Check what's in the registry
    console.log("initializeThemeSystem: Themes in registry:", themeRegistry.getAllThemes());

    // Mark theme registry as ready
    themeRegistry.markAsReady();

    console.log("Theme system initialized successfully");
  } catch (error) {
    console.error("Failed to initialize theme system:", error);
    isThemeSystemInitialized = false; // Reset flag on error
  }
};
