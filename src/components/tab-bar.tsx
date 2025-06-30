import { Database, Package, Pin, PinOff, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Buffer } from "../types/buffer";
import { getShortcutText } from "../utils/platform";
import FileIcon from "./file-icon";

interface TabBarProps {
  buffers: Buffer[];
  activeBufferId: string | null;
  onTabClick: (bufferId: string) => void;
  onTabClose: (bufferId: string, event: React.MouseEvent) => void;
  onTabReorder?: (fromIndex: number, toIndex: number) => void;
  onTabPin?: (bufferId: string) => void;
  onCloseOtherTabs?: (bufferId: string) => void;
  onCloseAllTabs?: () => void;
  onCloseTabsToRight?: (bufferId: string) => void;
  onTabDragStart?: (bufferId: string, paneId?: string) => void;
  onTabDragEnd?: () => void;
  paneId?: string; // For split view panes
}

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
      className="fixed z-50 bg-[var(--primary-bg)] border border-[var(--border-color)] rounded shadow-lg py-1 w-max min-w-[120px] dark:bg-gray-800 dark:border-gray-600 dark:shadow-xl"
      style={{ left: position.x, top: position.y }}
    >
      <button
        className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover-color)] flex items-center gap-2 dark:text-gray-200 dark:hover:bg-gray-700"
        onClick={() => {
          onPin(buffer.id);
          onClose();
        }}
      >
        {buffer.isPinned ? <PinOff size={12} /> : <Pin size={12} />}
        {buffer.isPinned ? "Unpin Tab" : "Pin Tab"}
      </button>

      <div className="border-t border-[var(--border-color)] my-1 dark:border-gray-600" />
      <button
        className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover-color)] flex items-center justify-between gap-2 dark:text-gray-200 dark:hover:bg-gray-700"
        onClick={() => {
          onCloseTab(buffer.id);
          onClose();
        }}
      >
        <span>Close</span>
        <span className="text-[var(--text-lighter)] text-[10px] font-mono opacity-60">
          {getShortcutText("w", ["cmd"])}
        </span>
      </button>
      <button
        className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover-color)] dark:text-gray-200 dark:hover:bg-gray-700"
        onClick={() => {
          onCloseOthers(buffer.id);
          onClose();
        }}
      >
        Close Others
      </button>
      <button
        className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover-color)] dark:text-gray-200 dark:hover:bg-gray-700"
        onClick={() => {
          onCloseToRight(buffer.id);
          onClose();
        }}
      >
        Close to Right
      </button>
      <button
        className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover-color)] dark:text-gray-200 dark:hover:bg-gray-700"
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

