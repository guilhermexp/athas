import { create } from "zustand";
import { combine } from "zustand/middleware";

const initialState = {
  activeBufferPath: undefined as string | undefined,
  coreFeatures: {
    search: true,
    git: true,
    remote: true,
  },
  isRemoteWindow: false,
  remoteConnectionName: undefined as string | undefined,
};

export const useSidebarStore = create(
  combine(initialState, set => ({
    setActiveBufferPath: (path: string | undefined) => set({ activeBufferPath: path }),
    setCoreFeatures: (features: { search: boolean; git: boolean; remote: boolean }) =>
      set({ coreFeatures: features }),
    updateCoreFeature: (feature: keyof typeof initialState.coreFeatures, enabled: boolean) =>
      set(state => ({
        coreFeatures: {
          ...state.coreFeatures,
          [feature]: enabled,
        },
      })),
    setIsRemoteWindow: (isRemote: boolean) => set({ isRemoteWindow: isRemote }),
    setRemoteConnectionName: (name: string | undefined) => set({ remoteConnectionName: name }),
  })),
);
