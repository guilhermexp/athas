import { invoke } from "@tauri-apps/api/core";
import {
  ChevronDown,
  Copy,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  SplitSquareHorizontal,
  Terminal as TerminalIcon,
  X,
} from "lucide-react";
import React, { type RefObject, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEventListener, useOnClickOutside } from "usehooks-ts";
import { useTerminalDragDrop } from "@/hooks/use-terminal-drag-drop";
import type { Shell, Terminal } from "@/types/terminal";
import { cn } from "@/utils/cn";
import Dropdown from "../ui/dropdown";
import KeybindingBadge from "../ui/keybinding-badge";
import Tooltip from "../ui/tooltip";

interface TerminalContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  terminal: Terminal | null;
  onClose: () => void;
  onPin: (terminalId: string) => void;
  onCloseTab: (terminalId: string) => void;
  onCloseOthers: (terminalId: string) => void;
  onCloseAll: () => void;
  onCloseToRight: (terminalId: string) => void;
}

const TerminalContextMenu = ({
  isOpen,
  position,
  terminal,
  onClose,
  onPin,
  onCloseTab,
  onCloseOthers,
  onCloseAll,
  onCloseToRight,
}: TerminalContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef(document);

  useOnClickOutside(menuRef as RefObject<HTMLElement>, () => {
    onClose();
  });

  useEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    documentRef,
  );

  if (!isOpen || !terminal) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-[180px] rounded-md border border-border bg-secondary-bg py-1 shadow-lg"
      style={{
        left: position.x,
        top: position.y,
        fontFamily: "var(--font-ui)",
      }}
    >
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-text text-xs hover:bg-hover"
        onClick={() => {
          onPin(terminal.id);
          onClose();
        }}
      >
        {terminal.isPinned ? (
          <PinOff size={13} strokeWidth={1.5} />
        ) : (
          <Pin size={13} strokeWidth={1.5} />
        )}
        {terminal.isPinned ? "Unpin Terminal" : "Pin Terminal"}
      </button>

      <div className="my-1 border-border/50 border-t" />

      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-text text-xs hover:bg-hover"
        onClick={() => {
          // Duplicate terminal with same directory
          onClose();
        }}
      >
        <Copy size={13} strokeWidth={1.5} />
        Duplicate Terminal
      </button>

      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-text text-xs hover:bg-hover"
        onClick={() => {
          // Clear terminal screen
          onClose();
        }}
      >
        <RotateCcw size={13} strokeWidth={1.5} />
        Clear Terminal
      </button>

      <div className="my-1 border-border/50 border-t" />

      <button
        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-text text-xs hover:bg-hover"
        onClick={() => {
          onCloseTab(terminal.id);
          onClose();
        }}
      >
        <span>Close</span>
        <KeybindingBadge keys={["⌘", "W"]} className="opacity-60" />
      </button>
      <button
        className="w-full px-3 py-1.5 text-left text-text text-xs hover:bg-hover"
        onClick={() => {
          onCloseOthers(terminal.id);
          onClose();
        }}
      >
        Close Others
      </button>
      <button
        className="w-full px-3 py-1.5 text-left text-text text-xs hover:bg-hover"
        onClick={() => {
          onCloseToRight(terminal.id);
          onClose();
        }}
      >
        Close to Right
      </button>
      <button
        className="w-full px-3 py-1.5 text-left text-text text-xs hover:bg-hover"
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

interface TerminalTabBarProps {
  terminals: Terminal[];
  activeTerminalId: string | null;
  onTabClick: (terminalId: string) => void;
  onTabClose: (terminalId: string, event: React.MouseEvent) => void;
  onTabReorder?: (fromIndex: number, toIndex: number) => void;
  onTabPin?: (terminalId: string) => void;
  onNewTerminal?: () => void;
  onCloseOtherTabs?: (terminalId: string) => void;
  onCloseAllTabs?: () => void;
  onCloseTabsToRight?: (terminalId: string) => void;
  onSplitView?: () => void;
  onFullScreen?: () => void;
  isFullScreen?: boolean;
  onClosePanel?: () => void;
  isSplitView?: boolean;
}

