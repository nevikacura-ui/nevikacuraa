import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Heart, Bell, FolderOpen, Flame, Calendar, Coins,
  ChevronRight, Check, Clock, Pill,
  Droplets, Dumbbell, Activity, ArrowUp, ArrowDown,
  Footprints, TrendingUp, Zap
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const HealthAtGlance = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const phone = user?.phone || localStorage.getItem('guestMobile') || localStorage.getItem('userPhone');
  const [data, setData] = useState(null);
  const [todayReminders, setTodayReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!phone) { setLoading(false); return; }
    const fetchData = async () => {
      try {
        const [glanceRes, remindersRes] = await Promise.all([
          fetch(`${API}/api/health-glance/${phone}`).then(r => r.json()).catch(() => null),
          fetch(`${API}/api/smart-reminders/today/${phone}`).then(r => r.json()).catch(() => null),
        ]);
        if (glanceRes?.success) setData(glanceRes);
        if (remindersRes?.success) {
          setTodayReminders(remindersRes.upcoming?.slice(0, 3) || []);
        }
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchData();
  }, [phone]);

  if (!phone || loading) return null;
  if (!data && todayReminders.length === 0) return null;

  const REMINDER_ICONS = {
    medication: Pill, appointment: Calendar, checkup: Heart,
    hydration: Droplets, exercise: Dumbbell, custom: Bell,
  };
  const REMINDER_COLORS = {
    medication: '#F472B6', appointment: '#3B82F6', checkup: '#10B981',
    hydration: '#06B6D4', exercise: '#F59E0B', custom: '#8B5CF6',
  };

  const scoreColor = data?.health_score >= 70 ? '#10B981' : data?.health_score >= 40 ? '#F59E0B' : '#F43F5E';
  const scoreLabel = data?.health_score >= 70 ? 'Excellent' : data?.health_score >= 40 ? 'Good' : 'Needs attention';

  return (
    <div className="mb-5 animate-fadeInUp" data-testid="health-at-glance">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-teal-400" />
          <h2 className="text-base md:text-lg font-bold text-white/90" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Your Health at a Glance
          </h2>
        </div>
        <button onClick={() => navigate('/my-cura')} className="text-xs md:text-sm text-teal-400 font-semibold flex items-center gap-0.5">
          View All <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Top Row: Health Score + Steps + Streaks */}
      {data && (
        <div className="grid grid-cols-3 gap-3 mb-3">
          {/* Health Score Card */}
          <button
            onClick={() => navigate('/my-cura')}
            className="rounded-2xl p-3 md:p-4 text-center active:scale-[0.96] transition-all col-span-1"
            data-testid="health-score-card"
            style={{
              background: 'linear-gradient(145deg, #0d9488, #0f766e)',
              boxShadow: '0 8px 24px rgba(13,148,136,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            {/* Score Ring */}
            <div className="relative mx-auto mb-2" style={{ width: 68, height: 68 }}>
              <svg viewBox="0 0 68 68" className="w-full h-full -rotate-90">
                <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
                <circle
                  cx="34" cy="34" r="28" fill="none"
                  stroke="#ffffff"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${(data.health_score / 100) * 175.9} 175.9`}
                  style={{ transition: 'stroke-dasharray 1.2s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl md:text-2xl font-extrabold text-white leading-none">{data.health_score}</span>
              </div>
            </div>
            <p className="text-sm md:text-base font-bold text-white">Health Score</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              {data.score_change !== 0 && (
                <span className="text-xs font-semibold text-white/80 flex items-center gap-0.5">
                  {data.score_change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {Math.abs(data.score_change)}
                </span>
              )}
              <span className="text-[11px] md:text-xs text-white/60">{scoreLabel}</span>
            </div>
          </button>

          {/* Steps Today Card */}
          <button
            onClick={() => navigate('/wearables')}
            className="rounded-2xl p-3 md:p-4 text-center active:scale-[0.96] transition-all col-span-1"
            data-testid="steps-today-card"
            style={{
              background: 'linear-gradient(145deg, #7c3aed, #6d28d9)',
              boxShadow: '0 8px 24px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full mx-auto mb-2 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              <Footprints className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <p className="text-xl md:text-2xl font-extrabold text-white leading-none">
              {data.steps_today || '0'}
            </p>
            <p className="text-sm md:text-base font-bold text-white/90 mt-1">Steps</p>
            <p className="text-[11px] md:text-xs text-white/50 mt-0.5">Today</p>
          </button>

          {/* Health Streaks Card */}
          <button
            onClick={() => navigate('/health-streaks')}
            className="rounded-2xl p-3 md:p-4 text-center active:scale-[0.96] transition-all col-span-1"
            data-testid="health-streaks-card"
            style={{
              background: 'linear-gradient(145deg, #f59e0b, #d97706)',
              boxShadow: '0 8px 24px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full mx-auto mb-2 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              <Flame className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <p className="text-xl md:text-2xl font-extrabold text-white leading-none">
              {data.health_streak || 0}
            </p>
            <p className="text-sm md:text-base font-bold text-white/90 mt-1">Streak</p>
            <p className="text-[11px] md:text-xs text-white/50 mt-0.5">
              {data.health_streak >= 7 ? 'On fire!' : data.health_streak >= 3 ? 'Keep going!' : 'Start today'}
            </p>
          </button>
        </div>
      )}

      {/* Score Breakdown Bar */}
      {data?.score_breakdown && (
        <div
          className="rounded-2xl p-3 md:p-4 mb-3"
          data-testid="score-breakdown-card"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <p className="text-xs md:text-sm font-semibold text-white/60 mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-teal-400" /> Score Breakdown
          </p>
          <div className="space-y-2">
            {Object.entries(data.score_breakdown).map(([key, item]) => {
              const barColors = {
                streaks: '#F59E0B', reminders: '#8B5CF6', records: '#F43F5E',
                appointments: '#3B82F6', engagement: '#10B981',
              };
              const pct = item.max > 0 ? (item.value / item.max) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[11px] md:text-xs text-white/50 w-20 md:w-28 truncate font-medium">{item.label}</span>
                  <div className="flex-1 h-2 md:h-2.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: barColors[key] || '#8B5CF6',
                        transition: 'width 1s ease-out',
                      }}
                    />
                  </div>
                  <span className="text-[11px] md:text-xs text-white/40 w-9 text-right font-semibold tabular-nums">{item.value}/{item.max}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Row: Reminders, Records, CuraCoins */}
      {data && (
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { value: data.active_reminders || 0, label: 'Reminders', icon: Bell, bg: '#8B5CF6', bgEnd: '#7c3aed', path: '/smart-reminders' },
            { value: data.medical_records || 0, label: 'Records', icon: FolderOpen, bg: '#F43F5E', bgEnd: '#e11d48', path: '/medical-records' },
            { value: data.cura_coins || 0, label: 'CuraCoins', icon: Coins, bg: '#10B981', bgEnd: '#059669', path: '/curapay' },
          ].map(stat => (
            <button
              key={stat.label}
              onClick={() => navigate(stat.path)}
              className="rounded-2xl p-3 md:p-4 text-center active:scale-[0.96] transition-all"
              style={{
                background: `linear-gradient(145deg, ${stat.bg}, ${stat.bgEnd})`,
                boxShadow: `0 6px 20px ${stat.bg}33, inset 0 1px 0 rgba(255,255,255,0.12)`,
              }}
              data-testid={`glance-${stat.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <stat.icon className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1.5 text-white/80" />
              <p className="text-lg md:text-xl font-extrabold text-white tabular-nums">{stat.value}</p>
              <p className="text-xs md:text-sm font-semibold text-white/70 mt-0.5">{stat.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Today's Reminders */}
      {todayReminders.length > 0 && (
        <div
          className="rounded-2xl p-3 md:p-4 cursor-pointer active:scale-[0.98] transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.06))',
            border: '1px solid rgba(139,92,246,0.2)',
          }}
          onClick={() => navigate('/smart-reminders')}
          data-testid="today-reminders-widget"
        >
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs md:text-sm font-bold text-white/70 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-400" /> Upcoming Reminders
            </p>
            <span className="text-xs text-purple-400 font-semibold">{todayReminders.length} left</span>
          </div>
          <div className="space-y-2">
            {todayReminders.map((rem, i) => {
              const Icon = REMINDER_ICONS[rem.reminder_type] || Bell;
              const color = REMINDER_COLORS[rem.reminder_type] || '#8B5CF6';
              return (
                <div key={rem.id || i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <p className="text-sm md:text-base text-white/80 flex-1 truncate font-medium">{rem.title}</p>
                  <span className="text-xs text-white/40 tabular-nums font-medium">{rem.reminder_time}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Appointment */}
      {data?.next_appointment && (
        <div
          className="rounded-2xl p-3 md:p-4 mt-3 cursor-pointer active:scale-[0.98] transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(6,182,212,0.06))',
            border: '1px solid rgba(20,184,166,0.2)',
          }}
          onClick={() => navigate('/appointment-calendar')}
          data-testid="next-appointment-widget"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#14B8A620' }}>
              <Calendar className="w-5 h-5 text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm md:text-base font-semibold text-white/80 truncate">
                {data.next_appointment.doctor_name || 'Doctor Appointment'}
              </p>
              <p className="text-xs md:text-sm text-white/40">
                {data.next_appointment.date} at {data.next_appointment.time}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30" />
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthAtGlance;
