import { create } from "zustand";
import { combine } from "zustand/middleware";
import type { FileEntry } from "../types/app";

const initialState = {
  projectName: "Explorer",
  rootFolderPath: undefined as string | undefined,
  files: [] as FileEntry[],
  allProjectFiles: [] as FileEntry[],
};

export const useProjectStore = create(
  combine(initialState, (set, get) => ({
    setProjectName: (name: string) => set({ projectName: name }),
    setRootFolderPath: (path: string | undefined) => set({ rootFolderPath: path }),
    setFiles: (files: FileEntry[]) => set({ files }),
    setAllProjectFiles: (files: FileEntry[]) => set({ allProjectFiles: files }),

    getProjectName: () => {
      const { rootFolderPath } = get();
      if (!rootFolderPath) return "Explorer";

      const normalizedPath = rootFolderPath.replace(/\\/g, "/");
      const folderName = normalizedPath.split("/").pop();
      return folderName || "Folder";
    },

    reset: () => set(initialState),
  })),
);
