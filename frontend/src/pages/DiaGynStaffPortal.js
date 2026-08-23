import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import {
  LogOut, Calendar, Clock, Plus, CheckCircle2, AlertTriangle,
  Building2, Stethoscope, RefreshCw, Loader2, Users, TrendingUp, X, Zap,
  CalendarPlus, Bluetooth, Wifi, WifiOff, Volume2,
  ClipboardList, Baby, ArrowLeftRight, Shield, Printer, QrCode
} from 'lucide-react';
import { lightTap, mediumTap, heavyTap, successPattern, errorPattern, selectionTap } from '@/utils/haptics';
import thermalPrinter from '@/utils/thermalPrinter';
import { useAppointmentWebSocket } from '@/hooks/useAppointmentWebSocket';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useLiveSync, LiveSyncBadge } from '@/hooks/useLiveSync';
import { useBluetoothSpeaker } from '@/hooks/useBluetoothSpeaker';
import BluetoothSpeakerIndicator from '@/components/BluetoothSpeakerIndicator';
import CodeVerificationInput from '@/components/CodeVerificationInput';
import BillingTimerPanel from '@/components/BillingTimerPanel';
import QueueInsightsWidget from '@/components/QueueInsightsWidget';
import LongWaitAlert from '@/components/LongWaitAlert';
import PortalErrorBoundary from '@/components/PortalErrorBoundary';
import PortalSwitcher from '@/components/PortalSwitcher';
import CountUp from '@/components/CountUp';

// Refactored sub-components
import StaffContext from './diagyn/StaffContext';
import { COLORS } from './diagyn/staffConstants';
import StaffAppointmentsView from './diagyn/StaffAppointmentsView';
import StaffCheckinView from './diagyn/StaffCheckinView';
import StaffWalkinView from './diagyn/StaffWalkinView';
import StaffBookView from './diagyn/StaffBookView';
import StaffANCView from './diagyn/StaffANCView';
import StaffHistoryView from './diagyn/StaffHistoryView';
import StaffSummaryView from './diagyn/StaffSummaryView';
import StaffTokenView from './diagyn/StaffTokenView';
import StaffQRScanView from './diagyn/StaffQRScanView';

const API = process.env.REACT_APP_BACKEND_URL;

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
const getMaxBookingDate = () => {
  const now = new Date();
  now.setMonth(now.getMonth() + 3);
  return now.toISOString().split('T')[0];
};
const getDayName = (dateStr) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date(dateStr).getDay()];
};
const getCurrentSession = () => {
  const hour = getISTHour();
  if (hour >= 11 && hour < 14) return 'morning';
  if (hour >= 18 && hour < 22) return 'evening';
  return null;
};
const getSessionLabel = (session) => {
  if (session === 'morning') return '11:30 AM - 2:00 PM';
  if (session === 'evening') return '6:00 PM - 10:00 PM';
  return 'No Active Session';
};

const LOGIN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

const DOCTOR_PORTAL_THEMES = {
  vikas: {
    name: 'Dr. Vikas Jha', short: 'Dr. Vikas',
    avatar: 'https://customer-assets.emergentagent.com/job_1d0b9312-d1f2-40d1-b78f-c0c28fa95ba1/artifacts/gg2swmlp_IMG-20220627-WA0003.jpg',
    isDark: false,
    headerBg: 'linear-gradient(160deg, #A6FF4D, #8AE030, #7ED321)',
    headerText: '#0D1F1E',
    headerIconColor: '#163332',
    accentBar: 'linear-gradient(90deg, #7ED321, #A6FF4D, #7ED321)',
    accent: '#0D1F1E', accentDark: '#0D1F1E', accentMid: '#163332',
    accentLight: '#A6FF4D',
    tabBg: 'rgba(13,31,30,0.06)', tabText: '#0D1F1E', tabBorder: 'rgba(13,31,30,0.15)',
    fabGradient: 'linear-gradient(135deg, #0D1F1E, #163332)',
    fabShadow: '0 4px 20px rgba(13,31,30,0.35)', fabIcon: '#A6FF4D',
    cardBorder: '#0D1F1E',
    cardActiveBg: 'rgba(255,255,255,0.95)',
    cardInactiveBg: 'rgba(255,255,255,0.5)',
    clinicActiveBg: 'rgba(13,31,30,0.85)',
    clinicActiveText: '#A6FF4D',
    clinicActiveBorder: '#0D1F1E',
    clinicInactiveBg: 'rgba(13,31,30,0.08)',
    clinicInactiveText: '#163332',
    clinicInactiveBorder: 'rgba(13,31,30,0.15)',
    statusBg: (connected) => connected ? 'rgba(13,31,30,0.12)' : 'rgba(239,68,68,0.12)',
    statusColor: (connected) => connected ? '#0D1F1E' : '#DC2626',
  },
  neha: {
    name: 'Dr. Neha Patel', short: 'Dr. Neha',
    avatar: 'https://customer-assets.emergentagent.com/job_healthhelper-7/artifacts/u05fho69_IMG-20260126-WA0000.jpg',
    isDark: false,
    headerBg: 'linear-gradient(160deg, #B2DFDB, #80CBC4, #A8D8D4)',
    headerText: '#0F2A28',
    headerIconColor: '#1A5C54',
    accentBar: 'linear-gradient(90deg, #80CBC4, #4DB6AC, #80CBC4)',
    accent: '#00897B', accentDark: '#004D40', accentMid: '#00695C',
    accentLight: '#80CBC4',
    tabBg: 'rgba(0,137,123,0.08)', tabText: '#004D40', tabBorder: 'rgba(0,137,123,0.2)',
    fabGradient: 'linear-gradient(135deg, #00897B, #00695C)',
    fabShadow: '0 4px 20px rgba(0,137,123,0.35)', fabIcon: '#FFFFFF',
    cardBorder: '#00897B',
    cardActiveBg: 'rgba(255,255,255,0.92)',
    cardInactiveBg: 'rgba(255,255,255,0.5)',
    clinicActiveBg: 'rgba(0,137,123,0.12)',
    clinicActiveText: '#004D40',
    clinicActiveBorder: 'rgba(0,137,123,0.35)',
    clinicInactiveBg: 'rgba(0,0,0,0.04)',
    clinicInactiveText: '#64748B',
    clinicInactiveBorder: 'rgba(0,0,0,0.08)',
    statusBg: (connected) => connected ? 'rgba(0,137,123,0.12)' : 'rgba(239,68,68,0.12)',
    statusColor: (connected) => connected ? '#00695C' : '#DC2626',
  }
};

