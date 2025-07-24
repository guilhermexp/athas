import { create } from "zustand";
import { combine } from "zustand/middleware";
import type { LineToken } from "../types/editor-types";

export const useEditorContentStore = create(
  combine(
    {
      lines: [""] as string[],
      lineTokens: new Map<number, LineToken[]>(),
      filename: "",
      filePath: "",
    },
    (set, get) => ({
      // Core Editor Actions
      setContent: (content: string) => {
        const lines = content ? content.split("\n") : [""];
        set({
          lines,
          lineTokens: new Map(), // Clear tokens on content change
        });
      },

      // Line operations
      updateLine: (lineNumber: number, content: string) =>
        set(state => {
          if (lineNumber < 0 || lineNumber >= state.lines.length) {
            return state;
          }

          const newLines = [...state.lines];
          newLines[lineNumber] = content;

          const newLineTokens = new Map(state.lineTokens);
          newLineTokens.delete(lineNumber); // Clear tokens for updated line

          return {
            lines: newLines,
            lineTokens: newLineTokens,
          };
        }),

      insertLines: (lineNumber: number, linesToInsert: string[]) =>
        set(state => {
          if (lineNumber < 0 || lineNumber > state.lines.length) {
            return state;
          }

          const newLines = [
            ...state.lines.slice(0, lineNumber),
            ...linesToInsert,
            ...state.lines.slice(lineNumber),
          ];

          // Shift tokens for lines after insertion
          const newLineTokens = new Map<number, LineToken[]>();
          state.lineTokens.forEach((tokens, line) => {
            if (line >= lineNumber) {
              newLineTokens.set(line + linesToInsert.length, tokens);
            } else {
              newLineTokens.set(line, tokens);
            }
          });

          return {
            lines: newLines,
            lineTokens: newLineTokens,
          };
        }),

      deleteLines: (startLine: number, count: number) =>
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

          // Shift tokens for lines after deletion
          const newLineTokens = new Map<number, LineToken[]>();
          state.lineTokens.forEach((tokens, line) => {
            if (line < startLine) {
              newLineTokens.set(line, tokens);
            } else if (line >= endLine) {
              newLineTokens.set(line - deletedCount, tokens);
            }
          });

          return {
            lines: newLines,
            lineTokens: newLineTokens,
          };
        }),

      // Token management
      setLineTokens: (lineNumber: number, tokens: LineToken[]) =>
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
        }),

      setFilename: (filename: string) => set({ filename }),
      setFilePath: (filePath: string) => set({ filePath }),

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
    }),
  ),
);
