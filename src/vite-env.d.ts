/// <reference types="vite/client" />

// Tauri type declarations for cross-platform support
declare global {
  interface Window {
    __TAURI__?: any;
  }
}
