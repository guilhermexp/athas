import { shouldIgnore } from "@/file-system/controllers/utils";

export const shouldIgnoreInCommandPalette = (fileName: string, isDir: boolean = false): boolean => {
  return shouldIgnore(fileName, isDir);
};
