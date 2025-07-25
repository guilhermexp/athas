import Dropdown from "@/components/ui/dropdown";
import Section, { SettingRow } from "@/components/ui/section";
import { useSettingsStore } from "@/stores/settings-store";

type Theme = "auto" | "athas-light" | "athas-dark";

const themeOptions: { value: Theme; label: string }[] = [
  { value: "auto", label: "Auto (System)" },
  { value: "athas-light", label: "Athas Light" },
  { value: "athas-dark", label: "Athas Dark" },
];

export const ThemeSettings = () => {
  const { settings, updateTheme } = useSettingsStore();

  return (
    <div className="space-y-4">
      <Section title="Appearance">
        <SettingRow
          label="Theme"
          description={
            settings.theme === "auto"
              ? "Automatically switches between Athas Light and Dark based on system preference"
              : "Choose your preferred color theme"
          }
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
