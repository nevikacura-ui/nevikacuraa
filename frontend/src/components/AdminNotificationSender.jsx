import React, { useState } from 'react';
import { Megaphone, Send, Users, Stethoscope, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const wittyTemplates = [
  { title: "Health Check Reminder", message: "Your body runs 24/7 - it deserves a service check! Book your annual health checkup today at Nevika Cura." },
  { title: "New Medicines Available", message: "Fresh stock alert! New medicines & supplements are now available at Orange Medcare. Order with free delivery!" },
  { title: "Monsoon Health Alert", message: "Monsoon season is here! Protect your family - stock up on essentials and book a check-up at Nevika Cura." },
  { title: "Lab Test Discount", message: "This week only! Get 20% off on all health packages at Mango Health Labs. Don't miss out!" },
  { title: "Dr. Vikas Says Hi", message: "Remember: prevention is better than cure! Schedule your routine check-up today. - Dr. Vikas Jha" },
];

const AdminNotificationSender = ({ onClose }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('promo');
  const [target, setTarget] = useState('all');
  const [sending, setSending] = useState(false);

  const getToken = () => localStorage.getItem('token') || localStorage.getItem('patientToken');

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Please fill in both title and message');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API}/notifications/admin/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ title, message, type, target }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Notification sent to ${data.sent_to} users!`);
        setTitle('');
        setMessage('');
        if (onClose) onClose();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Failed to send notification');
      }
    } catch (e) {
      toast.error('Network error');
    }
    setSending(false);
  };

  const applyTemplate = (t) => {
    setTitle(t.title);
    setMessage(t.message);
  };

  return (
    <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 overflow-hidden" data-testid="admin-notif-sender">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Send Notification</h3>
            <p className="text-[11px] text-gray-500">Broadcast to patients or staff</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Quick Templates */}
        <div>
          <p className="text-xs font-medium text-gray-400 mb-2">Quick templates</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {wittyTemplates.map((t, i) => (
              <button
                key={i}
                onClick={() => applyTemplate(t)}
                data-testid={`template-${i}`}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-gray-300 hover:bg-white/10 transition-colors"
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">Title</label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Notification title..."
            data-testid="notif-title-input"
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl"
            maxLength={80}
          />
        </div>

        {/* Message */}
        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Write your notification message..."
            data-testid="notif-message-input"
            rows={3}
            maxLength={300}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-600 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-teal-500/50"
          />
          <p className="text-[10px] text-gray-600 mt-1 text-right">{message.length}/300</p>
        </div>

        {/* Target Audience */}
        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">Send to</label>
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'Everyone', icon: Users },
              { id: 'patients', label: 'Patients', icon: Users },
              { id: 'staff', label: 'Staff', icon: Stethoscope },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setTarget(opt.id)}
                data-testid={`target-${opt.id}`}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  target === opt.id
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                <opt.icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">Type</label>
          <div className="flex gap-2">
            {['promo', 'announcement', 'reminder'].map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                data-testid={`type-${t}`}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  type === t
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/10'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
          data-testid="send-notification-btn"
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl h-11 text-sm font-semibold"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin mr-2" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          {sending ? 'Sending...' : 'Send Notification'}
        </Button>
      </div>
    </div>
  );
};

export default AdminNotificationSender;
