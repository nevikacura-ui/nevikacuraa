import React from 'react';
import { RefreshCw, Home, Send } from 'lucide-react';

const CHUNK_ERROR_KEY = 'chunk_error_reload';
const ERROR_LOG_KEY = 'last_error_log';

function isChunkLoadError(error) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const name = (error.name || '').toLowerCase();
  return (
    name === 'chunkloaderror' ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('unexpected token') && msg.includes('<') ||
    msg.includes('is not a valid javascript') ||
    msg.includes('mime type') ||
    msg.includes('syntaxerror') && msg.includes('unexpected token') ||
    msg.includes('failed to load') ||
    msg.includes('network error') ||
    msg.includes('load failed') ||
    msg.includes('importing a module script failed')
  );
}

async function clearAllCaches() {
  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
  } catch (e) {
    console.warn('[PageError] Cache clear failed:', e);
  }
}

function logErrorToBackend(error, errorInfo, pageName) {
  try {
    const lastLog = sessionStorage.getItem(ERROR_LOG_KEY);
    const now = Date.now();
    if (lastLog && now - parseInt(lastLog) < 10000) return;
    sessionStorage.setItem(ERROR_LOG_KEY, String(now));

    const API = process.env.REACT_APP_BACKEND_URL || '';
    const payload = {
      type: 'frontend_crash',
      error: error?.message || 'Unknown error',
      stack: (error?.stack || '').slice(0, 1000),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
    fetch(`${API}/api/error-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch (e) {}
}

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, recovering: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[PageError]', this.props.pageName || 'Unknown', error, errorInfo);
    logErrorToBackend(error, errorInfo, this.props.pageName);

    const isChunk = isChunkLoadError(error);
    if (isChunk) {
      const lastReload = sessionStorage.getItem(CHUNK_ERROR_KEY);
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload) > 30000) {
        sessionStorage.setItem(CHUNK_ERROR_KEY, String(now));
        console.log('[PageError] Chunk/asset load failure — clearing caches and reloading...');
        clearAllCaches().then(() => {
          window.location.reload();
        });
        return;
      }
    }
  }

  handleRetry = async () => {
    this.setState({ recovering: true });
    await clearAllCaches();
    sessionStorage.removeItem(CHUNK_ERROR_KEY);
    window.location.reload();
  };

  handleGoHome = async () => {
    await clearAllCaches();
    sessionStorage.removeItem(CHUNK_ERROR_KEY);
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { recovering } = this.state;

      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#0A0A12' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <span className="text-2xl text-red-400">!</span>
          </div>
          <p className="text-lg font-semibold text-white mb-1">Something went wrong</p>
          <p className="text-sm text-gray-500 mb-4 max-w-xs">
            This page ran into an issue. Tap Retry to clear cache and reload.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              disabled={recovering}
              className="px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 text-white"
              style={{ background: 'linear-gradient(135deg, #0D9488, #10B981)', opacity: recovering ? 0.6 : 1 }}
              data-testid="error-reload-btn"
            >
              <RefreshCw className={`w-4 h-4 ${recovering ? 'animate-spin' : ''}`} />
              {recovering ? 'Retrying...' : 'Retry'}
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 text-white"
              style={{ background: 'rgba(255,255,255,0.08)' }}
              data-testid="error-home-btn"
            >
              <Home className="w-4 h-4" />
              Go Home
            </button>
            <a
              href="https://wa.me/918108888330?text=App%20error%20on%20Nevika%20Cura"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 text-amber-400"
              style={{ background: 'rgba(245,158,11,0.1)' }}
              data-testid="error-report-btn"
            >
              <Send className="w-4 h-4" />
              Report
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default PageErrorBoundary;
