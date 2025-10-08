# Exemplo: Integração com MCP Servers

Este exemplo mostra como conectar a MCP (Model Context Protocol) servers para estender as capacidades do agente com tools externas.

---

## O que é MCP?

MCP (Model Context Protocol) é um protocolo padrão para conectar servidores que fornecem tools/recursos para agentes de IA. Servidores MCP podem fornecer:

- Tools personalizadas (database queries, API calls, etc)
- Resources (arquivos, dados, etc)
- Prompts pré-configurados

---

## Arquitetura

```
┌──────────────┐
│   Agent      │
└──────┬───────┘
       │
┌──────▼────────────┐
│  MCP Manager      │
└──────┬────────────┘
       │
       ├──►┌─────────────────┐
       │   │ Filesystem MCP  │
       │   └─────────────────┘
       │
       ├──►┌─────────────────┐
       │   │   GitHub MCP    │
       │   └─────────────────┘
       │
       └──►┌─────────────────┐
           │   Custom MCP    │
           └─────────────────┘
```

---

## 1. MCP Client

### mcp-client.ts

```typescript
import { spawn, ChildProcess } from 'child_process';

interface McpTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface McpServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export class McpClient {
  private process: ChildProcess | null = null;
  private tools: McpTool[] = [];
  private messageId = 0;
  private pendingRequests = new Map<number, any>();
  private buffer = '';

  constructor(private server: McpServer) {}

  async connect(): Promise<McpTool[]> {
    return new Promise((resolve, reject) => {
      // Spawn MCP server
      this.process = spawn(this.server.command, this.server.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...this.server.env }
      });

      // Handle output
      this.process.stdout?.on('data', (data) => {
        this.handleData(data);
      });

      this.process.stderr?.on('data', (data) => {
        console.error(`[${this.server.id}] stderr:`, data.toString());
      });

      // Initialize
      this.send({
        jsonrpc: '2.0',
        id: this.nextId(),
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          clientInfo: {
            name: 'Agent Client',
            version: '1.0.0'
          }
        }
      }).then(() => {
        // List tools
        return this.send({
          jsonrpc: '2.0',
          id: this.nextId(),
          method: 'tools/list',
          params: {}
        });
      }).then((result) => {
        this.tools = result.tools;
        resolve(this.tools);
      }).catch(reject);
    });
  }

  async callTool(name: string, arguments_: any): Promise<any> {
    const result = await this.send({
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'tools/call',
      params: {
        name,
        arguments: arguments_
      }
    });

    return result.content;
  }

  getTools(): McpTool[] {
    return this.tools;
  }

  private async send(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = message.id;
      this.pendingRequests.set(id, { resolve, reject });

      const json = JSON.stringify(message) + '\n';
      this.process?.stdin?.write(json);
    });
  }

  private handleData(data: Buffer) {
    this.buffer += data.toString();

    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.handleMessage(message);
        } catch (error) {
          console.error('Parse error:', error);
        }
      }
    }
  }

  private handleMessage(message: any) {
    if ('id' in message && message.id !== undefined) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);

        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
    }
  }

  disconnect() {
    this.process?.kill();
    this.process = null;
  }

  private nextId(): number {
    return ++this.messageId;
  }
}
```

---

## 2. MCP Manager

### mcp-manager.ts

```typescript
import { McpClient } from './mcp-client';

interface McpServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled?: boolean;
}

export class McpManager {
  private clients = new Map<string, McpClient>();
  private allTools = new Map<string, { serverId: string; tool: any }>();

  async connectToServers(configs: McpServerConfig[]) {
    for (const config of configs) {
      if (config.enabled === false) continue;

      try {
        console.log(`Connecting to ${config.name}...`);

        const client = new McpClient(config);
        const tools = await client.connect();

        this.clients.set(config.id, client);

        // Register tools with server prefix
        for (const tool of tools) {
          const fullName = `${config.id}.${tool.name}`;
          this.allTools.set(fullName, {
            serverId: config.id,
            tool: {
              ...tool,
              name: fullName
            }
          });
        }

        console.log(`✓ Connected to ${config.name} (${tools.length} tools)`);
      } catch (error) {
        console.error(`✗ Failed to connect to ${config.name}:`, error);
      }
    }
  }

  async callTool(fullToolName: string, input: any): Promise<any> {
    const toolInfo = this.allTools.get(fullToolName);
    if (!toolInfo) {
      throw new Error(`Tool not found: ${fullToolName}`);
    }

    const client = this.clients.get(toolInfo.serverId);
    if (!client) {
      throw new Error(`Server not connected: ${toolInfo.serverId}`);
    }

    // Extract original tool name (without server prefix)
    const originalToolName = toolInfo.tool.name.split('.').slice(1).join('.');

    return await client.callTool(originalToolName, input);
  }

  getAllTools(): any[] {
    return Array.from(this.allTools.values()).map(t => t.tool);
  }

  disconnectAll() {
    for (const client of this.clients.values()) {
      client.disconnect();
    }
    this.clients.clear();
    this.allTools.clear();
  }
}
```

