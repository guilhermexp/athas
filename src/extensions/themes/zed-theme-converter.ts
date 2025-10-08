/**
 * Zed Theme Converter
 *
 * Converts Zed Editor themes (JSON) to Athas themes (TOML)
 *
 * Usage:
 *   import { convertZedTheme } from './zed-theme-converter';
 *   const athosTheme = await convertZedTheme('/path/to/zed-theme.json');
 */

export interface ZedTheme {
  $schema?: string;
  name: string;
  author?: string;
  themes: ZedThemeVariant[];
}

export interface ZedThemeVariant {
  name: string;
  appearance: "light" | "dark";
  style: ZedThemeStyle;
}

export interface ZedThemeStyle {
  // Background colors
  background?: string;
  "elevated_surface.background"?: string;
  "surface.background"?: string;
  "element.background"?: string;
  "element.hover"?: string;
  "element.active"?: string;
  "element.selected"?: string;

  // Editor
  "editor.background"?: string;
  "editor.foreground"?: string;
  "editor.gutter.background"?: string;
  "editor.active_line.background"?: string;
  "editor.line_number"?: string;
  "editor.active_line_number"?: string;

  // Terminal
  "terminal.background"?: string;
  "terminal.foreground"?: string;
  "terminal.ansi.black"?: string;
  "terminal.ansi.red"?: string;
  "terminal.ansi.green"?: string;
  "terminal.ansi.yellow"?: string;
  "terminal.ansi.blue"?: string;
  "terminal.ansi.magenta"?: string;
  "terminal.ansi.cyan"?: string;
  "terminal.ansi.white"?: string;

  // Text colors
  text?: string;
  "text.muted"?: string;
  "text.placeholder"?: string;
  "text.disabled"?: string;
  "text.accent"?: string;

  // Borders
  border?: string;
  "border.variant"?: string;
  "border.focused"?: string;
  "border.selected"?: string;

  // UI Components
  "status_bar.background"?: string;
  "title_bar.background"?: string;
  "tab_bar.background"?: string;
  "tab.active_background"?: string;
  "tab.inactive_background"?: string;
  "panel.background"?: string;
  "toolbar.background"?: string;

  // Scrollbar
  "scrollbar.thumb.background"?: string;
  "scrollbar.thumb.hover_background"?: string;
  "scrollbar.track.background"?: string;

  // Syntax highlighting
  syntax?: {
    keyword?: { color?: string; font_style?: string };
    string?: { color?: string };
    number?: { color?: string };
    comment?: { color?: string; font_style?: string };
    variable?: { color?: string };
    function?: { color?: string };
    type?: { color?: string };
    constant?: { color?: string };
    property?: { color?: string };
    operator?: { color?: string };
    punctuation?: { color?: string };
  };

  // Status indicators
  error?: string;
  warning?: string;
  success?: string;
  info?: string;
  hint?: string;

  // Git/Version control
  "version_control.added"?: string;
  "version_control.modified"?: string;
  "version_control.deleted"?: string;

  [key: string]: any;
}

/**
 * Mapping from Zed theme properties to Athas CSS variables
 */
