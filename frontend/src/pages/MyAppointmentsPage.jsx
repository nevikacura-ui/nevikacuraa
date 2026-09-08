import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, Stethoscope, MapPin, RefreshCw,
  XCircle, RotateCcw, ChevronRight, CheckCircle2, AlertCircle,
  CreditCard, Loader2, X, ChevronLeft, Phone, FileText, Pill, ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { format, addDays, isSunday } from 'date-fns';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// ============ STATUS CONFIG ============
const STATUS_COLORS = {
  Booked: { bg: 'rgba(20,184,166,0.12)', text: '#2DD4BF', border: 'rgba(20,184,166,0.2)', label: 'Booked' },
  pending: { bg: 'rgba(20,184,166,0.12)', text: '#2DD4BF', border: 'rgba(20,184,166,0.2)', label: 'Booked' },
  CheckedIn: { bg: 'rgba(59,130,246,0.12)', text: '#60A5FA', border: 'rgba(59,130,246,0.2)', label: 'Checked In' },
  WithDoctor: { bg: 'rgba(168,85,247,0.12)', text: '#C084FC', border: 'rgba(168,85,247,0.2)', label: 'Consulting' },
  Completed: { bg: 'rgba(34,197,94,0.12)', text: '#4ADE80', border: 'rgba(34,197,94,0.2)', label: 'Completed' },
  Cancelled: { bg: 'rgba(239,68,68,0.12)', text: '#F87171', border: 'rgba(239,68,68,0.2)', label: 'Cancelled' },
};

