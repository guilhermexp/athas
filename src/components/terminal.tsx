import React, { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { X, Terminal as TerminalIcon } from "lucide-react";
import { isTauri } from "../utils/platform";

// Add CSS for blinking cursor
const cursorStyle = `
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
`;

// Insert style into document head
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = cursorStyle;
  document.head.appendChild(style);
}

interface TerminalProps {
  isVisible: boolean;
  onClose: () => void;
  currentDirectory?: string;
  isEmbedded?: boolean;
}

// Removed TerminalLine interface - no longer needed

interface TerminalEvent {
  type: string;
  lines?: any[][];
  screen?: any[][];
  cursor_line?: number;
  cursor_col?: number;
}

const Terminal = ({
  isVisible,
  onClose,
  currentDirectory,
  isEmbedded,
}: TerminalProps) => {
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [terminalId, setTerminalId] = useState<string | null>(null);
  const [height, setHeight] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Terminal resize logic
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);

      const startY = e.clientY;
      const startHeight = height;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaY = startY - e.clientY;
        const newHeight = Math.min(
          Math.max(startHeight + deltaY, 200),
          window.innerHeight * 0.8,
        );
        setHeight(newHeight);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
    },
    [height],
  );

  const appendToTerminal = (content: string) => {
    const newLines = content.split("\n");
    setTerminalLines(prev => {
      const updated = [...prev];
      // Add new lines, splitting on newlines
      newLines.forEach((line, index) => {
        if (index === 0 && updated.length > 0) {
          // Append to the last line if it exists
          updated[updated.length - 1] += line;
        } else if (line !== "" || index < newLines.length - 1) {
          // Add new line (skip empty trailing line from split)
          updated.push(line);
        }
      });
      return updated;
    });
  };

  const setTerminalScreen = (screen: string) => {
    setTerminalLines(screen.split("\n"));
  };

  // Create terminal on mount
  useEffect(() => {
    if (!isVisible || !isTauri() || terminalId) return; // Don't create if already exists

    const createTerminal = async () => {
      try {
        const id = await invoke<string>("create_terminal_connection", {
          config: {
            kind: {
              $type: "local",
              workingDirectory: currentDirectory,
              shell: null,
            },
            workingDir: currentDirectory,
            shellCommand: null,
            environment: null,
            lines: 24,
            cols: 80,
          },
        });

        setTerminalId(id);
        setIsConnected(true);
        console.log("Terminal connected:", id);
        appendToTerminal(`Terminal connected (ID: ${id})\n`);

        // Listen for terminal events
        const eventUnlisten = await listen<any>(
          `terminal-event-${id}`,
          event => {
            // Process terminal events (screen updates, cursor moves, etc.)
            if (event.payload.type === "newLines") {
              // Convert line items to plain text for simple display
              const lines = event.payload.lines
                .map((line: any[]) =>
                  line.map((item: any) => item.lexeme).join(""),
                )
                .join("\n");
              if (lines.trim()) {
                appendToTerminal(lines + "\n");
              }
            } else if (event.payload.type === "screenUpdate") {
              // Handle full screen updates - this represents the entire terminal screen
              const screenText = event.payload.screen
                .map((line: any[]) =>
                  line.map((item: any) => item.lexeme).join(""),
                )
                .join("\n");
              // Only update if the screen has actual content
              if (screenText.trim()) {
                setTerminalScreen(screenText);
              }
            }
          },
        );

        // Listen for terminal disconnect
        const disconnectUnlisten = await listen<any>(
          `terminal-disconnect-${id}`,
          () => {
            setIsConnected(false);
            appendToTerminal("\n[Terminal session ended]\n");
          },
        );

        return () => {
          eventUnlisten();
          disconnectUnlisten();
        };
      } catch (error) {
        console.error("Failed to create terminal:", error);
        setIsConnected(false);
        appendToTerminal(`Failed to create terminal: ${error}\n`);
      }
    };

    createTerminal();
  }, [isVisible]); // Only depend on isVisible, not currentDirectory

  // Auto-focus input when terminal becomes visible or connected
  useEffect(() => {
    if (
      isVisible
      && inputRef.current
      && isTauri()
      && terminalId
      && isConnected
    ) {
      // Use setTimeout to ensure the input is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isVisible, terminalId, isConnected]);

  // Click to focus terminal and ensure input works
  const handleTerminalClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(
      "Terminal clicked, terminalId:",
      terminalId,
      "isConnected:",
      isConnected,
    );
    if (inputRef.current && terminalId) {
      console.log("Focusing input field");
      inputRef.current.focus();
    }
  };

  // Auto-scroll to bottom when terminal content changes
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLines, currentInput]);

  // Cleanup terminal on unmount
  useEffect(() => {
    return () => {
      if (terminalId) {
        invoke("close_terminal_connection", { connectionId: terminalId }).catch(
          console.error,
        );
      }
    };
  }, [terminalId]);

  const executeCommand = async (command: string) => {
    if (!isTauri() || !command.trim() || !terminalId) {
      return;
    }

    // Add the command to terminal history (show what user typed)
    appendToTerminal(`$ ${command}\n`);
    setIsExecuting(true);

    try {
      await invoke("send_terminal_data", {
        connectionId: terminalId,
        data: command.trim() + "\n",
      });
    } catch (error) {
      appendToTerminal(`Error: ${error}\n`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isConnected || isExecuting) return;

    if (e.key === "Enter") {
      e.preventDefault();
      executeCommand(currentInput);
      setCurrentInput("");
    }
    // Let the input field handle all other keys naturally
  };

  // Don't render anything if not in Tauri environment
  if (!isTauri()) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  // If embedded, render just the content without the container
  if (isEmbedded) {
    return (
      <div className="flex flex-col h-full">
        <div
          ref={terminalRef}
          className="flex-1 overflow-y-auto font-mono text-sm p-3 bg-[var(--primary-bg)] custom-scrollbar relative focus:outline-none"
          onClick={handleTerminalClick}
          style={{ zIndex: 1 }}
        >
          {/* Terminal Screen Content with integrated input */}
          <div
            className="text-[var(--text-light)] leading-relaxed cursor-text"
            onClick={e => {
              e.stopPropagation();
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }}
          >
            {/* Render all terminal output lines */}
            {terminalLines.map((line, index) => (
              <div key={index} className="whitespace-pre-wrap">
                {line || "\u00A0"}{" "}
                {/* Use non-breaking space for empty lines */}
              </div>
            ))}

            {/* Current input line at the bottom */}
            {terminalId && isConnected && (
              <div className="flex items-start">
                <span className="text-[#00ff00] mr-1">$</span>
                <span className="text-[var(--text-color)] flex-1 relative">
                  {currentInput}
                  {/* Blinking cursor */}
                  <span
                    className={`inline-block w-2 h-5 ml-0.5 ${isExecuting ? "bg-yellow-400" : "bg-[var(--text-color)]"}`}
                    style={{
                      animation: "blink 1s infinite",
                    }}
                  />
                </span>
                {isExecuting && (
                  <span className="text-yellow-400 text-xs ml-2 animate-pulse">
                    ⚡
                  </span>
                )}
              </div>
            )}

            {/* Connection status for inline display */}
            {terminalId && !isConnected && (
              <div className="text-yellow-400">
                <span className="text-[#00ff00]">$</span>{" "}
                <span className="animate-pulse">Connecting to terminal...</span>
              </div>
            )}

            {/* Bottom reference for auto-scrolling */}
            <div ref={bottomRef} />
          </div>

          {/* Hidden input field for actual text input */}
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={e => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => console.log("Hidden input focused")}
            onBlur={() => console.log("Hidden input blurred")}
            disabled={isExecuting || !isConnected}
            className="absolute opacity-0 w-0 h-0 border-0 outline-0"
            style={{
              position: "absolute",
              left: "-9999px",
              top: "-9999px",
              zIndex: -1,
            }}
            autoComplete="off"
            spellCheck={false}
            tabIndex={1}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[var(--border-color)] flex flex-col z-50"
      style={{ height: `${height}px` }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-blue-500/30 transition-colors duration-150 group ${
          isResizing ? "bg-blue-500/50" : ""
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-[3px] -translate-y-[1px] opacity-0 group-hover:opacity-100 bg-blue-500 transition-opacity duration-150" />
      </div>

      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#2a2a2a] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <TerminalIcon size={16} className="text-[var(--text-lighter)]" />
          <span className="font-mono text-sm text-[var(--text-color)]">
            Terminal
          </span>
          {currentDirectory && (
            <span className="font-mono text-xs text-[var(--text-lighter)]">
              {currentDirectory}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[var(--hover-color)] rounded transition-colors"
        >
          <X size={16} className="text-[var(--text-lighter)]" />
        </button>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto font-mono text-sm p-3 bg-[var(--primary-bg)] custom-scrollbar relative focus:outline-none"
        onClick={handleTerminalClick}
        style={{ zIndex: 1 }}
      >
        {/* Terminal Screen Content with integrated input */}
        <div
          className="text-[var(--text-light)] leading-relaxed cursor-text"
          onClick={e => {
            e.stopPropagation();
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }}
        >
          {/* Render all terminal output lines */}
          {terminalLines.map((line, index) => (
            <div key={index} className="whitespace-pre-wrap">
              {line || "\u00A0"} {/* Use non-breaking space for empty lines */}
            </div>
          ))}

          {/* Current input line at the bottom */}
          {terminalId && isConnected && (
            <div className="flex items-start">
              <span className="text-[#00ff00] mr-1">$</span>
              <span className="text-[var(--text-color)] flex-1 relative">
                {currentInput}
                {/* Blinking cursor */}
                <span
                  className={`inline-block w-2 h-5 ml-0.5 ${isExecuting ? "bg-yellow-400" : "bg-[var(--text-color)]"}`}
                  style={{
                    animation: "blink 1s infinite",
                  }}
                />
              </span>
              {isExecuting && (
                <span className="text-yellow-400 text-xs ml-2 animate-pulse">
                  ⚡
                </span>
              )}
            </div>
          )}

          {/* Connection status for inline display */}
          {terminalId && !isConnected && (
            <div className="text-yellow-400">
              <span className="text-[#00ff00]">$</span>{" "}
              <span className="animate-pulse">Connecting to terminal...</span>
            </div>
          )}

          {/* Bottom reference for auto-scrolling */}
          <div ref={bottomRef} />
        </div>

        {/* Hidden input field for actual text input */}
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={e => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => console.log("Hidden input focused (embedded)")}
          onBlur={() => console.log("Hidden input blurred (embedded)")}
          disabled={isExecuting || !isConnected}
          className="absolute opacity-0 w-0 h-0 border-0 outline-0"
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
            zIndex: -1,
          }}
          autoComplete="off"
          spellCheck={false}
          tabIndex={1}
        />
      </div>
    </div>
  );
};

export default Terminal;
