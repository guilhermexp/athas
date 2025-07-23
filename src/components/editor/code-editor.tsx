import type React from "react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useEditorScroll } from "../../hooks/use-editor-scroll";
import { useEditorSync } from "../../hooks/use-editor-sync";
import { useHover } from "../../hooks/use-hover";
import { useLspCompletion } from "../../hooks/use-lsp-completion";
import { useAppStore } from "../../stores/app-store";
import { useBufferStore } from "../../stores/buffer-store";
import { useEditorCompletionStore } from "../../stores/editor-completion-store";
import { useEditorInstanceStore } from "../../stores/editor-instance-store";
import { useEditorSearchStore } from "../../stores/editor-search-store";
import { useEditorSettingsStore } from "../../stores/editor-settings-store";
import { useFileSystemStore } from "../../stores/file-system-store";
import FindBar from "../find-bar";
import BreadcrumbContainer from "./breadcrumbs/breadcrumb-container";
import { CompletionDropdown } from "./completion-dropdown";
import { EditorStyles } from "./editor-styles";
import { HoverTooltip } from "./hover-tooltip";
import { LineNumbers } from "./line-numbers";
import { VirtualTextEditor } from "./virtual-text-editor";

interface CodeEditorProps {
  // All props are now optional as we get most data from stores
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onCursorPositionChange?: (position: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export interface CodeEditorRef {
  editor: HTMLDivElement | null;
  textarea: HTMLDivElement | null;
}

const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(({ className }, ref) => {
  const editorRef = useRef<HTMLDivElement>(null as any);
  const lineNumbersRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

  const { setRefs, setContent, setFileInfo } = useEditorInstanceStore();

  const activeBuffer = useBufferStore(state => state.getActiveBuffer());
  const { handleContentChange } = useAppStore();
  const { fontSize, fontFamily, tabSize, wordWrap, lineNumbers } = useEditorSettingsStore();
  const { aiCompletion } = useEditorCompletionStore();
  const { searchQuery, searchMatches, currentMatchIndex, setSearchMatches, setCurrentMatchIndex } =
    useEditorSearchStore();
  const isFileTreeLoading = useFileSystemStore(state => state.isFileTreeLoading);

  // Extract values from active buffer or use defaults
  const value = activeBuffer?.content || "";
  const filePath = activeBuffer?.path || "";
  const filename = activeBuffer?.name || "";
  const onChange = activeBuffer ? handleContentChange : () => {};

  // Initialize refs in store
  useEffect(() => {
    setRefs({
      editorRef,
      lineNumbersRef,
    });
  }, [setRefs]);

  // Sync content and file info with editor instance store
  useEffect(() => {
    setContent(value, onChange);
  }, [value, onChange, setContent]);

  useEffect(() => {
    setFileInfo(filePath);
  }, [filePath, setFileInfo]);

  // Sync props with store
  useEditorSync({
    value,
    filename,
    filePath,
    fontSize,
    fontFamily,
    tabSize,
    wordWrap,
    lineNumbers,
    disabled: false,
    aiCompletion,
    searchQuery,
    searchMatches,
    currentMatchIndex,
  });

  // LSP completion hook - pass undefined for now as LSP functions come from parent
  useLspCompletion({
    getCompletions: undefined,
    isLanguageSupported: () => false,
    filePath,
    value,
    fontSize,
    lineNumbers,
  });

  // Hover hook - pass undefined for now as LSP functions come from parent
  useHover({
    getHover: undefined,
    isLanguageSupported: () => false,
    filePath,
    fontSize,
    lineNumbers,
  });

  // Scroll management
  const { handleScroll } = useEditorScroll(editorRef, null, lineNumbersRef);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim() || !value) {
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const matches: { start: number; end: number }[] = [];
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    let match: RegExpExecArray | null;

    match = regex.exec(value);
    while (match !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
      });
      // Prevent infinite loop on zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
      match = regex.exec(value);
    }

    setSearchMatches(matches);
    setCurrentMatchIndex(matches.length > 0 ? 0 : -1);
  }, [searchQuery, value, setSearchMatches, setCurrentMatchIndex]);

  // Effect to handle search navigation
  useEffect(() => {
    if (searchMatches.length > 0 && currentMatchIndex >= 0) {
      const match = searchMatches[currentMatchIndex];
      if (match) {
        // Scroll to position
        if (editorRef.current) {
          const editor = editorRef.current;
          const textarea = editor.querySelector('[contenteditable="true"]') as HTMLDivElement;
          if (textarea) {
            textarea.focus();
            // Implement scroll to cursor position
          }
        }
      }
    }
  }, [currentMatchIndex, searchMatches]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Imperative handle
  useImperativeHandle(
    ref,
    () => ({
      editor: editorRef.current,
      textarea: editorRef.current?.querySelector('[contenteditable="true"]') as HTMLDivElement,
    }),
    [],
  );

  // Early return if no active buffer or file tree is loading - must be after all hooks
  if (!activeBuffer || isFileTreeLoading) {
    return <div className="paper-text-secondary flex flex-1 items-center justify-center"></div>;
  }

  return (
    <>
      <EditorStyles />
      <div className="flex h-full flex-col">
        {/* Breadcrumbs */}
        <BreadcrumbContainer />

        {/* Find Bar */}
        <FindBar />

        <div
          ref={editorRef}
          className={`editor-container relative flex-1 overflow-hidden ${className || ""}`}
        >
          {/* Hover Tooltip */}
          <HoverTooltip />

          {/* Main editor layout */}
          <div className="flex h-full">
            {lineNumbers && <LineNumbers />}

            {/* Editor content area */}
            <div className="editor-wrapper relative flex-1 overflow-auto" onScroll={handleScroll}>
              <div className="relative h-full flex-1 bg-primary-bg">
                <VirtualTextEditor />
              </div>

              {/* LSP Completion Dropdown - temporarily disabled */}
              <CompletionDropdown />
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

CodeEditor.displayName = "CodeEditor";

export default CodeEditor;
