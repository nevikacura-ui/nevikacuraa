import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { STATUS_STYLES } from './staffConstants';
import {
  Clock, Stethoscope, Phone, Calendar, ChevronRight, ChevronDown, XCircle,
  Printer, Star, CheckCircle2, AlertTriangle, Globe, MessageCircle, Users, Zap, Timer, IndianRupee
} from 'lucide-react';
import { mediumTap, heavyTap } from '@/utils/haptics';

// Uniform teal base for ALL cards — only the MODE LABEL is color-coded
const CARD_BASE = {
  gradient: 'linear-gradient(135deg, #0D9488 0%, #0F766E 50%, #115E59 100%)',
  badgeBg: 'rgba(255,255,255,0.18)',
};

const MODE_THEMES = {
  EMERGENCY: {
    label: 'Emergency', icon: Zap,
    labelGradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
    labelText: '#FFFFFF',
    textColor: '#DC2626', lightBg: '#FEF2F2', borderColor: '#FECACA',
  },
  WALK_IN: {
    label: 'Walk-in', icon: Users,
    labelGradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
    labelText: '#FFFFFF',
    textColor: '#2563EB', lightBg: '#EFF6FF', borderColor: '#BFDBFE',
  },
  WHATSAPP: {
    label: 'WhatsApp', icon: MessageCircle,
    labelGradient: 'linear-gradient(135deg, #166534, #14532D)',
    labelText: '#FFFFFF',
    textColor: '#166534', lightBg: '#F0FDF4', borderColor: '#BBF7D0',
  },
  WEBSITE: {
    label: 'Website', icon: Globe,
    labelGradient: 'linear-gradient(135deg, #F97316, #EA580C)',
    labelText: '#FFFFFF',
    textColor: '#EA580C', lightBg: '#FFF7ED', borderColor: '#FED7AA',
  },
};

const getMode = (apt) => {
  if (apt.appointment_type === 'EMERGENCY') return MODE_THEMES.EMERGENCY;
  if (apt.appointment_type === 'WALK_IN') return MODE_THEMES.WALK_IN;
  if (apt.source === 'WhatsApp') return MODE_THEMES.WHATSAPP;
  return MODE_THEMES.WEBSITE;
};

const WaitBadge = ({ since }) => {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = Date.now() - new Date(since).getTime();
      const mins = Math.floor(Math.max(0, diff) / 60000);
      if (mins < 60) setElapsed(`${mins}m`);
      else setElapsed(`${Math.floor(mins / 60)}h ${mins % 60}m`);
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [since]);
  return (
    <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg w-fit" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}>
      <Timer className="w-3.5 h-3.5 text-white/70" />
      <span className="text-white text-xs font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>Waiting {elapsed}</span>
    </div>
  );
};