// ============ Main Component ============
const DiaGynStaffPortal = () => {
  const navigate = useNavigate();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Clinic selection
  const [selectedClinic, setSelectedClinic] = useState('Pushpa Clinic');
  const [activeDoctorFilter, setActiveDoctorFilter] = useState('vikas');
  const [clinicOverrides, setClinicOverrides] = useState([]);

  // Views
  const [activeView, setActiveView] = useState('appointments');
  const [selectedDate, setSelectedDate] = useState(getISTDate());
  const [appointmentViewMode, setAppointmentViewMode] = useState('list');
  const [calendarData, setCalendarData] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const [config, setConfig] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [dailySummary, setDailySummary] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [currentSession, setCurrentSession] = useState(getCurrentSession());
  const [sessionFilter, setSessionFilter] = useState('all');

  // Booking state
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientMobile, setPatientMobile] = useState('');
  const [patientId, setPatientId] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [foundPatient, setFoundPatient] = useState(null);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [reviewStats, setReviewStats] = useState({ sent: 0, today: 0 });

  // Printer
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  // Verification
  const [verifyingAppointment, setVerifyingAppointment] = useState(null);
  const [showCodeVerification, setShowCodeVerification] = useState(false);

  // Code Check-in
  const [bookingCodeInput, setBookingCodeInput] = useState('');
  const [checkingInByCode, setCheckingInByCode] = useState(false);
  const [codeCheckInResult, setCodeCheckInResult] = useState(null);

  // Patient History
  const [historyPhone, setHistoryPhone] = useState('');
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Archives
  const [showArchives, setShowArchives] = useState(false);
  const [archivedAppointments, setArchivedAppointments] = useState([]);
  const [loadingArchives, setLoadingArchives] = useState(false);

  // ANC
  const [ancForm, setAncForm] = useState({
    patient_name: '', age: '', phone: '', address: '', aadhaar: '',
    husband_name: '', husband_phone: '', husband_occupation: '',
    lmp: '', gravida: 1, para: 0, abortion: 0, living: 0,
    blood_group: '', rh_factor: 'Positive', weight_kg: '', height_cm: '',
    previous_cesarean: false, diabetes: false, hypertension: false, thyroid: false, other_conditions: '',
    doctor_assigned: '', clinic: 'Pushpa Clinic',
  });
  const [ancSubmitting, setAncSubmitting] = useState(false);
  const [ancResult, setAncResult] = useState(null);
  const [walkinTokenResult, setWalkinTokenResult] = useState(null);

  const portalTheme = DOCTOR_PORTAL_THEMES[activeDoctorFilter] || DOCTOR_PORTAL_THEMES.vikas;

  // Filter appointments by active doctor
  const filteredAppointments = useMemo(() => {
    const doctorName = DOCTOR_PORTAL_THEMES[activeDoctorFilter]?.name;
    if (!doctorName) return appointments;
    return appointments.filter(apt => apt.doctor === doctorName);
  }, [appointments, activeDoctorFilter]);

  // Hooks
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, subscribe: subscribePush } = usePushNotifications();
  const btSpeaker = useBluetoothSpeaker();
  const { isConnected: wsConnected, lastUpdate: wsLastUpdate, reconnect: wsReconnect } = useAppointmentWebSocket({
    portal: 'diagyn_staff', clinic: selectedClinic, date: selectedDate,
    enabled: isAuthenticated && activeView === 'appointments', showToasts: true,
    onNewAppointment: (apt) => {
      if (apt.clinic === selectedClinic && apt.date === selectedDate) {
        setAppointments(prev => {
          const exists = prev.some(a => a.id === apt.id || a.booking_id === apt.booking_id);
          if (exists) return prev;
          return [apt, ...prev];
        });
        successPattern();
      }
    },
    onStatusChange: (apt) => {
      setAppointments(prev => prev.map(a =>
        (a.id === apt.id || a.booking_id === apt.booking_id)
          ? { ...a, ...apt, token_number: apt.token_number || a.token_number }
          : a
      ));
    }
  });

  // ============ Printer functions ============
  const connectPrinter = async () => {
    mediumTap();
    if (!navigator.bluetooth) { toast.error('Bluetooth not supported.'); errorPattern(); return; }
    toast.loading('Select your printer...', { id: 'printer', duration: 30000 });
    try {
      const result = await thermalPrinter.connect();
      if (result.success) {
        setPrinterConnected(true); setPrinterName(result.deviceName);
        toast.success(`Connected: ${result.deviceName}`, { id: 'printer' }); successPattern();
        thermalPrinter.startAutoReconnect(
          (name) => { setPrinterConnected(true); setPrinterName(name); toast.success(`Reconnected: ${name}`); successPattern(); },
          () => { setPrinterConnected(false); toast.info('Printer disconnected'); }
        );
      } else {
        toast.error(result.error?.includes('User cancelled') ? 'Cancelled.' : (result.error || 'Failed'), { id: 'printer' });
        errorPattern();
      }
    } catch (error) { toast.error('Bluetooth error: ' + error.message, { id: 'printer' }); errorPattern(); }
  };

  const printToken = async (tokenData) => {
    if (!printerConnected) { toast.error('Connect printer first'); return false; }
    setIsPrinting(true);
    try {
      const result = await thermalPrinter.printToken(tokenData);
      if (result.success) { toast.success(`Token #${tokenData.token_number} printed!`); successPattern(); return true; }
      else { toast.error(`Print failed: ${result.error}`); return false; }
    } catch { toast.error('Print error'); return false; }
    finally { setIsPrinting(false); }
  };

  const printTokenBrowser = (tokenData) => {
    if (!tokenData) return;
    const w = window.open('', '_blank', 'width=300,height=500');
    if (!w) { toast.error('Allow pop-ups to print'); return; }
    w.document.write(`<html><head><title>Token ${tokenData.token_number}</title>
      <style>@page{margin:0;size:80mm auto}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;width:80mm;padding:4mm;text-align:center}.divider{border-top:1px dashed #000;margin:6px 0}.token-num{font-size:48px;font-weight:900;letter-spacing:2px;margin:8px 0}.clinic{font-size:14px;font-weight:700;margin-bottom:4px}.label{font-size:10px;color:#666;text-transform:uppercase}.value{font-size:13px;font-weight:700;margin-bottom:6px}.footer{font-size:9px;color:#999;margin-top:8px}</style></head><body>
      <div class="clinic">NEVIKA CURA</div><div style="font-size:11px">${tokenData.clinic}</div><div class="divider"></div>
      <div class="label">TOKEN NUMBER</div><div class="token-num">${tokenData.token_number}</div><div class="divider"></div>
      <div class="label">Patient</div><div class="value">${tokenData.patient_name}</div>
      <div class="label">Doctor</div><div class="value">${tokenData.doctor}</div>
      <div class="label">Time</div><div class="value">${tokenData.time}</div>
      <div class="label">Date</div><div class="value">${tokenData.date}</div><div class="divider"></div>
      <div class="label">Booking ID</div><div style="font-size:11px;font-weight:600">${tokenData.booking_id}</div>
      <div class="footer">Thank you for visiting Nevika Cura<br>Please wait for your token to be called</div>
      <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
  };

  const smartPrintToken = async (tokenData) => {
    if (printerConnected) await printToken(tokenData);
    else printTokenBrowser(tokenData);
  };

  // ============ Effects ============
  useEffect(() => { const i = setInterval(() => setCurrentSession(getCurrentSession()), 15000); return () => clearInterval(i); }, []);
  useEffect(() => { axios.get(`${API}/api/clinic-override/active`).then(res => setClinicOverrides(res.data.overrides || [])).catch(() => {}); }, []);
  useEffect(() => {
    const html = document.documentElement; const body = document.body; const app = document.querySelector('.App');
    html.setAttribute('data-portal', 'pharmacy'); body.setAttribute('data-portal', 'pharmacy');
    if (app) { app.style.backgroundColor = '#FAFAF8'; app.style.paddingBottom = '0'; }
    return () => { html.removeAttribute('data-portal'); body.removeAttribute('data-portal'); if (app) { app.style.backgroundColor = ''; app.style.paddingBottom = ''; } };
  }, []);
  useEffect(() => {
    const saved = thermalPrinter.getSavedPrinter();
    if (saved && navigator.bluetooth) {
      thermalPrinter.startAutoReconnect(
        (name) => { setPrinterConnected(true); setPrinterName(name); toast.success(`Reconnected: ${name}`); successPattern(); },
        () => { setPrinterConnected(false); toast.info('Printer disconnected'); }
      );
      if (!printerConnected) setPrinterName(saved.name + ' (saved)');
    }
    return () => thermalPrinter.stopAutoReconnect();
  }, [printerConnected]);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const info = localStorage.getItem('staffInfo');
    const expiry = localStorage.getItem('staffLoginExpiry');
    if (expiry && new Date().getTime() > parseInt(expiry)) {
      localStorage.removeItem('staffToken'); localStorage.removeItem('staffInfo'); localStorage.removeItem('staffLoginExpiry');
      setAuthChecked(true); return;
    }
    if (token && info) {
      try {
        const staffData = JSON.parse(info);
        const allowedRoles = ['diagyn_staff', 'clinic_staff_pushpa', 'clinic_staff_amnion', 'admin', 'super_admin'];
        const dept = staffData.department?.toLowerCase() || '';
        const staffRole = (staffData.role || '').toLowerCase();
        const isDoctor = staffRole.includes('doctor');
        const isAllowed = !isDoctor && (allowedRoles.includes(staffData.role) || dept.includes('diagyn') || dept.includes('clinic'));
        if (isDoctor) navigate('/doctor', { replace: true });
        else if (isAllowed) { setStaffInfo(staffData); setIsAuthenticated(true); }
        else navigate('/staff');
      } catch { localStorage.removeItem('staffToken'); localStorage.removeItem('staffInfo'); localStorage.removeItem('staffLoginExpiry'); }
    }
    setAuthChecked(true);
  }, [navigate]);

  const handleLogout = () => {
    heavyTap(); localStorage.removeItem('staffToken'); localStorage.removeItem('staffInfo'); localStorage.removeItem('staffLoginExpiry');
    setIsAuthenticated(false); toast.success('Logged out');
  };

  // ============ Data Loading ============
  useEffect(() => {
    if (isAuthenticated && pushSupported && !pushSubscribed) {
      const token = localStorage.getItem('staffToken');
      subscribePush(token, 'diagyn_staff');
    }
  }, [isAuthenticated, pushSupported, pushSubscribed, subscribePush]);

  const loadConfig = useCallback(async () => {
    try { const res = await axios.get(`${API}/api/diagyn-staff/config`, getAuthHeaders()); setConfig(res.data); }
    catch (error) { console.error('Config error:', error); }
  }, []);

  const loadAppointments = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await axios.get(`${API}/api/diagyn-staff/appointments/by-date`, { params: { date: selectedDate, clinic: selectedClinic }, ...getAuthHeaders() });
      setAppointments(res.data.appointments || []); setSummary(res.data.summary || {});
    } catch (error) {
      if (error.response?.status === 401 && error.response?.data?.detail === 'Session expired') { handleLogout(); toast.error('Session expired'); }
    }
    setRefreshing(false);
  }, [selectedDate, selectedClinic]);

  const loadSummaries = useCallback(async () => {
    try {
      const [daily, weekly] = await Promise.all([
        axios.get(`${API}/api/diagyn-staff/summary/daily`, { params: { date: selectedDate, clinic: selectedClinic }, ...getAuthHeaders() }),
        axios.get(`${API}/api/diagyn-staff/summary/weekly`, { params: { clinic: selectedClinic }, ...getAuthHeaders() })
      ]);
      setDailySummary(daily.data); setWeeklySummary(weekly.data);
    } catch (error) { console.error('Summary error:', error); }
  }, [selectedDate, selectedClinic]);

  const fetchReviewStats = useCallback(async () => {
    try { const res = await axios.get(`${API}/api/diagyn-staff/review-stats`, { params: { clinic: selectedClinic, date: selectedDate }, ...getAuthHeaders() }); setReviewStats(res.data); }
    catch { /* noop */ }
  }, [selectedClinic, selectedDate]);

  const loadCalendarData = useCallback(async () => {
    try {
      const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
      const promises = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        promises.push(
          axios.get(`${API}/api/diagyn-staff/appointments/by-date`, { params: { date: dateStr, clinic: selectedClinic }, ...getAuthHeaders() })
            .then(res => ({ date: dateStr, count: (res.data.appointments || []).length, appointments: res.data.appointments || [] }))
            .catch(() => ({ date: dateStr, count: 0, appointments: [] }))
        );
      }
      setCalendarData(await Promise.all(promises));
    } catch (error) { console.error('Calendar data error:', error); }
  }, [calendarMonth, calendarYear, selectedClinic]);

  const loadWalkinSlots = useCallback(async () => {
    if (!selectedDoctor || !currentSession) { setAvailableSlots([]); return; }
    setLoadingSlots(true);
    try {
      const res = await axios.get(`${API}/api/diagyn-staff/slots/available`, { params: { clinic: selectedClinic, doctor: selectedDoctor, date: getISTDate(), mode: 'walkin' }, ...getAuthHeaders() });
      setAvailableSlots(res.data.available_slots || []);
    } catch (error) {
      setAvailableSlots([]);
      if (error?.response?.status === 401) { handleLogout(); toast.error('Session expired'); }
      else toast.error('Could not load slots');
    }
    setLoadingSlots(false);
  }, [selectedDoctor, selectedClinic, currentSession]);

  const loadBookingSlots = useCallback(async () => {
    if (!selectedDoctor || !bookingDate) { setAvailableSlots([]); return; }
    setLoadingSlots(true);
    try {
      const res = await axios.get(`${API}/api/diagyn-staff/slots/available`, { params: { clinic: selectedClinic, doctor: selectedDoctor, date: bookingDate, mode: 'book' }, ...getAuthHeaders() });
      setAvailableSlots(res.data.available_slots || []);
    } catch { setAvailableSlots([]); }
    setLoadingSlots(false);
  }, [selectedDoctor, selectedClinic, bookingDate]);

  useEffect(() => { if (isAuthenticated) { loadConfig(); loadAppointments(); } }, [isAuthenticated, loadConfig, loadAppointments]);
  useEffect(() => { if (isAuthenticated && activeView === 'summary') loadSummaries(); }, [isAuthenticated, activeView, loadSummaries]);
  useEffect(() => { if (isAuthenticated && activeView === 'appointments') fetchReviewStats(); }, [isAuthenticated, activeView, fetchReviewStats]);
  useEffect(() => { if (isAuthenticated && activeView === 'walkin' && selectedDoctor) loadWalkinSlots(); }, [isAuthenticated, activeView, selectedDoctor, loadWalkinSlots]);
  useEffect(() => { if (isAuthenticated && activeView === 'book' && selectedDoctor && bookingDate) loadBookingSlots(); }, [isAuthenticated, activeView, selectedDoctor, bookingDate, loadBookingSlots]);
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      if (activeView === 'appointments') loadAppointments();
      if (activeView === 'walkin' && selectedDoctor) loadWalkinSlots();
      if (activeView === 'book' && selectedDoctor && bookingDate) loadBookingSlots();
      setCurrentSession(getCurrentSession());
    }, wsConnected ? 20000 : 8000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeView, loadAppointments, loadWalkinSlots, loadBookingSlots, selectedDoctor, bookingDate, wsConnected]);
  useEffect(() => { if (isAuthenticated && activeView === 'appointments' && appointmentViewMode === 'calendar') loadCalendarData(); }, [isAuthenticated, activeView, appointmentViewMode, calendarMonth, calendarYear, loadCalendarData]);

  // Archives
  const loadArchives = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingArchives(true);
    try {
      const istNow = getISTNow(); const todayIST = istNow.toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(istNow.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await axios.get(`${API}/api/diagyn-staff/appointments`, { params: { clinic: selectedClinic, start_date: thirtyDaysAgo, end_date: todayIST }, ...getAuthHeaders() });
      const all = res.data.appointments || [];
      setArchivedAppointments(all.filter(apt => {
        const d = apt.date || apt.appointment_date;
        return (apt.status === 'Completed' || apt.status === 'Cancelled' || apt.status === 'completed' || apt.status === 'cancelled') && d < todayIST;
      }));
    } catch { setArchivedAppointments([]); }
    setLoadingArchives(false);
  }, [isAuthenticated, selectedClinic]);
  useEffect(() => { if (isAuthenticated && showArchives) loadArchives(); }, [isAuthenticated, showArchives, loadArchives]);

  const recentCheckIns = useMemo(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return appointments.filter(apt => apt.checked_in_at && new Date(apt.checked_in_at) > oneHourAgo).length;
  }, [appointments]);

  // ============ Actions ============
  const lookupPatient = async () => {
    if (!patientMobile || patientMobile.length < 10) { errorPattern(); toast.error('Enter 10-digit mobile'); return; }
    setSearchingPatient(true); mediumTap();
    try {
      const res = await axios.post(`${API}/api/diagyn-staff/patient/lookup`, { mobile: patientMobile }, getAuthHeaders());
      if (res.data.found) { setFoundPatient(res.data.patient); setPatientName(res.data.patient.name); setPatientId(res.data.patient.id); successPattern(); toast.success(`Found: ${res.data.patient.name}`); }
      else { setFoundPatient(null); setPatientId(null); toast.info('New patient - enter name'); }
    } catch { errorPattern(); toast.error('Search failed'); }
    setSearchingPatient(false);
  };

  const lookupPatientHistory = async () => {
    if (!historyPhone || historyPhone.length < 10) { errorPattern(); toast.error('Enter 10-digit mobile'); return; }
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API}/api/clinic/patient-history/${historyPhone}`, getAuthHeaders());
      setHistoryData(res.data); if (!res.data.patient) toast.info('No patient found'); else successPattern();
    } catch { errorPattern(); toast.error('Failed to fetch history'); }
    setHistoryLoading(false);
  };

  const updateAnc = (field, value) => setAncForm(prev => ({ ...prev, [field]: value }));

  const submitAncRegistration = async () => {
    if (!ancForm.patient_name || !ancForm.phone || !ancForm.husband_name || !ancForm.lmp || !ancForm.address) {
      errorPattern(); toast.error('Fill required fields: Name, Phone, Husband Name, LMP, Address'); return;
    }
    setAncSubmitting(true);
    try {
      const regPayload = {
        ...ancForm, age: parseInt(ancForm.age) || 0, gravida: parseInt(ancForm.gravida) || 1,
        para: parseInt(ancForm.para) || 0, abortion: parseInt(ancForm.abortion) || 0, living: parseInt(ancForm.living) || 0,
        weight_kg: ancForm.weight_kg ? parseFloat(ancForm.weight_kg) : null,
        height_cm: ancForm.height_cm ? parseFloat(ancForm.height_cm) : null,
        registered_by: staffInfo?.username || 'staff',
      };
      const res = await axios.post(`${API}/api/anc/register`, regPayload, getAuthHeaders());
      await axios.post(`${API}/api/clinic/anc-send-email`, regPayload, getAuthHeaders());
      if (res.data.success) { successPattern(); setAncResult(res.data); toast.success(`Registered: ${res.data.registration_id}. Email sent!`); }
      else { toast.error(res.data.message || 'Registration failed'); if (res.data.existing_id) setAncResult({ registration_id: res.data.existing_id, existing: true }); }
    } catch (err) { errorPattern(); toast.error(err?.response?.data?.detail || 'Registration failed'); }
    setAncSubmitting(false);
  };

  const resetAncForm = () => {
    setAncForm({ patient_name: '', age: '', phone: '', address: '', aadhaar: '', husband_name: '', husband_phone: '', husband_occupation: '',
      lmp: '', gravida: 1, para: 0, abortion: 0, living: 0, blood_group: '', rh_factor: 'Positive', weight_kg: '', height_cm: '',
      previous_cesarean: false, diabetes: false, hypertension: false, thyroid: false, other_conditions: '', doctor_assigned: '', clinic: 'Pushpa Clinic' });
    setAncResult(null);
  };

  const handleBooking = async (type) => {
    if (!patientName || !patientMobile) { errorPattern(); toast.error('Enter patient name & mobile'); return; }
    if (!selectedDoctor) { errorPattern(); toast.error('Select doctor'); return; }
    if (type === 'SCHEDULED' && !selectedSlot) { errorPattern(); toast.error('Select a time slot'); return; }
    const dateToUse = type === 'SCHEDULED' ? bookingDate : getISTDate();
    setLoading(true); heavyTap();
    try {
      const res = await axios.post(`${API}/api/diagyn-staff/appointments/book`, {
        clinic: selectedClinic, doctor: selectedDoctor, date: dateToUse,
        time: (type === 'EMERGENCY' || !selectedSlot) ? null : selectedSlot,
        patient_name: patientName, patient_mobile: patientMobile, patient_id: patientId, appointment_type: type
      }, getAuthHeaders());
      if (res.data.success) {
        successPattern();
        if (res.data.token_data) {
          // Show token card for both walk-in and emergency
          setWalkinTokenResult(res.data.token_data);
          toast.success(`Token #${res.data.token_data.token_number} assigned to ${res.data.token_data.patient_name}`);
          // Auto-print token immediately
          smartPrintToken(res.data.token_data);
        } else { toast.success(`Booked: ${res.data.booking_id}`); resetBookingForm(); setActiveView('appointments'); }
        loadAppointments();
      }
    } catch (error) { errorPattern(); toast.error(error.response?.data?.detail || 'Booking failed'); }
    setLoading(false);
  };

  const resetBookingForm = () => {
    setSelectedDoctor(''); setBookingDate(''); setSelectedSlot(''); setPatientName(''); setPatientMobile('');
    setPatientId(null); setFoundPatient(null); setAvailableSlots([]); setIsEmergency(false); setHistoryData(null); setHistoryPhone('');
  };

  const switchToView = (view) => {
    selectionTap(); setActiveView(view); resetBookingForm();
    if (view === 'book') { const t = new Date(getISTNow()); t.setDate(t.getDate() + 1); setBookingDate(t.toISOString().split('T')[0]); }
    if (view === 'walkin' && !currentSession) setIsEmergency(true);
  };

  const getDoctorsForClinic = () => {
    if (!config?.doctor_schedule) return [];
    return Object.keys(config.doctor_schedule).filter(d => config.doctor_schedule[d][selectedClinic]);
  };

  // Status Updates
  const handleCheckIn = (appointment) => { setVerifyingAppointment(appointment); setShowCodeVerification(true); };
  const onCodeVerified = async () => {
    if (!verifyingAppointment) return;
    setShowCodeVerification(false); successPattern(); toast.success('Code verified!');
    await updateStatus(verifyingAppointment.id, 'CheckedIn'); setVerifyingAppointment(null);
  };
  const skipVerificationAndCheckIn = async () => {
    if (!verifyingAppointment) return;
    setShowCodeVerification(false); toast.info('Skipped verification');
    await updateStatus(verifyingAppointment.id, 'CheckedIn'); setVerifyingAppointment(null);
  };

  const updateStatus = async (appointmentId, newStatus) => {
    heavyTap();
    try {
      const res = await axios.put(`${API}/api/diagyn-staff/appointments/${appointmentId}/status`, { status: newStatus }, getAuthHeaders());
      if (newStatus === 'CheckedIn' && res.data.token_data) {
        toast.success(`Token #${res.data.token_data.token_number} assigned!`);
        if (printerConnected) await printToken(res.data.token_data);
        else toast.info(`Token #${res.data.token_data.token_number}`, { duration: 5000 });
      } else toast.success(newStatus);
      successPattern(); loadAppointments();
    } catch { errorPattern(); toast.error('Update failed'); }
  };

  const reprintToken = async (apt) => {
    if (!printerConnected) { toast.error('Connect printer first'); return; }
    await printToken({ token_number: apt.token_number, patient_name: apt.patient_name, clinic: apt.clinic,
      clinic_address: config?.clinics?.[apt.clinic]?.address || '', slot_time: apt.time || 'Emergency',
      date: apt.date, booking_id: apt.booking_id, appointment_type: apt.appointment_type || 'SCHEDULED' });
  };

  const printBill = async (apt) => {
    if (!printerConnected) { toast.error('Connect printer first'); return; }
    const feeCode = apt.doctor_fee_code || apt.fee_code;
    const rawScans = apt.doctor_scan_codes || apt.scan_codes || [];
    const feeDetails = config?.fee_codes?.[apt.doctor]?.[feeCode] || { label: feeCode, amount: 0 };
    const scanDetails = rawScans.map(s => typeof s === 'string'
      ? { code: s, label: config?.scan_fees?.[s]?.label || s, amount: config?.scan_fees?.[s]?.amount || 0 }
      : s);
    setIsPrinting(true);
    try {
      const result = await thermalPrinter.printBill({
        clinic: apt.clinic,
        booking_id: apt.booking_id,
        patient_name: apt.patient_name,
        patient_mobile: apt.patient_phone || apt.patient_mobile || apt.mobile || apt.phone || '',
        doctor: apt.doctor,
        fee_code: feeCode,
        fee_details: feeDetails,
        scan_codes: scanDetails,
        medicine_amount: apt.medicine_amount || 0,
        misc_amount: apt.misc_amount || 0,
        total_amount: apt.total_amount || 0,
        payment_method: apt.payment_method || 'cash',
      });
      if (result.success) { toast.success('Bill printed!'); successPattern(); }
      else { toast.error(`Print failed: ${result.error}`); errorPattern(); }
    } catch { toast.error('Print error'); errorPattern(); }
    finally { setIsPrinting(false); }
  };

  const sendReviewRequest = async (apt) => {
    const phone = apt.patient_phone || apt.patient_mobile;
    if (!phone) { toast.error('No phone number'); return; }
    try {
      const res = await axios.post(`${API}/api/diagyn-staff/whatsapp/send-review-request`, null, {
        params: { whatsapp_number: phone, patient_name: apt.patient_name || 'Patient', clinic_name: apt.clinic || selectedClinic, doctor_name: apt.doctor || 'Doctor' },
        ...getAuthHeaders()
      });
      if (res.data.success) {
        toast.success('Review request sent!'); successPattern();
        setAppointments(prev => prev.map(a => a.booking_id === apt.booking_id ? { ...a, review_request_sent: true } : a));
        fetchReviewStats();
      } else { toast.error(res.data.error || 'Failed'); errorPattern(); }
    } catch { toast.error('Failed to send review request'); errorPattern(); }
  };

  const handleCheckInByCode = async () => {
    if (!bookingCodeInput || bookingCodeInput.length < 3) { errorPattern(); toast.error('Enter at least 3 characters'); return; }
    setCheckingInByCode(true); setCodeCheckInResult(null); heavyTap();
    try {
      const res = await axios.post(`${API}/api/diagyn-staff/check-in/by-code`, { booking_code: bookingCodeInput.trim().toUpperCase(), clinic: selectedClinic }, getAuthHeaders());
      if (res.data.success) {
        successPattern(); toast.success(`Checked in: ${res.data.appointment?.patient_name} - Token #${res.data.token_number}`);
        setCodeCheckInResult({ success: true, ...res.data });
        if (printerConnected && res.data.token_data) await printToken(res.data.token_data);
        setBookingCodeInput(''); loadAppointments();
      } else {
        errorPattern(); setCodeCheckInResult({ success: false, error: res.data.error, message: res.data.message, appointment: res.data.appointment });
        toast.error(res.data.message || 'Check-in failed');
      }
    } catch (error) {
      errorPattern(); const msg = error.response?.data?.detail || 'No appointment found';
      toast.error(msg); setCodeCheckInResult({ success: false, error: 'not_found', message: msg });
    }
    setCheckingInByCode(false);
  };

  // ============ Context Value ============
  const contextValue = useMemo(() => ({
    // State
    staffInfo, loading, refreshing, selectedClinic, activeDoctorFilter, activeView, selectedDate, appointmentViewMode,
    calendarData, calendarMonth, calendarYear, config, appointments, filteredAppointments, summary, dailySummary, weeklySummary,
    currentSession, selectedDoctor, bookingDate, selectedSlot, patientName, patientMobile, patientId,
    availableSlots, loadingSlots, isEmergency, foundPatient, searchingPatient, reviewStats,
    printerConnected, printerName, isPrinting, bookingCodeInput, checkingInByCode, codeCheckInResult,
    historyPhone, historyData, historyLoading, showArchives, archivedAppointments, loadingArchives,
    ancForm, ancSubmitting, ancResult, walkinTokenResult,
    // Setters
    setSelectedDate, setAppointmentViewMode, setCalendarMonth, setCalendarYear, setSelectedDoctor, setActiveDoctorFilter,
    setBookingDate, setSelectedSlot, setPatientName, setPatientMobile, setIsEmergency,
    setBookingCodeInput, setHistoryPhone, setShowArchives, setWalkinTokenResult,
    // Helpers
    getDayName, getISTDate, getMaxBookingDate, getSessionLabel, getDoctorsForClinic, portalTheme,
    // Actions
    loadAppointments, loadWalkinSlots, loadBookingSlots, loadCalendarData, lookupPatient,
    lookupPatientHistory, updateAnc, submitAncRegistration, resetAncForm, handleBooking,
    resetBookingForm, handleCheckIn, updateStatus, reprintToken, printBill, printToken,
    smartPrintToken, sendReviewRequest, handleCheckInByCode,
    sessionFilter, setSessionFilter,
  }), [staffInfo, loading, refreshing, selectedClinic, activeDoctorFilter, activeView, selectedDate, appointmentViewMode,
    calendarData, calendarMonth, calendarYear, config, appointments, filteredAppointments, summary, dailySummary, weeklySummary,
    currentSession, sessionFilter, selectedDoctor, bookingDate, selectedSlot, patientName, patientMobile, patientId,
    availableSlots, loadingSlots, isEmergency, foundPatient, searchingPatient, reviewStats,
    printerConnected, printerName, isPrinting, bookingCodeInput, checkingInByCode, codeCheckInResult,
    historyPhone, historyData, historyLoading, showArchives, archivedAppointments, loadingArchives,
    ancForm, ancSubmitting, ancResult, walkinTokenResult,
    loadAppointments, loadWalkinSlots, loadBookingSlots, loadCalendarData, lookupPatient,
    lookupPatientHistory, submitAncRegistration, handleBooking, handleCheckIn, updateStatus,
    reprintToken, printBill, sendReviewRequest, handleCheckInByCode, getDoctorsForClinic]);

  // ============ Auth Guard ============
  if (!authChecked) return (
    <div className="min-h-screen" style={{ background: '#1a1a2e' }}>
      <div className="space-y-4 px-4 pt-16">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />)}
      </div>
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/staff" replace />;

  // ============ Render ============
  return (
    <StaffContext.Provider value={contextValue}>
      <div className="min-h-screen" style={{ background: COLORS.bgDark }}>
        <style>{`
          /* 1. Avatar pulse ring */
          @keyframes avatarPulseRing { 0% { box-shadow: 0 0 0 0 var(--ring-color); } 70% { box-shadow: 0 0 0 6px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
          .avatar-pulse { animation: avatarPulseRing 2s ease-out infinite; }
          @keyframes avatarScaleUp { from { transform: scale(0.85); opacity: 0.5; } to { transform: scale(1); opacity: 1; } }
          .avatar-scale { animation: avatarScaleUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }

          /* 3. Doctor card slide-in */
          @keyframes doctorCardBounce { 0% { transform: translateY(8px) scale(0.95); opacity: 0; } 60% { transform: translateY(-2px) scale(1.02); } 100% { transform: translateY(0) scale(1); opacity: 1; } }
          .doctor-card-bounce { animation: doctorCardBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }

          /* 4. Clinic toggle slide indicator */
          @keyframes clinicSlideIn { from { transform: scaleX(0.3); opacity: 0; } to { transform: scaleX(1); opacity: 1; } }
          .clinic-slide-active { animation: clinicSlideIn 0.35s cubic-bezier(0.22,1,0.36,1) both; }

          /* 5. Icon tap glow */
          @keyframes iconTapGlow { 0% { box-shadow: 0 0 0 0 var(--glow-color); } 50% { box-shadow: 0 0 12px 3px var(--glow-color); } 100% { box-shadow: 0 0 0 0 transparent; } }
          .icon-glow:active { animation: iconTapGlow 0.4s ease-out; }
          .icon-glow { transition: transform 0.15s ease; }
          .icon-glow:active { transform: scale(0.88); }

          /* 6. Staggered cascade reveal */
          @keyframes statCascade { from { opacity: 0; transform: translateY(16px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
          .stat-cascade { animation: statCascade 0.45s cubic-bezier(0.22,1,0.36,1) both; }

          /* 8. Queue insights pulse */
          @keyframes queuePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
          .queue-pulse { animation: queuePulse 0.6s ease-in-out; }

          /* 9. New appointment slide-in */
          @keyframes appointmentSlideIn { 0% { transform: translateX(60px); opacity: 0; } 60% { transform: translateX(-4px); } 100% { transform: translateX(0); opacity: 1; } }
          @keyframes highlightFlash { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); } 40% { box-shadow: 0 0 16px 4px rgba(34,197,94,0.3); } 100% { box-shadow: 0 0 0 0 transparent; } }
          .appointment-new { animation: appointmentSlideIn 0.5s cubic-bezier(0.22,1,0.36,1) both, highlightFlash 1.2s ease-out 0.3s both; }

          /* 10. Status change ripple */
          @keyframes statusRipple { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
          @keyframes statusShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          .status-ripple-container { position: relative; overflow: hidden; }
          .status-changed { animation: statusShimmer 1s ease-out; background-size: 200% 100%; background-image: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%); }

          /* Existing animations */
          @keyframes staffCardEntry { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }
          .staff-card-anim { animation: staffCardEntry 0.35s cubic-bezier(0.22,1,0.36,1) both; }
          @keyframes staffCheckInFlash { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); } 50% { box-shadow: 0 0 0 8px rgba(34,197,94,0); } 100% { box-shadow: none; } }
          .staff-checkin-flash { animation: staffCheckInFlash 0.8s ease-out; }
          @keyframes staffStatPop { from { opacity:0; transform: scale(0.85); } to { opacity:1; transform: scale(1); } }
          .staff-stat-anim { animation: staffStatPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }
          @keyframes staffBillingPulse { 0%,100% { border-color: rgba(249,115,22,0.3); } 50% { border-color: rgba(249,115,22,0.7); } }
          .staff-billing-pulse { animation: staffBillingPulse 1.5s ease-in-out infinite; }
          @keyframes staffTokenRipple { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
          @keyframes staffTabSlide { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
          .staff-tab-anim { animation: staffTabSlide 0.25s ease-out; }
        `}</style>
        {/* Header — Doctor-themed */}
        {(() => {
          const dt = portalTheme;
          const isDark = dt.isDark;
          return (
        <header className="sticky top-0 z-50 overflow-hidden" style={{
          background: dt.headerBg,
          transition: 'all 0.4s ease',
          borderRadius: '0 0 24px 24px',
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.2)' : '0 8px 32px rgba(0,0,0,0.08)',
        }}>
          {/* Accent bar */}
          <div style={{ height: 3, background: dt.accentBar }} />

          <div className="px-4 py-3">
            {/* Row 1: Brand + Icons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 relative">
                <div className="rounded-xl p-1.5" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.3)' }}>
                  <img src="/diagyn_logo.svg" alt="DiaGyn" className="h-8 object-contain" data-testid="header-logo" />
                </div>
                <p className="text-xs font-semibold tracking-wide" style={{ color: dt.headerText === '#FFFFFF' ? 'rgba(255,255,255,0.8)' : `${dt.headerText}80` }}>Staff Portal</p>
              </div>
              <div className="flex items-center gap-1">
                <PortalSwitcher currentPortal="diagyn" iconColor={dt.headerIconColor} />
                <button onClick={() => { lightTap(); if (!wsConnected && wsReconnect) { wsReconnect(); toast.info('Reconnecting...'); } }}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all active:scale-95"
                  style={{ background: dt.statusBg(wsConnected), color: dt.statusColor(wsConnected) }}
                  data-testid="ws-status-btn">
                  {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                </button>
                <Button variant="ghost" size="sm" onClick={connectPrinter}
                  className="h-8 px-2 rounded-xl"
                  style={{ background: printerConnected ? (isDark ? 'rgba(139,195,74,0.15)' : 'rgba(255,255,255,0.35)') : 'transparent', color: printerConnected ? (isDark ? '#8BC34A' : '#15803D') : dt.headerIconColor }} disabled={isPrinting}
                  data-testid="thermal-connect-btn" title="Thermal Printer">
                  {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                </Button>
                <BluetoothSpeakerIndicator connected={btSpeaker.connected} deviceName={btSpeaker.deviceName} scanning={btSpeaker.scanning}
                  scanResults={btSpeaker.scanResults} autoConnectEnabled={btSpeaker.autoConnectEnabled}
                  onScan={btSpeaker.scan} onConnectDevice={btSpeaker.connectDevice} onDisconnect={btSpeaker.disconnect} onToggleAutoConnect={btSpeaker.toggleAutoConnect} />
                <LiveSyncBadge portal="diagyn" staffId={staffInfo?.id} />
                <Button variant="ghost" size="sm" onClick={() => { lightTap(); loadAppointments(); }} className="h-8 w-8 p-0 rounded-xl icon-glow" style={{ color: dt.headerIconColor, '--glow-color': isDark ? 'rgba(139,195,74,0.4)' : 'rgba(255,255,255,0.5)' }} disabled={refreshing} data-testid="refresh-btn">
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="h-8 w-8 p-0 rounded-xl icon-glow" style={{ color: dt.headerIconColor, '--glow-color': isDark ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.5)' }} data-testid="logout-btn">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Connection Status — compact inline */}
            {(printerConnected || btSpeaker.connected || (!printerConnected && printerName)) && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {printerConnected && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs" style={{ background: isDark ? 'rgba(139,195,74,0.12)' : 'rgba(255,255,255,0.4)', border: isDark ? '1px solid rgba(139,195,74,0.2)' : '1px solid rgba(255,255,255,0.5)' }}>
                    <Printer className="w-3 h-3" style={{ color: isDark ? '#8BC34A' : '#15803D' }} />
                    <span className="font-medium" style={{ color: isDark ? '#8BC34A' : '#15803D' }}>{printerName?.split(' (')[0]}</span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: isDark ? '#8BC34A' : '#22C55E' }} />
                  </div>
                )}
                {!printerConnected && printerName && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs" style={{ background: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <Bluetooth className="w-3 h-3 animate-pulse" style={{ color: '#FBBF24' }} />
                    <span className="font-medium" style={{ color: '#FBBF24' }}>Reconnecting...</span>
                  </div>
                )}
                {btSpeaker.connected && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs" style={{ background: isDark ? 'rgba(232,245,233,0.08)' : 'rgba(255,255,255,0.4)', border: isDark ? '1px solid rgba(232,245,233,0.15)' : '1px solid rgba(255,255,255,0.5)' }}>
                    <Volume2 className="w-3 h-3" style={{ color: isDark ? '#E8F5E9' : '#004D40' }} />
                    <span className="font-medium" style={{ color: isDark ? '#E8F5E9' : '#004D40' }}>{btSpeaker.deviceName}</span>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: isDark ? '#8BC34A' : '#00897B' }} />
                  </div>
                )}
              </div>
            )}

            {/* Clinic Toggle */}
            <div className="mt-3">
              {[
                { name: 'Pushpa Clinic', label: 'Pushpa' },
              ].map(clinic => (
                <button key={clinic.name}
                  onClick={() => { selectionTap(); setSelectedClinic(clinic.name); resetBookingForm(); }}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 shadow-md clinic-slide-active`}
                  style={{ background: dt.clinicActiveBg, color: dt.clinicActiveText, borderColor: dt.clinicActiveBorder }}
                  data-testid={`clinic-${clinic.label.toLowerCase()}`}>
                  <img src="/diagyn_logo.svg" alt="" className="w-5 h-5 rounded" />
                  {clinic.label}
                </button>
              ))}
            </div>

            {/* Doctor Cards */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {Object.entries(DOCTOR_PORTAL_THEMES).map(([key, docTheme]) => {
                const isActive = activeDoctorFilter === key;
                const doctorCount = appointments.filter(a => a.doctor === docTheme.name).length;
                const checkedIn = appointments.filter(a => a.doctor === docTheme.name && a.status === 'CheckedIn').length;
                return (
                  <button key={key}
                    onClick={() => { selectionTap(); setActiveDoctorFilter(key); }}
                    className={`rounded-2xl overflow-hidden transition-all text-left ${isActive ? 'shadow-lg doctor-card-bounce' : ''}`}
                    style={{
                      background: isActive ? dt.cardActiveBg : dt.cardInactiveBg,
                      backdropFilter: isDark ? 'none' : 'blur(12px)',
                      WebkitBackdropFilter: isDark ? 'none' : 'blur(12px)',
                      boxShadow: isActive ? '0 8px 24px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.05)',
                      border: isActive ? `2px solid ${docTheme.cardBorder}` : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                      opacity: isActive ? 1 : 0.7,
                    }}
                    data-testid={`doctor-filter-${key}`}>
                    {/* Doctor accent band */}
                    <div className="px-3 py-1.5 flex items-center gap-1.5" style={{ background: `${docTheme.accent}15` }}>
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: docTheme.accent }}>
                        {selectedClinic.replace(' Clinic', '')}
                      </span>
                    </div>
                    {/* Doctor body with avatar */}
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <img src={docTheme.avatar} alt={docTheme.short}
                          className={`w-9 h-9 rounded-full ${isActive ? 'avatar-pulse avatar-scale' : ''}`}
                          style={{ '--ring-color': `${docTheme.accent}60`, boxShadow: isActive ? `0 0 0 2.5px ${docTheme.accent}` : '0 0 0 1px rgba(0,0,0,0.1)' }} />
                        <div>
                          <p className="text-xs font-bold" style={{ color: '#1E293B' }}>{docTheme.short}</p>
                          <p className="text-[9px]" style={{ color: '#64748B' }}>
                            {doctorCount} today · {checkedIn} waiting
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </header>
          );
        })()}

        {/* Dashboard Summary — Yellow Hero + Glassmorphism */}
        {summary && activeView === 'appointments' && (
          <div className="px-4 py-3" style={{ background: COLORS.bgDark }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: portalTheme.accent }}>Today's Dashboard</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide p-3 rounded-2xl" style={{
              background: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(0,0,0,0.04)',
            }}>
              {[
                { label: 'Booked', count: summary.booked || 0, gradient: 'linear-gradient(135deg, #0D9488, #0F766E)', color: '#FFFFFF' },
                { label: 'Waiting', count: summary.checked_in || 0, gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#FFFFFF' },
                { label: 'With Dr', count: summary.with_doctor || 0, gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: '#FFFFFF' },
                { label: 'Billing', count: summary.billing_pending || appointments.filter(a => a.status === 'billing_pending').length, gradient: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#FFFFFF' },
                { label: 'Done', count: summary.completed || 0, gradient: 'linear-gradient(135deg, #22C55E, #16A34A)', color: '#FFFFFF' },
                { label: 'Reviews', count: reviewStats.today || 0, gradient: 'linear-gradient(135deg, #EC4899, #DB2777)', color: '#FFFFFF' },
                { label: 'Recent', count: recentCheckIns, gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: '#FFFFFF' },
              ].map((stat, i) => (
                <div key={stat.label} className="stat-cascade flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl min-w-[56px]"
                  style={{ background: stat.gradient, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', animationDelay: `${i * 80}ms` }}>
                  <CountUp end={stat.count} duration={900 + i * 100} className="text-base font-black" style={{ color: stat.color }} />
                  <span className="text-[9px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Billing Timer */}
        <div className="px-4 pt-2" style={{ background: COLORS.bgDark }}>
          <BillingTimerPanel token={localStorage.getItem('staffToken')} clinic={selectedClinic} />
        </div>

        {/* Queue Insights */}
        {activeView === 'appointments' && (
          <div className="px-4 pt-2" style={{ background: COLORS.bgDark }}>
            <QueueInsightsWidget token={localStorage.getItem('staffToken')} clinic={selectedClinic} date={selectedDate} />
          </div>
        )}

        {/* 30+ Minute Wait Alert — staff view (no Ready to Consult button) */}
        {activeView === 'appointments' && (
          <LongWaitAlert
            appointments={appointments}
            thresholdMinutes={30}
            portalType="staff"
          />
        )}

        {/* Clinic Overrides */}
        {clinicOverrides.length > 0 && (
          <div className="px-4 pt-2" style={{ background: COLORS.bgDark }}>
            {clinicOverrides.map((ov, i) => (
              <div key={i} className="p-3 rounded-xl flex items-start gap-2.5 mb-1.5"
                style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))', border: '1px solid rgba(251,191,36,0.3)' }}
                data-testid={`staff-override-notice-${i}`}>
                <ArrowLeftRight className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#F59E0B' }} />
                <div>
                  <p className="text-xs font-bold" style={{ color: '#92400E' }}>Clinic Switch — {ov.date} ({ov.session})</p>
                  <p className="text-xs mt-0.5" style={{ color: '#78716C' }}>
                    {ov.doctor_name}: <span className="line-through">{ov.original_clinic_name}</span> → <span className="font-bold" style={{ color: '#059669' }}>{ov.override_clinic_name}</span>
                    {ov.reason && ov.reason !== 'Doctor preference' ? ` — ${ov.reason}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation Tabs — Glassmorphism */}
        <div className="px-4 py-3" style={{ background: COLORS.bgDark }}>
          <div className="grid grid-cols-5 gap-1.5 p-1.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.04)' }}>
            {[
              { id: 'appointments', icon: Calendar, label: 'Today', color: '#3B82F6' },
              { id: 'checkin', icon: CheckCircle2, label: 'Code', color: '#10B981' },
              { id: 'walkin', icon: Users, label: 'Walk-in', color: '#F59E0B' },
              { id: 'book', icon: CalendarPlus, label: 'Book', color: '#8B5CF6' },
              { id: 'qrscan', icon: QrCode, label: 'QR Scan', color: '#14B8A6' },
              { id: 'anc', icon: Baby, label: 'ANC', color: '#EC4899' },
              { id: 'history', icon: ClipboardList, label: 'History', color: '#06B6D4' },
              { id: 'token', icon: Volume2, label: 'Token', color: '#EF4444' },
              { id: 'summary', icon: TrendingUp, label: 'Summary', color: '#F97316' },
            ].map(tab => (
              <button key={tab.id} onClick={() => switchToView(tab.id)}
                className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl font-medium transition-all staff-tab-anim ${activeView === tab.id ? 'shadow-md' : ''}`}
                style={activeView === tab.id ? { background: tab.color, color: '#FFFFFF' } : { color: COLORS.textMuted }}
                data-testid={`nav-${tab.id}`}>
                <tab.icon className="w-4 h-4" style={activeView !== tab.id ? { color: tab.color } : {}} />
                <span className="text-[10px]">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Views */}
        <PortalErrorBoundary name="Staff Portal">
        <main className="p-4 pb-20">
          {activeView === 'appointments' && <StaffAppointmentsView />}
          {activeView === 'checkin' && <StaffCheckinView />}
          {activeView === 'walkin' && <StaffWalkinView />}
          {activeView === 'book' && <StaffBookView />}
          {activeView === 'qrscan' && <StaffQRScanView />}
          {activeView === 'anc' && <StaffANCView />}
          {activeView === 'history' && <StaffHistoryView />}
          {activeView === 'token' && <StaffTokenView />}
          {activeView === 'summary' && <StaffSummaryView />}

          {/* Code Verification Modal */}
          {showCodeVerification && verifyingAppointment && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCodeVerification(false)}>
              <div className="rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" style={{ background: COLORS.cream }} onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 flex items-center justify-between" style={{ background: COLORS.gold + '20' }}>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5" style={{ color: COLORS.gold }} />
                    <span className="font-bold" style={{ color: COLORS.textDark }}>Check-in Verification</span>
                  </div>
                  <button onClick={() => setShowCodeVerification(false)} className="p-1 rounded-full hover:bg-white/50">
                    <X className="w-5 h-5" style={{ color: COLORS.textMuted }} />
                  </button>
                </div>
                <div className="px-5 py-3 border-b" style={{ borderColor: COLORS.creamDark }}>
                  <p className="font-bold" style={{ color: COLORS.textDark }}>{verifyingAppointment.patient_name}</p>
                  <div className="flex items-center gap-3 text-xs mt-1" style={{ color: COLORS.textMuted }}>
                    <span>{verifyingAppointment.booking_id}</span>
                    <span>{verifyingAppointment.time}</span>
                    <span>{verifyingAppointment.doctor}</span>
                  </div>
                </div>
                <div className="p-5">
                  <CodeVerificationInput bookingId={verifyingAppointment.booking_id || verifyingAppointment.id}
                    bookingType="diagyn" verifierId={staffInfo?.username} verifierRole="staff"
                    onVerified={onCodeVerified} onError={() => errorPattern()} />
                </div>
                <div className="px-5 pb-5">
                  <button onClick={skipVerificationAndCheckIn}
                    className="w-full py-2 text-sm transition-colors rounded-xl hover:bg-white/10" style={{ color: COLORS.textMuted }}>
                    Skip verification (Use 0000 or Walk-in/Emergency)
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
        </PortalErrorBoundary>

        {/* FAB — Fan shaped, transparent background */}
        {fabOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setFabOpen(false)} />
        )}
        <div className="fixed bottom-0 right-0 z-50" style={{ width: fabOpen ? 220 : 80, height: fabOpen ? 220 : 80, transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
          {/* Arc icons — positioned along quarter circle */}
          {fabOpen && (
            <>
              {/* Walk-in — bottom-left arc position */}
              <div className="absolute flex items-center gap-2" style={{ bottom: 28, right: 160 }}>
                <span className="text-[11px] font-bold text-white whitespace-nowrap px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.75)' }}>Walk-in</span>
                <button onClick={() => { heavyTap(); setFabOpen(false); switchToView('walkin'); }}
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 16px rgba(59,130,246,0.4)' }}
                  data-testid="fab-walkin">
                  <Users className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Emergency — diagonal arc position */}
              <div className="absolute flex items-center gap-2" style={{ bottom: 110, right: 110 }}>
                <span className="text-[11px] font-bold text-white whitespace-nowrap px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.75)' }}>Emergency</span>
                <button onClick={() => { heavyTap(); setFabOpen(false); setIsEmergency(true); switchToView('walkin'); }}
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90"
                  style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 4px 16px rgba(239,68,68,0.4)' }}
                  data-testid="fab-emergency">
                  <Zap className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Appointment — top arc position */}
              <div className="absolute flex items-center gap-2" style={{ bottom: 160, right: 28 }}>
                <span className="text-[11px] font-bold text-white whitespace-nowrap px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.75)' }}>Book</span>
                <button onClick={() => { heavyTap(); setFabOpen(false); switchToView('book'); }}
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', boxShadow: '0 4px 16px rgba(139,92,246,0.4)' }}
                  data-testid="fab-book">
                  <CalendarPlus className="w-5 h-5 text-white" />
                </button>
              </div>
            </>
          )}

          {/* Main FAB button — bottom right corner */}
          <button onClick={() => { selectionTap(); setFabOpen(!fabOpen); }}
            className="absolute bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 hover:shadow-xl"
            style={{ background: fabOpen ? 'linear-gradient(135deg, #EF4444, #DC2626)' : portalTheme.fabGradient, boxShadow: fabOpen ? '0 4px 20px rgba(239,68,68,0.4)' : portalTheme.fabShadow }}
            data-testid="fab-diagyn-staff">
            {fabOpen
              ? <X className="w-6 h-6 text-white" />
              : <Plus className="w-6 h-6" style={{ color: portalTheme.fabIcon }} />
            }
          </button>
        </div>
      </div>
    </StaffContext.Provider>
  );
};

export default DiaGynStaffPortal;
