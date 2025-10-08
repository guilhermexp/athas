# Exemplo Básico: Implementando um Agent Client

Este exemplo mostra como implementar um cliente ACP completo que se conecta a um agent server.

---

## Arquitetura

```
┌──────────────┐
│   React UI   │
└──────┬───────┘
       │
┌──────▼────────────┐
│  ACP Client       │
│  (TypeScript)     │
└──────┬────────────┘
       │ stdio
┌──────▼────────────┐
│  Agent Server     │
│  (Python/Node)    │
└───────────────────┘
```

---

## 1. ACP Client (TypeScript)

### client.ts

```typescript
import { spawn, ChildProcess } from 'child_process';

// Types
type MessageId = number;
type SessionId = string;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: MessageId;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: MessageId;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params: any;
}

interface AgentCapabilities {
  models: Array<{
    id: string;
    name: string;
    maxInputTokens: number;
    maxOutputTokens: number;
  }>;
  tools: Array<{
    name: string;
    description: string;
    inputSchema: any;
  }>;
}

// ACP Client
export class AcpClient {
  private process: ChildProcess | null = null;
  private messageId = 0;
  private pendingRequests = new Map<MessageId, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();
  private notificationHandlers = new Map<string, (params: any) => void>();
  private buffer = '';

  constructor(
    private command: string,
    private args: string[] = []
  ) {}

  // Connect to agent
  async connect(): Promise<AgentCapabilities> {
    return new Promise((resolve, reject) => {
      // Spawn agent process
      this.process = spawn(this.command, this.args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle stdout
      this.process.stdout?.on('data', (data) => {
        this.handleData(data);
      });

      // Handle stderr
      this.process.stderr?.on('data', (data) => {
        console.error('Agent stderr:', data.toString());
      });

      // Handle exit
      this.process.on('exit', (code) => {
        console.log('Agent exited with code:', code);
        this.cleanup();
      });

      // Initialize
      this.send({
        jsonrpc: '2.0',
        id: this.nextId(),
        method: 'initialize',
        params: {
          protocolVersion: '0.1.0',
          capabilities: {
            tools: {}
          },
          clientInfo: {
            name: 'Example Client',
            version: '1.0.0'
          }
        }
      }).then((result) => {
        resolve(result.capabilities);
      }).catch(reject);
    });
  }

  // Create session
  async createSession(
    modelId: string,
    systemPrompt?: string
  ): Promise<SessionId> {
    const result = await this.send({
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'sessions/create',
      params: {
        type: 'chat',
        modelId,
        systemPrompt,
        tools: ['read_file', 'write_file', 'list_directory']
      }
    });

    return result.sessionId;
  }

  // Send message
  async sendMessage(
    sessionId: SessionId,
    message: string,
    onStream?: (delta: string) => void
  ): Promise<string> {
    // Register stream handler
    if (onStream) {
      this.onNotification('output/text', (params) => {
        if (params.sessionId === sessionId) {
          onStream(params.delta);
        }
      });
    }

    // Send input
    const result = await this.send({
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'sessions/input',
      params: {
        sessionId,
        input: {
          role: 'user',
          content: [{ type: 'text', text: message }]
        }
      }
    });

    return result.output.content[0].text;
  }

  // Handle tool use
  onToolUse(handler: (params: {
    sessionId: SessionId;
    toolCallId: string;
    toolName: string;
    input: any;
  }) => void) {
    this.onNotification('tools/use', handler);
  }

  // Send tool result
  async sendToolResult(
    sessionId: SessionId,
    toolCallId: string,
    content: string,
    isError = false
  ) {
    await this.send({
      jsonrpc: '2.0',
      id: this.nextId(),
      method: 'tools/result',
      params: {
        sessionId,
        toolCallId,
        content: [{ type: 'text', text: content }],
        isError
      }
    });
  }

  // Send JSON-RPC message
  private send(message: JsonRpcRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = message.id;
      this.pendingRequests.set(id, { resolve, reject });

      const json = JSON.stringify(message) + '\n';
      this.process?.stdin?.write(json);
    });
  }

  // Handle incoming data
  private handleData(data: Buffer) {
    this.buffer += data.toString();

    // Process complete lines
    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', line, error);
        }
      }
    }
  }

  // Handle message
  private handleMessage(message: JsonRpcResponse | JsonRpcNotification) {
    // Response
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
    // Notification
    else if ('method' in message) {
      const handler = this.notificationHandlers.get(message.method);
      if (handler) {
        handler(message.params);
      }
    }
  }

  // Register notification handler
  private onNotification(method: string, handler: (params: any) => void) {
    this.notificationHandlers.set(method, handler);
  }

  // Cleanup
  private cleanup() {
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();
    this.notificationHandlers.clear();
  }

  // Disconnect
  disconnect() {
    this.process?.kill();
    this.process = null;
  }

  // Next message ID
  private nextId(): MessageId {
    return ++this.messageId;
  }
}
```

---

## 2. Tool Registry

### tools.ts

