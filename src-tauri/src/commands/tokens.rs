use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tree_sitter_highlight::{HighlightConfiguration, HighlightEvent, Highlighter};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Token {
   pub start: usize,
   pub end: usize,
   pub token_type: String,
   pub class_name: String,
}

// Standard highlight names used by Tree-sitter
const HIGHLIGHT_NAMES: &[&str] = &[
   "attribute",
   "comment",
   "constant",
   "constant.builtin",
   "constructor",
   "embedded",
   "error",
   "function",
   "function.builtin",
   "function.method",
   "keyword",
   "keyword.control",
   "keyword.function",
   "keyword.operator",
   "keyword.return",
   "module",
   "number",
   "operator",
   "property",
   "property.builtin",
   "punctuation",
   "punctuation.bracket",
   "punctuation.delimiter",
   "punctuation.special",
   "string",
   "string.escape",
   "string.special",
   "tag",
   "type",
   "type.builtin",
   "variable",
   "variable.builtin",
   "variable.parameter",
];

fn get_language_config(language_name: &str) -> Result<HighlightConfiguration> {
   match language_name {
      "javascript" | "js" => {
         let mut config = HighlightConfiguration::new(
            tree_sitter_javascript::LANGUAGE.into(),
            language_name,
            tree_sitter_javascript::HIGHLIGHT_QUERY,
            tree_sitter_javascript::INJECTIONS_QUERY,
            tree_sitter_javascript::LOCALS_QUERY,
         )?;
         config.configure(HIGHLIGHT_NAMES);
         Ok(config)
      }
      "typescript" | "ts" => {
         // TypeScript inherits JavaScript highlights, so we use JavaScript's query
         let mut config = HighlightConfiguration::new(
            tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into(),
            language_name,
            tree_sitter_javascript::HIGHLIGHT_QUERY,
            tree_sitter_javascript::INJECTIONS_QUERY,
            tree_sitter_javascript::LOCALS_QUERY,
         )?;
         config.configure(HIGHLIGHT_NAMES);
         Ok(config)
      }
      "tsx" => {
         // TSX also inherits JavaScript highlights
         let mut config = HighlightConfiguration::new(
            tree_sitter_typescript::LANGUAGE_TSX.into(),
            language_name,
            tree_sitter_javascript::HIGHLIGHT_QUERY,
            tree_sitter_javascript::INJECTIONS_QUERY,
            tree_sitter_javascript::LOCALS_QUERY,
         )?;
         config.configure(HIGHLIGHT_NAMES);
         Ok(config)
      }
      "json" => {
         let mut config = HighlightConfiguration::new(
            tree_sitter_json::LANGUAGE.into(),
            language_name,
            tree_sitter_json::HIGHLIGHTS_QUERY,
            "", // JSON doesn't have injections/locals
            "",
         )?;
         config.configure(HIGHLIGHT_NAMES);
         Ok(config)
      }
      "yaml" | "yml" => {
         let mut config = HighlightConfiguration::new(
            tree_sitter_yaml::LANGUAGE.into(),
            language_name,
            tree_sitter_yaml::HIGHLIGHTS_QUERY,
            "", // YAML doesn't have injections/locals
            "",
         )?;
         config.configure(HIGHLIGHT_NAMES);
         Ok(config)
      }
      "go" => {
         let mut config = HighlightConfiguration::new(
            tree_sitter_go::LANGUAGE.into(),
            language_name,
            tree_sitter_go::HIGHLIGHTS_QUERY,
            "", // Go doesn't have injections/locals in the current version
            "",
         )?;
         config.configure(HIGHLIGHT_NAMES);
         Ok(config)
      }
      "ruby" | "rb" => {
         let mut config = HighlightConfiguration::new(
            tree_sitter_ruby::LANGUAGE.into(),
            language_name,
            tree_sitter_ruby::HIGHLIGHTS_QUERY,
            "", // Ruby doesn't have injections/locals in this version
            "",
         )?;
         config.configure(HIGHLIGHT_NAMES);
         Ok(config)
      }
      "rust" | "rs" => {
         let mut config = HighlightConfiguration::new(
            tree_sitter_rust::LANGUAGE.into(),
            language_name,
            tree_sitter_rust::HIGHLIGHTS_QUERY,
            tree_sitter_rust::INJECTIONS_QUERY,
            "", // Rust doesn't have LOCALS_QUERY in this version
         )?;
         config.configure(HIGHLIGHT_NAMES);
         Ok(config)
      }
      "erb" | "html.erb" => {
         let mut config = HighlightConfiguration::new(
            tree_sitter_embedded_template::LANGUAGE.into(),
            language_name,
            tree_sitter_embedded_template::HIGHLIGHTS_QUERY,
            "", // ERB doesn't have injections/locals in this version
            "",
         )?;
         config.configure(HIGHLIGHT_NAMES);
         Ok(config)
      }
      "python" | "py" => {
         let mut config = HighlightConfiguration::new(
            tree_sitter_python::LANGUAGE.into(),
            language_name,
            tree_sitter_python::HIGHLIGHTS_QUERY,
            "", // Python doesn't have injections/locals in this version
            "",
         )?;
         config.configure(HIGHLIGHT_NAMES);
         Ok(config)
      }
      "html" => {
         let mut config = HighlightConfiguration::new(
            tree_sitter_html::LANGUAGE.into(),
            language_name,
            tree_sitter_html::HIGHLIGHTS_QUERY,
            tree_sitter_html::INJECTIONS_QUERY,
            "",
         )?;
         config.configure(HIGHLIGHT_NAMES);
         Ok(config)
      }
      "css" => {
         let mut config = HighlightConfiguration::new(
            tree_sitter_css::LANGUAGE.into(),
            language_name,
            tree_sitter_css::HIGHLIGHTS_QUERY,
            "", // CSS doesn't have injections/locals
            "",
         )?;
         config.configure(HIGHLIGHT_NAMES);
         Ok(config)
      }
      "markdown" | "md" => {
         let mut config = HighlightConfiguration::new(
            tree_sitter_md::LANGUAGE.into(),
            language_name,
            tree_sitter_md::HIGHLIGHT_QUERY_BLOCK,
            tree_sitter_md::INJECTION_QUERY_BLOCK,
            "",
         )?;
         config.configure(HIGHLIGHT_NAMES);
         Ok(config)
      }
      "bash" | "sh" => {
         let mut config = HighlightConfiguration::new(
            tree_sitter_bash::LANGUAGE.into(),
            language_name,
            tree_sitter_bash::HIGHLIGHT_QUERY,
            "", // Bash doesn't have injections/locals in this version
            "",
         )?;
         config.configure(HIGHLIGHT_NAMES);
         Ok(config)
      }
      "toml" => {
         let mut config = HighlightConfiguration::new(
            tree_sitter_toml_ng::LANGUAGE.into(),
            language_name,
            tree_sitter_toml_ng::HIGHLIGHTS_QUERY,
            "", // TOML doesn't have injections/locals in this version
            "",
         )?;
         config.configure(HIGHLIGHT_NAMES);
         Ok(config)
      }
      _ => anyhow::bail!("Unsupported language: {}", language_name),
   }
}

