import { create } from "zustand";
import { combine } from "zustand/middleware";
import type { GitCommit, GitStatus } from "../utils/git";

interface GitState {
  // Data
  gitStatus: GitStatus | null;
  commits: GitCommit[];
  branches: string[];

  // Loading states
  isLoadingGitData: boolean;
  isRefreshing: boolean;
}

const initialState: GitState = {
  gitStatus: null,
  commits: [],
  branches: [],
  isLoadingGitData: false,
  isRefreshing: false,
};

export const useGitStore = create(
  combine(initialState, (set) => ({
    actions: {
      setGitStatus: (gitStatus: GitStatus | null) => set({ gitStatus }),
      setIsLoadingGitData: (isLoadingGitData: boolean) => set({ isLoadingGitData }),
      setIsRefreshing: (isRefreshing: boolean) => set({ isRefreshing }),
      updateGitData: (data: {
        gitStatus: GitStatus | null;
        commits: GitCommit[];
        branches: string[];
      }) =>
        set({
          gitStatus: data.gitStatus,
          commits: data.commits,
          branches: data.branches,
        }),
    },
  })),
);
