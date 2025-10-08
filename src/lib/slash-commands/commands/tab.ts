/**
 * /tab Slash Command
 *
 * Attaches content from currently open tabs/files in the editor.
 * Based on Zed's tab_command.rs
 *
 * Usage:
 *   /tab        - Shows all open tabs
 *   /tab 1      - Includes specific tab by index
 *   /tab file.ts - Includes tab matching name
 */

import type { SlashCommand } from "../types";

export const tabCommand: SlashCommand = {
  name: "tab",
  description: "Include content from open tabs",
  usage: "/tab [index or name]",
  requiresArgument: false,
  examples: ["/tab", "/tab 1", "/tab main.ts"],

  async execute(argument, context) {
    const openFiles = context.openFiles || [];

    if (openFiles.length === 0) {
      return {
        content: "No tabs are currently open in the editor.",
        metadata: {
          tabCount: 0,
        },
      };
    }

    // If no argument, list all open tabs
    if (!argument) {
      const tabList = openFiles
        .map((file, index) => {
          const fileName = file.split("/").pop() || file;
          return `${index + 1}. ${fileName} (${file})`;
        })
        .join("\n");

      return {
        content: [
          `Open tabs (${openFiles.length}):`,
          "",
          tabList,
          "",
          "Use `/tab <index>` or `/tab <name>` to include a specific tab.",
        ].join("\n"),
        metadata: {
          tabCount: openFiles.length,
          tabs: openFiles,
        },
      };
    }

    // Try to match by index first
    const index = parseInt(argument, 10);
    if (!Number.isNaN(index) && index >= 1 && index <= openFiles.length) {
      const filepath = openFiles[index - 1];
      // Delegate to /file command for actual file reading
      const { fileCommand } = await import("./file");
      return fileCommand.execute(filepath, context);
    }

    // Try to match by filename
    const matchingFile = openFiles.find((file) => {
      const fileName = file.split("/").pop() || "";
      return (
        fileName.toLowerCase().includes(argument.toLowerCase()) ||
        file.toLowerCase().includes(argument.toLowerCase())
      );
    });

    if (matchingFile) {
      // Delegate to /file command
      const { fileCommand } = await import("./file");
      return fileCommand.execute(matchingFile, context);
    }

    // No match found
    throw new Error(
      `No tab found matching "${argument}".\n\nOpen tabs:\n${openFiles.map((f, i) => `${i + 1}. ${f.split("/").pop()}`).join("\n")}`,
    );
  },
};
