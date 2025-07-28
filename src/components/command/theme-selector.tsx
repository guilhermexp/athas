import { Monitor, Moon, Sun } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Command, {
  CommandEmpty,
  CommandHeader,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";

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

// Dynamic theme definitions based on existing theme system
const THEME_DEFINITIONS: ThemeInfo[] = [
  // System
  {
    id: "auto",
    name: "Auto",
    description: "Follow system preference",
    category: "System",
    icon: <Monitor size={14} />,
  },
  // Light theme
  {
    id: "athas-light",
    name: "Athas Light",
    description: "Clean and bright theme",
    category: "Light",
    icon: <Sun size={14} />,
  },
  // Dark theme
  {
    id: "athas-dark",
    name: "Athas Dark",
    description: "Modern dark theme",
    category: "Dark",
    icon: <Moon size={14} />,
  },
];

const ThemeSelector = ({ isVisible, onClose, onThemeChange, currentTheme }: ThemeSelectorProps) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [initialTheme, setInitialTheme] = useState(currentTheme);
  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Focus is handled internally when the selector becomes visible

  // Filter themes based on query
  const filteredThemes = THEME_DEFINITIONS.filter(
    (theme) =>
      theme.name.toLowerCase().includes(query.toLowerCase()) ||
      theme.description?.toLowerCase().includes(query.toLowerCase()) ||
      theme.category.toLowerCase().includes(query.toLowerCase()),
  );

  // Handle keyboard navigation
  useEffect(() => {
    if (isVisible) {
      setInitialTheme(currentTheme);
      setQuery("");
      setPreviewTheme(null);

      const initialIndex = THEME_DEFINITIONS.findIndex((t) => t.id === currentTheme);
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
        if (initialTheme) {
          onThemeChange(initialTheme);
        }
        onClose();
        return;
      }

      if (nextIndex !== selectedIndex) {
        setSelectedIndex(nextIndex);
        // Preview theme when navigating with keyboard
        const theme = filteredThemes[nextIndex];
        if (theme) {
          setPreviewTheme(theme.id);
          onThemeChange(theme.id);
        }
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
    if (initialTheme) {
      onThemeChange(initialTheme);
    }
    onClose();
  };

  return (
    <Command isVisible={isVisible}>
      <CommandHeader onClose={handleClose}>
        <CommandInput
          ref={inputRef}
          value={query}
          onChange={setQuery}
          placeholder="Search themes..."
        />
      </CommandHeader>

      <CommandList ref={resultsRef}>
        {filteredThemes.length === 0 ? (
          <CommandEmpty>No themes found</CommandEmpty>
        ) : (
          filteredThemes.map((theme, index) => {
            const isSelected = index === selectedIndex;
            const isCurrent = theme.id === initialTheme;

            return (
              <CommandItem
                key={theme.id}
                data-index={index}
                onClick={() => {
                  onThemeChange(theme.id);
                  onClose();
                }}
                onMouseEnter={() => {
                  setSelectedIndex(index);
                  setPreviewTheme(theme.id);
                  onThemeChange(theme.id);
                }}
                onMouseLeave={() => {
                  if (previewTheme === theme.id) {
                    setPreviewTheme(null);
                    if (initialTheme) {
                      onThemeChange(initialTheme);
                    }
                  }
                }}
                isSelected={isSelected}
                className="gap-3 px-2 py-1.5"
              >
                <div className="flex-shrink-0 text-text-lighter">
                  {theme.icon || <Moon size={14} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 truncate text-xs">
                    <span className="truncate">{theme.name}</span>
                    {isCurrent && !isSelected && (
                      <span className="rounded bg-accent/10 px-1 py-0.5 font-medium text-[10px] text-accent">
                        current
                      </span>
                    )}
                  </div>
                </div>
              </CommandItem>
            );
          })
        )}
      </CommandList>
    </Command>
  );
};

ThemeSelector.displayName = "ThemeSelector";

export default ThemeSelector;
