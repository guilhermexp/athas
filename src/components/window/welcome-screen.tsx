import { AlertCircle, Download, Folder } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import { useUpdater } from "@/settings/hooks/use-updater";
import { fetchRawAppVersion } from "@/utils/app-utils";

// ...existing code...

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
  const [appVersion, setAppVersion] = useState<string>("...");
  const {
    available,
    checking,
    downloading,
    installing,
    error,
    updateInfo,
    downloadAndInstall,
    dismissUpdate,
  } = useUpdater(true);

  useEffect(() => {
    const loadVersion = async () => {
      const version = await fetchRawAppVersion();
      setAppVersion(version);
    };

    loadVersion();
  }, []);

  const handleRecentFolderClick = (path: string) => {
    if (onOpenRecentFolder) {
      onOpenRecentFolder(path);
    } else {
      onOpenFolder();
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="paper-texture paper-noise flex h-screen w-screen select-none flex-col items-center justify-center"
    >
      {/* Logo Section */}
      <div className="mb-6 flex flex-col items-center">
        <div className="mb-1 flex justify-center">
          <img src="/logo.svg" alt="athas industries" className="h-12" draggable="false" />
        </div>
        <div className="flex items-center gap-2 text-text-lighter">
          <p className="font-mono font-normal text-xs">v{appVersion}</p>
          {checking && (
            <div className="text-xs" title="Checking for updates...">
              ⟳
            </div>
          )}
          {available && (
            <div className="text-accent text-xs" title={`Update available: ${updateInfo?.version}`}>
              •
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full max-w-sm flex-col items-center px-4">
        {/* Update Available Banner */}
        {available && (
          <div className="mb-4 w-full">
            <div className="rounded-md border border-border p-3 text-text">
              <div className="mb-2 flex items-center gap-2">
                <Download size={14} className="text-accent" />
                <span className="font-mono text-xs">Update Available</span>
              </div>
              <p className="mb-3 font-mono text-xs">
                Version {updateInfo?.version} is ready to install
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={downloadAndInstall}
                  disabled={downloading || installing}
                  variant="ghost"
                  className="flex-1 gap-2 bg-secondary-bg py-1 text-xs transition-all duration-200"
                  size="sm"
                >
                  {downloading ? (
                    "⟳ Downloading"
                  ) : installing ? (
                    "⟳ Installing"
                  ) : (
                    <>
                      <Download size={12} />
                      Install
                    </>
                  )}
                </Button>
                <Button
                  onClick={dismissUpdate}
                  variant="ghost"
                  className="bg-secondary-bg px-2 py-1 text-xs transition-all duration-200"
                  size="sm"
                >
                  Later
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-4 w-full">
            <div className="rounded-md border border-error p-3">
              <div className="flex items-center gap-2 ">
                <AlertCircle size={14} className="text-error" />
                <span className="font-mono text-text text-xs">Update Error</span>
              </div>
              <p className="mt-1 font-mono text-text-light text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Open Folder Button */}
        <div className="mb-6 flex w-full justify-center">
          <Button
            onClick={onOpenFolder}
            variant="ghost"
            className="flex gap-2 border border-border bg-secondary-bg p-4 text-sm transition-all duration-200"
            size="sm"
          >
            <Folder size={16} />
            Open Folder
          </Button>
        </div>

        {/* Recent Folders */}
        {recentFolders.length > 0 && (
          <div className="w-full">
            <h3 className="mb-2 font-mono text-text text-xs">Recent({recentFolders.length})</h3>
            <div className="space-y-1.5">
              {recentFolders.map((folder, index) => (
                <Button
                  key={index}
                  onClick={() => handleRecentFolderClick(folder.path)}
                  variant="ghost"
                  className="flex h-auto w-full flex-col justify-start gap-2 border border-border bg-secondary-bg p-2 transition-all duration-200"
                  size="sm"
                >
                  <div className="w-full truncate text-start font-mono text-sm">{folder.name}</div>
                  <div className="w-full text-start">
                    <p className="font-mono text-text-lighter text-xs">
                      {folder.path.startsWith("/Users/")
                        ? `~${folder.path.substring(folder.path.indexOf("/", 7))}`
                        : folder.path}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeScreen;
