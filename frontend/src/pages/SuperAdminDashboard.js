import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import {
  LayoutDashboard, Users, Activity, LogOut, Calendar, 
  FlaskConical, Pill, Stethoscope, TrendingUp, Clock,
  User, Lock, Loader2, RefreshCw, ChevronRight, Filter
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshing, setRefreshing] = useState(false);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('superAdminToken')}` }
  });

  useEffect(() => {
    const token = localStorage.getItem('superAdminToken');
    if (token) {
      setIsAuthenticated(true);
      fetchDashboard();
    }
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error('Enter credentials');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/staff/login`, { username, password });
      const { token, staff } = res.data;
      
      if (staff.role !== 'super_admin' && staff.role !== 'admin') {
        toast.error('Super Admin access required');
        setLoading(false);
        return;
      }
      
      localStorage.setItem('superAdminToken', token);
      localStorage.setItem('superAdminInfo', JSON.stringify(staff));
      setIsAuthenticated(true);
      toast.success('Welcome, Super Admin!');
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  const fetchDashboard = async () => {
    setRefreshing(true);
    try {
      const res = await axios.get(`${API}/api/super-admin/dashboard`, getAuthHeaders());
      setDashboardData(res.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    }
    setRefreshing(false);
  };

  const fetchActivityLogs = async () => {
    try {
      const res = await axios.get(`${API}/api/super-admin/activity-logs?limit=100`, getAuthHeaders());
      setActivityLogs(res.data.logs || []);
    } catch (error) {
      console.error('Activity logs error:', error);
    }
  };

  const fetchStaffList = async () => {
    try {
      const res = await axios.get(`${API}/api/super-admin/staff-list`, getAuthHeaders());
      setStaffList(res.data.staff || []);
    } catch (error) {
      console.error('Staff list error:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminInfo');
    setIsAuthenticated(false);
    toast.success('Logged out');
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center mx-auto mb-3">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Super Admin</h1>
            <p className="text-sm text-slate-500">Nevika Cura Control Panel</p>
          </div>
          
          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="pl-10 h-11"
                data-testid="admin-username"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="pl-10 h-11"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                data-testid="admin-password"
              />
            </div>
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-12 bg-purple-600 hover:bg-purple-700"
              data-testid="admin-login-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Dashboard Content
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-purple-400" />
            <h1 className="text-lg font-bold">Nevika Cura Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDashboard}
              disabled={refreshing}
              className="text-white hover:bg-slate-800"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-white hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b sticky top-[60px] z-40">
        <div className="max-w-7xl mx-auto flex gap-1 p-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'activity', label: 'Activity Logs', icon: Activity },
            { id: 'staff', label: 'Staff', icon: Users }
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'activity') fetchActivityLogs();
                if (tab.id === 'staff') fetchStaffList();
              }}
              className={activeTab === tab.id ? 'bg-purple-600' : ''}
            >
              <tab.icon className="w-4 h-4 mr-1" />
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && dashboardData && (
          <div className="space-y-6">
            {/* Revenue Summary */}
            <Card className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm">Today's Revenue</p>
                  <p className="text-3xl font-bold">₹{dashboardData.revenue?.total?.toLocaleString() || 0}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-purple-300" />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-purple-400">
                <div>
                  <p className="text-purple-200 text-xs">DiaGyn</p>
                  <p className="font-bold">₹{dashboardData.revenue?.diagyn?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-purple-200 text-xs">Mango Labs</p>
                  <p className="font-bold">₹{dashboardData.revenue?.mango_labs?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-purple-200 text-xs">Orange Pharmacy</p>
                  <p className="font-bold">₹{dashboardData.revenue?.orange_pharmacy?.toLocaleString() || 0}</p>
                </div>
              </div>
            </Card>

            {/* Portal Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* DiaGyn Card */}
              <Card className="p-5 border-l-4 border-teal-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">DiaGyn Clinic</h3>
                    <p className="text-xs text-slate-500">Appointments Today</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-teal-600">{dashboardData.diagyn?.today_appointments || 0}</p>
                    <p className="text-xs text-slate-500">Total</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-500">{dashboardData.diagyn?.pending || 0}</p>
                    <p className="text-xs text-slate-500">Waiting</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-500">{dashboardData.diagyn?.completed || 0}</p>
                    <p className="text-xs text-slate-500">Done</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-slate-600">{dashboardData.diagyn?.total_patients || 0}</p>
                    <p className="text-xs text-slate-500">Patients</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full mt-3 text-teal-600"
                  onClick={() => navigate('/diagyn-staff')}
                >
                  Open Portal <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Card>

              {/* Mango Labs Card */}
              <Card className="p-5 border-l-4 border-yellow-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <FlaskConical className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Mango Labs</h3>
                    <p className="text-xs text-slate-500">Lab Bookings Today</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{dashboardData.mango_labs?.today_bookings || 0}</p>
                    <p className="text-xs text-slate-500">Total</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-500">{dashboardData.mango_labs?.pending_collection || 0}</p>
                    <p className="text-xs text-slate-500">Pending</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-500">{dashboardData.mango_labs?.in_process || 0}</p>
                    <p className="text-xs text-slate-500">Processing</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-500">{dashboardData.mango_labs?.reports_ready || 0}</p>
                    <p className="text-xs text-slate-500">Ready</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full mt-3 text-yellow-600"
                  onClick={() => navigate('/mango-staff')}
                >
                  Open Portal <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Card>

              {/* Orange Pharmacy Card */}
              <Card className="p-5 border-l-4 border-orange-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Pill className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Orange Pharmacy</h3>
                    <p className="text-xs text-slate-500">Orders Today</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-orange-600">{dashboardData.orange_pharmacy?.today_orders || 0}</p>
                    <p className="text-xs text-slate-500">Total</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-500">{dashboardData.orange_pharmacy?.pending || 0}</p>
                    <p className="text-xs text-slate-500">Pending</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-500">{dashboardData.orange_pharmacy?.out_for_delivery || 0}</p>
                    <p className="text-xs text-slate-500">Delivery</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-500">{dashboardData.orange_pharmacy?.completed || 0}</p>
                    <p className="text-xs text-slate-500">Done</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full mt-3 text-orange-600"
                  onClick={() => navigate('/orange-staff')}
                >
                  Open Portal <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Card>
            </div>

            {/* Quick Stats */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-700">Staff Activity</h3>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>{dashboardData.staff_logins_today || 0} logins today</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Activity Logs Tab */}
        {activeTab === 'activity' && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-700">Staff Activity Logs</h3>
              <Button variant="outline" size="sm" onClick={fetchActivityLogs}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </div>
            
            {activityLogs.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No activity logs yet</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {activityLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{log.staff_name}</p>
                      <p className="text-sm text-slate-500">{log.action} - {log.portal}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{log.timestamp?.split('T')[0]}</p>
                      <p className="text-xs text-slate-400">{log.timestamp?.split('T')[1]?.slice(0,5)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Staff Tab */}
        {activeTab === 'staff' && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-700">Staff Members</h3>
              <Button variant="outline" size="sm" onClick={fetchStaffList}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {staffList.map((staff, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{staff.name}</p>
                      <p className="text-xs text-slate-500">{staff.role} • {staff.department}</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t flex items-center justify-between">
                    <span className="text-xs text-slate-400">@{staff.username}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${staff.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {staff.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
