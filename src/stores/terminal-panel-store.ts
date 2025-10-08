import { create } from "zustand";
import {
  addTab,
  closeTab,
  createRootPane,
  findFirstPane,
  findPane,
  type PanelNode,
  type SplitAxis,
  setActiveTab,
  splitPane,
} from "@/lib/pane-group";
import type { Terminal } from "@/types/terminal";

type TerminalPanelState = {
  root: PanelNode;
  activePaneId: string;
  terminalsById: Map<string, Terminal>;
  // Actions
  addTerminal: (name: string, cwd: string) => { paneId: string; terminal: Terminal };
  splitActivePane: (axis: SplitAxis) => void;
  setActivePane: (paneId: string) => void;
  activateTab: (paneId: string, terminalId: string) => void;
  closeTerminal: (paneId: string, terminalId: string) => void;
};

function genTerminal(name: string, cwd: string): Terminal {
  const id = `term_${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    name,
    currentDirectory: cwd,
    isActive: true,
    createdAt: new Date(),
  };
}

const initialRoot = createRootPane();

export const useTerminalPanelStore = create<TerminalPanelState>((set, get) => ({
  root: initialRoot,
  activePaneId: (initialRoot as any).id,
  terminalsById: new Map(),

  addTerminal: (name: string, cwd: string) => {
    const state = get();
    let paneId = state.activePaneId;

    // Verify the pane exists, otherwise find the first available pane
    const existingPane = findPane(state.root, paneId);
    if (!existingPane) {
      const firstPane = findFirstPane(state.root);
      if (firstPane) {
        paneId = firstPane.id;
        set({ activePaneId: paneId });
      } else {
        console.error("No pane found in tree!");
        return { paneId, terminal: genTerminal(name, cwd) };
      }
    }

    const terminal = genTerminal(name, cwd);
    const newRoot = addTab(state.root, paneId, { id: terminal.id, name: terminal.name });
    const newMap = new Map(state.terminalsById);
    newMap.set(terminal.id, terminal);
    set({ root: newRoot, terminalsById: newMap });
    return { paneId, terminal };
  },

  splitActivePane: (axis: SplitAxis) => {
    set((s) => {
      const newRoot = splitPane(s.root, s.activePaneId, axis);
      // After split, the active pane still exists but is now a child of a split
      // Keep the activePaneId pointing to the original pane (first child of new split)
      return { root: newRoot };
    });
  },

  setActivePane: (paneId: string) => set({ activePaneId: paneId }),

  activateTab: (paneId: string, terminalId: string) => {
    set((s) => ({ root: setActiveTab(s.root, paneId, terminalId) }));
  },

  closeTerminal: (paneId: string, terminalId: string) => {
    set((s) => {
      const newRoot = closeTab(s.root, paneId, terminalId);
      const newMap = new Map(s.terminalsById);
      newMap.delete(terminalId);
      return { root: newRoot, terminalsById: newMap };
    });
  },
}));