const AppointmentCard = ({ apt, onCheckIn, onWithDoctor, onCloseBilling, onCancel, onReprint, onPrintBill, onSendReview, onAddCharges, printerConnected, animDelay = 0, isNew = false, statusChanged = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const status = STATUS_STYLES[apt.status] || STATUS_STYLES['Booked'];
  const mode = getMode(apt);
  const ModeIcon = mode.icon;

  // Status change ripple effect (#10)
  useEffect(() => {
    if (statusChanged) {
      setShowRipple(true);
      const timer = setTimeout(() => setShowRipple(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [statusChanged, apt.status]);

  const getAction = () => {
    switch (apt.status) {
      case 'Booked': return { label: 'CHECK IN', action: onCheckIn };
      case 'CheckedIn': return { label: 'WITH DOCTOR', action: onWithDoctor };
      case 'WithDoctor': return { label: 'CLOSE CONSULTATION', action: onCloseBilling };
      default: return null;
    }
  };
  const action = getAction();
  const bookingCode = apt.booking_id?.split('-').pop() || '—';
  const dateDisplay = (() => {
    try { return new Date(apt.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return apt.date; }
  })();

  return (
    <>
      <style>{`@keyframes staffCardEntry { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } } .staff-card-anim { animation: staffCardEntry 0.35s cubic-bezier(0.22,1,0.36,1) both; }`}</style>
      <div className={`rounded-2xl overflow-hidden transition-all staff-card-anim ${isNew ? 'appointment-new' : ''} ${showRipple ? 'status-changed' : ''}`} style={{ fontFamily: "'DM Sans', sans-serif", boxShadow: '0 4px 24px rgba(0,0,0,0.1)', animationDelay: `${animDelay}ms` }}
      data-testid={`apt-card-${apt.booking_id}`}>

      {/* === UNIFORM TEAL CARD BODY === */}
      <div className="p-4 relative overflow-hidden" style={{ background: CARD_BASE.gradient }}>
        {/* Decorative */}
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="absolute -bottom-10 -left-6 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />

        {/* Row 1: Token + Mode Label + Expand Arrow */}
        <div className="flex items-center justify-between mb-2.5 relative">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black px-2.5 py-1 rounded-lg text-white"
              style={{ background: CARD_BASE.badgeBg, textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
              TOKEN {apt.token_number || '—'}
            </span>
            {/* Color-coded MODE LABEL */}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1"
              style={{ background: mode.labelGradient, color: mode.labelText, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
              data-testid={`mode-label-${apt.booking_id}`}>
              <ModeIcon className="w-3 h-3" />
              {mode.label}
            </span>
          </div>
          {/* Expand arrow — top right, away from action */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,0.15)' }}
            data-testid={`expand-btn-${apt.booking_id}`}>
            <ChevronDown className={`w-4 h-4 text-white/70 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Patient Name */}
        <h3 className="text-white text-xl leading-tight mb-1 relative" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800 }}>
          {apt.patient_name}
        </h3>

        {/* Doctor + Code */}
        <div className="flex items-center gap-2">
          <p className="text-white/70 text-sm font-medium flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-white/45" />
            {apt.doctor}
          </p>
          <span className="text-white/40 text-[10px] font-mono font-bold tracking-wide">#{bookingCode}</span>
        </div>

        {/* Wait Timer */}
        {apt.status === 'CheckedIn' && apt.checked_in_at && (
          <WaitBadge since={apt.checked_in_at} />
        )}

        {/* Patient Flow Timeline — Item 9 */}
        <div className="mt-3 mb-1 flex items-center gap-0" data-testid={`flow-timeline-${apt.booking_id}`}>
          {[
            { key: 'Booked', label: 'Booked', active: true },
            { key: 'CheckedIn', label: 'Checked In', active: ['CheckedIn','WithDoctor','billing_pending','Completed'].includes(apt.status) },
            { key: 'WithDoctor', label: 'With Dr', active: ['WithDoctor','billing_pending','Completed'].includes(apt.status) },
            { key: 'billing_pending', label: 'Billing', active: ['billing_pending','Completed'].includes(apt.status) },
            { key: 'Completed', label: 'Done', active: apt.status === 'Completed' },
          ].map((step, i, arr) => {
            const isCurrent = step.key === apt.status;
            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center" style={{ minWidth: 36 }}>
                  <div
                    className={`w-3 h-3 rounded-full flex items-center justify-center transition-all ${isCurrent ? 'ring-2 ring-white/30 ring-offset-1 ring-offset-transparent' : ''}`}
                    style={{
                      background: step.active
                        ? isCurrent ? '#FDE68A' : 'rgba(255,255,255,0.7)'
                        : 'rgba(255,255,255,0.15)',
                      boxShadow: isCurrent ? '0 0 8px rgba(253,230,138,0.6)' : 'none',
                    }}
                  >
                    {step.active && !isCurrent && <CheckCircle2 className="w-2 h-2 text-teal-900" />}
                  </div>
                  <span className="text-[7px] mt-0.5 font-semibold" style={{ color: step.active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)' }}>{step.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex-1 h-[2px] mt-[-10px] mx-0.5 rounded-full" style={{
                    background: arr[i + 1].active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)',
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Status Badge */}
        <div className="mt-3 mb-1">
          <span className="text-[11px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider text-white inline-block"
            style={{ background: CARD_BASE.badgeBg, textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}
            data-testid={`status-badge-${apt.booking_id}`}>
            {status.label}
          </span>
          {apt.total_amount > 0 && ['billing_pending', 'Billing Pending', 'Completed'].includes(apt.status) && (
            <span className="text-white/90 text-sm ml-3" style={{ fontWeight: 700 }}>&#8377;{apt.total_amount}</span>
          )}
        </div>

        {/* === ACTION BUTTON — full width, prominent, at bottom === */}
        {action && (
          <div className="flex items-center gap-2 mt-3">
            {/* Doctor "Add Charges" button when WithDoctor */}
            {apt.status === 'WithDoctor' && onAddCharges && (
              <button
                onClick={(e) => { e.stopPropagation(); mediumTap(); onAddCharges(apt); }}
                className="py-3.5 px-3 rounded-xl text-xs font-extrabold transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
                style={{ background: apt.doctor_charges_set ? 'rgba(34,197,94,0.3)' : 'rgba(139,92,246,0.3)', backdropFilter: 'blur(10px)', color: '#fff' }}
                data-testid={`add-charges-btn-${apt.booking_id}`}>
                {apt.doctor_charges_set ? <CheckCircle2 className="w-4 h-4" /> : <IndianRupee className="w-4 h-4" />}
                {apt.doctor_charges_set ? 'EDIT' : 'FEES'}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); heavyTap(); action.action(); }}
              className="flex-1 py-3.5 rounded-xl text-sm font-extrabold transition-all active:scale-[0.97] flex items-center justify-center gap-2"
              style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)', color: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', letterSpacing: '0.05em' }}
              data-testid={`action-btn-${apt.booking_id}`}>
              {action.label}
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); mediumTap(); setShowCancelConfirm(true); }}
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{ background: 'rgba(239,68,68,0.2)', backdropFilter: 'blur(6px)' }}
              data-testid={`cancel-card-btn-${apt.booking_id}`}>
              <XCircle className="w-5 h-5 text-red-300" />
            </button>
          </div>
        )}

        {/* Post-completion buttons */}
        {apt.status === 'Completed' && (
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => { mediumTap(); onPrintBill(apt); }}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', backdropFilter: 'blur(6px)' }}
              data-testid={`invoice-btn-${apt.booking_id}`}>
              <Printer className="w-3.5 h-3.5" /> INVOICE
            </button>
            {!apt.review_request_sent && (apt.patient_phone || apt.mobile) && (
              <button onClick={() => { mediumTap(); onSendReview(apt); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', backdropFilter: 'blur(6px)' }}
                data-testid={`send-review-btn-${apt.booking_id}`}>
                <Star className="w-3.5 h-3.5" /> REVIEW
              </button>
            )}
            {apt.review_request_sent && (
              <span className="flex items-center gap-1 text-white/50 text-xs"><CheckCircle2 className="w-3 h-3" /> Sent</span>
            )}
          </div>
        )}

        {apt.status === 'billing_pending' && (
          <button onClick={() => { mediumTap(); onPrintBill(apt); }}
            className="w-full mt-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', backdropFilter: 'blur(6px)' }}
            data-testid={`invoice-btn-${apt.booking_id}`}>
            <Printer className="w-3.5 h-3.5" /> INVOICE
          </button>
        )}
      </div>

      {/* === EXPANDED DETAILS === */}
      {expanded && (
        <div className="px-4 py-4 space-y-3.5 bg-white" style={{ borderTop: `2px solid ${mode.borderColor}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: mode.lightBg }}>
              <ModeIcon className="w-4 h-4" style={{ color: mode.textColor }} />
            </div>
            <div>
              <p className="text-[11px] text-stone-400 font-medium">Mode of Booking</p>
              <p className="text-sm font-bold" style={{ color: mode.textColor }}>{mode.label}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50">
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] text-stone-400 font-medium">Appointment</p>
              <p className="text-sm font-bold text-stone-700">{dateDisplay} · {apt.time || 'No slot'}</p>
            </div>
          </div>

          {apt.created_at && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] text-stone-400 font-medium">Booked At</p>
                <p className="text-sm font-bold text-stone-700">
                  {new Date(apt.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                </p>
              </div>
            </div>
          )}

          {(apt.patient_phone || apt.mobile || apt.phone) && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50">
                <Phone className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] text-stone-400 font-medium">Mobile Number</p>
                <a href={`tel:${apt.patient_phone || apt.mobile || apt.phone}`}
                  className="text-sm font-bold no-underline" style={{ color: mode.textColor }}
                  data-testid={`phone-link-${apt.booking_id}`}>
                  {apt.patient_phone || apt.mobile || apt.phone}
                </a>
              </div>
            </div>
          )}

          {apt.follow_up_date && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-50">
                <Calendar className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <p className="text-[11px] text-stone-400 font-medium">Follow-up</p>
                <p className="text-sm font-bold text-teal-700">
                  {new Date(apt.follow_up_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
          )}

          {apt.token_number && apt.status !== 'Completed' && printerConnected && (
            <button onClick={() => { mediumTap(); onReprint(apt); }}
              className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
              style={{ background: '#F0FDFA', color: '#0D9488', border: '1px solid #99F6E4' }}>
              <Printer className="w-3.5 h-3.5" /> Reprint Token
            </button>
          )}

          {['Booked', 'pending', 'CheckedIn'].includes(apt.status) && (
            <button onClick={() => { mediumTap(); setShowCancelConfirm(true); }}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-red-500 bg-red-50 border border-red-100 transition-all active:scale-[0.97]"
              data-testid={`cancel-apt-btn-${apt.booking_id}`}>
              Cancel Appointment
            </button>
          )}
        </div>
      )}

      {/* Cancel Confirmation */}
      {showCancelConfirm && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" data-testid={`cancel-confirm-${apt.booking_id}`}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden" style={{ animation: 'cardPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <div className="p-5 text-center" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
              <AlertTriangle className="w-10 h-10 text-white mx-auto mb-2" />
              <p className="text-white font-bold text-lg" style={{ fontFamily: "'Outfit', sans-serif" }}>Cancel Appointment?</p>
            </div>
            <div className="bg-white p-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <div className="text-center mb-4">
                <p className="text-stone-800 font-bold">{apt.patient_name}</p>
                <p className="text-stone-400 text-sm">#{apt.booking_id} · {apt.doctor}</p>
                <p className="text-stone-400 text-xs mt-1">{apt.date} · {apt.time || 'No slot'}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-stone-500 bg-stone-100 transition-all active:scale-95"
                  data-testid={`cancel-dismiss-${apt.booking_id}`}>Keep</button>
                <button onClick={() => { setShowCancelConfirm(false); onCancel(); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
                  data-testid={`cancel-confirm-btn-${apt.booking_id}`}>Yes, Cancel</button>
              </div>
            </div>
          </div>
          <style>{`@keyframes cardPop { 0% { opacity:0; transform:scale(0.85) translateY(20px); } 100% { opacity:1; transform:scale(1) translateY(0); } }`}</style>
        </div>,
        document.body
      )}
    </div>
    </>
  );
};

export default AppointmentCard;
