import React, { useState, useEffect, useCallback } from 'react';
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
  Building2, Stethoscope, IndianRupee, RefreshCw,
  ChevronRight, Loader2, Users, TrendingUp, X
} from 'lucide-react';
import { lightTap, mediumTap, heavyTap, successPattern, errorPattern, selectionTap } from '@/utils/haptics';

const API = process.env.REACT_APP_BACKEND_URL;

// Fresh Healthcare Color Palette - Teal & Lime Green
const COLORS = {
  primary: '#1a4d3f',      // Deep Teal
  primaryDark: '#0f3129',  // Darker Teal
  primaryLight: '#e0f2ed', // Light Teal
  accent: '#7ed957',       // Vibrant Lime Green
  accentDark: '#5cb840',   // Darker Lime
  accentLight: '#e8f9e0',  // Light Lime
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
  dark: '#1e293b',
  muted: '#64748b',
  light: '#f8fafc',
  white: '#ffffff',
};

// Status colors - compact badges
const STATUS_STYLES = {
  'Booked': { bg: '#dbeafe', text: '#1d4ed8', label: 'BOOKED' },
  'CheckedIn': { bg: '#fef3c7', text: '#d97706', label: 'WAITING' },
  'WithDoctor': { bg: '#e9d5ff', text: '#7c3aed', label: 'WITH DR' },
  'Completed': { bg: '#dcfce7', text: '#16a34a', label: 'DONE' },
  'Cancelled': { bg: '#f3f4f6', text: '#6b7280', label: 'CANCEL' },
};

