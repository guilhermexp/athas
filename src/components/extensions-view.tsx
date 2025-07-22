import { Code, Package, Palette, Search, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { usePersistentSettingsStore } from "../stores/persistent-settings-store";
import type { CoreFeature } from "../types/core-features";
import Button from "./ui/button";

interface Extension {
  id: string;
  name: string;
  description: string;
  category: "language-server" | "theme";
  status: "active" | "inactive";
  themeId?: string;
}

interface ExtensionsViewProps {
  onServerInstall: (server: Extension) => void;
  onServerUninstall: (serverId: string) => void;
  onThemeChange: (theme: "auto" | "athas-light" | "athas-dark") => void;
  currentTheme: "auto" | "athas-light" | "athas-dark";
  coreFeatures?: CoreFeature[];
  onCoreFeatureToggle?: (featureId: string, enabled: boolean) => void;
}

const AVAILABLE_EXTENSIONS: Extension[] = [
  // Language Servers
  {
    id: "solargraph",
    name: "Solargraph",
    description: "Ruby language server with intelligent code completion",
    category: "language-server",
    status: "inactive",
  },
  {
    id: "typescript-language-server",
    name: "TypeScript Language Server",
    description: "TypeScript and JavaScript language server",
    category: "language-server",
    status: "inactive",
  },
  {
    id: "python-lsp-server",
    name: "Python LSP Server",
    description: "Python language server with code intelligence",
    category: "language-server",
    status: "inactive",
  },
  {
    id: "rust-analyzer",
    name: "rust-analyzer",
    description: "Rust language server with advanced features",
    category: "language-server",
    status: "inactive",
  },
  {
    id: "gopls",
    name: "gopls",
    description: "Go language server with code navigation",
    category: "language-server",
    status: "inactive",
  },
  {
    id: "clangd",
    name: "clangd",
    description: "C/C++ language server with diagnostics",
    category: "language-server",
    status: "inactive",
  },
];

interface ExtensionCardProps {
  extension: Extension;
  onToggle: () => void;
  isActive: boolean;
}

const ExtensionCard = ({ extension, onToggle, isActive }: ExtensionCardProps) => {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary-bg p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-text">{extension.name}</h3>
        <Button
          onClick={onToggle}
          variant={isActive ? "default" : "outline"}
          size="xs"
          className="font-normal text-xs opacity-80 hover:opacity-100"
        >
          {isActive ? "Disable" : "Enable"}
        </Button>
      </div>
      <p className="text-text-lighter text-xs">{extension.description}</p>
    </div>
  );
};

interface CoreFeatureCardProps {
  feature: CoreFeature;
  onToggle: () => void;
}

const CoreFeatureCard = ({ feature, onToggle }: CoreFeatureCardProps) => {
  const Icon = feature.icon;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary-bg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-text-lighter" />
          <h3 className="font-medium text-sm text-text">{feature.name}</h3>
        </div>
        <Button
          onClick={onToggle}
          variant={feature.enabled ? "default" : "outline"}
          size="xs"
          className="font-normal text-xs opacity-80 hover:opacity-100"
        >
          {feature.enabled ? "Enabled" : "Disabled"}
        </Button>
      </div>
      <p className="text-text-lighter text-xs">{feature.description}</p>
    </div>
  );
};

