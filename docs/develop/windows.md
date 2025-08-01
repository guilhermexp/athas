# Windows Development Setup

## Prerequisites

- Windows 10 version 1903 or later
- Visual Studio Build Tools or Visual Studio Community

## Installation Steps

### 1. Install Rust

Download and run the installer from [rustup.rs](https://rustup.rs/)

Or using PowerShell:
```powershell
Invoke-WebRequest -Uri https://win.rustup.rs/x86_64 -OutFile rustup-init.exe
.\rustup-init.exe
```

### 2. Install Bun

Download from [bun.sh](https://bun.sh/) or using PowerShell:
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

### 3. Install Project Dependencies

```cmd
bun install
```

### 4. Run Development Server

```cmd
bun run tauri dev
```

## Troubleshooting

### Visual Studio Build Tools
If you encounter build errors, install Visual Studio Build Tools:
- Download from [Microsoft](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
- Select "C++ build tools" workload

### WebView2 Runtime
Tauri requires WebView2. It's usually pre-installed on Windows 11, but you may need to install it manually on Windows 10:
- Download from [Microsoft Edge WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)