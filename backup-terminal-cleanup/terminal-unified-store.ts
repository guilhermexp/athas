import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface TerminalSession {
  id: string;
  name: string;
  currentDirectory?: string;
  shell?: string;
  isActive: boolean;
  isPinned: boolean;
  splitMode?: boolean;
  splitWithId?: string;
  connectionId?: string;
  selection?: string;
  title?: string;
  createdAt: Date;
  lastActivity: Date;
}

interface UnifiedTerminalState {
  // Sessions
  sessions: Map<string, TerminalSession>;
  activeSessionId: string | null;

  // UI State
  isSearchVisible: boolean;
  searchQuery: string;
  zoomLevel: number;

  // Actions
  createSession: (name: string, currentDirectory?: string, shell?: string) => string;
  closeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  updateSession: (id: string, updates: Partial<TerminalSession>) => void;

  // Search
  setSearchVisible: (visible: boolean) => void;
  setSearchQuery: (query: string) => void;

  // Zoom
  setZoomLevel: (level: number) => void;

  // Utilities
  getActiveSession: () => TerminalSession | null;
  getSession: (id: string) => TerminalSession | undefined;
  getAllSessions: () => TerminalSession[];

  // Cleanup
  clearAllSessions: () => void;
}

const generateTerminalId = (name: string): string => {
  return `terminal_${name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
};

const generateUniqueName = (baseName: string, existingNames: string[]): string => {
  let name = baseName;
  let counter = 0;

  while (existingNames.includes(name)) {
    counter++;
    name = `${baseName} (${counter})`;
  }

  return name;
};

export const useUnifiedTerminalStore = create<UnifiedTerminalState>()(
  immer((set, get) => ({
    // Initial state
    sessions: new Map(),
    activeSessionId: null,
    isSearchVisible: false,
    searchQuery: "",
    zoomLevel: 1.0,

    // Create new session
    createSession: (name: string, currentDirectory?: string, shell?: string) => {
      const state = get();
      const existingNames = Array.from(state.sessions.values()).map((s) => s.name);
      const uniqueName = generateUniqueName(name, existingNames);
      const sessionId = generateTerminalId(uniqueName);

      const newSession: TerminalSession = {
        id: sessionId,
        name: uniqueName,
        currentDirectory,
        shell,
        isActive: true,
        isPinned: false,
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      set((draft) => {
        // Set all other sessions as inactive
        draft.sessions.forEach((session) => {
          session.isActive = false;
        });

        // Add new session and set as active
        draft.sessions.set(sessionId, newSession);
        draft.activeSessionId = sessionId;
      });

      return sessionId;
    },

    // Close session
    closeSession: (id: string) => {
      set((draft) => {
        const session = draft.sessions.get(id);
        if (!session) return;

        // Remove the session
        draft.sessions.delete(id);

        // If closing the active session, switch to another
        if (draft.activeSessionId === id) {
          const remainingSessions = Array.from(draft.sessions.values());

          if (remainingSessions.length > 0) {
            // Find the next session to activate
            const nextSession = remainingSessions.find((s) => !s.isPinned) || remainingSessions[0];
            draft.activeSessionId = nextSession.id;
            nextSession.isActive = true;
          } else {
            draft.activeSessionId = null;
          }
        }

        // Clean up any split references
        draft.sessions.forEach((s) => {
          if (s.splitWithId === id) {
            s.splitMode = false;
            s.splitWithId = undefined;
          }
        });
      });
    },

    // Set active session
    setActiveSession: (id: string) => {
      set((draft) => {
        // Set all sessions as inactive
        draft.sessions.forEach((session) => {
          session.isActive = false;
        });

        // Set the requested session as active
        const session = draft.sessions.get(id);
        if (session) {
          session.isActive = true;
          session.lastActivity = new Date();
          draft.activeSessionId = id;
        }
      });
    },

    // Update session
    updateSession: (id: string, updates: Partial<TerminalSession>) => {
      set((draft) => {
        const session = draft.sessions.get(id);
        if (session) {
          Object.assign(session, updates);
          if (updates.lastActivity === undefined) {
            session.lastActivity = new Date();
          }
        }
      });
    },

    // Search visibility
    setSearchVisible: (visible: boolean) => {
      set((draft) => {
        draft.isSearchVisible = visible;
      });
    },

    // Search query
    setSearchQuery: (query: string) => {
      set((draft) => {
        draft.searchQuery = query;
      });
    },

    // Zoom level
    setZoomLevel: (level: number) => {
      set((draft) => {
        draft.zoomLevel = Math.max(0.5, Math.min(2.0, level));
      });
    },

    // Get active session
    getActiveSession: () => {
      const state = get();
      if (!state.activeSessionId) return null;
      return state.sessions.get(state.activeSessionId) || null;
    },

    // Get specific session
    getSession: (id: string) => {
      return get().sessions.get(id);
    },

    // Get all sessions
    getAllSessions: () => {
      return Array.from(get().sessions.values());
    },

    // Clear all sessions
    clearAllSessions: () => {
      set((draft) => {
        draft.sessions.clear();
        draft.activeSessionId = null;
        draft.isSearchVisible = false;
        draft.searchQuery = "";
        draft.zoomLevel = 1.0;
      });
    },
  })),
);

// Selectors for better performance
export const useTerminalSessions = () => useUnifiedTerminalStore((state) => state.getAllSessions());
export const useActiveTerminalId = () => useUnifiedTerminalStore((state) => state.activeSessionId);
export const useTerminalSearchState = () =>
  useUnifiedTerminalStore((state) => ({
    isSearchVisible: state.isSearchVisible,
    searchQuery: state.searchQuery,
    setSearchVisible: state.setSearchVisible,
    setSearchQuery: state.setSearchQuery,
  }));
export const useTerminalZoom = () =>
  useUnifiedTerminalStore((state) => ({
    zoomLevel: state.zoomLevel,
    setZoomLevel: state.setZoomLevel,
  }));
