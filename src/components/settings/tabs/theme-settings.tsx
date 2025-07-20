import Dropdown from "@/components/ui/dropdown";
import Section, { SettingRow } from "@/components/ui/section";
import { useSettingsStore } from "@/stores/settings-store";
import type { ThemeType } from "@/types/theme";

const themeOptions: { value: ThemeType; label: string }[] = [
  { value: "auto", label: "Auto (System)" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "midnight", label: "Midnight" },
  { value: "catppuccin-mocha", label: "Catppuccin Mocha" },
  { value: "catppuccin-macchiato", label: "Catppuccin Macchiato" },
  { value: "catppuccin-frappe", label: "Catppuccin Frappe" },
  { value: "catppuccin-latte", label: "Catppuccin Latte" },
  { value: "tokyo-night", label: "Tokyo Night" },
  { value: "tokyo-night-storm", label: "Tokyo Night Storm" },
  { value: "tokyo-night-light", label: "Tokyo Night Light" },
  { value: "dracula", label: "Dracula" },
  { value: "dracula-soft", label: "Dracula Soft" },
  { value: "nord", label: "Nord" },
  { value: "nord-light", label: "Nord Light" },
  { value: "github-dark", label: "GitHub Dark" },
  { value: "github-dark-dimmed", label: "GitHub Dark Dimmed" },
  { value: "github-light", label: "GitHub Light" },
  { value: "one-dark-pro", label: "One Dark Pro" },
  { value: "one-light-pro", label: "One Light Pro" },
  { value: "material-deep-ocean", label: "Material Deep Ocean" },
  { value: "material-palenight", label: "Material Palenight" },
  { value: "material-lighter", label: "Material Lighter" },
  { value: "gruvbox-dark", label: "Gruvbox Dark" },
  { value: "gruvbox-light", label: "Gruvbox Light" },
  { value: "solarized-dark", label: "Solarized Dark" },
  { value: "solarized-light", label: "Solarized Light" },
  { value: "synthwave-84", label: "Synthwave '84" },
  { value: "monokai-pro", label: "Monokai Pro" },
  { value: "vesper", label: "Vesper" },
  { value: "aura", label: "Aura" },
  { value: "vercel-dark", label: "Vercel Dark" },
  { value: "ayu-dark", label: "Ayu Dark" },
  { value: "ayu-mirage", label: "Ayu Mirage" },
  { value: "ayu-light", label: "Ayu Light" },
];

export const ThemeSettings = () => {
  const { settings, updateTheme, updateSetting } = useSettingsStore();

  const nonAutoThemes = themeOptions.filter(t => t.value !== "auto");

  return (
    <div className="space-y-4">
      <Section title="Appearance">
        <SettingRow label="Theme" description="Choose your preferred color theme">
          <Dropdown
            value={settings.theme}
            options={themeOptions}
            onChange={value => updateTheme(value as ThemeType)}
            className="w-40"
            size="xs"
          />
        </SettingRow>
      </Section>

      {settings.theme === "auto" && (
        <Section title="Auto Theme Preferences">
          <SettingRow label="Light Mode" description="Theme for light system mode">
            <Dropdown
              value={settings.autoThemeLight}
              options={nonAutoThemes}
              onChange={value => updateSetting("autoThemeLight", value as ThemeType)}
              className="w-32"
              size="xs"
            />
          </SettingRow>

          <SettingRow label="Dark Mode" description="Theme for dark system mode">
            <Dropdown
              value={settings.autoThemeDark}
              options={nonAutoThemes}
              onChange={value => updateSetting("autoThemeDark", value as ThemeType)}
              className="w-32"
              size="xs"
            />
          </SettingRow>
        </Section>
      )}
    </div>
  );
};
