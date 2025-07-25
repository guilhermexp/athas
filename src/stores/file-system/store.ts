import { confirm } from "@tauri-apps/plugin-dialog";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createSelectors } from "@/utils/zustand-selectors";
import type { CodeEditorRef } from "../../components/editor/code-editor";
import type { FileEntry } from "../../types/app";
import {
  createNewDirectory,
  createNewFile,
  deleteFileOrDirectory,
  readDirectoryContents,
  readFileContent,
} from "../../utils/file-operations";
import {
  addFileToTree,
  collapseAllFolders,
  findFileInTree,
  removeFileFromTree,
  sortFileEntries,
  updateFileInTree,
} from "../../utils/file-tree-utils";
import {
  getFilenameFromPath,
  getRootPath,
  isImageFile,
  isSQLiteFile,
} from "../../utils/file-utils";
import { getGitStatus } from "../../utils/git";
import { isDiffFile, parseRawDiffContent } from "../../utils/git-diff-parser";
import { openFolder, readDirectory } from "../../utils/platform";
// Store imports - Note: Direct store communication via getState() is used here.
// This is an acceptable Zustand pattern, though it creates coupling between stores.
// See: https://github.com/pmndrs/zustand/discussions/1319
import { useBufferStore } from "../buffer-store";
import { useFileTreeStore } from "../file-tree-store";
import { useFileWatcherStore } from "../file-watcher-store";
import { useGitStore } from "../git-store";
import { useProjectStore } from "../project-store";
import { useRecentFoldersStore } from "../recent-folders-store";
import type { FsActions, FsState } from "./interface";
import { shouldIgnore, updateDirectoryContents } from "./utils";

