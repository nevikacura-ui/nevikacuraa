import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Clock, MapPin, Ban, Shield, CheckCircle2, Loader2, Phone, 
  CalendarDays, Wifi, WifiOff, Star, Award, GraduationCap, Calendar,
  ChevronLeft, ChevronRight, User, Mail, Stethoscope, Building2
} from 'lucide-react';
import { format, isSunday, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isPast } from 'date-fns';
import { useNotificationPrompt } from '@/components/NotificationPrompt';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const getWsUrl = () => {
  const url = new URL(BACKEND_URL);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}`;
};
const WS_URL = getWsUrl();
const WHATSAPP_NUMBER = '+917039020020';

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

// Rich Calendar Component
const RichCalendar = ({ selectedDate, onSelect, disabledDays, doctorSchedule, clinicId }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get day of week for first day (0 = Sunday)
  const startDay = monthStart.getDay();
  const emptyDays = Array(startDay).fill(null);
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Check if doctor is available on a given day
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
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Month Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setCurrentMonth(prev => addDays(startOfMonth(prev), -1))}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h3 className="text-lg font-bold text-white">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button 
            onClick={() => setCurrentMonth(prev => addDays(endOfMonth(prev), 1))}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
      
      {/* Day Names */}
      <div className="grid grid-cols-7 bg-gray-50 border-b">
        {dayNames.map(day => (
          <div key={day} className={`py-2 text-center text-xs font-semibold ${day === 'Sun' ? 'text-red-400' : 'text-gray-500'}`}>
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1 p-2">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="h-10" />
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
              className={`
                h-10 w-full rounded-lg text-sm font-medium transition-all relative
                ${disabled 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : isSelected 
                    ? 'bg-blue-600 text-white shadow-lg scale-105' 
                    : isTodayDate
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : isAvailable
                        ? 'hover:bg-gray-100 text-gray-700'
                        : 'text-gray-300'
                }
              `}
            >
              {format(day, 'd')}
              {isAvailable && !disabled && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="px-4 py-3 bg-gray-50 border-t flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          Available
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-blue-600 rounded-full" />
          Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-gray-300 rounded-full" />
          Unavailable
        </span>
      </div>
    </div>
  );
};

// Doctor Profile Card Component
const DoctorProfileCard = ({ doctor, isSelected, onSelect }) => {
  return (
    <Card 
      className={`overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl ${
        isSelected ? 'ring-2 ring-blue-500 shadow-xl scale-[1.02]' : 'hover:scale-[1.01]'
      }`}
      onClick={onSelect}
      data-testid={`doctor-card-${doctor.id}`}
    >
      {/* Header with gradient */}
      <div className="relative h-32 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600">
        <div className="absolute inset-0 bg-black/10" />
        {isSelected && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-white text-blue-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Selected
            </Badge>
          </div>
        )}
      </div>
      
      {/* Profile Image */}
      <div className="relative px-4 -mt-16">
        <div className="relative">
          <img 
            src={doctor.image} 
            alt={doctor.name}
            className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-lg"
            data-testid={`doctor-image-${doctor.id}`}
          />
          <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            {doctor.rating}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 pt-2">
        <h3 className="text-xl font-bold text-gray-900">{doctor.name}</h3>
        <p className="text-blue-600 font-medium flex items-center gap-1 mt-1">
          <Stethoscope className="w-4 h-4" />
          {doctor.specialty}
        </p>
        
        {/* Qualifications */}
        <div className="flex items-start gap-2 mt-3 text-sm text-gray-600">
          <GraduationCap className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="line-clamp-2">{doctor.qualifications}</p>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-gray-900">{doctor.experience}</p>
            <p className="text-xs text-gray-500">Experience</p>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-gray-900">{doctor.patients}</p>
            <p className="text-xs text-gray-500">Patients</p>
          </div>
        </div>
        
        {/* Specializations */}
        <div className="flex flex-wrap gap-1 mt-4">
          {doctor.specializations.map((spec, i) => (
            <Badge key={i} variant="secondary" className="text-xs bg-blue-50 text-blue-700">
              {spec}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
};

const DiaGyn = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [otpMethod, setOtpMethod] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);
  const [showAvailability, setShowAvailability] = useState(false);
  const [weeklyAvailability, setWeeklyAvailability] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityClinic, setAvailabilityClinic] = useState('pushpa');
  const [emailReminder, setEmailReminder] = useState(true);
  const [bookingLimits, setBookingLimits] = useState({
    canBook: true,
    activeAppointment: null,
    loading: true
  });

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
          } catch (e) {}
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
      setOtpMethod(response.data.method || 'mock');
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

  const stepTitles = ['Select Doctor', 'Select Clinic', 'Date & Time', 'Verify Phone', 'Confirm'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => step === 1 ? navigate('/') : setStep(step === 4 ? 3 : step === 5 ? 4 : step - 1)}
                data-testid="back-button"
                className="rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img 
                src="https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/e4jrn2os_6_20260107_021040_0003.jpg" 
                alt="DiaGyn" 
                className="h-12 w-auto"
                data-testid="diagyn-logo"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchWeeklyAvailability}
              disabled={loadingAvailability}
              className="flex items-center gap-2"
              data-testid="view-availability-btn"
            >
              {loadingAvailability ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
              <span className="hidden sm:inline">Weekly Schedule</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {stepTitles.map((title, i) => (
              <div key={i} className={`flex items-center ${i < stepTitles.length - 1 ? 'flex-1' : ''}`}>
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                  ${i + 1 < step ? 'bg-green-500 text-white' : i + 1 === step ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-200 text-gray-500'}
                `}>
                  {i + 1 < step ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                {i < stepTitles.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${i + 1 < step ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {stepTitles.map((title, i) => (
              <span key={i} className={`text-xs ${i + 1 === step ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                {title}
              </span>
            ))}
          </div>
        </div>

        {/* Step 1: Select Doctor */}
        {step === 1 && (
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Doctor</h1>
              <p className="text-gray-600">Select a specialist for your consultation</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                />
              ))}
            </div>
            {selectedDoctor && (
              <div className="mt-8 flex justify-center">
                <Button 
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 px-8"
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
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Clinic Location</h1>
              <p className="text-gray-600">Choose your preferred clinic for the appointment</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableClinics.map(clinic => (
                <Card 
                  key={clinic.id}
                  className={`overflow-hidden cursor-pointer transition-all duration-300 ${
                    selectedClinic === clinic.id ? 'ring-2 ring-blue-500 shadow-xl' : 'hover:shadow-lg'
                  }`}
                  onClick={() => {
                    setSelectedClinic(clinic.id);
                    setSelectedDate(null);
                    setSelectedSlot(null);
                    setBookedSlots([]);
                  }}
                  data-testid={`clinic-card-${clinic.id}`}
                >
                  <div className="h-40 overflow-hidden relative">
                    <img src={clinic.image} alt={clinic.name} className="w-full h-full object-cover" />
                    {selectedClinic === clinic.id && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-blue-600 text-white">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Selected
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-lg">{clinic.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{clinic.address}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {selectedClinic && (
              <div className="mt-8 flex justify-center">
                <Button 
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 px-8"
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
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Pick Your Slot</h1>
              <p className="text-gray-600">Select a date and time that works for you</p>
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
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-semibold text-blue-900">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                        <p className="text-sm text-blue-600">{unbookedSlots.length} slots available</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Time Slots */}
              <Card className="p-5">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Available Time Slots
                  {selectedDate && (
                    <span className={`ml-auto flex items-center gap-1 text-xs font-normal ${wsConnected ? 'text-green-600' : 'text-gray-400'}`}>
                      {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                      {wsConnected ? 'Live' : 'Offline'}
                    </span>
                  )}
                </h3>
                
                {selectedDate ? (
                  loadingSlots ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : unbookedSlots.length > 0 ? (
                    <div>
                      {/* Time Period Labels */}
                      <div className="flex gap-4 mb-4 text-xs">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400"></span> Morning</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-500"></span> Evening</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto">
                        {availableSlots.map(slot => {
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
                              onClick={() => !isDisabled && setSelectedSlot(slot)}
                              disabled={isDisabled}
                              className={`p-3 text-sm rounded-xl border-2 transition-all font-medium ${
                                isPastSlot
                                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                                  : isBooked 
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through' 
                                    : selectedSlot === slot 
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' 
                                      : isMorning
                                        ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-400'
                                        : isEvening
                                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400'
                                          : 'hover:border-blue-400 hover:bg-blue-50'
                              }`}
                              data-testid={`slot-${slot}`}
                              title={isPastSlot ? 'Time has passed' : isBooked ? 'Already booked' : 'Available'}
                            >
                              {(isBooked || isPastSlot) && <Ban className="w-3 h-3 inline mr-1" />}
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No slots available for this day</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12">
                    <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Select a date to see available slots</p>
                  </div>
                )}
              </Card>
            </div>

            {/* Patient Info */}
            {selectedSlot && (
              <Card className="mt-6 p-5">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Your Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-700">Full Name *</Label>
                    <Input
                      value={patientInfo.name}
                      onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                      placeholder="Enter your name"
                      className="mt-1"
                      data-testid="patient-name"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">Mobile Number *</Label>
                    <Input
                      value={patientInfo.phone}
                      onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="10-digit number"
                      className="mt-1"
                      data-testid="patient-phone"
                    />
                    {!bookingLimits.loading && !bookingLimits.canBook && bookingLimits.activeAppointment && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-800">
                        <p className="font-semibold">⚠️ Active Appointment Found</p>
                        <p>You have an appointment on {bookingLimits.activeAppointment.date} at {bookingLimits.activeAppointment.time}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-700">Email (Optional)</Label>
                    <Input
                      type="email"
                      value={patientInfo.email}
                      onChange={(e) => setPatientInfo({ ...patientInfo, email: e.target.value })}
                      placeholder="your@email.com"
                      className="mt-1"
                      data-testid="patient-email"
                    />
                  </div>
                </div>
                
                {patientInfo.email && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailReminder}
                        onChange={(e) => setEmailReminder(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                        data-testid="email-reminder-checkbox"
                      />
                      <div>
                        <span className="font-medium text-blue-800 text-sm">Email reminder 1 hour before</span>
                      </div>
                    </label>
                  </div>
                )}

                <div className="mt-6 flex justify-center">
                  <Button 
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 px-8"
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
            <Card className="max-w-md mx-auto p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Verify Your Phone</h2>
                <p className="text-gray-600 mt-2">Enter the 6-digit code sent to +91 {patientInfo.phone}</p>
              </div>
              
              {mockOtp && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <p className="text-xs text-amber-700">Demo OTP: <span className="font-mono font-bold">{mockOtp}</span></p>
                </div>
              )}
              
              <div className="flex justify-center gap-2 mb-6">
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
                    className="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    data-testid={`otp-input-${index}`}
                  />
                ))}
              </div>
              
              <Button
                onClick={verifyOtp}
                disabled={otpLoading || otp.join('').length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="verify-otp-btn"
              >
                {otpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify OTP'}
              </Button>
              
              <div className="mt-4 text-center">
                {resendTimer > 0 ? (
                  <p className="text-sm text-gray-500">Resend OTP in {resendTimer}s</p>
                ) : (
                  <button onClick={sendOtp} disabled={otpLoading} className="text-sm text-blue-600 hover:underline">
                    Resend OTP
                  </button>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && (
          <div className="animate-in fade-in duration-500">
            <Card className="max-w-lg mx-auto p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Confirm Your Booking</h2>
              </div>
              
              <div className="space-y-4 bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <img src={selectedDoctorData?.image} alt="" className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold">{selectedDoctorData?.name}</p>
                    <p className="text-sm text-gray-600">{selectedDoctorData?.specialty}</p>
                  </div>
                </div>
                <div className="h-px bg-gray-200" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Clinic</p>
                    <p className="font-medium">{selectedClinicData?.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Date</p>
                    <p className="font-medium">{selectedDate && format(selectedDate, 'EEE, MMM d')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Time</p>
                    <p className="font-medium">{selectedSlot}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Patient</p>
                    <p className="font-medium">{patientInfo.name}</p>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={handleBooking}
                disabled={loading}
                className="w-full mt-6 bg-green-600 hover:bg-green-700"
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Weekly Doctor Availability
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {weeklyAvailability.map((day, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold mb-2">{day.date} ({day.day})</p>
                <div className="space-y-1 text-sm">
                  {day.doctors?.map((doc, j) => (
                    <p key={j} className="text-gray-600">
                      <span className="font-medium text-gray-800">{doc.name}</span> - {doc.clinics?.join(', ')}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ActionPrompt />
    </div>
  );
};

export default DiaGyn;
