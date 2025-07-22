use anyhow::{Context, Result, bail};
use futures_util::StreamExt;
use serde::Serialize;
use std::env;
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::process::{Child, Command};
use tokio_tungstenite::{connect_async, tungstenite::Message};

use crate::interceptor_types::InterceptorMessage;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
pub struct ClaudeStatus {
    pub running: bool,
    pub connected: bool,
    pub interceptor_running: bool,
}

pub struct ClaudeCodeBridge {
    claude_process: Option<Child>,
    pub claude_stdin: Option<tokio::process::ChildStdin>,
    ws_handle: Option<tokio::task::JoinHandle<()>>,
    ws_connected: bool,
    app_handle: AppHandle,
    session_id: String,
}

impl ClaudeCodeBridge {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            claude_process: None,
            claude_stdin: None,
            ws_handle: None,
            ws_connected: false,
            app_handle,
            session_id: Uuid::new_v4().to_string(),
        }
    }

    fn get_interceptor_base_url() -> String {
        env::var("CLAUDE_PROXY_BASE_URL").unwrap_or_else(|_| "http://localhost:3456".to_string())
    }

    pub async fn start_interceptor(&mut self) -> Result<()> {
        if self.ws_handle.is_some() {
            bail!("WebSocket connection already active");
        }

        log::info!("Connecting to external interceptor service...");

        let base_url = Self::get_interceptor_base_url();
        let ws_base = base_url
            .replace("http://", "ws://")
            .replace("https://", "wss://");
        let ws_url = format!("{}/ws?session={}", ws_base, self.session_id);
        let app_handle = self.app_handle.clone();

        // Try to connect to the WebSocket
        let (ws_stream, _) = connect_async(&ws_url).await.context(format!(
            "Failed to connect to interceptor service at {}. Make sure it's running.",
            base_url
        ))?;

        let (_write, mut read) = ws_stream.split();

        // Spawn task to handle incoming messages
        let ws_handle = tokio::spawn(async move {
            while let Some(msg) = read.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Ok(interceptor_msg) =
                            serde_json::from_str::<InterceptorMessage>(&text)
                        {
                            // Emit to frontend
                            let _ = app_handle.emit("claude-message", interceptor_msg);
                        }
                    }
                    Ok(Message::Close(_)) => {
                        log::info!("WebSocket connection closed");
                        break;
                    }
                    Err(e) => {
                        log::error!("WebSocket error: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
        });

        self.ws_handle = Some(ws_handle);
        self.ws_connected = true;

        log::info!("Connected to interceptor service successfully");
        Ok(())
    }

    pub async fn start_claude_code(&mut self, workspace_path: Option<String>) -> Result<()> {
        if self.claude_process.is_some() {
            bail!("Claude Code is already running");
        }

        let mut cmd = Command::new("claude");
        cmd.arg("--dangerously-skip-permissions")
            .arg("--print")
            .arg("--verbose")
            .arg("--output-format")
            .arg("stream-json")
            .arg("--input-format")
            .arg("stream-json")
            .env(
                "ANTHROPIC_BASE_URL",
                format!("{}/{}", Self::get_interceptor_base_url(), self.session_id),
            )
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        // Set the working directory if workspace path is provided
        if let Some(path) = workspace_path {
            cmd.current_dir(&path);
            log::info!("Starting Claude Code in workspace: {}", path);
        }

        let mut child = cmd.spawn().map_err(|e| {
            anyhow::anyhow!(
                "Failed to spawn Claude process: {}. Make sure 'claude' is in your PATH",
                e
            )
        })?;

        // Get stdin handle
        let stdin = child.stdin.take().context("Failed to get stdin")?;
        self.claude_stdin = Some(stdin);

        // Consume stdout and stderr to prevent broken pipe errors, but discard the output
        // since all communication goes through the interceptor
        if let Some(stdout) = child.stdout.take() {
            tokio::spawn(async move {
                use tokio::io::{AsyncBufReadExt, BufReader};
                let reader = BufReader::new(stdout);
                let mut lines = reader.lines();
                // Just consume and discard
                while let Ok(Some(_)) = lines.next_line().await {}
            });
        }

        if let Some(stderr) = child.stderr.take() {
            tokio::spawn(async move {
                use tokio::io::{AsyncBufReadExt, BufReader};
                let reader = BufReader::new(stderr);
                let mut lines = reader.lines();
                // Just consume and discard
                while let Ok(Some(_)) = lines.next_line().await {}
            });
        }

        self.claude_process = Some(child);

        Ok(())
    }

    pub async fn stop_claude_process_only(&mut self) -> Result<()> {
        // Stop Claude Code process only, keep WebSocket connection
        if let Some(mut child) = self.claude_process.take() {
            let _ = child.kill().await;
        }

        self.claude_stdin = None;

        Ok(())
    }

    pub fn get_status(&self) -> ClaudeStatus {
        ClaudeStatus {
            running: self.claude_process.is_some(),
            connected: self.ws_connected,
            interceptor_running: self.ws_connected,
        }
    }
}
