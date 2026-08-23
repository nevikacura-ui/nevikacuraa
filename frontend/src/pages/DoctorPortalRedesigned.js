import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  User, LogOut, Phone, Calendar, Clock, 
  CheckCircle2, Stethoscope, IndianRupee, RefreshCw,
  ChevronRight, ChevronLeft, ChevronDown, Loader2, X, CalendarOff,
  Home, CalendarDays, UserCircle, Radio, Star, MapPin, MessageCircle, Volume2,
  AlertTriangle, Timer, BarChart3, Mic, ArrowLeftRight, FileText
} from 'lucide-react';
import { lightTap, mediumTap, heavyTap, successPattern, errorPattern, selectionTap } from '@/utils/haptics';
import DoctorLeaveManager from '@/components/DoctorLeaveManager';
import ClinicOverrideManager from '@/components/ClinicOverrideManager';
import TokenAnnouncer from '@/components/TokenAnnouncer';
import BillingTimerPanel from '@/components/BillingTimerPanel';
import LiveWaitTimer from '@/components/LiveWaitTimer';
import QueueInsightsWidget from '@/components/QueueInsightsWidget';
import LongWaitAlert from '@/components/LongWaitAlert';
import PortalErrorBoundary from '@/components/PortalErrorBoundary';
import { useAppointmentWebSocket } from '@/hooks/useAppointmentWebSocket';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const API = process.env.REACT_APP_BACKEND_URL;

// ============ DOCTOR DATA (from DiaGyn) ============
const DOCTOR_DATA = {
  'dr_vikas': {
    name: 'Dr. Vikas Jha',
    displayName: 'Vikas Jha',
    specialty: 'Diabetologist',
    image: 'https://customer-assets.emergentagent.com/job_1d0b9312-d1f2-40d1-b78f-c0c28fa95ba1/artifacts/gg2swmlp_IMG-20220627-WA0003.jpg',
    rating: 4.9,
    experience: '15 Years',
    patients: '10,000+',
  },
  'dr_neha': {
    name: 'Dr. Neha Patel',
    displayName: 'Neha Patel',
    specialty: 'OBGYN',
    image: 'https://customer-assets.emergentagent.com/job_healthhelper-7/artifacts/u05fho69_IMG-20260126-WA0000.jpg',
    rating: 4.8,
    experience: '12 Years',
    patients: '8,000+',
  }
};

// ============ DOCTOR-SPECIFIC THEMES (from DiaGyn) ============
const DOCTOR_THEMES = {
  'dr_vikas': {
    pageBg: '#F0F4F3',
    headerBg: 'linear-gradient(160deg, #8BC34A 0%, #A6FF4D 50%, #9AE83A 100%)',
    headerText: '#0D1F1E',
    headerTextMuted: 'rgba(13,31,30,0.6)',
    accent: '#A6FF4D',
    accentDark: '#0D1F1E',
    cardBg: '#0D1F1E',
    cardBorder: '#163332',
    cardText: '#FFFFFF',
    cardTextMuted: 'rgba(255,255,255,0.55)',
    ctaGradient: 'linear-gradient(135deg, #A6FF4D, #8AE030)',
    ctaText: '#0D1F1E',
    tabActiveBg: '#A6FF4D',
    tabActiveText: '#0D1F1E',
    statBg: 'rgba(0,0,0,0.12)',
    statText: '#0D1F1E',
    selectedBg: '#A6FF4D',
    selectedText: '#0D1F1E',
    neonGlow: 'rgba(166,255,77,0.2)',
    iconColor: '#A6FF4D',
    badgeBg: 'rgba(166,255,77,0.15)',
    badgeText: '#A6FF4D',
    divider: 'rgba(255,255,255,0.08)',
    surfaceCard: '#FFFFFF',
    surfaceBorder: '#E2E8F0',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
  },
  'dr_neha': {
    pageBg: '#F5F3F4',
    headerBg: 'linear-gradient(160deg, #F9A8D4 0%, #FFB0C8 50%, #FBCFE8 100%)',
    headerText: '#831843',
    headerTextMuted: 'rgba(131,24,67,0.6)',
    accent: '#EC4899',
    accentDark: '#1A0A1A',
    cardBg: '#1A0A1A',
    cardBorder: '#2D1B2E',
    cardText: '#FFFFFF',
    cardTextMuted: 'rgba(255,255,255,0.55)',
    ctaGradient: 'linear-gradient(135deg, #EC4899, #DB2777)',
    ctaText: '#FFFFFF',
    tabActiveBg: '#EC4899',
    tabActiveText: '#FFFFFF',
    statBg: 'rgba(0,0,0,0.1)',
    statText: '#831843',
    selectedBg: '#EC4899',
    selectedText: '#FFFFFF',
    neonGlow: 'rgba(236,72,153,0.2)',
    iconColor: '#EC4899',
    badgeBg: 'rgba(236,72,153,0.15)',
    badgeText: '#EC4899',
    divider: 'rgba(255,255,255,0.08)',
    surfaceCard: '#FFFFFF',
    surfaceBorder: '#E2E8F0',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
  },
};

const STATUS_STYLES = {
  'Booked': { bg: 'rgba(37,99,235,0.15)', text: '#3B82F6', label: 'BOOKED', border: 'rgba(37,99,235,0.25)' },
  'CheckedIn': { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', label: 'WAITING', border: 'rgba(245,158,11,0.25)' },
  'WithDoctor': { bg: 'rgba(139,92,246,0.15)', text: '#A78BFA', label: 'IN CONSULT', border: 'rgba(139,92,246,0.25)' },
  'billing_pending': { bg: 'rgba(249,115,22,0.15)', text: '#F97316', label: 'BILLING', border: 'rgba(249,115,22,0.25)' },
  'Completed': { bg: 'rgba(34,197,94,0.15)', text: '#22C55E', label: 'DONE', border: 'rgba(34,197,94,0.25)' },
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('doctorToken');
  return { headers: { Authorization: `Bearer ${token}` } };
};

const getIndianDate = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
};

// Get week dates centered on selected date
const getWeekDates = (centerDate) => {
  const center = new Date(centerDate);
  const dates = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(center);
    d.setDate(center.getDate() + i);
    dates.push({
      date: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: d.toISOString().split('T')[0] === getIndianDate()
    });
  }
  return dates;
};

