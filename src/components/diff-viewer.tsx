import {
  ChevronDown,
  ChevronRight,
  Copy,
  Edit3,
  FileIcon,
  FilePlus,
  FileX,
  Minus,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useBufferStore } from "../stores/buffer-store";
import { useFileSystemStore } from "../stores/file-system-store";
import { type GitDiff, type GitDiffLine, type GitHunk, getFileDiff } from "../utils/git";

interface DiffViewerProps {
  onStageHunk?: (hunk: GitHunk) => void;
  onUnstageHunk?: (hunk: GitHunk) => void;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ onStageHunk, onUnstageHunk }) => {
  // Helper to create GitHunk object
  const createGitHunk = (
    hunk: { header: GitDiffLine; lines: GitDiffLine[] },
    filePath: string,
  ): GitHunk => ({
    file_path: filePath,
    lines: [hunk.header, ...hunk.lines],
  });

  // Helper to compose image src
  const getImgSrc = (base64: string | undefined) =>
    base64 ? `data:image/*;base64,${base64}` : undefined;

  // Image container component
  const ImageContainer: React.FC<{
    label: string;
    labelColor: string;
    base64?: string;
    alt: string;
    zoom: number;
  }> = ({ label, labelColor, base64, alt, zoom }) => {
    const containerBase = "flex flex-col items-center justify-center p-4";
    return (
      <div className={containerBase}>
        <span className={`mb-2 font-mono ${labelColor} text-xs`}>{label}</span>
        {base64 ? (
          <img
            src={getImgSrc(base64)}
            alt={alt}
            style={{
              transform: `scale(${zoom})`,
              transition: "transform 0.1s ease-out",
            }}
            draggable={false}
          />
        ) : (
          <div className="p-8 text-text-lighter text-xs">No image data</div>
        )}
      </div>
    );
  };

  // Helper to switch to a different view (staged/unstaged)
  const switchToView = (filePath: string, viewType: "staged" | "unstaged", diffData: GitDiff) => {
    const encodedPath = encodeURIComponent(filePath);
    const newVirtualPath = `diff://${viewType}/${encodedPath}`;
    const displayName = `${filePath.split("/").pop()} (${viewType})`;

    useBufferStore
      .getState()
      .openBuffer(
        newVirtualPath,
        displayName,
        JSON.stringify(diffData),
        false,
        false,
        true,
        true,
        diffData,
      );
  };

  // Helper to create status badges
  const statusBadge = (text: string, color: string) => (
    <span className={`ml-2 rounded px-2 py-0.5 font-bold text-xs ${color}`}>{text}</span>
  );
  const { activeBufferId, buffers, closeBuffer, updateBufferContent } = useBufferStore();
  const activeBuffer = buffers.find(b => b.id === activeBufferId);
  const { rootFolderPath } = useFileSystemStore();

  const [collapsedHunks, setCollapsedHunks] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified");
  const [zoom, setZoom] = useState<number>(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get diff from buffer or parse from content for backwards compatibility
  const diff =
    activeBuffer?.diffData ||
    (activeBuffer?.isDiff && activeBuffer.content
      ? (() => {
          try {
            return JSON.parse(activeBuffer.content) as GitDiff;
          } catch {
            return null;
          }
        })()
      : null);

  // Extract file path and staged status from virtual path
  const pathMatch = activeBuffer?.path.match(/^diff:\/\/(staged|unstaged)\/(.+)$/);
  const isStaged = pathMatch?.[1] === "staged";
  const encodedFilePath = pathMatch?.[2];
  const filePath = encodedFilePath ? decodeURIComponent(encodedFilePath) : null;

  // Refresh diff data
  const refreshDiff = useCallback(async () => {
    if (!rootFolderPath || !filePath || !activeBuffer) return;

    setIsRefreshing(true);
    try {
      // Get the diff for current view
      const currentViewDiff = await getFileDiff(rootFolderPath, filePath, isStaged);

      if (currentViewDiff && currentViewDiff.lines.length > 0) {
        // Update buffer with new diff data for current view
        updateBufferContent(
          activeBuffer.id,
          JSON.stringify(currentViewDiff),
          false,
          currentViewDiff,
        );
      } else {
        // Current view has no changes, check the other view
        const otherViewDiff = await getFileDiff(rootFolderPath, filePath, !isStaged);

        if (otherViewDiff && otherViewDiff.lines.length > 0) {
          // Switch to the other view
          const newViewType = isStaged ? "unstaged" : "staged";
          switchToView(filePath, newViewType, otherViewDiff);

          // Close current buffer after opening the new one
          closeBuffer(activeBuffer.id);
        } else {
          // No changes in either view, close the buffer
          closeBuffer(activeBuffer.id);
        }
      }
    } catch (error) {
      console.error("Failed to refresh diff:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [rootFolderPath, filePath, isStaged, activeBuffer, updateBufferContent, closeBuffer]);

  // Listen for git status changes and refresh
  useEffect(() => {
    const handleGitStatusChanged = async () => {
      if (!rootFolderPath || !filePath || !activeBuffer) return;

      // When staging from unstaged view, we might need to switch to staged view
      // Check if we're viewing unstaged and if staged now has changes
      if (!isStaged) {
        const stagedDiff = await getFileDiff(rootFolderPath, filePath, true);
        if (stagedDiff && stagedDiff.lines.length > 0) {
          // Open staged view
          switchToView(filePath, "staged", stagedDiff);
          return; // Don't refresh current buffer
        }
      }

      // Otherwise just refresh normally
      refreshDiff();
    };

    window.addEventListener("git-status-changed", handleGitStatusChanged);
    return () => {
      window.removeEventListener("git-status-changed", handleGitStatusChanged);
    };
  }, [refreshDiff, rootFolderPath, filePath, activeBuffer, isStaged]);

  if (!activeBuffer || !activeBuffer.isDiff) {
    return null;
  }

  const fileName = activeBuffer.name;
  const onClose = () => closeBuffer(activeBuffer.id);

  if (!diff) {
    return (
      <div className="flex h-full flex-col bg-primary-bg">
        <div className="flex items-center justify-between border-border border-b bg-secondary-bg px-4 py-2">
          <h3 className="font-medium text-sm text-text">Diff Viewer</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshDiff}
              disabled={isRefreshing}
              className="p-1 text-text-lighter hover:text-text disabled:opacity-50"
              title="Refresh diff"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            </button>
            <button onClick={onClose} className="p-1 text-text-lighter hover:text-text">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-text-lighter">No diff to display</p>
        </div>
      </div>
    );
  }

  // --- IMAGE DIFF HANDLING ---
  if (diff.is_image) {
    const fileLabel = fileName || diff.file_path.split("/").pop();
    const ext = fileLabel?.split(".").pop()?.toUpperCase() || "";
    const leftLabel = diff.is_deleted ? "Deleted Version" : "Previous Version";
    const rightLabel = diff.is_new ? "Added Version" : "New Version";

    return (
      <div className="flex h-full select-none flex-col bg-primary-bg">
        {/* Header */}
        <div className="flex items-center justify-between border-border border-b bg-secondary-bg px-4 py-2">
          <div className="flex items-center gap-2">
            {diff.is_new ? (
              <FilePlus size={14} className="text-green-500" />
            ) : diff.is_deleted ? (
              <FileX size={14} className="text-red-500" />
            ) : (
              <FileIcon size={14} className="text-text" />
            )}
            <span className="font-mono text-text text-xs">
              {fileLabel} {ext && <>• {ext}</>}
            </span>
            {diff.is_new && statusBadge("ADDED", "bg-green-600 text-white")}
            {diff.is_deleted && statusBadge("DELETED", "bg-red-600 text-white")}
            {!diff.is_new && !diff.is_deleted && statusBadge("MODIFIED", "bg-blue-600 text-white")}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
              className="p-1 text-text-lighter hover:text-text"
              title="Zoom out"
            >
              -
            </button>
            <span className="min-w-[50px] px-2 text-center font-mono text-text-lighter text-xs">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(3, z + 0.1))}
              className="p-1 text-text-lighter hover:text-text"
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 text-text-lighter hover:text-text"
              title="Reset zoom"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="ml-2 p-1 text-text-lighter hover:text-text"
              title="Close diff viewer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        {/* Image Diff Content */}
        <div className="flex flex-1 items-center justify-center gap-8 overflow-auto bg-[var(--editor-bg)]">
          {/* Side-by-side for modified, single for added/deleted */}
          {diff.is_new && !diff.old_blob_base64 ? (
            // Added
            <ImageContainer
              label={rightLabel}
              labelColor="text-green-600"
              base64={diff.new_blob_base64}
              alt="Added"
              zoom={zoom}
            />
          ) : diff.is_deleted && !diff.new_blob_base64 ? (
            // Deleted
            <ImageContainer
              label={leftLabel}
              labelColor="text-red-600"
              base64={diff.old_blob_base64}
              alt="Deleted"
              zoom={zoom}
            />
          ) : (
            // Modified (side-by-side)
            <>
              <ImageContainer
                label={leftLabel}
                labelColor="text-text-lighter"
                base64={diff.old_blob_base64}
                alt="Previous"
                zoom={zoom}
              />
              <ImageContainer
                label={rightLabel}
                labelColor="text-text-lighter"
                base64={diff.new_blob_base64}
                alt="New"
                zoom={zoom}
              />
            </>
          )}
        </div>
        {/* Footer/Info */}
        <div className="flex items-center gap-4 border-border border-t bg-secondary-bg px-4 py-2 text-text-lighter text-xs">
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <span>Type: {ext}</span>
          <span>Use +/- buttons to zoom in/out</span>
        </div>
      </div>
    );
  }

  const getFileIcon = () => {
    if (diff.is_new) return <FilePlus size={14} className="text-green-500" />;
    if (diff.is_deleted) return <FileX size={14} className="text-red-500" />;
    if (diff.is_renamed) return <Edit3 size={14} className="text-blue-500" />;
    return <FileIcon size={14} className="text-text" />;
  };

  const getFileStatus = () => {
    if (diff.is_new) return "Added";
    if (diff.is_deleted) return "Deleted";
    if (diff.is_renamed) return "Renamed";
    return "Modified";
  };

  const groupLinesIntoHunks = (lines: GitDiffLine[]) => {
    const hunks: { header: GitDiffLine; lines: GitDiffLine[]; id: number }[] = [];
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

  const toggleHunkCollapse = (hunkId: number) => {
    const newCollapsed = new Set(collapsedHunks);
    if (newCollapsed.has(hunkId)) {
      newCollapsed.delete(hunkId);
    } else {
      newCollapsed.add(hunkId);
    }
    setCollapsedHunks(newCollapsed);
  };

  const copyLineContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const renderHunkHeader = (hunk: { header: GitDiffLine; lines: GitDiffLine[]; id: number }) => {
    const isCollapsed = collapsedHunks.has(hunk.id);
    const addedCount = hunk.lines.filter(l => l.line_type === "added").length;
    const removedCount = hunk.lines.filter(l => l.line_type === "removed").length;

    return (
      <div className="sticky top-0 z-10 border-border border-y bg-secondary-bg">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleHunkCollapse(hunk.id)}
              className="text-text-lighter transition-colors hover:text-text"
            >
              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
            <span className="rounded bg-blue-500/10 px-2 py-1 font-mono text-blue-400 text-xs">
              {hunk.header.content}
            </span>
            <div className="flex items-center gap-2 text-xs">
              {removedCount > 0 && (
                <span className="rounded bg-red-500/10 px-2 py-0.5 text-red-400">
                  -{removedCount}
                </span>
              )}
              {addedCount > 0 && (
                <span className="rounded bg-green-500/10 px-2 py-0.5 text-green-400">
                  +{addedCount}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {(onStageHunk || onUnstageHunk) && (
              <>
                {!isStaged && onStageHunk && (
                  <button
                    key={`stage-${hunk.id}-${activeBuffer?.path}`}
                    onClick={() => onStageHunk(createGitHunk(hunk, diff?.file_path || ""))}
                    className="flex items-center gap-1 rounded bg-green-500/20 px-2 py-1 text-green-400 text-xs transition-colors hover:bg-green-500/30"
                    title="Stage hunk"
                  >
                    <Plus size={10} />
                    Stage
                  </button>
                )}
                {isStaged && onUnstageHunk && (
                  <button
                    key={`unstage-${hunk.id}-${activeBuffer?.path}`}
                    onClick={() => onUnstageHunk(createGitHunk(hunk, diff?.file_path || ""))}
                    className="flex items-center gap-1 rounded bg-red-500/20 px-2 py-1 text-red-400 text-xs transition-colors hover:bg-red-500/30"
                    title="Unstage hunk"
                  >
                    <Minus size={10} />
                    Unstage
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => copyLineContent(hunk.header.content)}
              className="rounded p-1 text-text-lighter transition-colors hover:bg-hover hover:text-text"
              title="Copy hunk header"
            >
              <Copy size={10} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDiffLine = (line: GitDiffLine, index: number, hunkId: number) => {
    const getLineClasses = () => {
      const base = "group hover:bg-hover/50 transition-colors border-l-2";
      switch (line.line_type) {
        case "added":
          return `${base} bg-green-500/5 border-green-500/30 hover:bg-green-500/10`;
        case "removed":
          return `${base} bg-red-500/5 border-red-500/30 hover:bg-red-500/10`;
        default:
          return `${base} border-transparent`;
      }
    };

    const getLineNumberBg = () => {
      switch (line.line_type) {
        case "added":
          return "bg-green-500/10";
        case "removed":
          return "bg-red-500/10";
        default:
          return "bg-secondary-bg";
      }
    };

    const oldNum = line.old_line_number?.toString() || "";
    const newNum = line.new_line_number?.toString() || "";

    if (viewMode === "split") {
      return (
        <div key={`${hunkId}-${index}`} className={`flex font-mono text-xs ${getLineClasses()}`}>
          {/* Old/Left Side */}
          <div className="flex flex-1 border-border border-r">
            {/* Old Line Number */}
            <div
              className={`w-12 select-none px-2 py-1 text-right text-text-lighter ${getLineNumberBg()} border-border border-r`}
            >
              {line.line_type !== "added" ? oldNum : ""}
            </div>

            {/* Old Content */}
            <div className="flex-1 overflow-x-auto px-3 py-1">
              {line.line_type === "removed" ? (
                <span className="bg-red-500/10 text-red-300">{line.content || " "}</span>
              ) : line.line_type === "context" ? (
                <span className="text-text">{line.content || " "}</span>
              ) : (
                <span className="select-none text-transparent">&nbsp;</span>
              )}
            </div>
          </div>

          {/* New/Right Side */}
          <div className="flex flex-1">
            {/* New Line Number */}
            <div
              className={`w-12 select-none px-2 py-1 text-right text-text-lighter ${getLineNumberBg()} border-border border-r`}
            >
              {line.line_type !== "removed" ? newNum : ""}
            </div>

            {/* New Content */}
            <div className="flex-1 overflow-x-auto px-3 py-1">
              {line.line_type === "added" ? (
                <span className="bg-green-500/10 text-green-300">{line.content || " "}</span>
              ) : line.line_type === "context" ? (
                <span className="text-text">{line.content || " "}</span>
              ) : (
                <span className="select-none text-transparent">&nbsp;</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 px-2 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => copyLineContent(line.content)}
                className="rounded p-1 text-text-lighter transition-colors hover:bg-hover hover:text-text"
                title="Copy line"
              >
                <Copy size={10} />
              </button>
              {/* TODO: Implement staging/unstaging functionality
          {(onStageLine || onUnstageLine) && line.line_type !== "context" && (
                <>
                  {onStageLine && line.line_type === "added" && (
                    <button
                      onClick={() => onStageLine(line)}
                      className="rounded p-1 text-green-400 transition-colors hover:bg-green-500/20 hover:text-green-300"
                      title="Stage line"
                    >
                      <Plus size={10} />
                    </button>
                  )}
                  {onUnstageLine && line.line_type === "removed" && (
                    <button
                      onClick={() => onUnstageLine(line)}
                      className="rounded p-1 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
                      title="Unstage line"
                    >
                      <Minus size={10} />
                    </button>
                  )}
                </>
              )} */}
            </div>
          </div>
        </div>
      );
    }

    // Unified view (original implementation)
    return (
      <div key={`${hunkId}-${index}`} className={`flex font-mono text-xs ${getLineClasses()}`}>
        {/* Line Numbers */}
        <div className={`flex ${getLineNumberBg()} border-border border-r`}>
          <div className="w-12 select-none px-2 py-1 text-right text-text-lighter">{oldNum}</div>
          <div className="w-12 select-none border-border border-l px-2 py-1 text-right text-text-lighter">
            {newNum}
          </div>
        </div>

        {/* Change Indicator */}
        <div className="flex w-8 items-center justify-center border-border border-r bg-secondary-bg py-1">
          {line.line_type === "added" && (
            <span className="font-bold text-green-500 text-sm">+</span>
          )}
          {line.line_type === "removed" && (
            <span className="font-bold text-red-500 text-sm">−</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-x-auto px-3 py-1">
          <span
            className={
              line.line_type === "added"
                ? "text-green-300"
                : line.line_type === "removed"
                  ? "text-red-300"
                  : "text-text"
            }
          >
            {line.content || " "}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 px-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => copyLineContent(line.content)}
            className="rounded p-1 text-text-lighter transition-colors hover:bg-hover hover:text-text"
            title="Copy line"
          >
            <Copy size={10} />
          </button>
        </div>
      </div>
    );
  };

  const hunks = groupLinesIntoHunks(diff.lines);
  const contextLines = diff.lines.filter(line => line.line_type === "context").length;
  const addedLines = diff.lines.filter(line => line.line_type === "added").length;
  const removedLines = diff.lines.filter(line => line.line_type === "removed").length;

  return (
    <div className="flex h-full flex-col bg-primary-bg">
      {/* Header */}
      <div className="flex items-center justify-between border-border border-b bg-secondary-bg px-4 py-2">
        <div className="flex items-center gap-2">
          {getFileIcon()}
          <div>
            <h3 className="font-medium text-sm text-text">{fileName || diff.file_path}</h3>
            <div className="flex items-center gap-3 text-text-lighter text-xs">
              <span className="capitalize">{getFileStatus()}</span>
              {removedLines > 0 && (
                <span className="rounded bg-red-500/10 px-2 py-0.5 text-red-400">
                  -{removedLines}
                </span>
              )}
              {addedLines > 0 && (
                <span className="rounded bg-green-500/10 px-2 py-0.5 text-green-400">
                  +{addedLines}
                </span>
              )}
              {hunks.length > 0 && (
                <span className="text-text-lighter">
                  {hunks.length} {hunks.length === 1 ? "hunk" : "hunks"}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === "unified" ? "split" : "unified")}
            className="rounded bg-hover px-2 py-1 text-text text-xs transition-colors hover:bg-border"
            title={`Switch to ${viewMode === "unified" ? "split" : "unified"} view`}
          >
            {viewMode === "unified" ? "Split" : "Unified"}
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-lighter hover:bg-hover hover:text-text"
            title="Close diff viewer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* File path info for renames */}
      {diff.is_renamed && diff.old_path && diff.new_path && (
        <div className="border-border border-b bg-blue-500/10 px-4 py-2">
          <p className="text-blue-400 text-xs">
            Renamed from <span className="font-mono">{diff.old_path}</span> to{" "}
            <span className="font-mono">{diff.new_path}</span>
          </p>
        </div>
      )}

      {/* Diff Content */}
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {hunks.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <FileIcon size={48} className="mx-auto mb-4 text-text-lighter opacity-50" />
              <p className="text-sm text-text-lighter">No changes to display</p>
            </div>
          </div>
        ) : (
          <div className="font-mono">
            {hunks.map(hunk => (
              <div key={hunk.id} className="border-border border-b last:border-b-0">
                {renderHunkHeader(hunk)}
                {!collapsedHunks.has(hunk.id) && (
                  <div className="bg-primary-bg">
                    {hunk.lines.map((line, index) => renderDiffLine(line, index, hunk.id))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="border-border border-t bg-secondary-bg px-4 py-2">
        <div className="flex items-center gap-4 text-text-lighter text-xs">
          <span>Total lines: {diff.lines.length}</span>
          {addedLines > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              {addedLines} added
            </span>
          )}
          {removedLines > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              {removedLines} removed
            </span>
          )}
          {contextLines > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-gray-500"></span>
              {contextLines} unchanged
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiffViewer;
