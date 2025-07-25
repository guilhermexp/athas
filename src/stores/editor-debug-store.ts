import { create } from "zustand";
import type { Position } from "../types/editor-types";

interface DebugEvent {
  timestamp: number;
  type: "keystroke" | "text-change" | "cursor-move" | "selection";
  data: any;
}

interface EditorDebugState {
  recentKeystrokes: string[];
  recentTextChanges: Array<{
    timestamp: number;
    oldValue: string;
    newValue: string;
    cursorBefore: Position;
    cursorAfter: Position;
  }>;
  cursorHistory: Position[];
  debugEvents: DebugEvent[];
  isVisible: boolean;
}

interface EditorDebugActions {
  addKeystroke: (key: string) => void;
  addTextChange: (change: {
    oldValue: string;
    newValue: string;
    cursorBefore: Position;
    cursorAfter: Position;
  }) => void;
  addCursorPosition: (position: Position) => void;
  addDebugEvent: (event: DebugEvent) => void;
  toggleVisibility: () => void;
  clearHistory: () => void;
}

const MAX_HISTORY_SIZE = 50;
const MAX_KEYSTROKE_HISTORY = 20;

export const useEditorDebugStore = create<EditorDebugState & EditorDebugActions>((set) => ({
  recentKeystrokes: [],
  recentTextChanges: [],
  cursorHistory: [],
  debugEvents: [],
  isVisible: true, // Set to true for debugging session

  addKeystroke: (key) =>
    set((state) => ({
      recentKeystrokes: [...state.recentKeystrokes.slice(-MAX_KEYSTROKE_HISTORY + 1), key],
    })),

  addTextChange: (change) =>
    set((state) => ({
      recentTextChanges: [
        ...state.recentTextChanges.slice(-9),
        { ...change, timestamp: Date.now() },
      ],
    })),

  addCursorPosition: (position) =>
    set((state) => ({
      cursorHistory: [...state.cursorHistory.slice(-MAX_HISTORY_SIZE + 1), position],
    })),

  addDebugEvent: (event) =>
    set((state) => ({
      debugEvents: [...state.debugEvents.slice(-MAX_HISTORY_SIZE + 1), event],
    })),

  toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),

  clearHistory: () =>
    set({
      recentKeystrokes: [],
      recentTextChanges: [],
      cursorHistory: [],
      debugEvents: [],
    }),
}));
