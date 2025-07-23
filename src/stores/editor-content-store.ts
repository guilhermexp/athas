import { create } from "zustand";
import { combine } from "zustand/middleware";
import { splitTextIntoLines } from "../utils/text-operations";

export const useEditorContentStore = create(
  combine(
    {
      bufferContent: "",
      lines: [""] as string[],
      filename: "",
      filePath: "",
    },
    set => ({
      // Core Editor Actions
      setBufferContent: (bufferContent: string) =>
        set({
          bufferContent,
          lines: splitTextIntoLines(bufferContent),
        }),
      setFilename: (filename: string) => set({ filename }),
      setFilePath: (filePath: string) => set({ filePath }),

      // Line-based getters
      getLines: (): string[] => {
        const state = useEditorContentStore.getState();
        return state.lines;
      },
      getLineCount: (): number => {
        const state = useEditorContentStore.getState();
        return state.lines.length;
      },
    }),
  ),
);
