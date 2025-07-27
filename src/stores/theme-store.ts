import { create } from "zustand";
import { createSelectors } from "@/utils/zustand-selectors";
import { themeRegistry } from "@/extensions/themes";

interface ThemeState {
  currentTheme: string;
  actions: ThemeActions;
}

interface ThemeActions {
  setTheme: (theme: string) => void;
  initializeThemes: () => void;
}

const getInitialTheme = (): string => {
  if (document.documentElement.classList.contains("force-athas-light")) {
    return "athas-light";
  }
  if (document.documentElement.classList.contains("force-athas-dark")) {
    return "athas-dark";
  }
  return "auto";
};

export const useThemeStore = createSelectors(
  create<ThemeState>()((set, get) => ({
    currentTheme: getInitialTheme(),
    actions: {
      setTheme: (theme: string) => {
        themeRegistry.applyTheme(theme);
        set({ currentTheme: theme });
      },
      initializeThemes: () => {
        // Register theme change listener from registry
        const unsubscribe = themeRegistry.onThemeChange((themeId) => {
          const currentState = get();
          if (currentState.currentTheme !== themeId) {
            set({ currentTheme: themeId });
          }
        });
        
        // Store the unsubscribe function for cleanup if needed
        (get().actions as any)._unsubscribeThemeChange = unsubscribe;
      },
    },
  })),
);