```typescript
import fs from 'fs/promises';
import path from 'path';

export class ToolRegistry {
  constructor(private workspaceRoot: string) {}

  async execute(toolName: string, input: any): Promise<string> {
    switch (toolName) {
      case 'read_file':
        return await this.readFile(input.path);

      case 'write_file':
        return await this.writeFile(input.path, input.content);

      case 'list_directory':
        return await this.listDirectory(input.path || '.');

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async readFile(relativePath: string): Promise<string> {
    const fullPath = path.join(this.workspaceRoot, relativePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return content;
  }

  private async writeFile(relativePath: string, content: string): Promise<string> {
    const fullPath = path.join(this.workspaceRoot, relativePath);
    await fs.writeFile(fullPath, content, 'utf-8');
    return `File written: ${relativePath}`;
  }

  private async listDirectory(relativePath: string): Promise<string> {
    const fullPath = path.join(this.workspaceRoot, relativePath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    return entries
      .map(entry => entry.isDirectory() ? `${entry.name}/` : entry.name)
      .join('\n');
  }
}
```

---

## 3. React UI

### AgentChat.tsx

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { AcpClient } from './client';
import { ToolRegistry } from './tools';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export const AgentChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const clientRef = useRef<AcpClient | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const toolsRef = useRef<ToolRegistry | null>(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      // Create client
      const client = new AcpClient('python', ['agent_server.py']);
      clientRef.current = client;

      // Create tools
      const tools = new ToolRegistry(process.cwd());
      toolsRef.current = tools;

      // Connect
      const capabilities = await client.connect();
      console.log('Connected! Models:', capabilities.models);

      // Create session
      const sessionId = await client.createSession(
        capabilities.models[0].id,
        'You are a helpful coding assistant.'
      );
      sessionIdRef.current = sessionId;

      // Handle tool calls
      client.onToolUse(async (params) => {
        console.log('Tool call:', params.toolName, params.input);

        try {
          const result = await tools.execute(params.toolName, params.input);
          await client.sendToolResult(
            params.sessionId,
            params.toolCallId,
            result,
            false
          );
        } catch (error: any) {
          await client.sendToolResult(
            params.sessionId,
            params.toolCallId,
            error.message,
            true
          );
        }
      });
    };

    init();

    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  // Send message
  const handleSend = async () => {
    if (!input.trim() || !clientRef.current || !sessionIdRef.current) return;

    const userMessage = input;
    setInput('');
    setIsLoading(true);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // Add streaming assistant message
    const assistantIndex = messages.length + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);

    try {
      // Send with streaming
      await clientRef.current.sendMessage(
        sessionIdRef.current,
        userMessage,
        (delta) => {
          // Update streaming message
          setMessages(prev => {
            const newMessages = [...prev];
            const msg = newMessages[assistantIndex];
            if (msg && msg.role === 'assistant') {
              msg.content += delta;
            }
            return newMessages;
          });
        }
      );

      // Mark as complete
      setMessages(prev => {
        const newMessages = [...prev];
        const msg = newMessages[assistantIndex];
        if (msg) {
          msg.isStreaming = false;
        }
        return newMessages;
      });
    } catch (error: any) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              marginBottom: 15,
              padding: 10,
              background: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5',
              borderRadius: 8
            }}
          >
            <strong>{msg.role === 'user' ? 'You' : 'Agent'}:</strong>
            <div style={{ whiteSpace: 'pre-wrap', marginTop: 5 }}>
              {msg.content}
              {msg.isStreaming && <span className="cursor">▊</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: 20, borderTop: '1px solid #ddd' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask the agent..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: 10,
              fontSize: 14,
              border: '1px solid #ddd',
              borderRadius: 4
            }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              background: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .cursor {
          animation: blink 1s infinite;
        }
      `}</style>
    </div>
  );
};
```

---

## 4. Agent Server (Python)

### agent_server.py

