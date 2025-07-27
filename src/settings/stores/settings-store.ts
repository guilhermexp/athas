import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { combine } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { themeRegistry } from "@/extensions/themes";

type Theme = string;

interface Settings {
  theme: Theme;
  autoThemeLight: Theme;
  autoThemeDark: Theme;
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  aiCompletion: boolean;
  sidebarPosition: "left" | "right";
  mouseWheelZoom: boolean;
}

const defaultSettings: Settings = {
  theme: "github-dark", // Use GitHub Dark as default
  autoThemeLight: "github-light",
  autoThemeDark: "github-dark",
  fontSize: 14,
  fontFamily: "JetBrains Mono",
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
  autoSave: true,
  aiCompletion: true,
  sidebarPosition: "left",
  mouseWheelZoom: false,
};

// Theme class constants
const ALL_THEME_CLASSES = ["force-athas-light", "force-athas-dark"];

// Apply theme to document
const applyTheme = (theme: Theme) => {
  if (typeof window === "undefined") return;
  
  console.log(`Settings store: Applying theme ${theme}`);
  
  // Use theme registry for all themes
  themeRegistry.applyTheme(theme);
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

// Determine if a theme is light or dark based on its properties
const getThemeType = (themeId: Theme): "light" | "dark" => {
  const theme = themeRegistry.getTheme(themeId);
  if (theme?.isDark !== undefined) {
    return theme.isDark ? "dark" : "light";
  }
  
  // Fallback: categorize by theme ID patterns
  if (themeId.includes("light") || themeId.includes("latte")) {
    return "light";
  }
  if (themeId.includes("dark") || themeId.includes("mocha") || themeId.includes("night") || themeId.includes("nord")) {
    return "dark";
  }
  
  // Default to dark for unknown themes
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
    theme: systemTheme === "dark" ? "github-dark" : ("github-light" as Theme),
  };

  // Also detect OS theme asynchronously for more accurate detection
  invoke<string>("get_system_theme")
    .then((detectedTheme) => {
      const theme = detectedTheme === "dark" ? "dark" : "light";
      if (theme !== systemTheme && !localStorage.getItem("athas-code-settings")) {
        // Update to more accurate theme if user hasn't set preferences yet
        localStorage.setItem(
          "athas-code-settings",
          JSON.stringify({
            ...defaultWithOSTheme,
            theme: theme === "dark" ? "github-dark" : "github-light",
          }),
        );
        applyTheme(theme === "dark" ? "github-dark" : ("github-light" as Theme));
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
  // Apply theme immediately on module load, but after a small delay to ensure theme registry is loaded
  setTimeout(() => {
    applyTheme(initialSettings.theme);
  }, 100);
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

            set((state) => {
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
          set((state) => {
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
          set((state) => {
            state.settings = newSettings;
          });
          localStorage.setItem("athas-code-settings", JSON.stringify(newSettings, null, 2));
        },

        // Update theme with system mode preference tracking
        updateTheme: (theme: Theme) => {
          const currentSystemMode = getSystemThemePreference();
          
          set((state) => {
            state.settings.theme = theme;
            // Update the preference for the current system mode
            if (currentSystemMode === "light") {
              state.settings.autoThemeLight = theme;
            } else {
              state.settings.autoThemeDark = theme;
            }
          });
          
          localStorage.setItem("athas-code-settings", JSON.stringify(get().settings, null, 2));

          // Apply theme to document immediately
          applyTheme(theme);
        },

        // Get the appropriate theme based on system preference
        getSystemAwareTheme: (): Theme => {
          const { autoThemeLight, autoThemeDark } = get().settings;
          const systemPreference = getSystemThemePreference();
          return systemPreference === "light" ? autoThemeLight : autoThemeDark;
        },

        // Apply system-aware theme
        applySystemAwareTheme: () => {
          const { autoThemeLight, autoThemeDark } = get().settings;
          const systemPreference = getSystemThemePreference();
          const systemAwareTheme = systemPreference === "light" ? autoThemeLight : autoThemeDark;
          
          set((state) => {
            state.settings.theme = systemAwareTheme;
          });
          localStorage.setItem("athas-code-settings", JSON.stringify(get().settings, null, 2));
          applyTheme(systemAwareTheme);
        },
      }),
    ),
  ),
);

// Set up system theme monitoring
if (typeof window !== "undefined") {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  
  const handleSystemThemeChange = () => {
    console.log("System theme changed, applying system-aware theme");
    useSettingsStore.getState().applySystemAwareTheme();
  };

  // Listen for system theme changes
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", handleSystemThemeChange);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(handleSystemThemeChange);
  }

  // Apply system-aware theme on initial load (after a delay to ensure theme registry is loaded)
  setTimeout(() => {
    useSettingsStore.getState().applySystemAwareTheme();
  }, 150);
}
