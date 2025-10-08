import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { TerminalCore } from "./terminal-core";
import { TerminalSearch } from "./terminal-search";
import TerminalTabBarRefactored from "./terminal-tab-bar-refactored";
import {
  useActiveTerminalId,
  useTerminalSearchState,
  useTerminalSessions,
  useTerminalZoom,
  useUnifiedTerminalStore,
} from "./terminal-unified-store";

interface TerminalRefactoredProps {
  currentDirectory?: string;
  className?: string;
  onClosePanel?: () => void;
  onFullScreen?: () => void;
  isFullScreen?: boolean;
}

const TerminalRefactored: React.FC<TerminalRefactoredProps> = ({
  currentDirectory = "/",
  className = "",
  onClosePanel,
  onFullScreen,
  isFullScreen = false,
}) => {
  const sessions = useTerminalSessions();
  const activeSessionId = useActiveTerminalId();
  const { isSearchVisible, setSearchVisible } = useTerminalSearchState();
  const { zoomLevel, setZoomLevel } = useTerminalZoom();

  const { createSession, closeSession, setActiveSession, updateSession, clearAllSessions } =
    useUnifiedTerminalStore();

  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [newSessionName, setNewSessionName] = useState("");
  const terminalRefs = useRef<Map<string, { focus: () => void; terminal: any }>>(new Map());
  const hasInitializedRef = useRef(false);

  // Create initial session on mount
  useEffect(() => {
    if (!hasInitializedRef.current && sessions.length === 0) {
      hasInitializedRef.current = true;
      const dirName = currentDirectory.split("/").pop() || "terminal";
      createSession(dirName, currentDirectory);
    }
  }, [sessions.length, currentDirectory, createSession]);

  const handleNewSession = useCallback(() => {
    const dirName = currentDirectory.split("/").pop() || "terminal";
    const sessionId = createSession(dirName, currentDirectory);

    // Focus the new session after creation
    setTimeout(() => {
      const terminalRef = terminalRefs.current.get(sessionId);
      if (terminalRef) {
        terminalRef.focus();
      }
    }, 150);
  }, [currentDirectory, createSession]);

  const handleTabClick = useCallback(
    (sessionId: string) => {
      setActiveSession(sessionId);

      // Focus the terminal after a short delay
      setTimeout(() => {
        const terminalRef = terminalRefs.current.get(sessionId);
        if (terminalRef) {
          terminalRef.focus();
        }
      }, 50);
    },
    [setActiveSession],
  );

  const handleTabClose = useCallback(
    (sessionId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      closeSession(sessionId);
    },
    [closeSession],
  );

  const handleTabPin = useCallback(
    (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (session) {
        updateSession(sessionId, { isPinned: !session.isPinned });
      }
    },
    [sessions, updateSession],
  );

  const handleSessionReady = useCallback((sessionId: string) => {
    console.log("Terminal session ready:", sessionId);
  }, []);

  const handleConnectionChange = useCallback(
    (sessionId: string, connectionId: string | null) => {
      updateSession(sessionId, { connectionId: connectionId || undefined });
    },
    [updateSession],
  );

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel(zoomLevel + 0.1);
  }, [zoomLevel, setZoomLevel]);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(zoomLevel - 0.1);
  }, [zoomLevel, setZoomLevel]);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1.0);
  }, [setZoomLevel]);

  // Search handlers
  const handleSearch = useCallback(
    (term: string) => {
      if (activeSessionId) {
        const terminalRef = terminalRefs.current.get(activeSessionId);
        if (terminalRef?.terminal?.searchAddon) {
          terminalRef.terminal.searchAddon.findNext(term);
        }
      }
    },
    [activeSessionId],
  );

  const handleSearchNext = useCallback(
    (term: string) => {
      if (activeSessionId) {
        const terminalRef = terminalRefs.current.get(activeSessionId);
        if (terminalRef?.terminal?.searchAddon) {
          terminalRef.terminal.searchAddon.findNext(term);
        }
      }
    },
    [activeSessionId],
  );

  const handleSearchPrevious = useCallback(
    (term: string) => {
      if (activeSessionId) {
        const terminalRef = terminalRefs.current.get(activeSessionId);
        if (terminalRef?.terminal?.searchAddon) {
          terminalRef.terminal.searchAddon.findPrevious(term);
        }
      }
    },
    [activeSessionId],
  );

  const handleSearchClose = useCallback(() => {
    setSearchVisible(false);
    if (activeSessionId) {
      const terminalRef = terminalRefs.current.get(activeSessionId);
      if (terminalRef) {
        terminalRef.focus();
      }
    }
  }, [setSearchVisible, activeSessionId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeSession = sessions.find((s) => s.id === activeSessionId);
      if (!activeSession || !activeSessionId) return;

      const terminalRef = terminalRefs.current.get(activeSessionId);
      const isTerminalFocused = terminalRef
        ? document.activeElement?.closest(".xterm-container") !== null
        : false;

      // Terminal tab navigation
      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        const currentIndex = sessions.findIndex((s) => s.id === activeSessionId);
        const nextIndex = e.shiftKey
          ? (currentIndex - 1 + sessions.length) % sessions.length
          : (currentIndex + 1) % sessions.length;
        const nextSession = sessions[nextIndex];
        if (nextSession) {
          handleTabClick(nextSession.id);
        }
        return;
      }

      // New terminal
      if ((e.metaKey || e.ctrlKey) && e.key === "t" && !e.shiftKey) {
        e.preventDefault();
        handleNewSession();
        return;
      }

      // Close terminal
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "w" &&
        !e.shiftKey &&
        isTerminalFocused &&
        activeSessionId
      ) {
        e.preventDefault();
        closeSession(activeSessionId);
        return;
      }

      // Search
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && (isTerminalFocused || isSearchVisible)) {
        e.preventDefault();
        setSearchVisible(true);
        return;
      }

      // Zoom
      if ((e.ctrlKey || e.metaKey) && isTerminalFocused) {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          handleZoomIn();
          return;
        }
        if (e.key === "-") {
          e.preventDefault();
          handleZoomOut();
          return;
        }
        if (e.key === "0") {
          e.preventDefault();
          handleZoomReset();
          return;
        }
      }

      // Escape to close search
      if (e.key === "Escape" && isSearchVisible) {
        e.preventDefault();
        handleSearchClose();
        return;
      }

      // Number shortcuts for tabs
      if ((e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        if (tabIndex < sessions.length) {
          handleTabClick(sessions[tabIndex].id);
        }
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    sessions,
    activeSessionId,
    isSearchVisible,
    handleNewSession,
    handleTabClick,
    closeSession,
    setSearchVisible,
    handleSearchClose,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllSessions();
    };
  }, [clearAllSessions]);

  // If no sessions, show empty state
  if (sessions.length === 0) {
    return (
      <div className={cn("flex h-full flex-col", className)}>
        <div className="flex flex-1 items-center justify-center text-text-lighter">
          <div className="text-center">
            <p className="mb-4 text-xs">No terminal sessions</p>
            <button
              onClick={handleNewSession}
              className="rounded bg-selected px-2 py-1 text-text text-xs transition-colors hover:bg-hover"
            >
              Create Terminal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Terminal Tab Bar */}
      <TerminalTabBarRefactored
        sessions={sessions}
        activeSessionId={activeSessionId}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
        onTabPin={handleTabPin}
        onNewSession={handleNewSession}
        onClosePanel={onClosePanel}
        onFullScreen={onFullScreen}
        isFullScreen={isFullScreen}
      />

      {/* Terminal Sessions */}
      <div
        className="relative flex-1 overflow-hidden bg-primary-bg"
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: "top left",
          width: `${100 / zoomLevel}%`,
          height: `${100 / zoomLevel}%`,
        }}
      >
        {/* Search Overlay */}
        <TerminalSearch
          isVisible={isSearchVisible}
          onSearch={handleSearch}
          onNext={handleSearchNext}
          onPrevious={handleSearchPrevious}
          onClose={handleSearchClose}
        />

        {/* Terminal Sessions */}
        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn("absolute inset-0", session.id === activeSessionId ? "block" : "hidden")}
          >
            <TerminalCore
              sessionId={session.id}
              isActive={session.id === activeSessionId}
              onReady={() => handleSessionReady(session.id)}
              onConnectionChange={(connectionId) =>
                handleConnectionChange(session.id, connectionId)
              }
            />
          </div>
        ))}
      </div>

      {/* Rename Modal */}
      {renamingSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="min-w-[300px] rounded-lg border border-border bg-secondary-bg p-4">
            <h3 className="mb-3 font-medium text-sm text-text">Rename Terminal</h3>
            <input
              type="text"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateSession(renamingSessionId, { name: newSessionName.trim() });
                  setRenamingSessionId(null);
                  setNewSessionName("");
                } else if (e.key === "Escape") {
                  setRenamingSessionId(null);
                  setNewSessionName("");
                }
              }}
              className="w-full rounded border border-border bg-primary-bg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Terminal name"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => {
                  setRenamingSessionId(null);
                  setNewSessionName("");
                }}
                className="px-3 py-1.5 text-text-lighter text-xs transition-colors hover:text-text"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateSession(renamingSessionId, { name: newSessionName.trim() });
                  setRenamingSessionId(null);
                  setNewSessionName("");
                }}
                className="rounded bg-blue-500 px-3 py-1.5 text-white text-xs transition-colors hover:bg-blue-600"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TerminalRefactored;
