import Dropdown from "@/components/ui/dropdown";
import Section, { SettingRow } from "@/components/ui/section";
import Toggle from "@/components/ui/toggle";

export const LanguageSettings = () => {
  const languageOptions = [
    { value: "auto", label: "Auto Detect" },
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" },
    { value: "rust", label: "Rust" },
    { value: "go", label: "Go" },
    { value: "java", label: "Java" },
    { value: "c", label: "C" },
    { value: "cpp", label: "C++" },
    { value: "html", label: "HTML" },
    { value: "css", label: "CSS" },
    { value: "json", label: "JSON" },
    { value: "markdown", label: "Markdown" },
  ];

  const formatOptions = [
    { value: "prettier", label: "Prettier" },
    { value: "eslint", label: "ESLint" },
    { value: "rustfmt", label: "rustfmt" },
    { value: "gofmt", label: "gofmt" },
  ];

  return (
    <div className="space-y-4">
      <Section title="Language Support">
        <SettingRow
          label="Default Language"
          description="Default syntax highlighting for new files"
        >
          <Dropdown
            value="auto"
            options={languageOptions}
            onChange={() => {}}
            className="w-28"
            size="xs"
          />
        </SettingRow>

        <SettingRow
          label="Auto-detect Language"
          description="Automatically detect file language from extension"
        >
          <Toggle checked={true} onChange={() => {}} size="sm" />
        </SettingRow>
      </Section>

      <Section title="Code Formatting">
        <SettingRow label="Format on Save" description="Automatically format code when saving">
          <Toggle checked={false} onChange={() => {}} size="sm" />
        </SettingRow>

        <SettingRow label="Default Formatter" description="Choose default code formatter">
          <Dropdown
            value="prettier"
            options={formatOptions}
            onChange={() => {}}
            className="w-24"
            size="xs"
          />
        </SettingRow>
      </Section>

      <Section title="IntelliSense">
        <SettingRow label="Auto Completion" description="Show completion suggestions while typing">
          <Toggle checked={true} onChange={() => {}} size="sm" />
        </SettingRow>

        <SettingRow label="Parameter Hints" description="Show function parameter hints">
          <Toggle checked={true} onChange={() => {}} size="sm" />
        </SettingRow>
      </Section>
    </div>
  );
};
