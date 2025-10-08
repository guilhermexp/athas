import { AlertCircle, Check, Circle, Plus, Power, Settings2, Upload, X } from "lucide-react";
import { memo, useMemo } from "react";
import Switch from "@/components/ui/switch";
import { importZedSettings } from "@/lib/acp/zed-import";
import { useAgentPanelStore } from "@/stores/agent-panel/store";
import { cn } from "@/utils/cn";
import type { AgentGeneralSettingKey, LLMProvider } from "./types";

// Narrow keys to boolean settings (exclude dropdown-only setting)
type BooleanSettingKey = Exclude<AgentGeneralSettingKey, "toolApprovalMode">;

const GENERAL_SETTINGS: Array<{
  key: BooleanSettingKey;
  label: string;
  description: string;
}> = [
  {
    key: "alwaysAllowToolActions",
    label: "Allow running commands without asking",
    description: "Permit the agent to run shell commands without additional confirmation.",
  },
  {
    key: "singleFileReview",
    label: "Enable single-file agent reviews",
    description: "Show agent edits in a focused single-file review experience.",
  },
  {
    key: "playSoundWhenAgentDone",
    label: "Play sound when finished generating",
    description: "Play a notification sound when the agent completes a task.",
  },
  {
    key: "useModifierToSend",
    label: "Use modifier to submit a message",
    description: "Require Cmd+Enter (macOS) or Ctrl+Enter to send messages.",
  },
];

const MCP_STATUS_COLOR = {
  running: "var(--color-success)",
  starting: "var(--color-muted)",
  stopped: "var(--color-muted)",
  error: "var(--color-error)",
} as const;

const MCP_STATUS_LABEL: Record<string, string> = {
  running: "Running",
  starting: "Starting",
  stopped: "Stopped",
  error: "Error",
};

const PROVIDER_STATUS_ICON = {
  connected: Check,
  requires_auth: AlertCircle,
  error: AlertCircle,
} as const;

const noop = () => void 0;

const formatProviderUpdatedAt = (provider: LLMProvider) => {
  if (!provider.lastUpdated) return null;
  const date =
    provider.lastUpdated instanceof Date ? provider.lastUpdated : new Date(provider.lastUpdated);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString();
};

