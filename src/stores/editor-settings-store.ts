import { create } from "zustand";
import { combine } from "zustand/middleware";

const initialState = {
  // Editor Settings
  fontSize: 14,
  fontFamily: "JetBrains Mono",
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
  disabled: false,
  theme: "auto",
};

export const useEditorSettingsStore = create(
  combine(initialState, (set) => ({
    // Editor Settings Actions
    setFontSize: (size: number) => set({ fontSize: size }),
    setFontFamily: (family: string) => set({ fontFamily: family }),
    setTabSize: (size: number) => set({ tabSize: size }),
    setWordWrap: (wrap: boolean) => set({ wordWrap: wrap }),
    setLineNumbers: (show: boolean) => set({ lineNumbers: show }),
    setDisabled: (disabled: boolean) => set({ disabled }),
    setTheme: (theme: string) => set({ theme }),

    // Bulk configuration update
    updateConfig: (config: Partial<typeof initialState>) =>
      set((state) => ({ ...state, ...config })),
  })),
);
