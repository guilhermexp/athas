/**
 * System Prompt Builder with Handlebars Templates
 * Based on Zed's system prompt generation
 */

import { resolve } from "@tauri-apps/api/path";
import { readTextFile } from "@tauri-apps/plugin-fs";
import Handlebars from "handlebars";
import type { Tool } from "@/components/agent-panel/types";
import type { Buffer } from "@/types/buffer";

// Import the template at build time
import templateSource from "./system-prompt-template.hbs?raw";

export interface SystemPromptContext {
  // Environment
  os?: string;
  shell?: string;
  workspaceRoot?: string;
  datetime?: string;

  // Active file
  activeFile?: {
    path: string;
    language: string;
    content?: string;
    selection?: {
      start: number;
      end: number;
    };
  };

  // Open files
  openFiles?: Array<{
    path: string;
    isDirty?: boolean;
  }>;

  // Selected files
  selectedFiles?: string[];

  // Project worktrees
  worktrees?: Array<{
    name: string;
    path: string;
  }>;

  // Tools
  enabledTools?: Array<{
    name: string;
    description: string;
  }>;

  // Custom rules from .rules file
  customRules?: string;

  // Additional instructions
  additionalInstructions?: string;

  // Control flags
  showActiveFileContent?: boolean;
}

/**
 * Compile and cache the template
 */
let compiledTemplate: HandlebarsTemplateDelegate | null = null;

function getCompiledTemplate(): HandlebarsTemplateDelegate {
  if (!compiledTemplate) {
    // Register custom helpers
    Handlebars.registerHelper("ifEquals", function (arg1, arg2, options) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper("formatFileSize", (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    });

    compiledTemplate = Handlebars.compile(templateSource);
  }
  return compiledTemplate;
}

/**
 * Build system prompt from context
 */
export async function buildSystemPrompt(context: SystemPromptContext): Promise<string> {
  const template = getCompiledTemplate();

  // Add datetime if not provided
  if (!context.datetime) {
    context.datetime = new Date().toLocaleString();
  }

  // Compile template with context
  const prompt = template(context);

  // Clean up extra whitespace
  return prompt
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Load .rules file from workspace root
 */
export async function loadRulesFile(workspaceRoot: string): Promise<string | null> {
  try {
    const rulesPath = await resolve(workspaceRoot, ".rules");
    const content = await readTextFile(rulesPath);
    return content.trim();
  } catch (_error) {
    // .rules file doesn't exist, which is fine
    return null;
  }
}

/**
 * Get OS and shell information
 */
export async function getEnvironmentInfo(): Promise<{
  os: string;
  shell: string;
}> {
  try {
    // Use Tauri to get OS info
    const { platform } = await import("@tauri-apps/plugin-os");
    const osType = platform();

    // Detect shell
    let shell = "unknown";
    if (typeof process !== "undefined" && process.env) {
      shell = process.env.SHELL?.split("/").pop() || "unknown";
    }

    return {
      os: osType,
      shell,
    };
  } catch (_error) {
    return {
      os: "unknown",
      shell: "unknown",
    };
  }
}

/**
 * Build complete system prompt with all context
 */
export async function buildCompleteSystemPrompt(options: {
  workspaceRoot?: string;
  activeBuffer?: Buffer;
  openBuffers?: Buffer[];
  selectedFiles?: string[];
  enabledTools?: Tool[];
  additionalInstructions?: string;
  showActiveFileContent?: boolean;
}): Promise<string> {
  const {
    workspaceRoot,
    activeBuffer,
    openBuffers = [],
    selectedFiles = [],
    enabledTools = [],
    additionalInstructions,
    showActiveFileContent = true,
  } = options;

  // Get environment info
  const env = await getEnvironmentInfo();

  // Load .rules file if workspace is available
  let customRules: string | null = null;
  if (workspaceRoot) {
    customRules = await loadRulesFile(workspaceRoot);
  }

  // Build context
  const context: SystemPromptContext = {
    os: env.os,
    shell: env.shell,
    workspaceRoot,
    datetime: new Date().toLocaleString(),
    showActiveFileContent,
    additionalInstructions,
  };

  // Add active file
  if (activeBuffer && !activeBuffer.isVirtual) {
    context.activeFile = {
      path: activeBuffer.path,
      language: getLanguageFromPath(activeBuffer.path),
      content: showActiveFileContent ? activeBuffer.content : undefined,
    };
  }

  // Add open files
  if (openBuffers.length > 0) {
    context.openFiles = openBuffers
      .filter((buf) => !buf.isVirtual)
      .map((buf) => ({
        path: buf.path,
        isDirty: buf.isDirty,
      }));
  }

  // Add selected files
  if (selectedFiles.length > 0) {
    context.selectedFiles = selectedFiles;
  }

  // Add enabled tools
  if (enabledTools.length > 0) {
    context.enabledTools = enabledTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    }));
  }

  // Add custom rules
  if (customRules) {
    context.customRules = customRules;
  }

  return buildSystemPrompt(context);
}

/**
 * Get language from file path
 */
function getLanguageFromPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() || "";

  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    swift: "swift",
    kt: "kotlin",
    css: "css",
    scss: "scss",
    html: "html",
    json: "json",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
  };

  return languageMap[extension] || extension;
}

/**
 * Create a custom template from string
 */
export function compileCustomTemplate(templateSource: string): HandlebarsTemplateDelegate {
  return Handlebars.compile(templateSource);
}
