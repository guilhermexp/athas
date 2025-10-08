# ACP Protocol - Agent Client Protocol

## Visão Geral

O ACP (Agent Client Protocol) é um protocolo baseado em JSON-RPC 2.0 para comunicação entre clientes (aplicações) e agentes de IA. Ele permite:

- Comunicação bidirecional via stdio
- Streaming de respostas
- Execução de tools/ferramentas
- Gerenciamento de sessões
- Autenticação flexível
- Seleção de modelos

---

## Arquitetura

```
┌─────────────┐                         ┌──────────────┐
│   Client    │◄─────── stdio ────────►│    Agent     │
│             │                         │    Server    │
│ (Frontend)  │                         │  (Backend)   │
└─────────────┘                         └──────────────┘
       │                                        │
       │ 1. initialize                          │
       │───────────────────────────────────────►│
       │                                        │
       │ 2. initialized (capabilities)          │
       │◄───────────────────────────────────────│
       │                                        │
       │ 3. sessions/create                     │
       │───────────────────────────────────────►│
       │                                        │
       │ 4. session created (session_id)        │
       │◄───────────────────────────────────────│
       │                                        │
       │ 5. sessions/input (message)            │
       │───────────────────────────────────────►│
       │                                        │
       │ 6. stream: output/text                 │
       │◄───────────────────────────────────────│
       │                                        │
       │ 7. stream: output/text                 │
       │◄───────────────────────────────────────│
       │                                        │
       │ 8. stream: tools/use                   │
       │◄───────────────────────────────────────│
       │                                        │
       │ 9. tools/result                        │
       │───────────────────────────────────────►│
       │                                        │
       │ 10. stream: output/text (completed)    │
       │◄───────────────────────────────────────│
```

---

## Mensagens do Protocolo

### 1. Initialize

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "0.1.0",
    "capabilities": {
      "tools": {}
    },
    "clientInfo": {
      "name": "My App",
      "version": "1.0.0"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "0.1.0",
    "capabilities": {
      "sessions": {
        "types": ["chat", "edit"],
        "models": [
          {
            "id": "gpt-4",
            "name": "GPT-4",
            "maxInputTokens": 8192,
            "maxOutputTokens": 4096
          },
          {
            "id": "claude-3-sonnet",
            "name": "Claude 3 Sonnet",
            "maxInputTokens": 200000,
            "maxOutputTokens": 4096
          }
        ]
      },
      "tools": {
        "definitions": [
          {
            "name": "read_file",
            "description": "Read the contents of a file",
            "inputSchema": {
              "type": "object",
              "properties": {
                "path": {
                  "type": "string",
                  "description": "Path to the file"
                }
              },
              "required": ["path"]
            }
          },
          {
            "name": "write_file",
            "description": "Write content to a file",
            "inputSchema": {
              "type": "object",
              "properties": {
                "path": {
                  "type": "string",
                  "description": "Path to the file"
                },
                "content": {
                  "type": "string",
                  "description": "Content to write"
                }
              },
              "required": ["path", "content"]
            }
          }
        ]
      }
    },
    "serverInfo": {
      "name": "My Agent",
      "version": "1.0.0"
    },
    "auth": {
      "methods": [
        {
          "type": "api_key",
          "fields": [
            {
              "name": "api_key",
              "label": "API Key",
              "type": "password"
            }
          ]
        },
        {
          "type": "oauth",
          "provider": "google",
          "authUrl": "https://accounts.google.com/o/oauth2/v2/auth",
          "scopes": ["openid", "email"]
        }
      ]
    }
  }
}
```

---

### 2. Sessions/Create

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "sessions/create",
  "params": {
    "type": "chat",
    "modelId": "gpt-4",
    "systemPrompt": "You are a helpful coding assistant.",
    "tools": ["read_file", "write_file"]
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "sessionId": "sess_abc123",
    "model": {
      "id": "gpt-4",
      "name": "GPT-4"
    }
  }
}
```

---

### 3. Sessions/Input

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "sessions/input",
  "params": {
    "sessionId": "sess_abc123",
    "input": {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Read the file package.json and tell me the version"
        }
      ]
    }
  }
}
```

**Response (Streaming):**

```json
// Message 1: Start streaming
{
  "jsonrpc": "2.0",
  "method": "output/text",
  "params": {
    "sessionId": "sess_abc123",
    "delta": "I'll read the package.json file for you."
  }
}

// Message 2: Tool call
{
  "jsonrpc": "2.0",
  "method": "tools/use",
  "params": {
    "sessionId": "sess_abc123",
    "toolCallId": "call_001",
    "toolName": "read_file",
    "input": {
      "path": "package.json"
    }
  }
}

// Client sends tool result
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/result",
  "params": {
    "sessionId": "sess_abc123",
    "toolCallId": "call_001",
    "content": [
      {
        "type": "text",
        "text": "{\n  \"name\": \"my-app\",\n  \"version\": \"2.5.0\"\n}"
      }
    ]
  }
}

// Message 3: Continue streaming
{
  "jsonrpc": "2.0",
  "method": "output/text",
  "params": {
    "sessionId": "sess_abc123",
    "delta": "The version in your package.json is **2.5.0**."
  }
}

// Message 4: Complete
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "sessionId": "sess_abc123",
    "output": {
      "role": "assistant",
      "content": [
        {
          "type": "text",
          "text": "I'll read the package.json file for you. The version in your package.json is **2.5.0**."
        }
      ]
    },
    "stopReason": "end_turn"
  }
}
```

---

### 4. Sessions/List

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "sessions/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "sessions": [
      {
        "sessionId": "sess_abc123",
        "type": "chat",
        "model": {
          "id": "gpt-4",
          "name": "GPT-4"
        },
        "createdAt": "2025-10-06T10:30:00Z"
      }
    ]
  }
}
```

