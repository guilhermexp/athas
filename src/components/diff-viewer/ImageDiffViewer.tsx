import { FileIcon, FilePlus, FileX, X } from "lucide-react";
import { useState } from "react";
import { cn } from "../../utils/cn";
import { getImgSrc } from "./utils/diff-helpers";
import type { ImageContainerProps, ImageDiffViewerProps } from "./utils/types";

const ImageContainer: React.FC<ImageContainerProps> = ({
  label,
  labelColor,
  base64,
  alt,
  zoom,
}) => {
  const containerBase = "flex flex-col items-center justify-center p-4";
  return (
    <div className={containerBase}>
      <span className={`mb-2 font-mono ${labelColor} text-xs`}>{label}</span>
      {base64 ? (
        <img
          src={getImgSrc(base64)}
          alt={alt}
          style={{
            transform: `scale(${zoom})`,
            transition: "transform 0.1s ease-out",
          }}
          draggable={false}
        />
      ) : (
        <div className="p-8 text-text-lighter text-xs">No image data</div>
      )}
    </div>
  );
};

const statusBadge = (text: string, color: string) => (
  <span className={`ml-2 rounded px-2 py-0.5 font-bold text-xs ${color}`}>{text}</span>
);

export const ImageDiffViewer: React.FC<ImageDiffViewerProps> = ({ diff, fileName, onClose }) => {
  const [zoom, setZoom] = useState<number>(1);

  const fileLabel = fileName || diff.file_path.split("/").pop();
  const ext = fileLabel?.split(".").pop()?.toUpperCase() || "";
  const leftLabel = diff.is_deleted ? "Deleted Version" : "Previous Version";
  const rightLabel = diff.is_new ? "Added Version" : "New Version";

  return (
    <div className="flex h-full select-none flex-col bg-primary-bg">
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between border-border",
          "border-b bg-secondary-bg px-4 py-2",
        )}
      >
        <div className="flex items-center gap-2">
          {diff.is_new ? (
            <FilePlus size={14} className="text-green-500" />
          ) : diff.is_deleted ? (
            <FileX size={14} className="text-red-500" />
          ) : (
            <FileIcon size={14} className="text-text" />
          )}
          <span className="font-mono text-text text-xs">
            {fileLabel} {ext && <>• {ext}</>}
          </span>
          {diff.is_new && statusBadge("ADDED", "bg-green-600 text-white")}
          {diff.is_deleted && statusBadge("DELETED", "bg-red-600 text-white")}
          {!diff.is_new && !diff.is_deleted && statusBadge("MODIFIED", "bg-blue-600 text-white")}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
            className="p-1 text-text-lighter hover:text-text"
            title="Zoom out"
          >
            -
          </button>
          <span
            className={cn("min-w-[50px] px-2 text-center font-mono", "text-text-lighter text-xs")}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(3, z + 0.1))}
            className="p-1 text-text-lighter hover:text-text"
            title="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1 text-text-lighter hover:text-text"
            title="Reset zoom"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="ml-2 p-1 text-text-lighter hover:text-text"
            title="Close diff viewer"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      {/* Image Diff Content */}
      <div
        className={cn(
          "flex flex-1 items-center justify-center gap-8",
          "overflow-auto bg-[var(--editor-bg)]",
        )}
      >
        {/* Side-by-side for modified, single for added/deleted */}
        {diff.is_new && !diff.old_blob_base64 ? (
          // Added
          <ImageContainer
            label={rightLabel}
            labelColor="text-green-600"
            base64={diff.new_blob_base64}
            alt="Added"
            zoom={zoom}
          />
        ) : diff.is_deleted && !diff.new_blob_base64 ? (
          // Deleted
          <ImageContainer
            label={leftLabel}
            labelColor="text-red-600"
            base64={diff.old_blob_base64}
            alt="Deleted"
            zoom={zoom}
          />
        ) : (
          // Modified (side-by-side)
          <>
            <ImageContainer
              label={leftLabel}
              labelColor="text-text-lighter"
              base64={diff.old_blob_base64}
              alt="Previous"
              zoom={zoom}
            />
            <ImageContainer
              label={rightLabel}
              labelColor="text-text-lighter"
              base64={diff.new_blob_base64}
              alt="New"
              zoom={zoom}
            />
          </>
        )}
      </div>
      {/* Footer/Info */}
      <div
        className={cn(
          "flex items-center gap-4 border-border border-t",
          "bg-secondary-bg px-4 py-2 text-text-lighter text-xs",
        )}
      >
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>Type: {ext}</span>
        <span>Use +/- buttons to zoom in/out</span>
      </div>
    </div>
  );
};
