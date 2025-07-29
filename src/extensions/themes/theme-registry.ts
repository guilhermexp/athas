import type { ThemeDefinition, ThemeRegistryAPI } from "./types";

class ThemeRegistry implements ThemeRegistryAPI {
  private themes = new Map<string, ThemeDefinition>();
  private currentTheme: string | null = null;
  private changeCallbacks = new Set<(themeId: string) => void>();
  private registryCallbacks = new Set<() => void>();

  registerTheme(theme: ThemeDefinition): void {
    console.log("Theme registry: Registering theme", theme.id, theme.name);
    this.themes.set(theme.id, theme);
    console.log("Theme registry: Total themes after registration:", this.themes.size);
    console.log("Theme registry: All themes:", Array.from(this.themes.keys()));
    this.notifyRegistryChange();
  }

  unregisterTheme(id: string): void {
    this.themes.delete(id);
    if (this.currentTheme === id) {
      this.currentTheme = null;
    }
    this.notifyRegistryChange();
  }

  getTheme(id: string): ThemeDefinition | undefined {
    return this.themes.get(id);
  }

  getAllThemes(): ThemeDefinition[] {
    // Only ensure builtin themes if no themes are loaded at all
    if (this.themes.size === 0) {
      this.ensureBuiltinThemes();
    }
    return Array.from(this.themes.values());
  }

  private ensureBuiltinThemes(): void {
    console.log("Theme registry: Loading fallback builtin themes");
    // Register builtin themes directly without async loading (only if not already present)
    const builtinThemes = this.getBuiltinThemes();
    builtinThemes.forEach((theme) => {
      if (!this.themes.has(theme.id)) {
        console.log("Theme registry: Adding fallback theme", theme.id);
        this.themes.set(theme.id, theme);
      }
    });
  }

  private getBuiltinThemes(): ThemeDefinition[] {
    // Return GitHub themes as default fallback themes
    return [
      {
        id: "github-light",
        name: "GitHub Light",
        description: "Clean light theme inspired by GitHub",
        category: "Light",
        isDark: false,
        cssVariables: {
          "--tw-primary-bg": "#ffffff",
          "--tw-secondary-bg": "#f6f8fa",
          "--tw-text": "#24292f",
          "--tw-text-light": "#656d76",
          "--tw-text-lighter": "#8c959f",
          "--tw-border": "#d0d7de",
          "--tw-hover": "#f3f4f6",
          "--tw-selected": "#eaeef2",
          "--tw-accent": "#0969da",
        },
        syntaxTokens: {
          "--color-syntax-keyword": "#cf222e",
          "--color-syntax-string": "#0a3069",
          "--color-syntax-number": "#0550ae",
          "--color-syntax-comment": "#6e7781",
          "--color-syntax-variable": "#953800",
          "--color-syntax-function": "#8250df",
          "--color-syntax-constant": "#0550ae",
          "--color-syntax-property": "#953800",
          "--color-syntax-type": "#8250df",
          "--color-syntax-operator": "#cf222e",
          "--color-syntax-punctuation": "#24292f",
          "--color-syntax-boolean": "#0550ae",
          "--color-syntax-null": "#0550ae",
          "--color-syntax-regex": "#0a3069",
          "--color-syntax-jsx": "#22863a",
          "--color-syntax-jsx-attribute": "#8250df",
        },
      },
      {
        id: "github-dark",
        name: "GitHub Dark",
        description: "Dark theme inspired by GitHub Dark",
        category: "Dark",
        isDark: true,
        cssVariables: {
          "--tw-primary-bg": "#0d1117",
          "--tw-secondary-bg": "#161b22",
          "--tw-text": "#e6edf3",
          "--tw-text-light": "#7d8590",
          "--tw-text-lighter": "#656d76",
          "--tw-border": "#30363d",
          "--tw-hover": "#21262d",
          "--tw-selected": "#30363d",
          "--tw-accent": "#2f81f7",
        },
        syntaxTokens: {
          "--color-syntax-keyword": "#ff7b72",
          "--color-syntax-string": "#a5d6ff",
          "--color-syntax-number": "#79c0ff",
          "--color-syntax-comment": "#8b949e",
          "--color-syntax-variable": "#ffa657",
          "--color-syntax-function": "#d2a8ff",
          "--color-syntax-constant": "#79c0ff",
          "--color-syntax-property": "#ffa657",
          "--color-syntax-type": "#4ec9b0",
          "--color-syntax-operator": "#ff7b72",
          "--color-syntax-punctuation": "#e6edf3",
          "--color-syntax-boolean": "#79c0ff",
          "--color-syntax-null": "#79c0ff",
          "--color-syntax-regex": "#a5d6ff",
          "--color-syntax-jsx": "#7ee787",
          "--color-syntax-jsx-attribute": "#d2a8ff",
        },
      },
    ];
  }

  getThemesByCategory(category: ThemeDefinition["category"]): ThemeDefinition[] {
    return this.getAllThemes().filter((theme) => theme.category === category);
  }

  applyTheme(id: string): void {
    const theme = this.themes.get(id);
    if (!theme) {
      console.warn(`Theme ${id} not found. Available themes:`, Array.from(this.themes.keys()));
      return;
    }

    console.log(`Theme registry: Applying theme ${id}`, theme);
    console.log("Available themes in registry:", Array.from(this.themes.keys()));

    // Apply CSS variables to document root
    const root = document.documentElement;

    // Clear any existing theme-specific classes
    root.classList.remove("force-athas-light", "force-athas-dark");

    // Apply CSS variables
    Object.entries(theme.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Apply syntax token variables if defined
    if (theme.syntaxTokens) {
      Object.entries(theme.syntaxTokens).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }

    // Handle special theme classes for backward compatibility
    if (id === "github-light") {
      root.classList.add("force-athas-light"); // Keep for backward compatibility
    } else if (id === "github-dark") {
      root.classList.add("force-athas-dark"); // Keep for backward compatibility
    }

    // Set data attribute for the current theme
    root.setAttribute("data-theme", id);

    this.currentTheme = id;
    console.log(`Theme registry: Successfully applied theme ${id}`);
    this.notifyThemeChange(id);
  }

  getCurrentTheme(): string | null {
    return this.currentTheme;
  }

  onThemeChange(callback: (themeId: string) => void): () => void {
    this.changeCallbacks.add(callback);
    return () => {
      this.changeCallbacks.delete(callback);
    };
  }

  onRegistryChange(callback: () => void): () => void {
    this.registryCallbacks.add(callback);
    return () => {
      this.registryCallbacks.delete(callback);
    };
  }

  private notifyThemeChange(themeId: string): void {
    this.changeCallbacks.forEach((callback) => {
      try {
        callback(themeId);
      } catch (error) {
        console.error("Error in theme change callback:", error);
      }
    });
  }

  private notifyRegistryChange(): void {
    this.registryCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("Error in registry change callback:", error);
      }
    });
  }
}

export const themeRegistry = new ThemeRegistry();
