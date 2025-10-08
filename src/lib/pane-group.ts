export type SplitAxis = "horizontal" | "vertical";

export interface TerminalTabItem {
  id: string;
  name: string;
}

export interface PaneNode {
  type: "pane";
  id: string;
  tabs: TerminalTabItem[];
  activeTabId: string | null;
}

export interface SplitNode {
  type: "split";
  id: string;
  axis: SplitAxis;
  children: PanelNode[];
  sizes: number[]; // normalized (sum ~ 1)
}

export type PanelNode = PaneNode | SplitNode;

export function createPane(): PaneNode {
  return { type: "pane", id: genId("pane"), tabs: [], activeTabId: null };
}

export function createRootPane(): PanelNode {
  return createPane();
}

export function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isPane(node: PanelNode): node is PaneNode {
  return node.type === "pane";
}

export function isSplit(node: PanelNode): node is SplitNode {
  return node.type === "split";
}

export function splitPane(root: PanelNode, targetPaneId: string, axis: SplitAxis): PanelNode {
  // Replace the target pane with a split containing the original pane + a new empty pane
  const replaced = replaceNode(root, targetPaneId, (pane) => {
    const newPane = createPane();
    const split: SplitNode = {
      type: "split",
      id: genId("split"),
      axis,
      children: [pane, newPane],
      sizes: [0.5, 0.5],
    };
    return split;
  });
  return replaced ?? root;
}

export function addTab(root: PanelNode, paneId: string, tab: TerminalTabItem): PanelNode {
  const updated = replaceNode(root, paneId, (pane) => {
    const tabs = [...pane.tabs, tab];
    return { ...pane, tabs, activeTabId: tab.id };
  });
  return updated ?? root;
}

export function closeTab(root: PanelNode, paneId: string, tabId: string): PanelNode {
  const updated = replaceNode(root, paneId, (pane) => {
    const idx = pane.tabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return pane;
    const tabs = pane.tabs.filter((t) => t.id !== tabId);
    let activeTabId = pane.activeTabId;
    if (activeTabId === tabId) {
      const next = Math.min(idx, tabs.length - 1);
      activeTabId = tabs[next]?.id ?? null;
    }
    return { ...pane, tabs, activeTabId };
  });
  return updated ?? root;
}

export function setActiveTab(root: PanelNode, paneId: string, tabId: string): PanelNode {
  const updated = replaceNode(root, paneId, (pane) => ({ ...pane, activeTabId: tabId }));
  return updated ?? root;
}

export function replaceNode(
  node: PanelNode,
  targetPaneId: string,
  replacer: (pane: PaneNode) => PanelNode,
): PanelNode | null {
  if (isPane(node)) {
    if (node.id === targetPaneId) return replacer(node);
    return null;
  }
  const split: SplitNode = node;
  let changed = false;
  const children = split.children.map((child) => {
    const replacement = replaceNode(child, targetPaneId, replacer);
    if (replacement) {
      changed = true;
      return replacement;
    }
    return child;
  });
  return changed ? { ...split, children } : null;
}

export function findPane(node: PanelNode, paneId: string): PaneNode | null {
  if (isPane(node)) return node.id === paneId ? node : null;
  for (const child of node.children) {
    const found = findPane(child, paneId);
    if (found) return found;
  }
  return null;
}

export function findPaneContainingTab(node: PanelNode, tabId: string): PaneNode | null {
  if (isPane(node)) {
    return node.tabs.some((t) => t.id === tabId) ? node : null;
  }
  for (const child of node.children) {
    const found = findPaneContainingTab(child, tabId);
    if (found) return found;
  }
  return null;
}

export function findFirstPane(node: PanelNode): PaneNode | null {
  if (isPane(node)) return node;
  // For split nodes, return the first pane in the first child
  for (const child of node.children) {
    const found = findFirstPane(child);
    if (found) return found;
  }
  return null;
}

export function resizeChild(
  node: PanelNode,
  splitId: string,
  childIndex: number,
  deltaRatio: number,
): PanelNode {
  if (isSplit(node)) {
    if (node.id === splitId) {
      const sizes = [...node.sizes];
      const otherIndex = childIndex === 0 ? 1 : 0;
      sizes[childIndex] = clamp(sizes[childIndex] + deltaRatio, 0.1, 0.9);
      sizes[otherIndex] = 1 - sizes[childIndex];
      return { ...node, sizes };
    }
    return {
      ...node,
      children: node.children.map((c) => resizeChild(c, splitId, childIndex, deltaRatio)),
    };
  }
  return node;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function serialize(node: PanelNode) {
  return JSON.stringify(node);
}

export function deserialize(json: string): PanelNode {
  return JSON.parse(json) as PanelNode;
}
