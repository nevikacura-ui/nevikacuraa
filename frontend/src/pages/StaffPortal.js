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
  Heart, Droplet, Scan, Upload, FileText, Receipt, History, X, Gift,
  IndianRupee, Fingerprint, Baby, Activity
} from 'lucide-react';
import StaffBillingModule from '@/components/StaffBillingModule';
import ANCRegistration from '@/components/ANCRegistration';
import GlydexStaffPortal from '@/components/GlydexStaffPortal';
import StaffDashboard from '@/components/StaffDashboard';

// Import refactored utilities and components
import StaffLogin from './staff/StaffLogin';
import SmartBiometric from './staff/SmartBiometric';
import { 
  API, CLINICS, DOCTOR_SCHEDULES, FEE_CODES, SCAN_FEES,
  getIndianDate, getDayName, getAvailableTimeSlots, 
  getStatusColor, getAuthHeaders, generateTimeSlots 
} from './staff/staffUtils';

const StaffPortal = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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
  
  // Doctor multi-clinic states
  const [doctorClinics, setDoctorClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState('');
  
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
  
  // Patient history modal states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [patientHistory, setPatientHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Loyalty points states
  const [loyaltyPhone, setLoyaltyPhone] = useState('');
  const [loyaltyUser, setLoyaltyUser] = useState(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState('');
  const [loyaltyReason, setLoyaltyReason] = useState('');
  const [addingPoints, setAddingPoints] = useState(false);
  
  // Booked slots state for slot synchronization
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Doctor appointment completion states
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionAppointment, setCompletionAppointment] = useState(null);
  const [completionForm, setCompletionForm] = useState({
    fee_code: '',
    scan_codes: [], // Array of selected scan codes
    follow_up_days: '',
    notes: ''
  });
  const [completingAppointment, setCompletingAppointment] = useState(false);
  
  // Clinic staff - completed appointments view
  const [completedAppointments, setCompletedAppointments] = useState([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  
  // Daily collection summary
  const [dailyCollection, setDailyCollection] = useState(null);
  const [loadingCollection, setLoadingCollection] = useState(false);
  
  // Active tab state for optimized data loading
  const [activeTab, setActiveTab] = useState('appointments');

  // Sonography booking states
  const [showSonographyModal, setShowSonographyModal] = useState(false);
  const [sonographyBookings, setSonographyBookings] = useState([]);
  const [loadingSonography, setLoadingSonography] = useState(false);
  const [sonographyForm, setSonographyForm] = useState({
    patient_name: '',
    age: '',
    lmp: '',
    mobile_number: '',
    date_of_birth: '',
    husband_name: '',
    address: '',
    has_children: false,
    children: [],
    booking_date: getIndianDate(),
    booking_time: '',
    clinic: '',
    scan_type: '',
    notes: ''
  });
  const [bookingSonography, setBookingSonography] = useState(false);
  const [selectedSonographyBooking, setSelectedSonographyBooking] = useState(null);

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
      
      // Set doctor clinics if available (for doctors working at multiple clinics)
      if (parsedInfo.doctor_clinics && parsedInfo.doctor_clinics.length > 0) {
        setDoctorClinics(parsedInfo.doctor_clinics);
        setSelectedClinic(parsedInfo.doctor_clinics[0]); // Default to first clinic
      }
      
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

  // Helper to check clinic staff roles
  const isClinicStaff = (role) => ['clinic_staff_pushpa', 'clinic_staff_amnion', 'super_admin'].includes(role);
  const isDoctor = (role) => ['doctor', 'doctor_pushpa', 'doctor_amnion', 'super_admin'].includes(role);

  // Optimized data loading - only fetch what's needed based on active tab and role
  const loadAppointmentsData = async () => {
    const role = staffInfo?.role;
    try {
      if (isClinicStaff(role)) {
        const res = await axios.get(`${API}/staff/clinic/appointments?date=${selectedDate}`, getAuthHeaders());
        setAppointments(res.data.appointments || []);
        setEmergencyCounts(res.data.emergency_counts || {});
        
        // Load available tests for add-on services (only once)
        if (Object.keys(availableTests).length === 0) {
          try {
            const testsRes = await axios.get(`${API}/staff/diagnostic-tests`, getAuthHeaders());
            setAvailableTests(testsRes.data.tests || {});
          } catch (err) {
            console.log('Could not load diagnostic tests');
          }
        }
      }
      
      if (isDoctor(role)) {
        let url = `${API}/staff/doctor/appointments?date=${selectedDate}`;
        if (selectedClinic) {
          url += `&clinic=${encodeURIComponent(selectedClinic)}`;
        }
        const res = await axios.get(url, getAuthHeaders());
        setAppointments(res.data.appointments || []);
        
        if (res.data.doctor_clinics && res.data.doctor_clinics.length > 0) {
          setDoctorClinics(res.data.doctor_clinics);
        }
      }
    } catch (error) {
      console.error('Load appointments error:', error);
    }
  };

  const loadPharmacyData = async () => {
    try {
      const res = await axios.get(`${API}/staff/pharmacy/orders?date=${pharmacyDate}`, getAuthHeaders());
      setPharmacyOrders(res.data.orders || []);
      setPharmacyDateCounts(res.data.date_counts || {});
    } catch (error) {
      console.error('Load pharmacy error:', error);
    }
  };

  const loadDiagnosticsData = async () => {
    try {
      const res = await axios.get(`${API}/staff/diagnostic/orders?date=${diagnosticDate}`, getAuthHeaders());
      setDiagnosticOrders(res.data.orders || []);
      setDiagnosticDateCounts(res.data.date_counts || {});
      
      // Load service-linked orders
      const serviceRes = await axios.get(`${API}/staff/diagnostic/service-orders`, getAuthHeaders());
      setServiceOrders(serviceRes.data.orders || []);
      
      // Load available tests (only once)
      if (Object.keys(availableTests).length === 0) {
        const testsRes = await axios.get(`${API}/staff/diagnostic-tests`, getAuthHeaders());
        setAvailableTests(testsRes.data.tests || {});
      }
    } catch (error) {
      console.error('Load diagnostics error:', error);
    }
  };

  const loadData = async (showRefreshIndicator = false, tabOverride = null) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    const role = staffInfo?.role;
    const currentTab = tabOverride || activeTab;
    
    try {
      // Only load data for the active tab to reduce API calls and lag
      if (currentTab === 'appointments' && (isClinicStaff(role) || isDoctor(role))) {
        await loadAppointmentsData();
        if (isClinicStaff(role)) {
          fetchDailyCollection();
        }
      } else if (currentTab === 'pharmacy' && (role === 'pharmacy_staff' || role === 'super_admin')) {
        await loadPharmacyData();
      } else if (currentTab === 'diagnostics' && (role === 'diagnostics_staff' || role === 'super_admin')) {
        await loadDiagnosticsData();
      } else {
        // For initial load or super_admin, load based on role but only active tab
        if (isClinicStaff(role) || isDoctor(role)) {
          await loadAppointmentsData();
          if (isClinicStaff(role)) {
            fetchDailyCollection();
          }
        }
        if ((role === 'pharmacy_staff' || role === 'super_admin') && currentTab === 'pharmacy') {
          await loadPharmacyData();
        }
        if ((role === 'diagnostics_staff' || role === 'super_admin') && currentTab === 'diagnostics') {
          await loadDiagnosticsData();
        }
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    loadData(true);
    toast.success('Data refreshed!');
  };

  // Load data when tab changes
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    loadData(true, newTab);
  };

  useEffect(() => {
    if (isAuthenticated && staffInfo) {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, staffInfo]);

  // Reload appointments when date or clinic changes
  useEffect(() => {
    if (isAuthenticated && staffInfo && activeTab === 'appointments') {
      loadAppointmentsData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedClinic]);

  // Reload pharmacy when date changes
  useEffect(() => {
    if (isAuthenticated && staffInfo && activeTab === 'pharmacy') {
      loadPharmacyData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacyDate]);

  // Reload diagnostics when date changes
  useEffect(() => {
    if (isAuthenticated && staffInfo && activeTab === 'diagnostics') {
      loadDiagnosticsData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagnosticDate]);

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
        role: res.data.staff?.role || res.data.role,
        name: res.data.staff?.name || res.data.name,
        doctor_name: res.data.doctor_name,
        clinic: res.data.staff?.clinic || res.data.clinic,
        doctor_clinics: res.data.doctor_clinics || [],
        access_modules: res.data.staff?.access_modules || []
      };
      localStorage.setItem('staffInfo', JSON.stringify(staffData));
      setStaffInfo(staffData);
      
      // Set doctor clinics if available
      if (res.data.doctor_clinics && res.data.doctor_clinics.length > 0) {
        setDoctorClinics(res.data.doctor_clinics);
        setSelectedClinic(res.data.doctor_clinics[0]); // Default to first clinic
      }
      
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
          clinic: res.data.staff?.clinic || res.data.clinic,
          doctor: clinicDoctors[0] || ''
        }));
      }
      
      setIsAuthenticated(true);
      toast.success(`Welcome, ${res.data.staff?.name || res.data.name}!`);
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

  // Open completion modal (for doctors only)
  const openCompletionModal = (appointment) => {
    setCompletionAppointment(appointment);
    setCompletionForm({ fee_code: '', scan_codes: [], follow_up_days: '', notes: '' });
    setShowCompletionModal(true);
  };

  // Calculate total fee including scans
  const calculateTotalFee = () => {
    let total = 0;
    if (completionForm.fee_code && FEE_CODES[completionForm.fee_code]) {
      total += FEE_CODES[completionForm.fee_code].amount;
    }
    if (completionForm.scan_codes && completionForm.scan_codes.length > 0) {
      completionForm.scan_codes.forEach(code => {
        if (SCAN_FEES[code]) {
          total += SCAN_FEES[code].amount;
        }
      });
    }
    return total;
  };

  // Toggle scan selection
  const toggleScanCode = (code) => {
    setCompletionForm(prev => {
      const current = prev.scan_codes || [];
      if (current.includes(code)) {
        return { ...prev, scan_codes: current.filter(c => c !== code) };
      } else {
        return { ...prev, scan_codes: [...current, code] };
      }
    });
  };

  // Doctor completes appointment with fee code and follow-up
  const handleDoctorCompleteAppointment = async () => {
    if (!completionForm.fee_code) {
      toast.error('Please select a fee code');
      return;
    }
    
    const totalFee = calculateTotalFee();
    
    setCompletingAppointment(true);
    try {
      const response = await axios.put(
        `${API}/staff/appointments/${completionAppointment.id}/doctor-complete`,
        {
          fee_code: completionForm.fee_code,
          scan_codes: completionForm.scan_codes || [],
          total_fee: totalFee,
          follow_up_days: completionForm.follow_up_days ? parseInt(completionForm.follow_up_days) : null,
          notes: completionForm.notes || null
        },
        getAuthHeaders()
      );
      
      toast.success(`Appointment completed! Total Fee: ₹${totalFee}`);
      if (response.data.follow_up_date) {
        toast.success(`Follow-up scheduled for ${response.data.follow_up_date}`);
      }
      setShowCompletionModal(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to complete appointment');
    }
    setCompletingAppointment(false);
  };

  // Fetch completed appointments for clinic staff (real-time sync)
  const fetchCompletedAppointments = async () => {
    setLoadingCompleted(true);
    try {
      const res = await axios.get(`${API}/staff/clinic/completed-appointments`, {
        params: { date: selectedDate },
        ...getAuthHeaders()
      });
      setCompletedAppointments(res.data.appointments || []);
    } catch (error) {
      console.error('Failed to fetch completed appointments:', error);
    }
    setLoadingCompleted(false);
  };

  // Fetch daily collection summary
  const fetchDailyCollection = async () => {
    setLoadingCollection(true);
    try {
      const res = await axios.get(`${API}/staff/clinic/daily-collection`, {
        params: { date: selectedDate },
        ...getAuthHeaders()
      });
      setDailyCollection(res.data);
    } catch (error) {
      console.error('Failed to fetch daily collection:', error);
    }
    setLoadingCollection(false);
  };

  const handleCompleteAppointment = async (appointmentId) => {
    // For doctors, open the completion modal
    const role = staffInfo?.role;
    if (role === 'doctor' || role === 'doctor_pushpa' || role === 'doctor_amnion') {
      const appt = appointments.find(a => a.id === appointmentId);
      if (appt) {
        openCompletionModal(appt);
      }
      return;
    }
    
    // For non-doctors, show error message
    toast.error('Only doctors can complete appointments. Fee code and follow-up are required.');
  };

  const fetchPatientHistory = async (phone) => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API}/staff/patient/history/${phone}`, getAuthHeaders());
      setPatientHistory(res.data);
      setShowHistoryModal(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load patient history');
    }
    setLoadingHistory(false);
  };

  // Sonography Booking Functions
  const fetchSonographyBookings = async () => {
    setLoadingSonography(true);
    try {
      const clinic = staffInfo?.clinic || '';
      const res = await axios.get(`${API}/staff/sonography/bookings`, {
        params: { date: selectedDate, clinic },
        ...getAuthHeaders()
      });
      setSonographyBookings(res.data.bookings || []);
    } catch (error) {
      console.error('Error fetching sonography bookings:', error);
    }
    setLoadingSonography(false);
  };

  const handleSonographySubmit = async (e) => {
    e.preventDefault();
    
    if (!sonographyForm.patient_name || !sonographyForm.mobile_number || !sonographyForm.lmp || !sonographyForm.husband_name) {
      toast.error('Please fill required fields: Name, Mobile, LMP, Husband Name');
      return;
    }
    
    setBookingSonography(true);
    try {
      const res = await axios.post(`${API}/staff/sonography/book`, {
        ...sonographyForm,
        clinic: sonographyForm.clinic || staffInfo?.clinic || 'Pushpa Clinic'
      }, getAuthHeaders());
      
      if (res.data.success) {
        toast.success(`Sonography booked for ${sonographyForm.patient_name}`);
        setShowSonographyModal(false);
        setSonographyForm({
          patient_name: '',
          age: '',
          lmp: '',
          mobile_number: '',
          date_of_birth: '',
          husband_name: '',
          address: '',
          has_children: false,
          children: [],
          booking_date: getIndianDate(),
          booking_time: '',
          clinic: '',
          scan_type: '',
          notes: ''
        });
        fetchSonographyBookings();
      } else {
        toast.error(res.data.error || 'Failed to book sonography');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Booking failed');
    }
    setBookingSonography(false);
  };

  const addChild = () => {
    setSonographyForm(prev => ({
      ...prev,
      children: [...prev.children, { gender: '', age: '' }]
    }));
  };

  const removeChild = (index) => {
    setSonographyForm(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index)
    }));
  };

  const updateChild = (index, field, value) => {
    setSonographyForm(prev => ({
      ...prev,
      children: prev.children.map((child, i) => 
        i === index ? { ...child, [field]: value } : child
      )
    }));
  };

  const updateSonographyStatus = async (bookingId, status) => {
    try {
      const res = await axios.put(`${API}/staff/sonography/booking/${bookingId}/status?status=${status}`, {}, getAuthHeaders());
      if (res.data.success) {
        toast.success(`Status updated to ${status}`);
        fetchSonographyBookings();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Prefill sonography form from appointment
  const openSonographyFromAppointment = (appointment) => {
    setSonographyForm({
      patient_name: appointment.patient_name || '',
      age: '',
      lmp: '',
      mobile_number: appointment.patient_phone || '',
      date_of_birth: '',
      husband_name: '',
      address: '',
      has_children: false,
      children: [],
      booking_date: getIndianDate(),
      booking_time: '',
      clinic: appointment.clinic || staffInfo?.clinic || 'Pushpa Clinic',
      scan_type: '',
      notes: '',
      appointment_id: appointment.id
    });
    setShowSonographyModal(true);
  };

  // Loyalty Points Functions
  const searchLoyaltyUser = async () => {
    if (!loyaltyPhone || loyaltyPhone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    
    setLoyaltyLoading(true);
    setLoyaltyUser(null);
    
    try {
      const res = await axios.get(`${API}/loyalty-points/by-phone/${loyaltyPhone}`, getAuthHeaders());
      setLoyaltyUser(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to search user');
    }
    setLoyaltyLoading(false);
  };

  const handleAddLoyaltyPoints = async () => {
    const points = parseInt(loyaltyPoints);
    if (!points || points <= 0 || points > 500) {
      toast.error('Please enter points between 1-500');
      return;
    }
    
    if (!loyaltyUser?.found) {
      toast.error('User must be registered to earn loyalty points');
      return;
    }
    
    setAddingPoints(true);
    try {
      await axios.post(`${API}/staff/loyalty-points/add`, {
        phone: loyaltyPhone,
        points: points,
        reason: loyaltyReason || `${staffInfo?.role === 'pharmacy_staff' ? 'Pharmacy' : 'Diagnostic'} purchase`
      }, getAuthHeaders());
      
      toast.success(`Added ${points} loyalty points to ${loyaltyUser.user_name}`);
      setLoyaltyPoints('');
      setLoyaltyReason('');
      
      // Refresh user data
      searchLoyaltyUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add points');
    }
    setAddingPoints(false);
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

  // Patient History Modal Content
  const historyModalContent = patientHistory && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-teal-50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-teal-600" />
              Patient History
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">{patientHistory.patient_name}</span> • {patientHistory.patient_phone}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowHistoryModal(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Summary Cards */}
        <div className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-lg border text-center">
              <div className="text-2xl font-bold text-teal-600">{patientHistory.summary?.total_appointments || 0}</div>
              <div className="text-xs text-gray-500">Total Visits</div>
            </div>
            <div className="bg-white p-3 rounded-lg border text-center">
              <div className="text-2xl font-bold text-blue-600">{patientHistory.summary?.upcoming_appointments || 0}</div>
              <div className="text-xs text-gray-500">Upcoming</div>
            </div>
            <div className="bg-white p-3 rounded-lg border text-center">
              <div className="text-2xl font-bold text-purple-600">{patientHistory.summary?.total_diagnostic_orders || 0}</div>
              <div className="text-xs text-gray-500">Lab Tests</div>
            </div>
            <div className="bg-white p-3 rounded-lg border text-center">
              <div className="text-2xl font-bold text-orange-600">{patientHistory.summary?.total_pharmacy_orders || 0}</div>
              <div className="text-xs text-gray-500">Pharmacy</div>
            </div>
          </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Past Appointments */}
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Past Appointments ({patientHistory.past_appointments?.length || 0})
            </h3>
            {patientHistory.past_appointments?.length > 0 ? (
              <div className="space-y-2">
                {patientHistory.past_appointments.slice(0, 10).map((appt, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium">{appt.date}</span>
                        <span className="text-gray-500 mx-2">•</span>
                        <span>{appt.time || 'No time'}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(appt.status)}`}>
                        {appt.status}
                      </span>
                    </div>
                    <div className="text-gray-600 mt-1">
                      {appt.doctor} @ {appt.clinic}
                    </div>
                    {appt.appointment_type === 'EMERGENCY' && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">Emergency</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No past appointments</p>
            )}
          </div>
          
          {/* Diagnostic Orders */}
          {patientHistory.diagnostic_orders?.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                Lab Tests ({patientHistory.diagnostic_orders.length})
              </h3>
              <div className="space-y-2">
                {patientHistory.diagnostic_orders.slice(0, 5).map((order, idx) => (
                  <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-sm">
                    <div className="flex justify-between items-start">
                      <div className="font-medium">{order.tests?.slice(0, 3).join(', ')}{order.tests?.length > 3 ? ` +${order.tests.length - 3} more` : ''}</div>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">{order.status}</span>
                    </div>
                    <div className="text-gray-600 mt-1 text-xs">{order.preferred_date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Pharmacy Orders */}
          {patientHistory.pharmacy_orders?.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Pharmacy Orders ({patientHistory.pharmacy_orders.length})
              </h3>
              <div className="space-y-2">
                {patientHistory.pharmacy_orders.slice(0, 5).map((order, idx) => (
                  <div key={idx} className="p-3 bg-orange-50 rounded-lg border border-orange-100 text-sm">
                    <div className="flex justify-between items-start">
                      <div className="font-medium">{order.medicines?.length || 0} item{order.medicines?.length !== 1 ? 's' : ''}</div>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800">{order.status}</span>
                    </div>
                    <div className="text-gray-600 mt-1 text-xs">{order.created_at?.split('T')[0]}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <Button variant="outline" className="w-full" onClick={() => setShowHistoryModal(false)}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Service Modal - Rendered inline */}
      {showServiceModal && serviceModalContent}
      
      {/* Patient History Modal */}
      {showHistoryModal && historyModalContent}
      
      {/* Doctor Completion Modal */}
      {showCompletionModal && completionAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gradient-to-r from-green-500 to-emerald-600 rounded-t-lg flex-shrink-0">
              <h3 className="text-lg font-semibold text-white">Complete Appointment</h3>
              <p className="text-sm text-green-100">Patient: {completionAppointment?.patient_name} • {completionAppointment?.time}</p>
            </div>
            
            <div className="p-4 space-y-5 overflow-y-auto flex-1">
              {/* Fee Code Selection */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Select Consultation Fee *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(FEE_CODES).map(([code, info]) => (
                    <button
                      key={code}
                      onClick={() => setCompletionForm(prev => ({ ...prev, fee_code: code }))}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        completionForm.fee_code === code
                          ? 'border-green-500 bg-green-50 ring-2 ring-green-200 shadow-md'
                          : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${info.color}`}>{code}</span>
                        <span className="font-bold text-green-600">₹{info.amount}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{info.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scan/Ultrasound Fees Section - Dr. Neha OBGY */}
              {(staffInfo?.name?.toLowerCase().includes('neha') || completionAppointment?.doctor?.includes('Neha')) && (
                <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-4 border border-cyan-200">
                  <Label className="text-sm font-semibold mb-3 block text-cyan-800">
                    <Scan className="w-4 h-4 inline mr-2" />
                    Scan / Ultrasound Charges (Optional)
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(SCAN_FEES).map(([code, info]) => (
                      <button
                        key={code}
                        onClick={() => toggleScanCode(code)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          completionForm.scan_codes?.includes(code)
                            ? 'border-cyan-500 bg-cyan-100 ring-2 ring-cyan-300 shadow-md'
                            : 'border-gray-200 bg-white hover:border-cyan-300 hover:bg-cyan-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${info.color}`}>{code}</span>
                          <span className="font-bold text-cyan-700">₹{info.amount}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{info.label}</p>
                        {completionForm.scan_codes?.includes(code) && (
                          <CheckCircle2 className="w-4 h-4 text-cyan-600 absolute top-2 right-2" />
                        )}
                      </button>
                    ))}
                  </div>
                  {completionForm.scan_codes?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-cyan-200 flex justify-between items-center">
                      <span className="text-sm text-cyan-700">
                        {completionForm.scan_codes.length} scan(s) selected
                      </span>
                      <span className="font-bold text-cyan-800">
                        +₹{completionForm.scan_codes.reduce((sum, code) => sum + (SCAN_FEES[code]?.amount || 0), 0)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Total Amount Display */}
              {completionForm.fee_code && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-green-800">Total Amount</span>
                    <span className="text-2xl font-bold text-green-700">₹{calculateTotalFee()}</span>
                  </div>
                  <div className="mt-2 text-xs text-green-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Consultation ({completionForm.fee_code})</span>
                      <span>₹{FEE_CODES[completionForm.fee_code]?.amount || 0}</span>
                    </div>
                    {completionForm.scan_codes?.map(code => (
                      <div key={code} className="flex justify-between">
                        <span>{SCAN_FEES[code]?.label} ({code})</span>
                        <span>₹{SCAN_FEES[code]?.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Follow-up Selection */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Schedule Follow-up Visit</Label>
                
                {/* Quick Select Days */}
                <div className="flex gap-2 flex-wrap mb-3">
                  {[
                    { days: 7, label: '1 Week' },
                    { days: 14, label: '2 Weeks' },
                    { days: 21, label: '3 Weeks' },
                    { days: 30, label: '1 Month' },
                    { days: 60, label: '2 Months' },
                    { days: 90, label: '3 Months' }
                  ].map(({ days, label }) => (
                    <button
                      key={days}
                      onClick={() => setCompletionForm(prev => ({ ...prev, follow_up_days: days.toString() }))}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                        completionForm.follow_up_days === days.toString()
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                
                {/* Calendar Date Picker */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500">Or select specific date:</Label>
                    <Input
                      type="date"
                      min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                      value={completionForm.follow_up_days ? 
                        new Date(Date.now() + parseInt(completionForm.follow_up_days) * 86400000).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const selectedDate = new Date(e.target.value);
                        const today = new Date();
                        const diffDays = Math.ceil((selectedDate - today) / (1000 * 60 * 60 * 24));
                        setCompletionForm(prev => ({ ...prev, follow_up_days: diffDays.toString() }));
                      }}
                      className="mt-1"
                    />
                  </div>
                  {completionForm.follow_up_days && (
                    <div className="text-center bg-blue-50 px-4 py-2 rounded-lg">
                      <p className="text-xs text-blue-600">Follow-up in</p>
                      <p className="text-lg font-bold text-blue-700">{completionForm.follow_up_days} days</p>
                    </div>
                  )}
                </div>
                
                {/* No follow-up option */}
                <button
                  onClick={() => setCompletionForm(prev => ({ ...prev, follow_up_days: '' }))}
                  className={`mt-2 w-full px-3 py-2 rounded-lg border text-sm ${
                    !completionForm.follow_up_days
                      ? 'border-gray-400 bg-gray-100 text-gray-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  No follow-up needed
                </button>
              </div>
              
              {/* Notes */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Notes (Optional)</Label>
                <Input
                  placeholder="Any additional notes for this visit..."
                  value={completionForm.notes}
                  onChange={(e) => setCompletionForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex gap-3 rounded-b-lg flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowCompletionModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDoctorCompleteAppointment}
                disabled={!completionForm.fee_code || completingAppointment}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {completingAppointment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Complete (₹{calculateTotalFee()})
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {/* Pre-Sonography Booking Modal */}
      {showSonographyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-lg flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Scan className="w-5 h-5" />
                    Book Pre-Sonography
                  </h3>
                  <p className="text-sm text-purple-100">Fill patient details for sonography appointment</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowSonographyModal(false)} className="text-white hover:bg-white/20">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <form onSubmit={handleSonographySubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Personal Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-500" />
                  Patient Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Patient Name *</Label>
                    <Input
                      value={sonographyForm.patient_name}
                      onChange={(e) => setSonographyForm(prev => ({ ...prev, patient_name: e.target.value }))}
                      placeholder="Full name"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Age *</Label>
                    <Input
                      value={sonographyForm.age}
                      onChange={(e) => setSonographyForm(prev => ({ ...prev, age: e.target.value }))}
                      placeholder="e.g., 28"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">LMP (Last Menstrual Period) *</Label>
                    <Input
                      type="date"
                      value={sonographyForm.lmp}
                      onChange={(e) => setSonographyForm(prev => ({ ...prev, lmp: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Mobile Number *</Label>
                    <Input
                      value={sonographyForm.mobile_number}
                      onChange={(e) => setSonographyForm(prev => ({ ...prev, mobile_number: e.target.value }))}
                      placeholder="10-digit number"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Date of Birth</Label>
                    <Input
                      type="date"
                      value={sonographyForm.date_of_birth}
                      onChange={(e) => setSonographyForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Husband Name *</Label>
                    <Input
                      value={sonographyForm.husband_name}
                      onChange={(e) => setSonographyForm(prev => ({ ...prev, husband_name: e.target.value }))}
                      placeholder="Husband's full name"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Full Address *</Label>
                    <Input
                      value={sonographyForm.address}
                      onChange={(e) => setSonographyForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Complete address"
                    />
                  </div>
                </div>
              </div>
              
              {/* Children Info */}
              <div className="bg-pink-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-700 flex items-center gap-2">
                    <Baby className="w-4 h-4 text-pink-500" />
                    Children Information
                  </h4>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={sonographyForm.has_children}
                      onChange={(e) => setSonographyForm(prev => ({ 
                        ...prev, 
                        has_children: e.target.checked,
                        children: e.target.checked ? prev.children : []
                      }))}
                      className="rounded"
                    />
                    Has children?
                  </label>
                </div>
                
                {sonographyForm.has_children && (
                  <div className="space-y-2">
                    {sonographyForm.children.map((child, index) => (
                      <div key={index} className="flex items-center gap-2 bg-white p-2 rounded-lg">
                        <span className="text-xs text-gray-500 w-16">Child {index + 1}:</span>
                        <select
                          value={child.gender}
                          onChange={(e) => updateChild(index, 'gender', e.target.value)}
                          className="border rounded px-2 py-1 text-sm flex-1"
                        >
                          <option value="">Gender</option>
                          <option value="boy">Boy</option>
                          <option value="girl">Girl</option>
                        </select>
                        <Input
                          value={child.age}
                          onChange={(e) => updateChild(index, 'age', e.target.value)}
                          placeholder="Age"
                          className="w-20 text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChild(index)}
                          className="text-red-500 hover:bg-red-50 p-1"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addChild}
                      className="w-full border-dashed"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Child
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Booking Details */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  Booking Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Booking Date *</Label>
                    <Input
                      type="date"
                      value={sonographyForm.booking_date}
                      onChange={(e) => setSonographyForm(prev => ({ ...prev, booking_date: e.target.value }))}
                      min={getIndianDate()}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Booking Time *</Label>
                    <Input
                      type="time"
                      value={sonographyForm.booking_time}
                      onChange={(e) => setSonographyForm(prev => ({ ...prev, booking_time: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Clinic</Label>
                    <select
                      value={sonographyForm.clinic || staffInfo?.clinic || ''}
                      onChange={(e) => setSonographyForm(prev => ({ ...prev, clinic: e.target.value }))}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="Pushpa Clinic">Pushpa Clinic</option>
                      <option value="Amnion Clinic">Amnion Clinic</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-xs">Scan Type</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(SCAN_FEES).map(([code, info]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setSonographyForm(prev => ({ ...prev, scan_type: code }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          sonographyForm.scan_type === code
                            ? 'bg-purple-500 text-white'
                            : 'bg-white border border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        {code} - {info.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-xs">Notes</Label>
                  <Input
                    value={sonographyForm.notes}
                    onChange={(e) => setSonographyForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>
            </form>
            
            <div className="p-4 border-t bg-gray-50 flex gap-3 rounded-b-lg flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSonographyModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSonographySubmit}
                disabled={bookingSonography}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {bookingSonography ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Scan className="w-4 h-4 mr-2" />
                )}
                Book Sonography
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-base sm:text-lg">Staff Portal</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate max-w-[150px] sm:max-w-none">
                {staffInfo?.name} • {staffInfo?.clinic}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="bg-teal-50 border-teal-200 hover:bg-teal-100 text-teal-700 px-2 sm:px-3"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-1">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="px-2 sm:px-3">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Clinic Staff View */}
        {isClinicStaff(role) && (
          <Tabs defaultValue="dashboard" className="space-y-4" onValueChange={handleTabChange}>
            {/* Color-coded Module Tabs - Mobile optimized */}
            <TabsList className="h-auto p-1 bg-gray-100 rounded-xl overflow-x-auto flex-wrap justify-start">
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 sm:gap-2 w-full">
                <TabsTrigger 
                  value="dashboard" 
                  data-testid="tab-dashboard"
                  className="flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-3 rounded-lg text-[10px] sm:text-xs font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Home</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="appointments" 
                  data-testid="tab-appointments"
                  className="flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-3 rounded-lg text-[10px] sm:text-xs font-medium transition-all data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Appts</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="walkin" 
                  data-testid="tab-walkin"
                  className="flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-3 rounded-lg text-[10px] sm:text-xs font-medium transition-all data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Walk-in</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="emergency" 
                  data-testid="tab-emergency"
                  className="flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-3 rounded-lg text-[10px] sm:text-xs font-medium transition-all data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>SOS</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="billing" 
                  data-testid="tab-billing"
                  className="flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-3 rounded-lg text-[10px] sm:text-xs font-medium transition-all data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Bill</span>
                </TabsTrigger>
                
                {/* ANC Tab - Pink themed */}
                {staffInfo?.access_modules?.includes('anc') && (
                  <TabsTrigger 
                    value="anc" 
                    data-testid="tab-anc"
                    className="flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-3 rounded-lg text-[10px] sm:text-xs font-medium transition-all data-[state=active]:bg-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
                  >
                    <Baby className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>ANC</span>
                  </TabsTrigger>
                )}
                
                {/* Diabetes Tab - Purple themed */}
                {staffInfo?.access_modules?.includes('glydex') && (
                  <TabsTrigger 
                    value="glydex" 
                    data-testid="tab-glydex"
                    className="flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-3 rounded-lg text-[10px] sm:text-xs font-medium transition-all data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
                  >
                    <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Sugar</span>
                  </TabsTrigger>
                )}
                
                {/* Attendance Tab - Orange themed */}
                {staffInfo?.access_modules?.includes('attendance') && (
                  <TabsTrigger 
                    value="attendance" 
                    data-testid="tab-attendance"
                    className="flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-3 rounded-lg text-[10px] sm:text-xs font-medium transition-all data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
                  >
                    <Fingerprint className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Attend</span>
                  </TabsTrigger>
                )}
              </div>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard">
              <StaffDashboard 
                staffInfo={staffInfo}
                onNavigate={(tab) => {
                  const tabElement = document.querySelector(`[data-testid="tab-${tab}"]`);
                  if (tabElement) tabElement.click();
                }}
              />
            </TabsContent>

            <TabsContent value="appointments">
              <Card className="p-3 sm:p-4">
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
                
                {/* Daily Collection Summary */}
                {dailyCollection && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-green-800 flex items-center gap-2">
                        💰 Today&apos;s Collection
                      </h3>
                      <span className="text-2xl font-bold text-green-600">₹{dailyCollection.total_collection}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {dailyCollection.by_category?.general?.count > 0 && (
                        <div className="bg-white p-2 rounded-lg text-center">
                          <span className="text-xs text-gray-500">General</span>
                          <p className="font-bold text-gray-700">₹{dailyCollection.by_category.general.amount}</p>
                          <p className="text-xs text-gray-400">{dailyCollection.by_category.general.count} patients</p>
                        </div>
                      )}
                      {dailyCollection.by_category?.speciality?.count > 0 && (
                        <div className="bg-white p-2 rounded-lg text-center">
                          <span className="text-xs text-blue-500">Speciality</span>
                          <p className="font-bold text-blue-700">₹{dailyCollection.by_category.speciality.amount}</p>
                          <p className="text-xs text-gray-400">{dailyCollection.by_category.speciality.count} patients</p>
                        </div>
                      )}
                      {dailyCollection.by_category?.diabetes?.count > 0 && (
                        <div className="bg-white p-2 rounded-lg text-center">
                          <span className="text-xs text-purple-500">Diabetes</span>
                          <p className="font-bold text-purple-700">₹{dailyCollection.by_category.diabetes.amount}</p>
                          <p className="text-xs text-gray-400">{dailyCollection.by_category.diabetes.count} patients</p>
                        </div>
                      )}
                      {dailyCollection.by_category?.obgyn?.count > 0 && (
                        <div className="bg-white p-2 rounded-lg text-center">
                          <span className="text-xs text-pink-500">OBGY</span>
                          <p className="font-bold text-pink-700">₹{dailyCollection.by_category.obgyn.amount}</p>
                          <p className="text-xs text-gray-400">{dailyCollection.by_category.obgyn.count} patients</p>
                        </div>
                      )}
                    </div>
                    {dailyCollection.total_patients > 0 && (
                      <p className="text-xs text-green-600 mt-2 text-center">
                        {dailyCollection.total_patients} completed consultations
                      </p>
                    )}
                  </div>
                )}
                
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
                          {/* Book Sonography button - for clinic staff */}
                          {appt.status !== 'Completed' && appt.status !== 'Cancelled' && staffInfo?.role?.includes('clinic_staff') && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openSonographyFromAppointment(appt)}
                              className="border-purple-300 text-purple-600 hover:bg-purple-50"
                              data-testid={`book-sonography-${appt.id}`}
                            >
                              <Scan className="w-4 h-4 mr-1" />
                              Sonography
                            </Button>
                          )}
                          {(appt.status === 'Booked' || appt.status === 'pending') && (
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
                          {/* Staff can only see status - NO Complete button */}
                          {appt.status === 'In Clinic' && (
                            <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg text-sm flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              With Doctor
                            </span>
                          )}
                          {/* Show fee code when completed by doctor */}
                          {appt.status === 'Completed' && appt.fee_code && (
                            <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${FEE_CODES[appt.fee_code]?.color || 'bg-green-100 text-green-800'}`}>
                              {appt.fee_code} • ₹{appt.fee_amount}
                            </span>
                          )}
                          {appt.status === 'Completed' && appt.follow_up_date && (
                            <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Follow-up: {appt.follow_up_date}
                            </span>
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
                        min={getIndianDate()}
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
                        min={getIndianDate()}
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
            
            {/* Billing Tab Content */}
            <TabsContent value="billing">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-teal-600" />
                    {staffInfo?.clinic || 'Clinic'} - Staff Billing
                  </h2>
                </div>
                <StaffBillingModule 
                  staffInfo={staffInfo} 
                  getAuthHeaders={getAuthHeaders}
                />
              </Card>
            </TabsContent>

            {/* ANC Registration Tab Content */}
            {staffInfo?.access_modules?.includes('anc') && (
              <TabsContent value="anc">
                <ANCRegistration 
                  clinic={staffInfo?.clinic}
                  staffName={staffInfo?.name}
                  doctor={staffInfo?.name?.includes('Neha') ? 'Dr. Neha Patel' : 'Dr. Vikas Jha'}
                />
              </TabsContent>
            )}

            {/* Glydex (Diabetes) Tab Content */}
            {staffInfo?.access_modules?.includes('glydex') && (
              <TabsContent value="glydex">
                <GlydexStaffPortal 
                  staffName={staffInfo?.name}
                  clinic={staffInfo?.clinic}
                />
              </TabsContent>
            )}

            {/* Attendance Tab Content */}
            {staffInfo?.access_modules?.includes('attendance') && (
              <TabsContent value="attendance">
                <SmartBiometric 
                  clinic={staffInfo?.clinic?.toLowerCase().includes('pushpa') ? 'pushpa' : 
                          staffInfo?.clinic?.toLowerCase().includes('amnion') ? 'amnion' : 
                          staffInfo?.clinic?.toLowerCase().includes('pharmacy') ? 'pharmacy' : 'pushpa'}
                />
              </TabsContent>
            )}
          </Tabs>
        )}

        {/* Doctor View - Enhanced with Clinic Toggle, Calendar, and Specialty Tabs */}
        {isDoctor(role) && !isClinicStaff(role) && (
          <Tabs defaultValue="appointments" className="space-y-4">
            {/* Doctor Specialty Tabs based on role */}
            <TabsList className="h-auto p-1 bg-gray-100 rounded-xl flex-wrap justify-start">
              <TabsTrigger 
                value="appointments" 
                data-testid="doc-tab-appointments"
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-teal-500 data-[state=active]:text-white"
              >
                <Calendar className="w-4 h-4" />
                Appointments
              </TabsTrigger>
              
              {/* ANC Tab for Dr. Neha / OBGY doctors */}
              {(staffInfo?.name?.toLowerCase().includes('neha') || 
                staffInfo?.access_modules?.includes('anc') ||
                role === 'doctor_amnion') && (
                <TabsTrigger 
                  value="anc" 
                  data-testid="doc-tab-anc"
                  className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-pink-500 data-[state=active]:text-white"
                >
                  <Baby className="w-4 h-4" />
                  ANC Patients
                </TabsTrigger>
              )}
              
              {/* Diabetes/Glydex Tab for Dr. Vikas / Diabetes specialists */}
              {(staffInfo?.name?.toLowerCase().includes('vikas') || 
                staffInfo?.access_modules?.includes('glydex') ||
                staffInfo?.specialization?.toLowerCase().includes('diabetes')) && (
                <TabsTrigger 
                  value="glydex" 
                  data-testid="doc-tab-glydex"
                  className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-purple-500 data-[state=active]:text-white"
                >
                  <Activity className="w-4 h-4" />
                  Diabetes Patients
                </TabsTrigger>
              )}
              
              {/* Biometric Attendance for Doctors */}
              <TabsTrigger 
                value="biometric" 
                data-testid="doc-tab-biometric"
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-orange-500 data-[state=active]:text-white"
              >
                <Fingerprint className="w-4 h-4" />
                Attendance
              </TabsTrigger>
            </TabsList>

            {/* Appointments Tab Content */}
            <TabsContent value="appointments">
              <Card className="p-4">
                {/* Doctor Header with Clinic Toggle */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-teal-600" />
                      {staffInfo?.doctor_name || staffInfo?.name}&apos;s Appointments
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} for {selectedDate}
                    </p>
                  </div>
                  
                  {/* Clinic Toggle & Date Selector */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {/* Clinic Toggle - Only show if doctor works at multiple clinics */}
                    {doctorClinics.length > 0 && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Clinic:</label>
                        <select
                          value={selectedClinic}
                          onChange={(e) => setSelectedClinic(e.target.value)}
                          className="border rounded-lg px-3 py-1.5 text-sm bg-white min-w-[150px]"
                          data-testid="doctor-clinic-select"
                        >
                          <option value="">All Clinics</option>
                          {doctorClinics.map(clinic => (
                            <option key={clinic} value={clinic}>{clinic}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {/* Date Selector */}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-40"
                        data-testid="doctor-date-select"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Quick Date Navigation */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {[-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map(offset => {
                    const d = new Date();
                    d.setDate(d.getDate() + offset);
                    const dateStr = d.toISOString().split('T')[0];
                    const dayAppts = appointments.filter(a => a.date === dateStr);
                    const isSelected = dateStr === selectedDate;
                    const isToday = offset === 0;
                    const isPast = offset < 0;
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    return (
                      <button
                        key={offset}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`flex flex-col items-center px-3 py-2 rounded-lg min-w-[60px] transition-colors ${
                          isSelected 
                            ? 'bg-teal-600 text-white' 
                            : isToday
                            ? 'bg-teal-100 hover:bg-teal-200 border-2 border-teal-400'
                            : isPast
                            ? 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                        data-testid={`date-nav-${offset}`}
                      >
                        <span className="text-xs">{dayNames[d.getDay()]}</span>
                        <span className="font-semibold">{d.getDate()}</span>
                        {isToday && !isSelected && <span className="text-[10px] text-teal-600">Today</span>}
                        {dayAppts.length > 0 && (
                          <span className={`text-xs ${isSelected ? 'text-teal-100' : 'text-teal-600'}`}>
                            {dayAppts.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* Status Summary */}
                <div className="flex gap-4 mb-4 flex-wrap">
                  {['Booked', 'In Clinic', 'Completed'].map(status => {
                    const count = appointments.filter(a => a.status === status).length;
                    const colors = {
                  'Booked': 'bg-blue-100 text-blue-800 border-blue-200',
                  'In Clinic': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                  'Completed': 'bg-green-100 text-green-800 border-green-200'
                };
                return (
                  <div key={status} className={`px-3 py-1.5 rounded-lg border ${colors[status]} text-sm`}>
                    <span className="font-medium">{count}</span> {status}
                  </div>
                );
              })}
            </div>
            
            {/* Appointments List */}
            <div className="space-y-3">
              {appointments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No appointments for this date</p>
                  {selectedClinic && (
                    <p className="text-sm text-gray-400 mt-1">at {selectedClinic}</p>
                  )}
                </div>
              ) : (
                appointments.map((appt) => (
                  <div 
                    key={appt.id} 
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      appt.appointment_type === 'EMERGENCY' 
                        ? 'bg-red-50 border-red-300' 
                        : appt.status === 'Completed'
                        ? 'bg-green-50 border-green-200'
                        : appt.status === 'In Clinic'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-white border-gray-200'
                    }`}
                    data-testid={`appointment-${appt.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-lg">{appt.patient_name}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appt.status)}`}>
                          {appt.status}
                        </span>
                        {appt.appointment_type === 'EMERGENCY' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs bg-red-500 text-white flex items-center gap-1 font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            EMERGENCY
                          </span>
                        )}
                        {appt.booking_type === 'walk_in' && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800">Walk-in</span>
                        )}
                        {/* Show fee code if completed */}
                        {appt.fee_code && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${FEE_CODES[appt.fee_code]?.color || 'bg-gray-100'}`}>
                            {appt.fee_code} • ₹{appt.fee_amount}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1.5 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {appt.time || 'No time slot'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {appt.patient_phone}
                        </span>
                        {appt.clinic && (
                          <span className="flex items-center gap-1 text-teal-600">
                            <Stethoscope className="w-3.5 h-3.5" />
                            {appt.clinic}
                          </span>
                        )}
                        {/* Show follow-up date if set */}
                        {appt.follow_up_date && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Calendar className="w-3.5 h-3.5" />
                            Follow-up: {appt.follow_up_date}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => fetchPatientHistory(appt.patient_phone)} 
                        disabled={loadingHistory}
                        data-testid={`history-btn-${appt.id}`}
                      >
                        <History className="w-4 h-4 mr-1" />
                        History
                      </Button>
                      {appt.status === 'In Clinic' && (
                        <Button 
                          size="sm" 
                          onClick={() => openCompletionModal(appt)} 
                          className="bg-green-500 hover:bg-green-600"
                          data-testid={`complete-btn-${appt.id}`}
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

            {/* ANC Patients Tab - For Dr. Neha and OBGY doctors */}
            {(staffInfo?.name?.toLowerCase().includes('neha') || 
              staffInfo?.access_modules?.includes('anc') ||
              role === 'doctor_amnion') && (
              <TabsContent value="anc">
                <ANCRegistration 
                  clinic={staffInfo?.clinic}
                  staffName={staffInfo?.name}
                  doctor={staffInfo?.name || 'Dr. Neha Patel'}
                />
              </TabsContent>
            )}

            {/* Diabetes/Glydex Tab - For Dr. Vikas and Diabetes specialists */}
            {(staffInfo?.name?.toLowerCase().includes('vikas') || 
              staffInfo?.access_modules?.includes('glydex') ||
              staffInfo?.specialization?.toLowerCase()?.includes('diabetes')) && (
              <TabsContent value="glydex">
                <GlydexStaffPortal 
                  staffName={staffInfo?.name}
                  clinic={staffInfo?.clinic}
                />
              </TabsContent>
            )}

            {/* Biometric Attendance Tab for Doctors */}
            <TabsContent value="biometric">
              <SmartBiometric 
                clinic={staffInfo?.clinic?.toLowerCase().includes('pushpa') ? 'pushpa' : 
                        staffInfo?.clinic?.toLowerCase().includes('amnion') ? 'amnion' : 'pushpa'}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Pharmacy Staff View */}
        {(role === 'pharmacy_staff' || role === 'super_admin') && (
          <Tabs defaultValue="dashboard" className="space-y-4 mt-4">
            <TabsList className="flex flex-wrap gap-1">
              <TabsTrigger value="dashboard" data-testid="tab-pharmacy-dashboard">
                <Users className="w-4 h-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="orders" data-testid="tab-pharmacy-orders">
                <Package className="w-4 h-4 mr-2" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="loyalty" data-testid="tab-pharmacy-loyalty">
                <Gift className="w-4 h-4 mr-2" />
                Loyalty Points
              </TabsTrigger>
              {/* Attendance Tab for Pharmacy Staff */}
              {staffInfo?.access_modules?.includes('attendance') && (
                <TabsTrigger value="attendance" data-testid="tab-pharmacy-attendance">
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Attendance
                </TabsTrigger>
              )}
            </TabsList>

            {/* Pharmacy Dashboard */}
            <TabsContent value="dashboard">
              <StaffDashboard 
                staffInfo={staffInfo}
                onNavigate={(tab) => {
                  const tabElement = document.querySelector(`[data-testid="tab-pharmacy-${tab}"]`);
                  if (tabElement) tabElement.click();
                }}
              />
            </TabsContent>
            
            <TabsContent value="orders">
              <Card className="p-4">
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
            </TabsContent>
            
            {/* Loyalty Points Tab for Pharmacy Staff */}
            <TabsContent value="loyalty">
              <Card className="p-6">
                <div className="mb-6">
                  <h2 className="font-semibold text-lg flex items-center gap-2 mb-2">
                    <Gift className="w-5 h-5 text-amber-500" />
                    Add Loyalty Points
                  </h2>
                  <p className="text-sm text-gray-500">Award loyalty points to registered customers for their pharmacy purchases</p>
                </div>
                
                {/* Search User */}
                <div className="flex gap-3 mb-6">
                  <div className="relative flex-1 max-w-md">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      value={loyaltyPhone}
                      onChange={(e) => setLoyaltyPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter customer phone number..."
                      className="pl-10 h-12"
                      data-testid="pharmacy-loyalty-phone"
                      onKeyPress={(e) => e.key === 'Enter' && searchLoyaltyUser()}
                    />
                  </div>
                  <Button 
                    onClick={searchLoyaltyUser} 
                    disabled={loyaltyLoading || loyaltyPhone.length < 10}
                    className="h-12 bg-amber-500 hover:bg-amber-600"
                    data-testid="pharmacy-loyalty-search"
                  >
                    {loyaltyLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <User className="w-4 h-4 mr-2" />}
                    Find User
                  </Button>
                </div>
                
                {/* User Result */}
                {loyaltyUser && (
                  <div className={`p-6 rounded-xl border-2 ${loyaltyUser.found ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                    {loyaltyUser.found ? (
                      <div className="space-y-4">
                        {/* User Info */}
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                              <Gift className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-lg">{loyaltyUser.user_name}</p>
                              <p className="text-gray-500">{loyaltyUser.phone}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-amber-600">{loyaltyUser.loyalty_points?.toLocaleString() || 0}</p>
                            <p className="text-sm text-gray-500">Current Points</p>
                          </div>
                        </div>
                        
                        {/* Add Points Form */}
                        <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-amber-200">
                          <div>
                            <Label className="text-sm font-medium">Points to Add *</Label>
                            <Input
                              type="number"
                              value={loyaltyPoints}
                              onChange={(e) => setLoyaltyPoints(e.target.value)}
                              placeholder="1-500"
                              className="mt-1"
                              max={500}
                              min={1}
                              data-testid="pharmacy-loyalty-points"
                            />
                            <p className="text-xs text-gray-500 mt-1">Max 500 points per transaction</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Reason (Optional)</Label>
                            <Input
                              value={loyaltyReason}
                              onChange={(e) => setLoyaltyReason(e.target.value)}
                              placeholder="e.g., Order #12345"
                              className="mt-1"
                              data-testid="pharmacy-loyalty-reason"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button 
                              onClick={handleAddLoyaltyPoints}
                              disabled={addingPoints || !loyaltyPoints}
                              className="w-full bg-amber-500 hover:bg-amber-600"
                              data-testid="pharmacy-loyalty-submit"
                            >
                              {addingPoints ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                              Add Points
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                          <User className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-lg font-medium text-gray-600">User Not Registered</p>
                        <p className="text-gray-500 text-sm mt-1">Phone: {loyaltyPhone}</p>
                        <p className="text-sm text-gray-400 mt-3">Only registered users can earn loyalty points</p>
                      </div>
                    )}
                  </div>
                )}
                
                {!loyaltyUser && (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Search for a customer to add loyalty points</p>
                    <p className="text-sm text-gray-400 mt-1">Enter their phone number above</p>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Attendance Tab Content for Pharmacy Staff */}
            {staffInfo?.access_modules?.includes('attendance') && (
              <TabsContent value="attendance">
                <SmartBiometric clinic="pharmacy" />
              </TabsContent>
            )}
          </Tabs>
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
              <TabsTrigger value="loyalty" data-testid="tab-diag-loyalty">
                <Gift className="w-4 h-4 mr-2" />
                Loyalty Points
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="orders">
              <>
                {/* Service-Linked Orders (from clinic add-ons) */}
                {serviceOrders.length > 0 && (
                  <Card className="p-4 mb-4 border-2 border-teal-200">
                    <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-teal-500" />
                      Clinic Add-on Services
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">{serviceOrders.length} orders</span>
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">Blood tests, Sonography & ECG ordered during clinic visits at Pushpa/Amnion Clinic</p>
                    
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
                                {order.clinic || 'Clinic Add-on'}
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
                            <strong> Tests:</strong> {order.tests?.join(', ') || 'N/A'} |
                            <strong> Doctor:</strong> {order.doctor || 'N/A'}
                          </div>
                          
                          {/* Invoice Upload Section */}
                          {!order.invoice_url && (
                            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm text-blue-800 mb-2 flex items-center gap-1">
                                <Upload className="w-4 h-4" />
                                <strong>Upload Invoice</strong>
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
                                    toast.loading('Uploading invoice...');
                                    await axios.post(
                                      `${API}/staff/diagnostic/orders/${order.id}/upload-invoice`,
                                      formData,
                                      { 
                                        headers: { 
                                          'Authorization': `Bearer ${localStorage.getItem('staffToken')}`,
                                          'Content-Type': 'multipart/form-data'
                                        }
                                      }
                                    );
                                    toast.dismiss();
                                    toast.success('Invoice uploaded successfully');
                                    loadData();
                                  } catch (error) {
                                    toast.dismiss();
                                    toast.error(error.response?.data?.detail || 'Upload failed');
                                  }
                                }}
                                className="text-sm"
                                data-testid={`upload-invoice-${order.id}`}
                              />
                            </div>
                          )}
                          
                          {order.invoice_url && (
                            <div className="mb-3">
                              <a href={order.invoice_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                View Invoice
                              </a>
                            </div>
                          )}
                          
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
            
            {/* Loyalty Points Tab for Diagnostics Staff */}
            <TabsContent value="loyalty">
              <Card className="p-6">
                <div className="mb-6">
                  <h2 className="font-semibold text-lg flex items-center gap-2 mb-2">
                    <Gift className="w-5 h-5 text-purple-500" />
                    Add Loyalty Points
                  </h2>
                  <p className="text-sm text-gray-500">Award loyalty points to registered customers for their diagnostic tests</p>
                </div>
                
                {/* Search User */}
                <div className="flex gap-3 mb-6">
                  <div className="relative flex-1 max-w-md">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      value={loyaltyPhone}
                      onChange={(e) => setLoyaltyPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter customer phone number..."
                      className="pl-10 h-12"
                      data-testid="diag-loyalty-phone"
                      onKeyPress={(e) => e.key === 'Enter' && searchLoyaltyUser()}
                    />
                  </div>
                  <Button 
                    onClick={searchLoyaltyUser} 
                    disabled={loyaltyLoading || loyaltyPhone.length < 10}
                    className="h-12 bg-purple-500 hover:bg-purple-600"
                    data-testid="diag-loyalty-search"
                  >
                    {loyaltyLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <User className="w-4 h-4 mr-2" />}
                    Find User
                  </Button>
                </div>
                
                {/* User Result */}
                {loyaltyUser && (
                  <div className={`p-6 rounded-xl border-2 ${loyaltyUser.found ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                    {loyaltyUser.found ? (
                      <div className="space-y-4">
                        {/* User Info */}
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                              <Gift className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-lg">{loyaltyUser.user_name}</p>
                              <p className="text-gray-500">{loyaltyUser.phone}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-purple-600">{loyaltyUser.loyalty_points?.toLocaleString() || 0}</p>
                            <p className="text-sm text-gray-500">Current Points</p>
                          </div>
                        </div>
                        
                        {/* Add Points Form */}
                        <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-purple-200">
                          <div>
                            <Label className="text-sm font-medium">Points to Add *</Label>
                            <Input
                              type="number"
                              value={loyaltyPoints}
                              onChange={(e) => setLoyaltyPoints(e.target.value)}
                              placeholder="1-500"
                              className="mt-1"
                              max={500}
                              min={1}
                              data-testid="diag-loyalty-points"
                            />
                            <p className="text-xs text-gray-500 mt-1">Max 500 points per transaction</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Reason (Optional)</Label>
                            <Input
                              value={loyaltyReason}
                              onChange={(e) => setLoyaltyReason(e.target.value)}
                              placeholder="e.g., Blood test order"
                              className="mt-1"
                              data-testid="diag-loyalty-reason"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button 
                              onClick={handleAddLoyaltyPoints}
                              disabled={addingPoints || !loyaltyPoints}
                              className="w-full bg-purple-500 hover:bg-purple-600"
                              data-testid="diag-loyalty-submit"
                            >
                              {addingPoints ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                              Add Points
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                          <User className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-lg font-medium text-gray-600">User Not Registered</p>
                        <p className="text-gray-500 text-sm mt-1">Phone: {loyaltyPhone}</p>
                        <p className="text-sm text-gray-400 mt-3">Only registered users can earn loyalty points</p>
                      </div>
                    )}
                  </div>
                )}
                
                {!loyaltyUser && (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Search for a customer to add loyalty points</p>
                    <p className="text-sm text-gray-400 mt-1">Enter their phone number above</p>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default StaffPortal;
