import { getTokens, type Token } from "../lib/rust-api/tokens";
import { useBufferStore } from "../stores/buffer-store";
import { useEditorContentStore } from "../stores/editor-content-store";
import type { Change, LineToken } from "../types/editor-types";
import type { EditorAPI, EditorExtension } from "./extension-types";

const DEBOUNCE_TIME_MS = 300;

class SyntaxHighlighter {
  private editor: EditorAPI;
  private tokens: Token[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private filePath: string | null = null;
  private pendingAffectedLines: Set<number> | undefined = undefined;

  constructor(editor: EditorAPI) {
    this.editor = editor;
  }

  setFilePath(filePath: string) {
    this.filePath = filePath;
    // When switching files, try to use cached tokens immediately
    this.updateHighlighting(true);
  }

  async updateHighlighting(immediate = false, affectedLines?: Set<number>) {
    if (!this.filePath) {
      return;
    }

    // Check if we have cached tokens for the current buffer
    const bufferStore = useBufferStore.getState();
    const activeBuffer = bufferStore.actions.getActiveBuffer();

    if (activeBuffer && activeBuffer.path === this.filePath && activeBuffer.tokens.length > 0) {
      // Use cached tokens immediately
      this.tokens = activeBuffer.tokens;
      this.applyDecorations(affectedLines);

      // If not immediate (regular content change), still fetch new tokens in background
      if (!immediate) {
        // Clear existing timeout
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
        }

        // Accumulate affected lines for the debounced update
        if (affectedLines) {
          if (!this.pendingAffectedLines) {
            this.pendingAffectedLines = new Set();
          }
          affectedLines.forEach((line) => this.pendingAffectedLines!.add(line));
        }

        this.timeoutId = setTimeout(async () => {
          const linesToUpdate = this.pendingAffectedLines;
          this.pendingAffectedLines = undefined;
          await this.fetchAndCacheTokens(linesToUpdate);
        }, DEBOUNCE_TIME_MS);
      }
      return;
    }

    // Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // If immediate flag is set, fetch without debounce
    if (immediate) {
      await this.fetchAndCacheTokens();
    } else {
      // Accumulate affected lines for the debounced update
      if (affectedLines) {
        if (!this.pendingAffectedLines) {
          this.pendingAffectedLines = new Set();
        }
        affectedLines.forEach((line) => this.pendingAffectedLines!.add(line));
      }

      // Debounce the update
      this.timeoutId = setTimeout(async () => {
        const linesToUpdate = this.pendingAffectedLines;
        this.pendingAffectedLines = undefined;
        await this.fetchAndCacheTokens(linesToUpdate);
      }, DEBOUNCE_TIME_MS);
    }
  }

  private async fetchAndCacheTokens(affectedLines?: Set<number>) {
    try {
      const content = this.editor.getContent();
      const extension = this.filePath?.split(".").pop() || "txt";

      // Fetch tokens from Rust API
      this.tokens = await getTokens(content, extension);

      // Cache tokens in buffer store
      const bufferStore = useBufferStore.getState();
      const activeBuffer = bufferStore.actions.getActiveBuffer();
      if (activeBuffer) {
        bufferStore.actions.updateBufferTokens(activeBuffer.id, this.tokens);
      }

      // Update decorations - pass affected lines to avoid full re-render
      this.applyDecorations(affectedLines);
    } catch (error) {
      console.error("Syntax highlighting error:", error);
      this.tokens = [];
    }
  }

  private applyDecorations(affectedLines?: Set<number>) {
    // Update line tokens in the store
    this.updateLineTokens(affectedLines);
  }

