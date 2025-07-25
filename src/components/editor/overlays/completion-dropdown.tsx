import { memo } from "react";
import { EDITOR_CONSTANTS } from "../../../constants/editor-constants";
import { useEditorCompletionStore } from "../../../stores/editor-completion-store";
import { useEditorInstanceStore } from "../../../stores/editor-instance-store";

export const CompletionDropdown = memo(() => {
  const { isLspCompletionVisible, lspCompletions, selectedLspIndex, completionPosition, actions } =
    useEditorCompletionStore();
  const { editorRef } = useEditorInstanceStore();

  if (!isLspCompletionVisible) return null;

  const handleSelect = () => {
    // Apply LSP completion logic
    if (editorRef?.current) {
      // This would contain the actual completion application logic
      // For now, just close the dropdown
      actions.setIsLspCompletionVisible(false);
    }
  };

  return (
    <div
      className="fixed rounded border border-border bg-primary-bg shadow-lg"
      style={{
        left: completionPosition.left,
        top: completionPosition.top,
        zIndex: EDITOR_CONSTANTS.Z_INDEX.DROPDOWN,
        minWidth: `${EDITOR_CONSTANTS.DROPDOWN_MIN_WIDTH}px`,
        maxWidth: `${EDITOR_CONSTANTS.DROPDOWN_MAX_WIDTH}px`,
      }}
    >
      <div className="max-h-[300px] overflow-y-auto">
        {lspCompletions.map((item: any, index: number) => (
          <div
            key={index}
            className={`cursor-pointer px-3 py-2 text-sm hover:bg-hover ${
              index === selectedLspIndex ? "bg-accent text-primary-bg" : ""
            }`}
            onClick={() => handleSelect()}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono">{item.label}</span>
              {item.detail && <span className="text-text-lighter text-xs">{item.detail}</span>}
            </div>
            {item.documentation && (
              <div className="mt-1 text-text-light text-xs">
                {typeof item.documentation === "string"
                  ? item.documentation
                  : item.documentation.value}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

CompletionDropdown.displayName = "CompletionDropdown";
