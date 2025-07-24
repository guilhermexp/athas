import type { Draft } from "immer";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { LineToken } from "../types/editor-types";

interface EditorContentState {
  lines: string[];
  lineTokens: Map<number, LineToken[]>;
  filename: string;
  filePath: string;
}

type EditorContentActions = ReturnType<typeof createActions>;

export const useEditorContentStore = create<EditorContentState & EditorContentActions>()(
  immer((set, get) => ({
    // State
    lines: [""],
    lineTokens: new Map<number, LineToken[]>(),
    filename: "",
    filePath: "",

    // Actions
    ...createActions(set, get),
  })),
);

function createActions(
  set: ((fn: (state: Draft<EditorContentState>) => void) => void) &
    ((state: Partial<EditorContentState>) => void),
  get: () => EditorContentState & EditorContentActions,
) {
  return {
    // Core Editor Actions
    setContent: (content: string) => {
      const lines = content ? content.split("\n") : [""];
      set(state => {
        state.lines = lines;
        state.lineTokens = new Map(); // Clear tokens on content change
      });
    },

    // Line operations
    updateLine: (lineNumber: number, content: string) =>
      set(state => {
        if (lineNumber < 0 || lineNumber >= state.lines.length) {
          return;
        }

        state.lines[lineNumber] = content;
        state.lineTokens.delete(lineNumber); // Clear tokens for updated line
      }),

    insertLines: (lineNumber: number, linesToInsert: string[]) =>
      set(state => {
        if (lineNumber < 0 || lineNumber > state.lines.length) {
          return;
        }

        state.lines.splice(lineNumber, 0, ...linesToInsert);

        // Shift tokens for lines after insertion
        const oldTokens = Array.from(state.lineTokens.entries());
        state.lineTokens.clear();

        for (const [line, tokens] of oldTokens) {
          if (line >= lineNumber) {
            state.lineTokens.set(line + linesToInsert.length, tokens);
          } else {
            state.lineTokens.set(line, tokens);
          }
        }
      }),

    deleteLines: (startLine: number, count: number) =>
      set(state => {
        if (startLine < 0 || startLine >= state.lines.length || count <= 0) {
          return;
        }

        const endLine = Math.min(startLine + count, state.lines.length);
        const deletedCount = endLine - startLine;

        state.lines.splice(startLine, deletedCount);

        if (state.lines.length === 0) {
          state.lines.push("");
        }

        // Shift tokens for lines after deletion
        const oldTokens = Array.from(state.lineTokens.entries());
        state.lineTokens.clear();

        for (const [line, tokens] of oldTokens) {
          if (line < startLine) {
            state.lineTokens.set(line, tokens);
          } else if (line >= endLine) {
            state.lineTokens.set(line - deletedCount, tokens);
          }
        }
      }),

    // Token management
    setLineTokens: (lineNumber: number, tokens: LineToken[]) =>
      set(state => {
        if (lineNumber < 0 || lineNumber >= state.lines.length) {
          return;
        }

        if (tokens.length > 0) {
          state.lineTokens.set(lineNumber, tokens);
        } else {
          state.lineTokens.delete(lineNumber);
        }
      }),

    setFilename: (filename: string) =>
      set(state => {
        state.filename = filename;
      }),
    setFilePath: (filePath: string) =>
      set(state => {
        state.filePath = filePath;
      }),

    // Getters
    getLine: (lineNumber: number): string | undefined => {
      const state = get();
      return state.lines[lineNumber];
    },
    getLines: (): string[] => {
      return get().lines;
    },
    getLineCount: (): number => {
      return get().lines.length;
    },
    getContent: (): string => {
      return get().lines.join("\n");
    },
  };
}
