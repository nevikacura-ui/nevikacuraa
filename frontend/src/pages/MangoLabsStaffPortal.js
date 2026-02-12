import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, User, Lock, LogOut, Search, Plus, CheckCircle2, FileText, RefreshCw, FlaskConical, ChevronRight, Loader2, X, TestTube, ClipboardList, Send, Edit2, Save, Upload, Calculator, Barcode, Trash2, Phone, UserCircle, Star, AlertTriangle, Link, Clock } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const TEST_STATUSES = [
  { key: 'test_booked', label: 'Test Booked', color: '#3b82f6', bgColor: '#dbeafe' },
  { key: 'sample_collected', label: 'Sample Collected', color: '#f59e0b', bgColor: '#fef3c7' },
  { key: 'in_process', label: 'In Process', color: '#8b5cf6', bgColor: '#e9d5ff' },
  { key: 'report_generated', label: 'Report Generated', color: '#22c55e', bgColor: '#dcfce7' },
  { key: 'completed', label: 'Completed', color: '#10b981', bgColor: '#d1fae5' },
  { key: 'cancelled', label: 'Cancelled', color: '#ef4444', bgColor: '#fee2e2' }
];

const getAuthHeaders = () => {
  const token = localStorage.getItem('staffToken');
  return { headers: { Authorization: `Bearer ${token}` } };
};

// 30 days login persistence
const LOGIN_EXPIRY_DAYS = 30;
const LOGIN_EXPIRY_MS = LOGIN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

