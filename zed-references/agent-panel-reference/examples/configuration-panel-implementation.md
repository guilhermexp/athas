# Exemplo: Implementando Configuration Panel

Este exemplo mostra como implementar um painel de configuração completo para agents, LLM providers e MCP servers.

---

## Arquitetura

```
┌─────────────────────────────────────┐
│     ConfigurationPanel              │
│  (Container principal)              │
└───┬───────────┬───────────┬─────────┘
    │           │           │
    ▼           ▼           ▼
┌─────────┐ ┌──────────┐ ┌─────────────┐
│General  │ │External  │ │MCP Servers  │
│Settings │ │Agents    │ │Section      │
└─────────┘ └──────────┘ └─────────────┘
                              │
                              ▼
                       ┌───────────────┐
                       │  ServerCard   │
                       │  - Status     │
                       │  - Toggle     │
                       │  - Configure  │
                       └───────────────┘
```

---

## 1. Types & Interfaces

### types.ts

```typescript
// MCP Server Status
export enum McpServerStatus {
  Starting = 'starting',
  Running = 'running',
  Stopped = 'stopped',
  Error = 'error',
}

// MCP Server Config
export interface McpServerConfig {
  enabled: boolean;
  command?: {
    path: string;
    args: string[];
    env?: Record<string, string>;
  };
  settings?: Record<string, any>;
}

// MCP Server State
export interface McpServerState {
  id: string;
  name: string;
  status: McpServerStatus;
  config: McpServerConfig;
  toolCount?: number;
  error?: string;
  isExtension: boolean;
}

// Tool Definition
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

// Agent Settings
export interface AgentSettings {
  always_allow_tool_actions: boolean;
  single_file_review: boolean;
  play_sound_when_agent_done: boolean;
  use_modifier_to_send: boolean;
}

// Context Servers Settings
export interface ContextServersSettings {
  [serverId: string]: McpServerConfig;
}
```

---

## 2. Store (State Management)

### configurationStore.ts

```typescript
import { create } from 'zustand';

interface ConfigurationStore {
  // Agent Settings
  agentSettings: AgentSettings;
  updateAgentSetting: <K extends keyof AgentSettings>(
    key: K,
    value: AgentSettings[K]
  ) => void;

  // MCP Servers
  mcpServers: Map<string, McpServerState>;
  loadServers: () => Promise<void>;
  addServer: (id: string, config: McpServerConfig) => Promise<void>;
  removeServer: (id: string) => Promise<void>;
  toggleServer: (id: string, enabled: boolean) => Promise<void>;
  restartServer: (id: string) => Promise<void>;

  // Loading state
  isLoading: boolean;
}

export const useConfigurationStore = create<ConfigurationStore>((set, get) => ({
  agentSettings: {
    always_allow_tool_actions: false,
    single_file_review: true,
    play_sound_when_agent_done: true,
    use_modifier_to_send: false,
  },

  mcpServers: new Map(),
  isLoading: false,

  updateAgentSetting: (key, value) => {
    set((state) => ({
      agentSettings: {
        ...state.agentSettings,
        [key]: value,
      },
    }));

    // Save to file
    saveAgentSettings({
      ...get().agentSettings,
      [key]: value,
    });
  },

  loadServers: async () => {
    set({ isLoading: true });

    try {
      const settings = await loadSettings();
      const servers = new Map<string, McpServerState>();

      for (const [id, config] of Object.entries(settings.context_servers || {})) {
        const status = await getServerStatus(id);
        servers.set(id, {
          id,
          name: id,
          status,
          config,
          isExtension: !config.command,
        });
      }

      set({ mcpServers: servers, isLoading: false });
    } catch (error) {
      console.error('Failed to load servers:', error);
      set({ isLoading: false });
    }
  },

  addServer: async (id, config) => {
    const servers = new Map(get().mcpServers);

    servers.set(id, {
      id,
      name: id,
      status: McpServerStatus.Stopped,
      config,
      isExtension: false,
    });

    set({ mcpServers: servers });

    // Save to settings
    await updateSettings({
      context_servers: {
        ...Object.fromEntries(servers.entries()).reduce((acc, [k, v]) => ({
          ...acc,
          [k]: v.config,
        }), {}),
      },
    });
  },

  removeServer: async (id) => {
    const servers = new Map(get().mcpServers);
    const server = servers.get(id);

    if (server && server.status === McpServerStatus.Running) {
      await stopServer(id);
    }

    servers.delete(id);
    set({ mcpServers: servers });

    // Save to settings
    await updateSettings({
      context_servers: Object.fromEntries(servers.entries()).reduce(
        (acc, [k, v]) => ({ ...acc, [k]: v.config }),
        {}
      ),
    });
  },

  toggleServer: async (id, enabled) => {
    const servers = new Map(get().mcpServers);
    const server = servers.get(id);

    if (!server) return;

    // Update config
    server.config.enabled = enabled;
    servers.set(id, server);
    set({ mcpServers: servers });

    // Start/Stop server
    if (enabled) {
      server.status = McpServerStatus.Starting;
      set({ mcpServers: new Map(servers) });

      try {
        await startServer(id, server.config);
        server.status = McpServerStatus.Running;
      } catch (error: any) {
        server.status = McpServerStatus.Error;
        server.error = error.message;
      }
    } else {
      await stopServer(id);
      server.status = McpServerStatus.Stopped;
    }

    servers.set(id, server);
    set({ mcpServers: servers });

    // Save to settings
    await updateSettings({
      context_servers: {
        [id]: server.config,
      },
    });
  },

  restartServer: async (id) => {
    const { toggleServer } = get();
    await toggleServer(id, false);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await toggleServer(id, true);
  },
}));
```

