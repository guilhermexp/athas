import { useEffect, useRef, useState } from "react";
import { getTokensFromPath, type Token } from "../lib/rust-api/tokens";

interface DecoratedSegment {
  text: string;
  className?: string;
  start: number;
  end: number;
}

export function useEditorDecorations() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isHighlightingReady, setIsHighlightingReady] = useState<boolean>(false);
  const decorationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const currentFilePathRef = useRef<string | undefined>(undefined);
  const tokenCacheRef = useRef<Map<string, Token[]>>(new Map());

  const fetchTokens = async (_content: string, filePath?: string) => {
    if (!filePath) return;

    setIsHighlightingReady(false);

    // Check cache first
    const cachedTokens = tokenCacheRef.current.get(filePath);
    if (cachedTokens && filePath === currentFilePathRef.current) {
      setTokens(cachedTokens);
      setIsHighlightingReady(true);
      return;
    }

    try {
      const newTokens = await getTokensFromPath(filePath);
      // Only set tokens if we're still on the same file
      if (filePath === currentFilePathRef.current) {
        setTokens(newTokens);
        setIsHighlightingReady(true);
        // Cache the tokens
        tokenCacheRef.current.set(filePath, newTokens);
      }
    } catch (_error) {
      // File is not supported or couldn't be parsed
      if (filePath === currentFilePathRef.current) {
        setTokens([]);
        setIsHighlightingReady(true);
        // Cache empty tokens to avoid repeated failed attempts
        tokenCacheRef.current.set(filePath, []);
      }
    }
  };

  const clearTokens = () => {
    setTokens([]);
    setIsHighlightingReady(false);
  };

  const handleTokenFetch = (content: string, filePath?: string) => {
    // If file path changed, check cache immediately
    if (filePath !== currentFilePathRef.current) {
      currentFilePathRef.current = filePath;

      // Check if we have cached tokens for this file
      const cachedTokens = filePath ? tokenCacheRef.current.get(filePath) : undefined;
      if (cachedTokens) {
        // Apply cached tokens immediately
        setTokens(cachedTokens);
        return; // No need to fetch again
      } else {
        // Clear tokens and fetch immediately for new files
        clearTokens();
        fetchTokens(content, filePath);
        return;
      }
    }

    // For content changes on the same file, fetch immediately for better performance
    fetchTokens(content, filePath);
  };

  const applyDecorations = (
    editorRef: React.RefObject<HTMLDivElement | null>,
    content: string,
    tokens: Token[],
  ) => {
    if (!editorRef.current || !content) return;

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
        // Handle line breaks properly by splitting text and creating line elements
        const lines = segment.text.split("\n");
        lines.forEach((line, lineIndex) => {
          if (lineIndex > 0) {
            // Add line break
            editorRef.current!.appendChild(document.createTextNode("\n"));
          }

          if (line) {
            const span = document.createElement("span");
            span.textContent = line;
            if (segment.className) {
              span.className = segment.className;
            }
            editorRef.current!.appendChild(span);
          }
        });
      }
    });
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
    isHighlightingReady,
    debouncedFetchTokens: handleTokenFetch,
    applyDecorations,
    clearTokens,
  };
}
