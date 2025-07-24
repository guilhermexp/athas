import { create } from "zustand";
import type { Terminal } from "../types/terminal";

interface TerminalStore {
  sessions: Map<string, Partial<Terminal>>;
  updateSession: (sessionId: string, updates: Partial<Terminal>) => void;
  getSession: (sessionId: string) => Partial<Terminal> | undefined;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  sessions: new Map(),

  updateSession: (sessionId: string, updates: Partial<Terminal>) => {
    set(state => {
      const newSessions = new Map(state.sessions);
      const currentSession = newSessions.get(sessionId) || {};
      newSessions.set(sessionId, { ...currentSession, ...updates });
      return { sessions: newSessions };
    });
  },

  getSession: (sessionId: string) => {
    return get().sessions.get(sessionId);
  },
}));