---

## 3. Components

### ConfigurationPanel.tsx

```typescript
import React, { useEffect } from 'react';
import { useConfigurationStore } from './configurationStore';
import { GeneralSettings } from './GeneralSettings';
import { ExternalAgentsSection } from './ExternalAgentsSection';
import { McpServersSection } from './McpServersSection';
import { LlmProvidersSection } from './LlmProvidersSection';

export const ConfigurationPanel: React.FC = () => {
  const { loadServers, isLoading } = useConfigurationStore();

  useEffect(() => {
    loadServers();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-8 px-6 space-y-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Agent Configuration
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure your agents, LLM providers, and tools
          </p>
        </div>

        <GeneralSettings />
        <ExternalAgentsSection />
        <McpServersSection />
        <LlmProvidersSection />
      </div>
    </div>
  );
};
```

---

### GeneralSettings.tsx

```typescript
import React from 'react';
import { useConfigurationStore } from './configurationStore';
import { Switch } from './ui/Switch';

export const GeneralSettings: React.FC = () => {
  const { agentSettings, updateAgentSetting } = useConfigurationStore();

  const settings = [
    {
      key: 'always_allow_tool_actions' as const,
      label: 'Allow running commands without asking',
      description:
        'The agent can perform potentially destructive actions without confirmation',
    },
    {
      key: 'single_file_review' as const,
      label: 'Enable single-file agent reviews',
      description: 'Agent edits are displayed in single-file editors for review',
    },
    {
      key: 'play_sound_when_agent_done' as const,
      label: 'Play sound when finished',
      description: 'Hear a notification when the agent is done or needs input',
    },
    {
      key: 'use_modifier_to_send' as const,
      label: 'Use modifier to submit',
      description: 'Require Cmd+Enter (macOS) or Ctrl+Enter to send messages',
    },
  ];

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        General Settings
      </h2>

      <div className="space-y-4">
        {settings.map(({ key, label, description }) => (
          <div key={key} className="flex items-start justify-between">
            <div className="flex-1 mr-4">
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                {label}
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {description}
              </p>
            </div>
            <Switch
              checked={agentSettings[key]}
              onChange={(checked) => updateAgentSetting(key, checked)}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
```

---

### McpServersSection.tsx

```typescript
import React, { useState } from 'react';
import { useConfigurationStore } from './configurationStore';
import { McpServerCard } from './McpServerCard';
import { AddServerDialog } from './AddServerDialog';
import { Button } from './ui/Button';

export const McpServersSection: React.FC = () => {
  const { mcpServers } = useConfigurationStore();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const servers = Array.from(mcpServers.values()).sort((a, b) => {
    // Extension servers first, then custom
    if (a.isExtension !== b.isExtension) {
      return a.isExtension ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Model Context Protocol (MCP) Servers
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            All MCP servers connected directly or via extensions
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddDialog(true)}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Server
          </Button>
        </div>
      </div>

      {servers.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No MCP servers added yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {servers.map((server) => (
            <McpServerCard key={server.id} server={server} />
          ))}
        </div>
      )}

      {showAddDialog && (
        <AddServerDialog onClose={() => setShowAddDialog(false)} />
      )}
    </section>
  );
};
```

