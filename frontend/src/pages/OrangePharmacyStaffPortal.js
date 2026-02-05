import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, User, Lock, LogOut, Phone, Calendar, Clock, 
  Search, Plus, CheckCircle2, Package, AlertTriangle,
  Building2, IndianRupee, RefreshCw, Truck, ShoppingBag,
  ChevronRight, Loader2, TrendingUp, X, Pill, ClipboardList
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Orange Pharmacy Colors
const COLORS = {
  primary: '#f97316',
  primaryDark: '#ea580c',
  primaryLight: '#fff7ed',
  accent: '#22c55e',
  accentLight: '#dcfce7',
  warning: '#f59e0b',
  danger: '#dc2626',
};

const ORDER_STATUS = {
  'pending': { bg: '#fef3c7', text: '#d97706', label: 'PENDING' },
  'confirmed': { bg: '#dbeafe', text: '#1d4ed8', label: 'CONFIRMED' },
  'processing': { bg: '#e9d5ff', text: '#7c3aed', label: 'PROCESSING' },
  'ready': { bg: '#d1fae5', text: '#059669', label: 'READY' },
  'delivered': { bg: '#dcfce7', text: '#16a34a', label: 'DELIVERED' },
  'cancelled': { bg: '#fee2e2', text: '#dc2626', label: 'CANCELLED' },
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('staffToken');
  return { headers: { Authorization: `Bearer ${token}` } };
};

// ============ Main Component ============
const OrangePharmacyStaffPortal = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Views: orders, inventory, summary
  const [activeView, setActiveView] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Check existing auth
  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const storedStaff = localStorage.getItem('staffInfo');
    if (token && storedStaff) {
      const staff = JSON.parse(storedStaff);
      if (staff.role === 'pharmacy_staff' || staff.department === 'pharmacy') {
        setStaffInfo(staff);
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    try {
      const res = await axios.get(`${API}/api/pharmacy/orders`, getAuthHeaders());
      setOrders(res.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      // Mock data for now
      setOrders([
        { id: 'ORD001', customer: 'Priya Sharma', phone: '9876543210', items: 3, total: 450, status: 'pending', created_at: new Date().toISOString() },
        { id: 'ORD002', customer: 'Rahul Patel', phone: '8765432109', items: 5, total: 890, status: 'confirmed', created_at: new Date().toISOString() },
        { id: 'ORD003', customer: 'Anita Singh', phone: '7654321098', items: 2, total: 320, status: 'ready', created_at: new Date().toISOString() },
      ]);
    }
    setRefreshing(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchOrders]);

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
      
      if (staff.role !== 'pharmacy_staff' && staff.department !== 'pharmacy') {
        toast.error('Access denied. Pharmacy staff only.');
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

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/api/pharmacy/orders/${orderId}/status`, 
        { status: newStatus }, 
        getAuthHeaders()
      );
      toast.success(`Order ${orderId} updated to ${newStatus}`);
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update order');
      // Update locally for demo
      setOrders(prev => prev.map(o => o.id === orderId ? {...o, status: newStatus} : o));
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.phone?.includes(searchQuery);
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // ============ LOGIN SCREEN ============
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-orange-100 flex items-center justify-center">
              <Pill className="w-10 h-10 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Orange Pharmacy</h1>
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
                data-testid="pharmacy-username"
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
                data-testid="pharmacy-password"
              />
            </div>
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              data-testid="pharmacy-login-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
            </Button>
          </div>

          <p className="text-center text-sm text-slate-400 mt-6">
            Use pharmacy staff credentials
          </p>
        </Card>
      </div>
    );
  }

  // ============ MAIN PORTAL ============
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-lg">Orange Pharmacy</h1>
              <p className="text-xs text-orange-100">{staffInfo?.name || 'Staff'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchOrders} className="p-2 hover:bg-white/10 rounded-lg">
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-4 grid grid-cols-3 gap-3">
        <Card className="p-3 text-center bg-yellow-50 border-yellow-200">
          <p className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</p>
          <p className="text-xs text-yellow-700">Pending</p>
        </Card>
        <Card className="p-3 text-center bg-blue-50 border-blue-200">
          <p className="text-2xl font-bold text-blue-600">{orders.filter(o => o.status === 'processing').length}</p>
          <p className="text-xs text-blue-700">Processing</p>
        </Card>
        <Card className="p-3 text-center bg-green-50 border-green-200">
          <p className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'ready').length}</p>
          <p className="text-xs text-green-700">Ready</p>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search orders..."
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
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="px-4 pb-24 space-y-3">
        {filteredOrders.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No orders found</p>
          </Card>
        ) : (
          filteredOrders.map(order => (
            <Card key={order.id} className="p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-slate-800">{order.id}</p>
                  <p className="text-sm text-slate-600">{order.customer}</p>
                  <p className="text-xs text-slate-400">{order.phone}</p>
                </div>
                <span 
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{ 
                    backgroundColor: ORDER_STATUS[order.status]?.bg || '#f3f4f6',
                    color: ORDER_STATUS[order.status]?.text || '#374151'
                  }}
                >
                  {ORDER_STATUS[order.status]?.label || order.status}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm text-slate-600 mb-3">
                <span>{order.items} items</span>
                <span className="font-semibold text-orange-600">₹{order.total}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {order.status === 'pending' && (
                  <Button 
                    size="sm" 
                    className="flex-1 bg-blue-500 hover:bg-blue-600"
                    onClick={() => updateOrderStatus(order.id, 'confirmed')}
                  >
                    Confirm
                  </Button>
                )}
                {order.status === 'confirmed' && (
                  <Button 
                    size="sm" 
                    className="flex-1 bg-purple-500 hover:bg-purple-600"
                    onClick={() => updateOrderStatus(order.id, 'processing')}
                  >
                    Start Processing
                  </Button>
                )}
                {order.status === 'processing' && (
                  <Button 
                    size="sm" 
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                  >
                    Mark Ready
                  </Button>
                )}
                {order.status === 'ready' && (
                  <Button 
                    size="sm" 
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                  >
                    <Truck className="w-4 h-4 mr-1" /> Delivered
                  </Button>
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
            onClick={() => setActiveView('orders')}
            className={`flex flex-col items-center p-2 ${activeView === 'orders' ? 'text-orange-600' : 'text-slate-400'}`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs mt-1">Orders</span>
          </button>
          <button 
            onClick={() => setActiveView('inventory')}
            className={`flex flex-col items-center p-2 ${activeView === 'inventory' ? 'text-orange-600' : 'text-slate-400'}`}
          >
            <Package className="w-5 h-5" />
            <span className="text-xs mt-1">Inventory</span>
          </button>
          <button 
            onClick={() => setActiveView('summary')}
            className={`flex flex-col items-center p-2 ${activeView === 'summary' ? 'text-orange-600' : 'text-slate-400'}`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs mt-1">Summary</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrangePharmacyStaffPortal;
