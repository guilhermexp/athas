use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use tauri_plugin_http::reqwest::{
   Client, Method,
   header::{HeaderMap, HeaderName, HeaderValue},
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchRequest {
   pub url: String,
   pub method: Option<String>,
   pub headers: Option<HashMap<String, String>>,
   pub body: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct FetchResponse {
   pub status: u16,
   pub headers: HashMap<String, String>,
   pub body: String,
}

#[tauri::command]
pub async fn fetch_url(request: FetchRequest) -> Result<FetchResponse, String> {
   let method_str = request.method.unwrap_or_else(|| "GET".to_string());
   let method = Method::from_bytes(method_str.to_uppercase().as_bytes())
      .map_err(|e| format!("Invalid HTTP method: {}", e))?;

   let client = Client::new();
   let mut builder = client.request(method, &request.url);

   if let Some(headers) = request.headers {
      let mut header_map = HeaderMap::new();
      for (key, value) in headers {
         let name: HeaderName = key
            .parse()
            .map_err(|e| format!("Invalid header name '{}': {}", key, e))?;
         let header_value: HeaderValue = value
            .parse()
            .map_err(|e| format!("Invalid header value for '{}': {}", name, e))?;
         header_map.insert(name, header_value);
      }
      builder = builder.headers(header_map);
   }

   if let Some(body) = request.body {
      builder = builder.body(body);
   }

   let response = builder
      .send()
      .await
      .map_err(|e| format!("Failed to fetch URL: {}", e))?;

   let status = response.status().as_u16();
   let headers = response
      .headers()
      .iter()
      .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
      .collect::<HashMap<_, _>>();

   let body = response
      .text()
      .await
      .map_err(|e| format!("Failed to read response body: {}", e))?;

   Ok(FetchResponse {
      status,
      headers,
      body,
   })
}

#[derive(Debug, Serialize)]
pub struct WebSearchResult {
   pub title: String,
   pub url: String,
   pub snippet: String,
}

#[tauri::command]
pub async fn web_search(
   query: String,
   max_results: Option<usize>,
) -> Result<Vec<WebSearchResult>, String> {
   if query.trim().is_empty() {
      return Err("Search query cannot be empty".to_string());
   }

   let limit = max_results.unwrap_or(10).clamp(1, 25);
   let client = Client::new();

   let response = client
      .get("https://api.duckduckgo.com/")
      .query(&[
         ("q", query.as_str()),
         ("format", "json"),
         ("no_redirect", "1"),
         ("no_html", "1"),
         ("skip_disambig", "1"),
      ])
      .header("User-Agent", "Athas-Agent/1.0")
      .send()
      .await
      .map_err(|e| format!("Web search failed: {}", e))?;

   let payload: Value = response
      .json()
      .await
      .map_err(|e| format!("Failed to parse search response: {}", e))?;

   let mut results = Vec::new();
   if let Some(topics) = payload.get("RelatedTopics").and_then(|v| v.as_array()) {
      collect_topics(topics, &mut results, limit);
   }

   if results.is_empty() {
      if let Some(abstract_text) = payload.get("AbstractText").and_then(|v| v.as_str())
         && !abstract_text.is_empty()
         && let Some(abstract_url) = payload.get("AbstractURL").and_then(|v| v.as_str())
      {
         let (title, snippet) = split_title_and_snippet(abstract_text);
         results.push(WebSearchResult {
            title,
            url: abstract_url.to_string(),
            snippet,
         });
      }
   }

   if results.len() > limit {
      results.truncate(limit);
   }

   Ok(results)
}

fn collect_topics(topics: &[Value], results: &mut Vec<WebSearchResult>, limit: usize) {
   for item in topics {
      if results.len() >= limit {
         break;
      }

      if let (Some(text), Some(url)) = (
         item.get("Text").and_then(|v| v.as_str()),
         item.get("FirstURL").and_then(|v| v.as_str()),
      ) {
         let (title, snippet) = split_title_and_snippet(text);
         results.push(WebSearchResult {
            title,
            url: url.to_string(),
            snippet,
         });
      }

      if let Some(nested) = item.get("Topics").and_then(|v| v.as_array()) {
         collect_topics(nested, results, limit);
      }
   }
}

fn split_title_and_snippet(text: &str) -> (String, String) {
   if let Some((title, rest)) = text.split_once(" - ") {
      (title.trim().to_string(), rest.trim().to_string())
   } else {
      (text.trim().to_string(), text.trim().to_string())
   }
}
