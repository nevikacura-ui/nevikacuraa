import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Loader2, Calendar, Clock, Users, TrendingUp, BarChart3, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ServiceHeader from '@/components/ServiceHeader';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const DoctorInsightsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const doctorName = user?.name || user?.username || 'Dr. Vikas';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/doctor-insights/summary/${encodeURIComponent(doctorName)}?days=${days}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [doctorName, days]);

  return (
    <div className="min-h-screen bg-[#0a0b14]" data-testid="doctor-insights-page">
      <ServiceHeader />
      <main className="max-w-lg mx-auto px-4 py-5 pb-28">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5" data-testid="insights-back">
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Doctor Insights</h1>
            <p className="text-xs text-white/40">{doctorName} · Last {days} days</p>
          </div>
          <div className="flex gap-1">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${days === d ? 'bg-violet-500/20 text-violet-400' : 'bg-white/5 text-white/30'}`}
                data-testid={`period-${d}`}>{d}d</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></div>
        ) : data ? (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Total Appointments', value: data.total_appointments, color: '#3B82F6' },
                { label: 'Completion Rate', value: `${data.completion_rate}%`, color: '#22C55E' },
                { label: 'Cancelled', value: data.cancelled, color: '#EF4444' },
                { label: 'Voice Bookings', value: data.voice_booked, color: '#A78BFA' },
              ].map(s => (
                <div key={s.label} className="p-3.5 rounded-xl" style={{ background: `${s.color}10`, border: `1px solid ${s.color}15` }}>
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Peak Hours */}
            {data.peak_hours?.length > 0 && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-xs text-white/40 font-semibold mb-2">PEAK HOURS</p>
                <div className="flex gap-2">
                  {data.peak_hours.map((h, i) => (
                    <div key={i} className="flex-1 p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/15 text-center">
                      <Clock className="w-4 h-4 text-violet-400 mx-auto mb-1" />
                      <p className="text-sm font-bold text-white">{h.hour}</p>
                      <p className="text-[10px] text-white/30">{h.count} appts</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Busiest Days */}
            {data.busiest_days?.length > 0 && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-xs text-white/40 font-semibold mb-2">BUSIEST DAYS</p>
                <div className="flex gap-2">
                  {data.busiest_days.map((d, i) => (
                    <div key={i} className="flex-1 p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/15 text-center">
                      <Calendar className="w-4 h-4 text-teal-400 mx-auto mb-1" />
                      <p className="text-sm font-bold text-white">{d.day}</p>
                      <p className="text-[10px] text-white/30">{d.count} appts</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insights */}
            {data.ai_insights?.length > 0 && (
              <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.06))', border: '1px solid rgba(139,92,246,0.15)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <p className="text-xs text-violet-400 font-semibold">AI INSIGHTS</p>
                </div>
                <div className="space-y-2">
                  {data.ai_insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Brain className="w-3.5 h-3.5 text-violet-400/60 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-white/60 leading-relaxed">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 text-white/30">No insight data available</div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default DoctorInsightsPage;
