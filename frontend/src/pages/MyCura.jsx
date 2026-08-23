import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, CalendarCheck, Activity, TrendingUp, Star, Camera, Bell, Shield, Award, Brain, Mic, Trophy, Watch, FolderOpen, ClipboardList, BarChart3, AlertTriangle, FileText, ChevronRight, Flame, Zap } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import ServiceHeader from '@/components/ServiceHeader';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

// Mock weekly health data for the chart
const weekData = [
  { day: 'Mon', score: 72 }, { day: 'Tue', score: 78 }, { day: 'Wed', score: 65 },
  { day: 'Thu', score: 82 }, { day: 'Fri', score: 88 }, { day: 'Sat', score: 75 }, { day: 'Sun', score: 90 },
];

const MyCura = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [stats, setStats] = useState({ appointments: 0, tests: 0, streak: 3 });
  const [loading, setLoading] = useState(true);

  const user = authUser || (localStorage.getItem('patientInfo') ? JSON.parse(localStorage.getItem('patientInfo')) : null);
  const phone = user?.phone || localStorage.getItem('guestMobile') || localStorage.getItem('userPhone');
  const displayName = user?.name?.split(' ')[0] || 'there';

  useEffect(() => {
    if (!phone) { setLoading(false); return; }
    fetch(`${API}/api/appointments/phone/${phone}`)
      .then(r => r.json())
      .then(data => setStats(prev => ({ ...prev, appointments: (data.appointments || []).length })))
      .catch(() => {}).finally(() => setLoading(false));
  }, [phone]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const healthTools = [
    { path: '/prescription-scanner', icon: Camera, title: 'Rx Scanner', desc: 'Scan & order', gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)', glow: 'rgba(244,63,94,0.25)', testId: 'prescription-scanner-btn' },
    { path: '/health-assistant', icon: Brain, title: 'CuraBot AI', desc: 'Ask anything', gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)', glow: 'rgba(124,58,237,0.25)', testId: 'health-assistant-btn' },
    { path: '/health-streaks', icon: Trophy, title: 'Streaks', desc: 'Earn badges', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)', glow: 'rgba(245,158,11,0.25)', testId: 'health-streaks-btn' },
    { path: '/wearables', icon: Watch, title: 'Wearables', desc: 'Sync data', gradient: 'linear-gradient(135deg, #10b981, #059669)', glow: 'rgba(16,185,129,0.25)', testId: 'wearables-btn' },
    { path: '/organ-viewer', icon: Activity, title: 'Body Map', desc: '3D organs', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', glow: 'rgba(99,102,241,0.25)', testId: 'organ-viewer-btn' },
    { path: '/voice-booking', icon: Mic, title: 'Voice Book', desc: 'Speak to book', gradient: 'linear-gradient(135deg, #14b8a6, #0891b2)', glow: 'rgba(20,184,166,0.25)', testId: 'voice-book-btn' },
    { path: '/medical-records', icon: FolderOpen, title: 'Records', desc: 'Upload docs', gradient: 'linear-gradient(135deg, #ec4899, #d946ef)', glow: 'rgba(236,72,153,0.25)', testId: 'medical-records-btn' },
    { path: '/smart-reminders', icon: Bell, title: 'Reminders', desc: 'Never miss', gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)', glow: 'rgba(59,130,246,0.25)', testId: 'smart-reminders-btn' },
  ];

  const quickAccess = [
    { icon: CalendarCheck, label: 'Calendar', path: '/appointment-calendar', color: '#14B8A6' },
    { icon: ClipboardList, label: 'Prescriptions', path: '/prescription-scanner', color: '#8B5CF6' },
    { icon: Heart, label: 'Health Score', path: '/health-score', color: '#F43F5E' },
    { icon: BarChart3, label: 'Analytics', path: '/booking-analytics', color: '#3B82F6' },
    { icon: FileText, label: 'Lab Reports', path: '/lab-reports', color: '#06B6D4' },
    { icon: AlertTriangle, label: 'SOS', path: '/emergency-sos', color: '#EF4444' },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#07070f' }} data-testid="mycura-page">
      <style>{`
        @keyframes mcGlow { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes mcSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .mc-card { animation: mcSlideUp 0.5s ease-out both; }
      `}</style>
      <ServiceHeader />
      
      <main className="max-w-lg mx-auto px-4 py-5 pb-24">
        {/* Greeting */}
        <div className="mc-card mb-6">
          <p className="text-white/40 text-xs font-medium tracking-wider uppercase" style={{ fontFamily: 'Manrope, Outfit, sans-serif' }}>{greeting}</p>
          <h1 className="text-2xl font-black text-white mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {displayName} <span className="inline-block ml-1 text-lg" style={{ animation: 'mcGlow 2s ease-in-out infinite' }}>
              <Zap className="w-5 h-5 inline text-amber-400" />
            </span>
          </h1>
        </div>

        {/* Health Pulse Chart */}
        <div className="mc-card mb-5 rounded-3xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.08) 0%, rgba(99,102,241,0.08) 100%)', border: '1px solid rgba(255,255,255,0.06)', animationDelay: '80ms' }} data-testid="health-pulse-chart">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-white/50 uppercase tracking-wider">Health Pulse</p>
              <p className="text-2xl font-black text-white mt-0.5">{weekData[weekData.length - 1].score}<span className="text-sm font-normal text-white/40">/100</span></p>
            </div>
            <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-400">+12%</span>
            </div>
          </div>
          <div className="h-28 -mx-2 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekData}>
                <defs>
                  <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12, color: '#fff' }} />
                <Area type="monotone" dataKey="score" stroke="#14b8a6" strokeWidth={2.5} fill="url(#healthGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mc-card grid grid-cols-3 gap-2.5 mb-5" style={{ animationDelay: '160ms' }}>
          {[
            { label: 'Visits', value: loading ? '—' : stats.appointments, icon: Activity, gradient: 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(20,184,166,0.05))', border: 'rgba(20,184,166,0.2)', iconColor: '#14b8a6' },
            { label: 'Tests', value: loading ? '—' : stats.tests, icon: Flame, gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))', border: 'rgba(245,158,11,0.2)', iconColor: '#f59e0b' },
            { label: 'Streak', value: `${stats.streak}d`, icon: Star, gradient: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.05))', border: 'rgba(168,85,247,0.2)', iconColor: '#a855f7' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3.5 text-center" style={{ background: s.gradient, border: `1px solid ${s.border}` }} data-testid={`stat-${s.label.toLowerCase()}`}>
              <s.icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: s.iconColor }} />
              <p className="text-xl font-black text-white">{s.value}</p>
              <p className="text-[10px] text-white/40 mt-0.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Health Tools */}
        <div className="mc-card mb-5" style={{ animationDelay: '240ms' }}>
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Health Tools</p>
          <div className="grid grid-cols-4 gap-2.5">
            {healthTools.map(t => (
              <button
                key={t.path}
                onClick={() => navigate(t.path)}
                className="flex flex-col items-center p-3 rounded-2xl active:scale-[0.93] transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                data-testid={t.testId}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: t.gradient, boxShadow: `0 4px 16px ${t.glow}` }}>
                  <t.icon className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <p className="text-[10px] font-bold text-white/70 text-center leading-tight">{t.title}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Access */}
        <div className="mc-card mb-5" style={{ animationDelay: '320ms' }}>
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Quick Access</p>
          <div className="grid grid-cols-3 gap-2">
            {quickAccess.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center p-3 rounded-2xl active:scale-[0.95] transition-all group"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                data-testid={`mycura-${item.label.toLowerCase()}`}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-1.5" style={{ background: `${item.color}15` }}>
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <p className="text-[10px] font-bold text-white/60">{item.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Trust Footer */}
        <div className="mc-card text-center py-3" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-center gap-5">
            {[
              { icon: Shield, label: 'HIPAA Ready' },
              { icon: Award, label: 'ISO Certified' },
              { icon: Star, label: 'Trusted' },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-1.5 text-white/25">
                <b.icon className="w-3 h-3" />
                <span className="text-[9px] font-medium">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default MyCura;
