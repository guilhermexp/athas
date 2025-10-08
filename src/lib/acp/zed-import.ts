import { invoke } from "@tauri-apps/api/core";
import type { Agent, LLMProvider, MCPServer } from "@/components/agent-panel/types";

interface ImportedAgent {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, unknown>;
}

interface ImportedMcpServer {
  id: string;
  name: string;
  source: string;
  command?: string | null;
  args: string[];
  env: Record<string, unknown>;
  enabled: boolean;
}

interface ImportedProvider {
  id: string;
  name: string;
  meta: unknown;
}

interface ZedImportResult {
  agents: ImportedAgent[];
  mcp_servers: ImportedMcpServer[];
  providers: ImportedProvider[];
}

export async function importZedSettings(path?: string): Promise<{
  agents: Agent[];
  mcpServers: MCPServer[];
  providers: LLMProvider[];
}> {
  const res = (await invoke("import_zed_settings", { path })) as ZedImportResult;

  const agents: Agent[] = res.agents.map((a) => ({
    id: a.id,
    name: a.name,
    type: "acp",
    description: "Imported from Zed settings",
    command: a.command,
    args: a.args,
    env: Object.fromEntries(Object.entries(a.env).map(([k, v]) => [k, String(v)])),
    systemPrompt: undefined,
    modelId: undefined,
    tools: ["read_file", "write_file", "list_directory", "search_files"],
    mcpServerIds: [],
    status: "idle",
  }));

  const mcpServers: MCPServer[] = res.mcp_servers.map((s) => ({
    id: s.id,
    name: s.name || s.id,
    description: s.source === "extension" ? "Extension-managed MCP" : "Custom MCP server",
    command: s.command || "",
    args: s.args,
    env: Object.fromEntries(Object.entries(s.env).map(([k, v]) => [k, String(v)])),
    status: s.enabled ? "running" : "stopped",
    tools: [],
    resources: [],
    prompts: [],
  }));

  const providers: LLMProvider[] = res.providers.map((p) => ({
    id: p.id,
    name: p.name,
    description: "Imported provider configuration",
    status: "connected",
    lastUpdated: new Date().toISOString(),
  }));

  return { agents, mcpServers, providers };
}
