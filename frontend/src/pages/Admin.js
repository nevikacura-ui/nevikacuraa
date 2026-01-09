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
import { format } from 'date-fns';
import { 
  ArrowLeft, Pill, Users, Calendar, FileText, Package, 
  Plus, Trash2, Search, Loader2, LogOut, Shield,
  BarChart3, FlaskConical, UserX, AlertTriangle, X,
  Truck, CheckCircle2, Clock, MapPin
} from 'lucide-react';

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
    doctor: 'Dr. Vikas Jha',
    clinic: 'Nevika Clinic',
    cancel_type: 'day',
    date: '',
    time: '',
    start_date: '',
    end_date: '',
    reason: 'Doctor on leave'
  });
  const [cancelLoading, setCancelLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateRangeStart, setDateRangeStart] = useState(null);
  const [dateRangeEnd, setDateRangeEnd] = useState(null);
  
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

  const doctors = ['Dr. Ankita Gupta', 'Dr. Vikas Jha'];

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
      } else if (cancelForm.cancel_type === 'range' && dateRangeStart && dateRangeEnd) {
        payload.start_date = format(dateRangeStart, 'yyyy-MM-dd');
        payload.end_date = format(dateRangeEnd, 'yyyy-MM-dd');
      }
      
      const response = await axios.post(`${API}/admin/appointments/cancel`, payload, { 
        headers: getAuthHeaders() 
      });
      
      toast.success(`Cancelled ${response.data.cancelled_count} appointment(s)`);
      setShowCancelModal(false);
      setCancelForm({
        doctor: 'Dr. Vikas Jha',
        clinic: 'Nevika Clinic',
        cancel_type: 'day',
        date: '',
        time: '',
        start_date: '',
        end_date: '',
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
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="inventory" data-testid="inventory-tab">
              <Package className="w-4 h-4 mr-2" /> Pharmacy
            </TabsTrigger>
            <TabsTrigger value="tests" data-testid="tests-tab">
              <FlaskConical className="w-4 h-4 mr-2" /> Tests
            </TabsTrigger>
            <TabsTrigger value="tracking" data-testid="tracking-tab">
              <Truck className="w-4 h-4 mr-2" /> Tracking
            </TabsTrigger>
            <TabsTrigger value="leave" data-testid="leave-tab">
              <UserX className="w-4 h-4 mr-2" /> Leave
            </TabsTrigger>
            <TabsTrigger value="staff" data-testid="staff-tab">
              <Users className="w-4 h-4 mr-2" /> Staff
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="orders-tab">
              <BarChart3 className="w-4 h-4 mr-2" /> Orders
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

          {/* Doctor Leave Tab */}
          <TabsContent value="leave">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                <div>
                  <h2 className="font-heading text-xl font-semibold">Doctor Leave Management</h2>
                  <p className="text-sm text-muted-foreground">Cancel appointments when doctors are on leave</p>
                </div>
                <Button onClick={() => setShowCancelModal(true)} className="rounded-full bg-red-500 hover:bg-red-600">
                  <AlertTriangle className="w-4 h-4 mr-2" /> Cancel Appointments
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-4 bg-slate-50">
                  <h3 className="font-medium mb-3">Upcoming Appointments</h3>
                  {recentOrders?.appointments?.length > 0 ? (
                    <div className="space-y-2">
                      {recentOrders.appointments.filter(a => a.status !== 'cancelled').slice(0, 5).map((appt, idx) => (
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
                    <li><span className="font-bold">Day:</span> Cancel all appointments for a day</li>
                    <li><span className="font-bold">Range:</span> Cancel for multiple days</li>
                  </ul>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Cancel Appointments
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Doctor</Label>
              <select value={cancelForm.doctor} onChange={(e) => setCancelForm({ ...cancelForm, doctor: e.target.value })} className="w-full mt-1 h-10 px-3 border rounded-md">
                <option value="Dr. Vikas Jha">Dr. Vikas Jha</option>
                <option value="Dr. Vikas Jha">Dr. Vikas Jha</option>
              </select>
            </div>
            <div>
              <Label>Type</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {['session', 'day', 'range'].map(type => (
                  <Button key={type} type="button" variant={cancelForm.cancel_type === type ? 'default' : 'outline'} onClick={() => setCancelForm({ ...cancelForm, cancel_type: type })} className="capitalize">{type}</Button>
                ))}
              </div>
            </div>
            {cancelForm.cancel_type === 'day' && (
              <div>
                <Label>Date</Label>
                <CalendarComponent mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border mt-1" />
              </div>
            )}
            {cancelForm.cancel_type === 'range' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Start</Label>
                  <CalendarComponent mode="single" selected={dateRangeStart} onSelect={setDateRangeStart} className="rounded-md border mt-1 text-xs" />
                </div>
                <div>
                  <Label>End</Label>
                  <CalendarComponent mode="single" selected={dateRangeEnd} onSelect={setDateRangeEnd} className="rounded-md border mt-1 text-xs" />
                </div>
              </div>
            )}
            {cancelForm.cancel_type === 'session' && (
              <>
                <div>
                  <Label>Date</Label>
                  <CalendarComponent mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border mt-1" />
                </div>
                <div>
                  <Label>Time</Label>
                  <select value={cancelForm.time} onChange={(e) => setCancelForm({ ...cancelForm, time: e.target.value })} className="w-full mt-1 h-10 px-3 border rounded-md">
                    <option value="">Select time</option>
                    {['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </>
            )}
            <div>
              <Label>Reason</Label>
              <Input value={cancelForm.reason} onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })} className="mt-1" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCancelModal(false)}>Cancel</Button>
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
