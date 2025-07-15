import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FileEntry } from "../../types/app";
import { moveFile } from "../../utils/platform";

interface CustomDragState {
  isDragging: boolean;
  draggedItem: { path: string; name: string; isDir: boolean } | null;
  dragOverPath: string | null;
  dragOverIsDir: boolean;
  mousePosition: { x: number; y: number };
}

export const useCustomDragDrop = (
  rootFolderPath: string | undefined,
  onFileMove?: (oldPath: string, newPath: string) => void,
  onRefreshDirectory?: (path: string) => void,
) => {
  const [dragState, setDragState] = useState<CustomDragState>({
    isDragging: false,
    draggedItem: null,
    dragOverPath: null,
    dragOverIsDir: false,
    mousePosition: { x: 0, y: 0 },
  });

  const dragPreviewRef = useRef<HTMLDivElement | null>(null);

  // Create drag preview element
  useEffect(() => {
    if (dragState.isDragging && !dragPreviewRef.current) {
      const preview = document.createElement("div");
      preview.style.position = "fixed";
      preview.style.pointerEvents = "none";
      preview.style.zIndex = "9999";
      preview.style.opacity = "0.8";
      preview.style.padding = "4px 8px";
      preview.style.backgroundColor = "var(--color-secondary-bg)";
      preview.style.border = "1px solid var(--color-border)";
      preview.style.borderRadius = "4px";
      preview.style.fontSize = "12px";
      preview.style.fontFamily = "monospace";
      preview.textContent = dragState.draggedItem?.name || "";
      document.body.appendChild(preview);
      dragPreviewRef.current = preview;
    }

    return () => {
      if (dragPreviewRef.current) {
        document.body.removeChild(dragPreviewRef.current);
        dragPreviewRef.current = null;
      }
    };
  }, [dragState.isDragging, dragState.draggedItem?.name]);

  // Update drag preview position
  useEffect(() => {
    if (dragPreviewRef.current) {
      dragPreviewRef.current.style.left = `${dragState.mousePosition.x + 10}px`;
      dragPreviewRef.current.style.top = `${dragState.mousePosition.y - 10}px`;
    }
  }, [dragState.mousePosition]);

  // Global mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging) {
        setDragState(prev => ({
          ...prev,
          mousePosition: { x: e.clientX, y: e.clientY },
        }));

        // Find element under cursor
        const elementUnder = document.elementFromPoint(e.clientX, e.clientY);
        const fileTreeItem = elementUnder?.closest("[data-file-path]");
        const fileTreeContainer = elementUnder?.closest(".file-tree-container");

        if (fileTreeItem) {
          const path = fileTreeItem.getAttribute("data-file-path");
          const isDir = fileTreeItem.getAttribute("data-is-dir") === "true";

          // Allow dropping on directories or files (files will use their parent directory)
          if (path && path !== dragState.draggedItem?.path) {
            // Prevent dropping a folder into itself or its children
            if (
              dragState.draggedItem?.isDir &&
              path.startsWith(
                dragState.draggedItem.path +
                  (dragState.draggedItem.path.includes("\\") ? "\\" : "/"),
              )
            ) {
              setDragState(prev => ({ ...prev, dragOverPath: null, dragOverIsDir: false }));
            } else {
              setDragState(prev => ({ ...prev, dragOverPath: path, dragOverIsDir: isDir }));
            }
          } else {
            setDragState(prev => ({ ...prev, dragOverPath: null, dragOverIsDir: false }));
          }
        } else if (fileTreeContainer) {
          // When hovering over empty space in the file tree container, treat it as dropping to root
          setDragState(prev => ({ ...prev, dragOverPath: "__ROOT__", dragOverIsDir: true }));
        } else {
          setDragState(prev => ({ ...prev, dragOverPath: null, dragOverIsDir: false }));
        }
      }
    };

    const handleMouseUp = async () => {
      if (dragState.isDragging && dragState.dragOverPath && dragState.draggedItem) {
        const { path: sourcePath, name: sourceName } = dragState.draggedItem;
        let targetPath = dragState.dragOverPath;

        // Handle drop to root (empty space in file tree)
        if (targetPath === "__ROOT__") {
          targetPath = rootFolderPath || "";
          if (!targetPath) {
            console.error("Cannot determine root folder path");
            setDragState({
              isDragging: false,
              draggedItem: null,
              dragOverPath: null,
              dragOverIsDir: false,
              mousePosition: { x: 0, y: 0 },
            });
            return;
          }
        }

        // If dropping on a file, use its parent directory
        const pathSeparator = sourcePath.includes("\\") ? "\\" : "/";
        if (!dragState.dragOverIsDir && targetPath !== "__ROOT__") {
          const pathParts = targetPath.split(pathSeparator);
          pathParts.pop(); // Remove the file name
          targetPath = pathParts.join(pathSeparator) || rootFolderPath || "";
        }

        console.log("Custom drop:", sourcePath, "->", targetPath);

        // Calculate new path
        const newPath = targetPath + pathSeparator + sourceName;

        try {
          console.log("Moving file:", sourcePath, "->", newPath);
          await moveFile(sourcePath, newPath);
          console.log("File moved successfully");

          if (onFileMove) {
            onFileMove(sourcePath, newPath);
          }

          if (onRefreshDirectory) {
            // Small delay to ensure file system operation is complete
            await new Promise(resolve => setTimeout(resolve, 100));

            // Refresh source parent directory
            const sourceParentPath =
              sourcePath.split(pathSeparator).slice(0, -1).join(pathSeparator) ||
              rootFolderPath ||
              "";
            await onRefreshDirectory(targetPath);
            if (targetPath !== sourceParentPath) {
              await onRefreshDirectory(sourceParentPath);
            }
          }
        } catch (error) {
          console.error("Failed to move file:", error);
          alert(`Failed to move ${sourceName}: ${error}`);
        }
      }

      // Reset drag state
      setDragState({
        isDragging: false,
        draggedItem: null,
        dragOverPath: null,
        dragOverIsDir: false,
        mousePosition: { x: 0, y: 0 },
      });
    };

    if (dragState.isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragState, onFileMove, onRefreshDirectory, rootFolderPath]);

  const startCustomDrag = useCallback((e: React.MouseEvent, file: FileEntry) => {
    e.preventDefault();
    e.stopPropagation();

    console.log("Custom drag started:", file.path);

    setDragState({
      isDragging: true,
      draggedItem: { path: file.path, name: file.name, isDir: file.isDir },
      dragOverPath: null,
      dragOverIsDir: false,
      mousePosition: { x: e.clientX, y: e.clientY },
    });
  }, []);

  return {
    dragState,
    startCustomDrag,
  };
};
