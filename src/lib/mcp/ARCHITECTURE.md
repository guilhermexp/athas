# MCP Integration Architecture

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                            │
│                     (Agent Panel / Chat Input)                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ User sends message
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         NATIVE AGENT                                │
│  File: src/lib/native-agent/agent.ts                               │
│                                                                     │
│  • processMessage()                                                │
│  • buildToolDefinitions() ◄── INTEGRATES MCP TOOLS                │
│  • processToolCalls()                                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │                            │
                    ▼                            ▼
         ┌──────────────────┐         ┌──────────────────┐
         │  Native Tools    │         │   MCP Servers    │
         │                  │         │   (from store)   │
         │  • read_file     │         │                  │
         │  • write_file    │         │  status=running  │
         │  • grep          │         │  tools: [...]    │
         │  • terminal      │         └──────────────────┘
         └──────────────────┘                  │
                    │                          │
                    │                          │ for each tool
                    │                          ▼
                    │              ┌──────────────────────────┐
                    │              │ toolRegistry.            │
                    │              │ registerMCPTool(         │
                    │              │   serverId, mcpTool)     │
                    │              └──────────────────────────┘
                    │                          │
                    └──────────────┬───────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────────────┐
                    │    Combined Tools Array              │
                    │                                      │
                    │  [                                   │
                    │    "read_file",           ← native  │
                    │    "write_file",          ← native  │
                    │    "github__create_issue",← MCP     │
                    │    "slack__send_message"  ← MCP     │
                    │  ]                                   │
                    └──────────────────────────────────────┘
                                   │
                                   │ Sent to Anthropic
                                   ▼
                    ┌──────────────────────────────────────┐
                    │         CLAUDE DECIDES               │
                    │   "Use github__create_issue"         │
                    └──────────────────────────────────────┘
                                   │
                                   │ Tool execution
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         TOOL REGISTRY                               │
│  File: src/lib/native-agent/tools.ts                               │
│                                                                     │
│  execute(name, input, context)                                     │
│    │                                                                │
│    ├─ isMCPTool(name)?                                            │
│    │   YES → Route to MCP Client                                  │
│    │   NO  → Route to Native Executor                             │
│    │                                                                │
│    └─ Maps:                                                        │
│       • tools: Map<name, Tool>         (all tools)                │
│       • mcpTools: Map<name, metadata>  (MCP only)                 │
│       • executors: Map<name, fn>       (native only)              │
└─────────────────────────────────────────────────────────────────────┘
           │                              │
           │ Native                       │ MCP
           ▼                              ▼
┌──────────────────┐         ┌──────────────────────────────┐
│ Native Executor  │         │      MCP CLIENT              │
│                  │         │  File: src/lib/mcp/client.ts │
│ Direct function  │         │                              │
│ call in TS       │         │  callTool(serverId,          │
│                  │         │           toolName, args)    │
└──────────────────┘         └──────────────────────────────┘
           │                              │
           │                              │ invoke()
           │                              ▼
           │                 ┌──────────────────────────────┐
           │                 │    TAURI BACKEND (Rust)      │
           │                 │  File: src-tauri/src/        │
           │                 │                              │
           │                 │  Commands:                   │
           │                 │  • call_mcp_tool()          │
           │                 │  • get_mcp_server_tools()   │
           │                 │                              │
           │                 │  Bridge:                     │
           │                 │  • McpBridge                 │
           │                 │    - manages processes       │
           │                 │    - stdin/stdout comm       │
           │                 └──────────────────────────────┘
           │                              │
           │                              │ JSON-RPC
           │                              ▼
           │                 ┌──────────────────────────────┐
           │                 │    MCP SERVER PROCESS        │
           │                 │  (external program)          │
           │                 │                              │
           │                 │  • Receives JSON-RPC         │
           │                 │  • Executes tool             │
           │                 │  • Returns result            │
           │                 └──────────────────────────────┘
           │                              │
           └──────────────┬───────────────┘
                          │
                          │ Result
                          ▼
           ┌──────────────────────────────┐
           │    RESULT FLOWS BACK UP      │
           │                              │
           │  Agent → History → UI        │
           └──────────────────────────────┘
