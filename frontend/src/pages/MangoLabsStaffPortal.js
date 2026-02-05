import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, User, Lock, LogOut, Phone, Calendar, Clock, 
  Search, Plus, CheckCircle2, FileText, AlertTriangle,
  Building2, IndianRupee, RefreshCw, Download, FlaskConical,
  ChevronRight, Loader2, TrendingUp, X, TestTube, ClipboardList, Printer
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Mango Labs Colors
const COLORS = {
  primary: '#14b8a6',
  primaryDark: '#0d9488',
  primaryLight: '#f0fdfa',
  accent: '#f97316',
  accentLight: '#fff7ed',
  warning: '#f59e0b',
  danger: '#dc2626',
};

const TEST_STATUS = {
  'booked': { bg: '#dbeafe', text: '#1d4ed8', label: 'BOOKED' },
  'sample_collected': { bg: '#fef3c7', text: '#d97706', label: 'COLLECTED' },
  'processing': { bg: '#e9d5ff', text: '#7c3aed', label: 'PROCESSING' },
  'completed': { bg: '#dcfce7', text: '#16a34a', label: 'COMPLETED' },
  'report_ready': { bg: '#d1fae5', text: '#059669', label: 'REPORT READY' },
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('staffToken');
  return { headers: { Authorization: `Bearer ${token}` } };
};

