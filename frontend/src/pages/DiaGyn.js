import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, Clock, MapPin, Ban, Shield, CheckCircle2, Loader2, Phone, CalendarDays, Wifi, WifiOff } from 'lucide-react';
import { format, isSunday } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
// WebSocket URL - handle both local and production environments
const getWsUrl = () => {
  const url = new URL(BACKEND_URL);
  // Use wss for https, ws for http
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  // WebSocket endpoint is at /api/ws/slots
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
    image: 'https://customer-assets.emergentagent.com/job_1d0b9312-d1f2-40d1-b78f-c0c28fa95ba1/artifacts/gg2swmlp_IMG-20220627-WA0003.jpg',
    schedule: {
      pushpa: [
        { days: ['Monday', 'Wednesday', 'Friday'], time: '18:00-22:00' }
      ],
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
    image: 'https://customer-assets.emergentagent.com/job_1d0b9312-d1f2-40d1-b78f-c0c28fa95ba1/artifacts/kqjjgvou_IMG-20260108-WA0000.jpg',
    schedule: {
      amnion: [
        { days: ['Monday', 'Wednesday', 'Friday'], time: '18:00-22:00' }
      ],
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

const DiaGyn = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Steps: 1=Doctor, 2=Clinic, 3=DateTime, 4=OTP Verification, 5=Confirm
  const [step, setStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [patientInfo, setPatientInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });
  const [loading, setLoading] = useState(false);

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  
  // WebSocket state for real-time slot updates
  const wsRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const [otpMethod, setOtpMethod] = useState(''); // 'sms' or 'mock'
  const [verificationToken, setVerificationToken] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);
  
  // Doctor availability calendar state
  const [showAvailability, setShowAvailability] = useState(false);
  const [weeklyAvailability, setWeeklyAvailability] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityClinic, setAvailabilityClinic] = useState('pushpa');
  
  // Email reminder state
  const [emailReminder, setEmailReminder] = useState(true);

  // Helper to get next 7 days
  const getNext7Days = () => {
    const days = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        dayName: dayNames[date.getDay()]
      });
    }
    return days;
  };

  // Fetch weekly availability
  const fetchWeeklyAvailability = async () => {
    setLoadingAvailability(true);
    try {
      const response = await axios.get(`${API}/doctors/availability?days=7`);
      setWeeklyAvailability(response.data.availability || []);
      setShowAvailability(true);
    } catch (error) {
      console.error('Failed to fetch availability:', error);
      toast.error('Failed to load availability');
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const getDayName = (date) => {
    return format(date, 'EEEE');
  };

  // Fetch booked slots when date is selected
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
        params: {
          doctor: doctor.name,
          clinic: clinic.name,
          date: dateStr
        }
      });
      setBookedSlots(response.data.booked_slots || []);
    } catch (error) {
      console.error('Failed to fetch booked slots:', error);
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
      // Clean up existing connection
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
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      const wsUrl = `${WS_URL}/api/ws/slots?doctor=${encodeURIComponent(doctor.name)}&clinic=${encodeURIComponent(clinic.name)}&date=${dateStr}`;
      
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected for slot updates');
          setWsConnected(true);
          // Clear polling if WebSocket connected
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'slot_update') {
              // Update bookedSlots based on the update
              if (data.status === 'booked') {
                setBookedSlots(prev => {
                  if (!prev.includes(data.slot)) {
                    toast.info(`Slot ${data.slot} just booked by another user`, {
                      duration: 3000,
                      icon: '⚡'
                    });
                    return [...prev, data.slot];
                  }
                  return prev;
                });
                // Clear selected slot if it was just booked
                setSelectedSlot(prev => prev === data.slot ? null : prev);
              } else if (data.status === 'available') {
                setBookedSlots(prev => prev.filter(s => s !== data.slot));
                toast.success(`Slot ${data.slot} is now available!`, {
                  duration: 3000,
                  icon: '✨'
                });
              }
            } else if (data.type === 'heartbeat') {
              // Respond to heartbeat
              ws.send(JSON.stringify({ type: 'pong' }));
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };

        ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code);
          setWsConnected(false);
          wsRef.current = null;
          
          // Start polling as fallback if WebSocket fails
          if (!pollingInterval && event.code !== 1000) {
            console.log('Starting polling fallback for slot updates');
            pollingInterval = setInterval(() => {
              fetchBookedSlots();
            }, 10000); // Poll every 10 seconds
          }
          
          // Attempt reconnect after 5 seconds if not intentionally closed
          if (event.code !== 1000) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (selectedDoctor && selectedClinic && selectedDate) {
                connectWebSocket();
              }
            }, 5000);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setWsConnected(false);
          // Start polling as fallback
          if (!pollingInterval) {
            console.log('WebSocket error - starting polling fallback');
            pollingInterval = setInterval(() => {
              fetchBookedSlots();
            }, 10000);
          }
        };
      } catch (e) {
        console.error('Failed to create WebSocket:', e);
        setWsConnected(false);
        // Start polling as fallback
        if (!pollingInterval) {
          pollingInterval = setInterval(() => {
            fetchBookedSlots();
          }, 10000);
        }
      }
    };

    connectWebSocket();

    // Cleanup on unmount or when dependencies change
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount');
        wsRef.current = null;
      }
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
          const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
          slots.push(timeStr);
          
          currentMin += 15;
          if (currentMin >= 60) {
            currentMin = 0;
            currentHour += 1;
          }
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

  // OTP Functions
  const sendOtp = async () => {
    if (!patientInfo.phone || patientInfo.phone.length < 10) {
      toast.error('Please enter a valid mobile number');
      return;
    }

    setOtpLoading(true);
    try {
      const response = await axios.post(`${API}/otp/send`, {
        phone: patientInfo.phone,
        service: 'diagyn'
      });
      
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
      const response = await axios.post(`${API}/otp/verify`, {
        phone: patientInfo.phone,
        otp: otpValue,
        service: 'diagyn'
      });
      
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
    
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
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
        send_email_reminder: emailReminder
      };

      // Save to backend (this blocks the slot and sends SMS notifications)
      await axios.post(`${API}/appointments`, bookingData);
      
      toast.success('Appointment booked! SMS confirmation sent to you and clinic staff.');
      
      // Schedule email reminder if enabled (handled by backend)
      if (emailReminder && patientInfo.email) {
        toast.info('Email reminder will be sent 1 hour before your appointment.');
      }
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to process booking');
    } finally {
      setLoading(false);
    }
  };

  const availableSlots = getAvailableSlots();
  const availableClinics = getAvailableClinics();

  // Filter out booked slots
  const unbookedSlots = availableSlots.filter(slot => !bookedSlots.includes(slot));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => step === 1 ? navigate('/') : setStep(step === 4 ? 3 : step === 5 ? 4 : step - 1)}
              data-testid="back-button"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img 
              src="https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/e4jrn2os_6_20260107_021040_0003.jpg" 
              alt="DiaGyn Healthcare" 
              className="h-16 w-auto"
              data-testid="diagyn-logo"
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-4xl mb-2 text-foreground">Book Appointment</h1>
            <p className="font-body text-muted-foreground">Choose your doctor and preferred time slot</p>
          </div>
          <Button
            variant="outline"
            onClick={fetchWeeklyAvailability}
            disabled={loadingAvailability}
            className="flex items-center gap-2"
            data-testid="view-availability-btn"
          >
            {loadingAvailability ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
            View Weekly Availability
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5].map(s => (
            <div 
              key={s} 
              className={`h-2 flex-1 rounded-full transition-colors ${s <= step ? 'bg-brand-blue' : 'bg-muted'}`}
              data-testid={`step-indicator-${s}`}
            />
          ))}
        </div>

        {/* Step 1: Select Doctor */}
        {step === 1 && (
          <div>
            <h2 className="font-heading text-2xl font-semibold mb-6">Select Doctor</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {doctors.map(doctor => (
                <Card 
                  key={doctor.id}
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg ${selectedDoctor === doctor.id ? 'border-2 border-brand-blue bg-blue-50' : ''}`}
                  onClick={() => {
                    setSelectedDoctor(doctor.id);
                    setSelectedClinic(null);
                    setSelectedDate(null);
                    setSelectedSlot(null);
                    setBookedSlots([]);
                  }}
                  data-testid={`doctor-card-${doctor.id}`}
                >
                  <div className="flex items-start gap-4">
                    <img 
                      src={doctor.image} 
                      alt={doctor.name}
                      className="w-20 h-20 rounded-xl object-cover"
                      data-testid={`doctor-image-${doctor.id}`}
                    />
                    <div>
                      <h3 className="font-heading text-xl font-semibold mb-1">{doctor.name}</h3>
                      <p className="font-body text-muted-foreground">{doctor.specialty}</p>
                      <p className="font-body text-xs text-gray-500 mt-1">{doctor.qualifications}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {selectedDoctor && (
              <Button 
                className="mt-8 bg-brand-blue hover:bg-brand-blue/90"
                onClick={() => setStep(2)}
                data-testid="continue-to-clinic"
              >
                Continue
              </Button>
            )}
          </div>
        )}

        {/* Step 2: Select Clinic */}
        {step === 2 && (
          <div>
            <h2 className="font-heading text-2xl font-semibold mb-6">Select Clinic</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableClinics.map(clinic => (
                <Card 
                  key={clinic.id}
                  className={`overflow-hidden cursor-pointer transition-all hover:shadow-lg ${selectedClinic === clinic.id ? 'border-2 border-brand-blue ring-2 ring-brand-blue/20' : ''}`}
                  onClick={() => {
                    setSelectedClinic(clinic.id);
                    setSelectedDate(null);
                    setSelectedSlot(null);
                    setBookedSlots([]);
                  }}
                  data-testid={`clinic-card-${clinic.id}`}
                >
                  {clinic.image && (
                    <div className="h-40 overflow-hidden">
                      <img 
                        src={clinic.image} 
                        alt={clinic.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-brand-blue mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-heading text-lg font-semibold mb-1">{clinic.name}</h3>
                        <p className="font-body text-sm text-muted-foreground">{clinic.address}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {selectedClinic && (
              <Button 
                className="mt-8 bg-brand-blue hover:bg-brand-blue/90"
                onClick={() => setStep(3)}
                data-testid="continue-to-datetime"
              >
                Continue
              </Button>
            )}
          </div>
        )}

        {/* Step 3: Select Date & Time + Patient Info */}
        {step === 3 && (
          <div>
            <h2 className="font-heading text-2xl font-semibold mb-6">Select Date & Time</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="p-6">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  disabled={(date) => {
                    const isPast = date < new Date(new Date().setHours(0,0,0,0));
                    const isSun = isSunday(date);
                    return isPast || isSun;
                  }}
                  className="rounded-md border"
                />
              </Card>
              
              <Card className="p-6">
                <h3 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-blue" />
                  Available Slots
                  {/* Real-time connection indicator */}
                  {selectedDate && (
                    <span className={`ml-auto flex items-center gap-1 text-xs font-normal ${wsConnected ? 'text-green-600' : 'text-gray-400'}`}>
                      {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                      {wsConnected ? 'Live' : 'Offline'}
                    </span>
                  )}
                </h3>
                {selectedDate ? (
                  loadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-blue" />
                    </div>
                  ) : unbookedSlots.length > 0 ? (
                    <div>
                      {/* Time Period Labels */}
                      <div className="flex gap-4 mb-4 text-xs">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400"></span> Morning (11-14)</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-500"></span> Evening (18-22)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                        {availableSlots.map(slot => {
                          const isBooked = bookedSlots.includes(slot);
                          const hour = parseInt(slot.split(':')[0]);
                          const minute = parseInt(slot.split(':')[1]) || 0;
                          const isMorning = hour >= 11 && hour < 14;
                          const isEvening = hour >= 18 && hour <= 22;
                          
                          // Check if slot time has passed (for today's date)
                          const now = new Date();
                          const isToday = selectedDate && 
                            selectedDate.toDateString() === now.toDateString();
                          const slotTimeInMinutes = hour * 60 + minute;
                          const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes() + 15; // 15 min buffer
                          const isPast = isToday && slotTimeInMinutes <= currentTimeInMinutes;
                          const isDisabled = isBooked || isPast;
                          
                          return (
                            <button
                              key={slot}
                              onClick={() => !isDisabled && setSelectedSlot(slot)}
                              disabled={isDisabled}
                              className={`p-2 text-sm rounded-lg border transition-all ${
                                isPast
                                  ? 'bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                                  : isBooked 
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through' 
                                    : selectedSlot === slot 
                                      ? 'bg-brand-blue text-white border-brand-blue shadow-lg scale-105' 
                                      : isMorning
                                        ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 hover:border-amber-400'
                                        : isEvening
                                          ? 'bg-indigo-50 border-indigo-300 text-indigo-800 hover:bg-indigo-100 hover:border-indigo-400'
                                          : 'hover:border-brand-blue'
                              }`}
                              data-testid={`slot-${slot}`}
                              title={isPast ? 'Time has passed' : isBooked ? 'Already booked' : 'Available'}
                            >
                              {(isBooked || isPast) && <Ban className="w-3 h-3 inline mr-1" />}
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No slots available for this day</p>
                  )
                ) : (
                  <p className="text-muted-foreground">Please select a date first</p>
                )}
              </Card>
            </div>

            {/* Patient Info */}
            {selectedSlot && (
              <Card className="mt-8 p-6">
                <h3 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-brand-blue" />
                  Your Details (for OTP verification)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      value={patientInfo.name}
                      onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                      placeholder="Enter your name"
                      data-testid="patient-name"
                    />
                  </div>
                  <div>
                    <Label>Mobile Number *</Label>
                    <Input
                      value={patientInfo.phone}
                      onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="10-digit number"
                      data-testid="patient-phone"
                    />
                  </div>
                  <div>
                    <Label>Email (Optional)</Label>
                    <Input
                      type="email"
                      value={patientInfo.email}
                      onChange={(e) => setPatientInfo({ ...patientInfo, email: e.target.value })}
                      placeholder="your@email.com"
                      data-testid="patient-email"
                    />
                    <p className="text-xs text-gray-500 mt-1">We'll send confirmations and appointment updates to this email.</p>
                  </div>
                </div>
                
                {/* Email Reminder Option */}
                {patientInfo.email && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailReminder}
                        onChange={(e) => setEmailReminder(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                        data-testid="email-reminder-checkbox"
                      />
                      <div>
                        <span className="font-medium text-blue-800 text-sm">Send me an email reminder</span>
                        <p className="text-xs text-blue-600">You'll receive a reminder email 1 hour before your appointment</p>
                      </div>
                    </label>
                  </div>
                )}
              </Card>
            )}

            {selectedSlot && (
              <Button 
                className="mt-8 bg-brand-blue hover:bg-brand-blue/90"
                onClick={goToOtpStep}
                data-testid="continue-to-otp"
              >
                Continue to Verify
              </Button>
            )}
          </div>
        )}

        {/* Step 4: OTP Verification */}
        {step === 4 && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-10 h-10 text-brand-blue" />
              </div>
              <h2 className="font-heading text-2xl font-semibold mb-2">Verify Your Phone</h2>
              <p className="text-muted-foreground">
                {otpMethod === 'sms' 
                  ? <>We've sent a 6-digit OTP via SMS to <span className="font-medium text-foreground">+91 {patientInfo.phone}</span></>
                  : <>We've sent a 6-digit OTP to <span className="font-medium text-foreground">+91 {patientInfo.phone}</span></>
                }
              </p>
            </div>

            {/* Mock OTP Display - Only shown in test mode */}
            {mockOtp && otpMethod === 'mock' && (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Test Mode:</span>
                  <span>Your OTP is <strong className="text-xl">{mockOtp}</strong></span>
                </div>
                <p className="text-xs text-yellow-600 mt-1">In production, this will be sent via SMS</p>
              </Card>
            )}
            
            {/* SMS Sent Confirmation */}
            {otpMethod === 'sms' && (
              <Card className="p-4 bg-green-50 border-green-200">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>OTP sent via SMS. Please check your phone.</span>
                </div>
              </Card>
            )}

            {/* OTP Input */}
            <Card className="p-6">
              <Label className="block text-center mb-4">Enter 6-digit OTP</Label>
              <div className="flex justify-center gap-2 sm:gap-3 mb-6">
                {otp.map((digit, idx) => (
                  <Input
                    key={idx}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold"
                    data-testid={`otp-input-${idx}`}
                  />
                ))}
              </div>

              <Button
                onClick={verifyOtp}
                disabled={otp.join('').length !== 6 || otpLoading}
                className="w-full bg-brand-blue hover:bg-brand-blue/90 h-12"
                data-testid="verify-otp-btn"
              >
                {otpLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Verify OTP
                  </>
                )}
              </Button>

              <div className="text-center mt-4">
                {resendTimer > 0 ? (
                  <p className="text-sm text-gray-500">Resend OTP in {resendTimer}s</p>
                ) : (
                  <Button variant="link" onClick={sendOtp} disabled={otpLoading} className="text-brand-blue">
                    Resend OTP
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Step 5: Confirm Booking */}
        {step === 5 && (
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="font-heading text-2xl font-semibold">Phone Verified!</h2>
            </div>

            <Card className="p-6">
              <h3 className="font-heading text-lg font-semibold mb-4">Booking Summary</h3>
              
              {selectedDoctor && (
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Doctor</span>
                    <span className="font-medium">{doctors.find(d => d.id === selectedDoctor)?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Clinic</span>
                    <span className="font-medium">{clinics.find(c => c.id === selectedClinic)?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{selectedDate && format(selectedDate, 'dd MMM yyyy')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium">{selectedSlot}</span>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Patient</span>
                      <span className="font-medium">{patientInfo.name}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Mobile</span>
                      <span className="font-medium text-green-600">+91 {patientInfo.phone} ✓</span>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                className="w-full bg-brand-blue hover:bg-brand-blue/90 h-12"
                onClick={handleBooking}
                disabled={loading}
                data-testid="confirm-booking-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Confirm & Book Appointment
                  </>
                )}
              </Button>
            </Card>
          </div>
        )}
      </main>

      {/* Weekly Availability Dialog */}
      <Dialog open={showAvailability} onOpenChange={setShowAvailability}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-brand-blue" />
              Doctor Availability - Next 7 Days
            </DialogTitle>
          </DialogHeader>
          
          {/* Clinic Toggle */}
          <div className="flex gap-2 mb-4">
            {clinics.map((clinic) => (
              <Button
                key={clinic.id}
                variant={availabilityClinic === clinic.id ? "default" : "outline"}
                onClick={() => setAvailabilityClinic(clinic.id)}
                className={`flex-1 ${availabilityClinic === clinic.id ? 'bg-brand-teal hover:bg-brand-teal/90' : ''}`}
              >
                {clinic.name}
              </Button>
            ))}
          </div>
          
          <div className="space-y-6">
            {/* Show both doctors */}
            {doctors.map((doctor) => {
              const clinicSchedule = doctor.schedule[availabilityClinic];
              const hasSchedule = clinicSchedule && clinicSchedule.length > 0;
              
              return (
                <div key={doctor.id} className="border rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <img 
                      src={doctor.image} 
                      alt={doctor.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-brand-teal/20"
                    />
                    <div>
                      <p className="font-semibold text-gray-800">{doctor.name}</p>
                      <p className="text-xs text-gray-500">{doctor.qualifications}</p>
                      <p className="text-xs text-brand-teal font-medium">
                        {clinics.find(c => c.id === availabilityClinic)?.name}
                      </p>
                    </div>
                  </div>
                  
                  {hasSchedule ? (
                    <>
                      {/* Schedule Info */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Schedule at {clinics.find(c => c.id === availabilityClinic)?.name}:</p>
                        {clinicSchedule.map((sched, idx) => (
                          <p key={idx} className="text-sm text-gray-600">
                            <span className="font-medium">{sched.days.join(', ')}</span>: {sched.time}
                          </p>
                        ))}
                      </div>
                      
                      {/* Weekly Slots Grid */}
                      <div className="grid grid-cols-7 gap-2">
                        {getNext7Days().map((dayInfo) => {
                          const isAvailable = clinicSchedule.some(sched => 
                            sched.days.includes(dayInfo.dayName)
                          );
                          const slotsCount = isAvailable ? 12 : 0; // Approximate slots per session
                          
                          return (
                            <div 
                              key={dayInfo.date}
                              className={`text-center p-2 rounded-lg border ${
                                slotsCount > 10 ? 'bg-green-50 border-green-200' :
                                slotsCount > 5 ? 'bg-yellow-50 border-yellow-200' :
                                slotsCount > 0 ? 'bg-orange-50 border-orange-200' :
                                'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <p className="text-xs font-medium">{dayInfo.dayName.slice(0, 3)}</p>
                              <p className="text-xs text-muted-foreground">{dayInfo.date.slice(5)}</p>
                              <p className={`text-lg font-bold mt-1 ${
                                slotsCount > 10 ? 'text-green-600' :
                                slotsCount > 5 ? 'text-yellow-600' :
                                slotsCount > 0 ? 'text-orange-600' :
                                'text-gray-400'
                              }`}>
                                {isAvailable ? '✓' : '—'}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {isAvailable ? 'Available' : 'Off'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-gray-500">
                        {doctor.name} does not visit {clinics.find(c => c.id === availabilityClinic)?.name}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Try switching to another clinic above
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center gap-4 mt-3 text-xs border-t pt-4">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-200"></span> Available
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-gray-200"></span> Not Available
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiaGyn;
