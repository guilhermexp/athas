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

        this.timeoutId = setTimeout(async () => {
          await this.fetchAndCacheTokens();
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
      // Debounce the update
      this.timeoutId = setTimeout(async () => {
        await this.fetchAndCacheTokens();
      }, DEBOUNCE_TIME_MS);
    }
  }

  private async fetchAndCacheTokens() {
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

      // Update decorations
      this.applyDecorations();
    } catch (error) {
      console.error("Syntax highlighting error:", error);
      this.tokens = [];
    }
  }

  private applyDecorations(_affectedLines?: Set<number>) {
    // Update line tokens in the store
    this.updateLineTokens();
  }

  private updateLineTokens() {
    const lines = this.editor.getLines();
    const existingLineTokens = useEditorContentStore.getState().lineTokens;
    const { setAllLineTokens } = useEditorContentStore.getState().actions;

    // Build all line tokens at once
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

  onContentChange: (_content: string, _changes: Change[]) => {
    if (highlighter) {
      highlighter.updateHighlighting();
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
