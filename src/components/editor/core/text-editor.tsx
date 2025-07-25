import { useCallback, useEffect, useRef } from "react";
import { EDITOR_CONSTANTS } from "../../../constants/editor-constants";
import { basicEditingExtension } from "../../../extensions/basic-editing-extension";
import { editorAPI } from "../../../extensions/editor-api";
import { extensionManager } from "../../../extensions/extension-manager";
import {
  setSyntaxHighlightingFilePath,
  syntaxHighlightingExtension,
} from "../../../extensions/syntax-highlighting-extension";
import { useEditorContentStore } from "../../../stores/editor-content-store";
import { useEditorCursorStore } from "../../../stores/editor-cursor-store";
import { useEditorDebugStore } from "../../../stores/editor-debug-store";
import { useEditorInstanceStore } from "../../../stores/editor-instance-store";
import { useEditorSettingsStore } from "../../../stores/editor-settings-store";
import type { Position } from "../../../types/editor-types";
import {
  calculateCursorPosition,
  calculateOffsetFromPosition,
} from "../../../utils/editor-position";
import { LineBasedEditor } from "./line-based-editor";

export function TextEditor() {
  const { tabSize } = useEditorSettingsStore();
  const { lines, getContent, setContent } = useEditorContentStore();
  const { onChange, disabled, filePath, editorRef } = useEditorInstanceStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const localRef = useRef<HTMLDivElement>(null);

  const { setCursorPosition, setSelection, setDesiredColumn } = useEditorCursorStore.use.actions();
  const currentDesiredColumn = useEditorCursorStore((state) => state.desiredColumn);
  const { addKeystroke, addTextChange, addCursorPosition } = useEditorDebugStore();

  // Use the ref from the store or fallback to local ref
  const containerRef = editorRef || localRef;

  // Get content as string when needed
  const content = getContent();

  // Handle textarea input
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const oldValue = getContent();
    const newValue = e.target.value;
    const cursorBefore = useEditorCursorStore.getState().cursorPosition;

    setContent(newValue);
    onChange?.(newValue);

    // Update selection after change
    setTimeout(() => {
      handleSelectionChange();
      const cursorAfter = useEditorCursorStore.getState().cursorPosition;

      // Track text change for debug
      addTextChange({
        oldValue,
        newValue,
        cursorBefore,
        cursorAfter,
      });
    }, 0);
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const { selectionStart } = textarea;
    const currentPosition = calculateCursorPosition(selectionStart, lines);

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

    // Track keystroke for debug
    addKeystroke(key);

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
      const currentContent = getContent();
      const newValue =
        currentContent.substring(0, selectionStart) +
        spaces +
        currentContent.substring(selectionEnd);

      setContent(newValue);
      onChange?.(newValue);

      // Update cursor position after tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + tabSize;
        handleSelectionChange();
      }, 0);

      // Reset desired column
      setDesiredColumn(undefined);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();

      const targetLine = e.key === "ArrowUp" ? currentPosition.line - 1 : currentPosition.line + 1;

      // Check bounds
      if (targetLine < 0 || targetLine >= lines.length) {
        return;
      }

      // Use desired column if set, otherwise use current column
      const targetColumn = currentDesiredColumn ?? currentPosition.column;

      // Ensure column doesn't exceed line length
      const actualColumn = Math.min(targetColumn, lines[targetLine].length);

      // Calculate new offset
      const newOffset = calculateOffsetFromPosition(targetLine, actualColumn, lines);

      // Update textarea selection
      textarea.selectionStart = textarea.selectionEnd = newOffset;

      // Trigger selection change to update visual cursor
      setTimeout(() => {
        handleSelectionChange();
      }, 0);

      // Maintain desired column for subsequent arrow key presses
      if (currentDesiredColumn === undefined) {
        setDesiredColumn(currentPosition.column);
      }
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      // Handle horizontal movement with boundary checking
      const isLeft = e.key === "ArrowLeft";

      // Check if we're at a boundary
      if (
        (isLeft && currentPosition.column === 0) ||
        (!isLeft && currentPosition.column === lines[currentPosition.line].length)
      ) {
        // Prevent default to stop cursor from moving to next/prev line
        e.preventDefault();
        return;
      }

      // Reset desired column on horizontal movement
      setDesiredColumn(undefined);
    } else {
      // Reset desired column on any other key
      setDesiredColumn(undefined);
    }
  };

  // Handle cursor position changes
  const handleSelectionChange = () => {
    if (!textareaRef.current) return;

    const { selectionStart, selectionEnd } = textareaRef.current;
    const newCursorPosition = calculateCursorPosition(selectionStart, lines);

    setCursorPosition(newCursorPosition);

    // Track cursor position for debug
    addCursorPosition(newCursorPosition);

    if (selectionStart !== selectionEnd) {
      setSelection({
        start: calculateCursorPosition(selectionStart, lines),
        end: calculateCursorPosition(selectionEnd, lines),
      });
    } else {
      setSelection(undefined);
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

  // Update editor API by subscribing to cursor store changes
  useEffect(() => {
    const unsubscribe = useEditorCursorStore.subscribe(
      (state) => ({ cursor: state.cursorPosition, selection: state.selection }),
      ({ cursor, selection }) => {
        editorAPI.updateCursorAndSelection(cursor, selection ?? null);
      },
    );
    return unsubscribe;
  }, []);

  // Emit content change events to extensions
  useEffect(() => {
    // Emit the event directly without going through setContent to avoid loops
    const eventData = { content, changes: [] };
    editorAPI.emitEvent("contentChange", eventData);
  }, [content]);

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
        value={content}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onMouseUp={handleSelectionChange}
        disabled={disabled}
        className="absolute top-0"
        style={{ left: `${EDITOR_CONSTANTS.HIDDEN_TEXTAREA_POSITION}px` }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      {/* Line-based editor content */}
      <LineBasedEditor
        viewportHeight={
          containerRef.current?.clientHeight || EDITOR_CONSTANTS.DEFAULT_VIEWPORT_HEIGHT
        }
        filePath={filePath}
        onPositionClick={handleLineBasedClick}
        onSelectionDrag={handleLineBasedSelection}
      />
    </div>
  );
}
