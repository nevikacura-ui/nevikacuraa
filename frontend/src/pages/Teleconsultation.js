import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Video, Calendar, Clock, User, Phone, 
  Loader2, Star, MapPin, Award, Check, ChevronRight,
  ExternalLink, MessageSquare
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const Teleconsultation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [myBookings, setMyBookings] = useState({ upcoming: [], past: [] });
  const [showMyBookings, setShowMyBookings] = useState(false);
  
  const [bookingForm, setBookingForm] = useState({
    patient_name: '',
    patient_phone: '',
    patient_email: '',
    reason: '',
    symptoms: ''
  });
  
  useEffect(() => {
    fetchDoctors();
    if (user?.id) {
      fetchMyBookings();
    }
  }, [user]);
  
  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/doctors/all`);
      setDoctors(response.data?.doctors || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
    setLoading(false);
  };
  
  const fetchMyBookings = async () => {
    try {
      const response = await axios.get(`${API}/teleconsult/bookings/${user.id}`);
      setMyBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };
  
  const fetchAvailableSlots = async (doctorId, date) => {
    try {
      const response = await axios.get(`${API}/teleconsult/available-slots/${doctorId}?date=${date}`);
      setAvailableSlots(response.data?.sessions || []);
    } catch (error) {
      toast.error('Failed to fetch available slots');
      setAvailableSlots([]);
    }
  };
  
  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    if (selectedDoctor && date) {
      fetchAvailableSlots(selectedDoctor.id, date);
    }
  };
  
  const handleBookConsultation = async () => {
    if (!bookingForm.patient_name || !bookingForm.patient_phone) {
      toast.error('Please fill name and phone number');
      return;
    }
    
    if (!user?.id) {
      toast.error('Please login to book');
      return;
    }
    
    setBookingLoading(true);
    try {
      const response = await axios.post(`${API}/teleconsult/book?user_id=${user.id}`, {
        doctor_id: selectedDoctor.id,
        patient_name: bookingForm.patient_name,
        patient_phone: bookingForm.patient_phone,
        patient_email: bookingForm.patient_email,
        date: selectedDate,
        time: selectedSlot,
        reason: bookingForm.reason,
        symptoms: bookingForm.symptoms.split(',').map(s => s.trim()).filter(Boolean),
        is_follow_up: false
      });
      
      toast.success('Teleconsultation booked!');
      setShowBooking(false);
      setSelectedDoctor(null);
      setSelectedDate('');
      setSelectedSlot(null);
      fetchMyBookings();
      
      // Show meeting link
      toast.info(`Meeting link: ${response.data.meeting_link}`, { duration: 10000 });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to book consultation');
    }
    setBookingLoading(false);
  };
  
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  const getMaxDate = () => {
    const max = new Date();
    max.setDate(max.getDate() + 7);
    return max.toISOString().split('T')[0];
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} data-testid="back-btn">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold text-xl text-gray-900">Teleconsultation</h1>
                <p className="text-sm text-gray-500">Video consult with doctors from home</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <Button variant="outline" size="sm" onClick={() => setShowMyBookings(true)}>
                  My Bookings
                </Button>
              )}
              <Video className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info Banner */}
            <Card className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-2">Consult from Anywhere</h2>
                <p className="opacity-90 mb-4">
                  Get expert medical advice through secure video consultation. 
                  No travel, no waiting rooms.
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>Secure & Private</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>E-Prescription</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>Follow-up Support</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Doctors List */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Available Doctors</h2>
              <div className="space-y-4">
                {doctors.map((doctor) => (
                  <Card key={doctor.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{doctor.name}</h3>
                              <p className="text-sm text-gray-600">{doctor.specialization}</p>
                              <p className="text-xs text-gray-500">{doctor.qualification}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-yellow-500">
                                <Star className="w-4 h-4 fill-current" />
                                <span className="font-semibold">{doctor.rating}</span>
                              </div>
                              <p className="text-xs text-gray-500">{doctor.total_reviews} reviews</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Award className="w-4 h-4" />
                              {doctor.experience_years} years
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {doctor.clinic}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <div>
                              <span className="text-lg font-bold text-green-600">₹{doctor.consultation_fee || 300}</span>
                              <span className="text-sm text-gray-500 ml-1">per consultation</span>
                            </div>
                            <Button onClick={() => {
                              setSelectedDoctor(doctor);
                              setBookingForm({
                                ...bookingForm,
                                patient_name: user?.name || '',
                                patient_phone: user?.phone || ''
                              });
                            }}>
                              <Video className="w-4 h-4 mr-2" />
                              Book Video Consult
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Slot Selection Dialog */}
      <Dialog open={!!selectedDoctor && !showBooking} onOpenChange={(open) => !open && setSelectedDoctor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Date & Time</DialogTitle>
            <DialogDescription>
              Choose a slot for video consultation with {selectedDoctor?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Date Selection */}
            <div>
              <label className="text-sm font-medium">Select Date</label>
              <Input 
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                min={getMinDate()}
                max={getMaxDate()}
              />
            </div>
            
            {/* Time Slots */}
            {selectedDate && (
              <div>
                <label className="text-sm font-medium">Select Time Slot</label>
                {availableSlots.length > 0 ? (
                  <div className="space-y-3 mt-2">
                    {availableSlots.map((session) => (
                      <div key={session.session}>
                        <p className="text-xs text-gray-500 uppercase mb-2">{session.session}</p>
                        <div className="grid grid-cols-4 gap-2">
                          {session.slots.map((slot) => (
                            <button
                              key={slot.time}
                              disabled={!slot.available}
                              onClick={() => setSelectedSlot(slot.time)}
                              className={`p-2 text-sm rounded-md border transition-colors ${
                                selectedSlot === slot.time
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : slot.available
                                  ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                  : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">No slots available for this date</p>
                )}
              </div>
            )}
            
            <Button 
              className="w-full" 
              disabled={!selectedDate || !selectedSlot}
              onClick={() => setShowBooking(true)}
            >
              Continue - ₹{selectedDoctor?.consultation_fee || 300}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Booking Form Dialog */}
      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Booking</DialogTitle>
            <DialogDescription>
              {selectedDoctor?.name} • {selectedDate} at {selectedSlot}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Patient Name *</label>
              <Input 
                value={bookingForm.patient_name}
                onChange={(e) => setBookingForm({...bookingForm, patient_name: e.target.value})}
                placeholder="Enter patient name"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Phone Number *</label>
              <Input 
                value={bookingForm.patient_phone}
                onChange={(e) => setBookingForm({...bookingForm, patient_phone: e.target.value})}
                placeholder="Enter phone number"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Email (optional)</label>
              <Input 
                type="email"
                value={bookingForm.patient_email}
                onChange={(e) => setBookingForm({...bookingForm, patient_email: e.target.value})}
                placeholder="Enter email for meeting link"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Reason for Consultation</label>
              <Input 
                value={bookingForm.reason}
                onChange={(e) => setBookingForm({...bookingForm, reason: e.target.value})}
                placeholder="e.g., Regular checkup, specific concern"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Symptoms (comma separated)</label>
              <Textarea 
                value={bookingForm.symptoms}
                onChange={(e) => setBookingForm({...bookingForm, symptoms: e.target.value})}
                placeholder="e.g., headache, fever, fatigue"
                rows={2}
              />
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Consultation Fee</span>
                <span className="text-xl font-bold text-blue-600">₹{selectedDoctor?.consultation_fee || 300}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Pay after consultation</p>
            </div>
            
            <Button className="w-full" onClick={handleBookConsultation} disabled={bookingLoading}>
              {bookingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Video className="w-4 h-4 mr-2" />}
              Confirm Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* My Bookings Dialog */}
      <Dialog open={showMyBookings} onOpenChange={setShowMyBookings}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>My Video Consultations</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {myBookings.upcoming?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-500 mb-2">UPCOMING</h4>
                {myBookings.upcoming.map((booking) => (
                  <Card key={booking.id} className="mb-2">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{booking.date} at {booking.time}</p>
                          <p className="text-sm text-gray-500">{booking.patient_name}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => window.open(booking.meeting_link, '_blank')}>
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Join
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {myBookings.past?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-500 mb-2">PAST</h4>
                {myBookings.past.map((booking) => (
                  <Card key={booking.id} className="mb-2 bg-gray-50">
                    <CardContent className="p-3">
                      <p className="font-medium">{booking.date} at {booking.time}</p>
                      <p className="text-sm text-gray-500">{booking.status}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {(!myBookings.upcoming?.length && !myBookings.past?.length) && (
              <div className="text-center py-8 text-gray-500">
                <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No bookings yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Teleconsultation;
