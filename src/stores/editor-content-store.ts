import { create } from "zustand";
import { combine } from "zustand/middleware";

export const useEditorContentStore = create(
  combine(
    {
      bufferContent: "",
      filename: "",
      filePath: "",
    },
    set => ({
      // Core Editor Actions
      setBufferContent: (bufferContent: string) => set({ bufferContent }),
      setFilename: (filename: string) => set({ filename }),
      setFilePath: (filePath: string) => set({ filePath }),
    }),
  ),
);
