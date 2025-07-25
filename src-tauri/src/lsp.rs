use std::{collections::HashMap, sync::Mutex};

pub struct LSPState {
   _placeholder: Mutex<HashMap<String, String>>,
}

impl LSPState {
   pub fn new() -> Self {
      Self {
         _placeholder: Mutex::new(HashMap::new()),
      }
   }
}
