# Exemplo Avançado: Features do Agent Panel

Este exemplo mostra features avançadas como diff viewer, tool approval, e multi-agent support.

---

## 1. Diff Viewer

### DiffViewer.tsx

```typescript
import React from 'react';
import { diffLines } from 'diff';

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  filePath: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  oldContent,
  newContent,
  filePath
}) => {
  const diff = diffLines(oldContent, newContent);

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <span className="file-path">{filePath}</span>
        <div className="diff-stats">
          <span className="additions">
            +{diff.filter(d => d.added).length}
          </span>
          <span className="deletions">
            -{diff.filter(d => d.removed).length}
          </span>
        </div>
      </div>

      <div className="diff-content">
        {diff.map((part, index) => {
          const className = part.added
            ? 'line-added'
            : part.removed
            ? 'line-removed'
            : 'line-unchanged';

          const prefix = part.added ? '+' : part.removed ? '-' : ' ';

          return part.value.split('\n').map((line, lineIndex) => {
            if (!line && lineIndex === part.value.split('\n').length - 1) {
              return null;
            }

            return (
              <div key={`${index}-${lineIndex}`} className={className}>
                <span className="line-prefix">{prefix}</span>
                <span className="line-content">{line}</span>
              </div>
            );
          });
        })}
      </div>

      <style jsx>{`
        .diff-viewer {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 13px;
        }

        .diff-header {
          display: flex;
          justify-content: space-between;
          padding: 10px 15px;
          background: #f6f8fa;
          border-bottom: 1px solid #ddd;
        }

        .file-path {
          font-weight: 600;
          color: #24292e;
        }

        .diff-stats span {
          margin-left: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 12px;
          font-weight: 600;
        }

        .additions {
          background: #cdffd8;
          color: #22863a;
        }

        .deletions {
          background: #ffdce0;
          color: #cb2431;
        }

        .diff-content {
          background: white;
        }

        .diff-content > div {
          display: flex;
          padding: 2px 0;
        }

        .line-prefix {
          width: 30px;
          text-align: center;
          user-select: none;
          flex-shrink: 0;
        }

        .line-content {
          flex: 1;
          padding-left: 10px;
          white-space: pre;
        }

        .line-added {
          background: #e6ffed;
        }

        .line-added .line-prefix {
          color: #22863a;
          background: #cdffd8;
        }

        .line-removed {
          background: #ffeef0;
        }

        .line-removed .line-prefix {
          color: #cb2431;
          background: #ffdce0;
        }

        .line-unchanged {
          color: #586069;
        }

        .line-unchanged .line-prefix {
          color: #959da5;
        }
      `}</style>
    </div>
  );
};
```

---

## 2. Tool Approval System

### ToolApproval.tsx

