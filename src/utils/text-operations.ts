import type { Position, Range } from "../types/editor-types";

export function offsetToPosition(text: string, offset: number): Position {
  if (offset < 0) {
    return { line: 0, column: 0, offset: 0 };
  }

  let line = 0;
  let column = 0;
  let currentOffset = 0;

  for (let i = 0; i < Math.min(offset, text.length); i++) {
    if (text[i] === "\n") {
      line++;
      column = 0;
    } else {
      column++;
    }
    currentOffset++;
  }

  return { line, column, offset: currentOffset };
}

export function positionToOffset(lines: string[], position: Position): number {
  if (position.line < 0 || position.line >= lines.length) {
    return -1;
  }

  let offset = 0;

  for (let i = 0; i < position.line; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }

  const lineLength = lines[position.line].length;
  const column = Math.min(position.column, lineLength);
  offset += column;

  return offset;
}

export function splitTextIntoLines(text: string): string[] {
  if (text === "") {
    return [""];
  }
  return text.split("\n");
}

export function joinLines(lines: string[]): string {
  return lines.join("\n");
}

export function getLineAtOffset(text: string, offset: number): number {
  const position = offsetToPosition(text, offset);
  return position.line;
}

export function getLineStartOffset(lines: string[], lineNumber: number): number {
  if (lineNumber < 0 || lineNumber >= lines.length) {
    return -1;
  }

  let offset = 0;
  for (let i = 0; i < lineNumber; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }

  return offset;
}

export function getLineEndOffset(lines: string[], lineNumber: number): number {
  const startOffset = getLineStartOffset(lines, lineNumber);
  if (startOffset === -1) {
    return -1;
  }

  return startOffset + lines[lineNumber].length;
}

export function expandRangeToFullLines(lines: string[], range: Range): Range {
  const startLine = range.start.line;
  const endLine = range.end.line;

  const expandedStart: Position = {
    line: startLine,
    column: 0,
    offset: getLineStartOffset(lines, startLine),
  };

  const expandedEnd: Position = {
    line: endLine,
    column: lines[endLine]?.length || 0,
    offset: getLineEndOffset(lines, endLine),
  };

  return { start: expandedStart, end: expandedEnd };
}

export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n|\r/g, "\n");
}

export function insertTextAtPosition(
  lines: string[],
  position: Position,
  textToInsert: string,
): { lines: string[]; newPosition: Position } {
  if (position.line < 0 || position.line >= lines.length) {
    return { lines, newPosition: position };
  }

  const line = lines[position.line];
  const column = Math.min(position.column, line.length);

  const normalizedText = normalizeLineEndings(textToInsert);
  const insertLines = splitTextIntoLines(normalizedText);

  if (insertLines.length === 1) {
    const newLine = line.slice(0, column) + insertLines[0] + line.slice(column);
    const newLines = [...lines];
    newLines[position.line] = newLine;

    const newPosition: Position = {
      line: position.line,
      column: column + insertLines[0].length,
      offset: position.offset + insertLines[0].length,
    };

    return { lines: newLines, newPosition };
  }

  const firstLine = line.slice(0, column) + insertLines[0];
  const lastLine = insertLines[insertLines.length - 1] + line.slice(column);
  const middleLines = insertLines.slice(1, -1);

  const newLines = [
    ...lines.slice(0, position.line),
    firstLine,
    ...middleLines,
    lastLine,
    ...lines.slice(position.line + 1),
  ];

  const newPosition: Position = {
    line: position.line + insertLines.length - 1,
    column: insertLines[insertLines.length - 1].length,
    offset: position.offset + normalizedText.length,
  };

  return { lines: newLines, newPosition };
}

export function deleteTextInRange(
  lines: string[],
  range: Range,
): { lines: string[]; newPosition: Position } {
  const startLine = Math.max(0, Math.min(range.start.line, lines.length - 1));
  const endLine = Math.max(0, Math.min(range.end.line, lines.length - 1));

  const startColumn = Math.max(0, Math.min(range.start.column, lines[startLine].length));
  const endColumn = Math.max(0, Math.min(range.end.column, lines[endLine].length));

  if (startLine === endLine) {
    const line = lines[startLine];
    const newLine = line.slice(0, startColumn) + line.slice(endColumn);
    const newLines = [...lines];
    newLines[startLine] = newLine;

    const newPosition: Position = {
      line: startLine,
      column: startColumn,
      offset: getLineStartOffset(newLines, startLine) + startColumn,
    };

    return { lines: newLines, newPosition };
  }

  const firstLine = lines[startLine].slice(0, startColumn);
  const lastLine = lines[endLine].slice(endColumn);
  const combinedLine = firstLine + lastLine;

  const newLines = [...lines.slice(0, startLine), combinedLine, ...lines.slice(endLine + 1)];

  const newPosition: Position = {
    line: startLine,
    column: startColumn,
    offset: getLineStartOffset(newLines, startLine) + startColumn,
  };

  return { lines: newLines, newPosition };
}

export function measureText(text: string, font: string, canvas?: HTMLCanvasElement): number {
  const measureCanvas = canvas || document.createElement("canvas");
  const context = measureCanvas.getContext("2d");
  if (!context) {
    return text.length * 8; // Fallback approximation
  }

  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width;
}

export function getCharacterWidth(font: string, canvas?: HTMLCanvasElement): number {
  return measureText("M", font, canvas);
}

export function isRangeEmpty(range: Range): boolean {
  return range.start.line === range.end.line && range.start.column === range.end.column;
}

export function comparePositions(a: Position, b: Position): number {
  if (a.line !== b.line) {
    return a.line - b.line;
  }
  return a.column - b.column;
}

export function isPositionInRange(position: Position, range: Range): boolean {
  const startComp = comparePositions(position, range.start);
  const endComp = comparePositions(position, range.end);
  return startComp >= 0 && endComp <= 0;
}