const ZED_TO_ATHAS_MAPPING: Record<string, string> = {
  // Primary colors
  background: "--tw-primary-bg",
  "editor.background": "--tw-editor-bg",
  "elevated_surface.background": "--tw-secondary-bg",
  "surface.background": "--tw-secondary-bg",
  "panel.background": "--tw-panel-bg",

  // Text colors
  text: "--tw-text",
  "editor.foreground": "--tw-text",
  "text.muted": "--tw-text-light",
  "text.placeholder": "--tw-text-lighter",
  "text.disabled": "--tw-text-disabled",
  "text.accent": "--tw-accent",

  // Borders
  border: "--tw-border",
  "border.variant": "--tw-border-variant",
  "border.focused": "--tw-border-focused",
  "border.selected": "--tw-border-selected",

  // Element states
  "element.hover": "--tw-hover",
  "element.active": "--tw-active",
  "element.selected": "--tw-selected",

  // UI Components
  "status_bar.background": "--tw-statusbar-bg",
  "title_bar.background": "--tw-titlebar-bg",
  "tab_bar.background": "--tw-tabbar-bg",
  "tab.active_background": "--tw-tab-active-bg",
  "tab.inactive_background": "--tw-tab-inactive-bg",
  "toolbar.background": "--tw-toolbar-bg",

  // Editor specific
  "editor.gutter.background": "--tw-gutter-bg",
  "editor.active_line.background": "--tw-active-line-bg",
  "editor.line_number": "--tw-line-number",
  "editor.active_line_number": "--tw-active-line-number",

  // Terminal
  "terminal.background": "--tw-terminal-bg",
  "terminal.foreground": "--tw-terminal-fg",
  "terminal.ansi.black": "--tw-terminal-ansi-black",
  "terminal.ansi.red": "--tw-terminal-ansi-red",
  "terminal.ansi.green": "--tw-terminal-ansi-green",
  "terminal.ansi.yellow": "--tw-terminal-ansi-yellow",
  "terminal.ansi.blue": "--tw-terminal-ansi-blue",
  "terminal.ansi.magenta": "--tw-terminal-ansi-magenta",
  "terminal.ansi.cyan": "--tw-terminal-ansi-cyan",
  "terminal.ansi.white": "--tw-terminal-ansi-white",

  // Scrollbar
  "scrollbar.thumb.background": "--tw-scrollbar-thumb",
  "scrollbar.thumb.hover_background": "--tw-scrollbar-thumb-hover",
  "scrollbar.track.background": "--tw-scrollbar-track",

  // Status
  error: "--tw-error",
  warning: "--tw-warning",
  success: "--tw-success",
  info: "--tw-info",
  hint: "--tw-hint",

  // Git
  "version_control.added": "--tw-git-added",
  "version_control.modified": "--tw-git-modified",
  "version_control.deleted": "--tw-git-deleted",
};

/**
 * Converts a Zed theme JSON to Athas theme TOML format
 */
export function convertZedThemeToToml(zedTheme: ZedTheme): string {
  let tomlContent = `# Converted from Zed theme: ${zedTheme.name}\n`;
  if (zedTheme.author) {
    tomlContent += `# Author: ${zedTheme.author}\n`;
  }
  tomlContent += `# Original schema: ${zedTheme.$schema || "https://zed.dev/schema/themes/v0.2.0.json"}\n\n`;

  zedTheme.themes.forEach((variant, index) => {
    if (index > 0) {
      tomlContent += "\n";
    }

    const themeId = `${zedTheme.name.toLowerCase().replace(/\s+/g, "-")}-${variant.appearance}`;

    tomlContent += `[[themes]]\n`;
    tomlContent += `id = "${themeId}"\n`;
    tomlContent += `name = "${variant.name}"\n`;
    tomlContent += `description = "Converted from Zed theme ${zedTheme.name}"\n`;
    tomlContent += `category = "${variant.appearance === "dark" ? "Dark" : "Light"}"\n`;
    tomlContent += `is_dark = ${variant.appearance === "dark"}\n`;

    // Convert CSS variables
    tomlContent += `\n[themes.css_variables]\n`;
    const cssVariables = convertStyleToCssVariables(variant.style);
    Object.entries(cssVariables).forEach(([key, value]) => {
      tomlContent += `"${key}" = "${value}"\n`;
    });

    // Convert syntax tokens
    if (variant.style.syntax) {
      tomlContent += `\n[themes.syntax_tokens]\n`;
      const syntaxTokens = convertSyntaxTokens(variant.style.syntax);
      Object.entries(syntaxTokens).forEach(([key, value]) => {
        tomlContent += `"${key}" = "${value}"\n`;
      });
    }

    tomlContent += `\n`;
  });

  return tomlContent;
}