```typescript
import React, { useState } from 'react';

interface ToolCall {
  toolCallId: string;
  toolName: string;
  input: any;
  status: 'pending' | 'approved' | 'rejected';
}

interface ToolApprovalProps {
  toolCall: ToolCall;
  onApprove: (remember: boolean) => void;
  onReject: () => void;
}

export const ToolApproval: React.FC<ToolApprovalProps> = ({
  toolCall,
  onApprove,
  onReject
}) => {
  const [remember, setRemember] = useState(false);

  const isDangerous = ['write_file', 'run_command', 'delete_file'].includes(
    toolCall.toolName
  );

  return (
    <div className={`tool-approval ${isDangerous ? 'dangerous' : ''}`}>
      <div className="tool-header">
        <span className="tool-icon">🔧</span>
        <span className="tool-name">{toolCall.toolName}</span>
        {isDangerous && <span className="danger-badge">⚠️ Caution</span>}
      </div>

      <div className="tool-input">
        <pre>{JSON.stringify(toolCall.input, null, 2)}</pre>
      </div>

      <div className="tool-description">
        {getToolDescription(toolCall.toolName, toolCall.input)}
      </div>

      <div className="tool-actions">
        <label className="remember-checkbox">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span>Always allow this tool</span>
        </label>

        <div className="buttons">
          <button className="btn-reject" onClick={onReject}>
            Reject
          </button>
          <button className="btn-approve" onClick={() => onApprove(remember)}>
            Approve
          </button>
        </div>
      </div>

      <style jsx>{`
        .tool-approval {
          border: 2px solid #2196f3;
          border-radius: 8px;
          padding: 15px;
          margin: 10px 0;
          background: #f0f7ff;
        }

        .tool-approval.dangerous {
          border-color: #ff9800;
          background: #fff8e1;
        }

        .tool-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .tool-icon {
          font-size: 20px;
        }

        .tool-name {
          font-family: 'Monaco', monospace;
          font-weight: 600;
          font-size: 14px;
        }

        .danger-badge {
          margin-left: auto;
          padding: 2px 8px;
          background: #ff9800;
          color: white;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .tool-input {
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 10px;
          margin-bottom: 10px;
        }

        .tool-input pre {
          margin: 0;
          font-size: 12px;
          font-family: 'Monaco', monospace;
        }

        .tool-description {
          color: #666;
          font-size: 13px;
          margin-bottom: 15px;
        }

        .tool-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .remember-checkbox {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          cursor: pointer;
        }

        .buttons {
          display: flex;
          gap: 10px;
        }

        button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-reject {
          background: #f5f5f5;
          color: #666;
        }

        .btn-reject:hover {
          background: #e0e0e0;
        }

        .btn-approve {
          background: #2196f3;
          color: white;
        }

        .btn-approve:hover {
          background: #1976d2;
        }

        .tool-approval.dangerous .btn-approve {
          background: #ff9800;
        }

        .tool-approval.dangerous .btn-approve:hover {
          background: #f57c00;
        }
      `}</style>
    </div>
  );
};

function getToolDescription(toolName: string, input: any): string {
  switch (toolName) {
    case 'read_file':
      return `Read contents of: ${input.path}`;
    case 'write_file':
      return `Write ${input.content.length} characters to: ${input.path}`;
    case 'run_command':
      return `Execute command: ${input.command}`;
    case 'delete_file':
      return `Delete file: ${input.path}`;
    default:
      return `Execute ${toolName}`;
  }
}
```

### ToolApprovalManager.ts

```typescript
type Permission = 'always' | 'once' | 'never';

export class ToolApprovalManager {
  private permissions = new Map<string, Permission>();

  async requestApproval(
    toolName: string,
    input: any,
    showDialog: (props: any) => Promise<{ approved: boolean; remember: boolean }>
  ): Promise<boolean> {
    // Check saved permission
    const saved = this.permissions.get(toolName);
    if (saved === 'always') return true;
    if (saved === 'never') return false;

    // Show approval dialog
    const { approved, remember } = await showDialog({
      toolName,
      input
    });

    // Save permission if remember is checked
    if (remember && approved) {
      this.permissions.set(toolName, 'always');
      this.savePermissions();
    }

    return approved;
  }

  private savePermissions() {
    const data = Object.fromEntries(this.permissions);
    localStorage.setItem('tool_permissions', JSON.stringify(data));
  }

  loadPermissions() {
    const data = localStorage.getItem('tool_permissions');
    if (data) {
      const parsed = JSON.parse(data);
      this.permissions = new Map(Object.entries(parsed));
    }
  }

  resetPermissions() {
    this.permissions.clear();
    localStorage.removeItem('tool_permissions');
  }
}
```

---

## 3. Multi-Agent Support

### AgentRegistry.tsx

```typescript
import React, { createContext, useContext, useState } from 'react';
import { AcpClient } from './client';

interface Agent {
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
  icon: string;
  capabilities?: {
    models: string[];
    tools: string[];
  };
}

interface AgentContextType {
  agents: Agent[];
  activeAgent: Agent | null;
  switchAgent: (agentId: string) => Promise<void>;
  registerAgent: (agent: Agent) => void;
}

const AgentContext = createContext<AgentContextType | null>(null);

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 'claude',
      name: 'Claude',
      description: 'Anthropic Claude - Advanced reasoning',
      command: 'python',
      args: ['agents/claude_agent.py'],
      icon: '🤖',
      capabilities: {
        models: ['claude-3-5-sonnet-20241022'],
        tools: ['read_file', 'write_file', 'search']
      }
    },
    {
      id: 'gpt4',
      name: 'GPT-4',
      description: 'OpenAI GPT-4 - General purpose',
      command: 'node',
      args: ['agents/openai_agent.js'],
      icon: '🔮',
      capabilities: {
        models: ['gpt-4', 'gpt-4-turbo'],
        tools: ['read_file', 'write_file', 'browser']
      }
    },
    {
      id: 'custom',
      name: 'Custom Agent',
      description: 'Your custom agent implementation',
      command: 'python',
      args: ['agents/custom_agent.py'],
      icon: '⚡',
      capabilities: {
        models: ['custom-model'],
        tools: ['read_file', 'write_file', 'custom_tool']
      }
    }
  ]);

  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [clients, setClients] = useState<Map<string, AcpClient>>(new Map());

  const switchAgent = async (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    // Check if already connected
    let client = clients.get(agentId);
    if (!client) {
      // Create new client
      client = new AcpClient(agent.command, agent.args);
      await client.connect();

      setClients(prev => new Map(prev).set(agentId, client!));
    }

    setActiveAgent(agent);
  };

  const registerAgent = (agent: Agent) => {
    setAgents(prev => [...prev, agent]);
  };

  return (
    <AgentContext.Provider value={{ agents, activeAgent, switchAgent, registerAgent }}>
      {children}
    </AgentContext.Provider>
  );
};

export const useAgents = () => {
  const context = useContext(AgentContext);
  if (!context) throw new Error('useAgents must be used within AgentProvider');
  return context;
};
```

### AgentSwitcher.tsx

```typescript
import React from 'react';
import { useAgents } from './AgentRegistry';

export const AgentSwitcher: React.FC = () => {
  const { agents, activeAgent, switchAgent } = useAgents();

  return (
    <div className="agent-switcher">
      <div className="current-agent">
        <span className="icon">{activeAgent?.icon || '❓'}</span>
        <div className="info">
          <div className="name">{activeAgent?.name || 'No agent'}</div>
          <div className="desc">{activeAgent?.description || 'Select an agent'}</div>
        </div>
      </div>

      <div className="agent-list">
        {agents.map(agent => (
          <button
            key={agent.id}
            className={`agent-item ${activeAgent?.id === agent.id ? 'active' : ''}`}
            onClick={() => switchAgent(agent.id)}
          >
            <span className="icon">{agent.icon}</span>
            <div className="info">
              <div className="name">{agent.name}</div>
              <div className="capabilities">
                {agent.capabilities?.models[0]} • {agent.capabilities?.tools.length} tools
              </div>
            </div>
            {activeAgent?.id === agent.id && <span className="check">✓</span>}
          </button>
        ))}
      </div>

      <style jsx>{`
        .agent-switcher {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
        }

        .current-agent {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          background: #f5f5f5;
          border-bottom: 1px solid #ddd;
        }

        .current-agent .icon {
          font-size: 32px;
        }

        .current-agent .name {
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 2px;
        }

        .current-agent .desc {
          font-size: 13px;
          color: #666;
        }

        .agent-list {
          padding: 8px;
        }

        .agent-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px;
          border: none;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          text-align: left;
          margin-bottom: 4px;
        }

        .agent-item:hover {
          background: #f5f5f5;
        }

        .agent-item.active {
          background: #e3f2fd;
          border: 2px solid #2196f3;
        }

        .agent-item .icon {
          font-size: 24px;
        }

        .agent-item .info {
          flex: 1;
        }

        .agent-item .name {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 2px;
        }

        .agent-item .capabilities {
          font-size: 12px;
          color: #666;
        }

        .agent-item .check {
          color: #2196f3;
          font-size: 18px;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};
