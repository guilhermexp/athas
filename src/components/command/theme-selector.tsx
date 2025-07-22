import { Monitor, Moon, Sun, X } from "lucide-react";
import type React from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { cn } from "@/utils/cn";

type Theme = "auto" | "athas-light" | "athas-dark";

interface ThemeInfo {
  id: Theme;
  name: string;
  description: string;
  category: "System" | "Light" | "Dark" | "Colorful";
  icon?: React.ReactNode;
}

interface ThemeSelectorProps {
  isVisible: boolean;
  onClose: () => void;
  onThemeChange: (theme: Theme) => void;
  currentTheme?: Theme;
}

export interface ThemeSelectorRef {
  focus: () => void;
}

// Dynamic theme definitions based on existing theme system
const THEME_DEFINITIONS: ThemeInfo[] = [
  // System
  {
    id: "auto",
    name: "Auto",
    description: "Follow system preference",
    category: "System",
    icon: <Monitor size={16} />,
  },
  // Light theme
  {
    id: "athas-light",
    name: "Athas Light",
    description: "Clean and bright theme",
    category: "Light",
    icon: <Sun size={16} />,
  },
  // Dark theme
  {
    id: "athas-dark",
    name: "Athas Dark",
    description: "Modern dark theme",
    category: "Dark",
    icon: <Moon size={16} />,
  },
];

const ThemeSelector = forwardRef<ThemeSelectorRef, ThemeSelectorProps>(
  ({ isVisible, onClose, onThemeChange, currentTheme }, ref) => {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [initialTheme, setInitialTheme] = useState(currentTheme);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    // Filter themes based on query
    const filteredThemes = THEME_DEFINITIONS.filter(
      theme =>
        theme.name.toLowerCase().includes(query.toLowerCase()) ||
        theme.description?.toLowerCase().includes(query.toLowerCase()) ||
        theme.category.toLowerCase().includes(query.toLowerCase()),
    );

    // Group themes by category
    const groupedThemes = filteredThemes.reduce(
      (acc, theme) => {
        if (!acc[theme.category]) {
          acc[theme.category] = [];
        }
        acc[theme.category].push(theme);
        return acc;
      },
      {} as Record<string, ThemeInfo[]>,
    );

    // Handle keyboard navigation
    useEffect(() => {
      if (isVisible) {
        setInitialTheme(currentTheme);
        setQuery("");

        const initialIndex = THEME_DEFINITIONS.findIndex(t => t.id === currentTheme);
        setSelectedIndex(initialIndex >= 0 ? initialIndex : 0);

        requestAnimationFrame(() => inputRef.current?.focus());
      }
    }, [isVisible]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (!filteredThemes.length) return;

        let nextIndex = selectedIndex;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          nextIndex = (selectedIndex + 1) % filteredThemes.length;
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          nextIndex = (selectedIndex - 1 + filteredThemes.length) % filteredThemes.length;
        } else if (e.key === "Enter") {
          e.preventDefault();
          onThemeChange(filteredThemes[selectedIndex].id);
          onClose();
          return;
        } else if (e.key === "Escape") {
          e.preventDefault();
          onThemeChange(initialTheme!);
          onClose();
          return;
        }

        if (nextIndex !== selectedIndex) {
          setSelectedIndex(nextIndex);
          onThemeChange(filteredThemes[nextIndex].id);
        }
      },
      [selectedIndex, filteredThemes, onThemeChange, onClose, initialTheme],
    );

    // Reset state when visibility changes
    useEffect(() => {
      if (isVisible) {
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
      }
    }, [isVisible, handleKeyDown]);

    // Update selected index when query changes
    useEffect(() => {
      setSelectedIndex(0);
    }, [query]);

    // Scroll selected item into view
    useEffect(() => {
      const selectedElement = resultsRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, [selectedIndex]);

    if (!isVisible) return null;

    const handleClose = () => {
      onThemeChange(initialTheme!);
      onClose();
    };

    return (
      <div className="-translate-x-1/2 fixed top-12 left-1/2 z-[9999] transform">
        <div
          className={cn(
            "flex max-h-[500px] w-[600px] flex-col overflow-hidden",
            "rounded-lg border border-border bg-primary-bg shadow-lg",
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-border border-b px-4 py-3">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search themes..."
              className="flex-1 bg-transparent text-sm text-text placeholder-text-lighter outline-none"
            />
            <button onClick={handleClose} className="rounded p-1 transition-colors hover:bg-hover">
              <X size={14} className="text-text-lighter" />
            </button>
          </div>

          {/* Results */}
          <div ref={resultsRef} className="custom-scrollbar-thin flex-1 overflow-y-auto">
            {filteredThemes.length === 0 ? (
              <div className="p-4 text-center text-sm text-text-lighter">No themes found</div>
            ) : (
              <div className="p-2">
                {Object.entries(groupedThemes).map(([category, themes]) => (
                  <div key={category} className="mb-4 last:mb-0">
                    <div className="mb-2 px-2 font-medium text-text-lighter text-xs uppercase tracking-wide">
                      {category}
                    </div>
                    {themes.map(theme => {
                      const globalIndex = filteredThemes.indexOf(theme);
                      const isSelected = globalIndex === selectedIndex;
                      const isCurrent = theme.id === initialTheme;

                      return (
                        <button
                          key={theme.id}
                          data-index={globalIndex}
                          onClick={() => {
                            onThemeChange(theme.id);
                            onClose();
                          }}
                          onMouseEnter={() => {
                            setSelectedIndex(globalIndex);
                            onThemeChange(theme.id);
                          }}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-3 rounded",
                            "px-3 py-1.5 text-left transition-colors",
                            isSelected ? "bg-selected text-text" : "text-text hover:bg-hover",
                          )}
                        >
                          <div className="flex-shrink-0 text-text-lighter">
                            {theme.icon || <Moon size={16} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm">{theme.name}</span>
                              {isCurrent && !isSelected && (
                                <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent text-xs">
                                  current
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

ThemeSelector.displayName = "ThemeSelector";

export default ThemeSelector;
