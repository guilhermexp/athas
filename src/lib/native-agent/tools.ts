import { invoke } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import type { MCPTool, Tool } from "@/components/agent-panel/types";
import { useFileSystemStore } from "@/file-system/controllers/store";
import { getMCPClient } from "@/lib/mcp";

/**
 * Native Tools - Built-in tools for the Native Agent
 * Based on Zed's tool system
 */

// ============================================================================
// Helpers
// ============================================================================

const WINDOWS_ABSOLUTE_PATH = /^[a-zA-Z]:[\\/]/;

function isAbsolutePath(path: string): boolean {
  return path.startsWith("/") || WINDOWS_ABSOLUTE_PATH.test(path);
}

async function resolveWorkspacePath(workspaceRoot: string | undefined, targetPath?: string) {
  if (!workspaceRoot) {
    if (!targetPath || targetPath === "." || targetPath === "./") {
      throw new Error("No workspace root available");
    }
    return targetPath;
  }

  if (!targetPath || targetPath === "." || targetPath === "./") {
    return workspaceRoot;
  }

  if (isAbsolutePath(targetPath)) {
    return targetPath;
  }

  return join(workspaceRoot, targetPath);
}

// ============================================================================
// File System Tools
// ============================================================================

export const READ_FILE_TOOL: Tool = {
  name: "read_file",
  description: "Read the contents of a file from the workspace",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file relative to workspace root",
      },
    },
    required: ["path"],
  },
};

export const WRITE_FILE_TOOL: Tool = {
  name: "write_file",
  description: "Write content to a file in the workspace",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file relative to workspace root",
      },
      content: {
        type: "string",
        description: "Content to write to the file",
      },
    },
    required: ["path", "content"],
  },
};

export const LIST_DIRECTORY_TOOL: Tool = {
  name: "list_directory",
  description: "List files and directories in a given path",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the directory relative to workspace root (use '.' for root)",
      },
    },
    required: ["path"],
  },
};

export const SEARCH_FILES_TOOL: Tool = {
  name: "search_files",
  description: "Search for files by name pattern in the workspace",
  input_schema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Glob pattern to search for (e.g., '**/*.ts')",
      },
    },
    required: ["pattern"],
  },
};

export const CREATE_DIRECTORY_TOOL: Tool = {
  name: "create_directory",
  description: "Create a new directory in the workspace",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the directory to create",
      },
    },
    required: ["path"],
  },
};

export const GREP_TOOL: Tool = {
  name: "grep",
  description: "Search for text patterns in files using grep. Returns matching lines with context.",
  input_schema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "The search pattern (supports regex)",
      },
      path: {
        type: "string",
        description: "Path to search in (file or directory). Use '.' for entire workspace",
      },
      case_sensitive: {
        type: "boolean",
        description: "Whether the search should be case-sensitive (default: false)",
      },
      max_results: {
        type: "number",
        description: "Maximum number of results to return (default: 100)",
      },
    },
    required: ["pattern"],
  },
};

export const FIND_PATH_TOOL: Tool = {
  name: "find_path",
  description:
    "Fuzzy search for files and directories by name. Faster than glob patterns for finding specific files.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Filename or partial path to search for (fuzzy matching)",
      },
      max_results: {
        type: "number",
        description: "Maximum number of results to return (default: 20)",
      },
    },
    required: ["query"],
  },
};

export const TERMINAL_TOOL: Tool = {
  name: "terminal",
  description: "Execute a shell command in the workspace directory. Use with caution.",
  input_schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The shell command to execute",
      },
      working_directory: {
        type: "string",
        description: "Working directory for the command (relative to workspace root)",
      },
    },
    required: ["command"],
  },
};

export const DELETE_PATH_TOOL: Tool = {
  name: "delete_path",
  description: "Delete a file or directory from the workspace",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file or directory to delete",
      },
      recursive: {
        type: "boolean",
        description: "If true, delete directories recursively (default: false)",
      },
    },
    required: ["path"],
  },
};

export const MOVE_PATH_TOOL: Tool = {
  name: "move_path",
  description: "Move or rename a file or directory",
  input_schema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "Source path",
      },
      destination: {
        type: "string",
        description: "Destination path",
      },
    },
    required: ["source", "destination"],
  },
};

export const COPY_PATH_TOOL: Tool = {
  name: "copy_path",
  description: "Copy a file or directory to a new location",
  input_schema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description: "Source path",
      },
      destination: {
        type: "string",
        description: "Destination path",
      },
      recursive: {
        type: "boolean",
        description: "If true, copy directories recursively (default: false)",
      },
    },
    required: ["source", "destination"],
  },
};

