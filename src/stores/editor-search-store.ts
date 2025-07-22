import { create, type ExtractState } from "zustand";
import { combine } from "zustand/middleware";

// Types
type SearchMatch = {
  start: number;
  end: number;
};

const initialState = {
  // Search State
  searchQuery: "",
  searchMatches: [] as SearchMatch[],
  currentMatchIndex: -1,
};

export const useEditorSearchStore = create(
  combine(initialState, (set, get) => ({
    // Search Actions
    setSearchQuery: (query: string) => set({ searchQuery: query }),
    setSearchMatches: (matches: SearchMatch[]) => set({ searchMatches: matches }),
    setCurrentMatchIndex: (index: number) => set({ currentMatchIndex: index }),

    clearSearch: () =>
      set({
        searchQuery: "",
        searchMatches: [],
        currentMatchIndex: -1,
      }),

    nextSearchMatch: () => {
      const { searchMatches, currentMatchIndex } = get();
      if (searchMatches.length > 0) {
        const nextIndex = (currentMatchIndex + 1) % searchMatches.length;
        set({ currentMatchIndex: nextIndex });
      }
    },

    prevSearchMatch: () => {
      const { searchMatches, currentMatchIndex } = get();
      if (searchMatches.length > 0) {
        const prevIndex = currentMatchIndex <= 0 ? searchMatches.length - 1 : currentMatchIndex - 1;
        set({ currentMatchIndex: prevIndex });
      }
    },

    // Aliases for compatibility
    searchNext: () => {
      const state = get();
      if (state.searchMatches.length > 0) {
        const nextIndex = (state.currentMatchIndex + 1) % state.searchMatches.length;
        set({ currentMatchIndex: nextIndex });
      }
    },
    searchPrevious: () => {
      const state = get();
      if (state.searchMatches.length > 0) {
        const prevIndex =
          state.currentMatchIndex <= 0
            ? state.searchMatches.length - 1
            : state.currentMatchIndex - 1;
        set({ currentMatchIndex: prevIndex });
      }
    },
  })),
);

export type EditorSearchState = ExtractState<typeof useEditorSearchStore>;
