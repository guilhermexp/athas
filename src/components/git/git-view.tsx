import { useState, useEffect } from "react";
import {
  GitBranch,
  GitCommit as GitCommitIcon,
  Plus,
  Minus,
  RotateCcw,
  Check,
  FileIcon,
  FilePlus,
  FileX,
  Edit3,
  RefreshCw,
  Clock,
  ChevronDown,
  Trash2,
  Upload,
  Download,
  GitPullRequest,
  Settings,
} from "lucide-react";
import {
  getGitStatus,
  stageFile,
  unstageFile,
  stageAllFiles,
  unstageAllFiles,
  commitChanges,
  getGitLog,
  getBranches,
  checkoutBranch,
  createBranch,
  deleteBranch,
  getFileDiff,
  getCommitDiff,
  GitFile,
  GitStatus,
  GitCommit,
} from "../../utils/git";
import { safeLocalStorageSetItem, truncateJsonArrayData } from "../../utils/storage";

// Import modular components
import GitStatusPanel from "./git-status-panel";
import GitBranchManager from "./git-branch-manager";
import GitCommitHistory from "./git-commit-history";
import GitActionsMenu from "./git-actions-menu";
import GitCommitPanel from "./git-commit-panel";
import GitStashManager from "./git-stash-manager";

interface GitViewProps {
  repoPath?: string;
  onFileSelect?: (path: string, isDir: boolean) => void;
}

