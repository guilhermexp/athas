import { useCallback, useRef, useState } from "react";

interface DragState {
  isDragging: boolean;
  draggedIndex: number | null;
  draggedTerminalId: string | null;
  dropTarget: number | null;
  dragStartPosition: { x: number; y: number } | null;
  dragCurrentPosition: { x: number; y: number } | null;
  isDraggedOutside: boolean;
}

interface UseTerminalDragDropOptions {
  terminals: Array<{ id: string; name: string }>;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

export function useTerminalDragDrop({ onReorder }: UseTerminalDragDropOptions) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIndex: null,
    draggedTerminalId: null,
    dropTarget: null,
    dragStartPosition: null,
    dragCurrentPosition: null,
    isDraggedOutside: false,
  });

  const tabBarRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number, terminal: { id: string; name: string }) => {
      console.log("Drag start:", terminal.name);

      // Set drag data for dropping into editor
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData(
        "application/terminal-tab",
        JSON.stringify({
          id: terminal.id,
          name: terminal.name,
        }),
      );

      // Also set text for debugging
      e.dataTransfer.setData("text/plain", terminal.name);

      // Create custom drag image
      const dragImage = document.createElement("div");
      dragImage.style.cssText = `
        position: absolute;
        top: -1000px;
        padding: 8px 12px;
        background: var(--color-primary-bg);
        border: 1px solid var(--color-border);
        color: var(--color-text);
        font-size: 12px;
        font-family: var(--font-ui);
        border-radius: 4px;
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      `;
      dragImage.textContent = `📟 ${terminal.name}`;
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 60, 20);
      setTimeout(() => {
        try {
          document.body.removeChild(dragImage);
        } catch (_e) {
          // Ignore if already removed
        }
      }, 0);

      setDragState((prev) => ({
        ...prev,
        isDragging: true,
        draggedIndex: index,
        draggedTerminalId: terminal.id,
        dragStartPosition: { x: e.clientX, y: e.clientY },
      }));
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    setDragState((prev) => {
      if (!prev.isDragging || !tabBarRef.current) return prev;

      const rect = tabBarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if dragged outside the tab bar
      const isOutside = x < 0 || x > rect.width || y < -50 || y > rect.height + 50;

      if (isOutside) {
        return {
          ...prev,
          isDraggedOutside: true,
          dropTarget: null,
          dragCurrentPosition: { x: e.clientX, y: e.clientY },
        };
      }

      // Handle internal reordering
      const tabContainer = tabBarRef.current.querySelector("[data-tab-container]");
      if (!tabContainer) {
        return {
          ...prev,
          dragCurrentPosition: { x: e.clientX, y: e.clientY },
        };
      }

      const tabElements = Array.from(tabContainer.children) as HTMLElement[];
      let newDropTarget: number | null = null;

      for (let i = 0; i < tabElements.length; i++) {
        const tabRect = tabElements[i].getBoundingClientRect();
        const tabX = tabRect.left - rect.left;
        const tabWidth = tabRect.width;

        if (x >= tabX && x <= tabX + tabWidth) {
          const relativeX = x - tabX;
          newDropTarget = relativeX < tabWidth / 2 ? i : i + 1;
          break;
        }
      }

      if (newDropTarget !== null) {
        newDropTarget = Math.max(0, Math.min(tabElements.length, newDropTarget));
      }

      return {
        ...prev,
        isDraggedOutside: false,
        dropTarget: newDropTarget,
        dragCurrentPosition: { x: e.clientX, y: e.clientY },
      };
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      setDragState((prev) => {
        const { isDraggedOutside, draggedIndex, dropTarget } = prev;

        // Only handle reordering if dropped inside
        if (!isDraggedOutside && draggedIndex !== null && dropTarget !== null && onReorder) {
          let adjustedDropTarget = dropTarget;
          if (draggedIndex < dropTarget) {
            adjustedDropTarget = dropTarget - 1;
          }
          if (adjustedDropTarget !== draggedIndex) {
            onReorder(draggedIndex, adjustedDropTarget);
          }
        }

        return {
          isDragging: false,
          draggedIndex: null,
          draggedTerminalId: null,
          dropTarget: null,
          dragStartPosition: null,
          dragCurrentPosition: null,
          isDraggedOutside: false,
        };
      });
    },
    [onReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedIndex: null,
      draggedTerminalId: null,
      dropTarget: null,
      dragStartPosition: null,
      dragCurrentPosition: null,
      isDraggedOutside: false,
    });
  }, []);

  return {
    dragState,
    tabBarRef,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  };
}
