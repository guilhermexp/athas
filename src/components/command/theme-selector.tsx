import { Moon } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Command, {
  CommandEmpty,
  CommandHeader,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { themeRegistry } from "../../extensions/themes";
import type { ThemeDefinition } from "../../extensions/themes";

type Theme = string;

interface ThemeSelectorProps {
  isVisible: boolean;
  onClose: () => void;
  onThemeChange: (theme: Theme) => void;
  currentTheme?: Theme;
}

const ThemeSelector = ({ isVisible, onClose, onThemeChange, currentTheme }: ThemeSelectorProps) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [initialTheme, setInitialTheme] = useState(currentTheme);
  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null);
  const [availableThemes, setAvailableThemes] = useState<ThemeDefinition[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load available themes from theme registry
  useEffect(() => {
    const loadThemes = () => {
      const themes = themeRegistry.getAllThemes();
      console.log("ThemeSelector: Loading themes from registry, found:", themes.length);
      setAvailableThemes(themes);
    };

    // Load themes immediately
    loadThemes();

    // Also listen for theme registry changes
    const unsubscribe = themeRegistry.onRegistryChange(() => {
      console.log("ThemeSelector: Registry changed, reloading themes");
      loadThemes();
    });

    return unsubscribe;
  }, []);

  // Helper functions for theme preview
  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const previewThemeWithDelay = useCallback((themeId: string) => {
    clearHoverTimeout();
    setPreviewTheme(themeId);
    themeRegistry.applyTheme(themeId);
  }, [clearHoverTimeout]);

  const revertToInitialTheme = useCallback(() => {
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      setPreviewTheme(null);
      if (initialTheme) {
        themeRegistry.applyTheme(initialTheme);
      }
    }, 150); // Small delay to prevent flickering when moving between items
  }, [clearHoverTimeout, initialTheme]);

  // Filter themes based on query
  const filteredThemes = availableThemes.filter(
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

      // Force load themes when selector becomes visible
      const themes = themeRegistry.getAllThemes();
      setAvailableThemes(themes);

      const initialIndex = themes.findIndex((t) => t.id === currentTheme);
      setSelectedIndex(initialIndex >= 0 ? initialIndex : 0);

      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isVisible, currentTheme]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (initialTheme) {
          themeRegistry.applyTheme(initialTheme);
        }
        onClose();
        return;
      }

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
      }

      if (nextIndex !== selectedIndex) {
        setSelectedIndex(nextIndex);
        // Preview theme when navigating with keyboard
        const theme = filteredThemes[nextIndex];
        if (theme) {
          previewThemeWithDelay(theme.id);
        }
      }
    },
    [selectedIndex, filteredThemes, onThemeChange, onClose, initialTheme, previewThemeWithDelay],
  );

  // Reset state when visibility changes
  useEffect(() => {
    if (isVisible) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isVisible, handleKeyDown]);

  // Update selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      clearHoverTimeout();
    };
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = resultsRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  if (!isVisible) return null;

  const handleClose = () => {
    clearHoverTimeout();
    setPreviewTheme(null);
    if (initialTheme) {
      themeRegistry.applyTheme(initialTheme);
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

      <div
        onMouseLeave={() => {
          // When leaving the entire list, immediately revert to initial theme
          clearHoverTimeout();
          setPreviewTheme(null);
          if (initialTheme) {
            themeRegistry.applyTheme(initialTheme);
          }
        }}
      >
        <CommandList ref={resultsRef}>
        {availableThemes.length === 0 && (
          <CommandEmpty>Loading themes...</CommandEmpty>
        )}
        {availableThemes.length > 0 && filteredThemes.length === 0 && (
          <CommandEmpty>No themes found</CommandEmpty>
        )}
        {filteredThemes.length > 0 && (
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
                  previewThemeWithDelay(theme.id);
                }}
                onMouseLeave={() => {
                  // Only revert if we're actually leaving the theme (not just moving to another theme)
                  revertToInitialTheme();
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
      </div>
    </Command>
  );
};

ThemeSelector.displayName = "ThemeSelector";

export default ThemeSelector;