---

## 3. Configuração de MCP Servers

### mcp-config.json

```json
{
  "mcpServers": [
    {
      "id": "filesystem",
      "name": "Filesystem Tools",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/user/workspace"],
      "enabled": true
    },
    {
      "id": "github",
      "name": "GitHub Tools",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxxx"
      },
      "enabled": true
    },
    {
      "id": "postgres",
      "name": "PostgreSQL Database",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"],
      "enabled": false
    },
    {
      "id": "brave-search",
      "name": "Brave Search",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "BSA_xxxxxxxxxxxxx"
      },
      "enabled": true
    },
    {
      "id": "custom",
      "name": "My Custom MCP Server",
      "command": "node",
      "args": ["./my-mcp-server.js"],
      "enabled": true
    }
  ]
}
```

---

## 4. Integração com Agent

### agent-with-mcp.ts

```typescript
import { AcpClient } from './client';
import { McpManager } from './mcp-manager';
import fs from 'fs/promises';

async function main() {
  // Load MCP config
  const configFile = await fs.readFile('mcp-config.json', 'utf-8');
  const config = JSON.parse(configFile);

  // Initialize MCP Manager
  const mcpManager = new McpManager();
  await mcpManager.connectToServers(config.mcpServers);

  console.log('\nAvailable MCP Tools:');
  for (const tool of mcpManager.getAllTools()) {
    console.log(`  - ${tool.name}: ${tool.description}`);
  }

  // Initialize Agent
  const agent = new AcpClient('python', ['agent_server.py']);
  const capabilities = await agent.connect();

  // Create session with MCP tools
  const sessionId = await agent.createSession(
    capabilities.models[0].id,
    'You are a helpful assistant with access to various tools.'
  );

  // Handle tool calls
  agent.onToolUse(async (params) => {
    const { toolName, input, toolCallId, sessionId: sid } = params;

    try {
      let result: string;

      // Check if it's an MCP tool
      if (toolName.includes('.')) {
        console.log(`Calling MCP tool: ${toolName}`);
        const mcpResult = await mcpManager.callTool(toolName, input);

        // MCP returns array of content blocks
        result = mcpResult.map((block: any) => {
          if (block.type === 'text') return block.text;
          if (block.type === 'image') return '[Image]';
          return JSON.stringify(block);
        }).join('\n');
      } else {
        // Regular tool
        console.log(`Calling regular tool: ${toolName}`);
        result = await executeLocalTool(toolName, input);
      }

      await agent.sendToolResult(sid, toolCallId, result, false);
    } catch (error: any) {
      await agent.sendToolResult(sid, toolCallId, error.message, true);
    }
  });

  // Send message
  console.log('\n🤖 Agent: Hello! I have access to tools from multiple MCP servers.');
  console.log('    Try asking me to:');
  console.log('    - List files (filesystem.list_directory)');
  console.log('    - Search GitHub (github.search_repositories)');
  console.log('    - Search web (brave-search.search)');
  console.log('');

  // Example interaction
  const response = await agent.sendMessage(
    sessionId,
    'List all files in the current directory using the filesystem MCP',
    (delta) => process.stdout.write(delta)
  );

  console.log('\n\nDone!');

  // Cleanup
  agent.disconnect();
  mcpManager.disconnectAll();
}

async function executeLocalTool(name: string, input: any): Promise<string> {
  // Implementation for local tools
  throw new Error(`Local tool not implemented: ${name}`);
}

main().catch(console.error);
```

---

## 5. Criando um MCP Server Customizado

### my-mcp-server.js

```javascript
#!/usr/bin/env node

const readline = require('readline');

class MyMcpServer {
  constructor() {
    this.messageId = 0;
  }

  // Handle incoming message
  handleMessage(message) {
    const { method, id } = message;

    switch (method) {
      case 'initialize':
        return this.handleInitialize(id);

      case 'tools/list':
        return this.handleToolsList(id);

      case 'tools/call':
        return this.handleToolsCall(id, message.params);

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        };
    }
  }

  handleInitialize(id) {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'My Custom MCP Server',
          version: '1.0.0'
        }
      }
    };
  }

  handleToolsList(id) {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'get_weather',
            description: 'Get current weather for a city',
            inputSchema: {
              type: 'object',
              properties: {
                city: {
                  type: 'string',
                  description: 'City name'
                }
              },
              required: ['city']
            }
          },
          {
            name: 'calculate',
            description: 'Perform mathematical calculation',
            inputSchema: {
              type: 'object',
              properties: {
                expression: {
                  type: 'string',
                  description: 'Math expression (e.g., "2 + 2")'
                }
              },
              required: ['expression']
            }
          },
          {
            name: 'get_time',
            description: 'Get current time',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      }
    };
  }

  async handleToolsCall(id, params) {
    const { name, arguments: args } = params;

    try {
      let content;

      switch (name) {
        case 'get_weather':
          content = await this.getWeather(args.city);
          break;

        case 'calculate':
          content = this.calculate(args.expression);
          break;

        case 'get_time':
          content = this.getTime();
          break;

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: content
            }
          ]
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error.message
        }
      };
    }
  }

  async getWeather(city) {
    // Simulated weather API call
    return `The weather in ${city} is sunny, 22°C`;
  }

  calculate(expression) {
    // CAUTION: eval is dangerous, this is just for demo
    // In production, use a safe math parser
    const result = eval(expression);
    return `${expression} = ${result}`;
  }

  getTime() {
    return new Date().toLocaleString();
  }

  run() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', (line) => {
      try {
        const message = JSON.parse(line);
        const response = this.handleMessage(message);

        if (response) {
          console.log(JSON.stringify(response));
        }
      } catch (error) {
        console.error('Error:', error.message);
      }
    });
  }
}

// Run server
const server = new MyMcpServer();
server.run();
```

