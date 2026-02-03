import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, User, Lock, LogOut, Phone, Calendar, Clock, 
  Search, Plus, CheckCircle2, UserPlus, AlertTriangle,
  Building2, Stethoscope, Activity, IndianRupee, RefreshCw,
  ChevronRight, Loader2, Users, TrendingUp, X
} from 'lucide-react';
import { lightTap, mediumTap, heavyTap, successPattern, errorPattern, selectionTap } from '@/utils/haptics';

const API = process.env.REACT_APP_BACKEND_URL;

// Fresh color palette - Soft indigo with warm accents
const COLORS = {
  primary: '#4F46E5',      // Indigo
  primaryLight: '#EEF2FF', // Indigo 50
  secondary: '#F59E0B',    // Amber
  success: '#10B981',      // Emerald
  warning: '#F97316',      // Orange
  danger: '#EF4444',       // Red
  dark: '#1E293B',         // Slate 800
  muted: '#64748B',        // Slate 500
  light: '#F8FAFC',        // Slate 50
  border: '#E2E8F0',       // Slate 200
};

// Status colors
const STATUS_COLORS = {
  'Booked': 'bg-blue-100 text-blue-700 border-blue-200',
  'CheckedIn': 'bg-amber-100 text-amber-700 border-amber-200',
  'WithDoctor': 'bg-purple-100 text-purple-700 border-purple-200',
  'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Cancelled': 'bg-gray-100 text-gray-500 border-gray-200',
};

// Appointment type badges
const TYPE_BADGES = {
  'SCHEDULED': 'bg-indigo-100 text-indigo-700',
  'WALK_IN': 'bg-teal-100 text-teal-700',
  'EMERGENCY': 'bg-red-100 text-red-700',
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('staffToken');
  return { headers: { Authorization: `Bearer ${token}` } };
};

