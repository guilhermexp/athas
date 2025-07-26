import { create } from "zustand";
import { createSelectors } from "@/utils/zustand-selectors";

interface SidebarState {
  activeBufferPath?: string;
  coreFeatures: {
    search: boolean;
    git: boolean;
    remote: boolean;
  };
  isRemoteWindow: boolean;
  remoteConnectionName?: string;
}

const useSidebarStoreBase = create<SidebarState>()(() => ({
  coreFeatures: {
    search: true,
    git: true,
    remote: true,
  },
  isRemoteWindow: false,
}));

export const useSidebarStore = createSelectors(useSidebarStoreBase);