// ============ APPOINTMENT CARD ============
const AppointmentCard = ({ apt, onComplete, onBilling, onUploadPrescription, onCancel, T, profile }) => {
  const style = STATUS_STYLES[apt.status] || STATUS_STYLES['Booked'];
  const isWaiting = apt.status === 'CheckedIn';
  const isInConsult = apt.status === 'WithDoctor';
  const isCompleted = apt.status === 'Completed';
  const isOnlineConsultation = apt.clinic?.toLowerCase().includes('online') || apt.booking_type === 'online_consultation';
  const isPaid = apt.payment_method === 'cashfree' || apt.cashfree_order_id;
  const [expanded, setExpanded] = React.useState(isWaiting || isInConsult);

  // Source badge
  const source = apt.appointment_type === 'WALK_IN' ? 'Walk-in' 
    : apt.appointment_type === 'EMERGENCY' ? 'Emergency'
    : apt.booking_source === 'website' ? 'Website' : 'Booked';
  const sourceBg = apt.appointment_type === 'WALK_IN' ? '#F59E0B' 
    : apt.appointment_type === 'EMERGENCY' ? '#EF4444'
    : '#22C55E';

  return (
    <div 
      className={`rounded-2xl mb-3 overflow-hidden transition-all dr-card-anim ${isInConsult ? 'dr-pulse-consult' : ''} ${isWaiting ? 'dr-wait-pulse' : ''}`}
      style={{ 
        background: `linear-gradient(145deg, ${T.cardBg} 0%, ${T.cardBorder} 100%)`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      {/* Card Header — Token + Source + Status + Expand */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold" 
            style={{ background: T.accent, color: T.accentDark }}>
            TOKEN {apt.token_number || '—'}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white flex items-center gap-1"
            style={{ background: sourceBg }}>
            {source === 'Website' && <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />}
            {source}
          </span>
          {isOnlineConsultation && (
            <span className="px-2 py-1 rounded-lg text-[10px] font-bold text-blue-300" style={{ background: 'rgba(59,130,246,0.2)' }}>
              VIDEO
            </span>
          )}
          {isPaid && (
            <span className="px-2 py-1 rounded-lg text-[10px] font-bold text-green-300" style={{ background: 'rgba(34,197,94,0.2)' }}>
              PAID
            </span>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} style={{ color: T.cardTextMuted }} />
      </div>

      {/* Patient Name — Large, Bold */}
      <div className="px-4 pb-2">
        <h3 className="text-xl font-black text-white leading-tight">{apt.patient_name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <Stethoscope className="w-3.5 h-3.5" style={{ color: T.accent }} />
          <span className="text-sm" style={{ color: T.accent }}>{apt.doctor || profile?.name || 'Doctor'}</span>
          {apt.patient_id && <span className="text-sm" style={{ color: T.cardTextMuted }}>#{apt.patient_id}</span>}
        </div>
      </div>

      {/* Status Badge Row */}
      <div className="px-4 pb-3">
        <span className="px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider" 
          style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
          {style.label}
        </span>
        {apt.checked_in_at && (
          <span className="ml-2 text-[10px]" style={{ color: T.cardTextMuted }}>
            Arrived {(() => {
              const raw = apt.checked_in_at.replace(/[+-]\d{2}:\d{2}$/, '').replace('Z', '');
              const d = new Date(raw);
              const h = d.getHours(), m = d.getMinutes();
              return `${((h % 12) || 12).toString().padStart(2,'0')}:${m.toString().padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
            })()}
          </span>
        )}
        {apt.status === 'CheckedIn' && apt.checked_in_at && (
          <span className="ml-1"><LiveWaitTimer since={apt.checked_in_at} compact /></span>
        )}
      </div>

      {/* Expanded Content — Full Patient Details */}
      {expanded && (
        <div className="px-4 pb-3" style={{ borderTop: `1px solid ${T.divider}` }}>
          <div className="pt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            <div>
              <span style={{ color: T.cardTextMuted }} className="text-[10px] uppercase tracking-wider font-semibold">Phone</span>
              <p className="text-white font-medium">{apt.patient_phone || '—'}</p>
            </div>
            <div>
              <span style={{ color: T.cardTextMuted }} className="text-[10px] uppercase tracking-wider font-semibold">Time</span>
              <p className="text-white font-medium">{apt.time || '—'}</p>
            </div>
            <div>
              <span style={{ color: T.cardTextMuted }} className="text-[10px] uppercase tracking-wider font-semibold">Doctor</span>
              <p className="text-white font-medium">{apt.doctor || '—'}</p>
            </div>
            <div>
              <span style={{ color: T.cardTextMuted }} className="text-[10px] uppercase tracking-wider font-semibold">Clinic</span>
              <p className="text-white font-medium">{apt.clinic || '—'}</p>
            </div>
            <div>
              <span style={{ color: T.cardTextMuted }} className="text-[10px] uppercase tracking-wider font-semibold">Booking ID</span>
              <p className="text-white font-medium text-xs" style={{ fontFamily: "'Courier New', monospace" }}>{apt.booking_id || apt.id || '—'}</p>
            </div>
            <div>
              <span style={{ color: T.cardTextMuted }} className="text-[10px] uppercase tracking-wider font-semibold">Date</span>
              <p className="text-white font-medium">{apt.date || '—'}</p>
            </div>
            {apt.session && (
              <div>
                <span style={{ color: T.cardTextMuted }} className="text-[10px] uppercase tracking-wider font-semibold">Session</span>
                <p className="text-white font-medium">{apt.session}</p>
              </div>
            )}
            {apt.patient_age && (
              <div>
                <span style={{ color: T.cardTextMuted }} className="text-[10px] uppercase tracking-wider font-semibold">Age</span>
                <p className="text-white font-medium">{apt.patient_age} yrs</p>
              </div>
            )}
            <div>
              <span style={{ color: T.cardTextMuted }} className="text-[10px] uppercase tracking-wider font-semibold">Source</span>
              <p className="text-white font-medium">{apt.booking_source === 'website' ? 'Website' : apt.appointment_type === 'WALK_IN' ? 'Walk-in' : apt.appointment_type === 'EMERGENCY' ? 'Emergency' : apt.booking_source || 'Booked'}</p>
            </div>
            <div>
              <span style={{ color: T.cardTextMuted }} className="text-[10px] uppercase tracking-wider font-semibold">Payment</span>
              <p className="font-medium" style={{ color: (apt.payment_method === 'cashfree' || apt.cashfree_order_id) ? '#22C55E' : T.cardText }}>
                {apt.payment_method === 'cashfree' ? 'Paid Online' : apt.payment_method === 'cash' ? 'Cash' : apt.payment_method === 'invoice' ? 'Invoice' : apt.payment_method || '—'}
              </p>
            </div>
            {(apt.total_amount > 0 || apt.total_fee > 0 || apt.fee > 0) && (
              <div>
                <span style={{ color: T.cardTextMuted }} className="text-[10px] uppercase tracking-wider font-semibold">Fees Collected</span>
                <p className="font-bold" style={{ color: T.accent }}>₹{apt.total_amount || apt.total_fee || apt.fee || 0}</p>
              </div>
            )}
            {apt.fee_code && (
              <div>
                <span style={{ color: T.cardTextMuted }} className="text-[10px] uppercase tracking-wider font-semibold">Fee Code</span>
                <p className="text-white font-medium">{apt.fee_code}</p>
              </div>
            )}
            {apt.chief_complaint && (
              <div className="col-span-2">
                <span style={{ color: T.cardTextMuted }} className="text-[10px] uppercase tracking-wider font-semibold">Chief Complaint</span>
                <p className="text-white font-medium">{apt.chief_complaint}</p>
              </div>
            )}
            {apt.notes && (
              <div className="col-span-2">
                <span style={{ color: T.cardTextMuted }} className="text-[10px] uppercase tracking-wider font-semibold">Notes</span>
                <p className="text-white font-medium">{apt.notes}</p>
              </div>
            )}
            {apt.patient_email && (
              <div className="col-span-2">
                <span style={{ color: T.cardTextMuted }} className="text-[10px] uppercase tracking-wider font-semibold">Email</span>
                <p className="text-white font-medium text-xs">{apt.patient_email}</p>
              </div>
            )}
          </div>

          {/* Cancel button for Booked / CheckedIn */}
          {(apt.status === 'Booked' || apt.status === 'CheckedIn') && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(apt); }}
              className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}
              data-testid="cancel-appointment-btn"
            >
              <X className="w-3.5 h-3.5" />
              CANCEL APPOINTMENT
            </button>
          )}
        </div>
      )}

      {/* Action CTA — Full width gradient button (like staff portal) */}
      {(isWaiting || isInConsult) && (
        <div className="px-4 pb-4 flex items-center gap-2">
          <button 
            onClick={() => onComplete(apt)}
            className="flex-1 py-3 rounded-xl text-sm font-extrabold tracking-wider flex items-center justify-center gap-2"
            style={{ background: T.ctaGradient, color: T.ctaText }}
            data-testid="complete-consultation-btn"
          >
            {isInConsult ? 'CLOSE CONSULTATION' : 'START CONSULTATION'}
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </button>
          {isInConsult && isOnlineConsultation && (
            <button 
              onClick={() => window.location.href = `/doctor-portal/emr/${apt.booking_id || apt.id}`}
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(13,148,136,0.2)', border: '1px solid rgba(13,148,136,0.3)' }}
            >
              <FileText className="w-5 h-5 text-teal-400" />
            </button>
          )}
        </div>
      )}

      {/* Completed actions */}
      {isCompleted && (
        <div className="px-4 pb-4 flex items-center gap-2">
          {apt.fee_code && !isOnlineConsultation && (
            <button 
              onClick={() => onBilling(apt)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              VIEW BILL
            </button>
          )}
          {isOnlineConsultation && (
            <>
              <button 
                onClick={() => window.location.href = `/doctor-portal/emr/${apt.booking_id || apt.id}`}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                style={{ background: 'rgba(13,148,136,0.15)', color: '#14B8A6', border: '1px solid rgba(13,148,136,0.2)' }}
              >
                VIEW EMR
              </button>
              <button 
                onClick={() => onUploadPrescription(apt)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                UPLOAD RX
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ============ MAIN COMPONENT ============
const DoctorPortalRedesigned = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false); // Track if auth check is done
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(getIndianDate());
  const [selectedClinic, setSelectedClinic] = useState('all'); // Clinic filter
  const [appointments, setAppointments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [config, setConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  
  // Completion modal
  const [showModal, setShowModal] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);
  const [feeCode, setFeeCode] = useState('');
  const [scanCodes, setScanCodes] = useState([]);
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [customTotal, setCustomTotal] = useState('');
  const [sendReceiptWhatsApp, setSendReceiptWhatsApp] = useState(true);
  
  // Prescription Upload Modal
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionApt, setPrescriptionApt] = useState(null);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [prescriptionUploading, setPrescriptionUploading] = useState(false);
  
  // Voice-to-text for notes (#9)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  
  // Prescription templates (#10)
  const PRESCRIPTION_TEMPLATES = [
    { label: 'Prenatal Vitamins', text: 'Tab Folic Acid 5mg OD x 30 days\nTab Iron 100mg OD x 30 days\nTab Calcium 500mg BD x 30 days' },
    { label: 'UTI Treatment', text: 'Tab Nitrofurantoin 100mg BD x 7 days\nTab Paracetamol 500mg SOS\nAdvice: Increase fluid intake' },
    { label: 'PCOS Management', text: 'Tab Metformin 500mg BD x 30 days\nTab Myo-inositol 2g OD x 30 days\nAdvice: Regular exercise, low sugar diet' },
    { label: 'Post-Op Care', text: 'Tab Amoxicillin 500mg TDS x 5 days\nTab Ibuprofen 400mg TDS x 3 days\nTab Pantoprazole 40mg OD x 5 days' },
  ];
  
  // Earnings data (#11) 
  const earningsData = useMemo(() => {
    const completed = appointments.filter(a => a.status === 'Completed');
    const todayRevenue = completed.reduce((s, a) => s + (a.total_fee || a.fee || 0), 0);
    return { today: todayRevenue, patients: completed.length };
  }, [appointments]);
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(true);
  const [sendViaEmail, setSendViaEmail] = useState(true);
  
  // Ratings data
  const [ratingsData, setRatingsData] = useState(null);
  const [recentReviews, setRecentReviews] = useState([]);
  
  // Leave Manager & Clinic Override
  const [showLeaveManager, setShowLeaveManager] = useState(false);
  const [showClinicOverride, setShowClinicOverride] = useState(false);
  const [showTokenPanel, setShowTokenPanel] = useState(false);
  
  // Running Late
  const [showRunningLate, setShowRunningLate] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [isDelayActive, setIsDelayActive] = useState(false);
  const [sendingDelay, setSendingDelay] = useState(false);
  
  // Bill View Modal
  const [showBillModal, setShowBillModal] = useState(false);
  const [billApt, setBillApt] = useState(null);

  const weekDates = getWeekDates(selectedDate);
  const currentMonth = new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Push notifications
  const { 
    isSupported: pushSupported, 
    isSubscribed: pushSubscribed, 
    subscribe: subscribePush 
  } = usePushNotifications();

  // WebSocket
  const { isConnected: wsConnected } = useAppointmentWebSocket({
    portal: 'diagyn_staff', // Connect to main staff room to get all updates
    clinic: selectedClinic === 'all' ? null : selectedClinic,
    date: selectedDate,
    enabled: isAuthenticated && !!doctorInfo,
    showToasts: true,
    onNewAppointment: (apt) => {
      // Filter to only show this doctor's appointments
      const myDoctorName = (doctorInfo?.doctor_name || doctorInfo?.name || profile?.name || '').toLowerCase();
      const aptDoctor = (apt.doctor || '').toLowerCase();
      const isMyAppointment = aptDoctor.includes(myDoctorName) || 
                              myDoctorName.includes(aptDoctor.split(' ').pop() || '') ||
                              aptDoctor.includes('vikas') && myDoctorName.includes('vikas') ||
                              aptDoctor.includes('neha') && myDoctorName.includes('neha');
      
      if (isMyAppointment && apt.date === selectedDate) {
        setAppointments(prev => {
          const exists = prev.some(a => a.id === apt.id || a.booking_id === apt.booking_id);
          if (exists) return prev;
          return [apt, ...prev];
        });
        successPattern();
        toast.success(`New appointment: ${apt.patient_name}`);
      }
    },
    onStatusChange: (apt) => {
      setAppointments(prev => prev.map(a => 
        (a.id === apt.id || a.booking_id === apt.booking_id) 
          ? { ...a, status: apt.status, token_number: apt.token_number || a.token_number }
          : a
      ));
    }
  });

  const calculateTotal = () => {
    if (!selectedApt || !config) return 0;
    const doctor = selectedApt.doctor;
    const feeConfig = config?.fee_codes?.[doctor]?.[feeCode];
    let total = feeConfig?.amount || 0;
    scanCodes.forEach(code => {
      total += config?.scan_fees?.[code]?.amount || 0;
    });
    return total;
  };

  const LOGIN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

  // ============ Auth ============
  useEffect(() => {
    const token = localStorage.getItem('doctorToken');
    const info = localStorage.getItem('doctorInfo');
    const expiry = localStorage.getItem('doctorLoginExpiry');
    
    if (expiry && new Date().getTime() > parseInt(expiry)) {
      localStorage.removeItem('doctorToken');
      localStorage.removeItem('doctorInfo');
      localStorage.removeItem('doctorLoginExpiry');
      setAuthChecked(true);
      return;
    }
    
    if (token && info) {
      try {
        const parsed = JSON.parse(info);
        setDoctorInfo(parsed);
        setIsAuthenticated(true);
        
        // Match doctor profile from username
        const username = parsed.username?.toLowerCase();
        if (username?.includes('vikas') || username === 'dr_vikas') {
          setDoctorProfile(DOCTOR_DATA['dr_vikas']);
        } else if (username?.includes('neha') || username === 'dr_neha') {
          setDoctorProfile(DOCTOR_DATA['dr_neha']);
        } else {
          // Fallback - check doctor name
          const doctorName = (parsed.doctor || parsed.name || '').toLowerCase();
          if (doctorName.includes('vikas')) {
            setDoctorProfile(DOCTOR_DATA['dr_vikas']);
          } else if (doctorName.includes('neha')) {
            setDoctorProfile(DOCTOR_DATA['dr_neha']);
          }
        }
      } catch (e) {
        localStorage.removeItem('doctorToken');
        localStorage.removeItem('doctorInfo');
        localStorage.removeItem('doctorLoginExpiry');
      }
    }
    setAuthChecked(true);
  }, []);

  // Doctor-specific theme (computed early for useEffect)
  const doctorKey = doctorProfile === DOCTOR_DATA['dr_neha'] ? 'dr_neha' : 'dr_vikas';
  const T = DOCTOR_THEMES[doctorKey];

  // Light theme application
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const app = document.querySelector('.App');
    html.setAttribute('data-portal', 'doctor');
    body.setAttribute('data-portal', 'doctor');
    body.style.backgroundColor = T.pageBg;
    if (app) { app.style.backgroundColor = T.pageBg; app.style.paddingBottom = '0'; }
    return () => {
      html.removeAttribute('data-portal');
      body.removeAttribute('data-portal');
      body.style.backgroundColor = '';
      if (app) { app.style.backgroundColor = ''; app.style.paddingBottom = ''; }
    };
  }, [T.pageBg]);

  const handleLogout = () => {
    heavyTap();
    localStorage.removeItem('doctorToken');
    localStorage.removeItem('doctorInfo');
    localStorage.removeItem('doctorLoginExpiry');
    setIsAuthenticated(false);
    navigate('/doctor-login');
  };
  
  // ============ Prescription Upload Handler ============
  
  // Voice-to-text handler
  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('Voice input not supported in this browser'); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setPrescriptionNotes(prev => prev + ' ' + transcript);
    };
    recognition.onerror = () => { setIsListening(false); };
    recognition.onend = () => { setIsListening(false); };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    lightTap();
  };

  const handleUploadPrescription = (apt) => {
    setPrescriptionApt(apt);
    setPrescriptionFile(null);
    setPrescriptionNotes('');
    setSendViaWhatsApp(true);
    setSendViaEmail(!!apt.patient_email);
    setShowPrescriptionModal(true);
    lightTap();
  };
  
  const submitPrescription = async () => {
    if (!prescriptionFile) {
      toast.error('Please select a prescription image');
      return;
    }
    
    setPrescriptionUploading(true);
    
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('prescription_image', prescriptionFile);
      formData.append('appointment_id', prescriptionApt.id || prescriptionApt.booking_id);
      formData.append('patient_name', prescriptionApt.patient_name);
      formData.append('patient_phone', prescriptionApt.patient_phone);
      formData.append('patient_email', prescriptionApt.patient_email || '');
      formData.append('doctor_name', doctorProfile?.name || doctorInfo?.doctor || 'Doctor');
      formData.append('notes', prescriptionNotes);
      formData.append('send_whatsapp', sendViaWhatsApp.toString());
      formData.append('send_email', sendViaEmail.toString());
      
      const response = await axios.post(
        `${API}/api/teleconsultation/prescription/upload`,
        formData,
        {
          ...getAuthHeaders(),
          headers: {
            ...getAuthHeaders().headers,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (response.data.success) {
        successPattern();
        toast.success('Prescription sent successfully!');
        setShowPrescriptionModal(false);
        
        // Update the appointment to show prescription was sent
        setAppointments(prev => prev.map(a => 
          (a.id === prescriptionApt.id || a.booking_id === prescriptionApt.booking_id)
            ? { ...a, prescription_sent: true }
            : a
        ));
      } else {
        throw new Error(response.data.message || 'Failed to send prescription');
      }
    } catch (error) {
      console.error('Prescription upload error:', error);
      errorPattern();
      toast.error(error.response?.data?.detail || 'Failed to send prescription');
    } finally {
      setPrescriptionUploading(false);
    }
  };

  // ============ Data Loading ============

  // Running Late functions
  const sendRunningLateNotification = async () => {
    const doctorName = doctorProfile?.name || doctorInfo?.doctor_name || doctorInfo?.name || '';
    if (!doctorName) { toast.error('Doctor info not loaded'); return; }
    setSendingDelay(true);
    try {
      const res = await axios.post(`${API}/api/clinic/doctor-running-late`, {
        doctor_name: doctorName,
        delay_minutes: delayMinutes,
        clinic: selectedClinic === 'all' ? '' : selectedClinic,
        date: selectedDate,
      });
      if (res.data.success) {
        successPattern();
        setIsDelayActive(true);
        setShowRunningLate(false);
        toast.success(`Notified ${res.data.patients_notified} patient(s) about ${delayMinutes}min delay`);
      }
    } catch (error) {
      errorPattern();
      toast.error('Failed to send delay notification');
    }
    setSendingDelay(false);
  };

  const clearRunningLate = async () => {
    const doctorName = doctorProfile?.name || doctorInfo?.doctor_name || doctorInfo?.name || '';
    try {
      await axios.post(`${API}/api/clinic/clear-doctor-delay`, {
        doctor_name: doctorName,
        date: selectedDate,
      });
      setIsDelayActive(false);
      successPattern();
      toast.success('Delay notification cleared');
    } catch { toast.error('Failed to clear'); }
  };

  const loadConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/diagyn-staff/config`, getAuthHeaders());
      setConfig(res.data);
    } catch (error) {
      console.error('Config error:', error);
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await axios.get(`${API}/api/diagyn-staff/appointments/by-date`, {
        params: { 
          date: selectedDate,
          clinic: selectedClinic === 'all' ? undefined : selectedClinic
        },
        ...getAuthHeaders()
      });
      let apts = res.data.appointments || [];
      
      // Filter to only show THIS doctor's appointments
      if (doctorInfo?.doctor || doctorProfile?.name) {
        const myName = (doctorProfile?.name || doctorInfo?.doctor || '').trim().toLowerCase();
        apts = apts.filter(a => {
          const aptDoc = (a.doctor || '').trim().toLowerCase();
          return aptDoc === myName || aptDoc.includes(myName) || myName.includes(aptDoc);
        });
      }
      
      // Also filter by clinic if selected (normalize: "Pushpa Clinic" matches "Pushpa")
      if (selectedClinic !== 'all') {
        const sel = selectedClinic.toLowerCase();
        apts = apts.filter(a => {
          const c = (a.clinic || '').toLowerCase();
          return c.includes(sel) || sel.includes(c.split(' ')[0]?.toLowerCase());
        });
      }
      
      setAppointments(apts);
      setSummary(res.data.summary || {});
    } catch (error) {
      if (error.response?.status === 401) {
        handleLogout();
        toast.error('Session expired');
      }
    }
    setRefreshing(false);
  }, [selectedDate, selectedClinic, doctorInfo, doctorProfile]);

  useEffect(() => {
    if (isAuthenticated) {
      loadConfig();
      loadAppointments();
      // Fetch ratings
      const fetchRatings = async () => {
        try {
          const [summaryRes, reviewsRes] = await Promise.all([
            axios.get(`${API}/api/ratings/summary`, getAuthHeaders()).catch(() => ({ data: {} })),
            axios.get(`${API}/api/ratings/recent?limit=5`, getAuthHeaders()).catch(() => ({ data: { ratings: [] } }))
          ]);
          setRatingsData(summaryRes.data);
          setRecentReviews(reviewsRes.data.ratings || []);
        } catch (e) { console.error(e); }
      };
      fetchRatings();
    }
  }, [isAuthenticated, loadConfig, loadAppointments]);

  useEffect(() => {
    const subscribeToDoctorPush = async () => {
      if (isAuthenticated && pushSupported && !pushSubscribed) {
        const token = localStorage.getItem('doctorToken');
        await subscribePush(token, 'doctor');
      }
    };
    subscribeToDoctorPush();
  }, [isAuthenticated, pushSupported, pushSubscribed, subscribePush]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(loadAppointments, wsConnected ? 30000 : 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadAppointments, wsConnected]);

  // ============ Actions ============
  const startConsultation = async (apt) => {
    heavyTap();
    try {
      await axios.put(`${API}/api/diagyn-staff/appointments/${apt.id}/status`,
        { status: 'WithDoctor' }, getAuthHeaders());
      successPattern();
      toast.success('Consultation started');
      loadAppointments();
    } catch (error) {
      errorPattern();
      toast.error('Failed');
    }
  };

  // Cancel appointment
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancellingApt, setCancellingApt] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const handleCancelRequest = (apt) => {
    setCancellingApt(apt);
    setCancelReason('');
    setShowCancelConfirm(true);
    mediumTap();
  };

  const confirmCancelAppointment = async () => {
    if (!cancellingApt) return;
    setCancelling(true);
    try {
      await axios.put(`${API}/api/diagyn-staff/appointments/${cancellingApt.id}/status`,
        { status: 'Cancelled' }, getAuthHeaders());
      successPattern();
      toast.success(`Appointment for ${cancellingApt.patient_name} cancelled`);
      setShowCancelConfirm(false);
      setCancellingApt(null);
      loadAppointments();
    } catch (error) {
      errorPattern();
      toast.error(error.response?.data?.detail || 'Failed to cancel');
    }
    setCancelling(false);
  };

  const openCompleteModal = (apt) => {
    setSelectedApt(apt);
    setFeeCode(apt.fee_code || '');
    setScanCodes([]);
    setNotes(apt.notes || '');
    setFollowUpDate(apt.follow_up_date || '');
    setShowModal(true);
    heavyTap();
  };

  const toggleScanCode = (code) => {
    mediumTap();
    setScanCodes(prev => prev.includes(code) 
      ? prev.filter(c => c !== code) 
      : [...prev, code]);
  };

  const completeConsultation = async () => {
    if (!feeCode) {
      toast.error('Select a fee code');
      return;
    }
    heavyTap();
    setLoading(true);
    try {
      const total = customTotal ? parseFloat(customTotal) : calculateTotal();
      
      // Complete consultation and generate invoice - no payment tracking
      const res = await axios.post(`${API}/api/diagyn-staff/doctor/collect-fee`, {
        appointment_id: selectedApt.id,
        fee_code: feeCode,
        scan_codes: scanCodes,
        total_amount: total,
        payment_method: 'invoice', // Just invoice, no payment tracking
        notes,
        follow_up_date: followUpDate || null,
        send_receipt_whatsapp: sendReceiptWhatsApp
      }, getAuthHeaders());
      
      if (res.data.success) {
        successPattern();
        toast.success('Consultation ended — Billing timer started', { duration: 4000 });
        toast('Staff will close the bill after collecting payment', { duration: 5000 });
        setShowModal(false);
        loadAppointments();
      } else {
        throw new Error(res.data.message || 'Failed to complete');
      }
    } catch (error) {
      errorPattern();
      toast.error(error.response?.data?.detail || 'Failed to complete');
    }
    setLoading(false);
  };

  // Open Bill Modal to view/print bill details
  const openBillModal = (apt) => {
    setBillApt(apt);
    setShowBillModal(true);
    mediumTap();
  };

  // Send Invoice via WhatsApp
  const sendInvoiceWhatsApp = async (apt) => {
    try {
      setLoading(true);
      const res = await axios.post(`${API}/api/diagyn-staff/appointments/${apt.id}/send-invoice`, {}, getAuthHeaders());
      if (res.data.success) {
        toast.success('Invoice sent via WhatsApp!');
        loadAppointments();
      } else {
        toast.error(res.data.message || 'Failed to send invoice');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send invoice');
    }
    setLoading(false);
  };

  // ============ Auth Check ============
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.pageBg }}>
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    navigate('/doctor-login', { replace: true });
    return null;
  }

  // ============ Filter appointments ============
  const waitingPatients = appointments.filter(a => a.status === 'CheckedIn');
  const inConsultPatients = appointments.filter(a => a.status === 'WithDoctor');
  const completedPatients = appointments.filter(a => a.status === 'Completed');

  // Group appointments by time
  const groupedByTime = {};
  appointments.forEach(apt => {
    const time = apt.time || '00:00';
    if (!groupedByTime[time]) groupedByTime[time] = [];
    groupedByTime[time].push(apt);
  });

  const profile = doctorProfile || {
    name: doctorInfo?.doctor || doctorInfo?.name || 'Doctor',
    displayName: doctorInfo?.doctor || doctorInfo?.name || 'Doctor',
    specialty: 'Specialist',
    image: '',
    rating: '—',
    experience: '',
    patients: '',
  };

  return (
    <div className="min-h-screen" style={{ background: T.pageBg }}>
      <style>{`
        @keyframes drCardEntry { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
        .dr-card-anim { animation: drCardEntry 0.4s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes drPulseConsult { 0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); } 50% { box-shadow: 0 0 0 6px rgba(139,92,246,0); } }
        .dr-pulse-consult { animation: drPulseConsult 2s ease-in-out infinite; }
        @keyframes drSlideDate { from { opacity:0; transform: translateX(10px); } to { opacity:1; transform: translateX(0); } }
        .dr-date-anim { animation: drSlideDate 0.3s ease-out; }
        @keyframes drStatPop { from { opacity:0; transform: scale(0.8); } to { opacity:1; transform: scale(1); } }
        .dr-stat-anim { animation: drStatPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes drWaitPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.3); } 50% { box-shadow: 0 0 0 4px rgba(245,158,11,0); } }
        .dr-wait-pulse { animation: drWaitPulse 1.5s ease-in-out infinite; }
        @keyframes drHeroBg { 0%,100% { background-size: 100% 100%; } 50% { background-size: 110% 110%; } }
      `}</style>
      {/* Hero Header — Doctor's Gradient */}
      <header className="px-4 pt-4 pb-5 rounded-b-[32px]" style={{ background: T.headerBg }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={profile.image}
                alt={profile.name}
                className="w-14 h-14 rounded-2xl object-cover"
                style={{ border: `2px solid ${T.accentDark}30`, boxShadow: `0 4px 16px ${T.neonGlow}` }}
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2" style={{ borderColor: T.pageBg }} />
            </div>
            <div>
              <h1 className="font-bold text-lg" style={{ fontFamily: 'Outfit, sans-serif', color: T.headerText }}>
                {profile.displayName}
              </h1>
              <p className="text-sm font-semibold" style={{ color: T.headerTextMuted }}>{profile.specialty}</p>
            </div>
          </div>
          <button 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: T.statBg,
              border: `1px solid ${wsConnected ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
            }}
            onClick={() => toast.info(wsConnected ? 'Live feed connected' : 'Live feed disconnected')}
          >
            <Radio className={`w-5 h-5 ${wsConnected ? 'text-green-500' : 'text-red-500'}`} />
          </button>
        </div>

        {/* Stats Row on Hero */}
        <div className="flex gap-2 mb-4">
          {[
            { icon: Star, val: ratingsData?.by_service?.diagyn?.avg_rating || ratingsData?.overall?.avg_rating || profile.rating, label: 'Rating', fill: true },
            { val: waitingPatients.length, label: 'Waiting' },
            { val: appointments.length, label: 'Today' },
            { val: completedPatients.length, label: 'Done' },
          ].map((s, i) => (
            <div key={i} className="flex-1 rounded-xl p-2.5 text-center dr-stat-anim" style={{ background: T.statBg, animationDelay: `${i * 80}ms` }} data-testid={i === 0 ? 'doctor-rating' : undefined}>
              <div className="flex items-center justify-center gap-1">
                {s.icon && <s.icon className="w-3.5 h-3.5" style={{ color: T.headerText, fill: s.fill ? T.headerText : 'none' }} />}
                <span className="font-bold text-sm" style={{ color: T.statText }}>{s.val}</span>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: T.headerTextMuted }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Month + Week Calendar */}
        <h2 className="text-xl font-bold text-center" style={{ color: T.headerText }}>{currentMonth}</h2>
        <div className="flex justify-between mt-4 px-1 dr-date-anim">
          {weekDates.map((d) => (
            <button
              key={d.date}
              onClick={() => { lightTap(); setSelectedDate(d.date); }}
              className="flex flex-col items-center py-2 px-3 rounded-2xl transition-all"
              style={
                d.date === selectedDate 
                  ? { background: T.accentDark, color: T.accent, boxShadow: `0 4px 16px ${T.neonGlow}` }
                  : d.isToday
                    ? { background: T.statBg, color: T.headerText }
                    : { color: T.headerTextMuted }
              }
            >
              <span className="text-xs font-medium">{d.day}</span>
              <span className="text-lg font-bold mt-1">{d.dayNum}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Content — Light surface */}
      <PortalErrorBoundary name="Doctor Portal">
      <main 
        className="rounded-t-3xl -mt-4 min-h-[calc(100vh-280px)] pb-24 relative z-10"
        style={{ background: T.surfaceCard, borderTop: `1px solid ${T.surfaceBorder}` }}
      >

        {/* Next Patient Banner */}
        {waitingPatients.length > 0 && (
          <div className="px-4 pt-4" data-testid="patient-queue-section">
            <div className="rounded-xl p-3 mb-2 flex items-center gap-3" style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }} data-testid="next-patient-banner">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0" style={{ background: T.accent, color: T.accentDark }}>
                {waitingPatients[0]?.token_number || '#'}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: T.accent }}>Next Patient</p>
                <p className="text-sm font-bold" style={{ color: T.cardText }}>{waitingPatients[0]?.patient_name}</p>
                {waitingPatients[0]?.chief_complaint && (
                  <p className="text-[10px] mt-0.5" style={{ color: T.cardTextMuted }}>{waitingPatients[0].chief_complaint}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px]" style={{ color: T.cardTextMuted }}>{waitingPatients.length} in queue</p>
              </div>
            </div>
            {waitingPatients.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {waitingPatients.slice(1, 5).map((p, i) => (
                  <div key={p.id || i} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: T.badgeBg, border: `1px solid ${T.accent}20` }}>
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: T.accent + '30', color: T.accent }}>{p.token_number || i+2}</span>
                    <div>
                      <p className="text-[11px] font-medium" style={{ color: T.textPrimary }}>{p.patient_name}</p>
                      <p className="text-[9px]" style={{ color: T.textMuted }}>{p.appointment_type || 'Scheduled'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Billing Timer — read-only for doctor */}
        <div className="px-4 pt-3">
          <BillingTimerPanel token={localStorage.getItem('doctorToken')} isDoctor={true} clinic={selectedClinic === 'all' ? null : selectedClinic} />
        </div>

        {/* Queue Insights for Doctor */}
        <div className="px-4 pt-2">
          <QueueInsightsWidget token={localStorage.getItem('doctorToken')} clinic={selectedClinic === 'all' ? null : selectedClinic} date={selectedDate} />
        </div>

        {/* 30+ Minute Wait Alert */}
        <LongWaitAlert
          appointments={appointments}
          onStartConsult={startConsultation}
          thresholdMinutes={30}
          portalType="doctor"
        />

        {/* Clinic Toggle - Pushpa */}
        <div className="px-4 pt-4">
          <div className="flex p-1 rounded-full" style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
            <button
              onClick={() => { lightTap(); setSelectedClinic('all'); }}
              className="flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-all"
              style={selectedClinic === 'all' ? { background: T.ctaGradient, color: T.ctaText, boxShadow: `0 4px 16px ${T.neonGlow}` } : { color: T.textSecondary }}
            >
              All
            </button>
            <button
              onClick={() => { lightTap(); setSelectedClinic('Pushpa'); }}
              className="flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-all"
              style={selectedClinic === 'Pushpa' ? { background: T.ctaGradient, color: T.ctaText, boxShadow: `0 4px 16px ${T.neonGlow}` } : { color: T.textSecondary }}
            >
              Pushpa Clinic
            </button>
          </div>
        </div>

        {/* Date Header with Actions */}
        <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.surfaceBorder}` }}>
          <div>
            <h3 style={{ color: T.textPrimary }} className="font-semibold">
              {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <p className="text-sm" style={{ color: T.textSecondary }}>{appointments.length} appointments</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { lightTap(); loadAppointments(); }}
              disabled={refreshing}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: T.accent, color: T.ctaText }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Bar — Vibrant Gradient Cards */}
        <div className="px-4 py-3 flex gap-3">
          <div className="flex-1 rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(145deg, #FFF3E0 0%, #FFE0B2 50%, #FFCC80 100%)', border: '1px solid #FFB74D', boxShadow: '0 4px 12px rgba(255,152,0,0.15)' }}>
            <p className="text-3xl font-black" style={{ color: '#E65100' }}>{waitingPatients.length}</p>
            <p className="text-xs font-semibold" style={{ color: '#F57C00' }}>Waiting</p>
          </div>
          <div className="flex-1 rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(145deg, #EDE7F6 0%, #D1C4E9 50%, #B39DDB 100%)', border: '1px solid #9575CD', boxShadow: '0 4px 12px rgba(103,58,183,0.15)' }}>
            <p className="text-3xl font-black" style={{ color: '#4527A0' }}>{inConsultPatients.length}</p>
            <p className="text-xs font-semibold" style={{ color: '#7E57C2' }}>In Consult</p>
          </div>
          <div className="flex-1 rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(145deg, #E8F5E9 0%, #C8E6C9 50%, #A5D6A7 100%)', border: '1px solid #66BB6A', boxShadow: '0 4px 12px rgba(76,175,80,0.15)' }}>
            <p className="text-3xl font-black" style={{ color: '#1B5E20' }}>{completedPatients.length}</p>
            <p className="text-xs font-semibold" style={{ color: '#43A047' }}>Done</p>
          </div>
        </div>

        {/* Running Late Toggle */}
        <div className="px-4 py-2">
          {isDelayActive ? (
            <div className="flex items-center justify-between rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }} data-testid="delay-active-banner">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">Running ~{delayMinutes}min late</span>
              </div>
              <button onClick={clearRunningLate}
                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}
                data-testid="clear-delay-btn">
                Clear
              </button>
            </div>
          ) : (
            <button onClick={() => setShowRunningLate(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.surfaceBorder}`, color: T.textMuted }}
              data-testid="running-late-btn">
              <AlertTriangle className="w-4 h-4" />
              Running Late? Notify Patients
            </button>
          )}
        </div>

        {/* Running Late Modal */}
        {showRunningLate && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" 
               onClick={() => setShowRunningLate(false)}>
            <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
                 style={{ background: T.surfaceCard, border: `1px solid ${T.surfaceBorder}` }}
                 onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.surfaceBorder}` }}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span className="text-white font-bold">Running Late</span>
                </div>
                <button onClick={() => setShowRunningLate(false)} className="p-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <X className="w-5 h-5" style={{ color: T.textMuted }} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm" style={{ color: T.textMuted }}>Notify all booked & waiting patients about your delay.</p>
                <div>
                  <label className="text-xs font-bold mb-2 block" style={{ color: T.textMuted }}>DELAY (MINUTES)</label>
                  <div className="flex gap-2">
                    {[10, 15, 20, 30, 45, 60].map(m => (
                      <button key={m} onClick={() => setDelayMinutes(m)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={delayMinutes === m 
                          ? { background: '#F59E0B', color: '#fff' } 
                          : { background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: `1px solid ${T.surfaceBorder}` }}
                        data-testid={`delay-${m}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={sendRunningLateNotification} disabled={sendingDelay}
                  className="w-full h-12 rounded-xl font-bold text-white"
                  style={{ background: '#F59E0B' }}
                  data-testid="send-delay-btn">
                  {sendingDelay ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <AlertTriangle className="w-5 h-5 mr-2" />}
                  Notify Patients ({delayMinutes} min delay)
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Appointments List */}
        <div className="px-4 py-2">
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(139,92,246,0.15)' }}>
                <Calendar className="w-8 h-8 text-violet-400" />
              </div>
              <p style={{ color: T.textMuted }}>No appointments for this day</p>
            </div>
          ) : (
            <div className="space-y-1">
              {Object.entries(groupedByTime).sort().map(([time, apts]) => (
                <div key={time}>
                  {/* Time Label */}
                  <div className="flex items-center gap-2 mb-2 mt-4">
                    <span className="text-xs font-medium w-14" style={{ color: T.textMuted }}>{time}</span>
                    <div className="flex-1 h-px" style={{ background: T.surfaceBorder }}></div>
                  </div>
                  
                  {/* Appointment Cards */}
                  {apts.map(apt => (
                    <AppointmentCard 
                      key={apt.id} 
                      apt={apt} 
                      T={T}
                      profile={profile}
                      onComplete={() => openCompleteModal(apt)}
                      onBilling={() => openBillModal(apt)}
                      onUploadPrescription={handleUploadPrescription}
                      onCancel={handleCancelRequest}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ratings Overview Section */}
        {ratingsData && (
          <div className="mt-6 rounded-2xl p-4" style={{ background: T.surfaceCard, border: `1px solid ${T.surfaceBorder}` }}>
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Patient Ratings
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-400">{ratingsData.overall?.avg_rating || '—'}</p>
                <div className="flex gap-0.5 mt-1 justify-center">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-3 h-3 ${s <= Math.round(ratingsData.overall?.avg_rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} />
                  ))}
                </div>
                <p className="text-xs mt-1" style={{ color: T.textMuted }}>{ratingsData.overall?.total_ratings || 0} ratings</p>
              </div>
              {/* Distribution bars */}
              <div className="flex-1 space-y-1">
                {[5,4,3,2,1].map(star => {
                  const svcData = ratingsData.by_service?.diagyn || ratingsData.by_service?.app;
                  const count = svcData?.distribution?.[star] || 0;
                  const total = svcData?.total_ratings || 1;
                  const pct = (count / total) * 100;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs w-3" style={{ color: T.textMuted }}>{star}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs w-5" style={{ color: T.textMuted }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Recent reviews */}
            {recentReviews.length > 0 && (
              <div className="space-y-2 pt-3" style={{ borderTop: `1px solid ${T.surfaceBorder}` }}>
                <p className="text-xs font-medium" style={{ color: T.textMuted }}>Recent Reviews</p>
                {recentReviews.slice(0, 3).map((rev, i) => (
                  <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center gap-1 mb-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3 h-3 ${s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} />
                      ))}
                      <span className="text-xs ml-2" style={{ color: T.textMuted }}>{rev.service}</span>
                    </div>
                    <p className="text-sm text-gray-600">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Appointments Widget */}

        {/* ============ DAILY SUMMARY VIEW ============ */}
        {activeTab === 'summary' && (
          <div className="space-y-4 pb-4" data-testid="doctor-daily-summary">
            <h2 className="text-lg font-bold text-white">Daily Summary — {selectedDate}</h2>

            {/* Stats Grid */}
            {(() => {
              const total = appointments.length;
              const completed = appointments.filter(a => a.status === 'Completed').length;
              const checkedIn = appointments.filter(a => a.status === 'CheckedIn').length;
              const booked = appointments.filter(a => a.status === 'Booked').length;
              const cancelled = appointments.filter(a => a.status === 'Cancelled').length;
              const walkins = appointments.filter(a => a.appointment_type === 'WALK_IN').length;
              const emergencies = appointments.filter(a => a.appointment_type === 'EMERGENCY').length;
              const revenue = appointments.filter(a => a.status === 'Completed').reduce((s, a) => s + (a.total_fee || a.fee || 0), 0);
              const avgFee = completed > 0 ? Math.round(revenue / completed) : 0;
              
              return (
                <>
                  {/* Main Stat Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                      <p className="text-3xl font-black text-violet-400">{total}</p>
                      <p className="text-xs mt-1" style={{ color: T.textMuted }}>Total Patients</p>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <p className="text-3xl font-black text-green-400">{completed}</p>
                      <p className="text-xs mt-1" style={{ color: T.textMuted }}>Completed</p>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
                      <p className="text-3xl font-black text-blue-400">{checkedIn}</p>
                      <p className="text-xs mt-1" style={{ color: T.textMuted }}>Waiting / In</p>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <p className="text-3xl font-black text-amber-400">{booked}</p>
                      <p className="text-xs mt-1" style={{ color: T.textMuted }}>Yet to Arrive</p>
                    </div>
                  </div>

                  {/* Revenue Card + Earnings Tracker */}
                  <div className="rounded-2xl p-4" style={{ background: T.surfaceCard, border: `1px solid ${T.surfaceBorder}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider" style={{ color: T.textMuted }}>Today's Revenue</p>
                        <p className="text-2xl font-black text-white mt-1">
                          <IndianRupee className="w-5 h-5 inline" />{revenue.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: T.textMuted }}>Avg per patient</p>
                        <p className="text-lg font-bold text-green-400">{'\u20B9'}{avgFee}</p>
                      </div>
                    </div>
                    <button onClick={() => navigate('/revenue-dashboard')} className="text-xs text-violet-400 font-semibold hover:text-violet-300 mt-1" data-testid="view-revenue-dashboard">View Full Dashboard &rarr;</button>
                    {/* Mini earnings bar chart */}
                    <div className="pt-3" style={{ borderTop: `1px solid ${T.surfaceBorder}` }}>
                      <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: T.textMuted }}>This Week</p>
                      <div className="flex items-end justify-between gap-1 h-12">
                        {['M','T','W','T','F','S'].map((day, i) => {
                          const isToday = i === new Date().getDay() - 1;
                          const barH = isToday ? (revenue > 0 ? Math.min(100, (revenue / 5000) * 100) : 15) : 15 + Math.random() * 60;
                          return (
                            <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
                              <div className="w-full rounded-t" style={{
                                height: `${barH}%`, minHeight: 4,
                                background: isToday ? 'linear-gradient(180deg, #8B5CF6, #A78BFA)' : 'rgba(255,255,255,0.06)',
                              }} />
                              <span className={`text-[8px] ${isToday ? 'text-violet-400 font-bold' : ''}`} style={isToday ? {} : { color: T.textMuted }}>{day}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="rounded-2xl p-4 space-y-3" style={{ background: T.surfaceCard, border: `1px solid ${T.surfaceBorder}` }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textMuted }}>Breakdown</h3>
                    {[
                      { label: 'Walk-in', count: walkins, color: '#F59E0B' },
                      { label: 'Emergency', count: emergencies, color: '#EF4444' },
                      { label: 'Scheduled', count: total - walkins - emergencies, color: '#7C3AED' },
                      { label: 'Cancelled', count: cancelled, color: T.textSecondary },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                          <span className="text-sm" style={{ color: T.textSecondary }}>{item.label}</span>
                        </div>
                        <span className="text-sm font-bold text-white">{item.count}</span>
                      </div>
                    ))}
                  </div>

                  {/* Completion Bar */}
                  <div className="rounded-2xl p-4" style={{ background: T.surfaceCard, border: `1px solid ${T.surfaceBorder}`,  }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">Completion Rate</span>
                      <span className="text-sm font-bold text-green-400">{total > 0 ? Math.round(completed / total * 100) : 0}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-50 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${total > 0 ? (completed / total * 100) : 0}%`, background: 'linear-gradient(90deg, #7C3AED, #10B981)' }} />
                    </div>
                  </div>

                  {/* Quick Links - Handoff Notes */}
                  <button onClick={() => navigate('/handoff-notes')}
                    className="w-full rounded-2xl p-4 text-left transition-all hover:shadow-md" style={{ background: 'linear-gradient(135deg, #0A0A1A, #141428)', border: '1px solid rgba(124,58,237,0.2)' }}
                    data-testid="handoff-notes-link">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Handoff Notes</p>
                          <p className="text-xs text-gray-400">Shift handover records</p>
                        </div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </button>

                  {/* Time Distribution */}
                  {(() => {
                    const morning = appointments.filter(a => { const h = parseInt((a.time || '12:00').split(':')[0]); return h < 12; }).length;
                    const afternoon = appointments.filter(a => { const h = parseInt((a.time || '12:00').split(':')[0]); return h >= 12 && h < 17; }).length;
                    const evening = appointments.filter(a => { const h = parseInt((a.time || '12:00').split(':')[0]); return h >= 17; }).length;
                    const peak = morning >= afternoon && morning >= evening ? 'Morning' : afternoon >= evening ? 'Afternoon' : 'Evening';
                    return (
                      <div className="rounded-2xl p-4 space-y-3" style={{ background: T.surfaceCard, border: `1px solid ${T.surfaceBorder}`,  }} data-testid="time-distribution">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Time Distribution</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-semibold">Peak: {peak}</span>
                        </div>
                        <div className="flex gap-2">
                          {[
                            { label: 'Morning', sub: '< 12 PM', count: morning, color: '#F59E0B', bg: '#F59E0B15' },
                            { label: 'Afternoon', sub: '12-5 PM', count: afternoon, color: '#3B82F6', bg: '#3B82F615' },
                            { label: 'Evening', sub: '> 5 PM', count: evening, color: '#8B5CF6', bg: '#8B5CF615' },
                          ].map(t => (
                            <div key={t.label} className="flex-1 rounded-xl p-3 text-center" style={{ background: t.bg, border: `1px solid ${t.color}25` }}>
                              <p className="text-xl font-black" style={{ color: t.color }}>{t.count}</p>
                              <p className="text-[10px] text-gray-500">{t.label}</p>
                              <p className="text-[9px] text-gray-500">{t.sub}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Patient List */}
                  {appointments.length > 0 && (
                    <div className="rounded-2xl p-4 space-y-3" style={{ background: T.surfaceCard, border: `1px solid ${T.surfaceBorder}`,  }} data-testid="patient-list-summary">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Patient Details ({appointments.length})</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {appointments.sort((a, b) => (a.time || '').localeCompare(b.time || '')).map((apt, i) => {
                          const st = apt.status === 'Completed' ? { bg: 'bg-emerald-500/15', text: 'text-green-400' }
                            : apt.status === 'Cancelled' ? { bg: 'bg-red-500/15', text: 'text-red-500' }
                            : apt.status === 'CheckedIn' || apt.status === 'WithDoctor' ? { bg: 'bg-amber-500/15', text: 'text-amber-400' }
                            : { bg: 'bg-blue-500/15', text: 'text-blue-400' };
                          return (
                            <div key={apt.booking_id || i} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 border border-white/[0.04]">
                              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-violet-400">{i + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{apt.patient_name || 'Patient'}</p>
                                <p className="text-[10px] text-gray-500">
                                  {apt.time || 'N/A'} {apt.appointment_type === 'WALK_IN' ? '· Walk-in' : apt.appointment_type === 'EMERGENCY' ? '· Emergency' : ''}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{apt.status}</span>
                                {(apt.total_fee || apt.fee) > 0 && (
                                  <p className="text-[10px] text-green-400 mt-0.5">₹{apt.total_fee || apt.fee}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ratings Summary */}
                  {ratingsData?.average > 0 && (
                    <div className="rounded-2xl p-4" style={{ background: T.surfaceCard, border: `1px solid ${T.surfaceBorder}`,  }}>
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-black text-white">{ratingsData.average?.toFixed(1)}</p>
                          <p className="text-xs text-gray-500">{ratingsData.total_ratings || 0} patient ratings</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

      </main>
      </PortalErrorBoundary>

      {/* Cancel Appointment Confirmation Modal */}
      {showCancelConfirm && cancellingApt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
             onClick={() => setShowCancelConfirm(false)}>
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
               style={{ background: T.surfaceCard, border: `1px solid ${T.surfaceBorder}` }}
               onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.surfaceBorder}` }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="font-bold" style={{ color: T.textPrimary }}>Cancel Appointment</span>
              </div>
              <button onClick={() => setShowCancelConfirm(false)} className="p-1 rounded-full hover:bg-zinc-100">
                <X className="w-5 h-5" style={{ color: T.textMuted }} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="font-bold" style={{ color: T.textPrimary }}>{cancellingApt.patient_name}</p>
                <p className="text-sm mt-0.5" style={{ color: T.textSecondary }}>
                  {cancellingApt.time} · {cancellingApt.doctor} · {cancellingApt.booking_id || cancellingApt.id}
                </p>
              </div>
              <p className="text-sm" style={{ color: T.textSecondary }}>
                Are you sure you want to cancel this appointment? The patient will be notified.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => setShowCancelConfirm(false)} variant="outline"
                  className="flex-1 py-5 rounded-xl font-semibold" data-testid="cancel-dismiss-btn">
                  Keep
                </Button>
                <Button onClick={confirmCancelAppointment} disabled={cancelling}
                  className="flex-1 py-5 rounded-xl font-bold text-white"
                  style={{ background: '#EF4444' }}
                  data-testid="cancel-confirm-btn">
                  {cancelling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Cancel Appointment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-0 left-0 right-0 px-6 py-4 shadow-lg z-50"
        style={{ background: T.cardBg, borderTop: `1px solid ${T.cardBorder}` }}
      >
        <div className="flex justify-around items-center">
          <button 
            onClick={() => { setActiveTab('home'); setShowTokenPanel(false); }}
            className="flex flex-col items-center gap-1"
            style={{ color: activeTab === 'home' && !showTokenPanel ? T.accent : T.cardTextMuted }}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-semibold">Home</span>
          </button>

          <button 
            onClick={() => { setActiveTab('summary'); setShowTokenPanel(false); setShowLeaveManager(false); }}
            className="flex flex-col items-center gap-1"
            style={{ color: activeTab === 'summary' ? '#22C55E' : T.cardTextMuted }}
            data-testid="doctor-summary-tab"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs font-semibold">Summary</span>
          </button>

          <button 
            onClick={() => { setShowTokenPanel(p => !p); setShowLeaveManager(false); }}
            className="flex flex-col items-center gap-1"
            style={{ color: showTokenPanel ? '#3B82F6' : T.cardTextMuted }}
          >
            <Volume2 className="w-5 h-5" />
            <span className="text-xs font-semibold">Token</span>
          </button>
          
          {/* Leave Management - Central FAB */}
          <button 
            onClick={() => { setShowLeaveManager(true); setShowTokenPanel(false); setShowClinicOverride(false); }}
            className="w-14 h-14 -mt-6 rounded-2xl flex items-center justify-center text-white shadow-lg"
            style={{ background: T.ctaGradient, boxShadow: `0 6px 20px ${T.neonGlow}`, color: T.ctaText }}
          >
            <CalendarOff className="w-6 h-6" />
          </button>

          <button 
            onClick={() => { setShowClinicOverride(true); setShowTokenPanel(false); setShowLeaveManager(false); }}
            className="flex flex-col items-center gap-1"
            style={{ color: showClinicOverride ? T.accent : T.cardTextMuted }}
            data-testid="clinic-switch-nav-btn"
          >
            <ArrowLeftRight className="w-5 h-5" />
            <span className="text-xs font-semibold">Switch</span>
          </button>

          <button 
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 hover:text-red-500 transition-colors"
            style={{ color: T.cardTextMuted }}
          >
            <LogOut className="w-5 h-5" />
            <span className="text-xs font-semibold">Logout</span>
          </button>
        </div>
      </nav>

      {/* Complete Consultation Modal */}
      {showModal && selectedApt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50">
          <div 
            className="w-full max-w-lg rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
            style={{ background: T.surfaceCard, border: `1px solid ${T.surfaceBorder}` }}
          >
            <div className="p-4 border-b" style={{ background: T.ctaGradient, borderColor: T.surfaceBorder }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-lg">Complete Consultation</h3>
                  <p className="text-white/80 text-sm">{selectedApt.patient_name}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-full">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {/* Fee Code Selection */}
              <div>
                <label className="text-sm font-bold text-gray-400 mb-2 block">CONSULTATION FEE</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(config?.fee_codes?.[selectedApt.doctor] || {}).map(([code, info]) => (
                    <button key={code}
                      onClick={() => { mediumTap(); setFeeCode(code); }}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        feeCode === code 
                          ? 'border-violet-500 bg-violet-500/20' 
                          : 'border-gray-100 hover:border-violet-500/50'
                      }`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-violet-400">{code}</span>
                        <span className="font-bold text-green-400">₹{info.amount}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{info.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scan Fees */}
              {config?.scan_fees && (
                <div>
                  <label className="text-sm font-bold text-gray-400 mb-2 block">SONOGRAPHY / SCANS</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(config.scan_fees).map(([code, info]) => (
                      <button key={code}
                        onClick={() => toggleScanCode(code)}
                        className={`p-2 rounded-xl border-2 text-center transition-all ${
                          scanCodes.includes(code) 
                            ? 'border-violet-500 bg-violet-500/20' 
                            : 'border-gray-100 hover:border-violet-500/50'
                        }`}>
                        <span className="font-bold text-sm text-violet-400">{code}</span>
                        <p className="text-xs text-gray-500">₹{info.amount}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Send Invoice via WhatsApp */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: T.cardBg }}>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-green-400" />
                  <div>
                    <span className="text-sm text-white font-medium">Send Invoice via WhatsApp</span>
                    <p className="text-xs text-gray-500">Patient will receive PDF invoice</p>
                  </div>
                </div>
                <button
                  onClick={() => setSendReceiptWhatsApp(!sendReceiptWhatsApp)}
                  className={`w-12 h-6 rounded-full transition-all ${sendReceiptWhatsApp ? 'bg-green-500' : 'bg-slate-600'}`}
                  data-testid="toggle-whatsapp-invoice"
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${sendReceiptWhatsApp ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-bold text-gray-400 mb-2 block">NOTES</label>
                <Input 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..." 
                  className="h-10 rounded-xl bg-gray-50 border-gray-100 text-white placeholder:text-gray-500" 
                />
              </div>

              {/* Follow-up */}
              <div>
                <label className="text-sm font-bold text-gray-400 mb-2 block">FOLLOW-UP DATE</label>
                <input 
                  type="date" 
                  value={followUpDate}
                  min={getIndianDate()}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-100 text-white text-sm"
                />
              </div>

              {/* Total Invoice Amount */}
              <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))' }}>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-medium">Invoice Amount</span>
                  <span className="text-3xl font-bold text-green-400">₹{customTotal || calculateTotal()}</span>
                </div>
              </div>

              {/* Complete Button */}
              <Button
                onClick={completeConsultation}
                disabled={loading || !feeCode}
                className="w-full py-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-2xl font-bold text-lg"
                data-testid="complete-consultation-btn"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
                Complete Consultation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Upload Modal */}
      {showPrescriptionModal && prescriptionApt && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowPrescriptionModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-3xl p-6 animate-in zoom-in-95"
            style={{ background: T.surfaceCard, border: `1px solid ${T.surfaceBorder}` }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Upload Prescription</h3>
                <p className="text-gray-500 text-sm mt-1">
                  For {prescriptionApt.patient_name}
                </p>
              </div>
              <button 
                onClick={() => setShowPrescriptionModal(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-800"
                style={{ background: T.cardBg }}
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {/* Patient Info */}
            <div className="p-4 rounded-xl mb-4" style={{ background: T.cardBg }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{prescriptionApt.patient_name}</p>
                  <p className="text-gray-500 text-sm">{prescriptionApt.patient_phone}</p>
                </div>
              </div>
            </div>
            
            {/* File Upload */}
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">
                Prescription Image (PDF will be generated)
              </label>
              <div 
                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-violet-500/50 transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                onClick={() => document.getElementById('prescriptionFileInput').click()}
              >
                <input 
                  id="prescriptionFileInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPrescriptionFile(e.target.files[0])}
                />
                {prescriptionFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                    <span className="text-green-400 font-medium">{prescriptionFile.name}</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-10 h-10 mx-auto mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500">Click to upload prescription image</p>
                    <p className="text-gray-500 text-xs mt-1">JPG, PNG supported</p>
                  </>
                )}
              </div>
            </div>
            
            {/* Prescription Templates - One-tap shortcuts */}
            <div className="mb-3">
              <label className="block text-gray-400 text-xs mb-1.5">Quick Templates</label>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {PRESCRIPTION_TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => setPrescriptionNotes(t.text)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all active:scale-95"
                    style={{ background: 'rgba(139,92,246,0.1)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.2)' }}
                    data-testid={`rx-template-${i}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes with Voice Input */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-400 text-sm">Notes</label>
                <button onClick={toggleVoiceInput}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${isListening ? 'animate-pulse' : ''}`}
                  style={{ background: isListening ? 'rgba(239,68,68,0.15)' : 'rgba(139,92,246,0.1)', color: isListening ? '#F87171' : '#A78BFA', border: `1px solid ${isListening ? 'rgba(239,68,68,0.3)' : 'rgba(139,92,246,0.2)'}` }}
                  data-testid="voice-input-btn">
                  <Mic className={`w-3 h-3 ${isListening ? 'text-red-400' : ''}`} />
                  {isListening ? 'Stop' : 'Voice'}
                </button>
              </div>
              <textarea
                value={prescriptionNotes}
                onChange={(e) => setPrescriptionNotes(e.target.value)}
                placeholder="Follow-up instructions, diet advice, etc."
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-white placeholder:text-gray-500 resize-none"
                style={{ background: T.cardBg, border: `1px solid ${isListening ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}` }}
              />
            </div>
            
            {/* Delivery Options */}
            <div className="mb-6 p-4 rounded-xl" style={{ background: T.cardBg }}>
              <p className="text-gray-400 text-sm mb-3">Send Prescription via:</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={sendViaWhatsApp}
                    onChange={(e) => setSendViaWhatsApp(e.target.checked)}
                    className="w-5 h-5 rounded accent-green-500"
                  />
                  <span className="flex items-center gap-2 text-white">
                    <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp ({prescriptionApt.patient_phone})
                  </span>
                </label>
                {prescriptionApt.patient_email && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={sendViaEmail}
                      onChange={(e) => setSendViaEmail(e.target.checked)}
                      className="w-5 h-5 rounded accent-blue-500"
                    />
                    <span className="flex items-center gap-2 text-white">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email ({prescriptionApt.patient_email})
                    </span>
                  </label>
                )}
              </div>
            </div>
            
            {/* Submit Button */}
            <Button
              onClick={submitPrescription}
              disabled={prescriptionUploading || !prescriptionFile}
              className="w-full py-5 rounded-full text-base font-bold"
              style={{ 
                background: prescriptionFile ? 'linear-gradient(135deg, #8B5CF6, #3B82F6)' : T.cardBg,
                opacity: prescriptionFile ? 1 : 0.5
              }}
            >
              {prescriptionUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                'Send Prescription'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Bill View Modal - Professional Light UI */}
      {showBillModal && billApt && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowBillModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 overflow-hidden"
            style={{ background: T.surfaceCard }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header - Clinic Branding */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">DiaGyn Healthcare</h2>
                  <p className="text-emerald-100 text-xs mt-0.5">{billApt.clinic || 'Pushpa Clinic'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-emerald-200">Invoice</p>
                  <p className="font-mono font-bold">{billApt.booking_id}</p>
                </div>
              </div>
            </div>
            
            {/* Patient Info */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Patient</p>
                  <p className="font-semibold text-gray-900">{billApt.patient_name}</p>
                  <p className="text-sm text-gray-500">{billApt.patient_phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(billApt.date || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-gray-500">{billApt.time}</p>
                </div>
              </div>
            </div>
            
            {/* Bill Items */}
            <div className="px-6 py-4">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left pb-2">Description</th>
                    <th className="text-right pb-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {/* Consultation Fee */}
                  <tr className="border-b border-gray-100">
                    <td className="py-3">
                      <p className="font-medium text-gray-900">Consultation Fee</p>
                      <p className="text-xs text-gray-500">
                        {billApt.fee_code === 'N' ? 'New Patient' : billApt.fee_code === 'O' ? 'Old Patient' : billApt.fee_code || 'Standard'}
                      </p>
                    </td>
                    <td className="py-3 text-right font-medium text-gray-900">
                      ₹{config?.fee_codes?.[billApt.doctor]?.[billApt.fee_code]?.amount || billApt.consultation_fee || 700}
                    </td>
                  </tr>
                  
                  {/* Scan/Procedure Fees */}
                  {billApt.scan_codes && billApt.scan_codes.map((code, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-3">
                        <p className="font-medium text-gray-900">
                          {config?.scan_fees?.[code]?.label || code}
                        </p>
                        <p className="text-xs text-gray-500">Procedure/Scan</p>
                      </td>
                      <td className="py-3 text-right font-medium text-gray-900">
                        ₹{config?.scan_fees?.[code]?.amount || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Total */}
              <div className="mt-4 pt-4 border-t-2 border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total Amount</span>
                  <span className="text-2xl font-bold text-green-400">
                    ₹{billApt.total_amount || billApt.consultation_fee || 700}
                  </span>
                </div>
              </div>
              
              {/* Notes & Follow-up */}
              {(billApt.notes || billApt.follow_up_date) && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  {billApt.notes && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 min-w-[50px]">Notes:</span>
                      <span className="text-sm text-gray-800">{billApt.notes}</span>
                    </div>
                  )}
                  {billApt.follow_up_date && (
                    <div className="flex items-center gap-2 bg-violet-50 rounded-lg px-3 py-2">
                      <Calendar className="w-4 h-4 text-violet-400" />
                      <span className="text-sm font-medium text-violet-700">
                        Follow-up: {new Date(billApt.follow_up_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <Button
                onClick={() => sendInvoiceWhatsApp(billApt)}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg h-11"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageCircle className="w-4 h-4 mr-2" />}
                Send via WhatsApp
              </Button>
              <Button
                onClick={() => setShowBillModal(false)}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-800 hover:bg-gray-50 rounded-lg h-11"
              >
                Close
              </Button>
            </div>
            
            {/* Close Button */}
            <button 
              onClick={() => setShowBillModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Leave Manager Modal */}
      {showLeaveManager && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowLeaveManager(false)} />
          <div 
            className="absolute inset-x-4 bottom-0 top-20 rounded-t-3xl overflow-hidden"
            style={{ background: T.surfaceCard, border: `1px solid ${T.surfaceBorder}` }}
          >
            <DoctorLeaveManager 
              doctorToken={localStorage.getItem('doctorToken')}
              doctorName={profile.name}
              onClose={() => setShowLeaveManager(false)}
            />
          </div>
        </div>
      )}

      {/* Clinic Override Modal */}
      {showClinicOverride && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowClinicOverride(false)} />
          <div 
            className="absolute inset-x-4 bottom-0 top-20 rounded-t-3xl overflow-hidden"
            style={{ background: T.surfaceCard, border: `1px solid ${T.surfaceBorder}` }}
          >
            <ClinicOverrideManager 
              doctorToken={localStorage.getItem('doctorToken')}
              onClose={() => setShowClinicOverride(false)}
            />
          </div>
        </div>
      )}

      {/* Token Announcer Modal */}
      {showTokenPanel && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowTokenPanel(false)} />
          <div 
            className="absolute inset-x-4 bottom-0 top-20 rounded-t-3xl overflow-hidden p-4"
            style={{ background: T.surfaceCard, border: `1px solid ${T.surfaceBorder}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold">Token Announcer</h2>
              <button onClick={() => setShowTokenPanel(false)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-white/50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <TokenAnnouncer department="diagyn" />
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPortalRedesigned;
