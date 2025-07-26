import type { GitDiff, GitDiffLine, GitHunk } from "../../../utils/git";

export interface DiffViewerProps {
  onStageHunk?: (hunk: GitHunk) => void;
  onUnstageHunk?: (hunk: GitHunk) => void;
}

export interface ParsedHunk {
  header: GitDiffLine;
  lines: GitDiffLine[];
  id: number;
}

export interface ImageContainerProps {
  label: string;
  labelColor: string;
  base64?: string;
  alt: string;
  zoom: number;
}

export interface DiffHeaderProps {
  fileName: string;
  diff: GitDiff;
  viewMode: "unified" | "split";
  onViewModeChange: (mode: "unified" | "split") => void;
  onClose: () => void;
}

export interface DiffHunkHeaderProps {
  hunk: ParsedHunk;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isStaged: boolean;
  filePath: string;
  onStageHunk?: (hunk: GitHunk) => void;
  onUnstageHunk?: (hunk: GitHunk) => void;
}

export interface DiffLineProps {
  line: GitDiffLine;
  index: number;
  hunkId: number;
  viewMode: "unified" | "split";
}

export interface TextDiffViewerProps {
  diff: GitDiff;
  isStaged: boolean;
  viewMode: "unified" | "split";
  onStageHunk?: (hunk: GitHunk) => void;
  onUnstageHunk?: (hunk: GitHunk) => void;
}

export interface ImageDiffViewerProps {
  diff: GitDiff;
  fileName: string;
  onClose: () => void;
}
