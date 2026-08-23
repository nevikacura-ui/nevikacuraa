import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Star, MapPin, Video, Loader2, CreditCard, CalendarDays, User, ArrowLeftRight, Phone, Clock, Award, MessageCircle, ArrowRight, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSunday, isToday, addMonths, subMonths, addDays, getDay } from 'date-fns';
import axios from 'axios';
import { selectionTap } from '@/utils/haptics';
import { clinics, CONSULTATION_FEES, API, DOCTOR_BOOKING_THEMES } from './data';

/* ─── Swipe-to-Book Slider ─── */
const SwipeToBook = ({ onConfirm, loading, theme, label = 'Swipe to book...' }) => {
  const trackRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const thumbSize = 56;

  const getMaxX = () => {
    if (!trackRef.current) return 200;
    return trackRef.current.offsetWidth - thumbSize - 8;
  };

  const handleStart = (clientX) => {
    if (confirmed || loading) return;
    setDragging(true);
  };

  const handleMove = (clientX) => {
    if (!dragging || confirmed || loading) return;
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(clientX - rect.left - thumbSize / 2 - 4, getMaxX()));
    setDragX(x);
  };

  const handleEnd = () => {
    if (!dragging || confirmed) return;
    setDragging(false);
    if (dragX >= getMaxX() * 0.75) {
      setDragX(getMaxX());
      setConfirmed(true);
      selectionTap();
      setTimeout(() => onConfirm(), 300);
    } else {
      setDragX(0);
    }
  };

  return (
    <div
      ref={trackRef}
      className="relative h-[64px] rounded-full overflow-hidden select-none touch-none"
      style={{ background: isDarkTheme(theme) ? 'rgba(255,255,255,0.08)' : '#E5E7EB', border: `1px solid ${isDarkTheme(theme) ? 'rgba(255,255,255,0.1)' : '#D1D5DB'}` }}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
      data-testid="swipe-to-book"
    >
      {/* Progress fill */}
      <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: dragX + thumbSize + 8, background: `${theme.accent}25`, transition: dragging ? 'none' : 'width 0.3s ease' }} />
      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-sm font-bold tracking-wide" style={{ color: isDarkTheme(theme) ? 'rgba(255,255,255,0.5)' : '#9CA3AF', opacity: confirmed ? 0 : 1 - (dragX / (getMaxX() || 1)) * 0.7 }}>
          {confirmed ? 'Booking...' : label}
        </span>
      </div>
      {/* Thumb */}
      <div
        className="absolute top-1 flex items-center justify-center rounded-full"
        style={{
          width: thumbSize, height: thumbSize,
          left: dragX + 4,
          background: confirmed ? '#7ED321' : theme.accent,
          boxShadow: `0 4px 16px ${theme.accent}50`,
          transition: dragging ? 'none' : 'left 0.3s ease, background 0.3s',
          cursor: loading ? 'wait' : 'grab',
        }}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#0D1F1E' }} /> : <ArrowRight className="w-5 h-5" style={{ color: '#0D1F1E' }} />}
      </div>
    </div>
  );
};

const isDarkTheme = (theme) => theme.isDarkCards === true;

