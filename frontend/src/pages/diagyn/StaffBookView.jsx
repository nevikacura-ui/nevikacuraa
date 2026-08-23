import React from 'react';
import { useStaff } from './StaffContext';
import { COLORS } from './staffConstants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CalendarPlus, Stethoscope, Search, Loader2, CheckCircle2
} from 'lucide-react';
import { lightTap, mediumTap } from '@/utils/haptics';

const StaffBookView = () => {
  const s = useStaff();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background: COLORS.info + '15' }}>
        <p className="text-sm font-medium" style={{ color: COLORS.info }}>
          <CalendarPlus className="w-4 h-4 inline mr-2" />
          Book future appointment at {s.selectedClinic.replace(' Clinic', '')}
        </p>
      </div>

      {/* Select Doctor */}
      <div className="rounded-2xl p-4 shadow-sm" style={{ background: COLORS.bgCard }}>
        <label className="text-xs font-bold mb-3 block" style={{ color: COLORS.textMuted }}>1. SELECT DOCTOR</label>
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

      {/* Select Date */}
      {s.selectedDoctor && (
        <div className="rounded-2xl p-4 shadow-sm" style={{ background: COLORS.bgCard }}>
          <label className="text-xs font-bold mb-3 block" style={{ color: COLORS.textMuted }}>2. SELECT DATE (Up to 3 months ahead)</label>
          <input type="date" value={s.bookingDate} min={s.getISTDate()} max={s.getMaxBookingDate()}
            onChange={(e) => { lightTap(); s.setBookingDate(e.target.value); s.setSelectedSlot(''); }}
            className="w-full h-11 px-4 rounded-xl text-sm border-0"
            style={{ background: COLORS.bgCardHover, color: COLORS.textLight }} />
          {s.bookingDate && (
            <p className="text-xs mt-2" style={{ color: COLORS.textMuted }}>{s.getDayName(s.bookingDate)}</p>
          )}
        </div>
      )}

      {/* Available Slots */}
      {s.selectedDoctor && s.bookingDate && (
        <div className="rounded-2xl p-4 shadow-sm" style={{ background: COLORS.bgCard }}>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold" style={{ color: COLORS.textMuted }}>3. SELECT SLOT</label>
            {s.loadingSlots && <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.gold }} />}
          </div>
          {s.availableSlots.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
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
            <button onClick={() => s.loadBookingSlots()} className="w-full text-center text-sm py-4 hover:underline active:scale-[0.98]" style={{ color: COLORS.textMuted }}>
              {s.loadingSlots ? 'Loading...' : 'No slots available — tap to refresh'}
            </button>
          )}
        </div>
      )}

      {/* Patient Details */}
      {s.selectedSlot && (
        <div className="rounded-2xl p-4 shadow-sm space-y-3" style={{ background: COLORS.cream }}>
          <label className="text-xs font-bold block" style={{ color: COLORS.textDark }}>4. PATIENT DETAILS</label>
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
              <span className="font-medium text-sm" style={{ color: COLORS.teal }}>{s.foundPatient.name} ({s.foundPatient.id})</span>
            </div>
          )}
          <Input value={s.patientName} onChange={(e) => s.setPatientName(e.target.value)}
            placeholder="Patient Name"
            className="h-11 rounded-xl border-white/10"
            style={{ background: 'rgba(255,255,255,0.7)', color: '#1E293B' }} />
        </div>
      )}

      {/* Book Button */}
      {s.selectedSlot && s.patientName && s.patientMobile && (
        <Button onClick={() => s.handleBooking('SCHEDULED')} disabled={s.loading}
          className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: COLORS.gold,
            boxShadow: `0 8px 20px ${COLORS.gold}40`
          }}>
          {s.loading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <CalendarPlus className="w-6 h-6 mr-2" />}
          BOOK APPOINTMENT
        </Button>
      )}
    </div>
  );
};

export default StaffBookView;
