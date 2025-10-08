/**
 * MCP Client - Manages communication with MCP servers
 * This acts as a bridge between the Native Agent and MCP servers
 */

import { invoke } from "@tauri-apps/api/core";
import type { MCPServer, MCPTool } from "@/components/agent-panel/types";

export interface MCPToolCall {
  serverId: string;
  toolName: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: any;
  isError?: boolean;
}

/**
 * MCP Client for communicating with MCP servers via Tauri backend
 */
export class MCPClient {
  /**
   * Get tools from an MCP server
   */
  async getServerTools(serverId: string): Promise<MCPTool[]> {
    try {
      const tools = await invoke<MCPTool[]>("get_mcp_server_tools", { serverId });
      return tools;
    } catch (error) {
      console.error(`Failed to get tools from MCP server ${serverId}:`, error);
      return [];
    }
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, any>,
  ): Promise<MCPToolResult> {
    try {
      const result = await invoke<MCPToolResult>("call_mcp_tool", {
        serverId,
        toolName,
        arguments: args,
      });
      return result;
    } catch (error: any) {
      console.error(`Failed to call MCP tool ${toolName} on server ${serverId}:`, error);
      return {
        content: error.message || `Failed to execute MCP tool: ${toolName}`,
        isError: true,
      };
    }
  }

  /**
   * Get all tools from active MCP servers
   */
  async getAllActiveTools(servers: MCPServer[]): Promise<Map<string, MCPTool[]>> {
    const toolsMap = new Map<string, MCPTool[]>();

    const runningServers = servers.filter((s) => s.status === "running");

    for (const server of runningServers) {
      const tools = await this.getServerTools(server.id);
      if (tools.length > 0) {
        toolsMap.set(server.id, tools);
      }
    }

    return toolsMap;
  }
}

// Singleton instance
let mcpClientInstance: MCPClient | null = null;

export function getMCPClient(): MCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClient();
  }
  return mcpClientInstance;
}
