import React, { useState, useEffect } from 'react';
import { Timer, X, ChevronUp, MapPin } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const GlassQueueWidget = () => {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const phone = localStorage.getItem('guestMobile') || localStorage.getItem('patientPhone') || '';

  // Fetch queue position
  useEffect(() => {
    if (!phone) return;
    const fetchPosition = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/api/live-queue/position?phone=${phone}`);
        if (res.data?.queue_position) {
          setPosition(res.data.queue_position);
          setDismissed(false);
        }
      } catch {
        // Not in queue
      } finally {
        setLoading(false);
      }
    };
    fetchPosition();
    const interval = setInterval(fetchPosition, 30000);
    return () => clearInterval(interval);
  }, [phone]);

  // Live timer
  useEffect(() => {
    const timer = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!position || dismissed) return null;

  const pos = position.position || 0;
  const estWait = position.estimated_wait || '—';
  const clinic = position.clinic_name || 'Clinic';
  const doctor = position.doctor_name || '';
  const tokenNum = position.token_number || '';

  // Status color
  const isNext = pos <= 1;
  const isSoon = pos <= 3;
  const accentColor = isNext ? '#10B981' : isSoon ? '#F59E0B' : '#60A5FA';

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-2xl"
        style={{
          background: 'rgba(15,15,25,0.75)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: `1px solid ${accentColor}40`,
        }}
        data-testid="queue-widget-mini"
      >
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: accentColor }} />
        <span className="text-xs font-bold text-white">#{pos}</span>
        <span className="text-[10px] text-gray-400">{estWait}</span>
        <ChevronUp className="w-3 h-3 text-gray-500" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-24 right-4 left-4 sm:left-auto sm:w-80 z-50 rounded-3xl overflow-hidden shadow-2xl"
      style={{
        background: 'rgba(12,12,20,0.72)',
        backdropFilter: 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: `0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 80px ${accentColor}15`,
      }}
      data-testid="queue-widget"
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: accentColor }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: accentColor }}>
            {isNext ? 'You\'re Next!' : 'In Queue'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(true)} className="p-1 rounded-lg hover:bg-white/10 text-gray-500">
            <ChevronUp className="w-3.5 h-3.5 rotate-180" />
          </button>
          <button onClick={() => setDismissed(true)} className="p-1 rounded-lg hover:bg-white/10 text-gray-500">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Position */}
      <div className="px-4 pb-3 flex items-center gap-4">
        <div className="relative">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: `${accentColor}15`,
              border: `2px solid ${accentColor}40`,
            }}
          >
            <span className="text-2xl font-black text-white">#{pos}</span>
          </div>
          {isNext && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-black" style={{ background: accentColor }}>
              !
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="text-white text-sm font-semibold">{estWait} estimated wait</p>
          <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {clinic}
          </p>
          {doctor && <p className="text-gray-500 text-[10px] mt-0.5">{doctor}</p>}
        </div>
      </div>

      {/* Token + Progress */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          {tokenNum && (
            <span className="text-[10px] font-medium text-gray-500">Token: {tokenNum}</span>
          )}
          <span className="text-[10px] text-gray-600">
            <Timer className="w-3 h-3 inline mr-1" />
            {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')} waiting
          </span>
        </div>
        {/* Glass progress bar */}
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.max(10, 100 - (pos * 15))}%`,
              background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80)`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default GlassQueueWidget;
