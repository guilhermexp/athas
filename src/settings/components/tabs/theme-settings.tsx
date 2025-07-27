import Dropdown from "@/components/ui/dropdown";
import Section, { SettingRow } from "@/components/ui/section";
import { useSettingsStore } from "../../stores/settings-store";
import { themeRegistry } from "@/extensions/themes";
import { useEffect, useState } from "react";
import type { ThemeDefinition } from "@/extensions/themes";

type Theme = string;

const useThemeOptions = () => {
  const [themeOptions, setThemeOptions] = useState<{ value: Theme; label: string }[]>([]);

  useEffect(() => {
    const loadThemeOptions = () => {
      const themes = themeRegistry.getAllThemes();
      const options = themes.map((theme: ThemeDefinition) => ({
        value: theme.id,
        label: theme.name,
      }));
      setThemeOptions(options);
    };

    // Load themes immediately
    loadThemeOptions();

    // Listen for registry changes
    const unsubscribe = themeRegistry.onRegistryChange(() => {
      loadThemeOptions();
    });

    return unsubscribe;
  }, []);

  return themeOptions;
};

export const ThemeSettings = () => {
  const { settings, updateTheme } = useSettingsStore();
  const themeOptions = useThemeOptions();

  const getThemeDescription = (themeId: string): string => {
    if (themeId === "auto") {
      return "Automatically switches between Athas Light and Dark based on system preference";
    }
    const theme = themeRegistry.getTheme(themeId);
    return theme?.description || "Choose your preferred color theme";
  };

  return (
    <div className="space-y-4">
      <Section title="Appearance">
        <SettingRow
          label="Theme"
          description={getThemeDescription(settings.theme)}
        >
          <Dropdown
            value={settings.theme}
            options={themeOptions}
            onChange={(value) => updateTheme(value as Theme)}
            className="w-40"
            size="xs"
          />
        </SettingRow>
      </Section>
    </div>
  );
};
