import { Moon } from "lucide-react";
import { BaseThemeExtension } from "../base-theme-extension";
import type { ThemeDefinition } from "../types";

class OneDarkExtension extends BaseThemeExtension {
  readonly name = "One Dark";
  readonly version = "1.0.0";
  readonly description = "One Dark theme variants - popular dark theme from Atom editor";

  readonly themes: ThemeDefinition[] = [
    {
      id: "one-dark",
      name: "One Dark",
      description: "Original One Dark theme with balanced colors",
      category: "Dark",
      icon: <Moon size={14} />,
      isDark: true,
      cssVariables: {
        "--tw-primary-bg": "#282c34",
        "--tw-secondary-bg": "#21252b",
        "--tw-text": "#abb2bf",
        "--tw-text-light": "#9da5b4",
        "--tw-text-lighter": "#5c6370",
        "--tw-border": "#3e4451",
        "--tw-hover": "#2c313c",
        "--tw-selected": "#3e4451",
        "--tw-accent": "#61afef",
      },
      syntaxTokens: {
        "--color-syntax-keyword": "#c678dd",
        "--color-syntax-string": "#98c379",
        "--color-syntax-number": "#d19a66",
        "--color-syntax-comment": "#5c6370",
        "--color-syntax-variable": "#e06c75",
        "--color-syntax-function": "#61afef",
        "--color-syntax-constant": "#d19a66",
        "--color-syntax-property": "#e06c75",
        "--color-syntax-type": "#e5c07b",
        "--color-syntax-operator": "#56b6c2",
        "--color-syntax-punctuation": "#abb2bf",
        "--color-syntax-boolean": "#d19a66",
        "--color-syntax-null": "#d19a66",
        "--color-syntax-regex": "#98c379",
        "--color-syntax-jsx": "#e06c75",
        "--color-syntax-jsx-attribute": "#d19a66",
      },
    },
    {
      id: "one-dark-pro",
      name: "One Dark Pro",
      description: "Enhanced variant with improved contrast",
      category: "Dark",
      icon: <Moon size={14} />,
      isDark: true,
      cssVariables: {
        "--tw-primary-bg": "#1e2127",
        "--tw-secondary-bg": "#282c34",
        "--tw-text": "#abb2bf",
        "--tw-text-light": "#9da5b4",
        "--tw-text-lighter": "#5c6370",
        "--tw-border": "#3e4451",
        "--tw-hover": "#2c313c",
        "--tw-selected": "#3e4451",
        "--tw-accent": "#61afef",
      },
      syntaxTokens: {
        "--color-syntax-keyword": "#c678dd",
        "--color-syntax-string": "#98c379",
        "--color-syntax-number": "#d19a66",
        "--color-syntax-comment": "#5c6370",
        "--color-syntax-variable": "#e06c75",
        "--color-syntax-function": "#61afef",
        "--color-syntax-constant": "#d19a66",
        "--color-syntax-property": "#e06c75",
        "--color-syntax-type": "#e5c07b",
        "--color-syntax-operator": "#56b6c2",
        "--color-syntax-punctuation": "#abb2bf",
        "--color-syntax-boolean": "#d19a66",
        "--color-syntax-null": "#d19a66",
        "--color-syntax-regex": "#98c379",
        "--color-syntax-jsx": "#e06c75",
        "--color-syntax-jsx-attribute": "#d19a66",
      },
    },
  ];
}

export const oneDarkExtension = new OneDarkExtension();