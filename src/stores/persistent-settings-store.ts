import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PersistentSettings {
  // AI Chat Settings
  aiProviderId: string;
  aiModelId: string;

  // Actions
  setAIProvider: (providerId: string) => void;
  setAIModel: (modelId: string) => void;
  setAIProviderAndModel: (providerId: string, modelId: string) => void;
}

export const usePersistentSettingsStore = create<PersistentSettings>()(
  persist(
    set => ({
      // Default values
      aiProviderId: "openai",
      aiModelId: "gpt-4o-mini",

      // Actions
      setAIProvider: providerId => set({ aiProviderId: providerId }),
      setAIModel: modelId => set({ aiModelId: modelId }),
      setAIProviderAndModel: (providerId, modelId) =>
        set({ aiProviderId: providerId, aiModelId: modelId }),
    }),
    {
      name: "athas-persistent-settings",
      version: 1,
    },
  ),
);
