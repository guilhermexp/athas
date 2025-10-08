/**
 * useThreadStorage Hook
 * React hook for managing thread persistence with Tauri filesystem
 */

import { useCallback, useEffect, useState } from "react";
import type { Thread } from "@/components/agent-panel/types";
import {
  deleteThread,
  ensureThreadsDirectory,
  exportThread,
  exportThreadToMarkdown,
  getStorageStats,
  importThread,
  listThreads,
  loadThread,
  saveThread,
  searchThreads,
} from "@/lib/storage/thread-storage";

export interface ThreadListItem {
  id: string;
  title: string;
  createdAt: string;
  lastModified?: string;
  messageCount: number;
}

export interface StorageStats {
  totalThreads: number;
  totalMessages: number;
  oldestThread?: string;
  newestThread?: string;
}

export function useThreadStorage() {
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize storage
   */
  useEffect(() => {
    const init = async () => {
      try {
        await ensureThreadsDirectory();
        await refreshThreadList();
      } catch (err) {
        console.error("Failed to initialize thread storage:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize storage");
      }
    };

    init();
  }, []);

  /**
   * Refresh thread list
   */
  const refreshThreadList = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const threadList = await listThreads();
      setThreads(threadList);
    } catch (err) {
      console.error("Failed to refresh thread list:", err);
      setError(err instanceof Error ? err.message : "Failed to load threads");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Save a thread
   */
  const save = useCallback(
    async (thread: Thread) => {
      try {
        setError(null);
        await saveThread(thread);
        await refreshThreadList();
      } catch (err) {
        console.error("Failed to save thread:", err);
        setError(err instanceof Error ? err.message : "Failed to save thread");
        throw err;
      }
    },
    [refreshThreadList],
  );

  /**
   * Load a thread
   */
  const load = useCallback(async (threadId: string): Promise<Thread | null> => {
    try {
      setError(null);
      return await loadThread(threadId);
    } catch (err) {
      console.error("Failed to load thread:", err);
      setError(err instanceof Error ? err.message : "Failed to load thread");
      return null;
    }
  }, []);

  /**
   * Delete a thread
   */
  const deleteById = useCallback(
    async (threadId: string) => {
      try {
        setError(null);
        await deleteThread(threadId);
        await refreshThreadList();
      } catch (err) {
        console.error("Failed to delete thread:", err);
        setError(err instanceof Error ? err.message : "Failed to delete thread");
        throw err;
      }
    },
    [refreshThreadList],
  );

  /**
   * Search threads
   */
  const search = useCallback(async (query: string) => {
    try {
      setError(null);
      return await searchThreads(query);
    } catch (err) {
      console.error("Failed to search threads:", err);
      setError(err instanceof Error ? err.message : "Failed to search threads");
      return [];
    }
  }, []);

  /**
   * Export thread to JSON
   */
  const exportToJSON = useCallback(async (threadId: string, exportPath: string) => {
    try {
      setError(null);
      await exportThread(threadId, exportPath);
    } catch (err) {
      console.error("Failed to export thread:", err);
      setError(err instanceof Error ? err.message : "Failed to export thread");
      throw err;
    }
  }, []);

  /**
   * Export thread to Markdown
   */
  const exportToMarkdown = useCallback(async (threadId: string, exportPath: string) => {
    try {
      setError(null);
      await exportThreadToMarkdown(threadId, exportPath);
    } catch (err) {
      console.error("Failed to export thread to Markdown:", err);
      setError(err instanceof Error ? err.message : "Failed to export thread");
      throw err;
    }
  }, []);

  /**
   * Import thread from file
   */
  const importFromFile = useCallback(
    async (importPath: string): Promise<string> => {
      try {
        setError(null);
        const threadId = await importThread(importPath);
        await refreshThreadList();
        return threadId;
      } catch (err) {
        console.error("Failed to import thread:", err);
        setError(err instanceof Error ? err.message : "Failed to import thread");
        throw err;
      }
    },
    [refreshThreadList],
  );

  /**
   * Get storage statistics
   */
  const getStats = useCallback(async (): Promise<StorageStats> => {
    try {
      setError(null);
      return await getStorageStats();
    } catch (err) {
      console.error("Failed to get storage stats:", err);
      setError(err instanceof Error ? err.message : "Failed to get storage stats");
      return {
        totalThreads: 0,
        totalMessages: 0,
      };
    }
  }, []);

  return {
    threads,
    isLoading,
    error,
    save,
    load,
    deleteById,
    search,
    exportToJSON,
    exportToMarkdown,
    importFromFile,
    refreshThreadList,
    getStats,
  };
}
