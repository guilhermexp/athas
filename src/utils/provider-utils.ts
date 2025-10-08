import { useApiKeysStore } from "@/stores/api-keys-store";

/**
 * Get API token for a provider
 */
export async function getProviderApiToken(providerId: string): Promise<string | null> {
  const { getApiKey } = useApiKeysStore.getState();
  return getApiKey(providerId);
}
