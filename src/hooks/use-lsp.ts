import { useRef, useEffect, useCallback } from "react";
import { CompletionItem } from "vscode-languageserver-protocol";
import { LSPManager } from "../lsp/manager";
import { Diagnostic } from "../components/diagnostics-pane";

interface UseLSPProps {
  workspaceRoot?: string;
  onDiagnostics?: (diagnostics: Diagnostic[]) => void;
}

export function useLSP({ workspaceRoot, onDiagnostics }: UseLSPProps) {
  const lspManager = useRef<LSPManager | null>(null);

  // Initialize LSP manager
  useEffect(() => {
    if (!lspManager.current) {
      lspManager.current = new LSPManager((uri, diagnostics) => {
        // Convert LSP diagnostics to component format
        const convertedDiagnostics: Diagnostic[] = diagnostics.map(diag => ({
          severity:
            diag.severity === 1
              ? "error"
              : diag.severity === 2
                ? "warning"
                : "info",
          line: diag.range.start.line + 1, // Convert to 1-based
          column: diag.range.start.character + 1,
          message: diag.message,
          source: diag.source || "lsp",
          code: diag.code?.toString(),
        }));

        onDiagnostics?.(convertedDiagnostics);
      });
    }

    return () => {
      lspManager.current?.disposeAll();
    };
  }, [onDiagnostics]);

  // Set workspace root when it changes
  useEffect(() => {
    if (workspaceRoot && lspManager.current) {
      lspManager.current.setWorkspaceRoot(workspaceRoot);
    }
  }, [workspaceRoot]);

  const openDocument = useCallback(
    async (filePath: string, content: string) => {
      if (
        !lspManager.current
        || !lspManager.current.isLanguageSupported(filePath)
      )
        return;

      const uri = `file://${filePath}`;
      await lspManager.current.openDocument(uri, content);
    },
    [],
  );

  const changeDocument = useCallback(
    async (filePath: string, content: string) => {
      if (!lspManager.current) return;

      const uri = `file://${filePath}`;
      await lspManager.current.changeDocument(uri, content);
    },
    [],
  );

  const closeDocument = useCallback(async (filePath: string) => {
    if (!lspManager.current) return;

    const uri = `file://${filePath}`;
    await lspManager.current.closeDocument(uri);
  }, []);

  const getCompletions = useCallback(
    async (
      filePath: string,
      line: number,
      character: number,
    ): Promise<CompletionItem[]> => {
      if (!lspManager.current) return [];

      const uri = `file://${filePath}`;
      return lspManager.current.getCompletions(uri, line, character);
    },
    [],
  );

  const getHover = useCallback(
    async (filePath: string, line: number, character: number) => {
      if (!lspManager.current) return null;

      const uri = `file://${filePath}`;
      return lspManager.current.getHover(uri, line, character);
    },
    [],
  );

  const isLanguageSupported = useCallback((filePath: string): boolean => {
    return lspManager.current?.isLanguageSupported(filePath) || false;
  }, []);

  return {
    openDocument,
    changeDocument,
    closeDocument,
    getCompletions,
    getHover,
    isLanguageSupported,
    isReady: !!lspManager.current && !!workspaceRoot,
  };
}
