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
      return <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-text-secondary"><div className="max-w-md w-full border border-drs-cyan/30 bg-panel/50 rounded-card p-8 flex flex-col gap-6 items-center text-center shadow-lg relative overflow-hidden backdrop-blur-md"><div className="absolute inset-0 bg-[linear-gradient(to_right,#1c2025_1px,transparent_1px),linear-gradient(to_bottom,#1c2025_1px,transparent_1px)] bg-[size:24px_24px] opacity-5" /><div className="w-12 h-12 rounded-full border border-drs-cyan/20 flex items-center justify-center bg-drs-cyan/5 animate-pulse"><span className="text-drs-cyan font-bold text-lg font-mono">!</span></div><div className="flex flex-col gap-2"><span className="text-mono-meta font-mono text-drs-cyan tracking-widest uppercase">
                SYSTEM_DIAGNOSTIC // COMPONENT_FAULT
              </span><h2 className="text-md font-mono text-text-primary uppercase tracking-widest">
                An Unexpected Exception Occurred
              </h2><p className="text-text-muted text-xs leading-relaxed font-mono">{this.state.error?.message || "The AI Race Engineer encountered an unexpected UI rendering fault."}</p></div><div className="flex gap-4 w-full pt-2"><button
        onClick={this.handleReset}
        className="flex-1 py-2.5 px-4 rounded-button bg-drs-cyan text-canvas hover:bg-drs-cyan-hover transition-colors font-mono text-xs uppercase tracking-wider font-bold"
      >
                Reset State
              </button><button
        onClick={this.handleGoHome}
        className="flex-1 py-2.5 px-4 rounded-button border border-fw-border text-text-primary hover:bg-panel transition-colors font-mono text-xs uppercase tracking-wider"
      >
                Go Home
              </button></div></div></div>;
    }
    return this.props.children;
  }
}
