import type { EditOperation } from "../types/editor-types";

export class HistoryManager {
  private undoStack: EditOperation[] = [];
  private redoStack: EditOperation[] = [];
  private maxStackSize = 1000;
  private isPerformingUndoRedo = false;

  push(operation: EditOperation): void {
    if (this.isPerformingUndoRedo) {
      return;
    }

    this.undoStack.push(operation);

    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    this.redoStack = [];
  }

  undo(): EditOperation | null {
    if (!this.canUndo()) {
      return null;
    }

    const operation = this.undoStack.pop()!;
    this.isPerformingUndoRedo = true;

    try {
      this.redoStack.push(operation);
      return operation;
    } finally {
      this.isPerformingUndoRedo = false;
    }
  }

  redo(): EditOperation | null {
    if (!this.canRedo()) {
      return null;
    }

    const operation = this.redoStack.pop()!;
    this.isPerformingUndoRedo = true;

    try {
      this.undoStack.push(operation);
      return operation;
    } finally {
      this.isPerformingUndoRedo = false;
    }
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  setMaxStackSize(size: number): void {
    this.maxStackSize = Math.max(1, size);

    while (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
  }

  isInUndoRedoOperation(): boolean {
    return this.isPerformingUndoRedo;
  }
}
