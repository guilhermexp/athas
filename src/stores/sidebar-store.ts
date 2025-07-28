import { create } from "zustand";
import { createSelectors } from "@/utils/zustand-selectors";

interface SidebarState {
  activeBufferPath?: string;
  isRemoteWindow: boolean;
  remoteConnectionName?: string;
}

const useSidebarStoreBase = create<SidebarState>()(() => ({
  isRemoteWindow: false,
}));

export const useSidebarStore = createSelectors(useSidebarStoreBase);
