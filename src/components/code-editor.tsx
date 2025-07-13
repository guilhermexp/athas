import type React from "react";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { CompletionItem } from "vscode-languageserver-protocol";
import { useCodeHighlighting } from "../hooks/use-code-highlighting";
import { useEditorKeyboard } from "../hooks/use-editor-keyboard";
import { useEditorScroll } from "../hooks/use-editor-scroll";
import { useEditorSync } from "../hooks/use-editor-sync";
import { useHover } from "../hooks/use-hover";
import { useLspCompletion } from "../hooks/use-lsp-completion";
import { getCursorPosition, setCursorPosition, useVim } from "../hooks/use-vim";
import { useCodeEditorStore } from "../store/code-editor-store";
import { requestCompletion } from "../utils/ai-completion";
import { cn } from "../utils/cn";
import { CompletionDropdown } from "./completion-dropdown";
import { HoverTooltip } from "./editor/hover-tooltip";
import { VimCursor } from "./editor/vim-cursor";
import VimCommandLine, { type VimCommandLineRef } from "./vim-command-line";

// Import language definitions
import "prismjs/components/prism-bash";
import "prismjs/components/prism-css";
import "prismjs/components/prism-java";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-php";
import "prismjs/components/prism-python";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-toml";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-csharp";

// Import custom theme CSS that adapts to app themes
import "../styles/prism-theme.css";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onCursorPositionChange?: (position: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  filename?: string;
  vimEnabled?: boolean;
  vimMode?: "normal" | "insert" | "visual";
  cursorPosition?: number;
  searchQuery?: string;
  searchMatches?: { start: number; end: number }[];
  currentMatchIndex?: number;
  filePath?: string;
  fontSize?: number;
  tabSize?: number;
  wordWrap?: boolean;
  lineNumbers?: boolean;
  aiCompletion?: boolean;
  // LSP functions passed from parent
  getCompletions?: (filePath: string, line: number, character: number) => Promise<CompletionItem[]>;
  getHover?: (filePath: string, line: number, character: number) => Promise<any>;
  isLanguageSupported?: (filePath: string) => boolean;
  openDocument?: (filePath: string, content: string) => Promise<void>;
  changeDocument?: (filePath: string, content: string) => Promise<void>;
  closeDocument?: (filePath: string) => Promise<void>;
}

export interface CodeEditorRef {
  editor: HTMLDivElement | null;
}

