// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use acp_bridge::AcpBridge;
use claude_bridge::ClaudeCodeBridge;
use commands::*;
use file_watcher::FileWatcher;
use log::{debug, info};
use lsp::LspManager;
use mcp_bridge::McpBridge;
use ssh::{ssh_connect, ssh_disconnect, ssh_disconnect_only, ssh_write_file};
use std::sync::Arc;
use tauri::{Emitter, Manager};
use tauri_plugin_os::platform;
use tauri_plugin_store::StoreExt;
use tokio::sync::Mutex;
use xterm_terminal::XtermManager;

mod acp_bridge;
mod claude_bridge;
mod commands;
mod file_watcher;
mod logger;
mod lsp;
mod mcp_bridge;
mod menu;
use crate::shell::get_shells;
mod ssh;
mod terminal;
mod xterm_terminal;

fn main() {
   tauri::Builder::default()
      .plugin(tauri_plugin_store::Builder::new().build())
      .plugin(tauri_plugin_clipboard_manager::init())
      .plugin(logger::init(log::LevelFilter::Info))
      .plugin(tauri_plugin_window_state::Builder::new().build())
      .plugin(tauri_plugin_fs::init())
      .plugin(tauri_plugin_dialog::init())
      .plugin(tauri_plugin_shell::init())
      .plugin(tauri_plugin_opener::init())
      .plugin(tauri_plugin_store::Builder::default().build())
      .plugin(tauri_plugin_os::init())
      .plugin(tauri_plugin_http::init())
      .plugin(tauri_plugin_process::init())
      .setup(|app| {
         let store = app.store("settings.json")?;

         let native_menu_bar = store
            .get("nativeMenuBar")
            .and_then(|v| v.as_bool())
            .unwrap_or_else(|| {
               // If setting is missing, detect platform; if on MacOS, enable native menu bar
               let default = platform() == "macos";
               store.set("nativeMenuBar", default);
               default
            });

         if native_menu_bar {
            let menu = menu::create_menu(app.handle())?;
            app.set_menu(menu)?;
         }

         log::info!("Starting app ☺️!");

         // Set up the file watcher
         app.manage(Arc::new(FileWatcher::new(app.handle().clone())));

         // Set up Claude bridge
         let claude_bridge = Arc::new(Mutex::new(ClaudeCodeBridge::new(app.handle().clone())));
         app.manage(claude_bridge.clone());

         // Set up ACP bridge
         let acp_bridge = Arc::new(Mutex::new(AcpBridge::new(app.handle().clone())));
         app.manage(acp_bridge.clone());

         // Set up MCP bridge
         let mcp_bridge = Arc::new(Mutex::new(McpBridge::new(app.handle().clone())));
         app.manage(mcp_bridge.clone());

         // Set up LSP manager
         app.manage(LspManager::new(app.handle().clone()));

         // Set up theme cache
         app.manage(theme::ThemeCache::new(std::collections::HashMap::new()));

         // Auto-start interceptor on app launch
         {
            let claude_bridge_clone = claude_bridge.clone();
            tauri::async_runtime::spawn(async move {
               // Small delay to ensure app is fully initialized
               tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

               let mut bridge = claude_bridge_clone.lock().await;
               match bridge.start_interceptor().await {
                  Ok(_) => log::info!("Interceptor auto-started successfully"),
                  Err(_) => {
                     log::warn!("Claude Code service is unavailable. Disabling Claude provider.");
                  }
               }
            });
         }

         // Platform-specific window configuration
         if let Some(window) = app.get_webview_window("main") {
            #[cfg(target_os = "macos")]
            {
               use window_vibrancy::{NSVisualEffectMaterial, apply_vibrancy};

               // Apply vibrancy effect for macOS
               apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, Some(12.0))
                  .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");
            }

            #[cfg(target_os = "windows")]
            {
               // Keep decorations enabled on Windows (native controls)
               let _ = window.set_decorations(true);
            }

            #[cfg(target_os = "linux")]
            {
               // Disable decorations on Linux (use custom controls only)
               let _ = window.set_decorations(false);
            }
         }

         app.on_menu_event(move |_app_handle: &tauri::AppHandle, event| {
            if let Some(window) = _app_handle.get_webview_window("main") {
               match event.id().0.as_str() {
                  "quit" => {
                     info!("Quit menu item clicked");
                     std::process::exit(0);
                  }
                  "quit_app" => {
                     info!("Quit app menu item triggered");
                     std::process::exit(0);
                  }
                  "new_file" => {
                     let _ = window.emit("menu_new_file", ());
                  }
                  "open_folder" => {
                     let _ = window.emit("menu_open_folder", ());
                  }
                  "close_folder" => {
                     let _ = window.emit("menu_close_folder", ());
                  }
                  "save" => {
                     let _ = window.emit("menu_save", ());
                  }
                  "save_as" => {
                     let _ = window.emit("menu_save_as", ());
                  }
                  "close_tab" => {
                     debug!("Close tab menu item triggered");
                     let _ = window.emit("menu_close_tab", ());
                  }
                  "undo" => {
                     let _ = window.emit("menu_undo", ());
                  }
                  "redo" => {
                     let _ = window.emit("menu_redo", ());
                  }
                  "find" => {
                     let _ = window.emit("menu_find", ());
                  }
                  "find_replace" => {
                     let _ = window.emit("menu_find_replace", ());
                  }
                  "command_palette" => {
                     let _ = window.emit("menu_command_palette", ());
                  }
                  "toggle_sidebar" => {
                     let _ = window.emit("menu_toggle_sidebar", ());
                  }
                  "toggle_terminal" => {
                     let _ = window.emit("menu_toggle_terminal", ());
                  }
                  "toggle_ai_chat" => {
                     let _ = window.emit("menu_toggle_ai_chat", ());
                  }
                  "split_editor" => {
                     let _ = window.emit("menu_split_editor", ());
                  }
                  "toggle_menu_bar" => {
                     // Toggle menu visibility by setting it to None or recreating it
                     let current_menu = _app_handle.menu();
                     if current_menu.is_some() {
                        // Hide menu by setting it to None
                        if let Err(e) = _app_handle.remove_menu() {
                           log::error!("Failed to hide menu: {}", e);
                        } else {
                           log::info!("Menu bar hidden");
                        }
                     } else {
                        // Show menu by recreating it
                        match menu::create_menu(_app_handle) {
                           Ok(new_menu) => {
                              if let Err(e) = _app_handle.set_menu(new_menu) {
                                 log::error!("Failed to show menu: {}", e);
                              } else {
                                 log::info!("Menu bar shown");
                              }
                           }
                           Err(e) => {
                              log::error!("Failed to create menu: {}", e);
                           }
                        }
                     }
                  }
                  "toggle_vim" => {
                     let _ = window.emit("menu_toggle_vim", ());
                  }
                  "go_to_file" => {
                     let _ = window.emit("menu_go_to_file", ());
                  }
                  "go_to_line" => {
                     let _ = window.emit("menu_go_to_line", ());
                  }
                  "next_tab" => {
                     let _ = window.emit("menu_next_tab", ());
                  }
                  "prev_tab" => {
                     let _ = window.emit("menu_prev_tab", ());
                  }
                  "about" => {
                     // Native About dialog is handled automatically by macOS
                  }
                  "help" => {
                     let _ = window.emit("menu_help", ());
                  }
                  "about_athas" => {
                     let _ = window.emit("menu_about_athas", ());
                  }
                  // Window menu items
                  "minimize_window" => {
                     if let Err(e) = window.minimize() {
                        log::error!("Failed to minimize window: {}", e);
                     }
                  }
                  "maximize_window" => {
                     if let Err(e) = window.maximize() {
                        log::error!("Failed to maximize window: {}", e);
                     }
                  }
                  "toggle_fullscreen" => {
                     let is_fullscreen = window.is_fullscreen().unwrap_or(false);
                     if let Err(e) = window.set_fullscreen(!is_fullscreen) {
                        log::error!("Failed to toggle fullscreen: {}", e);
                     }
                  }
                  // Theme menu items
                  theme_id if theme_id.starts_with("theme_") => {
                     if let Some(theme) = theme_id.strip_prefix("theme_") {
                        let _ = window.emit("menu_theme_change", theme);
                     }
                  }
                  _ => {}
               }
            }
         });

         Ok(())
      })
      .manage(Arc::new(XtermManager::new()))
      .invoke_handler(tauri::generate_handler![
         // File system commands
         move_file,
         rename_file,
         read_file_contents,
         write_file_contents,
         list_directory,
         search_files,
         create_directory,
         delete_path,
         copy_path,
         move_path,
         grep_search,
         // Git commands
         git_status,
         git_add,
         git_reset,
         git_commit,
         git_add_all,
         git_reset_all,
         git_log,
         git_diff_file,
         git_diff_file_with_content,
         git_commit_diff,
         git_branches,
         git_checkout,
         git_create_branch,
         git_delete_branch,
         git_discard_file_changes,
         git_discard_all_changes,
         git_push,
         git_pull,
         git_fetch,
         git_init,
         git_get_remotes,
         git_add_remote,
         git_remove_remote,
         git_get_stashes,
         git_create_stash,
         git_apply_stash,
         git_pop_stash,
         git_drop_stash,
         git_get_tags,
         git_create_tag,
         git_delete_tag,
         git_stage_hunk,
         git_unstage_hunk,
         git_blame_file,
         git_blame_line,
         // GitHub commands
         store_github_token,
         get_github_token,
         remove_github_token,
         // Window commands
         create_remote_window,
         // File watcher commands
         start_watching,
         stop_watching,
         set_project_root,
         // Xterm commands
         create_xterm_terminal,
         terminal_write,
         terminal_resize,
         close_xterm_terminal,
         // Other commands for terminal (switching shells)
         get_shells,
         execute_command,
         // execute_shell,
         // SSH commands
         ssh_connect,
         ssh_disconnect,
         ssh_disconnect_only,
         ssh_write_file,
         // Claude commands
         start_claude_code,
         stop_claude_code,
         send_claude_input,
         get_claude_status,
         // ACP commands
         start_acp_agent,
         stop_acp_agent,
         send_acp_request,
         // MCP commands
         start_mcp_server,
         stop_mcp_server,
         get_mcp_server_tools,
         call_mcp_tool,
         // Theme commands
         get_system_theme,
         load_toml_themes,
         load_single_toml_theme,
         get_cached_themes,
         cache_themes,
         get_temp_dir,
         write_temp_file,
         delete_temp_file,
         // Zed config import
         import_zed_settings,
         // Font commands
         get_system_fonts,
         get_monospace_fonts,
         validate_font,
         // Token commands
         get_tokens,
         // SQLite commands
         get_sqlite_tables,
         query_sqlite,
         execute_sqlite,
         insert_sqlite_row,
         update_sqlite_row,
         delete_sqlite_row,
         // LSP commands
         lsp_start,
         lsp_stop,
         lsp_get_completions,
         lsp_get_hover,
         lsp_document_open,
         lsp_document_change,
         lsp_document_close,
         lsp_is_language_supported,
         get_diagnostics,
         // Fuzzy matching commands
         fuzzy_match,
         fuzzy_find_files,
         filter_completions,
         // Web commands
         fetch_url,
         web_search,
         // Format commands
         format_code,
         // Menu commands
         menu::toggle_menu_bar,
      ])
      .run(tauri::generate_context!())
      .expect("error while running tauri application");
}
