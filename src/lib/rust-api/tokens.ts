import { invoke } from "@tauri-apps/api/core";

export interface Token {
  start: number;
  end: number;
  token_type: string;
  class_name: string;
}

export async function getTokens(content: string, fileExtension: string): Promise<Token[]> {
  return invoke<Token[]>("get_tokens", { content, fileExtension });
}

export async function getTokensFromPath(filePath: string): Promise<Token[]> {
  return invoke<Token[]>("get_tokens_from_path", { filePath });
}
