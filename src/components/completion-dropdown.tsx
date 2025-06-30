import React, { useEffect, useRef } from 'react';
import { CompletionItem } from 'vscode-languageserver-protocol';

interface CompletionDropdownProps {
  items: CompletionItem[];
  selectedIndex: number;
  onSelect: (item: CompletionItem) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export function CompletionDropdown({
  items,
  selectedIndex,
  onSelect,
  onClose,
  position
}: CompletionDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selectedItem = dropdownRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedItem) {
      selectedItem.scrollIntoView({
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [selectedIndex]);

  if (items.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-[var(--primary-bg)] border border-[var(--border-color)] rounded shadow-lg max-h-48 overflow-y-auto min-w-[200px]"
      style={{
        top: position.top,
        left: position.left
      }}
    >
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
            index === selectedIndex
              ? 'bg-[var(--selected-color)] text-[var(--text-color)]'
              : 'hover:bg-[var(--hover-color)]'
          }`}
          onClick={() => onSelect(item)}
        >
          <span className="text-xs text-[var(--text-lighter)] w-5 flex-shrink-0">
            {getCompletionIcon(item.kind)}
          </span>
          <span className="font-mono text-sm">{item.label}</span>
          {item.detail && (
            <span className="text-xs text-[var(--text-lighter)] ml-auto truncate">
              {item.detail}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function getCompletionIcon(kind?: number): string {
  switch (kind) {
    case 1: return '📝'; // Text
    case 2: return '🔧'; // Method
    case 3: return '🔧'; // Function
    case 4: return '🔧'; // Constructor
    case 5: return '🏷️'; // Field
    case 6: return '📦'; // Variable
    case 7: return '📋'; // Class
    case 8: return '🔗'; // Interface
    case 9: return '📁'; // Module
    case 10: return '🏷️'; // Property
    case 11: return '🔢'; // Unit
    case 12: return '🔢'; // Value
    case 13: return '📝'; // Enum
    case 14: return '🔤'; // Keyword
    case 15: return '📝'; // Snippet
    case 16: return '🎨'; // Color
    case 17: return '📄'; // File
    case 18: return '📂'; // Reference
    case 19: return '📁'; // Folder
    case 20: return '📝'; // EnumMember
    case 21: return '🔧'; // Constant
    case 22: return '📦'; // Struct
    case 23: return '⚡'; // Event
    case 24: return '⚙️'; // Operator
    case 25: return '🏷️'; // TypeParameter
    default: return '📝';
  }
} 