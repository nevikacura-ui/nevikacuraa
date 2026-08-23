import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

class PortalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[${this.props.name || 'Portal'}] Error:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center" data-testid="error-boundary">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: '#FEE2E2' }}>
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-stone-800 mb-1">Something went wrong</h3>
          <p className="text-sm text-stone-500 mb-4 max-w-xs">
            {this.props.name || 'This section'} encountered an issue. Your data is safe.
          </p>
          <Button onClick={this.handleRetry} variant="outline" size="sm" className="rounded-xl gap-2">
            <RefreshCw className="w-4 h-4" /> Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default PortalErrorBoundary;
