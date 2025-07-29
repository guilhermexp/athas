import { Palette, Sparkles } from "lucide-react";
import { BaseThemeExtension } from "../base-theme-extension";
import type { ThemeDefinition } from "../types";

/**
 * Example of how to create a custom theme extension
 * This demonstrates adding colorful themes to the system
 */
class CustomColorfulThemesExtension extends BaseThemeExtension {
  readonly name = "Custom Colorful Themes";
  readonly version = "1.0.0";
  readonly description = "Example colorful themes for demonstration";

  readonly themes: ThemeDefinition[] = [
    {
      id: "ocean-breeze",
      name: "Ocean Breeze",
      description: "Cool blue tones inspired by the ocean",
      category: "Light",
      icon: <Palette size={14} />,
      isDark: false,
      cssVariables: {
        "--color-background": "#f0f9ff",
        "--color-background-secondary": "#e0f2fe",
        "--color-background-tertiary": "#bae6fd",
        "--color-text": "#164e63",
        "--color-text-secondary": "#0891b2",
        "--color-text-lighter": "#67e8f9",
        "--color-border": "#7dd3fc",
        "--color-border-light": "#bae6fd",
        "--color-accent": "#0284c7",
        "--color-accent-hover": "#0369a1",
        "--color-success": "#059669",
        "--color-warning": "#d97706",
        "--color-error": "#dc2626",
      },
      syntaxTokens: {
        "--color-syntax-keyword": "#0369a1",
        "--color-syntax-string": "#059669",
        "--color-syntax-number": "#ea580c",
        "--color-syntax-constant": "#7c3aed",
        "--color-syntax-comment": "#64748b",
        "--color-syntax-variable": "#dc2626",
        "--color-syntax-property": "#0284c7",
        "--color-syntax-type": "#7c2d12",
        "--color-syntax-function": "#7c3aed",
        "--color-syntax-operator": "#0369a1",
        "--color-syntax-punctuation": "#164e63",
        "--color-syntax-boolean": "#ea580c",
        "--color-syntax-null": "#ea580c",
        "--color-syntax-regex": "#059669",
        "--color-syntax-jsx": "#0284c7",
        "--color-syntax-jsx-attribute": "#7c3aed",
      },
    },
    {
      id: "sunset-glow",
      name: "Sunset Glow",
      description: "Warm orange and pink tones like a sunset",
      category: "Light",
      icon: <Sparkles size={14} />,
      isDark: true,
      cssVariables: {
        "--color-background": "#1c1917",
        "--color-background-secondary": "#292524",
        "--color-background-tertiary": "#44403c",
        "--color-text": "#fbbf24",
        "--color-text-secondary": "#f59e0b",
        "--color-text-lighter": "#fcd34d",
        "--color-border": "#78716c",
        "--color-border-light": "#57534e",
        "--color-accent": "#f97316",
        "--color-accent-hover": "#ea580c",
        "--color-success": "#22c55e",
        "--color-warning": "#eab308",
        "--color-error": "#ef4444",
      },
      syntaxTokens: {
        "--color-syntax-keyword": "#f472b6",
        "--color-syntax-string": "#34d399",
        "--color-syntax-number": "#fb7185",
        "--color-syntax-constant": "#a78bfa",
        "--color-syntax-comment": "#9ca3af",
        "--color-syntax-variable": "#fbbf24",
        "--color-syntax-property": "#60a5fa",
        "--color-syntax-type": "#f97316",
        "--color-syntax-function": "#c084fc",
        "--color-syntax-operator": "#f472b6",
        "--color-syntax-punctuation": "#fbbf24",
        "--color-syntax-boolean": "#fb7185",
        "--color-syntax-null": "#fb7185",
        "--color-syntax-regex": "#34d399",
        "--color-syntax-jsx": "#60a5fa",
        "--color-syntax-jsx-attribute": "#c084fc",
      },
    },
  ];
}

// Export the extension instance
export const customColorfulThemesExtension = new CustomColorfulThemesExtension();

// Example of how to load this extension:
// import { extensionManager } from "../../extension-manager";
// import { customColorfulThemesExtension } from "./custom-theme-example";
//
// extensionManager.loadExtension(customColorfulThemesExtension);
