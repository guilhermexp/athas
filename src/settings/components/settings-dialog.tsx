import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { SettingsVerticalTabs } from "./settings-vertical-tabs";
import { AdvancedSettings } from "./tabs/advanced-settings";
import { AISettings } from "./tabs/ai-settings";
import { EditorSettings } from "./tabs/editor-settings";
import { FeaturesSettings } from "./tabs/features-settings";
import { GeneralSettings } from "./tabs/general-settings";
import { KeyboardSettings } from "./tabs/keyboard-settings";
import { LanguageSettings } from "./tabs/language-settings";
import { ThemeSettings } from "./tabs/theme-settings";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export type SettingsTab =
  | "general"
  | "editor"
  | "theme"
  | "ai"
  | "keyboard"
  | "language"
  | "features"
  | "advanced";

const SettingsDialog = ({ isOpen, onClose }: SettingsDialogProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  // Handle Escape key to close dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return <GeneralSettings />;
      case "editor":
        return <EditorSettings />;
      case "theme":
        return <ThemeSettings />;
      case "ai":
        return <AISettings />;
      case "keyboard":
        return <KeyboardSettings />;
      case "language":
        return <LanguageSettings />;
      case "features":
        return <FeaturesSettings />;
      case "advanced":
        return <AdvancedSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998] bg-black/20" onClick={onClose} />

      {/* Modal */}
      <div
        className={cn(
          "-translate-x-1/2 -translate-y-1/2 fixed top-1/2 left-1/2 z-[9999] transform",
          "h-[600px] max-h-[90vh] w-[800px] max-w-[90vw]",
          "rounded-lg border border-border bg-primary-bg shadow-xl",
          "flex flex-col",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-border border-b px-4 py-3">
          <h2 className="font-medium text-text">Settings</h2>
          <button
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-hover"
          >
            <X size={14} className="text-text-lighter" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar with vertical tabs */}
          <div className="w-40 border-border border-r bg-secondary-bg">
            <SettingsVerticalTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-y-auto p-4">{renderTabContent()}</div>
        </div>
      </div>
    </>
  );
};

export default SettingsDialog;
