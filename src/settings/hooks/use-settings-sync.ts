import { useEffect } from "react";
import { useEditorCompletionStore } from "../../stores/editor-completion-store";
import { useEditorSettingsStore } from "../../stores/editor-settings-store";
import { useSettingsStore } from "../stores/settings-store";

export const useSettingsSync = () => {
  const { settings } = useSettingsStore();
  const { setFontSize, setFontFamily, setTabSize, setWordWrap, setLineNumbers } =
    useEditorSettingsStore.use.actions();
  const { actions: completionActions } = useEditorCompletionStore();

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

  // Sync AI completion
  useEffect(() => {
    completionActions.setAiCompletion(settings.aiCompletion);
  }, [settings.aiCompletion, completionActions.setAiCompletion]);
};
