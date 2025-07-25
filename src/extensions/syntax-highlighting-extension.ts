import { getTokens } from "../lib/rust-api/tokens";
import { useEditorContentStore } from "../stores/editor-content-store";
import type { LineToken } from "../types/editor-types";
import type { EditorAPI, EditorExtension } from "./extension-types";

// Import Token from rust-api instead of editor-types
type Token = {
  start: number;
  end: number;
  token_type: string;
  class_name: string;
};

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
    this.updateHighlighting();
  }

  async updateHighlighting() {
    if (!this.filePath) {
      console.log("Syntax highlighting: No file path set");
      return;
    }

    // Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Debounce the update
    this.timeoutId = setTimeout(async () => {
      try {
        const content = this.editor.getContent();
        const extension = this.filePath?.split(".").pop() || "txt";

        console.log(
          `Syntax highlighting: Fetching tokens for .${extension} file, content length: ${content.length}`,
        );

        // Fetch tokens from Rust API
        this.tokens = await getTokens(content, extension);

        console.log(`Syntax highlighting: Received ${this.tokens.length} tokens`);

        // Log the first few tokens to see what class names we're getting
        if (this.tokens.length > 0) {
          console.log(
            "Sample tokens from Rust API:",
            this.tokens.slice(0, 5).map((t) => ({
              text: content.slice(t.start, t.end),
              class_name: t.class_name,
              token_type: t.token_type,
            })),
          );
        }

        // Update decorations
        this.applyDecorations();
      } catch (error) {
        console.error("Syntax highlighting error:", error);
        this.tokens = [];
      }
    }, DEBOUNCE_TIME_MS);
  }

  private applyDecorations() {
    // Update line tokens in the store
    this.updateLineTokens();
  }

  private updateLineTokens() {
    const lines = this.editor.getLines();
    const { setLineTokens } = useEditorContentStore.getState().actions;

    // Update tokens for each line
    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
      const lineTokens = this.getLineTokens(lineNumber);
      setLineTokens(lineNumber, lineTokens);
    }

    console.log(`Syntax highlighting: Updated tokens for ${lines.length} lines`);
  }

  getLineTokens(lineNumber: number): LineToken[] {
    const lines = this.editor.getLines();
    if (lineNumber < 0 || lineNumber >= lines.length) {
      return [];
    }

    const lineTokens: LineToken[] = [];
    let currentOffset = 0;

    // Calculate offset to the start of the requested line
    for (let i = 0; i < lineNumber; i++) {
      currentOffset += lines[i].length + 1; // +1 for newline
    }

    const lineLength = lines[lineNumber].length;
    const lineStart = currentOffset;
    const lineEnd = currentOffset + lineLength;

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
          className: token.class_name, // Rust API already includes 'token-' prefix
        });
      }
    }

    return lineTokens;
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

    // TODO: Get file path from editor instance
    // For now, we'll update it when content changes
    highlighter.updateHighlighting();
  },

  dispose: () => {
    if (highlighter) {
      highlighter.dispose();
      highlighter = null;
    }
  },

  onContentChange: () => {
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
