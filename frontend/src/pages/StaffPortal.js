import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Heart, Droplet, Scan, Upload, FileText, Receipt
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Clinic configuration with clinic IDs
const CLINICS = {
  "Pushpa Clinic": ["Dr. Neha Patel", "Dr. Vikas Jha"],
  "Amnion Clinic": ["Dr. Vikas Jha", "Dr. Neha Patel"]
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
  }
};

// Helper function to generate time slots from schedule (15-minute intervals)
const generateTimeSlots = (startTime, endTime, interval = 15) => {
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

// Get current date in Indian timezone (IST - UTC+5:30)
const getIndianDate = () => {
  const now = new Date();
  // Convert to IST by adding 5 hours 30 minutes to UTC
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const istTime = new Date(utcTime + istOffset);
  return istTime.toISOString().split('T')[0];
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
  const [selectedDate, setSelectedDate] = useState(getIndianDate());
  const [pharmacyDate, setPharmacyDate] = useState(getIndianDate());
  const [diagnosticDate, setDiagnosticDate] = useState(getIndianDate());
  const [pharmacyDateCounts, setPharmacyDateCounts] = useState({});
  const [diagnosticDateCounts, setDiagnosticDateCounts] = useState({});
  const [emergencyCounts, setEmergencyCounts] = useState({});
  const [availableTests, setAvailableTests] = useState({});
  
  // Walk-in form
  const [walkInForm, setWalkInForm] = useState({
    doctor: '',
    clinic: '',
    date: getIndianDate(),
    time: '',
    patient_name: '',
    patient_phone: ''
  });
  
  // Emergency form
  const [emergencyForm, setEmergencyForm] = useState({
    doctor: '',
    clinic: '',
    date: getIndianDate(),
    patient_name: '',
    patient_phone: '',
    patient_email: ''
  });
  
  // Diagnostic order form (for diagnostics staff)
  const [diagOrderForm, setDiagOrderForm] = useState({
    patient_name: '',
    patient_phone: '',
    patient_email: '',
    age: '',
    sex: '',
    tests: [],
    notes: ''
  });
  
  // Service modal states
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedService, setSelectedService] = useState('');
  const [selectedTestCategory, setSelectedTestCategory] = useState('');
  const [selectedSpecificTests, setSelectedSpecificTests] = useState([]);
  
  // Booked slots state for slot synchronization
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch booked slots for the selected doctor, clinic, and date
  const fetchBookedSlots = useCallback(async () => {
    if (!walkInForm.doctor || !walkInForm.clinic || !walkInForm.date) {
      setBookedSlots([]);
      return;
    }
    
    setLoadingSlots(true);
    try {
      const response = await axios.get(`${API}/appointments/booked-slots`, {
        params: {
          doctor: walkInForm.doctor,
          clinic: walkInForm.clinic,
          date: walkInForm.date
        }
      });
      setBookedSlots(response.data.booked_slots || []);
    } catch (error) {
      console.error('Failed to fetch booked slots:', error);
      setBookedSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [walkInForm.doctor, walkInForm.clinic, walkInForm.date]);

  // Fetch booked slots when doctor, clinic, or date changes
  useEffect(() => {
    fetchBookedSlots();
  }, [fetchBookedSlots]);

  // Calculate available time slots based on doctor, clinic, and date
  // Filter out already booked slots for slot synchronization
  const availableTimeSlots = useMemo(() => {
    const allSlots = getAvailableTimeSlots(walkInForm.doctor, walkInForm.clinic, walkInForm.date);
    // Filter out slots that are already booked (from both patient and staff bookings)
    return allSlots.filter(slot => !bookedSlots.includes(slot));
  }, [walkInForm.doctor, walkInForm.clinic, walkInForm.date, bookedSlots]);

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
        
        // Load available tests for add-on services
        try {
          const testsRes = await axios.get(`${API}/staff/diagnostic-tests`, getAuthHeaders());
          setAvailableTests(testsRes.data.tests || {});
        } catch (err) {
          console.log('Could not load diagnostic tests');
        }
      }
      
      if (isDoctor(role)) {
        const res = await axios.get(`${API}/staff/doctor/appointments?date=${selectedDate}`, getAuthHeaders());
        setAppointments(res.data.appointments || []);
      }
      
      if (role === 'pharmacy_staff' || role === 'super_admin') {
        const res = await axios.get(`${API}/staff/pharmacy/orders?date=${pharmacyDate}`, getAuthHeaders());
        setPharmacyOrders(res.data.orders || []);
        setPharmacyDateCounts(res.data.date_counts || {});
      }
      
      if (role === 'diagnostics_staff' || role === 'super_admin') {
        const res = await axios.get(`${API}/staff/diagnostic/orders?date=${diagnosticDate}`, getAuthHeaders());
        setDiagnosticOrders(res.data.orders || []);
        setDiagnosticDateCounts(res.data.date_counts || {});
        
        // Also load service-linked orders
        const serviceRes = await axios.get(`${API}/staff/diagnostic/service-orders`, getAuthHeaders());
        setServiceOrders(serviceRes.data.orders || []);
        
        // Load available tests
        const testsRes = await axios.get(`${API}/staff/diagnostic-tests`, getAuthHeaders());
        setAvailableTests(testsRes.data.tests || {});
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
  }, [isAuthenticated, staffInfo, selectedDate, pharmacyDate, diagnosticDate]);

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
      // Refresh booked slots to keep in sync
      fetchBookedSlots();
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
    
    // Validate that specific tests are selected (except for ECG)
    if (selectedService !== 'ECG' && selectedSpecificTests.length === 0) {
      toast.error('Please select specific tests');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(
        `${API}/staff/appointments/${selectedAppointment.id}/services`,
        { 
          service_type: selectedService,
          specific_tests: selectedService === 'ECG' ? ['ECG (Electrocardiogram)'] : selectedSpecificTests
        },
        getAuthHeaders()
      );
      toast.success(`${selectedService.replace('_', ' ')} with ${selectedService === 'ECG' ? 1 : selectedSpecificTests.length} test(s) added`);
      setShowServiceModal(false);
      setSelectedAppointment(null);
      setSelectedService('');
      setSelectedTestCategory('');
      setSelectedSpecificTests([]);
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
  
  // Create diagnostic order (for diagnostics staff)
  const handleCreateDiagnosticOrder = async () => {
    if (!diagOrderForm.patient_name || !diagOrderForm.patient_phone || diagOrderForm.tests.length === 0) {
      toast.error('Please fill patient name, phone and select at least one test');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/staff/diagnostic/orders`, diagOrderForm, getAuthHeaders());
      toast.success('Diagnostic order created successfully');
      setDiagOrderForm({
        patient_name: '',
        patient_phone: '',
        patient_email: '',
        age: '',
        sex: '',
        tests: [],
        notes: ''
      });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create order');
    }
    setLoading(false);
  };
  
  // Toggle test selection
  const toggleTestSelection = (testName) => {
    setDiagOrderForm(prev => ({
      ...prev,
      tests: prev.tests.includes(testName) 
        ? prev.tests.filter(t => t !== testName)
        : [...prev.tests, testName]
    }));
  };
  
  // Get all tests as flat list
  const getAllTests = () => {
    const allTests = [];
    if (availableTests.imaging) {
      Object.values(availableTests.imaging).forEach(tests => allTests.push(...tests));
    }
    if (availableTests.pathology) {
      Object.values(availableTests.pathology).forEach(tests => allTests.push(...tests));
    }
    return allTests;
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

  // Toggle specific test selection
  const toggleSpecificTest = (test) => {
    setSelectedSpecificTests(prev => 
      prev.includes(test) 
        ? prev.filter(t => t !== test)
        : [...prev, test]
    );
  };

  // Service Modal Content with full test inventory
  const serviceModalContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Add Service for {selectedAppointment?.patient_name}</h3>
          <p className="text-sm text-gray-500">Select service type and specific tests</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {/* Service Type Selection */}
          <div className="space-y-3 mb-6">
            <p className="text-sm font-medium text-gray-600">Service Type:</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => { setSelectedService('BLOOD_TEST'); setSelectedTestCategory('blood'); setSelectedSpecificTests([]); }}
                className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                  selectedService === 'BLOOD_TEST' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <Droplet className="w-6 h-6 text-red-500" />
                <span className="text-sm font-medium">Blood Test</span>
              </button>
              
              <button
                onClick={() => { setSelectedService('SONOGRAPHY'); setSelectedTestCategory('sonography'); setSelectedSpecificTests([]); }}
                className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                  selectedService === 'SONOGRAPHY' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <Scan className="w-6 h-6 text-purple-500" />
                <span className="text-sm font-medium">Sonography</span>
              </button>
              
              <button
                onClick={() => { setSelectedService('ECG'); setSelectedTestCategory('ecg'); setSelectedSpecificTests(['ECG (Electrocardiogram)']); }}
                className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                  selectedService === 'ECG' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'
                }`}
              >
                <Heart className="w-6 h-6 text-pink-500" />
                <span className="text-sm font-medium">ECG</span>
              </button>
            </div>
          </div>
          
          {/* Specific Tests Selection */}
          {selectedService && selectedService !== 'ECG' && availableTests && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-600">
                Select Specific Tests ({selectedSpecificTests.length} selected):
              </p>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {selectedTestCategory === 'blood' && availableTests.pathology?.blood?.map((test, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                      selectedSpecificTests.includes(test) ? 'bg-red-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSpecificTests.includes(test)}
                      onChange={() => toggleSpecificTest(test)}
                      className="w-4 h-4 text-red-500 rounded"
                    />
                    <span className="flex-1 text-sm">{test}</span>
                  </label>
                ))}
                {selectedTestCategory === 'sonography' && availableTests.imaging?.sonography?.map((test, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                      selectedSpecificTests.includes(test) ? 'bg-purple-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSpecificTests.includes(test)}
                      onChange={() => toggleSpecificTest(test)}
                      className="w-4 h-4 text-purple-500 rounded"
                    />
                    <span className="flex-1 text-sm">{test}</span>
                  </label>
                ))}
              </div>
              {selectedSpecificTests.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">Selected Tests:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSpecificTests.map((test, idx) => (
                      <span key={idx} className="text-xs bg-white px-2 py-1 rounded border">{test}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {selectedService === 'ECG' && (
            <div className="bg-pink-50 rounded-lg p-4 text-center">
              <Heart className="w-8 h-8 text-pink-500 mx-auto mb-2" />
              <p className="font-medium">ECG (Electrocardiogram)</p>
              <p className="text-sm text-gray-500">Standard 12-lead ECG test</p>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t bg-gray-50 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => {
            setShowServiceModal(false);
            setSelectedAppointment(null);
            setSelectedService('');
            setSelectedTestCategory('');
            setSelectedSpecificTests([]);
          }}>
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-teal-500 hover:bg-teal-600" 
            onClick={handleAddService}
            disabled={!selectedService || (selectedService !== 'ECG' && selectedSpecificTests.length === 0) || loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Add Service {selectedSpecificTests.length > 0 && `(${selectedSpecificTests.length})`}
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
                    <Label>Time Slot * 
                      {loadingSlots ? (
                        <span className="text-gray-500 text-xs ml-1"><Loader2 className="w-3 h-3 animate-spin inline" /> Loading...</span>
                      ) : availableTimeSlots.length > 0 ? (
                        <span className="text-gray-500 text-xs ml-1">({availableTimeSlots.length} slots available{bookedSlots.length > 0 ? `, ${bookedSlots.length} booked` : ''})</span>
                      ) : null}
                    </Label>
                    <select
                      value={walkInForm.time}
                      onChange={(e) => setWalkInForm({ ...walkInForm, time: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                      data-testid="walkin-time"
                      disabled={!isDoctorAvailable || loadingSlots}
                    >
                      <option value="">{loadingSlots ? 'Loading slots...' : isDoctorAvailable ? 'Select time' : 'No slots available'}</option>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" />
                Pharmacy Orders
              </h2>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={pharmacyDate}
                  onChange={(e) => setPharmacyDate(e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-sm"
                />
                {pharmacyDateCounts[pharmacyDate] && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    {pharmacyDateCounts[pharmacyDate].total} orders
                    {pharmacyDateCounts[pharmacyDate].pending > 0 && (
                      <span className="ml-1 text-red-600">({pharmacyDateCounts[pharmacyDate].pending} pending)</span>
                    )}
                  </span>
                )}
              </div>
            </div>
            
            {/* Date Quick Navigation */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {[-2, -1, 0, 1, 2].map(offset => {
                const d = new Date();
                d.setDate(d.getDate() + offset);
                const dateStr = d.toISOString().split('T')[0];
                const counts = pharmacyDateCounts[dateStr];
                const isSelected = dateStr === pharmacyDate;
                return (
                  <button
                    key={offset}
                    onClick={() => setPharmacyDate(dateStr)}
                    className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap flex flex-col items-center min-w-[80px] ${
                      isSelected ? 'bg-orange-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <span className="font-medium">{offset === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="text-xs">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    {counts && (
                      <span className={`text-xs mt-1 ${isSelected ? 'text-orange-100' : 'text-gray-500'}`}>
                        {counts.total} {counts.pending > 0 && `(${counts.pending})`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="space-y-3">
              {pharmacyOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No orders for {pharmacyDate}</p>
              ) : (
                pharmacyOrders.map((order) => (
                  <div key={order.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium">{order.patient_name}</span>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        {order.bill_url && (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                            <Receipt className="w-3 h-3 inline mr-1" />
                            Bill Uploaded
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">{order.patient_phone}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      {order.medicines?.map(m => `${m.name} (${m.quantity})`).join(', ')}
                    </div>
                    
                    {/* Bill Upload Section - Required before Out for Delivery */}
                    {!order.bill_url && order.status !== 'Delivered' && (
                      <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm text-orange-800 mb-2 flex items-center gap-1">
                          <Upload className="w-4 h-4" />
                          <strong>Upload Bill/Receipt</strong> (Required before Out for Delivery)
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            
                            const formData = new FormData();
                            formData.append('file', file);
                            
                            try {
                              toast.loading('Uploading bill...');
                              const res = await axios.post(
                                `${API}/staff/pharmacy/orders/${order.id}/upload-bill`,
                                formData,
                                { 
                                  headers: { 
                                    'Authorization': `Bearer ${localStorage.getItem('staffToken')}`,
                                    'Content-Type': 'multipart/form-data'
                                  }
                                }
                              );
                              toast.dismiss();
                              toast.success('Bill uploaded successfully');
                              loadData();
                            } catch (error) {
                              toast.dismiss();
                              toast.error(error.response?.data?.detail || 'Upload failed');
                            }
                          }}
                          className="text-sm"
                          data-testid={`upload-bill-${order.id}`}
                        />
                      </div>
                    )}
                    
                    {order.bill_url && (
                      <div className="mb-3">
                        <a href={order.bill_url} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          View Bill/Receipt
                        </a>
                      </div>
                    )}
                    
                    <div className="flex gap-2 flex-wrap">
                      {['Order Booked', 'Packing', 'Out for Delivery', 'Delivered'].map(status => (
                        <Button
                          key={status}
                          size="sm"
                          variant={order.status === status ? 'default' : 'outline'}
                          onClick={() => handlePharmacyStatusUpdate(order.id, status)}
                          disabled={
                            order.status === status || 
                            (status === 'Out for Delivery' && !order.bill_url)
                          }
                          className={order.status === status ? 'bg-orange-500' : ''}
                          title={status === 'Out for Delivery' && !order.bill_url ? 'Upload bill first' : ''}
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
          <Tabs defaultValue="orders" className="space-y-4">
            <TabsList>
              <TabsTrigger value="orders" data-testid="tab-diag-orders">
                <FlaskConical className="w-4 h-4 mr-2" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="create" data-testid="tab-diag-create">
                <UserPlus className="w-4 h-4 mr-2" />
                Create Order
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="orders">
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
                              {order.report_url && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                                  <FileText className="w-3 h-3 inline mr-1" />
                                  Report Uploaded
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-gray-500">{order.patient_phone}</span>
                          </div>
                          <div className="text-sm text-gray-600 mb-3">
                            <strong>Service:</strong> {order.service_type?.replace('_', ' ')} | 
                            <strong> Clinic:</strong> {order.clinic || 'N/A'}
                          </div>
                          
                          {/* Report Upload Section - Required before Reports Generated */}
                      {!order.report_url && order.status !== 'Reports Generated' && (
                        <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <p className="text-sm text-purple-800 mb-2 flex items-center gap-1">
                            <Upload className="w-4 h-4" />
                            <strong>Upload Report</strong> (Required before Reports Generated)
                          </p>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              
                              const formData = new FormData();
                              formData.append('file', file);
                              
                              try {
                                toast.loading('Uploading report...');
                                await axios.post(
                                  `${API}/staff/diagnostic/orders/${order.id}/upload-report`,
                                  formData,
                                  { 
                                    headers: { 
                                      'Authorization': `Bearer ${localStorage.getItem('staffToken')}`,
                                      'Content-Type': 'multipart/form-data'
                                    }
                                  }
                                );
                                toast.dismiss();
                                toast.success('Report uploaded successfully');
                                loadData();
                              } catch (error) {
                                toast.dismiss();
                                toast.error(error.response?.data?.detail || 'Upload failed');
                              }
                            }}
                            className="text-sm"
                            data-testid={`upload-report-${order.id}`}
                          />
                        </div>
                      )}
                      
                      {order.report_url && (
                        <div className="mb-3">
                          <a href={order.report_url} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            View Report
                          </a>
                        </div>
                      )}
                      
                      <div className="flex gap-2 flex-wrap">
                        {['Test Booked', 'Sample Collected', 'In Process', 'Reports Generated'].map(status => (
                          <Button
                            key={status}
                            size="sm"
                            variant={order.status === status ? 'default' : 'outline'}
                            onClick={() => handleDiagnosticStatusUpdate(order.id, status)}
                            disabled={
                              order.status === status ||
                              (status === 'Reports Generated' && !order.report_url)
                            }
                            className={order.status === status ? 'bg-teal-500' : ''}
                            title={status === 'Reports Generated' && !order.report_url ? 'Upload report first' : ''}
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-purple-500" />
                  Diagnostic Orders
                </h2>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={diagnosticDate}
                    onChange={(e) => setDiagnosticDate(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm"
                  />
                  {diagnosticDateCounts[diagnosticDate] && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      {diagnosticDateCounts[diagnosticDate].total} orders
                      {diagnosticDateCounts[diagnosticDate].pending > 0 && (
                        <span className="ml-1 text-red-600">({diagnosticDateCounts[diagnosticDate].pending} pending)</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Date Quick Navigation */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {[-2, -1, 0, 1, 2].map(offset => {
                  const d = new Date();
                  d.setDate(d.getDate() + offset);
                  const dateStr = d.toISOString().split('T')[0];
                  const counts = diagnosticDateCounts[dateStr];
                  const isSelected = dateStr === diagnosticDate;
                  return (
                    <button
                      key={offset}
                      onClick={() => setDiagnosticDate(dateStr)}
                      className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap flex flex-col items-center min-w-[80px] ${
                        isSelected ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <span className="font-medium">{offset === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      <span className="text-xs">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      {counts && (
                        <span className={`text-xs mt-1 ${isSelected ? 'text-purple-100' : 'text-gray-500'}`}>
                          {counts.total} {counts.pending > 0 && `(${counts.pending})`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              
              <div className="space-y-3">
                {diagnosticOrders.filter(o => !o.linked_appointment_id).length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No orders for {diagnosticDate}</p>
                ) : (
                  diagnosticOrders.filter(o => !o.linked_appointment_id).map((order) => (
                    <div key={order.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium">{order.patient_name}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                          {order.report_url && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                              <FileText className="w-3 h-3 inline mr-1" />
                              Report Uploaded
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">{order.patient_phone}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        {order.tests?.slice(0, 3).join(', ')}{order.tests?.length > 3 ? '...' : ''}
                      </div>
                      
                      {/* Report Upload Section - Required before Reports Generated */}
                      {!order.report_url && order.status !== 'Reports Generated' && (
                        <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <p className="text-sm text-purple-800 mb-2 flex items-center gap-1">
                            <Upload className="w-4 h-4" />
                            <strong>Upload Report</strong> (Required before Reports Generated)
                          </p>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              
                              const formData = new FormData();
                              formData.append('file', file);
                              
                              try {
                                toast.loading('Uploading report...');
                                await axios.post(
                                  `${API}/staff/diagnostic/orders/${order.id}/upload-report`,
                                  formData,
                                  { 
                                    headers: { 
                                      'Authorization': `Bearer ${localStorage.getItem('staffToken')}`,
                                      'Content-Type': 'multipart/form-data'
                                    }
                                  }
                                );
                                toast.dismiss();
                                toast.success('Report uploaded successfully');
                                loadData();
                              } catch (error) {
                                toast.dismiss();
                                toast.error(error.response?.data?.detail || 'Upload failed');
                              }
                            }}
                            className="text-sm"
                            data-testid={`upload-report-${order.id}`}
                          />
                        </div>
                      )}
                      
                      {order.report_url && (
                        <div className="mb-3">
                          <a href={order.report_url} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            View Report
                          </a>
                        </div>
                      )}
                      
                      <div className="flex gap-2 flex-wrap">
                        {['Test Booked', 'Sample Collected', 'In Process', 'Reports Generated'].map(status => (
                          <Button
                            key={status}
                            size="sm"
                            variant={order.status === status ? 'default' : 'outline'}
                            onClick={() => handleDiagnosticStatusUpdate(order.id, status)}
                            disabled={
                              order.status === status ||
                              (status === 'Reports Generated' && !order.report_url)
                            }
                            className={order.status === status ? 'bg-purple-500' : ''}
                            title={status === 'Reports Generated' && !order.report_url ? 'Upload report first' : ''}
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
            </TabsContent>
            
            {/* Create Order Tab */}
            <TabsContent value="create">
              <Card className="p-6 max-w-2xl">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-purple-500" />
                  Create New Diagnostic Order
                </h2>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Patient Name *</Label>
                      <Input
                        value={diagOrderForm.patient_name}
                        onChange={(e) => setDiagOrderForm({ ...diagOrderForm, patient_name: e.target.value })}
                        placeholder="Enter patient name"
                        data-testid="diag-patient-name"
                      />
                    </div>
                    <div>
                      <Label>Phone Number *</Label>
                      <Input
                        value={diagOrderForm.patient_phone}
                        onChange={(e) => setDiagOrderForm({ ...diagOrderForm, patient_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="10-digit mobile number"
                        data-testid="diag-patient-phone"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Age</Label>
                      <Input
                        value={diagOrderForm.age}
                        onChange={(e) => setDiagOrderForm({ ...diagOrderForm, age: e.target.value })}
                        placeholder="e.g., 35"
                        data-testid="diag-age"
                      />
                    </div>
                    <div>
                      <Label>Sex</Label>
                      <select
                        value={diagOrderForm.sex}
                        onChange={(e) => setDiagOrderForm({ ...diagOrderForm, sex: e.target.value })}
                        className="w-full p-2 border rounded-lg"
                        data-testid="diag-sex"
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label>Email (Optional)</Label>
                      <Input
                        type="email"
                        value={diagOrderForm.patient_email}
                        onChange={(e) => setDiagOrderForm({ ...diagOrderForm, patient_email: e.target.value })}
                        placeholder="patient@email.com"
                        data-testid="diag-email"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Select Tests * <span className="text-gray-500 text-xs">({diagOrderForm.tests.length} selected)</span></Label>
                    <div className="mt-2 border rounded-lg p-4 max-h-96 overflow-y-auto">
                      {/* OBGYN & Pregnancy Tests - Highlighted */}
                      <div className="mb-4 p-3 bg-pink-50 rounded-lg border border-pink-200">
                        <h4 className="font-medium text-pink-700 mb-2">🤰 Pregnancy & OBGYN Tests</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {['Dual / Double Marker', 'Quadruple Marker', 'ANC (Ante Natal Profile)', 'Beta HCG', 
                            'AMH (Anti-Mullerian Hormone)', 'Hormonal Basic', 'Hormonal Advance'].map(test => (
                            <label key={test} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-pink-100 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={diagOrderForm.tests.includes(test)}
                                onChange={() => toggleTestSelection(test)}
                                className="rounded text-pink-600"
                              />
                              {test}
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      {/* Diabetes Tests - Highlighted */}
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-700 mb-2">🩺 Diabetes Tests</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {['Diabetes Basic', 'Diabetes Screening', 'Diabetes Advance', 'FBS (Fasting Blood Sugar)', 
                            'PPBS', 'RBS', 'HbA1c', 'OGTT - 3 Sample'].map(test => (
                            <label key={test} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-blue-100 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={diagOrderForm.tests.includes(test)}
                                onChange={() => toggleTestSelection(test)}
                                className="rounded text-blue-600"
                              />
                              {test}
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      {/* Imaging Tests */}
                      {availableTests.imaging && (
                        <div className="mb-4">
                          <h4 className="font-medium text-purple-700 mb-2">🩻 Imaging</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(availableTests.imaging).map(([category, tests]) => (
                              tests.map(test => (
                                <label key={test} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-purple-50 p-1 rounded">
                                  <input
                                    type="checkbox"
                                    checked={diagOrderForm.tests.includes(test)}
                                    onChange={() => toggleTestSelection(test)}
                                    className="rounded text-purple-600"
                                  />
                                  {test}
                                </label>
                              ))
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Other Pathology Tests */}
                      {availableTests.pathology && (
                        <div>
                          <h4 className="font-medium text-red-700 mb-2">🩸 Other Blood Tests</h4>
                          {Object.entries(availableTests.pathology).map(([category, tests]) => (
                            <div key={category} className="mb-3">
                              <p className="text-xs text-gray-500 uppercase mb-1">{category}</p>
                              <div className="grid grid-cols-2 gap-2">
                                {tests.filter(test => 
                                  !['Dual / Double Marker', 'Quadruple Marker', 'ANC (Ante Natal Profile)', 'Beta HCG',
                                    'AMH (Anti-Mullerian Hormone)', 'Hormonal Basic', 'Hormonal Advance',
                                    'Diabetes Basic', 'Diabetes Screening', 'Diabetes Advance', 'FBS (Fasting Blood Sugar)',
                                    'PPBS', 'RBS', 'HbA1c', 'OGTT - 3 Sample'].includes(test)
                                ).map(test => (
                                  <label key={test} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-red-50 p-1 rounded">
                                    <input
                                      type="checkbox"
                                      checked={diagOrderForm.tests.includes(test)}
                                      onChange={() => toggleTestSelection(test)}
                                      className="rounded text-red-600"
                                    />
                                    {test}
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {diagOrderForm.tests.length > 0 && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm font-medium text-purple-800 mb-1">Selected Tests:</p>
                      <p className="text-sm text-purple-700">{diagOrderForm.tests.join(', ')}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label>Notes (Optional)</Label>
                    <Input
                      value={diagOrderForm.notes}
                      onChange={(e) => setDiagOrderForm({ ...diagOrderForm, notes: e.target.value })}
                      placeholder="Any special instructions..."
                      data-testid="diag-notes"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleCreateDiagnosticOrder} 
                    disabled={loading || diagOrderForm.tests.length === 0}
                    className="w-full bg-purple-500 hover:bg-purple-600"
                    data-testid="diag-create-btn"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    Create Diagnostic Order
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default StaffPortal;
