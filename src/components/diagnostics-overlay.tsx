import { Diagnostic } from "vscode-languageserver-protocol";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

interface DiagnosticOverlayProps {
  diagnostics: Diagnostic[];
  content: string;
  className?: string;
}

const DiagnosticOverlay = ({
  diagnostics,
  content,
  className = "",
}: DiagnosticOverlayProps) => {
  const lines = content.split("\n");

  const getSeverityIcon = (severity: number) => {
    switch (severity) {
      case 1: // Error
        return <AlertCircle size={12} className="text-red-500" />;
      case 2: // Warning
        return <AlertTriangle size={12} className="text-yellow-500" />;
      case 3: // Information
        return <Info size={12} className="text-blue-500" />;
      case 4: // Hint
        return <Info size={12} className="text-gray-500" />;
      default:
        return <AlertCircle size={12} className="text-red-500" />;
    }
  };

  const getSeverityClass = (severity: number) => {
    switch (severity) {
      case 1: // Error
        return "border-b-2 border-red-500 bg-red-50 dark:bg-red-900/20";
      case 2: // Warning
        return "border-b-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
      case 3: // Information
        return "border-b-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20";
      case 4: // Hint
        return "border-b-2 border-gray-500 bg-gray-50 dark:bg-gray-900/20";
      default:
        return "border-b-2 border-red-500 bg-red-50 dark:bg-red-900/20";
    }
  };

  return (
    <div className={`absolute inset-0 pointer-events-none z-10 ${className}`}>
      {diagnostics.map((diagnostic, index) => {
        const startLine = diagnostic.range.start.line;
        const endLine = diagnostic.range.end.line;
        const startChar = diagnostic.range.start.character;
        const endChar = diagnostic.range.end.character;

        // Calculate position for single line diagnostics
        if (startLine === endLine && lines[startLine]) {
          const lineText = lines[startLine];
          const beforeText = lineText.substring(0, startChar);
          const errorText = lineText.substring(startChar, endChar);

          const lineHeight = 24; // 1.5rem * 16px
          const charWidth = 7.8; // Approximate monospace character width

          const top = startLine * lineHeight + 16; // 16px for padding
          const left = 16 + 2 + beforeText.length * charWidth; // 16px padding + 2px for line numbers padding
          const width = errorText.length * charWidth;

          return (
            <div
              key={index}
              className={`absolute ${getSeverityClass(diagnostic.severity || 1)}`}
              style={{
                top: `${top}px`,
                left: `${left}px`,
                width: `${width}px`,
                height: `${lineHeight}px`,
                display: "flex",
                alignItems: "center",
                paddingLeft: "2px",
              }}
              title={diagnostic.message}
            >
              <div className="flex items-center gap-1 opacity-80">
                {getSeverityIcon(diagnostic.severity || 1)}
                <span className="text-xs font-medium">
                  {diagnostic.message.substring(0, 50)}
                  {diagnostic.message.length > 50 ? "..." : ""}
                </span>
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

export default DiagnosticOverlay;
