import isEqual from "fast-deep-equal";
import { subscribeWithSelector } from "zustand/middleware";
import { createWithEqualityFn } from "zustand/traditional";
import { createSelectors } from "@/utils/zustand-selectors";
import type { LineToken } from "../types/editor-types";

interface EditorContentState {
  lines: string[];
  lineTokens: Map<number, LineToken[]>;
  filename: string;
  filePath: string;
  actions: EditorContentActions;
}

interface EditorContentActions {
  setContent: (content: string) => void;
  setLineTokens: (lineNumber: number, tokens: LineToken[]) => void;
  getContent: () => string;
}

export const useEditorContentStore = createSelectors(
  createWithEqualityFn<EditorContentState>()(
    subscribeWithSelector((set, get) => ({
      lines: [""],
      lineTokens: new Map<number, LineToken[]>(),
      filename: "",
      filePath: "",
      actions: {
        setContent: (content) => {
          const lines = content ? content.split("\n") : [""];
          set({ lines });
        },
        setLineTokens: (lineNumber, tokens) =>
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

            return { lineTokens: newLineTokens };
          }),
        getContent: () => {
          return get().lines.join("\n");
        },
      },
    })),
    isEqual,
  ),
);
