/**
 * Initialize Slash Commands
 *
 * Register all available slash commands with the global registry.
 * This should be called once during app initialization.
 */

import { deltaCommand } from "./commands/delta";
import { diagnosticsCommand } from "./commands/diagnostics";
import { fetchCommand } from "./commands/fetch";
import { fileCommand } from "./commands/file";
import { nowCommand } from "./commands/now";
import { promptCommand } from "./commands/prompt";
import { selectionCommand } from "./commands/selection";
import { symbolsCommand } from "./commands/symbols";
import { tabCommand } from "./commands/tab";
import { getSlashCommandRegistry } from "./registry";

/**
 * Register all slash commands
 */
export function initializeSlashCommands(): void {
  const registry = getSlashCommandRegistry();

  // Register all commands
  registry.register(nowCommand);
  registry.register(fileCommand);
  registry.register(tabCommand);
  registry.register(selectionCommand);
  registry.register(fetchCommand);
  registry.register(deltaCommand);
  registry.register(promptCommand);
  registry.register(diagnosticsCommand);
  registry.register(symbolsCommand);

  console.log(`[SlashCommands] Registered ${registry.getAllCommands().length} commands`);
}
