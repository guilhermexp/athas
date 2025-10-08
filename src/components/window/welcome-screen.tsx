import { AlertCircle, Book, Download, Folder, Github, Settings } from "lucide-react";
import Button from "@/components/ui/button";
import SettingsDialog from "@/settings/components/settings-dialog";
import { useUpdater } from "@/settings/hooks/use-updater";
import { useUIState } from "@/stores/ui-state-store";

interface RecentFolder {
  name: string;
  path: string;
  lastOpened: string;
}

interface WelcomeScreenProps {
  onOpenFolder: () => void;
  recentFolders?: RecentFolder[];
  onOpenRecentFolder?: (path: string) => void;
}

const WelcomeScreen = ({
  onOpenFolder,
  recentFolders = [],
  onOpenRecentFolder,
}: WelcomeScreenProps) => {
  const { openSettingsDialog, isSettingsDialogVisible, setIsSettingsDialogVisible } = useUIState();

  // Hide updater in development environment
  const isDevelopment = import.meta.env.MODE === "development";
  const {
    available,
    downloading,
    installing,
    error,
    updateInfo,
    downloadAndInstall,
    dismissUpdate,
  } = useUpdater(!isDevelopment);

  // No version banner on welcome screen

  const handleRecentFolderClick = (path: string) => {
    if (onOpenRecentFolder) {
      onOpenRecentFolder(path);
    } else {
      onOpenFolder();
    }
  };

  const openExternalLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      data-tauri-drag-region
      className="paper-texture paper-noise flex h-screen w-screen select-none flex-col items-center justify-center"
    >
      {/* Removed logo/version banner for a cleaner welcome screen */}

      {/* Main Content */}
      <div className="flex w-full max-w-md flex-col items-center px-4">
        {/* Update Available Banner */}
        {!isDevelopment && available && (
          <div className="mb-5 w-full">
            <div className="rounded-lg border border-border/60 bg-secondary-bg/50 p-4 backdrop-blur-sm transition-all hover:border-border">
              <div className="mb-2 flex items-center gap-2">
                <Download size={16} className="text-accent" />
                <span className="font-medium text-sm text-text">Update Available</span>
              </div>
              <p className="mb-3 text-text-lighter text-xs">
                v{updateInfo?.version} is ready to install
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={downloadAndInstall}
                  disabled={downloading || installing}
                  variant="ghost"
                  className="flex-1 gap-1.5 bg-accent/10 py-2 text-accent text-xs transition-all hover:bg-accent/20"
                  size="sm"
                >
                  {downloading ? (
                    <>
                      <div className="animate-spin">⟳</div> Downloading...
                    </>
                  ) : installing ? (
                    <>
                      <div className="animate-spin">⟳</div> Installing...
                    </>
                  ) : (
                    <>
                      <Download size={12} />
                      Install Update
                    </>
                  )}
                </Button>
                <Button
                  onClick={dismissUpdate}
                  variant="ghost"
                  className="bg-primary-bg/50 px-3 py-2 text-xs transition-all hover:bg-primary-bg"
                  size="sm"
                >
                  Later
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {!isDevelopment && error && (
          <div className="mb-5 w-full">
            <div className="rounded-lg border border-error/60 bg-error/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-error" />
                <span className="font-medium text-error text-sm">Update Error</span>
              </div>
              <p className="mt-2 text-text-lighter text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Open Folder Button */}
        <div className="mb-8 flex w-full justify-center">
          <Button
            onClick={onOpenFolder}
            variant="ghost"
            className="flex gap-2.5 rounded-lg border border-border/60 bg-secondary-bg/80 px-6 py-3.5 font-medium text-sm transition-all hover:border-border hover:bg-secondary-bg"
            size="sm"
          >
            <Folder size={16} />
            Open Folder
          </Button>
        </div>

        {/* Recent Folders */}
        {recentFolders.length > 0 && (
          <div className="w-full">
            <h3 className="mb-3 font-medium text-text-lighter/70 text-xs">
              Recent ({recentFolders.length})
            </h3>
            <div className="space-y-2">
              {recentFolders.map((folder, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentFolderClick(folder.path)}
                  className="group flex h-auto w-full flex-col gap-2 rounded-lg border border-border/40 bg-secondary-bg/50 p-3.5 text-left transition-all hover:border-border/60 hover:bg-secondary-bg/80"
                >
                  <div className="w-full truncate font-medium text-sm text-text transition-colors group-hover:text-accent">
                    {folder.name}
                  </div>
                  <div className="w-full text-left">
                    <p className="text-text-lighter/70 text-xs">
                      {folder.path.startsWith("/Users/")
                        ? `~${folder.path.substring(folder.path.indexOf("/", 7))}`
                        : folder.path}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 flex w-full justify-center gap-5">
          <button
            onClick={() => openSettingsDialog()}
            className="group flex items-center gap-1.5 text-text-lighter/70 transition-all hover:text-text"
          >
            <Settings size={15} className="transition-transform group-hover:rotate-90" />
            <span className="font-medium text-xs">Settings</span>
          </button>
          <a
            href="https://docs.athas.dev"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              openExternalLink("https://docs.athas.dev");
            }}
            className="group flex items-center gap-1.5 text-text-lighter/70 transition-all hover:text-text"
          >
            <Book size={15} className="transition-transform group-hover:scale-110" />
            <span className="font-medium text-xs">Docs</span>
          </a>
          <a
            href="https://github.com/athasdev/athas"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              openExternalLink("https://github.com/athasdev/athas");
            }}
            className="group flex items-center gap-1.5 text-text-lighter/70 transition-all hover:text-text"
          >
            <Github size={15} className="transition-transform group-hover:scale-110" />
            <span className="font-medium text-xs">GitHub</span>
          </a>
        </div>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={isSettingsDialogVisible}
        onClose={() => setIsSettingsDialogVisible(false)}
      />
    </div>
  );
};

export default WelcomeScreen;
