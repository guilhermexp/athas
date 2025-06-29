import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import Prism from "prismjs";
import { cn } from "../utils/cn";
import InlineCompletion from "./inline-completion";
import { CompletionDropdown } from "./completion-dropdown";
import MinimapPane from "./minimap-pane";
import {
  requestCompletion,
  cancelCompletion,
  CompletionResponse,
} from "../utils/ai-completion";
import { CompletionItem } from "vscode-languageserver-protocol";

// Import language definitions
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-php";

// Import minimal theme CSS
import "prismjs/themes/prism.css";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
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
  minimap?: boolean;
  // LSP functions passed from parent
  getCompletions?: (
    filePath: string,
    line: number,
    character: number,
  ) => Promise<CompletionItem[]>;
  getHover?: (
    filePath: string,
    line: number,
    character: number,
  ) => Promise<any>;
  isLanguageSupported?: (filePath: string) => boolean;
  openDocument?: (filePath: string, content: string) => Promise<void>;
  changeDocument?: (filePath: string, content: string) => Promise<void>;
  closeDocument?: (filePath: string) => Promise<void>;
}

export interface CodeEditorRef {
  textarea: HTMLTextAreaElement | null;
}

// Language detection based on file extension
const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase();

  const languageMap: { [key: string]: string } = {
    rb: "ruby",
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    java: "java",
    css: "css",
    scss: "css",
    sass: "css",
    json: "json",
    md: "markdown",
    markdown: "markdown",
    sh: "bash",
    bash: "bash",
    yml: "yaml",
    yaml: "yaml",
    sql: "sql",
    html: "markup",
    xml: "markup",
    php: "php",
    phtml: "php",
    php3: "php",
    php4: "php",
    php5: "php",
    php7: "php",
  };

  return languageMap[ext || ""] || "text";
};

// Helper function to escape HTML entities
const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Helper function to safely highlight code with proper HTML escaping
const safeHighlight = (code: string, language: string): string => {
  // For HTML, XML, and markup languages, we need to be extra careful
  // to escape the content first so it displays as code, not renders as HTML
  if (language === "markup" || language === "html" || language === "xml") {
    // First escape all HTML entities in the source code
    const escapedCode = escapeHtml(code);
    
    try {
      // Then apply syntax highlighting to the escaped content
      return Prism.highlight(
        escapedCode,
        Prism.languages[language] || Prism.languages.text,
        language,
      );
    } catch (error) {
      // If highlighting fails, return the escaped content
      return escapedCode;
    }
  }
  
  // For markdown, also escape to prevent rendering of embedded HTML
  if (language === "markdown") {
    const escapedCode = escapeHtml(code);
    
    try {
      return Prism.highlight(
        escapedCode,
        Prism.languages.markdown || Prism.languages.text,
        language,
      );
    } catch (error) {
      return escapedCode;
    }
  }
  
  // For other languages, use normal highlighting
  try {
    return Prism.highlight(
      code,
      Prism.languages[language] || Prism.languages.text,
      language,
    );
  } catch (error) {
    // If highlighting fails, escape and return as plain text
    return escapeHtml(code);
  }
};

interface VimCursorProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  cursorPosition: number;
  visible: boolean;
}

const VimCursor = ({
  textareaRef,
  cursorPosition,
  visible,
}: VimCursorProps) => {
  const [cursorStyle, setCursorStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!textareaRef.current || !visible) {
      setCursorStyle({ display: "none" });
      return;
    }

    const textarea = textareaRef.current;
    const text = textarea.value;

    // Create a temporary element to measure text
    const measureElement = document.createElement("div");
    measureElement.style.position = "absolute";
    measureElement.style.visibility = "hidden";
    measureElement.style.whiteSpace = "pre";
    measureElement.style.fontFamily = getComputedStyle(textarea).fontFamily;
    measureElement.style.fontSize = getComputedStyle(textarea).fontSize;
    measureElement.style.lineHeight = getComputedStyle(textarea).lineHeight;
    measureElement.style.padding = "0";
    measureElement.style.margin = "0";
    measureElement.style.border = "none";

    document.body.appendChild(measureElement);

    // Get text before cursor
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lines = textBeforeCursor.split("\n");
    const currentLineIndex = lines.length - 1;
    const currentLineText = lines[currentLineIndex];

    // Measure line height
    measureElement.textContent = "M";
    const lineHeight = measureElement.offsetHeight;

    // Measure character width at cursor position
    measureElement.textContent = currentLineText;
    const lineWidth = measureElement.offsetWidth;

    // Calculate cursor position - account for padding and line numbers offset
    const top = currentLineIndex * lineHeight + 16; // 16px padding
    const left = lineWidth + 8; // 8px padding-left (pl-2)

    document.body.removeChild(measureElement);

    setCursorStyle({
      position: "absolute",
      top: `${top}px`,
      left: `${left}px`,
      width: "8px",
      height: `${lineHeight}px`,
      backgroundColor: "var(--text-color)",
      opacity: 0.8,
      pointerEvents: "none",
      zIndex: 10,
      animation: "vim-cursor-blink 1s infinite",
      display: "block",
    });
  }, [textareaRef, cursorPosition, visible]);

  return <div style={cursorStyle} />;
};

