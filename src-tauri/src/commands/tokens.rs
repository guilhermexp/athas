use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use tree_sitter::{Language, Node, Parser};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Token {
    pub start: usize,
    pub end: usize,
    pub token_type: String,
    pub class_name: String,
}

fn get_language_config(language_name: &str) -> Result<(Language, &'static str)> {
    match language_name {
        "javascript" | "js" => Ok((
            tree_sitter_javascript::LANGUAGE.into(),
            tree_sitter_javascript::HIGHLIGHT_QUERY,
        )),
        "typescript" | "ts" => Ok((
            tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into(),
            tree_sitter_typescript::HIGHLIGHTS_QUERY,
        )),
        "tsx" => Ok((
            tree_sitter_typescript::LANGUAGE_TSX.into(),
            tree_sitter_typescript::HIGHLIGHTS_QUERY,
        )),
        _ => anyhow::bail!("Unsupported language: {}", language_name),
    }
}

#[tauri::command]
pub async fn get_tokens(content: String, language: String) -> Result<Vec<Token>, String> {
    tokenize_content(&content, &language).map_err(|e| format!("Failed to tokenize: {e}"))
}

// Get node type classification for better token identification
fn classify_node(node: &Node, source: &str) -> (&'static str, &'static str) {
    let node_text = node.utf8_text(source.as_bytes()).unwrap_or("");

    match node.kind() {
        // Keywords
        "const" | "let" | "var" | "function" | "async" | "await" | "return" | "if" | "else"
        | "for" | "while" | "do" | "break" | "continue" | "switch" | "case" | "default" | "try"
        | "catch" | "finally" | "throw" | "new" | "typeof" | "instanceof" | "in" | "import"
        | "export" | "from" | "as" | "class" | "extends" | "static" | "interface" | "type"
        | "enum" | "namespace" | "implements" | "private" | "public" | "protected" | "readonly" => {
            ("keyword", "token-keyword")
        }

        // Literals
        "string" | "template_string" => ("string", "token-string"),
        "number" => ("number", "token-number"),
        "true" | "false" => ("boolean", "token-boolean"),
        "null" | "undefined" => ("null", "token-null"),
        "regex" => ("regex", "token-regex"),

        // Comments
        "comment" | "line_comment" | "block_comment" => ("comment", "token-comment"),

        // Identifiers and names
        "identifier" => {
            // Check if it's a known constant or type
            if node_text.chars().next().is_some_and(|c| c.is_uppercase()) {
                ("constant", "token-constant")
            } else {
                ("identifier", "token-identifier")
            }
        }
        "property_identifier" => ("property", "token-property"),
        "shorthand_property_identifier" => ("property", "token-property"),
        "type_identifier" => ("type", "token-type"),

        // Functions and methods
        "function_declaration"
        | "function_expression"
        | "arrow_function"
        | "method_definition"
        | "generator_function" => {
            // The function name itself will be captured separately
            ("function", "token-function")
        }

        // Function/method calls
        "call_expression" => ("function", "token-function"),

        // JSX/TSX
        "jsx_element"
        | "jsx_opening_element"
        | "jsx_closing_element"
        | "jsx_self_closing_element" => ("jsx", "token-jsx"),
        "jsx_attribute" => ("jsx-attribute", "token-jsx-attribute"),
        "jsx_text" => ("jsx-text", "token-jsx-text"),

        // Operators
        "+" | "-" | "*" | "/" | "%" | "**" | "++" | "--" | "=" | "+=" | "-=" | "*=" | "/="
        | "%=" | "**=" | "==" | "!=" | "===" | "!==" | "<" | ">" | "<=" | ">=" | "&&" | "||"
        | "!" | "?" | ":" | "??" | "?." | "=>" => ("operator", "token-operator"),

        // Punctuation
        "{" | "}" | "[" | "]" | "(" | ")" | ";" | "," | "." | "..." => {
            ("punctuation", "token-punctuation")
        }

        // Types (TypeScript)
        "predefined_type" | "type_alias_declaration" | "interface_declaration" => {
            ("type", "token-type")
        }

        // Default
        _ => {
            // For other nodes, default to text
            ("text", "token-text")
        }
    }
}

