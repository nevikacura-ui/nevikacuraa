import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import WalletWidget from '@/components/WalletWidget';
import { 
  ArrowLeft, Video, Calendar, Clock, User, Phone, 
  Loader2, MapPin, Check, ChevronRight,
  Wallet, FileText, Pill, FlaskConical, Stethoscope,
  AlertCircle, Download, Plus, Copy, QrCode
} from 'lucide-react';
import { format, addDays, isSunday, startOfDay } from 'date-fns';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// DiaGyn Doctors
const TELECONSULT_DOCTORS = [
  {
    id: 'dr-neha-patel',
    name: 'Dr. Neha Patel',
    specialization: 'OBGYN',
    qualification: 'M.B.B.S, D.G.O (Mumbai), FMAS (Delhi)',
    experience: '15+ years',
    clinic: 'DiaGyn Healthcare - Pushpa Clinic',
    fee: 500,
    image: 'https://customer-assets.emergentagent.com/job_healthhelper-7/artifacts/u05fho69_IMG-20260126-WA0000.jpg'
  },
  {
    id: 'dr-vikas-jha',
    name: 'Dr. Vikas Jha',
    specialization: 'Diabetologist & Physician',
    qualification: 'M.B.B.S, C.Diab (RSSDI, Delhi), Dip. In Diabetology (Cardiff, UK)',
    experience: '12+ years',
    clinic: 'DiaGyn Healthcare - Amnion Clinic',
    fee: 500,
    image: 'https://customer-assets.emergentagent.com/job_1d0b9312-d1f2-40d1-b78f-c0c28fa95ba1/artifacts/gg2swmlp_IMG-20220627-WA0003.jpg'
  }
];

