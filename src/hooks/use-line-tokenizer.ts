import { useCallback, useEffect } from "react";
import { useEditorLinesStore } from "../stores/editor-lines-store";
import type { LineToken, Token } from "../types/editor-types";

export function useLineTokenizer(_content: string, tokens: Token[], enabled = true) {
  const { lines, setLineTokens } = useEditorLinesStore();

  const convertToLineTokens = useCallback(
    (documentTokens: Token[], documentLines: string[]): Map<number, LineToken[]> => {
      const lineTokensMap = new Map<number, LineToken[]>();

      if (documentTokens.length === 0 || documentLines.length === 0) {
        return lineTokensMap;
      }

      let currentLineStart = 0;
      let tokenIndex = 0;

      for (let lineNumber = 0; lineNumber < documentLines.length; lineNumber++) {
        const lineLength = documentLines[lineNumber].length;
        const lineEnd = currentLineStart + lineLength;
        const lineTokens: LineToken[] = [];

        while (tokenIndex < documentTokens.length) {
          const token = documentTokens[tokenIndex];

          if (token.start >= lineEnd) {
            break;
          }

          if (token.end > currentLineStart) {
            const tokenStartInLine = Math.max(0, token.start - currentLineStart);
            const tokenEndInLine = Math.min(lineLength, token.end - currentLineStart);

            if (tokenStartInLine < tokenEndInLine) {
              lineTokens.push({
                startColumn: tokenStartInLine,
                endColumn: tokenEndInLine,
                className: token.class_name,
              });
            }
          }

          if (token.end <= lineEnd) {
            tokenIndex++;
          } else {
            break;
          }
        }

        if (lineTokens.length > 0) {
          lineTokensMap.set(lineNumber, lineTokens);
        }

        currentLineStart = lineEnd + 1; // +1 for newline character
      }

      return lineTokensMap;
    },
    [],
  );

  const updateAllLineTokens = useCallback(() => {
    if (!enabled) return;

    const lineTokensMap = convertToLineTokens(tokens, lines);

    for (let i = 0; i < lines.length; i++) {
      const lineTokens = lineTokensMap.get(i) || [];
      setLineTokens(i, lineTokens);
    }
  }, [tokens, lines, enabled, convertToLineTokens, setLineTokens]);

  useEffect(() => {
    updateAllLineTokens();
  }, [updateAllLineTokens]);

  const getLineTokensForRange = useCallback(
    (startLine: number, endLine: number): Map<number, LineToken[]> => {
      const result = new Map<number, LineToken[]>();
      const lineTokensMap = convertToLineTokens(tokens, lines);

      for (let i = startLine; i <= endLine && i < lines.length; i++) {
        const lineTokens = lineTokensMap.get(i);
        if (lineTokens) {
          result.set(i, lineTokens);
        }
      }

      return result;
    },
    [tokens, lines, convertToLineTokens],
  );

  return {
    updateAllLineTokens,
    getLineTokensForRange,
  };
}
