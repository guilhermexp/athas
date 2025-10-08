/**
 * Thread Storage - Tauri Filesystem-based persistence
 * Replaces localStorage with proper filesystem storage
 */

import { appConfigDir } from "@tauri-apps/api/path";
import { exists, mkdir, readDir, readTextFile, remove, writeTextFile } from "@tauri-apps/plugin-fs";
import type { MessageContent, Thread, ThreadMessage } from "@/components/agent-panel/types";

const THREADS_DIR = "threads";
const THREAD_FILE_EXT = ".json";

/**
 * Get the threads directory path
 */
async function getThreadsDir(): Promise<string> {
  const configDir = await appConfigDir();
  return `${configDir}${THREADS_DIR}`;
}

/**
 * Ensure threads directory exists
 */
export async function ensureThreadsDirectory(): Promise<void> {
  try {
    const threadsDir = await getThreadsDir();
    const dirExists = await exists(threadsDir);

    if (!dirExists) {
      await mkdir(threadsDir, { recursive: true });
      console.log(`Created threads directory: ${threadsDir}`);
    }
  } catch (error) {
    console.error("Failed to ensure threads directory:", error);
    throw error;
  }
}

/**
 * Get thread file path
 */
async function getThreadFilePath(threadId: string): Promise<string> {
  const threadsDir = await getThreadsDir();
  return `${threadsDir}/${threadId}${THREAD_FILE_EXT}`;
}

/**
 * Save thread to filesystem
 */
export async function saveThread(thread: Thread): Promise<void> {
  try {
    await ensureThreadsDirectory();
    const filePath = await getThreadFilePath(thread.id);

    // Add metadata
    const threadData = {
      ...thread,
      lastModified: new Date().toISOString(),
    };

    const content = JSON.stringify(threadData, null, 2);
    await writeTextFile(filePath, content);

    console.log(`Saved thread ${thread.id} to filesystem`);
  } catch (error) {
    console.error(`Failed to save thread ${thread.id}:`, error);
    throw error;
  }
}

/**
 * Load thread from filesystem
 */
export async function loadThread(threadId: string): Promise<Thread | null> {
  try {
    const filePath = await getThreadFilePath(threadId);
    const fileExists = await exists(filePath);

    if (!fileExists) {
      return null;
    }

    const content = await readTextFile(filePath);
    const thread = JSON.parse(content) as Thread;

    return thread;
  } catch (error) {
    console.error(`Failed to load thread ${threadId}:`, error);
    return null;
  }
}

/**
 * Delete thread from filesystem
 */
export async function deleteThread(threadId: string): Promise<void> {
  try {
    const filePath = await getThreadFilePath(threadId);
    const fileExists = await exists(filePath);

    if (fileExists) {
      await remove(filePath);
      console.log(`Deleted thread ${threadId}`);
    }
  } catch (error) {
    console.error(`Failed to delete thread ${threadId}:`, error);
    throw error;
  }
}

/**
 * List all threads
 */
export async function listThreads(): Promise<
  Array<{
    id: string;
    title: string;
    createdAt: string;
    lastModified?: string;
    messageCount: number;
  }>
> {
  try {
    await ensureThreadsDirectory();
    const threadsDir = await getThreadsDir();
    const entries = await readDir(threadsDir);

    const threads = await Promise.all(
      entries
        .filter((entry) => entry.name.endsWith(THREAD_FILE_EXT))
        .map(async (entry) => {
          try {
            const content = await readTextFile(`${threadsDir}/${entry.name}`);
            const thread = JSON.parse(content) as Thread & { lastModified?: string };

            return {
              id: thread.id,
              title: thread.title,
              createdAt:
                typeof thread.createdAt === "string"
                  ? thread.createdAt
                  : thread.createdAt.toISOString(),
              lastModified: thread.lastModified,
              messageCount: thread.messages.length,
            };
          } catch (error) {
            console.error(`Failed to read thread ${entry.name}:`, error);
            return null;
          }
        }),
    );

    // Filter out failed reads and sort by last modified
    return threads
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .sort((a, b) => {
        const aTime = new Date(a.lastModified || a.createdAt).getTime();
        const bTime = new Date(b.lastModified || b.createdAt).getTime();
        return bTime - aTime; // Most recent first
      });
  } catch (error) {
    console.error("Failed to list threads:", error);
    return [];
  }
}

/**
 * Search threads by content
 */
export async function searchThreads(query: string): Promise<
  Array<{
    id: string;
    title: string;
    createdAt: string;
    matchedMessages: number;
  }>
