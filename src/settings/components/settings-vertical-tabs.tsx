import {
  Folder,
  Keyboard,
  Languages,
  Monitor,
  PenTool,
  Settings,
  Settings2,
  Sparkles,
  Wrench,
} from "lucide-react";
import type { SettingsTab } from "@/stores/ui-state-store";
import { cn } from "@/utils/cn";

interface SettingsVerticalTabsProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

interface TabItem {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const tabs: TabItem[] = [
  {
    id: "general",
    label: "General",
    icon: Settings2,
  },
  {
    id: "editor",
    label: "Editor",
    icon: PenTool,
  },
  {
    id: "fileTree",
    label: "File Tree",
    icon: Folder,
  },
  {
    id: "theme",
    label: "Theme",
    icon: Monitor,
  },
  {
    id: "ai",
    label: "AI",
    icon: Sparkles,
  },
  {
    id: "keyboard",
    label: "Keyboard",
    icon: Keyboard,
  },
  {
    id: "language",
    label: "Language",
    icon: Languages,
  },
  {
    id: "features",
    label: "Features",
    icon: Settings,
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: Wrench,
  },
];

export const SettingsVerticalTabs = ({ activeTab, onTabChange }: SettingsVerticalTabsProps) => {
  return (
    <nav className="space-y-1 p-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
              isActive
                ? "bg-hover/70 text-text ring-1 ring-border"
                : "text-text-lighter hover:bg-hover/50 hover:text-text",
            )}
          >
            <span
              className={cn(
                "h-4 w-0.5 rounded-sm",
                isActive ? "bg-blue-400" : "bg-transparent group-hover:bg-border",
              )}
            />
            <Icon size={14} className={cn(isActive ? "text-text" : "text-text-lighter")} />
            <span className="truncate">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
