import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createSelectors } from "@/utils/zustand-selectors";
import { EDITOR_CONSTANTS } from "../constants/editor-constants";

interface EditorLayoutState {
  scrollTop: number;
  scrollLeft: number;
  viewportHeight: number;
  actions: EditorLayoutActions;
}

interface EditorLayoutActions {
  setScroll: (scrollTop: number, scrollLeft: number) => void;
  setViewportHeight: (height: number) => void;
}

export const useEditorLayoutStore = createSelectors(
  create<EditorLayoutState>()(
    subscribeWithSelector((set) => ({
      scrollTop: 0,
      scrollLeft: 0,
      viewportHeight: EDITOR_CONSTANTS.DEFAULT_VIEWPORT_HEIGHT,
      actions: {
        setScroll: (scrollTop, scrollLeft) => set({ scrollTop, scrollLeft }),
        setViewportHeight: (height) => set({ viewportHeight: height }),
      },
    })),
  ),
);
