import React, { useEffect, useRef, useMemo } from "react";
import { CompletionItem } from "vscode-languageserver-protocol";

interface CompletionDropdownProps {
  items: CompletionItem[];
  selectedIndex: number;
  onSelect: (item: CompletionItem) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export const CompletionDropdown = React.memo(function CompletionDropdown({
  items,
  selectedIndex,
  onSelect,
  position,
}: CompletionDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selectedItem = dropdownRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedItem) {
      selectedItem.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [selectedIndex]);

  // Memoize position calculation to prevent unnecessary recalculations
  const adjustedPosition = useMemo(
    () => ({
      top: Math.min(Math.max(position.top, 0), window.innerHeight - 200),
      left: Math.min(Math.max(position.left, 0), window.innerWidth - 280),
    }),
    [position.top, position.left],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-[var(--primary-bg)] border border-[var(--border-color)] rounded shadow-lg max-h-48 overflow-y-auto min-w-[240px] max-w-[360px] custom-scrollbar"
      style={{
        top: adjustedPosition.top,
        left: adjustedPosition.left,
        // Ensure it's visible with explicit display and positioning
        display: "block",
        visibility: "visible",
      }}
    >
      {items.map((item, index) => (
        <div
          key={`${item.label}-${item.kind}-${index}`}
          className={`px-2 py-1 cursor-pointer flex items-center gap-2 transition-colors duration-150 text-xs ${
            index === selectedIndex
              ? "bg-[var(--selected-color)] text-[var(--text-color)]"
              : "hover:bg-[var(--hover-color)]"
          }`}
          onClick={() => onSelect(item)}
        >
          <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center bg-[var(--secondary-bg)] rounded-sm border border-[var(--border-color)]">
            <span className="text-xs font-medium text-[var(--text-lighter)]">
              {getCompletionIcon(item.kind)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-xs text-[var(--text-color)] truncate">{item.label}</div>
            {item.detail && (
              <div className="text-xs text-[var(--text-lighter)] truncate opacity-70">
                {item.detail}
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            <span className="text-xs text-[var(--text-lighter)] opacity-60">
              {getCompletionTypeLabel(item.kind)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});

function getCompletionIcon(kind?: number): string {
  switch (kind) {
    case 1:
      return "T"; // Text
    case 2:
      return "M"; // Method
    case 3:
      return "F"; // Function
    case 4:
      return "C"; // Constructor
    case 5:
      return "F"; // Field
    case 6:
      return "V"; // Variable
    case 7:
      return "C"; // Class
    case 8:
      return "I"; // Interface
    case 9:
      return "M"; // Module
    case 10:
      return "P"; // Property
    case 11:
      return "U"; // Unit
    case 12:
      return "V"; // Value
    case 13:
      return "E"; // Enum
    case 14:
      return "K"; // Keyword
    case 15:
      return "S"; // Snippet
    case 16:
      return "🎨"; // Color
    case 17:
      return "F"; // File
    case 18:
      return "R"; // Reference
    case 19:
      return "D"; // Folder
    case 20:
      return "E"; // EnumMember
    case 21:
      return "C"; // Constant
    case 22:
      return "S"; // Struct
    case 23:
      return "E"; // Event
    case 24:
      return "O"; // Operator
    case 25:
      return "T"; // TypeParameter
    default:
      return "T";
  }
}

function getCompletionTypeLabel(kind?: number): string {
  switch (kind) {
    case 1:
      return "text";
    case 2:
      return "method";
    case 3:
      return "function";
    case 4:
      return "constructor";
    case 5:
      return "field";
    case 6:
      return "variable";
    case 7:
      return "class";
    case 8:
      return "interface";
    case 9:
      return "module";
    case 10:
      return "property";
    case 11:
      return "unit";
    case 12:
      return "value";
    case 13:
      return "enum";
    case 14:
      return "keyword";
    case 15:
      return "snippet";
    case 16:
      return "color";
    case 17:
      return "file";
    case 18:
      return "reference";
    case 19:
      return "folder";
    case 20:
      return "enum member";
    case 21:
      return "constant";
    case 22:
      return "struct";
    case 23:
      return "event";
    case 24:
      return "operator";
    case 25:
      return "type param";
    default:
      return "text";
  }
}
