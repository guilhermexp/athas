import { FolderOpen } from "lucide-react";
import { useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { cn } from "@/utils/cn";
import RecentProjectsDialog from "./recent-projects-dialog";

interface ProjectSelectorProps {
  className?: string;
}

const MAX_PROJECT_NAME_LENGTH = 40;

/**
 * ProjectSelector - Componente que mostra o nome do projeto atual
 * Replicado do Zed's title_bar.rs:446-495
 *
 * Funcionalidade:
 * - Mostra o nome do projeto atual truncado se muito longo
 * - Clicável para abrir diálogo de projetos recentes
 * - Estilo sutil com hover state
 */
const ProjectSelector = ({ className }: ProjectSelectorProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const { projectName } = useProjectStore();

  // Trunca o nome do projeto se for muito longo (como no Zed)
  const displayName =
    projectName && projectName !== "Explorer"
      ? truncateAndTrailoff(projectName, MAX_PROJECT_NAME_LENGTH)
      : "Open recent project";

  const isProjectSelected = projectName && projectName !== "Explorer";

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-xs transition-colors",
          "hover:bg-hover/50",
          isProjectSelected ? "text-text" : "text-text-lighter/70",
          className,
        )}
        title="Recent Projects"
        style={{ minHeight: 0, minWidth: 0 }}
      >
        <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span className="max-w-[200px] truncate">{displayName}</span>
      </button>

      <RecentProjectsDialog isOpen={showDialog} onClose={() => setShowDialog(false)} />
    </>
  );
};

/**
 * Utility function to truncate strings with ellipsis
 * Replicado do Zed's util::truncate_and_trailoff
 */
function truncateAndTrailoff(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

export default ProjectSelector;
