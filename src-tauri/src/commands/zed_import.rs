use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{fs, path::PathBuf};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportedAgent {
   pub id: String,
   pub name: String,
   pub command: String,
   pub args: Vec<String>,
   pub env: serde_json::Map<String, Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportedMcpServer {
   pub id: String,
   pub name: String,
   pub source: String,
   pub command: Option<String>,
   pub args: Vec<String>,
   pub env: serde_json::Map<String, Value>,
   pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportedProvider {
   pub id: String,
   pub name: String,
   pub meta: Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ZedImportResult {
   pub agents: Vec<ImportedAgent>,
   pub mcp_servers: Vec<ImportedMcpServer>,
   pub providers: Vec<ImportedProvider>,
}

fn default_zed_settings_path() -> Option<PathBuf> {
   if let Ok(home) = std::env::var("HOME") {
      let mut p = PathBuf::from(home);
      p.push(".config/zed/settings.json");
      Some(p)
   } else {
      None
   }
}

#[command]
pub fn import_zed_settings(path: Option<String>) -> Result<ZedImportResult, String> {
   let path_buf = match path {
      Some(p) => PathBuf::from(p),
      None => default_zed_settings_path()
         .ok_or("Unable to resolve HOME for default Zed settings path")?,
   };

   let data = fs::read_to_string(&path_buf).map_err(|e| {
      format!(
         "Failed to read Zed settings at {}: {}",
         path_buf.display(),
         e
      )
   })?;
   let v: Value = serde_json::from_str(&data).map_err(|e| {
      format!(
         "Invalid JSON in Zed settings at {}: {}",
         path_buf.display(),
         e
      )
   })?;

   // agent_servers -> ACP agents
   let mut agents = Vec::new();
   if let Some(map) = v.get("agent_servers").and_then(|x| x.as_object()) {
      for (id, cfg) in map.iter() {
         let command = cfg
            .get("command")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
         let args = cfg
            .get("args")
            .and_then(|x| x.as_array())
            .map(|a| {
               a.iter()
                  .filter_map(|v| v.as_str().map(|s| s.to_string()))
                  .collect()
            })
            .unwrap_or_else(Vec::new);
         let env = cfg
            .get("env")
            .and_then(|x| x.as_object())
            .cloned()
            .unwrap_or_default();
         agents.push(ImportedAgent {
            id: id.clone(),
            name: id.clone(),
            command,
            args,
            env,
         });
      }
   }

   // context_servers -> MCP servers
   let mut mcp_servers = Vec::new();
   if let Some(map) = v.get("context_servers").and_then(|x| x.as_object()) {
      for (id, cfg) in map.iter() {
         let source = cfg
            .get("source")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
         let enabled = cfg
            .get("enabled")
            .and_then(|x| x.as_bool())
            .unwrap_or(false);
         let settings = cfg.get("settings").cloned().unwrap_or(Value::Null);
         // custom source may include command/args/env
         let (command, args, env) = if source == "custom" {
            let cmd = cfg
               .get("command")
               .and_then(|x| x.as_str())
               .map(|s| s.to_string());
            let args = cfg
               .get("args")
               .and_then(|x| x.as_array())
               .map(|a| {
                  a.iter()
                     .filter_map(|v| v.as_str().map(|s| s.to_string()))
                     .collect()
               })
               .unwrap_or_else(Vec::new);
            let env = cfg
               .get("env")
               .and_then(|x| x.as_object())
               .cloned()
               .unwrap_or_default();
            (cmd, args, env)
         } else {
            (None, Vec::new(), serde_json::Map::new())
         };

         let mut name = id.clone();
         if let Some(obj) = settings.as_object() {
            if let Some(alias) = obj.get("name").and_then(|x| x.as_str()) {
               name = alias.to_string();
            }
         }

         mcp_servers.push(ImportedMcpServer {
            id: id.clone(),
            name,
            source,
            command,
            args,
            env,
            enabled,
         });
      }
   }

   // language_models -> providers (store meta cru)
   let mut providers = Vec::new();
   if let Some(lm) = v.get("language_models").cloned() {
      providers.push(ImportedProvider {
         id: "openai_compatible".to_string(),
         name: "OpenAI Compatible".to_string(),
         meta: lm,
      });
   }

   Ok(ZedImportResult {
      agents,
      mcp_servers,
      providers,
   })
}