// Main CodeEditor Component
const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(
  (
    {
      value,
      onChange,
      onKeyDown,
      onCursorPositionChange,
      placeholder,
      disabled = false,
      className,
      filename = "",
      vimEnabled = false,
      vimMode = "normal",
      cursorPosition = 0,
      searchQuery = "",
      searchMatches = [],
      currentMatchIndex = -1,
      filePath = "",
      fontSize = 14,
      tabSize = 2,
      wordWrap = false,
      lineNumbers = true,
      aiCompletion = false,
      getCompletions,
      getHover,
      isLanguageSupported,
      openDocument: _openDocument,
      changeDocument: _changeDocument,
      closeDocument: _closeDocument,
    },
    ref,
  ) => {
    // Refs
    const editorRef = useRef<HTMLDivElement | null>(null);
    const highlightRef = useRef<HTMLPreElement | null>(null);
    const lineNumbersRef = useRef<HTMLDivElement | null>(null);
    const mountedRef = useRef(true);
    const vimCommandLineRef = useRef<VimCommandLineRef>(null);

    // Vim command line state
    const [isVimCommandLineVisible, setIsVimCommandLineVisible] = useState(false);
    const [vimCommandLineInitialCommand, setVimCommandLineInitialCommand] = useState("");

    // Store subscriptions - only what we need
    const language = useCodeEditorStore(state => state.language);
    const lspCompletions = useCodeEditorStore(state => state.lspCompletions);
    const selectedLspIndex = useCodeEditorStore(state => state.selectedLspIndex);
    const isLspCompletionVisible = useCodeEditorStore(state => state.isLspCompletionVisible);
    const completionPosition = useCodeEditorStore(state => state.completionPosition);
    const hoverInfo = useCodeEditorStore(state => state.hoverInfo);
    const _currentCompletion = useCodeEditorStore(state => state.currentCompletion);

    // Store actions for AI completion
    const setCurrentCompletion = useCodeEditorStore(state => state.setCurrentCompletion);
    const setShowCompletion = useCodeEditorStore(state => state.setShowCompletion);

    // Initialize hooks
    useCodeHighlighting(highlightRef);
    const { handleKeyDown } = useEditorKeyboard(
      editorRef as React.RefObject<HTMLTextAreaElement>,
      onChange,
      onKeyDown,
    );

    // Sync props with store
    useEditorSync({
      value,
      filename,
      filePath,
      fontSize,
      tabSize,
      wordWrap,
      lineNumbers,
      disabled,
      vimEnabled,
      vimMode,
      aiCompletion,
      searchQuery,
      searchMatches,
      currentMatchIndex,
    });

    // LSP completion hook
    const { handleLspCompletion, applyLspCompletion, handleCompletionClose } = useLspCompletion({
      getCompletions,
      isLanguageSupported,
      filePath,
      value,
      fontSize,
      lineNumbers,
    });

    // Hover hook
    const { handleHover, handleMouseLeave, handleMouseEnter } = useHover({
      getHover,
      isLanguageSupported,
      filePath,
      fontSize,
      lineNumbers,
    });

    // Vim integration
    const { vimEngine } = useVim(
      editorRef as React.RefObject<HTMLDivElement>,
      value,
      onChange,
      vimEnabled,
      (pos: number) => onCursorPositionChange?.(pos),
      () => {}, // Already synced via useEditorSync
      (initialCommand?: string) => {
        setVimCommandLineInitialCommand(initialCommand || "");
        setIsVimCommandLineVisible(true);
        requestAnimationFrame(() => {
          vimCommandLineRef.current?.focus();
        });
      },
    );
    const { handleScroll, handleCursorPositionChange, handleUserInteraction } = useEditorScroll(
      editorRef,
      highlightRef,
      lineNumbersRef,
    );

    // Sync content with contenteditable
    useEffect(() => {
      if (editorRef.current && editorRef.current.textContent !== value) {
        const cursorPos = getCursorPosition(editorRef.current);
        editorRef.current.textContent = value;
        requestAnimationFrame(() => {
          if (editorRef.current) {
            setCursorPosition(editorRef.current, Math.min(cursorPos, value.length));
          }
        });
      }
    }, [value]);

    // Handle imperative ref
    useImperativeHandle(ref, () => ({
      editor: editorRef.current as HTMLDivElement | null,
    }));

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        mountedRef.current = false;
      };
    }, []);

    // Handle AI completion
    useEffect(() => {
      if (!aiCompletion || !editorRef.current) return;

      const handleAiCompletion = async () => {
        const editor = editorRef.current;
        if (!editor) return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const cursorPos = range.startOffset;
        const textBeforeCursor = value.substring(0, cursorPos);

        if (textBeforeCursor.trim().length < 3) return;

        try {
          requestCompletion(
            {
              code: textBeforeCursor,
              language,
              filename: filename || "",
              cursorPosition: cursorPos,
            },
            completion => {
              if (completion?.completion) {
                setCurrentCompletion(completion);
                setShowCompletion(true);
              }
            },
          );
        } catch (error) {
          console.error("AI completion error:", error);
        }
      };

      const timeoutId = setTimeout(handleAiCompletion, 500);
      return () => clearTimeout(timeoutId);
    }, [value, language, aiCompletion, setCurrentCompletion, setShowCompletion, filename]);

    // Calculate styles for contenteditable
    const getEditorClasses = useMemo(() => {
      let classes = `absolute top-0 bottom-0 right-0 left-0 m-0 p-4 font-mono text-text bg-transparent border-none outline-none overflow-auto z-[2] shadow-none rounded-none transition-none`;

      if (lineNumbers) {
        classes += " pl-2";
      } else {
        classes += " pl-4";
      }

      if (vimEnabled) {
        classes += " bg-primary-bg";
        if (vimMode === "normal") {
          classes += " caret-transparent";
        } else {
          classes += " caret-text";
        }
        if (vimMode === "visual") {
          classes += " vim-visual-selection";
        }
      } else {
        classes += " caret-text";
      }

      return classes;
    }, [lineNumbers, vimEnabled, vimMode]);

    const getEditorStyles = useMemo(() => {
      return {
        fontSize: `${fontSize}px`,
        tabSize: tabSize,
        lineHeight: `${fontSize * 1.4}px`,
      };
    }, [fontSize, tabSize]);

    // Calculate line numbers
    const lineNumbersArray = useMemo(() => {
      const lines = value.split("\n");
      // Ensure we always have at least one line number, even for empty content
      const lineCount = Math.max(1, lines.length);
      return Array.from({ length: lineCount }, (_, i) => i + 1);
    }, [value]);

    return (
      <div className="relative flex h-full flex-1 flex-col">
        <style>
          {`
            .code-editor-content {
              font-family: inherit;
              background: transparent;
              border: none;
              outline: none;
              caret-color: var(--text-color);
            }
            .code-editor-content.vim-normal-mode {
              caret-color: transparent;
            }
            .code-editor-content.vim-insert-mode {
              caret-color: var(--text-color);
            }
            .code-editor-content:focus {
              outline: none;
            }
            .code-editor-content::selection {
              background-color: var(--selection-bg, rgba(0, 123, 255, 0.3));
            }
            .code-editor-content::-moz-selection {
              background-color: var(--selection-bg, rgba(0, 123, 255, 0.3));
            }
            .code-editor-content:empty:before {
              content: attr(data-placeholder);
              color: var(--text-lighter);
              pointer-events: none;
            }
            .vim-cursor-blink {
              animation: vim-cursor-blink 1s infinite;
            }
            @keyframes vim-cursor-blink {
              0%, 50% { opacity: 1; }
              51%, 100% { opacity: 0; }
            }

            /* Hide scrollbars on line numbers */
            .line-numbers-container {
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            .line-numbers-container::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>
        <div className="relative flex h-full flex-1 overflow-hidden">
          {/* Line numbers */}
          {lineNumbers && (
            <div className="relative w-16 overflow-hidden border-border border-r bg-secondary-bg">
              <div
                ref={lineNumbersRef}
                className="line-numbers-container pointer-events-none absolute inset-0 select-none overflow-hidden p-4 pt-4 pr-2 text-right font-mono"
                style={{
                  fontSize: `${fontSize * 0.85}px`,
                  lineHeight: `${fontSize * 1.4}px`,
                  color: "var(--text-lighter)",
                  minHeight: "100%",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  transform: "translateZ(0)", // Force hardware acceleration for smooth scrolling
                }}
              >
                {lineNumbersArray.map(num => (
                  <div
                    key={num}
                    className="flex items-center justify-end"
                    style={{
                      height: `${fontSize * 1.4}px`,
                      minHeight: `${fontSize * 1.4}px`,
                      lineHeight: `${fontSize * 1.4}px`,
                      fontSize: `${fontSize * 0.85}px`,
                    }}
                  >
                    <span style={{ lineHeight: `${fontSize * 1.4}px` }}>{num}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editor content area */}
          <div className="relative h-full flex-1 overflow-hidden">
            {/* Contenteditable div for input with syntax highlighting */}
            <div
              ref={editorRef}
              contentEditable={!disabled}
              suppressContentEditableWarning={true}
              onInput={e => {
                handleUserInteraction();
                const content = e.currentTarget.textContent || "";
                // Only call onChange if content actually changed to prevent unnecessary saves
                if (content !== value) {
                  onChange(content);
                }
              }}
              onKeyDown={e => {
                handleUserInteraction();
                if (vimEnabled && vimEngine) {
                  const handled = vimEngine.handleKeyDown(
                    e as any,
                    editorRef.current as any,
                    value,
                  );
                  if (handled) {
                    return;
                  }
                }
                handleKeyDown(e as any);
              }}
              onKeyUp={() =>
                handleCursorPositionChange(
                  onCursorPositionChange,
                  filePath,
                  isLanguageSupported,
                  vimEnabled,
                  vimMode,
                  (pos: number) => handleLspCompletion(pos, editorRef),
                )
              }
              onClick={() => {
                handleUserInteraction();
                handleCursorPositionChange(
                  onCursorPositionChange,
                  filePath,
                  isLanguageSupported,
                  vimEnabled,
                  vimMode,
                  (pos: number) => handleLspCompletion(pos, editorRef),
                );
              }}
              onScroll={handleScroll}
              onMouseMove={handleHover}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className={cn(
                getEditorClasses,
                "code-editor-content",
                vimEnabled && vimMode === "normal" && "vim-normal-mode",
                vimEnabled && vimMode === "insert" && "vim-insert-mode",
                className,
              )}
              style={{
                ...getEditorStyles,
                paddingLeft: lineNumbers ? "16px" : "16px",
                minHeight: "100%",
                outline: "none",
                whiteSpace: wordWrap ? "pre-wrap" : "pre",
                wordBreak: wordWrap ? "break-word" : "normal",
                overflowWrap: wordWrap ? "break-word" : "normal",
                color: "var(--text-color)",
                background: "transparent",
                border: "none",
                zIndex: 2,
                maxWidth: "fit-content",
                minWidth: "100%",
              }}
              spellCheck={false}
              autoCapitalize="off"
              data-placeholder={placeholder}
            />

            {/* Vim cursor for normal mode */}
            {vimEnabled && vimMode === "normal" && (
              <VimCursor
                editorRef={editorRef}
                cursorPosition={cursorPosition}
                visible={true}
                fontSize={fontSize}
                lineNumbers={lineNumbers}
              />
            )}
          </div>
        </div>

        {/* LSP Completion Dropdown */}
        {isLspCompletionVisible && (
          <CompletionDropdown
            items={lspCompletions}
            selectedIndex={selectedLspIndex}
            onSelect={completion => applyLspCompletion(completion, editorRef, onChange)}
            onClose={handleCompletionClose}
            position={completionPosition}
          />
        )}

        {/* Hover Tooltip */}
        <HoverTooltip
          hoverInfo={hoverInfo}
          fontSize={fontSize}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />

        {/* Vim Command Line */}
        {vimEnabled && (
          <VimCommandLine
            ref={vimCommandLineRef}
            isVisible={isVimCommandLineVisible}
            initialCommand={vimCommandLineInitialCommand}
            onClose={() => {
              setIsVimCommandLineVisible(false);
              setVimCommandLineInitialCommand("");
              if (editorRef.current) {
                editorRef.current.focus();
              }
            }}
            onExecuteCommand={command => {
              if (vimEngine) {
                vimEngine.executeExCommand(command, editorRef.current as any, value);
              }
              setIsVimCommandLineVisible(false);
              setVimCommandLineInitialCommand("");
              if (editorRef.current) {
                editorRef.current.focus();
              }
            }}
          />
        )}
      </div>
    );
  },
);

CodeEditor.displayName = "CodeEditor";

export default CodeEditor;
