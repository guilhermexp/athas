import { memo, useEffect, useState } from "react";
import { useEditorLayout } from "@/hooks/use-editor-layout";
import { useEditorLayoutStore } from "@/stores/editor-layout-store";
import { useEditorViewStore } from "@/stores/editor-view-store";
import { type ColorMatch, detectColors } from "@/utils/color-detection";

interface ColorIndicatorProps {
  color: ColorMatch;
  lineHeight: number;
  scrollTop: number;
  scrollLeft: number;
  gutterWidth: number;
}

const ColorIndicator = memo<ColorIndicatorProps>(
  ({ color, lineHeight, scrollTop, scrollLeft, gutterWidth }) => {
    // Calculate the position of the indicator
    const top = color.line * lineHeight - scrollTop;
    const left = gutterWidth + 8 + (color.column + color.value.length) * 7.2 - scrollLeft; // Approximate character width

    // Only render if visible in viewport
    if (top < -20 || top > window.innerHeight + 20) {
      return null;
    }

    return (
      <div
        className="pointer-events-none absolute flex items-center justify-center"
        style={{
          top: `${top + 2}px`, // Slight vertical offset to align with text
          left: `${left + 4}px`, // Small horizontal offset from the color value
          zIndex: 10,
        }}
      >
        <div
          className="h-4 w-4 rounded border border-gray-400 shadow-sm"
          style={{
            backgroundColor: color.normalizedValue,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
          }}
          title={`${color.value} → ${color.normalizedValue}`}
        />
      </div>
    );
  },
);

ColorIndicator.displayName = "ColorIndicator";

export const ColorIndicators = memo(() => {
  const [colors, setColors] = useState<ColorMatch[]>([]);
  const { getContent } = useEditorViewStore.use.actions();
  const content = getContent();
  const { lineHeight, gutterWidth } = useEditorLayout();
  const { scrollTop, scrollLeft } = useEditorLayoutStore();

  // Detect colors in the content
  useEffect(() => {
    if (!content) {
      setColors([]);
      return;
    }

    // Debounce color detection to avoid excessive computation
    const timeoutId = setTimeout(() => {
      const detectedColors = detectColors(content);
      setColors(detectedColors);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [content]);

  if (colors.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      {colors.map((color, index) => (
        <ColorIndicator
          key={`${color.start}-${color.end}-${index}`}
          color={color}
          lineHeight={lineHeight}
          scrollTop={scrollTop}
          scrollLeft={scrollLeft}
          gutterWidth={gutterWidth}
        />
      ))}
    </div>
  );
});

ColorIndicators.displayName = "ColorIndicators";
