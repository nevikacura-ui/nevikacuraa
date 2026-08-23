import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Bell, BellRing, Check, X, Clock, Pill, AlertTriangle, Package, ChevronRight, ChevronLeft, Share2, Star, MoreVertical, Search, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import usePushNotifications from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const PILL_COLORS = ['#FF6C87', '#3580FF', '#62DBC6', '#FFB347', '#A78BFA', '#F472B6', '#34D399', '#60A5FA'];

const TIMING_TAGS = {
  '08:00': { label: 'Before Breakfast', bg: 'rgba(255,108,135,0.12)', color: '#FF6C87' },
  '09:00': { label: 'After Breakfast', bg: 'rgba(98,219,198,0.12)', color: '#309F8C' },
  '14:00': { label: 'After Lunch', bg: 'rgba(53,128,255,0.12)', color: '#3580FF' },
  '20:00': { label: 'After Dinner', bg: 'rgba(255,179,71,0.12)', color: '#E68A00' },
  '21:00': { label: 'After Dinner', bg: 'rgba(255,179,71,0.12)', color: '#E68A00' },
};

const freqOptions = [
  { value: 'once_daily', label: 'Daily', slots: ['09:00'], icon: '1x' },
  { value: 'twice_daily', label: 'Twice Daily', slots: ['09:00', '21:00'], icon: '2x' },
  { value: 'thrice_daily', label: 'Thrice', slots: ['08:00', '14:00', '20:00'], icon: '3x' },
];

const MED_TYPES = [
  { id: 'capsule', label: 'Capsule', emoji: '💊', color: '#FF6C87' },
  { id: 'tablet', label: 'Tablet', emoji: '🩹', color: '#3580FF' },
  { id: 'syrup', label: 'Syrup', emoji: '🧴', color: '#62DBC6' },
  { id: 'injection', label: 'Injection', emoji: '💉', color: '#A78BFA' },
];

const statusConfig = {
  taken: { bg: 'rgba(98,219,198,0.1)', border: 'rgba(98,219,198,0.2)', color: '#309F8C', label: 'Taken' },
  skipped: { bg: 'rgba(255,108,135,0.1)', border: 'rgba(255,108,135,0.2)', color: '#FF6C87', label: 'Skipped' },
  missed: { bg: 'rgba(255,179,71,0.1)', border: 'rgba(255,179,71,0.2)', color: '#E68A00', label: 'Missed' },
  pending: { bg: 'rgba(53,128,255,0.06)', border: 'rgba(53,128,255,0.15)', color: '#3580FF', label: 'Pending' },
};

/* SVG Medicine Icons matching the reference design */
const MedicineIcon = ({ type, size = 40, color }) => {
  const s = size;
  const c = color || '#FF6C87';
  const icons = {
    capsule: (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <rect x="8" y="12" width="24" height="16" rx="8" fill={c} opacity="0.15"/>
        <rect x="8" y="12" width="12" height="16" rx="8" fill={c} opacity="0.4"/>
        <rect x="20" y="12" width="12" height="16" rx="8" fill={c}/>
        <circle cx="15" cy="18" r="1.5" fill="white" opacity="0.6"/>
      </svg>
    ),
    tablet: (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="12" fill={c} opacity="0.15"/>
        <circle cx="20" cy="20" r="10" fill={c}/>
        <line x1="10" y1="20" x2="30" y2="20" stroke="white" strokeWidth="1.5" opacity="0.5"/>
        <circle cx="16" cy="16" r="2" fill="white" opacity="0.3"/>
      </svg>
    ),
    syrup: (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <rect x="13" y="8" width="14" height="6" rx="2" fill={c} opacity="0.4"/>
        <rect x="11" y="14" width="18" height="20" rx="4" fill={c}/>
        <rect x="14" y="20" width="12" height="8" rx="2" fill="white" opacity="0.2"/>
        <rect x="17" y="6" width="6" height="4" rx="1" fill={c} opacity="0.6"/>
      </svg>
    ),
    injection: (
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
        <rect x="18" y="4" width="4" height="8" rx="1" fill={c} opacity="0.4"/>
        <rect x="14" y="12" width="12" height="20" rx="3" fill={c}/>
        <rect x="17" y="32" width="6" height="4" rx="1" fill={c} opacity="0.6"/>
        <line x1="14" y1="18" x2="26" y2="18" stroke="white" strokeWidth="1" opacity="0.3"/>
        <line x1="14" y1="22" x2="26" y2="22" stroke="white" strokeWidth="1" opacity="0.3"/>
      </svg>
    ),
  };
  return icons[type] || icons.capsule;
};

