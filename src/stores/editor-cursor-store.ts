import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createSelectors } from "@/utils/zustand-selectors";
import type { Position, Range } from "../types/editor-types";

interface EditorCursorState {
  cursorPosition: Position;
  selection?: Range;
  desiredColumn?: number;
  actions: EditorCursorActions;
}

interface EditorCursorActions {
  setCursorPosition: (position: Position) => void;
  setSelection: (selection?: Range) => void;
  setDesiredColumn: (column?: number) => void;
}

export const useEditorCursorStore = createSelectors(
  create<EditorCursorState>()(
    subscribeWithSelector((set, _get) => ({
      cursorPosition: { line: 0, column: 0, offset: 0 },
      actions: {
        setCursorPosition: (position) => set({ cursorPosition: position }),
        setSelection: (selection) => set({ selection }),
        setDesiredColumn: (column) => set({ desiredColumn: column }),
      },
    })),
  ),
);
