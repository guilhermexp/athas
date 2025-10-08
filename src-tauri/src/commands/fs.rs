use globset::Glob;
use regex::RegexBuilder;
use serde::Serialize;
use std::{
   fs,
   io::{BufRead, BufReader},
   path::{Path, PathBuf},
};
use tauri::command;
use walkdir::{DirEntry, WalkDir};

const MAX_GREP_FILE_SIZE: u64 = 2 * 1024 * 1024; // 2 MB safety limit

fn should_skip_dir(entry: &DirEntry) -> bool {
   if entry.depth() == 0 {
      return false;
   }

   if !entry.file_type().is_dir() {
      return false;
   }

   match entry.file_name().to_str() {
      Some(name) => matches!(
         name,
         ".git" | "node_modules" | "dist" | "build" | "target" | ".next" | "out"
      ),
      None => false,
   }
}

fn relative_path(path: &Path, base: &Path) -> String {
   path
      .strip_prefix(base)
      .unwrap_or(path)
      .to_string_lossy()
      .replace('\\', "/")
}

#[derive(Debug, Serialize)]
pub struct GrepMatch {
   pub file: String,
   pub line: usize,
   pub content: String,
}

#[command]
pub fn rename_file(source_path: String, target_path: String) -> Result<(), String> {
   let source = Path::new(&source_path);
   let target = Path::new(&target_path);

   if !source.exists() {
      return Err("Source path does not exist".to_string());
   }

   if target.exists() {
      return Err("Target path already exists".to_string());
   }

   fs::rename(source, target).map_err(|e| format!("Failed to rename file: {}", e))?;

   Ok(())
}

#[command]
pub fn read_file_contents(path: String) -> Result<String, String> {
   let file_path = Path::new(&path);
   if !file_path.exists() {
      return Err("File does not exist".to_string());
   }

   fs::read_to_string(file_path).map_err(|e| format!("Failed to read file: {}", e))
}

