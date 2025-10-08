use crate::mcp_bridge::McpBridge;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::Arc};
use tauri::State;
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
pub struct McpTool {
   pub name: String,
   pub description: String,
   #[serde(rename = "inputSchema")]
   pub input_schema: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpToolResult {
   pub content: serde_json::Value,
   #[serde(rename = "isError")]
   pub is_error: Option<bool>,
}

#[tauri::command]
pub async fn start_mcp_server(
   server_id: String,
   command: String,
   args: Vec<String>,
   env: Option<HashMap<String, String>>,
   bridge: State<'_, Arc<Mutex<McpBridge>>>,
) -> Result<(), String> {
   bridge
      .lock()
      .await
      .start_server(server_id, command, args, env.unwrap_or_default())
      .await
      .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_mcp_server(
   server_id: String,
   bridge: State<'_, Arc<Mutex<McpBridge>>>,
) -> Result<(), String> {
   bridge
      .lock()
      .await
      .stop_server(&server_id)
      .await
      .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_mcp_server_tools(
   server_id: String,
   bridge: State<'_, Arc<Mutex<McpBridge>>>,
) -> Result<Vec<McpTool>, String> {
   bridge
      .lock()
      .await
      .get_server_tools(&server_id)
      .await
      .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn call_mcp_tool(
   server_id: String,
   tool_name: String,
   arguments: HashMap<String, serde_json::Value>,
   bridge: State<'_, Arc<Mutex<McpBridge>>>,
) -> Result<McpToolResult, String> {
   bridge
      .lock()
      .await
      .call_tool(&server_id, &tool_name, arguments)
      .await
      .map_err(|e| e.to_string())
}
