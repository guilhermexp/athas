import type { CompletionItem } from "vscode-languageserver-protocol";
import { create } from "zustand";
import { combine } from "zustand/middleware";
import type { CompletionResponse } from "../utils/ai-completion";

// Types
type HoverInfo = {
  content: string;
  position: { top: number; left: number };
};

type CompletionPosition = {
  top: number;
  left: number;
};

const initialState = {
  // LSP State
  lspCompletions: [] as CompletionItem[],
  selectedLspIndex: 0,
  isLspCompletionVisible: false,
  completionPosition: { top: 0, left: 0 } as CompletionPosition,
  hoverInfo: null as HoverInfo | null,
  isHovering: false,

  // AI Completion State
  currentCompletion: null as CompletionResponse | null,
  showCompletion: false,
  aiCompletion: false,
};

export const useEditorCompletionStore = create(
  combine(initialState, (set, get) => ({
    // LSP Actions
    setLspCompletions: (completions: CompletionItem[]) => set({ lspCompletions: completions }),
    setSelectedLspIndex: (index: number) => set({ selectedLspIndex: index }),
    setIsLspCompletionVisible: (visible: boolean) => set({ isLspCompletionVisible: visible }),
    setCompletionPosition: (position: CompletionPosition) => set({ completionPosition: position }),
    setHoverInfo: (info: HoverInfo | null) => set({ hoverInfo: info }),
    setIsHovering: (hovering: boolean) => set({ isHovering: hovering }),

    // AI Completion Actions
    setCurrentCompletion: (completion: CompletionResponse | null) =>
      set({ currentCompletion: completion }),
    setShowCompletion: (show: boolean) => set({ showCompletion: show }),
    setAiCompletion: (enabled: boolean) => set({ aiCompletion: enabled }),

    // Helper Actions
    clearCompletions: () =>
      set({
        lspCompletions: [],
        selectedLspIndex: 0,
        isLspCompletionVisible: false,
        currentCompletion: null,
        showCompletion: false,
      }),

    clearHover: () =>
      set({
        hoverInfo: null,
        isHovering: false,
      }),

    // Complex Actions
    nextLspCompletion: () => {
      const { lspCompletions, selectedLspIndex } = get();
      if (lspCompletions.length > 0) {
        const nextIndex = (selectedLspIndex + 1) % lspCompletions.length;
        set({ selectedLspIndex: nextIndex });
      }
    },

    prevLspCompletion: () => {
      const { lspCompletions, selectedLspIndex } = get();
      if (lspCompletions.length > 0) {
        const prevIndex = selectedLspIndex <= 0 ? lspCompletions.length - 1 : selectedLspIndex - 1;
        set({ selectedLspIndex: prevIndex });
      }
    },
  })),
);
