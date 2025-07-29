import type { ThemeDefinition } from "./types";

/**
 * Utility to convert ThemeDefinition to TOML format string
 * This can be used to convert existing TSX themes to TOML files
 */
export function convertThemeToToml(themes: ThemeDefinition[]): string {
  let tomlContent = "";

  themes.forEach((theme, index) => {
    if (index > 0) {
      tomlContent += "\n";
    }

    tomlContent += `[[themes]]\n`;
    tomlContent += `id = "${theme.id}"\n`;
    tomlContent += `name = "${theme.name}"\n`;
    tomlContent += `description = "${theme.description}"\n`;
    tomlContent += `category = "${theme.category}"\n`;

    if (theme.isDark !== undefined) {
      tomlContent += `is_dark = ${theme.isDark}\n`;
    }

    tomlContent += `\n[themes.css_variables]\n`;
    Object.entries(theme.cssVariables).forEach(([key, value]) => {
      tomlContent += `"${key}" = "${value}"\n`;
    });

    if (theme.syntaxTokens) {
      tomlContent += `\n[themes.syntax_tokens]\n`;
      Object.entries(theme.syntaxTokens).forEach(([key, value]) => {
        tomlContent += `"${key}" = "${value}"\n`;
      });
    }

    tomlContent += `\n`;
  });

  return tomlContent;
}

/**
 * Utility to generate TOML content from theme definitions and save it
 * This is useful for batch converting existing themes
 */
export async function saveThemeAsToml(themes: ThemeDefinition[], filename: string): Promise<void> {
  const tomlContent = convertThemeToToml(themes);

  // In a real application, you might use Tauri's fs plugin to save the file
  console.log(`TOML content for ${filename}:`);
  console.log(tomlContent);

  // For now, just log the content - users can copy it to create TOML files
  return Promise.resolve();
}
