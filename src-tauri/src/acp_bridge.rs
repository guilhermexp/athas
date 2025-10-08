use anyhow::{Context, Result, bail};
use log::{error, info, warn};
use serde::Serialize;
use serde_json::Value;
use std::{collections::HashMap, process::Stdio};
use tauri::{AppHandle, Emitter};
use tokio::{
   io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
   process::{Child, Command},
   task::JoinHandle,
};

#[derive(Debug)]
struct AcpProcess {
   child: Child,
   stdin: tokio::process::ChildStdin,
   stdout_task: JoinHandle<()>,
   stderr_task: Option<JoinHandle<()>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AcpEvent {
   pub agent_id: String,
   pub message: Value,
}

pub struct AcpBridge {
   processes: HashMap<String, AcpProcess>,
   app_handle: AppHandle,
}

impl AcpBridge {
   pub fn new(app_handle: AppHandle) -> Self {
      Self {
         processes: HashMap::new(),
         app_handle,
      }
   }

   pub async fn start_agent(
      &mut self,
      agent_id: String,
      command: String,
      args: Vec<String>,
      env: HashMap<String, String>,
   ) -> Result<()> {
      if self.processes.contains_key(&agent_id) {
         info!("ACP agent '{}' already running", agent_id);
         return Ok(());
      }

      info!(
         "Starting ACP agent '{}' with command '{} {:?}'",
         agent_id, command, args
      );

      // Support managed agents using npx/bunx to fetch packages on-demand
      let (mut cmd, use_custom) = if command == "managed:gemini" {
         // Prefer bunx if present, else npx
         let runner = which::which("bunx")
            .map(|p: std::path::PathBuf| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| "npx".to_string());
         let mut c = Command::new(runner);
         c.arg("@google/gemini-cli@latest").arg("--experimental-acp");
         (c, true)
      } else if command == "managed:claude_code" {
         let enabled = std::env::var("CLAUDE_CODE_ENABLED")
            .map(|v| !v.eq_ignore_ascii_case("false"))
            .unwrap_or(true);
         if !enabled {
            bail!("Claude Code ACP is disabled via CLAUDE_CODE_ENABLED");
         }

         // Prefer bunx if present, else npx
         let runner = which::which("bunx")
            .map(|p: std::path::PathBuf| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| "npx".to_string());

         info!("Using Claude Code ACP via '{}'", runner);

         let mut c = Command::new(runner);
         c.arg("@zed-industries/claude-code-acp@latest");
         (c, true)
      } else {
         (Command::new(&command), false)
      };

      if !use_custom {
         if !args.is_empty() {
            cmd.args(args);
         }
      }
      if !env.is_empty() {
         cmd.envs(env);
      }

      cmd.stdin(Stdio::piped())
         .stdout(Stdio::piped())
         .stderr(Stdio::piped());

      let mut child = cmd
         .spawn()
         .with_context(|| format!("Failed to spawn ACP agent process '{}'.", command))?;

      let stdin = child
         .stdin
         .take()
         .context("Failed to capture ACP agent stdin")?;

      let stdout = child.stdout.take();
      let stderr = child.stderr.take();

      let app_handle = self.app_handle.clone();
      let agent_id_clone = agent_id.clone();

      let stdout_task = tokio::spawn(async move {
         if let Some(stdout) = stdout {
            let mut reader = BufReader::new(stdout);
            let mut line = String::new();

            loop {
               line.clear();
               match reader.read_line(&mut line).await {
                  Ok(0) => {
                     info!("[ACP] EOF on stdout for agent '{}'", agent_id_clone);
                     return;
                  }
                  Ok(_) => {
                     let trimmed = line.trim();
                     if trimmed.is_empty() {
                        continue;
                     }

                     // Parse as newline-delimited JSON
                     match serde_json::from_str::<Value>(trimmed) {
                        Ok(value) => {
                           info!(
                              "[ACP] Received message from '{}': {}",
                              agent_id_clone,
                              serde_json::to_string(&value)
                                 .unwrap_or_default()
                                 .chars()
                                 .take(200)
                                 .collect::<String>()
                           );
                           info!("[ACP] 🚀 Emitting 'acp-message' event to frontend");
                           if let Err(err) = app_handle.emit(
                              "acp-message",
                              &AcpEvent {
                                 agent_id: agent_id_clone.clone(),
                                 message: value,
                              },
                           ) {
                              warn!("[ACP] ❌ Failed to emit acp-message event: {}", err);
                           } else {
                              info!("[ACP] ✅ Event emitted successfully");
                           }
                        }
                        Err(err) => {
                           warn!(
                              "[ACP] Failed to parse JSON from '{}': {} | line: {}",
                              agent_id_clone, err, trimmed
                           );
                        }
                     }
                  }
                  Err(err) => {
                     warn!(
                        "[ACP] Error reading stdout from '{}': {}",
                        agent_id_clone, err
                     );
                     return;
                  }
               }
            }
         }
      });

      let stderr_task = stderr.map(|stderr| {
         let agent_id = agent_id.clone();
         tokio::spawn(async move {
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
               warn!("[ACP:{}][stderr] {}", agent_id, line);
            }
         })
      });

      self.processes.insert(
         agent_id,
         AcpProcess {
            child,
            stdin,
            stdout_task,
            stderr_task,
         },
      );

      Ok(())
   }

   pub async fn stop_agent(&mut self, agent_id: &str) -> Result<()> {
      if let Some(mut process) = self.processes.remove(agent_id) {
         info!("Stopping ACP agent '{}'", agent_id);
         if let Err(err) = process.child.kill().await {
            error!("Failed to kill ACP agent '{}': {}", agent_id, err);
         }
         process.stdout_task.abort();
         if let Some(task) = process.stderr_task {
            task.abort();
         }
      }
      Ok(())
   }

   pub async fn send_request(&mut self, agent_id: &str, request: Value) -> Result<()> {
      let process = self
         .processes
         .get_mut(agent_id)
         .context("ACP agent is not running")?;

      let payload = serde_json::to_string(&request)?;
      info!(
         "[ACP] Sending request to '{}': {}",
         agent_id,
         &payload[..payload.len().min(200)]
      );

      // Send JSON followed by newline (newline-delimited JSON format)
      process.stdin.write_all(payload.as_bytes()).await?;
      process.stdin.write_all(b"\n").await?;
      process.stdin.flush().await?;
      info!("[ACP] Message sent and flushed");

      Ok(())
   }
}
