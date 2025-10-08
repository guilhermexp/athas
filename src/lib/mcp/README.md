# MCP Integration for Native Agent

This module integrates Model Context Protocol (MCP) servers with the Native Agent's ToolRegistry.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Native Agent                           │
│  - Manages conversation flow                                │
│  - Builds tool definitions (native + MCP)                   │
│  - Executes tools via ToolRegistry                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     ToolRegistry                            │
│  - Manages both native and MCP tools                        │
│  - Prefixes MCP tools: {serverId}__{toolName}              │
│  - Routes execution to native or MCP client                 │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
       ┌────────────────┐         ┌────────────────┐
       │ Native Tools   │         │   MCP Client   │
       │ (file, git,    │         │  - Communicates│
       │  terminal...)  │         │    with servers│
       └────────────────┘         └────────────────┘
                                          │
                                          ▼
                              ┌────────────────────────┐
                              │   Tauri Backend        │
                              │  (MCP Bridge)          │
                              │  - Manages processes   │
                              │  - JSON-RPC protocol   │
                              └────────────────────────┘
                                          │
                                          ▼
                              ┌────────────────────────┐
                              │   MCP Servers          │
                              │  (external processes)  │
                              └────────────────────────┘
```

## Components

### 1. MCP Client (`client.ts`)

The TypeScript client that communicates with the Rust backend to interact with MCP servers.

**Key Methods:**
- `getServerTools(serverId)` - Fetch available tools from a server
- `callTool(serverId, toolName, args)` - Execute a tool on a server
- `getAllActiveTools(servers)` - Get tools from all running servers

### 2. ToolRegistry Extensions (`../native-agent/tools.ts`)

**New Methods:**
- `registerMCPTool(serverId, mcpTool)` - Register a tool from an MCP server
- `unregisterMCPServer(serverId)` - Remove all tools from a disconnected server
- `isMCPTool(toolName)` - Check if a tool is from MCP
- `getMCPTools()` - Get only MCP tools
- `getNativeTools()` - Get only native tools

**Tool Naming:**
MCP tools are prefixed with their server ID to avoid conflicts:
- Native tool: `read_file`
- MCP tool: `github-server__create_issue`

### 3. Native Agent Integration (`../native-agent/agent.ts`)

The `buildToolDefinitions()` method now:
1. Adds all enabled native tools
2. Iterates through active MCP servers
3. Registers MCP tools in the ToolRegistry
4. Includes them in the Anthropic tools array

### 4. Rust Backend (`src-tauri/src/`)

**Commands (`commands/mcp.rs`):**
- `start_mcp_server` - Start an MCP server process
- `stop_mcp_server` - Stop an MCP server process
- `get_mcp_server_tools` - List tools from a server (stub)
- `call_mcp_tool` - Execute a tool on a server (stub)

**Bridge (`mcp_bridge.rs`):**
- Manages MCP server processes
- Handles stdin/stdout communication (stub implementation)
- Future: Full JSON-RPC protocol implementation

## Tool Execution Flow

```
1. User sends message
   ↓
2. Agent builds tools (native + MCP from active servers)
   ↓
3. Claude decides to use tool: "github-server__create_issue"
   ↓
4. Agent calls: toolRegistry.execute("github-server__create_issue", {...})
   ↓
5. ToolRegistry detects it's an MCP tool
   ↓
6. Calls: mcpClient.callTool("github-server", "create_issue", {...})
   ↓
7. MCP Client invokes Tauri: call_mcp_tool(...)
   ↓
8. Rust backend sends JSON-RPC to MCP server process
   ↓
9. Result flows back up the chain
```

## MCP Server Management

MCP servers are managed in the AgentPanelStore:
- `mcpServers: MCPServer[]` - All configured servers
- `activeMCPServerIds: Set<string>` - Currently running servers

Servers can be:
- Started/stopped via `toggleMCPServer(serverId)`
- Added via `addMCPServer(server)`
- Removed via `removeMCPServer(serverId)`

## Types

### MCPServer
```typescript
interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  status: "stopped" | "starting" | "running" | "error";
  tools: MCPTool[];
  resources?: MCPResource[];
  prompts?: MCPPrompt[];
}
```

### MCPTool
```typescript
interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}
```

## Current Implementation Status

✅ **Completed:**
- MCP client architecture
- ToolRegistry extension for MCP tools
- Tool prefixing to avoid conflicts
- Agent integration in buildToolDefinitions
- Rust commands structure
- Server process management

⚠️ **Stub/Incomplete:**
- `get_mcp_server_tools` - Returns empty array
- `call_mcp_tool` - Returns stub error
- JSON-RPC protocol implementation
- Tool discovery on server start
- Response parsing

## Future Improvements

1. **Full JSON-RPC Implementation**
   - Implement proper request/response handling
   - Add request ID tracking
   - Implement timeout handling

2. **Tool Discovery**
   - Automatically fetch tools when server starts
   - Update ToolRegistry when server connects
   - Handle server disconnections gracefully

3. **Error Handling**
   - Better error messages for MCP failures
   - Retry logic for transient failures
   - Fallback when MCP server is unresponsive

4. **Performance**
   - Cache tool definitions
   - Pool connections to servers
   - Batch tool calls when possible

5. **Developer Experience**
   - MCP server configuration UI
   - Tool browser/explorer
   - Logs viewer for MCP communication

## Example Usage

```typescript
// In agent context
const context: AgentContext = {
  enabledTools: ["read_file", "write_file"],
  mcpServers: new Map([
    ["github-server", {
      id: "github-server",
      name: "GitHub MCP Server",
      status: "running",
      tools: [
        {
          name: "create_issue",
          description: "Create a GitHub issue",
          inputSchema: { /* ... */ }
        }
      ]
    }]
  ]),
  // ... other context
};

// The agent automatically includes MCP tools
// Tool registry will have:
// - read_file (native)
// - write_file (native)
// - github-server__create_issue (MCP)
```

## Testing

To test MCP integration:

1. Configure an MCP server in the store
2. Start the server via `toggleMCPServer()`
3. Verify server status is "running"
4. Check that tools appear in the agent's tool list
5. Try using an MCP tool in conversation
6. Check console logs for execution flow

## References

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Available MCP Servers](https://github.com/modelcontextprotocol/servers)
