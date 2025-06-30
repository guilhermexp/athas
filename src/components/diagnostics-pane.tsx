import React from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  line: number;
  column: number;
  message: string;
  source?: string;
  code?: string;
}

interface DiagnosticsPaneProps {
  diagnostics: Diagnostic[];
  isVisible: boolean;
  onClose: () => void;
  onDiagnosticClick?: (diagnostic: Diagnostic) => void;
  isEmbedded?: boolean;
}

const DiagnosticsPane = ({
  diagnostics,
  isVisible,
  onClose,
  onDiagnosticClick,
  isEmbedded = false
}: DiagnosticsPaneProps) => {
  if (!isVisible) return null;

  const getSeverityIcon = (severity: Diagnostic['severity']) => {
    switch (severity) {
      case 'error':
        return <AlertCircle size={14} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={14} className="text-yellow-500" />;
      case 'info':
        return <Info size={14} className="text-blue-500" />;
      default:
        return <Info size={14} className="text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: Diagnostic['severity']) => {
    switch (severity) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;
  const infoCount = diagnostics.filter(d => d.severity === 'info').length;

  // Content component that can be used both embedded and standalone
  const DiagnosticsContent = () => (
    <div className="flex-1 overflow-auto custom-scrollbar">
      {diagnostics.length === 0 ? (
        <div className="flex items-center justify-center h-full text-[var(--text-lighter)] text-xs">
          No problems detected
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-color)]">
          {diagnostics.map((diagnostic, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-2 hover:bg-[var(--hover-color)] cursor-pointer transition-colors"
              onClick={() => onDiagnosticClick?.(diagnostic)}
            >
              {getSeverityIcon(diagnostic.severity)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-[var(--text-lighter)]">
                  <span className="font-mono">Ln {diagnostic.line}</span>
                  <span className="font-mono">Col {diagnostic.column}</span>
                  {diagnostic.source && (
                    <span className="bg-[var(--border-color)] px-1.5 py-0.5 rounded text-xs font-mono">
                      {diagnostic.source}
                    </span>
                  )}
                  {diagnostic.code && (
                    <span className="bg-[var(--selected-color)] px-1.5 py-0.5 rounded text-xs font-mono border border-[var(--border-color)]">
                      {diagnostic.code}
                    </span>
                  )}
                </div>
                <div className={`text-xs mt-1 leading-relaxed ${getSeverityColor(diagnostic.severity)}`}>
                  {diagnostic.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // If embedded, just return the content without container and header
  if (isEmbedded) {
    return (
      <div className="flex flex-col h-full bg-[var(--secondary-bg)]">
        <DiagnosticsContent />
      </div>
    );
  }

  // Standalone version with full container and header
  return (
    <div className="border-t border-[var(--border-color)] bg-[var(--secondary-bg)] flex flex-col h-48">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-4">
          <h3 className="font-mono text-sm text-[var(--text-color)]">Problems</h3>
          <div className="flex items-center gap-4 text-xs">
            {errorCount > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle size={12} />
                <span>{errorCount}</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle size={12} />
                <span>{warningCount}</span>
              </div>
            )}
            {infoCount > 0 && (
              <div className="flex items-center gap-1 text-blue-600">
                <Info size={12} />
                <span>{infoCount}</span>
              </div>
            )}
            {diagnostics.length === 0 && (
              <span className="text-[var(--text-lighter)]">No problems</span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[var(--hover-color)] rounded"
          title="Close"
        >
          <X size={14} className="text-[var(--text-lighter)]" />
        </button>
      </div>

      {/* Content */}
      <DiagnosticsContent />
    </div>
  );
};

export default DiagnosticsPane; 