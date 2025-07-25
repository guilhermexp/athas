use anyhow::{Context, Result, bail};
use notify::RecursiveMode;
use notify_debouncer_mini::{DebounceEventResult, Debouncer, new_debouncer};
use std::{
   collections::HashSet,
   path::PathBuf,
   sync::{Arc, Mutex},
   time::Duration,
};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, serde::Serialize)]
pub struct FileChangeEvent {
   pub path: String,
   pub event_type: FileChangeType,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum FileChangeType {
   Created,
   Modified,
   Deleted,
}

pub struct FileWatcher {
   app_handle: AppHandle,
   debouncer: Arc<Mutex<Option<Debouncer<notify::RecommendedWatcher>>>>,
   watched_paths: Arc<Mutex<HashSet<PathBuf>>>,
   watched_directories: Arc<Mutex<HashSet<PathBuf>>>,
   known_files: Arc<Mutex<HashSet<PathBuf>>>,
}

impl FileWatcher {
   pub fn new(app_handle: AppHandle) -> Self {
      Self {
         app_handle,
         debouncer: Arc::new(Mutex::new(None)),
         watched_paths: Arc::new(Mutex::new(HashSet::new())),
         watched_directories: Arc::new(Mutex::new(HashSet::new())),
         known_files: Arc::new(Mutex::new(HashSet::new())),
      }
   }

   pub async fn watch_path(&self, path: String) -> Result<()> {
      let path_buf = PathBuf::from(&path);

      if !path_buf.exists() {
         bail!("Path does not exist: {}", path);
      }

      let mut watched_paths = self.watched_paths.lock().unwrap();
      if watched_paths.contains(&path_buf) {
         return Ok(());
      }

      self.ensure_debouncer_initialized()?;
      self.setup_path_watching(&path_buf, &mut watched_paths)?;

      Ok(())
   }

   fn ensure_debouncer_initialized(&self) -> Result<()> {
      let mut debouncer_guard = self.debouncer.lock().unwrap();
      if debouncer_guard.is_some() {
         return Ok(());
      }

      let debouncer = self.create_debouncer()?;
      *debouncer_guard = Some(debouncer);
      Ok(())
   }

   fn create_debouncer(&self) -> Result<Debouncer<notify::RecommendedWatcher>> {
      let app_handle = self.app_handle.clone();
      let watched_paths = self.watched_paths.clone();
      let watched_directories = self.watched_directories.clone();
      let known_files = self.known_files.clone();

      Ok(new_debouncer(
         Duration::from_millis(300),
         move |result: DebounceEventResult| {
            if let Ok(events) = result {
               Self::handle_events(
                  events,
                  &app_handle,
                  &watched_paths,
                  &watched_directories,
                  &known_files,
               );
            }
         },
      )?)
   }

   fn handle_events(
      events: Vec<notify_debouncer_mini::DebouncedEvent>,
      app_handle: &AppHandle,
      watched_paths: &Arc<Mutex<HashSet<PathBuf>>>,
      watched_directories: &Arc<Mutex<HashSet<PathBuf>>>,
      known_files: &Arc<Mutex<HashSet<PathBuf>>>,
   ) {
      let watched_paths = watched_paths.lock().unwrap();
      let watched_dirs = watched_directories.lock().unwrap();

      for event in events {
         if !Self::is_path_watched(&event.path, &watched_paths, &watched_dirs) {
            continue;
         }

         let event_type = Self::determine_event_type(&event.path, known_files);
         let change_event = FileChangeEvent {
            path: event.path.to_string_lossy().to_string(),
            event_type,
         };

         log::debug!(
            "[FileWatcher] Emitting file-changed event for: {} ({:?})",
            change_event.path,
            change_event.event_type
         );
         let _ = app_handle.emit("file-changed", &change_event);
      }
   }

   fn is_path_watched(
      path: &PathBuf,
      watched_paths: &HashSet<PathBuf>,
      watched_dirs: &HashSet<PathBuf>,
   ) -> bool {
      watched_paths.contains(path) || watched_dirs.iter().any(|dir| path.starts_with(dir))
   }

   fn determine_event_type(
      path: &PathBuf,
      known_files: &Arc<Mutex<HashSet<PathBuf>>>,
   ) -> FileChangeType {
      let mut known_files = known_files.lock().unwrap();

      if !path.exists() {
         known_files.remove(path);
         FileChangeType::Deleted
      } else if known_files.insert(path.clone()) {
         FileChangeType::Created
      } else {
         FileChangeType::Modified
      }
   }

   fn setup_path_watching(
      &self,
      path_buf: &PathBuf,
      watched_paths: &mut HashSet<PathBuf>,
   ) -> Result<()> {
      let mut debouncer_guard = self.debouncer.lock().unwrap();
      let debouncer = debouncer_guard
         .as_mut()
         .context("Debouncer should be initialized")?;

      let recursive_mode = if path_buf.is_dir() {
         RecursiveMode::Recursive
      } else {
         RecursiveMode::NonRecursive
      };

      debouncer.watcher().watch(path_buf, recursive_mode)?;

      if path_buf.is_dir() {
         self.setup_directory_watching(path_buf)?;
      } else {
         self.known_files.lock().unwrap().insert(path_buf.clone());
      }

      watched_paths.insert(path_buf.clone());
      Ok(())
   }

   fn setup_directory_watching(&self, path_buf: &PathBuf) -> Result<()> {
      self
         .watched_directories
         .lock()
         .unwrap()
         .insert(path_buf.clone());

      let entries = std::fs::read_dir(path_buf)?;
      let mut known_files = self.known_files.lock().unwrap();

      entries
         .flatten()
         .map(|entry| entry.path())
         .filter(|path| path.is_file())
         .for_each(|path| {
            known_files.insert(path);
         });

      Ok(())
   }

   pub fn stop_watching(&self, path: String) -> Result<()> {
      let path_buf = PathBuf::from(path);
      let mut watched_paths = self.watched_paths.lock().unwrap();

      if !watched_paths.remove(&path_buf) {
         bail!("Path was not being watched");
      }

      // Remove from watched directories if it's a directory
      if path_buf.is_dir() {
         let mut watched_dirs = self.watched_directories.lock().unwrap();
         watched_dirs.remove(&path_buf);
      }

      // Unwatch the path
      let mut debouncer_guard = self.debouncer.lock().unwrap();
      if let Some(ref mut debouncer) = *debouncer_guard {
         debouncer.watcher().unwatch(&path_buf)?;
      }

      Ok(())
   }

   // unused but this is useful for when we want to stop all watchers
   #[allow(dead_code)]
   pub fn stop_all_watchers(&self) {
      let mut watched_paths = self.watched_paths.lock().unwrap();
      let mut debouncer_guard = self.debouncer.lock().unwrap();

      // Unwatch all paths
      if let Some(ref mut debouncer) = *debouncer_guard {
         for path in watched_paths.iter() {
            let _ = debouncer.watcher().unwatch(path);
         }
      }

      watched_paths.clear();
      *debouncer_guard = None;
   }
}
