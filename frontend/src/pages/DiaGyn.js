import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/context/AuthContext';
import { useViewMode } from '@/context/ViewModeContext';
import { ViewModeSwitcher } from '@/components/ViewModeSwitcher';
import { PatientLookup, PatientRegistrationDialog } from '@/components/PatientRegistration';
import BottomNav from '@/components/BottomNav';
import ServiceHeader from '@/components/ServiceHeader';
import ProtonAdBanner from '@/components/ProtonAdBanner';
import NumericCaptcha from '@/components/NumericCaptcha';
import { toast } from 'sonner';
import axios from 'axios';
import AppointmentWaitlist from '@/components/AppointmentWaitlist';
import { 
  ArrowLeft, Clock, Ban, Shield, CheckCircle2, Loader2, 
  CalendarDays, Wifi, WifiOff, GraduationCap, Calendar,
  ChevronLeft, ChevronRight, User, Stethoscope, Building2, Heart, Sparkles,
  Lock, Unlock, AlertTriangle, Settings, UserPlus, Phone, History
} from 'lucide-react';
import { format, isSunday, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { useNotificationPrompt } from '@/components/NotificationPrompt';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const getWsUrl = () => {
  const url = new URL(BACKEND_URL);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}`;
};
const WS_URL = getWsUrl();

// ============================================
// DESIGN SYSTEM - Blinkit Dark Blue Theme for DiaGyn
// ============================================
const theme = {
  primary: { main: '#0c1e3c', light: '#1a365d', dark: '#091528' },  // Dark Blinkit blue
  secondary: { main: '#1a365d', light: '#2d4a6f', dark: '#0c1e3c' },
  accent: { main: '#14B8A6', light: '#2DD4BF' },  // Teal accent for buttons
  neutral: { background: '#0c1e3c', surface: '#FFFFFF', textPrimary: '#FFFFFF', textSecondary: '#94A3B8', border: '#1a365d' },
  status: { success: '#10B981', error: '#EF476F', warning: '#FFD166' }
};

// ============================================
// DOCTOR & CLINIC DATA
// ============================================
const doctors = [
  {
    id: 'vikas',
    name: 'Dr. Vikas Jha',
    specialty: 'Diabetologist & Physician',
    qualifications: 'M.B.B.S, C.Diab (RSSDI, Delhi), Dip. In Diabetology (Cardiff, UK)',
    experience: '15+ Years',
    rating: 4.9,
    patients: '10,000+',
    image: 'https://customer-assets.emergentagent.com/job_1d0b9312-d1f2-40d1-b78f-c0c28fa95ba1/artifacts/gg2swmlp_IMG-20220627-WA0003.jpg',
    specializations: ['Diabetes Management', 'Thyroid Disorders', 'Preventive Health'],
    schedule: {
      pushpa: [{ days: ['Monday', 'Wednesday', 'Friday'], time: '18:00-22:00' }],
      amnion: [
        { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '11:00-14:00' },
        { days: ['Tuesday', 'Thursday', 'Saturday'], time: '18:00-22:00' }
      ]
    }
  },
  {
    id: 'neha',
    name: 'Dr. Neha Patel',
    specialty: 'OBGYN',
    qualifications: 'M.B.B.S, D.G.O (Mumbai), FMAS (Delhi)',
    experience: '12+ Years',
    rating: 4.8,
    patients: '8,000+',
    image: 'https://customer-assets.emergentagent.com/job_healthhelper-7/artifacts/u05fho69_IMG-20260126-WA0000.jpg',
    specializations: ['High Risk Pregnancy', 'Laparoscopic Surgery', 'Infertility'],
    schedule: {
      amnion: [{ days: ['Monday', 'Wednesday', 'Friday'], time: '18:00-22:00' }],
      pushpa: [
        { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '11:00-14:00' },
        { days: ['Tuesday', 'Thursday', 'Saturday'], time: '18:00-22:00' }
      ]
    }
  }
];

const clinics = [
  { id: 'pushpa', name: 'Pushpa Clinic', address: 'A-4, Sai Darshan, Near Don Bosco High School, Naigaon East', image: 'https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/94uk5pro_5_20260102_012214_0001.png' },
  { id: 'amnion', name: 'Amnion Clinic', address: 'G-7, Rashmi Star City Phase 5, Opp Thakur School, Naigaon East', image: 'https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/pe7sn5ws_9_20260102_012214_0005.png' }
];

// ============================================
// DOCTOR PROFILE CARD - Enhanced Pastel Design
// ============================================
const DoctorProfileCard = ({ doctor, isSelected, onSelect, isTablet = false }) => {
  return (
    <div 
      onClick={onSelect}
      data-testid={`doctor-card-${doctor.id}`}
      className={`
        relative overflow-hidden cursor-pointer transition-all duration-300 ease-out
        rounded-3xl p-1 group active:scale-[0.98]
        ${isSelected 
          ? 'bg-gradient-to-br from-[#0F766E] via-[#14B8A6] to-[#2DD4BF] shadow-[0_20px_50px_rgb(0,0,0,0.1)] scale-[1.01]' 
          : 'bg-gradient-to-br from-slate-100 to-slate-50 hover:from-[#CCFBF1] hover:to-[#99F6E4] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.1)] hover:scale-[1.01] hover:-translate-y-1'
        }
      `}
    >
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
      
      <div className={`bg-white rounded-[22px] h-full ${isTablet ? 'p-6' : 'p-5'}`}>
        {/* Selection Badge */}
        {isSelected && (
          <div className="absolute top-4 right-4 z-10">
            <Badge className={`bg-[#0F766E] text-white rounded-full flex items-center gap-1.5 shadow-lg animate-bounce ${isTablet ? 'px-4 py-1.5 text-sm' : 'px-3 py-1'}`}>
              <CheckCircle2 className={isTablet ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
              Selected
            </Badge>
          </div>
        )}

        {/* Top Section - Image & Basic Info */}
        <div className={`flex ${isTablet ? 'gap-6' : 'gap-5'}`}>
          {/* Doctor Image */}
          <div className="relative flex-shrink-0">
            <div className={`rounded-2xl overflow-hidden ring-4 transition-all duration-300 group-hover:ring-[#0F766E]/40 ${isTablet ? 'w-28 h-28' : 'w-24 h-24'} ${isSelected ? 'ring-[#0F766E]/30' : 'ring-[#99F6E4]/50 group-hover:ring-[#0F766E]/20'}`}>
              <img 
                src={doctor.image} 
                alt={doctor.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                data-testid={`doctor-image-${doctor.id}`}
              />
            </div>
            {/* Online Status */}
            <div className={`absolute -bottom-1 -right-1 bg-[#A7C957] border-2 border-white rounded-full flex items-center justify-center ${isTablet ? 'w-6 h-6' : 'w-5 h-5'}`}>
              <span className={`bg-white rounded-full animate-pulse ${isTablet ? 'w-2.5 h-2.5' : 'w-2 h-2'}`} />
            </div>
          </div>

          {/* Name & Specialty */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-[#134E4A] mb-1 truncate ${isTablet ? 'text-2xl' : 'text-xl'}`} style={{ fontFamily: 'Outfit, sans-serif' }}>
              {doctor.name}
            </h3>
            <Badge className={`bg-[#99F6E4] text-[#134E4A] rounded-full font-medium border-0 mb-3 ${isTablet ? 'px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs'}`}>
              <Stethoscope className={isTablet ? 'w-4 h-4 mr-2' : 'w-3 h-3 mr-1.5'} />
              {doctor.specialty}
            </Badge>
            
            {/* Quick Stats */}
            <div className={`flex items-center gap-3 text-[#64748B] ${isTablet ? 'text-sm' : 'text-xs'}`}>
              <span className="flex items-center gap-1">
                <Heart className={isTablet ? 'w-4 h-4 text-[#2DD4BF]' : 'w-3.5 h-3.5 text-[#2DD4BF]'} />
                {doctor.patients} patients
              </span>
              <span>•</span>
              <span>{doctor.experience}</span>
            </div>
          </div>
        </div>

        {/* Degree & Qualifications - HIGHLIGHTED */}
        <div className={`bg-gradient-to-r from-[#CCFBF1]/40 to-[#99F6E4]/40 rounded-2xl border border-[#CCFBF1]/60 ${isTablet ? 'mt-6 p-5' : 'mt-5 p-4'}`}>
          <div className="flex items-start gap-3">
            <div className={`rounded-xl bg-[#0F766E]/20 flex items-center justify-center flex-shrink-0 ${isTablet ? 'w-10 h-10' : 'w-8 h-8'}`}>
              <GraduationCap className={isTablet ? 'w-5 h-5 text-[#0F766E]' : 'w-4 h-4 text-[#0F766E]'} />
            </div>
            <div>
              <p className={`font-semibold text-[#134E4A] uppercase tracking-wide mb-1 ${isTablet ? 'text-sm' : 'text-xs'}`}>
                Qualifications
              </p>
              <p className={`text-[#64748B] leading-relaxed ${isTablet ? 'text-base' : 'text-sm'}`} style={{ fontFamily: 'DM Sans, sans-serif' }}>
                {doctor.qualifications}
              </p>
            </div>
          </div>
        </div>

        {/* Specializations */}
        <div className={`flex flex-wrap gap-2 ${isTablet ? 'mt-5' : 'mt-4'}`}>
          {doctor.specializations.map((spec, i) => (
            <Badge 
              key={i} 
              variant="outline" 
              className="text-xs bg-white border-[#E2E8F0] text-[#64748B] px-2.5 py-1 rounded-full hover:bg-[#F0FDFA] hover:border-[#0F766E] transition-colors"
            >
              {spec}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// CLINIC SELECTION CARD - Pastel Design with animations
// ============================================
const ClinicCard = ({ clinic, isSelected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      data-testid={`clinic-card-${clinic.id}`}
      className={`
        relative overflow-hidden cursor-pointer transition-all duration-300 ease-out
        rounded-3xl group active:scale-[0.98]
        ${isSelected 
          ? 'ring-2 ring-[#0F766E] shadow-[0_20px_50px_rgb(0,0,0,0.1)] scale-[1.02]' 
          : 'ring-1 ring-[#E2E8F0] hover:ring-[#0F766E]/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.1)] hover:scale-[1.02] hover:-translate-y-1'
        }
      `}
    >
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10">
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
      
      {/* Clinic Image */}
      <div className="h-36 overflow-hidden relative">
        <img src={clinic.image} alt={clinic.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent transition-opacity group-hover:from-black/50" />
        {isSelected && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-[#0F766E] text-white px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg animate-bounce">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Selected
            </Badge>
          </div>
        )}
      </div>
      
      {/* Clinic Info */}
      <div className="p-5 bg-white">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#99F6E4] flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <Building2 className="w-5 h-5 text-[#134E4A]" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-[#134E4A] transition-colors group-hover:text-[#0F766E]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {clinic.name}
            </h3>
            <p className="text-sm text-[#64748B] mt-1 leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              {clinic.address}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// RICH CALENDAR - Pastel Design
// ============================================
const RichCalendar = ({ selectedDate, onSelect, doctorSchedule, clinicId }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startDay = monthStart.getDay();
  const emptyDays = Array(startDay).fill(null);
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const isDoctorAvailable = (date) => {
    if (!doctorSchedule || !clinicId) return true;
    const dayName = fullDayNames[date.getDay()];
    const schedule = doctorSchedule[clinicId];
    if (!schedule) return false;
    return schedule.some(s => s.days.includes(dayName));
  };
  
  const isDateDisabled = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today || isSunday(date) || !isDoctorAvailable(date);
  };
  
  return (
    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-[#E2E8F0]">
      {/* Month Header - Pastel Gradient */}
      <div className="bg-gradient-to-r from-[#0F766E] to-[#14B8A6] px-5 py-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setCurrentMonth(prev => addDays(startOfMonth(prev), -1))}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            data-testid="calendar-prev-month"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button 
            onClick={() => setCurrentMonth(prev => addDays(endOfMonth(prev), 1))}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            data-testid="calendar-next-month"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
      
      {/* Day Names */}
      <div className="grid grid-cols-7 bg-[#F0FDFA] border-b border-[#E2E8F0]">
        {dayNames.map(day => (
          <div 
            key={day} 
            className={`py-3 text-center text-xs font-semibold ${day === 'Sun' ? 'text-[#EF476F]' : 'text-[#64748B]'}`}
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 p-3">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="h-11" />
        ))}
        {days.map(day => {
          const disabled = isDateDisabled(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const isAvailable = isDoctorAvailable(day) && !isSunday(day);
          
          return (
            <button
              key={day.toString()}
              onClick={() => !disabled && onSelect(day)}
              disabled={disabled}
              data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
              className={`
                h-11 w-full rounded-xl text-sm font-medium transition-all relative
                ${disabled 
                  ? 'text-[#CBD5E1] cursor-not-allowed' 
                  : isSelected 
                    ? 'bg-[#0F766E] text-white shadow-lg scale-105' 
                    : isTodayDate
                      ? 'bg-[#CCFBF1] text-[#134E4A] hover:bg-[#0F766E] hover:text-white font-bold'
                      : isAvailable
                        ? 'hover:bg-[#99F6E4] text-[#134E4A]'
                        : 'text-[#CBD5E1]'
                }
              `}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {format(day, 'd')}
              {isAvailable && !disabled && !isSelected && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#A7C957] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="px-4 py-3 bg-[#F0FDFA] border-t border-[#E2E8F0] flex items-center gap-5 text-xs" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#A7C957] rounded-full" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#0F766E] rounded-full" />
          Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#CBD5E1] rounded-full" />
          Unavailable
        </span>
      </div>
    </div>
  );
};

// ============================================
// TIME SLOT PICKER - Pastel Design
// ============================================
const TimeSlotPicker = ({ slots, bookedSlots, selectedSlot, onSelect, selectedDate, currentTime, loading, wsConnected, doctor, clinic, patientData }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#0F766E] mx-auto mb-3" />
          <p className="text-[#64748B] text-sm">Loading available slots...</p>
        </div>
      </div>
    );
  }

  // Safety check for slots array
  const safeSlots = Array.isArray(slots) ? slots : [];
  const safeBookedSlots = Array.isArray(bookedSlots) ? bookedSlots : [];
  
  const unbookedSlots = safeSlots.filter(slot => !safeBookedSlots.includes(slot));

  if (unbookedSlots.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-[#FFD6BA]/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-[#2DD4BF]" />
          </div>
          <p className="text-[#64748B] text-sm">No slots available for this day</p>
          <p className="text-[#94A3B8] text-xs mt-1">Try selecting another date or join the waitlist below</p>
        </div>
        
        {/* Waitlist Component */}
        <AppointmentWaitlist
          doctorId={doctor?.id}
          doctorName={doctor?.name}
          clinic={clinic}
          patientId={patientData?.id}
          patientName={patientData?.name}
          patientPhone={patientData?.phone}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Connection Status & Time Period Legend */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 text-xs text-white/90" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            Morning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-white" />
            Evening
          </span>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-medium ${wsConnected ? 'text-green-400' : 'text-slate-400'}`}>
          {wsConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {wsConnected ? 'Live Updates' : 'Offline'}
        </span>
      </div>

      {/* Time Slots Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
        {slots.map(slot => {
          const isBooked = bookedSlots.includes(slot);
          const hour = parseInt(slot.split(':')[0]);
          const minute = parseInt(slot.split(':')[1]) || 0;
          const isMorning = hour >= 11 && hour < 14;
          const isEvening = hour >= 18 && hour <= 22;
          
          const isToday = selectedDate?.toDateString() === currentTime.toDateString();
          const slotTimeInMinutes = hour * 60 + minute;
          const currentTimeInMinutes = currentTime.getHours() * 60 + currentTime.getMinutes() + 15;
          const isPastSlot = isToday && slotTimeInMinutes <= currentTimeInMinutes;
          const isDisabled = isBooked || isPastSlot;
          
          return (
            <button
              key={slot}
              onClick={() => !isDisabled && onSelect(slot)}
              disabled={isDisabled}
              data-testid={`slot-${slot}`}
              title={isPastSlot ? 'Time has passed' : isBooked ? 'Already booked' : 'Available'}
              className={`
                py-3 px-2 text-sm rounded-xl border-2 transition-all font-medium relative
                ${isPastSlot || isBooked
                  ? 'bg-slate-800/50 text-slate-500 border-slate-700 cursor-not-allowed line-through'
                  : selectedSlot === slot 
                    ? 'bg-orange-500 text-white border-orange-500 shadow-lg scale-105' 
                    : isMorning
                      ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200 hover:border-amber-400'
                      : isEvening
                        ? 'bg-white border-white/50 text-slate-800 hover:bg-slate-100 hover:border-white'
                        : 'bg-white border-slate-200 hover:border-orange-400 text-slate-800'
                }
              `}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {(isBooked || isPastSlot) && <Ban className="w-3 h-3 inline mr-1" />}
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// BLOCK SLOTS DIALOG - Staff Only Feature
// ============================================
const BlockSlotsDialog = ({ 
  open, 
  onOpenChange, 
  doctor, 
  clinic, 
  selectedDate,
  availableSlots,
  bookedSlots,
  onSlotsBlocked 
}) => {
  const [selectedSlotsToBlock, setSelectedSlotsToBlock] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [reason, setReason] = useState('Doctor running late');
  const [loading, setLoading] = useState(false);
  const [loadingBlockedSlots, setLoadingBlockedSlots] = useState(false);

  const fetchBlockedSlots = useCallback(async () => {
    if (!doctor || !clinic || !selectedDate) return;
    setLoadingBlockedSlots(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await axios.get(`${API}/appointments/blocked-slots`, {
        params: { doctor, clinic, date: dateStr }
      });
      setBlockedSlots(response.data.blocked_slots || []);
    } catch (error) {
      console.error('Failed to fetch blocked slots:', error);
    } finally {
      setLoadingBlockedSlots(false);
    }
  }, [doctor, clinic, selectedDate]);

  // Fetch currently blocked slots when dialog opens
  useEffect(() => {
    if (open && doctor && clinic && selectedDate) {
      fetchBlockedSlots();
    }
  }, [open, doctor, clinic, selectedDate, fetchBlockedSlots]);

  const toggleSlotSelection = (slot) => {
    setSelectedSlotsToBlock(prev => 
      prev.includes(slot) 
        ? prev.filter(s => s !== slot)
        : [...prev, slot]
    );
  };

  const handleBlockSlots = async () => {
    if (selectedSlotsToBlock.length === 0) {
      toast.error('Please select at least one slot to block');
      return;
    }
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await axios.post(`${API}/appointments/block-slots`, {
        doctor,
        clinic,
        date: dateStr,
        slots: selectedSlotsToBlock,
        reason
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
        }
      });
      toast.success(response.data.message);
      setSelectedSlotsToBlock([]);
      fetchBlockedSlots();
      onSlotsBlocked && onSlotsBlocked();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to block slots');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockSlots = async (slotsToUnblock) => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await axios.post(`${API}/appointments/unblock-slots`, {
        doctor,
        clinic,
        date: dateStr,
        slots: slotsToUnblock,
        reason: ''
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
        }
      });
      toast.success(response.data.message);
      fetchBlockedSlots();
      onSlotsBlocked && onSlotsBlocked();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to unblock slots');
    } finally {
      setLoading(false);
    }
  };

  // Get slots that are available to block (not already booked by patients)
  const blockableSlots = availableSlots.filter(slot => {
    const isBookedByPatient = bookedSlots.includes(slot) && !blockedSlots.find(b => b.time === slot);
    return !isBookedByPatient;
  });

  const blockedSlotTimes = blockedSlots.map(b => b.time);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#134E4A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Lock className="w-5 h-5 text-[#EF476F]" />
            Manage Slot Blocking
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="p-3 bg-[#0F766E]/10 border border-[#0F766E]/30 rounded-xl">
            <div className="flex items-start gap-2">
              <Stethoscope className="w-4 h-4 text-[#0F766E] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#134E4A]">
                <span className="font-semibold">Doctor Access:</span> Block your appointment slots when running late or unavailable.
                Patients will not be able to book blocked slots.
              </p>
            </div>
          </div>

          {/* Selected Context */}
          <div className="p-4 bg-[#F0FDFA] rounded-xl border border-[#E2E8F0]">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[#64748B] text-xs">Doctor</p>
                <p className="font-semibold text-[#134E4A]">{doctor}</p>
              </div>
              <div>
                <p className="text-[#64748B] text-xs">Clinic</p>
                <p className="font-semibold text-[#134E4A]">{clinic}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[#64748B] text-xs">Date</p>
                <p className="font-semibold text-[#134E4A]">
                  {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>

          {/* Currently Blocked Slots */}
          {blockedSlots.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-[#134E4A] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#EF476F]" />
                Currently Blocked ({blockedSlots.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {blockedSlots.map(slot => (
                  <Badge 
                    key={slot.time}
                    className="bg-[#EF476F]/10 text-[#EF476F] border border-[#EF476F]/30 px-3 py-1.5 cursor-pointer hover:bg-[#EF476F]/20 transition-colors"
                    onClick={() => handleUnblockSlots([slot.time])}
                    data-testid={`blocked-slot-${slot.time}`}
                  >
                    <Lock className="w-3 h-3 mr-1.5" />
                    {slot.time}
                    <span className="ml-2 text-xs opacity-70">✕</span>
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-[#64748B]">Click a slot to unblock it</p>
            </div>
          )}

          {/* Reason Input */}
          <div>
            <Label className="text-[#64748B] text-sm">Reason for Blocking</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Doctor running late"
              className="mt-1.5 rounded-xl border-[#E2E8F0] focus:border-[#0F766E]"
              data-testid="block-reason-input"
            />
          </div>

          {/* Available Slots to Block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-[#134E4A] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0F766E]" />
                Select Slots to Block
              </h4>
              {/* Block All Remaining Slots Button */}
              {!loadingBlockedSlots && blockableSlots.filter(s => !blockedSlotTimes.includes(s)).length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const availableToBlock = blockableSlots.filter(s => !blockedSlotTimes.includes(s));
                    setSelectedSlotsToBlock(availableToBlock);
                  }}
                  className="text-xs text-[#EF476F] hover:bg-[#EF476F]/10 px-2 py-1 h-auto"
                  data-testid="block-all-slots-btn"
                >
                  <Ban className="w-3 h-3 mr-1" />
                  Block All Remaining
                </Button>
              )}
            </div>
            {loadingBlockedSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#0F766E]" />
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {blockableSlots.map(slot => {
                  const isAlreadyBlocked = blockedSlotTimes.includes(slot);
                  const isSelected = selectedSlotsToBlock.includes(slot);
                  
                  return (
                    <button
                      key={slot}
                      onClick={() => !isAlreadyBlocked && toggleSlotSelection(slot)}
                      disabled={isAlreadyBlocked}
                      data-testid={`block-slot-${slot}`}
                      className={`
                        py-2 px-2 text-xs rounded-lg border transition-all font-medium
                        ${isAlreadyBlocked 
                          ? 'bg-[#EF476F]/10 text-[#EF476F] border-[#EF476F]/30 cursor-not-allowed'
                          : isSelected
                            ? 'bg-[#EF476F] text-white border-[#EF476F] shadow-md'
                            : 'bg-white border-[#E2E8F0] text-[#134E4A] hover:border-[#EF476F] hover:bg-[#EF476F]/5'
                        }
                      `}
                    >
                      {isAlreadyBlocked && <Lock className="w-3 h-3 inline mr-1" />}
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-full border-[#E2E8F0]"
              data-testid="cancel-block-btn"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBlockSlots}
              disabled={loading || selectedSlotsToBlock.length === 0}
              className="flex-1 bg-[#EF476F] hover:bg-[#EF476F]/90 text-white rounded-full"
              data-testid="confirm-block-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Block {selectedSlotsToBlock.length} Slot{selectedSlotsToBlock.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// STEP PROGRESS INDICATOR - Pastel Design
// ============================================
const StepProgress = ({ currentStep, steps }) => {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between relative">
        {/* Progress Line Background */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-[#E2E8F0]" />
        {/* Progress Line Active */}
        <div 
          className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-[#0F766E] to-[#14B8A6] transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
        
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col items-center relative z-10">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2
              ${i + 1 < currentStep 
                ? 'bg-[#A7C957] border-[#A7C957] text-white' 
                : i + 1 === currentStep 
                  ? 'bg-[#0F766E] border-[#0F766E] text-white shadow-lg scale-110' 
                  : 'bg-white border-[#E2E8F0] text-[#64748B]'
              }
            `}>
              {i + 1 < currentStep ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span 
              className={`mt-2 text-xs text-center max-w-[60px] leading-tight ${i + 1 === currentStep ? 'text-[#0F766E] font-semibold' : 'text-[#64748B]'}`}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// MAIN DIAGYN COMPONENT
// ============================================
const DiaGyn = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile, isTablet, isDesktop } = useViewMode();
  const [step, setStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [patientInfo, setPatientInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });
  const [loading, setLoading] = useState(false);
  
  const { showPromptAfterAction, ActionPrompt } = useNotificationPrompt();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  const wsRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);
  const [showAvailability, setShowAvailability] = useState(false);
  const [weeklyAvailability, setWeeklyAvailability] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [emailReminder, setEmailReminder] = useState(true);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [bookingLimits, setBookingLimits] = useState({
    canBook: true,
    activeAppointment: null,
    loading: true
  });
  
  
  // Staff slot blocking feature
  const [showBlockSlotsDialog, setShowBlockSlotsDialog] = useState(false);
  
  // Check if logged-in user can block slots for the selected doctor
  // Only the respective doctor OR super_admin can block slots
  const canBlockSlotsForDoctor = () => {
    const staffToken = localStorage.getItem('staffToken');
    if (!staffToken) return false;
    try {
      const payload = JSON.parse(atob(staffToken.split('.')[1]));
      const isExpired = payload.exp * 1000 < Date.now();
      if (isExpired) return false;
      
      // Super admin can block any doctor's slots
      if (payload.role === 'super_admin') return true;
      
      // Doctor can only block their own slots
      if (payload.role === 'doctor') {
        const selectedDr = doctors.find(d => d.id === selectedDoctor);
        // Match doctor_name from token with selected doctor's name
        return payload.doctor_name === selectedDr?.name || payload.name === selectedDr?.name;
      }
      
      return false;
    } catch (e) {
      return false;
    }
  };

  // Patient lookup state
  const [foundPatient, setFoundPatient] = useState(null);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [mobileForRegister, setMobileForRegister] = useState('');

  // Handle patient found from lookup
  const handlePatientFound = (patient) => {
    setFoundPatient(patient);
    setPatientInfo({
      name: patient.name,
      phone: patient.mobile,
      email: patient.email || ''
    });
  };

  // Handle new patient (not found)
  const handleNewPatient = (mobile) => {
    setMobileForRegister(mobile);
    setShowRegisterDialog(true);
  };

  // Handle successful registration
  const handleRegistrationSuccess = (patient) => {
    setFoundPatient(patient);
    setPatientInfo({
      name: patient.name,
      phone: patient.mobile,
      email: ''
    });
    setShowRegisterDialog(false);
    toast.success(`Patient registered: ${patient.patient_id}`);
  };

  useEffect(() => {
    const checkBookingLimits = async () => {
      if (!patientInfo.phone || patientInfo.phone.length < 10) {
        setBookingLimits({ canBook: true, activeAppointment: null, loading: false });
        return;
      }
      try {
        const response = await axios.get(`${API}/booking-limits/status`, {
          params: { phone: patientInfo.phone }
        });
        setBookingLimits({
          canBook: response.data.can_book_appointment,
          activeAppointment: response.data.active_appointment_details,
          loading: false
        });
      } catch (error) {
        setBookingLimits({ canBook: true, activeAppointment: null, loading: false });
      }
    };
    const debounce = setTimeout(checkBookingLimits, 500);
    return () => clearTimeout(debounce);
  }, [patientInfo.phone]);

  const fetchWeeklyAvailability = async () => {
    setLoadingAvailability(true);
    try {
      const response = await axios.get(`${API}/doctors/availability?days=7`);
      setWeeklyAvailability(response.data.availability || []);
      setShowAvailability(true);
    } catch (error) {
      toast.error('Failed to load availability');
    } finally {
      setLoadingAvailability(false);
    }
  };

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const getDayName = (date) => format(date, 'EEEE');

  const fetchBookedSlots = useCallback(async () => {
    if (!selectedDoctor || !selectedClinic || !selectedDate) {
      setBookedSlots([]);
      return;
    }
    const doctor = doctors.find(d => d.id === selectedDoctor);
    const clinic = clinics.find(c => c.id === selectedClinic);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    setLoadingSlots(true);
    try {
      const response = await axios.get(`${API}/appointments/booked-slots`, {
        params: { doctor: doctor.name, clinic: clinic.name, date: dateStr }
      });
      setBookedSlots(response.data.booked_slots || []);
    } catch (error) {
      setBookedSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDoctor, selectedClinic, selectedDate]);

  useEffect(() => {
    fetchBookedSlots();
  }, [fetchBookedSlots]);

  // WebSocket connection for real-time slot updates
  useEffect(() => {
    if (!selectedDoctor || !selectedClinic || !selectedDate) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        setWsConnected(false);
      }
      return;
    }

    const doctor = doctors.find(d => d.id === selectedDoctor);
    const clinic = clinics.find(c => c.id === selectedClinic);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    let pollingInterval = null;

    const connectWebSocket = () => {
      if (wsRef.current) wsRef.current.close();
      const wsUrl = `${WS_URL}/api/ws/slots?doctor=${encodeURIComponent(doctor.name)}&clinic=${encodeURIComponent(clinic.name)}&date=${dateStr}`;
      
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'slot_update') {
              if (data.status === 'booked') {
                setBookedSlots(prev => {
                  if (!prev.includes(data.slot)) {
                    toast.info(`Slot ${data.slot} just booked`, { duration: 3000, icon: '⚡' });
                    return [...prev, data.slot];
                  }
                  return prev;
                });
                setSelectedSlot(prev => prev === data.slot ? null : prev);
              } else if (data.status === 'available') {
                setBookedSlots(prev => prev.filter(s => s !== data.slot));
                toast.success(`Slot ${data.slot} is now available!`, { duration: 3000, icon: '✨' });
              }
            } else if (data.type === 'heartbeat') {
              ws.send(JSON.stringify({ type: 'pong' }));
            }
          } catch (e) {
            // Silent fail for WebSocket message parsing errors
          }
        };

        ws.onclose = (event) => {
          setWsConnected(false);
          wsRef.current = null;
          if (!pollingInterval && event.code !== 1000) {
            pollingInterval = setInterval(fetchBookedSlots, 10000);
          }
          if (event.code !== 1000) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (selectedDoctor && selectedClinic && selectedDate) connectWebSocket();
            }, 5000);
          }
        };

        ws.onerror = () => {
          setWsConnected(false);
          if (!pollingInterval) pollingInterval = setInterval(fetchBookedSlots, 10000);
        };
      } catch (e) {
        setWsConnected(false);
        if (!pollingInterval) pollingInterval = setInterval(fetchBookedSlots, 10000);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pollingInterval) clearInterval(pollingInterval);
      if (wsRef.current) { wsRef.current.close(1000); wsRef.current = null; }
      setWsConnected(false);
    };
  }, [selectedDoctor, selectedClinic, selectedDate, fetchBookedSlots]);

  const getAvailableSlots = () => {
    if (!selectedDoctor || !selectedClinic || !selectedDate) return [];
    const dayName = getDayName(selectedDate);
    const doctor = doctors.find(d => d.id === selectedDoctor);
    
    // Safety check - if doctor not found or no schedule for clinic
    if (!doctor || !doctor.schedule || !doctor.schedule[selectedClinic]) return [];
    
    const clinicSchedule = doctor.schedule[selectedClinic];
    const slots = [];
    
    // Ensure clinicSchedule is an array
    if (!Array.isArray(clinicSchedule)) return [];
    
    clinicSchedule.forEach(schedule => {
      if (schedule.days && schedule.days.includes(dayName)) {
        const [startTime, endTime] = (schedule.time || '').split('-');
        if (!startTime || !endTime) return;
        
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        let currentHour = startHour;
        let currentMin = startMin || 0;
        
        while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
          slots.push(`${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`);
          currentMin += 15;
          if (currentMin >= 60) { currentMin = 0; currentHour += 1; }
        }
      }
    });
    return slots;
  };

  const getAvailableClinics = () => {
    if (!selectedDoctor) return [];
    const doctor = doctors.find(d => d.id === selectedDoctor);
    if (!doctor || !doctor.schedule) return [];
    return clinics.filter(clinic => doctor.schedule[clinic.id]);
  };

  const sendOtp = async () => {
    if (!patientInfo.phone || patientInfo.phone.length < 10) {
      toast.error('Please enter a valid mobile number');
      return;
    }
    setOtpLoading(true);
    try {
      const response = await axios.post(`${API}/otp/send`, { phone: patientInfo.phone, service: 'diagyn' });
      setMockOtp(response.data.mock_otp || '');
      setResendTimer(30);
      toast.success(response.data.method === 'sms' ? 'OTP sent to your phone!' : 'OTP sent successfully!');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter complete 6-digit OTP');
      return;
    }
    setOtpLoading(true);
    try {
      const response = await axios.post(`${API}/otp/verify`, { phone: patientInfo.phone, otp: otpValue, service: 'diagyn' });
      setVerificationToken(response.data.verification_token);
      toast.success('Phone verified successfully!');
      setStep(5);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const goToOtpStep = () => {
    if (!patientInfo.name || !patientInfo.phone) {
      toast.error('Please fill name and mobile number');
      return;
    }
    if (patientInfo.phone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    // Email is optional - only validate if provided
    if (patientInfo.email && !patientInfo.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    // Skip OTP step - directly go to booking
    setStep(5);
    setVerificationToken('temp_verified_' + Date.now());
  };

  const handleBooking = async () => {
    // DiaGyn appointments are FREE - no payment required
    // Directly proceed with booking
    setLoading(true);
    try {
      const doctor = doctors.find(d => d.id === selectedDoctor);
      const clinic = clinics.find(c => c.id === selectedClinic);
      
      const bookingData = {
        doctor: doctor.name,
        clinic: clinic.name,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedSlot,
        patient_name: patientInfo.name,
        patient_phone: patientInfo.phone,
        patient_email: patientInfo.email || null,
        verification_token: verificationToken,
        email_reminder: emailReminder && patientInfo.email ? true : false,
        payment_method: 'free',  // No payment for appointments
        cashfree_order_id: null
      };

      await axios.post(`${API}/appointments`, bookingData);
      toast.success('Appointment booked! SMS confirmation sent.');
      showPromptAfterAction('appointment');
      if (emailReminder && patientInfo.email) {
        toast.info('Email reminder will be sent 1 hour before your appointment.');
      }
      navigate('/');
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Booking failed';
      if (errorMsg.includes('already booked')) {
        toast.error('This slot was just booked! Please select another.');
        fetchBookedSlots();
        setStep(3);
      } else if (errorMsg.includes('already have an active appointment')) {
        toast.error(errorMsg);  // Show full message about existing appointment
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const availableClinics = getAvailableClinics();
  const availableSlots = getAvailableSlots();
  const safeBookedSlots = Array.isArray(bookedSlots) ? bookedSlots : [];
  const unbookedSlots = availableSlots.filter(slot => !safeBookedSlots.includes(slot));

  const selectedDoctorData = doctors.find(d => d.id === selectedDoctor);
  const selectedClinicData = clinics.find(c => c.id === selectedClinic);

  const stepTitles = ['Doctor', 'Clinic', 'Schedule', 'Verify', 'Confirm'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0c1e3c] via-[#1a365d] to-[#0c1e3c]">
      {/* Shared Service Header with Zepto-style tabs */}
      <ServiceHeader />

      {/* Professional Features Carousel - DiaGyn Services */}
      <div className="py-6">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
            {/* Slide 1: Gynecology - Women's Health */}
            <div className="min-w-[300px] md:min-w-[380px] flex-shrink-0 snap-center">
              <div className="relative h-44 md:h-52 rounded-2xl overflow-hidden shadow-lg">
                <img 
                  src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=400&fit=crop"
                  alt="Gynecology"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600/90 via-pink-500/70 to-transparent"></div>
                <div className="absolute inset-0 p-5 flex flex-col justify-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 w-fit mb-2">
                    <span className="text-white text-xs font-bold">Women's Health</span>
                  </div>
                  <h3 className="text-white text-xl md:text-2xl font-bold mb-1">Expert Gynecology Care</h3>
                  <p className="text-white/90 text-sm">Prenatal, postnatal & complete women's wellness</p>
                </div>
              </div>
            </div>

            {/* Slide 2: Diabetes Care */}
            <div className="min-w-[300px] md:min-w-[380px] flex-shrink-0 snap-center">
              <div className="relative h-44 md:h-52 rounded-2xl overflow-hidden shadow-lg">
                <img 
                  src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&h=400&fit=crop"
                  alt="Diabetes Care"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-blue-500/70 to-transparent"></div>
                <div className="absolute inset-0 p-5 flex flex-col justify-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 w-fit mb-2">
                    <span className="text-white text-xs font-bold">Diabetes Management</span>
                  </div>
                  <h3 className="text-white text-xl md:text-2xl font-bold mb-1">Comprehensive Diabetes Care</h3>
                  <p className="text-white/90 text-sm">Blood sugar monitoring & lifestyle guidance</p>
                </div>
              </div>
            </div>

            {/* Slide 3: DiaGyn Brand */}
            <div className="min-w-[300px] md:min-w-[380px] flex-shrink-0 snap-center">
              <div className="relative h-44 md:h-52 rounded-2xl overflow-hidden shadow-lg">
                <img 
                  src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&h=400&fit=crop"
                  alt="DiaGyn Clinic"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-teal-700/90 via-teal-600/70 to-transparent"></div>
                <div className="absolute inset-0 p-5 flex flex-col justify-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 w-fit mb-2">
                    <span className="text-white text-xs font-bold">Trusted Since 2010</span>
                  </div>
                  <h3 className="text-white text-xl md:text-2xl font-bold mb-1">DiaGyn Clinic</h3>
                  <p className="text-white/90 text-sm">Your partner in diabetes & gynecology wellness</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Scroll Indicator Dots */}
          <div className="flex justify-center gap-2 mt-3">
            {[1, 2, 3].map((dot) => (
              <div key={dot} className="w-2 h-2 rounded-full bg-emerald-400/50"></div>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Step Progress */}
        <StepProgress currentStep={step} steps={stepTitles} />

        {/* Step 1: Select Doctor */}
        {step === 1 && (
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Choose Your Doctor
              </h1>
              <p className="text-emerald-200/80 max-w-md mx-auto" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Select a specialist for your consultation. View their qualifications and areas of expertise.
              </p>
            </div>
            
            {/* Doctor cards - Tablet: 2 cols with larger cards */}
            <div className={`grid gap-6 ${
              isTablet ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'
            }`}>
              {doctors.map(doctor => (
                <DoctorProfileCard
                  key={doctor.id}
                  doctor={doctor}
                  isSelected={selectedDoctor === doctor.id}
                  onSelect={() => {
                    setSelectedDoctor(doctor.id);
                    setSelectedClinic(null);
                    setSelectedDate(null);
                    setSelectedSlot(null);
                    setBookedSlots([]);
                  }}
                  isTablet={isTablet}
                />
              ))}
            </div>
            
            {selectedDoctor && (
              <div className="mt-10 flex justify-center">
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all text-base font-semibold"
                  onClick={() => setStep(2)}
                  data-testid="continue-to-clinic"
                >
                  Continue to Select Clinic
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Clinic */}
        {step === 2 && (
          <div className="animate-in fade-in duration-500">
            {/* Back Button */}
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
              data-testid="back-to-doctor"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Doctor Selection</span>
            </button>
            
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Select Clinic Location
              </h1>
              <p className="text-emerald-200/80 max-w-md mx-auto" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Choose your preferred clinic for the appointment with {selectedDoctorData?.name}
              </p>
            </div>
            
            {/* Clinic cards - Tablet: 2 cols with larger cards */}
            <div className={`grid gap-6 ${
              isTablet ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'
            }`}>
              {availableClinics.map(clinic => (
                <ClinicCard
                  key={clinic.id}
                  clinic={clinic}
                  isSelected={selectedClinic === clinic.id}
                  onSelect={() => {
                    setSelectedClinic(clinic.id);
                    setSelectedDate(null);
                    setSelectedSlot(null);
                    setBookedSlots([]);
                  }}
                />
              ))}
            </div>
            
            {selectedClinic && (
              <div className="mt-10 flex justify-center">
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all text-base font-semibold"
                  onClick={() => setStep(3)}
                  data-testid="continue-to-datetime"
                >
                  Continue to Select Date
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Date & Time */}
        {step === 3 && (
          <div className="animate-in fade-in duration-500">
            {/* Back Button */}
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
              data-testid="back-to-clinic"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Clinic Selection</span>
            </button>
            
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Pick Your Slot
              </h1>
              <p className="text-emerald-200/80 max-w-md mx-auto" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Select a convenient date and time for your appointment
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Calendar */}
              <div>
                <RichCalendar
                  selectedDate={selectedDate}
                  onSelect={(date) => { setSelectedDate(date); setSelectedSlot(null); }}
                  doctorSchedule={selectedDoctorData?.schedule}
                  clinicId={selectedClinic}
                />
                
                {/* Selected Date Info */}
                {selectedDate && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-2xl border border-orange-400/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-sm text-orange-300">
                          {unbookedSlots.length} slots available
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Time Slots */}
              <Card className="p-6 rounded-3xl border-[#0c1e3c] bg-[#152d4d]/80 shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
                <h3 className="font-bold text-lg mb-5 flex items-center gap-2 text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <Clock className="w-5 h-5 text-orange-500" />
                  Available Time Slots
                </h3>
                
                {selectedDate ? (
                  <TimeSlotPicker
                    slots={availableSlots}
                    bookedSlots={bookedSlots}
                    selectedSlot={selectedSlot}
                    onSelect={setSelectedSlot}
                    selectedDate={selectedDate}
                    currentTime={currentTime}
                    loading={loadingSlots}
                    wsConnected={wsConnected}
                    doctor={selectedDoctorData}
                    clinic={selectedClinic}
                    patientData={{ id: patientInfo.phone, name: patientInfo.name, phone: patientInfo.phone }}
                  />
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-[#CCFBF1]/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CalendarDays className="w-8 h-8 text-[#0F766E]" />
                    </div>
                    <p className="text-[#64748B] text-sm">Select a date to see available slots</p>
                  </div>
                )}
              </Card>
            </div>

            {/* Patient Info */}
            {selectedSlot && (
              <Card className="mt-6 p-6 rounded-3xl border-[#E2E8F0] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <h3 className="font-bold text-lg mb-5 flex items-center gap-2 text-[#134E4A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <User className="w-5 h-5 text-[#0F766E]" />
                  Your Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Patient Lookup by Mobile */}
                  <div className="sm:col-span-3">
                    <Label className="text-[#64748B] text-sm mb-2 block">Find or Register Patient</Label>
                    <PatientLookup
                      onPatientFound={handlePatientFound}
                      onNewPatient={handleNewPatient}
                      initialMobile={patientInfo.phone}
                    />
                  </div>
                  
                  {/* Show patient details if found */}
                  {foundPatient && (
                    <div className="sm:col-span-3 p-4 bg-[#99F6E4]/30 border border-[#99F6E4] rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#0F766E]/20 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-[#0F766E]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-[#134E4A]">{foundPatient.name}</h4>
                            <Badge className="bg-[#0F766E] text-white text-xs">{foundPatient.patient_id}</Badge>
                          </div>
                          <p className="text-sm text-[#64748B]">
                            {foundPatient.age && `${foundPatient.age} yrs • `}
                            {foundPatient.gender && `${foundPatient.gender} • `}
                            {foundPatient.total_visits > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <History className="w-3 h-3" />
                                {foundPatient.total_visits} visit{foundPatient.total_visits > 1 ? 's' : ''}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Manual entry fields (hidden if patient found) */}
                  {!foundPatient && (
                    <>
                      <div>
                        <Label className="text-[#64748B] text-sm">Full Name *</Label>
                        <Input
                          value={patientInfo.name}
                          onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                          placeholder="Enter your name"
                          className="mt-1.5 rounded-xl border-[#E2E8F0] focus:border-[#0F766E] focus:ring-[#CCFBF1]"
                          data-testid="patient-name"
                        />
                      </div>
                      <div>
                        <Label className="text-[#64748B] text-sm">Mobile Number *</Label>
                        <Input
                          value={patientInfo.phone}
                          onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          placeholder="10-digit number"
                          className="mt-1.5 rounded-xl border-[#E2E8F0] focus:border-[#0F766E] focus:ring-[#CCFBF1]"
                          data-testid="patient-phone"
                        />
                        {!bookingLimits.loading && !bookingLimits.canBook && bookingLimits.activeAppointment && (
                          <div className="mt-2 p-3 bg-[#FFD166]/20 border border-[#FFD166] rounded-xl text-xs text-[#134E4A]">
                            <p className="font-semibold">Active Appointment Found</p>
                            <p>You have an appointment on {bookingLimits.activeAppointment.date} at {bookingLimits.activeAppointment.time}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                  <div className={foundPatient ? 'sm:col-span-3' : ''}>
                    <Label className="text-[#64748B] text-sm">Email <span className="text-slate-400 text-xs">(Optional)</span></Label>
                    <Input
                      type="email"
                      value={patientInfo.email}
                      onChange={(e) => setPatientInfo({ ...patientInfo, email: e.target.value })}
                      placeholder="your@email.com (Optional)"
                      className="mt-1.5 rounded-xl border-[#E2E8F0] focus:border-[#0F766E] focus:ring-[#CCFBF1]"
                      data-testid="patient-email"
                    />
                    <p className="text-xs text-slate-400 mt-1">Optional - for appointment confirmation</p>
                  </div>
                </div>
                
                {patientInfo.email && (
                  <div className="mt-4 p-4 bg-[#CCFBF1]/30 rounded-xl border border-[#CCFBF1]">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailReminder}
                        onChange={(e) => setEmailReminder(e.target.checked)}
                        className="w-4 h-4 rounded border-[#0F766E] text-[#0F766E] focus:ring-[#CCFBF1]"
                        data-testid="email-reminder-checkbox"
                      />
                      <span className="font-medium text-[#134E4A] text-sm">
                        Send me an email reminder 1 hour before appointment
                      </span>
                    </label>
                  </div>
                )}

                <div className="mt-6 flex justify-center">
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all text-base font-semibold"
                    onClick={goToOtpStep}
                    data-testid="continue-to-otp"
                  >
                    Verify & Continue
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Step 4: OTP Verification */}
        {step === 4 && (
          <div className="animate-in fade-in duration-500">
            <Card className="max-w-md mx-auto p-8 rounded-3xl border-[#0c1e3c] bg-[#152d4d]/90 shadow-[0_20px_50px_rgb(0,0,0,0.3)]">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500/30 to-orange-600/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Shield className="w-10 h-10 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Verify Your Phone
                </h2>
                <p className="text-emerald-200/80 mt-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Enter the 6-digit code sent to +91 {patientInfo.phone}
                </p>
              </div>
              
              {mockOtp && (
                <div className="mb-6 p-4 bg-orange-500/20 border border-orange-400/50 rounded-xl text-center">
                  <p className="text-xs text-white">Demo OTP: <span className="font-mono font-bold text-lg text-orange-400">{mockOtp}</span></p>
                </div>
              )}
              
              <div className="flex justify-center gap-2.5 mb-8">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => otpRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-14 text-center text-xl font-bold border-2 border-[#0c1e3c] bg-[#1a365d] rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 outline-none transition-all text-white"
                    data-testid={`otp-input-${index}`}
                  />
                ))}
              </div>
              
              <Button
                onClick={verifyOtp}
                disabled={otpLoading || otp.join('').length !== 6}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-6 rounded-full text-base font-semibold"
                data-testid="verify-otp-btn"
              >
                {otpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify OTP'}
              </Button>
              
              <div className="mt-5 text-center">
                {resendTimer > 0 ? (
                  <p className="text-sm text-emerald-200/60">Resend OTP in {resendTimer}s</p>
                ) : (
                  <button onClick={sendOtp} disabled={otpLoading} className="text-sm text-orange-400 hover:text-orange-300 font-medium transition-colors">
                    Resend OTP
                  </button>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Step 5: Final Confirmation */}
        {step === 5 && (
          <div className="animate-in fade-in duration-500">
            <Card className="max-w-lg mx-auto p-8 rounded-3xl border-[#0c1e3c] bg-[#152d4d]/90 shadow-[0_20px_50px_rgb(0,0,0,0.3)]">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500/30 to-green-600/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Sparkles className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Confirm Your Booking
                </h2>
                <p className="text-emerald-200/80 mt-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Review your appointment details before confirming
                </p>
              </div>
              
              {/* Booking Summary */}
              <div className="space-y-4 bg-[#1a365d]/80 rounded-2xl p-5 border border-[#0c1e3c]">
                {/* Doctor Info */}
                <div className="flex items-center gap-4 pb-4 border-b border-[#0c1e3c]">
                  <img 
                    src={selectedDoctorData?.image} 
                    alt="" 
                    className="w-14 h-14 rounded-xl object-cover ring-2 ring-orange-500/50" 
                  />
                  <div>
                    <p className="font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {selectedDoctorData?.name}
                    </p>
                    <Badge className="bg-orange-500/20 text-orange-400 text-xs mt-1">
                      {selectedDoctorData?.specialty}
                    </Badge>
                  </div>
                </div>
                
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-[#0c1e3c] rounded-xl">
                    <p className="text-xs text-emerald-200/60 mb-1">Clinic</p>
                    <p className="font-semibold text-white text-sm">{selectedClinicData?.name}</p>
                  </div>
                  <div className="p-3 bg-[#0c1e3c] rounded-xl">
                    <p className="text-xs text-emerald-200/60 mb-1">Date</p>
                    <p className="font-semibold text-white text-sm">
                      {selectedDate && format(selectedDate, 'EEE, MMM d')}
                    </p>
                  </div>
                  <div className="p-3 bg-[#0c1e3c] rounded-xl">
                    <p className="text-xs text-emerald-200/60 mb-1">Time</p>
                    <p className="font-semibold text-white text-sm">{selectedSlot}</p>
                  </div>
                  <div className="p-3 bg-[#0c1e3c] rounded-xl">
                    <p className="text-xs text-emerald-200/60 mb-1">Patient</p>
                    <p className="font-semibold text-white text-sm">{patientInfo.name}</p>
                  </div>
                </div>
              </div>
              
              {/* Confirm Booking Button */}
              <Button
                onClick={handleBooking}
                disabled={loading}
                className="w-full mt-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-6 rounded-full text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                data-testid="confirm-booking-btn"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Appointment'}
              </Button>
            </Card>
          </div>
        )}
      </main>

      {/* Weekly Availability Dialog */}
      <Dialog open={showAvailability} onOpenChange={setShowAvailability}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <CalendarDays className="w-5 h-5 text-orange-500" />
              Weekly Doctor Availability
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {weeklyAvailability.map((day, i) => (
              <div key={i} className="p-4 bg-[#F0FDFA] rounded-xl border border-[#E2E8F0]">
                <p className="font-semibold mb-2 text-[#134E4A]">{day.date} ({day.day})</p>
                <div className="space-y-2 text-sm">
                  {day.doctors?.map((doc, j) => (
                    <div key={j} className="text-[#64748B]">
                      <span className="font-medium text-[#134E4A]">{doc.name}</span>
                      <div className="ml-4 mt-1 space-y-1">
                        {doc.clinics?.map((clinic, k) => (
                          <p key={k}>
                            📍 {clinic.name}: {clinic.sessions?.map(s => `${s.session} (${s.time})`).join(', ')}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Slots Dialog - Staff Only */}
      {selectedDoctorData && selectedClinicData && selectedDate && (
        <BlockSlotsDialog
          open={showBlockSlotsDialog}
          onOpenChange={setShowBlockSlotsDialog}
          doctor={selectedDoctorData.name}
          clinic={selectedClinicData.name}
          selectedDate={selectedDate}
          availableSlots={availableSlots}
          bookedSlots={bookedSlots}
          onSlotsBlocked={fetchBookedSlots}
        />
      )}

      {/* Patient Registration Dialog */}
      <PatientRegistrationDialog
        open={showRegisterDialog}
        onOpenChange={setShowRegisterDialog}
        initialMobile={mobileForRegister}
        registrationType="online"
        onSuccess={handleRegistrationSuccess}
      />

      <ActionPrompt />

      {/* Mango Health Labs Ad Banner */}
      <div className="max-w-5xl mx-auto mb-20">
        <ProtonAdBanner />
      </div>
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default DiaGyn;
