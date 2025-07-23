import { useEditorContentStore } from "../stores/editor-content-store";
import { useEditorDecorationsStore } from "../stores/editor-decorations-store";
import { useEditorLinesStore } from "../stores/editor-lines-store";
import { useEditorSettingsStore } from "../stores/editor-settings-store";
import type { Decoration, Position, Range } from "../types/editor-types";
import type { EditorAPI, EditorEvent, EditorSettings, EventHandler } from "./extension-types";

export class EditorAPIImpl implements EditorAPI {
  private eventHandlers: Map<EditorEvent, Set<EventHandler>> = new Map();
  private cursorPosition: Position = { line: 0, column: 0, offset: 0 };
  private selection: Range | null = null;

  constructor() {
    // Initialize event handler sets
    const events: EditorEvent[] = [
      "contentChange",
      "selectionChange",
      "cursorChange",
      "settingsChange",
      "decorationChange",
    ];

    events.forEach(event => {
      this.eventHandlers.set(event, new Set());
    });
  }

  // Content operations
  getContent(): string {
    return useEditorContentStore.getState().bufferContent;
  }

  setContent(content: string): void {
    console.log(`EditorAPI: Setting content, length: ${content.length}`);
    useEditorContentStore.getState().setBufferContent(content);
    this.emit("contentChange", { content, changes: [] });
  }

  insertText(text: string, position?: Position): void {
    const content = this.getContent();
    const pos = position || this.getCursorPosition();
    const before = content.substring(0, pos.offset);
    const after = content.substring(pos.offset);
    const newContent = before + text + after;

    this.setContent(newContent);

    // Update cursor position
    const newOffset = pos.offset + text.length;
    this.setCursorPosition(this.offsetToPosition(newOffset));
  }

  deleteRange(range: Range): void {
    const content = this.getContent();
    const before = content.substring(0, range.start.offset);
    const after = content.substring(range.end.offset);
    this.setContent(before + after);
  }

  replaceRange(range: Range, text: string): void {
    const content = this.getContent();
    const before = content.substring(0, range.start.offset);
    const after = content.substring(range.end.offset);
    this.setContent(before + text + after);
  }

  // Selection operations
  getSelection(): Range | null {
    return this.selection;
  }

  setSelection(range: Range): void {
    this.selection = range;
    this.emit("selectionChange", range);
  }

  getCursorPosition(): Position {
    return this.cursorPosition;
  }

  setCursorPosition(position: Position): void {
    this.cursorPosition = position;
    this.emit("cursorChange", position);
  }

  // Internal method to update cursor and selection from external changes
  updateCursorAndSelection(cursor: Position, selection: Range | null): void {
    const cursorChanged =
      this.cursorPosition.line !== cursor.line ||
      this.cursorPosition.column !== cursor.column ||
      this.cursorPosition.offset !== cursor.offset;

    const selectionChanged =
      (this.selection === null && selection !== null) ||
      (this.selection !== null && selection === null) ||
      (this.selection !== null &&
        selection !== null &&
        (this.selection.start.offset !== selection.start.offset ||
          this.selection.end.offset !== selection.end.offset));

    if (cursorChanged) {
      this.cursorPosition = cursor;
      this.emit("cursorChange", cursor);
    }

    if (selectionChanged) {
      this.selection = selection;
      this.emit("selectionChange", selection);
    }
  }

  // Decoration operations
  addDecoration(decoration: Decoration): string {
    const id = useEditorDecorationsStore.getState().addDecoration(decoration);
    this.emit("decorationChange", { type: "add", decoration, id });
    return id;
  }

  removeDecoration(id: string): void {
    useEditorDecorationsStore.getState().removeDecoration(id);
    this.emit("decorationChange", { type: "remove", id });
  }

  updateDecoration(id: string, decoration: Partial<Decoration>): void {
    useEditorDecorationsStore.getState().updateDecoration(id, decoration);
    this.emit("decorationChange", { type: "update", id, decoration });
  }

  clearDecorations(): void {
    useEditorDecorationsStore.getState().clearDecorations();
    this.emit("decorationChange", { type: "clear" });
  }

  // Line operations
  getLines(): string[] {
    return useEditorLinesStore.getState().lines;
  }

  getLine(lineNumber: number): string | undefined {
    return this.getLines()[lineNumber];
  }

  getLineCount(): number {
    return this.getLines().length;
  }

  // History operations (TODO: Implement when history store is ready)
  undo(): void {
    console.warn("Undo not yet implemented");
  }

  redo(): void {
    console.warn("Redo not yet implemented");
  }

  canUndo(): boolean {
    return false;
  }

  canRedo(): boolean {
    return false;
  }

  // Settings
  getSettings(): EditorSettings {
    const { fontSize, tabSize, lineNumbers, wordWrap } = useEditorSettingsStore.getState();
    return {
      fontSize,
      tabSize,
      lineNumbers,
      wordWrap,
      theme: "default", // TODO: Implement theme support
    };
  }

  updateSettings(settings: Partial<EditorSettings>): void {
    const store = useEditorSettingsStore.getState();

    if (settings.fontSize !== undefined) {
      store.setFontSize(settings.fontSize);
    }
    if (settings.tabSize !== undefined) {
      store.setTabSize(settings.tabSize);
    }
    if (settings.lineNumbers !== undefined) {
      store.setLineNumbers(settings.lineNumbers);
    }
    if (settings.wordWrap !== undefined) {
      store.setWordWrap(settings.wordWrap);
    }

    this.emit("settingsChange", settings);
  }

  // Events
  on(event: EditorEvent, handler: EventHandler): () => void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.add(handler);
    }

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  off(event: EditorEvent, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: EditorEvent, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  private offsetToPosition(offset: number): Position {
    const content = this.getContent();
    const lines = content.split("\n");
    let currentOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + (i < lines.length - 1 ? 1 : 0);
      if (currentOffset + lineLength >= offset) {
        return {
          line: i,
          column: offset - currentOffset,
          offset,
        };
      }
      currentOffset += lineLength;
    }

    return {
      line: lines.length - 1,
      column: lines[lines.length - 1].length,
      offset: content.length,
    };
  }
}

// Global editor API instance
export const editorAPI = new EditorAPIImpl();
