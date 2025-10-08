/**
 * Slash Command Registry
 *
 * Central registry for all slash commands.
 * Based on Zed's assistant_slash_command architecture.
 */

import type {
  SlashCommand,
  SlashCommandAutocompleteOption,
  SlashCommandContext,
  SlashCommandMatch,
  SlashCommandResult,
} from "./types";

export class SlashCommandRegistry {
  private commands = new Map<string, SlashCommand>();

  /**
   * Register a new slash command
   */
  register(command: SlashCommand): void {
    if (this.commands.has(command.name)) {
      console.warn(`Slash command "${command.name}" is already registered. Overwriting.`);
    }
    this.commands.set(command.name, command);
  }

  /**
   * Unregister a slash command
   */
  unregister(commandName: string): boolean {
    return this.commands.delete(commandName);
  }

  /**
   * Get a command by name
   */
  getCommand(name: string): SlashCommand | undefined {
    return this.commands.get(name);
  }

  /**
   * Get all registered commands
   */
  getAllCommands(): SlashCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Parse input text to find slash command matches
   */
  parseInput(input: string): SlashCommandMatch | null {
    // Match pattern: /commandname [argument]
    const match = input.match(/^\/([a-z-]+)(?:\s+(.*))?$/i);

    if (!match) {
      return null;
    }

    const [fullMatch, commandName, argument] = match;
    const command = this.commands.get(commandName);

    if (!command) {
      return null;
    }

    return {
      command,
      matchedText: `/${commandName}`,
      argument: argument?.trim(),
      startPos: 0,
      endPos: fullMatch.length,
    };
  }

  /**
   * Execute a slash command from input text
   */
  async executeFromInput(input: string, context: SlashCommandContext): Promise<SlashCommandResult> {
    const match = this.parseInput(input);

    if (!match) {
      throw new Error(`Invalid slash command: ${input}`);
    }

    const { command, argument } = match;

    // Validate required argument
    if (command.requiresArgument && !argument) {
      throw new Error(
        `Command "/${command.name}" requires an argument.\nUsage: ${command.usage || `/${command.name} <argument>`}`,
      );
    }

    return command.execute(argument, context);
  }

  /**
   * Get autocomplete suggestions for partial input
   */
  getAutocompleteSuggestions(partialInput: string): SlashCommandAutocompleteOption[] {
    // Match partial command (e.g., "/f", "/fil")
    const match = partialInput.match(/^\/([a-z-]*)$/i);

    if (!match) {
      return [];
    }

    const partialCommand = match[1].toLowerCase();

    // Filter commands that match the partial input
    return Array.from(this.commands.values())
      .filter((cmd) => cmd.name.toLowerCase().startsWith(partialCommand))
      .map((cmd) => ({
        command: cmd,
        displayText: `/${cmd.name}`,
        detail: cmd.description,
      }))
      .sort((a, b) => a.command.name.localeCompare(b.command.name));
  }

  /**
   * Check if input starts with a slash command
   */
  isSlashCommand(input: string): boolean {
    return /^\/[a-z-]+/i.test(input);
  }

  /**
   * Get command suggestions for help display
   */
  getCommandHelp(): string {
    const commands = this.getAllCommands();

    if (commands.length === 0) {
      return "No slash commands available.";
    }

    const maxNameLength = Math.max(...commands.map((cmd) => cmd.name.length));

    const helpLines = commands.map((cmd) => {
      const paddedName = `/${cmd.name}`.padEnd(maxNameLength + 1);
      return `  ${paddedName}  ${cmd.description}`;
    });

    return ["Available slash commands:", "", ...helpLines].join("\n");
  }
}

// Global singleton instance
let globalRegistry: SlashCommandRegistry | null = null;

/**
 * Get the global slash command registry
 */
export function getSlashCommandRegistry(): SlashCommandRegistry {
  if (!globalRegistry) {
    globalRegistry = new SlashCommandRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global registry (useful for testing)
 */
export function resetSlashCommandRegistry(): void {
  globalRegistry = null;
}
