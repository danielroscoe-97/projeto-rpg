"use client";

import { Component, type ReactNode } from "react";
import { captureError } from "@/lib/errors/capture";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Component name for logging */
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    captureError(error, {
      component: `ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}`,
      action: "componentDidCatch",
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-center" data-testid="error-boundary">
          <p className="text-red-400 text-sm font-medium mb-2">Something went wrong</p>
          <p className="text-muted-foreground text-xs mb-3">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1.5 text-xs font-medium rounded bg-white/[0.06] text-foreground hover:bg-white/[0.1] transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
