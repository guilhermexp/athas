import type React from "react";
import { commands } from "./vim-commands";
import { executeExCommand } from "./vim-ex-commands";
import { motions } from "./vim-motions";
import { operators } from "./vim-operators";
import type { VimContext, VimMode, VimState } from "./vim-types";

export class VimEngine {
  private state: VimState = {
    mode: "normal",
    cursorPosition: 0,
    register: "",
    lastFindChar: "",
    lastFindDirection: "forward",
    pendingOperator: null,
    pendingCount: 0,
    commandBuffer: "",
  };

  private updateCursor: (pos: number) => void;
  private updateContent: (content: string) => void;
  private setMode: (mode: VimMode) => void;
  private showCommandLine?: (initialCommand?: string) => void;

  constructor(
    updateCursor: (pos: number) => void,
    updateContent: (content: string) => void,
    setMode: (mode: VimMode) => void,
    showCommandLine?: (initialCommand?: string) => void,
  ) {
    this.updateCursor = updateCursor;
    this.updateContent = updateContent;
    this.setMode = setMode;
    this.showCommandLine = showCommandLine;
  }

  public setState(newState: Partial<VimState>) {
    this.state = { ...this.state, ...newState };
    if (newState.mode) {
      this.setMode(newState.mode);
    }
  }

  public getState(): VimState {
    return { ...this.state };
  }