fn get_language_from_path(path: &Path) -> Option<&'static str> {
   // Handle .html.erb files specifically
   if let Some(filename) = path.file_name().and_then(|name| name.to_str())
      && filename.ends_with(".html.erb")
   {
      return Some("erb");
   }

   path
      .extension()
      .and_then(|ext| ext.to_str())
      .and_then(|ext| match ext {
         "js" | "jsx" => Some("javascript"),
         "ts" => Some("typescript"),
         "tsx" => Some("tsx"),
         "json" => Some("json"),
         "yml" | "yaml" => Some("yaml"),
         "go" => Some("go"),
         "rb" | "ruby" => Some("ruby"),
         "rs" => Some("rust"),
         "erb" => Some("erb"),
         "py" => Some("python"),
         "html" | "htm" => Some("html"),
         "css" => Some("css"),
         "md" | "markdown" => Some("markdown"),
         "sh" | "bash" => Some("bash"),
         "toml" => Some("toml"),
         _ => None,
      })
}

fn map_highlight_to_class(highlight_name: &str) -> (&str, &str) {
   match highlight_name {
      "keyword" | "keyword.control" | "keyword.function" | "keyword.operator"
      | "keyword.return" => ("keyword", "token-keyword"),
      "string" | "string.escape" | "string.special" => ("string", "token-string"),
      "number" => ("number", "token-number"),
      "constant" | "constant.builtin" => ("constant", "token-constant"),
      "comment" => ("comment", "token-comment"),
      "function" | "function.builtin" | "function.method" => ("function", "token-function"),
      "type" | "type.builtin" => ("type", "token-type"),
      "variable" | "variable.builtin" | "variable.parameter" => ("identifier", "token-identifier"),
      "property" | "property.builtin" => ("property", "token-property"),
      "operator" => ("operator", "token-operator"),
      "punctuation" | "punctuation.bracket" | "punctuation.delimiter" | "punctuation.special" => {
         ("punctuation", "token-punctuation")
      }
      "tag" => ("jsx", "token-jsx"),
      "attribute" => ("jsx-attribute", "token-jsx-attribute"),
      _ => ("text", "token-text"),
   }
}

