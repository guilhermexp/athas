import { useEffect } from "react";
import { useEditorSettingsStore } from "@/stores/editor-settings-store";
import { useSettingsStore } from "@/stores/settings-store";

export const FontStyleInjector = () => {
  const codeEditorFontFamily = useEditorSettingsStore((state) => state.fontFamily);
  const { settings } = useSettingsStore();

  useEffect(() => {
    // Priority: Settings store → Code editor store → JetBrains Mono default
    const fontFamily = settings.fontFamily || codeEditorFontFamily || "JetBrains Mono";

    // Set CSS variables for both editor and app-wide font with simple fallbacks
    const fallbackChain = `"${fontFamily}", "JetBrains Mono", monospace`;
    document.documentElement.style.setProperty("--editor-font-family", fallbackChain);
    document.documentElement.style.setProperty("--app-font-family", fallbackChain);

    console.log("Setting font family:", fontFamily, "| Full chain:", fallbackChain);
  }, [settings.fontFamily, codeEditorFontFamily]);

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