const useFileSystemStoreBase = create<FsState & FsActions>()(
  immer((set, get) => ({
    // State
    files: [],
    rootFolderPath: undefined,
    filesVersion: 0,
    isFileTreeLoading: false,
    isRemoteWindow: false,
    remoteConnectionId: undefined,
    remoteConnectionName: undefined,
    projectFilesCache: undefined,

    // Actions
    handleOpenFolder: async () => {
      try {
        set((state) => {
          state.isFileTreeLoading = true;
        });

        const selected = await openFolder();

        if (selected) {
          const entries = await readDirectoryContents(selected);
          const fileTree = sortFileEntries(entries);

          set((state) => {
            state.isFileTreeLoading = false;
            state.files = fileTree;
            state.rootFolderPath = selected;
            state.filesVersion = state.filesVersion + 1;
            state.projectFilesCache = undefined;
          });

          // Clear tree UI state
          useFileTreeStore.getState().collapseAll();

          // Update project store
          const { setRootFolderPath, setProjectName } = useProjectStore.getState();
          setRootFolderPath(selected);
          setProjectName(selected.split("/").pop() || "Project");

          // Add to recent folders
          const { addToRecents } = useRecentFoldersStore.getState();
          addToRecents(selected);

          // Start file watching
          const { setProjectRoot } = useFileWatcherStore.getState();
          await setProjectRoot(selected);

          // Initialize git status
          const gitStore = useGitStore.getState();
          try {
            const gitStatus = await getGitStatus(selected);
            gitStore.actions.setGitStatus(gitStatus);
          } catch (error) {
            console.log("Not a git repository or git error:", error);
          }

          return true;
        } else {
          set((state) => {
            state.isFileTreeLoading = false;
          });
          return false;
        }
      } catch (error) {
        console.error("Error opening folder:", error);
        set((state) => {
          state.isFileTreeLoading = false;
        });
        return false;
      }
    },

    handleOpenFolderByPath: async (path: string) => {
      try {
        set((state) => {
          state.isFileTreeLoading = true;
        });

        const entries = await readDirectoryContents(path);
        const fileTree = sortFileEntries(entries);

        set((state) => {
          state.isFileTreeLoading = false;
          state.files = fileTree;
          state.rootFolderPath = path;
          state.filesVersion = state.filesVersion + 1;
          state.projectFilesCache = undefined;
        });

        // Clear tree UI state
        useFileTreeStore.getState().collapseAll();

        // Update project store
        const { setRootFolderPath, setProjectName } = useProjectStore.getState();
        setRootFolderPath(path);
        setProjectName(path.split("/").pop() || "Project");

        // Add to recent folders
        const addToRecents = useRecentFoldersStore.getState().addToRecents;
        addToRecents(path);

        // Start file watching
        const setProjectRoot = useFileWatcherStore.getState().setProjectRoot;
        await setProjectRoot(path);

        // Initialize git status
        const gitStore = useGitStore.getState();
        try {
          const gitStatus = await getGitStatus(path);
          gitStore.actions.setGitStatus(gitStatus);
        } catch (error) {
          console.log("Not a git repository or git error:", error);
        }

        return true;
      } catch (error) {
        console.error("Error opening folder by path:", error);
        set((state) => {
          state.isFileTreeLoading = false;
        });
        return false;
      }
    },

    handleFileSelect: async (
      path: string,
      isDir: boolean,
      line?: number,
      column?: number,
      codeEditorRef?: React.RefObject<CodeEditorRef | null>,
    ) => {
      if (isDir) {
        await get().toggleFolder(path);
        return;
      }

      const fileName = getFilenameFromPath(path);
      const { openBuffer } = useBufferStore.getState().actions;

      // Handle virtual diff files
      if (path.startsWith("diff://")) {
        const match = path.match(/^diff:\/\/(staged|unstaged)\/(.+)$/);
        let displayName = getFilenameFromPath(path);
        if (match) {
          const [, diffType, encodedPath] = match;
          const decodedPath = decodeURIComponent(encodedPath);
          displayName = `${getFilenameFromPath(decodedPath)} (${diffType})`;
        }

        const diffContent = localStorage.getItem(`diff-content-${path}`);
        if (diffContent) {
          openBuffer(path, displayName, diffContent, false, false, true, true);
        } else {
          openBuffer(path, displayName, "No diff content available", false, false, true, true);
        }
        return;
      }

      // Handle special file types
      if (isSQLiteFile(path)) {
        openBuffer(path, fileName, "", false, true, false, false);
      } else if (isImageFile(path)) {
        openBuffer(path, fileName, "", true, false, false, false);
      } else {
        try {
          const content = await readFileContent(path);

          // Check if this is a diff file
          if (isDiffFile(path, content)) {
            const parsedDiff = parseRawDiffContent(content, path);
            const diffJson = JSON.stringify(parsedDiff);
            openBuffer(path, fileName, diffJson, false, false, true, false);
          } else {
            openBuffer(path, fileName, content, false, false, false, false);
          }

          // Handle navigation to specific line/column
          if (line && column && codeEditorRef?.current?.textarea) {
            requestAnimationFrame(() => {
              if (codeEditorRef.current?.textarea) {
                const textarea = codeEditorRef.current.textarea;
                const lines = content.split("\n");
                let targetPosition = 0;

                if (line) {
                  for (let i = 0; i < line - 1 && i < lines.length; i++) {
                    targetPosition += lines[i].length + 1;
                  }
                  if (column) {
                    targetPosition += Math.min(column - 1, lines[line - 1]?.length || 0);
                  }
                }

                textarea.focus();
                if (
                  "setSelectionRange" in textarea &&
                  typeof textarea.setSelectionRange === "function"
                ) {
                  (textarea as unknown as HTMLTextAreaElement).setSelectionRange(
                    targetPosition,
                    targetPosition,
                  );
                }

                const lineHeight = 20;
                const scrollTop = line
                  ? Math.max(0, (line - 1) * lineHeight - textarea.clientHeight / 2)
                  : 0;
                textarea.scrollTop = scrollTop;
              }
            });
          }
        } catch (error) {
          console.error("Error reading file:", error);
          openBuffer(path, fileName, `Error reading file: ${error}`, false, false, false, false);
        }
      }
    },

    toggleFolder: async (path: string) => {
      const { isRemoteWindow, remoteConnectionId } = get();

      if (isRemoteWindow && remoteConnectionId) {
        // TODO: Implement remote folder operations
        return;
      }

      const folder = findFileInTree(get().files, path);

      if (!folder || !folder.isDir) return;

      if (!folder.expanded) {
        // Expand folder - load children
        try {
          const entries = await readDirectoryContents(folder.path);
          const updatedFiles = updateFileInTree(get().files, path, (item) => ({
            ...item,
            expanded: true,
            children: sortFileEntries(entries),
          }));

          set((state) => {
            state.files = updatedFiles;
            state.filesVersion = state.filesVersion + 1;
          });

          useFileTreeStore.getState().toggleFolder(path);
        } catch (error) {
          console.error("Error reading directory:", error);
        }
      } else {
        // Collapse folder
        const updatedFiles = updateFileInTree(get().files, path, (item) => ({
          ...item,
          expanded: false,
        }));

        set((state) => {
          state.files = updatedFiles;
          state.filesVersion = state.filesVersion + 1;
        });

        useFileTreeStore.getState().toggleFolder(path);
      }
    },

    handleCreateNewFile: async () => {
      const { rootFolderPath, files } = get();

      if (!rootFolderPath) {
        alert("Please open a folder first");
        return;
      }

      const rootPath = getRootPath(files);
      const effectiveRootPath = rootPath || rootFolderPath;

      if (!effectiveRootPath) {
        alert("Unable to determine root folder path");
        return;
      }

      // Create a temporary new file item for inline editing
      const newItem: FileEntry = {
        name: "",
        path: `${effectiveRootPath}/`,
        isDir: false,
        isEditing: true,
        isNewItem: true,
      };

      // Add the new item to the root level of the file tree
      set((state) => {
        state.files = [...state.files, newItem];
      });
    },

    handleCreateNewFileInDirectory: async (dirPath: string, fileName?: string) => {
      if (!fileName) {
        fileName = prompt("Enter the name for the new file:") ?? undefined;
        if (!fileName) return;
      }

      try {
        const result = await get().createFile(dirPath, fileName);
        return result;
      } catch (error) {
        console.error("Error in handleCreateNewFileInDirectory:", error);
        alert(`Failed to create file: ${error}`);
      }
    },

    handleCreateNewFolderInDirectory: async (dirPath: string, folderName?: string) => {
      if (!folderName) {
        folderName = prompt("Enter the name for the new folder:") ?? undefined;
        if (!folderName) return;
      }

      return get().createDirectory(dirPath, folderName);
    },

    handleDeletePath: async (targetPath: string, isDirectory: boolean) => {
      const itemType = isDirectory ? "folder" : "file";
      const confirmMessage = isDirectory
        ? `Are you sure you want to delete the folder "${targetPath
            .split("/")
            .pop()}" and all its contents? This action cannot be undone.`
        : `Are you sure you want to delete the file "${targetPath
            .split("/")
            .pop()}"? This action cannot be undone.`;

      try {
        const confirmed = await confirm(confirmMessage, {
          title: `Delete ${itemType}`,
          okLabel: "Delete",
          cancelLabel: "Cancel",
          kind: "warning",
        });

        if (!confirmed) {
          return;
        }
      } catch (error) {
        console.error("Error showing confirm dialog:", error);
        return;
      }

      return get().deleteFile(targetPath);
    },

    refreshDirectory: async (directoryPath: string) => {
      console.log(`🔄 Refreshing directory: ${directoryPath}`);

      const dirNode = findFileInTree(get().files, directoryPath);

      // If directory is not in the tree or not expanded, skip refresh
      if (!dirNode || !dirNode.isDir) {
        console.log(`📁 Directory ${directoryPath} not found or not a directory, skipping refresh`);
        return;
      }

      // Only refresh if the directory is expanded (visible in the tree)
      if (!dirNode.expanded) {
        console.log(`📁 Directory ${directoryPath} is collapsed, skipping refresh`);
        return;
      }

      try {
        // Read the directory contents
        const entries = await readDirectory(directoryPath);

        set((state) => {
          // Update the directory contents while preserving all states
          const updated = updateDirectoryContents(state.files, directoryPath, entries as any[]);

          if (updated) {
            // Successfully updated
            state.filesVersion = state.filesVersion + 1;
          } else {
            console.error(`Failed to update directory ${directoryPath} in tree`);
          }
        });
      } catch (error) {
        console.error("Error reading directory:", error);
      }
    },

    handleCollapseAllFolders: async () => {
      const updatedFiles = collapseAllFolders(get().files);

      set((state) => {
        state.files = updatedFiles;
        state.filesVersion = state.filesVersion + 1;
      });

      useFileTreeStore.getState().collapseAll();
    },

    handleFileMove: async (oldPath: string, newPath: string) => {
      console.log(`📁 Moving file from ${oldPath} to ${newPath}`);

      const movedFile = findFileInTree(get().files, oldPath);
      if (!movedFile) {
        console.error(`Could not find ${oldPath} in file tree`);
        return;
      }

      // Remove from old location
      let updatedFiles = removeFileFromTree(get().files, oldPath);

      // Update the file's path and name
      const updatedMovedFile = {
        ...movedFile,
        path: newPath,
        name: newPath.split("/").pop() || movedFile.name,
      };

      // Determine target directory from the new path
      const targetDir =
        newPath.substring(0, newPath.lastIndexOf("/")) || get().rootFolderPath || "/";

      // Add to new location
      updatedFiles = addFileToTree(updatedFiles, targetDir, updatedMovedFile);

      set((state) => {
        state.files = updatedFiles;
        state.filesVersion = state.filesVersion + 1;
        state.projectFilesCache = undefined;
      });

      // Update open buffers
      const { buffers } = useBufferStore.getState();
      const { updateBuffer } = useBufferStore.getState().actions;
      const buffer = buffers.find((b) => b.path === oldPath);
      if (buffer) {
        const fileName = newPath.split("/").pop() || buffer.name;
        updateBuffer({
          ...buffer,
          path: newPath,
          name: fileName,
        });
      }
    },

    getAllProjectFiles: async (): Promise<FileEntry[]> => {
      const { rootFolderPath, projectFilesCache } = get();
      if (!rootFolderPath) return [];

      // Check cache first (cache for 30 seconds)
      const now = Date.now();
      if (
        projectFilesCache &&
        projectFilesCache.path === rootFolderPath &&
        now - projectFilesCache.timestamp < 30000
      ) {
        console.log(`📋 Using cached project files: ${projectFilesCache.files.length} files`);
        return projectFilesCache.files;
      }

      const allFiles: FileEntry[] = [];

      const scanDirectory = async (directoryPath: string, depth: number = 0): Promise<void> => {
        // Prevent infinite recursion and very deep scanning
        if (depth > 10) {
          console.warn(`Max depth reached for ${directoryPath}`);
          return;
        }

        try {
          const entries = await readDirectory(directoryPath);
          let ignoredCount = 0;

          for (const entry of entries as any[]) {
            const name = entry.name || "Unknown";
            const isDir = entry.is_dir || false;

            // Skip ignored files/directories
            if (shouldIgnore(name, isDir)) {
              ignoredCount++;
              continue;
            }

            const fileEntry: FileEntry = {
              name,
              path: entry.path,
              isDir,
              expanded: false,
              children: undefined,
            };

            if (!fileEntry.isDir) {
              // Only add non-directory files to the list
              allFiles.push(fileEntry);
            } else {
              // Recursively scan subdirectories
              await scanDirectory(fileEntry.path, depth + 1);
            }

            // Yield control much less frequently to improve performance
            if (allFiles.length % 500 === 0) {
              // Use requestIdleCallback for better performance when available
              await new Promise((resolve) => {
                if ("requestIdleCallback" in window) {
                  requestIdleCallback(resolve, { timeout: 16 });
                } else {
                  requestAnimationFrame(resolve);
                }
              });
            }
          }

          // Log ignored items for very verbose debugging (only at root level)
          if (depth === 0 && ignoredCount > 0) {
            console.log(`🚫 Ignored ${ignoredCount} items in root directory for performance`);
          }
        } catch (error) {
          console.error(`Error scanning directory ${directoryPath}:`, error);
        }
      };

      console.log(`🔍 Starting project file scan for: ${rootFolderPath}`);
      const startTime = Date.now();

      await scanDirectory(rootFolderPath);

      const endTime = Date.now();
      console.log(
        `✅ File scan completed: ${allFiles.length} files found in ${endTime - startTime}ms`,
      );

      // Cache the results
      set((state) => {
        state.projectFilesCache = {
          path: rootFolderPath,
          files: allFiles,
          timestamp: now,
        };
      });

      return allFiles;
    },

    createFile: async (directoryPath: string, fileName: string) => {
      try {
        const filePath = await createNewFile(directoryPath, fileName);

        // Update file tree
        const newFile: FileEntry = {
          name: fileName,
          path: filePath,
          isDir: false,
          expanded: false,
        };

        const updatedFiles = addFileToTree(get().files, directoryPath, newFile);

        set((state) => {
          state.files = updatedFiles;
          state.filesVersion = state.filesVersion + 1;
        });

        return filePath;
      } catch (error) {
        console.error("Error creating file:", error);
        throw error;
      }
    },

    createDirectory: async (parentPath: string, folderName: string) => {
      try {
        const folderPath = await createNewDirectory(parentPath, folderName);

        // Update file tree
        const newFolder: FileEntry = {
          name: folderName,
          path: folderPath,
          isDir: true,
          expanded: false,
          children: [],
        };

        const updatedFiles = addFileToTree(get().files, parentPath, newFolder);

        set((state) => {
          state.files = updatedFiles;
          state.filesVersion = state.filesVersion + 1;
        });

        return folderPath;
      } catch (error) {
        console.error("Error creating directory:", error);
        throw error;
      }
    },

    deleteFile: async (path: string) => {
      try {
        await deleteFileOrDirectory(path);

        // Update file tree
        const updatedFiles = removeFileFromTree(get().files, path);

        set((state) => {
          state.files = updatedFiles;
          state.filesVersion = state.filesVersion + 1;
        });

        // Close any open buffers for this file
        const { buffers } = useBufferStore.getState();
        const { closeBuffer } = useBufferStore.getState().actions;

        // Find and close any buffers with matching path
        const buffersToClose = buffers.filter((buffer) => buffer.path === path);
        buffersToClose.forEach((buffer) => {
          closeBuffer(buffer.id);
        });
      } catch (error) {
        console.error("Error deleting file:", error);
        throw error;
      }
    },

    // Setter methods
    setFiles: (newFiles: FileEntry[]) => {
      set((state) => {
        state.files = newFiles;
        state.filesVersion = state.filesVersion + 1;
      });
    },
  })),
);

export const useFileSystemStore = createSelectors(useFileSystemStoreBase);
