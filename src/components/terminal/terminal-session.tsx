import { useEffect, useRef } from "react";
import { Terminal as TerminalType } from "../../types/terminal";
import Terminal from "../terminal";

interface TerminalSessionProps {
  terminal: TerminalType;
  isActive: boolean;
  onDirectoryChange?: (terminalId: string, directory: string) => void;
  onActivity?: (terminalId: string) => void;
}

const TerminalSession = ({
  terminal,
  isActive,
  onDirectoryChange,
  onActivity,
}: TerminalSessionProps) => {
  const sessionRef = useRef<HTMLDivElement>(null);

  // Handle activity tracking
  useEffect(() => {
    if (isActive && onActivity) {
      onActivity(terminal.id);
    }
  }, [isActive, terminal.id, onActivity]);

  // Use the existing Terminal component that works with Tauri
  return (
    <div
      ref={sessionRef}
      className={`h-full ${isActive ? 'block' : 'hidden'}`}
      data-terminal-id={terminal.id}
    >
      <Terminal
        isVisible={isActive}
        onClose={() => {}}
        currentDirectory={terminal.currentDirectory}
        isEmbedded={true}
      />
    </div>
  );
};

export default TerminalSession; 