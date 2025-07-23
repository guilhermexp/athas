import type { GitDiff, GitDiffLine, GitHunk } from "../../../utils/git";
import type { ParsedHunk } from "./types";

export const createGitHunk = (
  hunk: { header: GitDiffLine; lines: GitDiffLine[] },
  filePath: string,
): GitHunk => ({
  file_path: filePath,
  lines: [hunk.header, ...hunk.lines],
});

export const getImgSrc = (base64: string | undefined) =>
  base64 ? `data:image/*;base64,${base64}` : undefined;

export const getFileStatus = (diff: GitDiff) => {
  if (diff.is_new) return "Added";
  if (diff.is_deleted) return "Deleted";
  if (diff.is_renamed) return "Renamed";
  return "Modified";
};

export const groupLinesIntoHunks = (lines: GitDiffLine[]): ParsedHunk[] => {
  const hunks: ParsedHunk[] = [];
  let currentHunk: GitDiffLine[] = [];
  let currentHeader: GitDiffLine | null = null;
  let hunkId = 0;

  lines.forEach(line => {
    if (line.line_type === "header") {
      if (currentHeader && currentHunk.length > 0) {
        hunks.push({ header: currentHeader, lines: [...currentHunk], id: hunkId++ });
      }
      currentHeader = line;
      currentHunk = [];
    } else if (currentHeader) {
      currentHunk.push(line);
    }
  });

  if (currentHeader && currentHunk.length > 0) {
    hunks.push({ header: currentHeader, lines: [...currentHunk], id: hunkId });
  }

  return hunks;
};

export const copyLineContent = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
};
