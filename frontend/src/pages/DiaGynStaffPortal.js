import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, User, Lock, LogOut, Phone, Calendar, Clock, 
  Search, Plus, CheckCircle2, UserPlus, AlertTriangle,
  Building2, Stethoscope, IndianRupee, RefreshCw,
  ChevronRight, Loader2, Users, TrendingUp, X, CalendarPlus,
  Printer, Bluetooth, Star
} from 'lucide-react';
import { lightTap, mediumTap, heavyTap, successPattern, errorPattern, selectionTap } from '@/utils/haptics';
import thermalPrinter from '@/utils/thermalPrinter';

const API = process.env.REACT_APP_BACKEND_URL;

// Colors
const COLORS = {
  primary: '#1a4d3f',
  primaryDark: '#0f3129',
  primaryLight: '#e0f2ed',
  accent: '#7ed957',
  accentLight: '#e8f9e0',
  warning: '#f59e0b',
  danger: '#dc2626',
};

const STATUS_STYLES = {
  'Booked': { bg: '#dbeafe', text: '#1d4ed8', label: 'BOOKED' },
  'CheckedIn': { bg: '#fef3c7', text: '#d97706', label: 'WAITING' },
  'WithDoctor': { bg: '#e9d5ff', text: '#7c3aed', label: 'WITH DR' },
  'Completed': { bg: '#dcfce7', text: '#16a34a', label: 'DONE' },
};

const TYPE_STYLES = {
  'SCHEDULED': { bg: '#dcfce7', text: '#166534' },
  'WALK_IN': { bg: '#dbeafe', text: '#1d4ed8' },
  'EMERGENCY': { bg: '#fee2e2', text: '#dc2626' },
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('staffToken');
  return { headers: { Authorization: `Bearer ${token}` } };
};

// IST Time helpers
const getISTNow = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset);
};

const getISTDate = () => getISTNow().toISOString().split('T')[0];

const getISTHour = () => getISTNow().getUTCHours();

const getDayName = (dateStr) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date(dateStr).getDay()];
};

// Session logic (IST)
const getCurrentSession = () => {
  const hour = getISTHour();
  if (hour >= 11 && hour < 14) return 'morning'; // 11am-2pm
  if (hour >= 18 && hour < 22) return 'evening'; // 6pm-10pm
  return null; // No active session
};

const getSessionLabel = (session) => {
  if (session === 'morning') return '11:00 AM - 2:00 PM';
  if (session === 'evening') return '6:00 PM - 10:00 PM';
  return 'No Active Session';
};

// ============ Main Component ============
const DiaGynStaffPortal = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // Default to 30-day login
  
  // Clinic selection (Pushpa or Amnion only)
  const [selectedClinic, setSelectedClinic] = useState('Pushpa Clinic');
  
  // Views: appointments, walkin, book, summary
  const [activeView, setActiveView] = useState('appointments');
  const [selectedDate, setSelectedDate] = useState(getISTDate());
  
  const [config, setConfig] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [dailySummary, setDailySummary] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  
  // Current session state
  const [currentSession, setCurrentSession] = useState(getCurrentSession());
  
  // Booking state
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientMobile, setPatientMobile] = useState('');
  const [patientId, setPatientId] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Emergency mode (for booking without slot)
  const [isEmergency, setIsEmergency] = useState(false);
  
  // Patient lookup
  const [foundPatient, setFoundPatient] = useState(null);
  const [searchingPatient, setSearchingPatient] = useState(false);

  // Google Review Stats
  const [reviewStats, setReviewStats] = useState({ sent: 0, today: 0 });

  // Bluetooth Printer state
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  // Connect to Bluetooth printer
  const connectPrinter = async () => {
    mediumTap();
    
    // Check if Bluetooth is available
    if (!navigator.bluetooth) {
      toast.error('Bluetooth not supported. Use Chrome/Edge on mobile or enable Web Bluetooth.');
      errorPattern();
      return;
    }
    
    toast.loading('Select your printer from the list...', { id: 'printer', duration: 30000 });
    try {
      const result = await thermalPrinter.connect();
      if (result.success) {
        setPrinterConnected(true);
        setPrinterName(result.deviceName);
        toast.success(`Connected: ${result.deviceName}`, { id: 'printer' });
        successPattern();
        
        // Start auto-reconnect monitoring
        thermalPrinter.startAutoReconnect(
          (deviceName) => {
            setPrinterConnected(true);
            setPrinterName(deviceName);
            toast.success(`Printer reconnected: ${deviceName}`);
            successPattern();
          },
          () => {
            setPrinterConnected(false);
            toast.info('Printer disconnected - will reconnect automatically');
          }
        );
      } else {
        // More helpful error messages
        let errorMsg = result.error;
        if (result.error?.includes('User cancelled')) {
          errorMsg = 'Cancelled. Tap Bluetooth icon to try again.';
        } else if (result.error?.includes('characteristic')) {
          errorMsg = 'Printer not compatible. Try a different printer.';
        }
        toast.error(errorMsg, { id: 'printer' });
        errorPattern();
      }
    } catch (error) {
      toast.error('Bluetooth error: ' + error.message, { id: 'printer' });
      errorPattern();
    }
  };

  // Print token receipt
  const printToken = async (tokenData) => {
    if (!printerConnected) {
      toast.error('Connect printer first');
      return false;
    }
    setIsPrinting(true);
    try {
      const result = await thermalPrinter.printToken(tokenData);
      if (result.success) {
        toast.success(`Token #${tokenData.token_number} printed!`);
        successPattern();
        return true;
      } else {
        toast.error(`Print failed: ${result.error}`);
        return false;
      }
    } catch (error) {
      toast.error('Print error');
      return false;
    } finally {
      setIsPrinting(false);
    }
  };

  // Update current session every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSession(getCurrentSession());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-reconnect to saved printer on mount
  useEffect(() => {
    const savedPrinter = thermalPrinter.getSavedPrinter();
    if (savedPrinter && navigator.bluetooth) {
      // Start auto-reconnect monitoring
      thermalPrinter.startAutoReconnect(
        (deviceName) => {
          setPrinterConnected(true);
          setPrinterName(deviceName);
          toast.success(`Printer reconnected: ${deviceName}`);
          successPattern();
        },
        () => {
          setPrinterConnected(false);
          toast.info('Printer disconnected - will reconnect when available');
        }
      );
      
      // Show saved printer indicator
      if (!printerConnected) {
        setPrinterName(savedPrinter.name + ' (saved)');
      }
    }
    
    return () => {
      thermalPrinter.stopAutoReconnect();
    };
  }, [printerConnected]);

  // 30 days login persistence
