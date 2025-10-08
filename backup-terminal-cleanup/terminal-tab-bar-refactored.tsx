import { Maximize2, Minimize2, Pin, Plus, Terminal as TerminalIcon, X } from "lucide-react";
import type React from "react";
import { useCallback } from "react";
import { cn } from "@/utils/cn";

interface TerminalSession {
  id: string;
  name: string;
  currentDirectory?: string;
  shell?: string;
  isActive: boolean;
  isPinned: boolean;
  splitMode?: boolean;
  splitWithId?: string;
  connectionId?: string;
  selection?: string;
  title?: string;
  createdAt: Date;
  lastActivity: Date;
}

interface TerminalTabBarRefactoredProps {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  onTabClick: (sessionId: string) => void;
  onTabClose: (sessionId: string, event: React.MouseEvent) => void;
  onTabPin: (sessionId: string) => void;
  onNewSession: () => void;
  onClosePanel?: () => void;
  onFullScreen?: () => void;
  isFullScreen?: boolean;
}

const TerminalTabBarRefactored: React.FC<TerminalTabBarRefactoredProps> = ({
  sessions,
  activeSessionId,
  onTabClick,
  onTabClose,
  onTabPin: _onTabPin,
  onNewSession,
  onClosePanel,
  onFullScreen,
  isFullScreen = false,
}) => {
  const handleTabContextMenu = useCallback((e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    // TODO: Implement context menu
    console.log("Context menu for session:", sessionId);
  }, []);

  const handleTabWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        const currentIndex = sessions.findIndex((s) => s.id === activeSessionId);
        if (currentIndex === -1) return;

        const nextIndex =
          e.deltaY > 0
            ? (currentIndex + 1) % sessions.length
            : (currentIndex - 1 + sessions.length) % sessions.length;

        const nextSession = sessions[nextIndex];
        if (nextSession) {
          onTabClick(nextSession.id);
        }
      }
    },
    [sessions, activeSessionId, onTabClick],
  );

  return (
    <div
      className={cn(
        "flex items-center gap-1 border-border border-b bg-secondary-bg px-1 py-1",
        "h-7 min-h-7",
      )}
    >
      {/* Terminal Icon */}
      <div className="flex items-center gap-1 px-1 text-text-lighter">
        <TerminalIcon size={12} />
        <span className="text-xs">Terminal</span>
      </div>

      {/* Tab Scroll Container */}
      <div className="flex flex-1 items-center gap-0.5 overflow-x-auto" onWheel={handleTabWheel}>
        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              "group relative flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 transition-colors",
              "border border-transparent hover:bg-hover",
              session.id === activeSessionId && "border-border bg-selected",
            )}
            onClick={() => onTabClick(session.id)}
            onContextMenu={(e) => handleTabContextMenu(e, session.id)}
          >
            {/* Pin Icon */}
            {session.isPinned && <Pin size={10} className="text-text-lighter" />}

            {/* Tab Name */}
            <span
              className={cn(
                "max-w-[150px] truncate text-xs",
                session.id === activeSessionId ? "text-text" : "text-text-lighter",
              )}
              title={session.name}
            >
              {session.name}
            </span>

            {/* Close Button */}
            {!session.isPinned && (
              <button
                onClick={(e) => onTabClose(session.id, e)}
                className={cn(
                  "flex h-3 w-3 items-center justify-center rounded p-0 transition-colors",
                  "text-text-lighter hover:bg-hover hover:text-text",
                  "opacity-0 group-hover:opacity-100",
                )}
                title="Close terminal"
              >
                <X size={8} />
              </button>
            )}
          </div>
        ))}

        {/* New Terminal Button */}
        <button
          onClick={onNewSession}
          className={cn(
            "flex items-center justify-center rounded p-0.5 transition-colors",
            "text-text-lighter hover:bg-hover hover:text-text",
          )}
          title="New terminal (Ctrl+T)"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-1">
        {/* Full Screen Toggle */}
        {onFullScreen && (
          <button
            onClick={onFullScreen}
            className={cn(
              "flex items-center justify-center rounded p-0.5 transition-colors",
              "text-text-lighter hover:bg-hover hover:text-text",
            )}
            title={isFullScreen ? "Exit full screen" : "Full screen"}
          >
            {isFullScreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        )}

        {/* Close Panel */}
        {onClosePanel && (
          <button
            onClick={onClosePanel}
            className={cn(
              "flex items-center justify-center rounded p-0.5 transition-colors",
              "text-text-lighter hover:bg-hover hover:text-text",
            )}
            title="Close panel"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

export default TerminalTabBarRefactored;
