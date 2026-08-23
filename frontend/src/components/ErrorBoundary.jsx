import React from 'react';
import { AlertTriangle, RefreshCw, Send } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, reportSent: false, reportSending: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Auto-report to backend
    this.autoReport(error, errorInfo);
  }

  autoReport = async (error, errorInfo) => {
    try {
      await fetch(`${API}/api/error-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error?.toString() || 'Unknown error',
          stack: errorInfo?.componentStack || '',
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          type: 'auto',
        }),
      });
    } catch {
      // Silent fail — don't crash the error boundary
    }
  };

  handleReport = async () => {
    this.setState({ reportSending: true });
    try {
      const res = await fetch(`${API}/api/error-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: this.state.error?.toString() || 'Unknown error',
          stack: this.state.errorInfo?.componentStack || '',
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          type: 'user_reported',
        }),
      });
      if (res.ok) {
        this.setState({ reportSent: true, reportSending: false });
      }
    } catch {
      this.setState({ reportSending: false });
    }
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, reportSent: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[200px] px-4" data-testid="error-boundary-fallback">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/20 bg-[#111118] p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-white font-semibold text-base mb-1">Something went wrong</h3>
            <p className="text-white/40 text-xs mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>

            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500/20 text-teal-400 text-sm font-medium hover:bg-teal-500/30 transition-colors"
                data-testid="error-boundary-retry"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>

              {!this.state.reportSent ? (
                <button
                  onClick={this.handleReport}
                  disabled={this.state.reportSending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                  data-testid="error-boundary-report"
                >
                  <Send className="w-3.5 h-3.5" />
                  {this.state.reportSending ? 'Sending...' : 'Report Issue'}
                </button>
              ) : (
                <span className="flex items-center gap-1.5 px-4 py-2 text-emerald-400 text-sm">
                  Reported — thank you
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