  public handleKeyDown(
    e: React.KeyboardEvent<HTMLDivElement>,
    editor: HTMLDivElement,
    content: string,
  ): boolean {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editor);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      this.state.cursorPosition = preCaretRange.toString().length;
    }

    const context: VimContext = {
      textarea: editor as any,
      content,
      cursorPosition: this.state.cursorPosition,
      updateContent: this.updateContent,
      setCursorPosition: (pos: number) => {
        this.state.cursorPosition = pos;
        this.updateCursor(pos);
        requestAnimationFrame(() => {
          this.setContentEditableCursorPosition(editor, pos);
        });
      },
      state: this.state,
      setState: (state: Partial<VimState>) => this.setState(state),
      showCommandLine: this.showCommandLine,
    };

    const key = this.getKeyString(e);

    // Handle command buffer for multi-character commands
    if (this.state.mode === "normal") {
      this.state.commandBuffer += key;

      // Check for multi-character commands first
      const multiCharCommand = this.findMultiCharCommand(this.state.commandBuffer);
      if (multiCharCommand) {
        e.preventDefault();
        this.executeCommand(multiCharCommand, context);
        this.state.commandBuffer = "";
        return true;
      }

      // Check if we're building a multi-character command
      if (this.isPartialCommand(this.state.commandBuffer)) {
        e.preventDefault();
        return true;
      }

      // Handle pending operators with motions
      if (this.state.pendingOperator) {
        const motion = motions.find(m => m.key === key);
        if (motion) {
          e.preventDefault();
          const startPos = this.state.cursorPosition;
          const endPos = motion.execute(context);
          this.executeOperator(this.state.pendingOperator, context, startPos, endPos);
          this.state.pendingOperator = null;
          this.state.commandBuffer = "";
          return true;
        }
      }

      // Check for operators
      const operator = operators.find(op => op.key === key);
      if (operator) {
        e.preventDefault();
        this.state.pendingOperator = key;
        this.state.commandBuffer = "";
        return true;
      }

      // Check for motions (standalone)
      const motion = motions.find(m => m.key === key);
      if (motion) {
        e.preventDefault();
        const newPos = motion.execute(context);
        context.setCursorPosition(newPos);
        this.state.commandBuffer = "";
        return true;
      }

      // Reset command buffer if no matches
      this.state.commandBuffer = "";
    }

    // Handle single character commands
    const command = this.findCommand(key, this.state.mode);
    if (command) {
      e.preventDefault();
      this.executeCommand(command, context);
      return true;
    }

    // Handle visual mode movement
    if (this.state.mode === "visual" || this.state.mode === "visual-line") {
      const motion = motions.find(m => m.key === key);
      if (motion) {
        e.preventDefault();
        const newPos = motion.execute(context);
        if (this.state.visualStart !== undefined) {
          const start = Math.min(this.state.visualStart, newPos);
          const end = Math.max(this.state.visualStart, newPos);
          this.setContentEditableSelection(editor, start, end);
        }
        return true;
      }
    }

    // Allow normal typing in insert mode
    if (this.state.mode === "insert") {
      return false;
    }

    // Prevent all other keys in normal/visual modes
    e.preventDefault();
    return true;
  }

  private getKeyString(e: React.KeyboardEvent): string {
    if (e.key === "Escape") return "Escape";
    if (e.key === "Enter") return "Enter";
    if (e.key === "Tab") return "Tab";
    if (e.key === "Backspace") return "Backspace";
    if (e.key === " ") return "Space";

    // Handle special characters
    if (e.shiftKey) {
      const shiftMap: { [key: string]: string } = {
        "1": "!",
        "2": "@",
        "3": "#",
        "4": "$",
        "5": "%",
        "6": "^",
        "7": "&",
        "8": "*",
        "9": "(",
        "0": ")",
        "-": "_",
        "=": "+",
        "[": "{",
        "]": "}",
        "\\": "|",
        ";": ":",
        "'": '"',
        ",": "<",
        ".": ">",
        "/": "?",
        "`": "~",
      };

      if (shiftMap[e.key]) {
        return shiftMap[e.key];
      }

      // Handle shifted letters
      if (e.key.length === 1 && e.key.match(/[a-z]/)) {
        return e.key.toUpperCase();
      }
    }

    return e.key;
  }

  private findCommand(key: string, mode: VimMode) {
    return commands.find(cmd => {
      if (Array.isArray(cmd.mode)) {
        return cmd.mode.includes(mode) && cmd.key === key;
      }
      return cmd.mode === mode && cmd.key === key;
    });
  }

  private findMultiCharCommand(buffer: string) {
    return commands.find(cmd => cmd.key === buffer);
  }

  private isPartialCommand(buffer: string): boolean {
    return commands.some(cmd => cmd.key.startsWith(buffer) && cmd.key.length > buffer.length);
  }

  private executeCommand(command: any, context: VimContext) {
    command.execute(context);
  }

  private executeOperator(operatorKey: string, context: VimContext, start: number, end: number) {
    const operator = operators.find(op => op.key === operatorKey);
    if (operator) {
      operator.execute(context, start, end);
    }
  }

  public executeExCommand(command: string, editor: HTMLDivElement, content: string): boolean {
    const context: VimContext = {
      textarea: editor as any,
      content,
      cursorPosition: this.state.cursorPosition,
      updateContent: this.updateContent,
      setCursorPosition: (pos: number) => {
        this.state.cursorPosition = pos;
        this.updateCursor(pos);
        requestAnimationFrame(() => {
          this.setContentEditableCursorPosition(editor, pos);
        });
      },
      state: this.state,
      setState: (state: Partial<VimState>) => this.setState(state),
      showCommandLine: this.showCommandLine,
    };

    return executeExCommand(command, context);
  }

  public toggleEnabled(): boolean {
    if (this.state.mode !== "normal") {
      this.setState({ mode: "normal" });
    }
    return true;
  }

  private setContentEditableCursorPosition(element: HTMLDivElement, position: number): void {
    const selection = window.getSelection();
    if (!selection) return;

    // Ensure position is within bounds
    const textContent = element.textContent || "";
    const clampedPosition = Math.max(0, Math.min(position, textContent.length));

    const range = document.createRange();
    const result = this.findTextNodeAtPosition(element, clampedPosition);

    if (result.node) {
      try {
        range.setStart(result.node, result.offset);
        range.setEnd(result.node, result.offset);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (error) {
        // Fallback: place cursor at end of element
        console.warn("Error setting cursor position:", error);
        this.setCursorAtEnd(element, selection);
      }
    } else {
      // Fallback: place cursor at end of element
      this.setCursorAtEnd(element, selection);
    }
  }

  private setContentEditableSelection(element: HTMLDivElement, start: number, end: number): void {
    const selection = window.getSelection();
    if (!selection) return;

    // Ensure positions are within bounds and ordered correctly
    const textContent = element.textContent || "";
    const clampedStart = Math.max(0, Math.min(start, textContent.length));
    const clampedEnd = Math.max(clampedStart, Math.min(end, textContent.length));

    const range = document.createRange();
    const startResult = this.findTextNodeAtPosition(element, clampedStart);
    const endResult = this.findTextNodeAtPosition(element, clampedEnd);

    if (startResult.node && endResult.node) {
      try {
        range.setStart(startResult.node, startResult.offset);
        range.setEnd(endResult.node, endResult.offset);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (error) {
        console.warn("Error setting selection:", error);
        // Fallback: place cursor at start position
        this.setContentEditableCursorPosition(element, clampedStart);
      }
    } else {
      // Fallback: place cursor at start position
      this.setContentEditableCursorPosition(element, clampedStart);
    }
  }

  // Optimized method to find text node at a given position
  private findTextNodeAtPosition(
    element: HTMLDivElement,
    position: number,
  ): { node: Text | null; offset: number } {
    let currentPos = 0;

    // Use a more efficient approach for traversing text nodes
    const findNodeRecursive = (node: Node): { node: Text | null; offset: number } => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textNode = node as Text;
        const textLength = textNode.textContent?.length || 0;

        if (currentPos + textLength >= position) {
          return { node: textNode, offset: position - currentPos };
        } else {
          currentPos += textLength;
          return { node: null, offset: 0 };
        }
      }

      // Handle element nodes by recursing through children
      if (node.nodeType === Node.ELEMENT_NODE) {
        for (let i = 0; i < node.childNodes.length; i++) {
          const result = findNodeRecursive(node.childNodes[i]);
          if (result.node) {
            return result;
          }
        }
      }

      return { node: null, offset: 0 };
    };

    const result = findNodeRecursive(element);
    return result.node ? result : this.findLastTextNode(element);
  }

  // Find the last text node in the element (fallback)
  private findLastTextNode(element: HTMLDivElement): { node: Text | null; offset: number } {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

    let lastNode: Text | null = null;
    let node = walker.nextNode();

    while (node) {
      lastNode = node as Text;
      node = walker.nextNode();
    }

    if (lastNode) {
      return { node: lastNode, offset: lastNode.textContent?.length || 0 };
    }

    return { node: null, offset: 0 };
  }

  // Fallback method to set cursor at end of element
  private setCursorAtEnd(element: HTMLDivElement, selection: Selection): void {
    const range = document.createRange();
    const lastTextNode = this.findLastTextNode(element);

    if (lastTextNode.node) {
      range.setStart(lastTextNode.node, lastTextNode.offset);
      range.setEnd(lastTextNode.node, lastTextNode.offset);
    } else {
      // If no text nodes, place cursor at end of element
      range.selectNodeContents(element);
      range.collapse(false);
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }
}
