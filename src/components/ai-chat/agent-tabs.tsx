import { Plus, X } from "lucide-react";
import type React from "react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useSettingsStore } from "@/settings/store";
import { useAIChatStore } from "@/stores/ai-chat/store";
import type { AgentStatus } from "@/stores/ai-chat/types";
import { cn } from "@/utils/cn";

// Status indicator component
const StatusIndicator = memo(({ status }: { status: AgentStatus }) => {
  const getStatusColor = () => {
    switch (status) {
      case "responding":
        return "bg-blue-500 animate-pulse";
      case "thinking":
        return "bg-yellow-500 animate-pulse";
      case "finished":
        return "bg-green-500";
      case "typing":
        return "bg-purple-500 animate-pulse";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "responding":
        return "Responding...";
      case "thinking":
        return "Thinking...";
      case "finished":
        return "Finished";
      case "typing":
        return "Typing...";
      default:
        return "Idle";
    }
  };

  if (status === "idle") return null;

  return (
    <div className={cn("h-1.5 w-1.5 rounded-full", getStatusColor())} title={getStatusText()} />
  );
});

StatusIndicator.displayName = "StatusIndicator";

// Individual agent tab component for better performance
const AgentTab = memo(
  ({
    session,
    index,
    isActive,
    editingSessionId,
    editValue,
    onSwitch,
    onDelete,
    onStartRename,
    onEditValueChange,
    onFinishRename,
    onCancelRename,
    canDelete,
  }: {
    session: { id: string; status: AgentStatus };
    index: number;
    isActive: boolean;
    editingSessionId: string | null;
    editValue: string;
    onSwitch: (sessionId: string) => void;
    onDelete: (sessionId: string, event: React.MouseEvent) => void;
    onStartRename: (sessionId: string, currentName: string, event: React.MouseEvent) => void;
    onEditValueChange: (value: string) => void;
    onFinishRename: () => void;
    onCancelRename: () => void;
    canDelete: boolean;
  }) => {
    const shortcutNumber = index + 1;
    const displayName = editingSessionId === session.id ? editValue : shortcutNumber.toString();
    const isMac = navigator.platform.includes("Mac");

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onFinishRename();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancelRename();
        }
      },
      [onFinishRename, onCancelRename],
    );

    return (
      <div
        onClick={() => onSwitch(session.id)}
        className={cn(
          "group relative flex h-8 w-8 cursor-pointer items-center justify-center rounded text-xs font-medium transition-all duration-200",
          isActive
            ? "bg-primary-bg text-text shadow-sm ring-1 ring-border"
            : "bg-transparent text-text-lighter hover:bg-hover hover:text-text hover:scale-105",
        )}
        title={`Agent ${shortcutNumber} (${isMac ? "⌘" : "Ctrl"}+${shortcutNumber})`}
      >
        {editingSessionId === session.id ? (
          <input
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onBlur={onFinishRename}
            onKeyDown={handleKeyDown}
            className="w-6 border-none bg-transparent text-center text-xs outline-none"
            onClick={(e) => e.stopPropagation()}
            placeholder={shortcutNumber.toString()}
            maxLength={2}
          />
        ) : (
          <span
            className="select-none"
            onDoubleClick={(e) => onStartRename(session.id, displayName, e)}
          >
            {displayName}
          </span>
        )}

        {/* Status indicator - positioned at bottom right */}
        <div className="absolute -bottom-0.5 -right-0.5">
          <StatusIndicator status={session.status} />
        </div>

        {/* Delete button - only show on hover and if more than 1 session */}
        {editingSessionId !== session.id && canDelete && (
          <button
            onClick={(e) => onDelete(session.id, e)}
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/90 opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
            title="Close agent"
          >
            <X size={8} className="text-white" />
          </button>
        )}
      </div>
    );
  },
);

AgentTab.displayName = "AgentTab";

export const AgentTabs: React.FC = memo(() => {
  // Use specific selectors to avoid unnecessary re-renders
  const agentSessions = useAIChatStore((state) => state.agentSessions);
  const activeAgentSessionId = useAIChatStore((state) => state.activeAgentSessionId);

  // Memoize action selectors - these are stable references from zustand
  const createAgentSession = useAIChatStore((state) => state.createAgentSession);
  const switchToAgentSession = useAIChatStore((state) => state.switchToAgentSession);
  const deleteAgentSession = useAIChatStore((state) => state.deleteAgentSession);
  const renameAgentSession = useAIChatStore((state) => state.renameAgentSession);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Memoize handlers to prevent unnecessary re-renders
  const handleAddAgent = useCallback(() => {
    createAgentSession();
  }, [createAgentSession]);

  const handleDeleteAgent = useCallback(
    (sessionId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      if (agentSessions.length > 1) {
        deleteAgentSession(sessionId);
      }
    },
    [agentSessions.length, deleteAgentSession],
  );

  const handleStartRename = useCallback(
    (sessionId: string, currentName: string, event: React.MouseEvent) => {
      event.stopPropagation();
      setEditingSessionId(sessionId);
      setEditValue(currentName);
    },
    [],
  );

  const handleFinishRename = useCallback(() => {
    if (editingSessionId && editValue.trim()) {
      renameAgentSession(editingSessionId, editValue.trim());
    }
    setEditingSessionId(null);
    setEditValue("");
  }, [editingSessionId, editValue, renameAgentSession]);

  const handleCancelRename = useCallback(() => {
    setEditingSessionId(null);
    setEditValue("");
  }, []);

  const handleSwitchToAgent = useCallback(
    (sessionId: string) => {
      switchToAgentSession(sessionId);
    },
    [switchToAgentSession],
  );

  const handleEditValueChange = useCallback((value: string) => {
    setEditValue(value);
  }, []);

  // Memoize computed values
  const canDelete = useMemo(() => agentSessions.length > 1, [agentSessions.length]);
  const isMac = useMemo(() => navigator.platform.includes("Mac"), []);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9) {
          const sessionIndex = num - 1;
          if (sessionIndex < agentSessions.length) {
            e.preventDefault();
            switchToAgentSession(agentSessions[sessionIndex].id);
          }
        }
        // Cmd/Ctrl + N for new agent
        if (e.key === "n") {
          e.preventDefault();
          createAgentSession();
        }
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [agentSessions, switchToAgentSession, createAgentSession]);

  return (
    <div className="flex w-12 flex-col gap-1 border-border border-r bg-secondary-bg px-1 py-2">
      {agentSessions.map((session, index) => (
        <AgentTab
          key={session.id}
          session={session}
          index={index}
          isActive={session.id === activeAgentSessionId}
          editingSessionId={editingSessionId}
          editValue={editValue}
          onSwitch={handleSwitchToAgent}
          onDelete={handleDeleteAgent}
          onStartRename={handleStartRename}
          onEditValueChange={handleEditValueChange}
          onFinishRename={handleFinishRename}
          onCancelRename={handleCancelRename}
          canDelete={canDelete}
        />
      ))}

      {/* Add agent button */}
      <button
        onClick={handleAddAgent}
        className="flex h-8 w-8 items-center justify-center rounded border border-dashed border-border text-text-lighter transition-all duration-200 hover:border-solid hover:bg-hover hover:text-text hover:scale-105"
        title={`New agent (${isMac ? "⌘" : "Ctrl"}+N)`}
      >
        <Plus size={12} />
      </button>
    </div>
  );
});

AgentTabs.displayName = "AgentTabs";
