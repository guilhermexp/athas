import { AlertTriangle, GitBranch, SquareDot, SquareMinus, SquarePlus } from "lucide-react";
import React, { useState } from "react";
import { cn } from "@/utils/cn";
import { useGitStore } from "@/version-control/git/controllers/git-store";
import BranchSelectorDialog from "./branch-selector-dialog";

interface BranchSelectorProps {
  className?: string;
}

const MAX_BRANCH_NAME_LENGTH = 40;
const _MAX_SHORT_SHA_LENGTH = 8;

/**
 * BranchSelector - Componente que mostra a branch atual do Git
 * Replicado do Zed's title_bar.rs:497-561
 *
 * Funcionalidade:
 * - Mostra o nome da branch atual ou SHA do commit (detached HEAD)
 * - Ícone indica status do repositório (modificado, adicionado, conflito, etc)
 * - Clicável para abrir diálogo de seleção de branches
 * - Tooltip com meta info "Local branches only"
 */
const BranchSelector = ({ className }: BranchSelectorProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const { gitStatus } = useGitStore();

  if (!gitStatus) {
    return null;
  }

  // Pega o nome da branch e trunca se necessário
  const branchName = gitStatus.branch
    ? truncateAndTrailoff(gitStatus.branch, MAX_BRANCH_NAME_LENGTH)
    : null;

  // Calcula o status do repositório para determinar o ícone
  const { icon, iconColor } = getRepositoryStatus(gitStatus);

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-xs transition-colors",
          "hover:bg-hover/50",
          "text-text-lighter",
          className,
        )}
        title="Recent Branches (Local branches only)"
        style={{ minHeight: 0, minWidth: 0 }}
      >
        {React.createElement(icon, {
          className: cn("h-3.5 w-3.5", iconColor),
          strokeWidth: 1.5,
        })}
        <span className="max-w-[200px] truncate">{branchName || "detached"}</span>
      </button>

      <BranchSelectorDialog isOpen={showDialog} onClose={() => setShowDialog(false)} />
    </>
  );
};

/**
 * Determina o ícone e cor baseado no status do repositório
 * Replicado do Zed's title_bar.rs:537-559
 */
function getRepositoryStatus(gitStatus: any): {
  icon: any;
  iconColor: string;
} {
  const files = gitStatus.files || [];

  // Conta arquivos por status
  const modified = files.filter((f: any) => f.status === "modified").length;
  const added = files.filter((f: any) => f.status === "added").length;
  const deleted = files.filter((f: any) => f.status === "deleted").length;
  const untracked = files.filter((f: any) => f.status === "untracked").length;
  const conflict = files.filter((f: any) => f.status === "conflict").length;

  if (conflict > 0) {
    return {
      icon: AlertTriangle,
      iconColor: "text-red-500", // VersionControlConflict
    };
  }

  if (modified > 0) {
    return {
      icon: SquareDot,
      iconColor: "text-yellow-500", // VersionControlModified
    };
  }

  if (added > 0 || untracked > 0) {
    return {
      icon: SquarePlus,
      iconColor: "text-green-500", // VersionControlAdded
    };
  }

  if (deleted > 0) {
    return {
      icon: SquareMinus,
      iconColor: "text-red-500", // VersionControlDeleted
    };
  }

  // Status limpo
  return {
    icon: GitBranch,
    iconColor: "text-text-lighter",
  };
}

/**
 * Utility function to truncate strings with ellipsis
 */
function truncateAndTrailoff(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

export default BranchSelector;
