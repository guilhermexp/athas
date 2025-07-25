import type { CompletionItem } from "vscode-languageserver-protocol";
import { create } from "zustand";
import { combine } from "zustand/middleware";

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
  aiCompletion: false,

  // Actions
  actions: {} as {
    setLspCompletions: (completions: CompletionItem[]) => void;
    setSelectedLspIndex: (index: number) => void;
    setIsLspCompletionVisible: (visible: boolean) => void;
    setCompletionPosition: (position: CompletionPosition) => void;
    setHoverInfo: (info: HoverInfo | null) => void;
    setIsHovering: (hovering: boolean) => void;
    setAiCompletion: (enabled: boolean) => void;
  },
};

export const useEditorCompletionStore = create(
  combine(initialState, (set) => ({
    actions: {
      setLspCompletions: (completions: CompletionItem[]) => set({ lspCompletions: completions }),
      setSelectedLspIndex: (index: number) => set({ selectedLspIndex: index }),
      setIsLspCompletionVisible: (visible: boolean) => set({ isLspCompletionVisible: visible }),
      setCompletionPosition: (position: CompletionPosition) =>
        set({ completionPosition: position }),
      setHoverInfo: (info: HoverInfo | null) => set({ hoverInfo: info }),
      setIsHovering: (hovering: boolean) => set({ isHovering: hovering }),
      setAiCompletion: (enabled: boolean) => set({ aiCompletion: enabled }),
    },
  })),
);