#[tauri::command]
pub async fn get_tokens(content: String, file_extension: String) -> Result<Vec<Token>, String> {
   // Determine language from extension
   let language = match file_extension.as_str() {
      "js" | "jsx" => "javascript",
      "ts" => "typescript",
      "tsx" => "tsx",
      "json" => "json",
      "yml" | "yaml" => "yaml",
      "go" => "go",
      "rb" | "ruby" => "ruby",
      "rs" => "rust",
      "erb" | "html.erb" => "erb",
      "py" => "python",
      "html" | "htm" => "html",
      "css" => "css",
      "md" | "markdown" => "markdown",
      "sh" | "bash" => "bash",
      "toml" => "toml",
      _ => return Err(format!("Unsupported file extension: {}", file_extension)),
   };

   tokenize_content(&content, language).map_err(|e| format!("Failed to tokenize: {e}"))
}

#[tauri::command]
pub async fn get_tokens_from_path(file_path: String) -> Result<Vec<Token>, String> {
   let path = Path::new(&file_path);

   // Read the file content asynchronously with tokio
   let content = tokio::fs::read_to_string(&path)
      .await
      .map_err(|e| format!("Failed to read file: {e}"))?;

   // Determine the language from the file extension
   let language = get_language_from_path(path)
      .ok_or_else(|| format!("Unsupported file type: {:?}", path.extension()))?;

   tokenize_content(&content, language).map_err(|e| format!("Failed to tokenize: {e}"))
}

pub fn tokenize_content(content: &str, language: &str) -> Result<Vec<Token>> {
   let config = get_language_config(language)?;
   let mut highlighter = Highlighter::new();

   let highlights = highlighter
      .highlight(&config, content.as_bytes(), None, |_| None)?
      .collect::<Result<Vec<_>, _>>()?;

   let mut tokens = Vec::new();
   let mut current_highlight: Option<usize> = None;

   for event in highlights {
      match event {
         HighlightEvent::Source { start, end } => {
            if let Some(highlight_idx) = current_highlight {
               let highlight_name = HIGHLIGHT_NAMES.get(highlight_idx).unwrap_or(&"text");
               let (token_type, class_name) = map_highlight_to_class(highlight_name);

               // Skip whitespace-only tokens
               let text = &content[start..end];
               if !text.trim().is_empty() {
                  tokens.push(Token {
                     start,
                     end,
                     token_type: token_type.to_string(),
                     class_name: class_name.to_string(),
                  });
               }
            }
         }
         HighlightEvent::HighlightStart(highlight) => {
            current_highlight = Some(highlight.0);
         }
         HighlightEvent::HighlightEnd => {
            current_highlight = None;
         }
      }
   }

   Ok(tokens)
}

#[cfg(test)]
mod tests {
   use super::*;

   #[test]
   fn test_tokenize_javascript() {
      let code = r#"const greeting = "Hello, world!";
function sayHello(name) {
    console.log(`Hello, ${name}!`);
}
const numbers = [1, 2, 3];
const result = numbers.map(n => n * 2);"#;

      let tokens = tokenize_content(code, "javascript").unwrap();
      println!("Found {} tokens", tokens.len());

      // Print all tokens for debugging
      for (i, token) in tokens.iter().enumerate() {
         let text = &code[token.start..token.end];
         println!("Token {}: {:?} = '{}'", i, token, text);
      }

      // Check for various token types
      let token_types: Vec<&str> = tokens.iter().map(|t| t.token_type.as_str()).collect();
      let unique_types: std::collections::HashSet<&str> =
         tokens.iter().map(|t| t.token_type.as_str()).collect();

      println!("Unique token types: {:?}", unique_types);

      assert!(!tokens.is_empty(), "Should have tokens");
      assert!(
         token_types.contains(&"keyword"),
         "Should have keyword tokens"
      );
      assert!(token_types.contains(&"string"), "Should have string tokens");
      assert!(
         token_types.contains(&"identifier"),
         "Should have identifier tokens"
      );
      assert!(
         token_types.contains(&"function"),
         "Should have function tokens"
      );
      assert!(token_types.contains(&"number"), "Should have number tokens");
      assert!(
         token_types.contains(&"punctuation"),
         "Should have punctuation tokens"
      );
      assert!(
         token_types.contains(&"operator"),
         "Should have operator tokens"
      );
   }

