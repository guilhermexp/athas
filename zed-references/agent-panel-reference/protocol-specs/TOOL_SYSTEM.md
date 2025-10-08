# ACP Tool System

## Visão Geral

O sistema de tools do ACP permite que agentes executem ações no ambiente do usuário de forma segura e controlada.

---

## Arquitetura

```
┌──────────────┐         ┌─────────────┐         ┌──────────────┐
│    Agent     │────────►│   Client    │────────►│  Tool Impl   │
│              │ use tool│             │ execute │              │
│              │◄────────│             │◄────────│              │
│              │  result │             │  result │              │
└──────────────┘         └─────────────┘         └──────────────┘
```

---

## Definição de Tool

Cada tool é definido com um JSON Schema:

```json
{
  "name": "read_file",
  "description": "Read the contents of a file from the workspace",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Path to the file relative to workspace root"
      }
    },
    "required": ["path"]
  }
}
```

---

## Tools Padrão do Zed

### 1. read_file

Lê conteúdo de um arquivo.

**Input:**
```json
{
  "path": "src/app.ts"
}
```

**Output:**
```json
{
  "type": "text",
  "text": "import React from 'react';\n\nconst App = () => {\n  return <div>Hello</div>;\n};"
}
```

---

### 2. write_file

Escreve conteúdo em um arquivo.

**Input:**
```json
{
  "path": "src/new-file.ts",
  "content": "export const hello = 'world';"
}
```

**Output:**
```json
{
  "type": "text",
  "text": "File written successfully"
}
```

---

### 3. list_directory

Lista arquivos em um diretório.

**Input:**
```json
{
  "path": "src/"
}
```

**Output:**
```json
{
  "type": "text",
  "text": "app.ts\ncomponents/\nutils/\nindex.ts"
}
```

---

### 4. search_files

Busca por padrão em arquivos.

**Input:**
```json
{
  "query": "TODO",
  "path": "src/",
  "includePattern": "*.ts"
}
```

**Output:**
```json
{
  "type": "text",
  "text": "src/app.ts:15: // TODO: refactor this\nsrc/utils/helper.ts:8: // TODO: add tests"
}
```

---

### 5. edit_file

Edita arquivo com replace ou insert.

**Input:**
```json
{
  "path": "src/app.ts",
  "edits": [
    {
      "type": "replace",
      "oldText": "const App = () => {",
      "newText": "const App: React.FC = () => {"
    }
  ]
}
```

**Output:**
```json
{
  "type": "diff",
  "diff": "@@ -1,3 +1,3 @@\n import React from 'react';\n \n-const App = () => {\n+const App: React.FC = () => {\n   return <div>Hello</div>;\n };"
}
```

---

### 6. run_command

Executa comando no terminal.

**Input:**
```json
{
  "command": "npm test",
  "cwd": "."
}
```

**Output:**
```json
{
  "type": "text",
  "text": "Running tests...\n✓ All tests passed (15 tests)\n"
}
```

---

### 7. web_search

Busca na web.

**Input:**
```json
{
  "query": "react hooks best practices"
}
```

**Output:**
```json
{
  "type": "text",
  "text": "Top results:\n1. React Hooks - Best Practices\n   https://example.com/hooks\n   React Hooks allow you to use state..."
}
```

---

## Tool Execution Flow

### 1. Agent Requests Tool

```json
{
  "jsonrpc": "2.0",
  "method": "tools/use",
  "params": {
    "sessionId": "sess_123",
    "toolCallId": "call_001",
    "toolName": "read_file",
    "input": {
      "path": "package.json"
    }
  }
}
```

### 2. Client Executes Tool

```typescript
async function handleToolUse(params: ToolUseParams) {
  const { toolName, input, toolCallId, sessionId } = params;

  try {
    // Execute tool
    const result = await executeTool(toolName, input);

    // Send result back
    await sendToolResult({
      sessionId,
      toolCallId,
      content: [{ type: 'text', text: result }],
      isError: false
    });
  } catch (error) {
    // Send error
    await sendToolResult({
      sessionId,
      toolCallId,
      content: [{ type: 'text', text: error.message }],
      isError: true
    });
  }
}
```

### 3. Client Sends Result

```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/result",
  "params": {
    "sessionId": "sess_123",
    "toolCallId": "call_001",
    "content": [
      {
        "type": "text",
        "text": "{\n  \"name\": \"my-app\",\n  \"version\": \"1.0.0\"\n}"
      }
    ],
    "isError": false
  }
}
```

---

## Tool Registry

### Implementação no Cliente

```typescript
type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  execute: (input: any) => Promise<string>;
};

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  async execute(name: string, input: any): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);

    return await tool.execute(input);
  }

  getDefinitions(): Array<{name: string, description: string, inputSchema: JSONSchema}> {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }));
  }
}

// Usage
const registry = new ToolRegistry();

registry.register({
  name: 'read_file',
  description: 'Read file contents',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' }
    },
    required: ['path']
  },
  execute: async (input) => {
    const fs = require('fs').promises;
    return await fs.readFile(input.path, 'utf-8');
  }
});
```

---

## MCP Servers (External Tools)

