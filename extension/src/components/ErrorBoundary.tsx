import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CodeMate AI UI Crash ErrorBoundary]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[420px] p-6 flex flex-col items-center justify-center text-center bg-slate-950 text-slate-100 font-sans select-none">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/5">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>

          <h2 className="text-base font-semibold text-slate-100 mb-1.5">
            {this.props.fallbackTitle || 'Companion Paused'}
          </h2>

          <p className="text-xs text-slate-400 max-w-xs mb-5 leading-relaxed">
            CodeMate encountered an unexpected render issue. Your problem context and editor state remain safe.
          </p>

          <button
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Companion</span>
          </button>

          {this.state.error && (
            <details className="mt-6 w-full max-w-xs text-left">
              <summary className="text-[10px] text-slate-500 hover:text-slate-400 cursor-pointer select-none">
                Technical Details
              </summary>
              <pre className="mt-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-rose-400 overflow-x-auto whitespace-pre-wrap font-mono">
                {this.state.error.message || String(this.state.error)}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
