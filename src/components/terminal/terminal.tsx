import { useState, useRef, useEffect, useCallback } from 'react';
import { Command } from '@tauri-apps/plugin-shell';
import { isTauri } from '../../utils/platform';
import { X, Terminal as TerminalIcon } from 'lucide-react';
import Convert from 'ansi-to-html';

interface TerminalProps {
  isVisible: boolean;
  onClose: () => void;
  currentDirectory?: string;
  isEmbedded?: boolean;
}

interface TerminalLine {
  id: number;
  content: string;
  type: 'input' | 'output' | 'error';
  timestamp: Date;
}

const Terminal = ({ isVisible, onClose, currentDirectory, isEmbedded }: TerminalProps) => {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [workingDirectory, setWorkingDirectory] = useState(currentDirectory || '');
  const [height, setHeight] = useState(320); // Default height
  const [isResizing, setIsResizing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const lineIdCounter = useRef(0);

  // Create ANSI to HTML converter with Mac Terminal.app colors
  const ansiConverter = useRef(new Convert({
    fg: '#cccccc',    // Default foreground (Mac terminal)
    bg: 'transparent', // Transparent background to use CSS
    newline: false,
    escapeXML: true,
    colors: {
      0: '#000000',   // Black
      1: '#c91b00',   // Red
      2: '#00c200',   // Green  
      3: '#c7c400',   // Yellow
      4: '#0037da',   // Blue
      5: '#c930c7',   // Magenta
      6: '#00c5c7',   // Cyan
      7: '#c7c7c7',   // White
      8: '#686868',   // Bright black (gray)
      9: '#ff6d67',   // Bright red
      10: '#5ff967',  // Bright green
      11: '#fefb67',  // Bright yellow
      12: '#6871ff',  // Bright blue
      13: '#ff76ff',  // Bright magenta
      14: '#5ffdff',  // Bright cyan
      15: '#feffff'   // Bright white
    }
  }));

  // Helper function to process ANSI output
  const processAnsiOutput = (text: string): string => {
    return ansiConverter.current.toHtml(text);
  };

  // Terminal resize logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY; // Reverse direction since we're resizing from top
      const newHeight = Math.min(Math.max(startHeight + deltaY, 200), window.innerHeight * 0.8); // Min 200px, max 80% of screen
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [height]);

  // Auto-focus input when terminal becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current && isTauri()) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  // Initialize with a welcome message
  useEffect(() => {
    if (isVisible && lines.length === 0 && isTauri()) {
      addLine('athas-code terminal (Cmd+J to toggle)', 'output');
      addLine(`Working directory: ${workingDirectory || '~'}`, 'output');
    }
  }, [isVisible]);

  const addLine = (content: string, type: TerminalLine['type']) => {
    setLines(prev => [...prev, {
      id: lineIdCounter.current++,
      content,
      type,
      timestamp: new Date()
    }]);
  };

  const executeCommand = async (command: string) => {
    if (!isTauri() || !command.trim()) return;

    setIsExecuting(true);
    addLine(`$ ${command}`, 'input');

    try {
      // Check for TUI applications that won't work well in embedded terminal
      const tuiApps = [
        'lazygit', 'htop', 'top', 'nano', 'vim', 'nvim', 'emacs', 
        'less', 'more', 'man', 'tmux', 'screen', 'mc', 'ranger'
      ];
      
      const commandName = command.trim().split(' ')[0];
      if (tuiApps.includes(commandName)) {
        addLine(`⚠️  TUI app detected: ${commandName}`, 'output');
        addLine(`💡 TUI apps like ${commandName} work better in external terminals`, 'output');
        addLine(`🚀 Try opening ${commandName} in your system terminal instead`, 'output');
        addLine(`📋 Or use: open -a Terminal && ${command}`, 'output');
        setIsExecuting(false);
        return;
      }

      // Handle built-in commands
      if (command.trim() === 'clear') {
        setLines([]);
        setIsExecuting(false);
        return;
      }

      if (command.trim().startsWith('cd ')) {
        const newDir = command.trim().substring(3).trim();
        if (newDir) {
          // For cd, we need to resolve the path and update our working directory
          try {
            // Test if the directory exists by trying to list it
            const testCmd = Command.create('sh', ['-c', `cd "${workingDirectory || ''}" && cd "${newDir}" && pwd`]);
            const result = await testCmd.execute();
            
            if (result.code === 0 && result.stdout.trim()) {
              const newPath = result.stdout.trim();
              setWorkingDirectory(newPath);
              addLine(`Changed directory to: ${newPath}`, 'output');
            } else {
              addLine(`cd: ${newDir}: No such file or directory`, 'error');
            }
          } catch (error) {
            addLine(`cd: ${newDir}: ${error}`, 'error');
          }
        } else {
          // cd with no arguments goes to home directory
          try {
            const homeCmd = Command.create('sh', ['-c', 'echo $HOME']);
            const result = await homeCmd.execute();
            if (result.code === 0 && result.stdout.trim()) {
              const homePath = result.stdout.trim();
              setWorkingDirectory(homePath);
              addLine(`Changed directory to: ${homePath}`, 'output');
            }
          } catch (error) {
            addLine(`cd: ${error}`, 'error');
          }
        }
        setIsExecuting(false);
        return;
      }

      // Execute the command using Tauri's shell with proper working directory
      // Force color output for commands that support it
      const fullCommand = workingDirectory 
        ? `cd "${workingDirectory}" && FORCE_COLOR=1 TERM=xterm-256color ${command}`
        : `FORCE_COLOR=1 TERM=xterm-256color ${command}`;
        
      const cmd = Command.create('sh', ['-c', fullCommand]);

      // Capture stdout
      cmd.stdout.on('data', (data: string) => {
        if (data.trim()) {
          // Split by lines and add each line separately for better formatting
          data.trim().split('\n').forEach(line => {
            if (line.trim()) {
              addLine(line, 'output');
            }
          });
        }
      });

      // Capture stderr
      cmd.stderr.on('data', (data: string) => {
        if (data.trim()) {
          data.trim().split('\n').forEach(line => {
            if (line.trim()) {
              addLine(line, 'error');
            }
          });
        }
      });

      const result = await cmd.execute();
      
      // Handle final output if not already captured by streams
      if (result.code === 0) {
        if (result.stdout && result.stdout.trim()) {
          const lines = result.stdout.trim().split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              addLine(line, 'output');
            }
          });
        }
      } else {
        if (result.stderr && result.stderr.trim()) {
          const lines = result.stderr.trim().split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              addLine(line, 'error');
            }
          });
        } else if (result.code !== 0) {
          addLine(`Command exited with code ${result.code}`, 'error');
        }
      }
    } catch (error) {
      addLine(`Error: ${error}`, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isExecuting) {
      executeCommand(currentInput);
      setCurrentInput('');
    }
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
        {/* Terminal Content */}
        <div 
          ref={terminalRef}
          className="flex-1 overflow-y-auto font-mono text-xs p-3 bg-[var(--primary-bg)] custom-scrollbar cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {lines.map((line) => (
            <div
              key={line.id}
              className={`whitespace-pre-wrap break-words terminal-output leading-relaxed ${
                line.type === 'input' 
                  ? 'text-[var(--text-color)]' 
                  : line.type === 'error'
                  ? 'text-red-500'
                  : 'text-[var(--text-light)]'
              }`}
              dangerouslySetInnerHTML={{
                __html: line.type === 'output' ? processAnsiOutput(line.content) : line.content
              }}
            />
          ))}
          
          {/* Current Input Line - Integrated */}
          <div className="flex items-baseline whitespace-pre-wrap break-words terminal-output text-[var(--text-color)] leading-relaxed">
            <span className="text-[#00ff00] mr-1 select-none">$</span>
            <div className="flex-1 relative">
              <span className="invisible pointer-events-none">{currentInput}</span>
              <input
                ref={inputRef}
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isExecuting}
                className="absolute inset-0 bg-transparent text-[var(--text-color)] border-none outline-none font-mono w-full resize-none"
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
              />
              {!isExecuting && currentInput.length === 0 && (
                <span className="absolute left-0 text-[var(--text-lighter)] opacity-50 pointer-events-none">
                  Type a command...
                </span>
              )}
              {!isExecuting && (
                <span 
                  className="absolute bg-[var(--text-color)] opacity-75 animate-pulse"
                  style={{ 
                    left: `${currentInput.length * 0.6}em`,
                    width: '0.1em',
                    height: '1em',
                    top: '0.1em'
                  }}
                />
              )}
            </div>
            {isExecuting && (
              <span className="text-[var(--text-lighter)] ml-2 animate-spin">⟳</span>
            )}
          </div>
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
          isResizing ? 'bg-blue-500/50' : ''
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-[3px] -translate-y-[1px] opacity-0 group-hover:opacity-100 bg-blue-500 transition-opacity duration-150" />
      </div>

      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#2a2a2a] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <TerminalIcon size={16} className="text-[var(--text-lighter)]" />
          <span className="font-mono text-sm text-[var(--text-color)]">Terminal</span>
          {workingDirectory && (
            <span className="font-mono text-xs text-[var(--text-lighter)]">
              {workingDirectory}
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
        className="flex-1 overflow-y-auto font-mono text-xs p-3 bg-[var(--primary-bg)] custom-scrollbar cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line) => (
          <div
            key={line.id}
            className={`whitespace-pre-wrap break-words terminal-output leading-relaxed ${
              line.type === 'input' 
                ? 'text-[var(--text-color)]' 
                : line.type === 'error'
                ? 'text-red-500'
                : 'text-[var(--text-light)]'
            }`}
            dangerouslySetInnerHTML={{
              __html: line.type === 'output' ? processAnsiOutput(line.content) : line.content
            }}
          />
        ))}
        
        {/* Current Input Line - Integrated */}
        <div className="flex items-baseline whitespace-pre-wrap break-words terminal-output text-[var(--text-color)] leading-relaxed">
          <span className="text-[#00ff00] mr-1 select-none">$</span>
          <div className="flex-1 relative">
            <span className="invisible pointer-events-none">{currentInput}</span>
            <input
              ref={inputRef}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting}
              className="absolute inset-0 bg-transparent text-[var(--text-color)] border-none outline-none font-mono w-full resize-none"
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
            />
            {!isExecuting && currentInput.length === 0 && (
              <span className="absolute left-0 text-[var(--text-lighter)] opacity-50 pointer-events-none">
                Type a command...
              </span>
            )}
            {!isExecuting && (
              <span 
                className="absolute bg-[var(--text-color)] opacity-75 animate-pulse"
                style={{ 
                  left: `${currentInput.length * 0.6}em`,
                  width: '0.1em',
                  height: '1em',
                  top: '0.1em'
                }}
              />
            )}
          </div>
          {isExecuting && (
            <span className="text-[var(--text-lighter)] ml-2 animate-spin">⟳</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Terminal; 