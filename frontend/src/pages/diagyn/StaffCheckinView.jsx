import React from 'react';
import { useStaff } from './StaffContext';
import { COLORS } from './staffConstants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield, CheckCircle2, AlertTriangle, Loader2, Printer, Clock, Phone, Calendar, Stethoscope
} from 'lucide-react';
import LiveWaitTimer from '@/components/LiveWaitTimer';

const StaffCheckinView = () => {
  const s = useStaff();
  const activePatients = (s.filteredAppointments || s.appointments);

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="rounded-2xl p-4" style={{ background: COLORS.teal + '15' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: COLORS.teal + '30' }}>
            <Shield className="w-5 h-5" style={{ color: COLORS.teal }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: COLORS.teal }}>Quick Check-in by Booking Code</p>
            <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>Enter the patient's booking code to check them in instantly</p>
          </div>
        </div>
      </div>

      {/* Code Input */}
      <div className="rounded-2xl p-5 shadow-sm" style={{ background: COLORS.cream }}>
        <label className="text-xs font-bold mb-3 block" style={{ color: COLORS.textDark }}>ENTER BOOKING CODE</label>
        <div className="flex gap-3">
          <Input value={s.bookingCodeInput} onChange={(e) => s.setBookingCodeInput(e.target.value.toUpperCase())}
            placeholder="e.g., DG123ABC"
            className="flex-1 h-14 text-xl font-mono text-center tracking-widest rounded-xl border-2 border-white/10 focus:border-teal-500 uppercase"
            style={{ letterSpacing: '0.15em', background: 'rgba(255,255,255,0.5)', color: '#FFFFFF' }}
            maxLength={12} onKeyPress={(e) => e.key === 'Enter' && s.handleCheckInByCode()} data-testid="booking-code-input" />
        </div>
        <Button onClick={s.handleCheckInByCode} disabled={s.checkingInByCode || s.bookingCodeInput.length < 3}
          className="w-full h-14 mt-4 text-lg font-bold rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: COLORS.teal, boxShadow: `0 8px 20px ${COLORS.teal}40` }} data-testid="check-in-btn">
          {s.checkingInByCode ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <CheckCircle2 className="w-6 h-6 mr-2" />}
          CHECK IN PATIENT
        </Button>
      </div>

      {/* Result */}
      {s.codeCheckInResult && (
        <div className="rounded-2xl p-4" style={{ background: s.codeCheckInResult.success ? COLORS.teal + '15' : COLORS.danger + '15' }}>
          {s.codeCheckInResult.success ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: COLORS.teal + '30' }}>
                <CheckCircle2 className="w-8 h-8" style={{ color: COLORS.teal }} />
              </div>
              <p className="font-bold text-lg" style={{ color: COLORS.teal }}>Check-in Successful!</p>
              <div className="mt-4 p-4 rounded-xl" style={{ background: COLORS.bgCard }}>
                <p className="text-3xl font-bold" style={{ color: COLORS.textLight }}>TOKEN #{s.codeCheckInResult.token_number}</p>
                <p className="text-sm mt-2" style={{ color: COLORS.textMuted }}>{s.codeCheckInResult.appointment?.patient_name}</p>
                <p className="text-xs" style={{ color: COLORS.textMuted }}>{s.codeCheckInResult.appointment?.doctor} • {s.codeCheckInResult.appointment?.time}</p>
              </div>
              {s.printerConnected && s.codeCheckInResult.token_data && (
                <Button onClick={() => s.printToken(s.codeCheckInResult.token_data)} className="mt-4 rounded-xl" style={{ background: COLORS.gold }} data-testid="reprint-token-btn">
                  <Printer className="w-4 h-4 mr-2" /> Reprint Token
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: COLORS.danger + '30' }}>
                <AlertTriangle className="w-8 h-8" style={{ color: COLORS.danger }} />
              </div>
              <p className="font-bold" style={{ color: COLORS.danger }}>
                {s.codeCheckInResult.error === 'already_checked_in' ? 'Already Checked In' : 'Not Found'}
              </p>
              <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>{s.codeCheckInResult.message}</p>
              {s.codeCheckInResult.appointment && (
                <div className="mt-3 p-3 rounded-xl text-left" style={{ background: COLORS.bgCard }}>
                  <p className="text-sm font-medium" style={{ color: COLORS.textLight }}>{s.codeCheckInResult.appointment.patient_name}</p>
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>Status: {s.codeCheckInResult.appointment.status} • Token #{s.codeCheckInResult.appointment.token_number || 'N/A'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent Check-ins */}
      <div className="rounded-2xl p-4 shadow-sm" style={{ background: COLORS.bgCard }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: COLORS.textLight }}>Today's Active Patients</h3>
        {activePatients.filter(a => a.status === 'CheckedIn' || a.status === 'WithDoctor' || a.status === 'billing_pending').length === 0 ? (
          <p className="text-center text-sm py-4" style={{ color: COLORS.textMuted }}>No active patients</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <div className="flex items-center gap-3 text-xs mb-2 pb-2 border-b" style={{ borderColor: COLORS.bgCardHover }}>
              <span className="px-2 py-0.5 rounded" style={{ background: COLORS.teal + '20', color: COLORS.teal }}>S = Scheduled</span>
              <span className="px-2 py-0.5 rounded" style={{ background: COLORS.info + '20', color: COLORS.info }}>W = Walk-in</span>
              <span className="px-2 py-0.5 rounded" style={{ background: COLORS.error + '20', color: COLORS.error }}>E = Emergency</span>
            </div>
            {activePatients
              .filter(a => a.status === 'CheckedIn' || a.status === 'WithDoctor' || a.status === 'billing_pending')
              .sort((a, b) => {
                const tp = { 'SCHEDULED': 1, 'WALK_IN': 2, 'EMERGENCY': 3 };
                const d = (tp[a.appointment_type] || 1) - (tp[b.appointment_type] || 1);
                return d !== 0 ? d : (a.token_sequence || 0) - (b.token_sequence || 0);
              })
              .map(apt => {
                const prefix = apt.token_number?.charAt?.(0) || 'S';
                const tc = { 'S': { bg: COLORS.teal + '20', text: COLORS.teal }, 'W': { bg: COLORS.info + '20', text: '#60A5FA' }, 'E': { bg: COLORS.error + '20', text: COLORS.error } };
                const ts = tc[prefix] || tc['S'];
                return (
                  <div key={apt.id} className="flex items-center justify-between p-2 rounded-xl" style={{ background: COLORS.bgCardHover }}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
                        style={{ background: apt.status === 'WithDoctor' ? COLORS.purple + '20' : ts.bg, color: apt.status === 'WithDoctor' ? COLORS.purple : ts.text }}>
                        {apt.token_number || apt.token_sequence || '—'}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: COLORS.textLight }}>{apt.patient_name}</p>
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>{apt.doctor?.replace('Dr. ', '')} • {apt.time || (apt.appointment_type === 'EMERGENCY' ? 'Emergency' : 'Walk-in')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {apt.status === 'CheckedIn' && apt.checked_in_at && (
                        <LiveWaitTimer since={apt.checked_in_at} compact />
                      )}
                      <span className="text-xs font-bold px-2 py-1 rounded"
                        style={{ background: apt.status === 'WithDoctor' ? COLORS.purple + '20' : COLORS.warning + '20', color: apt.status === 'WithDoctor' ? COLORS.purple : COLORS.warning }}>
                        {apt.status === 'WithDoctor' ? 'WITH DR' : 'WAITING'}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffCheckinView;
