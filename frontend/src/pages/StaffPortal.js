import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, User, Lock, LogOut, UserPlus, CheckCircle2, 
  Clock, Package, FlaskConical, Stethoscope, Users, 
  Phone, Calendar, Loader2, RefreshCw, AlertTriangle, Plus, 
  Heart, Droplet, Scan
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Clinic configuration with clinic IDs
const CLINICS = {
  "Pushpa Clinic": ["Dr. Neha Patel", "Dr. Vikas Jha"],
  "Amnion Clinic": ["Dr. Vikas Jha", "Dr. Ankita Gupta"]
};

// Doctor schedules - matching DiaGyn clinic availability
const DOCTOR_SCHEDULES = {
  "Dr. Vikas Jha": {
    "Pushpa Clinic": [
      { days: ['Monday', 'Wednesday', 'Friday'], time: '18:00-22:00' }
    ],
    "Amnion Clinic": [
      { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '11:00-14:00' },
      { days: ['Tuesday', 'Thursday', 'Saturday'], time: '18:00-22:00' }
    ]
  },
  "Dr. Neha Patel": {
    "Amnion Clinic": [
      { days: ['Monday', 'Wednesday', 'Friday'], time: '18:00-22:00' }
    ],
    "Pushpa Clinic": [
      { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '11:00-14:00' },
      { days: ['Tuesday', 'Thursday', 'Saturday'], time: '18:00-22:00' }
    ]
  },
  "Dr. Ankita Gupta": {
    "Amnion Clinic": [
      { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '10:00-13:00' },
      { days: ['Monday', 'Wednesday', 'Friday'], time: '17:00-20:00' }
    ]
  }
};

// Helper function to generate time slots from schedule
const generateTimeSlots = (startTime, endTime, interval = 30) => {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let currentHour = startHour;
  let currentMin = startMin;
  
  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
    slots.push(timeStr);
    
    currentMin += interval;
    if (currentMin >= 60) {
      currentHour += 1;
      currentMin = 0;
    }
  }
  
  return slots;
};

// Get day name from date
const getDayName = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// Get available time slots for a doctor at a clinic on a specific date
const getAvailableTimeSlots = (doctor, clinic, dateStr) => {
  if (!doctor || !clinic || !dateStr) return [];
  
  const dayName = getDayName(dateStr);
  const schedule = DOCTOR_SCHEDULES[doctor]?.[clinic];
  
  if (!schedule) return [];
  
  const allSlots = [];
  
  schedule.forEach(slot => {
    if (slot.days.includes(dayName)) {
      const [startTime, endTime] = slot.time.split('-');
      const timeSlots = generateTimeSlots(startTime, endTime);
      allSlots.push(...timeSlots);
    }
  });
  
  // Remove duplicates and sort
  return [...new Set(allSlots)].sort();
};