---

### 5. Sessions/Delete

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "sessions/delete",
  "params": {
    "sessionId": "sess_abc123"
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {}
}
```

---

## Autenticação

O ACP suporta múltiplos métodos de autenticação:

### API Key

```json
{
  "type": "api_key",
  "fields": [
    {
      "name": "api_key",
      "label": "API Key",
      "type": "password"
    }
  ]
}
```

**Uso:**
Cliente envia credenciais via `auth/login`:

```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "auth/login",
  "params": {
    "method": "api_key",
    "credentials": {
      "api_key": "sk_test_123456789"
    }
  }
}
```

### OAuth

```json
{
  "type": "oauth",
  "provider": "google",
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth",
  "scopes": ["openid", "email"]
}
```

**Fluxo:**
1. Cliente abre `authUrl` em navegador
2. Usuário faz login e autoriza
3. Callback retorna `code`
4. Cliente envia `code` via `auth/oauth/callback`

---

## Tools (Ferramentas)

### Definição de Tool

```json
{
  "name": "read_file",
  "description": "Read the contents of a file",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Path to the file"
      }
    },
    "required": ["path"]
  }
}
```

### Tool Call

Quando o agente quer usar uma ferramenta:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/use",
  "params": {
    "sessionId": "sess_abc123",
    "toolCallId": "call_001",
    "toolName": "read_file",
    "input": {
      "path": "src/main.rs"
    }
  }
}
```

### Tool Result

Cliente responde com o resultado:

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/result",
  "params": {
    "sessionId": "sess_abc123",
    "toolCallId": "call_001",
    "content": [
      {
        "type": "text",
        "text": "fn main() {\n    println!(\"Hello, world!\");\n}"
      }
    ],
    "isError": false
  }
}
```

**Em caso de erro:**

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/result",
  "params": {
    "sessionId": "sess_abc123",
    "toolCallId": "call_001",
    "content": [
      {
        "type": "text",
        "text": "File not found: src/main.rs"
      }
    ],
    "isError": true
  }
}
```

---

## Session Types

### Chat Mode

Conversação livre com o agente:

```json
{
  "type": "chat",
  "modelId": "gpt-4",
  "systemPrompt": "You are a helpful assistant."
}
```

### Edit Mode

Modo focado em edições de código com diff:

```json
{
  "type": "edit",
  "modelId": "gpt-4",
  "systemPrompt": "You are an expert code editor.",
  "context": {
    "files": [
      {
        "path": "src/app.ts",
        "content": "..."
      }
    ]
  }
}
```

---

## Streaming

O protocolo suporta streaming de respostas via notificações:

```json
// Notification (não tem id)
{
  "jsonrpc": "2.0",
  "method": "output/text",
  "params": {
    "sessionId": "sess_abc123",
    "delta": "chunk of text"
  }
}
```

**Tipos de stream:**
- `output/text`: Texto da resposta
- `output/thinking`: Pensamento do modelo (se suportado)
- `tools/use`: Chamada de ferramenta
- `output/complete`: Fim do stream

---

## Error Handling

### Erros do JSON-RPC

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": {
      "details": "Missing required field: sessionId"
    }
  }
}
```

**Códigos de erro padrão:**
- `-32700`: Parse error
- `-32600`: Invalid Request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error

**Códigos customizados:**
- `1000`: Session not found
- `1001`: Model not available
- `1002`: Tool execution failed
- `1003`: Authentication failed

---

## Capabilities

### Client Capabilities

```json
{
  "tools": {},
  "streaming": true,
  "multimodal": {
    "images": true,
    "audio": false
  }
}
```

### Server Capabilities

```json
{
  "sessions": {
    "types": ["chat", "edit"],
    "models": [...],
    "maxConcurrentSessions": 5
  },
  "tools": {
    "definitions": [...]
  },
  "streaming": true,
  "multimodal": {
    "images": true,
    "audio": false
  }
}
```

---

## Implementação Recomendada

### Backend (Agent Server)

1. **Inicialize o servidor**
   - Leia stdin/stdout
   - Parse JSON-RPC
   - Implemente handlers para cada método

2. **Gerencie sessões**
   - Mantenha Map<SessionId, Session>
   - Cada sessão tem histórico de mensagens
   - Cleanup ao deletar

3. **Execute tools**
   - Registre tools disponíveis
   - Quando agente pedir, execute e retorne resultado

4. **Streaming**
   - Use async/await para streaming
   - Envie notificações via stdout

### Frontend (Client)

1. **Inicie conexão**
   - Spawn processo do agent server
   - Capture stdin/stdout
   - Envie `initialize`

2. **Crie sessão**
   - Após initialized, chame `sessions/create`
   - Armazene `sessionId`

3. **Envie mensagens**
   - Use `sessions/input` com input do usuário
   - Escute notificações de stream

4. **Renderize UI**
   - Mostre stream em tempo real
   - Renderize tool calls
   - Exiba erros

---

## Exemplo Completo

Ver `/examples/basic-agent-implementation.md` para código completo.

---

## Referências

- JSON-RPC 2.0: https://www.jsonrpc.org/specification
- Zed ACP Implementation: `/core-files/acp-protocol/acp.rs`
- Claude API: https://docs.anthropic.com/
- OpenAI API: https://platform.openai.com/docs/
