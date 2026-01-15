import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { 
  ArrowLeft, Pill, Users, Calendar, FileText, Package, 
  Plus, Trash2, Search, Loader2, LogOut, Shield,
  BarChart3, FlaskConical, UserX, AlertTriangle, X,
  Truck, CheckCircle2, Clock, MapPin, Gift, Minus, Phone, TrendingUp, History,
  ChevronLeft, ChevronRight, Sun, Moon, Building2, Fingerprint, Baby, Activity
} from 'lucide-react';
import { ClinicManagementDashboard } from '@/components/ClinicManagement';
import GlydexStaffPortal from '@/components/GlydexStaffPortal';
import ANCRegistration from '@/components/ANCRegistration';
import BiometricAttendance from '@/components/BiometricAttendance';
import ClinicAnalyticsDashboard from '@/components/ClinicAnalyticsDashboard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Status colors and icons
const PHARMACY_STATUS_CONFIG = {
  'Order Booked': { color: 'bg-blue-500', icon: Package },
  'Packing': { color: 'bg-yellow-500', icon: Package },
  'Out for Delivery': { color: 'bg-purple-500', icon: Truck },
  'Delivered': { color: 'bg-green-500', icon: CheckCircle2 }
};

const DIAGNOSTIC_STATUS_CONFIG = {
  'Test Booked': { color: 'bg-blue-500', icon: FileText },
  'Sample Collected': { color: 'bg-yellow-500', icon: FlaskConical },
  'In Process': { color: 'bg-purple-500', icon: Clock },
  'Reports Generated': { color: 'bg-green-500', icon: CheckCircle2 }
};

