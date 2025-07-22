import { useCallback, useRef, useState } from "react";
import { useEventCallback } from "usehooks-ts";
import { getTokensFromPath, type Token } from "../lib/rust-api/tokens";

const DEBOUNCE_TIME_MS = 300;

export function useEditorDecorations() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTokensCallback = useEventCallback(async (filePath: string) => {
    try {
      const newTokens = await getTokensFromPath(filePath);
      setTokens(newTokens);
    } catch (error) {
      console.error(error);
      setTokens([]);
    }
  });

  const fetchTokens = useCallback((filePath: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      fetchTokensCallback(filePath);
    }, DEBOUNCE_TIME_MS);
  }, []);

  return {
    tokens,
    fetchTokens,
  };
}
