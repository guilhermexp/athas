import type { FileEntry } from "../types/app";
import {
  createDirectory as platformCreateDirectory,
  deletePath as platformDeletePath,
  readDirectory as platformReadDirectory,
  readFile as platformReadFile,
  writeFile as platformWriteFile,
} from "./platform";

export async function readFileContent(path: string): Promise<string> {
  try {
    const content = await platformReadFile(path);
    return content || "";
  } catch (error) {
    throw new Error(`Failed to read file ${path}: ${error}`);
  }
}

export async function writeFileContent(path: string, content: string): Promise<void> {
  try {
    await platformWriteFile(path, content);
  } catch (error) {
    throw new Error(`Failed to write file ${path}: ${error}`);
  }
}

export async function createNewFile(directoryPath: string, fileName: string): Promise<string> {
  const filePath = `${directoryPath}/${fileName}`;
  await writeFileContent(filePath, "");
  return filePath;
}

export async function createNewDirectory(parentPath: string, folderName: string): Promise<string> {
  const folderPath = `${parentPath}/${folderName}`;
  await platformCreateDirectory(folderPath);
  return folderPath;
}

export async function deleteFileOrDirectory(path: string): Promise<void> {
  await platformDeletePath(path);
}

export async function readDirectoryContents(path: string): Promise<FileEntry[]> {
  try {
    const entries = await platformReadDirectory(path);
    return (entries as any[]).map((entry: any) => ({
      name: entry.name || "Unknown",
      path: entry.path || `${path}/${entry.name}`,
      isDir: entry.is_dir || false,
      expanded: false,
      children: undefined,
    }));
  } catch (error) {
    throw new Error(`Failed to read directory ${path}: ${error}`);
  }
}

export async function loadFolderContents(folderEntry: FileEntry): Promise<FileEntry> {
  if (!folderEntry.isDir) {
    return folderEntry;
  }

  try {
    const children = await readDirectoryContents(folderEntry.path);
    return {
      ...folderEntry,
      expanded: true,
      children,
    };
  } catch (error) {
    console.error(`Error loading folder contents for ${folderEntry.path}:`, error);
    return {
      ...folderEntry,
      expanded: true,
      children: [],
    };
  }
}

export function getParentPath(path: string): string {
  const separator = path.includes("\\") ? "\\" : "/";
  const parts = path.split(separator);
  parts.pop();
  return parts.join(separator);
}

export function getFileName(path: string): string {
  const separator = path.includes("\\") ? "\\" : "/";
  const parts = path.split(separator);
  return parts[parts.length - 1] || "";
}

export function joinPath(...parts: string[]): string {
  // Detect separator from first part that contains one
  let separator = "/";
  for (const part of parts) {
    if (part.includes("\\")) {
      separator = "\\";
      break;
    }
  }

  return parts
    .filter(Boolean)
    .join(separator)
    .replace(new RegExp(`\\${separator}+`, "g"), separator);
}
