/**
 * /delta Slash Command
 *
 * Shows git diff of uncommitted changes.
 * Based on Zed's delta_command.rs
 *
 * Usage:
 *   /delta              - Show all uncommitted changes
 *   /delta <file>       - Show changes for specific file
 *   /delta --staged     - Show staged changes only
 */

import { Command } from "@tauri-apps/plugin-shell";
import type { SlashCommand } from "../types";

export const deltaCommand: SlashCommand = {
  name: "delta",
  description: "Show git diff of changes",
  usage: "/delta [file] [--staged]",
  requiresArgument: false,
  examples: ["/delta", "/delta src/main.ts", "/delta --staged"],

  async execute(argument, context) {
    const workingDir = context.projectRoot || context.workingDirectory;

    if (!workingDir) {
      throw new Error("No project directory found.\n\nPlease open a project to use git commands.");
    }

    // Parse arguments
    const args = argument?.trim().split(/\s+/) || [];
    const isStaged = args.includes("--staged");
    const filepath = args.find((arg) => !arg.startsWith("--"));

    // Build git diff command
    const gitArgs = ["diff"];

    if (isStaged) {
      gitArgs.push("--staged");
    }

    if (filepath) {
      gitArgs.push("--", filepath);
    }

    try {
      // Execute git diff using Tauri shell
      const command = Command.create("git", gitArgs, {
        cwd: workingDir,
      });

      const output = await command.execute();

      if (output.code !== 0) {
        const errorMsg = output.stderr || "Git command failed";
        throw new Error(`Git error: ${errorMsg}\n\nMake sure this is a git repository.`);
      }

      const diff = output.stdout.trim();

      if (!diff) {
        const message = isStaged
          ? "No staged changes."
          : filepath
            ? `No changes in ${filepath}.`
            : "No uncommitted changes.";

        return {
          content: message,
          metadata: {
            hasChanges: false,
            isStaged,
            filepath,
          },
        };
      }

      // Count stats
      const lines = diff.split("\n");
      const additions = lines.filter((l) => l.startsWith("+")).length;
      const deletions = lines.filter((l) => l.startsWith("-")).length;

      const title = isStaged
        ? "Staged changes:"
        : filepath
          ? `Changes in ${filepath}:`
          : "Uncommitted changes:";

      return {
        content: [title, `+${additions} -${deletions}`, "", "```diff", diff, "```"].join("\n"),
        metadata: {
          hasChanges: true,
          additions,
          deletions,
          isStaged,
          filepath,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        // Check if git is not installed
        if (error.message.includes("command not found")) {
          throw new Error(
            "Git is not installed or not in PATH.\n\nPlease install git to use this command.",
          );
        }
        throw error;
      }
      throw new Error("Failed to execute git diff command.");
    }
  },
};
