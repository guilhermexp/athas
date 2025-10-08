import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentProject {
  path: string;
  name: string;
  lastOpened: number;
}

interface RecentProjectsState {
  recentProjects: RecentProject[];
  addProject: (project: RecentProject) => void;
  removeProject: (path: string) => void;
  clearProjects: () => void;
}

const MAX_RECENT_PROJECTS = 10;

/**
 * Store de projetos recentes
 * Mantém histórico dos últimos projetos abertos
 * Persiste no localStorage
 */
export const useRecentProjectsStore = create<RecentProjectsState>()(
  persist(
    (set, _get) => ({
      recentProjects: [],

      addProject: (project: RecentProject) => {
        set((state) => {
          // Remove projeto se já existir
          const filtered = state.recentProjects.filter((p) => p.path !== project.path);

          // Adiciona no início e limita tamanho
          const updated = [project, ...filtered].slice(0, MAX_RECENT_PROJECTS);

          return { recentProjects: updated };
        });
      },

      removeProject: (path: string) => {
        set((state) => ({
          recentProjects: state.recentProjects.filter((p) => p.path !== path),
        }));
      },

      clearProjects: () => {
        set({ recentProjects: [] });
      },
    }),
    {
      name: "recent-projects-storage",
    },
  ),
);
