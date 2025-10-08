use crate::commands::git::{GitBlame, GitBlameLine};
use git2::Repository;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct GitBlameInfo {
   pub author: String,
   pub date: String,
   pub message: String,
   pub hash: String,
}

#[command]
pub fn git_blame_file(root_path: &str, file_path: &str) -> Result<GitBlame, String> {
   let repo =
      Repository::open(root_path).map_err(|e| format!("Failed to open repository: {}", e))?;

   // Get the blame information
   let blame = repo
      .blame_file(Path::new(file_path), None)
      .map_err(|e| format!("Failed to get blame for file '{}': {}", file_path, e))?;

   // Validate that we have content to blame
   if blame.len() == 0 {
      return Err(format!(
         "No blame information available for file '{}'",
         file_path
      ));
   }

   // Process blame lines
   let mut blame_lines = Vec::new();

   for hunk in blame.iter() {
      let signature = hunk.final_signature();
      let commit = repo.find_commit(hunk.final_commit_id()).unwrap();

      blame_lines.push(GitBlameLine {
         line_number: hunk.final_start_line(),
         total_lines: hunk.lines_in_hunk(),
         commit_hash: hunk.final_commit_id().to_string(),
         author: signature.name().unwrap_or("Unknown").to_string(),
         email: signature.email().unwrap_or("").to_string(),
         time: signature.when().seconds(),
         commit: commit.message().unwrap_or("").to_string(),
      });
   }

   Ok(GitBlame {
      file_path: file_path.to_string(),
      lines: blame_lines,
   })
}

#[command]
pub fn git_blame_line(path: String, line: usize) -> Result<GitBlameInfo, String> {
   // Get repository from file path
   let file_path = Path::new(&path);
   let repo = Repository::discover(file_path)
      .map_err(|e| format!("Failed to find git repository: {}", e))?;

   // Get relative path from repo root
   let repo_root = repo.workdir().ok_or("Failed to get repository root")?;
   let relative_path = file_path
      .strip_prefix(repo_root)
      .map_err(|_| "File is not in repository")?;

   // Get blame for the file
   let blame = repo
      .blame_file(relative_path, None)
      .map_err(|e| format!("Failed to get blame: {}", e))?;

   // Find the hunk for the requested line
   let hunk = blame
      .get_line(line)
      .ok_or(format!("Line {} not found in blame data", line))?;

   let signature = hunk.final_signature();
   let commit = repo
      .find_commit(hunk.final_commit_id())
      .map_err(|e| format!("Failed to find commit: {}", e))?;

   // Format date
   let time = signature.when();
   let date = chrono::DateTime::from_timestamp(time.seconds(), 0)
      .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
      .unwrap_or_else(|| "Unknown".to_string());

   Ok(GitBlameInfo {
      author: signature.name().unwrap_or("Unknown").to_string(),
      date,
      message: commit
         .message()
         .unwrap_or("")
         .lines()
         .next()
         .unwrap_or("")
         .to_string(),
      hash: hunk.final_commit_id().to_string(),
   })
}
