interface HoverTooltipProps {
  hoverInfo: {
    content: string;
    position: { top: number; left: number };
  } | null;
  fontSize: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const HoverTooltip = ({
  hoverInfo,
  fontSize,
  onMouseEnter,
  onMouseLeave,
}: HoverTooltipProps) => {
  if (!hoverInfo) return null;

  return (
    <div
      className="pointer-events-auto fixed z-[110] rounded-lg border border-border bg-primary-bg shadow-xl"
      style={{
        top: hoverInfo.position.top,
        left: hoverInfo.position.left,
        maxWidth: "400px",
        maxHeight: "300px",
        backdropFilter: "blur(8px)",
        animation: "fadeInUp 0.2s ease-out",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="scrollbar-hidden overflow-auto p-4">
        {hoverInfo.content.includes("```") ? (
          <div className="space-y-3">
            {hoverInfo.content.split(/```[\w]*\n?/).map((part, index) => {
              const trimmedPart = part.trim();
              if (!trimmedPart) return null;

              if (index % 2 === 1) {
                return (
                  <pre
                    key={index}
                    className="scrollbar-hidden overflow-x-auto rounded-md border border-border bg-secondary-bg p-3 font-mono text-sm text-text"
                    style={{ fontSize: `${fontSize * 0.85}px` }}
                  >
                    {trimmedPart.replace(/```$/, "")}
                  </pre>
                );
              }
              return trimmedPart ? (
                <div
                  key={index}
                  className="whitespace-pre-wrap text-sm text-text leading-relaxed"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  {trimmedPart}
                </div>
              ) : null;
            })}
          </div>
        ) : (
          <div
            className="whitespace-pre-wrap text-sm text-text leading-relaxed"
            style={{ fontSize: `${fontSize * 0.9}px` }}
          >
            {hoverInfo.content}
          </div>
        )}
      </div>
    </div>
  );
};
