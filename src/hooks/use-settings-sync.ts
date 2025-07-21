import { useEffect } from "react";
import { useEditorConfigStore } from "../stores/editor-config-store";
import { useSettingsStore } from "../stores/settings-store";

export const useSettingsSync = () => {
  const { settings } = useSettingsStore();
  const {
    setFontSize,
    setFontFamily,
    setTabSize,
    setWordWrap,
    setLineNumbers,
    setVimEnabled,
    setAiCompletion,
  } = useEditorConfigStore();

  // Sync font size
  useEffect(() => {
    setFontSize(settings.fontSize);
  }, [settings.fontSize, setFontSize]);

  // Sync font family
  useEffect(() => {
    console.log("Syncing font family:", settings.fontFamily);
    setFontFamily(settings.fontFamily);
  }, [settings.fontFamily, setFontFamily]);

  // Sync tab size
  useEffect(() => {
    setTabSize(settings.tabSize);
  }, [settings.tabSize, setTabSize]);

  // Sync word wrap
  useEffect(() => {
    setWordWrap(settings.wordWrap);
  }, [settings.wordWrap, setWordWrap]);

  // Sync line numbers
  useEffect(() => {
    setLineNumbers(settings.lineNumbers);
  }, [settings.lineNumbers, setLineNumbers]);

  // Sync vim mode
  useEffect(() => {
    setVimEnabled(settings.vimMode);
  }, [settings.vimMode, setVimEnabled]);

  // Sync AI completion
  useEffect(() => {
    setAiCompletion(settings.aiCompletion);
  }, [settings.aiCompletion, setAiCompletion]);
};
