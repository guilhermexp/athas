import { create, type ExtractState } from "zustand";
import { combine } from "zustand/middleware";

const initialState = {
  fontSize: 14,
  fontFamily: "JetBrains Mono",
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
  theme: "auto",
  aiCompletion: true,
};

// Global editor configuration store
export const useEditorConfigStore = create(
  combine(initialState, set => ({
    // Actions
    setFontSize: (size: number) => set({ fontSize: size }),
    setFontFamily: (family: string) => set({ fontFamily: family }),
    setTabSize: (size: number) => set({ tabSize: size }),
    setWordWrap: (wrap: boolean) => set({ wordWrap: wrap }),
    setLineNumbers: (show: boolean) => set({ lineNumbers: show }),
    setTheme: (theme: string) => set({ theme }),
    setAiCompletion: (enabled: boolean) => set({ aiCompletion: enabled }),

    // Bulk configuration update
    updateConfig: (config: Partial<typeof initialState>) => set(state => ({ ...state, ...config })),
  })),
);

export type EditorConfigState = ExtractState<typeof useEditorConfigStore>;
export type EditorConfig = Omit<
  EditorConfigState,
  | "setFontSize"
  | "setTabSize"
  | "setWordWrap"
  | "setLineNumbers"
  | "setTheme"
  | "setAiCompletion"
  | "updateConfig"
>;
