import { create } from "zustand";
import { HistoryManager } from "../core/history-manager";
import type { Change, EditOperation, Range } from "../types/editor-types";

interface EditorHistoryStore {
  historyManager: HistoryManager;

  canUndo: boolean;
  canRedo: boolean;

  pushOperation: (operation: EditOperation) => void;
  undo: () => EditOperation | null;
  redo: () => EditOperation | null;
  clearHistory: () => void;

  createOperation: (changes: Change[], selection?: Range) => EditOperation;
}

export const useEditorHistoryStore = create<EditorHistoryStore>((set, _get) => {
  const historyManager = new HistoryManager();

  const updateCanUndoRedo = () => {
    set({
      canUndo: historyManager.canUndo(),
      canRedo: historyManager.canRedo(),
    });
  };

  return {
    historyManager,
    canUndo: false,
    canRedo: false,

    pushOperation: (operation: EditOperation) => {
      historyManager.push(operation);
      updateCanUndoRedo();
    },

    undo: () => {
      const operation = historyManager.undo();
      updateCanUndoRedo();
      return operation;
    },

    redo: () => {
      const operation = historyManager.redo();
      updateCanUndoRedo();
      return operation;
    },

    clearHistory: () => {
      historyManager.clear();
      updateCanUndoRedo();
    },

    createOperation: (changes: Change[], selection?: Range): EditOperation => {
      return {
        changes,
        selection,
        timestamp: Date.now(),
      };
    },
  };
});