```

---

## 4. Session History

### SessionHistory.tsx

```typescript
import React, { useState, useEffect } from 'react';

interface Session {
  id: string;
  agentId: string;
  title: string;
  createdAt: Date;
  lastMessage: string;
  messageCount: number;
}

export const SessionHistory: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    const stored = localStorage.getItem('sessions');
    if (stored) {
      const parsed = JSON.parse(stored);
      setSessions(parsed.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt)
      })));
    }
  };

  const saveSession = (session: Session) => {
    const updated = [...sessions, session];
    setSessions(updated);
    localStorage.setItem('sessions', JSON.stringify(updated));
  };

  const deleteSession = (sessionId: string) => {
    const filtered = sessions.filter(s => s.id !== sessionId);
    setSessions(filtered);
    localStorage.setItem('sessions', JSON.stringify(filtered));
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="session-history">
      <div className="history-header">
        <h3>History</h3>
        <button className="new-session">+ New Chat</button>
      </div>

      <div className="session-list">
        {sessions.length === 0 ? (
          <div className="empty-state">
            <span className="icon">💬</span>
            <p>No conversations yet</p>
          </div>
        ) : (
          sessions.map(session => (
            <div
              key={session.id}
              className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
              onClick={() => setActiveSessionId(session.id)}
            >
              <div className="session-title">{session.title}</div>
              <div className="session-meta">
                <span>{formatDate(session.createdAt)}</span>
                <span>•</span>
                <span>{session.messageCount} messages</span>
              </div>
              <div className="session-preview">{session.lastMessage}</div>

              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .session-history {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: white;
          border-right: 1px solid #ddd;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border-bottom: 1px solid #ddd;
        }

        .history-header h3 {
          margin: 0;
          font-size: 16px;
        }

        .new-session {
          padding: 6px 12px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
        }

        .session-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .session-item {
          position: relative;
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 6px;
          cursor: pointer;
          border: 1px solid transparent;
        }

        .session-item:hover {
          background: #f5f5f5;
        }

        .session-item.active {
          background: #e3f2fd;
          border-color: #2196f3;
        }

        .session-title {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .session-meta {
          font-size: 12px;
          color: #999;
          margin-bottom: 4px;
        }

        .session-meta span {
          margin: 0 4px;
        }

        .session-preview {
          font-size: 13px;
          color: #666;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 90%;
        }

        .delete-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: none;
          border: none;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .session-item:hover .delete-btn {
          opacity: 1;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #999;
        }

        .empty-state .icon {
          font-size: 48px;
          display: block;
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  );
};
```

---

## 5. Complete Advanced Panel

### AdvancedAgentPanel.tsx

```typescript
import React from 'react';
import { AgentProvider } from './AgentRegistry';
import { AgentSwitcher } from './AgentSwitcher';
import { SessionHistory } from './SessionHistory';
import { AgentChat } from './AgentChat';
import { DiffViewer } from './DiffViewer';

export const AdvancedAgentPanel: React.FC = () => {
  return (
    <AgentProvider>
      <div className="advanced-agent-panel">
        {/* Left sidebar: Sessions */}
        <div className="sidebar left">
          <SessionHistory />
        </div>

        {/* Main chat area */}
        <div className="main">
          <AgentChat />
        </div>

        {/* Right sidebar: Agent switcher + tools */}
        <div className="sidebar right">
          <AgentSwitcher />
        </div>

        <style jsx>{`
          .advanced-agent-panel {
            display: flex;
            height: 100vh;
            background: #f5f5f5;
          }

          .sidebar {
            width: 280px;
            background: white;
            overflow: auto;
          }

          .sidebar.left {
            border-right: 1px solid #ddd;
          }

          .sidebar.right {
            border-left: 1px solid #ddd;
            padding: 15px;
          }

          .main {
            flex: 1;
            overflow: hidden;
          }
        `}</style>
      </div>
    </AgentProvider>
  );
};
```

---

## Recursos Implementados

✅ **Diff Viewer**: Visualização de alterações em arquivos
✅ **Tool Approval**: Sistema de permissões para ferramentas
✅ **Multi-Agent**: Suporte para múltiplos agentes
✅ **Session History**: Histórico de conversas
✅ **Agent Switcher**: Troca entre agentes

---

## Próximos Passos

- Implementar MCP server integration
- Adicionar suporte a imagens
- Sistema de plugins
- Export de conversas
- Dark mode

Ver `/protocol-specs/` para mais detalhes do protocolo ACP.