const getDaysOfWeek = (baseDate) => {
  const days = [];
  const d = new Date(baseDate);
  const dayOfWeek = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - dayOfWeek + 1);
  for (let i = 0; i < 7; i++) {
    const curr = new Date(start);
    curr.setDate(start.getDate() + i);
    days.push(curr);
  }
  return days;
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MedicineRemindersPage = () => {
  const navigate = useNavigate();
  const { user, token, patientToken } = useAuth();
  const { isSupported: pushSupported, permission, isSubscribed, subscribe } = usePushNotifications(user?.email);
  const [view, setView] = useState('main');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('today');
  const [schedule, setSchedule] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [stats, setStats] = useState({});
  const [lowStock, setLowStock] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medType, setMedType] = useState('capsule');
  const [detailMed, setDetailMed] = useState(null);
  const [form, setForm] = useState({ medicine_name: '', dosage: '', frequency: 'once_daily', start_date: new Date().toISOString().split('T')[0], total_quantity: 30 });

  const authToken = token || patientToken;
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const isAuthenticated = !!(token || patientToken || user);
  const weekDays = getDaysOfWeek(selectedDate);
  const today = new Date();

  const fetchData = useCallback(async () => {
    if (!authToken) { setLoading(false); return; }
    try {
      const [schedRes, remRes] = await Promise.all([
        fetch(`${API}/api/medicine-reminders/today`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API}/api/medicine-reminders/my-reminders`, { headers }).then(r => r.json()).catch(() => null),
      ]);
      if (schedRes?.success) { setSchedule(schedRes.schedule || []); setStats(s => ({ ...s, ...schedRes.stats })); }
      if (remRes?.success) { setReminders(remRes.reminders || []); setStats(s => ({ ...s, ...remRes.stats })); setLowStock(remRes.low_stock_alerts || []); }
    } catch {}
    setLoading(false);
  }, [authToken]);

  useEffect(() => { if (view === 'main') fetchData(); }, [fetchData, view]);

  const logDose = async (reminderId, skipped = false) => {
    try {
      const res = await fetch(`${API}/api/medicine-reminders/log`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminder_id: reminderId, skipped }),
      });
      const data = await res.json();
      if (data.success) { toast.success(skipped ? 'Dose skipped' : 'Dose logged!'); fetchData(); }
    } catch { toast.error('Failed to log dose'); }
  };

  const createReminder = async () => {
    if (!form.medicine_name || !form.dosage) { toast.error('Fill medicine name & dosage'); return; }
    const freq = freqOptions.find(f => f.value === form.frequency);
    try {
      const res = await fetch(`${API}/api/medicine-reminders/create`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type: medType, time_slots: freq?.slots || ['09:00'] }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Reminder created');
        setShowAdd(false);
        setForm({ medicine_name: '', dosage: '', frequency: 'once_daily', start_date: new Date().toISOString().split('T')[0], total_quantity: 30 });
        setMedType('capsule');
        fetchData();
      }
    } catch { toast.error('Failed to create reminder'); }
  };

  const deleteReminder = async (id) => {
    try {
      await fetch(`${API}/api/medicine-reminders/${id}`, { method: 'DELETE', headers });
      toast.success('Reminder removed');
      setDetailMed(null);
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  /* ==================== NOT LOGGED IN ==================== */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(160deg, #E8FFF5 0%, #F0FFF8 40%, #FFFFFF 100%)' }}>
        <div className="px-4 pt-12 pb-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-400 mb-8" data-testid="reminders-back"><ArrowLeft className="w-4 h-4" /> Back</button>
        </div>
        <div className="flex flex-col items-center justify-center px-8 pt-10 text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, #62DBC6, #309F8C)', boxShadow: '0 8px 24px rgba(48,159,140,0.25)' }}>
            <Bell className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Medicine Reminders</h2>
          <p className="text-sm text-gray-400 mb-8">Login to set up your medicine schedule</p>
          <Button onClick={() => navigate('/login')} className="rounded-2xl px-8 py-3 text-white font-bold" style={{ background: 'linear-gradient(135deg, #309F8C, #62DBC6)' }} data-testid="login-btn">Login to Continue</Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  /* ==================== MEDICINE DETAIL VIEW ==================== */
  if (detailMed) {
    const pillColor = PILL_COLORS[reminders.indexOf(detailMed) % PILL_COLORS.length] || '#FF6C87';
    const slots = detailMed.time_slots || [];
    return (
      <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(160deg, #E8FFF5 0%, #F0FFF8 50%, #FFFFFF 100%)' }} data-testid="med-detail-view">
        {/* Header */}
        <div className="px-4 pt-12 pb-2">
          <div className="flex items-center justify-between">
            <button onClick={() => setDetailMed(null)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/80" data-testid="detail-back-btn">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <p className="text-sm font-bold text-gray-800">{detailMed.medicine_name}</p>
            <button className="w-9 h-9 rounded-full flex items-center justify-center bg-white/80">
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* 3D Pill Illustration Area */}
        <div className="flex justify-center py-8">
          <div className="relative">
            <div className="w-32 h-32 rounded-full flex items-center justify-center" style={{ background: `${pillColor}15` }}>
              <MedicineIcon type={detailMed.type || 'capsule'} size={80} color={pillColor} />
            </div>
            {/* Floating mini pills */}
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center animate-bounce" style={{ background: '#A78BFA20' }}>
              <MedicineIcon type="tablet" size={20} color="#A78BFA" />
            </div>
            <div className="absolute -bottom-1 -left-3 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#62DBC620', animation: 'bounce 2s infinite 0.5s' }}>
              <MedicineIcon type="capsule" size={18} color="#62DBC6" />
            </div>
          </div>
        </div>

        {/* Medicine Name & Description */}
        <div className="px-5">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{detailMed.medicine_name}</h2>
          <p className="text-sm text-gray-400 mb-4">{detailMed.dosage} &middot; {(detailMed.frequency || '').replace('_', ' ')}</p>

          {/* Timing Tags */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {slots.map(t => {
              const tag = TIMING_TAGS[t] || { label: t, bg: 'rgba(53,128,255,0.1)', color: '#3580FF' };
              return (
                <span key={t} className="text-xs font-semibold px-4 py-2 rounded-full" style={{ background: tag.bg, color: tag.color }} data-testid={`detail-tag-${t}`}>
                  {tag.label}
                </span>
              );
            })}
          </div>

          {/* Info Cards Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: 'Amount', value: `${slots.length} dose/day`, icon: <Pill className="w-4 h-4" style={{ color: '#3580FF' }} /> },
              { label: 'This Month', value: `${stats.adherence_rate_7d || 0}%`, icon: <Clock className="w-4 h-4" style={{ color: '#62DBC6' }} /> },
              { label: 'Remaining', value: detailMed.remaining_quantity != null ? `${detailMed.remaining_quantity} left` : 'N/A', icon: <Package className="w-4 h-4" style={{ color: '#A78BFA' }} /> },
              { label: 'Type', value: (detailMed.type || 'capsule').charAt(0).toUpperCase() + (detailMed.type || 'capsule').slice(1), icon: <Star className="w-4 h-4" style={{ color: '#FFB347' }} /> },
            ].map(item => (
              <div key={item.label} className="rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }} data-testid={`detail-info-${item.label.toLowerCase()}`}>
                <div className="flex items-center gap-2 mb-1">
                  {item.icon}
                  <span className="text-[10px] font-bold text-gray-400">{item.label}</span>
                </div>
                <p className="text-sm font-bold text-gray-800">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Remove Button */}
          <button
            onClick={() => deleteReminder(detailMed.id)}
            className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
            style={{ background: 'rgba(255,108,135,0.1)', color: '#FF6C87', border: '1px solid rgba(255,108,135,0.15)' }}
            data-testid="detail-remove-btn"
          >
            Remove Medicine
          </button>
        </div>

        {/* Bottom Edit Bar */}
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-full" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(48,159,140,0.1)' }}>
            <Pencil className="w-4 h-4" style={{ color: '#309F8C' }} />
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(53,128,255,0.1)' }}>
            <Search className="w-4 h-4" style={{ color: '#3580FF' }} />
          </button>
        </div>

        <BottomNav />
      </div>
    );
  }

  /* ==================== MAIN VIEW ==================== */
  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(160deg, #E8FFF5 0%, #F0FFF8 50%, #FFFFFF 100%)' }} data-testid="med-reminder-main">
      {/* Header */}
      <div className="px-4 pt-12 pb-2">
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/80" data-testid="reminders-back">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full flex items-center justify-center bg-white/80">
              <Share2 className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-9 h-9 rounded-full flex items-center justify-center bg-white/80">
              <Star className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-9 h-9 rounded-full flex items-center justify-center bg-white/80">
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Title Section */}
      <div className="px-5 mb-5">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Your Medicines<br/>Reminder</h1>
      </div>

      {/* Push Notification Banner */}
      {pushSupported && permission !== 'granted' && !isSubscribed && (
        <div className="mx-4 flex items-center gap-3 p-3.5 rounded-2xl mb-4" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,108,135,0.12)' }} data-testid="push-banner">
          <BellRing className="w-5 h-5 flex-shrink-0" style={{ color: '#FF6C87' }} />
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-800">Enable Notifications</p>
            <p className="text-[10px] text-gray-400">Get reminded when it's time</p>
          </div>
          <Button onClick={async () => { const ok = await subscribe(); if (ok) toast.success('Notifications enabled!'); }} className="h-7 px-3 text-[10px] rounded-lg font-bold text-white" style={{ background: 'linear-gradient(135deg, #FF6C87, #FF8FA3)' }} data-testid="enable-push-btn">Enable</Button>
        </div>
      )}

      {/* Calendar Date Strip */}
      <div className="px-4 mb-4">
        <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 7); setSelectedDate(d); }} className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-50"><ChevronLeft className="w-3.5 h-3.5 text-gray-500" /></button>
            <p className="text-xs font-bold text-gray-500">{selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 7); setSelectedDate(d); }} className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-50"><ChevronRight className="w-3.5 h-3.5 text-gray-500" /></button>
          </div>
          <div className="flex gap-1.5 justify-between" data-testid="calendar-strip">
            {weekDays.map((day, i) => {
              const isToday = day.toDateString() === today.toDateString();
              const isSelected = day.toDateString() === selectedDate.toDateString();
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className="flex-1 flex flex-col items-center py-2.5 rounded-2xl transition-all"
                  style={isSelected ? {
                    background: 'linear-gradient(135deg, #FF8FA3, #FF6C87)',
                    boxShadow: '0 4px 12px rgba(255,108,135,0.3)',
                  } : {}}
                >
                  <span className={`text-lg font-bold ${isSelected ? 'text-white' : isToday ? 'text-[#309F8C]' : 'text-gray-700'}`}>{day.getDate()}</span>
                  <span className={`text-[9px] font-semibold mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>{DAY_LABELS[i]}</span>
                  {isToday && !isSelected && <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ background: '#309F8C' }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-1">
          {[{ id: 'today', label: 'Today' }, { id: 'week', label: 'Week' }, { id: 'all', label: 'All' }].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 text-xs font-bold rounded-full transition-all"
              style={tab === t.id ? { background: 'rgba(48,159,140,0.1)', color: '#309F8C' } : { color: '#9ca3af' }}
              data-testid={`tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-4 mb-4">
        <div className="flex gap-2.5">
          {[
            { label: 'Active', value: stats.total_active || 0, gradient: 'linear-gradient(135deg, #3580FF, #60A5FA)' },
            { label: 'Adherence', value: `${stats.adherence_rate_7d || 0}%`, gradient: 'linear-gradient(135deg, #62DBC6, #309F8C)' },
            { label: 'Low Stock', value: stats.low_stock_count || 0, gradient: stats.low_stock_count > 0 ? 'linear-gradient(135deg, #FFB347, #FF9500)' : 'linear-gradient(135deg, #D1D5DB, #9CA3AF)' },
          ].map(s => (
            <div key={s.label} className="flex-1 rounded-2xl p-3 text-center" style={{ background: s.gradient, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[9px] font-bold text-white/70 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: 'rgba(255,255,255,0.6)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100" />
                  <div className="flex-1 space-y-2"><div className="h-4 w-24 bg-gray-100 rounded-lg" /><div className="h-3 w-16 bg-gray-50 rounded-lg" /></div>
                </div>
              </div>
            ))}
          </div>
        ) : (tab === 'today' || tab === 'week') ? (
          /* Today's Schedule */
          <div className="space-y-3">
            {schedule.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(98,219,198,0.12), rgba(255,175,198,0.08))' }}>
                  <MedicineIcon type="capsule" size={48} color="#62DBC6" />
                </div>
                <p className="text-base font-bold text-gray-700 mb-1.5">No medicines scheduled</p>
                <p className="text-sm text-gray-400 mb-6">Add your first medicine reminder</p>
                <Button onClick={() => setShowAdd(true)} className="rounded-full px-8 py-3 text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #309F8C, #62DBC6)', boxShadow: '0 4px 16px rgba(48,159,140,0.25)' }} data-testid="add-first-btn">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Reminder
                </Button>
              </div>
            ) : (
              <>
                {schedule.map((item, idx) => {
                  const st = statusConfig[item.status] || statusConfig.pending;
                  const pillColor = PILL_COLORS[idx % PILL_COLORS.length];
                  const timing = TIMING_TAGS[item.time_slot] || { label: item.time_slot, bg: 'rgba(53,128,255,0.1)', color: '#3580FF' };
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
                      data-testid={`schedule-${idx}`}
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Medicine Icon */}
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${pillColor}12` }}>
                          <MedicineIcon type={item.type || 'capsule'} size={36} color={pillColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{item.medicine_name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{item.dosage}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: timing.bg, color: timing.color }}>{timing.label}</span>
                          </div>
                        </div>
                        {item.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); logDose(item.reminder_id); }} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #62DBC6, #309F8C)', boxShadow: '0 2px 8px rgba(48,159,140,0.25)' }} data-testid={`take-${idx}`}>
                              <Check className="w-4.5 h-4.5 text-white" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); logDose(item.reminder_id, true); }} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,108,135,0.1)', border: '1px solid rgba(255,108,135,0.15)' }} data-testid={`skip-${idx}`}>
                              <X className="w-4 h-4" style={{ color: '#FF6C87' }} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold px-3 py-1.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Progress Card */}
                <div className="rounded-2xl p-4 mt-1" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs font-bold text-gray-500">Today's Progress</p>
                    <p className="text-sm font-bold" style={{ color: '#309F8C' }}>{schedule.filter(s => s.status === 'taken').length}/{schedule.length}</p>
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: '#f3f4f6' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${schedule.length > 0 ? (schedule.filter(s => s.status === 'taken').length / schedule.length) * 100 : 0}%`, background: 'linear-gradient(90deg, #62DBC6, #309F8C)' }} />
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          /* All Reminders / Ongoing Course */
          <div className="space-y-3">
            <p className="text-sm font-bold text-gray-700 mb-2">Ongoing Course</p>
            {reminders.length === 0 ? (
              <div className="text-center py-14">
                <MedicineIcon type="syrup" size={56} color="#d1d5db" />
                <p className="text-sm text-gray-400 mt-4">No active reminders</p>
              </div>
            ) : reminders.map((rem, idx) => {
              const pillColor = PILL_COLORS[idx % PILL_COLORS.length];
              return (
                <div
                  key={rem.id || idx}
                  onClick={() => setDetailMed(rem)}
                  className="rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
                  style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
                  data-testid={`reminder-${idx}`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${pillColor}12` }}>
                      <MedicineIcon type={rem.type || 'capsule'} size={36} color={pillColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{rem.medicine_name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{rem.dosage} &middot; {(rem.frequency || '').replace('_', ' ')}</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {(rem.time_slots || []).map(t => {
                          const tag = TIMING_TAGS[t] || { label: t, bg: 'rgba(53,128,255,0.1)', color: '#3580FF' };
                          return <span key={t} className="text-[9px] font-semibold px-2.5 py-1 rounded-full" style={{ background: tag.bg, color: tag.color }}>{tag.label}</span>;
                        })}
                      </div>
                    </div>
                    <MoreVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Low Stock Alerts */}
        {lowStock.length > 0 && (
          <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,179,71,0.12)' }} data-testid="low-stock-section">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" style={{ color: '#E68A00' }} />
                <span className="text-xs font-bold" style={{ color: '#E68A00' }}>Refill Needed</span>
              </div>
              <button onClick={() => navigate('/orange')} className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[10px] font-bold text-white active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }} data-testid="refill-orange-btn">
                <Package className="w-3 h-3" /> Refill
              </button>
            </div>
            {lowStock.map((med, i) => (
              <div key={i} className="flex items-center justify-between ml-6 py-1.5">
                <p className="text-xs text-gray-500">{med.medicine_name} — {med.remaining_quantity} left</p>
                <button onClick={() => navigate(`/orange?search=${encodeURIComponent(med.medicine_name)}`)} className="text-[9px] font-bold" style={{ color: '#F97316' }} data-testid={`reorder-${i}`}>Order <ChevronRight className="w-2.5 h-2.5 inline" /></button>
              </div>
            ))}
          </div>
        )}

        {/* Quick Refill CTA */}
        <div className="mt-4 mb-4">
          <button onClick={() => navigate('/orange')} className="w-full p-3.5 rounded-2xl flex items-center gap-3 active:scale-[0.97] transition-transform" style={{ background: 'linear-gradient(135deg, #FF6C87, #FF8FA3)', boxShadow: '0 4px 16px rgba(255,108,135,0.2)' }} data-testid="refill-cta">
            <Package className="w-6 h-6 text-white/90" />
            <div className="flex-1 text-left">
              <p className="text-xs font-bold text-white">Refill from Orange Pharmacy</p>
              <p className="text-[9px] text-white/70">Order medicines & get home delivery</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-24 right-5 z-40">
        <button
          onClick={() => setShowAdd(true)}
          className="w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'linear-gradient(135deg, #309F8C, #62DBC6)', boxShadow: '0 6px 20px rgba(48,159,140,0.35)' }}
          data-testid="add-reminder-btn"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-full z-30" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
        <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(48,159,140,0.08)' }}>
          <Pencil className="w-4 h-4" style={{ color: '#309F8C' }} />
        </button>
        <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(53,128,255,0.08)' }}>
          <Search className="w-4 h-4" style={{ color: '#3580FF' }} />
        </button>
      </div>

      {/* Add Reminder Bottom Sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-t-3xl p-5 pb-8" style={{ background: '#fff' }} onClick={e => e.stopPropagation()} data-testid="add-dialog">
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
            <h3 className="text-lg font-bold text-gray-900 mb-5">Add Reminder</h3>
            <div className="space-y-4">
              {/* Medicine Name */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Medicine Name</label>
                <Input value={form.medicine_name} onChange={e => setForm(f => ({ ...f, medicine_name: e.target.value }))} placeholder="e.g. Paracetamol XL2" className="bg-gray-50 border-gray-100 text-gray-900 rounded-xl h-12" data-testid="input-name" />
              </div>

              {/* Type Selection with Icons */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Type</label>
                <div className="flex gap-3">
                  {MED_TYPES.map(t => (
                    <button key={t.id} onClick={() => setMedType(t.id)} className="flex-1 flex flex-col items-center py-3 rounded-2xl transition-all" style={medType === t.id ? { background: `${t.color}15`, border: `2px solid ${t.color}40`, boxShadow: `0 4px 12px ${t.color}15` } : { background: '#f9fafb', border: '2px solid transparent' }} data-testid={`type-${t.id}`}>
                      <MedicineIcon type={t.id} size={32} color={medType === t.id ? t.color : '#9ca3af'} />
                      <span className="text-[10px] font-bold mt-1.5" style={{ color: medType === t.id ? t.color : '#9ca3af' }}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dosage */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Dosage</label>
                <Input value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 1 capsule, 150mg" className="bg-gray-50 border-gray-100 text-gray-900 rounded-xl h-12" data-testid="input-dosage" />
              </div>

              {/* Time & Schedule */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Time & Schedule</label>
                <div className="flex gap-2">
                  {freqOptions.map(f => (
                    <button key={f.value} onClick={() => setForm(prev => ({ ...prev, frequency: f.value }))} className="flex-1 py-3 rounded-xl text-xs font-bold transition-all" style={form.frequency === f.value ? { background: 'linear-gradient(135deg, #309F8C, #62DBC6)', color: '#fff', boxShadow: '0 4px 12px rgba(48,159,140,0.2)' } : { background: '#f9fafb', color: '#9ca3af' }} data-testid={`freq-${f.value}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration & Quantity Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-2 block">Duration</label>
                  <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="bg-gray-50 border-gray-100 text-gray-900 rounded-xl h-12 text-xs" data-testid="input-date" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-2 block">Quantity</label>
                  <Input type="number" value={form.total_quantity} onChange={e => setForm(f => ({ ...f, total_quantity: parseInt(e.target.value) || 0 }))} className="bg-gray-50 border-gray-100 text-gray-900 rounded-xl h-12 text-xs" data-testid="input-qty" />
                </div>
              </div>

              {/* Add Button */}
              <Button onClick={createReminder} className="w-full h-13 rounded-2xl font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg, #309F8C, #62DBC6)', boxShadow: '0 6px 20px rgba(48,159,140,0.25)', height: '52px' }} data-testid="save-reminder-btn">
                Add Reminder
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default MedicineRemindersPage;
