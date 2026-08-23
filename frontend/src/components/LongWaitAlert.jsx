import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, Stethoscope, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * LongWaitAlert — In-app notification for doctor/staff when a patient waits 30+ min.
 * Props:
 *   appointments  — array of today's appointments (with checked_in_at, status, patient_name, id)
 *   onStartConsult — fn(apt) called when doctor clicks "Ready to Consult"
 *   thresholdMinutes — default 30
 *   portalType — 'doctor' | 'staff'
 */
const LongWaitAlert = ({ appointments = [], onStartConsult, thresholdMinutes = 30, portalType = 'doctor' }) => {
  const [snoozedUntil, setSnoozedUntil] = useState({});
  const [dismissed, setDismissed] = useState({});
  const [tick, setTick] = useState(0);

  // Tick every 30s to recalculate wait times
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(iv);
  }, []);

  const getWaitMinutes = useCallback((checkedInAt) => {
    if (!checkedInAt) return 0;
    try {
      const raw = checkedInAt.replace(/[+-]\d{2}:\d{2}$/, '').replace('Z', '');
      const d = new Date(raw);
      const istOffset = 5.5 * 60 * 60 * 1000;
      const sinceUTC = d.getTime() - istOffset;
      return Math.max(0, Math.floor((Date.now() - sinceUTC) / 60000));
    } catch {
      return 0;
    }
  }, [tick]);

  // Filter: CheckedIn patients waiting >= threshold, not snoozed, not dismissed
  const longWaiters = appointments
    .filter(apt => apt.status === 'CheckedIn' && apt.checked_in_at)
    .map(apt => ({ ...apt, waitMinutes: getWaitMinutes(apt.checked_in_at) }))
    .filter(apt => apt.waitMinutes >= thresholdMinutes)
    .filter(apt => {
      const snoozeEnd = snoozedUntil[apt.id];
      if (snoozeEnd && Date.now() < snoozeEnd) return false;
      return !dismissed[apt.id];
    })
    .sort((a, b) => b.waitMinutes - a.waitMinutes);

  const handleSnooze = (aptId) => {
    setSnoozedUntil(prev => ({ ...prev, [aptId]: Date.now() + 10 * 60 * 1000 }));
  };

  const handleReadyToConsult = (apt) => {
    if (onStartConsult) onStartConsult(apt);
    setDismissed(prev => ({ ...prev, [apt.id]: true }));
  };

  if (longWaiters.length === 0) return null;

  return (
    <div className="space-y-2 px-4 pt-2" data-testid="long-wait-alert">
      {longWaiters.map(apt => {
        const isUrgent = apt.waitMinutes >= 45;
        const bgColor = isUrgent ? '#FEE2E2' : '#FEF3C7';
        const borderColor = isUrgent ? '#FECACA' : '#FDE68A';
        const textColor = isUrgent ? '#991B1B' : '#92400E';
        const accentColor = isUrgent ? '#DC2626' : '#D97706';

        return (
          <div key={apt.id}
            className="rounded-2xl p-3.5 border shadow-sm animate-in slide-in-from-top-2 duration-300"
            style={{ background: bgColor, borderColor }}
            data-testid={`long-wait-alert-${apt.id}`}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: accentColor + '20' }}>
                <AlertTriangle className="w-4.5 h-4.5" style={{ color: accentColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold" style={{ color: textColor }}>
                    {apt.patient_name || 'Patient'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg"
                    style={{ background: accentColor + '20', color: accentColor }}>
                    <Clock className="w-3 h-3" />
                    {apt.waitMinutes}m wait
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: textColor + 'CC' }}>
                  {isUrgent ? 'Urgent — patient waiting over 45 minutes' : 'Patient has been waiting over 30 minutes'}
                  {apt.token_number ? ` (Token #${apt.token_number})` : ''}
                </p>
                <div className="flex items-center gap-2 mt-2.5">
                  {portalType === 'doctor' && (
                    <Button size="sm"
                      className="h-8 px-3 text-xs font-bold rounded-xl shadow-sm"
                      style={{ background: '#16A34A', color: '#fff' }}
                      onClick={() => handleReadyToConsult(apt)}
                      data-testid={`ready-to-consult-${apt.id}`}
                    >
                      <Stethoscope className="w-3.5 h-3.5 mr-1" />
                      Ready to Consult
                    </Button>
                  )}
                  <Button size="sm" variant="outline"
                    className="h-8 px-3 text-xs font-medium rounded-xl"
                    style={{ borderColor: accentColor + '40', color: textColor }}
                    onClick={() => handleSnooze(apt.id)}
                    data-testid={`snooze-${apt.id}`}
                  >
                    <BellOff className="w-3.5 h-3.5 mr-1" />
                    Snooze 10m
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LongWaitAlert;
