/**
 * /fetch Slash Command
 *
 * Fetches content from a URL and includes it in the conversation.
 * Based on Zed's fetch_command.rs
 *
 * Usage:
 *   /fetch https://example.com
 *   /fetch https://api.github.com/repos/owner/repo
 */

import type { SlashCommand } from "../types";

/**
 * Convert HTML to markdown-like text
 * Simple implementation - could be enhanced with a proper HTML parser
 */
function htmlToText(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Convert common HTML tags to text equivalents
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");
  text = text.replace(/<li>/gi, "• ");
  text = text.replace(/<\/li>/gi, "\n");

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&apos;/g, "'");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&amp;/g, "&");

  // Clean up excessive whitespace
  text = text.replace(/\n\s*\n\s*\n/g, "\n\n");
  text = text.trim();

  return text;
}

export const fetchCommand: SlashCommand = {
  name: "fetch",
  description: "Fetch content from a URL",
  usage: "/fetch <url>",
  requiresArgument: true,
  examples: [
    "/fetch https://example.com",
    "/fetch https://raw.githubusercontent.com/user/repo/main/README.md",
    "/fetch https://api.github.com/repos/owner/repo",
  ],

  async execute(argument) {
    if (!argument) {
      throw new Error("URL is required.\nUsage: /fetch <url>");
    }

    const url = argument.trim();

    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid URL: ${url}\n\nPlease provide a valid HTTP/HTTPS URL.`);
    }

    // Only allow HTTP/HTTPS
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      throw new Error(`Unsupported protocol.\n\nOnly HTTP and HTTPS URLs are supported.`);
    }

    try {
      // Fetch the URL using native fetch API
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Athas/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();

      let formattedContent: string;
      let language = "text";

      // Determine content type and format accordingly
      if (contentType.includes("application/json")) {
        language = "json";
        try {
          // Pretty-print JSON
          const json = JSON.parse(text);
          formattedContent = JSON.stringify(json, null, 2);
        } catch {
          formattedContent = text;
        }
      } else if (contentType.includes("text/html")) {
        language = "markdown";
        formattedContent = htmlToText(text);
      } else if (contentType.includes("text/markdown")) {
        language = "markdown";
        formattedContent = text;
      } else if (contentType.includes("text/plain")) {
        language = "text";
        formattedContent = text;
      } else if (
        contentType.includes("application/javascript") ||
        contentType.includes("text/javascript")
      ) {
        language = "javascript";
        formattedContent = text;
      } else if (contentType.includes("text/css")) {
        language = "css";
        formattedContent = text;
      } else {
        // Unknown type, treat as text
        language = "text";
        formattedContent = text;
      }

      // Truncate if too long (> 50KB)
      const MAX_SIZE = 50 * 1024;
      let truncated = false;
      if (formattedContent.length > MAX_SIZE) {
        formattedContent = formattedContent.slice(0, MAX_SIZE);
        truncated = true;
      }

      const sizeKB = (text.length / 1024).toFixed(1);

      return {
        content: [
          `Content from: ${url}`,
          `Type: ${contentType} | Size: ${sizeKB} KB${truncated ? " (truncated)" : ""}`,
          "",
          `\`\`\`${language}`,
          formattedContent,
          "```",
        ].join("\n"),
        metadata: {
          url,
          contentType,
          size: text.length,
          truncated,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch URL: ${error.message}\n\nURL: ${url}`);
      }
      throw error;
    }
  },
};
