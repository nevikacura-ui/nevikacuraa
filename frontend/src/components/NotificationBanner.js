import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, ChevronRight } from 'lucide-react';
import { onForegroundMessage } from '@/lib/firebase';

const NotificationBanner = () => {
  const [notifications, setNotifications] = useState([]);
  const [visible, setVisible] = useState(null); // currently showing notification

  const dismiss = useCallback(() => {
    setVisible(null);
  }, []);

  // Auto-dismiss after 6s
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(dismiss, 6000);
    return () => clearTimeout(timer);
  }, [visible, dismiss]);

  // Listen for foreground FCM messages
  useEffect(() => {
    const unsub = onForegroundMessage((payload) => {
      const notif = {
        id: Date.now(),
        title: payload?.notification?.title || payload?.data?.title || 'Nevika Cura',
        body: payload?.notification?.body || payload?.data?.body || '',
        image: payload?.notification?.image || null,
        link: payload?.data?.link || null,
        time: new Date(),
      };
      setNotifications(prev => [notif, ...prev].slice(0, 10));
      setVisible(notif);
    });
    return unsub;
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed top-3 left-3 right-3 z-[9999] pointer-events-auto"
      style={{ animation: 'notifSlideDown 0.4s cubic-bezier(0.2,0.8,0.2,1)' }}
      data-testid="notification-banner"
    >
      <style>{`
        @keyframes notifSlideDown {
          from { opacity: 0; transform: translateY(-100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes notifPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(20,184,166,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(20,184,166,0); }
        }
      `}</style>

      <div
        className="max-w-lg mx-auto rounded-2xl p-4 flex items-start gap-3 cursor-pointer"
        style={{
          background: 'rgba(15,15,26,0.95)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(20,184,166,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(20,184,166,0.1)',
        }}
        onClick={() => {
          if (visible.link) window.location.href = visible.link;
          dismiss();
        }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
            animation: 'notifPulse 2s ease-in-out infinite',
          }}
        >
          {visible.image ? (
            <img src={visible.image} alt="" className="w-6 h-6 rounded" />
          ) : (
            <Bell className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white/90 text-sm font-bold truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {visible.title}
            </p>
            <span className="text-white/15 text-[9px] flex-shrink-0">now</span>
          </div>
          {visible.body && (
            <p className="text-white/45 text-xs mt-0.5 line-clamp-2">{visible.body}</p>
          )}
          {visible.link && (
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-teal-400/70 text-[10px] font-medium">View details</span>
              <ChevronRight className="w-3 h-3 text-teal-400/40" />
            </div>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(255,255,255,0.05)' }}
          data-testid="dismiss-notification"
        >
          <X className="w-3.5 h-3.5 text-white/30" />
        </button>
      </div>
    </div>
  );
};

export default NotificationBanner;
