import React, { useState, useEffect } from 'react';
import { Video, Calendar, Clock, User, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Teleconsultation Feature (#12, #13) - Video Only
const Teleconsultation = () => {
  const [loading, setLoading] = useState(false);
  const [consultations, setConsultations] = useState([]);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingData, setBookingData] = useState({
    doctor_id: '',
    preferred_date: '',
    preferred_time: '',
    reason: '',
    consultation_type: 'video'
  });

  const doctors = [
    { id: 'doc_vikas', name: 'Dr. Vikas Jha', specialty: 'Diabetologist & Physician', available: true },
    { id: 'doc_neha', name: 'Dr. Neha Patel', specialty: 'OBGYN', available: true }
  ];

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchConsultations = async () => {
    try {
      const token = localStorage.getItem('patientToken') || localStorage.getItem('token');
      const res = await fetch(`${API}/api/teleconsultation/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.sessions) {
        setConsultations(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch consultations:', error);
    }
  };

  const bookConsultation = async () => {
    if (!bookingData.doctor_id || !bookingData.preferred_date || !bookingData.preferred_time) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/features/teleconsult/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bookingData)
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Teleconsultation booked successfully!');
        setShowBooking(false);
        setBookingData({
          doctor_id: '',
          preferred_date: '',
          preferred_time: '',
          reason: '',
          consultation_type: 'video'
        });
        fetchConsultations();
      }
    } catch (error) {
      toast.error('Failed to book consultation');
    } finally {
      setLoading(false);
    }
  };

  const joinConsultation = async (consultationId) => {
    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/features/teleconsult/${consultationId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success && data.meeting_link) {
        window.open(data.meeting_link, '_blank');
      }
    } catch (error) {
      toast.error('Failed to join consultation');
    }
  };

  const getTypeIcon = () => Video;

  return (
    <div className="space-y-4" data-testid="teleconsultation">
      {/* Header */}
      <Card className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Teleconsultation</h2>
                <p className="text-cyan-100 text-sm">Consult doctors from home</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowBooking(true)}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              Book Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Video Consultation Info */}
      <Card className="border-2 border-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Video className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-800">Video Consultation</p>
              <p className="text-sm text-blue-600">Face-to-face consultation with your doctor</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Consultations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Upcoming Consultations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consultations.length === 0 ? (
            <div className="text-center py-8">
              <Video className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No upcoming consultations</p>
              <Button className="mt-4" onClick={() => setShowBooking(true)}>
                Book Your First Consultation
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {consultations.map((consultation) => {
                const TypeIcon = getTypeIcon(consultation.type);
                return (
                  <Card key={consultation.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <TypeIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{consultation.doctor_name}</h4>
                            <p className="text-sm text-gray-500">{consultation.specialty}</p>
                            <div className="flex items-center gap-3 mt-2 text-sm">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {consultation.date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {consultation.time}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Badge className={
                            consultation.status === 'confirmed' ? 'bg-green-500' :
                            consultation.status === 'pending' ? 'bg-amber-500' : 'bg-gray-500'
                          }>
                            {consultation.status}
                          </Badge>
                          {consultation.status === 'confirmed' && (
                            <Button size="sm" onClick={() => joinConsultation(consultation.id)}>
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Join
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Doctors */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Available Doctors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {doctors.map((doctor) => (
            <div key={doctor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">{doctor.name}</p>
                  <p className="text-sm text-gray-500">{doctor.specialty}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-green-600">Available</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Booking Dialog */}
      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-blue-600" />
              Book Teleconsultation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Select Doctor</Label>
              <Select 
                value={bookingData.doctor_id} 
                onValueChange={(v) => setBookingData(prev => ({ ...prev, doctor_id: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map(doctor => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name} - {doctor.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={bookingData.preferred_date}
                  onChange={(e) => setBookingData(prev => ({ ...prev, preferred_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Time</Label>
                <Select 
                  value={bookingData.preferred_time} 
                  onValueChange={(v) => setBookingData(prev => ({ ...prev, preferred_time: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {['10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'].map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Reason for Consultation</Label>
              <Textarea
                placeholder="Describe your symptoms or reason..."
                value={bookingData.reason}
                onChange={(e) => setBookingData(prev => ({ ...prev, reason: e.target.value }))}
                className="mt-1"
                rows={3}
              />
            </div>

            <Button 
              className="w-full" 
              onClick={bookConsultation}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                'Book Consultation'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Teleconsultation;
