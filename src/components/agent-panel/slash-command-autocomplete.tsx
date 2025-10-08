/**
 * Slash Command Autocomplete Component
 *
 * Shows autocomplete suggestions when typing slash commands
 * Based on Zed's slash command UI
 */

import { Command } from "lucide-react";
import { memo, useEffect, useState } from "react";
import type { SlashCommandAutocompleteOption } from "@/lib/slash-commands";
import { getSlashCommandRegistry } from "@/lib/slash-commands";
import { cn } from "@/utils/cn";

interface SlashCommandAutocompleteProps {
  /** Current input value */
  input: string;
  /** Callback when a command is selected */
  onSelect: (commandText: string) => void;
  /** Position to show the menu */
  position?: { top?: number; left?: number; bottom?: string; marginBottom?: string };
  /** Whether the menu is visible */
  visible?: boolean;
}

export const SlashCommandAutocomplete = memo(
  ({ input, onSelect, position, visible = true }: SlashCommandAutocompleteProps) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [suggestions, setSuggestions] = useState<SlashCommandAutocompleteOption[]>([]);

    // Update suggestions when input changes
    useEffect(() => {
      const registry = getSlashCommandRegistry();
      const newSuggestions = registry.getAutocompleteSuggestions(input);
      setSuggestions(newSuggestions);
      setSelectedIndex(0);
    }, [input]);

    // Handle keyboard navigation
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!visible || suggestions.length === 0) return;

        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
            break;
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
            break;
          case "Enter":
          case "Tab":
            if (suggestions[selectedIndex]) {
              e.preventDefault();
              const selected = suggestions[selectedIndex];
              onSelect(`${selected.displayText} `);
            }
            break;
          case "Escape":
            // Parent component should handle closing
            break;
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [visible, suggestions, selectedIndex, onSelect]);

    if (!visible || suggestions.length === 0) {
      return null;
    }

    return (
      <div
        className={cn(
          "absolute z-50 min-w-[320px] max-w-[480px]",
          "rounded-md border border-border/50 bg-secondary-bg/95 shadow-lg backdrop-blur-sm",
          "overflow-hidden",
        )}
        style={position}
      >
        <div className="max-h-[280px] overflow-y-auto p-1">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.command.name}
              type="button"
              className={cn(
                "flex w-full items-start gap-3 rounded px-3 py-2 text-left transition-colors",
                index === selectedIndex
                  ? "bg-hover/80 text-text"
                  : "text-text-lighter hover:bg-hover/60",
              )}
              onClick={() => onSelect(`${suggestion.displayText} `)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-hover/60">
                <Command size={12} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <code className="font-medium font-mono text-[13px]">
                    {suggestion.displayText}
                  </code>
                  {suggestion.command.requiresArgument && (
                    <span className="text-[11px] text-text-lighter/60">&lt;argument&gt;</span>
                  )}
                </div>
                {suggestion.detail && (
                  <div className="mt-0.5 text-[12px] text-text-lighter/80">{suggestion.detail}</div>
                )}
                {suggestion.command.usage && (
                  <div className="mt-1 font-mono text-[11px] text-text-lighter/60">
                    {suggestion.command.usage}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer with keyboard hints */}
        <div className="border-border/40 border-t bg-hover/20 px-3 py-1.5">
          <div className="flex items-center justify-between text-[10px] text-text-lighter/60">
            <span>↑↓ Navigate</span>
            <span>⏎ Select</span>
            <span>ESC Close</span>
          </div>
        </div>
      </div>
    );
  },
);

SlashCommandAutocomplete.displayName = "SlashCommandAutocomplete";
