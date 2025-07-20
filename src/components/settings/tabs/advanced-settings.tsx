import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Section, { SettingRow } from "@/components/ui/section";
import Toggle from "@/components/ui/toggle";

export const AdvancedSettings = () => {
  return (
    <div className="space-y-4">
      <Section title="Performance">
        <SettingRow label="File Watcher" description="Watch for file changes in workspace">
          <Toggle checked={true} onChange={() => {}} size="sm" />
        </SettingRow>

        <SettingRow label="Memory Limit" description="Maximum memory usage (MB)">
          <Input type="number" value={512} onChange={() => {}} className="w-20" size="xs" />
        </SettingRow>
      </Section>

      <Section title="Development">
        <SettingRow label="Developer Mode" description="Enable developer tools and debug features">
          <Toggle checked={false} onChange={() => {}} size="sm" />
        </SettingRow>

        <SettingRow label="Debug Logging" description="Show detailed logs in console">
          <Toggle checked={false} onChange={() => {}} size="sm" />
        </SettingRow>
      </Section>

      <Section title="Extensions">
        <SettingRow
          label="Auto Update Extensions"
          description="Automatically update installed extensions"
        >
          <Toggle checked={true} onChange={() => {}} size="sm" />
        </SettingRow>

        <SettingRow
          label="Extension Host"
          description="Enable extension host for third-party extensions"
        >
          <Toggle checked={false} onChange={() => {}} size="sm" />
        </SettingRow>
      </Section>

      <Section title="Data">
        <SettingRow label="Clear Cache" description="Clear application cache and temporary files">
          <Button variant="outline" size="xs">
            Clear
          </Button>
        </SettingRow>

        <SettingRow label="Reset Settings" description="Reset all settings to defaults">
          <Button variant="outline" size="xs">
            Reset
          </Button>
        </SettingRow>
      </Section>
    </div>
  );
};
