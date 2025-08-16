import type { FileEntry } from "@/file-system/models/app";

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  text: string;
  match: string;
}

export interface SearchViewProps {
  rootFolderPath?: string;
  allProjectFiles: FileEntry[];
  onFileSelect: (path: string, line?: number, column?: number) => void;
}
