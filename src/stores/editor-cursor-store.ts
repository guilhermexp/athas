import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createSelectors } from "@/utils/zustand-selectors";
import type { Position, Range } from "../types/editor-types";
import { useBufferStore } from "./buffer-store";

interface EditorCursorState {
  cursorPosition: Position;
  selection?: Range;
  desiredColumn?: number;
  actions: EditorCursorActions;
  cursorVisible: boolean;
}

interface EditorCursorActions {
  setCursorPosition: (position: Position) => void;
  setSelection: (selection?: Range) => void;
  setDesiredColumn: (column?: number) => void;
  setCursorVisibility: (visible: boolean) => void;
  getCachedPosition: (filePath: string) => Position | null;
  clearPositionCache: (filePath?: string) => void;
  restorePositionForFile: (bufferId: string) => boolean;
}

class PositionCacheManager {
  private cache = new Map<string, Position>();
  private readonly MAX_CACHE_SIZE = 50;

  set(bufferId: string, position: Position): void {
    const cachedPosition = this.cache.get(bufferId);
    if (cachedPosition && this.positionsEqual(cachedPosition, position)) {
      return;
    }

    if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(bufferId)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(bufferId, { ...position });
  }

  get(bufferId: string): Position | null {
    const cachedPosition = this.cache.get(bufferId);
    if (!cachedPosition) return null;

    return { ...cachedPosition };
  }

  clear(bufferId?: string): void {
    if (bufferId) {
      this.cache.delete(bufferId);
    } else {
      this.cache.clear();
    }
  }

  private positionsEqual(pos1: Position, pos2: Position): boolean {
    return pos1.line === pos2.line && pos1.column === pos2.column && pos1.offset === pos2.offset;
  }
}

const positionCache = new PositionCacheManager();

export const useEditorCursorStore = createSelectors(
  create<EditorCursorState>()(
    subscribeWithSelector((set, _get) => ({
      cursorPosition: { line: 0, column: 0, offset: 0 },
      cursorVisible: false,
      actions: {
        setCursorPosition: (position) => {
          const activeBufferId = useBufferStore.getState().activeBufferId;
          if (activeBufferId) {
            positionCache.set(activeBufferId, position);
          }

          set({ cursorPosition: position });
        },
        setSelection: (selection) => set({ selection }),
        setDesiredColumn: (column) => set({ desiredColumn: column }),
        setCursorVisibility: (visible) =>
          set({
            cursorVisible: visible,
          }),
        getCachedPosition: (bufferId) => {
          return positionCache.get(bufferId);
        },
        clearPositionCache: (bufferId) => {
          positionCache.clear(bufferId);
        },
        restorePositionForFile: (bufferId) => {
          const cachedPosition = positionCache.get(bufferId);

          if (cachedPosition) {
            set({ cursorPosition: cachedPosition });
            return true;
          }
          return false;
        },
      },
    })),
  ),
);
