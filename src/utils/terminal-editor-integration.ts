import { findPaneContainingTab } from "@/lib/pane-group";
import { useBufferStore } from "@/stores/buffer-store";
import { useTerminalPanelStore } from "@/stores/terminal-panel-store";

export function openTerminalInEditor(terminalId: string) {
  const term = useTerminalPanelStore.getState().terminalsById.get(terminalId);
  const name = term?.name ?? `Terminal ${terminalId.slice(0, 4)}`;
  const path = `terminal://${terminalId}`;
  const { openBuffer } = useBufferStore.getState().actions;
  // Open as a virtual buffer; content stays empty, rendered specially
  openBuffer(path, name, "", false, false, false, true);

  // If this terminal exists in the bottom panel, remove it (move semantics)
  const { root, closeTerminal } = useTerminalPanelStore.getState();
  const pane = findPaneContainingTab(root, terminalId);
  if (pane) {
    closeTerminal(pane.id, terminalId);
  }
}

export function isTerminalBufferPath(path: string) {
  return path.startsWith("terminal://");
}

export function terminalIdFromPath(path: string) {
  return path.replace(/^terminal:\/\//, "");
}
