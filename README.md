# Athas

A lightweight code editor built with React, TypeScript, and Tauri.
Designed for developers who want a fast and customizable development environment.

## Building

### Quick Setup (Linux)

Run the automated setup script:

```bash
bun run setup
# or manually: chmod +x setup.sh && ./setup.sh
```

### Manual Setup (Linux/MacOS/Windows)

1. **System dependencies** (Linux only):
   - Ubuntu/Debian: `sudo apt install libwebkit2gtk-4.1-dev libsoup-3.0-dev build-essential`
   - Fedora: `sudo dnf install webkit2gtk4.1-devel libsoup3-devel gcc gcc-c++`
   - Arch: `sudo pacman -S webkit2gtk-4.1 libsoup3 base-devel`

2. **Download dependencies:**
   rust, bun, tauri

3. **Install packages:**
   `bun install`

4. **Build and run:**
   `bun run dev` or `bun tauri dev`

## Customizing

### Themes

Create custom themes by adding TOML files. See the [themes documentation](src/extensions/themes/builtin/README.md) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

## Support

If you encounter any issues or have questions:

- Open an [issue](https://github.com/athasdev/athas/issues)
- Check the [documentation](https://athas.dev/docs)
- Join [discussions](https://github.com/athasdev/athas/discussions)
