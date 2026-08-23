import React from 'react';
import { useStaff } from './StaffContext';
import { COLORS } from './staffConstants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users, AlertTriangle, Stethoscope, Search, Loader2, CheckCircle2, Plus, Printer, Clock} from 'lucide-react';
import { lightTap, mediumTap } from '@/utils/haptics';

const StaffWalkinView = () => {
  const s = useStaff();

  return (
    <div className="space-y-4">
      {/* Walk-in Banner */}
      <div className="rounded-2xl p-4" style={{ background: s.isEmergency ? COLORS.danger + '15' : COLORS.warning + '15' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: s.isEmergency ? COLORS.danger + '30' : COLORS.warning + '30' }}>
              {s.isEmergency ? <AlertTriangle className="w-5 h-5" style={{ color: COLORS.danger }} /> : <Users className="w-5 h-5" style={{ color: COLORS.warning }} />}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: s.isEmergency ? COLORS.danger : COLORS.warning }}>
                {s.isEmergency ? 'Emergency Mode' : `Walk-in at ${s.selectedClinic.replace(' Clinic', '')}`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
                {s.isEmergency ? 'No slot needed — immediate token' : s.currentSession ? `Session: ${s.getSessionLabel(s.currentSession)}` : 'No active session'}
              </p>
            </div>
          </div>
          <button onClick={() => { mediumTap(); s.setIsEmergency(!s.isEmergency); }}
            className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: s.isEmergency ? COLORS.warning + '30' : COLORS.danger + '30',
              color: s.isEmergency ? COLORS.warning : COLORS.danger
            }}
            data-testid="toggle-emergency-btn">
            {s.isEmergency ? 'Walk-in' : 'Emergency'}
          </button>
        </div>
      </div>

      {/* Select Doctor */}
      <div className="rounded-2xl p-4 shadow-sm" style={{ background: COLORS.bgCard }}>
        <label className="text-xs font-bold mb-3 block" style={{ color: COLORS.textMuted }}>SELECT DOCTOR</label>
        <div className="grid grid-cols-2 gap-3">
          {s.getDoctorsForClinic().map(doctor => (
            <button key={doctor}
              onClick={() => { mediumTap(); s.setSelectedDoctor(doctor); s.setSelectedSlot(''); }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${s.selectedDoctor === doctor ? 'shadow-lg' : 'border-transparent'}`}
              style={s.selectedDoctor === doctor
                ? { background: COLORS.cream, color: COLORS.textDark, borderColor: COLORS.gold }
                : { background: COLORS.bgCardHover, color: COLORS.textLight }
              }>
              <Stethoscope className="w-5 h-5 mb-2" style={{ color: s.selectedDoctor === doctor ? COLORS.gold : COLORS.textMuted }} />
              <p className="font-bold text-sm">{doctor.replace('Dr. ', '')}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Emergency mode: skip slot selection */}
      {s.isEmergency && !s.selectedDoctor && (
        <div className="rounded-2xl p-6 text-center" style={{ background: COLORS.danger + '10' }}>
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" style={{ color: COLORS.danger }} />
          <p className="text-sm font-semibold" style={{ color: COLORS.danger }}>Select a doctor above to proceed</p>
          <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>Then enter patient details to book emergency</p>
        </div>
      )}

      {/* Slots (for walk-in with active session) */}
      {s.selectedDoctor && !s.isEmergency && s.currentSession && (
        <div className="rounded-2xl p-4 shadow-sm" style={{ background: COLORS.bgCard }}>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold" style={{ color: COLORS.textMuted }}>
              CURRENT SESSION SLOTS
              <span className="ml-2 text-xs px-2 py-0.5 rounded-lg"
                style={{ background: COLORS.teal + '20', color: COLORS.teal }}>
                {s.getSessionLabel(s.currentSession)}
              </span>
            </label>
            {s.loadingSlots && <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.gold }} />}
          </div>
          {s.availableSlots.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {s.availableSlots.map(slot => (
                <button key={slot.value}
                  onClick={() => { lightTap(); s.setSelectedSlot(slot.value); }}
                  className="py-2.5 rounded-xl text-xs font-medium transition-all"
                  style={s.selectedSlot === slot.value
                    ? { background: COLORS.gold, color: '#FFFFFF' }
                    : { background: COLORS.bgCardHover, color: COLORS.textLight }
                  }>
                  {slot.display}
                </button>
              ))}
            </div>
          ) : (
            <button onClick={() => s.loadWalkinSlots()} className="w-full text-center text-sm py-4 hover:underline active:scale-[0.98]" style={{ color: COLORS.textMuted }}>No slots available — tap to refresh</button>
          )}
        </div>
      )}

      {/* No session — allow walk-in without slot */}
      {s.selectedDoctor && !s.isEmergency && !s.currentSession && (
        <div className="rounded-2xl p-4" style={{ background: COLORS.warning + '15' }}>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5" style={{ color: COLORS.warning }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: COLORS.warning }}>No active session — Walk-in without slot</p>
              <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>Patient will be added directly. Enter details below.</p>
            </div>
          </div>
        </div>
      )}

      {/* Patient Details */}
      {s.selectedDoctor && (s.isEmergency || s.selectedSlot || !s.currentSession) && (
        <div className="rounded-2xl p-4 shadow-sm space-y-3" style={{ background: COLORS.cream }}>
          <label className="text-xs font-bold block" style={{ color: COLORS.textDark }}>PATIENT DETAILS</label>
          <div className="flex gap-2">
            <Input value={s.patientMobile} maxLength={10}
              onChange={(e) => s.setPatientMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Mobile (10 digits)"
              className="h-11 rounded-xl border-white/10"
              style={{ background: 'rgba(255,255,255,0.7)', color: '#1E293B' }} />
            <Button onClick={s.lookupPatient} disabled={s.searchingPatient || s.patientMobile.length < 10}
              className="h-11 px-4 rounded-xl"
              style={{ background: COLORS.gold }}>
              {s.searchingPatient ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
          {s.foundPatient && (
            <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: COLORS.teal + '15' }}>
              <CheckCircle2 className="w-5 h-5" style={{ color: COLORS.teal }} />
              <span className="font-medium text-sm" style={{ color: COLORS.teal }}>{s.foundPatient.name}</span>
            </div>
          )}
          <Input value={s.patientName} onChange={(e) => s.setPatientName(e.target.value)}
            placeholder="Patient Name"
            className="h-11 rounded-xl border-white/10"
            style={{ background: 'rgba(255,255,255,0.7)', color: '#1E293B' }} />

          {/* Book Button */}
          {!s.walkinTokenResult && (
            <Button
              onClick={() => s.handleBooking(s.isEmergency ? 'EMERGENCY' : 'WALK_IN')}
              disabled={s.loading || !s.patientName || !s.patientMobile}
              className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: s.isEmergency ? COLORS.danger : COLORS.gold,
                boxShadow: (s.patientName && s.patientMobile) ? `0 8px 20px ${s.isEmergency ? COLORS.danger : COLORS.gold}40` : 'none'
              }}
              data-testid="book-appointment-btn">
              {s.loading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> :
                s.isEmergency ? <AlertTriangle className="w-6 h-6 mr-2" /> : <Users className="w-6 h-6 mr-2" />}
              {s.isEmergency ? 'BOOK EMERGENCY' : 'BOOK WALK-IN'}
            </Button>
          )}
          {!s.walkinTokenResult && (!s.patientName || !s.patientMobile) && (
            <p className="text-[10px] text-center" style={{ color: COLORS.textMuted }}>
              Enter mobile number and patient name to book
            </p>
          )}
        </div>
      )}

      {/* Token Result Card */}
      {s.walkinTokenResult && (
        <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: COLORS.bgCard }}>
          <div className="p-5 text-center" style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}>
            <p className="text-xs text-white/80 font-medium uppercase tracking-wider">Token Assigned</p>
            <p className="text-5xl font-black text-white mt-1" data-testid="walkin-token-number">{s.walkinTokenResult.token_number}</p>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: COLORS.textMuted }}>Patient</span>
              <span className="font-bold" style={{ color: COLORS.textLight }}>{s.walkinTokenResult.patient_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: COLORS.textMuted }}>Doctor</span>
              <span className="font-bold" style={{ color: COLORS.textLight }}>{s.walkinTokenResult.doctor}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: COLORS.textMuted }}>Time</span>
              <span className="font-bold" style={{ color: COLORS.textLight }}>{s.walkinTokenResult.time}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: COLORS.textMuted }}>Booking ID</span>
              <span className="font-bold" style={{ color: COLORS.gold }}>{s.walkinTokenResult.booking_id}</span>
            </div>
          </div>
          <div className="p-4 pt-0 flex gap-2">
            <Button onClick={() => s.smartPrintToken(s.walkinTokenResult)}
              className="flex-1 h-12 rounded-xl font-bold text-white"
              style={{ background: COLORS.teal }}
              data-testid="print-token-btn">
              <Printer className="w-5 h-5 mr-2" /> Print Token
            </Button>
            <Button onClick={() => { s.setWalkinTokenResult(null); s.resetBookingForm(); }}
              className="flex-1 h-12 rounded-xl font-bold"
              style={{ background: COLORS.bgCardHover, color: COLORS.textLight }}
              data-testid="new-walkin-btn">
              <Plus className="w-5 h-5 mr-2" /> Next Patient
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffWalkinView;
