# Linux Development Setup

## Quick Setup (Recommended)

Use the automated setup script:

```bash
bun run setup
# or manually: chmod +x setup.sh && ./setup.sh
```

## Manual Setup

### System Dependencies

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install -y build-essential curl wget file libssl-dev libgtk-3-dev libwebkit2gtk-4.1-dev libsoup-3.0-dev libayatana-appindicator3-dev librsvg2-dev pkg-config
```

#### Fedora
```bash
sudo dnf install -y gcc gcc-c++ make curl wget file openssl-devel gtk3-devel webkit2gtk4.1-devel libsoup3-devel libayatana-appindicator-gtk3-devel librsvg2-devel pkgconf-pkg-config
```

#### Arch Linux
```bash
sudo pacman -S --needed --noconfirm base-devel curl wget file openssl gtk3 webkit2gtk-4.1 libsoup3 libayatana-appindicator librsvg pkgconf
```

#### openSUSE
```bash
sudo zypper install -y gcc gcc-c++ make curl wget file libopenssl-devel gtk3-devel webkit2gtk3-devel libsoup3-devel libayatana-appindicator3-devel librsvg-devel pkg-config
```

### Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
source ~/.cargo/env
```

### Install Tauri CLI

```bash
cargo install tauri-cli --locked
```

### Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
```

### Install Project Dependencies

```bash
bun install
```

### Run Development Server

```bash
bun run tauri dev
```

## Troubleshooting

### Missing system libraries
If you get pkg-config errors, ensure you have the required system libraries:
```bash
pkg-config --exists javascriptcoregtk-4.1 libsoup-3.0
```

### Tauri command not found
After installation, restart your terminal or run:
```bash
source ~/.bashrc
# or
source ~/.zshrc
```