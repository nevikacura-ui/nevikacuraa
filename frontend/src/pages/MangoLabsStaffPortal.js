import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, FlaskConical, RefreshCw, LogOut, ClipboardList, CheckCircle2, Plus, Calculator, TestTube, Wifi, WifiOff } from 'lucide-react';
import { useAppointmentWebSocket } from '@/hooks/useAppointmentWebSocket';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useLiveSync, LiveSyncBadge } from '@/hooks/useLiveSync';
import { useBluetoothSpeaker } from '@/hooks/useBluetoothSpeaker';
import BluetoothSpeakerIndicator from '@/components/BluetoothSpeakerIndicator';
import PortalSwitcher from '@/components/PortalSwitcher';

import MangoStaffContext from './mango-staff/MangoStaffContext';
import MangoStaffLogin from './mango-staff/MangoStaffLogin';
import MangoActiveBookings from './mango-staff/MangoActiveBookings';
import MangoPastOrders from './mango-staff/MangoPastOrders';
import MangoTestRates from './mango-staff/MangoTestRates';
import MangoNewEntry from './mango-staff/MangoNewEntry';
import MangoCalculator from './mango-staff/MangoCalculator';
import MangoTestFormModal from './mango-staff/MangoTestFormModal';
import MangoCodeVerificationModal from './mango-staff/MangoCodeVerificationModal';

const API = process.env.REACT_APP_BACKEND_URL;
const LOGIN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
const MANGO_ACTIVE_STATUSES = ['test_booked', 'sample_collected', 'in_process', 'report_generated'];

const getAuthHeaders = () => {
  const token = localStorage.getItem('staffToken');
  return { headers: { Authorization: `Bearer ${token}` } };
};

