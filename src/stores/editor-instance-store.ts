import type { RefObject } from "react";
import { create } from "zustand";
import { combine } from "zustand/middleware";

const initialState = {
  // Content
  value: "",
  onChange: (() => {}) as (value: string) => void,

  // File info
  filePath: "",
  filename: "",

  // Refs - these are set per editor instance
  editorRef: null as RefObject<HTMLDivElement | null> | null,
  lineNumbersRef: null as RefObject<HTMLDivElement | null> | null,

  // UI props
  placeholder: undefined as string | undefined,
  disabled: false,
  className: undefined as string | undefined,
};

// Current editor instance store
export const useEditorInstanceStore = create(
  combine(initialState, set => ({
    // Actions
    setRefs: (refs: {
      editorRef: RefObject<HTMLDivElement | null>;
      lineNumbersRef: RefObject<HTMLDivElement | null>;
    }) => set(refs),
    setContent: (value: string, onChange: (value: string) => void) => set({ value, onChange }),
    setFileInfo: (filePath: string, filename: string) => set({ filePath, filename }),
    setUIProps: (props: { placeholder?: string; disabled: boolean; className?: string }) =>
      set(props),
  })),
);
