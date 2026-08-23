import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  Bell, BellRing, Clock, Heart, Activity, Droplets, Moon,
  Dumbbell, Brain, Sparkles, Baby, Syringe, TrendingUp, 
  Check, X, Send, Shield, Pill
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const ICON_MAP = {
  heart: Heart, activity: Activity, droplets: Droplets, moon: Moon,
  dumbbell: Dumbbell, brain: Brain, sparkles: Sparkles, baby: Baby,
  syringe: Syringe, 'trending-up': TrendingUp, clock: Clock, pill: Pill,
};

const PORTAL_COLORS = {
  evara: { gradient: 'from-rose-400 to-pink-500', bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-200' },
  glydex: { gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-200' },
  reneu: { gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200' },
  alyne: { gradient: 'from-teal-400 to-cyan-500', bg: 'bg-teal-50', text: 'text-teal-600', ring: 'ring-teal-200' },
};

const HealthReminders = ({ open, onOpenChange, portal = 'evara' }) => {
  const [reminders, setReminders] = useState([]);
  const [userReminders, setUserReminders] = useState({});
  const [loading, setLoading] = useState(true);
  const [testTitle, setTestTitle] = useState('');
  const [testBody, setTestBody] = useState('');
  const [sending, setSending] = useState(false);

  const token = localStorage.getItem('token') || localStorage.getItem('staffToken');
  const userEmail = localStorage.getItem('userEmail') || '';
  const { isSubscribed, subscribe, permission } = usePushNotifications(userEmail);

  const colors = PORTAL_COLORS[portal] || PORTAL_COLORS.evara;

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/health-reminders/defaults/${portal}`);
      if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders || []);
      }
      if (token) {
        const userRes = await fetch(`${API}/api/health-reminders/my-reminders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          const map = {};
          (userData.reminders || []).forEach(r => { map[r.reminder_id] = r; });
          setUserReminders(map);
        }
      }
    } catch {}
    setLoading(false);
  }, [portal, token]);

  useEffect(() => { if (open) fetchReminders(); }, [open, fetchReminders]);

  const toggleReminder = async (reminder) => {
    if (!token) { toast.error('Please login to set reminders'); return; }
    const current = userReminders[reminder.id];
    const newEnabled = current ? !current.enabled : !reminder.enabled;
    try {
      const res = await fetch(`${API}/api/health-reminders/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reminder_id: reminder.id, portal, enabled: newEnabled, time: reminder.time }),
      });
      if (res.ok) {
        const data = await res.json();
        setUserReminders(prev => ({ ...prev, [reminder.id]: data.reminder }));
        toast.success(newEnabled ? 'Reminder enabled' : 'Reminder disabled');
      }
    } catch { toast.error('Failed to update'); }
  };

  const sendTestNotification = async () => {
    if (!token) { toast.error('Please login first'); return; }
    if (!testTitle.trim()) { toast.error('Enter a title'); return; }
    setSending(true);
    try {
      const res = await fetch(`${API}/api/health-reminders/test-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: testTitle, body: testBody || 'Test notification from Nevika Health' }),
      });
      const data = await res.json();
      if (data.success && data.sent > 0) toast.success(`Notification sent to ${data.sent} device(s)`);
      else toast.info(data.message || 'No active devices found');
    } catch { toast.error('Failed to send'); }
    setSending(false);
  };

  const isEnabled = (r) => userReminders[r.id]?.enabled ?? r.enabled;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 rounded-2xl border-0 overflow-hidden max-h-[85vh]" data-testid="health-reminders-modal">
        <div className={`bg-gradient-to-r ${colors.gradient} p-5 text-white`}>
          <DialogHeader>
            <DialogTitle className="text-xl text-white flex items-center gap-2">
              <BellRing className="w-6 h-6" /> Health Reminders
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/80 text-sm mt-1">Never miss a health check</p>

          {/* Notification Permission */}
          {permission !== 'granted' && (
            <button onClick={subscribe} className="mt-3 w-full bg-white/20 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 hover:bg-white/30 transition-all" data-testid="enable-notifications-btn">
              <Bell className="w-5 h-5" />
              <div className="text-left">
                <p className="text-sm font-semibold">Enable Push Notifications</p>
                <p className="text-[10px] text-white/70">Allow browser notifications to receive reminders</p>
              </div>
            </button>
          )}
          {permission === 'granted' && isSubscribed && (
            <div className="mt-3 bg-white/15 rounded-xl p-2.5 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-300" />
              <span className="text-xs text-white/90">Notifications enabled</span>
            </div>
          )}
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[50vh]">
          {/* Reminder Toggles */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-gray-700">Your Reminders</h3>
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
            ) : (
              reminders.map((r) => {
                const IconComp = ICON_MAP[r.icon] || Bell;
                const enabled = isEnabled(r);
                return (
                  <div key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${enabled ? `${colors.bg} border-transparent ring-1 ${colors.ring}` : 'bg-gray-50 border-gray-100'}`}
                    data-testid={`reminder-${r.id}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? colors.bg : 'bg-gray-100'}`}>
                      <IconComp className={`w-5 h-5 ${enabled ? colors.text : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${enabled ? 'text-gray-800' : 'text-gray-500'}`}>{r.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">{r.body}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-gray-300" />
                        <span className="text-[10px] text-gray-400">{r.time}</span>
                      </div>
                    </div>
                    <button onClick={() => toggleReminder(r)} className={`w-12 h-7 rounded-full transition-all relative ${enabled ? `bg-gradient-to-r ${colors.gradient}` : 'bg-gray-200'}`}
                      data-testid={`toggle-${r.id}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-1 transition-all ${enabled ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Test Notification */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Send className="w-4 h-4" /> Send Test Notification
            </h3>
            <div className="space-y-2">
              <Input placeholder="Notification title" value={testTitle} onChange={e => setTestTitle(e.target.value)} data-testid="test-notif-title" className="text-sm" />
              <Input placeholder="Message body (optional)" value={testBody} onChange={e => setTestBody(e.target.value)} data-testid="test-notif-body" className="text-sm" />
              <Button onClick={sendTestNotification} disabled={sending} className={`w-full rounded-xl bg-gradient-to-r ${colors.gradient} text-white text-sm`} data-testid="send-test-notif-btn">
                {sending ? 'Sending...' : 'Send Test Notification'}
              </Button>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" /> Powered by Firebase Cloud Messaging
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HealthReminders;