> {
  try {
    const allThreads = await listThreads();
    const results: Array<{
      id: string;
      title: string;
      createdAt: string;
      matchedMessages: number;
    }> = [];

    const lowerQuery = query.toLowerCase();

    for (const threadInfo of allThreads) {
      const thread = await loadThread(threadInfo.id);
      if (!thread) continue;

      // Search in title
      const titleMatches = thread.title.toLowerCase().includes(lowerQuery);

      // Search in messages
      const matchedMessages = thread.messages.filter((msg: ThreadMessage) =>
        msg.content.some(
          (c: MessageContent) => c.type === "text" && c.text?.toLowerCase().includes(lowerQuery),
        ),
      ).length;

      if (titleMatches || matchedMessages > 0) {
        results.push({
          id: thread.id,
          title: thread.title,
          createdAt:
            typeof thread.createdAt === "string"
              ? thread.createdAt
              : thread.createdAt.toISOString(),
          matchedMessages,
        });
      }
    }

    return results.sort((a, b) => b.matchedMessages - a.matchedMessages);
  } catch (error) {
    console.error("Failed to search threads:", error);
    return [];
  }
}

/**
 * Export thread to JSON file
 */
export async function exportThread(threadId: string, exportPath: string): Promise<void> {
  try {
    const thread = await loadThread(threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    const content = JSON.stringify(thread, null, 2);
    await writeTextFile(exportPath, content);

    console.log(`Exported thread ${threadId} to ${exportPath}`);
  } catch (error) {
    console.error(`Failed to export thread ${threadId}:`, error);
    throw error;
  }
}

/**
 * Export thread to Markdown
 */
export async function exportThreadToMarkdown(threadId: string, exportPath: string): Promise<void> {
  try {
    const thread = await loadThread(threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    // Build markdown content
    const lines: string[] = [
      `# ${thread.title}`,
      "",
      `Created: ${new Date(thread.createdAt).toLocaleString()}`,
      "",
      "---",
      "",
    ];

    for (const message of thread.messages) {
      const role = message.role === "user" ? "User" : "Assistant";
      lines.push(`## ${role}`);
      lines.push("");

      // Add text content
      const textContent = message.content
        .filter((c: MessageContent) => c.type === "text")
        .map((c: MessageContent) => c.text)
        .join("\n");

      if (textContent) {
        lines.push(textContent);
        lines.push("");
      }

      // Add tool calls
      if (message.toolCalls && message.toolCalls.length > 0) {
        lines.push("### Tool Calls");
        lines.push("");

        for (const toolCall of message.toolCalls) {
          lines.push(`**${toolCall.name}** (${toolCall.status})`);
          lines.push("");

          if (toolCall.input) {
            lines.push("Input:");
            lines.push("```json");
            lines.push(JSON.stringify(toolCall.input, null, 2));
            lines.push("```");
            lines.push("");
          }

          if (toolCall.output) {
            lines.push("Output:");
            lines.push("```");
            lines.push(
              typeof toolCall.output === "string"
                ? toolCall.output
                : JSON.stringify(toolCall.output, null, 2),
            );
            lines.push("```");
            lines.push("");
          }

          if (toolCall.error) {
            lines.push("Error:");
            lines.push("```");
            lines.push(toolCall.error);
            lines.push("```");
            lines.push("");
          }
        }
      }

      lines.push("---");
      lines.push("");
    }

    const markdown = lines.join("\n");
    await writeTextFile(exportPath, markdown);

    console.log(`Exported thread ${threadId} to Markdown: ${exportPath}`);
  } catch (error) {
    console.error(`Failed to export thread ${threadId} to Markdown:`, error);
    throw error;
  }
}

/**
 * Import thread from JSON file
 */
export async function importThread(importPath: string): Promise<string> {
  try {
    const content = await readTextFile(importPath);
    const thread = JSON.parse(content) as Thread;

    // Generate new ID to avoid conflicts
    thread.id = `imported-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    await saveThread(thread);

    console.log(`Imported thread as ${thread.id}`);
    return thread.id;
  } catch (error) {
    console.error("Failed to import thread:", error);
    throw error;
  }
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  totalThreads: number;
  totalMessages: number;
  oldestThread?: string;
  newestThread?: string;
}> {
  try {
    const threads = await listThreads();
    const totalThreads = threads.length;
    const totalMessages = threads.reduce((sum, t) => sum + t.messageCount, 0);

    return {
      totalThreads,
      totalMessages,
      oldestThread: threads[threads.length - 1]?.createdAt,
      newestThread: threads[0]?.createdAt,
    };
  } catch (error) {
    console.error("Failed to get storage stats:", error);
    return {
      totalThreads: 0,
      totalMessages: 0,
    };
  }
}