---

### McpServerCard.tsx

```typescript
import React, { useState } from 'react';
import { McpServerState, McpServerStatus } from './types';
import { useConfigurationStore } from './configurationStore';
import { Switch } from './ui/Switch';
import { IconButton } from './ui/IconButton';
import { DropdownMenu } from './ui/DropdownMenu';

interface Props {
  server: McpServerState;
}

export const McpServerCard: React.FC<Props> = ({ server }) => {
  const { toggleServer, restartServer, removeServer } = useConfigurationStore();
  const [showTools, setShowTools] = useState(false);

  const isRunning = server.status === McpServerStatus.Running;
  const isStarting = server.status === McpServerStatus.Starting;
  const hasError = server.status === McpServerStatus.Error;

  const statusColors = {
    [McpServerStatus.Starting]: 'text-blue-500',
    [McpServerStatus.Running]: 'text-green-500',
    [McpServerStatus.Stopped]: 'text-gray-400',
    [McpServerStatus.Error]: 'text-red-500',
  };

  const statusLabels = {
    [McpServerStatus.Starting]: 'Starting...',
    [McpServerStatus.Running]: 'Running',
    [McpServerStatus.Stopped]: 'Stopped',
    [McpServerStatus.Error]: 'Error',
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Status Indicator */}
          <div className={`flex-shrink-0 ${statusColors[server.status]}`}>
            {isStarting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-current" />
            )}
          </div>

          {/* Server Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white truncate">
                {server.name}
              </span>
              {server.isExtension && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Extension
                </span>
              )}
            </div>

            {isRunning && server.toolCount !== undefined && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {server.toolCount} {server.toolCount === 1 ? 'tool' : 'tools'}
              </p>
            )}

            {hasError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                {server.error}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <IconButton icon="settings" label="Configure" />
            </DropdownMenu.Trigger>

            <DropdownMenu.Content align="end">
              <DropdownMenu.Item onClick={() => {/* Open config modal */}}>
                Configure Server
              </DropdownMenu.Item>

              {isRunning && server.toolCount && (
                <DropdownMenu.Item onClick={() => setShowTools(!showTools)}>
                  View Tools
                </DropdownMenu.Item>
              )}

              <DropdownMenu.Item onClick={() => restartServer(server.id)}>
                Restart
              </DropdownMenu.Item>

              <DropdownMenu.Separator />

              <DropdownMenu.Item
                onClick={() => removeServer(server.id)}
                variant="danger"
              >
                Uninstall
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>

          <Switch
            checked={isRunning || isStarting}
            disabled={isStarting}
            onChange={(checked) => toggleServer(server.id, checked)}
          />
        </div>
      </div>

      {/* Tools List (Expandable) */}
      {showTools && isRunning && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Available Tools
          </h4>
          <div className="space-y-2">
            {/* Fetch and display tools */}
            <ToolsList serverId={server.id} />
          </div>
        </div>
      )}
    </div>
  );
};
```

---

### AddServerDialog.tsx

```typescript
import React, { useState } from 'react';
import { useConfigurationStore } from './configurationStore';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface Props {
  onClose: () => void;
}

export const AddServerDialog: React.FC<Props> = ({ onClose }) => {
  const { addServer } = useConfigurationStore();

  const [formData, setFormData] = useState({
    id: '',
    command: '',
    args: '[]',
    env: '{}',
  });

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const args = JSON.parse(formData.args);
      const env = JSON.parse(formData.env);

      if (!Array.isArray(args)) {
        throw new Error('Args must be an array');
      }

      await addServer(formData.id, {
        enabled: true,
        command: {
          path: formData.command,
          args,
          env,
        },
      });

      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Dialog open onClose={onClose}>
      <Dialog.Header>
        <Dialog.Title>Add Custom MCP Server</Dialog.Title>
      </Dialog.Header>

      <form onSubmit={handleSubmit}>
        <Dialog.Body>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Server ID
              </label>
              <Input
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="my-mcp-server"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Command
              </label>
              <Input
                value={formData.command}
                onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                placeholder="/path/to/server or npx"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Arguments (JSON array)
              </label>
              <Input
                value={formData.args}
                onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                placeholder='["--port", "8080"]'
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Environment Variables (JSON object)
              </label>
              <Input
                value={formData.env}
                onChange={(e) => setFormData({ ...formData, env: e.target.value })}
                placeholder='{"API_KEY": "xxx"}'
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add Server</Button>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
};
```

