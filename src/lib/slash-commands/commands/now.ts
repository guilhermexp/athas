/**
 * /now Slash Command
 *
 * Inserts the current date and time into the conversation.
 * Based on Zed's now_command.rs
 */

import type { SlashCommand } from "../types";

export const nowCommand: SlashCommand = {
  name: "now",
  description: "Insert current date and time",
  usage: "/now",
  requiresArgument: false,
  examples: ["/now"],

  async execute() {
    const now = new Date();

    // Format: "Monday, January 1, 2025 at 3:45 PM"
    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const datePart = dateFormatter.format(now);
    const timePart = timeFormatter.format(now);

    const content = `Current date and time: ${datePart} at ${timePart}`;

    return {
      content,
      metadata: {
        timestamp: now.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };
  },
};
