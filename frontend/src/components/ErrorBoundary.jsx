import { Component } from "react";
export class ErrorBoundary extends Component {
  state = {
    hasError: false,
    error: null
  };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Uncaught React Error:", error, errorInfo);
  }
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };
  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-text-secondary">
          <div className="max-w-md w-full border border-border-subtle bg-surface-base/90 rounded-card p-8 flex flex-col gap-6 items-center text-center shadow-card relative overflow-hidden backdrop-blur-md">
            <div className="w-12 h-12 rounded-full border border-accent-danger/20 flex items-center justify-center bg-accent-danger/10 animate-pulse">
              <span className="text-accent-danger font-bold text-lg font-mono">!</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-mono-meta font-mono text-accent-danger tracking-widest uppercase">
                SYSTEM_DIAGNOSTIC // COMPONENT_FAULT
              </span>
              <h2 className="text-md font-mono text-text-primary uppercase tracking-widest">
                An Unexpected Exception Occurred
              </h2>
              <p className="text-text-muted text-xs leading-relaxed font-mono">
                {this.state.error?.message || "The AI Race Engineer encountered an unexpected UI rendering fault."}
              </p>
            </div>
            <div className="flex gap-4 w-full pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 btn-f1-primary py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider"
              >
                Reset State
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 py-2.5 px-4 rounded-badge border border-border-subtle text-text-primary hover:bg-surface-raised transition-colors font-mono text-xs uppercase tracking-wider"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
