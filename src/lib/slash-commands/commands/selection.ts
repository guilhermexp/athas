/**
 * /selection Slash Command
 *
 * Includes the currently selected text from the editor.
 * Based on Zed's selection_command.rs
 *
 * Usage:
 *   /selection
 */

import type { SlashCommand } from "../types";

export const selectionCommand: SlashCommand = {
  name: "selection",
  description: "Include selected text from editor",
  usage: "/selection",
  requiresArgument: false,
  examples: ["/selection"],

  async execute(_argument, context) {
    const selectedText = context.selectedText?.trim();

    if (!selectedText) {
      throw new Error(
        "No text is currently selected.\n\nPlease select some text in the editor before using this command.",
      );
    }

    // Format the selection similar to how Zed does it
    const lineCount = selectedText.split("\n").length;
    const charCount = selectedText.length;

    return {
      content: [
        `Selected text (${lineCount} lines, ${charCount} characters):`,
        "",
        "```",
        selectedText,
        "```",
      ].join("\n"),
      metadata: {
        lineCount,
        charCount,
        hasSelection: true,
      },
    };
  },
};
