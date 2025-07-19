import { useEffect, useRef, useState } from "react";
import { getTokensFromPath, type Token } from "../lib/rust-api/tokens";
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
  const currentFilePathRef = useRef<string | undefined>(undefined);

  const fetchTokens = async (_content: string, filePath?: string) => {
    if (!filePath) return;

    try {
      const newTokens = await getTokensFromPath(filePath);
      // Only set tokens if we're still on the same file
      if (filePath === currentFilePathRef.current) {
        setTokens(newTokens);
      }
    } catch (_error) {
      // File is not supported or couldn't be parsed
      if (filePath === currentFilePathRef.current) {
        setTokens([]);
      }
    }
  };

  const clearTokens = () => {
    setTokens([]);
  };

  const debouncedFetchTokens = (content: string, filePath?: string) => {
    if (decorationTimeoutRef.current) {
      clearTimeout(decorationTimeoutRef.current);
    }

    // If file path changed, clear tokens immediately
    if (filePath !== currentFilePathRef.current) {
      clearTokens();
      currentFilePathRef.current = filePath;
    }

    decorationTimeoutRef.current = setTimeout(() => {
      fetchTokens(content, filePath);
    }, 100);
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
    clearTokens,
  };
}
