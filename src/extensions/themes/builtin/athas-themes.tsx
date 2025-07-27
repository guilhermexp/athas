import { Monitor, Moon, Sun } from "lucide-react";
import { BaseThemeExtension } from "../base-theme-extension";
import type { ThemeDefinition } from "../types";

class AthasThemesExtension extends BaseThemeExtension {
  readonly name = "Athas Built-in Themes";
  readonly version = "1.0.0";
  readonly description = "System themes";

  readonly themes: ThemeDefinition[] = [
    // No themes - GitHub themes are now the defaults
  ];
}

export const athasThemesExtension = new AthasThemesExtension();