// ============ Main Component ============
const MangoLabsStaffPortal = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Views: tests, collection, reports, summary
  const [activeView, setActiveView] = useState('tests');
  const [tests, setTests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Check existing auth
  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const storedStaff = localStorage.getItem('staffInfo');
    if (token && storedStaff) {
      const staff = JSON.parse(storedStaff);
      if (staff.role === 'lab_staff' || staff.department === 'mango' || staff.department === 'lab') {
        setStaffInfo(staff);
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Fetch test bookings
  const fetchTests = useCallback(async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    try {
      const res = await axios.get(`${API}/api/mango/bookings`, getAuthHeaders());
      setTests(res.data.bookings || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
      // Mock data for now
      setTests([
        { id: 'LAB001', patient: 'Amit Kumar', phone: '9876543210', test: 'Complete Blood Count', status: 'booked', date: new Date().toISOString(), amount: 450 },
        { id: 'LAB002', patient: 'Sneha Gupta', phone: '8765432109', test: 'Thyroid Profile', status: 'sample_collected', date: new Date().toISOString(), amount: 890 },
        { id: 'LAB003', patient: 'Raj Malhotra', phone: '7654321098', test: 'Lipid Profile', status: 'processing', date: new Date().toISOString(), amount: 650 },
        { id: 'LAB004', patient: 'Meera Joshi', phone: '6543210987', test: 'HbA1c', status: 'report_ready', date: new Date().toISOString(), amount: 550 },
      ]);
    }
    setRefreshing(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTests();
      const interval = setInterval(fetchTests, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchTests]);

  // Login
  const handleLogin = async () => {
    if (!username || !password) {
      toast.error('Enter username and password');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/staff/login`, { username, password });
      const { token, staff } = res.data;
      
      if (staff.role !== 'lab_staff' && staff.department !== 'mango' && staff.department !== 'lab') {
        toast.error('Access denied. Lab staff only.');
        setLoading(false);
        return;
      }
      
      localStorage.setItem('staffToken', token);
      localStorage.setItem('staffInfo', JSON.stringify(staff));
      setStaffInfo(staff);
      setIsAuthenticated(true);
      toast.success(`Welcome, ${staff.name || username}!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffInfo');
    setIsAuthenticated(false);
    setStaffInfo(null);
    toast.success('Logged out');
  };

  // Update test status
  const updateTestStatus = async (testId, newStatus) => {
    try {
      await axios.put(`${API}/api/mango/bookings/${testId}/status`, 
        { status: newStatus }, 
        getAuthHeaders()
      );
      toast.success(`Test ${testId} updated to ${newStatus}`);
      fetchTests();
    } catch (error) {
      toast.error('Failed to update test');
      // Update locally for demo
      setTests(prev => prev.map(t => t.id === testId ? {...t, status: newStatus} : t));
    }
  };

  // Filter tests
  const filteredTests = tests.filter(test => {
    const matchesSearch = test.patient?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         test.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         test.test?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         test.phone?.includes(searchQuery);
    const matchesStatus = selectedStatus === 'all' || test.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // ============ LOGIN SCREEN ============
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-teal-100 flex items-center justify-center">
              <FlaskConical className="w-10 h-10 text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Mango Health Labs</h1>
            <p className="text-slate-500">Staff Portal</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 h-12"
                data-testid="mango-username"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="pl-10 h-12"
                data-testid="mango-password"
              />
            </div>
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-12 bg-teal-500 hover:bg-teal-600 text-white font-semibold"
              data-testid="mango-login-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
            </Button>
          </div>

          <p className="text-center text-sm text-slate-400 mt-6">
            Use lab staff credentials
          </p>
        </Card>
      </div>
    );
  }

  // ============ MAIN PORTAL ============
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-lg">Mango Health Labs</h1>
              <p className="text-xs text-teal-100">{staffInfo?.name || 'Staff'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchTests} className="p-2 hover:bg-white/10 rounded-lg">
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-4 grid grid-cols-4 gap-2">
        <Card className="p-2 text-center bg-blue-50 border-blue-200">
          <p className="text-xl font-bold text-blue-600">{tests.filter(t => t.status === 'booked').length}</p>
          <p className="text-xs text-blue-700">Booked</p>
        </Card>
        <Card className="p-2 text-center bg-yellow-50 border-yellow-200">
          <p className="text-xl font-bold text-yellow-600">{tests.filter(t => t.status === 'sample_collected').length}</p>
          <p className="text-xs text-yellow-700">Collected</p>
        </Card>
        <Card className="p-2 text-center bg-purple-50 border-purple-200">
          <p className="text-xl font-bold text-purple-600">{tests.filter(t => t.status === 'processing').length}</p>
          <p className="text-xs text-purple-700">Processing</p>
        </Card>
        <Card className="p-2 text-center bg-green-50 border-green-200">
          <p className="text-xl font-bold text-green-600">{tests.filter(t => t.status === 'report_ready').length}</p>
          <p className="text-xs text-green-700">Ready</p>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="booked">Booked</option>
            <option value="sample_collected">Collected</option>
            <option value="processing">Processing</option>
            <option value="report_ready">Report Ready</option>
          </select>
        </div>
      </div>

      {/* Tests List */}
      <div className="px-4 pb-24 space-y-3">
        {filteredTests.length === 0 ? (
          <Card className="p-8 text-center">
            <TestTube className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No tests found</p>
          </Card>
        ) : (
          filteredTests.map(test => (
            <Card key={test.id} className="p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-slate-800">{test.id}</p>
                  <p className="text-sm text-slate-600">{test.patient}</p>
                  <p className="text-xs text-slate-400">{test.phone}</p>
                </div>
                <span 
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{ 
                    backgroundColor: TEST_STATUS[test.status]?.bg || '#f3f4f6',
                    color: TEST_STATUS[test.status]?.text || '#374151'
                  }}
                >
                  {TEST_STATUS[test.status]?.label || test.status}
                </span>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-2 mb-3">
                <p className="text-sm font-medium text-slate-700">{test.test}</p>
                <p className="text-xs text-teal-600 font-semibold">₹{test.amount}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {test.status === 'booked' && (
                  <Button 
                    size="sm" 
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600"
                    onClick={() => updateTestStatus(test.id, 'sample_collected')}
                  >
                    Collect Sample
                  </Button>
                )}
                {test.status === 'sample_collected' && (
                  <Button 
                    size="sm" 
                    className="flex-1 bg-purple-500 hover:bg-purple-600"
                    onClick={() => updateTestStatus(test.id, 'processing')}
                  >
                    Start Processing
                  </Button>
                )}
                {test.status === 'processing' && (
                  <Button 
                    size="sm" 
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    onClick={() => updateTestStatus(test.id, 'report_ready')}
                  >
                    Report Ready
                  </Button>
                )}
                {test.status === 'report_ready' && (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1"
                      onClick={() => toast.info('Downloading report...')}
                    >
                      <Download className="w-4 h-4 mr-1" /> Report
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 bg-teal-500 hover:bg-teal-600"
                      onClick={() => updateTestStatus(test.id, 'completed')}
                    >
                      Complete
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="flex justify-around py-2">
          <button 
            onClick={() => setActiveView('tests')}
            className={`flex flex-col items-center p-2 ${activeView === 'tests' ? 'text-teal-600' : 'text-slate-400'}`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs mt-1">Tests</span>
          </button>
          <button 
            onClick={() => setActiveView('collection')}
            className={`flex flex-col items-center p-2 ${activeView === 'collection' ? 'text-teal-600' : 'text-slate-400'}`}
          >
            <TestTube className="w-5 h-5" />
            <span className="text-xs mt-1">Collection</span>
          </button>
          <button 
            onClick={() => setActiveView('reports')}
            className={`flex flex-col items-center p-2 ${activeView === 'reports' ? 'text-teal-600' : 'text-slate-400'}`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-xs mt-1">Reports</span>
          </button>
          <button 
            onClick={() => setActiveView('summary')}
            className={`flex flex-col items-center p-2 ${activeView === 'summary' ? 'text-teal-600' : 'text-slate-400'}`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs mt-1">Summary</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MangoLabsStaffPortal;
