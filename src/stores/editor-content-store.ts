import isEqual from "fast-deep-equal";
import { combine } from "zustand/middleware";
import { createWithEqualityFn } from "zustand/traditional";
import type { LineToken } from "../types/editor-types";

export const useEditorContentStore = createWithEqualityFn(
  combine(
    {
      lines: [""],
      lineTokens: new Map<number, LineToken[]>(),
      filename: "",
      filePath: "",
    },
    (set, get) => ({
      setContent: (content: string) => {
        const lines = content ? content.split("\n") : [""];
        set({
          lines,
        });
      },

      setLineTokens: (lineNumber: number, tokens: LineToken[]) =>
        set((state) => {
          if (lineNumber < 0 || lineNumber >= state.lines.length) {
            return state;
          }

          const newLineTokens = new Map(state.lineTokens);
          if (tokens.length > 0) {
            newLineTokens.set(lineNumber, tokens);
          } else {
            newLineTokens.delete(lineNumber);
          }

          return { ...state, lineTokens: newLineTokens };
        }),

      getContent: (): string => {
        return get().lines.join("\n");
      },
    }),
  ),
  isEqual,
);
