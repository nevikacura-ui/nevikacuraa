import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Star, MapPin, Video, ArrowLeft, ChevronLeft, ChevronRight, Clock, User, CalendarDays, CreditCard, Shield, Loader2, Stethoscope, Quote, CheckCircle2, MessageCircle, X } from 'lucide-react';
import { ZoomScrollContainer, ZoomSection } from '@/components/ui/ZoomScrollContainer';
import { Button } from '@/components/ui/button';
import { format, addDays, isSunday } from 'date-fns';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRatingPrompt } from '@/components/RatingModal';
import { successPattern } from '@/utils/haptics';
import BottomNav from '@/components/BottomNav';
import ServiceHeader from '@/components/ServiceHeader';
import BookingConfirmation from '@/components/BookingConfirmation';
import CuraPayTransition from '@/components/CuraPayTransition';
import RatingModal from '@/components/RatingModal';
import MembershipLinkBanner from '@/components/MembershipLinkBanner';
import { MangoPromoCard, OrangePromoCard } from '@/components/ServicePromoCards';
import PastVisitRebook from '@/components/PastVisitRebook';
import FamilyMemberPicker from '@/components/FamilyMemberPicker';
import DiaGynTutorial from '@/components/DiaGynTutorial';

// Extracted sub-components
import { THEME, doctors, clinics, CONSULTATION_FEES, API, whyChooseIconMap, DOCTOR_COLORS, DOCTOR_BOOKING_THEMES } from './diagyn/data';
import TopDoctorCard from './diagyn/TopDoctorCard';
import TeleconsultationDisclaimer from './diagyn/TeleconsultationDisclaimer';
import DoctorDetailModal from './diagyn/DoctorDetailModal';
import PatientInfoModal from './diagyn/PatientInfoModal';

// Static data
const testimonials = [
  { name: 'Priya Sharma', text: 'Dr. Vikas helped me manage my diabetes with personalized care. The online consultation was seamless!', rating: 5, service: 'Diabetes', location: 'Naigaon' },
  { name: 'Anjali Desai', text: 'Dr. Neha was incredibly supportive throughout my pregnancy. Highly recommend her expertise!', rating: 5, service: 'Pregnancy Care', location: 'Vasai' },
  { name: 'Rahul Patel', text: 'Excellent experience! The booking process was smooth and the consultation was thorough.', rating: 5, service: 'Follow-up', location: 'Virar' },
  { name: 'Meera Joshi', text: 'Both doctors are amazing. The clinic staff is very friendly and professional.', rating: 5, service: 'PCOD Treatment', location: 'Nalasopara' },
];

const whyChooseUs = [
  { value: '15+ Yrs', label: 'Experience', icon: 'trophy', color: 'from-amber-500 to-amber-700' },
  { value: '20,000+', label: 'Patients Treated', icon: 'users', color: 'from-blue-500 to-blue-700' },
  { value: '4.9/5', label: 'Average Rating', icon: 'sparkles', color: 'from-purple-500 to-purple-700' },
  { value: '24/7', label: 'Online Support', icon: 'clock', color: 'from-teal-500 to-teal-700' },
];

