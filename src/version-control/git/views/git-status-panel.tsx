import {
  Check,
  CheckSquare,
  Edit3,
  FileIcon,
  FilePlus,
  FileText,
  FileX,
  Minus,
  Plus,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";
import type React from "react";
import { type RefObject, useRef, useState } from "react";
import { useOnClickOutside } from "usehooks-ts";
import {
  discardFileChanges,
  stageAllFiles,
  stageFile,
  unstageAllFiles,
  unstageFile,
} from "@/version-control/git/controllers/git";
import type { GitFile } from "../models/git-types";

interface GitStatusPanelProps {
  files: GitFile[];
  onFileSelect?: (path: string, staged: boolean) => void;
  onOpenFile?: (path: string) => void;
  onRefresh?: () => void;
  repoPath?: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  filePath: string;
  isStaged: boolean;
}

const GitStatusPanel = ({
  files,
  onFileSelect,
  onOpenFile,
  onRefresh,
  repoPath,
}: GitStatusPanelProps) => {
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const stagedFiles = files.filter((f) => f.staged);
  const unstagedFiles = files.filter((f) => !f.staged);

  const getFileIcon = (file: GitFile) => {
    switch (file.status) {
      case "added":
        return <FilePlus size={10} className="text-green-400" />;
      case "deleted":
        return <FileX size={10} className="text-red-400" />;
      case "modified":
        return <Edit3 size={10} className="text-yellow-400" />;
      case "untracked":
        return <FileIcon size={10} className="text-text-lighter" />;
      case "renamed":
        return <RotateCcw size={10} className="text-blue-400" />;
      default:
        return <FileIcon size={10} className="text-text-lighter" />;
    }
  };

  const getStatusText = (file: GitFile) => {
    switch (file.status) {
      case "added":
        return "A";
      case "deleted":
        return "D";
      case "modified":
        return "M";
      case "untracked":
        return "U";
      case "renamed":
        return "R";
      default:
        return "?";
    }
  };

  const handleStageFile = async (filePath: string) => {
    if (!repoPath) return;
    setIsLoading(true);
    try {
      await stageFile(repoPath, filePath);
      onRefresh?.();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnstageFile = async (filePath: string) => {
    if (!repoPath) return;
    setIsLoading(true);
    try {
      await unstageFile(repoPath, filePath);
      onRefresh?.();
    } finally {
      setIsLoading(false);
    }
  };

  const handleStageAll = async () => {
    if (!repoPath) return;
    setIsLoading(true);
    try {
      await stageAllFiles(repoPath);
      onRefresh?.();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnstageAll = async () => {
    if (!repoPath) return;
    setIsLoading(true);
    try {
      await unstageAllFiles(repoPath);
      onRefresh?.();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscardFile = async (filePath: string) => {
    if (!repoPath) return;

    setIsLoading(true);
    try {
      await discardFileChanges(repoPath, filePath);
      onRefresh?.();
    } finally {
      setIsLoading(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, filePath: string, isStaged: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      filePath: filePath,
      isStaged: isStaged,
    });
  };

  useOnClickOutside(contextMenuRef as RefObject<HTMLElement>, () => {
    setContextMenu(null);
  });

  // Calculate total changes count (Zed-style)
  const totalChanges = files.length;

  return (
    <div className="select-none space-y-0">
      {/* Total Changes Header - Zed Style */}
      {totalChanges > 0 && (
        <div className="flex items-center justify-between border-border border-b bg-secondary-bg px-3 py-2">
          <span className="font-medium text-text text-xs">{totalChanges} Changes</span>
          <div className="flex items-center gap-2">
            {unstagedFiles.length > 0 && (
              <button
                onClick={handleStageAll}
                disabled={isLoading}
                className="rounded px-2 py-0.5 text-text-lighter text-xs transition-colors hover:bg-hover hover:text-text disabled:opacity-50"
                title="Stage All"
              >
                Stage All
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tracked (Staged) Changes - Zed naming */}
      <div className="border-border border-b">
        <div className="flex items-center gap-2 bg-secondary-bg px-3 py-1 text-text-lighter">
          <span className="flex items-center gap-1">
            <Check size={10} />
            <span className="cursor-default text-xs">Tracked ({stagedFiles.length})</span>
          </span>
          <div className="flex-1" />
          {stagedFiles.length > 0 && (
            <button
              onClick={handleUnstageAll}
              disabled={isLoading}
              className="text-text-lighter transition-colors hover:text-text disabled:opacity-50"
              title="Unstage all"
            >
              <Minus size={10} />
            </button>
          )}
        </div>

        {stagedFiles.length === 0 ? (
          <div className="cursor-default bg-primary-bg px-3 py-2 text-text-lighter text-xs italic">
            No tracked changes
          </div>
        ) : (
          <div className="bg-primary-bg">
            {stagedFiles.map((file, index) => (
              <div
                key={`staged-${file.path}-${index}`}
                className="group flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-hover"
                onClick={(e) => {
                  if (e.button === 0) {
                    onFileSelect?.(file.path, true);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, file.path, true)}
              >
                {/* Stage toggle checkbox (checked for staged) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnstageFile(file.path);
                  }}
                  disabled={isLoading}
                  className="flex h-3 w-3 items-center justify-center text-text-lighter transition-colors hover:text-text disabled:opacity-50"
                  title="Unstage"
                >
                  <CheckSquare size={10} />
                </button>
                <span className="w-3 text-center font-medium font-mono text-text-lighter text-xs">
                  {getStatusText(file)}
                </span>
                {getFileIcon(file)}
                <span
                  className="flex-1 truncate text-text text-xs"
                  title={file.path}
                  style={{ textDecoration: file.status === "deleted" ? "line-through" : "none" }}
                >
                  {file.path.split("/").pop()}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnstageFile(file.path);
                    }}
                    disabled={isLoading}
                    className="text-text-lighter transition-colors hover:text-text disabled:opacity-50"
                    title="Unstage"
                  >
                    <Minus size={8} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unstaged Changes */}
      <div className="border-border border-b">
        <div className="flex items-center gap-2 bg-secondary-bg px-3 py-1 text-text-lighter">
          <span className="flex items-center gap-1">
            <Edit3 size={10} />
            <span className="cursor-default">changes ({unstagedFiles.length})</span>
          </span>
          <div className="flex-1" />
          {unstagedFiles.length > 0 && (
            <button
              onClick={handleStageAll}
              disabled={isLoading}
              className="text-text-lighter transition-colors hover:text-text disabled:opacity-50"
              title="Stage all"
            >
              <Plus size={10} />
            </button>
          )}
        </div>

        {unstagedFiles.length === 0 ? (
          <div className="cursor-default bg-primary-bg px-3 py-2 text-[10px] text-text-lighter italic">
            No unstaged changes
          </div>
        ) : (
          <div className="bg-primary-bg">
            {unstagedFiles.map((file, index) => (
              <div
                key={`unstaged-${file.path}-${index}`}
                className="group flex cursor-pointer items-center gap-2 px-3 py-1 hover:bg-hover"
                onClick={(e) => {
                  if (e.button === 0) {
                    onFileSelect?.(file.path, false);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, file.path, false)}
              >
                {/* Stage toggle checkbox (unchecked for unstaged) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStageFile(file.path);
                  }}
                  disabled={isLoading}
                  className="flex h-3 w-3 items-center justify-center text-text-lighter transition-colors hover:text-text disabled:opacity-50"
                  title="Stage"
                >
                  <Square size={10} />
                </button>
                <span className="w-3 text-center font-medium font-mono text-text-lighter text-xs">
                  {getStatusText(file)}
                </span>
                {getFileIcon(file)}
                <span
                  className="flex-1 truncate text-text text-xs"
                  title={file.path}
                  style={{ textDecoration: file.status === "deleted" ? "line-through" : "none" }}
                >
                  {file.path.split("/").pop()}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStageFile(file.path);
                    }}
                    disabled={isLoading}
                    className="text-text-lighter transition-colors hover:text-text disabled:opacity-50"
                    title="Stage"
                  >
                    <Plus size={8} />
                  </button>
                  {file.status !== "untracked" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDiscardFile(file.path);
                      }}
                      disabled={isLoading}
                      className="text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
                      title="Discard changes"
                    >
                      <Trash2 size={8} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clean State */}
      {stagedFiles.length === 0 && unstagedFiles.length === 0 && (
        <div className="border-border border-b">
          <div className="flex items-center gap-2 bg-secondary-bg px-3 py-1 text-text-lighter">
            <Check size={10} />
            <span className="cursor-default">clean</span>
          </div>
          <div className="cursor-default bg-primary-bg px-3 py-2 text-[10px] text-text-lighter italic">
            No changes detected
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && onOpenFile && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-[120px] rounded-md border border-border bg-secondary-bg py-1 shadow-lg"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <button
            onClick={() => {
              onOpenFile(contextMenu.filePath);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-text text-xs hover:bg-hover"
          >
            <FileText size={12} />
            Open File
          </button>
        </div>
      )}
    </div>
  );
};

export default GitStatusPanel;
