import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, Clock, MapPin, Ban } from 'lucide-react';
import { format, isSunday } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WHATSAPP_NUMBER = '+917039020020';

const doctors = [
  {
    id: 'vikas',
    name: 'Dr. Vikas Jha',
    specialty: 'Diabetologist & Physician',
    image: 'https://images.unsplash.com/photo-1615177393114-bd2917a4f74a?crop=entropy&cs=srgb&fm=jpg&q=85',
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
    image: 'https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg',
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
  { id: 'pushpa', name: 'Pushpa Clinic', address: 'A-1, Sai Darshan, Near Don Bosco High School, Naigaon East' },
  { id: 'amnion', name: 'Amnion Clinic', address: 'G-7, Rashmi Star City Phase 5, Opp Thakur School, Naigaon East' }
];

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
  const [patientInfo, setPatientInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });
  const [loading, setLoading] = useState(false);

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

  const handleBooking = async () => {
    if (!patientInfo.name || !patientInfo.phone) {
      toast.error('Please fill all required fields');
      return;
    }

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
        patient_email: patientInfo.email || null
      };

      // Save to backend (this blocks the slot)
      await axios.post(`${API}/appointments`, bookingData);

      const whatsappMessage = `*New DiaGyn Appointment Request*%0A%0A*Doctor:* ${doctor.name} (${doctor.specialty})%0A*Clinic:* ${clinic.name}%0A*Date:* ${format(selectedDate, 'dd MMM yyyy')}%0A*Time:* ${selectedSlot}%0A%0A*Patient Details:*%0AName: ${patientInfo.name}%0APhone: ${patientInfo.phone}${patientInfo.email ? `%0AEmail: ${patientInfo.email}` : ''}`;
      
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`, '_blank');
      
      toast.success('Appointment booked successfully!');
      
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
              onClick={() => step === 1 ? navigate('/') : setStep(step - 1)}
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
        <div className="mb-8">
          <h1 className="font-heading font-bold text-4xl mb-2 text-foreground">Book Appointment</h1>
          <p className="font-body text-muted-foreground">Choose your doctor and preferred time slot</p>
        </div>

        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map(s => (
            <div 
              key={s} 
              className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-brand-blue' : 'bg-muted'}`}
              data-testid={`step-indicator-${s}`}
            />
          ))}
        </div>

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
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <Button 
              className="mt-8 rounded-full px-8 py-6" 
              disabled={!selectedDoctor}
              onClick={() => setStep(2)}
              data-testid="next-step-1-button"
            >
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-heading text-2xl font-semibold mb-6">Select Clinic</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableClinics.map(clinic => (
                <Card 
                  key={clinic.id}
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg ${selectedClinic === clinic.id ? 'border-2 border-brand-blue bg-blue-50' : ''}`}
                  onClick={() => {
                    setSelectedClinic(clinic.id);
                    setSelectedDate(null);
                    setSelectedSlot(null);
                    setBookedSlots([]);
                  }}
                  data-testid={`clinic-card-${clinic.id}`}
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="w-6 h-6 text-brand-blue flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-heading text-xl font-semibold mb-2">{clinic.name}</h3>
                      <p className="font-body text-sm text-muted-foreground">{clinic.address}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <Button 
              className="mt-8 rounded-full px-8 py-6" 
              disabled={!selectedClinic}
              onClick={() => setStep(3)}
              data-testid="next-step-2-button"
            >
              Continue
            </Button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-heading text-2xl font-semibold mb-6">Select Date & Time</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <Label className="mb-4 block font-heading">Choose Date</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setSelectedSlot(null);
                    }
                  }}
                  disabled={(date) => {
                    return date < new Date() || isSunday(date);
                  }}
                  className="rounded-2xl border bg-white p-4"
                  data-testid="appointment-calendar"
                />
              </div>
              
              {selectedDate && (
                <div>
                  <Label className="mb-4 block font-heading">Available Time Slots</Label>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                    </div>
                  ) : unbookedSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3" data-testid="time-slots-container">
                      {availableSlots.map(slot => {
                        const isBooked = bookedSlots.includes(slot);
                        return (
                          <Button
                            key={slot}
                            variant={selectedSlot === slot ? 'default' : isBooked ? 'ghost' : 'outline'}
                            onClick={() => !isBooked && setSelectedSlot(slot)}
                            disabled={isBooked}
                            data-testid={`time-slot-${slot.replace(':', '-')}`}
                            className={`h-auto py-3 ${isBooked ? 'opacity-50 cursor-not-allowed line-through bg-red-50 text-red-400' : ''}`}
                          >
                            {isBooked ? (
                              <Ban className="w-4 h-4 mr-2" />
                            ) : (
                              <Clock className="w-4 h-4 mr-2" />
                            )}
                            {slot}
                          </Button>
                        );
                      })}
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Ban className="w-12 h-12 mx-auto mb-3 text-red-400" />
                      <p className="font-body">All slots are booked for this date</p>
                      <p className="text-sm">Please select another date</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground font-body" data-testid="no-slots-message">
                      No available slots for this date
                    </p>
                  )}
                  
                  {bookedSlots.length > 0 && unbookedSlots.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-4">
                      <Ban className="w-4 h-4 inline mr-1" />
                      Crossed slots are already booked
                    </p>
                  )}
                </div>
              )}
            </div>
            <Button 
              className="mt-8 rounded-full px-8 py-6" 
              disabled={!selectedDate || !selectedSlot}
              onClick={() => setStep(4)}
              data-testid="next-step-3-button"
            >
              Continue
            </Button>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="font-heading text-2xl font-semibold mb-6">Patient Details</h2>
            <Card className="p-6 max-w-lg">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="patient-name">Full Name *</Label>
                  <Input
                    id="patient-name"
                    value={patientInfo.name}
                    onChange={(e) => setPatientInfo({...patientInfo, name: e.target.value})}
                    data-testid="patient-name-input"
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="patient-phone">Phone Number *</Label>
                  <Input
                    id="patient-phone"
                    value={patientInfo.phone}
                    onChange={(e) => setPatientInfo({...patientInfo, phone: e.target.value})}
                    data-testid="patient-phone-input"
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="patient-email">Email (Optional)</Label>
                  <Input
                    id="patient-email"
                    type="email"
                    value={patientInfo.email}
                    onChange={(e) => setPatientInfo({...patientInfo, email: e.target.value})}
                    data-testid="patient-email-input"
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
            </Card>
            
            <Card className="p-6 max-w-lg mt-6 bg-blue-50 border-brand-blue">
              <h3 className="font-heading text-lg font-semibold mb-4">Booking Summary</h3>
              <div className="space-y-2 text-sm font-body">
                <p><strong>Doctor:</strong> {doctors.find(d => d.id === selectedDoctor)?.name}</p>
                <p><strong>Clinic:</strong> {clinics.find(c => c.id === selectedClinic)?.name}</p>
                <p><strong>Date:</strong> {selectedDate && format(selectedDate, 'dd MMMM yyyy')}</p>
                <p><strong>Time:</strong> {selectedSlot}</p>
              </div>
            </Card>

            <Button 
              className="mt-8 rounded-full px-8 py-6 bg-green-600 hover:bg-green-700" 
              disabled={loading || !patientInfo.name || !patientInfo.phone}
              onClick={handleBooking}
              data-testid="book-appointment-button"
            >
              {loading ? 'Processing...' : 'Book Appointment via WhatsApp'}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default DiaGyn;