// ============================================
// MAIN DIAGYN COMPONENT
// ============================================
const DiaGynRedesigned = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Intro animation state
  const [showIntro, setShowIntro] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowIntro(false), 2200);
    return () => clearTimeout(t);
  }, []);

  // Auto-select doctor from rebook / deep-link
  useEffect(() => {
    const rebookRaw = sessionStorage.getItem('rebookInfo');
    if (rebookRaw) {
      sessionStorage.removeItem('rebookInfo');
      try {
        const info = JSON.parse(rebookRaw);
        const doc = doctors.find(d => d.name === info.doctor);
        if (doc) {
          setTimeout(() => handleDoctorSelect(doc), 2400);
        }
      } catch {}
    }
  }, []);

  // State
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  
  // Rotate processing text while loading
  useEffect(() => {
    if (!loading) { setProcessingStep(0); return; }
    const interval = setInterval(() => setProcessingStep(p => (p + 1) % 5), 1200);
    return () => clearInterval(interval);
  }, [loading]);
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const { showRating, ratingService, ratingOrderId, triggerRating, dismissRating } = useRatingPrompt();
  const [showCuraPay, setShowCuraPay] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(null);
  const pendingRedirectRef = useRef(null);
  const [curaPayAmount, setCuraPayAmount] = useState(0);
  const handleCuraPayComplete = () => { const url = pendingRedirectRef.current; if (url) window.location.href = url; };
  
  // Doctor picker state (must be before conditional returns)
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);
  const [pickerDoctors, setPickerDoctors] = useState([]);

  // Online consultation state
  const [patientType, setPatientType] = useState('indian');
  const [consultationType, setConsultationType] = useState('consultation');
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  
  // Confirmation step state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingPatientInfo, setPendingPatientInfo] = useState(null);

  // Build Today's Schedule timeline data (must be before any early returns)
  const scheduleTimeline = useMemo(() => {
    const today = new Date();
    const days = [];
    let offset = 0;
    while (days.length < 7 && offset < 14) {
      const date = addDays(today, offset);
      if (!isSunday(date)) {
        const dayName = format(date, 'EEEE');
        let totalSlots = 0;
        let availableDoctors = [];
        doctors.forEach(doc => {
          let docSlots = 0;
          ['pushpa'].forEach(clinicId => {
            const schedule = doc.schedule[clinicId];
            if (schedule) {
              schedule.forEach(s => {
                if (s.days.includes(dayName)) {
                  const [startTime, endTime] = s.time.split('-');
                  const [startH] = startTime.split(':').map(Number);
                  const [endH] = endTime.split(':').map(Number);
                  docSlots += (endH - startH) * 4;
                }
              });
            }
          });
          if (docSlots > 0) {
            totalSlots += docSlots;
            availableDoctors.push(doc.name.replace('Dr. ', '').split(' ')[0]);
          }
        });
        days.push({
          date,
          label: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : format(date, 'EEE'),
          dayNum: format(date, 'd'),
          month: format(date, 'MMM'),
          totalSlots,
          doctors: availableDoctors,
          isToday: offset === 0,
        });
      }
      offset++;
    }
    return days;
  }, []);

  // Handle doctor card click
  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
    const availableClinics = clinics.filter(c => doctor.schedule[c.id]);
    const today = new Date();
    const dayName = format(today, 'EEEE');
    // Default to Pushpa clinic if available
    const pushpaClinic = availableClinics.find(c => c.id === 'pushpa');
    if (pushpaClinic) {
      setSelectedClinic('pushpa');
      const pushpaSchedule = doctor.schedule.pushpa;
      const hasTodaySlots = pushpaSchedule && pushpaSchedule.some(s => s.days.includes(dayName));
      setSelectedDate(hasTodaySlots ? today : null);
    } else {
      const clinicWithTodaySchedule = availableClinics.find(clinic => {
        const schedule = doctor.schedule[clinic.id];
        return schedule && schedule.some(s => s.days.includes(dayName));
      });
      if (clinicWithTodaySchedule) {
        setSelectedClinic(clinicWithTodaySchedule.id);
        setSelectedDate(today);
      } else if (availableClinics.length > 0) {
        setSelectedClinic(availableClinics[0].id);
        setSelectedDate(null);
      }
    }
    setSelectedSlot(null);
    setShowDoctorModal(true);
  };

  // Handle book appointment click
  const handleBookClick = () => {
    if (!selectedSlot) { toast.error('Please select a time slot'); return; }
    if (selectedClinic === 'online' && !hasAcceptedDisclaimer) { setShowDisclaimerModal(true); return; }
    setShowDoctorModal(false);
    setShowPatientModal(true);
  };
  
  const handleDisclaimerAccept = () => {
    setHasAcceptedDisclaimer(true);
    setShowDisclaimerModal(false);
    setShowDoctorModal(false);
    setShowPatientModal(true);
  };

  const handlePatientSubmit = async (info) => {
    setShowPatientModal(false);
    setPendingPatientInfo(info);
    setShowConfirmation(true);
  };

  // Handle confirmed booking
  const handleConfirmedBooking = async () => {
    const info = pendingPatientInfo;
    if (!info) return;
    setLoading(true);

    const MAX_RETRIES = 2;
    let lastError = null;
    const clinic = clinics.find(c => c.id === selectedClinic);
    const isOnlineConsultation = selectedClinic === 'online';
    const isInternational = patientType === 'international';
    
    const getFee = () => {
      if (!isOnlineConsultation) return 0;
      const fees = CONSULTATION_FEES[patientType || 'indian'];
      return fees[consultationType || 'consultation'].fee;
    };
    const consultationFee = getFee();
    const consultationTier = CONSULTATION_FEES[patientType || 'indian'][consultationType || 'consultation'];
    
    // Online consultation → payment
    if (isOnlineConsultation) {
      try {
        const bookingData = {
          doctor: selectedDoctor.name, clinic: clinic.name,
          date: format(selectedDate, 'yyyy-MM-dd'), time: selectedSlot,
          patient_name: info.name, patient_phone: info.phone,
          patient_email: info.email || null, patient_age: info.age || null,
          verification_token: info.verificationToken,
          consultation_fee: consultationFee, consultation_type: consultationType,
          consultation_duration: consultationTier.duration, patient_type: patientType
        };
        
        if (isInternational) {
          const stripeResponse = await axios.post(`${API}/payments/stripe/create-session`, {
            package_id: consultationType, origin_url: window.location.origin,
            patient_name: info.name, patient_phone: info.phone, patient_email: info.email || null,
            doctor_name: selectedDoctor.name, appointment_date: format(selectedDate, 'yyyy-MM-dd'), appointment_time: selectedSlot
          });
          if (!stripeResponse.data?.url) throw new Error('Failed to create Stripe payment session');
          sessionStorage.setItem('pendingOnlineAppointment', JSON.stringify({ ...bookingData, payment_provider: 'stripe', session_id: stripeResponse.data.session_id }));
          toast.info('Redirecting to Stripe payment...');
          window.location.href = stripeResponse.data.url;
          return;
        } else {
          const orderResponse = await axios.post(`${API}/payments/cashfree/create-order`, {
            customer_id: `CUST_${info.phone}`, customer_name: info.name,
            customer_email: info.email || `${info.phone}@patient.nevikacura.com`,
            customer_phone: info.phone, amount: consultationFee, product_type: 'online_consultation',
            product_id: `ONLINE_${Date.now()}`, return_url: `${window.location.origin}/online-appointment-success`
          });
          if (!orderResponse.data?.payment_session_id) throw new Error('Failed to create payment order');
          sessionStorage.setItem('pendingOnlineAppointment', JSON.stringify({ ...bookingData, payment_provider: 'cashfree', order_id: orderResponse.data.order_id }));
          const checkoutUrl = `${window.location.origin}/checkout?session=${orderResponse.data.payment_session_id}&order=${orderResponse.data.order_id}&amount=${consultationFee}&type=online_appointment`;
          setPendingRedirect(checkoutUrl);
          pendingRedirectRef.current = checkoutUrl;
          setCuraPayAmount(consultationFee);
          setShowCuraPay(true);
          return;
        }
      } catch (error) {
        console.error('Payment initialization failed:', error);
        setLoading(false);
        toast.error('Failed to initialize payment. Please try again.');
        setShowPatientModal(true);
        setShowConfirmation(false);
        return;
      }
    }
    
    // In-clinic appointment (free)
    const bookingData = {
      doctor: selectedDoctor.name, clinic: clinic.name,
      date: format(selectedDate, 'yyyy-MM-dd'), time: selectedSlot,
      patient_name: info.name, patient_phone: info.phone,
      patient_email: info.email || null, patient_age: info.age || null,
      verification_token: info.verificationToken,
      email_reminder: !!info.email, payment_method: 'free', cashfree_order_id: null
    };

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios.post(`${API}/appointments`, bookingData, { timeout: 30000 });
        if (!response.data?.booking_id && !response.data?.id) throw new Error('Invalid response - no booking ID received');
        successPattern();
        toast.success('Appointment booked successfully!');
        setBookingDetails({
          orderId: response.data?.booking_id || response.data?.id,
          doctor: selectedDoctor.name, clinic: clinic.name,
          date: format(selectedDate, 'EEEE, MMMM d, yyyy'), time: selectedSlot,
          appointmentCode: response.data?.appointment_code || null,
          patientName: info.name
        });
        setShowConfirmation(false);
        setShowBookingConfirmation(true);
        triggerRating('diagyn', response.data?.appointment_code || '');
        setLoading(false);
        return;
      } catch (error) {
        lastError = error;
        const statusCode = error.response?.status;
        if (statusCode === 400 || statusCode === 409) break;
        if (attempt < MAX_RETRIES) { await new Promise(r => setTimeout(r, 1000 * attempt)); toast.info(`Retrying... (attempt ${attempt + 1})`); }
      }
    }

    setLoading(false);
    const statusCode = lastError?.response?.status;
    let errorMsg = lastError?.response?.data?.detail || 'Booking failed';
    if (statusCode === 400) { 
      if (errorMsg.includes('time slot') && errorMsg.includes('booked')) errorMsg = 'This time slot was just booked. Please select another.'; 
      else if (errorMsg.includes('past')) errorMsg = 'This time slot has passed. Please select a future time.';
      // For duplicate booking / same doctor same date — show actual backend message
    }
    else if (statusCode === 500 || !lastError?.response) errorMsg = 'Unable to complete booking. Please try again.';
    else if (statusCode === 409) errorMsg = 'This slot is no longer available. Please refresh and select another.';
    toast.error(errorMsg, { duration: 5000 });
    setShowConfirmation(false);
    setShowPatientModal(true);
  };

  if (showBookingConfirmation && bookingDetails) {
    return (
      <BookingConfirmation type="diagyn" paymentMethod="free" orderDetails={{
        orderId: bookingDetails.orderId, trackingPath: '/my-appointments',
        doctor: bookingDetails.doctor, clinic: bookingDetails.clinic,
        date: bookingDetails.date, time: bookingDetails.time, appointmentCode: bookingDetails.appointmentCode,
        patientName: bookingDetails.patientName
      }} />
    );
  }

  // Pre-booking confirmation review
  if (showConfirmation && pendingPatientInfo && selectedDoctor) {
    const clinic = clinics.find(c => c.id === selectedClinic);
    const isOnline = selectedClinic === 'online';
    const dayName = selectedDate ? format(selectedDate, 'EEE').toUpperCase() : '';
    const dayNum = selectedDate ? format(selectedDate, 'd') : '';
    const monthName = selectedDate ? format(selectedDate, 'MMMM').toUpperCase() : '';
    const yearStr = selectedDate ? format(selectedDate, 'yyyy') : '';
    const fullDay = selectedDate ? format(selectedDate, 'EEEE') : '';
    const confirmTheme = DOCTOR_BOOKING_THEMES[selectedDoctor?.id] || DOCTOR_BOOKING_THEMES.vikas;

    /* Glassmorphism helpers */
    const glassBg = 'rgba(255,255,255,0.06)';
    const glassBorder = 'rgba(255,255,255,0.1)';
    const GlassCard = ({ children, style = {}, className = '', testId }) => (
      <div className={`rounded-[20px] p-4 ${className}`} style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', ...style }} data-testid={testId}>{children}</div>
    );
    const GlassIcon = ({ children, style = {} }) => (
      <div className="w-14 h-14 rounded-[18px] flex items-center justify-center flex-shrink-0" style={{ background: `${confirmTheme.accent}18`, border: `1px solid ${confirmTheme.accent}30`, backdropFilter: 'blur(8px)', ...style }}>{children}</div>
    );

    return (
      <div className="fixed inset-0 z-[10000] flex flex-col overflow-hidden" style={{ background: confirmTheme.darkBg || confirmTheme.confirmGradient }} data-testid="booking-confirmation-review">
        <style>{`
          @keyframes cfmUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
          .cfm-up { animation: cfmUp .4s cubic-bezier(0.22,1,0.36,1) both; }
          .cfm-up-2 { animation: cfmUp .4s cubic-bezier(0.22,1,0.36,1) .08s both; }
          .cfm-up-3 { animation: cfmUp .4s cubic-bezier(0.22,1,0.36,1) .15s both; }
        `}</style>

        <div className="w-full h-full overflow-y-auto max-w-lg mx-auto relative">
          {/* Header on dark gradient */}
          <div className="relative px-5 pt-5 pb-2 cfm-up">
            <button onClick={() => { setShowConfirmation(false); setShowPatientModal(true); }} className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} data-testid="confirm-back-btn">
              <ArrowLeft className="w-5 h-5 text-white/70" />
            </button>
          </div>
          <div className="relative text-center px-5 pt-1 pb-5 cfm-up-2">
            <div className="w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-3" style={{
              background: `${confirmTheme.accent}15`,
              border: `1.5px solid ${confirmTheme.accent}30`,
              backdropFilter: 'blur(12px)',
              boxShadow: `0 0 32px ${confirmTheme.accent}15`,
            }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: confirmTheme.accent }} />
            </div>
            <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Confirm Booking</h2>
            <p className="text-white/50 mt-1 text-xs">Review your appointment details</p>
          </div>

          {/* Content — glassmorphic cards */}
          <div className="px-5 pt-1 pb-36 space-y-3 cfm-up-3">
            {/* Date/Time — Bright accent card */}
            <div className="rounded-[20px] p-4" style={{
              background: confirmTheme.ctaGradient,
              boxShadow: `0 8px 32px ${confirmTheme.ctaShadow}`,
            }} data-testid="confirm-datetime-card">
              <div className="flex gap-4 items-center">
                <div className="w-[68px] h-[68px] rounded-[18px] flex flex-col items-center justify-center" style={{
                  background: 'rgba(255,255,255,0.18)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  backdropFilter: 'blur(8px)',
                }}>
                  <span className="text-[10px] font-bold tracking-wide" style={{ color: confirmTheme.ctaText ? `${confirmTheme.ctaText}99` : 'rgba(255,255,255,0.6)' }}>{dayName}</span>
                  <span className="text-[28px] font-black leading-none" style={{ color: confirmTheme.ctaText || '#fff' }}>{dayNum}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base" style={{ color: confirmTheme.ctaText || '#fff' }}>{fullDay}</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: confirmTheme.ctaText ? `${confirmTheme.ctaText}90` : 'rgba(255,255,255,0.65)' }}>{monthName} {yearStr}</p>
                  <p className="text-lg font-black mt-1" style={{ color: confirmTheme.ctaText || '#fff' }}>{selectedSlot || 'Time not set'}</p>
                </div>
                <CalendarDays className="w-5 h-5 flex-shrink-0" style={{ color: confirmTheme.ctaText ? `${confirmTheme.ctaText}40` : 'rgba(255,255,255,0.25)' }} />
              </div>
            </div>

            {/* Doctor */}
            <GlassCard testId="confirm-details-card">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-[18px] overflow-hidden flex-shrink-0 ring-2 shadow-md" style={{ '--tw-ring-color': `${confirmTheme.accent}30` }}>
                  <img loading="lazy" src={selectedDoctor.image} alt={selectedDoctor.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] leading-tight text-white">{selectedDoctor.name}</p>
                  <p className="text-white/60 text-[11px] font-medium mt-0.5">{selectedDoctor.specialty}</p>
                </div>
                <Stethoscope className="w-4 h-4 text-white/20 flex-shrink-0" />
              </div>
            </GlassCard>

            {/* Clinic */}
            <GlassCard>
              <div className="flex items-center gap-3.5">
                <GlassIcon>
                  {isOnline ? <Video className="w-5 h-5" style={{ color: confirmTheme.accent }} /> : <MapPin className="w-5 h-5" style={{ color: confirmTheme.accent }} />}
                </GlassIcon>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] leading-tight text-white">{clinic?.name}</p>
                  <p className="text-white/60 text-[11px] font-medium mt-0.5 leading-snug">{clinic?.address}</p>
                </div>
              </div>
            </GlassCard>

            {/* Patient */}
            <GlassCard>
              <div className="flex items-center gap-3.5">
                <GlassIcon>
                  <User className="w-5 h-5" style={{ color: confirmTheme.accent }} />
                </GlassIcon>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] leading-tight text-white">{pendingPatientInfo.name}</p>
                  <p className="text-white/60 text-[11px] font-medium mt-0.5">{pendingPatientInfo.phone}</p>
                </div>
                <Shield className="w-4 h-4 text-white/20 flex-shrink-0" />
              </div>
            </GlassCard>

            {/* Payment (Online) */}
            {isOnline && (
              <GlassCard>
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-[18px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', backdropFilter: 'blur(8px)' }}>
                    <CreditCard className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-[15px] text-white">Consultation Fee</p><p className="text-white/60 text-[11px] font-medium mt-0.5">Payment next</p></div>
                  <span className="font-black text-lg flex-shrink-0 text-white">{'\u20B9'}{CONSULTATION_FEES[patientType || 'indian'][consultationType || 'consultation'].fee}</span>
                </div>
              </GlassCard>
            )}

            {/* Pay at clinic pill */}
            {!isOnline && (
              <div className="py-3 px-5 rounded-full flex items-center gap-2.5" style={{ background: `${confirmTheme.accent}12`, border: `1px solid ${confirmTheme.accent}25` }}>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: confirmTheme.accent, boxShadow: `0 0 8px ${confirmTheme.accent}60` }} />
                <p className="text-sm font-bold" style={{ color: confirmTheme.accent }}>Pay at clinic · No advance payment</p>
              </div>
            )}

            {/* CTA */}
            <button onClick={handleConfirmedBooking} disabled={loading}
              className="w-full py-4 rounded-full text-base font-black flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-50 mt-2"
              style={{ background: confirmTheme.ctaGradient, color: confirmTheme.ctaText || '#fff', boxShadow: `0 8px 32px ${confirmTheme.ctaShadow}` }}
              data-testid="confirm-booking-btn">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {isOnline ? 'Proceed to Payment' : 'Confirm Booking'}
            </button>
          </div>
        </div>

        {/* Processing overlay */}
        {loading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'rgba(10,15,10,0.95)', backdropFilter: 'blur(16px)' }} data-testid="booking-processing-overlay">
            <style>{`
              @keyframes procPulse { 0%,100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.15); opacity: 1; } }
              @keyframes procSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes procDot { 0%,80%,100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.2); } }
              @keyframes procTextIn { 0% { opacity: 0; transform: translateY(8px); } 30% { opacity: 1; transform: translateY(0); } 80% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-6px); } }
            `}</style>
            <div className="mb-10 h-6 flex items-center justify-center">
              <p key={processingStep} className="text-sm font-medium tracking-wide text-white/60" style={{ animation: 'procTextIn 1.2s ease-in-out both', fontFamily: 'Outfit, sans-serif' }}>
                {['Checking doctor availability...','Reserving your time slot...','Sending confirmation to clinic...','Setting up notifications...','Almost done, finalizing...'][processingStep]}
              </p>
            </div>
            <div className="relative mb-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: `${confirmTheme.accent}14`, border: `2px solid ${confirmTheme.accent}33`, animation: 'procPulse 2s ease-in-out infinite' }}>
                <div style={{ animation: 'procSpin 1.5s linear infinite' }}><Loader2 className="w-10 h-10" style={{ color: confirmTheme.accent }} /></div>
              </div>
            </div>
            <p className="font-bold text-lg mb-1 text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Confirming your appointment</p>
            <p className="text-white/50 text-xs mt-1 mb-5">Please wait, do not go back</p>
            <div className="flex gap-2">{[0,1,2].map(i => (<div key={i} className="w-2 h-2 rounded-full" style={{ background: confirmTheme.accent, animation: `procDot 1.4s ease-in-out ${i * 0.2}s infinite` }} />))}</div>
          </div>
        )}
      </div>
    );
  }

  const handleDayClick = (day) => {
    if (day.totalSlots === 0) return;
    // Find all available doctors for this day
    const dayName = format(day.date, 'EEEE');
    const available = doctors.filter(doc => {
      let hasSlots = false;
      ['pushpa'].forEach(clinicId => {
        const schedule = doc.schedule[clinicId];
        if (schedule) {
          schedule.forEach(s => {
            if (s.days.includes(dayName)) hasSlots = true;
          });
        }
      });
      return hasSlots;
    });
    if (available.length === 1) {
      handleDoctorSelect(available[0]);
    } else if (available.length > 1) {
      setPickerDoctors(available);
      setShowDoctorPicker(true);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F2' }}>
      {/* DARK SECTION — Hero area with warm hue transition at boundary */}
      <div style={{ background: 'linear-gradient(180deg, #050510 0%, #0B1220 85%, #1A1418 91%, #3D2E2A 94%, #9E8A7D 97%, #D8CCC4 99%, #F5F5F2 100%)' }}>
      <ServiceHeader />

      {/* Ad Banner — top of page */}
      <div className="max-w-5xl mx-auto px-4 pt-3 pb-1">
        <div className="rounded-2xl overflow-hidden shadow-lg" data-testid="diagyn-ad-banner">
          <img src="https://customer-assets.emergentagent.com/job_33550bff-be33-4f96-8c06-b3892ff115da/artifacts/eahve6ha_file_000000002bc071faa39418c13b0ae0e4.png" alt="DiaGyn Healthcare - Book your Doctor Anytime Anywhere" className="w-full h-auto" loading="lazy" />
        </div>
      </div>

      {/* How to Book — Big Interactive Card with 3 animated steps */}
      <div className="px-4 pt-2 pb-1">
        <button
          onClick={() => setShowTutorial(true)}
          className="w-full rounded-[22px] p-4 active:scale-[0.97] transition-all group overflow-hidden relative"
          style={{
            background: 'linear-gradient(145deg, rgba(6,182,212,0.20) 0%, rgba(14,116,144,0.30) 40%, rgba(6,182,212,0.14) 100%)',
            border: '1.5px solid rgba(6,182,212,0.35)',
            boxShadow: '0 0 25px rgba(6,182,212,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
          data-testid="how-to-book-banner"
        >
          <style>{`
            @keyframes dgFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
            @keyframes dgDot{0%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}100%{opacity:0.3;transform:scale(0.8)}}
          `}</style>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)', boxShadow: '0 4px 16px rgba(6,182,212,0.5)', animation: 'dgFloat 3s ease-in-out infinite' }}>
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-base font-black text-white block leading-tight tracking-tight">How to Book</span>
              <span className="text-[11px] text-cyan-300/60 font-medium">Book consultations in 3 simple steps</span>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.25)', border: '1px solid rgba(6,182,212,0.3)' }}>
              <svg className="w-4 h-4 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[
              { icon: '👩‍⚕️', text: 'Select Doctor' },
              { icon: '🗓️', text: 'Choose Date' },
              { icon: '✅', text: 'Confirm Booking' },
            ].map((s, i) => (
              <React.Fragment key={i}>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                  style={{ background: `rgba(6,182,212,${0.08 + i * 0.04})`, border: '1px solid rgba(6,182,212,0.15)' }}>
                  <span className="text-sm">{s.icon}</span>
                  <span className="text-[10px] font-bold text-cyan-300/80">{s.text}</span>
                </div>
                {i < 2 && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#06B6D4', opacity: 0.4, animation: `dgDot ${2 + i * 0.3}s ease-in-out infinite` }} />}
              </React.Fragment>
            ))}
          </div>
        </button>
      </div>

      {/* NeonLine Intro Animation: Lady choosing date on calendar with tick */}
      {showIntro && (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center" style={{ background: '#0A0A0F' }} data-testid="diagyn-intro-animation">
          {/* Ambient glow */}
          <div className="absolute rounded-full pointer-events-none" style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(6,182,212,0.14) 0%, rgba(8,145,178,0.06) 40%, transparent 70%)', filter: 'blur(60px)', animation: 'blGlowPulse 3s ease-in-out infinite' }} />
          <style>{`
            @keyframes nlFadeOut { 0% { opacity:1; } 100% { opacity:0; pointer-events:none; } }
            @keyframes nlPop { 0% { transform:scale(0.85); opacity:0; } 100% { transform:scale(1); opacity:1; } }
            @keyframes nlDotPulse { 0%,100% { opacity:0.2; } 50% { opacity:0.8; } }
            @keyframes blGlowPulse { 0%,100% { opacity:0.6; transform:scale(1); } 50% { opacity:1; transform:scale(1.15); } }
            .nl-exit { animation: nlFadeOut 0.35s ease-in 2s forwards; }
            .nl-pop { animation: nlPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
          `}</style>
          <div className="nl-exit flex flex-col items-center">
            <div className="nl-pop relative" style={{ width: 260, height: 280 }}>
              <svg viewBox="0 0 260 280" className="w-full h-full">
                <defs>
                  <linearGradient id="nlCalHead" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0891B2" /><stop offset="100%" stopColor="#0E7490" /></linearGradient>
                  <filter id="nlGlow"><feGaussianBlur stdDeviation="3.5" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
                </defs>
                {/* Calendar */}
                <g filter="url(#nlGlow)" transform="translate(10,15)">
                  <rect x="0" y="0" width="148" height="180" rx="10" fill="rgba(6,182,212,0.03)" stroke="#06B6D4" strokeWidth="1.2" opacity="0.8" />
                  <rect x="0" y="0" width="148" height="34" rx="10" fill="url(#nlCalHead)" opacity="0.3" />
                  <rect x="0" y="28" width="148" height="8" fill="url(#nlCalHead)" opacity="0.3" />
                  <rect x="32" y="-4" width="3" height="16" rx="1.5" fill="#06B6D4" opacity="0.6" />
                  <rect x="72" y="-4" width="3" height="16" rx="1.5" fill="#06B6D4" opacity="0.6" />
                  <rect x="112" y="-4" width="3" height="16" rx="1.5" fill="#06B6D4" opacity="0.6" />
                  <rect x="28" y="11" width="55" height="5" rx="2.5" fill="rgba(255,255,255,0.35)" />
                  {['M','T','W','T','F','S','S'].map((d,i) => (
                    <text key={i} x={12+i*19} y="50" textAnchor="middle" fill="rgba(6,182,212,0.3)" fontSize="7" fontFamily="sans-serif" fontWeight="600">{d}</text>
                  ))}
                  {[0,1,2,3,4].map(r => [0,1,2,3,4,5,6].map(c => {
                    const n=r*7+c+1; if(n>31) return null;
                    const cx=12+c*19, cy=65+r*24, sel=n===15;
                    return (
                      <g key={n}>
                        {sel && <circle cx={cx} cy={cy} r="9" fill="rgba(6,182,212,0.06)" stroke="#06B6D4" strokeWidth="1" opacity="0"><animate attributeName="opacity" values="0;0;0.8;0.8" dur="2.5s" repeatCount="indefinite" keyTimes="0;0.35;0.45;1"/></circle>}
                        <text x={cx} y={cy+3} textAnchor="middle" fill={sel?'#06B6D4':'rgba(255,255,255,0.1)'} fontSize="8" fontFamily="sans-serif" fontWeight={sel?'700':'400'}>{n}{sel && <animate attributeName="fill" values="rgba(255,255,255,0.1);rgba(255,255,255,0.1);#06B6D4;#06B6D4" dur="2.5s" repeatCount="indefinite" keyTimes="0;0.35;0.45;1"/>}</text>
                      </g>
                    );
                  }))}
                  {/* Tick */}
                  <g transform="translate(120,155)">
                    <circle r="14" fill="rgba(6,182,212,0.08)" stroke="#06B6D4" strokeWidth="1.6" opacity="0"><animate attributeName="opacity" values="0;0;1;1" dur="2.5s" repeatCount="indefinite" keyTimes="0;0.5;0.6;1"/></circle>
                    <path d="M-5,1 L-2,4.5 L6,-4" fill="none" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="20" strokeDashoffset="20"><animate attributeName="stroke-dashoffset" values="20;20;0;0" dur="2.5s" repeatCount="indefinite" keyTimes="0;0.55;0.7;1"/></path>
                    <circle r="14" fill="none" stroke="#06B6D4" strokeWidth="0.8" opacity="0"><animate attributeName="r" values="14;26;26" dur="2.5s" repeatCount="indefinite" keyTimes="0;0.85;1"/><animate attributeName="opacity" values="0;0;0.3;0" dur="2.5s" repeatCount="indefinite" keyTimes="0;0.6;0.7;0.9"/></circle>
                  </g>
                </g>
                {/* Lady */}
                <g filter="url(#nlGlow)" transform="translate(168,25)">
                  <ellipse cx="38" cy="12" rx="16" ry="18" fill="none" stroke="#06B6D4" strokeWidth="1.1" opacity="0.45" />
                  <path d="M22,18 Q16,28 20,38" stroke="#06B6D4" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.35" />
                  <circle cx="38" cy="20" r="13" fill="rgba(6,182,212,0.02)" stroke="#06B6D4" strokeWidth="1.2" opacity="0.65" />
                  <circle cx="33" cy="18" r="1.5" fill="#06B6D4" opacity="0.55" /><circle cx="41" cy="18" r="1.5" fill="#06B6D4" opacity="0.55" />
                  <path d="M33,25 Q38,29 43,25" fill="none" stroke="#06B6D4" strokeWidth="0.8" strokeLinecap="round" opacity="0.45" />
                  <rect x="34" y="32" width="8" height="7" rx="3" fill="none" stroke="#06B6D4" strokeWidth="0.9" opacity="0.35" />
                  <path d="M20,39 Q16,82 14,120 L62,120 Q60,82 56,39 Z" fill="rgba(6,182,212,0.02)" stroke="#06B6D4" strokeWidth="1.2" opacity="0.55" />
                  <g><path d="M20,50 L-4,68 L-14,64" fill="none" stroke="#06B6D4" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"><animate attributeName="d" values="M20,50 L6,60 L0,57;M20,50 L-4,68 L-14,64;M20,50 L-4,68 L-14,64" dur="2.5s" repeatCount="indefinite" keyTimes="0;0.4;1"/></path><circle r="2.5" fill="rgba(6,182,212,0.1)" stroke="#06B6D4" strokeWidth="0.8" opacity="0"><animate attributeName="opacity" values="0;0.5;0.5" dur="2.5s" repeatCount="indefinite" keyTimes="0;0.4;1"/><animate attributeName="cx" values="0;-14;-14" dur="2.5s" repeatCount="indefinite" keyTimes="0;0.4;1"/><animate attributeName="cy" values="57;64;64" dur="2.5s" repeatCount="indefinite" keyTimes="0;0.4;1"/></circle></g>
                  <path d="M56,50 L68,74 L66,88" fill="none" stroke="#06B6D4" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
                  <line x1="30" y1="120" x2="26" y2="172" stroke="#06B6D4" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
                  <line x1="46" y1="120" x2="50" y2="172" stroke="#06B6D4" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
                  <ellipse cx="25" cy="175" rx="6" ry="3" fill="none" stroke="#06B6D4" strokeWidth="0.9" opacity="0.35" />
                  <ellipse cx="51" cy="175" rx="6" ry="3" fill="none" stroke="#06B6D4" strokeWidth="0.9" opacity="0.35" />
                </g>
                {/* Particles */}
                {[40,160,240].map((a,i) => { const r=(a*Math.PI)/180; return <circle key={i} cx={130+Math.cos(r)*115} cy={130+Math.sin(r)*100} r="1.8" fill="#06B6D4" opacity="0.12"><animate attributeName="opacity" values="0.06;0.22;0.06" dur={`${2.2+i*0.5}s`} repeatCount="indefinite"/></circle>; })}
                <line x1="15" y1="235" x2="248" y2="235" stroke="rgba(6,182,212,0.06)" strokeWidth="0.7" />
              </svg>
            </div>
            <p className="text-white/80 text-[14px] font-semibold tracking-wide mt-3" style={{ fontFamily: 'Outfit, sans-serif', animation: 'nlPop 0.4s ease-out 0.3s both' }}>DiaGyn Healthcare</p>
            <div className="flex gap-2 mt-3">
              {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#06B6D4', animation: `nlDotPulse 1.2s ease-in-out ${i*0.15}s infinite` }}/>)}
            </div>
          </div>
        </div>
      )}

      {/* Doctor Picker Wheel Overlay */}
      {showDoctorPicker && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setShowDoctorPicker(false)}>
          <style>{`
            @keyframes wheelPopIn { from { opacity:0; transform:translateY(60px) scale(0.8); } to { opacity:1; transform:translateY(0) scale(1); } }
            @keyframes orbFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
          `}</style>
          <div className="w-full max-w-md pb-12 pt-8 px-6" style={{ animation: 'wheelPopIn 0.35s cubic-bezier(0.22,1,0.36,1)' }} onClick={e => e.stopPropagation()}>
            <p className="text-center text-white/50 text-xs font-semibold uppercase tracking-widest mb-6">Choose Doctor</p>
            <div className="flex justify-center gap-6 flex-wrap">
              {pickerDoctors.map((doc, i) => {
                const colors = DOCTOR_COLORS[doc.id] || DOCTOR_COLORS.vikas;
                return (
                  <button key={doc.id}
                    onClick={() => { setShowDoctorPicker(false); handleDoctorSelect(doc); }}
                    className="flex flex-col items-center gap-2 transition-all active:scale-90"
                    style={{ animation: `wheelPopIn 0.35s cubic-bezier(0.22,1,0.36,1) ${i * 80}ms both` }}
                    data-testid={`picker-doctor-${doc.id}`}>
                    <div className="w-20 h-20 rounded-full p-[3px] relative" style={{ background: colors.bg, animation: `orbFloat 3s ease-in-out ${i * 0.4}s infinite`, boxShadow: `0 8px 32px ${colors.bg}60` }}>
                      <img src={doc.image} alt={doc.name} className="w-full h-full rounded-full object-cover" />
                    </div>
                    <span className="text-white text-xs font-semibold">{doc.name.replace('Dr. ', '')}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowDoctorPicker(false)} className="mt-8 mx-auto flex items-center justify-center w-12 h-12 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>
      )}

      {/* Hero — inside dark section */}
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-6">
        <div className="text-center mb-2">
          <div className="mb-5 flex flex-col items-center">
            <img loading="lazy" src="https://customer-assets.emergentagent.com/job_4625448c-b743-44eb-9c92-5eb654622ad3/artifacts/mo04g1pk_file_0000000032dc720798054d00d20ce907%20%281%29.png" alt="DiaGyn" className="h-24 md:h-32 w-auto object-contain" style={{ mixBlendMode: 'screen', filter: 'contrast(1.3) brightness(1.1)' }} data-testid="diagyn-logo" />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mt-2" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.15)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
              <span className="text-[10px] text-teal-400/80 font-medium tracking-wide">A Nevika Cura Company</span>
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Book Your Doctor<br/><span style={{ color: '#E11D48' }}>Any Time</span> <span style={{ color: '#06B6D4' }}>Any Where!</span></h1>
          <p className="text-slate-400 max-w-sm mx-auto relative z-10" style={{ fontFamily: 'DM Sans, sans-serif' }}>Expert consultations at your fingertips. Select from our trusted doctors and book instantly.</p>
        </div>
      </div>

      </div>{/* END DARK SECTION */}

      <main className="max-w-5xl mx-auto px-4 py-6 pb-20">
        <ZoomScrollContainer mode="smooth">

        {/* Today's Schedule Mini-Timeline — LIGHT SECTION STARTS HERE */}
        <ZoomSection>
        <div className="mb-6" data-testid="todays-schedule-timeline">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-gray-600" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Upcoming Schedule</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {scheduleTimeline.map((day, i) => (
              <button
                key={i}
                onClick={() => handleDayClick(day)}
                className="flex-shrink-0 rounded-2xl p-3 min-w-[80px] text-center transition-all hover:scale-105 active:scale-95"
                style={{
                  background: day.isToday
                    ? 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(20,184,166,0.05))'
                    : '#fff',
                  border: day.isToday
                    ? '1.5px solid rgba(20,184,166,0.35)'
                    : '1.5px solid #E5E7EB',
                  opacity: day.totalSlots === 0 ? 0.45 : 1,
                }}
                data-testid={`schedule-day-${i}`}
              >
                <p className={`text-[10px] font-bold uppercase tracking-wide ${day.isToday ? 'text-teal-600' : 'text-gray-400'}`}>
                  {day.label}
                </p>
                <p className="text-xl font-black text-gray-900 mt-0.5">{day.dayNum}</p>
                <p className="text-[9px] text-gray-400">{day.month}</p>
                {day.totalSlots > 0 ? (
                  <div className="mt-1.5 flex items-center justify-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-medium text-emerald-600">{day.totalSlots} slots</span>
                  </div>
                ) : (
                  <p className="mt-1.5 text-[9px] text-gray-400">No slots</p>
                )}
                {day.totalSlots > 0 && day.totalSlots <= 5 && (
                  <span className="mt-1 inline-block text-[8px] font-bold text-amber-500 animate-pulse">Hurry!</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Doctors */}
        </ZoomSection>
        <ZoomSection>
        <div className="mb-8">
          {/* WhatsApp alternative - above doctor cards */}
          <a href="https://wa.me/918108888330?text=Hi%2C%20I%20want%20to%20book%20an%20appointment%20at%20DiaGyn"
             target="_blank" rel="noopener noreferrer"
             className="flex items-center justify-center gap-2 mb-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
             style={{ background: 'linear-gradient(135deg, #f97316 0%, #fdba74 35%, #e0f2fe 55%, #06b6d4 100%)', color: '#1e293b', boxShadow: '0 6px 18px rgba(249,115,22,0.25)' }}
             data-testid="diagyn-whatsapp-booking-cta">
            <MessageCircle className="w-4 h-4" />
            Prefer to chat? Book via WhatsApp
          </a>

          <h2 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Top Doctors</h2>
          <PastVisitRebook phone={user?.phone || localStorage.getItem('userPhone')} onRebook={({ doctor: docName }) => { const doc = doctors.find(d => d.name === docName); if (doc) handleDoctorSelect(doc); }} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctors.map((doctor, idx) => (<TopDoctorCard key={doctor.id} doctor={doctor} onSelect={handleDoctorSelect} index={idx} />))}
          </div>
        </div>

        {/* Testimonials */}
        </ZoomSection>
        <ZoomSection>
        <div className="px-4 py-4" data-testid="diagyn-testimonials">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Quote className="w-4 h-4 text-teal-500" />Patient Stories</h3>
              <div className="flex gap-1">{testimonials.map((_, i) => (<button key={i} onClick={() => setTestimonialIdx(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === testimonialIdx ? 'bg-teal-500 w-4' : 'bg-gray-300'}`} />))}</div>
            </div>
            <div className="flex items-center gap-1 mb-2">{[...Array(testimonials[testimonialIdx].rating)].map((_, i) => (<Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />))}</div>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">"{testimonials[testimonialIdx].text}"</p>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-semibold text-gray-900">{testimonials[testimonialIdx].name}</p><p className="text-xs text-gray-400">{testimonials[testimonialIdx].location}</p></div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 text-teal-600 border border-teal-200">{testimonials[testimonialIdx].service}</span>
            </div>
          </div>
        </div>

        <div className="px-4 pb-6 space-y-4"><MangoPromoCard /><OrangePromoCard /></div>

        {/* CuraCard Banner */}
        <MembershipLinkBanner className="pb-4" />

        {/* Why Choose */}
        </ZoomSection>
        <ZoomSection>
        <div className="px-4 pb-8" data-testid="why-choose-diagyn">
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center" style={{ fontFamily: 'Outfit, sans-serif' }}>Why Choose DiaGyn?</h2>
          <div className="grid grid-cols-2 gap-3">
            {whyChooseUs.map((item, idx) => {
              const IconComp = whyChooseIconMap[item.icon] || whyChooseIconMap.trophy;
              return (
                <div key={idx} className="p-4 bg-white rounded-2xl border border-gray-100 text-center shadow-sm">
                  <div className={`w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}><IconComp className="w-5 h-5 text-white" /></div>
                  <p className="text-lg font-bold text-gray-900">{item.value}</p>
                  <p className="text-xs text-gray-400">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
        </ZoomSection>
        </ZoomScrollContainer>
      </main>

      {/* Modals */}
      <DoctorDetailModal doctor={selectedDoctor} isOpen={showDoctorModal} onClose={() => setShowDoctorModal(false)} selectedClinic={selectedClinic} onClinicChange={setSelectedClinic} selectedDate={selectedDate} onDateSelect={setSelectedDate} selectedSlot={selectedSlot} onSlotSelect={setSelectedSlot} onBookAppointment={handleBookClick} loading={loading} patientType={patientType} onPatientTypeChange={setPatientType} consultationType={consultationType} onConsultationTypeChange={setConsultationType} />
      <TeleconsultationDisclaimer isOpen={showDisclaimerModal} onClose={() => setShowDisclaimerModal(false)} onAccept={handleDisclaimerAccept} />
      <PatientInfoModal isOpen={showPatientModal} onClose={() => setShowPatientModal(false)} onSubmit={handlePatientSubmit} loading={loading} isOnlineConsultation={selectedClinic === 'online'} doctorTheme={DOCTOR_BOOKING_THEMES[selectedDoctor?.id]} bookingContext={{ doctor: selectedDoctor, clinic: selectedClinic, date: selectedDate, slot: selectedSlot }} />
      <BottomNav />
      <RatingModal isOpen={showRating} onClose={dismissRating} service={ratingService} orderId={ratingOrderId} />
      <CuraPayTransition visible={showCuraPay} amount={curaPayAmount} onComplete={handleCuraPayComplete} />

      {/* DiaGyn Tutorial - Frosted Reveal */}
      <DiaGynTutorial open={showTutorial} onClose={() => setShowTutorial(false)} />
    </div>
  );
};

export default DiaGynRedesigned;