#[command]
pub fn write_file_contents(path: String, content: String) -> Result<(), String> {
   let file_path = Path::new(&path);

   if let Some(parent) = file_path.parent() {
      if !parent.exists() {
         fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
      }
   }

   fs::write(file_path, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[command]
pub fn list_directory(path: String) -> Result<Vec<String>, String> {
   let dir_path = Path::new(&path);

   if !dir_path.exists() {
      return Err("Directory does not exist".to_string());
   }
   if !dir_path.is_dir() {
      return Err("Path is not a directory".to_string());
   }

   let mut entries: Vec<String> = fs::read_dir(dir_path)
      .map_err(|e| format!("Failed to read directory: {}", e))?
      .filter_map(|entry| {
         entry.ok().and_then(|e| {
            let file_type = e.file_type().ok();
            let name = e.file_name().into_string().ok();
            match (file_type, name) {
               (Some(ft), Some(name)) => {
                  if ft.is_dir() {
                     Some(format!("{}/", name))
                  } else {
                     Some(name)
                  }
               }
               _ => None,
            }
         })
      })
      .collect();

   entries.sort();
   Ok(entries)
}

#[command]
pub fn create_directory(path: String) -> Result<(), String> {
   let dir_path = Path::new(&path);
   if dir_path.exists() {
      return Ok(());
   }

   fs::create_dir_all(dir_path).map_err(|e| format!("Failed to create directory: {}", e))
}

#[command]
pub fn search_files(root_path: String, pattern: String) -> Result<Vec<String>, String> {
   let root = Path::new(&root_path);
   if !root.exists() {
      return Err("Root path does not exist".to_string());
   }
   if !root.is_dir() {
      return Err("Root path is not a directory".to_string());
   }

   let glob = Glob::new(&pattern).map_err(|e| format!("Invalid search pattern: {}", e))?;
   let matcher = glob.compile_matcher();

   let mut matches = Vec::new();

   for entry in WalkDir::new(root)
      .follow_links(false)
      .into_iter()
      .filter_entry(|e| !should_skip_dir(e))
      .filter_map(|e| e.ok())
   {
      if !entry.file_type().is_file() {
         continue;
      }

      if let Ok(relative) = entry.path().strip_prefix(root) {
         let relative_str = relative.to_string_lossy();
         if matcher.is_match(relative_str.as_ref()) {
            matches.push(relative_str.replace('\\', "/"));
         }
      }
   }

   matches.sort();
   matches.dedup();

   Ok(matches)
}

#[command]
pub fn grep_search(
   path: String,
   pattern: String,
   case_sensitive: Option<bool>,
   max_results: Option<usize>,
) -> Result<Vec<GrepMatch>, String> {
   if pattern.trim().is_empty() {
      return Err("Search pattern cannot be empty".to_string());
   }

   let search_path = PathBuf::from(&path);
   if !search_path.exists() {
      return Err("Search path does not exist".to_string());
   }

   let max_results = max_results.unwrap_or(100).max(1);
   let regex = RegexBuilder::new(&pattern)
      .case_insensitive(!case_sensitive.unwrap_or(false))
      .build()
      .map_err(|e| format!("Invalid search pattern: {}", e))?;

   let mut results = Vec::new();
   let mut files_to_search: Vec<PathBuf> = Vec::new();
   let base_dir: PathBuf;

   if search_path.is_file() {
      base_dir = search_path
         .parent()
         .map(Path::to_path_buf)
         .unwrap_or_else(|| PathBuf::from("."));
      files_to_search.push(search_path);
   } else {
      base_dir = search_path.clone();
      for entry in WalkDir::new(&search_path)
         .follow_links(false)
         .into_iter()
         .filter_entry(|e| !should_skip_dir(e))
         .filter_map(|e| e.ok())
      {
         if !entry.file_type().is_file() {
            continue;
         }
         files_to_search.push(entry.into_path());
      }
   }

   for file_path in files_to_search {
      if results.len() >= max_results {
         break;
      }

      if let Ok(metadata) = fs::metadata(&file_path) {
         if metadata.len() > MAX_GREP_FILE_SIZE {
            continue;
         }
      }

      let file = match fs::File::open(&file_path) {
         Ok(f) => f,
         Err(_) => continue,
      };

      let reader = BufReader::new(file);
      for (idx, line) in reader.lines().enumerate() {
         let line = match line {
            Ok(content) => content,
            Err(_) => continue,
         };

         if regex.is_match(&line) {
            results.push(GrepMatch {
               file: relative_path(&file_path, &base_dir),
               line: idx + 1,
               content: line,
            });

            if results.len() >= max_results {
               break;
            }
         }
      }
   }

   Ok(results)
}

#[command]
pub fn move_file(source_path: String, target_path: String) -> Result<(), String> {
   let source = Path::new(&source_path);
   let target = Path::new(&target_path);

   // Validate source exists
   if !source.exists() {
      return Err("Source path does not exist".to_string());
   }

   // Validate target doesn't exist
   if target.exists() {
      return Err("Target path already exists".to_string());
   }

   // Ensure target directory exists
   if let Some(parent) = target.parent()
      && !parent.exists()
   {
      return Err("Target directory does not exist".to_string());
   }

   // Check if source is a directory
   if source.is_dir() {
      // Prevent moving a directory into itself
      if target.starts_with(source) {
         return Err("Cannot move a directory into itself".to_string());
      }
   }

   // Try to rename (fast for same filesystem)
   match fs::rename(source, target) {
      Ok(()) => Ok(()),
      Err(rename_err) => {
         // If rename fails, we need different strategies for files vs directories
         if source.is_file() {
            // For files, try copy + delete
            match fs::copy(source, target) {
               Ok(_) => match fs::remove_file(source) {
                  Ok(()) => Ok(()),
                  Err(del_err) => Err(format!(
                     "File copied but failed to delete source: {}",
                     del_err
                  )),
               },
               Err(copy_err) => Err(format!(
                  "Failed to move file: {} (rename: {}, copy: {})",
                  rename_err, rename_err, copy_err
               )),
            }
         } else if source.is_dir() {
            // For directories, we need to recursively copy and then remove
            copy_dir_all(source, target)?;
            remove_dir_all(source)?;
            Ok(())
         } else {
            Err("Source is neither a file nor a directory".to_string())
         }
      }
   }
}

#[command]
pub fn move_path(source_path: String, destination_path: String) -> Result<(), String> {
   move_file(source_path, destination_path)
}

#[command]
pub fn copy_path(
   source_path: String,
   destination_path: String,
   recursive: Option<bool>,
) -> Result<(), String> {
   let source = Path::new(&source_path);
   let destination = Path::new(&destination_path);

   if !source.exists() {
      return Err("Source path does not exist".to_string());
   }

   if destination.exists() {
      return Err("Destination path already exists".to_string());
   }

   if source.is_dir() {
      if !recursive.unwrap_or(true) {
         return Err("Source is a directory - enable recursive copy".to_string());
      }
      copy_dir_all(source, destination)
   } else {
      if let Some(parent) = destination.parent() {
         if !parent.exists() {
            fs::create_dir_all(parent)
               .map_err(|e| format!("Failed to create destination directory: {}", e))?;
         }
      }
      fs::copy(source, destination)
         .map(|_| ())
         .map_err(|e| format!("Failed to copy file: {}", e))
   }
}

#[command]
pub fn delete_path(path: String, recursive: Option<bool>) -> Result<(), String> {
   let target = Path::new(&path);

   if !target.exists() {
      return Ok(());
   }

   if target.is_dir() {
      if !recursive.unwrap_or(false) {
         return Err("Directory deletion requires recursive=true".to_string());
      }
      fs::remove_dir_all(target).map_err(|e| format!("Failed to delete directory: {}", e))
   } else {
      fs::remove_file(target).map_err(|e| format!("Failed to delete file: {}", e))
   }
}

// Helper function to recursively copy a directory
fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), String> {
   // Create the destination directory
   fs::create_dir_all(dst).map_err(|e| format!("Failed to create directory: {}", e))?;

   // Walk through all entries in the source directory
   for entry in WalkDir::new(src).min_depth(1) {
      let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
      let src_path = entry.path();

      // Calculate the relative path and create the destination path
      let relative_path = src_path
         .strip_prefix(src)
         .map_err(|e| format!("Failed to get relative path: {}", e))?;
      let dst_path = dst.join(relative_path);

      if entry.file_type().is_dir() {
         // Create directory
         fs::create_dir_all(&dst_path).map_err(|e| format!("Failed to create directory: {}", e))?;
      } else {
         // Copy file
         fs::copy(src_path, &dst_path).map_err(|e| format!("Failed to copy file: {}", e))?;
      }
   }

   Ok(())
}

// Helper function to recursively remove a directory
fn remove_dir_all(path: &Path) -> Result<(), String> {
   fs::remove_dir_all(path).map_err(|e| format!("Failed to remove directory: {}", e))
}