const MangoLabsStaffPortal = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // Default to 30-day login
  const [activeView, setActiveView] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [tests, setTests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [stats, setStats] = useState(null);
  const [showTestForm, setShowTestForm] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [testForm, setTestForm] = useState({ name: '', code: '', category: '', description: '', price: '', home_collection_price: '', sample_type: '', turnaround_time: '', fasting_required: false, preparation_instructions: '' });
  const [uploadingReport, setUploadingReport] = useState(null);
  
  // New Test Entry state
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntryForm, setNewEntryForm] = useState({
    patient_name: '',
    patient_phone: '',
    barcode: '',
    selectedTests: [],
    priority: 'normal',
    notes: ''
  });
  
  // Cost Calculator state
  const [calculatorTests, setCalculatorTests] = useState([]);
  const [calculatorSearch, setCalculatorSearch] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const storedStaff = localStorage.getItem('staffInfo');
    const expiry = localStorage.getItem('staffLoginExpiry');
    
    // Check if session expired
    if (expiry && new Date().getTime() > parseInt(expiry)) {
      localStorage.removeItem('staffToken');
      localStorage.removeItem('staffInfo');
      localStorage.removeItem('staffLoginExpiry');
      return;
    }
    
    if (token && storedStaff) {
      const staff = JSON.parse(storedStaff);
      const dept = staff.department?.toLowerCase() || '';
      const isLabStaff = staff.role === 'lab_staff' || 
                         staff.role === 'diagnostics_staff' || 
                         dept.includes('mango') || 
                         dept.includes('lab') || 
                         dept.includes('proton') ||
                         staff.role === 'admin' || 
                         staff.role === 'super_admin';
      
      if (isLabStaff) {
        setStaffInfo(staff);
        setIsAuthenticated(true);
      } else {
        // Wrong portal - redirect to unified login
        navigate('/staff');
      }
    }
  }, [navigate]);

  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    try {
      const params = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (searchQuery) params.search = searchQuery;
      const res = await axios.get(`${API}/api/mango/bookings`, { params, ...getAuthHeaders() });
      setBookings(res.data.bookings || []);
    } catch (error) {
      setBookings([
        { booking_id: 'LAB001', patient_name: 'Amit Kumar', patient_phone: '9876543210', tests: ['Complete Blood Count'], status: 'test_booked', booking_date: new Date().toISOString().split('T')[0], total_amount: 450 },
        { booking_id: 'LAB002', patient_name: 'Sneha Gupta', patient_phone: '8765432109', tests: ['Thyroid Profile'], status: 'sample_collected', booking_date: new Date().toISOString().split('T')[0], total_amount: 890 },
      ]);
    }
    setRefreshing(false);
  }, [isAuthenticated, selectedStatus, searchQuery]);

  const fetchTests = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      const res = await axios.get(`${API}/api/mango/tests`, { params, ...getAuthHeaders() });
      setTests(res.data.tests || []);
    } catch (error) {
      setTests([{ id: '1', code: 'CBC', name: 'Complete Blood Count', price: 450, category: 'Hematology' }, { id: '2', code: 'TFT', name: 'Thyroid Function Test', price: 890, category: 'Endocrine' }]);
    }
  }, [isAuthenticated, searchQuery]);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await axios.get(`${API}/api/mango/dashboard/stats`, getAuthHeaders());
      setStats(res.data);
    } catch (error) {}
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) { fetchBookings(); fetchTests(); fetchStats(); const interval = setInterval(() => { fetchBookings(); fetchStats(); }, 30000); return () => clearInterval(interval); }
  }, [isAuthenticated, fetchBookings, fetchTests, fetchStats]);

  const handleLogin = async () => {
    if (!username || !password) { toast.error('Enter username and password'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/staff/login`, { username, password });
      const { token, staff } = res.data;
      
      // Store token and info
      localStorage.setItem('staffToken', token);
      localStorage.setItem('staffInfo', JSON.stringify(staff));
      
      // Only store expiry if "Remember Me" is checked
      if (rememberMe) {
        const expiryTime = new Date().getTime() + LOGIN_EXPIRY_MS;
        localStorage.setItem('staffLoginExpiry', expiryTime.toString());
      } else {
        localStorage.removeItem('staffLoginExpiry');
      }
      
      setStaffInfo(staff);
      setIsAuthenticated(true);
      toast.success(rememberMe ? `Welcome, ${staff.name || username}! (Logged in for 30 days)` : `Welcome, ${staff.name || username}!`);
    } catch (error) { toast.error(error.response?.data?.detail || 'Login failed'); }
    setLoading(false);
  };

  const handleLogout = () => { 
    localStorage.removeItem('staffToken'); 
    localStorage.removeItem('staffInfo'); 
    localStorage.removeItem('staffLoginExpiry');
    setIsAuthenticated(false); 
    setStaffInfo(null); 
    toast.success('Logged out'); 
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    const booking = bookings.find(b => b.booking_id === bookingId);
    if (newStatus === 'report_generated' && !booking?.report_uploaded) { toast.error('Please upload report before marking as Report Generated'); setUploadingReport(bookingId); return; }
    try {
      await axios.put(`${API}/api/mango/bookings/${bookingId}/status`, { status: newStatus }, getAuthHeaders());
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      fetchBookings();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to update status'); }
  };

  const handleReportUpload = async (bookingId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API}/api/mango/bookings/${bookingId}/report`, formData, { ...getAuthHeaders(), headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' } });
      toast.success('Report uploaded');
      setUploadingReport(null);
      fetchBookings();
    } catch (error) { toast.error('Failed to upload report'); }
  };

  const sendReportToPatient = async (bookingId) => {
    try {
      const res = await axios.post(`${API}/api/mango/bookings/${bookingId}/send-report`, {}, getAuthHeaders());
      if (res.data.email_sent || res.data.whatsapp_sent) { toast.success('Report sent to patient'); } else { toast.info('Report saved'); }
    } catch (error) { toast.error('Failed to send report'); }
  };

  const saveTest = async () => {
    if (!testForm.name || !testForm.price) { toast.error('Name and Price are required'); return; }
    setLoading(true);
    try {
      const payload = { ...testForm, price: parseFloat(testForm.price), home_collection_price: testForm.home_collection_price ? parseFloat(testForm.home_collection_price) : null };
      if (editingTest) { await axios.put(`${API}/api/mango/tests/${editingTest.id}`, payload, getAuthHeaders()); toast.success('Test updated'); }
      else { await axios.post(`${API}/api/mango/tests`, payload, getAuthHeaders()); toast.success('Test added'); }
      setShowTestForm(false); setEditingTest(null);
      setTestForm({ name: '', code: '', category: '', description: '', price: '', home_collection_price: '', sample_type: '', turnaround_time: '', fasting_required: false, preparation_instructions: '' });
      fetchTests();
    } catch (error) { toast.error('Failed to save test'); }
    setLoading(false);
  };

  const filteredBookings = bookings.filter(booking => { const matchesSearch = !searchQuery || booking.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) || booking.booking_id?.toLowerCase().includes(searchQuery.toLowerCase()) || booking.patient_phone?.includes(searchQuery); return matchesSearch; });

  // Create new test entry booking
  const handleCreateEntry = async () => {
    if (!newEntryForm.patient_name || !newEntryForm.patient_phone || newEntryForm.selectedTests.length === 0) {
      toast.error('Please fill patient name, phone and select at least one test');
      return;
    }
    setLoading(true);
    try {
      const totalAmount = newEntryForm.selectedTests.reduce((sum, t) => sum + (t.price || 0), 0);
      const payload = {
        patient_name: newEntryForm.patient_name,
        patient_phone: newEntryForm.patient_phone,
        barcode: newEntryForm.barcode || `MHL${Date.now().toString(36).toUpperCase()}`,
        tests: newEntryForm.selectedTests.map(t => t.name),
        test_codes: newEntryForm.selectedTests.map(t => t.code),
        priority: newEntryForm.priority,
        notes: newEntryForm.notes,
        total_amount: totalAmount,
        status: 'test_booked',
        booking_type: 'staff_entry'
      };
      await axios.post(`${API}/api/mango/bookings`, payload, getAuthHeaders());
      toast.success(`Booking created successfully! Barcode: ${payload.barcode}`);
      setShowNewEntry(false);
      setNewEntryForm({ patient_name: '', patient_phone: '', barcode: '', selectedTests: [], priority: 'normal', notes: '' });
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create entry');
    }
    setLoading(false);
  };

  // Add test to new entry
  const addTestToEntry = (test) => {
    if (newEntryForm.selectedTests.find(t => t.id === test.id)) {
      toast.info('Test already added');
      return;
    }
    setNewEntryForm({ ...newEntryForm, selectedTests: [...newEntryForm.selectedTests, test] });
    toast.success(`Added: ${test.name}`);
  };

  // Remove test from entry
  const removeTestFromEntry = (testId) => {
    setNewEntryForm({ ...newEntryForm, selectedTests: newEntryForm.selectedTests.filter(t => t.id !== testId) });
  };

  // Calculator functions
  const addTestToCalculator = (test) => {
    if (calculatorTests.find(t => t.id === test.id)) {
      toast.info('Test already in calculator');
      return;
    }
    setCalculatorTests([...calculatorTests, test]);
  };

  const removeTestFromCalculator = (testId) => {
    setCalculatorTests(calculatorTests.filter(t => t.id !== testId));
  };

  const calculateTotal = () => {
    return calculatorTests.reduce((sum, t) => sum + (t.price || 0), 0);
  };

  const filteredTestsForSearch = tests.filter(test => {
    const query = calculatorSearch.toLowerCase();
    return test.name?.toLowerCase().includes(query) || 
           test.code?.toLowerCase().includes(query) ||
           test.category?.toLowerCase().includes(query);
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-2xl">
          <div className="text-center mb-8">
            {/* Mango Logo - Enlarged Rectangular */}
            <div className="w-48 h-24 mx-auto mb-4 bg-white rounded-2xl shadow-lg overflow-hidden border border-orange-100">
              <img 
                src="https://customer-assets.emergentagent.com/job_c3c7c000-c0b8-475a-b79b-a8334b822713/artifacts/1o2w2pps_Purple%20White%20Modern%20Medical%20Laboratory%20Professional%20Banner%20%28Business%20Card%20%28_20260211_062110_0001.png"
                alt="Mango Health Labs"
                className="w-full h-full object-contain p-2"
                data-testid="mango-staff-login-logo"
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Mango Health Labs</h1>
            <p className="text-slate-500">Staff Portal</p>
            <p className="text-xs text-orange-600 italic mt-1">Aam logon ki, Khaas Lab.</p>
          </div>
          <div className="space-y-4">
            <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><Input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10 h-12" data-testid="mango-username" /></div>
            <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleLogin()} className="pl-10 h-12" data-testid="mango-password" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded accent-orange-500" data-testid="mango-remember-me" />
              <label htmlFor="rememberMe" className="text-sm text-slate-600 cursor-pointer">Remember me for 30 days</label>
            </div>
            <Button onClick={handleLogin} disabled={loading} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold" data-testid="mango-login-btn">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
            {/* Mango Logo */}
            <div className="w-24 h-12 bg-white rounded-lg overflow-hidden">
              <img 
                src="https://customer-assets.emergentagent.com/job_c3c7c000-c0b8-475a-b79b-a8334b822713/artifacts/1o2w2pps_Purple%20White%20Modern%20Medical%20Laboratory%20Professional%20Banner%20%28Business%20Card%20%28_20260211_062110_0001.png"
                alt="Mango Health Labs"
                className="w-full h-full object-contain p-1"
              />
            </div>
            <div><h1 className="font-bold text-lg">Staff Portal</h1><p className="text-xs text-orange-100">{staffInfo?.name || 'Staff'}</p></div>
          </div>
          <div className="flex items-center gap-2"><button onClick={() => { fetchBookings(); fetchTests(); fetchStats(); }} className="p-2 hover:bg-white/10 rounded-lg"><RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} /></button><button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg"><LogOut className="w-5 h-5" /></button></div>
        </div>
      </div>

      {stats && (<div className="p-4 grid grid-cols-4 gap-2"><Card className="p-2 text-center bg-blue-50 border-blue-200"><p className="text-xl font-bold text-blue-600">{stats.today_bookings || 0}</p><p className="text-xs text-blue-700">Today</p></Card><Card className="p-2 text-center bg-yellow-50 border-yellow-200"><p className="text-xl font-bold text-yellow-600">{stats.pending_collection || 0}</p><p className="text-xs text-yellow-700">Pending</p></Card><Card className="p-2 text-center bg-purple-50 border-purple-200"><p className="text-xl font-bold text-purple-600">{stats.in_process || 0}</p><p className="text-xs text-purple-700">Processing</p></Card><Card className="p-2 text-center bg-green-50 border-green-200"><p className="text-xl font-bold text-green-600">{stats.reports_ready || 0}</p><p className="text-xs text-green-700">Ready</p></Card></div>)}

      <div className="px-4 pb-3"><div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm overflow-x-auto">{[
        { key: 'bookings', label: 'Bookings', icon: ClipboardList }, 
        { key: 'newentry', label: 'New Entry', icon: Plus }, 
        { key: 'calculator', label: 'Calculator', icon: Calculator }, 
        { key: 'tests', label: 'Test Rates', icon: TestTube }
      ].map(tab => (<button key={tab.key} onClick={() => setActiveView(tab.key)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-medium transition-all whitespace-nowrap text-sm ${activeView === tab.key ? 'bg-teal-500 text-white' : 'text-slate-600'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>))}</div></div>

      {activeView === 'bookings' && (
        <div className="px-4 pb-24">
          <div className="flex gap-2 mb-4"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search bookings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div><select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 border rounded-lg bg-white text-sm"><option value="all">All Status</option>{TEST_STATUSES.map(s => (<option key={s.key} value={s.key}>{s.label}</option>))}</select></div>
          <div className="space-y-3">
            {filteredBookings.length === 0 ? (<Card className="p-8 text-center"><TestTube className="w-12 h-12 mx-auto text-slate-300 mb-3" /><p className="text-slate-500">No bookings found</p></Card>) : (
              filteredBookings.map(booking => {
                const currentStatus = TEST_STATUSES.find(s => s.key === booking.status) || TEST_STATUSES[0];
                const currentIndex = TEST_STATUSES.findIndex(s => s.key === booking.status);
                const nextStatus = currentIndex < TEST_STATUSES.length - 2 ? TEST_STATUSES[currentIndex + 1] : null;
                return (
                  <Card key={booking.booking_id} className="p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3"><div><p className="font-bold text-slate-800">#{booking.booking_id}</p><p className="text-sm text-slate-600">{booking.patient_name}</p><p className="text-xs text-slate-400">{booking.patient_phone}</p></div><span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: currentStatus.bgColor, color: currentStatus.color }}>{currentStatus.label}</span></div>
                    <div className="bg-slate-50 rounded-lg p-2 mb-3"><p className="text-xs text-slate-500">Tests:</p><p className="text-sm font-medium">{booking.tests?.join(', ') || 'N/A'}</p><p className="text-xs text-teal-600 font-semibold mt-1">₹{booking.total_amount || 0}</p></div>
                    {booking.report_uploaded && (<div className="flex items-center gap-2 text-xs text-green-600 mb-3"><FileText className="w-3 h-3" /><span>Report uploaded</span><button onClick={() => sendReportToPatient(booking.booking_id)} className="ml-auto text-blue-600 hover:underline flex items-center gap-1"><Send className="w-3 h-3" /> Send</button></div>)}
                    {uploadingReport === booking.booking_id && (<div className="mb-3 p-3 bg-teal-50 rounded-lg"><p className="text-xs text-teal-700 mb-2">Upload report PDF</p><input type="file" accept=".pdf" onChange={(e) => { if (e.target.files[0]) handleReportUpload(booking.booking_id, e.target.files[0]); }} className="text-xs" /></div>)}
                    <div className="flex gap-1 mb-3">{TEST_STATUSES.slice(0, -1).map((status, idx) => (<div key={status.key} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: idx <= currentIndex ? status.color : '#e2e8f0' }} />))}</div>
                    <div className="flex gap-2">
                      {booking.status === 'in_process' && !booking.report_uploaded && (<Button size="sm" variant="outline" onClick={() => setUploadingReport(booking.booking_id)}><Upload className="w-3 h-3 mr-1" /> Upload Report</Button>)}
                      {nextStatus && booking.status !== 'completed' && booking.status !== 'cancelled' && (<Button size="sm" className="flex-1" style={{ backgroundColor: nextStatus.color }} onClick={() => updateBookingStatus(booking.booking_id, nextStatus.key)}>{nextStatus.label} <ChevronRight className="w-3 h-3 ml-1" /></Button>)}
                      {booking.status === 'report_generated' && (<Button size="sm" className="flex-1 bg-emerald-500 hover:bg-emerald-600" onClick={() => updateBookingStatus(booking.booking_id, 'completed')}><CheckCircle2 className="w-3 h-3 mr-1" /> Complete</Button>)}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeView === 'tests' && (
        <div className="px-4 pb-24">
          <div className="flex gap-2 mb-4"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search tests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div><Button onClick={() => { setShowTestForm(true); setEditingTest(null); }} className="bg-teal-500 hover:bg-teal-600"><Plus className="w-4 h-4 mr-1" /> Add Test</Button></div>
          <div className="space-y-3">
            {tests.length === 0 ? (<Card className="p-8 text-center"><TestTube className="w-12 h-12 mx-auto text-slate-300 mb-3" /><p className="text-slate-500">No tests in catalog</p></Card>) : (
              tests.map(test => (
                <Card key={test.id} className="p-4">
                  <div className="flex justify-between items-start"><div><div className="flex items-center gap-2"><span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-mono">{test.code}</span><h3 className="font-semibold text-slate-800">{test.name}</h3></div><p className="text-xs text-slate-500 mt-1">{test.category}</p></div><div className="text-right"><p className="font-bold text-teal-600">₹{test.price}</p>{test.home_collection_price && (<p className="text-xs text-slate-500">Home: ₹{test.home_collection_price}</p>)}</div></div>
                  <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => { setEditingTest(test); setTestForm({ name: test.name || '', code: test.code || '', category: test.category || '', description: test.description || '', price: String(test.price || ''), home_collection_price: String(test.home_collection_price || ''), sample_type: test.sample_type || '', turnaround_time: test.turnaround_time || '', fasting_required: test.fasting_required || false, preparation_instructions: test.preparation_instructions || '' }); setShowTestForm(true); }}><Edit2 className="w-3 h-3 mr-1" /> Edit</Button>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* NEW ENTRY VIEW - Create new test booking */}
      {activeView === 'newentry' && (
        <div className="px-4 pb-24">
          {/* Patient Information */}
          <Card className="p-4 mb-4 border-l-4 border-l-teal-500">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-teal-500" />
              Patient Information
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-600">Patient Name *</label>
                  <Input 
                    value={newEntryForm.patient_name} 
                    onChange={(e) => setNewEntryForm({ ...newEntryForm, patient_name: e.target.value })} 
                    placeholder="Enter patient name"
                    data-testid="new-entry-patient-name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      value={newEntryForm.patient_phone} 
                      onChange={(e) => setNewEntryForm({ ...newEntryForm, patient_phone: e.target.value })} 
                      placeholder="10-digit number"
                      className="pl-9"
                      maxLength={10}
                      data-testid="new-entry-patient-phone"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Barcode (Manual)</label>
                  <div className="relative">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      value={newEntryForm.barcode} 
                      onChange={(e) => setNewEntryForm({ ...newEntryForm, barcode: e.target.value.toUpperCase() })} 
                      placeholder="Auto-generate if empty"
                      className="pl-9 font-mono"
                      data-testid="new-entry-barcode"
                    />
                  </div>
                </div>
              </div>
              
              {/* Priority Selection */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">Priority</label>
                <div className="flex gap-2">
                  {[
                    { key: 'normal', label: 'Normal', color: 'bg-slate-100 text-slate-700 border-slate-200' },
                    { key: 'urgent', label: 'Urgent', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
                    { key: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700 border-red-300' }
                  ].map(p => (
                    <button 
                      key={p.key}
                      onClick={() => setNewEntryForm({ ...newEntryForm, priority: p.key })}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 font-medium text-sm transition-all ${
                        newEntryForm.priority === p.key 
                          ? `${p.color} ring-2 ring-offset-1 ring-teal-500` 
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {p.key === 'critical' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                      {p.key === 'urgent' && <Star className="w-3 h-3 inline mr-1" />}
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Test Selection */}
          <Card className="p-4 mb-4 border-l-4 border-l-orange-500">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <TestTube className="w-5 h-5 text-orange-500" />
              Select Tests
            </h3>
            
            {/* Search Tests */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Search by test name or code..."
                className="pl-9"
                data-testid="new-entry-test-search"
              />
            </div>
            
            {/* Available Tests Grid */}
            <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
              {tests.filter(t => 
                !searchQuery || 
                t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                t.code?.toLowerCase().includes(searchQuery.toLowerCase())
              ).map(test => (
                <div 
                  key={test.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    newEntryForm.selectedTests.find(t => t.id === test.id)
                      ? 'bg-teal-50 border-teal-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => addTestToEntry(test)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{test.code}</span>
                      <span className="font-medium text-sm text-slate-800">{test.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{test.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-teal-600">₹{test.price}</p>
                    {newEntryForm.selectedTests.find(t => t.id === test.id) && (
                      <CheckCircle2 className="w-4 h-4 text-teal-500 ml-auto mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Selected Tests */}
            {newEntryForm.selectedTests.length > 0 && (
              <div className="bg-teal-50 rounded-lg p-3">
                <p className="text-xs font-medium text-teal-700 mb-2">Selected Tests ({newEntryForm.selectedTests.length})</p>
                <div className="space-y-2">
                  {newEntryForm.selectedTests.map(test => (
                    <div key={test.id} className="flex items-center justify-between bg-white rounded-lg p-2 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">{test.code}</span>
                        <span className="font-medium text-sm">{test.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-teal-600">₹{test.price}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeTestFromEntry(test.id); }}
                          className="text-red-500 hover:bg-red-50 p-1 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-teal-200 flex justify-between items-center">
                  <span className="font-bold text-slate-800">Total Amount</span>
                  <span className="text-xl font-bold text-teal-600">
                    ₹{newEntryForm.selectedTests.reduce((sum, t) => sum + (t.price || 0), 0)}
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* Notes */}
          <Card className="p-4 mb-4">
            <label className="text-xs font-medium text-slate-600">Additional Notes</label>
            <textarea 
              value={newEntryForm.notes}
              onChange={(e) => setNewEntryForm({ ...newEntryForm, notes: e.target.value })}
              className="w-full h-20 px-3 py-2 border rounded-lg resize-none mt-1"
              placeholder="Any special instructions..."
            />
          </Card>

          {/* Submit Button */}
          <Button 
            onClick={handleCreateEntry} 
            disabled={loading || !newEntryForm.patient_name || !newEntryForm.patient_phone || newEntryForm.selectedTests.length === 0}
            className="w-full h-14 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-bold text-lg shadow-lg"
            data-testid="new-entry-submit"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
            Create Booking Entry
          </Button>
        </div>
      )}

      {/* CALCULATOR VIEW - Cost Estimator */}
      {activeView === 'calculator' && (
        <div className="px-4 pb-24">
          {/* Search Tests */}
          <Card className="p-4 mb-4 border-l-4 border-l-purple-500">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-500" />
              Cost Estimator
            </h3>
            <p className="text-xs text-slate-500 mb-3">Search and add tests to calculate estimated cost</p>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                value={calculatorSearch} 
                onChange={(e) => setCalculatorSearch(e.target.value)} 
                placeholder="Search by name, code, or barcode..."
                className="pl-9"
                data-testid="calculator-search"
              />
            </div>
            
            {/* Search Results */}
            {calculatorSearch && (
              <div className="max-h-60 overflow-y-auto space-y-2 mb-4 border rounded-lg p-2 bg-slate-50">
                {filteredTestsForSearch.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">No tests found</p>
                ) : (
                  filteredTestsForSearch.slice(0, 10).map(test => (
                    <div 
                      key={test.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 hover:border-purple-300 cursor-pointer transition-all"
                      onClick={() => { addTestToCalculator(test); setCalculatorSearch(''); }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono">{test.code}</span>
                          <span className="font-medium text-sm">{test.name}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{test.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-600">₹{test.price}</span>
                        <Plus className="w-4 h-4 text-purple-500" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>

          {/* Added Tests */}
          <Card className="p-4 mb-4">
            <h3 className="font-semibold text-slate-800 mb-3">
              Selected Tests ({calculatorTests.length})
            </h3>
            
            {calculatorTests.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calculator className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Add tests to calculate cost</p>
              </div>
            ) : (
              <div className="space-y-2">
                {calculatorTests.map((test, index) => (
                  <div key={test.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs font-bold flex items-center justify-center">{index + 1}</span>
                      <div>
                        <span className="font-medium text-sm">{test.name}</span>
                        <span className="text-xs text-slate-500 ml-2 font-mono">{test.code}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">₹{test.price}</span>
                      <button 
                        onClick={() => removeTestFromCalculator(test.id)}
                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Total Calculation */}
          {calculatorTests.length > 0 && (
            <Card className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <div className="flex justify-between items-center mb-3">
                <span className="text-purple-100">Subtotal ({calculatorTests.length} tests)</span>
                <span className="font-bold text-lg">₹{calculateTotal()}</span>
              </div>
              <div className="flex justify-between items-center mb-3 text-sm">
                <span className="text-purple-200">Home Collection (if applicable)</span>
                <span>+₹100</span>
              </div>
              <div className="border-t border-purple-400 pt-3 flex justify-between items-center">
                <span className="font-bold text-lg">Estimated Total</span>
                <span className="text-3xl font-bold">₹{calculateTotal()}</span>
              </div>
              <p className="text-xs text-purple-200 mt-2">* Final amount may vary based on additional services</p>
              
              <Button 
                onClick={() => {
                  const testList = calculatorTests.map(t => `${t.code}: ${t.name} - ₹${t.price}`).join('\n');
                  const message = `🧪 Mango Health Labs - Estimate\n\nTests:\n${testList}\n\nTotal: ₹${calculateTotal()}`;
                  navigator.clipboard.writeText(message);
                  toast.success('Estimate copied to clipboard!');
                }}
                className="w-full mt-4 bg-white text-purple-600 hover:bg-purple-50"
              >
                <Send className="w-4 h-4 mr-2" />
                Copy Estimate to Share
              </Button>
              
              <Button 
                onClick={() => setCalculatorTests([])}
                variant="outline"
                className="w-full mt-2 border-white/30 text-white hover:bg-white/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </Card>
          )}
        </div>
      )}

      {showTestForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full max-h-[90vh] rounded-t-2xl overflow-hidden">
            <div className="bg-teal-500 text-white p-4 flex items-center justify-between"><h2 className="font-bold">{editingTest ? 'Edit Test' : 'Add Test'}</h2><button onClick={() => { setShowTestForm(false); setEditingTest(null); }}><X className="w-5 h-5" /></button></div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-xs font-medium text-slate-600">Test Name *</label><Input value={testForm.name} onChange={(e) => setTestForm({ ...testForm, name: e.target.value })} placeholder="e.g., Complete Blood Count" /></div>
                <div><label className="text-xs font-medium text-slate-600">Test Code</label><Input value={testForm.code} onChange={(e) => setTestForm({ ...testForm, code: e.target.value.toUpperCase() })} placeholder="e.g., CBC" /></div>
                <div><label className="text-xs font-medium text-slate-600">Category</label><select value={testForm.category} onChange={(e) => setTestForm({ ...testForm, category: e.target.value })} className="w-full h-10 px-3 border rounded-lg"><option value="">Select</option><option value="Hematology">Hematology</option><option value="Biochemistry">Biochemistry</option><option value="Endocrine">Endocrine</option><option value="Immunology">Immunology</option><option value="Microbiology">Microbiology</option><option value="Pathology">Pathology</option><option value="Radiology">Radiology</option><option value="Other">Other</option></select></div>
              </div>
              <div className="bg-teal-50 p-3 rounded-lg space-y-3">
                <h3 className="font-semibold text-teal-700">Pricing</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-slate-600">Price *</label><Input type="number" value={testForm.price} onChange={(e) => setTestForm({ ...testForm, price: e.target.value })} placeholder="0" /></div>
                  <div><label className="text-xs font-medium text-slate-600">Home Collection</label><Input type="number" value={testForm.home_collection_price} onChange={(e) => setTestForm({ ...testForm, home_collection_price: e.target.value })} placeholder="0" /></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-slate-600">Sample Type</label><select value={testForm.sample_type} onChange={(e) => setTestForm({ ...testForm, sample_type: e.target.value })} className="w-full h-10 px-3 border rounded-lg"><option value="">Select</option><option value="Blood">Blood</option><option value="Urine">Urine</option><option value="Stool">Stool</option><option value="Swab">Swab</option><option value="Serum">Serum</option><option value="Other">Other</option></select></div>
                <div><label className="text-xs font-medium text-slate-600">Turnaround Time</label><select value={testForm.turnaround_time} onChange={(e) => setTestForm({ ...testForm, turnaround_time: e.target.value })} className="w-full h-10 px-3 border rounded-lg"><option value="">Select</option><option value="Same Day">Same Day</option><option value="24 Hours">24 Hours</option><option value="48 Hours">48 Hours</option><option value="3-5 Days">3-5 Days</option><option value="1 Week">1 Week</option></select></div>
              </div>
              <div className="flex items-center gap-2"><input type="checkbox" id="fasting" checked={testForm.fasting_required} onChange={(e) => setTestForm({ ...testForm, fasting_required: e.target.checked })} className="w-4 h-4 accent-teal-500" /><label htmlFor="fasting" className="text-sm text-slate-600">Fasting Required</label></div>
              <div><label className="text-xs font-medium text-slate-600">Preparation Instructions</label><textarea value={testForm.preparation_instructions} onChange={(e) => setTestForm({ ...testForm, preparation_instructions: e.target.value })} className="w-full h-20 px-3 py-2 border rounded-lg resize-none" placeholder="e.g., 12 hours fasting required..." /></div>
            </div>
            <div className="p-4 border-t"><Button onClick={saveTest} disabled={loading} className="w-full bg-teal-500 hover:bg-teal-600">{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}{editingTest ? 'Update Test' : 'Add Test'}</Button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MangoLabsStaffPortal;