export const DIAGNOSTICS_TOOL: Tool = {
  name: "diagnostics",
  description: "Get LSP diagnostics (errors, warnings) for the current project or specific file",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to file or directory to get diagnostics for (optional, defaults to all)",
      },
      severity: {
        type: "string",
        description: "Filter by severity: 'error', 'warning', 'info', 'hint' (optional)",
      },
    },
    required: [],
  },
};

export const WEB_SEARCH_TOOL: Tool = {
  name: "web_search",
  description: "Search the web for information using a search engine",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query",
      },
      max_results: {
        type: "number",
        description: "Maximum number of results to return (default: 10)",
      },
    },
    required: ["query"],
  },
};

export const FETCH_TOOL: Tool = {
  name: "fetch",
  description: "Fetch content from a URL (HTTP/HTTPS)",
  input_schema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The URL to fetch",
      },
      method: {
        type: "string",
        description: "HTTP method (GET, POST, etc.) - default: GET",
      },
      headers: {
        type: "object",
        description: "HTTP headers as key-value pairs",
      },
      body: {
        type: "string",
        description: "Request body (for POST, PUT, etc.)",
      },
    },
    required: ["url"],
  },
};

export const THINKING_TOOL: Tool = {
  name: "thinking",
  description:
    "Use extended thinking for complex reasoning tasks. This allows the model to think step-by-step before responding.",
  input_schema: {
    type: "object",
    properties: {
      thought: {
        type: "string",
        description: "The thought or reasoning process",
      },
    },
    required: ["thought"],
  },
};

export const OPEN_TOOL: Tool = {
  name: "open",
  description: "Open a file in the editor at a specific line/column",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file to open",
      },
      line: {
        type: "number",
        description: "Line number to jump to (optional)",
      },
      column: {
        type: "number",
        description: "Column number to jump to (optional)",
      },
    },
    required: ["path"],
  },
};

