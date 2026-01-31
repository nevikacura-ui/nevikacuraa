import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Phone, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  CLINICS, DOCTOR_SCHEDULES, 
  formatIndianDate, getDayName, getIndianDate 
} from '@/pages/staff/staffUtils';
import { format, addDays, isSunday, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const AdvanceBookingTab = ({
  staffInfo,
  activeClinic,
  availableClinics = [],
  onBookingComplete
}) => {
  // For multi-clinic staff, allow choosing clinic. Otherwise use the active clinic
  const [selectedClinic, setSelectedClinic] = useState(activeClinic || staffInfo?.clinic || '');
  const hasMultipleClinics = availableClinics.length > 1 || (staffInfo?.clinics?.length > 1);
  const clinicOptions = availableClinics.length > 1 ? availableClinics : (staffInfo?.clinics || [staffInfo?.clinic]);
  
  // Update selected clinic when activeClinic changes
  useEffect(() => {
    if (activeClinic) {
      setSelectedClinic(activeClinic);
    }
  }, [activeClinic]);
  
  const currentClinic = selectedClinic || activeClinic || staffInfo?.clinic;
  const clinicDoctors = CLINICS[currentClinic] || [];
  
  // Booking flow steps
  const [step, setStep] = useState(1); // 1: Doctor, 2: Date, 3: Slot, 4: Patient Details
  
  // Form state
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  
  // Data state
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Get tomorrow's date as minimum (future bookings only)
  const getMinDate = () => {
    const tomorrow = addDays(new Date(), 1);
    return format(tomorrow, 'yyyy-MM-dd');
  };
  
  // Check if doctor is available on a given date
  const isDoctorAvailableOnDate = (doctor, date) => {
    if (!doctor || !date) return false;
    const dayName = getDayName(date);
    const schedule = DOCTOR_SCHEDULES[doctor]?.[currentClinic];
    if (!schedule) return false;
    return schedule.some(slot => slot.days.includes(dayName));
  };
  
  // Generate time slots based on doctor schedule
  const generateTimeSlots = (doctor, date) => {
    if (!doctor || !date) return [];
    const dayName = getDayName(date);
    const schedule = DOCTOR_SCHEDULES[doctor]?.[currentClinic];
    if (!schedule) return [];
    
    const slots = [];
    schedule.forEach(scheduleSlot => {
      if (scheduleSlot.days.includes(dayName)) {
        const [startTime, endTime] = scheduleSlot.time.split(' - ');
        let [startHour, startMin] = startTime.replace(/[APMapm]/g, '').trim().split(':').map(Number);
        let [endHour, endMin] = endTime.replace(/[APMapm]/g, '').trim().split(':').map(Number);
        
        if (startTime.toLowerCase().includes('pm') && startHour !== 12) startHour += 12;
        if (endTime.toLowerCase().includes('pm') && endHour !== 12) endHour += 12;
        if (startTime.toLowerCase().includes('am') && startHour === 12) startHour = 0;
        if (endTime.toLowerCase().includes('am') && endHour === 12) endHour = 0;
        
        for (let h = startHour; h < endHour; h++) {
          for (let m = 0; m < 60; m += 15) {
            const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            const period = h >= 12 ? 'PM' : 'AM';
            const timeStr = `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
            slots.push(timeStr);
          }
        }
      }
    });
    
    return slots;
  };
  
  // Fetch booked slots when date changes
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!selectedDoctor || !selectedDate || !currentClinic) return;
      
      setLoadingSlots(true);
      try {
        const response = await axios.get(`${API}/api/appointments/booked-slots`, {
          params: {
            doctor: selectedDoctor,
            clinic: currentClinic,
            date: selectedDate
          }
        });
        setBookedSlots(response.data.booked_slots || []);
        
        // Generate available slots
        const allSlots = generateTimeSlots(selectedDoctor, selectedDate);
        const booked = response.data.booked_slots || [];
        setAvailableSlots(allSlots.filter(s => !booked.includes(s)));
      } catch (error) {
        console.error('Error fetching slots:', error);
        setAvailableSlots(generateTimeSlots(selectedDoctor, selectedDate));
        setBookedSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    
    fetchBookedSlots();
  }, [selectedDoctor, selectedDate, currentClinic]);
  
  // Handle booking submission
  const handleBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot || !patientName || !patientPhone) {
      toast.error('Please fill all required fields');
      return;
    }
    
    if (patientPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/api/appointments`, {
        doctor: selectedDoctor,
        clinic: currentClinic,
        date: selectedDate,
        time: selectedSlot,
        patient_name: patientName,
        patient_phone: patientPhone,
        patient_email: '',
        booked_by: `Staff (${staffInfo?.name || 'Advance Booking'})`
      });
      
      toast.success(`Appointment booked! ID: ${response.data.booking_id}`);
      
      // Reset form
      setStep(1);
      setSelectedDoctor('');
      setSelectedDate('');
      setSelectedSlot('');
      setPatientName('');
      setPatientPhone('');
      
      if (onBookingComplete) {
        onBookingComplete(response.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Calendar component
  const CalendarView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const minDate = new Date(getMinDate());
    
    return (
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addDays(currentMonth, -30))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addDays(currentMonth, 30))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d}>{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month start */}
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10" />
          ))}
          
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isPast = day < minDate;
            const isSun = isSunday(day);
            const isAvailable = isDoctorAvailableOnDate(selectedDoctor, dateStr);
            const isSelected = selectedDate === dateStr;
            const isCurrentDay = isToday(day);
            
            return (
              <button
                key={dateStr}
                onClick={() => !isPast && !isSun && isAvailable && setSelectedDate(dateStr)}
                disabled={isPast || isSun || !isAvailable}
                className={`h-10 rounded-lg text-sm transition-all ${
                  isSelected
                    ? 'bg-teal-500 text-white font-bold'
                    : isPast || isSun || !isAvailable
                    ? 'text-gray-300 cursor-not-allowed'
                    : isCurrentDay
                    ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                    : 'hover:bg-teal-50 text-gray-700'
                }`}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
        
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-teal-500 rounded"></span> Selected</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-200 rounded"></span> Unavailable</span>
        </div>
      </div>
    );
  };
  
  return (
    <Card className="p-6 max-w-lg" data-testid="advance-booking-tab">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-teal-600" />
        <h2 className="font-semibold text-lg">Advance Booking - {currentClinic}</h2>
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        Book appointments for future dates (tomorrow onwards)
      </p>
      
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step > s ? 'bg-green-500 text-white' : 
              step === s ? 'bg-teal-500 text-white' : 
              'bg-gray-200 text-gray-500'
            }`}>
              {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
            </div>
            {s < 4 && <div className={`w-8 h-0.5 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>
      
      {/* Step 1: Select Doctor */}
      {step === 1 && (
        <div className="space-y-4">
          <Label className="text-base font-medium">Select Doctor</Label>
          <div className="grid gap-2">
            {clinicDoctors.map(doctor => (
              <button
                key={doctor}
                onClick={() => {
                  setSelectedDoctor(doctor);
                  setStep(2);
                }}
                className={`p-4 border rounded-xl text-left hover:border-teal-400 hover:bg-teal-50 transition-all ${
                  selectedDoctor === doctor ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <div className="font-medium">{doctor}</div>
                    <div className="text-xs text-gray-500">
                      {DOCTOR_SCHEDULES[doctor]?.[currentClinic]?.map(s => s.days.join(', ')).join(' • ')}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Step 2: Select Date */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Select Date for {selectedDoctor}</Label>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>
          
          <CalendarView />
          
          {selectedDate && (
            <Button 
              onClick={() => setStep(3)} 
              className="w-full bg-teal-500 hover:bg-teal-600"
            >
              Continue with {formatIndianDate(selectedDate)}
            </Button>
          )}
        </div>
      )}
      
      {/* Step 3: Select Time Slot */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Select Time Slot</Label>
            <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>
          
          <div className="p-3 bg-teal-50 rounded-lg text-sm">
            <strong>{selectedDoctor}</strong> • {formatIndianDate(selectedDate)} ({getDayName(selectedDate)})
          </div>
          
          {loadingSlots ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No slots available for this date
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map(slot => (
                <button
                  key={slot}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setStep(4);
                  }}
                  className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                    selectedSlot === slot
                      ? 'bg-teal-500 text-white border-teal-500'
                      : 'bg-white hover:border-teal-400 hover:bg-teal-50 border-gray-200'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Step 4: Patient Details */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Patient Details</Label>
            <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>
          
          <div className="p-3 bg-teal-50 rounded-lg text-sm">
            <strong>{selectedDoctor}</strong> • {formatIndianDate(selectedDate)} • {selectedSlot}
          </div>
          
          <div>
            <Label>Patient Name *</Label>
            <Input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Enter patient name"
              data-testid="advance-patient-name"
            />
          </div>
          
          <div>
            <Label>WhatsApp Number *</Label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">+91</span>
              <Input
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                data-testid="advance-patient-phone"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleBooking}
            disabled={submitting || !patientName || patientPhone.length !== 10}
            className="w-full bg-teal-500 hover:bg-teal-600"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Booking...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Booking</>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
};

export default AdvanceBookingTab;