export default function ExtensionsView({
  onServerInstall,
  onServerUninstall,
  onThemeChange,
  currentTheme,
  coreFeatures,
  onCoreFeatureToggle,
}: ExtensionsViewProps) {
  const { extensionsActiveTab, setExtensionsActiveTab } = usePersistentSettingsStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [extensions, setExtensions] = useState<Extension[]>(() => {
    // Initialize extensions with the current theme state
    return AVAILABLE_EXTENSIONS.map(ext => ({
      ...ext,
      status: ext.category === "theme" && ext.themeId === currentTheme ? "active" : "inactive",
    }));
  });

  // Update extension states when currentTheme changes
  useEffect(() => {
    setExtensions(prev =>
      prev.map(ext => ({
        ...ext,
        status: ext.category === "theme" && ext.themeId === currentTheme ? "active" : "inactive",
      })),
    );
  }, [currentTheme]);

  const handleToggle = (extension: Extension) => {
    if (extension.category === "language-server") {
      if (extension.status === "inactive") {
        onServerInstall(extension);
      } else {
        onServerUninstall(extension.id);
      }
    } else if (extension.category === "theme") {
      // For themes, we just need to call onThemeChange
      // The status will be updated via the useEffect above
      onThemeChange(
        extension.status === "inactive"
          ? (extension.themeId as "auto" | "athas-light" | "athas-dark")
          : ("auto" as "auto" | "athas-light" | "athas-dark"),
      );
    }
  };

  const filteredExtensions = extensions.filter(extension => {
    const matchesSearch =
      extension.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      extension.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = extensionsActiveTab === "all" || extension.category === extensionsActiveTab;
    return matchesSearch && matchesTab;
  });

  const filteredCoreFeatures =
    coreFeatures?.filter(feature => {
      const matchesSearch =
        feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }) || [];

  return (
    <div className="flex h-full flex-col bg-primary-bg">
      <div className="flex items-center justify-between border-border border-b p-4">
        <h2 className="font-semibold text-lg text-text">Extensions</h2>
        <div className="relative w-64">
          <Search
            className="-translate-y-1/2 absolute top-1/2 left-2 transform text-text-lighter"
            size={16}
          />
          <input
            type="text"
            placeholder="Search extensions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={cn(
              "w-full rounded border border-border bg-secondary-bg",
              "py-1.5 pr-4 pl-8 text-text text-xs placeholder-text-lighter",
              "focus:border-accent focus:outline-none",
            )}
          />
        </div>
      </div>

      <div className="flex gap-2 p-4 ">
        <Button
          onClick={() => setExtensionsActiveTab("all")}
          variant="ghost"
          size="sm"
          data-active={extensionsActiveTab === "all"}
          className={cn(
            "text-xs",
            extensionsActiveTab === "all"
              ? "bg-selected text-text"
              : "bg-transparent text-text-lighter hover:bg-hover",
          )}
        >
          All
        </Button>
        <Button
          onClick={() => setExtensionsActiveTab("core")}
          variant="ghost"
          size="sm"
          data-active={extensionsActiveTab === "core"}
          className={cn(
            "flex items-center gap-1 text-xs",
            extensionsActiveTab === "core"
              ? "bg-selected text-text"
              : "bg-transparent text-text-lighter hover:bg-hover",
          )}
        >
          <Settings size={14} />
          Core
        </Button>
        <Button
          onClick={() => setExtensionsActiveTab("language-server")}
          variant="ghost"
          size="sm"
          data-active={extensionsActiveTab === "language-server"}
          className={cn(
            "flex items-center gap-1 text-xs",
            extensionsActiveTab === "language-server"
              ? "bg-selected text-text"
              : "bg-transparent text-text-lighter hover:bg-hover",
          )}
        >
          <Code size={14} />
          Language Servers
        </Button>
        <Button
          onClick={() => setExtensionsActiveTab("theme")}
          variant="ghost"
          size="sm"
          disabled
          data-active={extensionsActiveTab === "theme"}
          className={cn(
            "flex cursor-not-allowed items-center gap-1 text-xs opacity-50",
            extensionsActiveTab === "theme"
              ? "bg-selected text-text"
              : "bg-transparent text-text-lighter",
          )}
        >
          <Palette size={14} />
          Themes (Coming Soon)
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {/* Core Features */}
        {(extensionsActiveTab === "all" || extensionsActiveTab === "core") &&
          coreFeatures &&
          coreFeatures.length > 0 && (
            <div className="mb-6">
              {extensionsActiveTab === "all" && (
                <h3 className="mb-3 flex items-center gap-2 font-medium text-sm text-text">
                  <Settings size={16} />
                  Core Features
                </h3>
              )}
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCoreFeatures.map(feature => (
                  <CoreFeatureCard
                    key={feature.id}
                    feature={feature}
                    onToggle={() => onCoreFeatureToggle?.(feature.id, !feature.enabled)}
                  />
                ))}
              </div>
            </div>
          )}

        {/* Extensions */}
        {extensionsActiveTab !== "core" && extensionsActiveTab !== "theme" && (
          <div>
            {extensionsActiveTab === "all" && filteredExtensions.length > 0 && (
              <h3 className="mb-3 flex items-center gap-2 font-medium text-sm text-text">
                <Package size={16} />
                Extensions
              </h3>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredExtensions.map(extension => (
                <ExtensionCard
                  key={extension.id}
                  extension={extension}
                  onToggle={() => handleToggle(extension)}
                  isActive={extension.status === "active"}
                />
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {((extensionsActiveTab === "core" && filteredCoreFeatures.length === 0) ||
          (extensionsActiveTab !== "core" &&
            extensionsActiveTab !== "all" &&
            filteredExtensions.length === 0) ||
          (extensionsActiveTab === "all" &&
            filteredCoreFeatures.length === 0 &&
            filteredExtensions.length === 0)) && (
          <div className="py-8 text-center text-text-lighter">
            <Package size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No items found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
