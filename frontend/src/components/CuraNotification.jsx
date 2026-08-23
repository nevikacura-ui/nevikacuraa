import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, AlertTriangle, Info, Loader2 } from 'lucide-react';

/* Notification Queue (singleton) */
let _listeners = [];
let _queue = [];
let _idCounter = 0;

export function pushNotification(type, message, options = {}) {
  const id = ++_idCounter;
  const notif = { id, type, message, ...options };
  _queue = [..._queue, notif];
  _listeners.forEach(fn => fn([..._queue]));
  const duration = options.duration || (type === 'error' ? 3200 : 2200);
  setTimeout(() => removeNotification(id), duration);
  return id;
}

function removeNotification(id) {
  _queue = _queue.filter(n => n.id !== id);
  _listeners.forEach(fn => fn([..._queue]));
}

function subscribe(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

/* Type configs — minimal pill style */
const TYPE_CONFIG = {
  success: { Icon: Check, bg: 'rgba(22,163,74,0.95)', border: 'rgba(34,197,94,0.3)', iconBg: 'rgba(255,255,255,0.2)' },
  error:   { Icon: X, bg: 'rgba(220,38,38,0.95)', border: 'rgba(239,68,68,0.3)', iconBg: 'rgba(255,255,255,0.2)' },
  warning: { Icon: AlertTriangle, bg: 'rgba(217,119,6,0.95)', border: 'rgba(245,158,11,0.3)', iconBg: 'rgba(255,255,255,0.2)' },
  info:    { Icon: Info, bg: 'rgba(37,99,235,0.95)', border: 'rgba(59,130,246,0.3)', iconBg: 'rgba(255,255,255,0.2)' },
  loading: { Icon: Loader2, bg: 'rgba(109,40,217,0.95)', border: 'rgba(139,92,246,0.3)', iconBg: 'rgba(255,255,255,0.2)' },
};

/* Minimal Floating Pill */
const MinimalPill = ({ notif, onDone }) => {
  const [exiting, setExiting] = useState(false);
  const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
  const { Icon } = config;

  useEffect(() => {
    const dur = notif.duration || (notif.type === 'error' ? 3200 : 2200);
    const t = setTimeout(() => setExiting(true), dur - 350);
    return () => clearTimeout(t);
  }, [notif.duration, notif.type]);

  return (
    <div
      className="pointer-events-auto flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-full"
      style={{
        background: config.bg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${config.border}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.25), 0 0 12px rgba(0,0,0,0.1)',
        animation: exiting
          ? 'cPillOut 0.3s ease-in forwards'
          : 'cPillIn 0.32s cubic-bezier(0.34,1.56,0.64,1) both',
        maxWidth: '88vw',
      }}
      onClick={() => { setExiting(true); setTimeout(onDone, 300); }}
      data-testid="cura-notification"
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: config.iconBg }}
      >
        <Icon className={`w-3.5 h-3.5 text-white ${notif.type === 'loading' ? 'animate-spin' : ''}`} strokeWidth={3} />
      </div>
      <span className="text-white text-[13px] font-semibold leading-snug truncate">
        {notif.message}
      </span>
    </div>
  );
};

/* Notification Container (portal) */
export const CuraNotificationRenderer = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsub = subscribe(setNotifications);
    return unsub;
  }, []);

  if (notifications.length === 0) return null;

  const latest = notifications[notifications.length - 1];

  return createPortal(
    <div
      className="fixed z-[99999] flex justify-center pointer-events-none"
      style={{
        top: '8%',
        left: 0,
        right: 0,
        animation: 'cFadeIn 0.12s ease-out both',
      }}
    >
      <MinimalPill
        key={latest.id}
        notif={latest}
        onDone={() => removeNotification(latest.id)}
      />
      <style>{`
        @keyframes cFadeIn { 0% { opacity:0; } 100% { opacity:1; } }
        @keyframes cPillIn { 0% { opacity:0; transform:translateY(-16px) scale(0.9); } 100% { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes cPillOut { 0% { opacity:1; transform:translateY(0) scale(1); } 100% { opacity:0; transform:translateY(-12px) scale(0.92); } }
      `}</style>
    </div>,
    document.body
  );
};

export default CuraNotificationRenderer;
