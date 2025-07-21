import { Copy, FolderOpen, Pin, PinOff, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Buffer } from "../../types/buffer";
import KeybindingBadge from "../ui/keybinding-badge";

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  buffer: Buffer | null;
  onClose: () => void;
  onPin: (bufferId: string) => void;
  onCloseTab: (bufferId: string) => void;
  onCloseOthers: (bufferId: string) => void;
  onCloseAll: () => void;
  onCloseToRight: (bufferId: string) => void;
  onCopyPath?: (path: string) => void;
  onReload?: (bufferId: string) => void;
  onRevealInFinder?: (path: string) => void;
}

const ContextMenu = ({
  isOpen,
  position,
  buffer,
  onClose,
  onPin,
  onCloseTab,
  onCloseOthers,
  onCloseAll,
  onCloseToRight,
  onCopyPath,
  onReload,
  onRevealInFinder,
}: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !buffer) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-[180px] select-none rounded-md border border-border bg-secondary-bg py-1 shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-text text-xs hover:bg-hover"
        onClick={() => {
          onPin(buffer.id);
          onClose();
        }}
      >
        {buffer.isPinned ? <PinOff size={12} /> : <Pin size={12} />}
        {buffer.isPinned ? "Unpin Tab" : "Pin Tab"}
      </button>

      <div className="my-1 border-border border-t" />

      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-text text-xs hover:bg-hover"
        onClick={async () => {
          if (onCopyPath) {
            onCopyPath(buffer.path);
          } else {
            try {
              await navigator.clipboard.writeText(buffer.path);
            } catch (error) {
              console.error("Failed to copy path:", error);
            }
          }
          onClose();
        }}
      >
        <Copy size={12} />
        Copy Path
      </button>

      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-text text-xs hover:bg-hover"
        onClick={() => {
          if (onRevealInFinder) {
            onRevealInFinder(buffer.path);
          }
          onClose();
        }}
      >
        <FolderOpen size={12} />
        Reveal in Finder
      </button>

      {buffer.path !== "extensions://marketplace" && (
        <button
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-text text-xs hover:bg-hover"
          onClick={() => {
            if (onReload) {
              onReload(buffer.id);
            }
            onClose();
          }}
        >
          <RotateCcw size={12} />
          Reload
        </button>
      )}

      <div className="my-1 border-border border-t" />
      <button
        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left font-mono text-text text-xs hover:bg-hover"
        onClick={() => {
          onCloseTab(buffer.id);
          onClose();
        }}
      >
        <span>Close</span>
        <KeybindingBadge keys={["⌘", "W"]} className="opacity-60" />
      </button>
      <button
        className="w-full px-3 py-1.5 text-left font-mono text-text text-xs hover:bg-hover"
        onClick={() => {
          onCloseOthers(buffer.id);
          onClose();
        }}
      >
        Close Others
      </button>
      <button
        className="w-full px-3 py-1.5 text-left font-mono text-text text-xs hover:bg-hover"
        onClick={() => {
          onCloseToRight(buffer.id);
          onClose();
        }}
      >
        Close to Right
      </button>
      <button
        className="w-full px-3 py-1.5 text-left font-mono text-text text-xs hover:bg-hover"
        onClick={() => {
          onCloseAll();
          onClose();
        }}
      >
        Close All
      </button>
    </div>
  );
};

export default ContextMenu;
