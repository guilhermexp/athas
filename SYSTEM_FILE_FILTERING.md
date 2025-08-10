# Enhanced System File Filtering

This document describes the enhanced file filtering system implemented to provide VS Code and Zed-like behavior for hiding system files, build artifacts, and other irrelevant files from the file explorer, command palette, and search results.

## Overview

The filtering system has been centralized in `src/file-system/controllers/utils.ts` and is applied consistently across:

- **File Explorer**: System files are filtered out at the directory reading level
- **Command Palette**: Uses the same filtering logic for file suggestions
- **Search Functionality**: Ignores system files when performing project-wide searches
- **Fuzzy File Finder**: Applies filtering to keep results relevant

## What Gets Filtered

### System and OS Files
- `.DS_Store`, `Thumbs.db`, `ehthumbs.db` (OS generated files)
- `._*` (macOS resource forks)
- `Desktop.ini`, `$RECYCLE.BIN` (Windows system files)
- `.Spotlight-V100`, `.Trashes`, `.fseventsd` (macOS system directories)
- **NOTE**: Only OS-generated hidden files are filtered - developer dotfiles remain visible

### Version Control
- `.git`, `.svn`, `.hg`, `.bzr` directories
- But **preserves** important files like `.gitignore`, `.gitattributes`

### Dependencies and Package Managers
- `node_modules`, `vendor`, `bower_components`
- `.npm`, `.yarn`, `.pnpm`, `.cargo`
- `__pycache__`, `.pip-cache`
- `Pods` (iOS CocoaPods)

### Build Outputs and Artifacts
- `dist`, `build`, `out`, `target`
- `bin`, `obj`, `Debug`, `Release`
- `.next`, `.nuxt`, `_site`
- Coverage reports: `coverage`, `.nyc_output`

### Cache and Temporary Files
- `.cache`, `.parcel-cache`, `.sass-cache`
- `.eslintcache`, `.stylelintcache`, `.turbo`
- `tmp`, `temp`, `.tmp`, `.temp`

### IDE and Editor Files
- `.vscode` (but allows settings if needed)
- `.idea`, `.eclipse`, `.sublime-*`
- `*.swp`, `*.swo`, `*~` (Vim/Emacs temp files)

### Binary and Large Files
- Executables: `.exe`, `.dll`, `.so`, `.bin`
- Archives: `.zip`, `.rar`, `.7z`, `.tar.gz`
- Large media: video files, large images
- Font files: `.ttf`, `.otf`, `.woff`

### Developer Dotfiles - Always Visible
All developer configuration files starting with "." are preserved and visible, including:
- **Environment**: `.env`, `.env.example`, `.env.local`, `.envrc`
- **Git**: `.gitignore`, `.gitattributes`, `.gitmodules`, `.github/`
- **Editor Config**: `.editorconfig`, `.vscode/settings.json`
- **Code Quality**: `.prettierrc*`, `.eslintrc*`, `.stylelintrc*`
- **Build Tools**: `.babelrc*`, `.swcrc`, `.npmrc`
- **Version Management**: `.nvmrc`, `.node-version`, `.tool-versions`
- **CI/CD**: `.github/`, `.gitlab-ci.yml`, `.travis.yml`
- **Docker**: `.dockerignore`
- **Web**: `.htaccess`, `.nojekyll`

**Key Point**: The filter is designed to hide only OS-generated files, not developer configuration files.

## Implementation Details

### Core Functions

#### `shouldIgnore(name: string, isDir: boolean): boolean`
The main filtering function that determines if a file/directory should be ignored.

#### `shouldIgnorePath(filePath: string): boolean`
Path-based filtering for additional checks on full file paths.

#### `getIgnoreReason(name: string, isDir: boolean): string | null`
Utility function that returns a human-readable reason why a file would be ignored (useful for debugging).

### Integration Points

1. **File System Reading** (`file-operations.ts`): Filtering applied at the lowest level when reading directories
2. **Command Palette** (`command-bar.tsx`): Uses centralized filtering for file suggestions
3. **Search View** (`search-view.tsx`): Filters files before performing text search
4. **File Tree Display** (`file-tree.tsx`): Git-ignored files are dimmed but system-ignored files are completely hidden

## Performance Benefits

- Reduces memory usage by not loading irrelevant files
- Faster file operations (search, navigation)
- Cleaner user interface
- Better focus on actual project files

## Customization

The filtering patterns are defined as constants in `utils.ts`:
- `IGNORE_PATTERNS`: Directory and file name patterns
- `IGNORE_FILE_EXTENSIONS`: File extensions to ignore

These can be modified to suit different project needs, but the defaults provide a good balance for most development scenarios.

## VS Code/Zed Compatibility

This implementation follows the philosophy of modern editors like VS Code and Zed:

- **Hide clutter**: OS-generated files, build artifacts, dependencies
- **Show what matters**: All developer configuration and project files
- **Respect dotfiles**: Developer dotfiles (`.env`, `.gitignore`, etc.) remain visible

The approach is **selective**, not aggressive - it removes noise while preserving everything a developer needs to see and edit.
