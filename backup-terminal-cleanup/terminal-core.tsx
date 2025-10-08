import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ask } from "@tauri-apps/plugin-dialog";
import { open } from "@tauri-apps/plugin-shell";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { SerializeAddon } from "@xterm/addon-serialize";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorSettingsStore } from "@/stores/editor-settings-store";
import { useProjectStore } from "@/stores/project-store";
import { useTerminalStore } from "@/stores/terminal-store";
import { useThemeStore } from "@/stores/theme-store";
import { cn } from "@/utils/cn";
import "@xterm/xterm/css/xterm.css";

interface TerminalCoreProps {
  sessionId: string;
  isActive: boolean;
  onReady?: () => void;
  onConnectionChange?: (connectionId: string | null) => void;
}

interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  selectionForeground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export const TerminalCore: React.FC<TerminalCoreProps> = ({
  sessionId,
  isActive,
  onReady,
  onConnectionChange,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const serializeAddonRef = useRef<SerializeAddon | null>(null);
  const connectionIdRef = useRef<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);

  const { updateSession, getSession } = useTerminalStore();
  const { currentTheme } = useThemeStore();
  const { fontSize: editorFontSize, fontFamily: editorFontFamily } = useEditorSettingsStore();
  const { rootFolderPath } = useProjectStore();
  const [fontSize] = useState(editorFontSize);

  // Cleanup function for all resources
  const cleanup = useCallback(() => {
    // Execute all cleanup functions
    cleanupFunctionsRef.current.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.warn("Cleanup function failed:", error);
      }
    });
    cleanupFunctionsRef.current = [];

    // Close terminal connection - use ref to avoid dependency loop
    if (connectionIdRef.current) {
      invoke("close_xterm_terminal", { id: connectionIdRef.current }).catch(console.warn);
      connectionIdRef.current = null;
    }

    // Dispose terminal
    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }

    // Clear refs
    fitAddonRef.current = null;
    searchAddonRef.current = null;
    serializeAddonRef.current = null;
  }, []);

  const getTerminalTheme = useCallback((): TerminalTheme => {
    const computedStyle = getComputedStyle(document.documentElement);
    const getColor = (varName: string) => {
      const color = computedStyle.getPropertyValue(varName).trim();
      return color || null;
    };

    const theme = {
      background: getColor("--color-primary-bg") || "#1f1f20",
      foreground: getColor("--color-text") || "#ededed",
      cursor: getColor("--color-accent") || "#60a5fa",
      cursorAccent: getColor("--color-background") || "#1f1f20",
      selectionBackground: `${getColor("--color-accent") || "#60a5fa"}40`,
      selectionForeground: getColor("--color-text") || "#ededed",
      black: getColor("--color-terminal-black") || "#000000",
      red: getColor("--color-terminal-red") || "#CD3131",
      green: getColor("--color-terminal-green") || "#0DBC79",
      yellow: getColor("--color-terminal-yellow") || "#E5E510",
      blue: getColor("--color-terminal-blue") || "#2472C8",
      magenta: getColor("--color-terminal-magenta") || "#BC3FBC",
      cyan: getColor("--color-terminal-cyan") || "#11A8CD",
      white: getColor("--color-terminal-white") || "#E5E5E5",
      brightBlack: getColor("--color-terminal-bright-black") || "#666666",
      brightRed: getColor("--color-terminal-bright-red") || "#F14C4C",
      brightGreen: getColor("--color-terminal-bright-green") || "#23D18B",
      brightYellow: getColor("--color-terminal-bright-yellow") || "#F5F543",
      brightBlue: getColor("--color-terminal-bright-blue") || "#3B8EEA",
      brightMagenta: getColor("--color-terminal-bright-magenta") || "#D670D6",
      brightCyan: getColor("--color-terminal-bright-cyan") || "#29B8DB",
      brightWhite: getColor("--color-terminal-bright-white") || "#FFFFFF",
    };

    console.log("[TerminalCore] Theme generated:", theme);
    return theme;
  }, []);

  const createTerminal = useCallback(() => {
    if (!terminalRef.current) return null;

    const computedStyle = getComputedStyle(document.documentElement);
    const fontMono =
      computedStyle.getPropertyValue("--font-mono").trim() ||
      '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace';

    const terminal = new Terminal({
      fontFamily: editorFontFamily || fontMono,
      fontSize: fontSize,
      fontWeight: "400",
      fontWeightBold: "700",
      lineHeight: 1.5,
      letterSpacing: 0,
      cursorBlink: true,
      cursorStyle: "bar",
      cursorWidth: 2,
      allowTransparency: false,
      allowProposedApi: true,
      theme: getTerminalTheme(),
      scrollback: 10000,
      tabStopWidth: 8,
      drawBoldTextInBrightColors: true,
      minimumContrastRatio: 1,
      convertEol: true,
      scrollOnUserInput: false,
      smoothScrollDuration: 0,
    });

    return terminal;
  }, [editorFontFamily, fontSize, getTerminalTheme]);

  const setupAddons = useCallback((terminal: Terminal) => {
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon(async (_event: MouseEvent, uri: string) => {
      try {
        const confirmed = await ask(`Do you want to open this link in your browser?\n\n${uri}`, {
          title: "Open External Link",
          kind: "warning",
          okLabel: "Open",
          cancelLabel: "Cancel",
        });

        if (confirmed) {
          await open(uri);
        }
      } catch (error) {
        console.error("Failed to open link:", error);
      }
    });
    const serializeAddon = new SerializeAddon();
    const unicode11Addon = new Unicode11Addon();
    const clipboardAddon = new ClipboardAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(serializeAddon);
    terminal.loadAddon(unicode11Addon);
    terminal.loadAddon(clipboardAddon);
    terminal.loadAddon(webLinksAddon);

    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;
    serializeAddonRef.current = serializeAddon;

    return { fitAddon, searchAddon };
  }, []);

  const setupEventListeners = useCallback(
    (terminal: Terminal, connId: string) => {
      // Handle terminal input
      const dataDisposable = terminal.onData((data) => {
        invoke("terminal_write", { id: connId, data }).catch((e) => {
          console.error("Failed to write to terminal:", e);
        });
      });

      const resizeDisposable = terminal.onResize(({ cols, rows }) => {
        invoke("terminal_resize", { id: connId, rows, cols }).catch((e) => {
          console.error("Failed to resize terminal:", e);
        });
      });

      const selectionDisposable = terminal.onSelectionChange(() => {
        const selection = terminal.getSelection();
        if (selection) {
          updateSession(sessionId, { selection });
        }
      });

      const titleDisposable = terminal.onTitleChange((title) => {
        updateSession(sessionId, { title });
      });

      // Store cleanup functions
      cleanupFunctionsRef.current.push(() => {
        dataDisposable.dispose();
        resizeDisposable.dispose();
        selectionDisposable.dispose();
        titleDisposable.dispose();
      });
    },
    [sessionId, updateSession],
  );

  const setupBackendListeners = useCallback((connId: string, terminal: Terminal) => {
    const outputEventName = `pty-output-${connId}`;
    const errorEventName = `pty-error-${connId}`;
    const closedEventName = `pty-closed-${connId}`;

    const setupListener = async (eventName: string, handler: (event: any) => void) => {
      try {
        const unlisten = await listen(eventName, handler);
        cleanupFunctionsRef.current.push(() => {
          unlisten();
        });
      } catch (error) {
        console.error(`Failed to setup listener for ${eventName}:`, error);
      }
    };

    setupListener(outputEventName, (event) => {
      const data = event.payload as { data: string };
      terminal.write(data.data);
    });

    setupListener(errorEventName, (event) => {
      const error = event.payload as { error: string };
      console.error("Terminal error:", error);
      terminal.writeln(`\r\n\x1b[31mError: ${error.error}\x1b[0m`);
    });

    setupListener(closedEventName, () => {
      console.log("Terminal closed:", connId);
      terminal.writeln("\r\n\x1b[33mTerminal session closed\x1b[0m");
    });
  }, []);

  const initializeTerminal = useCallback(async () => {
    if (!terminalRef.current || isInitialized || isInitializing) return;

    console.log("[TerminalCore] Starting initialization for session:", sessionId);
    setIsInitializing(true);

    try {
      // Create terminal instance
      const terminal = createTerminal();
      if (!terminal) {
        throw new Error("Failed to create terminal instance");
      }

      console.log("[TerminalCore] Terminal instance created:", terminal);
      xtermRef.current = terminal;

      // Setup addons
      const { fitAddon } = setupAddons(terminal);

      // Open terminal in DOM
      console.log("[TerminalCore] Opening terminal in DOM, ref:", terminalRef.current);
      terminal.open(terminalRef.current);
      console.log("[TerminalCore] Terminal opened successfully");

      // Allow shortcuts to be handled
      terminal.attachCustomKeyEventHandler((e) => {
        return !(e.ctrlKey || e.metaKey);
      });

      // Activate unicode version 11
      terminal.unicode.activeVersion = "11";

      // Get existing session data
      const existingSession = getSession(sessionId);

      // Create backend connection
      console.log("[TerminalCore] Creating backend connection...");
      const connId = await invoke<string>("create_xterm_terminal", {
        config: {
          working_directory: existingSession?.currentDirectory || rootFolderPath || undefined,
          shell: existingSession?.shell || undefined,
          rows: terminal.rows,
          cols: terminal.cols,
        },
      });

      console.log("[TerminalCore] Backend connection created:", connId);
      connectionIdRef.current = connId;
      onConnectionChange?.(connId);

      // Update session with connection ID
      updateSession(sessionId, { connectionId: connId });

      // Setup event listeners
      setupEventListeners(terminal, connId);
      await setupBackendListeners(connId, terminal);

      // Fit terminal multiple times with increasing delays to ensure proper sizing
      const fitTerminal = () => {
        if (fitAddon && terminalRef.current && xtermRef.current) {
          try {
            // Check if container has valid dimensions
            const rect = terminalRef.current.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              fitAddon.fit();
              console.log(
                "[TerminalCore] Terminal fitted, rows:",
                terminal.rows,
                "cols:",
                terminal.cols,
                "container size:",
                rect.width,
                "x",
                rect.height,
              );
            } else {
              console.warn("[TerminalCore] Container has no dimensions yet, retrying...");
              setTimeout(fitTerminal, 100);
            }
          } catch (e) {
            console.warn("Failed to fit terminal:", e);
            // Retry on error
            setTimeout(fitTerminal, 100);
          }
        }
      };

      // Write welcome message to confirm terminal is working
      terminal.writeln("\x1b[2m# Terminal initialized\x1b[0m");
      terminal.writeln("");

      // Wait for renderer to be ready, then fit
      setTimeout(fitTerminal, 200);

      setIsInitialized(true);
      setIsInitializing(false);
      console.log("[TerminalCore] Initialization complete");
      onReady?.();
    } catch (error) {
      console.error("[TerminalCore] Failed to initialize terminal:", error);
      setIsInitializing(false);
      setInitError(error instanceof Error ? error.message : "Failed to initialize terminal");
      cleanup();
    }
  }, [
    sessionId,
    isInitialized,
    isInitializing,
    createTerminal,
    setupAddons,
    setupEventListeners,
    setupBackendListeners,
    getSession,
    rootFolderPath,
    updateSession,
    onConnectionChange,
    onReady,
    cleanup,
  ]);

  // Initialize terminal when component mounts
  useEffect(() => {
    console.log(
      "[TerminalCore] useEffect triggered, isInitialized:",
      isInitialized,
      "isInitializing:",
      isInitializing,
    );
    if (terminalRef.current && !isInitialized && !isInitializing) {
      console.log("[TerminalCore] Calling initializeTerminal");
      initializeTerminal();
    } else {
      console.log("[TerminalCore] Skipping initialization, terminalRef:", !!terminalRef.current);
    }

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, initializeTerminal]);

  // Handle theme changes
  useEffect(() => {
    if (!xtermRef.current) return;
    xtermRef.current.options.theme = getTerminalTheme();
  }, [currentTheme, getTerminalTheme]);

  // Handle font changes
  useEffect(() => {
    if (!xtermRef.current) return;
    xtermRef.current.options.fontSize = fontSize;
    xtermRef.current.options.fontFamily = editorFontFamily;
    fitAddonRef.current?.fit();
  }, [fontSize, editorFontFamily]);

  // Handle focus
  useEffect(() => {
    if (isActive && xtermRef.current && isInitialized) {
      requestAnimationFrame(() => {
        xtermRef.current?.focus();
      });
    }
  }, [isActive, isInitialized]);

  // Handle resize with debouncing
  useEffect(() => {
    if (!fitAddonRef.current || !terminalRef.current || !isInitialized) return;

    let resizeTimer: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (fitAddonRef.current && xtermRef.current && terminalRef.current) {
          try {
            const rect = terminalRef.current.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              fitAddonRef.current.fit();
            }
          } catch (e) {
            console.warn("Failed to fit terminal on resize:", e);
          }
        }
      }, 100);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(resizeTimer);
    };
  }, [isInitialized]);

  return (
    <div className="relative h-full w-full">
      {!isInitialized && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary-bg text-text-lighter">
          <div className="text-center">
            {initError ? (
              <>
                <p className="mb-2 text-error text-xs">Failed to initialize terminal</p>
                <p className="text-xs">{initError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setInitError(null);
                    setIsInitializing(false);
                    setIsInitialized(false);
                    initializeTerminal();
                  }}
                  className="mt-4 rounded bg-selected px-3 py-1 text-text text-xs hover:bg-hover"
                >
                  Retry
                </button>
              </>
            ) : (
              <p className="text-xs">Initializing terminal...</p>
            )}
          </div>
        </div>
      )}
      <div
        ref={terminalRef}
        id={`terminal-${sessionId}`}
        className={cn(
          "xterm-container",
          "w-full",
          "h-full",
          "text-text",
          !isActive && "opacity-60",
          !isInitialized && "invisible",
        )}
        style={{ minHeight: "100px" }}
      />
    </div>
  );
};
