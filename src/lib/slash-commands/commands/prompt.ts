/**
 * /prompt Slash Command
 *
 * Use saved prompt templates.
 * Based on Zed's prompt_command.rs
 *
 * Usage:
 *   /prompt              - List available prompts
 *   /prompt <name>       - Use a specific prompt template
 */

import type { SlashCommand } from "../types";

/**
 * Built-in prompt templates
 * TODO: Move to PromptStore when implemented
 */
const BUILTIN_PROMPTS: Record<string, string> = {
  "code-review": `Please review this code for:
- Code quality and best practices
- Potential bugs or issues
- Performance considerations
- Security vulnerabilities
- Suggestions for improvement`,

  explain: `Please explain this code in detail:
- What it does
- How it works
- Key concepts used
- Any potential edge cases`,

  refactor: `Please suggest refactoring improvements for this code:
- Better structure or organization
- Improved readability
- Performance optimizations
- Modern best practices
- Type safety improvements`,

  debug: `Help me debug this code:
- Identify potential issues
- Suggest debugging steps
- Explain what might be going wrong
- Provide solutions`,

  test: `Please help me write tests for this code:
- Unit tests for key functionality
- Edge cases to consider
- Mock/stub suggestions
- Test structure and organization`,

  document: `Please help document this code:
- Add clear comments
- Write JSDoc/TSDoc annotations
- Explain complex sections
- Add usage examples`,

  optimize: `Please help optimize this code for:
- Performance improvements
- Memory usage
- Algorithm efficiency
- Reduced complexity`,

  security: `Please review this code for security issues:
- Input validation
- Authentication/authorization
- Data sanitization
- Common vulnerabilities (XSS, SQL injection, etc.)
- Best security practices`,
};

export const promptCommand: SlashCommand = {
  name: "prompt",
  description: "Use a saved prompt template",
  usage: "/prompt [name]",
  requiresArgument: false,
  examples: ["/prompt", "/prompt code-review", "/prompt explain"],

  async execute(argument) {
    // If no argument, list available prompts
    if (!argument) {
      const promptList = Object.keys(BUILTIN_PROMPTS)
        .sort()
        .map((name) => {
          const preview = BUILTIN_PROMPTS[name].split("\n")[0].replace(/^Please /, "");
          return `  ${name.padEnd(15)} - ${preview}`;
        })
        .join("\n");

      return {
        content: [
          "Available prompt templates:",
          "",
          promptList,
          "",
          "Usage: /prompt <name>",
          "",
          "Built-in templates:",
          "  code-review  - Review code quality and best practices",
          "  explain      - Explain code in detail",
          "  refactor     - Suggest refactoring improvements",
          "  debug        - Help debug issues",
          "  test         - Write tests",
          "  document     - Add documentation",
          "  optimize     - Optimize performance",
          "  security     - Security review",
        ].join("\n"),
        metadata: {
          availablePrompts: Object.keys(BUILTIN_PROMPTS),
        },
      };
    }

    const promptName = argument.trim().toLowerCase();
    const promptTemplate = BUILTIN_PROMPTS[promptName];

    if (!promptTemplate) {
      const available = Object.keys(BUILTIN_PROMPTS).join(", ");
      throw new Error(
        `Prompt template "${promptName}" not found.\n\nAvailable templates: ${available}`,
      );
    }

    return {
      content: promptTemplate,
      metadata: {
        promptName,
        isBuiltin: true,
      },
    };
  },
};
