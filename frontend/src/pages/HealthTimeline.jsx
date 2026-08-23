import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Stethoscope, FileText, TestTube, Pill, Calendar, ChevronRight, Activity } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ICONS = {
  appointment: Stethoscope,
  prescription: FileText,
  lab_result: TestTube,
  pharmacy_order: Pill,
};

export default function HealthTimeline() {
  const navigate = useNavigate();
  const [timeline, setTimeline] = useState({ events: [], grouped: {}, stats: {} });
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const phone = user.phone || user.mobile || '8108888330';

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/health-timeline/${phone}?limit=50`);
      if (res.data.success) setTimeline(res.data);
    } catch (err) {
      toast.error('Failed to load timeline');
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  const stats = timeline.stats || {};
  const statCards = [
    { label: 'Visits', value: stats.total_appointments || 0, icon: Stethoscope, color: '#14B8A6' },
    { label: 'Rx', value: stats.total_prescriptions || 0, icon: FileText, color: '#F97316' },
    { label: 'Labs', value: stats.total_lab_tests || 0, icon: TestTube, color: '#8B5CF6' },
    { label: 'Orders', value: stats.total_orders || 0, icon: Pill, color: '#EC4899' },
  ];

  return (
    <div className="dark-page min-h-screen bg-[#050510] text-white pb-32" data-testid="health-timeline">
      {/* Header */}
      <div className="glass-crystal sticky top-0 z-50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/5 btn-press" data-testid="timeline-back-btn">
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </button>
        <div>
          <h1 className="text-sm font-bold font-heading">Health Timeline</h1>
          <p className="text-[10px] text-white/40">Your complete health journey</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-4 pt-4 pb-2">
        <div className="grid grid-cols-4 gap-2">
          {statCards.map((s, i) => (
            <div key={i} className="rounded-2xl p-3 text-center card-interactive" style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}>
              <s.icon className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-lg font-bold font-heading" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] text-white/40 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 pt-4">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />)}
          </div>
        ) : Object.keys(timeline.grouped).length === 0 ? (
          <div className="text-center pt-20">
            <Activity className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30 font-medium">No health events yet</p>
            <p className="text-xs text-white/15 mt-1">Your appointments, prescriptions, and lab results will appear here</p>
            <button onClick={() => navigate('/diagyn')} className="mt-6 px-6 py-3 rounded-2xl bg-teal-500/10 text-teal-400 text-sm font-bold btn-press" data-testid="timeline-book-btn">
              Book Your First Appointment
            </button>
          </div>
        ) : (
          Object.entries(timeline.grouped).map(([month, events]) => (
            <div key={month} className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-bold mb-3 pl-1">{month}</p>
              <div className="space-y-2">
                {events.map((evt, i) => {
                  const Icon = ICONS[evt.type] || Calendar;
                  return (
                    <div key={i} className="flex gap-3 items-start card-interactive rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${evt.color}15` }}>
                          <Icon className="w-4 h-4" style={{ color: evt.color }} />
                        </div>
                        {i < events.length - 1 && <div className="w-px h-8 mt-1" style={{ background: `${evt.color}20` }} />}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/90 truncate">{evt.title}</p>
                        <p className="text-xs text-white/40 mt-0.5 truncate">{evt.subtitle}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-white/25">{formatDate(evt.date)}</span>
                          {evt.status && (
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${evt.status === 'abnormal' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-white/30'}`}>
                              {evt.status}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/15 mt-2" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatDate(d) {
  if (!d) return '';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(d).slice(0, 10);
  }
}
