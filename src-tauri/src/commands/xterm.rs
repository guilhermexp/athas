use crate::xterm_terminal::{XtermConfig, XtermManager};
use std::sync::Arc;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn create_xterm_terminal(
    config: XtermConfig,
    app_handle: AppHandle,
    xterm_manager: State<'_, Arc<XtermManager>>,
) -> Result<String, String> {
    xterm_manager
        .create_terminal(config, app_handle)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn terminal_write(
    id: String,
    data: String,
    xterm_manager: State<'_, Arc<XtermManager>>,
) -> Result<(), String> {
    xterm_manager
        .write_to_terminal(&id, &data)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn terminal_resize(
    id: String,
    rows: u16,
    cols: u16,
    xterm_manager: State<'_, Arc<XtermManager>>,
) -> Result<(), String> {
    xterm_manager
        .resize_terminal(&id, rows, cols)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn close_xterm_terminal(
    id: String,
    xterm_manager: State<'_, Arc<XtermManager>>,
) -> Result<(), String> {
    xterm_manager.close_terminal(&id).map_err(|e| e.to_string())
}