export const ConfigPanel = memo(() => {
  const activeView = useAgentPanelStore((state) => state.ui.activeView);
  const setActiveView = useAgentPanelStore((state) => state.setActiveView);
  const generalSettings = useAgentPanelStore((state) => state.generalSettings);
  const setGeneralSetting = useAgentPanelStore((state) => state.setGeneralSetting);
  const agents = useAgentPanelStore((state) => state.availableAgents);
  const mcpServers = useAgentPanelStore((state) => state.mcpServers);
  const toggleMCPServer = useAgentPanelStore((state) => state.toggleMCPServer);
  const llmProviders = useAgentPanelStore((state) => state.llmProviders);
  const addAgent = useAgentPanelStore((state) => state.addAgent);
  const addMCPServer = useAgentPanelStore((state) => state.addMCPServer);
  const updateProviderList = useAgentPanelStore((state) => state.setProviders);

  const externalAgents = useMemo(() => agents.filter((agent) => agent.type !== "native"), [agents]);

  if (activeView !== "configuration") {
    return null;
  }

  return (
    <div
      className="flex h-full flex-col bg-secondary-bg text-text"
      style={{ fontFamily: "var(--font-ui)" }}
    >
      <header className="flex items-center justify-between border-border/50 border-b px-5 py-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm tracking-wide">Agent Configuration</h2>
          <p className="text-[11px] text-text-lighter/75">Manage agents, tools, and providers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                const result = await importZedSettings();
                result.agents.forEach(addAgent);
                result.mcpServers.forEach(addMCPServer);
                // Merge providers without duplicates by id
                const existing = new Map(llmProviders.map((p) => [p.id, p]));
                result.providers.forEach((p) => existing.set(p.id, p));
                updateProviderList?.(Array.from(existing.values()));
              } catch (e) {
                console.error("Failed to import Zed settings:", e);
              }
            }}
            className="flex items-center gap-1 rounded-md border border-border/40 px-2 py-1 text-[11px] text-text-lighter/80 transition-colors hover:bg-hover/60 hover:text-text"
            title="Import settings from Zed"
          >
            <Upload size={12} strokeWidth={1.5} />
            Import from Zed
          </button>
        </div>
        <button
          type="button"
          onClick={() => setActiveView("thread")}
          className="rounded-md p-1.5 text-text-lighter/70 transition-colors hover:bg-hover/60 hover:text-text"
          aria-label="Close configuration panel"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        <section className="space-y-3 rounded-md border border-border/40 bg-primary-bg/40 p-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-lighter/60 text-xs uppercase tracking-wide">
              General Settings
            </h3>
          </div>

          <div className="space-y-2">
            {GENERAL_SETTINGS.map((setting) => {
              const enabled = Boolean(generalSettings[setting.key]);
              return (
                <div
                  key={setting.key}
                  className="rounded-md border border-border/40 bg-secondary-bg/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-xs">{setting.label}</span>
                    <Switch
                      checked={enabled}
                      onChange={(checked) =>
                        setGeneralSetting(setting.key as AgentGeneralSettingKey, checked)
                      }
                      size="sm"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-text-lighter/75">{setting.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-2 rounded-md border border-border/40 bg-primary-bg/40 p-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-lighter/60 text-xs uppercase tracking-wide">
              External Agents
            </h3>
            <button
              type="button"
              onClick={noop}
              className="flex items-center gap-1 rounded-md border border-border/40 px-2 py-1 text-[11px] text-text-lighter/80 transition-colors hover:bg-hover/60 hover:text-text"
            >
              <Plus size={12} strokeWidth={1.5} />
              Add Agent
            </button>
          </div>

          {externalAgents.length === 0 ? (
            <p className="rounded-md bg-secondary-bg/80 px-3 py-2 text-[11px] text-text-lighter/75">
              No external agents configured yet. Add an ACP agent to connect external tools.
            </p>
          ) : (
            <ul className="divide-y divide-border/40 text-sm">
              {externalAgents.map((agent) => (
                <li key={agent.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Circle size={10} strokeWidth={2} style={{ color: "var(--color-muted)" }} />
                    <div>
                      <p className="font-medium text-xs">{agent.name}</p>
                      {agent.description ? (
                        <p className="text-[11px] text-text-lighter/75">{agent.description}</p>
                      ) : null}
                    </div>
                  </div>
                  <Check size={14} strokeWidth={1.5} style={{ color: "var(--color-success)" }} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2 rounded-md border border-border/40 bg-primary-bg/40 p-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-lighter/60 text-xs uppercase tracking-wide">
              Model Context Protocol (MCP) Servers
            </h3>
            <button
              type="button"
              onClick={noop}
              className="flex items-center gap-1 rounded-md border border-border/40 px-2 py-1 text-[11px] text-text-lighter/80 transition-colors hover:bg-hover/60 hover:text-text"
            >
              <Plus size={12} strokeWidth={1.5} />
              Add Server
            </button>
          </div>

          {mcpServers.length === 0 ? (
            <p className="rounded-md bg-secondary-bg/80 px-3 py-2 text-[11px] text-text-lighter/75">
              Configure MCP servers to expose tools and resources to your agents.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {mcpServers.map((server) => {
                const status = server.status ?? "stopped";
                const indicatorColor =
                  MCP_STATUS_COLOR[status as keyof typeof MCP_STATUS_COLOR] ??
                  MCP_STATUS_COLOR.stopped;
                const statusLabel = MCP_STATUS_LABEL[status] ?? MCP_STATUS_LABEL.stopped;

                return (
                  <li
                    key={server.id}
                    className="rounded-md border border-border/50 bg-secondary-bg/60 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: indicatorColor }}
                        />
                        <div>
                          <p className="font-semibold text-xs">{server.name}</p>
                          {server.description ? (
                            <p className="text-[11px] text-text-lighter/75">{server.description}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-border/40 p-1 text-text-lighter/80 transition-colors hover:bg-hover/50 hover:text-text"
                          title="Server settings"
                          onClick={noop}
                        >
                          <Settings2 size={13} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "flex items-center gap-1 rounded-md border border-border/40 px-2 py-1 text-[11px] transition-colors",
                            status === "running"
                              ? "text-text"
                              : "text-text-lighter/80 hover:bg-hover/50 hover:text-text",
                          )}
                          onClick={() => toggleMCPServer(server.id)}
                        >
                          <Power size={12} strokeWidth={1.5} />
                          {status === "running" ? "Stop" : "Start"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-text-lighter/70">
                      <span>Status: {statusLabel}</span>
                      {server.tools?.length ? <span>{server.tools.length} tools</span> : null}
                      {status === "error" && server.errorMessage ? (
                        <span
                          className="flex items-center gap-1"
                          style={{ color: "var(--color-error)" }}
                        >
                          <AlertCircle size={12} strokeWidth={1.5} />
                          {server.errorMessage}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-2 rounded-md border border-border/40 bg-primary-bg/40 p-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-lighter/60 text-xs uppercase tracking-wide">
              LLM Providers
            </h3>
            <button
              type="button"
              onClick={noop}
              className="flex items-center gap-1 rounded-md border border-border/40 px-2 py-1 text-[11px] text-text-lighter/80 transition-colors hover:bg-hover/60 hover:text-text"
            >
              <Plus size={12} strokeWidth={1.5} />
              Add Provider
            </button>
          </div>

          {llmProviders.length === 0 ? (
            <p className="rounded-md bg-secondary-bg/80 px-3 py-2 text-[11px] text-text-lighter/75">
              Connect Anthropic, OpenAI, or other providers to unlock additional models.
            </p>
          ) : (
            <ul className="space-y-2">
              {llmProviders.map((provider) => {
                const Icon = PROVIDER_STATUS_ICON[provider.status];
                const updatedAt = formatProviderUpdatedAt(provider);

                return (
                  <li
                    key={provider.id}
                    className="rounded-md border border-border/50 bg-secondary-bg/60 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-xs">{provider.name}</p>
                        {provider.description ? (
                          <p className="text-[11px] text-text-lighter/75">{provider.description}</p>
                        ) : null}
                      </div>
                      <Icon
                        size={14}
                        strokeWidth={1.5}
                        style={{
                          color:
                            provider.status === "connected"
                              ? "var(--color-success)"
                              : provider.status === "requires_auth"
                                ? "var(--color-warning, #f59e0b)"
                                : "var(--color-error)",
                        }}
                      />
                    </div>

                    {provider.errorMessage ? (
                      <p
                        className="mt-2 flex items-center gap-1 text-[11px]"
                        style={{ color: "var(--color-error)" }}
                      >
                        <AlertCircle size={12} strokeWidth={1.5} />
                        {provider.errorMessage}
                      </p>
                    ) : null}

                    {updatedAt ? (
                      <p className="mt-2 text-[11px] text-text-lighter/70">
                        Last updated {updatedAt}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
});

ConfigPanel.displayName = "ConfigPanel";

export default ConfigPanel;