// Type badges
const TYPE_STYLES = {
  'SCHEDULED': { bg: '#dcfce7', text: '#166534' },
  'WALK_IN': { bg: '#dbeafe', text: '#1d4ed8' },
  'EMERGENCY': { bg: '#fee2e2', text: '#dc2626' },
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

const getDayName = (dateStr) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date(dateStr).getDay()];
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
  const [activeView, setActiveView] = useState('appointments');
  const [activeClinic, setActiveClinic] = useState('all');
  const [selectedDate, setSelectedDate] = useState(getIndianDate());
  
  // Data
  const [config, setConfig] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [dailySummary, setDailySummary] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  
  // Booking form
  const [bookingType, setBookingType] = useState('WALK_IN');
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
        setStaffInfo(JSON.parse(info));
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
      toast.error('Enter username & password');
      return;
    }
    setLoading(true);
    heavyTap();
    try {
      const res = await axios.post(`${API}/api/staff/login`, { username, password });
      localStorage.setItem('staffToken', res.data.token);
      const staffData = {
        name: res.data.staff?.name || res.data.name,
        role: res.data.staff?.role || res.data.role,
      };
      localStorage.setItem('staffInfo', JSON.stringify(staffData));
      setStaffInfo(staffData);
      setIsAuthenticated(true);
      successPattern();
      toast.success(`Welcome!`);
    } catch (error) {
      errorPattern();
      toast.error('Login failed');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    heavyTap();
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffInfo');
    setIsAuthenticated(false);
    toast.success('Logged out');
  };

  // ============ Data Loading ============
  const loadConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/diagyn-staff/config`, getAuthHeaders());
      setConfig(res.data);
    } catch (error) {
      console.error('Config error:', error);
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
      console.error('Summary error:', error);
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
      console.error('Slots error:', error);
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
    if (isAuthenticated && activeView === 'summary') loadSummaries();
  }, [isAuthenticated, activeView, loadSummaries]);

  useEffect(() => {
    if (isAuthenticated && activeView === 'book') loadAvailableSlots();
  }, [isAuthenticated, activeView, loadAvailableSlots]);

  // Auto-refresh every 8 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      if (activeView === 'appointments') loadAppointments();
    }, 8000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeView, loadAppointments]);

  // ============ Patient Lookup ============
  const lookupPatient = async () => {
    if (!patientMobile || patientMobile.length < 10) {
      errorPattern();
      toast.error('Enter 10-digit mobile');
      return;
    }
    setSearchingPatient(true);
    mediumTap();
    try {
      const res = await axios.post(`${API}/api/diagyn-staff/patient/lookup`, 
        { mobile: patientMobile }, getAuthHeaders());
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
        setBookingForm(prev => ({ ...prev, patient_name: '', patient_mobile: patientMobile, patient_id: null }));
        toast.info('Not found. Register new patient.');
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
      toast.error('Name & mobile required');
      return;
    }
    setLoading(true);
    heavyTap();
    try {
      const res = await axios.post(`${API}/api/diagyn-staff/patient/register`, registerForm, getAuthHeaders());
      if (res.data.success) {
        successPattern();
        toast.success('Registered!');
        setShowRegisterModal(false);
        setFoundPatient({ id: res.data.patient_id, name: registerForm.name, mobile: registerForm.mobile });
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
      toast.error('Patient name & mobile required');
      return;
    }
    if (bookingType !== 'EMERGENCY' && !bookingForm.time) {
      errorPattern();
      toast.error('Select time slot');
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
        toast.success(`Booked: ${res.data.booking_id}`);
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
    heavyTap();
    try {
      await axios.put(`${API}/api/diagyn-staff/appointments/${appointmentId}/status`,
        { status: newStatus }, getAuthHeaders());
      successPattern();
      toast.success(newStatus);
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
      toast.error('Select fee code');
      return;
    }
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
      toast.success(`Done! ₹${total}`);
      setShowCompletionModal(false);
      loadAppointments();
    } catch (error) {
      errorPattern();
      toast.error('Failed');
    }
    setLoading(false);
  };

  // ============ Login Screen ============
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" 
           style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)` }}>
        <Card className="w-full max-w-sm p-6 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                 style={{ background: COLORS.primary }}>
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>DiaGyn Staff</h1>
            <p className="text-sm text-gray-500">Mango Health Labs</p>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="Username" className="pl-10 h-11" data-testid="login-username" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" className="pl-10 h-11" data-testid="login-password"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()} />
            </div>
            <Button onClick={handleLogin} disabled={loading}
              className="w-full h-12 text-base font-bold" data-testid="login-button"
              style={{ background: COLORS.accent }}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'LOGIN'}
            </Button>
          </div>
          <Button variant="ghost" onClick={() => navigate('/')} className="w-full mt-4 text-gray-500">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </Card>
      </div>
    );
  }

  // ============ Main Portal ============
  return (
    <div className="min-h-screen" style={{ background: '#f1f5f9' }}>
      {/* Header - Compact */}
      <header className="sticky top-0 z-50 px-3 py-2" style={{ background: COLORS.primary }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-white" />
            <div>
              <h1 className="text-white font-bold text-base">DiaGyn Staff</h1>
              <p className="text-white/70 text-xs">{staffInfo?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => { lightTap(); loadAppointments(); }}
              className="text-white hover:bg-white/20 h-8 w-8 p-0" disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}
              className="text-white hover:bg-white/20 h-8 w-8 p-0">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Clinic Filter - Full Width Toggles */}
        <div className="grid grid-cols-3 gap-1.5 mt-3 pb-1">
          {['all', 'Pushpa Clinic', 'Amnion Clinic'].map(clinic => (
            <button key={clinic} onClick={() => { selectionTap(); setActiveClinic(clinic); }}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeClinic === clinic ? 'bg-white shadow-md' : 'bg-white/20 text-white'
              }`}
              style={activeClinic === clinic ? { color: COLORS.primary } : {}}>
              {clinic === 'all' ? 'All' : clinic.replace(' Clinic', '')}
            </button>
          ))}
        </div>
      </header>

      {/* Stats Bar - Compact */}
      {summary && activeView === 'appointments' && (
        <div className="px-3 py-2 bg-white border-b flex gap-2 overflow-x-auto">
          {[
            { label: 'Booked', count: summary.booked || 0, color: '#3b82f6' },
            { label: 'Wait', count: summary.checked_in || 0, color: '#f59e0b' },
            { label: 'Dr', count: summary.with_doctor || 0, color: '#8b5cf6' },
            { label: 'Done', count: summary.completed || 0, color: '#16a34a' },
          ].map(stat => (
            <div key={stat.label} className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                 style={{ background: `${stat.color}15` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: stat.color }}></div>
              <span className="text-xs font-medium" style={{ color: stat.color }}>{stat.label}: {stat.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Tabs - Compact */}
      <div className="px-3 py-2 bg-white border-b">
        <div className="flex gap-1.5">
          {[
            { id: 'appointments', icon: Calendar, label: 'Today' },
            { id: 'book', icon: Plus, label: 'Book' },
            { id: 'summary', icon: TrendingUp, label: 'Summary' },
          ].map(tab => (
            <button key={tab.id} onClick={() => { selectionTap(); setActiveView(tab.id); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-medium transition-all ${
                activeView === tab.id ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600'
              }`}
              style={activeView === tab.id ? { background: COLORS.accent } : {}}>
              <tab.icon className="w-4 h-4" />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="p-3 pb-20">
        {/* ============ APPOINTMENTS VIEW ============ */}
        {activeView === 'appointments' && (
          <div className="space-y-2">
            {/* Date Selector - Compact */}
            <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
              <Calendar className="w-4 h-4" style={{ color: COLORS.primary }} />
              <input type="date" value={selectedDate}
                onChange={(e) => { lightTap(); setSelectedDate(e.target.value); }}
                className="flex-1 text-sm font-medium bg-transparent outline-none" />
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: COLORS.primaryLight, color: COLORS.primary }}>
                {getDayName(selectedDate)}
              </span>
            </div>

            {/* Appointment List */}
            {appointments.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-lg">
                <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No appointments</p>
              </div>
            ) : (
              <div className="space-y-2">
                {appointments.map(apt => (
                  <AppointmentCard key={apt.id} appointment={apt} config={config}
                    onCheckIn={() => updateStatus(apt.id, 'CheckedIn')}
                    onWithDoctor={() => updateStatus(apt.id, 'WithDoctor')}
                    onComplete={() => openCompletionModal(apt)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ BOOKING VIEW ============ */}
        {activeView === 'book' && (
          <div className="space-y-3">
            {/* Booking Type - Compact */}
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <label className="text-xs font-bold text-gray-600 mb-2 block">TYPE</label>
              <div className="flex gap-2">
                {[
                  { id: 'WALK_IN', label: 'Walk-In', color: '#3b82f6' },
                  { id: 'SCHEDULED', label: 'Schedule', color: COLORS.primary },
                  { id: 'EMERGENCY', label: 'Emergency', color: '#dc2626' },
                ].map(type => (
                  <button key={type.id} onClick={() => { mediumTap(); setBookingType(type.id); }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                      bookingType === type.id ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600'
                    }`}
                    style={bookingType === type.id ? { background: type.color } : {}}>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Patient Mobile - Compact */}
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <label className="text-xs font-bold text-gray-600 mb-2 block">MOBILE</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <Input value={patientMobile} maxLength={10}
                    onChange={(e) => setPatientMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile" className="pl-9 h-10 text-base" />
                </div>
                <Button onClick={lookupPatient} disabled={searchingPatient || patientMobile.length < 10}
                  className="h-10 px-4" style={{ background: COLORS.accent }}>
                  {searchingPatient ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {/* Found Patient */}
              {foundPatient && (
                <div className="mt-2 p-2 rounded-lg flex items-center gap-2"
                     style={{ background: COLORS.primaryLight }}>
                  <CheckCircle2 className="w-5 h-5" style={{ color: COLORS.primary }} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: COLORS.primary }}>{foundPatient.name}</p>
                    <p className="text-xs text-gray-600">{foundPatient.id} • {foundPatient.visit_count || 0} visits</p>
                  </div>
                </div>
              )}
            </div>

            {/* Patient Name */}
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <label className="text-xs font-bold text-gray-600 mb-2 block">PATIENT NAME</label>
              <Input value={bookingForm.patient_name}
                onChange={(e) => setBookingForm(prev => ({ ...prev, patient_name: e.target.value }))}
                placeholder="Enter name" className="h-10" />
            </div>

            {/* Clinic Selection - Compact */}
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <label className="text-xs font-bold text-gray-600 mb-2 block">CLINIC</label>
              <div className="flex gap-2">
                {Object.keys(config?.clinics || {}).map(clinic => (
                  <button key={clinic}
                    onClick={() => {
                      mediumTap();
                      const doctors = config.clinics[clinic].doctors;
                      setBookingForm(prev => ({ ...prev, clinic, doctor: doctors[0] || '' }));
                    }}
                    className={`flex-1 py-3 px-3 rounded-lg text-left transition-all border-2 ${
                      bookingForm.clinic === clinic ? 'shadow-md' : 'border-gray-200'
                    }`}
                    style={bookingForm.clinic === clinic ? { 
                      borderColor: COLORS.primary, background: COLORS.primaryLight 
                    } : {}}>
                    <Building2 className="w-5 h-5 mb-1" style={{ color: COLORS.primary }} />
                    <p className="font-bold text-sm">{clinic.replace(' Clinic', '')}</p>
                    <p className="text-xs text-gray-500">{config?.clinics[clinic]?.doctors?.join(', ')}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slots - Compact Grid */}
            {bookingType !== 'EMERGENCY' && (
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-600">TIME SLOT</label>
                  {loadingSlots && <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.accent }} />}
                </div>
                <input type="date" value={bookingForm.date} min={getIndianDate()}
                  onChange={(e) => { lightTap(); setBookingForm(prev => ({ ...prev, date: e.target.value, time: '' })); }}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm mb-2" />
                <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
                  {availableSlots.map(slot => (
                    <button key={slot.value}
                      onClick={() => { lightTap(); setBookingForm(prev => ({ ...prev, time: slot.value })); }}
                      className={`py-2 rounded-lg text-xs font-medium transition-all ${
                        bookingForm.time === slot.value ? 'text-white shadow' : 'bg-gray-100 text-gray-700'
                      }`}
                      style={bookingForm.time === slot.value ? { background: COLORS.accent } : {}}>
                      {slot.display}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Book Button - Orange */}
            <Button onClick={handleBook}
              disabled={loading || !bookingForm.patient_name || !bookingForm.patient_mobile || (bookingType !== 'EMERGENCY' && !bookingForm.time)}
              className="w-full h-14 text-lg font-bold rounded-xl shadow-lg"
              style={{ background: bookingType === 'EMERGENCY' ? '#dc2626' : COLORS.accent }}>
              {loading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Plus className="w-6 h-6 mr-2" />}
              {bookingType === 'EMERGENCY' ? 'BOOK EMERGENCY' : bookingType === 'WALK_IN' ? 'BOOK WALK-IN' : 'BOOK'}
            </Button>
          </div>
        )}

        {/* ============ SUMMARY VIEW ============ */}
        {activeView === 'summary' && (
          <div className="space-y-3">
            {/* Today's Collection */}
            <div className="rounded-xl p-4 text-white shadow-lg" style={{ background: COLORS.primary }}>
              <h3 className="text-sm font-medium opacity-80">Today's Collection</h3>
              <div className="text-3xl font-bold mt-1">₹{(dailySummary?.total_collection || 0).toLocaleString('en-IN')}</div>
              <p className="text-sm opacity-70 mt-1">{dailySummary?.total_patients || 0} patients</p>
            </div>

            {/* Weekly Summary */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-3">This Week</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ background: COLORS.primaryLight }}>
                  <IndianRupee className="w-5 h-5 mb-1" style={{ color: COLORS.primary }} />
                  <p className="text-xl font-bold" style={{ color: COLORS.primary }}>
                    ₹{(weeklySummary?.total_collection || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-600">Collection</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: COLORS.accentLight }}>
                  <Users className="w-5 h-5 mb-1" style={{ color: COLORS.accent }} />
                  <p className="text-xl font-bold" style={{ color: COLORS.accent }}>{weeklySummary?.total_patients || 0}</p>
                  <p className="text-xs text-gray-600">Patients</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Register Patient Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Register Patient</h3>
              <button onClick={() => setShowRegisterModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <Input value={registerForm.name} onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Patient name" className="h-10" />
              <Input value={registerForm.mobile} disabled className="h-10 bg-gray-50" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={registerForm.age}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, age: e.target.value }))}
                  placeholder="Age" className="h-10" />
                <select value={registerForm.gender}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, gender: e.target.value }))}
                  className="h-10 px-3 rounded-lg border border-gray-200 text-sm">
                  <option value="">Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <Button onClick={registerPatient} disabled={loading || !registerForm.name}
                className="w-full h-10" style={{ background: COLORS.accent }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Register
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && completingAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-3 border-b" style={{ background: COLORS.primary }}>
              <h3 className="font-bold text-white">Complete</h3>
              <p className="text-xs text-white/80">{completingAppointment.patient_name} • {completingAppointment.booking_id}</p>
            </div>
            <div className="p-3 overflow-y-auto flex-1 space-y-3">
              {/* Fee Codes */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-2 block">FEE CODE</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(config?.fee_codes?.[completingAppointment.doctor] || {}).map(([code, info]) => (
                    <button key={code}
                      onClick={() => { lightTap(); setCompletionForm(prev => ({ ...prev, fee_code: code })); }}
                      className={`p-2 rounded-lg border-2 text-left transition-all ${
                        completionForm.fee_code === code ? '' : 'border-gray-200'
                      }`}
                      style={completionForm.fee_code === code ? { borderColor: COLORS.primary, background: COLORS.primaryLight } : {}}>
                      <div className="flex justify-between">
                        <span className="font-bold text-sm" style={{ color: COLORS.primary }}>{code}</span>
                        <span className="font-bold text-sm" style={{ color: COLORS.accent }}>₹{info.amount}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{info.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              {/* Scans for Amnion */}
              {completingAppointment.doctor?.includes('Neha') && config?.scan_fees && (
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block">SCANS</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {Object.entries(config.scan_fees).map(([code, info]) => (
                      <button key={code}
                        onClick={() => {
                          lightTap();
                          setCompletionForm(prev => ({
                            ...prev,
                            scan_codes: prev.scan_codes.includes(code)
                              ? prev.scan_codes.filter(c => c !== code)
                              : [...prev.scan_codes, code]
                          }));
                        }}
                        className={`p-2 rounded-lg border-2 text-center transition-all ${
                          completionForm.scan_codes.includes(code) ? '' : 'border-gray-200'
                        }`}
                        style={completionForm.scan_codes.includes(code) ? { borderColor: COLORS.accent, background: COLORS.accentLight } : {}}>
                        <span className="font-bold text-xs" style={{ color: COLORS.accent }}>{code}</span>
                        <p className="text-xs text-gray-600">₹{info.amount}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Total */}
              {completionForm.fee_code && (
                <div className="p-3 rounded-lg" style={{ background: COLORS.primaryLight }}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold" style={{ color: COLORS.primary }}>Total</span>
                    <span className="text-2xl font-bold" style={{ color: COLORS.accent }}>
                      ₹{(() => {
                        let total = config?.fee_codes?.[completingAppointment.doctor]?.[completionForm.fee_code]?.amount || 0;
                        completionForm.scan_codes.forEach(code => { total += config?.scan_fees?.[code]?.amount || 0; });
                        return total.toLocaleString('en-IN');
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t bg-gray-50 flex gap-2">
              <Button variant="outline" className="flex-1 h-10" onClick={() => setShowCompletionModal(false)}>Cancel</Button>
              <Button onClick={completeWithFee} disabled={loading || !completionForm.fee_code}
                className="flex-1 h-10" style={{ background: COLORS.accent }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                Complete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// ============ Appointment Card - Compact ============
const AppointmentCard = ({ appointment, onCheckIn, onWithDoctor, onComplete, config }) => {
  const apt = appointment;
  const status = STATUS_STYLES[apt.status] || STATUS_STYLES['Booked'];
  const type = TYPE_STYLES[apt.appointment_type] || TYPE_STYLES['SCHEDULED'];
  
  const getAction = () => {
    switch (apt.status) {
      case 'Booked': return { label: 'CHECK IN', action: onCheckIn, color: '#f59e0b' };
      case 'CheckedIn': return { label: 'WITH DR', action: onWithDoctor, color: '#8b5cf6' };
      case 'WithDoctor': return { label: 'COMPLETE', action: onComplete, color: '#16a34a' };
      default: return null;
    }
  };
  
  const action = getAction();
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border-l-4"
         style={{ borderLeftColor: status.text }}>
      <div className="p-3">
        {/* Row 1: Name + Status */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h4 className="font-bold text-base">{apt.patient_name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-mono px-1.5 py-0.5 rounded" 
                    style={{ background: COLORS.primaryLight, color: COLORS.primary }}>{apt.booking_id}</span>
              {apt.patient_id && (
                <span className="text-xs font-mono text-gray-500">{apt.patient_id}</span>
              )}
            </div>
          </div>
          <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: status.bg, color: status.text }}>
            {status.label}
          </span>
        </div>
        {/* Row 2: Info */}
        <div className="flex items-center gap-3 text-xs text-gray-600 mt-2">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {apt.time || '-'}
          </span>
          <span className="flex items-center gap-1">
            <Stethoscope className="w-3 h-3" /> {apt.doctor?.replace('Dr. ', '')}
          </span>
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3" /> {apt.clinic?.replace(' Clinic', '')}
          </span>
        </div>
        {/* Row 3: Type + Fee + Action */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: type.bg, color: type.text }}>
              {apt.appointment_type === 'WALK_IN' ? 'Walk-In' : apt.appointment_type === 'EMERGENCY' ? 'Emergency' : 'Scheduled'}
            </span>
            {apt.total_amount > 0 && (
              <span className="font-bold text-sm" style={{ color: COLORS.accent }}>₹{apt.total_amount}</span>
            )}
          </div>
          {action && (
            <button onClick={() => { heavyTap(); action.action(); }}
              className="px-4 py-2 rounded-lg text-white text-xs font-bold shadow transition-all active:scale-95"
              style={{ background: action.color }}>
              {action.label} <ChevronRight className="w-3 h-3 inline ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiaGynStaffPortal;