// ============================================================================
// Tool Registry
// ============================================================================

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private executors: Map<string, ToolExecutor> = new Map();

  // MCP tools tracking
  private mcpTools: Map<string, MCPToolMetadata> = new Map(); // key: toolName, value: metadata
  private mcpClient = getMCPClient();

  constructor() {
    // Register native tools
    this.registerTool(READ_FILE_TOOL, this.executeReadFile);
    this.registerTool(WRITE_FILE_TOOL, this.executeWriteFile);
    this.registerTool(LIST_DIRECTORY_TOOL, this.executeListDirectory);
    this.registerTool(SEARCH_FILES_TOOL, this.executeSearchFiles);
    this.registerTool(CREATE_DIRECTORY_TOOL, this.executeCreateDirectory);
    this.registerTool(GREP_TOOL, this.executeGrep);
    this.registerTool(FIND_PATH_TOOL, this.executeFindPath);
    this.registerTool(TERMINAL_TOOL, this.executeTerminal);
    this.registerTool(DELETE_PATH_TOOL, this.executeDeletePath);
    this.registerTool(MOVE_PATH_TOOL, this.executeMovePath);
    this.registerTool(COPY_PATH_TOOL, this.executeCopyPath);
    this.registerTool(DIAGNOSTICS_TOOL, this.executeDiagnostics);
    this.registerTool(WEB_SEARCH_TOOL, this.executeWebSearch);
    this.registerTool(FETCH_TOOL, this.executeFetch);
    this.registerTool(THINKING_TOOL, this.executeThinking);
    this.registerTool(OPEN_TOOL, this.executeOpen);
  }

  /**
   * Register a native tool with its executor
   */
  registerTool(tool: Tool, executor: ToolExecutor): void {
    this.tools.set(tool.name, tool);
    this.executors.set(tool.name, executor);
  }

  /**
   * Register an MCP tool from a server
   * Tool names are prefixed with server ID to avoid conflicts
   */
  registerMCPTool(serverId: string, mcpTool: MCPTool): void {
    const toolName = `${serverId}__${mcpTool.name}`;

    // Convert MCP tool to standard Tool format
    const tool: Tool = {
      name: toolName,
      description: `[${serverId}] ${mcpTool.description}`,
      input_schema: mcpTool.inputSchema,
    };

    this.tools.set(toolName, tool);

    // Track MCP tool metadata
    this.mcpTools.set(toolName, {
      serverId,
      originalName: mcpTool.name,
      isMCP: true,
    });

    console.log(`[ToolRegistry] Registered MCP tool: ${toolName} from server ${serverId}`);
  }

  /**
   * Unregister all tools from a specific MCP server
   */
  unregisterMCPServer(serverId: string): void {
    const toolsToRemove: string[] = [];

    // Find all tools from this server
    for (const [toolName, metadata] of this.mcpTools.entries()) {
      if (metadata.serverId === serverId) {
        toolsToRemove.push(toolName);
      }
    }

    // Remove them
    for (const toolName of toolsToRemove) {
      this.tools.delete(toolName);
      this.mcpTools.delete(toolName);
      console.log(`[ToolRegistry] Unregistered MCP tool: ${toolName}`);
    }
  }

  /**
   * Get a tool by name (native or MCP)
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools (native + MCP)
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get only native tools
   */
  getNativeTools(): Tool[] {
    return Array.from(this.tools.values()).filter((tool) => !this.mcpTools.has(tool.name));
  }

  /**
   * Get only MCP tools
   */
  getMCPTools(): Tool[] {
    return Array.from(this.tools.values()).filter((tool) => this.mcpTools.has(tool.name));
  }

  /**
   * Check if a tool is from MCP
   */
  isMCPTool(toolName: string): boolean {
    return this.mcpTools.has(toolName);
  }

  /**
   * Execute a tool (native or MCP)
   */
  async execute(name: string, input: any, context: ToolExecutionContext): Promise<any> {
    // Check if this is an MCP tool
    const mcpMetadata = this.mcpTools.get(name);

    if (mcpMetadata) {
      // Execute MCP tool
      console.log(
        `[ToolRegistry] Executing MCP tool: ${name} (${mcpMetadata.originalName}) on server ${mcpMetadata.serverId}`,
      );

      try {
        const result = await this.mcpClient.callTool(
          mcpMetadata.serverId,
          mcpMetadata.originalName,
          input,
        );

        if (result.isError) {
          throw new Error(result.content);
        }

        return result.content;
      } catch (error: any) {
        console.error(`[ToolRegistry] MCP tool execution failed:`, error);
        throw new Error(`MCP tool ${mcpMetadata.originalName} failed: ${error.message}`);
      }
    }

    // Execute native tool
    const executor = this.executors.get(name);
    if (!executor) {
      throw new Error(`Tool not found: ${name}`);
    }

    return executor(input, context);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Tool Executors
  // ──────────────────────────────────────────────────────────────────────

  private executeReadFile = async (
    input: { path: string },
    context: ToolExecutionContext,
  ): Promise<string> => {
    const { path } = input;

    try {
      const fullPath = await resolveWorkspacePath(context.workspaceRoot, path);
      const content = await invoke<string>("read_file_contents", { path: fullPath });
      return content;
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }
  };

  private executeWriteFile = async (
    input: { path: string; content: string },
    context: ToolExecutionContext,
  ): Promise<string> => {
    const { path, content } = input;

    try {
      const fullPath = await resolveWorkspacePath(context.workspaceRoot, path);
      await invoke("write_file_contents", { path: fullPath, content });
      return `Successfully wrote ${content.length} characters to ${path}`;
    } catch (error) {
      throw new Error(`Failed to write file: ${error}`);
    }
  };

  private executeListDirectory = async (
    input: { path: string },
    context: ToolExecutionContext,
  ): Promise<string> => {
    const { path } = input;

    try {
      const fullPath = await resolveWorkspacePath(context.workspaceRoot, path);
      const entries = await invoke<string[]>("list_directory", { path: fullPath });

      // Format as a nice list
      const formatted = entries
        .map((entry) => {
          const isDir = entry.endsWith("/");
          const name = isDir ? entry.slice(0, -1) : entry;
          return isDir ? `📁 ${name}/` : `📄 ${name}`;
        })
        .join("\n");

      return `Directory contents of ${path}:\n\n${formatted}`;
    } catch (error) {
      throw new Error(`Failed to list directory: ${error}`);
    }
  };

  private executeSearchFiles = async (
    input: { pattern: string },
    context: ToolExecutionContext,
  ): Promise<string> => {
    const { pattern } = input;
    const { workspaceRoot } = context;

    if (!workspaceRoot) {
      throw new Error("No workspace root available");
    }

    try {
      const results = await invoke<string[]>("search_files", {
        rootPath: workspaceRoot,
        pattern,
      });

      if (results.length === 0) {
        return `No files found matching pattern: ${pattern}`;
      }

      return `Found ${results.length} file(s):\n\n${results.join("\n")}`;
    } catch (error) {
      throw new Error(`Failed to search files: ${error}`);
    }
  };

  private executeCreateDirectory = async (
    input: { path: string },
    context: ToolExecutionContext,
  ): Promise<string> => {
    const { path } = input;

    try {
      const fullPath = await resolveWorkspacePath(context.workspaceRoot, path);
      await invoke("create_directory", { path: fullPath });
      return `Successfully created directory: ${path}`;
    } catch (error) {
      throw new Error(`Failed to create directory: ${error}`);
    }
  };

  private executeGrep = async (
    input: { pattern: string; path?: string; case_sensitive?: boolean; max_results?: number },
    context: ToolExecutionContext,
  ): Promise<string> => {
    const { pattern, path = ".", case_sensitive = false, max_results = 100 } = input;
    const { workspaceRoot } = context;

    try {
      const searchPath = await resolveWorkspacePath(workspaceRoot, path);
      const results = await invoke<Array<{ file: string; line: number; content: string }>>(
        "grep_search",
        {
          path: searchPath,
          pattern,
          case_sensitive,
          max_results,
        },
      );

      if (results.length === 0) {
        return `No matches found for pattern: ${pattern}`;
      }

      const formatted = results.map((r) => `${r.file}:${r.line}: ${r.content}`).join("\n");

      return `Found ${results.length} match(es):\n\n${formatted}`;
    } catch (error) {
      throw new Error(`Grep search failed: ${error}`);
    }
  };

  private executeFindPath = async (
    input: { query: string; max_results?: number },
    context: ToolExecutionContext,
  ): Promise<string> => {
    const { query, max_results = 20 } = input;
    const { workspaceRoot } = context;

    if (!workspaceRoot) {
      throw new Error("No workspace root available");
    }

    try {
      const results = await invoke<string[]>("fuzzy_find_files", {
        root_path: workspaceRoot,
        query,
        max_results: max_results,
      });

      if (results.length === 0) {
        return `No files found matching: ${query}`;
      }

      return `Found ${results.length} file(s):\n\n${results.join("\n")}`;
    } catch (error) {
      throw new Error(`File search failed: ${error}`);
    }
  };

  private executeTerminal = async (
    input: { command: string; working_directory?: string },
    context: ToolExecutionContext,
  ): Promise<string> => {
    const { command, working_directory } = input;

    try {
      let cwd: string | undefined;
      if (context.workspaceRoot || working_directory) {
        cwd = await resolveWorkspacePath(context.workspaceRoot, working_directory);
      }

      const result = await invoke<{ stdout: string; stderr: string; exit_code: number }>(
        "execute_command",
        {
          command,
          cwd,
        },
      );

      const output = [];
      if (result.stdout) output.push(result.stdout);
      if (result.stderr) output.push(`[stderr]\n${result.stderr}`);
      output.push(`\n[exit code: ${result.exit_code}]`);

      return output.join("\n");
    } catch (error) {
      throw new Error(`Command execution failed: ${error}`);
    }
  };

  private executeDeletePath = async (
    input: { path: string; recursive?: boolean },
    context: ToolExecutionContext,
  ): Promise<string> => {
    const { path, recursive = false } = input;
    try {
      const fullPath = await resolveWorkspacePath(context.workspaceRoot, path);
      await invoke("delete_path", { path: fullPath, recursive });
      return `Successfully deleted: ${path}`;
    } catch (error) {
      throw new Error(`Failed to delete path: ${error}`);
    }
  };

  private executeMovePath = async (
    input: { source: string; destination: string },
    context: ToolExecutionContext,
  ): Promise<string> => {
    const { source, destination } = input;
    try {
      const sourcePath = await resolveWorkspacePath(context.workspaceRoot, source);
      const destPath = await resolveWorkspacePath(context.workspaceRoot, destination);
      await invoke("move_path", { source: sourcePath, destination: destPath });
      return `Successfully moved ${source} to ${destination}`;
    } catch (error) {
      throw new Error(`Failed to move path: ${error}`);
    }
  };

  private executeCopyPath = async (
    input: { source: string; destination: string; recursive?: boolean },
    context: ToolExecutionContext,
  ): Promise<string> => {
    const { source, destination, recursive = false } = input;
    try {
      const sourcePath = await resolveWorkspacePath(context.workspaceRoot, source);
      const destPath = await resolveWorkspacePath(context.workspaceRoot, destination);
      await invoke("copy_path", {
        source: sourcePath,
        destination: destPath,
        recursive,
      });
      return `Successfully copied ${source} to ${destination}`;
    } catch (error) {
      throw new Error(`Failed to copy path: ${error}`);
    }
  };

  private executeDiagnostics = async (
    input: { path?: string; severity?: string },
    context: ToolExecutionContext,
  ): Promise<string> => {
    const { path, severity } = input;
    try {
      const searchPath = path
        ? await resolveWorkspacePath(context.workspaceRoot, path)
        : context.workspaceRoot;

      if (!searchPath) {
        throw new Error("No workspace root available");
      }

      const diagnostics = await invoke<
        Array<{
          file: string;
          line: number;
          column: number;
          severity: string;
          message: string;
          source?: string;
        }>
      >("get_diagnostics", {
        path: searchPath,
        severity,
      });

      if (diagnostics.length === 0) {
        return severity ? `No ${severity} diagnostics found` : "No diagnostics found - all clear!";
      }

      const formatted = diagnostics
        .map(
          (d) =>
            `${d.file}:${d.line}:${d.column} [${d.severity}] ${d.message}${d.source ? ` (${d.source})` : ""}`,
        )
        .join("\n");

      const summary = diagnostics.reduce(
        (acc, d) => {
          acc[d.severity] = (acc[d.severity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const summaryText = Object.entries(summary)
        .map(([sev, count]) => `${count} ${sev}${count > 1 ? "s" : ""}`)
        .join(", ");

      return `Found ${diagnostics.length} diagnostic(s) (${summaryText}):\n\n${formatted}`;
    } catch (error) {
      throw new Error(`Failed to get diagnostics: ${error}`);
    }
  };

  private executeWebSearch = async (
    input: { query: string; max_results?: number },
    _context: ToolExecutionContext,
  ): Promise<string> => {
    const { query, max_results = 10 } = input;

    try {
      const results = await invoke<
        Array<{
          title: string;
          url: string;
          snippet: string;
        }>
      >("web_search", {
        query,
        max_results,
      });

      if (results.length === 0) {
        return `No results found for: ${query}`;
      }

      const formatted = results
        .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`)
        .join("\n\n");

      return `Search results for "${query}" (${results.length} result${results.length > 1 ? "s" : ""}):\n\n${formatted}`;
    } catch (error) {
      throw new Error(`Web search failed: ${error}`);
    }
  };

  private executeFetch = async (
    input: { url: string; method?: string; headers?: Record<string, string>; body?: string },
    _context: ToolExecutionContext,
  ): Promise<string> => {
    const { url, method = "GET", headers, body } = input;

    try {
      const response = await invoke<{
        status: number;
        headers: Record<string, string>;
        body: string;
      }>("fetch_url", {
        url,
        method,
        headers,
        body,
      });

      const contentType = response.headers["content-type"] || "text/plain";
      const isJson = contentType.includes("application/json");

      let formattedBody = response.body;
      if (isJson) {
        try {
          const json = JSON.parse(response.body);
          formattedBody = JSON.stringify(json, null, 2);
        } catch {
          // Keep as-is if JSON parsing fails
        }
      }

      const truncateLimit = 10000;
      let truncated = false;
      if (formattedBody.length > truncateLimit) {
        formattedBody = formattedBody.slice(0, truncateLimit);
        truncated = true;
      }

      return [
        `HTTP ${response.status} ${method} ${url}`,
        `Content-Type: ${contentType}`,
        "",
        formattedBody,
        truncated ? "\n... (response truncated)" : "",
      ].join("\n");
    } catch (error) {
      throw new Error(`Fetch failed: ${error}`);
    }
  };

  private executeThinking = async (
    input: { thought: string },
    _context: ToolExecutionContext,
  ): Promise<string> => {
    const { thought } = input;

    // The thinking tool doesn't perform an action - it just returns the thought
    // This allows the AI to show its reasoning process explicitly
    return `💭 Thinking: ${thought}`;
  };

  private executeOpen = async (
    input: { path: string; line?: number; column?: number },
    context: ToolExecutionContext,
  ): Promise<string> => {
    const { path, line, column } = input;

    try {
      const fullPath = await resolveWorkspacePath(context.workspaceRoot, path);

      const { handleFileSelect } = useFileSystemStore.getState();
      await handleFileSelect(fullPath, false, line, column);

      const location =
        line !== undefined ? `:${line}${column !== undefined ? `:${column}` : ""}` : "";
      return `Opened ${path}${location} in editor`;
    } catch (error) {
      throw new Error(`Failed to open file: ${error}`);
    }
  };
}

// ============================================================================
// Types
// ============================================================================

export interface ToolExecutionContext {
  workspaceRoot?: string;
  activeFile?: {
    path: string;
    content: string;
    language: string;
  };
  openFiles?: Array<{
    path: string;
    content: string;
  }>;
}

export type ToolExecutor = (input: any, context: ToolExecutionContext) => Promise<any>;

/**
 * Metadata for MCP tools to track their origin
 */
export interface MCPToolMetadata {
  serverId: string;
  originalName: string;
  isMCP: true;
}
