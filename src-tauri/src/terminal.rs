// Terminal functionality - currently not functional
// This module exists to maintain the module structure but contains no active code
#![allow(dead_code, unused_variables)]
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]

pub struct Shell {
   name: String,
   exec_win: Option<String>,
   exec_unix: Option<String>,
}

impl Shell {
   pub fn get_shell_list() -> () {
      let windows_shells = vec![
         // list by the identifier, then its full Name, then its Executable
         ("cmd", "Command Prompt", Some("cmd.exe")),
         ("powershell", "Windows PowerShell", Some("powershell.exe")),
         ("pwsh", "PowerShell", Some("pwsh.exe")),
         ("bash", "Git Bash", Some("bash.exe")),
         ("nushell", "NuShell", Some("nu.exe")),
      ];
      // There are more unix shells, this list can be expanded as needed
      let unix_shells = vec![
         ("zsh", "Z Shell", Some("bin/zsh")),
         ("fish", "Fish Shell", Some("bin/fish")),
         ("bash", "Bash", Some("bin/bash")),
         ("nushell", "NuShell", Some("bin/nu")),
      ];
   }
}