const TabBar = ({
  buffers,
  activeBufferId,
  onTabClick,
  onTabClose,
  onTabReorder,
  onTabPin,
  onCloseOtherTabs,
  onCloseAllTabs,
  onCloseTabsToRight,
  onTabDragStart,
  onTabDragEnd,
  paneId,
}: TabBarProps) => {
  // Early return BEFORE any hooks to avoid hooks order violation
  if (buffers.length === 0) {
    return null;
  }

  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [dragCurrentPosition, setDragCurrentPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isDraggedOutside, setIsDraggedOutside] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    buffer: Buffer | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, buffer: null });

  const tabBarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) {
      return;
    }

    e.preventDefault();
    setDraggedIndex(index);
    setDragStartPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (draggedIndex === null || !dragStartPosition || !tabBarRef.current)
      return;

    setDragCurrentPosition({ x: e.clientX, y: e.clientY });

    const distance = Math.sqrt(
      Math.pow(e.clientX - dragStartPosition.x, 2) +
        Math.pow(e.clientY - dragStartPosition.y, 2)
    );

    if (distance > 5 && !isDragging) {
      setIsDragging(true);
      // Notify parent about drag start
      const draggedBuffer = sortedBuffers[draggedIndex];
      if (onTabDragStart && draggedBuffer) {
        onTabDragStart(draggedBuffer.id, paneId);
      }
    }

    if (isDragging) {
      const rect = tabBarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if dragged outside the tab bar
      const isOutside =
        x < 0 || x > rect.width || y < -50 || y > rect.height + 50;
      setIsDraggedOutside(isOutside);

      if (!isOutside) {
        // Handle internal reordering
        const tabElements = Array.from(
          tabBarRef.current.children
        ) as HTMLElement[];

        let newDropTarget: number | null = null;
        for (let i = 0; i < tabElements.length; i++) {
          const tabRect = tabElements[i].getBoundingClientRect();
          const tabX = tabRect.left - rect.left;
          const tabWidth = tabRect.width;

          if (x >= tabX && x <= tabX + tabWidth) {
            newDropTarget = i;
            break;
          }
        }

        if (newDropTarget !== draggedIndex) {
          setDropTarget(newDropTarget);
        }
      } else {
        setDropTarget(null);
      }
    }
  };

  const handleMouseUp = () => {
    if (draggedIndex !== null) {
      if (
        !isDraggedOutside &&
        dropTarget !== null &&
        dropTarget !== draggedIndex &&
        onTabReorder
      ) {
        // Internal reordering
        onTabReorder(draggedIndex, dropTarget);
      }
      // Notify parent about drag end
      if (onTabDragEnd) {
        onTabDragEnd();
      }
    }

    setIsDragging(false);
    setDraggedIndex(null);
    setDropTarget(null);
    setDragStartPosition(null);
    setDragCurrentPosition(null);
    setIsDraggedOutside(false);
  };

  // Add drag data to enable cross-pane tab movement
  const handleDragStart = (e: React.DragEvent, index: number) => {
    const buffer = sortedBuffers[index];
    if (!buffer) return;

    e.dataTransfer.setData(
      "application/tab-data",
      JSON.stringify({
        bufferId: buffer.id,
        paneId: paneId,
        bufferData: buffer,
      })
    );
    e.dataTransfer.effectAllowed = "move";

    // Create drag image
    const dragImage = document.createElement("div");
    dragImage.className =
      "bg-[var(--primary-bg)] border border-[var(--border-color)] rounded px-2 py-1 text-xs font-mono shadow-lg";
    dragImage.textContent = buffer.name;
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);

    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedIndex(null);
    setDropTarget(null);
    setDragStartPosition(null);
    setDragCurrentPosition(null);
    setIsDraggedOutside(false);
    if (onTabDragEnd) {
      onTabDragEnd();
    }
  };

  const handleContextMenu = (e: React.MouseEvent, buffer: Buffer) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      buffer,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, buffer: null });
  };

  // Sort buffers: pinned tabs first, then regular tabs
  const sortedBuffers = [...buffers].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  useEffect(() => {
    if (draggedIndex === null) return;

    const move = (e: MouseEvent) => handleMouseMove(e);
    const up = () => handleMouseUp();
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);

    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
  }, [draggedIndex, dragStartPosition, isDragging, dropTarget]);

  return (
    <>
      <div className="relative">
        <div
          ref={tabBarRef}
          className="flex bg-[var(--secondary-bg)] border-b border-[var(--border-color)]"
        >
          {sortedBuffers.map((buffer, index) => {
            const isActive = buffer.id === activeBufferId;
            const isDraggedTab = draggedIndex === index;
            const isDropTarget = dropTarget === index;

            return (
              <div
                key={buffer.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                   group flex items-center gap-1.5 px-2 py-1.5 border-r border-[var(--border-color)]
                   cursor-pointer select-none min-w-0 relative
                   hover:bg-[var(--hover-color)] transition-colors duration-150
                   ${
                     isActive
                       ? "bg-[var(--primary-bg)] border-b-2 border-b-[var(--accent-color)]"
                       : "bg-[var(--secondary-bg)]"
                   }
                   ${
                     isDraggedTab
                       ? isDraggedOutside
                         ? "opacity-20"
                         : "opacity-50"
                       : ""
                   }
                   ${isDropTarget ? "bg-[var(--hover-color)]" : ""}
                   ${buffer.isPinned ? "border-l-2 border-l-blue-500" : ""}
                 `}
                onMouseDown={(e) => handleMouseDown(e, index)}
                onClick={() => {
                  if (!isDragging) {
                    onTabClick(buffer.id);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, buffer)}
                style={
                  isDraggedTab && isDragging && dragCurrentPosition
                    ? { opacity: 0 }
                    : {}
                }
              >
                {/* Drop indicator */}
                {isDropTarget && draggedIndex !== null && !isDraggedOutside && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--accent-color)]" />
                )}

                {/* Visual feedback when dragging outside */}
                {isDraggedTab && isDraggedOutside && (
                  <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-500 bg-opacity-10 rounded" />
                )}

                {/* File Icon */}
                <div className="flex-shrink-0">
                  {buffer.path === "extensions://language-servers" ? (
                    <Package size={12} className="text-blue-500" />
                  ) : buffer.isSQLite ? (
                    <Database
                      size={12}
                      className="text-[var(--text-lighter)]"
                    />
                  ) : (
                    <FileIcon
                      fileName={buffer.name}
                      isDir={false}
                      className="text-[var(--text-lighter)]"
                      size={12}
                    />
                  )}
                </div>

                {/* Pin indicator */}
                {buffer.isPinned && (
                  <Pin size={8} className="text-blue-500 flex-shrink-0" />
                )}

                {/* File Name */}
                <span
                  className={`
                     font-mono text-xs whitespace-nowrap
                     ${
                       isActive
                         ? "text-[var(--text-color)]"
                         : "text-[var(--text-light)]"
                     }
                   `}
                  title={buffer.path}
                >
                  {buffer.name}
                  {buffer.isDirty && (
                    <span className="text-[var(--text-lighter)] ml-1">•</span>
                  )}
                </span>

                {/* Close Button */}
                {!buffer.isPinned && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTabClose(buffer.id, e);
                    }}
                    className={`
                      flex-shrink-0 p-0.5 rounded hover:bg-[var(--hover-color)]
                      transition-all duration-150 opacity-0 group-hover:opacity-100
                      ${
                        isActive
                          ? "text-[var(--text-color)] opacity-70"
                          : "text-[var(--text-lighter)]"
                      }
                      hover:text-[var(--text-color)] hover:opacity-100
                    `}
                    title={`Close ${buffer.name}`}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {/* Floating tab name while dragging */}
        {isDragging && draggedIndex !== null && dragCurrentPosition && (
          <div
            className="pointer-events-none fixed z-50 px-2 py-1.5 rounded bg-[var(--primary-bg)] border border-[var(--border-color)] shadow-lg font-mono text-xs flex items-center gap-1.5 select-none"
            style={{
              left: dragCurrentPosition.x + 8,
              top: dragCurrentPosition.y + 8,
              opacity: 0.95,
              minWidth: 60,
              maxWidth: 220,
              whiteSpace: "nowrap",
              color: "var(--text-color)",
            }}
          >
            {/* File Icon */}
            <span className="flex-shrink-0">
              {sortedBuffers[draggedIndex].path ===
              "extensions://language-servers" ? (
                <Package size={12} className="text-blue-500" />
              ) : sortedBuffers[draggedIndex].isSQLite ? (
                <Database size={12} className="text-[var(--text-lighter)]" />
              ) : (
                <FileIcon
                  fileName={sortedBuffers[draggedIndex].name}
                  isDir={false}
                  className="text-[var(--text-lighter)]"
                  size={12}
                />
              )}
            </span>
            {/* Pin indicator */}
            {sortedBuffers[draggedIndex].isPinned && (
              <Pin size={8} className="text-blue-500 flex-shrink-0" />
            )}
            <span className="truncate">
              {sortedBuffers[draggedIndex].name}
              {sortedBuffers[draggedIndex].isDirty && (
                <span className="text-[var(--text-lighter)] ml-1">•</span>
              )}
            </span>
          </div>
        )}
      </div>

      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        buffer={contextMenu.buffer}
        onClose={closeContextMenu}
        onPin={onTabPin || (() => {})}
        onCloseTab={(bufferId) => {
          const buffer = buffers.find((b) => b.id === bufferId);
          if (buffer) {
            onTabClose(bufferId, {} as React.MouseEvent);
          }
        }}
        onCloseOthers={onCloseOtherTabs || (() => {})}
        onCloseAll={onCloseAllTabs || (() => {})}
        onCloseToRight={onCloseTabsToRight || (() => {})}
      />
    </>
  );
};

export default TabBar;
