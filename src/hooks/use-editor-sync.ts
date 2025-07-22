import { useEffect } from "react";
import { useEditorCompletionStore } from "../stores/editor-completion-store";
import { useEditorContentStore } from "../stores/editor-content-store";
import { useEditorSearchStore } from "../stores/editor-search-store";
import { useEditorSettingsStore } from "../stores/editor-settings-store";

interface UseEditorSyncProps {
  value: string;
  filename: string;
  filePath: string;
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  disabled: boolean;
  aiCompletion: boolean;
  searchQuery: string;
  searchMatches: { start: number; end: number }[];
  currentMatchIndex: number;
}

export const useEditorSync = (props: UseEditorSyncProps) => {
  const { setValue, setFilename, setFilePath } = useEditorContentStore();
  const { setFontSize, setFontFamily, setTabSize, setWordWrap, setLineNumbers, setDisabled } =
    useEditorSettingsStore();
  const { setSearchQuery, setSearchMatches, setCurrentMatchIndex } = useEditorSearchStore();
  const { setAiCompletion } = useEditorCompletionStore();

  // Sync all props with store
  useEffect(() => {
    setValue(props.value);
  }, [props.value, setValue]);

  useEffect(() => {
    setFilename(props.filename);
  }, [props.filename, setFilename]);

  useEffect(() => {
    setFilePath(props.filePath);
  }, [props.filePath, setFilePath]);

  useEffect(() => {
    setFontSize(props.fontSize);
  }, [props.fontSize, setFontSize]);

  useEffect(() => {
    setFontFamily(props.fontFamily);
  }, [props.fontFamily, setFontFamily]);

  useEffect(() => {
    setTabSize(props.tabSize);
  }, [props.tabSize, setTabSize]);

  useEffect(() => {
    setWordWrap(props.wordWrap);
  }, [props.wordWrap, setWordWrap]);

  useEffect(() => {
    setLineNumbers(props.lineNumbers);
  }, [props.lineNumbers, setLineNumbers]);

  useEffect(() => {
    setDisabled(props.disabled);
  }, [props.disabled, setDisabled]);

  useEffect(() => {
    setAiCompletion(props.aiCompletion);
  }, [props.aiCompletion, setAiCompletion]);

  useEffect(() => {
    setSearchQuery(props.searchQuery);
  }, [props.searchQuery, setSearchQuery]);

  useEffect(() => {
    setSearchMatches(props.searchMatches);
  }, [props.searchMatches, setSearchMatches]);

  useEffect(() => {
    setCurrentMatchIndex(props.currentMatchIndex);
  }, [props.currentMatchIndex, setCurrentMatchIndex]);
};
