import { AlertCircle, ChevronDown, Download, GitCommit as GitCommitIcon, Send } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { cn } from "@/utils/cn";
import { commitChanges, fetchChanges } from "@/version-control/git/controllers/git";
import { useGitStore } from "@/version-control/git/controllers/git-store";

interface GitCommitPanelProps {
  stagedFilesCount: number;
  repoPath?: string;
  onCommitSuccess?: () => void;
}

const GitCommitPanel = ({ stagedFilesCount, repoPath, onCommitSuccess }: GitCommitPanelProps) => {
  const [commitMessage, setCommitMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const { gitStatus } = useGitStore();

  const handleCommit = async () => {
    if (!repoPath || !commitMessage.trim() || stagedFilesCount === 0) return;

    setIsCommitting(true);
    setError(null);

    try {
      const success = await commitChanges(repoPath, commitMessage.trim());
      if (success) {
        setCommitMessage("");
        onCommitSuccess?.();
      } else {
        setError("Failed to commit changes");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsCommitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleCommit();
    }
  };

  const isCommitDisabled = !commitMessage.trim() || stagedFilesCount === 0 || isCommitting;

  if (stagedFilesCount === 0) {
    return null;
  }

  return (
    <div className="border-border border-t bg-secondary-bg">
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GitCommitIcon size={12} className="text-text-lighter" />
            <span className="font-medium text-text text-xs">
              Commit {stagedFilesCount} file{stagedFilesCount !== 1 ? "s" : ""}
            </span>
          </div>
          {/* Quick Fetch action (matches screenshot layout) */}
          {repoPath && (
            <button
              onClick={async () => {
                setIsFetching(true);
                try {
                  await fetchChanges(repoPath);
                } finally {
                  setIsFetching(false);
                }
              }}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1",
                "text-text-lighter hover:bg-hover hover:text-text",
              )}
              title="Fetch"
            >
              <Download size={12} className={isFetching ? "animate-spin" : ""} />
              <span className="text-xs">Fetch</span>
            </button>
          )}
        </div>

        {/* Branch indicator under header */}
        {repoPath && gitStatus?.branch && (
          <div className="mb-2 text-[10px] text-text-lighter">
            {`${repoPath.split("/").pop() || "repo"}/${gitStatus.branch}`}
          </div>
        )}

        {error && (
          <div
            className={cn(
              "mb-2 flex items-center gap-2 rounded border border-red-500 border-opacity-30",
              "bg-red-900 bg-opacity-20 p-2 text-red-400 text-xs",
            )}
          >
            <AlertCircle size={12} />
            {error}
          </div>
        )}

        <div className="space-y-2">
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter commit message"
            className={cn(
              "w-full resize-none border border-border bg-primary-bg px-2 py-1.5",
              "font-mono text-text text-xs focus:border-blue-500 focus:outline-none",
            )}
            rows={3}
            disabled={isCommitting}
          />

          <div className="flex items-center justify-between">
            <div className="text-[9px] text-text-lighter">Ctrl+Enter to commit</div>

            <button
              onClick={handleCommit}
              disabled={isCommitDisabled}
              className={cn(
                "flex items-center gap-1 rounded border px-3 py-1.5",
                "font-mono text-xs transition-colors duration-150",
                isCommitDisabled
                  ? "cursor-not-allowed border-border bg-secondary-bg text-text-lighter"
                  : "border-blue-500 bg-blue-600 text-white hover:bg-blue-700",
              )}
            >
              {isCommitting ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent"></div>
                  Committing...
                </>
              ) : (
                <>
                  <Send size={12} />
                  Commit Tracked
                  <ChevronDown size={12} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitCommitPanel;
