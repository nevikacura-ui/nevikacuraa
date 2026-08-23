import React, { useState, useEffect } from 'react';
import { Clock, Users, CheckCircle2, Sparkles } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const formatWaitTime = (minutes) => {
  if (minutes === 0) return 'No wait';
  if (minutes < 5) return '< 5 min';
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `~${hours}h ${mins}m`;
};

const WaitTimeEstimate = ({ clinic = 'DiaGyn', doctor = null, className = '' }) => {
  const [waitData, setWaitData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWaitTime();
    const interval = setInterval(fetchWaitTime, 120000);
    return () => clearInterval(interval);
  }, [clinic, doctor]);

  const fetchWaitTime = async () => {
    try {
      const params = new URLSearchParams();
      if (clinic) params.append('clinic', clinic);
      const res = await fetch(`${API}/api/diagyn-staff/queue/insights?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('staffToken') || localStorage.getItem('doctorToken') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWaitData({
            currentQueue: data.waiting_count,
            estimatedWait: data.avg_wait_minutes > 0 ? data.avg_wait_minutes * Math.max(1, data.waiting_count) : data.waiting_count * 8,
            avgConsultTime: data.avg_wait_minutes || 8,
            withDoctor: data.with_doctor_count,
          });
        }
      }
    } catch {
      // Fallback to basic estimate
      setWaitData({ currentQueue: 0, estimatedWait: 0, avgConsultTime: 10, withDoctor: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !waitData) return null;

  const { currentQueue, estimatedWait, withDoctor } = waitData;

  // Positive messaging
  const getMessage = () => {
    if (currentQueue === 0) return { icon: Sparkles, text: 'Walk right in — no queue!', color: '#16A34A', bg: '#DCFCE7' };
    if (estimatedWait < 10) return { icon: CheckCircle2, text: 'Quick visit expected', color: '#16A34A', bg: '#DCFCE7' };
    if (estimatedWait < 25) return { icon: Clock, text: 'Short wait expected', color: '#0D9488', bg: '#CCFBF1' };
    return { icon: Users, text: 'Clinic is busy today', color: '#D97706', bg: '#FEF3C7' };
  };

  const msg = getMessage();

  return (
    <div className={`rounded-2xl p-4 border ${className}`} style={{ background: msg.bg, borderColor: msg.color + '30' }} data-testid="wait-time-estimate">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: msg.color + '20' }}>
          <msg.icon className="w-5 h-5" style={{ color: msg.color }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: msg.color }}>{msg.text}</p>
          <p className="text-xs mt-0.5 text-stone-500">
            {currentQueue > 0
              ? `${currentQueue} patient${currentQueue > 1 ? 's' : ''} ahead  ~${formatWaitTime(estimatedWait)}`
              : 'Doctor is available now'}
          </p>
        </div>
        {withDoctor > 0 && (
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: '#7C3AED' }}>{withDoctor}</div>
            <div className="text-[9px] text-stone-400">In consult</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitTimeEstimate;