const LOGIN_EXPIRY_DAYS = 30;
const LOGIN_EXPIRY_MS = LOGIN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// ============ Auth ============
  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const info = localStorage.getItem('staffInfo');
    const expiry = localStorage.getItem('staffLoginExpiry');
    
    // Check if session expired
    if (expiry && new Date().getTime() > parseInt(expiry)) {
      localStorage.removeItem('staffToken');
      localStorage.removeItem('staffInfo');
      localStorage.removeItem('staffLoginExpiry');
      return;
    }
    
    if (token && info) {
      try {
        const staffData = JSON.parse(info);
        // Only allow diagyn_staff, clinic_staff, doctors for this portal
        const allowedRoles = ['diagyn_staff', 'clinic_staff_pushpa', 'clinic_staff_amnion', 'doctor', 'admin', 'super_admin'];
        const dept = staffData.department?.toLowerCase() || '';
        const isAllowed = allowedRoles.includes(staffData.role) || 
                          dept.includes('diagyn') || dept.includes('clinic');
        
        if (isAllowed) {
          setStaffInfo(staffData);
          setIsAuthenticated(true);
        } else {
          // Wrong portal - redirect to unified login
          navigate('/staff');
        }
      } catch (e) {
        localStorage.removeItem('staffToken');
        localStorage.removeItem('staffInfo');
        localStorage.removeItem('staffLoginExpiry');
      }
    }
  }, [navigate]);

  const handleLogin = async () => {
    if (!username || !password) {
      errorPattern();
      toast.error('Enter credentials');
      return;
    }
    setLoading(true);
    heavyTap();
    try {
      const res = await axios.post(`${API}/api/staff/login`, { username, password });
      
      // Store token
      localStorage.setItem('staffToken', res.data.token);
      
      // Only store expiry if "Remember Me" is checked
      if (rememberMe) {
        const expiryTime = new Date().getTime() + LOGIN_EXPIRY_MS;
        localStorage.setItem('staffLoginExpiry', expiryTime.toString());
      } else {
        localStorage.removeItem('staffLoginExpiry'); // Session-based login
      }
      
      // Store full staff object including department
      const staffData = res.data.staff || { name: res.data.name, role: res.data.role };
      localStorage.setItem('staffInfo', JSON.stringify(staffData));
      
      // Check if this staff belongs to this portal
      const allowedRoles = ['diagyn_staff', 'clinic_staff_pushpa', 'clinic_staff_amnion', 'doctor', 'admin', 'super_admin'];
      const dept = staffData.department?.toLowerCase() || '';
      const isAllowed = allowedRoles.includes(staffData.role) || 
                        dept.includes('diagyn') || dept.includes('clinic');
      
      if (isAllowed) {
        setStaffInfo(staffData);
        setIsAuthenticated(true);
        successPattern();
        toast.success(rememberMe ? `Welcome! (Logged in for 30 days)` : `Welcome!`);
      } else {
        // Redirect to correct portal via unified login
        toast.info('Redirecting to your portal...');
        navigate('/staff');
      }
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
    localStorage.removeItem('staffLoginExpiry');
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
        params: { date: selectedDate, clinic: selectedClinic },
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
  }, [selectedDate, selectedClinic]);

  const loadSummaries = useCallback(async () => {
    try {
      const [daily, weekly] = await Promise.all([
        axios.get(`${API}/api/diagyn-staff/summary/daily`, {
          params: { date: selectedDate, clinic: selectedClinic },
          ...getAuthHeaders()
        }),
        axios.get(`${API}/api/diagyn-staff/summary/weekly`, {
          params: { clinic: selectedClinic },
          ...getAuthHeaders()
        })
      ]);
      setDailySummary(daily.data);
      setWeeklySummary(weekly.data);
    } catch (error) {
      console.error('Summary error:', error);
    }
  }, [selectedDate, selectedClinic]);

  // Fetch Google Review stats
  const fetchReviewStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/diagyn-staff/review-stats`, {
        params: { clinic: selectedClinic, date: selectedDate },
        ...getAuthHeaders()
      });
      setReviewStats(res.data);
    } catch (error) {
      console.log('Review stats not available');
    }
  }, [selectedClinic, selectedDate]);

  // Load slots for walk-in (current session only)
  const loadWalkinSlots = useCallback(async () => {
    if (!selectedDoctor || !currentSession) {
      setAvailableSlots([]);
      return;
    }
    
    setLoadingSlots(true);
    try {
      const res = await axios.get(`${API}/api/diagyn-staff/slots/available`, {
        params: {
          clinic: selectedClinic,
          doctor: selectedDoctor,
          date: getISTDate(),
          mode: 'walkin'
        },
        ...getAuthHeaders()
      });
      setAvailableSlots(res.data.available_slots || []);
    } catch (error) {
      console.error('Slots error:', error);
      setAvailableSlots([]);
    }
    setLoadingSlots(false);
  }, [selectedDoctor, selectedClinic, currentSession]);

  // Load slots for booking (future)
  const loadBookingSlots = useCallback(async () => {
    if (!selectedDoctor || !bookingDate) {
      setAvailableSlots([]);
      return;
    }
    
    setLoadingSlots(true);
    try {
      const res = await axios.get(`${API}/api/diagyn-staff/slots/available`, {
        params: {
          clinic: selectedClinic,
          doctor: selectedDoctor,
          date: bookingDate,
          mode: 'book'
        },
        ...getAuthHeaders()
      });
      setAvailableSlots(res.data.available_slots || []);
    } catch (error) {
      console.error('Slots error:', error);
      setAvailableSlots([]);
    }
    setLoadingSlots(false);
  }, [selectedDoctor, selectedClinic, bookingDate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadConfig();
      loadAppointments();
    }
  }, [isAuthenticated, loadConfig, loadAppointments]);

  useEffect(() => {
    if (isAuthenticated && activeView === 'summary') loadSummaries();
  }, [isAuthenticated, activeView, loadSummaries]);

  // Load review stats when appointments view is active
  useEffect(() => {
    if (isAuthenticated && activeView === 'appointments') fetchReviewStats();
  }, [isAuthenticated, activeView, fetchReviewStats]);

  useEffect(() => {
    if (isAuthenticated && activeView === 'walkin' && selectedDoctor) {
      loadWalkinSlots();
    }
  }, [isAuthenticated, activeView, selectedDoctor, loadWalkinSlots]);

  useEffect(() => {
    if (isAuthenticated && activeView === 'book' && selectedDoctor && bookingDate) {
      loadBookingSlots();
    }
  }, [isAuthenticated, activeView, selectedDoctor, bookingDate, loadBookingSlots]);

  // Auto-refresh every 8 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      if (activeView === 'appointments') loadAppointments();
      if (activeView === 'walkin' && selectedDoctor) loadWalkinSlots();
      if (activeView === 'book' && selectedDoctor && bookingDate) loadBookingSlots();
      setCurrentSession(getCurrentSession());
    }, 8000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeView, loadAppointments, loadWalkinSlots, loadBookingSlots, selectedDoctor, bookingDate]);

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
        setPatientName(res.data.patient.name);
        setPatientId(res.data.patient.id);
        successPattern();
        toast.success(`Found: ${res.data.patient.name}`);
      } else {
        setFoundPatient(null);
        setPatientId(null);
        toast.info('New patient - enter name');
      }
    } catch (error) {
      errorPattern();
      toast.error('Search failed');
    }
    setSearchingPatient(false);
  };

  // ============ Booking ============
  const handleBooking = async (type) => {
    if (!patientName || !patientMobile) {
      errorPattern();
      toast.error('Enter patient name & mobile');
      return;
    }
    if (!selectedDoctor) {
      errorPattern();
      toast.error('Select doctor');
      return;
    }
    if (type !== 'EMERGENCY' && !selectedSlot) {
      errorPattern();
      toast.error('Select a time slot');
      return;
    }
    
    const dateToUse = type === 'SCHEDULED' ? bookingDate : getISTDate();
    
    setLoading(true);
    heavyTap();
    try {
      const res = await axios.post(`${API}/api/diagyn-staff/appointments/book`, {
        clinic: selectedClinic,
        doctor: selectedDoctor,
        date: dateToUse,
        time: type === 'EMERGENCY' ? null : selectedSlot,
        patient_name: patientName,
        patient_mobile: patientMobile,
        patient_id: patientId,
        appointment_type: type
      }, getAuthHeaders());
      
      if (res.data.success) {
        successPattern();
        toast.success(`Booked: ${res.data.booking_id}`);
        resetBookingForm();
        setActiveView('appointments');
        loadAppointments();
      }
    } catch (error) {
      errorPattern();
      toast.error(error.response?.data?.detail || 'Booking failed');
    }
    setLoading(false);
  };

  const resetBookingForm = () => {
    setSelectedDoctor('');
    setBookingDate('');
    setSelectedSlot('');
    setPatientName('');
    setPatientMobile('');
    setPatientId(null);
    setFoundPatient(null);
    setAvailableSlots([]);
    setIsEmergency(false);
  };

  // Switch view and reset
  const switchToView = (view) => {
    selectionTap();
    setActiveView(view);
    resetBookingForm();
    if (view === 'book') {
      // Default to tomorrow for booking
      const tomorrow = new Date(getISTNow());
      tomorrow.setDate(tomorrow.getDate() + 1);
      setBookingDate(tomorrow.toISOString().split('T')[0]);
    }
    if (view === 'walkin' && !currentSession) {
      // Auto-select Emergency if no active session
      setIsEmergency(true);
    }
  };

  // Get doctors available at current clinic
  const getDoctorsForClinic = () => {
    if (!config?.doctor_schedule) return [];
    return Object.keys(config.doctor_schedule).filter(doctor => 
      config.doctor_schedule[doctor][selectedClinic]
    );
  };

  // ============ Status Updates ============
  const updateStatus = async (appointmentId, newStatus) => {
    heavyTap();
    try {
      const res = await axios.put(`${API}/api/diagyn-staff/appointments/${appointmentId}/status`,
        { status: newStatus }, getAuthHeaders());
      
      // If check-in and printer connected, auto-print token
      if (newStatus === 'CheckedIn' && res.data.token_data) {
        const tokenData = res.data.token_data;
        toast.success(`Token #${tokenData.token_number} assigned!`);
        
        if (printerConnected) {
          await printToken(tokenData);
        } else {
          // Show token number prominently if printer not connected
          toast.info(`Token #${tokenData.token_number} - Connect printer to print`, { duration: 5000 });
        }
      } else {
        toast.success(newStatus);
      }
      
      successPattern();
      loadAppointments();
    } catch (error) {
      errorPattern();
      toast.error('Update failed');
    }
  };

  // Manual reprint token for an appointment
  const reprintToken = async (apt) => {
    if (!printerConnected) {
      toast.error('Connect printer first');
      return;
    }
    const tokenData = {
      token_number: apt.token_number,
      patient_name: apt.patient_name,
      clinic: apt.clinic,
      clinic_address: config?.clinics?.[apt.clinic]?.address || '',
      slot_time: apt.time || 'Emergency',
      date: apt.date,
      booking_id: apt.booking_id,
      appointment_type: apt.appointment_type || 'SCHEDULED'
    };
    await printToken(tokenData);
  };

  // Print Bill for completed appointments (staff can print but not edit)
  const printBill = async (apt) => {
    if (!printerConnected) {
      toast.error('Connect printer first');
      return;
    }
    
    // Get fee details from config
    const doctor = apt.doctor;
    const feeCode = apt.fee_code;
    const feeDetails = config?.fee_codes?.[doctor]?.[feeCode] || { label: feeCode, amount: 0 };
    
    // Get scan details
    const scanDetails = (apt.scan_codes || []).map(code => ({
      code,
      label: config?.scan_fees?.[code]?.label || code,
      amount: config?.scan_fees?.[code]?.amount || 0
    }));
    
    const billData = {
      clinic: apt.clinic,
      clinic_address: config?.clinics?.[apt.clinic]?.address || '',
      booking_id: apt.booking_id,
      patient_name: apt.patient_name,
      patient_mobile: apt.patient_phone || apt.patient_mobile,
      doctor: apt.doctor,
      fee_code: feeCode,
      fee_details: feeDetails,
      scan_codes: scanDetails,
      total_amount: apt.total_amount || 0
    };
    
    setIsPrinting(true);
    try {
      const result = await thermalPrinter.printBill(billData);
      if (result.success) {
        toast.success('Bill printed!');
        successPattern();
      } else {
        toast.error(`Print failed: ${result.error}`);
        errorPattern();
      }
    } catch (error) {
      toast.error('Print error');
      errorPattern();
    } finally {
      setIsPrinting(false);
    }
  };

  // Send Google Review Request to patient
  const sendReviewRequest = async (apt) => {
    if (!apt.patient_phone && !apt.patient_mobile) {
      toast.error('No phone number available');
      return;
    }
    
    const phone = apt.patient_phone || apt.patient_mobile;
    
    try {
      const res = await axios.post(`${API}/api/diagyn-staff/whatsapp/send-review-request`, null, {
        params: {
          whatsapp_number: phone,
          patient_name: apt.patient_name || 'Patient',
          clinic_name: apt.clinic || selectedClinic,
          doctor_name: apt.doctor || 'Doctor'
        },
        ...getAuthHeaders()
      });
      
      if (res.data.success) {
        toast.success('Review request sent via WhatsApp!');
        successPattern();
        // Update local state to show review was sent
        setAppointments(prev => prev.map(a => 
          a.booking_id === apt.booking_id 
            ? { ...a, review_request_sent: true } 
            : a
        ));
        // Refresh review stats
        fetchReviewStats();
      } else {
        toast.error(res.data.error || 'Failed to send review request');
        errorPattern();
      }
    } catch (error) {
      toast.error('Failed to send review request');
      errorPattern();
    }
  };

  // Staff cannot complete appointments - only doctors can (removed completion modal)

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
            <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>Nevika Cura Staff</h1>
            <p className="text-sm text-gray-500">Staff Portal</p>
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
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="rememberMe" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500"
                data-testid="remember-me-checkbox"
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-600 cursor-pointer">
                Remember me for 30 days
              </label>
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
      {/* Header */}
      <header className="sticky top-0 z-50 px-3 py-2" style={{ background: COLORS.primary }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-white" />
            <div>
              <h1 className="text-white font-bold text-base">Nevika Cura Staff</h1>
              <p className="text-white/70 text-xs">{staffInfo?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Printer Connection Button */}
            <Button variant="ghost" size="sm" onClick={connectPrinter}
              className={`hover:bg-white/20 h-8 px-2 ${printerConnected ? 'text-green-300' : 'text-white/70'}`}
              disabled={isPrinting}>
              {isPrinting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Bluetooth className={`w-4 h-4 ${printerConnected ? 'text-green-300' : ''}`} />
                  {printerConnected && <span className="text-xs ml-1">●</span>}
                </>
              )}
            </Button>
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
        
        {/* Printer Status Bar */}
        {printerConnected && (
          <div className="px-3 py-1 bg-green-600 flex items-center justify-center gap-2">
            <Printer className="w-3 h-3 text-white" />
            <span className="text-xs text-white font-medium">{printerName} connected</span>
          </div>
        )}
        {!printerConnected && printerName && (
          <div className="px-3 py-1 bg-amber-500 flex items-center justify-center gap-2">
            <Bluetooth className="w-3 h-3 text-white animate-pulse" />
            <span className="text-xs text-white font-medium">{printerName} - Reconnecting...</span>
          </div>
        )}
        
        {/* Clinic Toggle - Only Pushpa & Amnion */}
        <div className="grid grid-cols-2 gap-2 mt-3 pb-1 px-3">
          {['Pushpa Clinic', 'Amnion Clinic'].map(clinic => (
            <button key={clinic} 
              onClick={() => { 
                selectionTap(); 
                setSelectedClinic(clinic); 
                resetBookingForm();
              }}
              className={`py-3 rounded-xl text-sm font-bold transition-all ${
                selectedClinic === clinic ? 'bg-white shadow-md' : 'bg-white/20 text-white'
              }`}
              style={selectedClinic === clinic ? { color: COLORS.primary } : {}}>
              <Building2 className="w-4 h-4 inline mr-2" />
              {clinic.replace(' Clinic', '')}
            </button>
          ))}
        </div>
      </header>

      {/* Stats Bar */}
      {summary && activeView === 'appointments' && (
        <div className="px-3 py-2 bg-white border-b flex gap-2 overflow-x-auto">
          {[
            { label: 'Booked', count: summary.booked || 0, color: '#3b82f6' },
            { label: 'Wait', count: summary.checked_in || 0, color: '#f59e0b' },
            { label: 'Dr', count: summary.with_doctor || 0, color: '#8b5cf6' },
            { label: 'Done', count: summary.completed || 0, color: '#16a34a' },
            { label: 'Reviews', count: reviewStats.today || 0, color: '#ec4899' },
          ].map(stat => (
            <div key={stat.label} className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                 style={{ background: `${stat.color}15` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: stat.color }}></div>
              <span className="text-xs font-medium" style={{ color: stat.color }}>{stat.label}: {stat.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="px-3 py-2 bg-white border-b">
        <div className="grid grid-cols-4 gap-1">
          {[
            { id: 'appointments', icon: Calendar, label: 'Today' },
            { id: 'walkin', icon: Users, label: 'Walk-in' },
            { id: 'book', icon: CalendarPlus, label: 'Book' },
            { id: 'summary', icon: TrendingUp, label: 'Summary' },
          ].map(tab => (
            <button key={tab.id} onClick={() => switchToView(tab.id)}
              className={`flex flex-col items-center gap-1 py-2 px-2 rounded-lg font-medium transition-all ${
                activeView === tab.id ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600'
              }`}
              style={activeView === tab.id ? { background: COLORS.accent } : {}}>
              <tab.icon className="w-4 h-4" />
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="p-3 pb-20">
        {/* ============ APPOINTMENTS VIEW ============ */}
        {activeView === 'appointments' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
              <Calendar className="w-4 h-4" style={{ color: COLORS.primary }} />
              <input type="date" value={selectedDate}
                onChange={(e) => { lightTap(); setSelectedDate(e.target.value); }}
                className="flex-1 text-sm font-medium bg-transparent outline-none" />
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: COLORS.primaryLight, color: COLORS.primary }}>
                {getDayName(selectedDate)}
              </span>
            </div>

            {appointments.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-lg">
                <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No appointments at {selectedClinic.replace(' Clinic', '')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {appointments.map(apt => (
                  <AppointmentCard key={apt.id} apt={apt} config={config}
                    onCheckIn={() => updateStatus(apt.id, 'CheckedIn')}
                    onWithDoctor={() => updateStatus(apt.id, 'WithDoctor')}
                    onReprint={reprintToken}
                    onPrintBill={printBill}
                    printerConnected={printerConnected} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ WALK-IN / EMERGENCY VIEW ============ */}
        {activeView === 'walkin' && (
          <div className="space-y-3">
            {/* Current Session Status */}
            <div className={`rounded-lg p-3 border ${currentSession ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-bold ${currentSession ? 'text-green-800' : 'text-amber-800'}`}>
                    <Clock className="w-4 h-4 inline mr-1" />
                    {currentSession ? `Active: ${getSessionLabel(currentSession)}` : 'No Active Session'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {currentSession ? 'Walk-in & Emergency available' : 'Only Emergency available (24x7)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Walk-in / Emergency Toggle */}
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { 
                    if (currentSession) {
                      mediumTap(); 
                      setIsEmergency(false); 
                      setSelectedSlot(''); 
                    }
                  }}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    !currentSession 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : !isEmergency 
                        ? 'text-white' 
                        : 'bg-gray-100 text-gray-600'
                  }`}
                  style={currentSession && !isEmergency ? { background: COLORS.accent } : {}}
                  disabled={!currentSession}>
                  <Users className="w-4 h-4 inline mr-2" />
                  Walk-in
                </button>
                <button 
                  onClick={() => { mediumTap(); setIsEmergency(true); setSelectedSlot(''); }}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    isEmergency ? 'text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                  style={isEmergency ? { background: COLORS.danger } : {}}>
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Emergency (24x7)
                </button>
              </div>
            </div>

            {/* Select Doctor */}
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <label className="text-xs font-bold text-gray-600 mb-2 block">SELECT DOCTOR</label>
              <div className="grid grid-cols-2 gap-2">
                {getDoctorsForClinic().map(doctor => (
                  <button key={doctor}
                    onClick={() => { mediumTap(); setSelectedDoctor(doctor); setSelectedSlot(''); }}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedDoctor === doctor ? 'shadow-md' : 'border-gray-200'
                    }`}
                    style={selectedDoctor === doctor ? { borderColor: COLORS.primary, background: COLORS.primaryLight } : {}}>
                    <Stethoscope className="w-5 h-5 mb-1" style={{ color: COLORS.primary }} />
                    <p className="font-bold text-sm">{doctor.replace('Dr. ', '')}</p>
                  </button>
                ))}
              </div>
              {getDoctorsForClinic().length === 0 && (
                <p className="text-center text-gray-500 text-sm py-4">No doctors at this clinic today</p>
              )}
            </div>

            {/* Slots (only for walk-in with active session) */}
            {selectedDoctor && !isEmergency && currentSession && (
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-600">
                    CURRENT SESSION SLOTS
                    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                      {getSessionLabel(currentSession)}
                    </span>
                  </label>
                  {loadingSlots && <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.accent }} />}
                </div>
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                    {availableSlots.map(slot => (
                      <button key={slot.value}
                        onClick={() => { lightTap(); setSelectedSlot(slot.value); }}
                        className={`py-2 rounded-lg text-xs font-medium transition-all ${
                          selectedSlot === slot.value ? 'text-white shadow' : 'bg-gray-100 text-gray-700'
                        }`}
                        style={selectedSlot === slot.value ? { background: COLORS.accent } : {}}>
                        {slot.display}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 text-sm py-4">No slots available</p>
                )}
              </div>
            )}

            {/* No session message for walk-in */}
            {selectedDoctor && !isEmergency && !currentSession && (
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-amber-800 font-medium">No active session right now</p>
                <p className="text-amber-600 text-sm mt-1">Morning: 11am-2pm | Evening: 6pm-10pm</p>
                <p className="text-amber-600 text-sm">Use Emergency for urgent cases</p>
              </div>
            )}

            {/* Patient Details */}
            {selectedDoctor && (isEmergency || selectedSlot) && (
              <div className="bg-white rounded-lg p-3 shadow-sm space-y-3">
                <label className="text-xs font-bold text-gray-600 block">PATIENT DETAILS</label>
                <div className="flex gap-2">
                  <Input value={patientMobile} maxLength={10}
                    onChange={(e) => setPatientMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Mobile (10 digits)" className="h-10" />
                  <Button onClick={lookupPatient} disabled={searchingPatient || patientMobile.length < 10}
                    className="h-10 px-4" style={{ background: COLORS.primary }}>
                    {searchingPatient ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                {foundPatient && (
                  <div className="p-2 rounded-lg flex items-center gap-2" style={{ background: COLORS.primaryLight }}>
                    <CheckCircle2 className="w-5 h-5" style={{ color: COLORS.primary }} />
                    <span className="font-medium text-sm" style={{ color: COLORS.primary }}>{foundPatient.name}</span>
                  </div>
                )}
                <Input value={patientName} onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Patient Name" className="h-10" />
              </div>
            )}

            {/* Book Button */}
            {selectedDoctor && patientName && patientMobile && (isEmergency || selectedSlot) && (
              <Button 
                onClick={() => handleBooking(isEmergency ? 'EMERGENCY' : 'WALK_IN')} 
                disabled={loading}
                className="w-full h-14 text-lg font-bold"
                style={{ background: isEmergency ? COLORS.danger : COLORS.accent }}>
                {loading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : 
                  isEmergency ? <AlertTriangle className="w-6 h-6 mr-2" /> : <Users className="w-6 h-6 mr-2" />}
                {isEmergency ? 'BOOK EMERGENCY' : 'BOOK WALK-IN'}
              </Button>
            )}
          </div>
        )}

        {/* ============ BOOK APPOINTMENT VIEW ============ */}
        {activeView === 'book' && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 font-medium">
                <CalendarPlus className="w-4 h-4 inline mr-1" />
                Book future appointment at {selectedClinic.replace(' Clinic', '')}
              </p>
            </div>

            {/* Select Doctor */}
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <label className="text-xs font-bold text-gray-600 mb-2 block">1. SELECT DOCTOR</label>
              <div className="grid grid-cols-2 gap-2">
                {getDoctorsForClinic().map(doctor => (
                  <button key={doctor}
                    onClick={() => { mediumTap(); setSelectedDoctor(doctor); setSelectedSlot(''); }}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedDoctor === doctor ? 'shadow-md' : 'border-gray-200'
                    }`}
                    style={selectedDoctor === doctor ? { borderColor: COLORS.primary, background: COLORS.primaryLight } : {}}>
                    <Stethoscope className="w-5 h-5 mb-1" style={{ color: COLORS.primary }} />
                    <p className="font-bold text-sm">{doctor.replace('Dr. ', '')}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Select Date */}
            {selectedDoctor && (
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <label className="text-xs font-bold text-gray-600 mb-2 block">2. SELECT DATE</label>
                <input type="date" value={bookingDate} min={getISTDate()}
                  onChange={(e) => { lightTap(); setBookingDate(e.target.value); setSelectedSlot(''); }}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm" />
                {bookingDate && <p className="text-xs text-gray-500 mt-1">{getDayName(bookingDate)}</p>}
              </div>
            )}

            {/* Available Slots */}
            {selectedDoctor && bookingDate && (
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-600">3. SELECT SLOT</label>
                  {loadingSlots && <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.accent }} />}
                </div>
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
                    {availableSlots.map(slot => (
                      <button key={slot.value}
                        onClick={() => { lightTap(); setSelectedSlot(slot.value); }}
                        className={`py-2 rounded-lg text-xs font-medium transition-all ${
                          selectedSlot === slot.value ? 'text-white shadow' : 'bg-gray-100 text-gray-700'
                        }`}
                        style={selectedSlot === slot.value ? { background: COLORS.accent } : {}}>
                        {slot.display}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 text-sm py-4">
                    {loadingSlots ? 'Loading...' : 'No slots available. Try another date.'}
                  </p>
                )}
              </div>
            )}

            {/* Patient Details */}
            {selectedSlot && (
              <div className="bg-white rounded-lg p-3 shadow-sm space-y-3">
                <label className="text-xs font-bold text-gray-600 block">4. PATIENT DETAILS</label>
                <div className="flex gap-2">
                  <Input value={patientMobile} maxLength={10}
                    onChange={(e) => setPatientMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Mobile (10 digits)" className="h-10" />
                  <Button onClick={lookupPatient} disabled={searchingPatient || patientMobile.length < 10}
                    className="h-10 px-4" style={{ background: COLORS.primary }}>
                    {searchingPatient ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                {foundPatient && (
                  <div className="p-2 rounded-lg flex items-center gap-2" style={{ background: COLORS.primaryLight }}>
                    <CheckCircle2 className="w-5 h-5" style={{ color: COLORS.primary }} />
                    <span className="font-medium text-sm" style={{ color: COLORS.primary }}>{foundPatient.name} ({foundPatient.id})</span>
                  </div>
                )}
                <Input value={patientName} onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Patient Name" className="h-10" />
              </div>
            )}

            {/* Book Button */}
            {selectedSlot && patientName && patientMobile && (
              <Button onClick={() => handleBooking('SCHEDULED')} disabled={loading}
                className="w-full h-14 text-lg font-bold" style={{ background: COLORS.accent }}>
                {loading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <CalendarPlus className="w-6 h-6 mr-2" />}
                BOOK APPOINTMENT
              </Button>
            )}
          </div>
        )}

        {/* ============ SUMMARY VIEW ============ */}
        {activeView === 'summary' && (
          <div className="space-y-3">
            <div className="rounded-xl p-4 text-white shadow-lg" style={{ background: COLORS.primary }}>
              <h3 className="text-sm font-medium opacity-80">Today at {selectedClinic.replace(' Clinic', '')}</h3>
              <div className="text-3xl font-bold mt-1">₹{(dailySummary?.total_collection || 0).toLocaleString('en-IN')}</div>
              <p className="text-sm opacity-70 mt-1">{dailySummary?.total_patients || 0} patients</p>
            </div>
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
    </div>
  );
};

// ============ Appointment Card ============
// Staff can only CHECK IN and move to WITH DR - CANNOT Complete (doctor does that)
// Staff can print BILL for completed appointments
const AppointmentCard = ({ apt, config, onCheckIn, onWithDoctor, onReprint, onPrintBill, printerConnected }) => {
  const status = STATUS_STYLES[apt.status] || STATUS_STYLES['Booked'];
  const type = TYPE_STYLES[apt.appointment_type] || TYPE_STYLES['SCHEDULED'];
  
  const getAction = () => {
    switch (apt.status) {
      case 'Booked': return { label: 'CHECK IN', action: onCheckIn, color: '#f59e0b' };
      case 'CheckedIn': return { label: 'WITH DR', action: onWithDoctor, color: '#8b5cf6' };
      // Staff cannot complete - only doctors can
      case 'WithDoctor': return null;
      default: return null;
    }
  };
  
  const action = getAction();
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border-l-4" style={{ borderLeftColor: status.text }}>
      <div className="p-3">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-start gap-3">
            {/* Token Number Badge (for checked-in patients) */}
            {apt.token_number && (
              <div className="flex flex-col items-center justify-center min-w-[44px] h-11 rounded-lg bg-gray-100">
                <span className="text-[10px] text-gray-500 font-medium leading-none">TOKEN</span>
                <span className="text-lg font-bold text-gray-700 leading-tight">{apt.token_number}</span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-base">{apt.patient_name}</h4>
                {/* Mobile Number Badge */}
                {apt.mobile && (
                  <a href={`tel:${apt.mobile}`} 
                     className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                     onClick={(e) => e.stopPropagation()}>
                    <Phone className="w-3 h-3" />
                    {apt.mobile}
                  </a>
                )}
                {/* Print Bill Button (dark yellow) for completed appointments */}
                {apt.status === 'Completed' && apt.total_amount > 0 && printerConnected && (
                  <button onClick={() => { mediumTap(); onPrintBill(apt); }}
                    className="px-2 py-1 rounded-md text-xs font-bold text-white flex items-center gap-1"
                    style={{ background: '#d97706' }}
                    title="Print Bill">
                    <Printer className="w-3 h-3" /> BILL
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-mono px-1.5 py-0.5 rounded" 
                      style={{ background: COLORS.primaryLight, color: COLORS.primary }}>{apt.booking_id}</span>
                {apt.patient_id && <span className="text-xs font-mono text-gray-500">{apt.patient_id}</span>}
              </div>
            </div>
          </div>
          <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: status.bg, color: status.text }}>
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-600 mt-2">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {apt.time || 'Emergency'}</span>
          <span className="flex items-center gap-1"><Stethoscope className="w-3 h-3" /> {apt.doctor?.replace('Dr. ', '')}</span>
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: type.bg, color: type.text }}>
              {apt.appointment_type === 'WALK_IN' ? 'Walk-In' : apt.appointment_type === 'EMERGENCY' ? 'Emergency' : 'Scheduled'}
            </span>
            {apt.total_amount > 0 && <span className="font-bold text-sm" style={{ color: COLORS.accent }}>₹{apt.total_amount}</span>}
            {/* Follow-up Date Badge */}
            {apt.follow_up_date && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-teal-50 text-teal-700">
                <Calendar className="w-3 h-3" />
                F/U: {new Date(apt.follow_up_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Reprint Token Button (for checked-in patients with token) */}
            {apt.token_number && apt.status !== 'Completed' && printerConnected && (
              <button onClick={() => { lightTap(); onReprint(apt); }}
                className="p-2 rounded-lg text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
                title="Reprint Token">
                <Printer className="w-4 h-4" />
              </button>
            )}
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
    </div>
  );
};

export default DiaGynStaffPortal;
