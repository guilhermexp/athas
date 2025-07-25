import { memo } from "react";
import { useEditorLayout } from "../../../hooks/use-editor-layout";
import { useEditorContentStore } from "../../../stores/editor-content-store";
import { useEditorCursorStore } from "../../../stores/editor-cursor-store";
import { useEditorDebugStore } from "../../../stores/editor-debug-store";
import { useEditorLayoutStore } from "../../../stores/editor-layout-store";
import { useEditorSettingsStore } from "../../../stores/editor-settings-store";

export const DebugOverlay = memo(() => {
  const cursorPosition = useEditorCursorStore.use.cursorPosition();
  const selection = useEditorCursorStore.use.selection?.() ?? undefined;
  const desiredColumn = useEditorCursorStore.use.desiredColumn?.() ?? undefined;
  const { recentKeystrokes, recentTextChanges, isVisible } = useEditorDebugStore();
  const lines = useEditorContentStore((state) => state.lines);
  const fontSize = useEditorSettingsStore.use.fontSize();
  const { scrollTop, scrollLeft } = useEditorLayoutStore();
  const { lineHeight, gutterWidth } = useEditorLayout();

  if (!isVisible) return null;

  const currentLine = lines[cursorPosition.line] || "";
  const charAtCursor = currentLine[cursorPosition.column] || "EOL";
  const charBeforeCursor = currentLine[cursorPosition.column - 1] || "BOL";

  return (
    <div
      style={{
        position: "fixed",
        top: "100px",
        right: "10px",
        background: "rgba(0, 0, 0, 0.9)",
        color: "#00ff00",
        padding: "15px",
        borderRadius: "5px",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "12px",
        minWidth: "300px",
        maxWidth: "400px",
        zIndex: 9999,
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
        maxHeight: "80vh",
        overflowY: "auto",
      }}
    >
      <h3
        style={{
          margin: "0 0 10px 0",
          fontSize: "14px",
          borderBottom: "1px solid #00ff00",
          paddingBottom: "5px",
        }}
      >
        Editor Debug Info
      </h3>

      <div style={{ marginBottom: "10px" }}>
        <strong>Cursor Position:</strong>
        <div style={{ marginLeft: "10px", color: "#ffff00" }}>
          Line: {cursorPosition.line} | Column: {cursorPosition.column} | Offset:{" "}
          {cursorPosition.offset}
        </div>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <strong>Cursor Props:</strong>
        <div style={{ marginLeft: "10px", color: "#00ffff" }}>
          Line Height: {lineHeight}px | Font Size: {fontSize}px
          <br />
          Gutter Width: {gutterWidth}px
          <br />
          Scroll: ({scrollLeft}, {scrollTop})
        </div>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <strong>Character Info:</strong>
        <div style={{ marginLeft: "10px", color: "#ff00ff" }}>
          At cursor: "{charAtCursor}" | Before: "{charBeforeCursor}"
          <br />
          Line length: {currentLine.length}
        </div>
      </div>

      {desiredColumn !== null && (
        <div style={{ marginBottom: "10px" }}>
          <strong>Desired Column:</strong>
          <span style={{ marginLeft: "10px", color: "#ff9900" }}>{desiredColumn}</span>
        </div>
      )}

      {selection && (
        <div style={{ marginBottom: "10px" }}>
          <strong>Selection:</strong>
          <div style={{ marginLeft: "10px", color: "#ff0099" }}>
            Start: ({selection.start.line}, {selection.start.column})
            <br />
            End: ({selection.end.line}, {selection.end.column})
          </div>
        </div>
      )}

      <div style={{ marginBottom: "10px" }}>
        <strong>Recent Keystrokes:</strong>
        <div style={{ marginLeft: "10px", color: "#99ff00", fontFamily: "monospace" }}>
          {recentKeystrokes.length > 0 ? (
            recentKeystrokes.map((key, idx) => (
              <span
                key={idx}
                style={{
                  marginRight: "5px",
                  background: "rgba(255, 255, 255, 0.1)",
                  padding: "2px 4px",
                  borderRadius: "3px",
                }}
              >
                {key}
              </span>
            ))
          ) : (
            <span style={{ color: "#666" }}>No keystrokes yet</span>
          )}
        </div>
      </div>

      {recentTextChanges.length > 0 && (
        <div>
          <strong>Recent Text Changes:</strong>
          <div style={{ marginLeft: "10px", fontSize: "11px" }}>
            {recentTextChanges.slice(-3).map((change, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: "5px",
                  borderBottom: "1px solid #333",
                  paddingBottom: "5px",
                }}
              >
                <div style={{ color: "#ff6666" }}>
                  Cursor: ({change.cursorBefore.line}, {change.cursorBefore.column}) → (
                  {change.cursorAfter.line}, {change.cursorAfter.column})
                </div>
                <div style={{ color: "#66ff66", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  Δ: {change.newValue.length - change.oldValue.length} chars
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

DebugOverlay.displayName = "DebugOverlay";
