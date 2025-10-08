import { Dialog, DialogPanel } from "@headlessui/react";
import { open } from "@tauri-apps/plugin-dialog";
import { Clock, FolderOpen, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { useRecentProjectsStore } from "@/stores/recent-projects-store";
import { cn } from "@/utils/cn";

interface RecentProjectsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * RecentProjectsDialog - Modal para selecionar projetos recentes
 * Replicado do comportamento do Zed quando clica no nome do projeto
 *
 * Funcionalidades:
 * - Lista projetos recentes ordenados por último acesso
 * - Permite abrir um projeto existente
 * - Permite abrir nova pasta
 * - Keyboard navigation (Enter para selecionar, Esc para fechar)
 */
const RecentProjectsDialog = ({ isOpen, onClose }: RecentProjectsDialogProps) => {
  const { recentProjects, addProject } = useRecentProjectsStore();
  const { setRootFolderPath, setProjectName } = useProjectStore();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleOpenFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Open Project Folder",
      });

      if (selected && typeof selected === "string") {
        // Adiciona aos projetos recentes
        const folderName = selected.split("/").pop() || "Folder";
        addProject({
          path: selected,
          name: folderName,
          lastOpened: Date.now(),
        });

        // Atualiza o projeto atual
        setRootFolderPath(selected);
        setProjectName(folderName);

        onClose();
      }
    } catch (error) {
      console.error("Error opening folder:", error);
    }
  };

  const handleSelectProject = (projectPath: string, projectName: string) => {
    setRootFolderPath(projectPath);
    setProjectName(projectName);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, recentProjects.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex === recentProjects.length) {
        handleOpenFolder();
      } else {
        const project = recentProjects[selectedIndex];
        handleSelectProject(project.path, project.name);
      }
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
            <h2 className="font-semibold text-sm text-text">Recent Projects</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-text-lighter transition-colors hover:bg-hover hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {/* Recent projects */}
            {recentProjects.length > 0 ? (
              <div className="space-y-0.5">
                {recentProjects.map((project, index) => (
                  <button
                    key={project.path}
                    onClick={() => handleSelectProject(project.path, project.name)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                      selectedIndex === index
                        ? "bg-hover/80 text-text"
                        : "text-text-lighter hover:bg-hover/50 hover:text-text",
                    )}
                  >
                    <FolderOpen className="h-4 w-4 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-sm">{project.name}</div>
                      <div className="truncate text-text-lighter text-xs">{project.path}</div>
                    </div>
                    <Clock className="h-3.5 w-3.5 flex-shrink-0 text-text-lighter/50" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-text-lighter">No recent projects</div>
            )}

            {/* Open folder button */}
            <div className="mt-2 border-border border-t pt-2">
              <button
                onClick={handleOpenFolder}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                  selectedIndex === recentProjects.length
                    ? "bg-hover/80 text-text"
                    : "text-text-lighter hover:bg-hover/50 hover:text-text",
                )}
              >
                <FolderOpen className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium text-sm">Open Folder...</span>
              </button>
            </div>
          </div>

          {/* Footer hint */}
          <div className="border-border border-t px-4 py-2 text-center text-text-lighter/70 text-xs">
            <span className="font-mono">↑↓</span> Navigate ·{" "}
            <span className="font-mono">Enter</span> Select · <span className="font-mono">Esc</span>{" "}
            Close
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default RecentProjectsDialog;
