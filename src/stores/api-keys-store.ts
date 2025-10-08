import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ApiKeysState {
  apiKeys: Record<string, string>;
  saveApiKey: (providerId: string, apiKey: string) => Promise<boolean>;
  removeApiKey: (providerId: string) => Promise<void>;
  hasProviderApiKey: (providerId: string) => boolean;
  getApiKey: (providerId: string) => string | null;
}

export const useApiKeysStore = create<ApiKeysState>()(
  persist(
    (set, get) => ({
      apiKeys: {},

      saveApiKey: async (providerId: string, apiKey: string) => {
        try {
          await invoke("save_api_key", { providerId, apiKey });
          set((state) => ({
            apiKeys: { ...state.apiKeys, [providerId]: apiKey },
          }));
          return true;
        } catch (error) {
          console.error("Failed to save API key:", error);
          return false;
        }
      },

      removeApiKey: async (providerId: string) => {
        try {
          await invoke("remove_api_key", { providerId });
          set((state) => {
            const newKeys = { ...state.apiKeys };
            delete newKeys[providerId];
            return { apiKeys: newKeys };
          });
        } catch (error) {
          console.error("Failed to remove API key:", error);
          throw error;
        }
      },

      hasProviderApiKey: (providerId: string) => {
        return !!get().apiKeys[providerId];
      },

      getApiKey: (providerId: string) => {
        return get().apiKeys[providerId] || null;
      },
    }),
    {
      name: "api-keys-storage",
    },
  ),
);
