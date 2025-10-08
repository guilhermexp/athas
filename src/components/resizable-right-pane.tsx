import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSettingsStore } from "@/settings/store";
import { cn } from "../utils/cn";

// Constants for resizable pane
const MIN_WIDTH = 200;
const MAX_WIDTH = 600;

interface ResizableRightPaneProps {
  children: React.ReactNode;
  className?: string;
  position?: "left" | "right";
  isVisible?: boolean;
}

const ResizableRightPane = ({
  children,
  className,
  position = "right",
  isVisible = true,
}: ResizableRightPaneProps) => {
  const { settings, updateSetting } = useSettingsStore();
  const [isResizing, setIsResizing] = useState(false);
  const [tempWidth, setTempWidth] = useState(settings.agentPanelWidth);
  const paneRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  // Throttle settings updates for better performance
  const throttledUpdateSetting = useCallback(
    (newWidth: number) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        updateSetting("agentPanelWidth", newWidth);
      });
    },
    [updateSetting],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);

      const startX = e.clientX;
      const startWidth = settings.agentPanelWidth;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX =
          position === "right"
            ? startX - e.clientX // Reverse direction for right pane
            : e.clientX - startX; // Normal direction for left pane
        const newWidth = Math.min(Math.max(startWidth + deltaX, MIN_WIDTH), MAX_WIDTH);
        setTempWidth(newWidth);
        throttledUpdateSetting(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        // Ensure final width is saved
        throttledUpdateSetting(tempWidth);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [settings.agentPanelWidth, position, tempWidth, throttledUpdateSetting],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={paneRef}
      style={{ width: `${isResizing ? tempWidth : settings.agentPanelWidth}px` }}
      className={cn(
        "relative flex flex-shrink-0 flex-col bg-secondary-bg",
        position === "right" ? "border-border border-l" : "border-border border-r",
        className,
      )}
    >
      {/* Resize Handle */}
      <div
        ref={resizerRef}
        onMouseDown={handleMouseDown}
        className={cn(
          "group absolute top-0 h-full w-1 cursor-col-resize transition-colors duration-150",
          position === "right" ? "left-0" : "right-0",
          isResizing && "bg-text-lighter/40",
        )}
      >
        <div
          className={cn(
            "absolute top-0 h-full w-[3px] opacity-0 transition-opacity duration-150 group-hover:opacity-100",
            position === "right" ? "left-0 translate-x-[1px]" : "-translate-x-[1px] right-0",
          )}
          style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
        />
      </div>

      {children}
    </div>
  );
};

export default ResizableRightPane;
