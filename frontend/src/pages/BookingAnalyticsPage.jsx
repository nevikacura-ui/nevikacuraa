import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Users, Calendar, Clock, Mic, BarChart3, Loader2, ChevronRight } from 'lucide-react';
import ServiceHeader from '@/components/ServiceHeader';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_COLORS = {
  Booked: '#3B82F6', Completed: '#22C55E', Cancelled: '#EF4444',
  pending: '#F59E0B', CheckedIn: '#14B8A6', WithDoctor: '#A78BFA',
  billing_pending: '#F97316',
};

const BookingAnalyticsPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/analytics/bookings?days=${days}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="min-h-screen bg-[#0a0b14]" data-testid="analytics-page">
      <ServiceHeader />
      <main className="max-w-2xl mx-auto px-4 py-5 pb-28">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5" data-testid="analytics-back">
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Booking Analytics</h1>
            <p className="text-xs text-white/40">Performance overview</p>
          </div>
          <div className="flex gap-1">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${days === d ? 'bg-teal-500/20 text-teal-400' : 'bg-white/5 text-white/30'}`}
                data-testid={`period-${d}`}>{d}d</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-teal-400 animate-spin" /></div>
        ) : data ? (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total Bookings', value: data.total, icon: Calendar, color: '#3B82F6' },
                { label: 'Completed', value: data.completed, icon: TrendingUp, color: '#22C55E' },
                { label: 'Completion %', value: `${data.completion_rate}%`, icon: BarChart3, color: '#14B8A6' },
                { label: 'Voice Booked', value: data.voice_booked, icon: Mic, color: '#A78BFA' },
              ].map(k => (
                <div key={k.label} className="p-4 rounded-2xl" style={{ background: `${k.color}10`, border: `1px solid ${k.color}15` }} data-testid={`kpi-${k.label.toLowerCase().replace(/\s/g,'-')}`}>
                  <k.icon className="w-5 h-5 mb-2" style={{ color: k.color }} />
                  <p className="text-2xl font-bold text-white">{k.value}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Daily Chart (bar-like) */}
            {data.daily?.length > 0 && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-xs text-white/40 font-semibold mb-3">DAILY BOOKINGS</p>
                <div className="flex items-end gap-2 h-28">
                  {data.daily.map((d, i) => {
                    const max = Math.max(...data.daily.map(x => x.count), 1);
                    const h = Math.max((d.count / max) * 100, 4);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-teal-400 font-bold">{d.count}</span>
                        <div className="w-full rounded-t-lg transition-all duration-500" style={{ height: `${h}%`, background: 'linear-gradient(180deg, #14B8A6, #0D9488)' }} />
                        <span className="text-[9px] text-white/30">{d.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* By Doctor */}
            {data.by_doctor?.length > 0 && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-xs text-white/40 font-semibold mb-3">BY DOCTOR</p>
                <div className="space-y-2">
                  {data.by_doctor.map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center">
                        <Users className="w-4 h-4 text-teal-400" />
                      </div>
                      <span className="flex-1 text-sm text-white/70">{d.doctor}</span>
                      <span className="text-sm font-bold text-white">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By Status */}
            {data.by_status?.length > 0 && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-xs text-white/40 font-semibold mb-3">BY STATUS</p>
                <div className="flex flex-wrap gap-2">
                  {data.by_status.map((s, i) => {
                    const color = STATUS_COLORS[s.status] || '#64748B';
                    return (
                      <div key={i} className="px-3 py-2 rounded-xl" style={{ background: `${color}15`, border: `1px solid ${color}20` }}>
                        <span className="text-xs font-semibold" style={{ color }}>{s.status}: {s.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 text-white/30">No data available</div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default BookingAnalyticsPage;
