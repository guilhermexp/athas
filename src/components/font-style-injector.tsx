import { useEffect } from "react";
import { useCodeEditorStore } from "@/stores/code-editor-store";
import { useEditorConfigStore } from "@/stores/editor-config-store";
import { useSettingsStore } from "@/stores/settings-store";

export const FontStyleInjector = () => {
  const codeEditorFontFamily = useCodeEditorStore(state => state.fontFamily);
  const editorConfigFontFamily = useEditorConfigStore(state => state.fontFamily);
  const { settings } = useSettingsStore();

  useEffect(() => {
    // Priority: Settings store → Editor config → Code editor store → JetBrains Mono default
    const fontFamily =
      settings.fontFamily || editorConfigFontFamily || codeEditorFontFamily || "JetBrains Mono";

    // Set CSS variables for both editor and app-wide font with simple fallbacks
    const fallbackChain = `"${fontFamily}", "JetBrains Mono", monospace`;
    document.documentElement.style.setProperty("--editor-font-family", fallbackChain);
    document.documentElement.style.setProperty("--app-font-family", fallbackChain);

    console.log("Setting font family:", fontFamily, "| Full chain:", fallbackChain);
  }, [settings.fontFamily, editorConfigFontFamily, codeEditorFontFamily]);

  // Set initial default styles immediately on mount
  useEffect(() => {
    // Ensure we always have a default font set
    const currentAppFont = document.documentElement.style.getPropertyValue("--app-font-family");
    if (!currentAppFont) {
      const defaultChain = `"JetBrains Mono", monospace`;
      document.documentElement.style.setProperty("--editor-font-family", defaultChain);
      document.documentElement.style.setProperty("--app-font-family", defaultChain);
      console.log("Set initial default font:", defaultChain);
    }
  }, []); // Run only once on mount

  return null;
};
