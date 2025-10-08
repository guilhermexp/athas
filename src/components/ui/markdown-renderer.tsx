import { Check, Copy } from "lucide-react";
import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Code Block with copy button and line numbers
 */
const CodeBlock = memo(({ language, children }: { language: string; children: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className="group relative my-2">
      {/* Header with language and copy button */}
      <div
        className="flex items-center justify-between rounded-t-md px-3 py-1.5"
        style={{
          background: "var(--color-hover)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span className="font-mono text-text-lighter text-xs">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded px-2 py-0.5 text-text-lighter text-xs opacity-0 transition-all hover:bg-hover/50 group-hover:opacity-100"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-400" strokeWidth={2} />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} strokeWidth={1.5} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto rounded-b-md">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          showLineNumbers
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: "11px",
            lineHeight: "1.5",
          }}
          lineNumberStyle={{
            minWidth: "2.5em",
            paddingRight: "1em",
            color: "var(--color-text-lighter)",
            opacity: 0.4,
            userSelect: "none",
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";

const MarkdownRenderer = memo(({ content, className = "" }: MarkdownRendererProps) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const codeContent = String(children).replace(/\n$/, "");

            // Block code with syntax highlighting
            if (!inline && match) {
              return <CodeBlock language={match[1]}>{codeContent}</CodeBlock>;
            }

            // Inline code
            return (
              <code
                className="rounded px-1 py-0.5 font-mono text-[11px]"
                style={{
                  background: "var(--color-hover)",
                  color: "var(--color-text)",
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          // Style other markdown elements
          h1: ({ children }) => (
            <h1 className="mt-4 mb-3 border-border border-b pb-2 font-semibold text-lg first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3 mb-2 font-semibold text-base first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 mb-2 font-semibold text-sm first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote
              className="my-2 border-l-2 pl-3 italic"
              style={{ borderColor: "var(--color-border)" }}
            >
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline hover:text-blue-300"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="min-w-full border-collapse border border-border text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              className="border border-border px-2 py-1 text-left font-semibold"
              style={{ background: "var(--color-hover)" }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";

export default MarkdownRenderer;
