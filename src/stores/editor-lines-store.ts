import { create } from "zustand";
import type { LineToken } from "../types/editor-types";

interface EditorLinesStore {
  lines: string[];
  lineTokens: Map<number, LineToken[]>;
  lineHeights: Map<number, number>;

  setContent: (content: string) => void;
  updateLine: (lineNumber: number, content: string) => void;
  insertLines: (lineNumber: number, lines: string[]) => void;
  deleteLines: (startLine: number, count: number) => void;
  setLineTokens: (lineNumber: number, tokens: LineToken[]) => void;
  setLineHeight: (lineNumber: number, height: number) => void;

  getLine: (lineNumber: number) => string | undefined;
  getLineCount: () => number;
  getContent: () => string;
  getTotalHeight: () => number;
}

export const useEditorLinesStore = create<EditorLinesStore>((set, get) => ({
  lines: [""],
  lineTokens: new Map(),
  lineHeights: new Map(),

  setContent: (content: string) => {
    const lines = content.split("\n");
    set({
      lines,
      lineTokens: new Map(),
      lineHeights: new Map(),
    });
  },

  updateLine: (lineNumber: number, content: string) => {
    set(state => {
      if (lineNumber < 0 || lineNumber >= state.lines.length) {
        return state;
      }

      const newLines = [...state.lines];
      newLines[lineNumber] = content;

      const newLineTokens = new Map(state.lineTokens);
      newLineTokens.delete(lineNumber);

      return {
        lines: newLines,
        lineTokens: newLineTokens,
      };
    });
  },

  insertLines: (lineNumber: number, lines: string[]) => {
    set(state => {
      if (lineNumber < 0 || lineNumber > state.lines.length) {
        return state;
      }

      const newLines = [
        ...state.lines.slice(0, lineNumber),
        ...lines,
        ...state.lines.slice(lineNumber),
      ];

      const newLineTokens = new Map<number, LineToken[]>();
      const newLineHeights = new Map<number, number>();

      state.lineTokens.forEach((tokens, line) => {
        if (line >= lineNumber) {
          newLineTokens.set(line + lines.length, tokens);
        } else {
          newLineTokens.set(line, tokens);
        }
      });

      state.lineHeights.forEach((height, line) => {
        if (line >= lineNumber) {
          newLineHeights.set(line + lines.length, height);
        } else {
          newLineHeights.set(line, height);
        }
      });

      return {
        lines: newLines,
        lineTokens: newLineTokens,
        lineHeights: newLineHeights,
      };
    });
  },

  deleteLines: (startLine: number, count: number) => {
    set(state => {
      if (startLine < 0 || startLine >= state.lines.length || count <= 0) {
        return state;
      }

      const endLine = Math.min(startLine + count, state.lines.length);
      const deletedCount = endLine - startLine;

      const newLines = [...state.lines.slice(0, startLine), ...state.lines.slice(endLine)];

      if (newLines.length === 0) {
        newLines.push("");
      }

      const newLineTokens = new Map<number, LineToken[]>();
      const newLineHeights = new Map<number, number>();

      state.lineTokens.forEach((tokens, line) => {
        if (line < startLine) {
          newLineTokens.set(line, tokens);
        } else if (line >= endLine) {
          newLineTokens.set(line - deletedCount, tokens);
        }
      });

      state.lineHeights.forEach((height, line) => {
        if (line < startLine) {
          newLineHeights.set(line, height);
        } else if (line >= endLine) {
          newLineHeights.set(line - deletedCount, height);
        }
      });

      return {
        lines: newLines,
        lineTokens: newLineTokens,
        lineHeights: newLineHeights,
      };
    });
  },

  setLineTokens: (lineNumber: number, tokens: LineToken[]) => {
    set(state => {
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
    });
  },

  setLineHeight: (lineNumber: number, height: number) => {
    set(state => {
      const newLineHeights = new Map(state.lineHeights);
      newLineHeights.set(lineNumber, height);
      return { lineHeights: newLineHeights };
    });
  },

  getLine: (lineNumber: number): string | undefined => {
    const state = get();
    return state.lines[lineNumber];
  },

  getLineCount: (): number => {
    return get().lines.length;
  },

  getContent: (): string => {
    return get().lines.join("\n");
  },

  getTotalHeight: (): number => {
    const state = get();
    const defaultHeight = 20;
    let total = 0;

    for (let i = 0; i < state.lines.length; i++) {
      total += state.lineHeights.get(i) || defaultHeight;
    }

    return total;
  },
}));
