import type { FileEntry } from "../models/app";
import { sortFileEntries } from "./file-tree-utils";

// Common directories and patterns to ignore for performance
const IGNORE_PATTERNS = [
  // Dependencies
  "vendor",
  ".pnpm",
  ".yarn",

  // Version control
  ".git",
  ".svn",
  ".hg",

  // Build outputs
  "dist",
  "build",
  "out",
  "target",
  ".next",
  ".nuxt",

  // Cache/temp directories
  ".cache",
  "tmp",
  "temp",
  ".tmp",

  // IDE/Editor files
  ".vscode",
  ".idea",
  "*.swp",
  "*.swo",
  "*~",

  // Logs
  "logs",
  "*.log",

  // Coverage reports
  "coverage",
  ".nyc_output",

  // Package manager locks (large files)
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Cargo.lock",
];

const IGNORE_FILE_EXTENSIONS = [
  // Binary files
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".obj",
  ".o",
  ".a",

  // Large media files
  ".mov",
  ".mp4",
  ".avi",
  ".mkv",
  ".wav",
  ".mp3",
  ".flac",
  ".psd",
  ".ai",
  ".sketch",

  // Archives
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",

  // Database files
  ".db",
  ".sqlite",
  ".sqlite3",
];

export const shouldIgnore = (name: string, isDir: boolean): boolean => {
  const lowerName = name.toLowerCase();

  // Check ignore patterns
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.includes("*")) {
      // Simple glob pattern matching
      const regexPattern = pattern.replace(/\*/g, ".*");
      if (new RegExp(`^${regexPattern}$`).test(lowerName)) {
        return true;
      }
    } else if (lowerName === pattern.toLowerCase()) {
      return true;
    }
  }

  // Check file extensions (only for files, not directories)
  if (!isDir) {
    const extension = name.substring(name.lastIndexOf(".")).toLowerCase();
    if (IGNORE_FILE_EXTENSIONS.includes(extension)) {
      return true;
    }
  }

  // Only ignore specific OS-generated hidden files, not all hidden files
  // This allows developers to see important dotfiles like .env, .gitignore, etc.
  if (name.startsWith(".")) {
    const osGeneratedFiles = [
      // macOS system files
      ".DS_Store",
      ".DS_Store?",
      "._*", // macOS resource forks (pattern)
      ".Spotlight-V100",
      ".Trashes",
      ".fseventsd",
      ".DocumentRevisions-V100",
      ".VolumeIcon.icns",
      ".com.apple.timemachine.donotpresent",
      ".AppleDB",
      ".AppleDesktop",
      "Network Trash Folder",
      ".TemporaryItems",
      ".Temporary Items",

      // Windows system files
      "Thumbs.db",
      "ehthumbs.db",
      "Desktop.ini",
      "$RECYCLE.BIN",
      "System Volume Information",
    ];

    // Check if this is an OS-generated file that should be ignored
    for (const pattern of osGeneratedFiles) {
      if (pattern.includes("*")) {
        // Handle glob patterns like ._*
        const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*");
        if (new RegExp(`^${regexPattern}$`, "i").test(name)) {
          return true;
        }
      } else if (name.toLowerCase() === pattern.toLowerCase()) {
        return true;
      }
    }

    // Don't ignore other hidden files - let developers see their dotfiles
    return false;
  }

  return false;
};

// Helper function for directory content updates (used with Immer)
export function updateDirectoryContents(
  files: FileEntry[],
  dirPath: string,
  newEntries: any[],
  preserveStates: boolean = true
): boolean {
  for (const item of files) {
    if (item.path === dirPath && item.isDir) {
      // Create a map of existing children to preserve their states
      const existingChildrenMap = new Map<string, FileEntry>();
      if (preserveStates && item.children) {
        item.children.forEach((child) => {
          existingChildrenMap.set(child.path, child);
        });
      }

      // Update children with new entries and sort them
      item.children = sortFileEntries(
        newEntries.map((entry: any) => {
          const existingChild = preserveStates ? existingChildrenMap.get(entry.path) : null;
          return {
            name: entry.name || "Unknown",
            path: entry.path,
            isDir: entry.is_dir || false,
            expanded: existingChild?.expanded || false,
            children: existingChild?.children || undefined,
          };
        })
      );

      return true; // Directory was found and updated
    }

    // Recursively search in children
    if (
      item.children &&
      updateDirectoryContents(item.children, dirPath, newEntries, preserveStates)
    ) {
      return true;
    }
  }
  return false; // Directory not found
}
