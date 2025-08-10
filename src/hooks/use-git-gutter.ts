import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFileSystemStore } from "@/file-system/controllers/store";
import { useEditorDecorationsStore } from "@/stores/editor-decorations-store";
import type { GitDiff } from "@/utils/git";
import { getFileDiff } from "@/utils/git";

interface GitGutterHookOptions {
  filePath: string;
  content: string;
  enabled?: boolean;
}

interface ProcessedGitChanges {
  addedLines: Set<number>;
  modifiedLines: Set<number>;
  deletedLines: Map<number, number>; // line number -> count
}

export function useGitGutter({ filePath, content, enabled = true }: GitGutterHookOptions) {
  const gitDecorationIdsRef = useRef<string[]>([]);
  const lastDiffRef = useRef<GitDiff | null>(null);
  const lastContentHashRef = useRef<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const rootFolderPath = useFileSystemStore((state) => state.rootFolderPath);

  // Memoized content hash for efficient change detection
  const contentHash = useMemo(() => {
    return content ? btoa(content).slice(0, 32) : "";
  }, [content]);

  // Process git diff lines into line change information
  const processGitDiff = useCallback((diff: GitDiff): ProcessedGitChanges => {
    const addedLines = new Set<number>();
    const modifiedLines = new Set<number>();
    const deletedLines = new Map<number, number>();

    if (!diff.lines || diff.lines.length === 0) {
      return { addedLines, modifiedLines, deletedLines };
    }

    let i = 0;
    while (i < diff.lines.length) {
      const line = diff.lines[i];

      if (line.line_type === "removed") {
        // Start of a deletion group
        let deletedCount = 0;
        let j = i;

        // Count consecutive deletions
        while (j < diff.lines.length && diff.lines[j].line_type === "removed") {
          deletedCount++;
          j++;
        }

        // Check if followed by additions (modification)
        let addedCount = 0;
        let k = j;
        while (k < diff.lines.length && diff.lines[k].line_type === "added") {
          addedCount++;
          k++;
        }

        if (addedCount > 0) {
          // Modification: deletions followed by additions
          const startLine = diff.lines[j]?.new_line_number;
          if (typeof startLine === "number") {
            const modCount = Math.min(deletedCount, addedCount);
            // Mark modified lines
            for (let m = 0; m < modCount; m++) {
              modifiedLines.add(startLine - 1 + m);
            }
            // Extra additions are new lines
            for (let m = modCount; m < addedCount; m++) {
              addedLines.add(startLine - 1 + m);
            }
            // Extra deletions show as deleted markers
            if (deletedCount > addedCount) {
              const deletedLine = startLine - 1 + addedCount;
              deletedLines.set(deletedLine, deletedCount - addedCount);
            }
          }
          i = k;
        } else {
          // Pure deletion
          const nextLine = diff.lines[j];
          const deletedAtLine = nextLine?.new_line_number
            ? nextLine.new_line_number - 1
            : Math.max(0, (diff.lines[i]?.old_line_number || 1) - 1);
          deletedLines.set(deletedAtLine, deletedCount);
          i = j;
        }
      } else if (line.line_type === "added") {
        // Pure addition
        if (typeof line.new_line_number === "number") {
          addedLines.add(line.new_line_number - 1);
        }
        i++;
      } else {
        i++;
      }
    }

    return { addedLines, modifiedLines, deletedLines };
  }, []);

  // Apply git gutter decorations
  const applyGitDecorations = useCallback((changes: ProcessedGitChanges) => {
    const { addedLines, modifiedLines, deletedLines } = changes;
    const decorationsStore = useEditorDecorationsStore.getState();

    // Clear existing decorations
    gitDecorationIdsRef.current.forEach((id) => decorationsStore.removeDecoration(id));
    gitDecorationIdsRef.current = [];

    const addMarker = (lineNumber: number, className: string, content: string = " ") => {
      const id = decorationsStore.addDecoration({
        type: "gutter",
        className,
        content,
        range: {
          start: { line: lineNumber, column: 0, offset: 0 },
          end: { line: lineNumber, column: 0, offset: 0 },
        },
      });
      gitDecorationIdsRef.current.push(id);
    };

    // Apply markers
    addedLines.forEach((ln) => addMarker(ln, "git-gutter-added"));
    modifiedLines.forEach((ln) => addMarker(ln, "git-gutter-modified"));
    deletedLines.forEach((count, ln) => {
      addMarker(ln, "git-gutter-deleted", `−${count > 1 ? count : ""}`);
    });
  }, []);

  // Update git gutter decorations
  const updateGitGutter = useCallback(async () => {
    if (!enabled || !filePath || !rootFolderPath) {
      return;
    }
    if (filePath.startsWith("diff://")) {
      return;
    }

    try {
      // Convert to relative path
      let relativePath = filePath;
      if (relativePath.startsWith(rootFolderPath)) {
        relativePath = relativePath.slice(rootFolderPath.length);
        if (relativePath.startsWith("/")) relativePath = relativePath.slice(1);
      }

      const diff = await getFileDiff(rootFolderPath, relativePath, false, content);

      if (!diff || diff.is_binary || diff.is_image) {
        // Clear decorations for binary/image files
        const decorationsStore = useEditorDecorationsStore.getState();
        gitDecorationIdsRef.current.forEach((id) => decorationsStore.removeDecoration(id));
        gitDecorationIdsRef.current = [];
        return;
      }

      // Cache the diff for comparison
      lastDiffRef.current = diff;

      const changes = processGitDiff(diff);
      applyGitDecorations(changes);
    } catch (_error) {
      // Clear decorations on error
      const decorationsStore = useEditorDecorationsStore.getState();
      gitDecorationIdsRef.current.forEach((id) => decorationsStore.removeDecoration(id));
      gitDecorationIdsRef.current = [];
    }
  }, [enabled, filePath, rootFolderPath, processGitDiff, applyGitDecorations]);

  // Debounced update function for content changes
  const debouncedUpdate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      updateGitGutter();
    }, 500) as NodeJS.Timeout; // 500ms debounce for content changes
  }, [updateGitGutter]);

  // Initial update when file path changes
  useEffect(() => {
    if (filePath && rootFolderPath) {
      updateGitGutter();
    }

    return () => {
      // Clear decorations when component unmounts or file changes
      const decorationsStore = useEditorDecorationsStore.getState();
      gitDecorationIdsRef.current.forEach((id) => decorationsStore.removeDecoration(id));
      gitDecorationIdsRef.current = [];
    };
  }, [filePath, rootFolderPath]);

  // Update on content changes (debounced)
  useEffect(() => {
    if (contentHash && contentHash !== lastContentHashRef.current) {
      lastContentHashRef.current = contentHash;
      debouncedUpdate();
    }
  }, [contentHash, debouncedUpdate]);

  // Listen for file system changes to update git status
  useEffect(() => {
    if (!enabled || !filePath) return;

    const handleFileReload = (event: CustomEvent) => {
      const { path } = event.detail;
      if (path === filePath) {
        // File was reloaded from disk, update git gutter immediately
        updateGitGutter();
      }
    };

    const handleGitStatusUpdate = () => {
      // Git status changed, update git gutter
      updateGitGutter();
    };

    // Listen for file reloads and git status updates
    window.addEventListener("file-reloaded", handleFileReload as EventListener);
    window.addEventListener("git-status-updated", handleGitStatusUpdate);

    return () => {
      window.removeEventListener("file-reloaded", handleFileReload as EventListener);
      window.removeEventListener("git-status-updated", handleGitStatusUpdate);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, filePath, updateGitGutter]);

  // Return current git changes for external use if needed
  return {
    updateGitGutter: useCallback(() => updateGitGutter(), [updateGitGutter]),
    clearGitGutter: useCallback(() => {
      const decorationsStore = useEditorDecorationsStore.getState();
      gitDecorationIdsRef.current.forEach((id) => decorationsStore.removeDecoration(id));
      gitDecorationIdsRef.current = [];
    }, []),
  };
}
