import { Database, Package, Pin, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { useBufferStore } from "../../stores/buffer-store";
import { useFileWatcherStore } from "../../stores/file-watcher-store";
import { usePersistentSettingsStore } from "../../stores/persistent-settings-store";
import type { Buffer } from "../../types/buffer";
import FileIcon from "../file-icon";
import ContextMenu from "./tab-context-menu";

interface TabBarProps {
  // All data now comes from stores, so no props needed
  paneId?: string; // For split view panes (future feature)
}

const DRAG_THRESHOLD = 5;

interface TabPosition {
  index: number;
  left: number;
  right: number;
  width: number;
  center: number;
}

const TabBar = ({ paneId }: TabBarProps) => {
  // Get everything from stores
  const {
    buffers,
    activeBufferId,
    handleTabClick,
    handleTabClose,
    handleTabPin,
    handleCloseOtherTabs,
    handleCloseAllTabs,
    handleCloseTabsToRight,
    reorderBuffers,
  } = useBufferStore();
  const { maxOpenTabs } = usePersistentSettingsStore();
  const { externallyModifiedPaths } = useFileWatcherStore();

  // Drag state
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    draggedIndex: number | null;
    dropTargetIndex: number | null;
    startPosition: { x: number; y: number } | null;
    currentPosition: { x: number; y: number } | null;
    tabPositions: TabPosition[];
    lastValidDropTarget: number | null;
    dragDirection: "left" | "right" | null;
  }>({
    isDragging: false,
    draggedIndex: null,
    dropTargetIndex: null,
    startPosition: null,
    currentPosition: null,
    tabPositions: [],
    lastValidDropTarget: null,
    dragDirection: null,
  });

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    buffer: Buffer | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, buffer: null });

  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragPreviewRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef(dragState);

  // Keep ref in sync with state
  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  // Sort buffers: pinned tabs first, then regular tabs
  const sortedBuffers = useMemo(() => {
    return [...buffers].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }, [buffers]);

  useEffect(() => {
    if (maxOpenTabs > 0 && buffers.length > maxOpenTabs && handleTabClose) {
      // Filter out pinned and active tabs
      const closableBuffers = buffers.filter(b => !b.isPinned && b.id !== activeBufferId);

      // Close oldest tabs until under limit (oldest = lowest index)
      let tabsToClose = buffers.length - maxOpenTabs;
      for (let i = 0; i < closableBuffers.length && tabsToClose > 0; i++) {
        handleTabClose(closableBuffers[i].id);
        tabsToClose--;
      }
    }
  }, [buffers, maxOpenTabs, activeBufferId, handleTabClose]);

  // Auto-scroll active tab into view
  useEffect(() => {
    const activeIndex = sortedBuffers.findIndex(buffer => buffer.id === activeBufferId);
    if (activeIndex !== -1 && tabRefs.current[activeIndex] && tabBarRef.current) {
      const activeTab = tabRefs.current[activeIndex];
      const container = tabBarRef.current;

      if (activeTab) {
        const tabRect = activeTab.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Check if tab is out of view
        if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
          activeTab.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      }
    }
  }, [activeBufferId, sortedBuffers]);

  // Cache tab positions when drag starts
  const cacheTabPositions = (): TabPosition[] => {
    if (!tabBarRef.current) return [];

    const containerRect = tabBarRef.current.getBoundingClientRect();
    const positions: TabPosition[] = [];

    tabRefs.current.forEach((tab, index) => {
      if (tab) {
        const rect = tab.getBoundingClientRect();
        const left = rect.left - containerRect.left;
        const right = rect.right - containerRect.left;
        positions.push({
          index,
          left,
          right,
          width: rect.width,
          center: left + rect.width / 2,
        });
      }
    });

    return positions;
  };

  // Calculate drop target with improved hysteresis and correct positioning
  const calculateDropTarget = (
    mouseX: number,
    currentDropTarget: number | null,
    draggedIndex: number,
    tabPositions: TabPosition[],
    dragDirection: "left" | "right" | null,
  ): { dropTarget: number; direction: "left" | "right" | null } => {
    if (!tabBarRef.current || tabPositions.length === 0) {
      return { dropTarget: currentDropTarget ?? draggedIndex, direction: dragDirection };
    }

    const containerRect = tabBarRef.current.getBoundingClientRect();
    const relativeX = mouseX - containerRect.left;

    let newDropTarget = draggedIndex;

    // before first tab
    if (relativeX < tabPositions[0]?.left) {
      newDropTarget = 0;
    }
    // after last tab
    else if (relativeX > tabPositions[tabPositions.length - 1]?.right) {
      newDropTarget = tabPositions.length;
    }
    // we over yo lets do some magic
    else {
      for (let i = 0; i < tabPositions.length; i++) {
        const pos = tabPositions[i];

        if (relativeX >= pos.left && relativeX <= pos.right) {
          const relativePositionInTab = (relativeX - pos.left) / pos.width;
          if (currentDropTarget !== null && Math.abs(currentDropTarget - i) <= 1) {
            const threshold = 0.25;

            if (relativePositionInTab < 0.5 - threshold) {
              newDropTarget = i;
            } else if (relativePositionInTab > 0.5 + threshold) {
              newDropTarget = i + 1;
            } else {
              newDropTarget = currentDropTarget;
            }
          } else {
            newDropTarget = relativePositionInTab < 0.5 ? i : i + 1;
          }
          break;
        }
      }
    }

    return {
      dropTarget: newDropTarget,
      direction: relativeX > (tabPositions[draggedIndex]?.center ?? 0) ? "right" : "left",
    };
  };

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) {
      return;
    }

    handleTabClick(sortedBuffers[index].id);

    e.preventDefault();

    setDragState({
      isDragging: false,
      draggedIndex: index,
      dropTargetIndex: null,
      startPosition: { x: e.clientX, y: e.clientY },
      currentPosition: { x: e.clientX, y: e.clientY },
      tabPositions: [],
      lastValidDropTarget: null,
      dragDirection: null,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    setDragState(prev => {
      if (prev.draggedIndex === null || !prev.startPosition) return prev;

      const currentPosition = { x: e.clientX, y: e.clientY };
      const distance = Math.sqrt(
        (currentPosition.x - prev.startPosition.x) ** 2 +
          (currentPosition.y - prev.startPosition.y) ** 2,
      );

      if (!prev.isDragging && distance > DRAG_THRESHOLD) {
        const tabPositions = cacheTabPositions();

        const newState = {
          ...prev,
          isDragging: true,
          currentPosition,
          tabPositions,
          dropTargetIndex: prev.draggedIndex,
          lastValidDropTarget: prev.draggedIndex,
        };
        return newState;
      }

      if (prev.isDragging) {
        const { dropTarget, direction } = calculateDropTarget(
          e.clientX,
          prev.dropTargetIndex,
          prev.draggedIndex,
          prev.tabPositions,
          prev.dragDirection,
        );

        const newState = {
          ...prev,
          currentPosition,
          dropTargetIndex: dropTarget,
          lastValidDropTarget: dropTarget,
          dragDirection: direction,
        };
        return newState;
      }

      return { ...prev, currentPosition };
    });
  };

  const handleContextMenu = (e: React.MouseEvent, buffer: Buffer) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      buffer,
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    const buffer = sortedBuffers[index];
    if (!buffer) return;

    // for the future
    e.dataTransfer.setData(
      "application/tab-data",
      JSON.stringify({
        bufferId: buffer.id,
        paneId: paneId,
        bufferData: buffer,
      }),
    );
    e.dataTransfer.effectAllowed = "move";

    const dragImage = document.createElement("div");
    dragImage.className =
      "bg-primary-bg border border-border rounded px-2 py-1 text-xs font-mono shadow-lg";
    dragImage.textContent = buffer.name;
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);

    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };

  const handleDragEnd = () => {};

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, buffer: null });
  };

  useEffect(() => {
    if (dragState.draggedIndex === null) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMouseMove(e);
    };

    const handleGlobalMouseUp = () => {
      const currentState = dragStateRef.current;

      if (
        currentState.isDragging &&
        currentState.draggedIndex !== null &&
        currentState.dropTargetIndex !== null &&
        reorderBuffers
      ) {
        if (currentState.dropTargetIndex !== currentState.draggedIndex) {
          let adjustedDropTarget = currentState.dropTargetIndex;
          if (currentState.draggedIndex < currentState.dropTargetIndex) {
            adjustedDropTarget = currentState.dropTargetIndex - 1;
          }

          if (adjustedDropTarget !== currentState.draggedIndex) {
            reorderBuffers(currentState.draggedIndex, adjustedDropTarget);

            const movedBuffer = sortedBuffers[currentState.draggedIndex];
            if (movedBuffer) {
              handleTabClick(movedBuffer.id);
            }
          }
        }
      }

      setDragState({
        isDragging: false,
        draggedIndex: null,
        dropTargetIndex: null,
        startPosition: null,
        currentPosition: null,
        tabPositions: [],
        lastValidDropTarget: null,
        dragDirection: null,
      });
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [dragState.draggedIndex, reorderBuffers, handleTabClick, sortedBuffers]);

  if (buffers.length === 0) {
    return null;
  }

  const { isDragging, draggedIndex, dropTargetIndex, currentPosition } = dragState;

  return (
    <>
      <div className="relative">
        <div ref={tabBarRef} className="scrollbar-hidden flex overflow-x-auto bg-secondary-bg">
          {sortedBuffers.map((buffer, index) => {
            const isActive = buffer.id === activeBufferId;
            const isExternallyModified = externallyModifiedPaths.has(buffer.path);
            const isDraggedTab = isDragging && draggedIndex === index;

            // Show drop indicator before this tab
            const showDropIndicatorBefore =
              isDragging && dropTargetIndex === index && draggedIndex !== index;

            return (
              <React.Fragment key={buffer.id}>
                {/* Drop indicator before tab */}
                {showDropIndicatorBefore && (
                  <div className="relative">
                    <div className="drop-indicator absolute top-1 bottom-1 left-0 z-20 w-0.5 bg-accent" />
                  </div>
                )}
                <div
                  ref={el => {
                    tabRefs.current[index] = el;
                  }}
                  className={cn(
                    "tab-bar-item group relative flex flex-shrink-0 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap px-2 py-0.5",
                    isActive ? "bg-primary-bg" : "bg-secondary-bg",
                    buffer.isPinned ? "border-l-2 border-l-blue-500" : "",
                    isDraggedTab ? "opacity-30" : "opacity-100",
                  )}
                  style={{ minWidth: "120px", maxWidth: "400px" }}
                  onMouseDown={e => handleMouseDown(e, index)}
                  onContextMenu={e => handleContextMenu(e, buffer)}
                  draggable={true}
                  onDragStart={e => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  {/* Active tab indicator */}
                  {isActive && <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-accent" />}

                  {/* File Icon */}
                  <div className="grid size-3 max-h-3 max-w-3 shrink-0 place-content-center py-3">
                    {buffer.path === "extensions://marketplace" ? (
                      <Package size={12} className="text-blue-500" />
                    ) : buffer.isSQLite ? (
                      <Database size={12} className="text-text-lighter" />
                    ) : (
                      <FileIcon
                        fileName={buffer.name}
                        isDir={false}
                        className="text-text-lighter"
                        size={12}
                      />
                    )}
                  </div>

                  {/* Pin indicator */}
                  {buffer.isPinned && <Pin size={8} className="flex-shrink-0 text-blue-500" />}

                  {/* File Name */}
                  <span
                    className={cn(
                      "flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs",
                      isActive ? "text-text" : "text-text-light",
                    )}
                    title={buffer.path}
                  >
                    {buffer.name}
                    {buffer.isDirty && <span className="ml-1 text-text-lighter">•</span>}
                    {isExternallyModified && !buffer.isDirty && (
                      <span className="ml-1 text-yellow-400" title="Modified externally">
                        ⚠
                      </span>
                    )}
                  </span>

                  {/* Close Button */}
                  {!buffer.isPinned && (
                    <div
                      onClick={e => {
                        e.stopPropagation();
                        handleTabClose(buffer.id);
                      }}
                      className={cn(
                        "flex-shrink-0 cursor-pointer select-none rounded p-0.5",
                        "text-text-lighter transition-all duration-150",
                        "hover:bg-hover hover:text-text hover:opacity-100 group-hover:opacity-100",
                        {
                          "opacity-100": isActive,
                          "opacity-0": !isActive,
                        },
                      )}
                      title={`Close ${buffer.name}`}
                      draggable={false}
                    >
                      <X className="pointer-events-none select-none" size={12} />
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          {/* Drop indicator after the last tab */}
          {isDragging && dropTargetIndex === sortedBuffers.length && (
            <div className="relative">
              <div className="drop-indicator absolute top-1 bottom-1 left-0 z-20 w-0.5 bg-accent" />
            </div>
          )}
        </div>

        {/* Floating tab preview while dragging */}
        {isDragging && draggedIndex !== null && currentPosition && (
          <div
            ref={dragPreviewRef}
            className="pointer-events-none fixed z-50"
            style={{
              left: currentPosition.x,
              top: currentPosition.y,
              transform: "translate(0, 0)",
            }}
          >
            <div className="tab-drag-preview flex items-center gap-1.5 rounded border border-border bg-primary-bg px-2 py-1 font-mono text-xs opacity-90">
              {/* File Icon */}
              <span className="grid size-3 shrink-0 place-content-center py-3">
                {sortedBuffers[draggedIndex].path === "extensions://marketplace" ? (
                  <Package size={12} className="text-blue-500" />
                ) : sortedBuffers[draggedIndex].isSQLite ? (
                  <Database size={12} className="text-text-lighter" />
                ) : (
                  <FileIcon
                    fileName={sortedBuffers[draggedIndex].name}
                    isDir={false}
                    className="text-text-lighter"
                    size={12}
                  />
                )}
              </span>
              {/* Pin indicator */}
              {sortedBuffers[draggedIndex].isPinned && (
                <Pin size={8} className="flex-shrink-0 text-blue-500" />
              )}
              <span className="max-w-[200px] truncate text-text">
                {sortedBuffers[draggedIndex].name}
                {sortedBuffers[draggedIndex].isDirty && (
                  <span className="ml-1 text-text-lighter">•</span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        buffer={contextMenu.buffer}
        onClose={closeContextMenu}
        onPin={handleTabPin || (() => {})}
        onCloseTab={bufferId => {
          const buffer = buffers.find(b => b.id === bufferId);
          if (buffer) {
            handleTabClose(bufferId);
          }
        }}
        onCloseOthers={handleCloseOtherTabs || (() => {})}
        onCloseAll={handleCloseAllTabs || (() => {})}
        onCloseToRight={handleCloseTabsToRight || (() => {})}
        onCopyPath={async (path: string) => {
          try {
            await navigator.clipboard.writeText(path);
          } catch (error) {
            console.error("Failed to copy path:", error);
          }
        }}
        onReload={(bufferId: string) => {
          // Reload the buffer by closing and reopening it
          const buffer = buffers.find(b => b.id === bufferId);
          if (buffer && buffer.path !== "extensions://marketplace") {
            const { closeBuffer, openBuffer } = useBufferStore.getState();
            closeBuffer(bufferId);
            // Re-read the file and open it again
            setTimeout(async () => {
              try {
                // This would need to use the file reading utility
                // For now, just reopen with current content
                openBuffer(
                  buffer.path,
                  buffer.name,
                  buffer.content,
                  buffer.isImage,
                  buffer.isSQLite,
                  buffer.isDiff,
                );
              } catch (error) {
                console.error("Failed to reload buffer:", error);
              }
            }, 100);
          }
        }}
        onRevealInFinder={(path: string) => {
          // Platform-specific reveal in finder/explorer
          if (window.electron) {
            window.electron.shell.showItemInFolder(path);
          } else {
            console.log("Reveal in finder:", path);
          }
        }}
      />
    </>
  );
};

export default TabBar;
