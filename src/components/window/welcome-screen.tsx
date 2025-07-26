import { Folder } from "lucide-react";
import Button from "@/components/ui/button";
import { cn } from "@/utils/cn";

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
  const handleRecentFolderClick = (path: string) => {
    if (onOpenRecentFolder) {
      onOpenRecentFolder(path);
    } else {
      onOpenFolder();
    }
  };

  return (
    <div
      className={cn(
        "paper-texture paper-noise",
        "flex h-screen w-screen select-none flex-col items-center justify-center",
      )}
    >
      {/* Logo Section */}
      <div className={cn("mb-6 flex flex-col items-center")}>
        <div className={cn("mb-1 flex justify-center")}>
          <img src="/logo.svg" alt="athas industries" className={cn("h-12")} />
        </div>
        <p className={cn("paper-text-light font-mono font-normal text-xs")}>
          v0.1.0
        </p>
      </div>

      {/* Main Content */}
      <div className={cn("flex w-full max-w-sm flex-col items-center px-4")}>
        {/* Open Folder Button */}
        <div className={cn("mb-6 w-full")}>
          <Button
            onClick={onOpenFolder}
            variant="ghost"
            className={cn(
              "paper-button w-full gap-2 py-2 text-sm",
              "transition-all duration-200",
            )}
            size="sm"
          >
            <Folder size={14} />
            Open Folder
          </Button>
        </div>

        {/* Recent Folders */}
        {recentFolders.length > 0 && (
          <div className={cn("w-full")}>
            <h3
              className={cn("paper-text-secondary", "mb-2 font-mono text-xs")}
            >
              Recent
            </h3>
            <div className={cn("space-y-1.5")}>
              {recentFolders.map((folder, index) => (
                <Button
                  key={index}
                  onClick={() => handleRecentFolderClick(folder.path)}
                  variant="ghost"
                  className={cn(
                    "paper-recent-item group h-auto w-full justify-start p-2",
                    "transition-all duration-200",
                  )}
                  size="sm"
                >
                  <div
                    className={cn(
                      "paper-text-primary truncate font-mono text-xs",
                    )}
                  >
                    {folder.name}
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
