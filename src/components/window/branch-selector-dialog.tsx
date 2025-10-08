import { Dialog, DialogPanel } from "@headlessui/react";
import { Check, GitBranch, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { cn } from "@/utils/cn";
import { checkoutBranch, createStash, getBranches } from "@/version-control/git/controllers/git";
import { useGitStore } from "@/version-control/git/controllers/git-store";

interface BranchSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * BranchSelectorDialog - Modal para selecionar e trocar branches
 * Replicado do comportamento do Zed quando clica no nome da branch
 *
 * Funcionalidades:
 * - Lista todas as branches locais
 * - Marca a branch atual
 * - Permite trocar de branch
 * - Oferece opção de stash se houver alterações não commitadas
 * - Keyboard navigation
 */
const BranchSelectorDialog = ({ isOpen, onClose }: BranchSelectorDialogProps) => {
  const { gitStatus } = useGitStore();
  const { rootFolderPath } = useProjectStore();
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen && rootFolderPath) {
      loadBranches();
    }
  }, [isOpen, rootFolderPath]);

  useEffect(() => {
    if (isOpen && gitStatus?.branch) {
      const currentBranchIndex = filteredBranches.findIndex((b) => b === gitStatus.branch);
      if (currentBranchIndex >= 0) {
        setSelectedIndex(currentBranchIndex);
      }
    }
  }, [isOpen, branches, gitStatus?.branch, searchQuery]);

  const loadBranches = async () => {
    if (!rootFolderPath) return;

    try {
      const branchList = await getBranches(rootFolderPath);
      setBranches(branchList);
    } catch (error) {
      console.error("Failed to load branches:", error);
    }
  };

  const handleCheckoutBranch = async (branchName: string) => {
    if (!rootFolderPath || branchName === gitStatus?.branch) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      const result = await checkoutBranch(rootFolderPath, branchName);

      if (result.hasChanges) {
        // Se houver mudanças não commitadas, perguntar se quer fazer stash
        const shouldStash = confirm(
          `You have uncommitted changes. Do you want to stash them before switching to "${branchName}"?`,
        );

        if (shouldStash) {
          const stashSuccess = await createStash(
            rootFolderPath,
            `Auto-stash before switching to ${branchName}`,
            true,
          );

          if (stashSuccess) {
            const retryResult = await checkoutBranch(rootFolderPath, branchName);
            if (retryResult.success) {
              onClose();
              // Trigger git refresh
              window.dispatchEvent(new CustomEvent("refresh-git-data"));
            }
          }
        }
      } else if (result.success) {
        onClose();
        // Trigger git refresh
        window.dispatchEvent(new CustomEvent("refresh-git-data"));
      }
    } catch (error) {
      console.error("Error checking out branch:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBranches = branches.filter((branch) =>
    branch.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredBranches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filteredBranches[selectedIndex]) {
      e.preventDefault();
      handleCheckoutBranch(filteredBranches[selectedIndex]);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[9999]">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

      {/* Dialog Container */}
      <div className="fixed inset-0 flex items-start justify-center pt-[20vh]">
        <DialogPanel
          className={cn(
            "w-full max-w-xl rounded-lg border border-border bg-secondary-bg shadow-2xl",
            "fade-in-0 zoom-in-95 animate-in duration-200",
          )}
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-border border-b px-4 py-3">
            <div>
              <h2 className="font-semibold text-sm text-text">Switch Branch</h2>
              <p className="text-text-lighter/70 text-xs">Local branches only</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-text-lighter transition-colors hover:bg-hover hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="border-border border-b p-2">
            <input
              type="text"
              placeholder="Search branches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full rounded-md border border-border bg-primary-bg px-3 py-2 text-sm",
                "text-text placeholder:text-text-lighter/50",
                "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
              )}
              autoFocus
            />
          </div>

          {/* Content */}
          <div className="max-h-[50vh] overflow-y-auto p-2">
            {filteredBranches.length > 0 ? (
              <div className="space-y-0.5">
                {filteredBranches.map((branch, index) => {
                  const isCurrentBranch = branch === gitStatus?.branch;
                  const isSelected = selectedIndex === index;

                  return (
                    <button
                      key={branch}
                      onClick={() => handleCheckoutBranch(branch)}
                      disabled={isLoading}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                        isSelected
                          ? "bg-hover/80 text-text"
                          : "text-text-lighter hover:bg-hover/50 hover:text-text",
                        isLoading && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <GitBranch className="h-4 w-4 flex-shrink-0" />
                      <span className="min-w-0 flex-1 truncate font-medium text-sm">{branch}</span>
                      {isCurrentBranch && (
                        <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-text-lighter">
                {searchQuery ? "No branches match your search" : "No branches found"}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="border-border border-t px-4 py-2 text-center text-text-lighter/70 text-xs">
            <span className="font-mono">↑↓</span> Navigate ·{" "}
            <span className="font-mono">Enter</span> Switch · <span className="font-mono">Esc</span>{" "}
            Close
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default BranchSelectorDialog;