**Tornar executável:**
```bash
chmod +x my-mcp-server.js
```

---

## 6. UI para MCP Servers

### McpServerManager.tsx

```typescript
import React, { useState, useEffect } from 'react';
import { McpManager } from './mcp-manager';

interface McpServerStatus {
  id: string;
  name: string;
  connected: boolean;
  toolCount: number;
  error?: string;
}

export const McpServerManager: React.FC = () => {
  const [servers, setServers] = useState<McpServerStatus[]>([]);
  const [manager] = useState(() => new McpManager());

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      const response = await fetch('/mcp-config.json');
      const config = await response.json();

      // Initialize status
      setServers(config.mcpServers.map((s: any) => ({
        id: s.id,
        name: s.name,
        connected: false,
        toolCount: 0
      })));

      // Connect
      await manager.connectToServers(config.mcpServers);

      // Update status
      const tools = manager.getAllTools();
      const toolsByServer = new Map<string, number>();

      for (const tool of tools) {
        const serverId = tool.name.split('.')[0];
        toolsByServer.set(serverId, (toolsByServer.get(serverId) || 0) + 1);
      }

      setServers(prev => prev.map(s => ({
        ...s,
        connected: toolsByServer.has(s.id),
        toolCount: toolsByServer.get(s.id) || 0
      })));
    } catch (error: any) {
      console.error('Failed to load servers:', error);
    }
  };

  return (
    <div className="mcp-server-manager">
      <h3>MCP Servers</h3>

      <div className="server-list">
        {servers.map(server => (
          <div
            key={server.id}
            className={`server-item ${server.connected ? 'connected' : 'disconnected'}`}
          >
            <div className="server-status">
              <span className={`status-dot ${server.connected ? 'online' : 'offline'}`} />
              <span className="server-name">{server.name}</span>
            </div>

            <div className="server-info">
              {server.connected ? (
                <span className="tool-count">{server.toolCount} tools</span>
              ) : (
                <span className="error">Disconnected</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .mcp-server-manager {
          padding: 15px;
        }

        h3 {
          margin: 0 0 15px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .server-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .server-item {
          padding: 10px;
          border-radius: 6px;
          border: 1px solid #ddd;
        }

        .server-item.connected {
          background: #e8f5e9;
          border-color: #4caf50;
        }

        .server-item.disconnected {
          background: #ffebee;
          border-color: #f44336;
        }

        .server-status {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.online {
          background: #4caf50;
        }

        .status-dot.offline {
          background: #f44336;
        }

        .server-name {
          font-weight: 600;
          font-size: 13px;
        }

        .server-info {
          font-size: 12px;
          color: #666;
        }

        .tool-count {
          color: #4caf50;
          font-weight: 600;
        }

        .error {
          color: #f44336;
        }
      `}</style>
    </div>
  );
};
```

---

## MCP Servers Populares

### Oficiais (@modelcontextprotocol)

- **filesystem**: Operações de arquivo
- **github**: Interação com GitHub
- **gitlab**: Interação com GitLab
- **postgres**: Queries em PostgreSQL
- **sqlite**: Queries em SQLite
- **brave-search**: Busca na web via Brave
- **google-maps**: Google Maps API
- **slack**: Integração com Slack
- **memory**: Key-value store persistente
- **fetch**: HTTP requests

### Como Instalar

```bash
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-github
npm install -g @modelcontextprotocol/server-brave-search
```

---

## Best Practices

1. **Naming**: Use prefixo do servidor nas tools (ex: `github.search_repos`)
2. **Error Handling**: Sempre capture erros dos MCP servers
3. **Timeouts**: Implemente timeouts para tool calls
4. **Security**: Valide inputs antes de passar para MCP servers
5. **Monitoring**: Log todas as tool calls para debugging

---

## Referências

- MCP Specification: https://modelcontextprotocol.io/
- Official Servers: https://github.com/modelcontextprotocol/servers
- Zed MCP Integration: `/core-files/tools/`
