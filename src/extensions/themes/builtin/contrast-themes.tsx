import { Eye, Sun, Moon } from "lucide-react";
import { BaseThemeExtension } from "../base-theme-extension";
import type { ThemeDefinition } from "../types";

class ContrastThemesExtension extends BaseThemeExtension {
  readonly name = "High Contrast Themes";
  readonly version = "1.0.0";
  readonly description = "High contrast themes for better accessibility";

  readonly themes: ThemeDefinition[] = [
    {
      id: "high-contrast-light",
      name: "High Contrast Light",
      description: "Maximum contrast light theme for accessibility",
      category: "Light",
      icon: <Sun size={14} />,
      isDark: false,
      cssVariables: {
        "--tw-primary-bg": "#ffffff",
        "--tw-secondary-bg": "#f5f5f5",
        "--tw-text": "#000000",
        "--tw-text-light": "#333333",
        "--tw-text-lighter": "#666666",
        "--tw-border": "#cccccc",
        "--tw-hover": "#e5e5e5",
        "--tw-selected": "#e5e5e5",
        "--tw-accent": "#0066cc",
      },
      syntaxTokens: {
        "--color-syntax-keyword": "#0000ff",
        "--color-syntax-string": "#008800",
        "--color-syntax-number": "#cc6600",
        "--color-syntax-comment": "#666666",
        "--color-syntax-variable": "#cc0000",
        "--color-syntax-function": "#8800cc",
        "--color-syntax-constant": "#cc6600",
        "--color-syntax-property": "#0066cc",
        "--color-syntax-type": "#cc6600",
        "--color-syntax-operator": "#0000ff",
        "--color-syntax-punctuation": "#000000",
        "--color-syntax-boolean": "#cc6600",
        "--color-syntax-null": "#cc6600",
        "--color-syntax-regex": "#008800",
        "--color-syntax-jsx": "#0066cc",
        "--color-syntax-jsx-attribute": "#8800cc",
      },
    },
    {
      id: "high-contrast-dark",
      name: "High Contrast Dark",
      description: "Maximum contrast dark theme for accessibility",
      category: "Dark",
      icon: <Moon size={14} />,
      isDark: true,
      cssVariables: {
        "--tw-primary-bg": "#000000",
        "--tw-secondary-bg": "#1a1a1a",
        "--tw-text": "#ffffff",
        "--tw-text-light": "#cccccc",
        "--tw-text-lighter": "#999999",
        "--tw-border": "#666666",
        "--tw-hover": "#333333",
        "--tw-selected": "#333333",
        "--tw-accent": "#66ccff",
      },
      syntaxTokens: {
        "--tw-syntax-keyword": "#66ccff",
        "--tw-syntax-string": "#66ff66",
        "--tw-syntax-number": "#ffcc66",
        "--tw-syntax-comment": "#999999",
        "--tw-syntax-variable": "#ff9999",
        "--tw-syntax-function": "#cc99ff",
        "--tw-syntax-tag": "#66ccff",
        "--tw-syntax-attribute": "#cc99ff",
        "--tw-syntax-punctuation": "#ffffff",
      },
    },
    {
      id: "monochrome",
      name: "Monochrome",
      description: "Pure black and white theme for minimal distraction",
      category: "Dark",
      icon: <Eye size={14} />,
      isDark: true,
      cssVariables: {
        "--tw-primary-bg": "#000000",
        "--tw-secondary-bg": "#111111",
        "--tw-text": "#ffffff",
        "--tw-text-light": "#cccccc",
        "--tw-text-lighter": "#888888",
        "--tw-border": "#444444",
        "--tw-hover": "#222222",
        "--tw-selected": "#222222",
        "--tw-accent": "#ffffff",
      },
      syntaxTokens: {
        "--tw-syntax-keyword": "#ffffff",
        "--tw-syntax-string": "#cccccc",
        "--tw-syntax-number": "#aaaaaa",
        "--tw-syntax-comment": "#666666",
        "--tw-syntax-variable": "#cccccc",
        "--tw-syntax-function": "#ffffff",
        "--tw-syntax-tag": "#ffffff",
        "--tw-syntax-attribute": "#ffffff",
        "--tw-syntax-punctuation": "#ffffff",
      },
    },
  ];
}

export const contrastThemesExtension = new ContrastThemesExtension();