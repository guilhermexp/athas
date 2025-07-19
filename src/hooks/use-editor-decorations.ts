import { useEffect, useRef, useState } from "react";
import { getTokens, type Token } from "../lib/rust-api/tokens";
import { getLanguageFromFilename } from "../utils/file-utils";
import { getCursorPosition, setCursorPosition } from "./use-vim";

interface DecoratedSegment {
  text: string;
  className?: string;
  start: number;
  end: number;
}

export function useEditorDecorations() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const decorationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const fetchTokens = async (content: string, filePath?: string) => {
    if (!filePath) return;

    const language = getLanguageFromFilename(filePath).toLowerCase();
    const supportedLanguages = ["javascript", "typescript"];
    if (!supportedLanguages.includes(language)) {
      setTokens([]);
      return;
    }

    // Map to tree-sitter language keys
    let tsLanguage = language;
    if (filePath.endsWith(".tsx")) {
      tsLanguage = "tsx";
    } else if (filePath.endsWith(".ts")) {
      tsLanguage = "typescript";
    } else if (filePath.endsWith(".js") || filePath.endsWith(".jsx")) {
      tsLanguage = "javascript";
    }

    try {
      const newTokens = await getTokens(content, tsLanguage);
      setTokens(newTokens);
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
      setTokens([]);
    }
  };

  const debouncedFetchTokens = (content: string, filePath?: string) => {
    if (decorationTimeoutRef.current) {
      clearTimeout(decorationTimeoutRef.current);
    }

    decorationTimeoutRef.current = setTimeout(() => {
      fetchTokens(content, filePath);
    }, 300);
  };

  const applyDecorations = (
    editorRef: React.RefObject<HTMLDivElement | null>,
    content: string,
    tokens: Token[],
  ) => {
    if (!editorRef.current || !content) return;

    // Save cursor position
    const cursorPos = getCursorPosition(editorRef.current);

    // Create segments
    const segments: DecoratedSegment[] = [];
    let lastEnd = 0;

    // Sort tokens by start position
    const sortedTokens = [...tokens].sort((a, b) => a.start - b.start);

    for (const token of sortedTokens) {
      // Add plain text before token
      if (token.start > lastEnd) {
        segments.push({
          text: content.substring(lastEnd, token.start),
          start: lastEnd,
          end: token.start,
        });
      }

      // Add token
      if (token.end <= content.length) {
        segments.push({
          text: content.substring(token.start, token.end),
          className: token.class_name,
          start: token.start,
          end: token.end,
        });
        lastEnd = token.end;
      }
    }

    // Add remaining text
    if (lastEnd < content.length) {
      segments.push({
        text: content.substring(lastEnd),
        start: lastEnd,
        end: content.length,
      });
    }

    // Clear current content
    editorRef.current.innerHTML = "";

    // Render segments
    segments.forEach(segment => {
      if (segment.text) {
        const span = document.createElement("span");
        span.textContent = segment.text;
        if (segment.className) {
          span.className = segment.className;
        }
        editorRef.current!.appendChild(span);
      }
    });

    // Restore cursor position
    setCursorPosition(editorRef.current, cursorPos);
  };

  useEffect(() => {
    return () => {
      if (decorationTimeoutRef.current) {
        clearTimeout(decorationTimeoutRef.current);
      }
    };
  }, []);

  return {
    tokens,
    debouncedFetchTokens,
    applyDecorations,
  };
}
