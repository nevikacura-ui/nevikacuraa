import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

/**
 * Self-updating timer that shows elapsed time since a given ISO timestamp.
 * Updates every 30 seconds. Color-coded: green < 15m, amber 15-30m, red > 30m.
 */
const LiveWaitTimer = ({ since, label = 'Waiting', compact = false }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!since) return;
    const calc = () => {
      try {
        // Handle IST-stored timestamps (no timezone info = IST)
        const raw = since.replace(/[+-]\d{2}:\d{2}$/, '').replace('Z', '');
        const d = new Date(raw);
        const now = new Date();
        // IST offset
        const istOffset = 5.5 * 60 * 60 * 1000;
        const sinceUTC = d.getTime() - istOffset;
        const nowUTC = now.getTime();
        return Math.max(0, Math.floor((nowUTC - sinceUTC) / 60000));
      } catch {
        return 0;
      }
    };
    setElapsed(calc());
    const iv = setInterval(() => setElapsed(calc()), 30000);
    return () => clearInterval(iv);
  }, [since]);

  if (!since) return null;

  const mins = elapsed;
  const display = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  const color = mins < 15 ? '#16A34A' : mins < 30 ? '#D97706' : '#DC2626';
  const bg = mins < 15 ? '#DCFCE7' : mins < 30 ? '#FEF3C7' : '#FEE2E2';

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg"
        style={{ background: bg, color }} data-testid="wait-timer">
        <Timer className="w-3 h-3" /> {display}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg"
      style={{ background: bg, color }} data-testid="wait-timer">
      <Timer className="w-3.5 h-3.5" />
      <span>{label} {display}</span>
    </div>
  );
};

export default LiveWaitTimer;
