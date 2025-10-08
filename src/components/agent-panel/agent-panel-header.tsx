import { Asterisk, EllipsisVertical, Equal, Loader2, Plus } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { useAgentPanelStore } from "@/stores/agent-panel/store";
import { cn } from "@/utils/cn";

/**
 * Agent Panel Header - Based on Zed's design
 *
 * Layout:
 * ┌─────────────────────────────────────┐
 * │ [History] Agent Panel  [+] [Config] │
 * └─────────────────────────────────────┘
 */
export const AgentPanelHeader = memo(() => {
  const ui = useAgentPanelStore((state) => state.ui);
  const isStreaming = useAgentPanelStore((state) => state.isStreaming);
  const pendingToolApprovals = useAgentPanelStore((state) => state.pendingToolApprovals);
  const createThread = useAgentPanelStore((state) => state.createThread);
  const setActiveView = useAgentPanelStore((state) => state.setActiveView);
  const selectAgent = useAgentPanelStore((state) => state.selectAgent);
  const thread = useAgentPanelStore((state) => state.getActiveThread());

  // Determine connection status
  const connectionStatus = isStreaming
    ? "streaming"
    : pendingToolApprovals.length > 0
      ? "waiting"
      : "idle";

  const activeThreadTitle = (() => {
    if (ui.activeView === "configuration") {
      return "Agent Settings";
    }
    if (ui.activeView === "history") {
      return "Thread History";
    }
    return thread?.title || "New Thread";
  })();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", onDocClick);
    }
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const createWithAgent = (agentId: string, title?: string) => {
    selectAgent(agentId);
    const tid = createThread(agentId);
    if (title) {
      // Lightweight: update thread title via message (not strictly necessary)
    }
    setActiveView("thread");
    setMenuOpen(false);
    return tid;
  };

  const handleHistoryToggle = () => {
    setActiveView(ui.activeView === "history" ? "thread" : "history");
  };

  const handleConfigToggle = () => {
    setActiveView(ui.activeView === "configuration" ? "thread" : "configuration");
  };

  return (
    <div
      className="flex min-h-[32px] items-center justify-between border-border/50 border-b bg-secondary-bg px-3 py-1.5"
      style={{
        fontFamily: "var(--font-ui)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-sm",
            ui.activeView === "thread" ? "bg-selected text-text" : "text-text-lighter/80",
          )}
        >
          <Asterisk size={12} strokeWidth={1.5} />
        </span>
        <span className="font-medium text-xs" style={{ fontFamily: "var(--font-ui)" }}>
          {activeThreadTitle}
        </span>

        {/* Status Indicator */}
        {ui.activeView === "thread" && (
          <div className="flex items-center gap-1.5">
            {connectionStatus === "streaming" && (
              <div
                className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5"
                title="Agent is streaming response"
              >
                <Loader2 size={10} className="animate-spin text-blue-500" strokeWidth={2} />
                <span className="font-medium text-[10px] text-blue-500">Streaming</span>
              </div>
            )}
            {connectionStatus === "waiting" && (
              <div
                className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5"
                title={`${pendingToolApprovals.length} tool${pendingToolApprovals.length > 1 ? "s" : ""} waiting for approval`}
              >
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-500" />
                <span className="font-medium text-[10px] text-yellow-500">
                  Waiting ({pendingToolApprovals.length})
                </span>
              </div>
            )}
            {connectionStatus === "idle" && (
              <div
                className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5"
                title="Agent is ready"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="font-medium text-[10px] text-green-500">Ready</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-1 text-text-lighter/70 transition-colors hover:bg-hover/50 hover:text-text"
            title="New Thread"
          >
            <Plus size={13} strokeWidth={1.5} />
          </button>
          {menuOpen ? (
            <div
              className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-border/50 bg-secondary-bg p-1 shadow-lg"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              <button
                className="w-full rounded px-2 py-1.5 text-left text-text-lighter/90 text-xs hover:bg-hover/60 hover:text-text"
                onClick={() => createWithAgent("native")}
              >
                New Thread
              </button>
              <button
                className="w-full rounded px-2 py-1.5 text-left text-text-lighter/90 text-xs hover:bg-hover/60 hover:text-text"
                onClick={() => createWithAgent("native")}
              >
                New Text Thread
              </button>
              <div className="my-1 h-px bg-border/40" />
              <div className="px-2 pt-1 pb-1 text-[10px] text-text-lighter/60 uppercase tracking-wide">
                External Agents
              </div>
              <button
                className="w-full rounded px-2 py-1.5 text-left text-text-lighter/90 text-xs hover:bg-hover/60 hover:text-text"
                onClick={() => createWithAgent("acp_claude")}
              >
                New Claude Code Thread
              </button>
              <button
                className="w-full rounded px-2 py-1.5 text-left text-text-lighter/90 text-xs hover:bg-hover/60 hover:text-text"
                onClick={() => createWithAgent("acp_gemini")}
              >
                New Gemini CLI Thread
              </button>
            </div>
          ) : null}
        </div>

        <button
          onClick={handleHistoryToggle}
          className={cn(
            "rounded-md p-1 transition-colors",
            ui.activeView === "history"
              ? "bg-selected text-text"
              : "text-text-lighter/70 hover:bg-hover/50 hover:text-text",
          )}
          title="Thread History"
        >
          <Equal size={13} strokeWidth={1.5} />
        </button>

        <button
          onClick={handleConfigToggle}
          className={cn(
            "rounded-md p-1 transition-colors",
            ui.activeView === "configuration"
              ? "bg-selected text-text"
              : "text-text-lighter/70 hover:bg-hover/50 hover:text-text",
          )}
          title="Configuration"
        >
          <EllipsisVertical size={13} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
});

AgentPanelHeader.displayName = "AgentPanelHeader";
