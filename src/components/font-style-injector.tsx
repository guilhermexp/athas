import { useEffect } from "react";
import { useCodeEditorStore } from "@/stores/code-editor-store";
import { useEditorConfigStore } from "@/stores/editor-config-store";

export const FontStyleInjector = () => {
  const codeEditorFontFamily = useCodeEditorStore(state => state.fontFamily);
  const editorConfigFontFamily = useEditorConfigStore(state => state.fontFamily);

  useEffect(() => {
    // Use editor config font family as primary, fallback to code editor store
    const fontFamily = editorConfigFontFamily || codeEditorFontFamily;

    if (!fontFamily) return;

    // Set CSS variables for both editor and app-wide font with proper fallbacks
    const fallbackChain = `"${fontFamily}", "JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace`;
    document.documentElement.style.setProperty("--editor-font-family", fallbackChain);
    document.documentElement.style.setProperty("--app-font-family", fallbackChain);

    console.log("Setting app font family to:", fallbackChain);
  }, [editorConfigFontFamily, codeEditorFontFamily]);

  return null;
};
