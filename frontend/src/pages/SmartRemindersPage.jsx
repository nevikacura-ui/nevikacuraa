import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import ServiceHeader from '@/components/ServiceHeader';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';
import {
  ArrowLeft, Bell, Plus, X, Check, Clock, Pill, Calendar,
  Droplets, Dumbbell, Heart, ChevronRight, Trash2, Pause,
  Play, AlertTriangle, Zap, Sparkles, Timer, RotateCcw,
  BellOff, ChevronDown, Lightbulb
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const TYPE_CONFIG = {
  medication: { label: 'Medication', icon: Pill, color: '#F472B6', bg: '#F472B620' },
  appointment: { label: 'Appointment', icon: Calendar, color: '#3B82F6', bg: '#3B82F620' },
  checkup: { label: 'Check-up', icon: Heart, color: '#10B981', bg: '#10B98120' },
  hydration: { label: 'Hydration', icon: Droplets, color: '#06B6D4', bg: '#06B6D420' },
  exercise: { label: 'Exercise', icon: Dumbbell, color: '#F59E0B', bg: '#F59E0B20' },
  custom: { label: 'Custom', icon: Bell, color: '#8B5CF6', bg: '#8B5CF620' },
};

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: '#EF4444', dot: '#EF4444' },
  high: { label: 'High', color: '#F59E0B', dot: '#F59E0B' },
  medium: { label: 'Medium', color: '#3B82F6', dot: '#3B82F6' },
  low: { label: 'Low', color: '#6B7280', dot: '#6B7280' },
};