---

## 4. Backend Integration

### api.ts

```typescript
import fs from 'fs/promises';
import path from 'path';
import { McpServerConfig, AgentSettings, ContextServersSettings } from './types';

const SETTINGS_PATH = path.join(process.env.HOME || '', '.config', 'my-app', 'settings.json');

// Load settings
export async function loadSettings(): Promise<{
  agent: AgentSettings;
  context_servers: ContextServersSettings;
}> {
  try {
    const content = await fs.readFile(SETTINGS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return {
      agent: {
        always_allow_tool_actions: false,
        single_file_review: true,
        play_sound_when_agent_done: true,
        use_modifier_to_send: false,
      },
      context_servers: {},
    };
  }
}

// Save settings
export async function saveSettings(settings: any): Promise<void> {
  const dir = path.dirname(SETTINGS_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

// Update settings
export async function updateSettings(partial: Partial<any>): Promise<void> {
  const current = await loadSettings();
  const updated = { ...current, ...partial };
  await saveSettings(updated);
}

// Save agent settings
export async function saveAgentSettings(settings: AgentSettings): Promise<void> {
  await updateSettings({ agent: settings });
}

// Start MCP server
export async function startServer(id: string, config: McpServerConfig): Promise<void> {
  // Implementation: spawn server process
  // See mcp-client-implementation.md
}

// Stop MCP server
export async function stopServer(id: string): Promise<void> {
  // Implementation: kill server process
}

// Get server status
export async function getServerStatus(id: string): Promise<McpServerStatus> {
  // Implementation: check if process is running
  return McpServerStatus.Stopped;
}
```

---

## 5. UI Components (Básicos)

### ui/Switch.tsx

```typescript
import React from 'react';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Switch: React.FC<Props> = ({ checked, onChange, disabled }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full
          bg-white shadow ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
};
```

### ui/Button.tsx

```typescript
import React from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<Props> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
```

---

## 6. Uso Completo

### App.tsx

```typescript
import React from 'react';
import { ConfigurationPanel } from './components/ConfigurationPanel';

export const App: React.FC = () => {
  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white">
        {/* Navigation */}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <ConfigurationPanel />
      </main>
    </div>
  );
};
```

---

## 7. Testing

### configurationPanel.test.tsx

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigurationPanel } from './ConfigurationPanel';
import { useConfigurationStore } from './configurationStore';

describe('ConfigurationPanel', () => {
  it('loads and displays MCP servers', async () => {
    render(<ConfigurationPanel />);

    await waitFor(() => {
      expect(screen.getByText(/MCP Servers/i)).toBeInTheDocument();
    });
  });

  it('toggles server on/off', async () => {
    render(<ConfigurationPanel />);

    const toggle = await screen.findByRole('switch', { name: /filesystem/i });

    fireEvent.click(toggle);

    await waitFor(() => {
      const { mcpServers } = useConfigurationStore.getState();
      const server = mcpServers.get('filesystem');
      expect(server?.config.enabled).toBe(true);
    });
  });

  it('adds new custom server', async () => {
    render(<ConfigurationPanel />);

    const addButton = screen.getByText(/Add Server/i);
    fireEvent.click(addButton);

    // Fill form
    const idInput = screen.getByPlaceholderText(/server id/i);
    fireEvent.change(idInput, { target: { value: 'my-server' } });

    const commandInput = screen.getByPlaceholderText(/command/i);
    fireEvent.change(commandInput, { target: { value: 'npx' } });

    // Submit
    const submitButton = screen.getByText(/Add/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      const { mcpServers } = useConfigurationStore.getState();
      expect(mcpServers.has('my-server')).toBe(true);
    });
  });
});
```

---

## Próximos Passos

1. **Adicionar persistência**: Salvar configurações em arquivo
2. **Tool viewer**: Modal para visualizar tools de cada servidor
3. **Logs viewer**: Visualizar logs de cada servidor
4. **Auto-restart**: Restart automático em caso de falha
5. **Health checks**: Verificar saúde dos servidores periodicamente

Ver `/examples/mcp-server-integration.md` para mais detalhes sobre integração MCP.