const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(
  (
    {
      value,
      onChange,
      onKeyDown,
      onCursorPositionChange,
      placeholder,
      disabled,
      className,
      filename = "",
      vimEnabled = false,
      vimMode = "normal",
      cursorPosition = 0,
      searchQuery = "",
      searchMatches = [],
      currentMatchIndex = -1,
      filePath,
      fontSize = 14,
      tabSize = 2,
      wordWrap = true,
      lineNumbers = true,
      aiCompletion = true,
      minimap = false,
      getCompletions,
      getHover,
      isLanguageSupported,
      openDocument,
      changeDocument,
      closeDocument,
    },
    ref,
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLPreElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const [language, setLanguage] = useState<string>("text");
      const [currentCompletion, setCurrentCompletion] =
    useState<CompletionResponse | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [lastCursorPosition, setLastCursorPosition] = useState(0);



    // LSP completion state
    const [lspCompletions, setLspCompletions] = useState<CompletionItem[]>([]);
    const [isLspCompletionVisible, setIsLspCompletionVisible] = useState(false);
    const [selectedLspIndex, setSelectedLspIndex] = useState(0);
    const [completionPosition, setCompletionPosition] = useState({
      top: 0,
      left: 0,
    });

    // Expose textarea ref to parent
    useImperativeHandle(ref, () => ({
      textarea: textareaRef.current,
    }));

    // Update language when filename changes
    useEffect(() => {
      const detectedLanguage = getLanguageFromFilename(filename);
      setLanguage(detectedLanguage);
    }, [filename]);

    // Open/close document with LSP - make async to avoid blocking file loading
    useEffect(() => {
      if (filePath && openDocument && isLanguageSupported?.(filePath)) {
        // Run LSP opening asynchronously to not block file loading
        const openLspDocument = async () => {
          try {
            await openDocument(filePath, value);
          } catch (error) {
            console.error("LSP open document error:", error);
          }
        };
        
        // Use requestIdleCallback to run when browser is idle
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => openLspDocument(), { timeout: 1000 });
        } else {
          setTimeout(openLspDocument, 0);
        }

        return () => {
          if (closeDocument) {
            closeDocument(filePath).catch(error => {
              console.error("LSP close document error:", error);
            });
          }
        };
      }
    }, [filePath, openDocument, closeDocument, isLanguageSupported]);

    // Update LSP when content changes
    useEffect(() => {
      if (filePath && changeDocument && isLanguageSupported?.(filePath)) {
        changeDocument(filePath, value);
      }
    }, [value, filePath, changeDocument, isLanguageSupported]);

    // Handle LSP completion requests
    const handleLspCompletion = async (cursorPos: number) => {
      if (!getCompletions || !filePath || !isLanguageSupported?.(filePath)) {
        return;
      }

      const lines = value.substring(0, cursorPos).split("\n");
      const line = lines.length - 1;
      const character = lines[lines.length - 1].length;

      try {
        const completions = await getCompletions(filePath, line, character);

        if (completions.length > 0) {
          setLspCompletions(completions);
          setSelectedLspIndex(0);
          setIsLspCompletionVisible(true);

          // Calculate position for dropdown
          if (textareaRef.current) {
            const textarea = textareaRef.current;
            const rect = textarea.getBoundingClientRect();
            const scrollTop = textarea.scrollTop;
            const scrollLeft = textarea.scrollLeft;

            // Simple position calculation
            const lineHeight = 20;
            const charWidth = 8;
            const top = rect.top + line * lineHeight - scrollTop + lineHeight;
            const left = rect.left + character * charWidth - scrollLeft;

            setCompletionPosition({ top, left });
          }
        }
      } catch (error) {
        console.error("LSP completion error:", error);
      }
    };

    // Apply LSP completion
    const applyLspCompletion = (completion: CompletionItem) => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const cursorPos = textarea.selectionStart;
      const before = value.substring(0, cursorPos);
      const after = value.substring(cursorPos);

      // Find the word start
      const wordMatch = before.match(/\w*$/);
      const wordStart = wordMatch ? cursorPos - wordMatch[0].length : cursorPos;

      const newValue =
        value.substring(0, wordStart) + completion.insertText + after;
      onChange(newValue);

      // Position cursor after insertion
      const newCursorPos = wordStart + (completion.insertText?.length || 0);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
        }
      });

      setIsLspCompletionVisible(false);
    };

    // Handle completion triggering on input
    const handleCompletionTrigger = (cursorPos: number) => {
      if (disabled || !textareaRef.current) return;

      // Allow completions in vim insert mode, but not in normal/visual modes
      if (vimEnabled && vimMode !== "insert") return;

      // Skip completions for remote files to avoid delays
      const isRemoteFile = filePath?.startsWith("remote://");
      if (isRemoteFile) return;

      // Trigger LSP completion if supported
      if (isLanguageSupported?.(filePath || "")) {
        handleLspCompletion(cursorPos);
      } else if (aiCompletion) {
        // Fallback to AI completion for unsupported languages
        cancelCompletion();
        setShowCompletion(false);

        requestCompletion(
          {
            code: value,
            language,
            filename,
            cursorPosition: cursorPos,
          },
          (completion) => {
            if (completion && completion.completion.trim()) {
              setCurrentCompletion(completion);
              setShowCompletion(true);
            }
          },
        );
      }
    };

    // Request completions when content changes (debounced)
    useEffect(() => {
      if (!textareaRef.current) return;

      const currentCursorPos = textareaRef.current.selectionStart;

      // Only trigger on forward cursor movement (typing)
      if (
        currentCursorPos > lastCursorPosition &&
        currentCursorPos - lastCursorPosition <= 5
      ) {
        const timeoutId = setTimeout(() => {
          handleCompletionTrigger(currentCursorPos);
        }, 300); // Debounce 300ms

        setLastCursorPosition(currentCursorPos);

        return () => clearTimeout(timeoutId);
      } else {
        setLastCursorPosition(currentCursorPos);
      }
    }, [value, language, filename, disabled, vimEnabled, vimMode]);

    // Cleanup completion on unmount
    useEffect(() => {
      return () => {
        cancelCompletion();
      };
    }, []);



    // Function to add search highlighting to syntax highlighted content (memoized)
    const addSearchHighlighting = useMemo(() => {
      return (content: string): string => {
        if (!searchQuery || searchMatches.length === 0) {
          return content;
        }

        // Create a temporary div to work with the highlighted content
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = content;

      // Get the text content to find positions in the highlighted HTML
      const textContent = tempDiv.textContent || "";

      // Sort matches by start position (descending) to process from end to beginning
      const sortedMatches = [...searchMatches].sort(
        (a, b) => b.start - a.start,
      );

      // Process each match from end to beginning to avoid position shifts
      sortedMatches.forEach((match, index) => {
        const originalIndex = searchMatches.indexOf(match);
        const isCurrentMatch = originalIndex === currentMatchIndex;
        const matchClass = isCurrentMatch
          ? "bg-orange-400 text-black font-semibold"
          : "bg-yellow-300 text-black";

        // Find the position in the HTML where this text match occurs
        const walker = document.createTreeWalker(
          tempDiv,
          NodeFilter.SHOW_TEXT,
          null,
        );

        let currentPos = 0;
        let node;

        while ((node = walker.nextNode())) {
          const nodeText = node.textContent || "";
          const nodeStart = currentPos;
          const nodeEnd = currentPos + nodeText.length;

          if (match.start >= nodeStart && match.end <= nodeEnd) {
            // Match is within this text node
            const relativeStart = match.start - nodeStart;
            const relativeEnd = match.end - nodeStart;

            const beforeText = nodeText.substring(0, relativeStart);
            const matchText = nodeText.substring(relativeStart, relativeEnd);
            const afterText = nodeText.substring(relativeEnd);

            // Create the replacement HTML
            const replacement = document.createElement("span");
            replacement.innerHTML =
              beforeText +
              `<span class="${matchClass}">${matchText}</span>` +
              afterText;

            // Replace the text node with our highlighted version
            const parent = node.parentNode;
            if (parent) {
              while (replacement.firstChild) {
                parent.insertBefore(replacement.firstChild, node);
              }
              parent.removeChild(node);
            }
            break;
          }

          currentPos = nodeEnd;
        }
      });

        return tempDiv.innerHTML;
      };
    }, [searchQuery, searchMatches, currentMatchIndex]);

    // Highlight code when value, language, or search changes (debounced for performance)
    useEffect(() => {
      const isRemoteFile = filePath?.startsWith("remote://");
      
      // For remote files, use much longer debounce and run in requestIdleCallback
      // For local files, use minimal debounce for faster loading
      const debounceTime = isRemoteFile ? 1000 : 50;
      
      const timeoutId = setTimeout(() => {
        const performHighlighting = () => {
          if (highlightRef.current && language !== "text") {
            try {
              const highlighted = safeHighlight(value, language);
              const withSearchHighlighting = addSearchHighlighting(highlighted);
              highlightRef.current.innerHTML = withSearchHighlighting;
            } catch (error) {
              // Fallback to escaped plain text if highlighting fails
              const escapedValue = escapeHtml(value);
              const withSearchHighlighting = addSearchHighlighting(escapedValue);
              highlightRef.current.innerHTML = withSearchHighlighting;
            }
          } else if (highlightRef.current) {
            // For plain text, still escape HTML to prevent unwanted rendering
            const escapedValue = escapeHtml(value);
            const withSearchHighlighting = addSearchHighlighting(escapedValue);
            highlightRef.current.innerHTML = withSearchHighlighting;
          }
        };
        
        if (isRemoteFile) {
          // For remote files, use requestIdleCallback to run when browser is idle
          if ('requestIdleCallback' in window) {
            requestIdleCallback(performHighlighting, { timeout: 2000 });
          } else {
            // Fallback for browsers without requestIdleCallback
            requestAnimationFrame(performHighlighting);
          }
        } else {
          performHighlighting();
        }
      }, debounceTime);

      return () => clearTimeout(timeoutId);
    }, [value, language, searchQuery, searchMatches, currentMatchIndex, filePath]);

    // Sync scroll between textarea, highlight layer, and line numbers
    const handleScroll = () => {
      if (
        textareaRef.current &&
        highlightRef.current &&
        lineNumbersRef.current
      ) {
        const scrollTop = textareaRef.current.scrollTop;
        const scrollLeft = textareaRef.current.scrollLeft;

        highlightRef.current.scrollTop = scrollTop;
        highlightRef.current.scrollLeft = scrollLeft;
        lineNumbersRef.current.scrollTop = scrollTop;
      }
    };

    // Handle cursor position changes
    const handleCursorPositionChange = () => {
      if (textareaRef.current && onCursorPositionChange) {
        const position = textareaRef.current.selectionStart;
        onCursorPositionChange(position);

        // Skip LSP for remote files to avoid delays
        const isRemoteFile = filePath?.startsWith("remote://");
        
        // Trigger LSP completion if supported and in insert mode (or vim disabled) - but not for remote files
        if (!isRemoteFile && isLanguageSupported?.(filePath || "") && (!vimEnabled || vimMode === "insert")) {
          handleLspCompletion(position);
        }
      }
    };

    // Handle completion acceptance
    const handleAcceptCompletion = () => {
      if (!currentCompletion || !textareaRef.current) return;

      const currentCursorPos = textareaRef.current.selectionStart;
      const newValue =
        value.substring(0, currentCursorPos) +
        currentCompletion.completion +
        value.substring(currentCursorPos);

      onChange(newValue);
      setShowCompletion(false);
      setCurrentCompletion(null);

      // Move cursor to end of inserted completion
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const newCursorPos =
            currentCursorPos + currentCompletion.completion.length;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
        }
      });
    };

    // Handle completion dismissal
    const handleDismissCompletion = () => {
      setShowCompletion(false);
      setCurrentCompletion(null);
      cancelCompletion();
    };

    const getTextareaClasses = useMemo(() => {
      // Always use transparent text so syntax highlighting layer shows through
      let classes = `absolute top-0 bottom-0 right-0 left-0 m-0 p-4 font-mono leading-6 text-transparent bg-transparent border-none outline-none resize-none overflow-auto z-[2] shadow-none rounded-none transition-none`;

      // Add word wrap classes
      if (wordWrap) {
        classes += " whitespace-pre-wrap break-words";
      } else {
        classes += " whitespace-pre";
      }

      // Add left padding based on line numbers
      if (lineNumbers) {
        classes += " pl-2";
      } else {
        classes += " pl-4";
      }

      if (vimEnabled) {
        classes += " bg-[var(--primary-bg)]";
        if (vimMode === "normal") {
          classes += " caret-transparent";
        } else {
          classes += " caret-[var(--text-color)]";
        }
        if (vimMode === "visual") {
          classes += " vim-visual-selection";
        }
      } else {
        // When vim is disabled, show normal cursor
        classes += " caret-[var(--text-color)]";
      }

      return classes;
    }, [wordWrap, lineNumbers, vimEnabled, vimMode]);

    const getEditorStyles = useMemo(() => {
      return {
        fontSize: `${fontSize}px`,
        tabSize: tabSize,
        lineHeight: `${fontSize * 1.4}px`,
      };
    }, [fontSize, tabSize]);

    // Calculate line numbers (memoized to avoid recalculation on every render)
    const lineNumbersArray = useMemo(() => {
      const lineCount = value.split("\n").length;
      // Limit line numbers for performance - don't render more than 10,000 lines
      const maxLines = Math.min(lineCount, 10000);
      return Array.from({ length: maxLines }, (_, i) => i + 1);
    }, [value]);



    return (
      <div className="flex-1 relative flex flex-col h-full">
        <div className="flex-1 relative overflow-hidden flex h-full">
          {/* Line numbers */}
          {lineNumbers && (
            <div className="w-12 bg-[var(--secondary-bg)] relative overflow-hidden border-r border-[var(--border-color)]">
              <div
                ref={lineNumbersRef}
                className="absolute inset-0 p-4 pr-2 pt-4 font-mono text-right select-none pointer-events-none overflow-hidden"
                style={{
                  fontSize: `${fontSize * 0.85}px`,
                  lineHeight: `${fontSize * 1.4}px`,
                  color: "var(--text-lighter)",
                }}
              >
                {lineNumbersArray.map((num) => (
                  <div key={num} style={{ height: `${fontSize * 1.4}px` }}>
                    {num}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editor content area */}
          <div className="flex-1 relative overflow-hidden h-full">
            {/* Syntax highlighting layer */}
            <pre
              ref={highlightRef}
              className={`absolute top-0 bottom-0 right-0 left-0 m-0 p-4 font-mono text-[var(--text-color)] bg-transparent border-none outline-none overflow-auto pointer-events-none z-[1] ${wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"}`}
              style={{
                ...getEditorStyles,
                paddingLeft: lineNumbers ? "8px" : "16px",
              }}
              aria-hidden="true"
            />

            {/* Textarea for input */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                // Handle LSP completion navigation
                if (isLspCompletionVisible) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedLspIndex((prev) =>
                      prev < lspCompletions.length - 1 ? prev + 1 : 0,
                    );
                    return;
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedLspIndex((prev) =>
                      prev > 0 ? prev - 1 : lspCompletions.length - 1,
                    );
                    return;
                  } else if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    if (lspCompletions[selectedLspIndex]) {
                      applyLspCompletion(lspCompletions[selectedLspIndex]);
                    }
                    return;
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setIsLspCompletionVisible(false);
                    return;
                  }
                }

                // Handle vim mode if enabled
                if (vimEnabled && onKeyDown) {
                  onKeyDown(e);
                }
              }}
              onKeyUp={handleCursorPositionChange}
              onClick={handleCursorPositionChange}
              onScroll={handleScroll}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(getTextareaClasses, className)}
              style={{
                ...getEditorStyles,
                paddingLeft: lineNumbers ? "8px" : "16px",
              }}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
            />

            {/* AI Completion */}
            {(!vimEnabled || vimMode === "insert") && (
              <InlineCompletion
                textareaRef={
                  textareaRef as React.RefObject<HTMLTextAreaElement>
                }
                completion={currentCompletion?.completion || ""}
                cursorPosition={textareaRef.current?.selectionStart || 0}
                visible={showCompletion}
                onAccept={handleAcceptCompletion}
                onDismiss={handleDismissCompletion}
              />
            )}

            {/* Vim cursor for normal mode */}
            {vimEnabled && vimMode === "normal" && (
              <VimCursor
                textareaRef={textareaRef}
                cursorPosition={cursorPosition}
                visible={true}
              />
            )}
          </div>

          {minimap && (
            <MinimapPane 
              content={value}
              textareaRef={textareaRef}
              fontSize={fontSize}
            />
          )}
        </div>

        {/* LSP Completion Dropdown */}
        {isLspCompletionVisible && (
          <CompletionDropdown
            items={lspCompletions}
            selectedIndex={selectedLspIndex}
            onSelect={applyLspCompletion}
            onClose={() => setIsLspCompletionVisible(false)}
            position={completionPosition}
          />
        )}
      </div>
    );
  },
);

CodeEditor.displayName = "CodeEditor";

export default CodeEditor;