// Generate 15-minute slots from 9 AM to 9 PM
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 9; hour < 21; hour++) {
    for (let min = 0; min < 60; min += 15) {
      const time24 = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const time12 = `${hour12}:${min.toString().padStart(2, '0')} ${ampm}`;
      slots.push({ time24, time12, hour, minute: min });
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const Teleconsultation = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  // States
  const [step, setStep] = useState(1); // 1: Doctor, 2: Date/Time, 3: Details, 4: Payment, 5: Confirmation
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [showPrescription, setShowPrescription] = useState(null);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date()); // For real-time slot updates
  
  // Update current time every minute to refresh slot availability
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);
  
  const [formData, setFormData] = useState({
    patient_name: user?.name || '',
    patient_phone: user?.phone || '',
    reason: '',
    symptoms: ''
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        patient_name: user.name || '',
        patient_phone: user.phone || ''
      }));
      fetchWalletBalance();
      fetchMyBookings();
    }
  }, [user]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchBookedSlots();
    }
  }, [selectedDoctor, selectedDate]);

  const fetchWalletBalance = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletBalance(res.data.balance || 0);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const fetchMyBookings = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/teleconsult/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyBookings(res.data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchBookedSlots = async () => {
    setSlotsLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await axios.get(`${API}/teleconsult/booked-slots?doctor=${selectedDoctor.id}&date=${dateStr}`);
      setBookedSlots(res.data.booked_slots || []);
    } catch (error) {
      console.error('Error fetching booked slots:', error);
      setBookedSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const getAvailableDates = () => {
    const dates = [];
    let date = startOfDay(new Date());
    for (let i = 0; i < 14; i++) {
      if (!isSunday(date)) {
        dates.push(new Date(date));
      }
      date = addDays(date, 1);
    }
    return dates;
  };

  const handleBooking = async () => {
    if (!user) {
      toast.error('Please login to book a consultation');
      navigate('/');
      return;
    }

    if (walletBalance < selectedDoctor.fee) {
      toast.error(`Insufficient wallet balance. Required: ₹${selectedDoctor.fee}, Available: ₹${walletBalance}`);
      return;
    }

    if (!formData.patient_name || !formData.patient_phone || !formData.reason) {
      toast.error('Please fill all required fields');
      return;
    }

    setBookingLoading(true);
    try {
      const res = await axios.post(`${API}/teleconsult/book`, {
        doctor_id: selectedDoctor.id,
        doctor_name: selectedDoctor.name,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedSlot.time12,
        patient_name: formData.patient_name,
        patient_phone: formData.patient_phone,
        reason: formData.reason,
        symptoms: formData.symptoms,
        fee: selectedDoctor.fee,
        payment_method: 'wallet'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setBookingComplete(res.data.booking);
      setStep(5);
      fetchWalletBalance();
      toast.success('Consultation booked successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to book consultation');
    } finally {
      setBookingLoading(false);
    }
  };

  const availableDates = getAvailableDates();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <Video className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Video Consultation</h2>
          <p className="text-gray-600 mb-6">Please login to book a video consultation with our doctors.</p>
          <Button onClick={() => navigate('/')} className="w-full">
            Login to Continue
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-blue-800">Video Consultation</h1>
              <p className="text-sm text-gray-500">Consult from home • 9 AM - 9 PM</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WalletWidget compact onBalanceChange={setWalletBalance} />
            <Button variant="outline" size="sm" onClick={() => setShowMyBookings(true)}>
              My Bookings
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          {['Doctor', 'Date & Time', 'Details', 'Payment', 'Done'].map((label, idx) => (
            <div key={idx} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step > idx + 1 ? 'bg-green-500 text-white' :
                step === idx + 1 ? 'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {step > idx + 1 ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              {idx < 4 && <div className={`w-8 h-0.5 ${step > idx + 1 ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Select Doctor */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">Choose Your Doctor</h2>
            <div className="grid gap-4">
              {TELECONSULT_DOCTORS.map((doctor) => (
                <Card 
                  key={doctor.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                    selectedDoctor?.id === doctor.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedDoctor(doctor)}
                  data-testid={`doctor-${doctor.id}`}
                >
                  <div className="flex items-start gap-4">
                    {doctor.image ? (
                      <img 
                        src={doctor.image} 
                        alt={doctor.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-blue-100"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                        {doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{doctor.name}</h3>
                      <p className="text-sm text-gray-600">{doctor.specialization}</p>
                      <p className="text-xs text-gray-500">{doctor.qualification} • {doctor.experience}</p>
                      <div className="flex items-center gap-1 text-gray-500 mt-2">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">{doctor.clinic}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">₹{doctor.fee}</p>
                      <p className="text-xs text-gray-500">per session</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <Button 
              onClick={() => setStep(2)} 
              disabled={!selectedDoctor}
              className="w-full"
            >
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 2: Select Date & Time */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">Select Date & Time</h2>
            
            {/* Date Selection */}
            <div>
              <Label className="mb-2 block">Select Date</Label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {availableDates.map((date, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                    className={`flex-shrink-0 p-3 rounded-lg border text-center min-w-[70px] transition-all ${
                      selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white hover:border-blue-300'
                    }`}
                  >
                    <p className="text-xs">{format(date, 'EEE')}</p>
                    <p className="text-lg font-bold">{format(date, 'd')}</p>
                    <p className="text-xs">{format(date, 'MMM')}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div>
                <Label className="mb-2 block flex items-center justify-between">
                  <span>Select Time (15-min slots)</span>
                  {slotsLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                </Label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                  {TIME_SLOTS.map((slot, idx) => {
                    const isBooked = bookedSlots.includes(slot.time12);
                    const isToday = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(currentTime, 'yyyy-MM-dd');
                    // Block slots that have already passed (with 15 min buffer for booking)
                    const slotTimeInMinutes = slot.hour * 60 + slot.minute;
                    const currentTimeInMinutes = currentTime.getHours() * 60 + currentTime.getMinutes() + 15; // 15 min buffer
                    const isPast = isToday && slotTimeInMinutes <= currentTimeInMinutes;
                    const isDisabled = isBooked || isPast;
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => !isDisabled && setSelectedSlot(slot)}
                        disabled={isDisabled}
                        className={`p-2 rounded-lg border text-sm transition-all ${
                          selectedSlot?.time24 === slot.time24
                            ? 'bg-blue-600 text-white border-blue-600'
                            : isPast
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed line-through'
                              : isBooked
                                ? 'bg-red-50 text-red-400 cursor-not-allowed'
                                : 'bg-white hover:border-blue-300'
                        }`}
                        title={isPast ? 'Time has passed' : isBooked ? 'Already booked' : 'Available'}
                      >
                        {slot.time12}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={!selectedDate || !selectedSlot}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Patient Details */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">Patient Details</h2>
            
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3">
                <Video className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-semibold">{selectedDoctor?.name}</p>
                  <p className="text-sm text-gray-600">
                    {format(selectedDate, 'EEEE, MMMM d')} at {selectedSlot?.time12}
                  </p>
                </div>
                <p className="ml-auto text-xl font-bold text-green-600">₹{selectedDoctor?.fee}</p>
              </div>
            </Card>

            <div className="space-y-3">
              <div>
                <Label>Patient Name *</Label>
                <Input
                  value={formData.patient_name}
                  onChange={(e) => setFormData({...formData, patient_name: e.target.value})}
                  placeholder="Enter patient name"
                />
              </div>
              <div>
                <Label>Phone Number *</Label>
                <Input
                  value={formData.patient_phone}
                  onChange={(e) => setFormData({...formData, patient_phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label>Reason for Consultation *</Label>
                <Input
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="e.g., Regular checkup, Follow-up, New concern"
                />
              </div>
              <div>
                <Label>Symptoms (Optional)</Label>
                <Textarea
                  value={formData.symptoms}
                  onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
                  placeholder="Describe your symptoms if any..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={() => setStep(4)}
                disabled={!formData.patient_name || !formData.patient_phone || !formData.reason}
                className="flex-1"
              >
                Continue to Payment
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Payment */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">Confirm & Pay</h2>
            
            {/* Booking Summary */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Doctor</span>
                  <span className="font-medium">{selectedDoctor?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date</span>
                  <span className="font-medium">{format(selectedDate, 'EEE, MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time</span>
                  <span className="font-medium">{selectedSlot?.time12}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Patient</span>
                  <span className="font-medium">{formData.patient_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reason</span>
                  <span className="font-medium">{formData.reason}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-600">₹{selectedDoctor?.fee}</span>
                </div>
              </div>
            </Card>

            {/* Wallet Payment */}
            <Card className={`p-4 ${walletBalance >= selectedDoctor?.fee ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className={`w-8 h-8 ${walletBalance >= selectedDoctor?.fee ? 'text-green-600' : 'text-amber-600'}`} />
                  <div>
                    <p className="font-semibold">Nevika Wallet</p>
                    <p className="text-sm text-gray-600">Balance: ₹{walletBalance.toFixed(2)}</p>
                  </div>
                </div>
                {walletBalance >= selectedDoctor?.fee ? (
                  <Check className="w-6 h-6 text-green-600" />
                ) : (
                  <Button 
                    size="sm" 
                    onClick={() => setShowAddFunds(true)}
                    className="bg-amber-500 hover:bg-amber-600"
                    data-testid="add-funds-btn"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Funds
                  </Button>
                )}
              </div>
              {walletBalance < selectedDoctor?.fee && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-700 flex items-center gap-1 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Insufficient balance. Need ₹{(selectedDoctor?.fee - walletBalance).toFixed(0)} more.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowAddFunds(true)}
                    className="w-full border-amber-400 text-amber-700 hover:bg-amber-50"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Add ₹{Math.max(100, Math.ceil((selectedDoctor?.fee - walletBalance) / 100) * 100)} to Wallet
                  </Button>
                </div>
              )}
            </Card>

            {/* Features */}
            <Card className="p-4 bg-gray-50">
              <h4 className="font-medium mb-2">What's Included</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>15-min video call</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>E-Prescription</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Order medicines</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Book tests</span>
                </div>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleBooking}
                disabled={bookingLoading || walletBalance < selectedDoctor?.fee}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {bookingLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                ) : (
                  <>Pay ₹{selectedDoctor?.fee} & Book</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && bookingComplete && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-600">Booking Confirmed!</h2>
              <p className="text-gray-600">Your video consultation is scheduled</p>
            </div>

            <Card className="p-4 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking ID</span>
                  <span className="font-mono">{bookingComplete.id?.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Doctor</span>
                  <span>{bookingComplete.doctor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date & Time</span>
                  <span>{bookingComplete.date} at {bookingComplete.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="text-green-600">₹{bookingComplete.fee}</span>
                </div>
              </div>
            </Card>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                📱 You'll receive a video call link via SMS 15 minutes before your appointment.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => navigate('/proton')}>
                <FlaskConical className="w-4 h-4 mr-2" /> Book Tests
              </Button>
              <Button variant="outline" onClick={() => navigate('/pharmacy')}>
                <Pill className="w-4 h-4 mr-2" /> Order Medicines
              </Button>
            </div>

            <Button onClick={() => navigate('/')} className="w-full">
              Back to Home
            </Button>
          </div>
        )}
      </div>

      {/* My Bookings Dialog */}
      <Dialog open={showMyBookings} onOpenChange={setShowMyBookings}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>My Video Consultations</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {myBookings.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No consultations booked yet</p>
            ) : (
              myBookings.map((booking) => (
                <Card key={booking.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{booking.doctor_name}</p>
                      <p className="text-sm text-gray-600">{booking.date} at {booking.time}</p>
                      <p className="text-xs text-gray-500">{booking.reason}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                        booking.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {booking.status}
                      </span>
                      {booking.has_prescription && (
                        <Button 
                          variant="link" 
                          size="sm"
                          onClick={() => setShowPrescription(booking)}
                        >
                          <FileText className="w-3 h-3 mr-1" /> View Rx
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* E-Prescription Dialog */}
      <Dialog open={!!showPrescription} onOpenChange={() => setShowPrescription(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>E-Prescription</DialogTitle>
            <DialogDescription>
              {showPrescription?.doctor_name} • {showPrescription?.date}
            </DialogDescription>
          </DialogHeader>
          {showPrescription?.prescription && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{showPrescription.prescription.notes}</p>
              </div>
              
              {showPrescription.prescription.medicines?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Medicines</h4>
                  <div className="space-y-2">
                    {showPrescription.prescription.medicines.map((med, idx) => (
                      <div key={idx} className="p-2 bg-orange-50 rounded flex justify-between">
                        <span>{med.name}</span>
                        <span className="text-sm text-gray-600">{med.dosage}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-2"
                    onClick={() => {
                      sessionStorage.setItem('prescription_medicines', JSON.stringify(showPrescription.prescription.medicines));
                      navigate('/pharmacy?prescription=true');
                    }}
                  >
                    <Pill className="w-4 h-4 mr-2" /> Order These Medicines
                  </Button>
                </div>
              )}

              {showPrescription.prescription.tests?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Recommended Tests</h4>
                  <div className="space-y-2">
                    {showPrescription.prescription.tests.map((test, idx) => (
                      <div key={idx} className="p-2 bg-purple-50 rounded">
                        {test}
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-2"
                    onClick={() => {
                      sessionStorage.setItem('prescription_tests', JSON.stringify(showPrescription.prescription.tests));
                      navigate('/proton?prescription=true');
                    }}
                  >
                    <FlaskConical className="w-4 h-4 mr-2" /> Book These Tests
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Funds Dialog */}
      <Dialog open={showAddFunds} onOpenChange={setShowAddFunds}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-green-600" />
              Add Funds to Wallet
            </DialogTitle>
            <DialogDescription>
              Add money via UPI to book your consultation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Quick Amount Buttons */}
            <div>
              <Label className="text-sm text-gray-600">Select Amount</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[300, 500, 1000, 2000].map(amt => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Open UPI payment link
                      const upiUrl = `upi://pay?pa=pinelabs.stq4087704@pineaxis&pn=Nevika%20Cura&am=${amt}&cu=INR`;
                      window.open(upiUrl, '_blank');
                      toast.info(`Opening UPI app for ₹${amt}. After payment, contact support for wallet credit.`, { duration: 5000 });
                    }}
                    className="hover:bg-green-50 hover:border-green-400"
                  >
                    ₹{amt}
                  </Button>
                ))}
              </div>
            </div>

            {/* UPI QR Code */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Scan to Pay via UPI</p>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=upi://pay?pa=pinelabs.stq4087704@pineaxis&pn=Nevika%20Cura&am=${selectedDoctor?.fee || 300}&cu=INR`}
                alt="UPI QR Code"
                className="mx-auto rounded-lg border"
              />
              <p className="text-lg font-bold text-green-600 mt-2">₹{selectedDoctor?.fee || 300}</p>
            </div>

            {/* UPI ID */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">UPI ID</p>
                <p className="font-mono font-semibold text-sm">pinelabs.stq4087704@pineaxis</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  navigator.clipboard.writeText('pinelabs.stq4087704@pineaxis');
                  toast.success('UPI ID copied!');
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            {/* Instructions */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>After Payment:</strong> Your wallet will be credited within 30 minutes. 
                Take a screenshot of payment for reference.
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowAddFunds(false)}
                className="flex-1"
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  setShowAddFunds(false);
                  fetchWalletBalance();
                  toast.info('Checking wallet balance...', { duration: 2000 });
                }}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Refresh Balance
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Teleconsultation;
