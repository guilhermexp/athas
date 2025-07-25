import { useCallback } from "react";
import { useEditorCursorStore } from "../stores/editor-cursor-store";

/**
 * Hook that provides cursor actions without subscribing to state changes
 * This prevents rerenders when cursor position changes
 */
export function useCursorActions() {
  const setCursorPosition = useEditorCursorStore((state) => state.setCursorPosition);
  const setSelection = useEditorCursorStore((state) => state.setSelection);
  const setDesiredColumn = useEditorCursorStore((state) => state.setDesiredColumn);

  // Get current values without subscribing
  const getCursorPosition = useCallback(() => {
    return useEditorCursorStore.getState().cursorPosition;
  }, []);

  const getSelection = useCallback(() => {
    return useEditorCursorStore.getState().selection;
  }, []);

  const getDesiredColumn = useCallback(() => {
    return useEditorCursorStore.getState().desiredColumn;
  }, []);

  return {
    setCursorPosition,
    setSelection,
    setDesiredColumn,
    getCursorPosition,
    getSelection,
    getDesiredColumn,
  };
}
