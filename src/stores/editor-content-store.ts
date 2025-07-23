import { create, type ExtractState } from "zustand";
import { combine } from "zustand/middleware";

const initialState = {
  value: "",
  language: "text",
  filename: "",
  filePath: "",
  cursorPosition: 0,
  selectionStart: 0,
  selectionEnd: 0,
  isTyping: false,
};

export const useEditorContentStore = create(
  combine(initialState, set => ({
    // Core Editor Actions
    setValue: (value: string) => set({ value }),
    setLanguage: (language: string) => set({ language }),
    setFilename: (filename: string) => set({ filename }),
    setFilePath: (filePath: string) => set({ filePath }),
    setCursorPosition: (position: number) => set({ cursorPosition: position }),
    setSelection: (start: number, end: number) => set({ selectionStart: start, selectionEnd: end }),
    setIsTyping: (typing: boolean) => set({ isTyping: typing }),
  })),
);

export type EditorContentState = ExtractState<typeof useEditorContentStore>;
