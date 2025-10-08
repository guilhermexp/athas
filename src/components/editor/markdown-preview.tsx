import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { cn } from "@/utils/cn";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

const MarkdownPreview = memo(({ content, className }: MarkdownPreviewProps) => {
  const renderedContent = useMemo(() => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className={cn("rounded bg-primary-bg/50 px-1.5 py-0.5", className)} {...props}>
                {children}
              </code>
            );
          },
          h1: ({ children }) => (
            <h1 className="mt-6 mb-4 border-border/40 border-b pb-2 font-bold text-3xl text-text">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-5 mb-3 border-border/40 border-b pb-2 font-bold text-2xl text-text">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 mb-2 font-bold text-text text-xl">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-3 mb-2 font-semibold text-lg text-text">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-4 text-text-lighter leading-relaxed">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-4 ml-6 list-disc text-text-lighter">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-6 list-decimal text-text-lighter">{children}</ol>
          ),
          li: ({ children }) => <li className="mb-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-accent/50 border-l-4 bg-secondary-bg/50 py-2 pr-4 pl-4 text-text-lighter italic">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-accent underline hover:text-accent/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="min-w-full border-collapse border border-border/40">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-secondary-bg/50">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-border/40 border-b">{children}</tr>,
          th: ({ children }) => (
            <th className="border border-border/40 px-4 py-2 text-left font-semibold text-text">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border/40 px-4 py-2 text-text-lighter">{children}</td>
          ),
          hr: () => <hr className="my-6 border-border/40" />,
        }}
      >
        {content}
      </ReactMarkdown>
    );
  }, [content, className]);

  return (
    <div
      className={cn(
        "h-full overflow-y-auto bg-primary-bg px-8 py-6",
        "prose prose-invert max-w-none",
        className,
      )}
      style={{ fontFamily: "var(--font-ui)" }}
    >
      {renderedContent}
    </div>
  );
});

MarkdownPreview.displayName = "MarkdownPreview";

export default MarkdownPreview;
