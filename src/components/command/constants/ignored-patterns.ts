// Files and directories to ignore in the command bar
export const IGNORED_PATTERNS = [
  // Dependencies
  "node_modules",
  ".npm",
  ".yarn",
  ".pnpm-store",

  // Version control (only .git directory, not .gitignore)
  ".git",
  ".svn",
  ".hg",

  // Build outputs
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".output",
  "target",
  "bin",
  "obj",

  // IDE/Editor temporary files
  "*.swp",
  "*.swo",
  "*~",
  ".DS_Store",
  "Thumbs.db",

  // Cache directories
  ".cache",
  ".tmp",
  ".temp",
  "tmp",
  "temp",
  ".turbo",

  // Log files
  "*.log",
  "logs",

  // Coverage reports
  "coverage",
  ".nyc_output",

  // Misc cache
  ".sass-cache",
  ".eslintcache",
  ".parcel-cache",
];
