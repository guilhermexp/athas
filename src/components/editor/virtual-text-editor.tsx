import { useCallback, useEffect, useRef, useState } from "react";
import { basicEditingExtension } from "../../extensions/basic-editing-extension";
import { editorAPI } from "../../extensions/editor-api";
import { extensionManager } from "../../extensions/extension-manager";
import {
  setSyntaxHighlightingFilePath,
  syntaxHighlightingExtension,
} from "../../extensions/syntax-highlighting-extension";
import { useEditorContentStore } from "../../stores/editor-content-store";
import { useEditorInstanceStore } from "../../stores/editor-instance-store";
import { useEditorSettingsStore } from "../../stores/editor-settings-store";
import type { Position, Range } from "../../types/editor-types";
import { EditorContentNew } from "./editor-content-new";

export function VirtualTextEditor() {
  const { tabSize } = useEditorSettingsStore();
  const { bufferContent, setBufferContent } = useEditorContentStore();
  const { onChange, disabled, filePath, editorRef } = useEditorInstanceStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const localRef = useRef<HTMLDivElement>(null);

  const [cursorPosition, setCursorPosition] = useState<Position>({
    line: 0,
    column: 0,
    offset: 0,
  });
  const [selection, setSelection] = useState<Range | null>(null);
  const [desiredColumn, setDesiredColumn] = useState<number | null>(null);

  // Use the ref from the store or fallback to local ref
  const containerRef = editorRef || localRef;

  // Calculate cursor position from offset
  const calculateCursorPosition = useCallback((offset: number, text: string): Position => {
    const lines = text.split("\n");
    let currentOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + (i < lines.length - 1 ? 1 : 0); // +1 for newline
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
      offset: text.length,
    };
  }, []);

  // Measure text width using a hidden span

  // Calculate offset from line and column
  const calculateOffsetFromPosition = useCallback(
    (line: number, column: number, text: string): number => {
      const lines = text.split("\n");
      let offset = 0;

      for (let i = 0; i < line && i < lines.length; i++) {
        offset += lines[i].length + 1; // +1 for newline
      }

      if (line < lines.length) {
        offset += Math.min(column, lines[line].length);
      }

      return offset;
    },
    [],
  );

  // Handle textarea input
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setBufferContent(newValue);
    onChange?.(newValue);

    // Update selection after change
    setTimeout(() => handleSelectionChange(), 0);
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const { selectionStart } = textarea;
    const currentPosition = calculateCursorPosition(selectionStart, bufferContent);

    // Check for extension keybindings first
    const key = [
      e.ctrlKey && "Ctrl",
      e.metaKey && "Cmd",
      e.altKey && "Alt",
      e.shiftKey && "Shift",
      e.key,
    ]
      .filter(Boolean)
      .join("+");

    const command = extensionManager.getCommandForKeybinding(key);
    if (command && (!command.when || command.when())) {
      e.preventDefault();
      command.execute({ editor: editorAPI });
      return;
    }

    // Default Tab handling (will be overridden by extension if loaded)
    if (e.key === "Tab" && !command) {
      e.preventDefault();
      const { selectionEnd } = textarea;
      const spaces = " ".repeat(tabSize);

      const newValue =
        bufferContent.substring(0, selectionStart) + spaces + bufferContent.substring(selectionEnd);

      setBufferContent(newValue);
      onChange?.(newValue);

      // Update cursor position after tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + tabSize;
        handleSelectionChange();
      }, 0);

      // Reset desired column
      setDesiredColumn(null);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();

      const lines = bufferContent.split("\n");
      const targetLine = e.key === "ArrowUp" ? currentPosition.line - 1 : currentPosition.line + 1;

      // Check bounds
      if (targetLine < 0 || targetLine >= lines.length) {
        return;
      }

      // Use desired column if set, otherwise use current column
      const targetColumn = desiredColumn !== null ? desiredColumn : currentPosition.column;

      // Ensure column doesn't exceed line length
      const actualColumn = Math.min(targetColumn, lines[targetLine].length);

      // Calculate new offset
      const newOffset = calculateOffsetFromPosition(targetLine, actualColumn, bufferContent);

      // Update textarea selection
      textarea.selectionStart = textarea.selectionEnd = newOffset;

      // Trigger selection change to update visual cursor
      setTimeout(() => {
        handleSelectionChange();
      }, 0);

      // Maintain desired column for subsequent arrow key presses
      if (desiredColumn === null) {
        setDesiredColumn(currentPosition.column);
      }
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      // Reset desired column on horizontal movement
      setDesiredColumn(null);
    } else {
      // Reset desired column on any other key
      setDesiredColumn(null);
    }
  };

  // Handle cursor position changes
  const handleSelectionChange = () => {
    if (!textareaRef.current) return;

    const { selectionStart, selectionEnd } = textareaRef.current;
    const newCursorPosition = calculateCursorPosition(selectionStart, bufferContent);
    setCursorPosition(newCursorPosition);

    if (selectionStart !== selectionEnd) {
      setSelection({
        start: calculateCursorPosition(selectionStart, bufferContent),
        end: calculateCursorPosition(selectionEnd, bufferContent),
      });
    } else {
      setSelection(null);
    }
  };

  // Focus textarea on mount and setup extension system
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
      handleSelectionChange();
    }

    // Initialize extension manager with editor API
    extensionManager.setEditor(editorAPI);

    // Load core extensions only once per app lifecycle
    const loadExtensions = async () => {
      try {
        // Initialize extension manager if not already done
        if (!extensionManager.isInitialized()) {
          extensionManager.initialize();

          // Load core extensions
          await extensionManager.loadExtension(syntaxHighlightingExtension);
          await extensionManager.loadExtension(basicEditingExtension);
        }

        // Set file path for syntax highlighting
        if (filePath) {
          setSyntaxHighlightingFilePath(filePath);
        }
      } catch (error) {
        console.error("Failed to load extensions:", error);
      }
    };

    loadExtensions();

    // No cleanup needed - extensions are managed globally
  }, []); // Remove filePath dependency to prevent re-running

  // Update syntax highlighting when file path changes
  useEffect(() => {
    if (filePath) {
      setSyntaxHighlightingFilePath(filePath);
    }
  }, [filePath]);

  // Update editor API when cursor/selection changes
  useEffect(() => {
    editorAPI.updateCursorAndSelection(cursorPosition, selection);
  }, [cursorPosition, selection]);

  // Emit content change events to extensions
  useEffect(() => {
    // Emit the event directly without going through setContent to avoid loops
    const eventData = { content: bufferContent, changes: [] };
    editorAPI.on("contentChange", () => {}); // Ensure event handler exists
    // Use private emit method
    (editorAPI as any).emit("contentChange", eventData);
  }, [bufferContent]);

  // Handlers for line-based rendering interactions
  const handleLineBasedClick = useCallback(
    (position: Position) => {
      if (!textareaRef.current) return;

      // Update textarea selection
      textareaRef.current.selectionStart = textareaRef.current.selectionEnd = position.offset;

      // Focus textarea
      textareaRef.current.focus();

      // Update cursor position
      handleSelectionChange();
    },
    [handleSelectionChange],
  );

  const handleLineBasedSelection = useCallback(
    (start: Position, end: Position) => {
      if (!textareaRef.current) return;

      // Update textarea selection
      const startOffset = Math.min(start.offset, end.offset);
      const endOffset = Math.max(start.offset, end.offset);

      textareaRef.current.selectionStart = startOffset;
      textareaRef.current.selectionEnd = endOffset;

      // Update visual selection
      handleSelectionChange();
    },
    [handleSelectionChange],
  );

  // Line-based rendering
  return (
    <div ref={containerRef} className="virtual-editor-container relative h-full overflow-hidden">
      {/* Hidden textarea for input */}
      <textarea
        ref={textareaRef}
        value={bufferContent}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onMouseUp={handleSelectionChange}
        disabled={disabled}
        className="absolute top-0 left-[-9999px]"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      {/* Line-based editor content */}
      <EditorContentNew
        cursorPosition={cursorPosition}
        selection={selection}
        viewportHeight={containerRef.current?.clientHeight || 600}
        filePath={filePath}
        onPositionClick={handleLineBasedClick}
        onSelectionDrag={handleLineBasedSelection}
      />
    </div>
  );
}