const TerminalTabBar = ({
  terminals,
  activeTerminalId,
  onTabClick,
  onTabClose,
  onTabReorder,
  onTabPin,
  onNewTerminal,
  onCloseOtherTabs,
  onCloseAllTabs,
  onCloseTabsToRight,
  onSplitView,
  onFullScreen,
  isFullScreen = false,
  onClosePanel,
  isSplitView = false,
}: TerminalTabBarProps) => {
  const [shells, setShells] = useState<Shell[]>([]);
  const [selectedShell, setSelectedShell] = useState<string>("");
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    terminal: Terminal | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, terminal: null });

  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Sort terminals: pinned tabs first, then regular tabs
  const sortedTerminals = [...terminals].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  // Use the new drag & drop hook
  const { dragState, tabBarRef, handleDragStart, handleDragOver, handleDrop, handleDragEnd } =
    useTerminalDragDrop({
      terminals: sortedTerminals,
      onReorder: (fromIndex, toIndex) => {
        if (onTabReorder) {
          onTabReorder(fromIndex, toIndex);
          const movedTerminal = sortedTerminals[fromIndex];
          if (movedTerminal) {
            onTabClick(movedTerminal.id);
          }
        }
      },
    });

  const { isDragging, draggedIndex, dropTarget, isDraggedOutside } = dragState;

  const handleContextMenu = (e: React.MouseEvent, terminal: Terminal) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      terminal,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, terminal: null });
  };

  useEffect(() => {
    // shell functions that will run in the terminal bar
    async function fetchShells() {
      try {
        const res: Shell[] = await invoke("get_shells");
        setShells(res);
      } catch (err) {
        console.error(`Failed to load available shells ${err}`);
      }
    }
    // idk what to fix?
    // async function executeShell(shellId: string) {
    //   try {
    //     const res: Shell[] = await invoke("execute_shell", {
    //       shell_id: shellId,
    //     });
    //     setShells(res);
    //   } catch (err) {
    //     console.error(`Failed to load executable for shell ${err}`);
    //   }
    // }

    // executeShell("nu");
    fetchShells();
  }, []);

  if (terminals.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[32px] items-center justify-between",
          "border-border/50 border-b bg-secondary-bg px-2",
        )}
        style={{ fontFamily: "var(--font-ui)" }}
      >
        <div className="flex items-center gap-2">
          <TerminalIcon size={13} className="text-text-lighter opacity-70" strokeWidth={1.5} />
          <span className="text-text-lighter text-xs">No terminals</span>
        </div>
        {onNewTerminal && (
          <div className="flex items-center gap-1">
            <div className="flex flex-shrink-0 items-center gap-0.5 rounded-md p-0.5 transition-colors hover:bg-hover/50">
              <Tooltip content="New Terminal (Cmd+T)" side="bottom">
                <button
                  onClick={onNewTerminal}
                  className="flex items-center text-text-lighter/70 hover:text-text"
                >
                  <Plus size={14} strokeWidth={1.5} />
                </button>
              </Tooltip>

              <Tooltip content="Select a shell" side="bottom">
                <Dropdown
                  searchable={false}
                  value={selectedShell}
                  options={shells.map((shell) => ({
                    value: shell.id,
                    label: shell.name,
                  }))}
                  onChange={(val) => {
                    setSelectedShell(val);
                  }}
                  CustomTrigger={({ ref, onClick }) => (
                    <button
                      ref={ref}
                      onClick={onClick}
                      className="flex items-center text-text-lighter/70 hover:text-text"
                    >
                      <ChevronDown size={10} strokeWidth={1.5} />
                    </button>
                  )}
                ></Dropdown>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        ref={tabBarRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border",
          "flex min-h-[32px] items-center justify-between overflow-x-auto",
          "border-border/50 border-b bg-secondary-bg px-2",
        )}
        style={{
          scrollbarWidth: "thin",
          scrollbarGutter: "stable",
          fontFamily: "var(--font-ui)",
        }}
      >
        {/* Left side - Terminal tabs */}
        <div
          className="scrollbar-hidden flex overflow-x-auto"
          data-tab-container
          onWheel={(e) => {
            // Handle horizontal wheel scrolling with native delta values for natural acceleration
            const container = e.currentTarget;
            if (!container) return;

            // Use deltaY for horizontal scrolling (common pattern for horizontal scrollable areas)
            // Also support deltaX for devices that support horizontal scrolling directly
            const deltaX = e.deltaX !== 0 ? e.deltaX : e.deltaY;

            container.scrollLeft += deltaX;

            // Prevent default to avoid any browser interference
            e.preventDefault();
          }}
        >
          {sortedTerminals.map((terminal, index) => {
            const isActive = terminal.id === activeTerminalId;
            // Drop indicator should be shown before the tab at dropTarget
            const showDropIndicator =
              dropTarget === index && draggedIndex !== null && !isDraggedOutside;

            return (
              <React.Fragment key={terminal.id}>
                {/* Drop indicator before tab */}
                {showDropIndicator && (
                  <div className="relative flex items-center">
                    <div
                      className="absolute top-0 bottom-0 z-10 h-full w-0.5 bg-accent"
                      style={{ height: "100%" }}
                    />
                  </div>
                )}
                <div
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  draggable={true}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    handleDragStart(e, index, terminal);
                  }}
                  onDragEnd={(e) => {
                    e.stopPropagation();
                    handleDragEnd();
                  }}
                  onClick={(_e) => {
                    // Only handle click if not dragging
                    if (!isDragging) {
                      onTabClick(terminal.id);
                    }
                  }}
                  onMouseDown={(e) => {
                    // Prevent default on buttons to allow click
                    if ((e.target as HTMLElement).closest("button")) {
                      e.stopPropagation();
                    }
                  }}
                  className={cn(
                    "group relative flex flex-shrink-0 cursor-move select-none items-center gap-2 whitespace-nowrap px-2.5 py-1.5",
                    "border-border/30 border-r transition-all duration-150",
                    isActive
                      ? "bg-primary-bg text-text"
                      : "bg-transparent text-text-lighter hover:bg-hover/50 hover:text-text",
                    terminal.isPinned ? "border-l-2 border-l-blue-500/60" : "",
                    isDragging && draggedIndex === index && "opacity-30",
                  )}
                  style={{
                    minWidth: "120px",
                    maxWidth: "200px",
                    fontSize: "12px",
                    fontFamily: "var(--font-ui)",
                  }}
                  title={`${terminal.name}${terminal.isPinned ? " (Pinned)" : ""} - ${terminal.currentDirectory}`}
                  onContextMenu={(e) => handleContextMenu(e, terminal)}
                >
                  {/* Terminal Icon */}
                  <div className="flex-shrink-0">
                    <TerminalIcon
                      size={13}
                      className="text-text-lighter opacity-70"
                      strokeWidth={1.5}
                    />
                  </div>

                  {/* Pin indicator */}
                  {terminal.isPinned && (
                    <Pin size={9} className="flex-shrink-0 text-blue-400 opacity-70" />
                  )}

                  {/* Terminal Name */}
                  <span
                    className={cn(
                      "flex-1 overflow-hidden text-ellipsis whitespace-nowrap",
                      isActive ? "font-medium text-text" : "font-normal text-text-light",
                    )}
                    style={{ fontSize: "12px" }}
                  >
                    {terminal.name}
                  </span>

                  {/* Close Button */}
                  {!terminal.isPinned && (
                    <button
                      draggable={false}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTabClose(terminal.id, e);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      className={cn(
                        "flex-shrink-0 cursor-pointer rounded p-0.5",
                        "text-text-lighter/60 transition-all duration-150",
                        "hover:bg-hover/70 hover:text-text group-hover:opacity-100",
                        {
                          "opacity-100": isActive,
                          "opacity-0": !isActive,
                        },
                      )}
                    >
                      <X size={13} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          {/* Drop indicator after the last tab */}
          {dropTarget === sortedTerminals.length && draggedIndex !== null && !isDraggedOutside && (
            <div className="relative flex items-center">
              <div
                className="absolute top-0 bottom-0 z-10 w-0.5 bg-accent"
                style={{ height: "100%" }}
              />
            </div>
          )}
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-1">
          <div className="flex flex-shrink-0 items-center gap-0.5 rounded-md p-0.5 transition-colors hover:bg-hover/50">
            <Tooltip content="New Terminal (Cmd+T)" side="bottom">
              <button
                onClick={onNewTerminal}
                className="flex flex-shrink-0 cursor-pointer items-center text-text-lighter/70 hover:text-text"
              >
                <Plus size={14} strokeWidth={1.5} />
              </button>
            </Tooltip>
            <Tooltip content="Select a shell" side="bottom">
              <Dropdown
                searchable={false}
                value={selectedShell}
                options={shells.map((shell) => ({
                  value: shell.id,
                  label: shell.name,
                }))}
                onChange={(val) => {
                  setSelectedShell(val);
                }}
                CustomTrigger={({ ref, onClick }) => (
                  <button
                    ref={ref}
                    onClick={onClick}
                    className="flex flex-shrink-0 cursor-pointer items-center text-text-lighter/70 hover:text-text"
                  >
                    <ChevronDown size={10} strokeWidth={1.5} />
                  </button>
                )}
              ></Dropdown>
            </Tooltip>
          </div>
          {/* Split View Button */}
          {onSplitView && (
            <Tooltip
              content={isSplitView ? "Exit Split View" : "Split Terminal View (Cmd+D)"}
              side="bottom"
            >
              <button
                onClick={onSplitView}
                className={cn(
                  "flex flex-shrink-0 cursor-pointer items-center rounded-md p-1",
                  isSplitView
                    ? "bg-hover/80 text-text"
                    : "text-text-lighter/70 transition-colors hover:bg-hover/50 hover:text-text",
                )}
              >
                <SplitSquareHorizontal size={13} strokeWidth={1.5} />
              </button>
            </Tooltip>
          )}
          {/* Full Screen Button */}
          {onFullScreen && (
            <Tooltip
              content={isFullScreen ? "Exit Full Screen" : "Full Screen Terminal"}
              side="bottom"
            >
              <button
                onClick={onFullScreen}
                className={cn(
                  "flex flex-shrink-0 cursor-pointer items-center rounded-md p-1",
                  "text-text-lighter/70 transition-colors hover:bg-hover/50 hover:text-text",
                )}
              >
                {isFullScreen ? (
                  <Minimize2 size={13} strokeWidth={1.5} />
                ) : (
                  <Maximize2 size={13} strokeWidth={1.5} />
                )}
              </button>
            </Tooltip>
          )}
          {/* Close Panel Button */}
          {onClosePanel && (
            <Tooltip content="Close Terminal Panel" side="bottom">
              <button
                onClick={onClosePanel}
                className={cn(
                  "flex flex-shrink-0 cursor-pointer items-center rounded-md p-1",
                  "text-text-lighter/70 transition-colors hover:bg-hover/50 hover:text-text",
                )}
              >
                <X size={13} strokeWidth={1.5} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {createPortal(
        <TerminalContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          terminal={contextMenu.terminal}
          onClose={closeContextMenu}
          onPin={(terminalId) => {
            onTabPin?.(terminalId);
          }}
          onCloseTab={(terminalId) => {
            onTabClose(terminalId, {} as React.MouseEvent);
          }}
          onCloseOthers={onCloseOtherTabs || (() => {})}
          onCloseAll={onCloseAllTabs || (() => {})}
          onCloseToRight={onCloseTabsToRight || (() => {})}
        />,
        document.body,
      )}
    </>
  );
};

export default TerminalTabBar;