/* ─── Main Modal ─── */
const DoctorDetailModal = ({ 
  doctor, isOpen, onClose, selectedClinic, onClinicChange,
  selectedDate, onDateSelect, selectedSlot, onSlotSelect,
  onBookAppointment, loading, patientType, onPatientTypeChange,
  consultationType, onConsultationTypeChange
}) => {
  const [activeTab, setActiveTab] = useState('schedules');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [clinicOverrides, setClinicOverrides] = useState([]);
  const [timeFilter, setTimeFilter] = useState('Morning');

  const theme = DOCTOR_BOOKING_THEMES[doctor?.id] || DOCTOR_BOOKING_THEMES.vikas;
  const isDark = isDarkTheme(theme);

  useEffect(() => {
    axios.get(`${API}/clinic-override/active`).then(res => {
      setClinicOverrides(res.data.overrides || []);
    }).catch(() => {});
  }, []);

  const getCurrentFee = () => {
    if (selectedClinic !== 'online') return null;
    const fees = CONSULTATION_FEES[patientType || 'indian'];
    if (!fees) return null;
    return fees[consultationType || 'consultation'] || fees.consultation;
  };

  const currentFee = getCurrentFee();
  const calendarDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const availableClinics = clinics.filter(clinic => doctor?.schedule?.[clinic.id]);
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  // Auto-select first available date
  useEffect(() => {
    if (!selectedClinic || !doctor || selectedDate) return;
    const firstAvail = next7Days.find(date => {
      if (isSunday(date) && selectedClinic !== 'online') return false;
      const dayName = format(date, 'EEEE');
      return doctor.schedule[selectedClinic]?.some(s => s.days.includes(dayName)) || false;
    });
    if (firstAvail) onDateSelect(firstAvail);
  }, [selectedClinic, doctor]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!doctor || !selectedClinic || !selectedDate) { setAvailableSlots([]); setBookedSlots([]); return; }
      setLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const clinic = clinics.find(c => c.id === selectedClinic);
        const response = await axios.get(`${API}/appointments/booked-slots`, { params: { doctor: doctor.name, clinic: clinic?.name, date: dateStr } });
        const booked = response.data.booked_slots || [];
        setBookedSlots(booked);
        const dayName = format(selectedDate, 'EEEE');
        let effectiveSchedule = [...(doctor.schedule[selectedClinic] || [])];
        const dateOverrides = clinicOverrides.filter(o => o.date === dateStr && o.doctor_name === doctor.name);
        dateOverrides.forEach(override => {
          if (override.original_clinic === selectedClinic) {
            effectiveSchedule = effectiveSchedule.filter(s => {
              if (!s.days.includes(dayName)) return true;
              const startH = parseInt(s.time.split('-')[0].split(':')[0]);
              return (startH < 15 ? 'morning' : 'evening') !== override.session;
            });
          } else if (override.override_clinic === selectedClinic) {
            (doctor.schedule[override.original_clinic] || []).forEach(s => {
              if (s.days.includes(dayName)) {
                const startH = parseInt(s.time.split('-')[0].split(':')[0]);
                if ((startH < 15 ? 'morning' : 'evening') === override.session) effectiveSchedule.push(s);
              }
            });
          }
        });
        const slots = [];
        const now = new Date();
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        const istTime = new Date(utcTime + (5.5 * 60 * 60 * 1000));
        const isTodayCheck = format(selectedDate, 'yyyy-MM-dd') === format(istTime, 'yyyy-MM-dd');
        const currentTimeInMinutes = istTime.getHours() * 60 + istTime.getMinutes() + 60;
        effectiveSchedule.forEach(schedule => {
          if (schedule.days.includes(dayName)) {
            const [startTime, endTime] = schedule.time.split('-');
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);
            let ch = startHour, cm = startMin || 0;
            while (ch < endHour || (ch === endHour && cm < endMin)) {
              const slotTime = `${String(ch).padStart(2,'0')}:${String(cm).padStart(2,'0')}`;
              const slotMins = ch * 60 + cm;
              if (!booked.includes(slotTime) && !(isTodayCheck && slotMins <= currentTimeInMinutes)) slots.push(slotTime);
              cm += 15; if (cm >= 60) { cm = 0; ch++; }
            }
          }
        });
        setAvailableSlots(slots);
        // Smart slot suggestion: auto-select first available slot
        if (slots.length > 0) onSlotSelect(slots[0]);
      } catch (error) { setAvailableSlots([]); }
      finally { setLoadingSlots(false); }
    };
    fetchSlots();
  }, [doctor, selectedClinic, selectedDate, clinicOverrides]);

  const isDoctorAvailable = (date) => {
    if (!doctor || !selectedClinic) return false;
    if (isSunday(date) && selectedClinic !== 'online') return false;
    const dayName = format(date, 'EEEE');
    return doctor.schedule[selectedClinic]?.some(s => s.days.includes(dayName)) || false;
  };

  const formatSlotTime = (slot) => {
    const [h, m] = slot.split(':').map(Number);
    return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const getFilteredSlots = () => availableSlots.filter(s => {
    const h = parseInt(s.split(':')[0]);
    if (timeFilter === 'Morning') return h < 12;
    if (timeFilter === 'Afternoon') return h >= 12 && h < 16;
    if (timeFilter === 'Evening') return h >= 16 && h < 20;
    return h >= 20;
  });

  if (!isOpen || !doctor) return null;
  const filteredSlots = getFilteredSlots();

  // Dark card styling
  const cBg = theme.cardBg;
  const cBorder = theme.cardBorder;
  const cText = isDark ? '#FFFFFF' : theme.headerText;
  const cTextMuted = isDark ? 'rgba(255,255,255,0.7)' : '#9CA3AF';
  const cTextSub = isDark ? 'rgba(255,255,255,0.85)' : '#6B7280';
  const darkCard = 'rounded-[24px] overflow-hidden';
  const neonShadow = theme.neonGlowShadow || '0 4px 20px rgba(0,0,0,0.1)';
  const glassBg = 'rgba(255,255,255,0.05)';
  const glassBorder = 'rgba(255,255,255,0.08)';

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden" style={{ background: theme.darkBg || theme.pageBg }} data-testid="doctor-detail-modal">
      <style>{`
        @keyframes ddmFadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        .ddm-up { animation: ddmFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
        .ddm-up-2 { animation: ddmFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.07s both; }
        .ddm-up-3 { animation: ddmFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.14s both; }
        .ddm-up-4 { animation: ddmFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
      `}</style>

      <div className="w-full h-full overflow-y-auto max-w-lg mx-auto relative">

        {/* ═══ HERO CARD — Solid neon green card with rounded bottom ═══ */}
        <div className="mx-3 mt-3 rounded-[28px] overflow-hidden ddm-up" style={{ background: theme.headerCardBg || theme.accent, boxShadow: `0 12px 40px ${theme.accent}30` }}>

          {/* Nav bar */}
          <div className="px-5 pt-5 pb-2 flex items-center justify-between">
            <button onClick={onClose} className="w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-transform" style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.35)' }} data-testid="close-doctor-modal">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2.5">
              <a href={`tel:${doctor.phone || '9403890429'}`} className="w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-transform" style={{ background: theme.navBtnBg || 'rgba(0,0,0,0.2)', border: `1px solid ${theme.navBtnBorder || 'rgba(0,0,0,0.1)'}` }} data-testid="call-button">
                <Phone className="w-4 h-4" style={{ color: theme.navBtnIcon || '#fff' }} />
              </a>
              <button onClick={() => { onClinicChange('online'); onDateSelect(null); onSlotSelect(null); setActiveTab('schedules'); }} className="w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-transform" style={{ background: theme.navBtnBg || 'rgba(0,0,0,0.2)', border: `1px solid ${theme.navBtnBorder || 'rgba(0,0,0,0.1)'}` }} data-testid="video-button">
                <Video className="w-4 h-4" style={{ color: theme.navBtnIcon || '#fff' }} />
              </button>
              <a href={`https://wa.me/91${doctor.chat || '8108888330'}`} target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-transform" style={{ background: theme.navBtnBg || 'rgba(0,0,0,0.2)', border: `1px solid ${theme.navBtnBorder || 'rgba(0,0,0,0.1)'}` }} data-testid="chat-button">
                <MessageCircle className="w-4 h-4" style={{ color: theme.navBtnIcon || '#fff' }} />
              </a>
            </div>
          </div>

          {/* Doctor Profile */}
          <div className="px-5 pt-3 pb-2 text-center">
            <div className="relative inline-block mb-3">
              <div className="w-28 h-28 rounded-full p-[3px] mx-auto" style={{ background: 'rgba(255,255,255,0.5)' }}>
                <img loading="lazy" decoding="async" src={doctor.image} alt={doctor.name} className="w-full h-full rounded-full object-cover border-[3px] border-white" data-testid="doctor-profile-image" />
              </div>
              <div className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full border-[3px] border-white flex items-center justify-center" style={{ background: '#7ED321' }}>
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>
            <h2 className="text-xl font-black" style={{ color: theme.heroText || '#0F2A28', fontFamily: 'Outfit, sans-serif' }} data-testid="doctor-name">{doctor.name}</h2>
            <p className="text-sm font-semibold mt-0.5" style={{ color: theme.heroTextMuted || '#2D5C58' }}>{doctor.specialty}</p>
          </div>

          {/* Stats inside hero — Experience, Patients, Rating */}
          <div className="px-4 pb-5 pt-2">
            <div className="flex gap-2.5">
              {[
                { val: `${doctor.experience}+`, sub: 'Years Exp.', icon: Award },
                { val: doctor.patients, sub: 'Patients', icon: User },
                { val: `${doctor.rating}`, sub: 'Rating', icon: Star },
              ].map((s, i) => (
                <div key={i} className="flex-1 text-center py-3 px-2 rounded-2xl" style={{ background: theme.heroStatBg || 'rgba(0,0,0,0.12)' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center mx-auto mb-1.5" style={{ background: theme.heroStatIconBg || 'rgba(255,255,255,0.3)' }}>
                    <s.icon className="w-3.5 h-3.5" style={{ color: theme.heroStatIcon || '#0F2A28' }} />
                  </div>
                  <p className="text-sm font-black leading-none" style={{ color: theme.heroStatText || '#0D1F1E' }}>{s.val}</p>
                  <p className="text-[9px] font-semibold mt-1" style={{ color: theme.heroStatSub || 'rgba(31,53,39,0.6)' }}>{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ BODY SECTION ═══ */}
        <div className="px-4 pt-4 pb-32">

          {/* Tabs */}
          <div className="mb-4 ddm-up-2">
            <div className={`flex gap-1 p-1.5 ${darkCard}`} style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: neonShadow }}>
              {['schedules', 'about', 'experiences', 'reviews'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="flex-1 px-3 py-2.5 rounded-full text-xs font-bold capitalize transition-all whitespace-nowrap"
                  style={activeTab === tab
                    ? { background: theme.tabActive, color: theme.tabActiveText || '#0D1F1E', boxShadow: `0 4px 16px ${theme.tabActiveShadow}` }
                    : { color: 'rgba(255,255,255,0.6)' }}
                  data-testid={`tab-${tab}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'schedules' && (
            <div className="space-y-4 ddm-up-4">

              {/* Booking Progress Indicator */}
              <div className="flex items-center gap-2 px-1" data-testid="booking-steps">
                {[
                  { label: 'Clinic', done: !!selectedClinic },
                  { label: 'Date', done: !!selectedDate },
                  { label: 'Time', done: !!selectedSlot },
                ].map((s, i, arr) => (
                  <React.Fragment key={s.label}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300"
                        style={s.done ? {
                          background: theme.accent, color: theme.selectedText || '#0D1F1E',
                          boxShadow: `0 0 12px ${theme.accent}40`,
                        } : {
                          background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}>
                        {s.done ? '✓' : i + 1}
                      </div>
                      <span className="text-[11px] font-bold transition-colors duration-300"
                        style={{ color: s.done ? theme.accent : 'rgba(255,255,255,0.35)' }}>
                        {s.label}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex-1 h-[2px] rounded-full transition-all duration-500"
                        style={{ background: s.done ? theme.accent : 'rgba(255,255,255,0.08)' }} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Clinic Toggle — Glassmorphic segmented control */}
              <div className={`p-4 ${darkCard}`} style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: neonShadow }}>
                <p className="text-[10px] uppercase tracking-wider font-extrabold mb-2.5" style={{ color: theme.accent }}>Visit at</p>
                <div className="relative p-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {/* Sliding indicator */}
                  <div className="absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-out" style={{
                    width: `calc(50% - 4px)`,
                    left: selectedClinic === availableClinics.filter(c => !c.isOnline)[1]?.id ? 'calc(50% + 2px)' : '4px',
                    background: (selectedClinic && selectedClinic !== 'online') ? theme.accent : 'transparent',
                    boxShadow: (selectedClinic && selectedClinic !== 'online') ? `0 4px 16px ${theme.ctaShadow}` : 'none',
                  }} />
                  <div className="relative flex">
                    {availableClinics.filter(c => !c.isOnline).map((clinic, idx) => {
                      const isSel = selectedClinic === clinic.id;
                      return (
                        <button key={clinic.id} onClick={() => { onClinicChange(clinic.id); onDateSelect(null); onSlotSelect(null); }}
                          className="flex-1 py-3 rounded-full text-sm font-bold transition-all active:scale-[0.97] relative z-10"
                          style={{ color: isSel ? (theme.selectedText || '#0D1F1E') : 'rgba(255,255,255,0.7)' }}
                          data-testid={`clinic-btn-${clinic.id}`}>
                          <div className="flex items-center justify-center gap-2">
                            <MapPin className="w-3.5 h-3.5" style={{ opacity: isSel ? 1 : 0.5 }} />
                            {clinic.name.replace(' Clinic', '')}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Online Consultation — Glassmorphic toggle card */}
              <div className={`px-4 py-3.5 ${darkCard} flex items-center justify-between`} style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: neonShadow }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ background: `${theme.accent}15`, border: `1px solid ${theme.accent}25`, backdropFilter: 'blur(8px)' }}>
                    <Video className="w-5 h-5" style={{ color: theme.accent }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Video Consultation</p>
                    <p className="text-[11px] text-white/60">from ₹{CONSULTATION_FEES.indian.consultation.fee}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (selectedClinic === 'online') {
                      const firstOffline = availableClinics.find(c => !c.isOnline);
                      if (firstOffline) { onClinicChange(firstOffline.id); }
                    } else {
                      onClinicChange('online');
                    }
                    onDateSelect(null); onSlotSelect(null);
                  }}
                  className="relative w-14 h-8 rounded-full transition-all duration-300"
                  style={{ background: selectedClinic === 'online' ? theme.accent : 'rgba(255,255,255,0.12)', border: `1px solid ${selectedClinic === 'online' ? theme.accent : 'rgba(255,255,255,0.08)'}` }}
                  data-testid="online-toggle"
                >
                  <div className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300" style={{ left: selectedClinic === 'online' ? 'calc(100% - 28px)' : '4px' }} />
                </button>
              </div>

              {/* ═══ CALENDAR — Glassmorphic dark ═══ */}
              {selectedClinic && (
                <div className="rounded-[22px] overflow-hidden bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]" style={{ border: '1px solid #E5E7EB' }}>
                  {/* Month nav */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 hover:bg-gray-100 transition" data-testid="prev-month-btn"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
                    <h3 className="font-black text-sm text-gray-800">{format(currentMonth, 'MMMM yyyy')}</h3>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 hover:bg-gray-100 transition" data-testid="next-month-btn"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
                  </div>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 px-3">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, di) => (
                      <div key={di} className="text-center text-[10px] py-1.5 font-bold text-gray-400">{day}</div>
                    ))}
                  </div>
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 px-3 pb-4">
                    {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                      <div key={`e-${i}`} className="aspect-square" />
                    ))}
                    {calendarDays.map(date => {
                      const isAvail = isDoctorAvailable(date);
                      const isPast = date < new Date() && !isToday(date);
                      const isSel = selectedDate && isSameDay(selectedDate, date);
                      const isTd = isToday(date);
                      const isHighlightCol = isAvail && !isPast;
                      return (
                        <div key={date.toISOString()} className="relative flex items-center justify-center aspect-square"
                          style={isHighlightCol && !isSel ? { background: `${theme.accent}10` } : {}}>
                          <button onClick={() => { if (isAvail && !isPast) { onDateSelect(date); onSlotSelect(null); selectionTap(); } }} disabled={!isAvail || isPast}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all"
                            style={isSel
                              ? { background: theme.accent, color: theme.selectedText || '#0D1F1E', boxShadow: `0 3px 12px ${theme.accent}50`, fontWeight: 900 }
                              : isTd && isAvail
                                ? { border: `2px solid ${theme.accent}60`, color: theme.accentDark || theme.accent, fontWeight: 800 }
                                : isAvail && !isPast
                                  ? { color: '#1A0A1A', fontWeight: 600 }
                                  : { color: '#D1D5DB' }}
                            data-testid={`calendar-day-${format(date, 'd')}`}>
                            {format(date, 'd')}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Override Notice */}
              {selectedDate && selectedClinic && selectedClinic !== 'online' && (() => {
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                const dateOverrides = clinicOverrides.filter(o => o.date === dateStr && o.doctor_name === doctor.name);
                if (!dateOverrides.length) return null;
                return dateOverrides.map((ov, i) => (
                  <div key={i} className="p-3.5 rounded-[20px] flex items-start gap-2.5 bg-amber-50 border border-amber-200/60" data-testid="clinic-override-notice">
                    <ArrowLeftRight className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                    <div><p className="text-amber-800 text-sm font-bold">Clinic Change — {ov.session === 'morning' ? 'Morning' : 'Evening'}</p><p className="text-amber-700/70 text-xs mt-0.5">{doctor.name} at <span className="font-extrabold text-amber-800">{ov.override_clinic_name}</span> instead of {ov.original_clinic_name}.</p></div>
                  </div>
                ));
              })()}

              {/* ═══ TIME SLOTS — Glassmorphic card ═══ */}
              {selectedDate && selectedClinic && (
                <div className={`p-4 ${darkCard}`} style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: neonShadow }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-base font-black text-white" data-testid="time-section">Choose your Time</p>
                    {availableSlots.length > 0 && (
                      <span className="text-xs font-extrabold px-3 py-1 rounded-full" style={{ background: theme.accentLight, color: theme.accent }}>{availableSlots.length} Slots</span>
                    )}
                  </div>
                  <div className="flex gap-1 mb-4 p-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Morning', 'Afternoon', 'Evening', 'Night'].map(period => {
                      const count = availableSlots.filter(s => {
                        const h = parseInt(s.split(':')[0]);
                        if (period === 'Morning') return h < 12;
                        if (period === 'Afternoon') return h >= 12 && h < 16;
                        if (period === 'Evening') return h >= 16 && h < 20;
                        return h >= 20;
                      }).length;
                      const isAct = timeFilter === period;
                      return (
                        <button key={period} onClick={() => setTimeFilter(period)}
                          className={`flex-1 px-2 py-2 rounded-full text-[11px] font-bold transition-all ${!count ? 'opacity-30' : ''}`}
                          style={isAct ? { background: theme.accent, color: theme.selectedText || '#0D1F1E', boxShadow: `0 4px 12px ${theme.tabActiveShadow}` } : { color: 'rgba(255,255,255,0.65)' }}
                          disabled={!count} data-testid={`time-filter-${period.toLowerCase()}`}>{period}</button>
                      );
                    })}
                  </div>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: theme.accent }} /></div>
                  ) : filteredSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2.5">
                      {filteredSlots.map(slot => {
                        const isSel = selectedSlot === slot;
                        return (
                          <button key={slot} onClick={() => { onSlotSelect(slot); selectionTap(); }}
                            className="py-3.5 px-2 rounded-[16px] text-sm font-bold transition-all active:scale-95"
                            style={isSel
                              ? { background: theme.accent, color: theme.selectedText || '#0D1F1E', boxShadow: `0 4px 16px ${theme.ctaShadow}` }
                              : { background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}
                            data-testid={`time-slot-${slot}`}>{formatSlotTime(slot)}</button>
                        );
                      })}
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <p className="text-center py-6 text-sm text-white/60">No {timeFilter.toLowerCase()} slots. Try another period.</p>
                  ) : (
                    <div className="text-center py-8">
                      <CalendarDays className="w-10 h-10 mx-auto mb-2 text-white/25" />
                      <p className="font-bold text-white/70">No slots available</p>
                      <p className="text-xs mt-1 text-white/50">Try a different date or clinic</p>
                    </div>
                  )}

                  {/* ═══ SWIPE TO BOOK — glassmorphic ═══ */}
                  {selectedSlot && (
                    <div className="mt-5 space-y-3">
                      {selectedClinic === 'online' && currentFee && (
                        <div className="p-3.5 rounded-[20px] flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                          <CreditCard className="w-5 h-5" style={{ color: theme.accent }} />
                          <div className="flex-1"><p className="text-sm font-bold text-white">{currentFee.label} ({currentFee.duration})</p><p className="text-xs text-white/40">{patientType === 'international' && currentFee.usd ? `$${currentFee.usd} (₹${currentFee.fee})` : `₹${currentFee.fee}`}</p></div>
                        </div>
                      )}
                      {selectedClinic !== 'online' && (
                        <div className="py-3 px-4 rounded-full flex items-center gap-2.5" style={{ background: `${theme.accent}10`, border: `1px solid ${theme.accent}25` }}>
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: theme.accent, boxShadow: `0 0 8px ${theme.accent}60` }} />
                          <p className="text-xs font-bold" style={{ color: theme.accent }}>Pay at clinic · No advance payment</p>
                        </div>
                      )}
                      <SwipeToBook
                        onConfirm={onBookAppointment}
                        loading={loading}
                        theme={theme}
                        label={selectedClinic === 'online' && currentFee ? `Swipe to pay ${patientType === 'international' && currentFee.usd ? `$${currentFee.usd}` : `₹${currentFee.fee}`}` : 'Swipe to book...'}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className={`p-5 ${darkCard}`} style={{ background: cBg, border: `1px solid ${cBorder}`, boxShadow: neonShadow }}><h4 className="font-black mb-2" style={{ color: cText, fontFamily: 'Outfit, sans-serif' }}>About</h4><p className="text-sm leading-relaxed" style={{ color: cTextSub }}>{doctor.about}</p></div>
              <div className={`p-5 ${darkCard}`} style={{ background: cBg, border: `1px solid ${cBorder}`, boxShadow: neonShadow }}><h4 className="font-black mb-2" style={{ color: cText }}>Qualifications</h4><p className="text-sm" style={{ color: cTextSub }}>{doctor.qualifications}</p></div>
              <div className={`p-5 ${darkCard}`} style={{ background: cBg, border: `1px solid ${cBorder}`, boxShadow: neonShadow }}>
                <h4 className="font-black mb-2" style={{ color: cText }}>Specializations</h4>
                <div className="flex flex-wrap gap-2">{doctor.specializations.map((spec, i) => (<Badge key={i} className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: theme.accentLight, color: theme.accent, border: 'none' }}>{spec}</Badge>))}</div>
              </div>
              <div className={`p-5 ${darkCard}`} style={{ background: cBg, border: `1px solid ${cBorder}`, boxShadow: neonShadow }}>
                <h4 className="font-black mb-2" style={{ color: cText }}>Locations</h4>
                <div className="space-y-2.5">{availableClinics.map(clinic => (<div key={clinic.id} className="flex items-start gap-3 p-3.5 rounded-[16px]" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : theme.pageBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : theme.cardBorder}` }}><MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: theme.accent }} /><div><p className="text-sm font-bold" style={{ color: cText }}>{clinic.name}</p><p className="text-xs mt-0.5" style={{ color: cTextMuted }}>{clinic.address}</p></div></div>))}</div>
              </div>
            </div>
          )}

          {/* Experiences Tab */}
          {activeTab === 'experiences' && (
            <div className="space-y-4">
              <div className={`p-5 ${darkCard}`} style={{ background: cBg, border: `1px solid ${cBorder}`, boxShadow: neonShadow }}>
                <h4 className="font-black mb-3" style={{ color: cText }}>Professional Expertise</h4>
                <div className="space-y-3">{doctor.specializations.map((spec, i) => (<div key={i} className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: theme.accent }} /><p className="text-sm font-medium" style={{ color: cTextSub }}>{spec}</p></div>))}</div>
              </div>
              <div className={`p-5 ${darkCard}`} style={{ background: cBg, border: `1px solid ${cBorder}`, boxShadow: neonShadow }}><h4 className="font-black mb-2" style={{ color: cText }}>Education</h4><p className="text-sm" style={{ color: cTextSub }}>{doctor.qualifications}</p></div>
              {doctor.pastAffiliations && doctor.pastAffiliations.length > 0 && (
                <div className={`p-5 ${darkCard}`} style={{ background: cBg, border: `1px solid ${cBorder}`, boxShadow: neonShadow }} data-testid="past-affiliations-card">
                  <h4 className="font-black mb-3" style={{ color: cText }}>Past Affiliations</h4>
                  <div className="space-y-2.5">
                    {doctor.pastAffiliations.map((affiliation, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-[14px]" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : theme.pageBg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : theme.cardBorder}` }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: theme.iconBg }}>
                          <Building2 className="w-4 h-4" style={{ color: theme.iconColor }} />
                        </div>
                        <p className="text-sm font-semibold" style={{ color: cTextSub }}>{affiliation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className={`flex items-center gap-5 p-5 ${darkCard}`} style={{ background: cBg, border: `1px solid ${cBorder}`, boxShadow: neonShadow }}>
                <div className="text-center">
                  <p className="text-4xl font-black" style={{ color: cText }}>{doctor.rating}</p>
                  <div className="flex items-center gap-0.5 justify-center my-1">{[1,2,3,4,5].map(i => (<Star key={i} className={`w-4 h-4 ${i <= Math.floor(doctor.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />))}</div>
                  <p className="text-xs font-semibold" style={{ color: cTextMuted }}>{doctor.reviews.toLocaleString()} reviews</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5,4,3,2,1].map(r => { const pct = r===5?85:r===4?10:r===3?3:1; return (<div key={r} className="flex items-center gap-2"><span className="text-xs w-3 font-bold" style={{ color: cTextMuted }}>{r}</span><div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : theme.pageBg }}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: theme.accent }} /></div></div>); })}
                </div>
              </div>
              {[{ name: 'Priya S.', rating: 5, text: 'Excellent doctor! Very thorough and caring.', date: '2 days ago' }, { name: 'Rahul M.', rating: 5, text: 'Best experience. Highly recommended!', date: '1 week ago' }, { name: 'Anjali K.', rating: 4, text: 'Good consultation, explained everything clearly.', date: '2 weeks ago' }].map((rev, i) => (
                <div key={i} className={`p-4 ${darkCard}`} style={{ background: cBg, border: `1px solid ${cBorder}`, boxShadow: neonShadow }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: theme.iconBg }}><User className="w-4 h-4" style={{ color: theme.iconColor }} /></div><span className="text-sm font-bold" style={{ color: cText }}>{rev.name}</span></div>
                    <span className="text-xs" style={{ color: cTextMuted }}>{rev.date}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mb-2">{[1,2,3,4,5].map(j => (<Star key={j} className={`w-3 h-3 ${j <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />))}</div>
                  <p className="text-sm" style={{ color: cTextSub }}>{rev.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDetailModal;