/**
 * Converts Zed style properties to Athas CSS variables
 */
function convertStyleToCssVariables(style: ZedThemeStyle): Record<string, string> {
  const cssVariables: Record<string, string> = {};

  // Map known properties
  Object.entries(ZED_TO_ATHAS_MAPPING).forEach(([zedKey, athosKey]) => {
    const value = style[zedKey];
    if (value && typeof value === "string") {
      // Remove alpha channel if present (Zed uses #rrggbbaa, we use #rrggbb)
      const color = value.length === 9 ? value.substring(0, 7) : value;
      cssVariables[athosKey] = color;
    }
  });

  return cssVariables;
}

/**
 * Converts Zed syntax highlighting to Athas syntax tokens
 */
function convertSyntaxTokens(syntax: ZedThemeStyle["syntax"]): Record<string, string> {
  const tokens: Record<string, string> = {};

  if (!syntax) return tokens;

  const syntaxMapping: Record<string, string> = {
    keyword: "--color-syntax-keyword",
    string: "--color-syntax-string",
    number: "--color-syntax-number",
    comment: "--color-syntax-comment",
    variable: "--color-syntax-variable",
    function: "--color-syntax-function",
    type: "--color-syntax-type",
    constant: "--color-syntax-constant",
    property: "--color-syntax-property",
    operator: "--color-syntax-operator",
    punctuation: "--color-syntax-punctuation",
  };

  Object.entries(syntaxMapping).forEach(([zedKey, athosKey]) => {
    // Some theme schemas specify a fixed key set; cast to index signature for dynamic mapping
    const syntaxItem = (syntax as Record<string, { color?: string }>)[zedKey];
    if (syntaxItem && typeof syntaxItem === "object" && syntaxItem.color) {
      const color =
        syntaxItem.color.length === 9 ? syntaxItem.color.substring(0, 7) : syntaxItem.color;
      tokens[athosKey] = color;
    }
  });

  return tokens;
}

/**
 * Loads a Zed theme from JSON file and converts to TOML
 */
export async function convertZedThemeFile(filePath: string): Promise<string> {
  try {
    // In Tauri, use the fs plugin to read the file
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const jsonContent = await readTextFile(filePath);
    const zedTheme: ZedTheme = JSON.parse(jsonContent);
    return convertZedThemeToToml(zedTheme);
  } catch (error) {
    console.error(`Failed to convert Zed theme from ${filePath}:`, error);
    throw error;
  }
}

/**
 * Saves converted theme to Athas themes directory
 */
export async function saveConvertedTheme(tomlContent: string, themeName: string): Promise<void> {
  try {
    const { writeTextFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");
    const fileName = `${themeName.toLowerCase().replace(/\s+/g, "-")}.toml`;
    const filePath = `src/extensions/themes/builtin/${fileName}`;

    await writeTextFile(filePath, tomlContent, {
      baseDir: BaseDirectory.AppData,
    });

    console.log(`Theme saved to: ${filePath}`);
  } catch (error) {
    console.error(`Failed to save theme:`, error);
    throw error;
  }
}

/**
 * Batch convert all themes from Zed themes directory
 */
export async function convertAllZedThemes(zedThemesDir: string): Promise<void> {
  try {
    const { readDir } = await import("@tauri-apps/plugin-fs");
    const entries = await readDir(zedThemesDir);

    for (const entry of entries) {
      if (entry.name?.endsWith(".json")) {
        console.log(`Converting ${entry.name}...`);
        const tomlContent = await convertZedThemeFile(`${zedThemesDir}/${entry.name}`);
        const themeName = entry.name.replace(".json", "");
        await saveConvertedTheme(tomlContent, themeName);
      }
    }

    console.log("All themes converted successfully!");
  } catch (error) {
    console.error("Failed to batch convert themes:", error);
    throw error;
  }
}
