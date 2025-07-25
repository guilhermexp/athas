import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Position, Range } from "../types/editor-types";

interface EditorCursorState {
  cursorPosition: Position;
  selection: Range | null;
  desiredColumn: number | null;
}

interface EditorCursorActions {
  setCursorPosition: (position: Position) => void;
  setSelection: (selection: Range | null) => void;
  setDesiredColumn: (column: number | null) => void;
}

export const useEditorCursorStore = create<EditorCursorState & EditorCursorActions>()(
  subscribeWithSelector((set) => ({
    // State
    cursorPosition: { line: 0, column: 0, offset: 0 },
    selection: null,
    desiredColumn: null,

    // Actions
    setCursorPosition: (position) => set({ cursorPosition: position }),
    setSelection: (selection) => set({ selection }),
    setDesiredColumn: (column) => set({ desiredColumn: column }),
  })),
);
