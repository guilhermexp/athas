export interface FontInfo {
  name: string;
  family: string;
  style: string;
  is_monospace: boolean;
}

export interface FontSettings {
  fontFamily: string;
  fontFallbacks: string[];
}