const GitView = ({ repoPath, onFileSelect }: GitViewProps) => {
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [showGitActionsMenu, setShowGitActionsMenu] = useState(false);
  const [gitActionsMenuPosition, setGitActionsMenuPosition] = useState<{x: number, y: number} | null>(null);
  
  // Modal states
  const [showStashManager, setShowStashManager] = useState(false);

  // Load Git status, commits, and branches
  const loadGitData = async () => {
    if (!repoPath) return;

    setIsLoading(true);
    try {
      const [status, commits, branches] = await Promise.all([
        getGitStatus(repoPath),
        getGitLog(repoPath, 50), // Limit to 50 recent commits
        getBranches(repoPath),
      ]);
      setGitStatus(status);
      setCommits(commits);
      setBranches(branches);
    } catch (error) {
      console.error("Failed to load git data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load git status on mount and when repo path changes
  useEffect(() => {
    loadGitData();
  }, [repoPath]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showBranchDropdown) {
        setShowBranchDropdown(false);
      }
      if (showGitActionsMenu) {
        setShowGitActionsMenu(false);
        setGitActionsMenuPosition(null);
      }
    };

    if (showBranchDropdown || showGitActionsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showBranchDropdown, showGitActionsMenu]);

  const handleStageFile = async (filePath: string) => {
    if (!repoPath) return;

    const success = await stageFile(repoPath, filePath);
    if (success) {
      await loadGitData();
    }
  };

  const handleUnstageFile = async (filePath: string) => {
    if (!repoPath) return;

    const success = await unstageFile(repoPath, filePath);
    if (success) {
      await loadGitData();
    }
  };

  const handleStageAll = async () => {
    if (!repoPath) return;

    const success = await stageAllFiles(repoPath);
    if (success) {
      await loadGitData();
    }
  };

  const handleUnstageAll = async () => {
    if (!repoPath) return;

    const success = await unstageAllFiles(repoPath);
    if (success) {
      await loadGitData();
    }
  };

  const handleCommit = async () => {
    if (!repoPath || !commitMessage.trim()) return;

    const success = await commitChanges(repoPath, commitMessage.trim());
    if (success) {
      setCommitMessage("");
      await loadGitData();
    }
  };

  const handleBranchChange = async (branchName: string) => {
    if (!repoPath || !branchName) return;

    const success = await checkoutBranch(repoPath, branchName);
    if (success) {
      setShowBranchDropdown(false);
      await loadGitData();
    }
  };

  const handleCreateBranch = async () => {
    if (!repoPath || !newBranchName.trim()) return;

    const success = await createBranch(
      repoPath,
      newBranchName.trim(),
      gitStatus?.branch,
    );
    if (success) {
      setNewBranchName("");
      setIsCreatingBranch(false);
      await loadGitData();
    }
  };

  const handleDeleteBranch = async (branchName: string) => {
    if (!repoPath || !branchName || branchName === gitStatus?.branch) return;

    const success = await deleteBranch(repoPath, branchName);
    if (success) {
      await loadGitData();
    }
  };

  // Additional Git Actions
  const handlePush = async () => {
    if (!repoPath) return;
    try {
      // Implement push functionality
      console.log("Pushing changes...");
      // await pushChanges(repoPath);
      await loadGitData();
    } catch (error) {
      console.error("Failed to push:", error);
    }
  };

  const handlePull = async () => {
    if (!repoPath) return;
    try {
      // Implement pull functionality
      console.log("Pulling changes...");
      // await pullChanges(repoPath);
      await loadGitData();
    } catch (error) {
      console.error("Failed to pull:", error);
    }
  };

  const handleFetch = async () => {
    if (!repoPath) return;
    try {
      // Implement fetch functionality
      console.log("Fetching changes...");
      // await fetchChanges(repoPath);
      await loadGitData();
    } catch (error) {
      console.error("Failed to fetch:", error);
    }
  };

  const handleDiscardAllChanges = async () => {
    if (!repoPath) return;
    const confirmed = confirm("Are you sure you want to discard all changes? This cannot be undone.");
    if (!confirmed) return;
    
    try {
      // Implement discard all functionality
      console.log("Discarding all changes...");
      // await discardAllChanges(repoPath);
      await loadGitData();
    } catch (error) {
      console.error("Failed to discard changes:", error);
    }
  };

  const handleInitRepository = async () => {
    if (!repoPath) return;
    try {
      // Implement git init functionality
      console.log("Initializing repository...");
      // await initRepository(repoPath);
      await loadGitData();
    } catch (error) {
      console.error("Failed to initialize repository:", error);
    }
  };

  const handleViewFileDiff = async (filePath: string, staged: boolean = false) => {
    if (!repoPath || !onFileSelect) return;

    try {
      const diff = await getFileDiff(repoPath, filePath, staged);

      if (diff && diff.lines.length > 0) {
        const diffFileName = `${filePath.split("/").pop()}.diff`;
        const virtualPath = `diff://${staged ? "staged" : "unstaged"}/${diffFileName}`;
        const diffJson = JSON.stringify(diff);

        const success = safeLocalStorageSetItem(`diff-content-${virtualPath}`, diffJson, {
          clearPrefix: 'diff-content-',
          truncateData: (data) => truncateJsonArrayData(data, 1000),
          onSuccess: () => {
            onFileSelect(virtualPath, false);
          },
          onTruncated: (originalSize, truncatedSize) => {
            onFileSelect(virtualPath, false);
            alert(`File diff was too large and has been truncated to the first 1000 lines.\nOriginal diff had ${diff.lines.length} lines.`);
          },
          onQuotaExceeded: (error) => {
            alert(`Failed to display diff: The file diff is too large to display.\nFile: ${filePath}\nTry viewing smaller portions of the file.`);
          }
        });
        
        if (!success) {
          console.error('Failed to store file diff');
        }
      } else {
        alert(`No ${staged ? 'staged' : 'unstaged'} changes for this file.`);
      }
    } catch (error) {
      console.error("Error getting file diff:", error);
      alert(`Failed to get diff for ${filePath}:\n${error}`);
    }
  };

  const handleViewCommitDiff = async (commitHash: string, filePath?: string) => {
    if (!repoPath || !onFileSelect) return;

    try {
      const diffs = await getCommitDiff(repoPath, commitHash, filePath);
      
      if (diffs.length > 0) {
        const diff = diffs[0]; // For now, show first diff or specific file
        const diffFileName = `${diff.file_path.split("/").pop()}.diff`;
        const virtualPath = `diff://commit/${commitHash}/${diffFileName}`;
        const diffJson = JSON.stringify(diff);
        
        const success = safeLocalStorageSetItem(`diff-content-${virtualPath}`, diffJson, {
          clearPrefix: 'diff-content-',
          truncateData: (data) => truncateJsonArrayData(data, 1000),
          onSuccess: () => {
            onFileSelect(virtualPath, false);
          },
          onTruncated: (originalSize, truncatedSize) => {
            onFileSelect(virtualPath, false);
            alert(`Diff was too large and has been truncated to the first 1000 lines.\nOriginal diff had ${diff.lines.length} lines.`);
          },
          onQuotaExceeded: (error) => {
            alert(`Failed to display diff: The commit diff is too large to display.\nCommit: ${commitHash}\nConsider viewing individual files instead.`);
          }
        });
        
        if (!success) {
          console.error('Failed to store commit diff');
        }
      } else {
        alert(`No changes in this commit for the specified file.`);
      }
    } catch (error) {
      console.error("Error getting commit diff:", error);
      alert(`Failed to get diff for commit ${commitHash}:\n${error}`);
    }
  };

  const getFileIcon = (file: GitFile) => {
    switch (file.status) {
      case "added":
        return <FilePlus size={10} className="text-[var(--text-color)]" />;
      case "deleted":
        return <FileX size={10} className="text-[var(--text-color)]" />;
      case "modified":
        return <Edit3 size={10} className="text-[var(--text-color)]" />;
      case "untracked":
        return <FileIcon size={10} className="text-[var(--text-lighter)]" />;
      case "renamed":
        return <RotateCcw size={10} className="text-[var(--text-color)]" />;
      default:
        return <FileIcon size={10} className="text-[var(--text-lighter)]" />;
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

  const renderGitButton = () => (
    <button
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setGitActionsMenuPosition({
          x: rect.left,
          y: rect.bottom + 5,
        });
        setShowGitActionsMenu(!showGitActionsMenu);
        setShowBranchDropdown(false);
      }}
      className="flex items-center gap-1 text-xs text-[var(--text-color)] font-medium hover:bg-[var(--hover-color)] px-2 py-1.5 rounded cursor-pointer"
      title="Git Actions"
    >
      <GitBranch size={12} className="text-[var(--text-lighter)]" />
      <span>Git</span>
    </button>
  );

  const renderGitActionsMenu = () => (
    showGitActionsMenu && gitActionsMenuPosition && (
      <div
        className="fixed bg-[var(--secondary-bg)] border border-[var(--border-color)] rounded-md shadow-lg z-50 py-1 min-w-[180px]"
        style={{
          left: gitActionsMenuPosition.x,
          top: gitActionsMenuPosition.y,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        {gitStatus && (
          <>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePush();
                setShowGitActionsMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs font-mono text-[var(--text-color)] hover:bg-[var(--hover-color)] flex items-center gap-2"
            >
              <Upload size={12} />
              Push Changes
            </button>
            
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePull();
                setShowGitActionsMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs font-mono text-[var(--text-color)] hover:bg-[var(--hover-color)] flex items-center gap-2"
            >
              <Download size={12} />
              Pull Changes
            </button>
            
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFetch();
                setShowGitActionsMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs font-mono text-[var(--text-color)] hover:bg-[var(--hover-color)] flex items-center gap-2"
            >
              <GitPullRequest size={12} />
              Fetch
            </button>
            
            <div className="border-t border-[var(--border-color)] my-1"></div>
            
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDiscardAllChanges();
                setShowGitActionsMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs font-mono text-red-400 hover:bg-[var(--hover-color)] flex items-center gap-2"
            >
              <RotateCcw size={12} />
              Discard All Changes
            </button>
          </>
        )}
        
        {!gitStatus && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleInitRepository();
              setShowGitActionsMenu(false);
            }}
            className="w-full text-left px-3 py-1.5 text-xs font-mono text-[var(--text-color)] hover:bg-[var(--hover-color)] flex items-center gap-2"
          >
            <Settings size={12} />
            Initialize Repository
          </button>
        )}
      </div>
    )
  );

  if (!repoPath) {
    return (
      <>
        <div className="flex flex-col h-full bg-[var(--secondary-bg)]">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-color)]">
            {renderGitButton()}
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-[var(--text-lighter)] font-mono text-xs">
              <div className="mb-1">No Git repository detected</div>
              <div className="text-[10px] opacity-75">
                Open a Git project folder
              </div>
            </div>
          </div>
        </div>
        {renderGitActionsMenu()}
      </>
    );
  }

  if (isLoading && !gitStatus) {
    return (
      <>
        <div className="flex flex-col h-full bg-[var(--secondary-bg)]">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-color)]">
            {renderGitButton()}
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-[var(--text-lighter)] font-mono text-xs">
              Loading Git status...
            </div>
          </div>
        </div>
        {renderGitActionsMenu()}
      </>
    );
  }

  if (!gitStatus) {
    return (
      <>
        <div className="flex flex-col h-full bg-[var(--secondary-bg)]">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-color)]">
            {renderGitButton()}
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-[var(--text-lighter)] font-mono text-xs">
              <div className="mb-1">Not a Git repository</div>
              <div className="text-[10px] opacity-75">
                Initialize with: git init
              </div>
            </div>
          </div>
        </div>
        {renderGitActionsMenu()}
      </>
    );
  }

  const stagedFiles = gitStatus.files.filter((f) => f.staged);
  const unstagedFiles = gitStatus.files.filter((f) => !f.staged);

  return (
    <>
      <div className="flex flex-col h-full bg-[var(--secondary-bg)] font-mono text-xs">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-color)]">
          {renderGitButton()}
          
          <GitBranchManager
            currentBranch={gitStatus.branch}
            repoPath={repoPath}
            onBranchChange={loadGitData}
          />

          {(gitStatus.ahead > 0 || gitStatus.behind > 0) && (
            <span className="text-[10px] text-[var(--text-lighter)]">
              {gitStatus.ahead > 0 && `↑${gitStatus.ahead}`}
              {gitStatus.ahead > 0 && gitStatus.behind > 0 && " "}
              {gitStatus.behind > 0 && `↓${gitStatus.behind}`}
            </span>
          )}

          <div className="flex-1" />

          <button
            onClick={loadGitData}
            disabled={isLoading}
            className="p-1 text-[var(--text-lighter)] hover:text-[var(--text-color)] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={10} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hidden">
          <GitStatusPanel
            files={gitStatus.files}
            onFileSelect={handleViewFileDiff}
            onRefresh={loadGitData}
            repoPath={repoPath}
          />

          <GitCommitHistory
            commits={commits}
            onViewCommitDiff={handleViewCommitDiff}
            repoPath={repoPath}
          />
        </div>

        {/* Commit Panel */}
        <GitCommitPanel
          stagedFilesCount={stagedFiles.length}
          repoPath={repoPath}
          onCommitSuccess={loadGitData}
        />
      </div>

      {/* Menus and Modals */}
      <GitActionsMenu
        isOpen={showGitActionsMenu}
        position={gitActionsMenuPosition}
        onClose={() => {
          setShowGitActionsMenu(false);
          setGitActionsMenuPosition(null);
        }}
        hasGitRepo={!!gitStatus}
        repoPath={repoPath}
        onRefresh={loadGitData}
        onOpenStashManager={() => setShowStashManager(true)}
      />

      <GitStashManager
        isOpen={showStashManager}
        onClose={() => setShowStashManager(false)}
        repoPath={repoPath}
        onRefresh={loadGitData}
      />
    </>
  );
};

export default GitView;
