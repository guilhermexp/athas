import { invoke } from "@tauri-apps/api/core";

interface Token {
  start: number;
  end: number;
  token_type: string;
  class_name: string;
}

export async function getTokens(content: string, fileExtension: string): Promise<Token[]> {
  return invoke<Token[]>("get_tokens", { content, fileExtension });
}
