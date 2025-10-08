use crate::acp_bridge::AcpBridge;
use serde_json::Value;
use std::{collections::HashMap, sync::Arc};
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn start_acp_agent(
   agent_id: String,
   command: String,
   args: Vec<String>,
   env: Option<HashMap<String, String>>,
   bridge: State<'_, Arc<Mutex<AcpBridge>>>,
) -> Result<(), String> {
   bridge
      .lock()
      .await
      .start_agent(agent_id, command, args, env.unwrap_or_default())
      .await
      .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_acp_agent(
   agent_id: String,
   bridge: State<'_, Arc<Mutex<AcpBridge>>>,
) -> Result<(), String> {
   bridge
      .lock()
      .await
      .stop_agent(&agent_id)
      .await
      .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn send_acp_request(
   agent_id: String,
   request: Value,
   bridge: State<'_, Arc<Mutex<AcpBridge>>>,
) -> Result<(), String> {
   bridge
      .lock()
      .await
      .send_request(&agent_id, request)
      .await
      .map_err(|e| e.to_string())
}
