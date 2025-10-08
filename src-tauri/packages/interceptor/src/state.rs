use crate::types::{InterceptedRequest, InterceptorMessage, StreamingChunk};
use dashmap::DashMap;
use std::sync::Arc;
use tokio::sync::mpsc::UnboundedSender;
use uuid::Uuid;

#[derive(Clone)]
pub struct InterceptorState {
   pub requests: Arc<DashMap<Uuid, InterceptedRequest>>,
   pub tx: UnboundedSender<InterceptorMessage>,
}

impl InterceptorState {
   pub fn new(tx: UnboundedSender<InterceptorMessage>) -> Self {
      Self {
         requests: Arc::new(DashMap::new()),
         tx,
      }
   }

   pub fn add_request(&self, request: InterceptedRequest) {
      let id = request.id;
      self.requests.insert(id, request.clone());
      let _ = self.tx.send(InterceptorMessage::Request { data: request });
   }

   pub fn update_response(&self, id: Uuid, response: InterceptedRequest) {
      self.requests.insert(id, response.clone());
      let _ = self
         .tx
         .send(InterceptorMessage::Response { data: response });
   }

   pub fn send_error(&self, request_id: Uuid, error: String) {
      let _ = self
         .tx
         .send(InterceptorMessage::Error { request_id, error });
   }

   pub fn send_stream_chunk(&self, request_id: Uuid, chunk: StreamingChunk) {
      let _ = self
         .tx
         .send(InterceptorMessage::StreamChunk { request_id, chunk });
   }
}
