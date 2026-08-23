import React from 'react';
import { AlertTriangle, WifiOff, ServerCrash, XCircle, RefreshCcw } from 'lucide-react';

const errorTypes = {
  network: { icon: WifiOff, title: 'Connection Lost', desc: 'Please check your internet and try again', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  server: { icon: ServerCrash, title: 'Server Error', desc: 'Something went wrong on our end. Please try again in a moment', color: 'text-red-400', bg: 'bg-red-500/10' },
  notfound: { icon: XCircle, title: 'Not Found', desc: "We couldn't find what you're looking for", color: 'text-gray-400', bg: 'bg-gray-500/10' },
  auth: { icon: AlertTriangle, title: 'Session Expired', desc: 'Please login again to continue', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  default: { icon: AlertTriangle, title: 'Something Went Wrong', desc: 'An unexpected error occurred. Please try again', color: 'text-red-400', bg: 'bg-red-500/10' },
};

const ErrorDisplay = ({ type = 'default', title, message, onRetry, retryText }) => {
  const config = errorTypes[type] || errorTypes.default;
  const Icon = config.icon;

  return (
    <div className="py-12 px-6 text-center" data-testid={`error-display-${type}`}>
      <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${config.bg} flex items-center justify-center`}>
        <Icon className={`w-8 h-8 ${config.color}`} />
      </div>
      <h3 className="text-base font-bold text-white mb-1.5">{title || config.title}</h3>
      <p className="text-sm text-gray-500 max-w-[280px] mx-auto leading-relaxed">{message || config.desc}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          data-testid="error-retry-btn"
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors border border-white/10"
        >
          <RefreshCcw className="w-4 h-4" />
          {retryText || 'Try Again'}
        </button>
      )}
    </div>
  );
};

export default ErrorDisplay;
