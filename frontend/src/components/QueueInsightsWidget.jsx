import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Clock, TrendingUp, Activity } from 'lucide-react';
import axios from 'axios';
import CountUp from './CountUp';

const API = process.env.REACT_APP_BACKEND_URL;

const QueueInsightsWidget = ({ token, clinic, date, className = '' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pulsingKeys, setPulsingKeys] = useState(new Set());
  const prevDataRef = useRef(null);

  const fetchInsights = useCallback(async () => {
    try {
      const params = {};
      if (clinic) params.clinic = clinic;
      if (date) params.date = date;
      const res = await axios.get(`${API}/api/diagyn-staff/queue/insights`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      if (res.data.success) {
        // Detect which values changed for pulse animation
        if (prevDataRef.current) {
          const changed = new Set();
          if (prevDataRef.current.waiting_count !== res.data.waiting_count) changed.add('Waiting');
          if (prevDataRef.current.with_doctor_count !== res.data.with_doctor_count) changed.add('With Dr');
          if (prevDataRef.current.avg_wait_minutes !== res.data.avg_wait_minutes) changed.add('Avg Wait');
          if (prevDataRef.current.completed_count !== res.data.completed_count) changed.add('Done');
          if (changed.size > 0) {
            setPulsingKeys(changed);
            setTimeout(() => setPulsingKeys(new Set()), 600);
          }
        }
        prevDataRef.current = res.data;
        setData(res.data);
      }
    } catch (err) {
      console.error('Queue insights fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [token, clinic, date]);

  useEffect(() => {
    fetchInsights();
    const iv = setInterval(fetchInsights, 30000);
    return () => clearInterval(iv);
  }, [fetchInsights]);

  if (loading || !data) return null;

  const stats = [
    { icon: Users, label: 'Waiting', value: data.waiting_count, isNumeric: true, gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
    { icon: Activity, label: 'With Dr', value: data.with_doctor_count, isNumeric: true, gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
    { icon: Clock, label: 'Avg Wait', value: data.avg_wait_minutes, suffix: 'm', isNumeric: true, gradient: 'linear-gradient(135deg, #0D9488, #0F766E)' },
    { icon: TrendingUp, label: 'Done', value: data.completed_count, isNumeric: true, gradient: 'linear-gradient(135deg, #22C55E, #16A34A)' },
  ];

  return (
    <div className={`rounded-2xl p-4 ${className}`} style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.04)' }} data-testid="queue-insights">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-stone-700">Queue Insights</h3>
        <span className="text-[10px] text-stone-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className={`flex flex-col items-center p-2 rounded-xl transition-transform ${pulsingKeys.has(s.label) ? 'queue-pulse' : ''}`}
            style={{ background: s.gradient, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <s.icon className="w-4 h-4 mb-1 text-white/90" />
            <span className="text-base font-bold text-white">
              <CountUp end={s.value} duration={700} />{s.suffix || ''}
            </span>
            <span className="text-[9px] font-medium text-white/80">{s.label}</span>
          </div>
        ))}
      </div>
      {data.longest_waiting && data.longest_waiting.wait_minutes > 0 && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: data.longest_waiting.wait_minutes > 30 ? '#FEE2E2' : '#FEF3C7' }}>
          <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: data.longest_waiting.wait_minutes > 30 ? '#DC2626' : '#D97706' }} />
          <span className="text-xs font-medium" style={{ color: data.longest_waiting.wait_minutes > 30 ? '#DC2626' : '#92400E' }}>
            Longest wait: <strong>{data.longest_waiting.patient_name}</strong> ({data.longest_waiting.wait_minutes}m)
          </span>
        </div>
      )}
    </div>
  );
};

export default QueueInsightsWidget;
