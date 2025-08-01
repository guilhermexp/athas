import { invoke } from "@tauri-apps/api/core";
import { themeRegistry } from "../extensions/themes/theme-registry";
import type { ThemeDefinition } from "../extensions/themes/types";

interface TomlTheme {
  id: string;
  name: string;
  description: string;
  category: "System" | "Light" | "Dark";
  is_dark?: boolean;
  css_variables: Record<string, string>;
  syntax_tokens?: Record<string, string>;
}

export const uploadTheme = async (
  file: File,
): Promise<{ success: boolean; error?: string; theme?: ThemeDefinition }> => {
  try {
    // Read file as text
    const content = await file.text();

    // Create a temporary file path for the backend to process
    const tempFileName = `temp_${Date.now()}_${file.name}`;

    // Save temporary file via Tauri
    await invoke("write_temp_file", {
      fileName: tempFileName,
      content: content,
    });

    // Load theme from the temporary file (using full temp path)
    const tempDir = (await invoke("get_temp_dir")) as string;
    const fullTempPath = `${tempDir}/${tempFileName}`;

    const themes: TomlTheme[] = await invoke("load_single_toml_theme", {
      themePath: fullTempPath,
    });

    // Clean up temporary file
    await invoke("delete_temp_file", {
      fileName: tempFileName,
    });

    if (themes.length === 0) {
      return { success: false, error: "No valid themes found in file" };
    }

    if (themes.length > 1) {
      return { success: false, error: "Multiple themes in one file not supported yet" };
    }

    const tomlTheme = themes[0];

    // Convert to ThemeDefinition
    const themeDefinition: ThemeDefinition = {
      id: tomlTheme.id,
      name: tomlTheme.name,
      description: tomlTheme.description,
      category: tomlTheme.category,
      cssVariables: tomlTheme.css_variables,
      syntaxTokens: tomlTheme.syntax_tokens,
      isDark: tomlTheme.is_dark,
      // No icon for uploaded themes
      icon: undefined,
    };

    // Register the theme
    themeRegistry.registerTheme(themeDefinition);

    return { success: true, theme: themeDefinition };
  } catch (error) {
    console.error("Theme upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload theme",
    };
  }
};
