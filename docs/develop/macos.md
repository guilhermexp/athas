# macOS Development Setup

## Prerequisites

- macOS 10.15 (Catalina) or later
- Command Line Tools for Xcode

## Installation Steps

### 1. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### 2. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

### 3. Install Project Dependencies

```bash
bun install
```

### 4. Run Development Server

```bash
bun run tauri dev
```

## Troubleshooting

### Command not found errors
If you get "command not found" errors, restart your terminal or run:
```bash
source ~/.zshrc
# or
source ~/.bashrc
```

### Build errors
Make sure Xcode Command Line Tools are installed:
```bash
xcode-select --install
```