```python
#!/usr/bin/env python3
import json
import sys
from typing import Dict, Any, Optional
import anthropic

class AgentServer:
    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.client = anthropic.Anthropic()

    def handle_message(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        method = message.get('method')

        if method == 'initialize':
            return self.handle_initialize(message)
        elif method == 'sessions/create':
            return self.handle_create_session(message)
        elif method == 'sessions/input':
            return self.handle_session_input(message)
        elif method == 'tools/result':
            return self.handle_tool_result(message)

        return {
            'jsonrpc': '2.0',
            'id': message['id'],
            'error': {
                'code': -32601,
                'message': f'Method not found: {method}'
            }
        }

    def handle_initialize(self, message: Dict[str, Any]) -> Dict[str, Any]:
        return {
            'jsonrpc': '2.0',
            'id': message['id'],
            'result': {
                'protocolVersion': '0.1.0',
                'capabilities': {
                    'sessions': {
                        'types': ['chat'],
                        'models': [
                            {
                                'id': 'claude-3-5-sonnet-20241022',
                                'name': 'Claude 3.5 Sonnet',
                                'maxInputTokens': 200000,
                                'maxOutputTokens': 8192
                            }
                        ]
                    },
                    'tools': {
                        'definitions': [
                            {
                                'name': 'read_file',
                                'description': 'Read file contents',
                                'inputSchema': {
                                    'type': 'object',
                                    'properties': {
                                        'path': {'type': 'string'}
                                    },
                                    'required': ['path']
                                }
                            },
                            {
                                'name': 'write_file',
                                'description': 'Write file contents',
                                'inputSchema': {
                                    'type': 'object',
                                    'properties': {
                                        'path': {'type': 'string'},
                                        'content': {'type': 'string'}
                                    },
                                    'required': ['path', 'content']
                                }
                            },
                            {
                                'name': 'list_directory',
                                'description': 'List directory contents',
                                'inputSchema': {
                                    'type': 'object',
                                    'properties': {
                                        'path': {'type': 'string'}
                                    }
                                }
                            }
                        ]
                    }
                },
                'serverInfo': {
                    'name': 'Example Agent',
                    'version': '1.0.0'
                }
            }
        }

    def handle_create_session(self, message: Dict[str, Any]) -> Dict[str, Any]:
        params = message['params']
        session_id = f"sess_{len(self.sessions) + 1}"

        self.sessions[session_id] = {
            'modelId': params['modelId'],
            'systemPrompt': params.get('systemPrompt', ''),
            'tools': params.get('tools', []),
            'messages': []
        }

        return {
            'jsonrpc': '2.0',
            'id': message['id'],
            'result': {
                'sessionId': session_id,
                'model': {
                    'id': params['modelId'],
                    'name': 'Claude 3.5 Sonnet'
                }
            }
        }

    def handle_session_input(self, message: Dict[str, Any]) -> Dict[str, Any]:
        params = message['params']
        session_id = params['sessionId']
        session = self.sessions.get(session_id)

        if not session:
            return {
                'jsonrpc': '2.0',
                'id': message['id'],
                'error': {
                    'code': 1000,
                    'message': f'Session not found: {session_id}'
                }
            }

        # Add user message
        user_message = params['input']
        session['messages'].append(user_message)

        # Stream response
        full_response = ""
        with self.client.messages.stream(
            model=session['modelId'],
            max_tokens=8192,
            system=session['systemPrompt'],
            messages=session['messages'],
            tools=[{
                'name': 'read_file',
                'description': 'Read file',
                'input_schema': {
                    'type': 'object',
                    'properties': {'path': {'type': 'string'}},
                    'required': ['path']
                }
            }]
        ) as stream:
            for event in stream:
                if event.type == 'content_block_delta':
                    if hasattr(event.delta, 'text'):
                        delta = event.delta.text
                        full_response += delta

                        # Send notification
                        self.send_notification('output/text', {
                            'sessionId': session_id,
                            'delta': delta
                        })

                elif event.type == 'content_block_start':
                    if event.content_block.type == 'tool_use':
                        # Send tool use notification
                        self.send_notification('tools/use', {
                            'sessionId': session_id,
                            'toolCallId': event.content_block.id,
                            'toolName': event.content_block.name,
                            'input': event.content_block.input
                        })

        # Add assistant message
        session['messages'].append({
            'role': 'assistant',
            'content': [{'type': 'text', 'text': full_response}]
        })

        return {
            'jsonrpc': '2.0',
            'id': message['id'],
            'result': {
                'sessionId': session_id,
                'output': {
                    'role': 'assistant',
                    'content': [{'type': 'text', 'text': full_response}]
                },
                'stopReason': 'end_turn'
            }
        }

    def handle_tool_result(self, message: Dict[str, Any]) -> Dict[str, Any]:
        # Tool result handling
        return {
            'jsonrpc': '2.0',
            'id': message['id'],
            'result': {}
        }

    def send_notification(self, method: str, params: Dict[str, Any]):
        notification = {
            'jsonrpc': '2.0',
            'method': method,
            'params': params
        }
        print(json.dumps(notification), flush=True)

    def run(self):
        for line in sys.stdin:
            try:
                message = json.loads(line)
                response = self.handle_message(message)
                if response and 'id' in message:
                    print(json.dumps(response), flush=True)
            except Exception as e:
                error_response = {
                    'jsonrpc': '2.0',
                    'id': message.get('id'),
                    'error': {
                        'code': -32603,
                        'message': str(e)
                    }
                }
                print(json.dumps(error_response), flush=True)

if __name__ == '__main__':
    server = AgentServer()
    server.run()
```

---

## 5. Rodando o Exemplo

### Instalação

```bash
# Frontend
npm install

# Backend
pip install anthropic
```

### Executar

```bash
# Terminal 1: Start agent server (test mode)
python agent_server.py

# Terminal 2: Start frontend
npm run dev
```

### Testar

1. Abra http://localhost:3000
2. Digite: "List all files in the current directory"
3. Agente deve usar tool `list_directory` e retornar lista de arquivos

---

## Próximos Passos

- Adicione mais tools (search, edit, etc)
- Implemente UI para tool calls
- Adicione diff viewer para edições
- Implemente sistema de permissões
- Adicione autenticação

Ver `/examples/advanced-agent-features.md` para mais recursos.
