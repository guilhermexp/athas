import { Moon } from "lucide-react";
import { BaseThemeExtension } from "../base-theme-extension";
import type { ThemeDefinition } from "../types";

class NordExtension extends BaseThemeExtension {
  readonly name = "Nord";
  readonly version = "1.0.0";
  readonly description = "Nord theme variants - arctic, north-bluish color palette";

  readonly themes: ThemeDefinition[] = [
    {
      id: "nord",
      name: "Nord",
      description: "Clean arctic theme with north-bluish colors",
      category: "Dark",
      icon: <Moon size={14} />,
      isDark: true,
      cssVariables: {
        "--tw-primary-bg": "#2e3440",
        "--tw-secondary-bg": "#3b4252",
        "--tw-text": "#eceff4",
        "--tw-text-light": "#d8dee9",
        "--tw-text-lighter": "#81a1c1",
        "--tw-border": "#4c566a",
        "--tw-hover": "#434c5e",
        "--tw-selected": "#4c566a",
        "--tw-accent": "#88c0d0",
      },
      syntaxTokens: {
        "--color-syntax-keyword": "#81a1c1",
        "--color-syntax-string": "#a3be8c",
        "--color-syntax-number": "#b48ead",
        "--color-syntax-comment": "#616e88",
        "--color-syntax-variable": "#d08770",
        "--color-syntax-function": "#88c0d0",
        "--color-syntax-constant": "#b48ead",
        "--color-syntax-property": "#8fbcbb",
        "--color-syntax-type": "#ebcb8b",
        "--color-syntax-operator": "#81a1c1",
        "--color-syntax-punctuation": "#eceff4",
        "--color-syntax-boolean": "#b48ead",
        "--color-syntax-null": "#b48ead",
        "--color-syntax-regex": "#a3be8c",
        "--color-syntax-jsx": "#d08770",
        "--color-syntax-jsx-attribute": "#81a1c1",
      },
    },
    {
      id: "nord-aurora",
      name: "Nord Aurora",
      description: "Nord variant with aurora-inspired accent colors",
      category: "Dark",
      icon: <Moon size={14} />,
      isDark: true,
      cssVariables: {
        "--tw-primary-bg": "#2e3440",
        "--tw-secondary-bg": "#3b4252",
        "--tw-text": "#eceff4",
        "--tw-text-light": "#d8dee9",
        "--tw-text-lighter": "#81a1c1",
        "--tw-border": "#4c566a",
        "--tw-hover": "#434c5e",
        "--tw-selected": "#4c566a",
        "--tw-accent": "#bf616a",
      },
      syntaxTokens: {
        "--color-syntax-keyword": "#bf616a",
        "--color-syntax-string": "#a3be8c",
        "--color-syntax-number": "#d08770",
        "--color-syntax-comment": "#616e88",
        "--color-syntax-variable": "#bf616a",
        "--color-syntax-function": "#5e81ac",
        "--color-syntax-constant": "#d08770",
        "--color-syntax-property": "#88c0d0",
        "--color-syntax-type": "#ebcb8b",
        "--color-syntax-operator": "#81a1c1",
        "--color-syntax-punctuation": "#eceff4",
        "--color-syntax-boolean": "#d08770",
        "--color-syntax-null": "#d08770",
        "--color-syntax-regex": "#a3be8c",
        "--color-syntax-jsx": "#bf616a",
        "--color-syntax-jsx-attribute": "#5e81ac",
      },
    },
  ];
}

export const nordExtension = new NordExtension();