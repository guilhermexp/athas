use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum InterceptorMessage {
    Request {
        data: serde_json::Value,
    },
    Response {
        data: serde_json::Value,
    },
    StreamChunk {
        request_id: Uuid,
        chunk: serde_json::Value,
    },
    Error {
        request_id: Uuid,
        error: String,
    },
}