   #[test]
   fn test_get_language_from_path() {
      use std::path::Path;

      assert_eq!(
         get_language_from_path(Path::new("test.js")),
         Some("javascript")
      );
      assert_eq!(
         get_language_from_path(Path::new("test.jsx")),
         Some("javascript")
      );
      assert_eq!(
         get_language_from_path(Path::new("test.ts")),
         Some("typescript")
      );
      assert_eq!(get_language_from_path(Path::new("test.tsx")), Some("tsx"));
      assert_eq!(get_language_from_path(Path::new("test.json")), Some("json"));
      assert_eq!(get_language_from_path(Path::new("test.yaml")), Some("yaml"));
      assert_eq!(get_language_from_path(Path::new("test.yml")), Some("yaml"));
      assert_eq!(get_language_from_path(Path::new("test.go")), Some("go"));
      assert_eq!(get_language_from_path(Path::new("test.rb")), Some("ruby"));
      assert_eq!(get_language_from_path(Path::new("test.ruby")), Some("ruby"));
      assert_eq!(get_language_from_path(Path::new("test.rs")), Some("rust"));
      assert_eq!(get_language_from_path(Path::new("test.erb")), Some("erb"));
      assert_eq!(
         get_language_from_path(Path::new("index.html.erb")),
         Some("erb")
      );
      assert_eq!(get_language_from_path(Path::new("test.py")), Some("python"));
      assert_eq!(get_language_from_path(Path::new("test.html")), Some("html"));
      assert_eq!(get_language_from_path(Path::new("test.htm")), Some("html"));
      assert_eq!(get_language_from_path(Path::new("test.css")), Some("css"));
      assert_eq!(
         get_language_from_path(Path::new("test.md")),
         Some("markdown")
      );
      assert_eq!(
         get_language_from_path(Path::new("test.markdown")),
         Some("markdown")
      );
      assert_eq!(get_language_from_path(Path::new("test.sh")), Some("bash"));
      assert_eq!(get_language_from_path(Path::new("test.bash")), Some("bash"));
      assert_eq!(get_language_from_path(Path::new("test.toml")), Some("toml"));
      assert_eq!(get_language_from_path(Path::new("test.txt")), None);
      assert_eq!(get_language_from_path(Path::new("test")), None);
   }

   #[test]
   fn test_tokenize_go() {
      let code = r#"package main

import "fmt"

func main() {
    greeting := "Hello, Go!"
    numbers := []int{1, 2, 3}
    for _, n := range numbers {
        fmt.Printf("Number: %d\n", n)
    }
}"#;

      let tokens = tokenize_content(code, "go").unwrap();
      println!("Found {} tokens", tokens.len());

      // Check for Go-specific token types
      let token_types: Vec<&str> = tokens.iter().map(|t| t.token_type.as_str()).collect();
      assert!(
         token_types.contains(&"keyword"),
         "Should have keyword tokens"
      );
      assert!(token_types.contains(&"string"), "Should have string tokens");
      assert!(
         token_types.contains(&"identifier"),
         "Should have identifier tokens"
      );
      assert!(token_types.contains(&"number"), "Should have number tokens");
   }

   #[test]
   fn test_tokenize_toml() {
      let code = r#"[package]
name = "example"
version = "0.1.0"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = "1.0"

[dev-dependencies]
criterion = "0.5"

[features]
default = ["std"]
std = []"#;

      let tokens = tokenize_content(code, "toml").unwrap();
      println!("Found {} tokens", tokens.len());

      // Check for TOML-specific token types
      let token_types: Vec<&str> = tokens.iter().map(|t| t.token_type.as_str()).collect();
      assert!(!tokens.is_empty(), "Should have tokens");
      assert!(token_types.contains(&"string"), "Should have string tokens");
      assert!(
         token_types.contains(&"punctuation"),
         "Should have punctuation tokens"
      );
   }

   #[test]
   fn test_tokenize_ruby() {
      let code = r#"class User
  def initialize(name)
    @name = name
  end

  def greet
    puts "Hello, #{@name}!"
  end

  def self.create_admin
    new("admin")
  end
end

user = User.new("Alice")
user.greet

numbers = [1, 2, 3].map { |n| n * 2 }"#;

      let tokens = tokenize_content(code, "ruby").unwrap();
      println!("Found {} tokens", tokens.len());

      // Check for Ruby-specific token types
      let token_types: Vec<&str> = tokens.iter().map(|t| t.token_type.as_str()).collect();
      assert!(
         token_types.contains(&"keyword"),
         "Should have keyword tokens"
      );
      assert!(token_types.contains(&"string"), "Should have string tokens");
      assert!(
         token_types.contains(&"identifier"),
         "Should have identifier tokens"
      );
      assert!(token_types.contains(&"number"), "Should have number tokens");
   }
}
