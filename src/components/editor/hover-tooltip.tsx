import { useEditorCompletionStore } from "../../stores/editor-completion-store";
import { useEditorSettingsStore } from "../../stores/editor-settings-store";

export function HoverTooltip() {
  const fontSize = useEditorSettingsStore(state => state.fontSize);
  const fontFamily = useEditorSettingsStore(state => state.fontFamily);
  const { hoverInfo, setIsHovering } = useEditorCompletionStore();

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => setIsHovering(false);

  if (!hoverInfo) return null;

  return (
    <div
      className="fixed z-50 max-w-md rounded border border-border bg-primary-bg p-3 shadow-lg"
      style={{
        left: hoverInfo.position?.left || 0,
        top: hoverInfo.position?.top || 0,
        fontSize: `${fontSize * 0.9}px`,
        fontFamily: fontFamily,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {hoverInfo.content && <div className="text-sm text-text">{hoverInfo.content}</div>}
    </div>
  );
}
