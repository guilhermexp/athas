use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug)]
pub struct LSPProcess {
    language: String,
    process: Option<Child>,
}

pub struct LSPState {
    processes: Mutex<HashMap<String, LSPProcess>>,
}

impl LSPState {
    pub fn new() -> Self {
        Self {
            processes: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StartLSPRequest {
    language: String,
    command: String,
    args: Vec<String>,
    working_dir: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompletionRequest {
    language: String,
    uri: String,
    line: u32,
    character: u32,
}

#[tauri::command]
pub async fn start_lsp_server(
    request: StartLSPRequest,
    state: State<'_, LSPState>,
) -> Result<u32, String> {
    let mut processes = state.processes.lock().unwrap();

    // Stop existing process if any
    if let Some(existing) = processes.get_mut(&request.language) {
        if let Some(ref mut child) = existing.process {
            let _ = child.kill();
        }
    }

    // Start new LSP process
    let child = Command::new(&request.command)
        .args(&request.args)
        .current_dir(&request.working_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start LSP server {}: {}", request.command, e))?;

    let pid = child.id();

    let lsp_process = LSPProcess {
        language: request.language.clone(),
        process: Some(child),
    };

    processes.insert(request.language, lsp_process);

    Ok(pid)
}

#[tauri::command]
pub async fn stop_lsp_server(language: String, state: State<'_, LSPState>) -> Result<(), String> {
    let mut processes = state.processes.lock().unwrap();

    if let Some(mut lsp_process) = processes.remove(&language) {
        if let Some(ref mut child) = lsp_process.process {
            child
                .kill()
                .map_err(|e| format!("Failed to stop LSP server: {}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn lsp_did_open(
    language: String,
    uri: String,
    content: String,
    version: u32,
) -> Result<(), String> {
    // For now, just log the request
    // In a full implementation, you would send this to the LSP process via JSON-RPC
    println!("LSP {} didOpen: {} (version {})", language, uri, version);
    Ok(())
}

#[tauri::command]
pub async fn lsp_did_change(
    language: String,
    uri: String,
    content: String,
    version: u32,
) -> Result<(), String> {
    println!("LSP {} didChange: {} (version {})", language, uri, version);
    Ok(())
}

#[tauri::command]
pub async fn lsp_did_close(language: String, uri: String) -> Result<(), String> {
    println!("LSP {} didClose: {}", language, uri);
    Ok(())
}

#[tauri::command]
pub async fn lsp_completion(request: CompletionRequest) -> Result<serde_json::Value, String> {
    // For now, return mock completions based on language
    let completions = match request.language.as_str() {
        "ruby" => serde_json::json!({
            "items": [
                {
                    "label": "def",
                    "kind": 14,
                    "detail": "Define a method",
                    "insertText": "def "
                },
                {
                    "label": "class",
                    "kind": 14,
                    "detail": "Define a class",
                    "insertText": "class "
                },
                {
                    "label": "puts",
                    "kind": 3,
                    "detail": "Print output",
                    "insertText": "puts "
                },
                {
                    "label": "each",
                    "kind": 2,
                    "detail": "Iterate over collection",
                    "insertText": "each "
                }
            ]
        }),
        "typescript" | "javascript" => serde_json::json!({
            "items": [
                {
                    "label": "function",
                    "kind": 14,
                    "detail": "Function declaration",
                    "insertText": "function "
                },
                {
                    "label": "const",
                    "kind": 14,
                    "detail": "Constant declaration",
                    "insertText": "const "
                },
                {
                    "label": "interface",
                    "kind": 14,
                    "detail": "Interface declaration",
                    "insertText": "interface "
                }
            ]
        }),
        "python" => serde_json::json!({
            "items": [
                {
                    "label": "def",
                    "kind": 14,
                    "detail": "Function definition",
                    "insertText": "def "
                },
                {
                    "label": "class",
                    "kind": 14,
                    "detail": "Class definition",
                    "insertText": "class "
                }
            ]
        }),
        _ => serde_json::json!({ "items": [] }),
    };

    Ok(completions)
}

#[tauri::command]
pub async fn lsp_hover(
    language: String,
    uri: String,
    line: u32,
    character: u32,
) -> Result<Option<serde_json::Value>, String> {
    // Mock hover information
    let hover = serde_json::json!({
        "contents": {
            "kind": "markdown",
            "value": format!("Hover info for {} at {}:{}", language, line, character)
        }
    });

    Ok(Some(hover))
}

#[tauri::command]
pub async fn list_lsp_servers(state: State<'_, LSPState>) -> Result<HashMap<String, u32>, String> {
    let servers = state
        .processes
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    Ok(servers
        .iter()
        .map(|(language, process)| {
            (
                language.clone(),
                process
                    .process
                    .as_ref()
                    .map(|child| child.id())
                    .unwrap_or(0),
            )
        })
        .collect())
}
