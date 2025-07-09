import { Command, File, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";

interface CommandBarProps {
  isVisible: boolean;
  onClose: () => void;
  files: Array<{ name: string; path: string; isDir: boolean }>;
  onFileSelect: (path: string) => void;
  rootFolderPath?: string;
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
}

const CommandBar = ({
  isVisible,
  onClose,
  files,
  onFileSelect,
  rootFolderPath,
}: CommandBarProps) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when command bar becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isVisible]);

  // Helper function to get relative path
  const getRelativePath = (fullPath: string): string => {
    if (!rootFolderPath) return fullPath;

    // Normalize paths to handle different path separators
    const normalizedFullPath = fullPath.replace(/\\/g, "/");
    const normalizedRootPath = rootFolderPath.replace(/\\/g, "/");

    if (normalizedFullPath.startsWith(normalizedRootPath)) {
      const relativePath = normalizedFullPath.substring(normalizedRootPath.length);
      // Remove leading slash if present
      return relativePath.startsWith("/") ? relativePath.substring(1) : relativePath;
    }

    return fullPath;
  };

  // Get all files (already flattened from the new getAllProjectFiles function)
  const getAllFiles = (
    entries: Array<{ name: string; path: string; isDir: boolean; children?: any[] }>,
  ): Array<{ name: string; path: string; isDir: boolean }> => {
    // Since we're now getting a flat array of files from getAllProjectFiles,
    // we can just filter out directories and return the files
    return entries.filter(entry => !entry.isDir);
  };

  // Create command items
  const createCommands = (): CommandItem[] => {
    const commands: CommandItem[] = [];

    // File commands
    const allFiles = getAllFiles(files);
    const filteredFiles = allFiles.filter(
      file =>
        file.name.toLowerCase().includes(query.toLowerCase()) ||
        file.path.toLowerCase().includes(query.toLowerCase()),
    );

    filteredFiles.forEach(file => {
      commands.push({
        id: `file:${file.path}`,
        label: file.name,
        description: getRelativePath(file.path),
        icon: <File size={14} className="text-[var(--text-lighter)]" />,
        action: () => {
          onFileSelect(file.path);
          onClose();
        },
      });
    });

    return commands.slice(0, 20); // Limit to 20 results
  };

  const commands = createCommands();

  // Reset selectedIndex when commands change to ensure it's within bounds
  useEffect(() => {
    if (selectedIndex >= commands.length) {
      setSelectedIndex(Math.max(0, commands.length - 1));
    }
  }, [commands.length, selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (commands.length === 0) {
      // Only handle Escape when no commands
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (commands[selectedIndex]) {
        commands[selectedIndex].action();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % commands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev === 0 ? commands.length - 1 : prev - 1));
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Tab acts like ArrowDown
      setSelectedIndex(prev => (prev + 1) % commands.length);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedIndex(0); // Reset to first item when query changes
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0 && commands.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex, commands.length]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-start justify-center pt-20 z-50 pointer-events-none">
      <div className="bg-[var(--secondary-bg)] border border-[var(--border-color)] rounded-lg shadow-2xl w-96 max-h-96 overflow-hidden pointer-events-auto">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)]">
          <Command size={14} className="text-[var(--text-lighter)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type to search files..."
            className="flex-1 bg-transparent text-[var(--text-color)] text-sm font-mono focus:outline-none placeholder-[var(--text-lighter)]"
          />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--hover-color)] transition-colors duration-150"
          >
            <X size={14} className="text-[var(--text-lighter)]" />
          </button>
        </div>

        {/* Command List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto custom-scrollbar">
          {commands.length === 0 ? (
            <div className="px-4 py-6 text-center text-[var(--text-lighter)] text-sm font-mono">
              {query ? "No matching files found" : "No files available"}
            </div>
          ) : (
            commands.map((command, index) => (
              <button
                key={command.id}
                onClick={command.action}
                className={cn(
                  "w-full text-left px-4 py-2 flex items-center gap-3 transition-colors duration-150 border-none bg-transparent cursor-pointer focus:outline-none",
                  index === selectedIndex
                    ? "bg-[var(--selected-color)] text-[var(--text-color)]"
                    : "hover:bg-[var(--hover-color)]",
                )}
              >
                {command.icon}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--text-color)] font-mono truncate">
                    {command.label}
                  </div>
                  {command.description && (
                    <div className="text-xs text-[var(--text-lighter)] font-mono truncate">
                      {command.description}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandBar;