const MangoLabsStaffPortal = () => {
  const navigate = useNavigate();
  const { subscribeToPushNotifications } = usePushNotifications();
  const btSpeaker = useBluetoothSpeaker();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
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
  const [sendingPaymentLink, setSendingPaymentLink] = useState(null);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntryForm, setNewEntryForm] = useState({ patient_name: '', patient_phone: '', barcode: '', selectedTests: [], priority: 'normal', notes: '' });
  const [calculatorTests, setCalculatorTests] = useState([]);
  const [calculatorSearch, setCalculatorSearch] = useState('');
  const [verifyingBooking, setVerifyingBooking] = useState(null);
  const [showCodeVerification, setShowCodeVerification] = useState(false);

  const { isConnected: wsConnected } = useAppointmentWebSocket({
    portal: 'mango_staff',
    date: new Date().toISOString().split('T')[0],
    enabled: isAuthenticated,
    showToasts: true,
    onNewAppointment: (apt) => {
      setBookings(prev => {
        const exists = prev.some(b => b.id === apt.id || b.booking_id === apt.booking_id);
        if (exists) return prev;
        return [apt, ...prev];
      });
    },
    onStatusChange: (apt) => {
      setBookings(prev => prev.map(b => 
        (b.id === apt.id || b.booking_id === apt.booking_id) ? { ...b, status: apt.status } : b
      ));
    }
  });

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const storedStaff = localStorage.getItem('staffInfo');
    const expiry = localStorage.getItem('staffLoginExpiry');
    if (expiry && new Date().getTime() > parseInt(expiry)) {
      localStorage.removeItem('staffToken');
      localStorage.removeItem('staffInfo');
      localStorage.removeItem('staffLoginExpiry');
      return;
    }
    if (token && storedStaff) {
      const staff = JSON.parse(storedStaff);
      const dept = staff.department?.toLowerCase() || '';
      const isLabStaff = staff.role === 'lab_staff' || staff.role === 'diagnostics_staff' || dept.includes('mango') || dept.includes('lab') || dept.includes('proton') || staff.role === 'admin' || staff.role === 'super_admin';
      if (isLabStaff) { setStaffInfo(staff); setIsAuthenticated(true); }
      else { navigate('/staff'); }
    }
  }, [navigate]);

  useEffect(() => {
    const html = document.documentElement; const body = document.body; const app = document.querySelector('.App');
    html.setAttribute('data-portal', 'pharmacy'); body.setAttribute('data-portal', 'pharmacy');
    if (app) { app.style.backgroundColor = '#0A0A1A'; app.style.paddingBottom = '0'; }
    return () => { html.removeAttribute('data-portal'); body.removeAttribute('data-portal'); if (app) { app.style.backgroundColor = ''; app.style.paddingBottom = ''; } };
  }, []);

  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    try {
      const params = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (searchQuery) params.search = searchQuery;
      const res = await axios.get(`${API}/api/mango/bookings`, { params, ...getAuthHeaders() });
      setBookings(res.data.bookings || []);
    } catch {
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
    } catch {
      setTests([{ id: '1', code: 'CBC', name: 'Complete Blood Count', price: 450, category: 'Hematology' }, { id: '2', code: 'TFT', name: 'Thyroid Function Test', price: 890, category: 'Endocrine' }]);
    }
  }, [isAuthenticated, searchQuery]);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;
    try { const res = await axios.get(`${API}/api/mango/dashboard/stats`, getAuthHeaders()); setStats(res.data); } catch {}
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings(); fetchTests(); fetchStats();
      const interval = setInterval(() => { fetchBookings(); fetchStats(); }, wsConnected ? 60000 : 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchBookings, fetchTests, fetchStats, wsConnected]);

  const handleLogin = async () => {
    if (!username || !password) { toast.error('Enter username and password'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/staff/login`, { username, password });
      const { token, staff } = res.data;
      localStorage.setItem('staffToken', token);
      localStorage.setItem('staffInfo', JSON.stringify(staff));
      localStorage.setItem('staffLoginExpiry', (new Date().getTime() + LOGIN_EXPIRY_MS).toString());
      setStaffInfo(staff); setIsAuthenticated(true);
      toast.success(`Welcome, ${staff.name || username}!`);
      try { await subscribeToPushNotifications('lab_staff', 'mango_labs'); } catch {}
    } catch (error) { toast.error(error.response?.data?.detail || 'Login failed'); }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('staffToken'); localStorage.removeItem('staffInfo'); localStorage.removeItem('staffLoginExpiry');
    setIsAuthenticated(false); setStaffInfo(null); toast.success('Logged out');
  };

  const handleSampleCollection = (booking) => { setVerifyingBooking(booking); setShowCodeVerification(true); };

  const onBookingCodeVerified = async () => {
    if (!verifyingBooking) return;
    setShowCodeVerification(false);
    toast.success('Booking Code verified!');
    await updateBookingStatus(verifyingBooking.booking_id, 'sample_collected', true);
    setVerifyingBooking(null);
  };

  const skipBookingVerification = async () => {
    if (!verifyingBooking) return;
    setShowCodeVerification(false);
    toast.info('Skipped verification - marking sample as collected');
    await updateBookingStatus(verifyingBooking.booking_id, 'sample_collected', true);
    setVerifyingBooking(null);
  };

  const updateBookingStatus = async (bookingId, newStatus, skipVerification = false) => {
    const booking = bookings.find(b => b.booking_id === bookingId);
    if (newStatus === 'sample_collected' && !skipVerification) { handleSampleCollection(booking); return; }
    if (newStatus === 'report_generated' && !booking?.report_uploaded) { toast.error('Please upload report before marking as Report Generated'); setUploadingReport(bookingId); return; }
    try {
      await axios.put(`${API}/api/mango/bookings/${bookingId}/status`, { status: newStatus }, getAuthHeaders());
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      if (newStatus === 'sample_collected' && booking?.payment_method === 'pay_later' && booking?.payment_status !== 'PAID') {
        toast.info('Sending payment link to customer...'); await sendPaymentLink(booking);
      }
      fetchBookings();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to update status'); }
  };

  const handleReportUpload = async (bookingId, file) => {
    const formData = new FormData(); formData.append('file', file);
    try {
      await axios.post(`${API}/api/mango/bookings/${bookingId}/report`, formData, { ...getAuthHeaders(), headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' } });
      toast.success('Report uploaded'); setUploadingReport(null); fetchBookings();
    } catch { toast.error('Failed to upload report'); }
  };

  const sendReportToPatient = async (bookingId) => {
    try {
      const res = await axios.post(`${API}/api/mango/bookings/${bookingId}/send-report`, {}, getAuthHeaders());
      if (res.data.email_sent || res.data.whatsapp_sent) { toast.success('Report sent to patient'); } else { toast.info('Report saved'); }
    } catch { toast.error('Failed to send report'); }
  };

  const sendPaymentLink = async (booking) => {
    if (!booking.total_amount || booking.total_amount <= 0) { toast.error('Please confirm booking amount before sending payment link'); return; }
    setSendingPaymentLink(booking.booking_id);
    try {
      const res = await axios.post(`${API}/api/payments/cashfree/create-payment-link`, {
        order_id: booking.booking_id, order_type: 'lab_test', customer_name: booking.patient_name, customer_phone: booking.patient_phone, customer_email: booking.patient_email || null,
        amount: booking.total_amount, send_via: booking.patient_email ? 'both' : 'whatsapp', items_description: booking.tests?.join(', ') || 'Lab Tests'
      });
      if (res.data.success) {
        toast.success(`Payment link sent! ${res.data.sent_via.join(', ')}`);
        setBookings(prev => prev.map(b => b.booking_id === booking.booking_id ? { ...b, payment_status: 'LINK_SENT', payment_link: res.data.payment_link } : b));
      } else { toast.error(res.data.message || 'Failed to send payment link'); }
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to send payment link'); }
    finally { setSendingPaymentLink(null); }
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
    } catch { toast.error('Failed to save test'); }
    setLoading(false);
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = !searchQuery || booking.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) || booking.booking_id?.toLowerCase().includes(searchQuery.toLowerCase()) || booking.patient_phone?.includes(searchQuery);
    const matchesStatus = selectedStatus === 'all' || booking.status === selectedStatus;
    const isActive = MANGO_ACTIVE_STATUSES.includes(booking.status);
    return matchesSearch && matchesStatus && isActive;
  });

  const handleCreateEntry = async () => {
    if (!newEntryForm.patient_name || !newEntryForm.patient_phone || newEntryForm.selectedTests.length === 0) { toast.error('Please fill patient name, phone and select at least one test'); return; }
    setLoading(true);
    try {
      const totalAmount = newEntryForm.selectedTests.reduce((sum, t) => sum + (t.price || 0), 0);
      await axios.post(`${API}/api/mango/bookings`, {
        patient_name: newEntryForm.patient_name, patient_phone: newEntryForm.patient_phone,
        barcode: newEntryForm.barcode || `MHL${Date.now().toString(36).toUpperCase()}`,
        tests: newEntryForm.selectedTests.map(t => t.name), test_codes: newEntryForm.selectedTests.map(t => t.code),
        priority: newEntryForm.priority, notes: newEntryForm.notes, total_amount: totalAmount, status: 'test_booked', booking_type: 'staff_entry'
      }, getAuthHeaders());
      toast.success('Booking created successfully!');
      setShowNewEntry(false); setNewEntryForm({ patient_name: '', patient_phone: '', barcode: '', selectedTests: [], priority: 'normal', notes: '' });
      fetchBookings();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to create entry'); }
    setLoading(false);
  };

  const addTestToEntry = (test) => {
    if (newEntryForm.selectedTests.find(t => t.id === test.id)) { toast.info('Test already added'); return; }
    setNewEntryForm({ ...newEntryForm, selectedTests: [...newEntryForm.selectedTests, test] });
    toast.success(`Added: ${test.name}`);
  };

  const removeTestFromEntry = (testId) => { setNewEntryForm({ ...newEntryForm, selectedTests: newEntryForm.selectedTests.filter(t => t.id !== testId) }); };
  const addTestToCalculator = (test) => { if (calculatorTests.find(t => t.id === test.id)) { toast.info('Test already in calculator'); return; } setCalculatorTests([...calculatorTests, test]); };
  const removeTestFromCalculator = (testId) => { setCalculatorTests(calculatorTests.filter(t => t.id !== testId)); };
  const calculateTotal = () => calculatorTests.reduce((sum, t) => sum + (t.price || 0), 0);

  const filteredTestsForSearch = tests.filter(test => {
    const query = calculatorSearch.toLowerCase();
    return test.name?.toLowerCase().includes(query) || test.code?.toLowerCase().includes(query) || test.category?.toLowerCase().includes(query);
  });

  // Context value with all shared state
  const ctx = {
    staffInfo, loading, refreshing, bookings, tests, searchQuery, setSearchQuery, selectedStatus, setSelectedStatus,
    stats, showTestForm, setShowTestForm, editingTest, setEditingTest, testForm, setTestForm, uploadingReport, setUploadingReport,
    sendingPaymentLink, newEntryForm, setNewEntryForm, calculatorTests, setCalculatorTests, calculatorSearch, setCalculatorSearch,
    verifyingBooking, showCodeVerification, setShowCodeVerification, filteredBookings, filteredTestsForSearch,
    updateBookingStatus, handleReportUpload, sendReportToPatient, sendPaymentLink, saveTest, handleCreateEntry,
    addTestToEntry, removeTestFromEntry, addTestToCalculator, removeTestFromCalculator, calculateTotal,
    onBookingCodeVerified, skipBookingVerification
  };

  if (!isAuthenticated) {
    return <MangoStaffLogin username={username} setUsername={setUsername} password={password} setPassword={setPassword} rememberMe={rememberMe} setRememberMe={setRememberMe} handleLogin={handleLogin} loading={loading} />;
  }

  return (
    <MangoStaffContext.Provider value={ctx}>
      <div className="min-h-screen" style={{ background: '#0A0A1A' }}>
        <style>{`
          @keyframes mangoCardEntry { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }
          .mango-card-anim { animation: mangoCardEntry 0.4s cubic-bezier(0.22,1,0.36,1) both; }
          @keyframes samplePulse { 0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.3); } 50% { box-shadow: 0 0 0 8px rgba(34,197,94,0); } }
          @keyframes mangoGlow { 0%,100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        `}</style>

        {/* Header — Premium Curved Emerald */}
        <header className="sticky top-0 z-50 overflow-hidden" style={{
          background: 'linear-gradient(160deg, #059669 0%, #10B981 50%, #34D399 100%)',
          borderRadius: '0 0 28px 28px',
          boxShadow: '0 8px 32px rgba(16,185,129,0.2)',
        }}>
          {/* Emerald accent bar */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, #6EE7B7, #A7F3D0, #6EE7B7)' }} />

          <div className="px-4 py-3">
            {/* Row 1: Brand + Icons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/staff')} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <ArrowLeft className="w-4 h-4 text-white" />
                </button>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <FlaskConical className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white">Mango Labs</h1>
                  <p className="text-[10px] font-medium text-white/70">{staffInfo?.name || 'Staff Portal'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <PortalSwitcher currentPortal="mango" iconColor="rgba(255,255,255,0.7)" />
                <BluetoothSpeakerIndicator connected={btSpeaker.connected} deviceName={btSpeaker.deviceName} scanning={btSpeaker.scanning} scanResults={btSpeaker.scanResults} autoConnectEnabled={btSpeaker.autoConnectEnabled} onScan={btSpeaker.scan} onConnectDevice={btSpeaker.connectDevice} onDisconnect={btSpeaker.disconnect} onToggleAutoConnect={btSpeaker.toggleAutoConnect} />
                <LiveSyncBadge portal="mango" staffId={staffInfo?.id} />
                <button onClick={() => { fetchBookings(); fetchTests(); fetchStats(); }} className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${wsConnected ? 'bg-white/15 text-white' : 'bg-red-500/15 text-red-300'}`}>
                    {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  </div>
                </button>
                <button onClick={() => { fetchBookings(); fetchTests(); fetchStats(); }}
                  className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <RefreshCw className={`w-4 h-4 text-white/80 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={handleLogout} className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.12)' }} data-testid="mango-logout-btn">
                  <LogOut className="w-4 h-4 text-white/80" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard — Gradient Stat Cards */}
        {stats && (
          <div className="p-4 pt-4 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#34D399' }}>Today's Dashboard</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide p-3 rounded-2xl" style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {[
                { label: 'Bookings', value: stats.today_bookings || 0, gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' },
                { label: 'Pending', value: stats.pending_collection || 0, gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
                { label: 'In Process', value: stats.in_process || 0, gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
                { label: 'Ready', value: stats.reports_ready || 0, gradient: 'linear-gradient(135deg, #22C55E, #16A34A)' },
              ].map((s, i) => (
                <div key={s.label} className="mango-card-anim flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-xl min-w-[72px]"
                  style={{ background: s.gradient, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', animationDelay: `${i * 60}ms` }}>
                  <span className="text-xl font-black text-white">{s.value}</span>
                  <span className="text-[9px] font-medium text-white/80">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation — Glassmorphic inside card */}
        <div className="px-4 pb-3">
          <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { key: 'bookings', label: 'Active', icon: ClipboardList },
              { key: 'past_orders', label: 'Past', icon: CheckCircle2 },
              { key: 'newentry', label: 'New', icon: Plus },
              { key: 'calculator', label: 'Calc', icon: Calculator },
              { key: 'tests', label: 'Rates', icon: TestTube }
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveView(tab.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-medium transition-all whitespace-nowrap text-sm"
                style={activeView === tab.key
                  ? { background: 'linear-gradient(135deg, #22C55E, #16A34A)', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }
                  : { color: 'rgba(255,255,255,0.4)' }
                }
              >
                <tab.icon className="w-4 h-4" />{tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeView === 'bookings' && <MangoActiveBookings />}
        {activeView === 'past_orders' && <MangoPastOrders />}
        {activeView === 'tests' && <MangoTestRates />}
        {activeView === 'newentry' && <MangoNewEntry />}
        {activeView === 'calculator' && <MangoCalculator />}

        {/* Modals */}
        <MangoTestFormModal />
        <MangoCodeVerificationModal />

        {/* FAB */}
        <button onClick={() => setActiveView('newentry')}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-50 transition-all active:scale-90 hover:shadow-xl"
          style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}
          data-testid="fab-mango-staff">
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>
    </MangoStaffContext.Provider>
  );
};

export default MangoLabsStaffPortal;
