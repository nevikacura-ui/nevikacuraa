import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, Package, Megaphone, Info, CheckCheck, ChevronRight, Trash2 } from 'lucide-react';
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
  appointment: { bg: 'bg-teal-500/15', border: 'border-teal-500/30', icon: 'text-teal-400', dot: 'bg-teal-400' },
  order: { bg: 'bg-orange-500/15', border: 'border-orange-500/30', icon: 'text-orange-400', dot: 'bg-orange-400' },
  promo: { bg: 'bg-purple-500/15', border: 'border-purple-500/30', icon: 'text-purple-400', dot: 'bg-purple-400' },
  announcement: { bg: 'bg-blue-500/15', border: 'border-blue-500/30', icon: 'text-blue-400', dot: 'bg-blue-400' },
  info: { bg: 'bg-gray-500/15', border: 'border-white/10', icon: 'text-gray-400', dot: 'bg-gray-400' },
};

const NotificationPanel = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread

  const getToken = () => localStorage.getItem('token') || localStorage.getItem('patientToken');

  const fetchNotifications = async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/notifications?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markAllRead = async () => {
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`${API}/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All marked as read');
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
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-24" data-testid="notification-panel">
      {/* Filter bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex gap-2">
          {['all', 'unread'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              data-testid={`notif-filter-${f}`}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-teal-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/15'
              }`}
            >
              {f === 'all' ? 'All' : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            data-testid="panel-mark-all-read"
            className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="px-4 mt-2 space-y-2">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
              <Bell className="w-8 h-8 text-white/10" />
            </div>
            <p className="text-gray-500 text-sm font-medium">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-gray-600 text-xs mt-1">
              {filter === 'unread' ? "You're all caught up!" : "We'll notify you about appointments, orders & more"}
            </p>
          </div>
        ) : (
          filtered.map((n, i) => {
            const colors = typeColors[n.type] || typeColors.info;
            const IconComp = iconMap[n.icon] || Info;
            return (
              <div
                key={i}
                data-testid={`panel-notif-${i}`}
                onClick={() => { if (n.link) navigate(n.link); }}
                className={`relative rounded-xl border ${colors.border} ${
                  !n.read ? colors.bg : 'bg-white/[0.02]'
                } p-3.5 cursor-pointer hover:bg-white/5 transition-all`}
              >
                <div className="flex gap-3">
                  <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                    <IconComp className={`w-4.5 h-4.5 ${colors.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold leading-tight ${!n.read ? 'text-white' : 'text-gray-400'}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0 mt-1.5`} />
                      )}
                    </div>
                    <p className={`text-xs mt-1 leading-relaxed ${!n.read ? 'text-gray-300' : 'text-gray-500'}`}>
                      {n.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-gray-600">{timeAgo(n.created_at)}</span>
                      {n.link && (
                        <span className="flex items-center gap-0.5 text-[10px] text-teal-500">
                          View <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