const RECURRENCE_OPTIONS = [
  { value: 'once', label: 'One Time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const SmartRemindersPage = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const user = authUser || (localStorage.getItem('patientInfo') ? JSON.parse(localStorage.getItem('patientInfo')) : null);
  const phone = user?.phone || localStorage.getItem('guestMobile') || localStorage.getItem('userPhone');

  const [reminders, setReminders] = useState([]);
  const [todayData, setTodayData] = useState(null);
  const [stats, setStats] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('medication');
  const [formDescription, setFormDescription] = useState('');
  const [formTime, setFormTime] = useState('08:00');
  const [formDate, setFormDate] = useState('');
  const [formRecurrence, setFormRecurrence] = useState('daily');
  const [formPriority, setFormPriority] = useState('medium');
  const [formNotes, setFormNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchReminders = useCallback(async () => {
    if (!phone) return;
    try {
      const params = new URLSearchParams();
      if (activeType !== 'all') params.append('reminder_type', activeType);
      const res = await fetch(`${API}/api/smart-reminders/list/${phone}?${params}`);
      const data = await res.json();
      if (data.success) setReminders(data.reminders || []);
    } catch { /* silent */ }
  }, [phone, activeType]);

  const fetchToday = useCallback(async () => {
    if (!phone) return;
    try {
      const res = await fetch(`${API}/api/smart-reminders/today/${phone}`);
      const data = await res.json();
      if (data.success) setTodayData(data);
    } catch { /* silent */ }
  }, [phone]);

  const fetchStats = useCallback(async () => {
    if (!phone) return;
    try {
      const res = await fetch(`${API}/api/smart-reminders/stats/${phone}`);
      const data = await res.json();
      if (data.success) setStats(data);
    } catch { /* silent */ }
  }, [phone]);

  const fetchSuggestions = useCallback(async () => {
    if (!phone) return;
    try {
      const res = await fetch(`${API}/api/smart-reminders/suggestions/${phone}`);
      const data = await res.json();
      if (data.success) setSuggestions(data.suggestions || []);
    } catch { /* silent */ }
  }, [phone]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchReminders(), fetchToday(), fetchStats(), fetchSuggestions()]);
      setLoading(false);
    };
    load();
  }, [fetchReminders, fetchToday, fetchStats, fetchSuggestions]);

  const handleCreate = async () => {
    if (!formTitle.trim()) { toast.error('Please enter a title'); return; }
    if (!phone) { toast.error('Please login first'); return; }

    setCreating(true);
    try {
      const res = await fetch(`${API}/api/smart-reminders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          title: formTitle,
          reminder_type: formType,
          description: formDescription,
          reminder_time: formTime,
          reminder_date: formDate || undefined,
          recurrence: formRecurrence,
          priority: formPriority,
          notes: formNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Reminder created');
        setShowCreate(false);
        resetForm();
        fetchReminders();
        fetchToday();
        fetchStats();
      } else {
        toast.error(data.detail || 'Failed');
      }
    } catch { toast.error('Failed to create reminder'); }
    finally { setCreating(false); }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormType('medication');
    setFormDescription('');
    setFormTime('08:00');
    setFormDate('');
    setFormRecurrence('daily');
    setFormPriority('medium');
    setFormNotes('');
  };

  const handleComplete = async (id) => {
    try {
      const res = await fetch(`${API}/api/smart-reminders/complete/${id}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        toast.success('Completed!');
        fetchReminders();
        fetchToday();
        fetchStats();
      }
    } catch { toast.error('Failed'); }
  };

  const handleToggle = async (id) => {
    try {
      const res = await fetch(`${API}/api/smart-reminders/toggle/${id}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        fetchReminders();
        fetchStats();
      }
    } catch { /* silent */ }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this reminder?')) return;
    try {
      const res = await fetch(`${API}/api/smart-reminders/delete/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Reminder deleted');
        fetchReminders();
        fetchStats();
      }
    } catch { toast.error('Failed'); }
  };

  const handleAddSuggestion = (suggestion) => {
    setFormTitle(suggestion.title);
    setFormType(suggestion.type);
    setFormDescription(suggestion.description || '');
    setFormPriority(suggestion.priority || 'medium');
    setShowSuggestions(false);
    setShowCreate(true);
  };

  if (!phone) {
    return (
      <div className="min-h-screen bg-[#0a0b14]">
        <ServiceHeader />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Bell className="w-16 h-16 text-white/20 mb-4" />
          <p className="text-white/60 text-center">Please login to access Smart Reminders</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b14]">
      <ServiceHeader />

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center" data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 text-white/60" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Smart Reminders</h1>
              <p className="text-xs text-white/40">{stats?.active_reminders || 0} active reminders</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
            style={{ background: 'linear-gradient(145deg, #8B5CF6, #6366F1)', color: '#fff' }}
            data-testid="create-reminder-btn"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 mb-5" data-testid="reminder-stats">
            <div className="rounded-2xl p-3 text-center" style={{ background: '#8B5CF610', border: '1px solid #8B5CF620' }}>
              <p className="text-lg font-bold text-white">{stats.active_reminders}</p>
              <p className="text-[10px] text-white/40">Active</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: '#10B98110', border: '1px solid #10B98120' }}>
              <p className="text-lg font-bold text-white">{stats.completed_today}</p>
              <p className="text-[10px] text-white/40">Done Today</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: '#F59E0B10', border: '1px solid #F59E0B20' }}>
              <p className="text-lg font-bold text-white">{stats.total_reminders}</p>
              <p className="text-[10px] text-white/40">Total</p>
            </div>
          </div>
        )}

        {/* Smart Suggestions */}
        {suggestions.length > 0 && (
          <div className="mb-5">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="flex items-center gap-2 w-full p-3 rounded-2xl transition-all"
              style={{ background: 'linear-gradient(145deg, #F59E0B10, #EF444410)', border: '1px solid #F59E0B20' }}
              data-testid="suggestions-toggle"
            >
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-white/70 flex-1 text-left">{suggestions.length} smart suggestion{suggestions.length > 1 ? 's' : ''}</span>
              <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
            </button>
            {showSuggestions && (
              <div className="mt-2 space-y-2">
                {suggestions.map((s, i) => {
                  const cfg = TYPE_CONFIG[s.type] || TYPE_CONFIG.custom;
                  return (
                    <button
                      key={i}
                      onClick={() => handleAddSuggestion(s)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98]"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                      data-testid={`suggestion-${i}`}
                    >
                      <cfg.icon className="w-5 h-5 flex-shrink-0" style={{ color: cfg.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 truncate">{s.title}</p>
                        <p className="text-[10px] text-white/30">{s.description}</p>
                      </div>
                      <Plus className="w-4 h-4 text-white/20" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Type Filters */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide" data-testid="type-filters">
          <button
            onClick={() => setActiveType('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${activeType === 'all' ? 'bg-white text-black' : 'bg-white/5 text-white/50'}`}
          >
            All
          </button>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setActiveType(key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: activeType === key ? cfg.color : 'rgba(255,255,255,0.05)',
                color: activeType === key ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            >
              {cfg.label}
              {stats?.type_counts?.[key] ? ` (${stats.type_counts[key]})` : ''}
            </button>
          ))}
        </div>

        {/* Reminders List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl skeleton" />)}
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-state">
            <Bell className="w-14 h-14 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No reminders yet</p>
            <p className="text-white/25 text-xs mt-1">Create your first smart reminder</p>
          </div>
        ) : (
          <div className="space-y-2.5" data-testid="reminders-list">
            {reminders.map(reminder => {
              const typeCfg = TYPE_CONFIG[reminder.reminder_type] || TYPE_CONFIG.custom;
              const priCfg = PRIORITY_CONFIG[reminder.priority] || PRIORITY_CONFIG.medium;
              const TypeIcon = typeCfg.icon;
              return (
                <div
                  key={reminder.id}
                  className="rounded-2xl p-3.5 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  data-testid={`reminder-item-${reminder.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: typeCfg.bg }}>
                      <TypeIcon className="w-5 h-5" style={{ color: typeCfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{reminder.title}</p>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: priCfg.dot }} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-white/30" />
                        <span className="text-[10px] text-white/40">{reminder.reminder_time}</span>
                        {reminder.recurrence !== 'once' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">
                            {reminder.recurrence === 'daily' ? 'Daily' : reminder.recurrence === 'weekly' ? 'Weekly' : 'Monthly'}
                          </span>
                        )}
                        {reminder.streak_count > 0 && (
                          <span className="text-[10px] text-orange-400 flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" />{reminder.streak_count}
                          </span>
                        )}
                      </div>
                      {reminder.description && <p className="text-[10px] text-white/25 mt-1 truncate">{reminder.description}</p>}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleComplete(reminder.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                        style={{ background: '#10B98115' }}
                        data-testid={`complete-${reminder.id}`}
                        title="Complete"
                      >
                        <Check className="w-4 h-4 text-green-400" />
                      </button>
                      <button
                        onClick={() => handleToggle(reminder.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                        style={{ background: '#F59E0B15' }}
                        data-testid={`toggle-${reminder.id}`}
                        title={reminder.is_active ? 'Pause' : 'Resume'}
                      >
                        {reminder.is_active ? <Pause className="w-4 h-4 text-yellow-400" /> : <Play className="w-4 h-4 text-yellow-400" />}
                      </button>
                      <button
                        onClick={() => handleDelete(reminder.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                        style={{ background: '#EF444415' }}
                        data-testid={`delete-${reminder.id}`}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Reminder Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" data-testid="create-modal">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg rounded-t-3xl p-6 pb-8 max-h-[85vh] overflow-y-auto" style={{ background: '#151621' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">New Reminder</h2>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Type Selection */}
            <div className="mb-4">
              <label className="text-xs text-white/40 mb-1.5 block">Type</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setFormType(key)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1"
                    style={{
                      background: formType === key ? cfg.color : 'rgba(255,255,255,0.05)',
                      color: formType === key ? '#fff' : 'rgba(255,255,255,0.4)',
                    }}
                    data-testid={`type-btn-${key}`}
                  >
                    <cfg.icon className="w-3 h-3" /> {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="mb-3">
              <label className="text-xs text-white/40 mb-1.5 block">Title</label>
              <input
                type="text"
                placeholder="e.g. Take blood pressure medicine"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-white/20 outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                data-testid="reminder-title-input"
              />
            </div>

            {/* Description */}
            <div className="mb-3">
              <label className="text-xs text-white/40 mb-1.5 block">Description (optional)</label>
              <input
                type="text"
                placeholder="Additional details..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-white/20 outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                data-testid="reminder-desc-input"
              />
            </div>

            {/* Time & Date */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Time</label>
                <input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  data-testid="reminder-time-input"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Start Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  data-testid="reminder-date-input"
                />
              </div>
            </div>

            {/* Recurrence */}
            <div className="mb-3">
              <label className="text-xs text-white/40 mb-1.5 block">Repeat</label>
              <div className="flex gap-2">
                {RECURRENCE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFormRecurrence(opt.value)}
                    className="flex-1 px-2 py-2 rounded-xl text-xs font-medium transition-all text-center"
                    style={{
                      background: formRecurrence === opt.value ? '#8B5CF6' : 'rgba(255,255,255,0.05)',
                      color: formRecurrence === opt.value ? '#fff' : 'rgba(255,255,255,0.4)',
                    }}
                    data-testid={`recurrence-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="mb-5">
              <label className="text-xs text-white/40 mb-1.5 block">Priority</label>
              <div className="flex gap-2">
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setFormPriority(key)}
                    className="flex-1 px-2 py-2 rounded-xl text-xs font-medium transition-all text-center flex items-center justify-center gap-1"
                    style={{
                      background: formPriority === key ? cfg.color : 'rgba(255,255,255,0.05)',
                      color: formPriority === key ? '#fff' : 'rgba(255,255,255,0.4)',
                    }}
                    data-testid={`priority-${key}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: formPriority === key ? '#fff' : cfg.color }} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={!formTitle.trim() || creating}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-40"
              style={{ background: 'linear-gradient(145deg, #8B5CF6, #6366F1)' }}
              data-testid="submit-reminder-btn"
            >
              {creating ? 'Creating...' : 'Create Reminder'}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default SmartRemindersPage;