  private updateLineTokens(affectedLines?: Set<number>) {
    const lines = this.editor.getLines();
    const existingLineTokens = useEditorContentStore.getState().lineTokens;
    const { setAllLineTokens, setTokensForLine } = useEditorContentStore.getState().actions;

    // If we have specific affected lines and tokens are already loaded, update only those
    if (affectedLines && affectedLines.size > 0 && this.tokens.length > 0) {
      // Calculate tokens only for affected lines
      let currentOffset = 0;

      // First, calculate the offset to the first affected line
      const minAffectedLine = Math.min(...affectedLines);
      for (let i = 0; i < minAffectedLine; i++) {
        currentOffset += lines[i].length + 1;
      }

      // Update only affected lines
      for (const lineNumber of affectedLines) {
        // Reset offset calculation for this specific line
        currentOffset = 0;
        for (let i = 0; i < lineNumber; i++) {
          currentOffset += lines[i].length + 1;
        }

        const lineLength = lines[lineNumber].length;
        const lineStart = currentOffset;
        const lineEnd = currentOffset + lineLength;
        const lineTokens: LineToken[] = [];

        // Find tokens that overlap with this line
        for (const token of this.tokens) {
          if (token.start >= lineEnd) break;
          if (token.end <= lineStart) continue;

          const tokenStartInLine = Math.max(0, token.start - lineStart);
          const tokenEndInLine = Math.min(lineLength, token.end - lineStart);

          if (tokenStartInLine < tokenEndInLine) {
            lineTokens.push({
              startColumn: tokenStartInLine,
              endColumn: tokenEndInLine,
              className: token.class_name,
            });
          }
        }

        // Update single line
        setTokensForLine(lineNumber, lineTokens);
      }

      return;
    }

    // Otherwise, build all line tokens at once (initial load or full refresh)
    const tokensByLine = new Map<number, LineToken[]>();
    let currentOffset = 0;

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
      const lineLength = lines[lineNumber].length;
      const lineStart = currentOffset;
      const lineEnd = currentOffset + lineLength;
      const lineTokens: LineToken[] = [];

      // Find tokens that overlap with this line
      for (const token of this.tokens) {
        // Early exit if token starts after this line
        if (token.start >= lineEnd) break;

        // Skip if token ends before this line
        if (token.end <= lineStart) continue;

        const tokenStartInLine = Math.max(0, token.start - lineStart);
        const tokenEndInLine = Math.min(lineLength, token.end - lineStart);

        if (tokenStartInLine < tokenEndInLine) {
          lineTokens.push({
            startColumn: tokenStartInLine,
            endColumn: tokenEndInLine,
            className: token.class_name,
          });
        }
      }

      // Only store lines that have tokens
      if (lineTokens.length > 0) {
        // Check if we can reuse the existing token array
        const existingTokens = existingLineTokens.get(lineNumber);
        if (existingTokens && this.areTokensEqual(existingTokens, lineTokens)) {
          tokensByLine.set(lineNumber, existingTokens); // Reuse existing array
        } else {
          tokensByLine.set(lineNumber, lineTokens);
        }
      }

      currentOffset += lineLength + 1; // +1 for newline
    }

    // Update all tokens in a single operation
    setAllLineTokens(tokensByLine);
  }

  private areTokensEqual(tokens1: LineToken[], tokens2: LineToken[]): boolean {
    if (tokens1.length !== tokens2.length) return false;

    for (let i = 0; i < tokens1.length; i++) {
      const t1 = tokens1[i];
      const t2 = tokens2[i];
      if (
        t1.startColumn !== t2.startColumn ||
        t1.endColumn !== t2.endColumn ||
        t1.className !== t2.className
      ) {
        return false;
      }
    }

    return true;
  }

  dispose() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}

let highlighter: SyntaxHighlighter | null = null;

export const syntaxHighlightingExtension: EditorExtension = {
  name: "Syntax Highlighting",
  version: "1.0.0",
  description: "Provides syntax highlighting for various programming languages",

  initialize: (editor: EditorAPI) => {
    highlighter = new SyntaxHighlighter(editor);
    highlighter.updateHighlighting();
  },

  dispose: () => {
    if (highlighter) {
      highlighter.dispose();
      highlighter = null;
    }
  },

  onContentChange: (_content: string, _changes: Change[], affectedLines?: Set<number>) => {
    if (highlighter) {
      highlighter.updateHighlighting(false, affectedLines);
    }
  },

  // Provide decorations dynamically
  decorations: () => {
    // Return empty array since we manage decorations through the editor API
    // The decorations are added directly to the editor's decoration store
    return [];
  },
};

// Export function to set file path (temporary until editor instance provides it)
export function setSyntaxHighlightingFilePath(filePath: string) {
  if (highlighter) {
    highlighter.setFilePath(filePath);
  }
}