fn extract_tokens_from_tree(node: Node, source: &str, tokens: &mut Vec<Token>) {
    // Skip certain node types that shouldn't be tokenized
    let skip_types = [
        "program",
        "statement_block",
        "expression_statement",
        "variable_declaration",
        "lexical_declaration",
        "parenthesized_expression",
        "arguments",
        "formal_parameters",
        "parameter",
    ];

    if skip_types.contains(&node.kind()) {
        // Just recurse into children
        for child in node.children(&mut node.walk()) {
            extract_tokens_from_tree(child, source, tokens);
        }
        return;
    }

    // Special handling for strings and template strings
    match node.kind() {
        "string" | "template_string" => {
            // Tokenize the entire string as one token
            tokens.push(Token {
                start: node.start_byte(),
                end: node.end_byte(),
                token_type: "string".to_string(),
                class_name: "token-string".to_string(),
            });
            return;
        }
        _ => {}
    }

    // Check if this node has no children (leaf node)
    if node.child_count() == 0 {
        let (token_type, class_name) = classify_node(&node, source);

        // Skip whitespace-only text tokens
        if token_type == "text" {
            let text = node.utf8_text(source.as_bytes()).unwrap_or("");
            if text.trim().is_empty() {
                return;
            }
        }

        tokens.push(Token {
            start: node.start_byte(),
            end: node.end_byte(),
            token_type: token_type.to_string(),
            class_name: class_name.to_string(),
        });
    } else {
        // For parent nodes, check if we should tokenize the whole node
        // or recurse into children
        match node.kind() {
            "call_expression" => {
                // Extract function name from call expression
                if let Some(function_node) = node.child_by_field_name("function") {
                    // Check if it's a member expression (e.g., console.log)
                    if function_node.kind() == "member_expression" {
                        extract_tokens_from_tree(function_node, source, tokens);
                    } else {
                        // It's a direct function call
                        tokens.push(Token {
                            start: function_node.start_byte(),
                            end: function_node.end_byte(),
                            token_type: "function".to_string(),
                            class_name: "token-function".to_string(),
                        });
                    }
                }
                if let Some(args_node) = node.child_by_field_name("arguments") {
                    extract_tokens_from_tree(args_node, source, tokens);
                }
            }
            "member_expression" => {
                // Handle object.property
                if let Some(object) = node.child_by_field_name("object") {
                    extract_tokens_from_tree(object, source, tokens);
                }
                // Add the dot
                for child in node.children(&mut node.walk()) {
                    if child.kind() == "." {
                        tokens.push(Token {
                            start: child.start_byte(),
                            end: child.end_byte(),
                            token_type: "punctuation".to_string(),
                            class_name: "token-punctuation".to_string(),
                        });
                    }
                }
                if let Some(property) = node.child_by_field_name("property") {
                    // Check if this member expression is being called (parent is call_expression)
                    let is_method_call =
                        node.parent().is_some_and(|p| p.kind() == "call_expression");

                    tokens.push(Token {
                        start: property.start_byte(),
                        end: property.end_byte(),
                        token_type: if is_method_call {
                            "function"
                        } else {
                            "property"
                        }
                        .to_string(),
                        class_name: if is_method_call {
                            "token-function"
                        } else {
                            "token-property"
                        }
                        .to_string(),
                    });
                }
            }
            _ => {
                // Recurse into children
                for child in node.children(&mut node.walk()) {
                    extract_tokens_from_tree(child, source, tokens);
                }
            }
        }
    }
}

pub fn tokenize_content(content: &str, language: &str) -> Result<Vec<Token>> {
    let (lang, _) = get_language_config(language)?;

    // Parse the content with tree-sitter
    let mut parser = Parser::new();
    parser.set_language(&lang)?;

    let tree = parser
        .parse(content, None)
        .context("Failed to parse content")?;

    let root_node = tree.root_node();
    let mut tokens = Vec::new();

    // Extract all tokens from the syntax tree
    extract_tokens_from_tree(root_node, content, &mut tokens);

    // Sort tokens by start position and remove duplicates
    tokens.sort_by_key(|token| (token.start, token.end));
    tokens.dedup_by(|a, b| a.start == b.start && a.end == b.end);

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

        // Detailed assertions
        assert!(!tokens.is_empty(), "Should have tokens");

        // Check for various token types
        let token_types: Vec<&str> = tokens.iter().map(|t| t.token_type.as_str()).collect();
        let unique_types: std::collections::HashSet<&str> =
            tokens.iter().map(|t| t.token_type.as_str()).collect();

        println!("Unique token types: {:?}", unique_types);

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
        // Properties that are called as methods will be classified as functions
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
}
