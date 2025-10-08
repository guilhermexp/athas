use nucleo_matcher::{
   Config, Matcher, Utf32Str,
   pattern::{Atom, AtomKind, CaseMatching, Normalization},
};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use walkdir::{DirEntry, WalkDir};

const MAX_INDEXED_ENTRIES: usize = 10_000;

fn should_skip_directory(entry: &DirEntry) -> bool {
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

#[derive(Debug, Serialize, Deserialize)]
pub struct FuzzyMatchItem {
   pub text: String,
   pub score: i64,
   pub indices: Vec<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FuzzyMatchRequest {
   pub pattern: String,
   pub items: Vec<String>,
   pub case_sensitive: Option<bool>,
   pub normalize: Option<bool>,
}

#[tauri::command]
pub fn fuzzy_match(request: FuzzyMatchRequest) -> Vec<FuzzyMatchItem> {
   if request.pattern.is_empty() || request.items.is_empty() {
      return request
         .items
         .into_iter()
         .map(|text| FuzzyMatchItem {
            text,
            score: 0,
            indices: vec![],
         })
         .collect();
   }

   let case_matching = if request.case_sensitive.unwrap_or(false) {
      CaseMatching::Respect
   } else {
      CaseMatching::Smart
   };

   let normalization = if request.normalize.unwrap_or(true) {
      Normalization::Smart
   } else {
      Normalization::Never
   };

   let atom = Atom::new(
      &request.pattern,
      case_matching,
      normalization,
      AtomKind::Fuzzy,
      false,
   );

   let mut matcher = Matcher::new(Config::DEFAULT);
   let mut matches: Vec<FuzzyMatchItem> = Vec::new();

   for item in request.items {
      let mut indices = Vec::new();
      let mut buf = Vec::new();
      let utf32_str = Utf32Str::new(&item, &mut buf);

      if let Some(score) = atom.indices(utf32_str, &mut matcher, &mut indices) {
         matches.push(FuzzyMatchItem {
            text: item,
            score: score as i64,
            indices,
         });
      }
   }

   // Sort by score in descending order
   matches.sort_by(|a, b| b.score.cmp(&a.score));

   matches
}

#[tauri::command]
pub fn fuzzy_find_files(
   root_path: String,
   query: String,
   max_results: Option<usize>,
) -> Result<Vec<String>, String> {
   let root = PathBuf::from(&root_path);
   if !root.exists() {
      return Err("Root path does not exist".to_string());
   }

   let limit = max_results.unwrap_or(20).clamp(1, 200);
   let mut entries: Vec<String> = Vec::new();

   if root.is_file() {
      let base = root.parent().unwrap_or(Path::new(""));
      entries.push(relative_path(&root, base));
   } else {
      let base = root.clone();
      for entry in WalkDir::new(&root)
         .follow_links(false)
         .into_iter()
         .filter_entry(|e| !should_skip_directory(e))
         .filter_map(|e| e.ok())
      {
         if entries.len() >= MAX_INDEXED_ENTRIES {
            break;
         }

         let rel = relative_path(entry.path(), &base);
         if rel.is_empty() {
            continue;
         }

         entries.push(rel);
      }
   }

   if query.trim().is_empty() {
      entries.sort();
      entries.truncate(limit);
      return Ok(entries);
   }

   let atom = Atom::new(
      &query,
      CaseMatching::Smart,
      Normalization::Smart,
      AtomKind::Fuzzy,
      false,
   );

   let mut matcher = Matcher::new(Config::DEFAULT);
   let mut scored: Vec<(i64, String)> = Vec::new();

   for item in entries {
      let mut indices = Vec::new();
      let mut buf = Vec::new();
      let utf32 = Utf32Str::new(&item, &mut buf);

      if let Some(score) = atom.indices(utf32, &mut matcher, &mut indices) {
         scored.push((score as i64, item));
      }
   }

   if scored.is_empty() {
      return Ok(Vec::new());
   }

   scored.sort_by(|a, b| b.0.cmp(&a.0));
   scored.truncate(limit);

   Ok(scored.into_iter().map(|(_, item)| item).collect())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompletionFilterRequest {
   pub pattern: String,
   pub completions: Vec<CompletionItem>,
   pub context_word: String,
   pub context_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionItem {
   pub label: String,
   pub kind: Option<i32>,
   pub detail: Option<String>,
   pub documentation: Option<String>,
   pub sort_text: Option<String>,
   pub filter_text: Option<String>,
   pub insert_text: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FilteredCompletion {
   pub item: CompletionItem,
   pub score: i64,
   pub indices: Vec<u32>,
}

#[tauri::command]
pub fn filter_completions(request: CompletionFilterRequest) -> Vec<FilteredCompletion> {
   if request.context_word.is_empty() {
      // Return all completions if no context word
      return request
         .completions
         .into_iter()
         .map(|item| FilteredCompletion {
            item,
            score: 0,
            indices: vec![],
         })
         .collect();
   }

   let atom = Atom::new(
      &request.context_word,
      CaseMatching::Smart,
      Normalization::Smart,
      AtomKind::Fuzzy,
      false,
   );

   let mut matcher = Matcher::new(Config::DEFAULT);
   let mut filtered: Vec<FilteredCompletion> = Vec::new();

   for completion in request.completions {
      let mut indices = Vec::new();
      let mut buf = Vec::new();

      // Use filter_text if available, otherwise use label
      let text_to_match = completion.filter_text.as_ref().unwrap_or(&completion.label);

      let utf32_str = Utf32Str::new(text_to_match, &mut buf);

      if let Some(score) = atom.indices(utf32_str, &mut matcher, &mut indices) {
         let mut final_score = score as i64;

         // Boost score based on completion kind and context
         if let Some(kind) = completion.kind {
            // Base score based on kind
            let base_boost = match kind {
               5 => 100, // Field
               6 => 150, // Variable
               3 => 200, // Function
               4 => 250, // Constructor
               8 => 300, // Interface
               7 => 300, // Class
               _ => 0,
            };

            // Apply context-specific boosts
            let context_multiplier = match request.context_type.as_deref() {
               Some("member") => match kind {
                  3 | 5 => 2.0, // Boost methods and fields for member access
                  _ => 1.0,
               },
               Some("type") => match kind {
                  7..=9 => 2.0, // Boost classes, interfaces, enums for type context
                  _ => 0.5,
               },
               Some("import") => match kind {
                  9 => 2.0, // Boost modules for import context
                  _ => 1.0,
               },
               _ => 1.0,
            };

            final_score += (base_boost as f64 * context_multiplier) as i64;
         }

         // Consider sort_text if available
         if let Some(sort_text) = &completion.sort_text {
            // Lower sort_text should get higher score
            if sort_text.len() <= 3 {
               final_score += 50;
            }
         }

         filtered.push(FilteredCompletion {
            item: completion,
            score: final_score,
            indices,
         });
      }
   }

   // Sort by score in descending order
   filtered.sort_by(|a, b| b.score.cmp(&a.score));

   // Limit to top 50 results
   filtered.truncate(50);

   filtered
}