// ============ CANCEL MODAL ============
const CancelModal = ({ appointment, onClose, onConfirm, cancelling }) => {
  const [reason, setReason] = useState('');
  const reasons = [
    'Schedule conflict',
    'Feeling better',
    'Found another doctor',
    'Personal emergency',
    'Other',
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-t-3xl p-6 pb-8"
        style={{ background: '#0A0A1A', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
        data-testid="cancel-modal"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white text-lg font-bold">Cancel Appointment</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5" data-testid="cancel-modal-close">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p className="text-red-300/80 text-xs">
            {appointment.doctor} - {appointment.date} at {appointment.time}
          </p>
        </div>

        <p className="text-white/60 text-sm mb-3">Why are you cancelling?</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {reasons.map(r => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: reason === r ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${reason === r ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: reason === r ? '#F87171' : 'rgba(255,255,255,0.5)',
              }}
              data-testid={`cancel-reason-${r.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {r}
            </button>
          ))}
        </div>

        <button
          onClick={() => onConfirm(reason)}
          disabled={!reason || cancelling}
          className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: 'white' }}
          data-testid="cancel-confirm-btn"
        >
          {cancelling ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Cancellation'}
        </button>
      </div>
    </div>
  );
};

// ============ RESCHEDULE MODAL ============
const RescheduleModal = ({ appointment, onClose, onConfirm, rescheduling }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [dates, setDates] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [blockedSessions, setBlockedSessions] = useState([]);

  // Fetch doctor's leave/blocked dates & sessions once
  useEffect(() => {
    if (!appointment.doctor) return;
    axios.get(`${API}/doctors/blocked-dates`, { params: { doctor: appointment.doctor } })
      .then(res => {
        setBlockedDates(res.data.blocked_dates || []);
        setBlockedSessions(res.data.blocked_sessions || []);
      })
      .catch(() => { setBlockedDates([]); setBlockedSessions([]); });
  }, [appointment.doctor]);

  const getBlockedDateInfo = (dateStr) => blockedDates.find(b => b.date === dateStr);
  const getBlockedSessionsForDate = (dateStr) => blockedSessions.filter(s => s.date === dateStr);

  // Generate next 7 non-Sunday dates
  useEffect(() => {
    const d = [];
    let day = new Date();
    while (d.length < 7) {
      day = addDays(day, d.length === 0 ? 0 : 1);
      if (!isSunday(day)) {
        d.push({
          value: format(day, 'yyyy-MM-dd'),
          display: format(day, 'EEE, dd MMM'),
          isToday: d.length === 0 && format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
        });
      }
      if (d.length === 0) day = addDays(day, 1);
    }
    setDates(d.slice(0, 7));
  }, []);

  // Fetch booked slots when date changes
  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSelectedTime('');
    axios.get(`${API}/appointments/booked-slots`, {
      params: { doctor: appointment.doctor, clinic: appointment.clinic, date: selectedDate }
    })
      .then(res => setBookedSlots(res.data.booked_slots || []))
      .catch(() => setBookedSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, appointment.doctor, appointment.clinic]);

  // Generate time slots (11:00-14:00, 18:00-22:00)
  const generateSlots = (startH, endH) => {
    const slots = [];
    for (let h = startH; h < endH; h++) {
      for (let m = 0; m < 60; m += 15) {
        const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        slots.push(t);
      }
    }
    return slots;
  };

  const morningSlots = generateSlots(11, 14);
  const eveningSlots = generateSlots(18, 22);

  const formatTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  };

  const isSlotBooked = (t) => bookedSlots.includes(t);

  // Check if slot falls inside a doctor-blocked (leave) session for the selected date
  const isSlotOnLeave = (t) => {
    const sessions = getBlockedSessionsForDate(selectedDate);
    if (sessions.length === 0) return false;
    const [th, tm] = t.split(':').map(Number);
    const tMinutes = th * 60 + tm;
    return sessions.some(s => {
      const [sh, sm] = s.start_time.split(':').map(Number);
      const [eh, em] = s.end_time.split(':').map(Number);
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      return tMinutes >= startMinutes && tMinutes < endMinutes;
    });
  };

  // Check if slot is in the past (for today)
  const isSlotPast = (t) => {
    if (selectedDate !== format(new Date(), 'yyyy-MM-dd')) return false;
    const [h, m] = t.split(':').map(Number);
    const now = new Date();
    const slotTime = new Date();
    slotTime.setHours(h, m, 0, 0);
    // 1 hour buffer
    return slotTime.getTime() <= now.getTime() + 3600000;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto"
        style={{ background: '#0A0A1A', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
        data-testid="reschedule-modal"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-bold">Reschedule</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5" data-testid="reschedule-modal-close">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.15)' }}>
          <p className="text-teal-300/80 text-xs">
            {appointment.doctor} - Currently: {appointment.date} at {appointment.time}
          </p>
        </div>

        {/* Date Selection */}
        <p className="text-white/50 text-xs font-semibold mb-2 uppercase tracking-wider">Pick a Date</p>
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {dates.map(d => {
            const leaveInfo = getBlockedDateInfo(d.value);
            const isOnLeave = !!leaveInfo;
            return (
              <button
                key={d.value}
                onClick={() => !isOnLeave && setSelectedDate(d.value)}
                disabled={isOnLeave}
                className="flex-shrink-0 relative px-3 py-2 rounded-xl text-center transition-all min-w-[80px] disabled:cursor-not-allowed"
                style={{
                  background: isOnLeave ? 'rgba(239,68,68,0.06)' : selectedDate === d.value ? 'rgba(20,184,166,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isOnLeave ? 'rgba(239,68,68,0.25)' : selectedDate === d.value ? 'rgba(20,184,166,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  opacity: isOnLeave ? 0.7 : 1,
                }}
                title={isOnLeave ? `Doctor on leave: ${leaveInfo.reason || 'Leave'}` : undefined}
                data-testid={`reschedule-date-${d.value}`}
              >
                {isOnLeave && (
                  <span
                    className="absolute -top-2 -right-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wide"
                    style={{ background: '#EF4444', color: 'white' }}
                    data-testid={`reschedule-date-leave-badge-${d.value}`}
                  >
                    Leave
                  </span>
                )}
                <p className={`text-xs font-bold ${isOnLeave ? 'text-red-400/70 line-through' : selectedDate === d.value ? 'text-teal-300' : 'text-white/60'}`}>
                  {d.display.split(',')[0]}
                </p>
                <p className={`text-[10px] ${isOnLeave ? 'text-red-400/40' : selectedDate === d.value ? 'text-teal-400/70' : 'text-white/30'}`}>
                  {d.display.split(',')[1]}
                </p>
              </button>
            );
          })}
        </div>

        {/* Partial-day leave notice */}
        {selectedDate && getBlockedSessionsForDate(selectedDate).length > 0 && (
          <div
            className="mb-4 p-2.5 rounded-xl flex items-start gap-2"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            data-testid="reschedule-partial-leave-notice"
          >
            <span className="text-red-400 text-[10px] font-bold uppercase tracking-wide shrink-0 mt-0.5">Leave</span>
            <p className="text-red-300/80 text-xs">
              {appointment.doctor} is unavailable {getBlockedSessionsForDate(selectedDate).map((s, i) => (
                <span key={i}>{formatTime(s.start_time)}-{formatTime(s.end_time)}{s.reason ? ` (${s.reason})` : ''}{i < getBlockedSessionsForDate(selectedDate).length - 1 ? ', ' : ''}</span>
              ))} on this date. Those slots are disabled below.
            </p>
          </div>
        )}

        {/* Time Slots */}
        {selectedDate && (
          <>
            {loadingSlots ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
              </div>
            ) : (
              <>
                <p className="text-white/50 text-xs font-semibold mb-2 uppercase tracking-wider">Morning (11:30 AM - 2 PM)</p>
                <div className="grid grid-cols-4 gap-1.5 mb-4">
                  {morningSlots.map(t => {
                    const booked = isSlotBooked(t);
                    const past = isSlotPast(t);
                    const onLeave = isSlotOnLeave(t);
                    const disabled = booked || past || onLeave;
                    return (
                      <button
                        key={t}
                        disabled={disabled}
                        onClick={() => setSelectedTime(t)}
                        className="py-2 rounded-lg text-[11px] font-medium transition-all disabled:opacity-20"
                        style={{
                          background: onLeave ? 'rgba(239,68,68,0.08)' : selectedTime === t ? 'rgba(20,184,166,0.25)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${onLeave ? 'rgba(239,68,68,0.2)' : selectedTime === t ? 'rgba(20,184,166,0.5)' : 'rgba(255,255,255,0.06)'}`,
                          color: selectedTime === t ? '#2DD4BF' : disabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
                        }}
                        title={onLeave ? 'Doctor on leave' : undefined}
                        data-testid={`slot-${t}`}
                      >
                        {formatTime(t)}
                      </button>
                    );
                  })}
                </div>

                <p className="text-white/50 text-xs font-semibold mb-2 uppercase tracking-wider">Evening (6 PM - 10 PM)</p>
                <div className="grid grid-cols-4 gap-1.5 mb-5">
                  {eveningSlots.map(t => {
                    const booked = isSlotBooked(t);
                    const past = isSlotPast(t);
                    const onLeave = isSlotOnLeave(t);
                    const disabled = booked || past || onLeave;
                    return (
                      <button
                        key={t}
                        disabled={disabled}
                        onClick={() => setSelectedTime(t)}
                        className="py-2 rounded-lg text-[11px] font-medium transition-all disabled:opacity-20"
                        style={{
                          background: onLeave ? 'rgba(239,68,68,0.08)' : selectedTime === t ? 'rgba(20,184,166,0.25)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${onLeave ? 'rgba(239,68,68,0.2)' : selectedTime === t ? 'rgba(20,184,166,0.5)' : 'rgba(255,255,255,0.06)'}`,
                          color: selectedTime === t ? '#2DD4BF' : disabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
                        }}
                        title={onLeave ? 'Doctor on leave' : undefined}
                        data-testid={`slot-${t}`}
                      >
                        {formatTime(t)}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        <button
          onClick={() => onConfirm(selectedDate, selectedTime)}
          disabled={!selectedDate || !selectedTime || rescheduling}
          className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', color: 'white' }}
          data-testid="reschedule-confirm-btn"
        >
          {rescheduling ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Reschedule'}
        </button>
      </div>
    </div>
  );
};

// ============ APPOINTMENT CARD ============
const AppointmentCard = ({ apt, onCancel, onReschedule, onRebook, type = 'active' }) => {
  const sc = STATUS_COLORS[apt.status] || STATUS_COLORS.Booked;

  const formatDisplayTime = (t) => {
    if (!t) return '';
    const clean = t.trim().toUpperCase();
    if (clean.includes('AM') || clean.includes('PM')) return clean;
    const [h, m] = clean.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${dh}:${String(m).padStart(2, '0')} ${period}`;
  };

  const formatDate = (d) => {
    if (!d) return '';
    try {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch { return d; }
  };

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden transition-all"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${sc.border}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
      }}
      data-testid={`appointment-card-${apt.id || apt.booking_id}`}
    >
      {/* Accent orb */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${sc.bg}, transparent 70%)` }} />

      {/* Header */}
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
            <Stethoscope className="w-5 h-5" style={{ color: sc.text }} />
          </div>
          <div>
            <p className="text-white font-bold text-sm">{apt.doctor || 'Doctor'}</p>
            <p className="text-white/40 text-xs">{apt.clinic || 'Clinic'}</p>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-full" style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
          <span className="text-[10px] font-bold" style={{ color: sc.text }}>{sc.label}</span>
        </div>
      </div>

      {/* Details */}
      <div className="flex items-center gap-4 mb-3 relative z-10">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-white/30" />
          <span className="text-white/70 text-xs">{formatDate(apt.date)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-white/30" />
          <span className="text-white/70 text-xs">{formatDisplayTime(apt.time)}</span>
        </div>
        {apt.booking_id && (
          <span className="text-white/25 text-[10px]">#{apt.booking_id}</span>
        )}
      </div>

      {/* Action Buttons */}
      {type === 'active' && apt.status !== 'Cancelled' && (
        <div className="flex gap-2 relative z-10">
          {apt.can_cancel && (
            <button
              onClick={() => onCancel(apt)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}
              data-testid={`cancel-btn-${apt.id || apt.booking_id}`}
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel
            </button>
          )}
          {apt.can_reschedule && (
            <button
              onClick={() => onReschedule(apt)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
              style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)', color: '#2DD4BF' }}
              data-testid={`reschedule-btn-${apt.id || apt.booking_id}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reschedule
            </button>
          )}
          {!apt.can_cancel && apt.status === 'Booked' && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400/70" />
              <span className="text-amber-300/60 text-[10px]">Cancel/Reschedule disabled (within 1 hour)</span>
            </div>
          )}
        </div>
      )}

      {/* Payment Link for Completed */}
      {apt.status === 'Completed' && (
        <div className="flex gap-2 relative z-10">
          {apt.total_amount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-shrink-0" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.1)' }}>
              <CreditCard className="w-3 h-3 text-emerald-400/60" />
              <span className="text-emerald-300/70 text-[11px] font-bold">{apt.total_amount}</span>
            </div>
          )}
          {apt.payment_link && (
            <button
              onClick={() => window.open(apt.payment_link, '_blank')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60A5FA' }}
              data-testid={`pay-link-${apt.id || apt.booking_id}`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Pay Now
            </button>
          )}
          <button
            onClick={() => onRebook(apt)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
            style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)', color: '#2DD4BF' }}
            data-testid={`rebook-btn-${apt.id || apt.booking_id}`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Rebook
          </button>
        </div>
      )}

      {/* Cancellation info + Rebook */}
      {apt.status === 'Cancelled' && (
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}>
            <XCircle className="w-3.5 h-3.5 text-red-400/60" />
            <span className="text-red-300/50 text-[10px]">{apt.cancellation_reason || 'Cancelled'}</span>
          </div>
          <button
            onClick={() => onRebook(apt)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
            style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)', color: '#2DD4BF' }}
            data-testid={`rebook-btn-${apt.id || apt.booking_id}`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Rebook Same Doctor
          </button>
        </div>
      )}
    </div>
  );
};

// ============ PRESCRIPTION / REORDER SECTION ============
const PrescriptionHistory = ({ phone }) => {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [rxFlows, setRxFlows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!phone) { setLoading(false); return; }
    axios.get(`${API}/appointments/prescription-history`, { params: { phone } })
      .then(res => {
        setPrescriptions(res.data.prescriptions || []);
        setRxFlows(res.data.rx_flows || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [phone]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/20" /></div>;

  const hasData = prescriptions.length > 0 || rxFlows.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}>
          <FileText className="w-7 h-7 text-purple-400/40" />
        </div>
        <p className="text-white/50 text-sm font-medium mb-1">No prescriptions yet</p>
        <p className="text-white/25 text-xs mb-4">Your prescription history will appear here after visits</p>
        <button onClick={() => navigate('/express-rx')} className="px-5 py-2.5 rounded-xl text-xs font-bold" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: 'white' }} data-testid="quick-rx-btn">
          Quick Medicine Order
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {prescriptions.map((rx, idx) => (
        <div key={rx.id || idx} className="rounded-2xl p-4 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(168,85,247,0.15)' }} data-testid={`prescription-card-${idx}`}>
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.08), transparent 70%)' }} />
          <div className="flex items-start justify-between mb-2 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <Pill className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">{rx.doctor_name || 'Prescription'}</p>
                <p className="text-white/40 text-xs">{rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
              </div>
            </div>
          </div>
          {rx.medicines && rx.medicines.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3 relative z-10">
              {rx.medicines.slice(0, 4).map((med, mi) => (
                <span key={mi} className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'rgba(168,85,247,0.08)', color: 'rgba(168,85,247,0.7)', border: '1px solid rgba(168,85,247,0.12)' }}>
                  {med.name || med}
                </span>
              ))}
              {rx.medicines.length > 4 && <span className="text-white/25 text-[10px]">+{rx.medicines.length - 4} more</span>}
            </div>
          )}
          <button
            onClick={() => {
              sessionStorage.setItem('reorderPrescription', JSON.stringify(rx));
              navigate('/express-rx');
              toast.info('Reordering medicines from prescription');
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
            style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#C084FC' }}
            data-testid={`reorder-btn-${idx}`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Reorder Medicines
          </button>
        </div>
      ))}

      {rxFlows.map((flow, idx) => (
        <div key={flow.flow_id || idx} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.15)' }} data-testid={`rx-flow-card-${idx}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <ShoppingCart className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Express Rx Order</p>
              <p className="text-white/40 text-xs">{flow.created_at ? new Date(flow.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</p>
            </div>
          </div>
          {flow.symptoms && (
            <p className="text-white/30 text-xs mb-2 truncate">Symptoms: {flow.symptoms}</p>
          )}
          <button
            onClick={() => { navigate('/express-rx'); toast.info('Starting new order based on previous flow'); }}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60A5FA' }}
            data-testid={`reorder-rx-${idx}`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reorder
          </button>
        </div>
      ))}
    </div>
  );
};

// ============ MAIN PAGE ============
const MyAppointmentsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [data, setData] = useState({ active: [], completed: [], cancelled: [] });
  const [cancelTarget, setCancelTarget] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const phone = localStorage.getItem('userPhone') || localStorage.getItem('guestMobile') || '';

  const fetchAppointments = useCallback(async (showToast = false) => {
    if (!phone) { setLoading(false); return; }
    setRefreshing(true);
    try {
      const res = await axios.get(`${API}/appointments/patient-active`, { params: { phone } });
      setData(res.data);
      if (showToast) toast.success('Refreshed');
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    }
    setLoading(false);
    setRefreshing(false);
  }, [phone]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleCancel = async (reason) => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await axios.post(`${API}/appointments/${cancelTarget.id}/patient-cancel`, {
        reason,
        patient_phone: phone,
      });
      toast.success('Appointment cancelled successfully');
      setCancelTarget(null);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel');
    }
    setCancelling(false);
  };

  const handleReschedule = async (newDate, newTime) => {
    if (!rescheduleTarget) return;
    setRescheduling(true);
    try {
      await axios.post(`${API}/appointments/${rescheduleTarget.id}/reschedule`, {
        patient_phone: phone,
        new_date: newDate,
        new_time: newTime,
      });
      toast.success('Appointment rescheduled successfully!');
      setRescheduleTarget(null);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reschedule');
    }
    setRescheduling(false);
  };

  // One-tap rebook: navigate to DiaGyn booking with pre-filled doctor info
  const handleRebook = (apt) => {
    // Store rebook info in sessionStorage so the booking page can pre-fill
    sessionStorage.setItem('rebookInfo', JSON.stringify({
      doctor: apt.doctor,
      clinic: apt.clinic,
      patient_name: apt.patient_name,
      patient_phone: apt.patient_phone,
    }));
    navigate('/diagyn');
    toast.info(`Rebooking with ${apt.doctor}`);
  };

  const tabs = [
    { key: 'active', label: 'Active', count: data.active?.length || 0 },
    { key: 'completed', label: 'Completed', count: data.completed?.length || 0 },
    { key: 'cancelled', label: 'Cancelled', count: data.cancelled?.length || 0 },
    { key: 'prescriptions', label: 'Rx History', count: 0 },
  ];

  const currentList = data[activeTab] || [];

  return (
    <div className="dark-page min-h-screen pb-24" style={{ background: '#050510' }} data-testid="my-appointments-page">
      {/* Ambient BG */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[300px] h-[300px] rounded-full blur-[120px] opacity-[0.06]" style={{ background: '#14b8a6', top: '-8%', right: '-12%' }} />
        <div className="absolute w-[200px] h-[200px] rounded-full blur-[80px] opacity-[0.04]" style={{ background: '#8b5cf6', bottom: '15%', left: '-8%' }} />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 px-4 pt-4 pb-3" style={{ background: 'rgba(5,5,16,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} data-testid="appointments-back-btn">
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>My Appointments</h1>
            <p className="text-[10px] text-white/25">{data.total_active || 0} active</p>
          </div>
          <button onClick={() => navigate('/diagyn')} className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.25)', color: '#2DD4BF' }} data-testid="book-new-btn">
            + Book New
          </button>
          <button onClick={() => fetchAppointments(true)} disabled={refreshing} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} data-testid="appointments-refresh-btn">
            <RefreshCw className={`w-4 h-4 text-white/40 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all relative"
              style={{
                background: activeTab === tab.key ? 'rgba(20,184,166,0.15)' : 'transparent',
                color: activeTab === tab.key ? '#2DD4BF' : 'rgba(255,255,255,0.35)',
              }}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{
                  background: activeTab === tab.key ? 'rgba(20,184,166,0.3)' : 'rgba(255,255,255,0.08)',
                  color: activeTab === tab.key ? '#2DD4BF' : 'rgba(255,255,255,0.3)',
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 pt-2">
        {activeTab === 'prescriptions' ? (
          <PrescriptionHistory phone={phone} />
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-white/20" />
          </div>
        ) : !phone ? (
          <div className="text-center py-16">
            <Phone className="w-10 h-10 text-white/15 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Please log in to view your appointments</p>
            <button onClick={() => navigate('/login')} className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'rgba(20,184,166,0.15)', color: '#2DD4BF' }} data-testid="login-prompt-btn">
              Log In
            </button>
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.15)' }}>
              {activeTab === 'active' ? <Calendar className="w-7 h-7 text-teal-400/40" /> :
               activeTab === 'completed' ? <CheckCircle2 className="w-7 h-7 text-emerald-400/40" /> :
               <XCircle className="w-7 h-7 text-red-400/40" />}
            </div>
            <p className="text-white/50 text-sm font-medium mb-1">
              {activeTab === 'active' ? 'No active appointments' :
               activeTab === 'completed' ? 'No recent completed appointments' :
               'No cancelled appointments'}
            </p>
            <p className="text-white/25 text-xs mb-4">
              {activeTab === 'active' ? 'Book a consultation to get started' : 'Your recent history will appear here'}
            </p>
            {activeTab === 'active' && (
              <button onClick={() => navigate('/diagyn')} className="px-5 py-2.5 rounded-xl text-xs font-bold" style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', color: 'white' }} data-testid="book-appointment-empty-btn">
                Book Appointment
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {currentList.map((apt, idx) => (
              <AppointmentCard
                key={apt.id || apt.booking_id || idx}
                apt={apt}
                type={activeTab}
                onCancel={setCancelTarget}
                onReschedule={setRescheduleTarget}
                onRebook={handleRebook}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {cancelTarget && (
        <CancelModal
          appointment={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleCancel}
          cancelling={cancelling}
        />
      )}
      {rescheduleTarget && (
        <RescheduleModal
          appointment={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onConfirm={handleReschedule}
          rescheduling={rescheduling}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default MyAppointmentsPage;
