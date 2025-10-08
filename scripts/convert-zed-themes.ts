#!/usr/bin/env bun
/**
 * CLI tool to convert Zed themes to Athas format
 *
 * Usage:
 *   bun run scripts/convert-zed-themes.ts <zed-theme.json>
 *   bun run scripts/convert-zed-themes.ts --all ~/.config/zed/themes
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, basename } from "path";

interface ZedTheme {
  $schema?: string;
  name: string;
  author?: string;
  themes: Array<{
    name: string;
    appearance: "light" | "dark";
    style: Record<string, any>;
  }>;
}

const ZED_TO_ATHAS_MAPPING: Record<string, string> = {
  "background": "--tw-primary-bg",
  "editor.background": "--tw-editor-bg",
  "elevated_surface.background": "--tw-secondary-bg",
  "surface.background": "--tw-secondary-bg",
  "panel.background": "--tw-panel-bg",
  "text": "--tw-text",
  "editor.foreground": "--tw-text",
  "text.muted": "--tw-text-light",
  "text.placeholder": "--tw-text-lighter",
  "text.disabled": "--tw-text-disabled",
  "text.accent": "--tw-accent",
  "border": "--tw-border",
  "border.variant": "--tw-border-variant",
  "border.focused": "--tw-border-focused",
  "border.selected": "--tw-border-selected",
  "element.hover": "--tw-hover",
  "element.active": "--tw-active",
  "element.selected": "--tw-selected",
  "status_bar.background": "--tw-statusbar-bg",
  "title_bar.background": "--tw-titlebar-bg",
  "tab_bar.background": "--tw-tabbar-bg",
  "tab.active_background": "--tw-tab-active-bg",
  "tab.inactive_background": "--tw-tab-inactive-bg",
  "toolbar.background": "--tw-toolbar-bg",
  "editor.gutter.background": "--tw-gutter-bg",
  "editor.active_line.background": "--tw-active-line-bg",
  "editor.line_number": "--tw-line-number",
  "editor.active_line_number": "--tw-active-line-number",
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
  "scrollbar.thumb.background": "--tw-scrollbar-thumb",
  "scrollbar.thumb.hover_background": "--tw-scrollbar-thumb-hover",
  "scrollbar.track.background": "--tw-scrollbar-track",
  "error": "--tw-error",
  "warning": "--tw-warning",
  "success": "--tw-success",
  "info": "--tw-info",
  "hint": "--tw-hint",
  "version_control.added": "--tw-git-added",
  "version_control.modified": "--tw-git-modified",
  "version_control.deleted": "--tw-git-deleted",
};

function removeAlpha(color: string): string {
  return color.length === 9 ? color.substring(0, 7) : color;
}

function convertZedThemeToToml(zedTheme: ZedTheme): string {
  let toml = `# Converted from Zed theme: ${zedTheme.name}\n`;
  if (zedTheme.author) {
    toml += `# Author: ${zedTheme.author}\n`;
  }
  toml += `# Original schema: ${zedTheme.$schema || "https://zed.dev/schema/themes/v0.2.0.json"}\n\n`;

  zedTheme.themes.forEach((variant, index) => {
    if (index > 0) toml += "\n";

    const themeId = `${zedTheme.name.toLowerCase().replace(/\s+/g, "-")}-${variant.appearance}`;

    toml += `[[themes]]\n`;
    toml += `id = "${themeId}"\n`;
    toml += `name = "${variant.name}"\n`;
    toml += `description = "Converted from Zed theme ${zedTheme.name}"\n`;
    toml += `category = "${variant.appearance === "dark" ? "Dark" : "Light"}"\n`;
    toml += `is_dark = ${variant.appearance === "dark"}\n`;

    // CSS variables
    toml += `\n[themes.css_variables]\n`;
    Object.entries(ZED_TO_ATHAS_MAPPING).forEach(([zedKey, athosKey]) => {
      const value = variant.style[zedKey];
      if (value && typeof value === "string") {
        toml += `"${athosKey}" = "${removeAlpha(value)}"\n`;
      }
    });

    // Syntax tokens
    if (variant.style.syntax) {
      toml += `\n[themes.syntax_tokens]\n`;
      const syntaxMap: Record<string, string> = {
        "keyword": "--color-syntax-keyword",
        "string": "--color-syntax-string",
        "number": "--color-syntax-number",
        "comment": "--color-syntax-comment",
        "variable": "--color-syntax-variable",
        "function": "--color-syntax-function",
        "type": "--color-syntax-type",
        "constant": "--color-syntax-constant",
        "property": "--color-syntax-property",
        "operator": "--color-syntax-operator",
        "punctuation": "--color-syntax-punctuation",
      };

      Object.entries(syntaxMap).forEach(([zedKey, athosKey]) => {
        const syntaxItem = variant.style.syntax[zedKey];
        if (syntaxItem?.color) {
          toml += `"${athosKey}" = "${removeAlpha(syntaxItem.color)}"\n`;
        }
      });
    }

    toml += `\n`;
  });

  return toml;
}

function convertFile(inputPath: string, outputDir: string) {
  try {
    const jsonContent = readFileSync(inputPath, "utf-8");
    const zedTheme: ZedTheme = JSON.parse(jsonContent);
    const tomlContent = convertZedThemeToToml(zedTheme);

    const outputFileName = `${zedTheme.name.toLowerCase().replace(/\s+/g, "-")}.toml`;
    const outputPath = join(outputDir, outputFileName);

    writeFileSync(outputPath, tomlContent, "utf-8");
    console.log(`✅ Converted: ${basename(inputPath)} → ${outputFileName}`);
  } catch (error) {
    console.error(`❌ Failed to convert ${inputPath}:`, error);
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  bun run scripts/convert-zed-themes.ts <zed-theme.json>
  bun run scripts/convert-zed-themes.ts --all <zed-themes-directory>

Examples:
  bun run scripts/convert-zed-themes.ts ~/.config/zed/themes/my-theme.json
  bun run scripts/convert-zed-themes.ts --all ~/.config/zed/themes
    `);
    process.exit(1);
  }

  const outputDir = join(process.cwd(), "src/extensions/themes/builtin");

  if (args[0] === "--all") {
    const themesDir = args[1];
    if (!themesDir) {
      console.error("❌ Please provide a themes directory");
      process.exit(1);
    }

    const files = readdirSync(themesDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    console.log(`🔄 Converting ${jsonFiles.length} themes from ${themesDir}...\n`);

    jsonFiles.forEach((file) => {
      convertFile(join(themesDir, file), outputDir);
    });

    console.log(`\n✨ Done! Converted ${jsonFiles.length} themes to ${outputDir}`);
  } else {
    const inputPath = args[0];
    console.log(`🔄 Converting ${inputPath}...\n`);
    convertFile(inputPath, outputDir);
    console.log(`\n✨ Done! Theme saved to ${outputDir}`);
  }
}

main();
