import { useEffect, useRef, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Terminal as TerminalType } from "../../types/terminal";
import Convert from 'ansi-to-html';

interface TerminalSessionProps {
  terminal: TerminalType;
  isActive: boolean;
  onDirectoryChange?: (terminalId: string, directory: string) => void;
  onActivity?: (terminalId: string) => void;
}

interface LineItem {
  lexeme: string;
  width: number;
  is_underline: boolean;
  is_bold: boolean;
  is_italic: boolean;
  background_color?: any;
  foreground_color?: any;
}

interface TerminalEvent {
  type: 'screenUpdate';
  screen: LineItem[][];
  cursor_line: number;
  cursor_col: number;
}

interface TerminalConfig {
  kind: {
    $type: 'local';
    workingDirectory?: string;
    shell?: string;
  };
  workingDir?: string;
  shellCommand?: string;
  environment?: Record<string, string>;
  lines: number;
  cols: number;
}

const TerminalSession = ({
  terminal,
  isActive,
  onDirectoryChange: _onDirectoryChange,
  onActivity,
}: TerminalSessionProps) => {
  const sessionRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [screen, setScreen] = useState<LineItem[][]>([]);
  const [cursorLine, setCursorLine] = useState(0);
  const [cursorCol, setCursorCol] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [terminalSize, setTerminalSize] = useState({ rows: 24, cols: 80 });
  
  // Create ANSI to HTML converter with minimal overrides
  // Let the shell's color configuration come through naturally
  const ansiConverter = useRef(new Convert({
    fg: 'inherit',  // Use shell's default foreground
    bg: 'transparent',  // Transparent background to use theme
    newline: false,
    escapeXML: true,
    // Don't override colors - let shell/terminal defaults come through
    colors: undefined
  }));

  // Calculate terminal size based on container dimensions
  const calculateTerminalSize = useCallback(() => {
    if (terminalRef.current) {
      const rect = terminalRef.current.getBoundingClientRect();
      const charWidth = 7.2; // Approximate character width in pixels for monospace font
      const lineHeight = 14; // Approximate line height in pixels
      
      const cols = Math.floor((rect.width - 24) / charWidth); // Subtract padding
      const rows = Math.floor((rect.height - 20) / lineHeight); // Subtract padding
      
      return {
        rows: Math.max(rows, 10),
        cols: Math.max(cols, 40)
      };
    }
    return { rows: 24, cols: 80 };
  }, []);

  // Initialize terminal connection when active
  useEffect(() => {
    if (isActive && !connectionId) {
      const initializeTerminal = async () => {
        try {
          const size = calculateTerminalSize();
          setTerminalSize(size);
          
          const config: TerminalConfig = {
            kind: {
              $type: 'local',
              workingDirectory: terminal.currentDirectory,
              shell: terminal.shell || undefined
            },
            lines: size.rows,
            cols: size.cols
          };
          
          const id: string = await invoke('create_terminal_connection', { config });
          setConnectionId(id);
          setIsConnected(true);
          
          // Listen for terminal events
          const unlisten = await listen(`terminal-event-${id}`, (event: any) => {
            console.log('Terminal event received:', event.payload);
            const terminalEvent = event.payload as TerminalEvent;
            if (terminalEvent.type === 'screenUpdate') {
              setScreen(terminalEvent.screen);
              setCursorLine(terminalEvent.cursor_line);
              setCursorCol(terminalEvent.cursor_col);
            }
            if (onActivity) {
              onActivity(terminal.id);
            }
          });
          
          // Listen for disconnect events
          const unlistenDisconnect = await listen(`terminal-disconnect-${id}`, () => {
            setIsConnected(false);
            setConnectionId(null);
          });
          
          return () => {
            unlisten();
            unlistenDisconnect();
          };
        } catch (error) {
          console.error('Failed to initialize terminal:', error);
        }
      };
      
      initializeTerminal();
    }
  }, [isActive, connectionId, terminal, calculateTerminalSize, onActivity]);

  // Auto-focus input when terminal becomes active and handle focus management
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);
  
  // Keep input focused when clicking on terminal
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    
    const handleClick = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
        // Re-dispatch the event to the input
        inputRef.current.dispatchEvent(new KeyboardEvent('keydown', {
          key: e.key,
          code: e.code,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
          bubbles: true
        }));
      }
    };
    
    terminal.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      terminal.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Auto-scroll to bottom when screen updates
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [screen]);

  // Handle terminal resize
  useEffect(() => {
    const handleResize = async () => {
      if (connectionId && terminalRef.current) {
        const size = calculateTerminalSize();
        if (size.rows !== terminalSize.rows || size.cols !== terminalSize.cols) {
          setTerminalSize(size);
          try {
            await invoke('resize_terminal', {
              connectionId,
              lines: size.rows,
              cols: size.cols
            });
          } catch (error) {
            console.error('Failed to resize terminal:', error);
          }
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [connectionId, terminalSize, calculateTerminalSize]);

  // Send input to terminal
  const sendInput = useCallback(async (data: string) => {
    if (connectionId && isConnected) {
      try {
        await invoke('send_terminal_data', { connectionId, data });
      } catch (error) {
        console.error('Failed to send data to terminal:', error);
      }
    }
  }, [connectionId, isConnected]);

  // Handle key input - send everything to PTY
  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (!isConnected) {
      console.log('Terminal not connected, ignoring input');
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    let data = '';
    
    console.log('Key pressed:', e.key, 'ctrlKey:', e.ctrlKey, 'metaKey:', e.metaKey);
    
    // Handle special keys first
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'c') {
        console.log('Sending Ctrl+C');
        try {
          await invoke('send_terminal_ctrl_c', { connectionId });
        } catch (error) {
          console.error('Failed to send Ctrl+C:', error);
        }
        return;
      } else if (e.key === 'd') {
        console.log('Sending Ctrl+D');
        try {
          await invoke('send_terminal_ctrl_d', { connectionId });
        } catch (error) {
          console.error('Failed to send Ctrl+D:', error);
        }
        return;
      } else if (e.key.length === 1) {
        // Convert Ctrl+letter to control code
        const code = e.key.toLowerCase().charCodeAt(0) - 96;
        if (code > 0 && code < 27) {
          data = String.fromCharCode(code);
        }
      }
    } else {
      // Handle regular keys
      switch (e.key) {
        case 'Enter':
          data = '\r';
          break;
        case 'Backspace':
          data = '\x7f';
          break;
        case 'Tab':
          data = '\t';
          break;
        case 'ArrowUp':
          data = '\x1b[A';
          break;
        case 'ArrowDown':
          data = '\x1b[B';
          break;
        case 'ArrowRight':
          data = '\x1b[C';
          break;
        case 'ArrowLeft':
          data = '\x1b[D';
          break;
        case 'Home':
          data = '\x1b[H';
          break;
        case 'End':
          data = '\x1b[F';
          break;
        case 'PageUp':
          data = '\x1b[5~';
          break;
        case 'PageDown':
          data = '\x1b[6~';
          break;
        case 'Delete':
          data = '\x1b[3~';
          break;
        case 'Escape':
          data = '\x1b';
          break;
        default:
          // Handle all printable characters
          if (e.key.length === 1) {
            data = e.key;
          }
          break;
      }
    }
    
    if (data) {
      console.log('Sending data to terminal:', JSON.stringify(data));
      try {
        await sendInput(data);
      } catch (error) {
        console.error('Failed to send input:', error);
      }
    } else {
      console.log('No data to send for key:', e.key);
    }
  }, [isConnected, connectionId, sendInput]);

  // Handle activity tracking
  useEffect(() => {
    if (isActive && onActivity) {
      onActivity(terminal.id);
    }
  }, [isActive, terminal.id, onActivity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionId) {
        invoke('close_terminal_connection', { connectionId }).catch(console.error);
      }
    };
  }, [connectionId]);

  // Render terminal lines
  const renderTerminalLine = (line: LineItem[], lineIndex: number) => {
    if (!line || line.length === 0) {
      return <div key={lineIndex} className="h-[14px]">&nbsp;</div>;
    }
    
    return (
      <div key={lineIndex} className="whitespace-pre font-mono text-xs leading-[14px] h-[14px]">
        {line.map((item, itemIndex) => {
          let className = 'inline';
          let style: React.CSSProperties = {};
          
          if (item.is_bold) className += ' font-bold';
          if (item.is_italic) className += ' italic';
          if (item.is_underline) className += ' underline';
          
          // Handle colors (simplified for now)
          if (item.foreground_color) {
            style.color = '#cccccc'; // Default for now
          }
          if (item.background_color) {
            style.backgroundColor = 'transparent'; // Default for now
          }
          
          return (
            <span
              key={itemIndex}
              className={className}
              style={style}
              dangerouslySetInnerHTML={{
                __html: ansiConverter.current.toHtml(item.lexeme || ' ')
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={sessionRef}
      className={`h-full ${isActive ? 'block' : 'hidden'}`}
      data-terminal-id={terminal.id}
    >
      <div className="flex flex-col h-full">
        {/* Terminal content */}
        <div 
          ref={terminalRef}
          className="flex-1 overflow-hidden font-mono text-xs p-3 bg-[var(--primary-bg)] text-[var(--text-color)] cursor-text relative"
          onClick={() => inputRef.current?.focus()}
        >
          {!isConnected ? (
            <div className="text-[var(--text-lighter)] text-center pt-4">
              Connecting to terminal...
            </div>
          ) : (
            <div className="relative">
              {screen.map((line, index) => renderTerminalLine(line, index))}
              
              {/* Cursor */}
              <div
                className="absolute bg-[var(--text-color)] opacity-75"
                style={{
                  left: `${cursorCol * 7.2}px`,
                  top: `${cursorLine * 14}px`,
                  width: '7.2px',
                  height: '14px',
                  animation: 'blink 1s infinite'
                }}
              />
            </div>
          )}
          
          {/* Hidden input for capturing ALL keyboard events */}
          <input
            ref={inputRef}
            className="absolute opacity-0 w-0 h-0"
            value=""
            onChange={() => {}} 
            onKeyDown={handleKeyDown}
            onKeyPress={() => {}}
            onInput={() => {}}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            tabIndex={0}
            style={{ left: '-9999px', top: '-9999px', pointerEvents: 'none' }}
          />
        </div>
      </div>
      
    </div>
  );
};

export default TerminalSession; 