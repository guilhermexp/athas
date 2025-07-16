import {
  Archive,
  Download,
  GitPullRequest,
  RefreshCw,
  RotateCcw,
  Server,
  Settings,
  Tag,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/utils/cn";
import { discardAllChanges } from "../../utils/git";

interface GitActionsMenuProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  onClose: () => void;
  hasGitRepo: boolean;
  repoPath?: string;
  onRefresh?: () => void;
}

const GitActionsMenu = ({
  isOpen,
  position,
  onClose,
  hasGitRepo,
  repoPath,
  onRefresh,
}: GitActionsMenuProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: () => Promise<boolean>, actionName: string) => {
    if (!repoPath) return;

    setIsLoading(true);
    try {
      const success = await action();
      if (success) {
        console.log(`${actionName} completed successfully`);
        onRefresh?.();
      } else {
        console.error(`${actionName} failed`);
      }
    } catch (error) {
      console.error(`${actionName} error:`, error);
    } finally {
      setIsLoading(false);
    }
    onClose();
  };

  const handlePush = () => {
    // TODO: implement git_push in src-tauri/src/commands/git.rs
    alert("Push functionality is not yet implemented");
    // handleAction(() => pushChanges(repoPath!), "Push");
  };

  const handlePull = () => {
    // TODO: implement git_pull in src-tauri/src/commands/git.rs
    alert("Pull functionality is not yet implemented");
    // handleAction(() => pullChanges(repoPath!), "Pull");
  };

  const handleFetch = () => {
    // TODO: implement git_fetch in src-tauri/src/commands/git.rs
    alert("Fetch functionality is not yet implemented");
    // handleAction(() => fetchChanges(repoPath!), "Fetch");
  };

  const handleDiscardAllChanges = async () => {
    if (!repoPath) return;

    handleAction(() => discardAllChanges(repoPath!), "Discard all changes");
  };

  const handleInitRepository = () => {
    // TODO: implement git_init in src-tauri/src/commands/git.rs
    alert("Initialize repository functionality is not yet implemented");
    // handleAction(() => initRepository(repoPath!), "Initialize repository");
  };

  const handleRefresh = () => {
    onRefresh?.();
    onClose();
  };

  const handleStashManager = () => {
    // TODO: implement git_get_stashes, git_create_stash, git_apply_stash, git_pop_stash, git_drop_stash in src-tauri/src/commands/git.rs
    alert("Stash functionality is not yet implemented");
    // onOpenStashManager?.();
    // onClose();
  };

  const handleRemoteManager = () => {
    // TODO: implement git_get_remotes, git_add_remote, git_remove_remote in src-tauri/src/commands/git.rs
    alert("Remote management functionality is not yet implemented");
    // onOpenRemoteManager?.();
    // onClose();
  };

  const handleTagManager = () => {
    // TODO: implement git_get_tags, git_create_tag, git_delete_tag in src-tauri/src/commands/git.rs
    alert("Tag management functionality is not yet implemented");
    // onOpenTagManager?.();
    // onClose();
  };

  if (!isOpen || !position) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed z-50 min-w-[180px] rounded-md",
        "border border-border bg-secondary-bg py-1 shadow-lg",
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
      onMouseDown={e => {
        e.stopPropagation();
      }}
    >
      {hasGitRepo ? (
        <>
          {/* Basic Git Operations */}
          <button
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
              handlePush();
            }}
            disabled={isLoading}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5",
              "text-left font-mono text-text text-xs hover:bg-hover disabled:opacity-50",
            )}
          >
            <Upload size={12} />
            Push Changes
          </button>

          <button
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
              handlePull();
            }}
            disabled={isLoading}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5",
              "text-left font-mono text-text text-xs hover:bg-hover disabled:opacity-50",
            )}
          >
            <Download size={12} />
            Pull Changes
          </button>

          <button
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
              handleFetch();
            }}
            disabled={isLoading}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5",
              "text-left font-mono text-text text-xs hover:bg-hover disabled:opacity-50",
            )}
          >
            <GitPullRequest size={12} />
            Fetch
          </button>

          <div className="my-1 border-border border-t"></div>

          {/* Advanced Operations */}
          <button
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
              handleStashManager();
            }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5",
              "text-left font-mono text-text text-xs hover:bg-hover",
            )}
          >
            <Archive size={12} />
            Manage Stashes
          </button>

          <button
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
              handleRemoteManager();
            }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5",
              "text-left font-mono text-text text-xs hover:bg-hover",
            )}
          >
            <Server size={12} />
            Manage Remotes
          </button>

          <button
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
              handleTagManager();
            }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5",
              "text-left font-mono text-text text-xs hover:bg-hover",
            )}
          >
            <Tag size={12} />
            Manage Tags
          </button>

          <div className="my-1 border-border border-t"></div>

          {/* Refresh */}
          <button
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
              handleRefresh();
            }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5",
              "text-left font-mono text-text text-xs hover:bg-hover",
            )}
          >
            <RefreshCw size={12} />
            Refresh Status
          </button>

          <div className="my-1 border-border border-t"></div>

          {/* Destructive Operations */}
          <button
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
              handleDiscardAllChanges();
            }}
            disabled={isLoading}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5",
              "text-left font-mono text-red-400 text-xs hover:bg-hover disabled:opacity-50",
            )}
          >
            <RotateCcw size={12} />
            Discard All Changes
          </button>
        </>
      ) : (
        <>
          {/* No Git Repository */}
          <button
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
              handleInitRepository();
            }}
            disabled={isLoading}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5",
              "text-left font-mono text-text text-xs hover:bg-hover disabled:opacity-50",
            )}
          >
            <Settings size={12} />
            Initialize Repository
          </button>

          <div className="my-1 border-border border-t"></div>

          <button
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
              handleRefresh();
            }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5",
              "text-left font-mono text-text text-xs hover:bg-hover",
            )}
          >
            <RefreshCw size={12} />
            Refresh Status
          </button>
        </>
      )}
    </div>
  );
};

export default GitActionsMenu;
