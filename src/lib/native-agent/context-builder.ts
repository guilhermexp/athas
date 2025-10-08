import type { Tool } from "@/components/agent-panel/types";
import type { Buffer } from "@/types/buffer";
import { buildCompleteSystemPrompt } from "./system-prompt-builder";

/**
 * Context Builder - Build context for the Native Agent
 * Now uses Handlebars-based system prompt templates
 */

export interface ContextBuilderOptions {
  activeBuffer?: Buffer | null;
  openBuffers?: Buffer[];
  projectRoot?: string;
  selectedFiles?: string[];
}

/**
 * Build agent context (legacy method - kept for backward compatibility)
 */
export function buildAgentContext(options: ContextBuilderOptions): string {
  const { activeBuffer, openBuffers = [], projectRoot, selectedFiles = [] } = options;

  const sections: string[] = [];

  // Project context
  if (projectRoot) {
    sections.push(`## Workspace\n\nRoot: ${projectRoot}`);
  }

  // Active file context
  if (activeBuffer && !activeBuffer.isVirtual) {
    const language = getLanguageFromPath(activeBuffer.path);
    sections.push(
      `## Active File\n\nPath: ${activeBuffer.path}\nLanguage: ${language}\n\n\`\`\`${language}\n${activeBuffer.content}\n\`\`\``,
    );
  }

  // Open files context
  if (openBuffers.length > 0) {
    const openFilesInfo = openBuffers
      .filter((buf) => !buf.isVirtual)
      .map((buf) => `- ${buf.path}`)
      .join("\n");

    if (openFilesInfo) {
      sections.push(`## Open Files\n\n${openFilesInfo}`);
    }
  }

  // Selected files context
  if (selectedFiles.length > 0) {
    const selectedFilesInfo = selectedFiles.map((path) => `- ${path}`).join("\n");
    sections.push(`## Selected Files\n\n${selectedFilesInfo}`);
  }

  return sections.join("\n\n");
}

/**
 * Build system prompt using Handlebars template
 */
export async function buildSystemPrompt(
  basePrompt: string,
  contextInfo: string,
  enabledTools: Tool[],
  workspaceRoot?: string,
  activeBuffer?: Buffer,
  openBuffers?: Buffer[],
): Promise<string> {
  // Use the new template-based system prompt builder
  try {
    return await buildCompleteSystemPrompt({
      workspaceRoot,
      activeBuffer,
      openBuffers,
      enabledTools,
      additionalInstructions: basePrompt,
      showActiveFileContent: true,
    });
  } catch (error) {
    console.error("Failed to build system prompt from template:", error);
    // Fallback to simple prompt if template fails
    return buildLegacySystemPrompt(basePrompt, contextInfo, enabledTools);
  }
}

/**
 * Legacy system prompt builder (fallback)
 */
function buildLegacySystemPrompt(
  basePrompt: string,
  contextInfo: string,
  enabledTools: Tool[],
): string {
  const parts: string[] = [basePrompt];

  if (contextInfo) {
    parts.push(`\n## Current Context\n\n${contextInfo}`);
  }

  if (enabledTools.length > 0) {
    parts.push(
      `\n## Available Tools\n\nYou have access to the following tools:\n${enabledTools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}`,
    );
  }

  parts.push(
    "\n## Guidelines\n\n" +
      "- Use tools when necessary to complete tasks\n" +
      "- Always read files before modifying them\n" +
      "- Provide clear explanations of your actions\n" +
      "- Ask for clarification if instructions are unclear",
  );

  return parts.join("\n");
}

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
