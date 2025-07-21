import { RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { useActiveBuffer, useBufferStore } from "../../stores/buffer-store";
import { cn } from "../../utils/cn";
import { DiffHeader } from "./DiffHeader";
import { useDiffData } from "./hooks/useDiffData";
import { useDiffViewState } from "./hooks/useDiffViewState";
import { ImageDiffViewer } from "./ImageDiffViewer";
import { TextDiffViewer } from "./TextDiffViewer";
import type { DiffViewerProps } from "./utils/types";

const DiffViewer: React.FC<DiffViewerProps> = ({ onStageHunk, onUnstageHunk }) => {
  const activeBuffer = useActiveBuffer();
  const { closeBuffer } = useBufferStore();
  const { diff, isStaged, isLoading, error, refresh } = useDiffData();
  const { viewMode, setViewMode } = useDiffViewState();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!activeBuffer || !activeBuffer.isDiff) {
    return null;
  }

  const fileName = activeBuffer.name;
  const onClose = () => closeBuffer(activeBuffer.id);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  // No diff data yet
  if (!diff) {
    return (
      <div className="flex h-full flex-col bg-primary-bg">
        <div
          className={cn(
            "flex items-center justify-between border-border",
            "border-b bg-secondary-bg px-4 py-2",
          )}
        >
          <h3 className="font-medium text-sm text-text">Diff Viewer</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className={cn("p-1 text-text-lighter hover:text-text", "disabled:opacity-50")}
              title="Refresh diff"
            >
              <RefreshCw size={14} className={isRefreshing || isLoading ? "animate-spin" : ""} />
            </button>
            <button onClick={onClose} className="p-1 text-text-lighter hover:text-text">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          {error ? (
            <div className="text-center">
              <p className="text-red-400 text-sm">Error: {error}</p>
              <button
                onClick={handleRefresh}
                className="mt-2 rounded bg-hover px-3 py-1 text-text text-xs hover:bg-border"
              >
                Retry
              </button>
            </div>
          ) : (
            <p className="text-sm text-text-lighter">
              {isLoading ? "Loading diff..." : "No diff to display"}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Image diff
  if (diff.is_image) {
    return <ImageDiffViewer diff={diff} fileName={fileName} onClose={onClose} />;
  }

  // Text diff
  return (
    <div className="flex h-full flex-col bg-primary-bg">
      <DiffHeader
        fileName={fileName}
        diff={diff}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onClose={onClose}
      />
      <TextDiffViewer
        diff={diff}
        isStaged={isStaged}
        viewMode={viewMode}
        onStageHunk={onStageHunk}
        onUnstageHunk={onUnstageHunk}
      />
    </div>
  );
};

export default DiffViewer;
