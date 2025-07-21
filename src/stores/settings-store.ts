import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { combine } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { ThemeType } from "../types/theme";

export interface Settings {
  theme: ThemeType;
  autoThemeLight: ThemeType;
  autoThemeDark: ThemeType;
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  vimMode: boolean;
  aiCompletion: boolean;
  sidebarPosition: "left" | "right";
}

const defaultSettings: Settings = {
  theme: "dark", // Changed from "auto" since we don't support continuous monitoring
  autoThemeLight: "light",
  autoThemeDark: "dark",
  fontSize: 14,
  fontFamily: "JetBrains Mono, Consolas, 'Courier New', monospace",
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
  autoSave: true,
  vimMode: false,
  aiCompletion: true,
  sidebarPosition: "left",
};

// Theme class constants
const ALL_THEME_CLASSES = [
  "force-light",
  "force-dark",
  "force-midnight",
  "force-tokyo-night",
  "force-tokyonight",
  "force-dracula",
  "force-nord",
  "force-github",
  "force-github-dark",
  "force-github-light",
  "force-one-dark",
  "force-one-dark-pro",
  "force-material",
  "force-material-deep-ocean",
  "force-ayu-dark",
  "force-vesper",
  "force-catppuccin",
  "force-catppuccin-mocha",
  "force-catppuccin-macchiato",
  "force-catppuccin-frappe",
  "force-catppuccin-latte",
  "force-tokyo-night-storm",
  "force-tokyo-night-light",
  "force-dracula-soft",
  "force-nord-light",
  "force-github-dark-dimmed",
  "force-one-light-pro",
  "force-material-palenight",
  "force-material-lighter",
  "force-gruvbox",
  "force-gruvbox-light",
  "force-solarized-dark",
  "force-solarized-light",
  "force-synthwave-84",
  "force-monokai",
  "force-monokai-pro",
  "force-ayu",
  "force-ayu-mirage",
  "force-ayu-light",
  "force-vercel-dark",
  "force-aura",
];

// Apply theme to document
const applyTheme = (theme: ThemeType) => {
  if (typeof window === "undefined") return;

  // Remove all existing theme classes
  ALL_THEME_CLASSES.forEach(cls => document.documentElement.classList.remove(cls));

  // Apply new theme if not auto
  if (theme && theme !== "auto") {
    let themeClass = `force-${theme}`;
    if (theme === "gruvbox-dark") {
      themeClass = "force-gruvbox";
    }
    document.documentElement.classList.add(themeClass);
  }
};

// Get system theme preference
const getSystemThemePreference = (): "light" | "dark" => {
  if (typeof window !== "undefined" && window.matchMedia) {
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch (error) {
      console.warn("matchMedia not available:", error);
    }
  }
  return "dark";
};

// Initialize settings from localStorage
const getInitialSettings = (): Settings => {
  if (typeof window === "undefined") return defaultSettings;

  const stored = localStorage.getItem("athas-code-settings");
  if (stored) {
    try {
      const parsedSettings = JSON.parse(stored);
      return { ...defaultSettings, ...parsedSettings };
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  // No stored settings, detect OS theme for better default
  const systemTheme = getSystemThemePreference();
  const defaultWithOSTheme = {
    ...defaultSettings,
    theme: systemTheme,
  };

  // Also detect OS theme asynchronously for more accurate detection
  invoke<string>("get_system_theme")
    .then(detectedTheme => {
      const theme = detectedTheme === "dark" ? "dark" : "light";
      if (theme !== systemTheme && !localStorage.getItem("athas-code-settings")) {
        // Update to more accurate theme if user hasn't set preferences yet
        localStorage.setItem(
          "athas-code-settings",
          JSON.stringify({
            ...defaultWithOSTheme,
            theme,
          }),
        );
        applyTheme(theme as ThemeType);
      }
    })
    .catch(() => {
      // Tauri command failed, stick with browser detection
    });

  return defaultWithOSTheme;
};

// Apply initial theme
const initialSettings = getInitialSettings();
if (typeof window !== "undefined") {
  // Apply theme immediately on module load
  applyTheme(initialSettings.theme);
}

export const useSettingsStore = create(
  immer(
    combine(
      {
        settings: getInitialSettings(),
      },
      (set, get) => ({
        // Update settings from JSON string
        updateSettingsFromJSON: (jsonString: string): boolean => {
          try {
            const parsedSettings = JSON.parse(jsonString);
            const validatedSettings = { ...defaultSettings, ...parsedSettings };

            set(state => {
              state.settings = validatedSettings;
            });

            // Save to localStorage
            localStorage.setItem("athas-code-settings", JSON.stringify(validatedSettings, null, 2));
            return true;
          } catch (error) {
            console.error("Error parsing settings JSON:", error);
            return false;
          }
        },

        // Update individual setting
        updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => {
          console.log(`Updating setting ${key} to:`, value);
          set(state => {
            state.settings[key] = value;
          });

          // Save to localStorage
          const newSettings = get().settings;
          localStorage.setItem("athas-code-settings", JSON.stringify(newSettings, null, 2));
        },

        // Get settings as formatted JSON string
        getSettingsJSON: () => {
          return JSON.stringify(get().settings, null, 2);
        },

        // Save settings
        saveSettings: (newSettings: Settings) => {
          set(state => {
            state.settings = newSettings;
          });
          localStorage.setItem("athas-code-settings", JSON.stringify(newSettings, null, 2));
        },

        // Update theme
        updateTheme: (theme: ThemeType) => {
          set(state => {
            state.settings.theme = theme;
          });
          localStorage.setItem("athas-code-settings", JSON.stringify(get().settings, null, 2));

          // Apply theme to document immediately
          applyTheme(theme);
        },
      }),
    ),
  ),
);
