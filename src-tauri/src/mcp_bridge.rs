use anyhow::{Context, Result};
use log::{error, info, warn};
use serde::Serialize;
use std::{collections::HashMap, process::Stdio};
use tauri::{AppHandle, Emitter};
use tokio::{
   io::{AsyncBufReadExt, BufReader},
   process::{Child, Command},
   sync::Mutex as TokioMutex,
   task::JoinHandle,
};

#[derive(Debug)]
struct McpProcess {
   child: Child,
   stdout_task: JoinHandle<()>,
   stderr_task: Option<JoinHandle<()>>,
   #[allow(dead_code)]
   stdin: Option<tokio::process::ChildStdin>,
   #[allow(dead_code)]
   response_channel: std::sync::Arc<TokioMutex<HashMap<String, tokio::sync::oneshot::Sender<serde_json::Value>>>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct McpLogEvent {
   pub server_id: String,
   pub stream: String,
   pub line: String,
}

// MCP Protocol types (defined in commands/mcp.rs, not needed here)
// We use the types from commands::mcp module

pub struct McpBridge {
   processes: HashMap<String, McpProcess>,
   app_handle: AppHandle,
}

impl McpBridge {
   pub fn new(app_handle: AppHandle) -> Self {
      Self {
         processes: HashMap::new(),
         app_handle,
      }
   }

   pub async fn start_server(
      &mut self,
      server_id: String,
      command: String,
      args: Vec<String>,
      env: HashMap<String, String>,
   ) -> Result<()> {
      if self.processes.contains_key(&server_id) {
         info!("MCP server '{}' already running", server_id);
         return Ok(());
      }

      // Map some known managed servers when command is empty
      let (mut cmd, used_managed) = if command.is_empty() {
         match server_id.as_str() {
            // Browser tools server
            "browser-tools-context-server" => {
               let runner = which::which("bunx")
                  .map(|p: std::path::PathBuf| p.to_string_lossy().to_string())
                  .unwrap_or_else(|_| "npx".to_string());
               let mut c = Command::new(runner);
               c.arg("@agentdeskai/browser-tools-server@latest");
               (c, true)
            }
            _ => (Command::new(&command), false),
         }
      } else {
         (Command::new(&command), false)
      };

      if !used_managed {
         if !args.is_empty() {
            cmd.args(args);
         }
      }
      if !env.is_empty() {
         cmd.envs(env);
      }

      cmd.stdin(Stdio::null())
         .stdout(Stdio::piped())
         .stderr(Stdio::piped());

      let mut child = cmd
         .spawn()
         .with_context(|| format!("Failed to spawn MCP server '{}'", server_id))?;

      let stdout = child.stdout.take();
      let stderr = child.stderr.take();
      let app = self.app_handle.clone();
      let sid = server_id.clone();
      let out_task = tokio::spawn(async move {
         if let Some(stdout) = stdout {
            let mut lines = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = lines.next_line().await {
               if let Err(err) = app.emit(
                  "mcp-log",
                  &McpLogEvent {
                     server_id: sid.clone(),
                     stream: "stdout".into(),
                     line: line.clone(),
                  },
               ) {
                  warn!("Failed to emit mcp-log: {}", err);
               }
            }
         }
      });
      let err_task = stderr.map(|stderr| {
         let app = self.app_handle.clone();
         let sid = server_id.clone();
         tokio::spawn(async move {
            let mut lines = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = lines.next_line().await {
               let _ = app.emit(
                  "mcp-log",
                  &McpLogEvent {
                     server_id: sid.clone(),
                     stream: "stderr".into(),
                     line,
                  },
               );
            }
         })
      });

      let stdin = child.stdin.take();
      let response_channel = std::sync::Arc::new(TokioMutex::new(HashMap::new()));

      self.processes.insert(
         server_id,
         McpProcess {
            child,
            stdout_task: out_task,
            stderr_task: err_task,
            stdin,
            response_channel,
         },
      );

      Ok(())
   }

   pub async fn get_server_tools(&self, server_id: &str) -> Result<Vec<crate::commands::mcp::McpTool>> {
      // For now, return mock tools - in a full implementation, this would:
      // 1. Send a "tools/list" request to the MCP server via stdin
      // 2. Parse the JSON-RPC response from stdout
      // 3. Return the tools array

      info!("Getting tools from MCP server: {}", server_id);

      // Stub implementation - returns empty array
      // A real implementation would communicate with the MCP server process
      Ok(vec![])
   }

   pub async fn call_tool(
      &mut self,
      server_id: &str,
      tool_name: &str,
      _arguments: HashMap<String, serde_json::Value>,
   ) -> Result<crate::commands::mcp::McpToolResult> {
      info!("Calling MCP tool '{}' on server '{}'", tool_name, server_id);

      // Stub implementation - in a full implementation, this would:
      // 1. Get the process for this server_id
      // 2. Generate a unique request ID
      // 3. Create a oneshot channel for the response
      // 4. Send JSON-RPC request to stdin: {"jsonrpc": "2.0", "id": "...", "method": "tools/call", "params": {...}}
      // 5. Wait for response on the channel (with timeout)
      // 6. Parse and return the result

      // For now, return a mock error
      Ok(crate::commands::mcp::McpToolResult {
         content: serde_json::json!("MCP tool execution not yet fully implemented - this is a stub"),
         is_error: Some(true),
      })
   }

   pub async fn stop_server(&mut self, server_id: &str) -> Result<()> {
      if let Some(mut p) = self.processes.remove(server_id) {
         info!("Stopping MCP server '{}'", server_id);
         if let Err(err) = p.child.kill().await {
            error!("Failed to kill MCP server '{}': {}", server_id, err);
         }
         p.stdout_task.abort();
         if let Some(t) = p.stderr_task {
            t.abort();
         }
      }
      Ok(())
   }
}
