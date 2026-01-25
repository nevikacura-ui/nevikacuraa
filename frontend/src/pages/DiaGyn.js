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
import { FeeSelector } from '@/components/PaymentCheckout';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Clock, Ban, Shield, CheckCircle2, Loader2, 
  CalendarDays, Wifi, WifiOff, GraduationCap, Calendar,
  ChevronLeft, ChevronRight, User, Stethoscope, Building2, Heart, Sparkles,
  Lock, Unlock, AlertTriangle, Settings, UserPlus, Phone, History, CreditCard, IndianRupee
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
// DESIGN SYSTEM - Serene Care Pastel Theme
// ============================================
const theme = {
  primary: { main: '#5FA8D3', light: '#CAE9FF', dark: '#1B4965' },
  secondary: { main: '#62B6CB', light: '#BEE9E8', dark: '#1B4965' },
  accent: { main: '#FFB4A2', light: '#FFD6BA' },
  neutral: { background: '#FDFBF7', surface: '#FFFFFF', textPrimary: '#1E293B', textSecondary: '#64748B', border: '#E2E8F0' },
  status: { success: '#A7C957', error: '#EF476F', warning: '#FFD166' }
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
    image: 'https://customer-assets.emergentagent.com/job_1d0b9312-d1f2-40d1-b78f-c0c28fa95ba1/artifacts/kqjjgvou_IMG-20260108-WA0000.jpg',
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
  { id: 'pushpa', name: 'Pushpa Clinic', address: 'A-1, Sai Darshan, Near Don Bosco High School, Naigaon East', image: 'https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/94uk5pro_5_20260102_012214_0001.png' },
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
        relative overflow-hidden cursor-pointer transition-all duration-300 
        rounded-3xl p-1 group
        ${isSelected 
          ? 'bg-gradient-to-br from-[#5FA8D3] via-[#62B6CB] to-[#FFB4A2] shadow-[0_20px_50px_rgb(0,0,0,0.1)]' 
          : 'bg-gradient-to-br from-slate-100 to-slate-50 hover:from-[#CAE9FF] hover:to-[#BEE9E8] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]'
        }
      `}
    >
      <div className={`bg-white rounded-[22px] h-full ${isTablet ? 'p-6' : 'p-5'}`}>
        {/* Selection Badge */}
        {isSelected && (
          <div className="absolute top-4 right-4 z-10">
            <Badge className={`bg-[#5FA8D3] text-white rounded-full flex items-center gap-1.5 shadow-lg ${isTablet ? 'px-4 py-1.5 text-sm' : 'px-3 py-1'}`}>
              <CheckCircle2 className={isTablet ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
              Selected
            </Badge>
          </div>
        )}

        {/* Top Section - Image & Basic Info */}
        <div className={`flex ${isTablet ? 'gap-6' : 'gap-5'}`}>
          {/* Doctor Image */}
          <div className="relative flex-shrink-0">
            <div className={`rounded-2xl overflow-hidden ring-4 transition-all duration-300 ${isTablet ? 'w-28 h-28' : 'w-24 h-24'} ${isSelected ? 'ring-[#5FA8D3]/30' : 'ring-[#BEE9E8]/50 group-hover:ring-[#5FA8D3]/20'}`}>
              <img 
                src={doctor.image} 
                alt={doctor.name}
                className="w-full h-full object-cover"
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
            <h3 className={`font-bold text-[#1B4965] mb-1 truncate ${isTablet ? 'text-2xl' : 'text-xl'}`} style={{ fontFamily: 'Outfit, sans-serif' }}>
              {doctor.name}
            </h3>
            <Badge className={`bg-[#BEE9E8] text-[#1B4965] rounded-full font-medium border-0 mb-3 ${isTablet ? 'px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs'}`}>
              <Stethoscope className={isTablet ? 'w-4 h-4 mr-2' : 'w-3 h-3 mr-1.5'} />
              {doctor.specialty}
            </Badge>
            
            {/* Quick Stats */}
            <div className={`flex items-center gap-3 text-[#64748B] ${isTablet ? 'text-sm' : 'text-xs'}`}>
              <span className="flex items-center gap-1">
                <Heart className={isTablet ? 'w-4 h-4 text-[#FFB4A2]' : 'w-3.5 h-3.5 text-[#FFB4A2]'} />
                {doctor.patients} patients
              </span>
              <span>•</span>
              <span>{doctor.experience}</span>
            </div>
          </div>
        </div>

        {/* Degree & Qualifications - HIGHLIGHTED */}
        <div className={`bg-gradient-to-r from-[#CAE9FF]/40 to-[#BEE9E8]/40 rounded-2xl border border-[#CAE9FF]/60 ${isTablet ? 'mt-6 p-5' : 'mt-5 p-4'}`}>
          <div className="flex items-start gap-3">
            <div className={`rounded-xl bg-[#5FA8D3]/20 flex items-center justify-center flex-shrink-0 ${isTablet ? 'w-10 h-10' : 'w-8 h-8'}`}>
              <GraduationCap className={isTablet ? 'w-5 h-5 text-[#5FA8D3]' : 'w-4 h-4 text-[#5FA8D3]'} />
            </div>
            <div>
              <p className={`font-semibold text-[#1B4965] uppercase tracking-wide mb-1 ${isTablet ? 'text-sm' : 'text-xs'}`}>
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
              className="text-xs bg-white border-[#E2E8F0] text-[#64748B] px-2.5 py-1 rounded-full hover:bg-[#FDFBF7] hover:border-[#5FA8D3] transition-colors"
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
// CLINIC SELECTION CARD - Pastel Design
// ============================================
const ClinicCard = ({ clinic, isSelected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      data-testid={`clinic-card-${clinic.id}`}
      className={`
        relative overflow-hidden cursor-pointer transition-all duration-300 
        rounded-3xl group
        ${isSelected 
          ? 'ring-2 ring-[#5FA8D3] shadow-[0_20px_50px_rgb(0,0,0,0.1)]' 
          : 'ring-1 ring-[#E2E8F0] hover:ring-[#5FA8D3]/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]'
        }
      `}
    >
      {/* Clinic Image */}
      <div className="h-36 overflow-hidden relative">
        <img src={clinic.image} alt={clinic.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {isSelected && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-[#5FA8D3] text-white px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Selected
            </Badge>
          </div>
        )}
      </div>
      
      {/* Clinic Info */}
      <div className="p-5 bg-white">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#BEE9E8] flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-[#1B4965]" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-[#1B4965]" style={{ fontFamily: 'Outfit, sans-serif' }}>
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
      <div className="bg-gradient-to-r from-[#5FA8D3] to-[#62B6CB] px-5 py-4">
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
      <div className="grid grid-cols-7 bg-[#FDFBF7] border-b border-[#E2E8F0]">
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
                    ? 'bg-[#5FA8D3] text-white shadow-lg scale-105' 
                    : isTodayDate
                      ? 'bg-[#CAE9FF] text-[#1B4965] hover:bg-[#5FA8D3] hover:text-white font-bold'
                      : isAvailable
                        ? 'hover:bg-[#BEE9E8] text-[#1B4965]'
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
      <div className="px-4 py-3 bg-[#FDFBF7] border-t border-[#E2E8F0] flex items-center gap-5 text-xs" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#A7C957] rounded-full" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#5FA8D3] rounded-full" />
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
const TimeSlotPicker = ({ slots, bookedSlots, selectedSlot, onSelect, selectedDate, currentTime, loading, wsConnected }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#5FA8D3] mx-auto mb-3" />
          <p className="text-[#64748B] text-sm">Loading available slots...</p>
        </div>
      </div>
    );
  }

  const unbookedSlots = slots.filter(slot => !bookedSlots.includes(slot));

  if (unbookedSlots.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-[#FFD6BA]/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-[#FFB4A2]" />
        </div>
        <p className="text-[#64748B] text-sm">No slots available for this day</p>
      </div>
    );
  }

  return (
    <div>
      {/* Connection Status & Time Period Legend */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 text-xs" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#FFD166]" />
            Morning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#5FA8D3]" />
            Evening
          </span>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-medium ${wsConnected ? 'text-[#A7C957]' : 'text-[#64748B]'}`}>
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
                  ? 'bg-[#F8FAFC] text-[#CBD5E1] border-[#E2E8F0] cursor-not-allowed line-through'
                  : selectedSlot === slot 
                    ? 'bg-[#5FA8D3] text-white border-[#5FA8D3] shadow-lg scale-105' 
                    : isMorning
                      ? 'bg-[#FFD166]/10 border-[#FFD166]/30 text-[#1B4965] hover:bg-[#FFD166]/20 hover:border-[#FFD166]'
                      : isEvening
                        ? 'bg-[#5FA8D3]/10 border-[#5FA8D3]/30 text-[#1B4965] hover:bg-[#5FA8D3]/20 hover:border-[#5FA8D3]'
                        : 'bg-white border-[#E2E8F0] hover:border-[#5FA8D3] text-[#1B4965]'
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
          <DialogTitle className="flex items-center gap-2 text-[#1B4965]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Lock className="w-5 h-5 text-[#EF476F]" />
            Manage Slot Blocking
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="p-3 bg-[#5FA8D3]/10 border border-[#5FA8D3]/30 rounded-xl">
            <div className="flex items-start gap-2">
              <Stethoscope className="w-4 h-4 text-[#5FA8D3] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#1B4965]">
                <span className="font-semibold">Doctor Access:</span> Block your appointment slots when running late or unavailable.
                Patients will not be able to book blocked slots.
              </p>
            </div>
          </div>

          {/* Selected Context */}
          <div className="p-4 bg-[#FDFBF7] rounded-xl border border-[#E2E8F0]">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[#64748B] text-xs">Doctor</p>
                <p className="font-semibold text-[#1B4965]">{doctor}</p>
              </div>
              <div>
                <p className="text-[#64748B] text-xs">Clinic</p>
                <p className="font-semibold text-[#1B4965]">{clinic}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[#64748B] text-xs">Date</p>
                <p className="font-semibold text-[#1B4965]">
                  {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>

          {/* Currently Blocked Slots */}
          {blockedSlots.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-[#1B4965] flex items-center gap-2">
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
              className="mt-1.5 rounded-xl border-[#E2E8F0] focus:border-[#5FA8D3]"
              data-testid="block-reason-input"
            />
          </div>

          {/* Available Slots to Block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-[#1B4965] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#5FA8D3]" />
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
                <Loader2 className="w-6 h-6 animate-spin text-[#5FA8D3]" />
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
                            : 'bg-white border-[#E2E8F0] text-[#1B4965] hover:border-[#EF476F] hover:bg-[#EF476F]/5'
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
          className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-[#5FA8D3] to-[#62B6CB] transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />
        
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col items-center relative z-10">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2
              ${i + 1 < currentStep 
                ? 'bg-[#A7C957] border-[#A7C957] text-white' 
                : i + 1 === currentStep 
                  ? 'bg-[#5FA8D3] border-[#5FA8D3] text-white shadow-lg scale-110' 
                  : 'bg-white border-[#E2E8F0] text-[#64748B]'
              }
            `}>
              {i + 1 < currentStep ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span 
              className={`mt-2 text-xs text-center max-w-[60px] leading-tight ${i + 1 === currentStep ? 'text-[#5FA8D3] font-semibold' : 'text-[#64748B]'}`}
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
    const clinicSchedule = doctor.schedule[selectedClinic];
    const slots = [];
    
    clinicSchedule.forEach(schedule => {
      if (schedule.days.includes(dayName)) {
        const [startTime, endTime] = schedule.time.split('-');
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        let currentHour = startHour;
        let currentMin = startMin;
        
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
    setStep(4);
    sendOtp();
  };

  const handleBooking = async () => {
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
        email_reminder: emailReminder && patientInfo.email ? true : false
      };

      await axios.post(`${API}/appointments`, bookingData);
      toast.success('Appointment booked! SMS confirmation sent.');
      showPromptAfterAction('appointment');
      if (emailReminder && patientInfo.email) {
        toast.info('Email reminder will be sent 1 hour before your appointment.');
      }
      navigate('/');
    } catch (error) {
      if (error.response?.data?.detail?.includes('already booked')) {
        toast.error('This slot was just booked! Please select another.');
        fetchBookedSlots();
        setStep(3);
      } else {
        toast.error(error.response?.data?.detail || 'Booking failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const availableClinics = getAvailableClinics();
  const availableSlots = getAvailableSlots();
  const unbookedSlots = availableSlots.filter(slot => !bookedSlots.includes(slot));

  const selectedDoctorData = doctors.find(d => d.id === selectedDoctor);
  const selectedClinicData = clinics.find(c => c.id === selectedClinic);

  const stepTitles = ['Doctor', 'Clinic', 'Schedule', 'Verify', 'Confirm'];

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-[#E2E8F0] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => step === 1 ? navigate('/') : setStep(step - 1)}
                data-testid="back-button"
                className="rounded-full hover:bg-[#CAE9FF]/50"
              >
                <ArrowLeft className="w-5 h-5 text-[#1B4965]" />
              </Button>
              <img 
                src="https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/e4jrn2os_6_20260107_021040_0003.jpg" 
                alt="DiaGyn" 
                className="h-10 w-auto"
                data-testid="diagyn-logo"
              />
            </div>
            <div className="flex items-center gap-2">
              {/* Doctor Block Slots Button - Only shown when respective doctor is logged in */}
              {canBlockSlotsForDoctor() && step === 3 && selectedDoctor && selectedClinic && selectedDate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBlockSlotsDialog(true)}
                  className="flex items-center gap-2 rounded-full border-[#EF476F] text-[#EF476F] hover:bg-[#EF476F]/10"
                  data-testid="block-slots-btn"
                >
                  <Lock className="w-4 h-4" />
                  <span className="hidden sm:inline">Block Slots</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchWeeklyAvailability}
                disabled={loadingAvailability}
                className="flex items-center gap-2 rounded-full border-[#5FA8D3] text-[#5FA8D3] hover:bg-[#CAE9FF]/30"
                data-testid="view-availability-btn"
              >
                {loadingAvailability ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                <span className="hidden sm:inline">Schedule</span>
              </Button>
              {/* View Mode Switcher */}
              <ViewModeSwitcher compact />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Step Progress */}
        <StepProgress currentStep={step} steps={stepTitles} />

        {/* Step 1: Select Doctor */}
        {step === 1 && (
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold text-[#1B4965] mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Choose Your Doctor
              </h1>
              <p className="text-[#64748B] max-w-md mx-auto" style={{ fontFamily: 'DM Sans, sans-serif' }}>
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
                  className="bg-gradient-to-r from-[#5FA8D3] to-[#62B6CB] hover:from-[#1B4965] hover:to-[#5FA8D3] text-white px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all text-base font-semibold"
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
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold text-[#1B4965] mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Select Clinic Location
              </h1>
              <p className="text-[#64748B] max-w-md mx-auto" style={{ fontFamily: 'DM Sans, sans-serif' }}>
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
                  className="bg-gradient-to-r from-[#5FA8D3] to-[#62B6CB] hover:from-[#1B4965] hover:to-[#5FA8D3] text-white px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all text-base font-semibold"
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
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold text-[#1B4965] mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Pick Your Slot
              </h1>
              <p className="text-[#64748B] max-w-md mx-auto" style={{ fontFamily: 'DM Sans, sans-serif' }}>
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
                  <div className="mt-4 p-4 bg-gradient-to-r from-[#CAE9FF]/50 to-[#BEE9E8]/50 rounded-2xl border border-[#CAE9FF]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#5FA8D3] flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#1B4965]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-sm text-[#5FA8D3]">
                          {unbookedSlots.length} slots available
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Time Slots */}
              <Card className="p-6 rounded-3xl border-[#E2E8F0] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <h3 className="font-bold text-lg mb-5 flex items-center gap-2 text-[#1B4965]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <Clock className="w-5 h-5 text-[#5FA8D3]" />
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
                  />
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-[#CAE9FF]/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CalendarDays className="w-8 h-8 text-[#5FA8D3]" />
                    </div>
                    <p className="text-[#64748B] text-sm">Select a date to see available slots</p>
                  </div>
                )}
              </Card>
            </div>

            {/* Patient Info */}
            {selectedSlot && (
              <Card className="mt-6 p-6 rounded-3xl border-[#E2E8F0] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <h3 className="font-bold text-lg mb-5 flex items-center gap-2 text-[#1B4965]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <User className="w-5 h-5 text-[#5FA8D3]" />
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
                    <div className="sm:col-span-3 p-4 bg-[#BEE9E8]/30 border border-[#BEE9E8] rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#5FA8D3]/20 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-[#5FA8D3]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-[#1B4965]">{foundPatient.name}</h4>
                            <Badge className="bg-[#5FA8D3] text-white text-xs">{foundPatient.patient_id}</Badge>
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
                          className="mt-1.5 rounded-xl border-[#E2E8F0] focus:border-[#5FA8D3] focus:ring-[#CAE9FF]"
                          data-testid="patient-name"
                        />
                      </div>
                      <div>
                        <Label className="text-[#64748B] text-sm">Mobile Number *</Label>
                        <Input
                          value={patientInfo.phone}
                          onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          placeholder="10-digit number"
                          className="mt-1.5 rounded-xl border-[#E2E8F0] focus:border-[#5FA8D3] focus:ring-[#CAE9FF]"
                          data-testid="patient-phone"
                        />
                        {!bookingLimits.loading && !bookingLimits.canBook && bookingLimits.activeAppointment && (
                          <div className="mt-2 p-3 bg-[#FFD166]/20 border border-[#FFD166] rounded-xl text-xs text-[#1B4965]">
                            <p className="font-semibold">Active Appointment Found</p>
                            <p>You have an appointment on {bookingLimits.activeAppointment.date} at {bookingLimits.activeAppointment.time}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                  <div className={foundPatient ? 'sm:col-span-3' : ''}>
                    <Label className="text-[#64748B] text-sm">Email (Optional)</Label>
                    <Input
                      type="email"
                      value={patientInfo.email}
                      onChange={(e) => setPatientInfo({ ...patientInfo, email: e.target.value })}
                      placeholder="your@email.com"
                      className="mt-1.5 rounded-xl border-[#E2E8F0] focus:border-[#5FA8D3] focus:ring-[#CAE9FF]"
                      data-testid="patient-email"
                    />
                  </div>
                </div>
                
                {patientInfo.email && (
                  <div className="mt-4 p-4 bg-[#CAE9FF]/30 rounded-xl border border-[#CAE9FF]">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailReminder}
                        onChange={(e) => setEmailReminder(e.target.checked)}
                        className="w-4 h-4 rounded border-[#5FA8D3] text-[#5FA8D3] focus:ring-[#CAE9FF]"
                        data-testid="email-reminder-checkbox"
                      />
                      <span className="font-medium text-[#1B4965] text-sm">
                        Send me an email reminder 1 hour before appointment
                      </span>
                    </label>
                  </div>
                )}

                <div className="mt-6 flex justify-center">
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-[#5FA8D3] to-[#62B6CB] hover:from-[#1B4965] hover:to-[#5FA8D3] text-white px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all text-base font-semibold"
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
            <Card className="max-w-md mx-auto p-8 rounded-3xl border-[#E2E8F0] shadow-[0_20px_50px_rgb(0,0,0,0.1)]">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-[#CAE9FF] to-[#BEE9E8] rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Shield className="w-10 h-10 text-[#5FA8D3]" />
                </div>
                <h2 className="text-2xl font-bold text-[#1B4965]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Verify Your Phone
                </h2>
                <p className="text-[#64748B] mt-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Enter the 6-digit code sent to +91 {patientInfo.phone}
                </p>
              </div>
              
              {mockOtp && (
                <div className="mb-6 p-4 bg-[#FFD166]/20 border border-[#FFD166] rounded-xl text-center">
                  <p className="text-xs text-[#1B4965]">Demo OTP: <span className="font-mono font-bold text-lg">{mockOtp}</span></p>
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
                    className="w-12 h-14 text-center text-xl font-bold border-2 border-[#E2E8F0] rounded-xl focus:border-[#5FA8D3] focus:ring-2 focus:ring-[#CAE9FF] outline-none transition-all text-[#1B4965]"
                    data-testid={`otp-input-${index}`}
                  />
                ))}
              </div>
              
              <Button
                onClick={verifyOtp}
                disabled={otpLoading || otp.join('').length !== 6}
                className="w-full bg-gradient-to-r from-[#5FA8D3] to-[#62B6CB] hover:from-[#1B4965] hover:to-[#5FA8D3] text-white py-6 rounded-full text-base font-semibold"
                data-testid="verify-otp-btn"
              >
                {otpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify OTP'}
              </Button>
              
              <div className="mt-5 text-center">
                {resendTimer > 0 ? (
                  <p className="text-sm text-[#64748B]">Resend OTP in {resendTimer}s</p>
                ) : (
                  <button onClick={sendOtp} disabled={otpLoading} className="text-sm text-[#5FA8D3] hover:text-[#1B4965] font-medium transition-colors">
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
            <Card className="max-w-lg mx-auto p-8 rounded-3xl border-[#E2E8F0] shadow-[0_20px_50px_rgb(0,0,0,0.1)]">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-[#A7C957]/30 to-[#A7C957]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Sparkles className="w-10 h-10 text-[#A7C957]" />
                </div>
                <h2 className="text-2xl font-bold text-[#1B4965]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Confirm Your Booking
                </h2>
                <p className="text-[#64748B] mt-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Review your appointment details before confirming
                </p>
              </div>
              
              {/* Booking Summary */}
              <div className="space-y-4 bg-[#FDFBF7] rounded-2xl p-5 border border-[#E2E8F0]">
                {/* Doctor Info */}
                <div className="flex items-center gap-4 pb-4 border-b border-[#E2E8F0]">
                  <img 
                    src={selectedDoctorData?.image} 
                    alt="" 
                    className="w-14 h-14 rounded-xl object-cover ring-2 ring-[#BEE9E8]" 
                  />
                  <div>
                    <p className="font-bold text-[#1B4965]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {selectedDoctorData?.name}
                    </p>
                    <Badge className="bg-[#BEE9E8] text-[#1B4965] text-xs mt-1">
                      {selectedDoctorData?.specialty}
                    </Badge>
                  </div>
                </div>
                
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-xl">
                    <p className="text-xs text-[#64748B] mb-1">Clinic</p>
                    <p className="font-semibold text-[#1B4965] text-sm">{selectedClinicData?.name}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl">
                    <p className="text-xs text-[#64748B] mb-1">Date</p>
                    <p className="font-semibold text-[#1B4965] text-sm">
                      {selectedDate && format(selectedDate, 'EEE, MMM d')}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl">
                    <p className="text-xs text-[#64748B] mb-1">Time</p>
                    <p className="font-semibold text-[#1B4965] text-sm">{selectedSlot}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl">
                    <p className="text-xs text-[#64748B] mb-1">Patient</p>
                    <p className="font-semibold text-[#1B4965] text-sm">{patientInfo.name}</p>
                  </div>
                </div>
              </div>
              
              {/* Confirm Booking Button */}
              <Button
                onClick={handleBooking}
                disabled={loading}
                className="w-full mt-6 bg-gradient-to-r from-[#A7C957] to-[#62B6CB] hover:from-[#62B6CB] hover:to-[#A7C957] text-white py-6 rounded-full text-base font-semibold shadow-lg hover:shadow-xl transition-all"
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
            <DialogTitle className="flex items-center gap-2 text-[#1B4965]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <CalendarDays className="w-5 h-5 text-[#5FA8D3]" />
              Weekly Doctor Availability
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {weeklyAvailability.map((day, i) => (
              <div key={i} className="p-4 bg-[#FDFBF7] rounded-xl border border-[#E2E8F0]">
                <p className="font-semibold mb-2 text-[#1B4965]">{day.date} ({day.day})</p>
                <div className="space-y-2 text-sm">
                  {day.doctors?.map((doc, j) => (
                    <div key={j} className="text-[#64748B]">
                      <span className="font-medium text-[#1B4965]">{doc.name}</span>
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
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default DiaGyn;
