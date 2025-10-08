/**
 * /file Slash Command
 *
 * Attaches file contents to the conversation.
 * Based on Zed's file_command.rs
 *
 * Usage:
 *   /file path/to/file.ts
 *   /file src/components/Button.tsx
 */

import { resolve } from "@tauri-apps/api/path";
import { readTextFile } from "@tauri-apps/plugin-fs";
import type { SlashCommand } from "../types";

/**
 * Detect language from file extension
 */
function detectLanguage(filepath: string): string {
  const ext = filepath.split(".").pop()?.toLowerCase() || "";

  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sh: "bash",
    bash: "bash",
    zsh: "zsh",
    fish: "fish",
    sql: "sql",
    graphql: "graphql",
    vue: "vue",
    svelte: "svelte",
  };

  return languageMap[ext] || "text";
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export const fileCommand: SlashCommand = {
  name: "file",
  description: "Attach file contents to conversation",
  usage: "/file <path>",
  requiresArgument: true,
  examples: ["/file src/main.ts", "/file package.json", "/file README.md"],

  async execute(argument, context) {
    if (!argument) {
      throw new Error("File path is required.\nUsage: /file <path>");
    }

    const filepath = argument.trim();

    try {
      // Resolve path relative to project root or working directory
      const basePath = context.projectRoot || context.workingDirectory || "";
      const resolvedPath = await resolve(basePath, filepath);

      // Read file contents
      const content = await readTextFile(resolvedPath);
      const language = detectLanguage(filepath);

      // Get file stats for metadata
      const fileSize = new Blob([content]).size;
      const lineCount = content.split("\n").length;

      // Format output similar to Zed
      const formattedContent = [
        `File: ${filepath}`,
        `Lines: ${lineCount} | Size: ${formatFileSize(fileSize)}`,
        "",
        `\`\`\`${language}`,
        content,
        "```",
      ].join("\n");

      return {
        content: formattedContent,
        attachments: [
          {
            type: "file",
            name: filepath.split("/").pop() || filepath,
            path: resolvedPath,
            content,
          },
        ],
        metadata: {
          filepath: resolvedPath,
          language,
          lineCount,
          fileSize,
        },
      };
    } catch (error) {
      // Handle common errors
      if (error instanceof Error) {
        if (error.message.includes("No such file")) {
          throw new Error(
            `File not found: ${filepath}\n\nMake sure the path is correct and relative to the project root.`,
          );
        }
        throw new Error(`Failed to read file: ${error.message}`);
      }
      throw error;
    }
  },
};
