import { create } from "zustand";

interface ThemeStore {
  currentTheme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

export const useThemeStore = create<ThemeStore>(set => ({
  currentTheme: document.documentElement.classList.contains("force-athas-light") ? "light" : "dark",

  setTheme: (theme: "light" | "dark") => {
    set({ currentTheme: theme });
  },
}));