const Admin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Stats
  const [stats, setStats] = useState(null);
  
  // Current tab
  const [activeTab, setActiveTab] = useState('inventory');
  
  // Inventory
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMedicines, setTotalMedicines] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const listRef = useRef(null);
  
  // Add medicine modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedicine, setNewMedicine] = useState({ name: '', form: 'Tablet' });
  const [addLoading, setAddLoading] = useState(false);
  
  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Diagnostic Tests
  const [diagnosticTests, setDiagnosticTests] = useState(null);
  const [testsLoading, setTestsLoading] = useState(false);
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [newTest, setNewTest] = useState({ name: '', category: 'pathology', subcategory: 'blood' });
  const [addTestLoading, setAddTestLoading] = useState(false);
  const [deleteTestTarget, setDeleteTestTarget] = useState(null);
  const [deleteTestLoading, setDeleteTestLoading] = useState(false);
  
  // Doctor Leave / Appointment Cancellation
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelForm, setCancelForm] = useState({
    doctor: 'Dr. Neha Patel',
    clinic: 'Pushpa Clinic',
    cancel_type: 'day',
    date: '',
    time: '',
    session: 'morning', // For bulk_session: 'morning' (11-2) or 'evening' (6-10)
    start_date: '',
    end_date: '',
    start_session: 'morning', // For session_range
    end_session: 'evening', // For session_range
    reason: 'Doctor on leave'
  });
  const [cancelLoading, setCancelLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateRangeStart, setDateRangeStart] = useState(null);
  const [dateRangeEnd, setDateRangeEnd] = useState(null);
  
  // Schedule Visualization
  const [scheduleWeekStart, setScheduleWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [scheduleAppointments, setScheduleAppointments] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [selectedScheduleDay, setSelectedScheduleDay] = useState(null);
  const [dayAppointments, setDayAppointments] = useState({ morning: [], evening: [] });
  
  // Order Tracking
  const [pharmacyOrders, setPharmacyOrders] = useState([]);
  const [diagnosticOrders, setDiagnosticOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updateStatusModal, setUpdateStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [orderType, setOrderType] = useState('pharmacy'); // 'pharmacy' or 'diagnostic'
  
  // Recent orders
  const [recentOrders, setRecentOrders] = useState(null);

  // Loyalty Points System
  const [loyaltyPhone, setLoyaltyPhone] = useState('');
  const [loyaltyUser, setLoyaltyUser] = useState(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemReason, setRedeemReason] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [loyaltySummary, setLoyaltySummary] = useState(null);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState([]);

  // Attendance Clinic Selection
  const [selectedAttendanceClinic, setSelectedAttendanceClinic] = useState(null);

  // Staff Management
  const [staffList, setStaffList] = useState([]);
  const [staffRoles, setStaffRoles] = useState({});
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    username: '',
    password: '',
    name: '',
    role: 'clinic_staff',
    doctor_name: ''
  });
  const [addStaffLoading, setAddStaffLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);

  // Analytics
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState(7);

  const doctors = ['Dr. Neha Patel', 'Dr. Vikas Jha'];

  // Check for existing admin session
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      fetchInventory(1, true);
      fetchDiagnosticTests();
      fetchRecentOrders();
    }
  }, [isAuthenticated]);

  // Fetch orders when tracking tab is active
  useEffect(() => {
    if (isAuthenticated && activeTab === 'tracking') {
      fetchPharmacyOrders();
      fetchDiagnosticOrders();
    }
  }, [isAuthenticated, activeTab]);

  // Fetch staff when staff tab is active
  useEffect(() => {
    if (isAuthenticated && activeTab === 'staff') {
      fetchStaff();
    }
  }, [isAuthenticated, activeTab]);

  // Fetch loyalty data when loyalty tab is active
  useEffect(() => {
    if (isAuthenticated && activeTab === 'loyalty') {
      fetchLoyaltySummary();
    }
  }, [isAuthenticated, activeTab]);

  // Fetch analytics data when analytics tab is active
  useEffect(() => {
    if (isAuthenticated && activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [isAuthenticated, activeTab, analyticsDays]);

  // Fetch schedule when week changes or tab is leave
  useEffect(() => {
    if (isAuthenticated && activeTab === 'leave') {
      fetchScheduleAppointments();
    }
  }, [isAuthenticated, activeTab, scheduleWeekStart]);

  // Search debounce for inventory
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated && activeTab === 'inventory') {
        setCurrentPage(1);
        fetchInventory(1, true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('adminToken')}`
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const response = await axios.post(`${API}/admin/login`, { password });
      localStorage.setItem('adminToken', response.data.token);
      setIsAuthenticated(true);
      toast.success('Admin login successful');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid password');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setPassword('');
    toast.success('Logged out successfully');
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, { headers: getAuthHeaders() });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      if (error.response?.status === 401) handleLogout();
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const response = await axios.get(`${API}/admin/analytics?days=${analyticsDays}`, { headers: getAuthHeaders() });
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchStaff = async () => {
    setStaffLoading(true);
    try {
      const response = await axios.get(`${API}/admin/staff`, { headers: getAuthHeaders() });
      setStaffList(response.data.staff || []);
      setStaffRoles(response.data.roles || {});
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setStaffLoading(false);
    }
  };

  // Loyalty Points Functions
  const fetchLoyaltySummary = async () => {
    try {
      const response = await axios.get(`${API}/admin/loyalty-points/summary`, { headers: getAuthHeaders() });
      setLoyaltySummary(response.data);
    } catch (error) {
      console.error('Failed to fetch loyalty summary:', error);
    }
  };

  const searchLoyaltyUser = async () => {
    if (!loyaltyPhone || loyaltyPhone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    
    setLoyaltyLoading(true);
    setLoyaltyUser(null);
    setLoyaltyTransactions([]);
    
    try {
      const response = await axios.get(`${API}/loyalty-points/by-phone/${loyaltyPhone}`, { headers: getAuthHeaders() });
      setLoyaltyUser(response.data);
      
      if (response.data.found) {
        // Fetch transactions for this user
        const txResponse = await axios.get(`${API}/admin/loyalty-points/transactions`, {
          headers: getAuthHeaders(),
          params: { phone: loyaltyPhone, limit: 20 }
        });
        setLoyaltyTransactions(txResponse.data.transactions || []);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to search user');
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const handleRedeemPoints = async () => {
    const points = parseInt(redeemAmount);
    if (!points || points <= 0) {
      toast.error('Please enter a valid number of points to redeem');
      return;
    }
    
    if (points > (loyaltyUser?.loyalty_points || 0)) {
      toast.error('User does not have enough points');
      return;
    }
    
    if (!redeemReason.trim()) {
      toast.error('Please provide a reason for redemption');
      return;
    }
    
    setRedeemLoading(true);
    try {
      await axios.post(`${API}/admin/loyalty-points/subtract`, {
        phone: loyaltyPhone,
        points: points,
        reason: redeemReason
      }, { headers: getAuthHeaders() });
      
      toast.success(`Successfully redeemed ${points} points`);
      setRedeemAmount('');
      setRedeemReason('');
      
      // Refresh user data
      searchLoyaltyUser();
      fetchLoyaltySummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to redeem points');
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaff.username || !newStaff.password || !newStaff.name) {
      toast.error('Please fill all required fields');
      return;
    }
    
    if (newStaff.role === 'doctor' && !newStaff.doctor_name) {
      toast.error('Please select a doctor');
      return;
    }
    
    setAddStaffLoading(true);
    try {
      await axios.post(`${API}/admin/staff`, newStaff, { headers: getAuthHeaders() });
      toast.success('Staff member created successfully');
      setShowAddStaffModal(false);
      setNewStaff({ username: '', password: '', name: '', role: 'clinic_staff', doctor_name: '' });
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create staff');
    } finally {
      setAddStaffLoading(false);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
      await axios.delete(`${API}/admin/staff/${staffId}`, { headers: getAuthHeaders() });
      toast.success('Staff member deleted');
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete staff');
    }
  };

  const handleToggleStaff = async (staffId) => {
    try {
      const res = await axios.put(`${API}/admin/staff/${staffId}/toggle`, {}, { headers: getAuthHeaders() });
      toast.success(res.data.active ? 'Staff enabled' : 'Staff disabled');
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update staff');
    }
  };

  const fetchInventory = async (page = 1, reset = false) => {
    try {
      if (page === 1) setInventoryLoading(true);
      else setLoadingMore(true);
      
      const response = await axios.get(`${API}/pharmacy/all`, {
        params: { page, per_page: 50, search: searchTerm || undefined }
      });
      
      if (reset || page === 1) {
        setInventory(response.data.medicines);
      } else {
        setInventory(prev => [...prev, ...response.data.medicines]);
      }
      
      setHasMore(page < response.data.total_pages);
      setTotalMedicines(response.data.total);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setInventoryLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchDiagnosticTests = async () => {
    setTestsLoading(true);
    try {
      const response = await axios.get(`${API}/admin/diagnostic-tests`, { headers: getAuthHeaders() });
      setDiagnosticTests(response.data.tests);
    } catch (error) {
      console.error('Failed to fetch diagnostic tests:', error);
    } finally {
      setTestsLoading(false);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const response = await axios.get(`${API}/admin/orders/recent`, { 
        headers: getAuthHeaders(),
        params: { limit: 10 }
      });
      setRecentOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch recent orders:', error);
    }
  };

  const fetchPharmacyOrders = async () => {
    setOrdersLoading(true);
    try {
      const response = await axios.get(`${API}/admin/pharmacy/orders`, { 
        headers: getAuthHeaders(),
        params: { limit: 50 }
      });
      setPharmacyOrders(response.data.orders);
    } catch (error) {
      console.error('Failed to fetch pharmacy orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchDiagnosticOrders = async () => {
    try {
      const response = await axios.get(`${API}/admin/diagnostic/orders`, { 
        headers: getAuthHeaders(),
        params: { limit: 50 }
      });
      setDiagnosticOrders(response.data.orders);
    } catch (error) {
      console.error('Failed to fetch diagnostic orders:', error);
    }
  };

  // Fetch appointments for schedule visualization
  const fetchScheduleAppointments = async () => {
    setScheduleLoading(true);
    try {
      const startDate = format(scheduleWeekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(scheduleWeekStart, 6), 'yyyy-MM-dd');
      const response = await axios.get(`${API}/admin/appointments`, { 
        headers: getAuthHeaders(),
        params: { start_date: startDate, end_date: endDate }
      });
      setScheduleAppointments(response.data.appointments || []);
    } catch (error) {
      console.error('Failed to fetch schedule appointments:', error);
    } finally {
      setScheduleLoading(false);
    }
  };

  // Get appointments for a specific day grouped by session
  const getAppointmentsForDay = (date, doctor) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayAppts = scheduleAppointments.filter(a => 
      a.date === dateStr && a.doctor === doctor
    );
    
    // Morning slots: 11:00 AM - 2:00 PM
    const morningAppts = dayAppts.filter(a => {
      const hour = parseInt(a.time?.split(':')[0] || '0');
      const isPM = a.time?.includes('PM');
      const hourIn24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
      return hourIn24 >= 11 && hourIn24 < 14;
    });
    
    // Evening slots: 6:00 PM - 10:00 PM
    const eveningAppts = dayAppts.filter(a => {
      const hour = parseInt(a.time?.split(':')[0] || '0');
      const isPM = a.time?.includes('PM');
      const hourIn24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
      return hourIn24 >= 18 && hourIn24 <= 22;
    });
    
    return { morning: morningAppts, evening: eveningAppts, all: dayAppts };
  };

  // Get schedule stats for a day
  const getScheduleStats = (date, doctor) => {
    const { morning, evening } = getAppointmentsForDay(date, doctor);
    const bookedMorning = morning.filter(a => a.status !== 'cancelled').length;
    const bookedEvening = evening.filter(a => a.status !== 'cancelled').length;
    const cancelledMorning = morning.filter(a => a.status === 'cancelled').length;
    const cancelledEvening = evening.filter(a => a.status === 'cancelled').length;
    
    return {
      morning: { booked: bookedMorning, cancelled: cancelledMorning, total: morning.length },
      evening: { booked: bookedEvening, cancelled: cancelledEvening, total: evening.length }
    };
  };

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loadingMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchInventory(nextPage);
    }
  }, [hasMore, loadingMore, currentPage]);

  // Medicine CRUD
  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!newMedicine.name.trim()) {
      toast.error('Please enter medicine name');
      return;
    }
    
    setAddLoading(true);
    try {
      await axios.post(`${API}/pharmacy/inventory/add`, newMedicine, { headers: getAuthHeaders() });
      toast.success('Medicine added successfully');
      setShowAddModal(false);
      setNewMedicine({ name: '', form: 'Tablet' });
      fetchInventory(1, true);
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add medicine');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteMedicine = async () => {
    if (!deleteTarget) return;
    
    setDeleteLoading(true);
    try {
      await axios.delete(`${API}/pharmacy/inventory/${encodeURIComponent(deleteTarget)}`, { 
        headers: getAuthHeaders() 
      });
      toast.success('Medicine deleted successfully');
      setDeleteTarget(null);
      fetchInventory(1, true);
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete medicine');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Diagnostic Test CRUD
  const handleAddTest = async (e) => {
    e.preventDefault();
    if (!newTest.name.trim()) {
      toast.error('Please enter test name');
      return;
    }
    
    setAddTestLoading(true);
    try {
      await axios.post(`${API}/admin/diagnostic-tests/add`, newTest, { headers: getAuthHeaders() });
      toast.success('Test added successfully');
      setShowAddTestModal(false);
      setNewTest({ name: '', category: 'pathology', subcategory: 'blood' });
      fetchDiagnosticTests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add test');
    } finally {
      setAddTestLoading(false);
    }
  };

  const handleDeleteTest = async () => {
    if (!deleteTestTarget) return;
    
    setDeleteTestLoading(true);
    try {
      const { category, subcategory, name } = deleteTestTarget;
      await axios.delete(
        `${API}/admin/diagnostic-tests/${category}/${subcategory}/${encodeURIComponent(name)}`, 
        { headers: getAuthHeaders() }
      );
      toast.success('Test deleted successfully');
      setDeleteTestTarget(null);
      fetchDiagnosticTests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete test');
    } finally {
      setDeleteTestLoading(false);
    }
  };

  // Cancel Appointments
  const handleCancelAppointments = async () => {
    setCancelLoading(true);
    try {
      const payload = { ...cancelForm };
      
      if (cancelForm.cancel_type === 'day' && selectedDate) {
        payload.date = format(selectedDate, 'yyyy-MM-dd');
      } else if (cancelForm.cancel_type === 'bulk_session' && selectedDate) {
        payload.date = format(selectedDate, 'yyyy-MM-dd');
        payload.session = cancelForm.session;
      } else if (cancelForm.cancel_type === 'range' && dateRangeStart && dateRangeEnd) {
        payload.start_date = format(dateRangeStart, 'yyyy-MM-dd');
        payload.end_date = format(dateRangeEnd, 'yyyy-MM-dd');
      } else if (cancelForm.cancel_type === 'session_range' && dateRangeStart && dateRangeEnd) {
        payload.start_date = format(dateRangeStart, 'yyyy-MM-dd');
        payload.end_date = format(dateRangeEnd, 'yyyy-MM-dd');
        payload.start_session = cancelForm.start_session;
        payload.end_session = cancelForm.end_session;
      }
      
      const response = await axios.post(`${API}/admin/appointments/cancel`, payload, { 
        headers: getAuthHeaders() 
      });
      
      toast.success(`Cancelled ${response.data.cancelled_count} appointment(s)`);
      setShowCancelModal(false);
      setCancelForm({
        doctor: 'Dr. Neha Patel',
        clinic: 'Pushpa Clinic',
        cancel_type: 'day',
        date: '',
        time: '',
        session: 'morning',
        start_date: '',
        end_date: '',
        start_session: 'morning',
        end_session: 'evening',
        reason: 'Doctor on leave'
      });
      setSelectedDate(null);
      setDateRangeStart(null);
      setDateRangeEnd(null);
      fetchStats();
      fetchRecentOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel appointments');
    } finally {
      setCancelLoading(false);
    }
  };

  // Order Status Update
  const openUpdateModal = (order, type) => {
    setSelectedOrder(order);
    setOrderType(type);
    setNewStatus(order.status || (type === 'pharmacy' ? 'Order Booked' : 'Test Booked'));
    setStatusNotes('');
    setUpdateStatusModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    
    setUpdateLoading(true);
    try {
      const endpoint = orderType === 'pharmacy' 
        ? `${API}/admin/pharmacy/orders/${selectedOrder.id}/status`
        : `${API}/admin/diagnostic/orders/${selectedOrder.id}/status`;
      
      await axios.put(endpoint, {
        order_id: selectedOrder.id,
        status: newStatus,
        notes: statusNotes || null
      }, { headers: getAuthHeaders() });
      
      toast.success(`Status updated to "${newStatus}"`);
      setUpdateStatusModal(false);
      setSelectedOrder(null);
      
      // Refresh orders
      if (orderType === 'pharmacy') {
        fetchPharmacyOrders();
      } else {
        fetchDiagnosticOrders();
      }
      fetchRecentOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Get subcategories based on category
  const getSubcategories = (category) => {
    if (category === 'imaging') return ['ecg', 'sonography'];
    return ['blood', 'urine', 'stool'];
  };

  // Get status step index
  const getStatusIndex = (status, type) => {
    const statuses = type === 'pharmacy' 
      ? ['Order Booked', 'Packing', 'Out for Delivery', 'Delivered']
      : ['Test Booked', 'Sample Collected', 'In Process', 'Reports Generated'];
    return statuses.indexOf(status);
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-white/95 backdrop-blur">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-brand-teal" />
            </div>
            <h1 className="font-heading text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Nevika Cura Healthcare</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="h-12 mt-1"
                data-testid="admin-password-input"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-full"
              disabled={loginLoading || !password}
              data-testid="admin-login-button"
            >
              {loginLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Logging in...</> : 'Login to Admin'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/')} className="text-white hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-heading text-xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-slate-400">Nevika Cura Healthcare</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="border-white/20 text-white hover:bg-white/10">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-2xl font-bold">{stats?.total_medicines?.toLocaleString() || '-'}</p>
                <p className="text-sm opacity-80">Medicines</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-teal-500 to-teal-600 text-white">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-2xl font-bold">{stats?.total_users || '-'}</p>
                <p className="text-sm opacity-80">Users</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-2xl font-bold">{stats?.total_appointments || '-'}</p>
                <p className="text-sm opacity-80">Appointments</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-2xl font-bold">{stats?.total_diagnostic_orders || '-'}</p>
                <p className="text-sm opacity-80">Diagnostics</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-pink-500 to-pink-600 text-white">
            <div className="flex items-center gap-3">
              <Pill className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-2xl font-bold">{stats?.total_pharmacy_orders || '-'}</p>
                <p className="text-sm opacity-80">Pharmacy</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 gap-1 mb-2 h-auto">
            <TabsTrigger value="inventory" data-testid="inventory-tab" className="py-2">
              <Package className="w-4 h-4 mr-2" /> Pharmacy
            </TabsTrigger>
            <TabsTrigger value="tests" data-testid="tests-tab" className="py-2">
              <FlaskConical className="w-4 h-4 mr-2" /> Tests
            </TabsTrigger>
            <TabsTrigger value="tracking" data-testid="tracking-tab" className="py-2">
              <Truck className="w-4 h-4 mr-2" /> Tracking
            </TabsTrigger>
            <TabsTrigger value="loyalty" data-testid="loyalty-tab" className="py-2">
              <Gift className="w-4 h-4 mr-2" /> Loyalty
            </TabsTrigger>
          </TabsList>
          <TabsList className="grid w-full grid-cols-4 gap-1 mb-6 h-auto">
            <TabsTrigger value="leave" data-testid="leave-tab" className="py-2">
              <UserX className="w-4 h-4 mr-2" /> Leave
            </TabsTrigger>
            <TabsTrigger value="staff" data-testid="staff-tab" className="py-2">
              <Users className="w-4 h-4 mr-2" /> Staff
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="orders-tab" className="py-2">
              <BarChart3 className="w-4 h-4 mr-2" /> Orders
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="analytics-tab" className="py-2">
              <TrendingUp className="w-4 h-4 mr-2" /> Analytics
            </TabsTrigger>
          </TabsList>
          <TabsList className="grid w-full grid-cols-4 gap-1 mb-6 h-auto">
            <TabsTrigger value="clinic-management" data-testid="clinic-management-tab" className="py-2">
              <Building2 className="w-4 h-4 mr-2" /> Clinic Mgmt
            </TabsTrigger>
            <TabsTrigger value="glydex-staff" data-testid="glydex-staff-tab" className="py-2">
              <Activity className="w-4 h-4 mr-2" /> Glydex Staff
            </TabsTrigger>
            <TabsTrigger value="anc-registration" data-testid="anc-registration-tab" className="py-2">
              <Baby className="w-4 h-4 mr-2" /> ANC
            </TabsTrigger>
            <TabsTrigger value="biometric" data-testid="biometric-tab" className="py-2">
              <Fingerprint className="w-4 h-4 mr-2" /> Attendance
            </TabsTrigger>
          </TabsList>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                <div>
                  <h2 className="font-heading text-xl font-semibold">Medicine Inventory</h2>
                  <p className="text-sm text-muted-foreground">Total: {totalMedicines.toLocaleString()} medicines</p>
                </div>
                <Button onClick={() => setShowAddModal(true)} className="rounded-full" data-testid="add-medicine-button">
                  <Plus className="w-4 h-4 mr-2" /> Add Medicine
                </Button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search medicines..."
                  className="pl-10 h-12"
                />
              </div>

              {inventoryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
                </div>
              ) : (
                <div ref={listRef} className="max-h-[400px] overflow-y-auto border rounded-lg" onScroll={handleScroll}>
                  {inventory.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No medicines found</div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium">Medicine Name</th>
                          <th className="text-left p-3 font-medium">Form</th>
                          <th className="text-right p-3 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {inventory.map((med, idx) => (
                          <tr key={`${med.name}-${idx}`} className="hover:bg-slate-50">
                            <td className="p-3 font-medium">{med.name}</td>
                            <td className="p-3 text-muted-foreground">{med.form}</td>
                            <td className="p-3 text-right">
                              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(med.name)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {loadingMore && <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin inline-block text-brand-orange" /></div>}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Diagnostic Tests Tab */}
          <TabsContent value="tests">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                <div>
                  <h2 className="font-heading text-xl font-semibold">Proton Diagnostic Tests</h2>
                  <p className="text-sm text-muted-foreground">Manage available diagnostic tests</p>
                </div>
                <Button onClick={() => setShowAddTestModal(true)} className="rounded-full" data-testid="add-test-button">
                  <Plus className="w-4 h-4 mr-2" /> Add Test
                </Button>
              </div>

              {testsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : diagnosticTests ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 bg-blue-500 rounded-full"></span> Imaging Tests
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {Object.entries(diagnosticTests.imaging || {}).map(([subcategory, tests]) => (
                        <Card key={subcategory} className="p-4">
                          <h4 className="font-medium capitalize mb-2 text-blue-600">{subcategory}</h4>
                          <div className="space-y-1">
                            {tests.map((test, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                                <span>{test}</span>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteTestTarget({ category: 'imaging', subcategory, name: test })} className="text-red-500 hover:text-red-700 h-6 w-6 p-0">
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 bg-purple-500 rounded-full"></span> Pathology Tests
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      {Object.entries(diagnosticTests.pathology || {}).map(([subcategory, tests]) => (
                        <Card key={subcategory} className="p-4">
                          <h4 className="font-medium capitalize mb-2 text-purple-600">{subcategory}</h4>
                          <div className="space-y-1 max-h-60 overflow-y-auto">
                            {tests.map((test, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                                <span className="truncate flex-1 mr-2">{test}</span>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteTestTarget({ category: 'pathology', subcategory, name: test })} className="text-red-500 hover:text-red-700 h-6 w-6 p-0 flex-shrink-0">
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          </TabsContent>

          {/* Order Tracking Tab */}
          <TabsContent value="tracking">
            <div className="space-y-6">
              {/* Pharmacy Orders */}
              <Card className="p-6">
                <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-orange-500" /> Orange Pharmacy Orders
                </h2>
                
                {/* Status Legend */}
                <div className="flex flex-wrap gap-3 mb-4 p-3 bg-orange-50 rounded-lg">
                  {['Order Booked', 'Packing', 'Out for Delivery', 'Delivered'].map((status, idx) => {
                    const config = PHARMACY_STATUS_CONFIG[status];
                    const Icon = config.icon;
                    return (
                      <div key={status} className="flex items-center gap-2 text-sm">
                        <div className={`w-6 h-6 ${config.color} rounded-full flex items-center justify-center`}>
                          <Icon className="w-3 h-3 text-white" />
                        </div>
                        <span>{status}</span>
                        {idx < 3 && <span className="text-gray-300">→</span>}
                      </div>
                    );
                  })}
                </div>

                {ordersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {pharmacyOrders.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No pharmacy orders</p>
                    ) : pharmacyOrders.map((order, idx) => {
                      const currentStatus = order.status || 'Order Booked';
                      const statusIdx = getStatusIndex(currentStatus, 'pharmacy');
                      const config = PHARMACY_STATUS_CONFIG[currentStatus] || PHARMACY_STATUS_CONFIG['Order Booked'];
                      const Icon = config.icon;
                      
                      return (
                        <div key={order.id || idx} className="p-4 border rounded-lg hover:bg-slate-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{order.patient_name}</span>
                                <span className="text-xs text-muted-foreground">#{order.id?.slice(0, 8)}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{order.medicines?.length || 0} medicines</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {order.delivery_address?.slice(0, 40)}...
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Status Progress */}
                              <div className="flex items-center gap-1">
                                {[0, 1, 2, 3].map((step) => (
                                  <div 
                                    key={step} 
                                    className={`w-2 h-2 rounded-full ${step <= statusIdx ? config.color : 'bg-gray-200'}`}
                                  />
                                ))}
                              </div>
                              <div className={`px-3 py-1 rounded-full text-white text-xs flex items-center gap-1 ${config.color}`}>
                                <Icon className="w-3 h-3" />
                                {currentStatus}
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openUpdateModal(order, 'pharmacy')}
                                disabled={currentStatus === 'Delivered'}
                              >
                                Update
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Diagnostic Orders */}
              <Card className="p-6">
                <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-purple-500" /> Proton Diagnostic Orders
                </h2>
                
                {/* Status Legend */}
                <div className="flex flex-wrap gap-3 mb-4 p-3 bg-purple-50 rounded-lg">
                  {['Test Booked', 'Sample Collected', 'In Process', 'Reports Generated'].map((status, idx) => {
                    const config = DIAGNOSTIC_STATUS_CONFIG[status];
                    const Icon = config.icon;
                    return (
                      <div key={status} className="flex items-center gap-2 text-sm">
                        <div className={`w-6 h-6 ${config.color} rounded-full flex items-center justify-center`}>
                          <Icon className="w-3 h-3 text-white" />
                        </div>
                        <span>{status}</span>
                        {idx < 3 && <span className="text-gray-300">→</span>}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {diagnosticOrders.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No diagnostic orders</p>
                  ) : diagnosticOrders.map((order, idx) => {
                    const currentStatus = order.status || 'Test Booked';
                    const statusIdx = getStatusIndex(currentStatus, 'diagnostic');
                    const config = DIAGNOSTIC_STATUS_CONFIG[currentStatus] || DIAGNOSTIC_STATUS_CONFIG['Test Booked'];
                    const Icon = config.icon;
                    
                    return (
                      <div key={order.id || idx} className="p-4 border rounded-lg hover:bg-slate-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{order.patient_name}</span>
                              <span className="text-xs text-muted-foreground">#{order.id?.slice(0, 8)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{order.tests?.length || 0} tests</p>
                            <p className="text-xs text-muted-foreground">Date: {order.preferred_date}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Status Progress */}
                            <div className="flex items-center gap-1">
                              {[0, 1, 2, 3].map((step) => (
                                <div 
                                  key={step} 
                                  className={`w-2 h-2 rounded-full ${step <= statusIdx ? config.color : 'bg-gray-200'}`}
                                />
                              ))}
                            </div>
                            <div className={`px-3 py-1 rounded-full text-white text-xs flex items-center gap-1 ${config.color}`}>
                              <Icon className="w-3 h-3" />
                              {currentStatus}
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openUpdateModal(order, 'diagnostic')}
                              disabled={currentStatus === 'Reports Generated'}
                            >
                              Update
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Loyalty Points Tab */}
          <TabsContent value="loyalty">
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                  <div className="flex items-center gap-3">
                    <Gift className="w-8 h-8 opacity-80" />
                    <div>
                      <p className="text-2xl font-bold">{loyaltySummary?.total_points_issued?.toLocaleString() || '0'}</p>
                      <p className="text-sm opacity-80">Total Credited</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-rose-500 to-rose-600 text-white">
                  <div className="flex items-center gap-3">
                    <Minus className="w-8 h-8 opacity-80" />
                    <div>
                      <p className="text-2xl font-bold">{loyaltySummary?.total_points_redeemed?.toLocaleString() || '0'}</p>
                      <p className="text-sm opacity-80">Total Redeemed</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 opacity-80" />
                    <div>
                      <p className="text-2xl font-bold">{loyaltySummary?.points_in_circulation?.toLocaleString() || '0'}</p>
                      <p className="text-sm opacity-80">Net Active Points</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 opacity-80" />
                    <div>
                      <p className="text-2xl font-bold">{loyaltySummary?.users_with_points || '0'}</p>
                      <p className="text-sm opacity-80">Users with Points</p>
                    </div>
                  </div>
                </Card>
              </div>
              
              {/* Search and Redeem Section */}
              <Card className="p-6">
                <h2 className="font-heading text-xl font-semibold mb-6 flex items-center gap-2">
                  <Gift className="w-6 h-6 text-amber-500" /> Redeem Loyalty Points
                </h2>
                
                {/* Search User */}
                <div className="flex gap-3 mb-6">
                  <div className="relative flex-1 max-w-md">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      value={loyaltyPhone}
                      onChange={(e) => setLoyaltyPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter 10-digit phone number..."
                      className="pl-10 h-12"
                      data-testid="loyalty-phone-input"
                      onKeyPress={(e) => e.key === 'Enter' && searchLoyaltyUser()}
                    />
                  </div>
                  <Button 
                    onClick={searchLoyaltyUser} 
                    disabled={loyaltyLoading || loyaltyPhone.length < 10}
                    className="h-12 px-6"
                    data-testid="loyalty-search-btn"
                  >
                    {loyaltyLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                    Search User
                  </Button>
                </div>
                
                {/* User Result */}
                {loyaltyUser && (
                  <div className={`p-6 rounded-xl border-2 ${loyaltyUser.found ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                    {loyaltyUser.found ? (
                      <div className="space-y-6">
                        {/* User Info */}
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                              <Gift className="w-7 h-7 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-lg">{loyaltyUser.user_name}</p>
                              <p className="text-muted-foreground">{loyaltyUser.phone}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-amber-600">{loyaltyUser.loyalty_points?.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">Available Points</p>
                          </div>
                        </div>
                        
                        {/* Redeem Form */}
                        {loyaltyUser.loyalty_points > 0 ? (
                          <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                            <div>
                              <Label className="text-sm font-medium">Points to Redeem *</Label>
                              <Input
                                type="number"
                                value={redeemAmount}
                                onChange={(e) => setRedeemAmount(e.target.value)}
                                placeholder="Enter amount"
                                className="mt-1"
                                max={loyaltyUser.loyalty_points}
                                min={1}
                                data-testid="redeem-amount-input"
                              />
                              <p className="text-xs text-muted-foreground mt-1">Max: {loyaltyUser.loyalty_points}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Reason *</Label>
                              <Input
                                value={redeemReason}
                                onChange={(e) => setRedeemReason(e.target.value)}
                                placeholder="e.g., Medicine discount"
                                className="mt-1"
                                data-testid="redeem-reason-input"
                              />
                            </div>
                            <div className="flex items-end">
                              <Button 
                                onClick={handleRedeemPoints}
                                disabled={redeemLoading || !redeemAmount || !redeemReason}
                                className="w-full bg-amber-500 hover:bg-amber-600"
                                data-testid="redeem-submit-btn"
                              >
                                {redeemLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Minus className="w-4 h-4 mr-2" />}
                                Redeem Points
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-gray-50 rounded-lg">
                            <p className="text-muted-foreground">This user has no points to redeem</p>
                          </div>
                        )}
                        
                        {/* Transaction History */}
                        {loyaltyTransactions.length > 0 && (
                          <div className="pt-4 border-t">
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <History className="w-4 h-4" /> Recent Transactions
                            </h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {loyaltyTransactions.map((tx, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border text-sm">
                                  <div>
                                    <span className={`font-medium ${tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {tx.type === 'credit' ? '+' : '-'}{tx.points} pts
                                    </span>
                                    <p className="text-muted-foreground text-xs">{tx.reason}</p>
                                  </div>
                                  <div className="text-right text-xs text-muted-foreground">
                                    {tx.created_at?.split('T')[0]}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                          <UserX className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-lg font-medium text-gray-600">User Not Registered</p>
                        <p className="text-muted-foreground text-sm mt-1">Phone: {loyaltyPhone}</p>
                        <p className="text-sm text-gray-500 mt-3">Only registered users can earn loyalty points</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
              
              {/* Top Users */}
              {loyaltySummary?.top_users?.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" /> Top Loyalty Members
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {loyaltySummary.top_users.map((user, idx) => (
                      <Card key={idx} className={`p-4 text-center ${idx === 0 ? 'border-amber-300 bg-amber-50' : idx === 1 ? 'border-gray-300 bg-gray-50' : idx === 2 ? 'border-orange-200 bg-orange-50' : ''}`}>
                        <div className="text-2xl mb-1">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐'}
                        </div>
                        <p className="font-medium text-sm truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.phone}</p>
                        <p className="font-bold text-amber-600 mt-1">{user.loyalty_points?.toLocaleString()}</p>
                      </Card>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Doctor Leave Tab */}
          <TabsContent value="leave">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                <div>
                  <h2 className="font-heading text-xl font-semibold">Doctor Leave Management</h2>
                  <p className="text-sm text-muted-foreground">View schedule and cancel appointments when doctors are on leave</p>
                </div>
                <Button onClick={() => setShowCancelModal(true)} className="rounded-full bg-red-500 hover:bg-red-600" data-testid="cancel-appointments-btn">
                  <AlertTriangle className="w-4 h-4 mr-2" /> Cancel Appointments
                </Button>
              </div>

              {/* Schedule Visualization - Week Navigator */}
              <Card className="p-4 mb-6 bg-gradient-to-r from-slate-50 to-blue-50">
                <div className="flex items-center justify-between mb-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setScheduleWeekStart(addDays(scheduleWeekStart, -7))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg" data-testid="schedule-week-title">
                      {format(scheduleWeekStart, 'MMM d')} - {format(addDays(scheduleWeekStart, 6), 'MMM d, yyyy')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {scheduleAppointments.filter(a => a.status !== 'cancelled').length} booked • {scheduleAppointments.filter(a => a.status === 'cancelled').length} cancelled
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setScheduleWeekStart(addDays(scheduleWeekStart, 7))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap gap-4 justify-center mb-4 text-xs">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500"></div> Available</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500"></div> Booked</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500"></div> Cancelled</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-500"></div> Emergency</div>
                </div>

                {scheduleLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Dr. Neha Patel Schedule */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-blue-700 flex items-center gap-2 border-b pb-2">
                        <span className="text-lg">👩‍⚕️</span> Dr. Neha Patel
                        <span className="text-xs font-normal text-muted-foreground">Pushpa Clinic</span>
                      </h4>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
                          const day = addDays(scheduleWeekStart, dayOffset);
                          const stats = getScheduleStats(day, 'Dr. Neha Patel');
                          const isToday = isSameDay(day, new Date());
                          const isSelected = selectedScheduleDay && isSameDay(day, selectedScheduleDay.date) && selectedScheduleDay.doctor === 'Dr. Neha Patel';
                          
                          return (
                            <div 
                              key={dayOffset} 
                              className={`rounded-lg p-2 cursor-pointer transition-all ${isToday ? 'ring-2 ring-blue-400' : ''} ${isSelected ? 'ring-2 ring-amber-400 bg-amber-50' : 'hover:bg-white'}`}
                              onClick={() => {
                                setSelectedScheduleDay({ date: day, doctor: 'Dr. Neha Patel' });
                                setDayAppointments(getAppointmentsForDay(day, 'Dr. Neha Patel'));
                              }}
                              data-testid={`schedule-day-neha-${dayOffset}`}
                            >
                              <p className="text-xs font-medium text-muted-foreground">{format(day, 'EEE')}</p>
                              <p className={`text-sm font-bold ${isToday ? 'text-blue-600' : ''}`}>{format(day, 'd')}</p>
                              
                              {/* Morning Session */}
                              <div className="mt-1 text-xs">
                                <div className="flex items-center justify-center gap-0.5 text-amber-600">
                                  <Sun className="w-3 h-3" />
                                  <span>{stats.morning.booked}</span>
                                </div>
                                <div className={`h-1.5 rounded-full mt-0.5 ${stats.morning.booked > 0 ? 'bg-blue-500' : 'bg-emerald-200'}`} 
                                     style={{ opacity: stats.morning.booked > 0 ? Math.min(stats.morning.booked / 10, 1) : 0.3 }}></div>
                              </div>
                              
                              {/* Evening Session */}
                              <div className="mt-1 text-xs">
                                <div className="flex items-center justify-center gap-0.5 text-indigo-600">
                                  <Moon className="w-3 h-3" />
                                  <span>{stats.evening.booked}</span>
                                </div>
                                <div className={`h-1.5 rounded-full mt-0.5 ${stats.evening.booked > 0 ? 'bg-indigo-500' : 'bg-emerald-200'}`}
                                     style={{ opacity: stats.evening.booked > 0 ? Math.min(stats.evening.booked / 15, 1) : 0.3 }}></div>
                              </div>
                              
                              {stats.morning.cancelled + stats.evening.cancelled > 0 && (
                                <div className="text-red-500 text-xs mt-1">
                                  ✕{stats.morning.cancelled + stats.evening.cancelled}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dr. Vikas Jha Schedule */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-green-700 flex items-center gap-2 border-b pb-2">
                        <span className="text-lg">👨‍⚕️</span> Dr. Vikas Jha
                        <span className="text-xs font-normal text-muted-foreground">Amnion Clinic</span>
                      </h4>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
                          const day = addDays(scheduleWeekStart, dayOffset);
                          const stats = getScheduleStats(day, 'Dr. Vikas Jha');
                          const isToday = isSameDay(day, new Date());
                          const isSelected = selectedScheduleDay && isSameDay(day, selectedScheduleDay.date) && selectedScheduleDay.doctor === 'Dr. Vikas Jha';
                          
                          return (
                            <div 
                              key={dayOffset} 
                              className={`rounded-lg p-2 cursor-pointer transition-all ${isToday ? 'ring-2 ring-green-400' : ''} ${isSelected ? 'ring-2 ring-amber-400 bg-amber-50' : 'hover:bg-white'}`}
                              onClick={() => {
                                setSelectedScheduleDay({ date: day, doctor: 'Dr. Vikas Jha' });
                                setDayAppointments(getAppointmentsForDay(day, 'Dr. Vikas Jha'));
                              }}
                              data-testid={`schedule-day-vikas-${dayOffset}`}
                            >
                              <p className="text-xs font-medium text-muted-foreground">{format(day, 'EEE')}</p>
                              <p className={`text-sm font-bold ${isToday ? 'text-green-600' : ''}`}>{format(day, 'd')}</p>
                              
                              {/* Morning Session */}
                              <div className="mt-1 text-xs">
                                <div className="flex items-center justify-center gap-0.5 text-amber-600">
                                  <Sun className="w-3 h-3" />
                                  <span>{stats.morning.booked}</span>
                                </div>
                                <div className={`h-1.5 rounded-full mt-0.5 ${stats.morning.booked > 0 ? 'bg-blue-500' : 'bg-emerald-200'}`}
                                     style={{ opacity: stats.morning.booked > 0 ? Math.min(stats.morning.booked / 10, 1) : 0.3 }}></div>
                              </div>
                              
                              {/* Evening Session */}
                              <div className="mt-1 text-xs">
                                <div className="flex items-center justify-center gap-0.5 text-indigo-600">
                                  <Moon className="w-3 h-3" />
                                  <span>{stats.evening.booked}</span>
                                </div>
                                <div className={`h-1.5 rounded-full mt-0.5 ${stats.evening.booked > 0 ? 'bg-indigo-500' : 'bg-emerald-200'}`}
                                     style={{ opacity: stats.evening.booked > 0 ? Math.min(stats.evening.booked / 15, 1) : 0.3 }}></div>
                              </div>
                              
                              {stats.morning.cancelled + stats.evening.cancelled > 0 && (
                                <div className="text-red-500 text-xs mt-1">
                                  ✕{stats.morning.cancelled + stats.evening.cancelled}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Selected Day Details */}
              {selectedScheduleDay && (
                <Card className="p-4 mb-6 border-amber-200 bg-amber-50/50" data-testid="selected-day-details">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {format(selectedScheduleDay.date, 'EEEE, MMMM d, yyyy')}
                      </h3>
                      <p className="text-sm text-muted-foreground">{selectedScheduleDay.doctor}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedScheduleDay(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Morning Session */}
                    <div className="bg-white rounded-lg p-3 border border-amber-200">
                      <h4 className="font-medium text-amber-700 flex items-center gap-2 mb-3">
                        <Sun className="w-4 h-4" /> Morning Session
                        <span className="text-xs bg-amber-100 px-2 py-0.5 rounded">11:00 AM - 2:00 PM</span>
                      </h4>
                      {dayAppointments.morning.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {dayAppointments.morning.map((appt, idx) => (
                            <div key={idx} className={`flex items-center justify-between p-2 rounded text-sm ${appt.status === 'cancelled' ? 'bg-red-50 line-through text-red-400' : 'bg-slate-50'}`}>
                              <div>
                                <p className="font-medium">{appt.patient_name}</p>
                                <p className="text-xs text-muted-foreground">{appt.time}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded ${appt.status === 'cancelled' ? 'bg-red-100 text-red-700' : appt.type === 'emergency' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                {appt.status === 'cancelled' ? 'Cancelled' : appt.type || 'Booked'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No appointments</p>
                      )}
                      <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
                        {dayAppointments.morning.filter(a => a.status !== 'cancelled').length} booked • {dayAppointments.morning.filter(a => a.status === 'cancelled').length} cancelled
                      </div>
                    </div>

                    {/* Evening Session */}
                    <div className="bg-white rounded-lg p-3 border border-indigo-200">
                      <h4 className="font-medium text-indigo-700 flex items-center gap-2 mb-3">
                        <Moon className="w-4 h-4" /> Evening Session
                        <span className="text-xs bg-indigo-100 px-2 py-0.5 rounded">6:00 PM - 10:00 PM</span>
                      </h4>
                      {dayAppointments.evening.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {dayAppointments.evening.map((appt, idx) => (
                            <div key={idx} className={`flex items-center justify-between p-2 rounded text-sm ${appt.status === 'cancelled' ? 'bg-red-50 line-through text-red-400' : 'bg-slate-50'}`}>
                              <div>
                                <p className="font-medium">{appt.patient_name}</p>
                                <p className="text-xs text-muted-foreground">{appt.time}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded ${appt.status === 'cancelled' ? 'bg-red-100 text-red-700' : appt.type === 'emergency' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                {appt.status === 'cancelled' ? 'Cancelled' : appt.type || 'Booked'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No appointments</p>
                      )}
                      <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
                        {dayAppointments.evening.filter(a => a.status !== 'cancelled').length} booked • {dayAppointments.evening.filter(a => a.status === 'cancelled').length} cancelled
                      </div>
                    </div>
                  </div>

                  {/* Quick Cancel Button for Selected Day */}
                  <div className="mt-4 flex justify-center">
                    <Button 
                      variant="outline" 
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        setCancelForm(prev => ({
                          ...prev,
                          doctor: selectedScheduleDay.doctor,
                          clinic: selectedScheduleDay.doctor === 'Dr. Neha Patel' ? 'Pushpa Clinic' : 'Amnion Clinic',
                          cancel_type: 'day'
                        }));
                        setSelectedDate(selectedScheduleDay.date);
                        setShowCancelModal(true);
                      }}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" /> Cancel All for This Day
                    </Button>
                  </div>
                </Card>
              )}

              {/* Quick Stats and Options */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-4 bg-slate-50">
                  <h3 className="font-medium mb-3">Upcoming Appointments</h3>
                  {recentOrders?.appointments?.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {recentOrders.appointments.filter(a => a.status !== 'cancelled').slice(0, 8).map((appt, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div>
                            <p className="font-medium text-sm">{appt.patient_name}</p>
                            <p className="text-xs text-muted-foreground">{appt.doctor}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{appt.date}</p>
                            <p className="text-xs text-muted-foreground">{appt.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No upcoming appointments</p>
                  )}
                </Card>

                <Card className="p-4 bg-amber-50 border-amber-200">
                  <h3 className="font-medium mb-3 flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="w-5 h-5" /> Cancellation Options
                  </h3>
                  <ul className="space-y-2 text-sm text-amber-900">
                    <li><span className="font-bold">Session:</span> Cancel a specific time slot</li>
                    <li><span className="font-bold">Bulk Session:</span> Cancel morning (11-2) or evening (6-10)</li>
                    <li><span className="font-bold">Day:</span> Cancel all appointments for a day</li>
                    <li><span className="font-bold">Range:</span> Cancel for multiple days</li>
                    <li><span className="font-bold">Session Range:</span> Cancel from date/session to date/session</li>
                  </ul>
                  <div className="mt-4 p-2 bg-white rounded border border-amber-200">
                    <p className="text-xs text-amber-700">💡 <strong>Tip:</strong> Click on any day in the schedule above to see details and quickly cancel appointments.</p>
                  </div>
                </Card>
              </div>
            </Card>
          </TabsContent>

          {/* Staff Management Tab */}
          <TabsContent value="staff">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                <div>
                  <h2 className="font-heading text-xl font-semibold">Staff Management</h2>
                  <p className="text-sm text-muted-foreground">Manage doctors, clinic staff, and service staff</p>
                </div>
                <Button onClick={() => setShowAddStaffModal(true)} className="rounded-full" data-testid="add-staff-button">
                  <Plus className="w-4 h-4 mr-2" /> Add Staff
                </Button>
              </div>

              {staffLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : staffList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No staff members yet</p>
                  <p className="text-sm">Add doctors and staff to manage appointments and orders</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {staffList.map((staff) => (
                    <div key={staff.id} className={`flex items-center justify-between p-4 rounded-lg border ${staff.active !== false ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            staff.role === 'doctor' ? 'bg-blue-100 text-blue-600' :
                            staff.role === 'clinic_staff' ? 'bg-green-100 text-green-600' :
                            staff.role === 'pharmacy_staff' ? 'bg-orange-100 text-orange-600' :
                            'bg-purple-100 text-purple-600'
                          }`}>
                            {staff.role === 'doctor' ? '👨‍⚕️' : 
                             staff.role === 'clinic_staff' ? '🏥' :
                             staff.role === 'pharmacy_staff' ? '💊' : '🔬'}
                          </div>
                          <div>
                            <p className="font-medium">{staff.name}</p>
                            <p className="text-sm text-muted-foreground">
                              @{staff.username} • {staffRoles[staff.role] || staff.role}
                              {staff.doctor_name && ` • ${staff.doctor_name}`}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStaff(staff.id)}
                        >
                          {staff.active !== false ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Staff Portal Access</h3>
                <p className="text-sm text-blue-700">
                  Staff members can login at <code className="bg-blue-100 px-2 py-0.5 rounded">/staff</code> with their username and password.
                </p>
              </div>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-4">
                <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" /> Recent Appointments
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {recentOrders?.appointments?.map((appt, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg text-sm">
                      <p className="font-medium">{appt.patient_name}</p>
                      <p className="text-muted-foreground">{appt.doctor}</p>
                      <p className="text-muted-foreground">{appt.date} • {appt.time}</p>
                      {appt.status === 'cancelled' && <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">Cancelled</span>}
                    </div>
                  )) || <p className="text-muted-foreground text-sm">No appointments</p>}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-500" /> Recent Diagnostics
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {recentOrders?.diagnostic_orders?.map((order, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg text-sm">
                      <p className="font-medium">{order.patient_name}</p>
                      <p className="text-muted-foreground">{order.tests?.length || 0} tests</p>
                      <p className="text-muted-foreground">{order.preferred_date}</p>
                    </div>
                  )) || <p className="text-muted-foreground text-sm">No diagnostics</p>}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-orange-500" /> Recent Pharmacy
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {recentOrders?.pharmacy_orders?.map((order, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg text-sm">
                      <p className="font-medium">{order.patient_name}</p>
                      <p className="text-muted-foreground">{order.medicines?.length || 0} medicines</p>
                      <p className="text-muted-foreground truncate">{order.delivery_address}</p>
                    </div>
                  )) || <p className="text-muted-foreground text-sm">No pharmacy orders</p>}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                <div>
                  <h2 className="font-heading text-xl font-semibold">Analytics Dashboard</h2>
                  <p className="text-sm text-muted-foreground">Revenue and appointment trends</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Time Range:</Label>
                  <select 
                    value={analyticsDays}
                    onChange={(e) => setAnalyticsDays(Number(e.target.value))}
                    className="h-9 px-3 border rounded-md text-sm"
                  >
                    <option value={7}>Last 7 Days</option>
                    <option value={14}>Last 14 Days</option>
                    <option value={30}>Last 30 Days</option>
                  </select>
                </div>
              </div>

              {analyticsLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : analyticsData ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                      <p className="text-sm text-green-700">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-800">₹{analyticsData.total_revenue?.toLocaleString()}</p>
                      <p className="text-xs text-green-600 mt-1">Last {analyticsDays} days</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                      <p className="text-sm text-blue-700">Appointments</p>
                      <p className="text-2xl font-bold text-blue-800">{analyticsData.total_appointments}</p>
                      <p className="text-xs text-blue-600 mt-1">Last {analyticsDays} days</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                      <p className="text-sm text-purple-700">Diagnostics</p>
                      <p className="text-2xl font-bold text-purple-800">{analyticsData.total_diagnostics}</p>
                      <p className="text-xs text-purple-600 mt-1">Last {analyticsDays} days</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                      <p className="text-sm text-orange-700">Pharmacy Orders</p>
                      <p className="text-2xl font-bold text-orange-800">{analyticsData.total_pharmacy}</p>
                      <p className="text-xs text-orange-600 mt-1">Last {analyticsDays} days</p>
                    </div>
                  </div>

                  {/* Daily Revenue Chart */}
                  <div className="bg-white border rounded-xl p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" /> Daily Revenue Trend
                    </h3>
                    <div className="h-48 flex items-end gap-1">
                      {analyticsData.revenue?.map((val, idx) => {
                        const maxVal = Math.max(...analyticsData.revenue, 1);
                        const height = (val / maxVal) * 100;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center">
                            <div 
                              className="w-full bg-gradient-to-t from-green-500 to-green-300 rounded-t-sm transition-all hover:from-green-600 hover:to-green-400"
                              style={{ height: `${Math.max(height, 2)}%` }}
                              title={`₹${val}`}
                            />
                            <p className="text-[10px] text-gray-400 mt-1 -rotate-45 origin-left whitespace-nowrap">
                              {analyticsData.date_labels?.[idx]?.slice(5)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Daily Appointments Chart */}
                  <div className="bg-white border rounded-xl p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" /> Daily Appointments
                    </h3>
                    <div className="h-48 flex items-end gap-1">
                      {analyticsData.appointments?.map((val, idx) => {
                        const maxVal = Math.max(...analyticsData.appointments, 1);
                        const height = (val / maxVal) * 100;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center">
                            <div 
                              className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-sm transition-all hover:from-blue-600 hover:to-blue-400"
                              style={{ height: `${Math.max(height, 2)}%` }}
                              title={`${val} appointments`}
                            />
                            <p className="text-[10px] text-gray-400 mt-1 -rotate-45 origin-left whitespace-nowrap">
                              {analyticsData.date_labels?.[idx]?.slice(5)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Appointments by Doctor */}
                  {analyticsData.appointments_by_doctor && Object.keys(analyticsData.appointments_by_doctor).length > 0 && (
                    <div className="bg-white border rounded-xl p-4">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" /> Appointments by Doctor (All Time)
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(analyticsData.appointments_by_doctor).map(([doctor, data]) => {
                          const confirmRate = data.total > 0 ? Math.round((data.confirmed / data.total) * 100) : 0;
                          return (
                            <div key={doctor} className="flex items-center gap-4">
                              <div className="w-32 font-medium text-sm truncate">{doctor}</div>
                              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 flex items-center justify-end pr-2"
                                  style={{ width: `${Math.min(confirmRate, 100)}%` }}
                                >
                                  <span className="text-xs text-white font-medium">{confirmRate}%</span>
                                </div>
                              </div>
                              <div className="w-20 text-right text-sm text-gray-600">
                                {data.confirmed}/{data.total}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  No analytics data available
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Clinic Management Tab */}
          <TabsContent value="clinic-management">
            <ClinicManagementDashboard token={localStorage.getItem('adminToken')} clinic="pushpa" />
          </TabsContent>

          {/* Glydex Staff Portal Tab */}
          <TabsContent value="glydex-staff">
            <GlydexStaffPortal staffName="Admin" />
          </TabsContent>

          {/* ANC Registration Tab */}
          <TabsContent value="anc-registration">
            <ANCRegistration staffName="Admin" clinic="amnion" />
          </TabsContent>

          {/* Biometric Attendance Tab */}
          <TabsContent value="biometric">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl font-semibold">Staff Attendance - Select Clinic</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card 
                  className={`p-4 cursor-pointer hover:shadow-lg transition-all ${selectedAttendanceClinic === 'pushpa' ? 'ring-2 ring-violet-500 bg-violet-50' : ''}`}
                  onClick={() => setSelectedAttendanceClinic('pushpa')}
                  data-testid="clinic-select-pushpa"
                >
                  <div className="text-center">
                    <Building2 className="w-10 h-10 mx-auto text-violet-600 mb-2" />
                    <h3 className="font-semibold">Pushpa Clinic</h3>
                    <p className="text-xs text-gray-500">Staff attendance tracking</p>
                  </div>
                </Card>
                <Card 
                  className={`p-4 cursor-pointer hover:shadow-lg transition-all ${selectedAttendanceClinic === 'amnion' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                  onClick={() => setSelectedAttendanceClinic('amnion')}
                  data-testid="clinic-select-amnion"
                >
                  <div className="text-center">
                    <Building2 className="w-10 h-10 mx-auto text-blue-600 mb-2" />
                    <h3 className="font-semibold">Amnion Clinic</h3>
                    <p className="text-xs text-gray-500">Staff attendance tracking</p>
                  </div>
                </Card>
                <Card 
                  className={`p-4 cursor-pointer hover:shadow-lg transition-all ${selectedAttendanceClinic === 'pharmacy' ? 'ring-2 ring-orange-500 bg-orange-50' : ''}`}
                  onClick={() => setSelectedAttendanceClinic('pharmacy')}
                  data-testid="clinic-select-pharmacy"
                >
                  <div className="text-center">
                    <Pill className="w-10 h-10 mx-auto text-orange-600 mb-2" />
                    <h3 className="font-semibold">Orange Pharmacy</h3>
                    <p className="text-xs text-gray-500">Pharmacy staff attendance</p>
                  </div>
                </Card>
              </div>
              {selectedAttendanceClinic && (
                <BiometricAttendance clinic={selectedAttendanceClinic} key={selectedAttendanceClinic} />
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Medicine Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Medicine</DialogTitle>
            <DialogDescription>Enter medicine details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMedicine} className="space-y-4">
            <div>
              <Label>Medicine Name</Label>
              <Input value={newMedicine.name} onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })} placeholder="e.g., PARACETAMOL 500MG" className="mt-1" />
            </div>
            <div>
              <Label>Form</Label>
              <select value={newMedicine.form} onChange={(e) => setNewMedicine({ ...newMedicine, form: e.target.value })} className="w-full mt-1 h-10 px-3 border rounded-md">
                {['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Gel', 'Powder', 'Inhaler', 'Generic'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" disabled={addLoading}>{addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Medicine Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Medicine</DialogTitle>
            <DialogDescription>Delete <strong>{deleteTarget}</strong>?</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteMedicine} disabled={deleteLoading}>{deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Test Modal */}
      <Dialog open={showAddTestModal} onOpenChange={setShowAddTestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Diagnostic Test</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTest} className="space-y-4">
            <div>
              <Label>Test Name</Label>
              <Input value={newTest.name} onChange={(e) => setNewTest({ ...newTest, name: e.target.value })} placeholder="e.g., Vitamin B6" className="mt-1" />
            </div>
            <div>
              <Label>Category</Label>
              <select value={newTest.category} onChange={(e) => setNewTest({ ...newTest, category: e.target.value, subcategory: getSubcategories(e.target.value)[0] })} className="w-full mt-1 h-10 px-3 border rounded-md">
                <option value="imaging">Imaging</option>
                <option value="pathology">Pathology</option>
              </select>
            </div>
            <div>
              <Label>Subcategory</Label>
              <select value={newTest.subcategory} onChange={(e) => setNewTest({ ...newTest, subcategory: e.target.value })} className="w-full mt-1 h-10 px-3 border rounded-md">
                {getSubcategories(newTest.category).map(sub => <option key={sub} value={sub}>{sub.charAt(0).toUpperCase() + sub.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowAddTestModal(false)}>Cancel</Button>
              <Button type="submit" disabled={addTestLoading}>{addTestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Test Modal */}
      <Dialog open={!!deleteTestTarget} onOpenChange={() => setDeleteTestTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Test</DialogTitle>
            <DialogDescription>Delete <strong>{deleteTestTarget?.name}</strong>?</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteTestTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTest} disabled={deleteTestLoading}>{deleteTestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Appointments Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Cancel Appointments
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Doctor</Label>
              <select value={cancelForm.doctor} onChange={(e) => setCancelForm({ ...cancelForm, doctor: e.target.value })} className="w-full mt-1 h-10 px-3 border rounded-md">
                <option value="Dr. Neha Patel">Dr. Neha Patel</option>
                <option value="Dr. Vikas Jha">Dr. Vikas Jha</option>
              </select>
            </div>
            <div>
              <Label>Cancellation Type</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {[
                  { value: 'session', label: 'Single Slot' },
                  { value: 'bulk_session', label: 'Session (11-2 / 6-10)' },
                  { value: 'day', label: 'Whole Day' },
                  { value: 'range', label: 'Date Range' },
                  { value: 'session_range', label: 'Session Range' }
                ].map(type => (
                  <Button 
                    key={type.value} 
                    type="button" 
                    variant={cancelForm.cancel_type === type.value ? 'default' : 'outline'} 
                    onClick={() => setCancelForm({ ...cancelForm, cancel_type: type.value })} 
                    className="text-xs h-auto py-2"
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {cancelForm.cancel_type === 'session' && '• Cancel a specific time slot on a date'}
                {cancelForm.cancel_type === 'bulk_session' && '• Cancel Morning (11AM-2PM) or Evening (6PM-10PM) on a date'}
                {cancelForm.cancel_type === 'day' && '• Cancel all appointments on a selected day'}
                {cancelForm.cancel_type === 'range' && '• Cancel all appointments between two dates'}
                {cancelForm.cancel_type === 'session_range' && '• Cancel from Date A/Session A to Date B/Session B'}
              </p>
            </div>
            
            {/* Day selection */}
            {cancelForm.cancel_type === 'day' && (
              <div>
                <Label>Date</Label>
                <CalendarComponent mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border mt-1" />
              </div>
            )}
            
            {/* Bulk Session selection */}
            {cancelForm.cancel_type === 'bulk_session' && (
              <>
                <div>
                  <Label>Date</Label>
                  <CalendarComponent mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border mt-1" />
                </div>
                <div>
                  <Label>Session to Cancel</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button 
                      type="button" 
                      variant={cancelForm.session === 'morning' ? 'default' : 'outline'}
                      onClick={() => setCancelForm({ ...cancelForm, session: 'morning' })}
                      className="flex flex-col h-auto py-3"
                    >
                      <span className="font-bold">Morning</span>
                      <span className="text-xs opacity-75">11:00 AM - 2:00 PM</span>
                    </Button>
                    <Button 
                      type="button" 
                      variant={cancelForm.session === 'evening' ? 'default' : 'outline'}
                      onClick={() => setCancelForm({ ...cancelForm, session: 'evening' })}
                      className="flex flex-col h-auto py-3"
                    >
                      <span className="font-bold">Evening</span>
                      <span className="text-xs opacity-75">6:00 PM - 10:00 PM</span>
                    </Button>
                  </div>
                </div>
              </>
            )}
            
            {/* Date Range */}
            {cancelForm.cancel_type === 'range' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Start Date</Label>
                  <CalendarComponent mode="single" selected={dateRangeStart} onSelect={setDateRangeStart} className="rounded-md border mt-1 text-xs" />
                </div>
                <div>
                  <Label>End Date</Label>
                  <CalendarComponent mode="single" selected={dateRangeEnd} onSelect={setDateRangeEnd} className="rounded-md border mt-1 text-xs" />
                </div>
              </div>
            )}
            
            {/* Session Range - From Date/Session To Date/Session */}
            {cancelForm.cancel_type === 'session_range' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-green-600 font-semibold">FROM</Label>
                    <CalendarComponent mode="single" selected={dateRangeStart} onSelect={setDateRangeStart} className="rounded-md border text-xs" />
                    <div className="grid grid-cols-2 gap-1">
                      <Button 
                        type="button" 
                        size="sm"
                        variant={cancelForm.start_session === 'morning' ? 'default' : 'outline'}
                        onClick={() => setCancelForm({ ...cancelForm, start_session: 'morning' })}
                      >
                        Morning
                      </Button>
                      <Button 
                        type="button" 
                        size="sm"
                        variant={cancelForm.start_session === 'evening' ? 'default' : 'outline'}
                        onClick={() => setCancelForm({ ...cancelForm, start_session: 'evening' })}
                      >
                        Evening
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-red-600 font-semibold">TO</Label>
                    <CalendarComponent mode="single" selected={dateRangeEnd} onSelect={setDateRangeEnd} className="rounded-md border text-xs" />
                    <div className="grid grid-cols-2 gap-1">
                      <Button 
                        type="button" 
                        size="sm"
                        variant={cancelForm.end_session === 'morning' ? 'default' : 'outline'}
                        onClick={() => setCancelForm({ ...cancelForm, end_session: 'morning' })}
                      >
                        Morning
                      </Button>
                      <Button 
                        type="button" 
                        size="sm"
                        variant={cancelForm.end_session === 'evening' ? 'default' : 'outline'}
                        onClick={() => setCancelForm({ ...cancelForm, end_session: 'evening' })}
                      >
                        Evening
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Single Session/Slot */}
            {cancelForm.cancel_type === 'session' && (
              <>
                <div>
                  <Label>Date</Label>
                  <CalendarComponent mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border mt-1" />
                </div>
                <div>
                  <Label>Time Slot</Label>
                  <select value={cancelForm.time} onChange={(e) => setCancelForm({ ...cancelForm, time: e.target.value })} className="w-full mt-1 h-10 px-3 border rounded-md">
                    <option value="">Select time</option>
                    <optgroup label="Morning (11 AM - 2 PM)">
                      {['11:00 AM', '11:10 AM', '11:20 AM', '11:30 AM', '11:40 AM', '11:50 AM', '12:00 PM', '12:10 PM', '12:20 PM', '12:30 PM', '12:40 PM', '12:50 PM', '1:00 PM', '1:10 PM', '1:20 PM', '1:30 PM', '1:40 PM', '1:50 PM', '2:00 PM'].map(t => <option key={t} value={t}>{t}</option>)}
                    </optgroup>
                    <optgroup label="Evening (6 PM - 10 PM)">
                      {['6:00 PM', '6:10 PM', '6:20 PM', '6:30 PM', '6:40 PM', '6:50 PM', '7:00 PM', '7:10 PM', '7:20 PM', '7:30 PM', '7:40 PM', '7:50 PM', '8:00 PM', '8:10 PM', '8:20 PM', '8:30 PM', '8:40 PM', '8:50 PM', '9:00 PM', '9:10 PM', '9:20 PM', '9:30 PM', '9:40 PM', '9:50 PM', '10:00 PM'].map(t => <option key={t} value={t}>{t}</option>)}
                    </optgroup>
                  </select>
                </div>
              </>
            )}
            <div>
              <Label>Reason</Label>
              <Input value={cancelForm.reason} onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })} className="mt-1" placeholder="Doctor on leave, Emergency, etc." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCancelModal(false)}>Close</Button>
              <Button variant="destructive" onClick={handleCancelAppointments} disabled={cancelLoading}>{cancelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel Appointments'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Status Modal */}
      <Dialog open={updateStatusModal} onOpenChange={setUpdateStatusModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              {selectedOrder?.patient_name} - #{selectedOrder?.id?.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full mt-1 h-10 px-3 border rounded-md"
              >
                {(orderType === 'pharmacy' 
                  ? ['Order Booked', 'Packing', 'Out for Delivery', 'Delivered']
                  : ['Test Booked', 'Sample Collected', 'In Process', 'Reports Generated']
                ).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Add any notes about this status update..."
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setUpdateStatusModal(false)}>Cancel</Button>
              <Button onClick={handleUpdateStatus} disabled={updateLoading}>
                {updateLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Update Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Staff Modal */}
      <Dialog open={showAddStaffModal} onOpenChange={setShowAddStaffModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
            <DialogDescription>Create a login for doctors or staff members</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                placeholder="e.g., Dr. Neha Patel"
              />
            </div>
            <div>
              <Label>Username *</Label>
              <Input
                value={newStaff.username}
                onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                placeholder="e.g., drneha"
              />
            </div>
            <div>
              <Label>Password *</Label>
              <Input
                type="password"
                value={newStaff.password}
                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                placeholder="Create a password"
              />
            </div>
            <div>
              <Label>Role *</Label>
              <select
                value={newStaff.role}
                onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="clinic_staff">Clinic Staff - Book Walk-ins & Check-in</option>
                <option value="doctor">Doctor - Mark Appointments Complete</option>
                <option value="pharmacy_staff">Pharmacy Staff - Update Order Status</option>
                <option value="diagnostics_staff">Diagnostics Staff - Update Test Status</option>
              </select>
            </div>
            {newStaff.role === 'doctor' && (
              <div>
                <Label>Doctor Name *</Label>
                <select
                  value={newStaff.doctor_name}
                  onChange={(e) => setNewStaff({ ...newStaff, doctor_name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Select doctor...</option>
                  {doctors.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddStaffModal(false)}>Cancel</Button>
              <Button onClick={handleAddStaff} disabled={addStaffLoading}>
                {addStaffLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Staff
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