const getIndianDate = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ============ Main Component ============
const DiaGynStaffPortal = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Login form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Active view
  const [activeView, setActiveView] = useState('appointments'); // appointments, book, summary
  const [activeClinic, setActiveClinic] = useState('all');
  const [selectedDate, setSelectedDate] = useState(getIndianDate());
  
  // Data
  const [config, setConfig] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [dailySummary, setDailySummary] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  
  // Booking form
  const [bookingType, setBookingType] = useState('WALK_IN'); // WALK_IN, SCHEDULED, EMERGENCY
  const [bookingForm, setBookingForm] = useState({
    clinic: 'Pushpa Clinic',
    doctor: 'Dr. Vikas Jha',
    date: getIndianDate(),
    time: '',
    patient_name: '',
    patient_mobile: '',
    patient_id: null,
    notes: ''
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Patient lookup
  const [patientMobile, setPatientMobile] = useState('');
  const [foundPatient, setFoundPatient] = useState(null);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: '', mobile: '', age: '', gender: '' });
  
  // Completion modal
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState(null);
  const [completionForm, setCompletionForm] = useState({
    fee_code: '',
    scan_codes: [],
    notes: ''
  });

  // ============ Auth ============
  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const info = localStorage.getItem('staffInfo');
    if (token && info) {
      try {
        const parsed = JSON.parse(info);
        setStaffInfo(parsed);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('staffToken');
        localStorage.removeItem('staffInfo');
      }
    }
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      errorPattern();
      toast.error('Please enter username and password');
      return;
    }
    
    setLoading(true);
    mediumTap();
    try {
      const res = await axios.post(`${API}/api/staff/login`, { username, password });
      localStorage.setItem('staffToken', res.data.token);
      const staffData = {
        name: res.data.staff?.name || res.data.name,
        role: res.data.staff?.role || res.data.role,
        clinic: res.data.staff?.clinic,
        clinics: res.data.staff?.clinics || []
      };
      localStorage.setItem('staffInfo', JSON.stringify(staffData));
      setStaffInfo(staffData);
      setIsAuthenticated(true);
      successPattern();
      toast.success(`Welcome, ${staffData.name}!`);
    } catch (error) {
      errorPattern();
      toast.error(error.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    heavyTap();
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffInfo');
    setIsAuthenticated(false);
    setStaffInfo(null);
    toast.success('Logged out');
  };

  // ============ Data Loading ============
  const loadConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/diagyn-staff/config`, getAuthHeaders());
      setConfig(res.data);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await axios.get(`${API}/api/diagyn-staff/appointments/by-date`, {
        params: { date: selectedDate, clinic: activeClinic === 'all' ? undefined : activeClinic },
        ...getAuthHeaders()
      });
      setAppointments(res.data.appointments || []);
      setSummary(res.data.summary || {});
    } catch (error) {
      console.error('Failed to load appointments:', error);
      if (error.response?.status === 401) {
        handleLogout();
        toast.error('Session expired');
      }
    }
    setRefreshing(false);
  }, [selectedDate, activeClinic]);

  const loadSummaries = useCallback(async () => {
    try {
      const [daily, weekly] = await Promise.all([
        axios.get(`${API}/api/diagyn-staff/summary/daily`, {
          params: { date: selectedDate, clinic: activeClinic === 'all' ? undefined : activeClinic },
          ...getAuthHeaders()
        }),
        axios.get(`${API}/api/diagyn-staff/summary/weekly`, {
          params: { clinic: activeClinic === 'all' ? undefined : activeClinic },
          ...getAuthHeaders()
        })
      ]);
      setDailySummary(daily.data);
      setWeeklySummary(weekly.data);
    } catch (error) {
      console.error('Failed to load summaries:', error);
    }
  }, [selectedDate, activeClinic]);

  const loadAvailableSlots = useCallback(async () => {
    if (!bookingForm.clinic || !bookingForm.doctor || !bookingForm.date) return;
    
    setLoadingSlots(true);
    try {
      const res = await axios.get(`${API}/api/diagyn-staff/slots/available`, {
        params: {
          clinic: bookingForm.clinic,
          doctor: bookingForm.doctor,
          date: bookingForm.date
        },
        ...getAuthHeaders()
      });
      setAvailableSlots(res.data.available_slots || []);
    } catch (error) {
      console.error('Failed to load slots:', error);
    }
    setLoadingSlots(false);
  }, [bookingForm.clinic, bookingForm.doctor, bookingForm.date]);

  useEffect(() => {
    if (isAuthenticated) {
      loadConfig();
      loadAppointments();
    }
  }, [isAuthenticated, loadConfig, loadAppointments]);

  useEffect(() => {
    if (isAuthenticated && activeView === 'summary') {
      loadSummaries();
    }
  }, [isAuthenticated, activeView, loadSummaries]);

  useEffect(() => {
    if (isAuthenticated && activeView === 'book') {
      loadAvailableSlots();
    }
  }, [isAuthenticated, activeView, loadAvailableSlots]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      if (activeView === 'appointments') {
        loadAppointments();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeView, loadAppointments]);

  // ============ Patient Lookup ============
  const lookupPatient = async () => {
    if (!patientMobile || patientMobile.length < 10) {
      errorPattern();
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    
    setSearchingPatient(true);
    lightTap();
    try {
      const res = await axios.post(`${API}/api/diagyn-staff/patient/lookup`, 
        { mobile: patientMobile },
        getAuthHeaders()
      );
      
      if (res.data.found) {
        setFoundPatient(res.data.patient);
        setBookingForm(prev => ({
          ...prev,
          patient_name: res.data.patient.name,
          patient_mobile: patientMobile,
          patient_id: res.data.patient.id
        }));
        successPattern();
        toast.success(`Found: ${res.data.patient.name}`);
      } else {
        setFoundPatient(null);
        setBookingForm(prev => ({
          ...prev,
          patient_name: '',
          patient_mobile: patientMobile,
          patient_id: null
        }));
        toast.info('Patient not found. Please register.');
        setShowRegisterModal(true);
        setRegisterForm({ name: '', mobile: patientMobile, age: '', gender: '' });
      }
    } catch (error) {
      errorPattern();
      toast.error('Search failed');
    }
    setSearchingPatient(false);
  };

  const registerPatient = async () => {
    if (!registerForm.name || !registerForm.mobile) {
      errorPattern();
      toast.error('Name and mobile are required');
      return;
    }
    
    setLoading(true);
    mediumTap();
    try {
      const res = await axios.post(`${API}/api/diagyn-staff/patient/register`,
        registerForm,
        getAuthHeaders()
      );
      
      if (res.data.success) {
        successPattern();
        toast.success('Patient registered!');
        setShowRegisterModal(false);
        setFoundPatient({
          id: res.data.patient_id,
          name: registerForm.name,
          mobile: registerForm.mobile
        });
        setBookingForm(prev => ({
          ...prev,
          patient_name: registerForm.name,
          patient_mobile: registerForm.mobile,
          patient_id: res.data.patient_id
        }));
      }
    } catch (error) {
      errorPattern();
      toast.error('Registration failed');
    }
    setLoading(false);
  };

  // ============ Booking ============
  const handleBook = async () => {
    if (!bookingForm.patient_name || !bookingForm.patient_mobile) {
      errorPattern();
      toast.error('Patient name and mobile are required');
      return;
    }
    
    if (bookingType !== 'EMERGENCY' && !bookingForm.time) {
      errorPattern();
      toast.error('Please select a time slot');
      return;
    }
    
    setLoading(true);
    heavyTap();
    try {
      const res = await axios.post(`${API}/api/diagyn-staff/appointments/book`, {
        ...bookingForm,
        appointment_type: bookingType
      }, getAuthHeaders());
      
      if (res.data.success) {
        successPattern();
        toast.success(`Booking ID: ${res.data.booking_id}`);
        // Reset form
        setBookingForm({
          clinic: bookingForm.clinic,
          doctor: bookingForm.doctor,
          date: getIndianDate(),
          time: '',
          patient_name: '',
          patient_mobile: '',
          patient_id: null,
          notes: ''
        });
        setPatientMobile('');
        setFoundPatient(null);
        // Switch to appointments view
        setActiveView('appointments');
        loadAppointments();
      }
    } catch (error) {
      errorPattern();
      toast.error(error.response?.data?.detail || 'Booking failed');
    }
    setLoading(false);
  };

  // ============ Status Updates ============
  const updateStatus = async (appointmentId, newStatus) => {
    mediumTap();
    try {
      await axios.put(`${API}/api/diagyn-staff/appointments/${appointmentId}/status`,
        { status: newStatus },
        getAuthHeaders()
      );
      successPattern();
      toast.success(`Status: ${newStatus}`);
      loadAppointments();
    } catch (error) {
      errorPattern();
      toast.error('Update failed');
    }
  };

  const openCompletionModal = (appointment) => {
    setCompletingAppointment(appointment);
    setCompletionForm({ fee_code: '', scan_codes: [], notes: '' });
    setShowCompletionModal(true);
    mediumTap();
  };

  const completeWithFee = async () => {
    if (!completionForm.fee_code) {
      errorPattern();
      toast.error('Please select a fee code');
      return;
    }
    
    // Calculate total
    const doctor = completingAppointment?.doctor;
    const feeConfig = config?.fee_codes?.[doctor]?.[completionForm.fee_code];
    let total = feeConfig?.amount || 0;
    
    completionForm.scan_codes.forEach(code => {
      const scan = config?.scan_fees?.[code];
      if (scan) total += scan.amount;
    });
    
    setLoading(true);
    heavyTap();
    try {
      await axios.put(`${API}/api/diagyn-staff/appointments/${completingAppointment.id}/status`, {
        status: 'Completed',
        fee_code: completionForm.fee_code,
        scan_codes: completionForm.scan_codes,
        total_amount: total,
        notes: completionForm.notes
      }, getAuthHeaders());
      
      successPattern();
      toast.success(`Completed! ₹${total}`);
      setShowCompletionModal(false);
      loadAppointments();
    } catch (error) {
      errorPattern();
      toast.error('Failed to complete');
    }
    setLoading(false);
  };

  // ============ Login Screen ============
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" 
           style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
        <Card className="w-full max-w-md p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                 style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
              <Stethoscope className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">DiaGyn Staff Portal</h1>
            <p className="text-gray-500 mt-1">Mango Health Labs</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="pl-11 h-12 text-lg"
                  data-testid="login-username"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pl-11 h-12 text-lg"
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  data-testid="login-password"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-14 text-lg font-semibold"
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
              data-testid="login-button"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
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

  // ============ Main Portal ============
  return (
    <div className="min-h-screen" style={{ background: COLORS.light }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 shadow-sm" 
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">DiaGyn Staff</h1>
              <p className="text-white/70 text-xs">{staffInfo?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => { lightTap(); loadAppointments(); }}
              className="text-white hover:bg-white/20"
              disabled={refreshing}
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="text-white hover:bg-white/20"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Clinic Selector */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {['all', 'Pushpa Clinic', 'Amnion Clinic'].map(clinic => (
            <button
              key={clinic}
              onClick={() => { selectionTap(); setActiveClinic(clinic); }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeClinic === clinic 
                  ? 'bg-white text-indigo-600 shadow-md' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {clinic === 'all' ? 'All Clinics' : clinic}
            </button>
          ))}
        </div>
      </header>

      {/* Quick Stats Bar */}
      {summary && activeView === 'appointments' && (
        <div className="px-4 py-3 bg-white border-b flex gap-3 overflow-x-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-700">Booked: {summary.booked || 0}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <span className="text-sm font-medium text-amber-700">Waiting: {summary.checked_in || 0}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-full">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-sm font-medium text-purple-700">With Dr: {summary.with_doctor || 0}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-sm font-medium text-emerald-700">Done: {summary.completed || 0}</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="px-4 py-3 bg-white border-b">
        <div className="flex gap-2">
          {[
            { id: 'appointments', icon: Calendar, label: 'Appointments' },
            { id: 'book', icon: Plus, label: 'Book New' },
            { id: 'summary', icon: TrendingUp, label: 'Summary' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { selectionTap(); setActiveView(tab.id); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                activeView === tab.id 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="p-4 pb-24">
        {/* ============ APPOINTMENTS VIEW ============ */}
        {activeView === 'appointments' && (
          <div className="space-y-4">
            {/* Date Selector */}
            <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => { lightTap(); setSelectedDate(e.target.value); }}
                className="flex-1 text-lg font-medium bg-transparent outline-none"
              />
            </div>

            {/* Appointment List */}
            {appointments.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No appointments for this date</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map(apt => (
                  <AppointmentCard 
                    key={apt.id}
                    appointment={apt}
                    onCheckIn={() => updateStatus(apt.id, 'CheckedIn')}
                    onWithDoctor={() => updateStatus(apt.id, 'WithDoctor')}
                    onComplete={() => openCompletionModal(apt)}
                    config={config}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ BOOKING VIEW ============ */}
        {activeView === 'book' && (
          <div className="space-y-4">
            {/* Booking Type Selector */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <label className="text-sm font-semibold text-gray-700 mb-3 block">Appointment Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'WALK_IN', icon: Users, label: 'Walk-In', color: 'teal' },
                  { id: 'SCHEDULED', icon: Calendar, label: 'Scheduled', color: 'indigo' },
                  { id: 'EMERGENCY', icon: AlertTriangle, label: 'Emergency', color: 'red' },
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => { selectionTap(); setBookingType(type.id); }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      bookingType === type.id 
                        ? `border-${type.color}-500 bg-${type.color}-50` 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={bookingType === type.id ? {
                      borderColor: type.color === 'teal' ? '#14B8A6' : type.color === 'indigo' ? '#4F46E5' : '#EF4444',
                      background: type.color === 'teal' ? '#F0FDFA' : type.color === 'indigo' ? '#EEF2FF' : '#FEF2F2'
                    } : {}}
                  >
                    <type.icon className={`w-6 h-6 mx-auto mb-2`} 
                              style={{ color: type.color === 'teal' ? '#14B8A6' : type.color === 'indigo' ? '#4F46E5' : '#EF4444' }} />
                    <span className="text-sm font-medium block">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Patient Lookup */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <label className="text-sm font-semibold text-gray-700 mb-3 block">Patient Mobile Number</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <Input
                    value={patientMobile}
                    onChange={(e) => setPatientMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit mobile"
                    className="pl-11 h-12 text-lg"
                    maxLength={10}
                  />
                </div>
                <Button 
                  onClick={lookupPatient}
                  disabled={searchingPatient || patientMobile.length < 10}
                  className="h-12 px-6"
                  style={{ background: COLORS.primary }}
                >
                  {searchingPatient ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </Button>
              </div>
              
              {/* Found Patient Card */}
              {foundPatient && (
                <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-emerald-800">{foundPatient.name}</p>
                      <p className="text-sm text-emerald-600">
                        ID: {foundPatient.id} • Visits: {foundPatient.visit_count || 0}
                      </p>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                </div>
              )}
            </div>

            {/* Patient Details */}
            <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Patient Name *</label>
                <Input
                  value={bookingForm.patient_name}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, patient_name: e.target.value }))}
                  placeholder="Enter patient name"
                  className="h-12 text-lg"
                />
              </div>
            </div>

            {/* Clinic & Doctor Selection */}
            <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Select Clinic</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(config?.clinics || {}).map(clinic => (
                    <button
                      key={clinic}
                      onClick={() => {
                        selectionTap();
                        const doctors = config.clinics[clinic].doctors;
                        setBookingForm(prev => ({
                          ...prev,
                          clinic,
                          doctor: doctors[0] || ''
                        }));
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        bookingForm.clinic === clinic 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Building2 className="w-5 h-5 text-indigo-600 mb-2" />
                      <p className="font-semibold">{clinic}</p>
                      <p className="text-sm text-gray-500">{config.clinics[clinic].doctors.join(', ')}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Date & Time Selection */}
            {bookingType !== 'EMERGENCY' && (
              <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Date</label>
                  <input
                    type="date"
                    value={bookingForm.date}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, date: e.target.value, time: '' }))}
                    min={getIndianDate()}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 text-lg"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Select Time Slot {loadingSlots && <Loader2 className="w-4 h-4 animate-spin inline ml-2" />}
                  </label>
                  <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                    {availableSlots.map(slot => (
                      <button
                        key={slot.value}
                        onClick={() => { lightTap(); setBookingForm(prev => ({ ...prev, time: slot.value })); }}
                        className={`py-3 px-2 rounded-lg text-sm font-medium transition-all ${
                          bookingForm.time === slot.value
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                  </div>
                  {availableSlots.length === 0 && !loadingSlots && (
                    <p className="text-center text-gray-500 py-4">No slots available</p>
                  )}
                </div>
              </div>
            )}

            {/* Book Button */}
            <Button
              onClick={handleBook}
              disabled={loading || !bookingForm.patient_name || !bookingForm.patient_mobile || (bookingType !== 'EMERGENCY' && !bookingForm.time)}
              className="w-full h-16 text-lg font-bold rounded-xl shadow-lg"
              style={{ background: bookingType === 'EMERGENCY' ? '#EF4444' : 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Plus className="w-6 h-6 mr-2" />}
              {bookingType === 'EMERGENCY' ? 'Book Emergency' : bookingType === 'WALK_IN' ? 'Book Walk-In' : 'Book Appointment'}
            </Button>
          </div>
        )}

        {/* ============ SUMMARY VIEW ============ */}
        {activeView === 'summary' && (
          <div className="space-y-4">
            {/* Today's Summary */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
              <h3 className="text-lg font-semibold mb-4 opacity-90">Today's Collection</h3>
              <div className="text-4xl font-bold mb-2">
                ₹{(dailySummary?.total_collection || 0).toLocaleString('en-IN')}
              </div>
              <p className="opacity-80">{dailySummary?.total_patients || 0} patients completed</p>
            </div>

            {/* Weekly Summary */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">This Week</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4">
                  <IndianRupee className="w-6 h-6 text-emerald-600 mb-2" />
                  <p className="text-2xl font-bold text-emerald-700">
                    ₹{(weeklySummary?.total_collection || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-sm text-emerald-600">Total Collection</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <Users className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-700">{weeklySummary?.total_patients || 0}</p>
                  <p className="text-sm text-blue-600">Patients</p>
                </div>
              </div>
              
              {/* Daily Breakdown */}
              {weeklySummary?.by_date && (
                <div className="mt-4 space-y-2">
                  {Object.entries(weeklySummary.by_date).slice(0, 7).map(([date, data]) => (
                    <div key={date} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{formatDate(date)}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">{data.count} patients</span>
                        <span className="font-semibold text-emerald-600">₹{data.amount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Register Patient Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Register New Patient</h3>
              <button onClick={() => setShowRegisterModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Name *</label>
                <Input
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Patient name"
                  className="h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Mobile *</label>
                <Input
                  value={registerForm.mobile}
                  disabled
                  className="h-12 bg-gray-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Age</label>
                  <Input
                    type="number"
                    value={registerForm.age}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, age: e.target.value }))}
                    placeholder="Age"
                    className="h-12"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Gender</label>
                  <select
                    value={registerForm.gender}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full h-12 px-3 rounded-lg border border-gray-200"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <Button
                onClick={registerPatient}
                disabled={loading || !registerForm.name}
                className="w-full h-12"
                style={{ background: COLORS.primary }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
                Register Patient
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && completingAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-lg">
              <h3 className="text-lg font-semibold text-white">Complete Appointment</h3>
              <p className="text-sm text-emerald-100">{completingAppointment.patient_name} • {completingAppointment.booking_id}</p>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {/* Fee Code Selection */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-3 block">Select Fee Code *</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(config?.fee_codes?.[completingAppointment.doctor] || {}).map(([code, info]) => (
                    <button
                      key={code}
                      onClick={() => { lightTap(); setCompletionForm(prev => ({ ...prev, fee_code: code })); }}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        completionForm.fee_code === code 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-emerald-700">{code}</span>
                        <span className="font-bold text-emerald-600">₹{info.amount}</span>
                      </div>
                      <p className="text-xs text-gray-600">{info.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scan Codes (for Dr. Neha) */}
              {completingAppointment.doctor?.includes('Neha') && config?.scan_fees && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-3 block">Additional Scans</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(config.scan_fees).map(([code, info]) => (
                      <button
                        key={code}
                        onClick={() => {
                          lightTap();
                          setCompletionForm(prev => ({
                            ...prev,
                            scan_codes: prev.scan_codes.includes(code)
                              ? prev.scan_codes.filter(c => c !== code)
                              : [...prev.scan_codes, code]
                          }));
                        }}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          completionForm.scan_codes.includes(code)
                            ? 'border-cyan-500 bg-cyan-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-cyan-700">{code}</span>
                          <span className="font-bold text-cyan-600">₹{info.amount}</span>
                        </div>
                        <p className="text-xs text-gray-600">{info.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Display */}
              {completionForm.fee_code && (
                <div className="bg-emerald-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-emerald-800">Total Amount</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      ₹{(() => {
                        const feeConfig = config?.fee_codes?.[completingAppointment.doctor]?.[completionForm.fee_code];
                        let total = feeConfig?.amount || 0;
                        completionForm.scan_codes.forEach(code => {
                          const scan = config?.scan_fees?.[code];
                          if (scan) total += scan.amount;
                        });
                        return total.toLocaleString('en-IN');
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 h-12"
                onClick={() => setShowCompletionModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={completeWithFee}
                disabled={loading || !completionForm.fee_code}
                className="flex-1 h-12"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)' }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                Complete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// ============ Appointment Card Component ============
const AppointmentCard = ({ appointment, onCheckIn, onWithDoctor, onComplete, config }) => {
  const apt = appointment;
  
  const getNextAction = () => {
    switch (apt.status) {
      case 'Booked':
        return { label: 'CHECK IN', action: onCheckIn, color: '#F59E0B', icon: '→' };
      case 'CheckedIn':
        return { label: 'SEND TO DR', action: onWithDoctor, color: '#8B5CF6', icon: '→' };
      case 'WithDoctor':
        return { label: 'COMPLETE', action: onComplete, color: '#10B981', icon: '✓' };
      default:
        return null;
    }
  };
  
  const nextAction = getNextAction();
  
  // Get status display text and color for large status indicator
  const getStatusDisplay = () => {
    switch (apt.status) {
      case 'Booked':
        return { text: 'BOOKED', bg: 'bg-blue-500', textColor: 'text-white' };
      case 'CheckedIn':
        return { text: 'WAITING', bg: 'bg-amber-500', textColor: 'text-white' };
      case 'WithDoctor':
        return { text: 'WITH DR', bg: 'bg-purple-500', textColor: 'text-white' };
      case 'Completed':
        return { text: 'DONE', bg: 'bg-emerald-500', textColor: 'text-white' };
      default:
        return { text: apt.status, bg: 'bg-gray-400', textColor: 'text-white' };
    }
  };
  
  const statusDisplay = getStatusDisplay();
  
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden border-l-[6px]"
         style={{ borderLeftColor: apt.status === 'Completed' ? '#10B981' : apt.status === 'WithDoctor' ? '#8B5CF6' : apt.status === 'CheckedIn' ? '#F59E0B' : '#4F46E5' }}>
      
      {/* Top Section - Patient Info */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center shadow-inner">
              <User className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <h4 className="font-bold text-xl text-gray-900">{apt.patient_name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-mono font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg">{apt.booking_id}</span>
                {apt.patient_id && (
                  <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded">{apt.patient_id}</span>
                )}
              </div>
            </div>
          </div>
          <div className={`${statusDisplay.bg} ${statusDisplay.textColor} px-4 py-2 rounded-xl font-bold text-sm shadow-md`}>
            {statusDisplay.text}
          </div>
        </div>
      </div>
      
      {/* Info Row - Clear and Large */}
      <div className="px-4 py-2 bg-gray-50 flex items-center gap-6 text-base">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" />
          <span className="font-semibold">{apt.time || 'No time'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-purple-500" />
          <span className="font-medium text-gray-700">{apt.doctor?.replace('Dr. ', '')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-teal-500" />
          <span className="font-medium text-gray-700">{apt.clinic?.replace(' Clinic', '')}</span>
        </div>
      </div>
      
      {/* Type Badge + Fee Display */}
      <div className="px-4 py-2 flex items-center justify-between bg-gray-50 border-t border-gray-100">
        <Badge className={`${TYPE_BADGES[apt.appointment_type] || 'bg-gray-100'} text-sm px-3 py-1`}>
          {apt.appointment_type === 'WALK_IN' ? '🚶 Walk-In' : apt.appointment_type === 'EMERGENCY' ? '🚨 Emergency' : '📅 Scheduled'}
        </Badge>
        {apt.total_amount > 0 && (
          <span className="font-bold text-lg text-emerald-600">₹{apt.total_amount}</span>
        )}
      </div>
      
      {/* Large Action Button - Easy to Tap */}
      {nextAction && (
        <button
          onClick={() => { heavyTap(); nextAction.action(); }}
          className="w-full py-5 px-6 text-white font-bold text-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          style={{ background: nextAction.color }}
        >
          {nextAction.label}
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default DiaGynStaffPortal;
