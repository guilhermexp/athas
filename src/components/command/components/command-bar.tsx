import { ClockIcon, File } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { useRecentFilesStore } from "@/file-system/controllers/recent-files-store";
import { useFileSystemStore } from "@/file-system/controllers/store";
import { shouldIgnoreInCommandBar } from "@/file-system/controllers/utils";
import { useSettingsStore } from "@/settings/store";
import { useBufferStore } from "@/stores/buffer-store";
import { useUIState } from "@/stores/ui-state-store";
import Command, {
  CommandEmpty,
  CommandHeader,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../ui/command";

// Optimized fuzzy search scoring function
const fuzzyScore = (text: string, query: string): number => {
  if (!query) return 0;

  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  // Exact match gets highest score
  if (textLower === queryLower) return 1000;

  // Starts with query gets high score
  if (textLower.startsWith(queryLower)) return 800;

  // Contains query as substring gets medium score
  if (textLower.includes(queryLower)) return 600;

  // Quick fuzzy matching - optimized for performance
  let textIndex = 0;
  let queryIndex = 0;
  let score = 0;
  let consecutiveMatches = 0;

  while (textIndex < textLower.length && queryIndex < queryLower.length) {
    if (textLower[textIndex] === queryLower[queryIndex]) {
      // Simplified scoring for better performance
      score += 10;
      consecutiveMatches++;
      if (consecutiveMatches > 1) {
        score += 5; // Reduced bonus calculation
      }
      queryIndex++;
    } else {
      consecutiveMatches = 0;
    }
    textIndex++;
  }

  // Only return score if all query characters were matched
  if (queryIndex === queryLower.length) {
    // Simple length bonus
    score += Math.max(0, 20 - textLower.length * 0.2);
    return score > 10 ? score : 0; // Minimum threshold
  }

  return 0;
};

const CommandBar = () => {
  const { isCommandBarVisible, setIsCommandBarVisible } = useUIState();
  const { getAllProjectFiles, rootFolderPath } = useFileSystemStore();
  const handleFileSelect = useFileSystemStore((state) => state.handleFileSelect);
  const { settings } = useSettingsStore();

  const isVisible = isCommandBarVisible;
  const onClose = () => setIsCommandBarVisible(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 100);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<Array<{ name: string; path: string; isDir: boolean }>>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const { buffers, activeBufferId } = useBufferStore();
  const activeBuffer = buffers.find((b) => b.id === activeBufferId);
  const { addOrUpdateRecentFile, getRecentFilesOrderedByFrecency } = useRecentFilesStore();
  const recentFiles = getRecentFilesOrderedByFrecency();

  useEffect(() => {
    if (!isVisible) return;

    setIsLoadingFiles(true);
    getAllProjectFiles()
      .then((allFiles) => {
        const formattedFiles = allFiles
          .filter(
            (file) =>
              !file.isDir && !shouldIgnoreInCommandBar(file.path, settings.ignoreCommonDirectories),
          )
          .map((file) => ({
            name: file.name,
            path: file.path,
            isDir: file.isDir,
          }));
        setFiles(formattedFiles);
        setIsLoadingFiles(false);
      })
      .catch(() => {
        setIsLoadingFiles(false);
      });
  }, [getAllProjectFiles, isVisible, settings.ignoreCommonDirectories]);

  useEffect(() => {
    if (isVisible) {
      setQuery("");
      setSelectedIndex(0);
      setIsLoadingFiles(files.length === 0);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isVisible, files.length]);

  // Handle escape key and click outside
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }

      // Handle Cmd+K (or Ctrl+K on Windows/Linux)
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest("[data-command-bar]")) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const getRelativePath = useCallback(
    (fullPath: string): string => {
      if (!rootFolderPath) return fullPath;

      const normalizedFullPath = fullPath.replace(/\\/g, "/");
      const normalizedRootPath = rootFolderPath.replace(/\\/g, "/");

      if (normalizedFullPath.startsWith(normalizedRootPath)) {
        const relativePath = normalizedFullPath.substring(normalizedRootPath.length);
        return relativePath.startsWith("/") ? relativePath.substring(1) : relativePath;
      }

      return fullPath;
    },
    [rootFolderPath],
  );

  const getDirectoryPath = useCallback(
    (fullPath: string): string => {
      const relativePath = getRelativePath(fullPath);
      const lastSlashIndex = relativePath.lastIndexOf("/");
      return lastSlashIndex > 0 ? relativePath.substring(0, lastSlashIndex) : "";
    },
    [getRelativePath],
  );

  const { openBufferFiles, recentFilesInResults, otherFiles } = useMemo(() => {
    const allFiles = files;

    const openBufferPaths = buffers
      .filter((buffer) => buffer.id !== activeBufferId && !buffer.isVirtual)
      .map((buffer) => buffer.path);

    const openBufferFilesData = allFiles.filter((file) => openBufferPaths.includes(file.path));

    const recentFilePaths = recentFiles
      .filter((rf) => !activeBuffer || rf.path !== activeBuffer.path)
      .map((rf) => rf.path);

    if (!debouncedQuery.trim()) {
      const recent = allFiles
        .filter(
          (file) => recentFilePaths.includes(file.path) && !openBufferPaths.includes(file.path),
        )
        .sort((a, b) => {
          const aIndex = recentFiles.findIndex((rf) => rf.path === a.path);
          const bIndex = recentFiles.findIndex((rf) => rf.path === b.path);
          return aIndex - bIndex;
        });

      const others = allFiles
        .filter(
          (file) =>
            !recentFilePaths.includes(file.path) &&
            !openBufferPaths.includes(file.path) &&
            (!activeBuffer || file.path !== activeBuffer.path),
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        openBufferFiles: openBufferFilesData,
        recentFilesInResults: recent.slice(0, 15),
        otherFiles: others.slice(0, 25 - openBufferFilesData.length - recent.length),
      };
    }

    const maxResults = 50;
    const scoredFiles = [];

    for (let i = 0; i < allFiles.length && scoredFiles.length < maxResults * 2; i++) {
      const file = allFiles[i];
      const nameScore = fuzzyScore(file.name, debouncedQuery);
      const pathScore = fuzzyScore(file.path, debouncedQuery);
      const score = Math.max(nameScore, pathScore);

      if (score > 0) {
        scoredFiles.push({ file, score });
      }
    }

    scoredFiles.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const aIsOpen = openBufferPaths.includes(a.file.path);
      const bIsOpen = openBufferPaths.includes(b.file.path);
      if (aIsOpen && !bIsOpen) return -1;
      if (!aIsOpen && bIsOpen) return 1;

      const aIsRecent = recentFilePaths.includes(a.file.path);
      const bIsRecent = recentFilePaths.includes(b.file.path);
      if (aIsRecent && !bIsRecent) return -1;
      if (!aIsRecent && bIsRecent) return 1;

      if (aIsRecent && bIsRecent) {
        const aIndex = recentFiles.findIndex((rf) => rf.path === a.file.path);
        const bIndex = recentFiles.findIndex((rf) => rf.path === b.file.path);
        return aIndex - bIndex;
      }

      return a.file.name.localeCompare(b.file.name);
    });

    const limitedResults = scoredFiles.slice(0, maxResults);

    const openBuffers = limitedResults
      .filter(({ file }) => openBufferPaths.includes(file.path))
      .map(({ file }) => file);

    const recent = limitedResults
      .filter(
        ({ file }) => recentFilePaths.includes(file.path) && !openBufferPaths.includes(file.path),
      )
      .map(({ file }) => file);

    const others = limitedResults
      .filter(
        ({ file }) =>
          !recentFilePaths.includes(file.path) &&
          !openBufferPaths.includes(file.path) &&
          (!activeBuffer || file.path !== activeBuffer.path),
      )
      .map(({ file }) => file);

    return {
      openBufferFiles: openBuffers.slice(0, 20),
      recentFilesInResults: recent.slice(0, 20 - openBuffers.length),
      otherFiles: others.slice(0, 20 - openBuffers.length - recent.length),
    };
  }, [files, debouncedQuery, buffers, activeBufferId, recentFiles, activeBuffer]);

  const handleItemSelect = useCallback(
    (path: string) => {
      const fileName = path.split("/").pop() || path;
      addOrUpdateRecentFile(path, fileName);
      handleFileSelect(path, false);
      onClose();
    },
    [handleFileSelect, onClose, addOrUpdateRecentFile],
  );

  useEffect(() => {
    if (!isVisible || !scrollContainerRef.current) return;

    const selectedElement = scrollContainerRef.current.querySelector(
      `[data-item-index="${selectedIndex}"]`,
    ) as HTMLElement;

    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex, isVisible, openBufferFiles, recentFilesInResults, otherFiles]);

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const allResults = [...openBufferFiles, ...recentFilesInResults, ...otherFiles];
      const totalItems = allResults.length;

      if (totalItems === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (allResults[selectedIndex]) {
          handleItemSelect(allResults[selectedIndex].path);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isVisible,
    openBufferFiles,
    recentFilesInResults,
    otherFiles,
    selectedIndex,
    handleItemSelect,
  ]);

  if (!isVisible) {
    return null;
  }

  return (
    <Command isVisible={isVisible} className="max-h-80">
      <CommandHeader onClose={onClose}>
        <CommandInput
          ref={inputRef}
          value={query}
          onChange={setQuery}
          placeholder="Type to search files..."
          className="font-mono"
        />
      </CommandHeader>

      <CommandList ref={scrollContainerRef}>
        {openBufferFiles.length === 0 &&
        recentFilesInResults.length === 0 &&
        otherFiles.length === 0 ? (
          <CommandEmpty>
            <div className="font-mono">
              {isLoadingFiles
                ? "Loading files..."
                : debouncedQuery
                  ? "No matching files found"
                  : query
                    ? "Searching..."
                    : "No files available"}
            </div>
          </CommandEmpty>
        ) : (
          <>
            {/* Open Buffers Section */}
            {openBufferFiles.length > 0 && (
              <div className="p-0">
                {openBufferFiles.map((file, index) => {
                  const globalIndex = index;
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <CommandItem
                      key={`open-${file.path}`}
                      data-item-index={globalIndex}
                      onClick={() => handleItemSelect(file.path)}
                      isSelected={isSelected}
                      className="font-mono"
                    >
                      <File size={11} className="flex-shrink-0 text-accent" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs">
                          <span className="text-text">{file.name}</span>
                          {getDirectoryPath(file.path) && (
                            <span className="ml-1.5 text-[10px] text-text-lighter opacity-60">
                              {getDirectoryPath(file.path)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="rounded bg-accent/20 px-1 py-0.5 font-medium text-[10px] text-accent">
                        open
                      </span>
                    </CommandItem>
                  );
                })}
              </div>
            )}

            {/* Recent Files Section - Minimal */}
            {recentFilesInResults.length > 0 && (
              <div className="p-0">
                {recentFilesInResults.map((file, index) => {
                  const globalIndex = openBufferFiles.length + index;
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <CommandItem
                      key={`recent-${file.path}`}
                      data-item-index={globalIndex}
                      onClick={() => handleItemSelect(file.path)}
                      isSelected={isSelected}
                      className="font-mono"
                    >
                      <File size={11} className="flex-shrink-0 text-accent" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs">
                          <span className="text-text">{file.name}</span>
                          {getDirectoryPath(file.path) && (
                            <span className="ml-1.5 text-[10px] text-text-lighter opacity-60">
                              {getDirectoryPath(file.path)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="rounded px-1 py-0.5 font-medium text-[10px] text-text-lighter">
                        <ClockIcon size={12} />
                      </span>
                    </CommandItem>
                  );
                })}
              </div>
            )}

            {/* Other Files Section - Minimal */}
            {otherFiles.length > 0 && (
              <div className="p-0">
                {otherFiles.map((file, index) => {
                  const globalIndex = openBufferFiles.length + recentFilesInResults.length + index;
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <CommandItem
                      key={`other-${file.path}`}
                      data-item-index={globalIndex}
                      onClick={() => handleItemSelect(file.path)}
                      isSelected={isSelected}
                      className="font-mono"
                    >
                      <File size={11} className="flex-shrink-0 text-text-lighter" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs">
                          <span className="text-text">{file.name}</span>
                          {getDirectoryPath(file.path) && (
                            <span className="ml-1.5 text-[10px] text-text-lighter opacity-60">
                              {getDirectoryPath(file.path)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CommandList>
    </Command>
  );
};

export default CommandBar;
