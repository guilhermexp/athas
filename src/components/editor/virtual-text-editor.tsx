import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorDecorations } from "../../hooks/use-editor-decorations";
import { useEditorContentStore } from "../../stores/editor-content-store";
import { useEditorInstanceStore } from "../../stores/editor-instance-store";
import { useEditorSettingsStore } from "../../stores/editor-settings-store";
import { cn } from "../../utils/cn";
import "../../styles/editor-cursor.css";

interface CursorPosition {
  line: number;
  column: number;
  offset: number;
}

interface Selection {
  start: CursorPosition;
  end: CursorPosition;
}

export function VirtualTextEditor() {
  const { fontSize, tabSize, wordWrap } = useEditorSettingsStore();
  const { bufferContent, setBufferContent } = useEditorContentStore();
  const { onChange, disabled, placeholder, filePath, editorRef } = useEditorInstanceStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLSpanElement>(null);
  const localRef = useRef<HTMLDivElement>(null);

  const { tokens, fetchTokens, clearTokens } = useEditorDecorations();

  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    line: 0,
    column: 0,
    offset: 0,
  });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [cursorPixelPosition, setCursorPixelPosition] = useState({ x: 0, y: 0 });
  const [desiredColumn, setDesiredColumn] = useState<number | null>(null);

  // Use the ref from the store or fallback to local ref
  const containerRef = editorRef || localRef;

  // Clear tokens when file path changes
  useEffect(() => {
    clearTokens();
  }, [filePath, clearTokens]);

  // Fetch tokens when content or file changes
  useEffect(() => {
    if (filePath) {
      fetchTokens(bufferContent, filePath);
    }
  }, [bufferContent, filePath, fetchTokens]);

  // Calculate cursor position from offset
  const calculateCursorPosition = useCallback((offset: number, text: string): CursorPosition => {
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
  const measureText = useCallback((text: string): number => {
    if (!measurementRef.current) return 0;
    // Use innerHTML with nbsp to preserve spaces
    const htmlText = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/ /g, "&nbsp;");
    measurementRef.current.innerHTML = htmlText;
    return measurementRef.current.getBoundingClientRect().width;
  }, []);

  // Calculate pixel position for cursor
  const calculateCursorPixelPosition = useCallback(
    (position: CursorPosition) => {
      const lines = bufferContent.split("\n");
      const lineHeight = fontSize * 1.4;

      // Calculate Y position
      const y = position.line * lineHeight + 8; // 8px padding

      // Calculate X position
      const currentLine = lines[position.line] || "";
      const textBeforeCursor = currentLine.substring(0, position.column);
      const x = measureText(textBeforeCursor) + 8; // 8px padding

      return { x, y };
    },
    [bufferContent, fontSize, measureText],
  );

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

    if (e.key === "Tab") {
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

  // Update cursor pixel position when cursor position changes
  useEffect(() => {
    const pixelPos = calculateCursorPixelPosition(cursorPosition);
    setCursorPixelPosition(pixelPos);
  }, [cursorPosition, calculateCursorPixelPosition]);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
      handleSelectionChange();
    }
  }, []);

  // Handle click on display to position cursor
  const handleDisplayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!displayRef.current || !textareaRef.current) return;

    const rect = displayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Account for padding
    const adjustedX = x - 8;
    const adjustedY = y - 8;

    // Calculate line from Y position
    const lineHeight = fontSize * 1.4;
    const clickedLine = Math.floor(adjustedY / lineHeight);

    const lines = bufferContent.split("\n");
    const actualLine = Math.min(Math.max(0, clickedLine), lines.length - 1);

    // Calculate column from X position by measuring text
    const lineText = lines[actualLine] || "";
    let column = 0;

    // Binary search for the closest character position
    for (let i = 0; i <= lineText.length; i++) {
      const textToMeasure = lineText.substring(0, i);
      const width = measureText(textToMeasure);

      if (width > adjustedX) {
        // Check if we're closer to current or previous character
        const prevWidth = i > 0 ? measureText(lineText.substring(0, i - 1)) : 0;
        const currentDiff = Math.abs(width - adjustedX);
        const prevDiff = Math.abs(prevWidth - adjustedX);

        column = prevDiff < currentDiff ? i - 1 : i;
        break;
      }

      column = i;
    }

    // Calculate offset and update textarea selection
    const offset = calculateOffsetFromPosition(actualLine, column, bufferContent);
    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = offset;

    // Focus and update visual cursor
    textareaRef.current.focus();
    handleSelectionChange();

    // Reset desired column
    setDesiredColumn(null);
  };

  // Render highlighted content
  const renderHighlightedContent = () => {
    const lines = bufferContent.split("\n");

    return lines.map((line, lineIndex) => {
      const lineStart = lines.slice(0, lineIndex).reduce((acc, l) => acc + l.length + 1, 0);
      const lineEnd = lineStart + line.length;

      // Find tokens for this line
      const lineTokens = tokens.filter(token => token.start < lineEnd && token.end > lineStart);

      // Build line content with highlighting
      const lineElements: React.ReactNode[] = [];
      let lastEnd = 0;

      lineTokens.forEach(token => {
        const tokenStart = Math.max(0, token.start - lineStart);
        const tokenEnd = Math.min(line.length, token.end - lineStart);

        // Add plain text before token
        if (tokenStart > lastEnd) {
          lineElements.push(
            <span key={`plain-${lineIndex}-${lastEnd}`}>
              {line.substring(lastEnd, tokenStart)}
            </span>,
          );
        }

        // Add highlighted token
        lineElements.push(
          <span key={`token-${lineIndex}-${token.start}`} className={token.class_name}>
            {line.substring(tokenStart, tokenEnd)}
          </span>,
        );

        lastEnd = tokenEnd;
      });

      // Add remaining text
      if (lastEnd < line.length) {
        lineElements.push(
          <span key={`plain-${lineIndex}-${lastEnd}`}>{line.substring(lastEnd)}</span>,
        );
      }

      return (
        <div key={lineIndex} className="code-line" style={{ height: `${fontSize * 1.4}px` }}>
          {lineElements.length > 0 ? lineElements : <span>&nbsp;</span>}
        </div>
      );
    });
  };

  // Render selection overlay
  const renderSelection = () => {
    if (!selection) return null;

    const lines = bufferContent.split("\n");
    const lineHeight = fontSize * 1.4;
    const selectionElements: React.ReactNode[] = [];

    for (let i = selection.start.line; i <= selection.end.line; i++) {
      const line = lines[i] || "";
      const y = i * lineHeight + 8;

      let startX = 8;
      let width = 0;

      if (i === selection.start.line && i === selection.end.line) {
        // Single line selection
        const beforeText = line.substring(0, selection.start.column);
        const selectedText = line.substring(selection.start.column, selection.end.column);
        startX = measureText(beforeText) + 8;
        width = measureText(selectedText);
      } else if (i === selection.start.line) {
        // First line of multi-line selection
        const beforeText = line.substring(0, selection.start.column);
        const selectedText = line.substring(selection.start.column);
        startX = measureText(beforeText) + 8;
        width = measureText(selectedText);
      } else if (i === selection.end.line) {
        // Last line of multi-line selection
        const selectedText = line.substring(0, selection.end.column);
        width = measureText(selectedText);
      } else {
        // Middle lines of multi-line selection
        width = measureText(line);
      }

      selectionElements.push(
        <div
          key={`selection-${i}`}
          className="selection-overlay"
          style={{
            position: "absolute",
            left: `${startX}px`,
            top: `${y}px`,
            width: `${width}px`,
            height: `${lineHeight}px`,
            backgroundColor: "rgba(0, 120, 215, 0.3)",
          }}
        />,
      );
    }

    return selectionElements;
  };

  const getEditorStyles = {
    fontSize: `${fontSize}px`,
    lineHeight: `${fontSize * 1.4}px`,
    fontFamily: "monospace",
  };

  return (
    <div ref={containerRef} className="virtual-editor-container relative h-full overflow-auto">
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

      {/* Measurement helper */}
      <span
        ref={measurementRef}
        className="invisible absolute"
        style={{
          ...getEditorStyles,
          whiteSpace: wordWrap ? "pre-wrap" : "pre",
        }}
      />

      {/* Display layer */}
      <div
        ref={displayRef}
        className={cn("relative", "font-mono", "bg-transparent text-[var(--color-text)]")}
        style={{
          ...getEditorStyles,
          padding: "8px 8px 50vh 8px",
          whiteSpace: wordWrap ? "pre-wrap" : "pre",
          wordBreak: wordWrap ? "break-word" : "normal",
          overflowWrap: wordWrap ? "break-word" : "normal",
          cursor: "text",
        }}
        onClick={handleDisplayClick}
      >
        {/* Selection overlay */}
        {renderSelection()}

        {/* Highlighted content */}
        {renderHighlightedContent()}

        {/* Cursor */}
        {!selection && (
          <div
            className="cursor"
            style={{
              position: "absolute",
              left: `${cursorPixelPosition.x}px`,
              top: `${cursorPixelPosition.y}px`,
              width: "2px",
              height: `${fontSize * 1.4}px`,
              backgroundColor: "var(--color-text)",
            }}
          />
        )}

        {/* Placeholder */}
        {!bufferContent && placeholder && (
          <div className="pointer-events-none absolute inset-0 p-2 opacity-50">{placeholder}</div>
        )}
      </div>
    </div>
  );
}
