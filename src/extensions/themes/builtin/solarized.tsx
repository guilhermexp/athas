import { Moon, Sun } from "lucide-react";
import { BaseThemeExtension } from "../base-theme-extension";
import type { ThemeDefinition } from "../types";

class SolarizedExtension extends BaseThemeExtension {
  readonly name = "Solarized";
  readonly version = "1.0.0";
  readonly description = "Solarized theme variants - precision colors for machines and people";

  readonly themes: ThemeDefinition[] = [
    {
      id: "solarized-light",
      name: "Solarized Light",
      description: "Light variant with carefully chosen colors",
      category: "Light",
      icon: <Sun size={14} />,
      isDark: false,
      cssVariables: {
        "--tw-primary-bg": "#fdf6e3",
        "--tw-secondary-bg": "#eee8d5",
        "--tw-text": "#657b83",
        "--tw-text-light": "#839496",
        "--tw-text-lighter": "#93a1a1",
        "--tw-border": "#eee8d5",
        "--tw-hover": "#eee8d5",
        "--tw-selected": "#eee8d5",
        "--tw-accent": "#268bd2",
      },
      syntaxTokens: {
        "--color-syntax-keyword": "#859900",
        "--color-syntax-string": "#2aa198",
        "--color-syntax-number": "#d33682",
        "--color-syntax-comment": "#93a1a1",
        "--color-syntax-variable": "#b58900",
        "--color-syntax-function": "#268bd2",
        "--color-syntax-constant": "#d33682",
        "--color-syntax-property": "#b58900",
        "--color-syntax-type": "#859900",
        "--color-syntax-operator": "#dc322f",
        "--color-syntax-punctuation": "#657b83",
        "--color-syntax-boolean": "#d33682",
        "--color-syntax-null": "#d33682",
        "--color-syntax-regex": "#2aa198",
        "--color-syntax-jsx": "#859900",
        "--color-syntax-jsx-attribute": "#268bd2",
      },
    },
    {
      id: "solarized-dark",
      name: "Solarized Dark",
      description: "Dark variant with carefully chosen colors",
      category: "Dark",
      icon: <Moon size={14} />,
      isDark: true,
      cssVariables: {
        "--tw-primary-bg": "#002b36",
        "--tw-secondary-bg": "#073642",
        "--tw-text": "#839496",
        "--tw-text-light": "#657b83",
        "--tw-text-lighter": "#586e75",
        "--tw-border": "#073642",
        "--tw-hover": "#073642",
        "--tw-selected": "#073642",
        "--tw-accent": "#268bd2",
      },
      syntaxTokens: {
        "--color-syntax-keyword": "#859900",
        "--color-syntax-string": "#2aa198",
        "--color-syntax-number": "#d33682",
        "--color-syntax-comment": "#586e75",
        "--color-syntax-variable": "#b58900",
        "--color-syntax-function": "#268bd2",
        "--color-syntax-constant": "#d33682",
        "--color-syntax-property": "#b58900",
        "--color-syntax-type": "#859900",
        "--color-syntax-operator": "#dc322f",
        "--color-syntax-punctuation": "#839496",
        "--color-syntax-boolean": "#d33682",
        "--color-syntax-null": "#d33682",
        "--color-syntax-regex": "#2aa198",
        "--color-syntax-jsx": "#859900",
        "--color-syntax-jsx-attribute": "#268bd2",
      },
    },
  ];
}

export const solarizedExtension = new SolarizedExtension();