```

## Tool Naming Convention

### Native Tools
- Simple name: `read_file`, `grep`, `terminal`
- Stored in: `ToolRegistry.tools` + `ToolRegistry.executors`

### MCP Tools
- Prefixed name: `{serverId}__{toolName}`
- Example: `github-server__create_issue`
- Stored in: `ToolRegistry.tools` + `ToolRegistry.mcpTools`

### Why Prefix?
1. **Avoid conflicts**: Multiple servers might have tools with same name
2. **Server identification**: Easy to know which server a tool belongs to
3. **Clean separation**: Clear distinction between native and MCP tools

## Data Flow Example

### 1. Server Registration
```typescript
// User enables MCP server in config
mcpServers.set("github-server", {
  id: "github-server",
  status: "running",
  tools: [
    {
      name: "create_issue",
      description: "Create GitHub issue",
      inputSchema: { /* ... */ }
    }
  ]
});
```

### 2. Tool Registration (in agent.buildToolDefinitions)
```typescript
// For each running MCP server
for (const [serverId, server] of context.mcpServers) {
  if (server.status === "running") {
    for (const mcpTool of server.tools) {
      // Register: github-server__create_issue
      toolRegistry.registerMCPTool(serverId, mcpTool);
    }
  }
}
```

### 3. Tool Execution
```typescript
// Claude decides to use: github-server__create_issue
await toolRegistry.execute(
  "github-server__create_issue",
  { title: "Bug", body: "..." },
  context
);

// ToolRegistry detects MCP tool
const metadata = mcpTools.get("github-server__create_issue");
// { serverId: "github-server", originalName: "create_issue" }

// Routes to MCP Client
await mcpClient.callTool(
  "github-server",      // from metadata
  "create_issue",       // from metadata
  { title: "Bug", body: "..." }
);

// MCP Client calls Rust
await invoke("call_mcp_tool", {
  serverId: "github-server",
  toolName: "create_issue",
  arguments: { title: "Bug", body: "..." }
});

// Rust sends JSON-RPC to MCP server process
// (stub - not yet implemented)
```

## Key Design Decisions

### 1. Centralized Tool Management
All tools (native + MCP) go through single ToolRegistry
- **Benefit**: Unified interface for agent
- **Benefit**: Easy to add/remove tools dynamically

### 2. Lazy Registration
MCP tools are registered on-demand in buildToolDefinitions
- **Benefit**: Always up-to-date with server status
- **Benefit**: Handles server restarts automatically

### 3. Metadata Tracking
Separate map tracks MCP tool origins
- **Benefit**: Can route to correct server
- **Benefit**: Can unregister by server ID
- **Benefit**: Can distinguish tool types

### 4. Name Prefixing
Tools prefixed with server ID
- **Benefit**: No conflicts between servers
- **Benefit**: Clear tool provenance
- **Downside**: Longer tool names (acceptable)

## Future Enhancements

### 1. Tool Caching
Cache tool definitions to reduce overhead
```typescript
private toolCache: Map<string, { tools: Tool[], timestamp: number }>;
```

### 2. Auto-discovery
Fetch tools when server starts
```typescript
mcpStore.toggleMCPServer(serverId);
// → start server
// → automatically fetch tools
// → register in ToolRegistry
```

### 3. Health Checks
Monitor server health and remove tools if unhealthy
```typescript
setInterval(() => {
  for (const server of runningServers) {
    if (!isHealthy(server)) {
      toolRegistry.unregisterMCPServer(server.id);
    }
  }
}, 5000);
```

### 4. Tool Versioning
Track tool schema versions for compatibility
```typescript
interface MCPToolMetadata {
  serverId: string;
  originalName: string;
  version: string;  // NEW
  isMCP: true;
}
```
