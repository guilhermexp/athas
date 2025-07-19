import { invoke } from "@tauri-apps/api/core";

export interface Token {
  start: number;
  end: number;
  token_type: string;
  class_name: string;
}

export async function getTokens(content: string, language: string): Promise<Token[]> {
  return invoke<Token[]>("get_tokens", { content, language });
}

export async function getTokensFromPath(filePath: string): Promise<Token[]> {
  return invoke<Token[]>("get_tokens_from_path", { filePath });
}
