# Athas

A lightweight code editor built with React, TypeScript, and Tauri.
Designed for developers who want a fast and customizable development environment.

## Download

| Platform | Architecture | Download |
|----------|--------------|----------|
| macOS    | Apple Silicon (ARM64) | [Download DMG](https://github.com/athasdev/athas/releases/latest/download/Athas_aarch64.dmg) |
| macOS    | Intel (x86_64) | [Download DMG](https://github.com/athasdev/athas/releases/latest/download/Athas_x64.dmg) |
| Windows  | x64          | [Download MSI](https://github.com/athasdev/athas/releases/latest/download/Athas_x64_en-US.msi) |
| Linux    | x64          | [Download AppImage](https://github.com/athasdev/athas/releases/latest/download/athas_amd64.AppImage) |

> **Note**: The release workflow builds automatically when new version tags are pushed. macOS builds include both Apple Silicon and Intel architectures.

---

## Developing Athas

Choose your platform for detailed setup instructions:

- [**macOS**](docs/develop/macos.md) - Setup for macOS development
- [**Windows**](docs/develop/windows.md) - Setup for Windows development (includes automated script)
- [**Linux**](docs/develop/linux.md) - Setup for Linux development (includes automated script)

## Customizing

### Themes

Create custom themes by adding TOML files. See the [themes documentation](src/extensions/themes/builtin/README.md) for details.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines.

## Support

If you encounter any issues or have questions:

- Open an [issue](https://github.com/athasdev/athas/issues)
- Check the [documentation](https://athas.dev/docs)
- Join [discussions](https://github.com/athasdev/athas/discussions)
