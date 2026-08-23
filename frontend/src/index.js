import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const API = process.env.REACT_APP_BACKEND_URL || '';

function reportGlobalError(msg, url) {
  try {
    const last = sessionStorage.getItem('_gerr');
    const now = Date.now();
    if (last && now - parseInt(last) < 15000) return;
    sessionStorage.setItem('_gerr', String(now));
    fetch(`${API}/api/error-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'global_crash',
        error: String(msg).slice(0, 500),
        stack: '',
        url: url || window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {});
  } catch (e) {}
}

window.addEventListener('error', (e) => {
  if (e.message?.includes('Loading chunk') || e.message?.includes('ChunkLoadError') || e.message?.includes('Failed to fetch dynamically')) {
    console.warn('[GlobalError] Chunk load failure detected, clearing caches...');
    if ('caches' in window) caches.keys().then(n => Promise.all(n.map(k => caches.delete(k))));
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(r => r.forEach(x => x.unregister()));
    setTimeout(() => window.location.reload(), 500);
  }
  reportGlobalError(e.message, e.filename);
});

window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || String(e.reason);
  if (msg.includes('Loading chunk') || msg.includes('ChunkLoadError') || msg.includes('Failed to fetch dynamically')) {
    console.warn('[GlobalError] Async chunk load failure, clearing caches...');
    if ('caches' in window) caches.keys().then(n => Promise.all(n.map(k => caches.delete(k))));
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(r => r.forEach(x => x.unregister()));
    setTimeout(() => window.location.reload(), 500);
  }
  reportGlobalError(msg);
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
