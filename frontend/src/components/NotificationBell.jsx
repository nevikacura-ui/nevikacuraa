import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check, CheckCheck, Megaphone, Calendar, Package, Info, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const iconMap = {
  calendar: Calendar,
  'calendar-check': Calendar,
  package: Package,
  megaphone: Megaphone,
  info: Info,
};

const typeColors = {
  appointment: 'from-teal-500/20 to-teal-600/10 border-teal-500/30',
  order: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
  promo: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  announcement: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  info: 'from-gray-500/20 to-gray-600/10 border-white/10',
};

const typeIconColors = {
  appointment: 'text-teal-400',
  order: 'text-orange-400',
  promo: 'text-purple-400',
  announcement: 'text-blue-400',
  info: 'text-gray-400',
};

const NotificationBell = ({ lightMode = false }) => {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const getToken = () => localStorage.getItem('token') || localStorage.getItem('patientToken');

  // Poll unread count
  useEffect(() => {
    const fetchCount = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const res = await fetch(`${API}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUnread(data.unread || 0);
        }
      } catch { /* silent */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (!showDropdown) return;
    const fetchNotifs = async () => {
      setLoading(true);
      const token = getToken();
      if (!token) return;
      try {
        const res = await fetch(`${API}/notifications?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchNotifs();
  }, [showDropdown]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  const markAllRead = async () => {
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`${API}/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch { /* silent */ }
  };

  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        data-testid="notification-bell-btn"
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
      >
        <Bell className="w-[18px] h-[18px] transition-colors duration-500" style={{ color: lightMode ? '#57534e' : 'rgba(255,255,255,0.8)' }} />
        {unread > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 animate-pulse"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          data-testid="notification-dropdown"
          className="absolute right-0 top-full mt-2 w-[340px] max-h-[420px] bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100]"
          style={{ backdropFilter: 'blur(20px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  data-testid="mark-all-read-btn"
                  className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
              <button onClick={() => setShowDropdown(false)} className="p-1 hover:bg-white/10 rounded-full">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[320px] scrollbar-hide">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n, i) => {
                const IconComp = iconMap[n.icon] || Info;
                const colors = typeColors[n.type] || typeColors.info;
                const iconColor = typeIconColors[n.type] || typeIconColors.info;
                return (
                  <div
                    key={i}
                    data-testid={`notification-item-${i}`}
                    onClick={() => {
                      if (n.link) navigate(n.link);
                      setShowDropdown(false);
                    }}
                    className={`px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${
                      !n.read ? 'bg-white/[0.03]' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors} border flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <IconComp className={`w-4 h-4 ${iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium leading-tight ${!n.read ? 'text-white' : 'text-gray-400'}`}>
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-gray-600 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-4 py-2.5">
            <button
              onClick={() => { navigate('/profile'); setShowDropdown(false); }}
              data-testid="view-all-notifications-btn"
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 w-full justify-center"
            >
              View all notifications
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
