import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { toast } from 'sonner';
import axios from 'axios';
import { format } from 'date-fns';
import { 
  ArrowLeft, Pill, Users, Calendar, FileText, Package, 
  Plus, Trash2, Search, Loader2, LogOut, Shield,
  BarChart3, FlaskConical, UserX, AlertTriangle, X
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
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
  
  // Recent orders
  const [recentOrders, setRecentOrders] = useState(null);

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

  const fetchAppointments = async (doctor, date) => {
    setAppointmentsLoading(true);
    try {
      const params = {};
      if (doctor) params.doctor = doctor;
      if (date) params.date = date;
      
      const response = await axios.get(`${API}/admin/appointments`, { 
        headers: getAuthHeaders(),
        params
      });
      setAppointments(response.data.appointments);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setAppointmentsLoading(false);
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

  // Get subcategories based on category
  const getSubcategories = (category) => {
    if (category === 'imaging') return ['ecg', 'sonography'];
    return ['blood', 'urine', 'stool'];
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
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="inventory" data-testid="inventory-tab">
              <Package className="w-4 h-4 mr-2" /> Pharmacy
            </TabsTrigger>
            <TabsTrigger value="tests" data-testid="tests-tab">
              <FlaskConical className="w-4 h-4 mr-2" /> Tests
            </TabsTrigger>
            <TabsTrigger value="leave" data-testid="leave-tab">
              <UserX className="w-4 h-4 mr-2" /> Doctor Leave
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
                  data-testid="admin-search-input"
                />
              </div>

              {inventoryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
                </div>
              ) : (
                <div 
                  ref={listRef}
                  className="max-h-[400px] overflow-y-auto border rounded-lg"
                  onScroll={handleScroll}
                >
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
                  {/* Imaging Tests */}
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
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setDeleteTestTarget({ category: 'imaging', subcategory, name: test })}
                                  className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Pathology Tests */}
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
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setDeleteTestTarget({ category: 'pathology', subcategory, name: test })}
                                  className="text-red-500 hover:text-red-700 h-6 w-6 p-0 flex-shrink-0"
                                >
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
              ) : (
                <div className="p-8 text-center text-muted-foreground">No tests configured</div>
              )}
            </Card>
          </TabsContent>

          {/* Doctor Leave Tab */}
          <TabsContent value="leave">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                <div>
                  <h2 className="font-heading text-xl font-semibold">Doctor Leave Management</h2>
                  <p className="text-sm text-muted-foreground">Cancel appointments when doctors are on leave</p>
                </div>
                <Button onClick={() => setShowCancelModal(true)} className="rounded-full bg-red-500 hover:bg-red-600" data-testid="cancel-appointments-button">
                  <AlertTriangle className="w-4 h-4 mr-2" /> Cancel Appointments
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Quick Stats */}
                <Card className="p-4 bg-slate-50">
                  <h3 className="font-medium mb-3">Upcoming Appointments</h3>
                  {recentOrders?.appointments?.length > 0 ? (
                    <div className="space-y-2">
                      {recentOrders.appointments.slice(0, 5).map((appt, idx) => (
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

                {/* Cancellation Guide */}
                <Card className="p-4 bg-amber-50 border-amber-200">
                  <h3 className="font-medium mb-3 flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="w-5 h-5" /> Cancellation Options
                  </h3>
                  <ul className="space-y-2 text-sm text-amber-900">
                    <li className="flex items-start gap-2">
                      <span className="font-bold">Session:</span>
                      <span>Cancel a specific time slot on a specific day</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">Day:</span>
                      <span>Cancel all appointments for a single day</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">Range:</span>
                      <span>Cancel all appointments for multiple days (e.g., vacation)</span>
                    </li>
                  </ul>
                  <p className="mt-3 text-xs text-amber-700">
                    Cancelled patients will be notified via email. Appointments will be marked as cancelled but not deleted.
                  </p>
                </Card>
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
                  {recentOrders?.appointments?.length > 0 ? (
                    recentOrders.appointments.map((appt, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg text-sm">
                        <p className="font-medium">{appt.patient_name}</p>
                        <p className="text-muted-foreground">{appt.doctor}</p>
                        <p className="text-muted-foreground">{appt.date} • {appt.time}</p>
                        {appt.status === 'cancelled' && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">Cancelled</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No recent appointments</p>
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-500" /> Recent Diagnostics
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {recentOrders?.diagnostic_orders?.length > 0 ? (
                    recentOrders.diagnostic_orders.map((order, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg text-sm">
                        <p className="font-medium">{order.patient_name}</p>
                        <p className="text-muted-foreground">{order.tests?.length || 0} tests</p>
                        <p className="text-muted-foreground">{order.preferred_date}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No recent diagnostics</p>
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-orange-500" /> Recent Pharmacy
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {recentOrders?.pharmacy_orders?.length > 0 ? (
                    recentOrders.pharmacy_orders.map((order, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg text-sm">
                        <p className="font-medium">{order.patient_name}</p>
                        <p className="text-muted-foreground">{order.medicines?.length || 0} medicines</p>
                        <p className="text-muted-foreground truncate">{order.delivery_address}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No recent pharmacy orders</p>
                  )}
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
            <DialogDescription>Enter medicine details to add to inventory</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMedicine} className="space-y-4">
            <div>
              <Label htmlFor="med-name">Medicine Name</Label>
              <Input
                id="med-name"
                value={newMedicine.name}
                onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                placeholder="e.g., PARACETAMOL 500MG TAB"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="med-form">Form</Label>
              <select
                id="med-form"
                value={newMedicine.form}
                onChange={(e) => setNewMedicine({ ...newMedicine, form: e.target.value })}
                className="w-full mt-1 h-10 px-3 border rounded-md"
              >
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
                <option value="Cream">Cream</option>
                <option value="Ointment">Ointment</option>
                <option value="Drops">Drops</option>
                <option value="Gel">Gel</option>
                <option value="Powder">Powder</option>
                <option value="Inhaler">Inhaler</option>
                <option value="Generic">Generic</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" disabled={addLoading}>
                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Medicine'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Medicine Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Medicine</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteMedicine} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Test Modal */}
      <Dialog open={showAddTestModal} onOpenChange={setShowAddTestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Diagnostic Test</DialogTitle>
            <DialogDescription>Add a new test to Proton Diagnostics</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTest} className="space-y-4">
            <div>
              <Label htmlFor="test-name">Test Name</Label>
              <Input
                id="test-name"
                value={newTest.name}
                onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                placeholder="e.g., Vitamin B6"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="test-category">Category</Label>
              <select
                id="test-category"
                value={newTest.category}
                onChange={(e) => setNewTest({ ...newTest, category: e.target.value, subcategory: getSubcategories(e.target.value)[0] })}
                className="w-full mt-1 h-10 px-3 border rounded-md"
              >
                <option value="imaging">Imaging</option>
                <option value="pathology">Pathology</option>
              </select>
            </div>
            <div>
              <Label htmlFor="test-subcategory">Subcategory</Label>
              <select
                id="test-subcategory"
                value={newTest.subcategory}
                onChange={(e) => setNewTest({ ...newTest, subcategory: e.target.value })}
                className="w-full mt-1 h-10 px-3 border rounded-md"
              >
                {getSubcategories(newTest.category).map(sub => (
                  <option key={sub} value={sub}>{sub.charAt(0).toUpperCase() + sub.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowAddTestModal(false)}>Cancel</Button>
              <Button type="submit" disabled={addTestLoading}>
                {addTestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Test'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Test Modal */}
      <Dialog open={!!deleteTestTarget} onOpenChange={() => setDeleteTestTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Diagnostic Test</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTestTarget?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteTestTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTest} disabled={deleteTestLoading}>
              {deleteTestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
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
            <DialogDescription>
              Cancel appointments for a doctor on leave
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Doctor</Label>
              <select
                value={cancelForm.doctor}
                onChange={(e) => setCancelForm({ ...cancelForm, doctor: e.target.value })}
                className="w-full mt-1 h-10 px-3 border rounded-md"
              >
                <option value="Dr. Vikas Jha">Dr. Vikas Jha</option>
                <option value="Dr. Priya Sharma">Dr. Priya Sharma</option>
              </select>
            </div>

            <div>
              <Label>Cancellation Type</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {['session', 'day', 'range'].map(type => (
                  <Button
                    key={type}
                    type="button"
                    variant={cancelForm.cancel_type === type ? 'default' : 'outline'}
                    onClick={() => setCancelForm({ ...cancelForm, cancel_type: type })}
                    className="capitalize"
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            {cancelForm.cancel_type === 'session' && (
              <>
                <div>
                  <Label>Date</Label>
                  <div className="mt-1">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border"
                    />
                  </div>
                </div>
                <div>
                  <Label>Time Slot</Label>
                  <select
                    value={cancelForm.time}
                    onChange={(e) => setCancelForm({ ...cancelForm, time: e.target.value })}
                    className="w-full mt-1 h-10 px-3 border rounded-md"
                  >
                    <option value="">Select time</option>
                    {['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', 
                      '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'].map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {cancelForm.cancel_type === 'day' && (
              <div>
                <Label>Select Date</Label>
                <div className="mt-1">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                </div>
                {selectedDate && (
                  <p className="text-sm text-muted-foreground mt-2">
                    All appointments on <strong>{format(selectedDate, 'PPP')}</strong> will be cancelled
                  </p>
                )}
              </div>
            )}

            {cancelForm.cancel_type === 'range' && (
              <div>
                <Label>Select Date Range</Label>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                    <CalendarComponent
                      mode="single"
                      selected={dateRangeStart}
                      onSelect={setDateRangeStart}
                      className="rounded-md border text-sm"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">End Date</p>
                    <CalendarComponent
                      mode="single"
                      selected={dateRangeEnd}
                      onSelect={setDateRangeEnd}
                      className="rounded-md border text-sm"
                    />
                  </div>
                </div>
                {dateRangeStart && dateRangeEnd && (
                  <p className="text-sm text-muted-foreground mt-2">
                    All appointments from <strong>{format(dateRangeStart, 'PP')}</strong> to <strong>{format(dateRangeEnd, 'PP')}</strong> will be cancelled
                  </p>
                )}
              </div>
            )}

            <div>
              <Label>Reason</Label>
              <Input
                value={cancelForm.reason}
                onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}
                placeholder="e.g., Doctor on leave, Emergency"
                className="mt-1"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCancelModal(false)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={handleCancelAppointments}
                disabled={cancelLoading || 
                  (cancelForm.cancel_type === 'session' && (!selectedDate || !cancelForm.time)) ||
                  (cancelForm.cancel_type === 'day' && !selectedDate) ||
                  (cancelForm.cancel_type === 'range' && (!dateRangeStart || !dateRangeEnd))
                }
              >
                {cancelLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                Cancel Appointments
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
