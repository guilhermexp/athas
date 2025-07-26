import isEqual from "fast-deep-equal";
import { createWithEqualityFn } from "zustand/traditional";
import { createSelectors } from "@/utils/zustand-selectors";
import type { LineToken } from "../types/editor-types";

interface EditorContentState {
  lines: string[];
  lineTokens: Map<number, LineToken[]>;
  filename: string;
  filePath: string;
  actions: {
    setContent: (content: string) => void;
    setTokensForLine: (line: number, tokens: LineToken[]) => void;
    setAllLineTokens: (tokens: Map<number, LineToken[]>) => void;
    getContent: () => string;
  };
}

export const useEditorContentStore = createSelectors(
  createWithEqualityFn<EditorContentState>()(
    (set, get) => ({
      lines: [""],
      lineTokens: new Map<number, LineToken[]>(),
      filename: "",
      filePath: "",
      actions: {
        setContent: (content) => {
          const lines = content ? content.split("\n") : [""];
          set({ lines });
        },
        setTokensForLine: (line, tokens) =>
          set((state) => {
            const map = new Map(state.lineTokens);
            map.set(line, tokens);
            return { lineTokens: map };
          }),
        setAllLineTokens: (lineTokens) => set(() => ({ lineTokens })),
        getContent: () => get().lines.join("\n"),
      },
    }),
    isEqual,
  ),
);