const StaffPortal = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [appointments, setAppointments] = useState([]);
  const [pharmacyOrders, setPharmacyOrders] = useState([]);
  const [diagnosticOrders, setDiagnosticOrders] = useState([]);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [emergencyCounts, setEmergencyCounts] = useState({});
  
  // Walk-in form
  const [walkInForm, setWalkInForm] = useState({
    doctor: '',
    clinic: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    patient_name: '',
    patient_phone: ''
  });
  
  // Emergency form
  const [emergencyForm, setEmergencyForm] = useState({
    doctor: '',
    clinic: '',
    date: new Date().toISOString().split('T')[0],
    patient_name: '',
    patient_phone: '',
    patient_email: ''
  });
  
  // Service modal states
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedService, setSelectedService] = useState('');

  // Calculate available time slots based on doctor, clinic, and date
  const availableTimeSlots = useMemo(() => {
    return getAvailableTimeSlots(walkInForm.doctor, walkInForm.clinic, walkInForm.date);
  }, [walkInForm.doctor, walkInForm.clinic, walkInForm.date]);

  // Check if doctor is available on selected date
  const isDoctorAvailable = useMemo(() => {
    return availableTimeSlots.length > 0;
  }, [availableTimeSlots]);

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const info = localStorage.getItem('staffInfo');
    if (token && info) {
      setIsAuthenticated(true);
      const parsedInfo = JSON.parse(info);
      setStaffInfo(parsedInfo);
      
      // Set default clinic for forms based on staff's clinic
      if (parsedInfo.clinic) {
        const clinicDoctors = CLINICS[parsedInfo.clinic] || [];
        setWalkInForm(prev => ({
          ...prev,
          clinic: parsedInfo.clinic,
          doctor: clinicDoctors[0] || ''
        }));
        setEmergencyForm(prev => ({
          ...prev,
          clinic: parsedInfo.clinic,
          doctor: clinicDoctors[0] || ''
        }));
      }
    }
  }, []);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('staffToken')}` }
  });

  // Helper to check clinic staff roles
  const isClinicStaff = (role) => ['clinic_staff_pushpa', 'clinic_staff_amnion', 'super_admin'].includes(role);
  const isDoctor = (role) => ['doctor_pushpa', 'doctor_amnion', 'super_admin'].includes(role);

  const loadData = async () => {
    try {
      const role = staffInfo?.role;
      
      if (isClinicStaff(role)) {
        const res = await axios.get(`${API}/staff/clinic/appointments?date=${selectedDate}`, getAuthHeaders());
        setAppointments(res.data.appointments || []);
        setEmergencyCounts(res.data.emergency_counts || {});
      }
      
      if (isDoctor(role)) {
        const res = await axios.get(`${API}/staff/doctor/appointments?date=${selectedDate}`, getAuthHeaders());
        setAppointments(res.data.appointments || []);
      }
      
      if (role === 'pharmacy_staff' || role === 'super_admin') {
        const res = await axios.get(`${API}/staff/pharmacy/orders`, getAuthHeaders());
        setPharmacyOrders(res.data.orders || []);
      }
      
      if (role === 'diagnostics_staff' || role === 'super_admin') {
        const res = await axios.get(`${API}/staff/diagnostic/orders`, getAuthHeaders());
        setDiagnosticOrders(res.data.orders || []);
        
        // Also load service-linked orders
        const serviceRes = await axios.get(`${API}/staff/diagnostic/service-orders`, getAuthHeaders());
        setServiceOrders(serviceRes.data.orders || []);
      }
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated && staffInfo) {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, staffInfo, selectedDate]);

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/staff/login`, { username, password });
      localStorage.setItem('staffToken', res.data.token);
      const staffData = {
        role: res.data.role,
        name: res.data.name,
        doctor_name: res.data.doctor_name,
        clinic: res.data.clinic
      };
      localStorage.setItem('staffInfo', JSON.stringify(staffData));
      setStaffInfo(staffData);
      
      // Set forms with clinic
      if (res.data.clinic) {
        const clinicDoctors = CLINICS[res.data.clinic] || [];
        setWalkInForm(prev => ({
          ...prev,
          clinic: res.data.clinic,
          doctor: clinicDoctors[0] || ''
        }));
        setEmergencyForm(prev => ({
          ...prev,
          clinic: res.data.clinic,
          doctor: clinicDoctors[0] || ''
        }));
      }
      
      setIsAuthenticated(true);
      toast.success(`Welcome, ${res.data.name}!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffInfo');
    setIsAuthenticated(false);
    setStaffInfo(null);
    toast.success('Logged out successfully');
  };

  const handleCheckIn = async (appointmentId) => {
    try {
      await axios.put(`${API}/staff/appointments/${appointmentId}/check-in`, {}, getAuthHeaders());
      toast.success('Patient checked in successfully');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Check-in failed');
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    try {
      await axios.put(`${API}/staff/appointments/${appointmentId}/complete`, {}, getAuthHeaders());
      toast.success('Appointment marked as completed');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Update failed');
    }
  };

  const handleWalkInBooking = async () => {
    if (!walkInForm.patient_name || !walkInForm.patient_phone || !walkInForm.time) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/staff/appointments/walk-in`, walkInForm, getAuthHeaders());
      toast.success('Walk-in appointment booked');
      setWalkInForm({ ...walkInForm, patient_name: '', patient_phone: '', time: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Booking failed');
    }
    setLoading(false);
  };
  
  // Emergency appointment booking
  const handleEmergencyBooking = async () => {
    if (!emergencyForm.patient_name || !emergencyForm.patient_phone) {
      toast.error('Please fill patient name and phone');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/staff/appointments/emergency`, emergencyForm, getAuthHeaders());
      toast.success('Emergency appointment booked');
      setEmergencyForm({ ...emergencyForm, patient_name: '', patient_phone: '', patient_email: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Booking failed');
    }
    setLoading(false);
  };
  
  // Add service to appointment
  const handleAddService = async () => {
    if (!selectedAppointment || !selectedService) {
      toast.error('Please select a service');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(
        `${API}/staff/appointments/${selectedAppointment.id}/services`,
        { service_type: selectedService },
        getAuthHeaders()
      );
      toast.success(`${selectedService.replace('_', ' ')} added successfully`);
      setShowServiceModal(false);
      setSelectedAppointment(null);
      setSelectedService('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add service');
    }
    setLoading(false);
  };

  const handlePharmacyStatusUpdate = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/staff/pharmacy/orders/${orderId}/status`, { status: newStatus }, getAuthHeaders());
      toast.success(`Order updated to ${newStatus}`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Update failed');
    }
  };

  const handleDiagnosticStatusUpdate = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/staff/diagnostic/orders/${orderId}/status`, { status: newStatus }, getAuthHeaders());
      toast.success(`Order updated to ${newStatus}`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Update failed');
    }
  };
  
  const handleServiceStatusUpdate = async (serviceId, newStatus) => {
    try {
      await axios.put(`${API}/staff/services/${serviceId}/status`, { status: newStatus }, getAuthHeaders());
      toast.success(`Service updated to ${newStatus}`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Update failed');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Booked': 'bg-yellow-100 text-yellow-800',
      'In Clinic': 'bg-blue-100 text-blue-800',
      'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800',
      'No Show': 'bg-gray-100 text-gray-800',
      'Received': 'bg-yellow-100 text-yellow-800',
      'Processing': 'bg-blue-100 text-blue-800',
      'Ready': 'bg-purple-100 text-purple-800',
      'Delivered': 'bg-green-100 text-green-800',
      'Sample Collected': 'bg-blue-100 text-blue-800',
      'Report Ready': 'bg-purple-100 text-purple-800',
      'ORDERED': 'bg-yellow-100 text-yellow-800',
      'SAMPLE_COLLECTED': 'bg-blue-100 text-blue-800',
      'PROCESSING': 'bg-purple-100 text-purple-800',
      'COMPLETED': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Portal</h1>
            <p className="text-gray-500 mt-1">Nevika Cura Healthcare</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label>Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="pl-10"
                  data-testid="staff-username"
                />
              </div>
            </div>
            
            <div>
              <Label>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  data-testid="staff-password"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleLogin} 
              disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-600"
              data-testid="staff-login-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Login
            </Button>
          </div>
          
          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={() => navigate('/')} className="text-gray-500">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const role = staffInfo?.role;

  // Service Modal Content
  const serviceModalContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Add Service for {selectedAppointment?.patient_name}</h3>
        <div className="space-y-3">
          <button
            onClick={() => setSelectedService('BLOOD_TEST')}
            className={`w-full p-4 rounded-lg border flex items-center gap-3 transition-all ${
              selectedService === 'BLOOD_TEST' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'
            }`}
          >
            <Droplet className="w-6 h-6 text-red-500" />
            <div className="text-left">
              <p className="font-medium">Blood Test</p>
              <p className="text-sm text-gray-500">Pathology blood test</p>
            </div>
          </button>
          
          <button
            onClick={() => setSelectedService('SONOGRAPHY')}
            className={`w-full p-4 rounded-lg border flex items-center gap-3 transition-all ${
              selectedService === 'SONOGRAPHY' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            <Scan className="w-6 h-6 text-purple-500" />
            <div className="text-left">
              <p className="font-medium">Sonography / USG</p>
              <p className="text-sm text-gray-500">Ultrasound imaging</p>
            </div>
          </button>
          
          <button
            onClick={() => setSelectedService('ECG')}
            className={`w-full p-4 rounded-lg border flex items-center gap-3 transition-all ${
              selectedService === 'ECG' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'
            }`}
          >
            <Heart className="w-6 h-6 text-pink-500" />
            <div className="text-left">
              <p className="font-medium">ECG</p>
              <p className="text-sm text-gray-500">Electrocardiogram</p>
            </div>
          </button>
        </div>
        
        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1" onClick={() => {
            setShowServiceModal(false);
            setSelectedAppointment(null);
            setSelectedService('');
          }}>
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-teal-500 hover:bg-teal-600" 
            onClick={handleAddService}
            disabled={!selectedService || loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Add Service
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Service Modal - Rendered inline */}
      {showServiceModal && serviceModalContent}
      
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Staff Portal</h1>
              <p className="text-sm text-gray-500">{staffInfo?.name} • {role?.replace(/_/g, ' ').toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Clinic Staff View */}
        {isClinicStaff(role) && (
          <Tabs defaultValue="appointments" className="space-y-4">
            <TabsList>
              <TabsTrigger value="appointments" data-testid="tab-appointments">
                <Calendar className="w-4 h-4 mr-2" />
                Appointments
              </TabsTrigger>
              <TabsTrigger value="walkin" data-testid="tab-walkin">
                <UserPlus className="w-4 h-4 mr-2" />
                Walk-in
              </TabsTrigger>
              <TabsTrigger value="emergency" data-testid="tab-emergency">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Emergency
              </TabsTrigger>
            </TabsList>

            <TabsContent value="appointments">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg">{staffInfo?.clinic || 'Clinic'} - Appointments</h2>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-40"
                    data-testid="date-picker"
                  />
                </div>
                
                {/* Emergency Count Display */}
                {Object.keys(emergencyCounts).length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-2">Emergency Appointments Today:</p>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(emergencyCounts).map(([doctor, data]) => (
                        <span key={doctor} className="text-sm">
                          <span className="font-medium">{doctor}:</span>{' '}
                          <span className={data.count >= 10 ? 'text-red-600 font-bold' : 'text-gray-700'}>
                            {data.count}/{data.max}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  {appointments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No appointments for this date</p>
                  ) : (
                    appointments.map((appt) => (
                      <div 
                        key={appt.id} 
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          appt.appointment_type === 'EMERGENCY' 
                            ? 'bg-red-50 border-2 border-red-300' 
                            : 'bg-gray-50'
                        }`}
                        data-testid={`appointment-${appt.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{appt.patient_name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(appt.status)}`}>
                              {appt.status}
                            </span>
                            {appt.appointment_type === 'EMERGENCY' && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                EMERGENCY
                              </span>
                            )}
                            {appt.booking_type === 'walk_in' && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800">Walk-in</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            <span>{appt.time || 'No time slot'}</span> • <span>{appt.doctor}</span> • <span>{appt.patient_phone}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {/* Add Service button - only before completion */}
                          {appt.status !== 'Completed' && appt.status !== 'Cancelled' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedAppointment(appt);
                                setShowServiceModal(true);
                              }}
                              data-testid={`add-service-${appt.id}`}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Service
                            </Button>
                          )}
                          {appt.status === 'Booked' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleCheckIn(appt.id)} 
                              className="bg-blue-500 hover:bg-blue-600"
                              data-testid={`checkin-${appt.id}`}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Check In
                            </Button>
                          )}
                          {appt.status === 'In Clinic' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleCompleteAppointment(appt.id)} 
                              className="bg-green-500 hover:bg-green-600"
                              data-testid={`complete-${appt.id}`}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="walkin">
              <Card className="p-6 max-w-lg">
                <h2 className="font-semibold text-lg mb-4">Book Walk-in Appointment - {staffInfo?.clinic}</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Doctor</Label>
                      <select
                        value={walkInForm.doctor}
                        onChange={(e) => setWalkInForm({ ...walkInForm, doctor: e.target.value, time: '' })}
                        className="w-full p-2 border rounded-lg"
                        data-testid="walkin-doctor"
                      >
                        {(CLINICS[staffInfo?.clinic] || []).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={walkInForm.date}
                        onChange={(e) => setWalkInForm({ ...walkInForm, date: e.target.value, time: '' })}
                        data-testid="walkin-date"
                      />
                    </div>
                  </div>
                  
                  {/* Doctor availability notice */}
                  {walkInForm.doctor && walkInForm.date && !isDoctorAvailable && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      <strong>{walkInForm.doctor}</strong> is not available at {staffInfo?.clinic} on {getDayName(walkInForm.date)}. 
                      Please select a different date or doctor.
                    </div>
                  )}
                  
                  {/* Show schedule info */}
                  {walkInForm.doctor && DOCTOR_SCHEDULES[walkInForm.doctor]?.[staffInfo?.clinic] && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                      <Clock className="w-4 h-4 inline mr-2" />
                      <strong>{walkInForm.doctor}</strong> schedule at {staffInfo?.clinic}:
                      <ul className="mt-1 ml-6 list-disc">
                        {DOCTOR_SCHEDULES[walkInForm.doctor][staffInfo?.clinic].map((slot, idx) => (
                          <li key={idx}>{slot.days.join(', ')}: {slot.time}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div>
                    <Label>Time Slot * {availableTimeSlots.length > 0 && <span className="text-gray-500 text-xs">({availableTimeSlots.length} slots available)</span>}</Label>
                    <select
                      value={walkInForm.time}
                      onChange={(e) => setWalkInForm({ ...walkInForm, time: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                      data-testid="walkin-time"
                      disabled={!isDoctorAvailable}
                    >
                      <option value="">{isDoctorAvailable ? 'Select time' : 'No slots available'}</option>
                      {availableTimeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <Label>Patient Name *</Label>
                    <Input
                      value={walkInForm.patient_name}
                      onChange={(e) => setWalkInForm({ ...walkInForm, patient_name: e.target.value })}
                      placeholder="Enter patient name"
                      data-testid="walkin-name"
                    />
                  </div>
                  
                  <div>
                    <Label>Phone Number *</Label>
                    <Input
                      value={walkInForm.patient_phone}
                      onChange={(e) => setWalkInForm({ ...walkInForm, patient_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="10-digit mobile number"
                      data-testid="walkin-phone"
                    />
                  </div>
                  
                  <Button onClick={handleWalkInBooking} disabled={loading || !isDoctorAvailable} className="w-full bg-teal-500 hover:bg-teal-600" data-testid="walkin-submit">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    Book Walk-in Appointment
                  </Button>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="emergency">
              <Card className="p-6 max-w-lg">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <h2 className="font-semibold text-lg">Book Emergency Appointment</h2>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Emergency appointments do NOT require a time slot. Maximum 10 per doctor per day.
                </p>
                
                {/* Show current emergency count */}
                {emergencyCounts[emergencyForm.doctor] && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">{emergencyForm.doctor}:</span>{' '}
                      <span className={emergencyCounts[emergencyForm.doctor].count >= 10 ? 'text-red-600 font-bold' : 'text-gray-700'}>
                        {emergencyCounts[emergencyForm.doctor].count} / {emergencyCounts[emergencyForm.doctor].max} emergency slots used today
                      </span>
                    </p>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Doctor *</Label>
                      <select
                        value={emergencyForm.doctor}
                        onChange={(e) => setEmergencyForm({ ...emergencyForm, doctor: e.target.value })}
                        className="w-full p-2 border rounded-lg"
                        data-testid="emergency-doctor"
                      >
                        {(CLINICS[staffInfo?.clinic] || []).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={emergencyForm.date}
                        onChange={(e) => setEmergencyForm({ ...emergencyForm, date: e.target.value })}
                        data-testid="emergency-date"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Patient Name *</Label>
                    <Input
                      value={emergencyForm.patient_name}
                      onChange={(e) => setEmergencyForm({ ...emergencyForm, patient_name: e.target.value })}
                      placeholder="Enter patient name"
                      data-testid="emergency-name"
                    />
                  </div>
                  
                  <div>
                    <Label>Phone Number *</Label>
                    <Input
                      value={emergencyForm.patient_phone}
                      onChange={(e) => setEmergencyForm({ ...emergencyForm, patient_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="10-digit mobile number"
                      data-testid="emergency-phone"
                    />
                  </div>
                  
                  <div>
                    <Label>Email (Optional)</Label>
                    <Input
                      type="email"
                      value={emergencyForm.patient_email}
                      onChange={(e) => setEmergencyForm({ ...emergencyForm, patient_email: e.target.value })}
                      placeholder="patient@email.com"
                      data-testid="emergency-email"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleEmergencyBooking} 
                    disabled={loading || (emergencyCounts[emergencyForm.doctor]?.count >= 10)} 
                    className="w-full bg-red-500 hover:bg-red-600"
                    data-testid="emergency-submit"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                    Book Emergency Appointment
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Doctor View */}
        {isDoctor(role) && !isClinicStaff(role) && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">My Appointments - {staffInfo?.doctor_name}</h2>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
            
            <div className="space-y-3">
              {appointments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No appointments for this date</p>
              ) : (
                appointments.map((appt) => (
                  <div 
                    key={appt.id} 
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      appt.appointment_type === 'EMERGENCY' 
                        ? 'bg-red-50 border-2 border-red-300' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{appt.patient_name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(appt.status)}`}>
                          {appt.status}
                        </span>
                        {appt.appointment_type === 'EMERGENCY' && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            EMERGENCY
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <span>{appt.time || 'No time slot'}</span> • <span>{appt.patient_phone}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {appt.status === 'In Clinic' && (
                        <Button size="sm" onClick={() => handleCompleteAppointment(appt.id)} className="bg-green-500 hover:bg-green-600">
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* Pharmacy Staff View */}
        {role === 'pharmacy_staff' && (
          <Card className="p-4 mt-4">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              Pharmacy Orders
            </h2>
            
            <div className="space-y-3">
              {pharmacyOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No orders</p>
              ) : (
                pharmacyOrders.map((order) => (
                  <div key={order.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium">{order.patient_name}</span>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{order.patient_phone}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      {order.medicines?.map(m => `${m.name} (${m.quantity})`).join(', ')}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {['Order Booked', 'Packing', 'Out for Delivery', 'Delivered'].map(status => (
                        <Button
                          key={status}
                          size="sm"
                          variant={order.status === status ? 'default' : 'outline'}
                          onClick={() => handlePharmacyStatusUpdate(order.id, status)}
                          disabled={order.status === status}
                          className={order.status === status ? 'bg-orange-500' : ''}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* Diagnostics Staff View */}
        {(role === 'diagnostics_staff' || role === 'super_admin') && (
          <>
            {/* Service-Linked Orders (from clinic add-ons) */}
            {serviceOrders.length > 0 && (
              <Card className="p-4 mb-4">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-teal-500" />
                  Clinic Add-on Services
                </h2>
                <p className="text-sm text-gray-500 mb-4">Tests ordered during clinic visits</p>
                
                <div className="space-y-3">
                  {serviceOrders.map((order) => (
                    <div key={order.id} className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium">{order.patient_name}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                          <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-800">
                            Clinic Add-on
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">{order.patient_phone}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        <strong>Service:</strong> {order.service_type?.replace('_', ' ')} | 
                        <strong> Clinic:</strong> {order.clinic || 'N/A'}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {['Test Booked', 'Sample Collected', 'In Process', 'Reports Generated'].map(status => (
                          <Button
                            key={status}
                            size="sm"
                            variant={order.status === status ? 'default' : 'outline'}
                            onClick={() => handleDiagnosticStatusUpdate(order.id, status)}
                            disabled={order.status === status}
                            className={order.status === status ? 'bg-teal-500' : ''}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            
            {/* Regular Diagnostic Orders */}
            <Card className="p-4 mt-4">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-purple-500" />
                Diagnostic Orders
              </h2>
              
              <div className="space-y-3">
                {diagnosticOrders.filter(o => !o.linked_appointment_id).length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No orders</p>
                ) : (
                  diagnosticOrders.filter(o => !o.linked_appointment_id).map((order) => (
                    <div key={order.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium">{order.patient_name}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">{order.patient_phone}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        {order.tests?.slice(0, 3).join(', ')}{order.tests?.length > 3 ? '...' : ''}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {['Test Booked', 'Sample Collected', 'In Process', 'Reports Generated'].map(status => (
                          <Button
                            key={status}
                            size="sm"
                            variant={order.status === status ? 'default' : 'outline'}
                            onClick={() => handleDiagnosticStatusUpdate(order.id, status)}
                            disabled={order.status === status}
                            className={order.status === status ? 'bg-purple-500' : ''}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default StaffPortal;
