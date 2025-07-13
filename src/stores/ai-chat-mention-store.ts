import { create } from "zustand";
import type { FileEntry } from "../types/app";

interface MentionState {
  active: boolean;
  position: { top: number; left: number };
  search: string;
  startIndex: number;
  selectedIndex: number;
}

interface AIchatMentionStore {
  // Mention state
  mentionState: MentionState;

  // Actions
  showMention: (
    position: { top: number; left: number },
    search: string,
    startIndex: number,
  ) => void;
  hideMention: () => void;
  updateSearch: (search: string) => void;
  updatePosition: (position: { top: number; left: number }) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  setSelectedIndex: (index: number) => void;

  // Filtered files based on current search
  getFilteredFiles: (allFiles: FileEntry[]) => FileEntry[];
}

const initialMentionState: MentionState = {
  active: false,
  position: { top: 0, left: 0 },
  search: "",
  startIndex: 0,
  selectedIndex: 0,
};

export const useAIChatMentionStore = create<AIchatMentionStore>((set, get) => ({
  mentionState: initialMentionState,

  showMention: (position, search, startIndex) =>
    set({
      mentionState: {
        active: true,
        position,
        search,
        startIndex,
        selectedIndex: 0,
      },
    }),

  hideMention: () =>
    set({
      mentionState: initialMentionState,
    }),

  updateSearch: search =>
    set(state => ({
      mentionState: {
        ...state.mentionState,
        search,
        selectedIndex: 0, // Reset selection when search changes
      },
    })),

  updatePosition: position =>
    set(state => ({
      mentionState: {
        ...state.mentionState,
        position,
      },
    })),

  selectNext: () =>
    set(state => ({
      mentionState: {
        ...state.mentionState,
        selectedIndex: Math.min(state.mentionState.selectedIndex + 1, 4), // Max 5 items (0-4)
      },
    })),

  selectPrevious: () =>
    set(state => ({
      mentionState: {
        ...state.mentionState,
        selectedIndex: Math.max(state.mentionState.selectedIndex - 1, 0),
      },
    })),

  setSelectedIndex: index =>
    set(state => ({
      mentionState: {
        ...state.mentionState,
        selectedIndex: index,
      },
    })),

  getFilteredFiles: allFiles => {
    const { search } = get().mentionState;
    const query = search.toLowerCase();

    if (!query) return allFiles.filter(file => !file.isDir).slice(0, 5);

    const scored = allFiles
      .filter(file => !file.isDir)
      .map(file => {
        const name = file.name.toLowerCase();
        const path = file.path.toLowerCase();

        // Score based on match quality
        let score = 0;
        if (name === query) score = 100;
        else if (name.startsWith(query)) score = 80;
        else if (name.includes(query)) score = 60;
        else if (path.includes(query)) score = 40;
        else return null;

        return { file, score };
      })
      .filter(Boolean) as { file: FileEntry; score: number }[];

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ file }) => file);
  },
}));