O Zed suporta MCP (Model Context Protocol) servers que fornecem tools adicionais.

### MCP Server Configuration

```json
{
  "mcpServers": [
    {
      "id": "filesystem",
      "name": "Filesystem Tools",
      "command": "node",
      "args": ["./mcp-servers/filesystem/index.js"],
      "env": {
        "WORKSPACE_ROOT": "/path/to/workspace"
      }
    },
    {
      "id": "github",
      "name": "GitHub Tools",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_..."
      }
    }
  ]
}
```

### MCP Tool Discovery

Quando cliente conecta a um MCP server:

1. **Initialize MCP Connection**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {}
  }
}
```

2. **List Tools**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

3. **Response with Tools**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "create_or_update_file",
        "description": "Create or update a file",
        "inputSchema": {
          "type": "object",
          "properties": {
            "path": { "type": "string" },
            "content": { "type": "string" }
          }
        }
      }
    ]
  }
}
```

4. **Add to Agent Capabilities**

Cliente agora inclui esses tools na lista de capabilities ao criar sessões com o agente.

---

## Tool Permission System

### User Approval

Para segurança, certos tools requerem aprovação do usuário:

```typescript
type ToolPermission = 'always' | 'once' | 'never';

class PermissionManager {
  private permissions = new Map<string, ToolPermission>();

  async requestPermission(toolName: string, input: any): Promise<boolean> {
    const existing = this.permissions.get(toolName);

    if (existing === 'always') return true;
    if (existing === 'never') return false;

    // Show UI dialog
    const choice = await showPermissionDialog({
      toolName,
      input,
      options: ['Allow Once', 'Always Allow', 'Deny']
    });

    if (choice === 'Always Allow') {
      this.permissions.set(toolName, 'always');
      return true;
    }

    if (choice === 'Deny') {
      this.permissions.set(toolName, 'never');
      return false;
    }

    return choice === 'Allow Once';
  }
}
```

### Dangerous Tools

Tools que requerem confirmação:
- `write_file`: Pode sobrescrever arquivos
- `run_command`: Pode executar código arbitrário
- `delete_file`: Operação irreversível
- `web_request`: Pode vazar informações

---

## Tool Result Types

### Text Result

```json
{
  "type": "text",
  "text": "File contents here"
}
```

### Image Result

```json
{
  "type": "image",
  "source": {
    "type": "base64",
    "mediaType": "image/png",
    "data": "iVBORw0KGgo..."
  }
}
```

### Diff Result

```json
{
  "type": "diff",
  "path": "src/app.ts",
  "diff": "@@ -1,3 +1,3 @@\n-old line\n+new line"
}
```

### Error Result

```json
{
  "type": "text",
  "text": "Error: File not found",
  "isError": true
}
```

---

## Custom Tools

### Criando Tools Customizadas

```typescript
// 1. Define tool
const customTool: ToolDefinition = {
  name: 'analyze_code',
  description: 'Analyze code for issues',
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'Code to analyze' },
      language: { type: 'string', enum: ['typescript', 'javascript', 'python'] }
    },
    required: ['code', 'language']
  },
  execute: async (input) => {
    // Your custom logic
    const analysis = await runLinter(input.code, input.language);
    return JSON.stringify(analysis, null, 2);
  }
};

// 2. Register
registry.register(customTool);

// 3. Add to capabilities
const capabilities = {
  tools: {
    definitions: registry.getDefinitions()
  }
};
```

---

## Tool Best Practices

### 1. Descriptive Names

✅ Good:
```
read_file
write_file
search_in_files
```

❌ Bad:
```
rf
wf
search
```

### 2. Clear Input Schema

✅ Good:
```json
{
  "properties": {
    "path": {
      "type": "string",
      "description": "Path to file relative to workspace root"
    }
  }
}
```

❌ Bad:
```json
{
  "properties": {
    "p": { "type": "string" }
  }
}
```

### 3. Informative Results

✅ Good:
```
"File written successfully to src/app.ts (245 bytes)"
```

❌ Bad:
```
"ok"
```

### 4. Error Handling

```typescript
execute: async (input) => {
  try {
    const result = await dangerousOperation(input);
    return result;
  } catch (error) {
    // Return descriptive error
    throw new Error(`Failed to execute: ${error.message}`);
  }
}
```

---

## Tool Telemetry

Track tool usage for analytics:

```typescript
class TelemetryTracker {
  trackToolUse(toolName: string, duration: number, success: boolean) {
    console.log({
      event: 'tool_used',
      tool: toolName,
      duration_ms: duration,
      success
    });
  }
}

// Usage
async function executeToolWithTelemetry(name: string, input: any) {
  const start = Date.now();
  let success = false;

  try {
    const result = await registry.execute(name, input);
    success = true;
    return result;
  } finally {
    const duration = Date.now() - start;
    telemetry.trackToolUse(name, duration, success);
  }
}
```

---

## Referências

- Model Context Protocol: https://modelcontextprotocol.io/
- Zed Tools Implementation: `/core-files/tools/acp_tools.rs`
- Claude Tool Use: https://docs.anthropic.com/en/docs/tool-use
