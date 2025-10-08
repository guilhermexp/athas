import type { ContextInfo } from "./types";

type ChatMode = "chat" | "plan";
type OutputStyle = "default" | "explanatory" | "learning";

// Build a comprehensive context prompt for the AI
export const buildContextPrompt = (context: ContextInfo): string => {
  let contextPrompt = "";

  // Project information
  if (context.projectRoot) {
    const projectName = context.projectRoot.split("/").pop() || "Unknown Project";
    contextPrompt += `Project: ${projectName}\n`;

    // For Claude Code, include the full project path
    if (context.providerId === "claude-code") {
      contextPrompt += `Working directory: ${context.projectRoot}\n`;
    }
  }

  // Currently active file
  if (context.activeBuffer) {
    // For Claude Code, just provide the path
    if (context.providerId === "claude-code") {
      contextPrompt += `\nCurrently editing: ${context.activeBuffer.path}`;
      if (context.language && context.language !== "Text") {
        contextPrompt += ` (${context.language})`;
      }
      if (context.activeBuffer.isDirty) {
        contextPrompt += " [unsaved changes]";
      }
    } else {
      // For other providers, include content as before
      contextPrompt += `\nCurrently editing: ${context.activeBuffer.name}`;
      if (context.language && context.language !== "Text") {
        contextPrompt += ` (${context.language})`;
      }

      if (context.activeBuffer.isDirty) {
        contextPrompt += " [unsaved changes]";
      }

      // Include relevant portions of the active file content
      if (context.activeBuffer.content && !context.activeBuffer.isSQLite) {
        const lines = context.activeBuffer.content.split("\n");
        if (lines.length <= 100) {
          // Include the whole file if it's small
          contextPrompt += `\n\nFile content:\n\`\`\`${context.language?.toLowerCase() || "text"}\n${context.activeBuffer.content}\n\`\`\``;
        } else {
          // Include first 50 lines and last 20 lines for larger files
          const preview = [
            ...lines.slice(0, 50),
            "... (content truncated) ...",
            ...lines.slice(-20),
          ].join("\n");
          contextPrompt += `\n\nFile content (preview):\n\`\`\`${context.language?.toLowerCase() || "text"}\n${preview}\n\`\`\``;
        }
      }
    }
  }

  // Other open files
  if (context.openBuffers && context.openBuffers.length > 1) {
    const otherFiles = context.openBuffers.filter(
      (buffer) => buffer.id !== context.activeBuffer?.id,
    );

    if (otherFiles.length > 0) {
      if (context.providerId === "claude-code") {
        // For Claude Code, list paths relative to project root
        const filePaths = otherFiles
          .map((buffer) => {
            const relativePath =
              context.projectRoot && buffer.path.startsWith(context.projectRoot)
                ? buffer.path.slice(context.projectRoot.length + 1)
                : buffer.path;
            return `${relativePath}${buffer.isDirty ? " [modified]" : ""}`;
          })
          .slice(0, 10);

        contextPrompt += `\n\nOther open files:\n${filePaths.map((p) => `- ${p}`).join("\n")}`;
        if (otherFiles.length > 10) {
          contextPrompt += `\n... and ${otherFiles.length - 10} more`;
        }
      } else {
        // For other providers, keep the original behavior
        const fileNames = otherFiles
          .map((buffer) => `${buffer.name}${buffer.isDirty ? " [modified]" : ""}`)
          .slice(0, 10);

        contextPrompt += `\n\nOther open files: ${fileNames.join(", ")}`;
        if (otherFiles.length > 10) {
          contextPrompt += ` and ${otherFiles.length - 10} more`;
        }
      }
    }
  }

  // Selected project files for context
  if (context.selectedProjectFiles && context.selectedProjectFiles.length > 0) {
    if (context.providerId === "claude-code") {
      // For Claude Code, just list the file paths
      const filePaths = context.selectedProjectFiles
        .map((filePath) => {
          const relativePath =
            context.projectRoot && filePath.startsWith(context.projectRoot)
              ? filePath.slice(context.projectRoot.length + 1)
              : filePath;
          return relativePath;
        })
        .slice(0, 20);

      contextPrompt += `\n\nSelected context files:\n${filePaths.map((p) => `- ${p}`).join("\n")}`;
      if (context.selectedProjectFiles.length > 20) {
        contextPrompt += `\n... and ${context.selectedProjectFiles.length - 20} more`;
      }
    } else {
      // For other providers, list file names only
      const fileNames = context.selectedProjectFiles
        .map((filePath) => filePath.split("/").pop() || "Unknown")
        .slice(0, 20);

      contextPrompt += `\n\nSelected context files: ${fileNames.join(", ")}`;
      if (context.selectedProjectFiles.length > 20) {
        contextPrompt += ` and ${context.selectedProjectFiles.length - 20} more`;
      }
    }
  }

  return contextPrompt;
};

// Build system prompt for AI providers with mode and output style support
export const buildSystemPrompt = (
  contextPrompt: string,
  mode: ChatMode = "chat",
  outputStyle: OutputStyle = "default",
): string => {
  let basePrompt = `You are an expert coding assistant integrated into a code editor. You have access to the user's current project context and open files.`;

  // Mode-specific behavior
  if (mode === "plan") {
    basePrompt += `

PLAN MODE: You are currently in Plan Mode. This means:
- NEVER execute or modify code directly
- Focus on analysis, planning, and providing detailed explanations
- Create step-by-step plans for implementation
- Identify potential issues and considerations
- Provide comprehensive analysis without making changes
- Use planning language like "would", "could", "should" instead of "will"`;
  } else {
    basePrompt += `

CHAT MODE: You are in interactive Chat Mode where you can:
- Analyze and modify code as needed
- Execute actions and make changes
- Provide direct implementation solutions`;
  }

  // Output style modifications
  if (outputStyle === "explanatory") {
    basePrompt += `

OUTPUT STYLE - EXPLANATORY: Provide educational insights alongside your responses:
- Include "## Insights" sections explaining the reasoning behind suggestions
- Explain the "why" behind code patterns and decisions
- Add context about best practices and alternatives
- Help users learn while solving their problems`;
  } else if (outputStyle === "learning") {
    basePrompt += `

OUTPUT STYLE - LEARNING: Collaborative learning mode:
- Ask the user to contribute code when appropriate
- Add TODO(human) markers for parts the user should implement
- Encourage active participation in the coding process
- Break down complex tasks into user-implementable steps`;
  }

  basePrompt += `

Key capabilities:
- Code analysis, debugging, and optimization
- Explaining complex programming concepts
- Suggesting best practices and improvements
- Helping with errors and troubleshooting
- Code generation and refactoring
- Architecture and design guidance
- Access to selected project files for comprehensive context

Guidelines:
- Be concise but thorough in your explanations
- Provide practical, actionable advice
- Reference the user's actual code when relevant
- Offer multiple solutions when appropriate
- Use proper formatting for code snippets
- Ask clarifying questions if needed

Current context:
${contextPrompt}`;

  return basePrompt;
};
