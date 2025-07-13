import { create } from "zustand";
import type { FileEntry } from "../types/app";

interface MentionState {
  active: boolean;
  position: { top: number; left: number };
  search: string;
  startIndex: number;
  selectedIndex: number;
}

interface AIChatStore {
  // Input state
  input: string;
  isTyping: boolean;
  streamingMessageId: string | null;
  selectedBufferIds: Set<string>;
  isContextDropdownOpen: boolean;
  isSendAnimating: boolean;
  hasApiKey: boolean;

  // Mention state
  mentionState: MentionState;

  // Input actions
  setInput: (input: string) => void;
  setIsTyping: (isTyping: boolean) => void;
  setStreamingMessageId: (id: string | null) => void;
  toggleBufferSelection: (bufferId: string) => void;
  setIsContextDropdownOpen: (isOpen: boolean) => void;
  setIsSendAnimating: (isAnimating: boolean) => void;
  setHasApiKey: (hasKey: boolean) => void;
  clearSelectedBuffers: () => void;
  setSelectedBufferIds: (ids: Set<string>) => void;

  // Mention actions
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

export const useAIChatStore = create<AIChatStore>((set, get) => ({
  // Input state
  input: "",
  isTyping: false,
  streamingMessageId: null,
  selectedBufferIds: new Set<string>(),
  isContextDropdownOpen: false,
  isSendAnimating: false,
  hasApiKey: false,

  // Mention state
  mentionState: initialMentionState,

  // Input actions
  setInput: input => set({ input }),
  setIsTyping: isTyping => set({ isTyping }),
  setStreamingMessageId: streamingMessageId => set({ streamingMessageId }),
  toggleBufferSelection: bufferId =>
    set(state => {
      const newSet = new Set(state.selectedBufferIds);
      if (newSet.has(bufferId)) {
        newSet.delete(bufferId);
      } else {
        newSet.add(bufferId);
      }
      return { selectedBufferIds: newSet };
    }),
  setIsContextDropdownOpen: isContextDropdownOpen => set({ isContextDropdownOpen }),
  setIsSendAnimating: isSendAnimating => set({ isSendAnimating }),
  setHasApiKey: hasApiKey => set({ hasApiKey }),
  clearSelectedBuffers: () => set({ selectedBufferIds: new Set<string>() }),
  setSelectedBufferIds: selectedBufferIds => set({ selectedBufferIds }),

  // Mention actions
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

// Export with old name for backward compatibility
export const useAIChatMentionStore = useAIChatStore;
