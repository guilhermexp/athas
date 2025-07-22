// Map Rust Color enum to CSS color values using theme variables
export type Color =
  | "Default"
  | "Black"
  | "Red"
  | "Green"
  | "Yellow"
  | "Blue"
  | "Magenta"
  | "Cyan"
  | "White"
  | "BrightBlack"
  | "BrightRed"
  | "BrightGreen"
  | "BrightYellow"
  | "BrightBlue"
  | "BrightMagenta"
  | "BrightCyan"
  | "BrightWhite"
  | { Extended: number }
  | { Rgb: [number, number, number] };

// Get color value from CSS variable
function getCSSVariable(varName: string): string {
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  return computedStyle.getPropertyValue(varName).trim();
}

// Convert Rust Color enum to CSS color value
export function colorToCSS(color: Color | string | undefined | any): string | undefined {
  if (!color) return undefined;

  // Handle string variants (simple enum values)
  if (typeof color === "string") {
    switch (color) {
      case "Default":
        return undefined; // Use default text color
      case "Black":
        return getCSSVariable("--tw-terminal-black");
      case "Red":
        return getCSSVariable("--tw-terminal-red");
      case "Green":
        return getCSSVariable("--tw-terminal-green");
      case "Yellow":
        return getCSSVariable("--tw-terminal-yellow");
      case "Blue":
        return getCSSVariable("--tw-terminal-blue");
      case "Magenta":
        return getCSSVariable("--tw-terminal-magenta");
      case "Cyan":
        return getCSSVariable("--tw-terminal-cyan");
      case "White":
        return getCSSVariable("--tw-terminal-white");
      case "BrightBlack":
        return getCSSVariable("--tw-terminal-bright-black");
      case "BrightRed":
        return getCSSVariable("--tw-terminal-bright-red");
      case "BrightGreen":
        return getCSSVariable("--tw-terminal-bright-green");
      case "BrightYellow":
        return getCSSVariable("--tw-terminal-bright-yellow");
      case "BrightBlue":
        return getCSSVariable("--tw-terminal-bright-blue");
      case "BrightMagenta":
        return getCSSVariable("--tw-terminal-bright-magenta");
      case "BrightCyan":
        return getCSSVariable("--tw-terminal-bright-cyan");
      case "BrightWhite":
        return getCSSVariable("--tw-terminal-bright-white");
      default:
        return undefined;
    }
  }

  // Handle object variants
  if (typeof color === "object") {
    // Extended color (256 color palette)
    if ("Extended" in color && typeof color.Extended === "number") {
      const idx = color.Extended;

      // First 16 colors map to our theme colors
      if (idx < 8) {
        const colors = ["Black", "Red", "Green", "Yellow", "Blue", "Magenta", "Cyan", "White"];
        return colorToCSS(colors[idx]);
      } else if (idx < 16) {
        const colors = [
          "BrightBlack",
          "BrightRed",
          "BrightGreen",
          "BrightYellow",
          "BrightBlue",
          "BrightMagenta",
          "BrightCyan",
          "BrightWhite",
        ];
        return colorToCSS(colors[idx - 8]);
      }

      // 16-231: 6x6x6 color cube
      if (idx >= 16 && idx <= 231) {
        const i = idx - 16;
        const r = Math.floor(i / 36);
        const g = Math.floor((i % 36) / 6);
        const b = i % 6;

        const toRgb = (n: number) => (n === 0 ? 0 : 55 + n * 40);
        return `rgb(${toRgb(r)}, ${toRgb(g)}, ${toRgb(b)})`;
      }

      // 232-255: grayscale
      if (idx >= 232 && idx <= 255) {
        const gray = 8 + (idx - 232) * 10;
        return `rgb(${gray}, ${gray}, ${gray})`;
      }
    }

    // RGB color
    if ("Rgb" in color && Array.isArray(color.Rgb) && color.Rgb.length === 3) {
      return `rgb(${color.Rgb[0]}, ${color.Rgb[1]}, ${color.Rgb[2]})`;
    }
  }

  return undefined;
}
