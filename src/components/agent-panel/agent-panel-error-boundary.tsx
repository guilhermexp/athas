import { AlertTriangle, RefreshCw } from "lucide-react";
import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary for Agent Panel
 * Catches errors in the component tree and displays a user-friendly fallback UI
 */
export class AgentPanelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for debugging
    console.error("Agent Panel Error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // You can also log to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-secondary-bg p-8 text-center">
          <div className="flex max-w-md flex-col items-center gap-4">
            {/* Error Icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle size={32} className="text-red-500" strokeWidth={1.5} />
            </div>

            {/* Error Title */}
            <h2 className="font-semibold text-text text-xl">Something went wrong</h2>

            {/* Error Message */}
            <p className="text-sm text-text-lighter">
              The Agent Panel encountered an unexpected error. This is likely a bug in the
              application.
            </p>

            {/* Error Details (in development) */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="w-full space-y-2">
                <details className="rounded-md border border-border bg-primary-bg p-3 text-left">
                  <summary className="cursor-pointer font-medium text-text-lighter text-xs hover:text-text">
                    Error Details
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <div className="mb-1 font-medium text-text-lighter text-xs">Message:</div>
                      <pre className="scrollbar-thin max-h-[100px] overflow-auto rounded bg-secondary-bg p-2 text-red-500 text-xs">
                        {this.state.error.message}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <div className="mb-1 font-medium text-text-lighter text-xs">Stack:</div>
                        <pre className="scrollbar-thin max-h-[200px] overflow-auto rounded bg-secondary-bg p-2 text-text-lighter text-xs">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 rounded-md bg-text px-4 py-2 font-medium text-primary-bg text-sm transition-colors hover:bg-text/80"
              >
                <RefreshCw size={14} strokeWidth={2} />
                Try Again
              </button>

              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 rounded-md border border-border bg-transparent px-4 py-2 font-medium text-sm text-text transition-colors hover:bg-hover"
              >
                Reload Page
              </button>
            </div>

            {/* Help Text */}
            <p className="mt-4 text-text-lighter text-xs">
              If the problem persists, please report this issue on{" "}
              <a
                href="https://github.com/your-repo/athas/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                GitHub
              </a>
              .
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
