/**
 * Slash Commands System
 *
 * Based on Zed's slash command architecture:
 * - Commands are prefixed with / (e.g., /file, /tab)
 * - Each command can take optional arguments
 * - Commands inject context into the conversation
 * - Support autocomplete and inline documentation
 */

export interface SlashCommandContext {
  /** Current working directory */
  workingDirectory?: string;
  /** Project root path */
  projectRoot?: string;
  /** Currently open files in editor */
  openFiles?: string[];
  /** Currently selected text in editor */
  selectedText?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface SlashCommandResult {
  /** The content to inject into the conversation */
  content: string;
  /** Optional attachments (images, files, etc) */
  attachments?: SlashCommandAttachment[];
  /** Optional metadata about the execution */
  metadata?: Record<string, unknown>;
}

export interface SlashCommandAttachment {
  type: "file" | "image" | "code" | "data";
  name: string;
  content: string;
  /** MIME type for binary data */
  mimeType?: string;
  /** File path for references */
  path?: string;
}

export interface SlashCommand {
  /** Command name (without /) */
  name: string;
  /** Short description for autocomplete */
  description: string;
  /** Detailed usage information */
  usage?: string;
  /** Whether this command requires an argument */
  requiresArgument: boolean;
  /** Example usage */
  examples?: string[];
  /** Execute the command */
  execute: (
    argument: string | undefined,
    context: SlashCommandContext,
  ) => Promise<SlashCommandResult>;
}

export interface SlashCommandMatch {
  command: SlashCommand;
  /** The matched command text (e.g., "/file") */
  matchedText: string;
  /** The argument part (everything after the command) */
  argument?: string;
  /** Start position in the input */
  startPos: number;
  /** End position in the input */
  endPos: number;
}

export interface SlashCommandAutocompleteOption {
  command: SlashCommand;
  /** Display text for autocomplete menu */
  displayText: string;
  /** Additional info to show in autocomplete */
  detail?: string;
}
