import { Database, Package, Pin, X } from "lucide-react";
import { memo, useCallback } from "react";
import FileIcon from "@/file-explorer/views/file.icon";
import type { Buffer } from "@/types/buffer";
import { cn } from "@/utils/cn";

interface TabBarItemProps {
  buffer: Buffer;
  index: number;
  isActive: boolean;
  isDraggedTab: boolean;
  showDropIndicatorBefore: boolean;
  tabRef: (el: HTMLDivElement | null) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  handleTabClose: (id: string) => void;
}

const TabBarItem = memo(function TabBarItem({
  buffer,
  isActive,
  isDraggedTab,
  showDropIndicatorBefore,
  tabRef,
  onMouseDown,
  onContextMenu,
  onDragStart,
  onDragEnd,
  handleTabClose,
}: TabBarItemProps) {
  const handleAuxClick = useCallback(
    (e: React.MouseEvent) => {
      // Only handle middle click here
      if (e.button !== 1) return;

      handleTabClose(buffer.id);
    },
    [handleTabClose, buffer.id],
  );

  return (
    <>
      {showDropIndicatorBefore && (
        <div className="relative">
          <div className="drop-indicator absolute top-1 bottom-1 left-0 z-20 w-0.5 bg-accent" />
        </div>
      )}
      <div
        ref={tabRef}
        className={cn(
          "tab-bar-item group relative flex flex-shrink-0 cursor-pointer select-none items-center gap-2 whitespace-nowrap px-3 py-2",
          "border-border/30 border-r transition-colors duration-150",
          isActive ? "bg-primary-bg text-text" : "bg-transparent text-text-light hover:bg-hover/50",
          buffer.isPinned ? "border-l-2 border-l-blue-500/60" : "",
          isDraggedTab ? "opacity-30" : "opacity-100",
        )}
        style={{ minWidth: 140, maxWidth: 240, fontSize: "12px" }}
        onMouseDown={onMouseDown}
        onContextMenu={onContextMenu}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onAuxClick={handleAuxClick}
      >
        <div className="grid size-4 max-h-4 max-w-4 shrink-0 place-content-center">
          {buffer.path === "extensions://marketplace" ? (
            <Package size={14} className="text-blue-400 opacity-80" />
          ) : buffer.isSQLite ? (
            <Database size={14} className="text-text-lighter opacity-70" />
          ) : (
            <FileIcon
              fileName={buffer.name}
              isDir={false}
              className="text-text-lighter opacity-70"
              size={14}
            />
          )}
        </div>
        {buffer.isPinned && <Pin size={10} className="flex-shrink-0 text-blue-400 opacity-70" />}
        <span
          className={cn(
            "flex-1 overflow-hidden text-ellipsis whitespace-nowrap",
            isActive ? "font-medium text-text" : "font-normal text-text-light",
          )}
          style={{ fontFamily: "var(--font-ui)", fontSize: "12px" }}
          title={buffer.path}
        >
          {buffer.name}
          {buffer.isDirty && <span className="ml-1.5 text-text-lighter">●</span>}
        </span>
        {!buffer.isPinned && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTabClose(buffer.id);
            }}
            className={cn(
              "flex-shrink-0 cursor-pointer select-none rounded p-0.5",
              "text-text-lighter/60 transition-all duration-150",
              "hover:bg-hover/70 hover:text-text group-hover:opacity-100",
              {
                "opacity-100": isActive,
                "opacity-0": !isActive,
              },
            )}
            title={`Close ${buffer.name}`}
            tabIndex={-1}
            draggable={false}
          >
            <X className="pointer-events-none select-none" size={14} />
          </button>
        )}
      </div>
    </>
  );
});

export default TabBarItem;
