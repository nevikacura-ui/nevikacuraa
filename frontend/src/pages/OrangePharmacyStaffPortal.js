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
  ChevronRight, Loader2, TrendingUp, X, Pill, ClipboardList,
  Image as ImageIcon, Upload, Link as LinkIcon, Camera,
  FileText, Send, Edit2, Trash2, Save, MoreVertical
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Order Status Workflow
const ORDER_STATUSES = [
  { key: 'booked', label: 'Order Booked', color: '#3b82f6', bgColor: '#dbeafe' },
  { key: 'pharmacist_call', label: 'Pharmacist Call', color: '#f59e0b', bgColor: '#fef3c7' },
  { key: 'packing', label: 'Packing', color: '#8b5cf6', bgColor: '#e9d5ff' },
  { key: 'out_for_delivery', label: 'Out for Delivery', color: '#06b6d4', bgColor: '#cffafe' },
  { key: 'completed', label: 'Completed', color: '#22c55e', bgColor: '#dcfce7' },
  { key: 'cancelled', label: 'Cancelled', color: '#ef4444', bgColor: '#fee2e2' }
];

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
  
  // Views: orders, inventory, add_medicine
  const [activeView, setActiveView] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // Dashboard stats
  const [stats, setStats] = useState(null);
  
  // Medicine form
  const [showMedicineForm, setShowMedicineForm] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [medicineForm, setMedicineForm] = useState({
    name: '', generic_name: '', manufacturer: '', category: '',
    mrp: '', discount_percent: '0', stock_quantity: '0', unit: 'strip',
    description: '', image_url: ''
  });
  
  // Image upload modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingImages, setSearchingImages] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  
  // Invoice upload
  const [uploadingInvoice, setUploadingInvoice] = useState(null);
  
  // Sync inventory
  const [syncing, setSyncing] = useState(false);

  // Check existing auth
  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const storedStaff = localStorage.getItem('staffInfo');
    if (token && storedStaff) {
      const staff = JSON.parse(storedStaff);
      const dept = staff.department?.toLowerCase() || '';
      const isPharmacyStaff = staff.role === 'pharmacy_staff' || 
                              dept.includes('pharmacy') || 
                              dept.includes('orange') ||
                              staff.role === 'admin' || 
                              staff.role === 'super_admin';
      
      if (isPharmacyStaff) {
        setStaffInfo(staff);
        setIsAuthenticated(true);
      } else {
        // Wrong portal - redirect to unified login
        navigate('/staff');
      }
    }
  }, [navigate]);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    try {
      const params = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (searchQuery) params.search = searchQuery;
      
      const res = await axios.get(`${API}/api/pharmacy/orders`, { params, ...getAuthHeaders() });
      setOrders(res.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      // Mock data for demo
      setOrders([
        { order_id: 'ORD001', customer_name: 'Priya Sharma', customer_phone: '9876543210', items: [{name: 'Paracetamol', qty: 2}], total: 450, status: 'booked', created_at: new Date().toISOString() },
        { order_id: 'ORD002', customer_name: 'Rahul Patel', customer_phone: '8765432109', items: [{name: 'Vitamin C', qty: 1}], total: 890, status: 'pharmacist_call', created_at: new Date().toISOString() },
        { order_id: 'ORD003', customer_name: 'Anita Singh', customer_phone: '7654321098', items: [{name: 'Cough Syrup', qty: 1}], total: 320, status: 'packing', created_at: new Date().toISOString() },
      ]);
    }
    setRefreshing(false);
  }, [isAuthenticated, selectedStatus, searchQuery]);

  // Fetch medicines
  const fetchMedicines = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      
      const res = await axios.get(`${API}/api/pharmacy/medicines`, { params, ...getAuthHeaders() });
      setMedicines(res.data.medicines || []);
    } catch (error) {
      console.error('Error fetching medicines:', error);
      setMedicines([]);
    }
  }, [isAuthenticated, searchQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await axios.get(`${API}/api/pharmacy/dashboard/stats`, getAuthHeaders());
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      fetchMedicines();
      fetchStats();
      const interval = setInterval(() => {
        fetchOrders();
        fetchStats();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchOrders, fetchMedicines, fetchStats]);

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
    // Check if invoice required
    const order = orders.find(o => o.order_id === orderId);
    if (newStatus === 'out_for_delivery' && !order?.invoice_uploaded) {
      toast.error('Please upload invoice before dispatching');
      setUploadingInvoice(orderId);
      return;
    }
    
    try {
      await axios.put(`${API}/api/pharmacy/orders/${orderId}/status`, 
        { status: newStatus }, 
        getAuthHeaders()
      );
      toast.success(`Order updated to ${newStatus.replace('_', ' ')}`);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update order');
    }
  };

  // Upload invoice
  const handleInvoiceUpload = async (orderId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await axios.post(`${API}/api/pharmacy/orders/${orderId}/invoice`, formData, {
        ...getAuthHeaders(),
        headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Invoice uploaded');
      setUploadingInvoice(null);
      fetchOrders();
    } catch (error) {
      toast.error('Failed to upload invoice');
    }
  };

  // Send invoice to customer
  const sendInvoiceToCustomer = async (orderId) => {
    try {
      const res = await axios.post(`${API}/api/pharmacy/orders/${orderId}/send-invoice`, {}, getAuthHeaders());
      if (res.data.email_sent || res.data.whatsapp_sent) {
        toast.success('Invoice sent to customer');
      } else {
        toast.info('Invoice saved (no contact info available)');
      }
    } catch (error) {
      toast.error('Failed to send invoice');
    }
  };

  // Save medicine
  const saveMedicine = async () => {
    if (!medicineForm.name || !medicineForm.mrp) {
      toast.error('Name and MRP are required');
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        ...medicineForm,
        mrp: parseFloat(medicineForm.mrp),
        discount_percent: parseFloat(medicineForm.discount_percent || 0),
        stock_quantity: parseInt(medicineForm.stock_quantity || 0)
      };
      
      if (editingMedicine) {
        await axios.put(`${API}/api/pharmacy/medicines/${editingMedicine.id}`, payload, getAuthHeaders());
        toast.success('Medicine updated');
      } else {
        await axios.post(`${API}/api/pharmacy/medicines`, payload, getAuthHeaders());
        toast.success('Medicine added');
      }
      
      setShowMedicineForm(false);
      setEditingMedicine(null);
      setMedicineForm({ name: '', generic_name: '', manufacturer: '', category: '', mrp: '', discount_percent: '0', stock_quantity: '0', unit: 'strip', description: '', image_url: '' });
      fetchMedicines();
    } catch (error) {
      toast.error('Failed to save medicine');
    }
    setLoading(false);
  };

  // Search images
  const searchImages = async () => {
    if (!imageSearchQuery) return;
    setSearchingImages(true);
    try {
      const res = await axios.get(`${API}/api/pharmacy/image-search`, {
        params: { query: imageSearchQuery },
        ...getAuthHeaders()
      });
      setSearchResults(res.data.images || []);
    } catch (error) {
      toast.error('Image search failed');
      setSearchResults([]);
    }
    setSearchingImages(false);
  };

  // Select image from search
  const selectImage = (imageUrl) => {
    setMedicineForm({ ...medicineForm, image_url: imageUrl });
    setShowImageModal(false);
    setSearchResults([]);
    setImageSearchQuery('');
    toast.success('Image selected');
  };

  // Handle file upload for medicine image
  const handleMedicineImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setMedicineForm({ ...medicineForm, image_url: reader.result });
      setShowImageModal(false);
      toast.success('Image uploaded');
    };
    reader.readAsDataURL(file);
  };

  // Sync inventory from database
  const syncInventory = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`${API}/api/pharmacy/sync-inventory`, {}, getAuthHeaders());
      toast.success(`${res.data.new_medicines_added} medicines added, ${res.data.medicines_updated} updated. Total: ${res.data.total_in_database}`);
      fetchMedicines();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to sync inventory');
    }
    setSyncing(false);
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery || 
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.order_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone?.includes(searchQuery);
    return matchesSearch;
  });

  // Calculate sale price
  const calculateSalePrice = () => {
    const mrp = parseFloat(medicineForm.mrp) || 0;
    const discount = parseFloat(medicineForm.discount_percent) || 0;
    return (mrp * (1 - discount / 100)).toFixed(2);
  };

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
            <button onClick={() => { fetchOrders(); fetchMedicines(); fetchStats(); }} className="p-2 hover:bg-white/10 rounded-lg">
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="p-4 grid grid-cols-4 gap-2">
          <Card className="p-2 text-center bg-blue-50 border-blue-200">
            <p className="text-xl font-bold text-blue-600">{stats.today_orders || 0}</p>
            <p className="text-xs text-blue-700">Today</p>
          </Card>
          <Card className="p-2 text-center bg-yellow-50 border-yellow-200">
            <p className="text-xl font-bold text-yellow-600">{stats.pending_orders || 0}</p>
            <p className="text-xs text-yellow-700">Pending</p>
          </Card>
          <Card className="p-2 text-center bg-cyan-50 border-cyan-200">
            <p className="text-xl font-bold text-cyan-600">{stats.out_for_delivery || 0}</p>
            <p className="text-xs text-cyan-700">Delivery</p>
          </Card>
          <Card className="p-2 text-center bg-green-50 border-green-200">
            <p className="text-xl font-bold text-green-600">{stats.completed_today || 0}</p>
            <p className="text-xs text-green-700">Done</p>
          </Card>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
          {[
            { key: 'orders', label: 'Orders', icon: ClipboardList },
            { key: 'inventory', label: 'Inventory', icon: Package }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${
                activeView === tab.key ? 'bg-orange-500 text-white' : 'text-slate-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============ ORDERS VIEW ============ */}
      {activeView === 'orders' && (
        <div className="px-4 pb-24">
          {/* Search and Filter */}
          <div className="flex gap-2 mb-4">
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
              {ORDER_STATUSES.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Orders List */}
          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No orders found</p>
              </Card>
            ) : (
              filteredOrders.map(order => (
                <OrderCard 
                  key={order.order_id} 
                  order={order}
                  onStatusChange={updateOrderStatus}
                  onUploadInvoice={() => setUploadingInvoice(order.order_id)}
                  onSendInvoice={() => sendInvoiceToCustomer(order.order_id)}
                  isUploadingInvoice={uploadingInvoice === order.order_id}
                  handleInvoiceUpload={handleInvoiceUpload}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ============ INVENTORY VIEW ============ */}
      {activeView === 'inventory' && (
        <div className="px-4 pb-24">
          {/* Search and Add */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search medicines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              onClick={syncInventory}
              disabled={syncing}
              variant="outline"
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
              data-testid="sync-inventory-btn"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
            <Button
              onClick={() => { setShowMedicineForm(true); setEditingMedicine(null); }}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>

          {/* Medicines Grid */}
          <div className="grid grid-cols-2 gap-3">
            {medicines.length === 0 ? (
              <div className="col-span-2">
                <Card className="p-8 text-center">
                  <Pill className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">No medicines in inventory</p>
                  <div className="flex gap-2 justify-center mt-3">
                    <Button onClick={syncInventory} disabled={syncing} variant="outline" className="border-orange-300 text-orange-600">
                      {syncing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Syncing...</> : <><RefreshCw className="w-4 h-4 mr-1" /> Sync 4315 Medicines</>}
                    </Button>
                    <Button onClick={() => setShowMedicineForm(true)} className="bg-orange-500">
                      <Plus className="w-4 h-4 mr-1" /> Add Manual
                    </Button>
                  </div>
                </Card>
              </div>
            ) : (
              medicines.map(med => (
                <Card key={med.id} className="overflow-hidden">
                  <div className="h-24 bg-slate-100 flex items-center justify-center">
                    {med.image_url || med.image_base64 ? (
                      <img src={med.image_url || med.image_base64} alt={med.name} className="w-full h-full object-cover" />
                    ) : (
                      <Pill className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm truncate">{med.name}</h3>
                    <p className="text-xs text-slate-500 truncate">{med.generic_name || med.manufacturer}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <p className="text-orange-600 font-bold">₹{med.sale_price}</p>
                        {med.discount_percent > 0 && (
                          <p className="text-xs text-slate-400 line-through">₹{med.mrp}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${med.stock_quantity < 10 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {med.stock_quantity} in stock
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => {
                        setEditingMedicine(med);
                        setMedicineForm({
                          name: med.name || '',
                          generic_name: med.generic_name || '',
                          manufacturer: med.manufacturer || '',
                          category: med.category || '',
                          mrp: String(med.mrp || ''),
                          discount_percent: String(med.discount_percent || '0'),
                          stock_quantity: String(med.stock_quantity || '0'),
                          unit: med.unit || 'strip',
                          description: med.description || '',
                          image_url: med.image_url || med.image_base64 || ''
                        });
                        setShowMedicineForm(true);
                      }}
                    >
                      <Edit2 className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============ MEDICINE FORM MODAL ============ */}
      {showMedicineForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full max-h-[90vh] rounded-t-2xl overflow-hidden">
            <div className="bg-orange-500 text-white p-4 flex items-center justify-between">
              <h2 className="font-bold">{editingMedicine ? 'Edit Medicine' : 'Add Medicine'}</h2>
              <button onClick={() => { setShowMedicineForm(false); setEditingMedicine(null); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
              {/* Image Section */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {medicineForm.image_url ? (
                    <img src={medicineForm.image_url} alt="Medicine" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <Button variant="outline" onClick={() => setShowImageModal(true)}>
                  <Camera className="w-4 h-4 mr-2" /> Add Image
                </Button>
              </div>

              {/* Form Fields */}
              <div>
                <label className="text-xs font-medium text-slate-600">Medicine Name *</label>
                <Input
                  value={medicineForm.name}
                  onChange={(e) => setMedicineForm({ ...medicineForm, name: e.target.value })}
                  placeholder="e.g., Paracetamol 500mg"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Generic Name</label>
                  <Input
                    value={medicineForm.generic_name}
                    onChange={(e) => setMedicineForm({ ...medicineForm, generic_name: e.target.value })}
                    placeholder="e.g., Acetaminophen"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Manufacturer</label>
                  <Input
                    value={medicineForm.manufacturer}
                    onChange={(e) => setMedicineForm({ ...medicineForm, manufacturer: e.target.value })}
                    placeholder="e.g., Cipla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Category</label>
                  <select
                    value={medicineForm.category}
                    onChange={(e) => setMedicineForm({ ...medicineForm, category: e.target.value })}
                    className="w-full h-10 px-3 border rounded-lg"
                  >
                    <option value="">Select category</option>
                    <option value="Pain Relief">Pain Relief</option>
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Vitamins">Vitamins</option>
                    <option value="Diabetes">Diabetes</option>
                    <option value="Cardiac">Cardiac</option>
                    <option value="Gastro">Gastro</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Unit</label>
                  <select
                    value={medicineForm.unit}
                    onChange={(e) => setMedicineForm({ ...medicineForm, unit: e.target.value })}
                    className="w-full h-10 px-3 border rounded-lg"
                  >
                    <option value="strip">Strip</option>
                    <option value="bottle">Bottle</option>
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="tube">Tube</option>
                    <option value="box">Box</option>
                  </select>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="bg-orange-50 p-3 rounded-lg space-y-3">
                <h3 className="font-semibold text-orange-700">Pricing</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">MRP *</label>
                    <Input
                      type="number"
                      value={medicineForm.mrp}
                      onChange={(e) => setMedicineForm({ ...medicineForm, mrp: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Discount %</label>
                    <Input
                      type="number"
                      value={medicineForm.discount_percent}
                      onChange={(e) => setMedicineForm({ ...medicineForm, discount_percent: e.target.value })}
                      placeholder="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Sale Price</label>
                    <div className="h-10 px-3 flex items-center bg-white border rounded-lg font-bold text-orange-600">
                      ₹{calculateSalePrice()}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Stock Quantity</label>
                <Input
                  type="number"
                  value={medicineForm.stock_quantity}
                  onChange={(e) => setMedicineForm({ ...medicineForm, stock_quantity: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Description</label>
                <textarea
                  value={medicineForm.description}
                  onChange={(e) => setMedicineForm({ ...medicineForm, description: e.target.value })}
                  className="w-full h-20 px-3 py-2 border rounded-lg resize-none"
                  placeholder="Brief description..."
                />
              </div>
            </div>

            <div className="p-4 border-t">
              <Button onClick={saveMedicine} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {editingMedicine ? 'Update Medicine' : 'Add Medicine'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============ IMAGE UPLOAD MODAL ============ */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="bg-orange-500 text-white p-4 flex items-center justify-between">
              <h2 className="font-bold">Add Medicine Image</h2>
              <button onClick={() => { setShowImageModal(false); setSearchResults([]); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Option 1: Upload from device */}
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-600 mb-2">Upload from device</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMedicineImageUpload}
                  className="hidden"
                  id="medicine-image-upload"
                />
                <label htmlFor="medicine-image-upload">
                  <Button variant="outline" size="sm" asChild>
                    <span>Choose File</span>
                  </Button>
                </label>
              </div>

              {/* Option 2: Paste URL */}
              <div>
                <label className="text-xs font-medium text-slate-600">Paste Image URL</label>
                <div className="flex gap-2">
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (imageUrl) {
                        setMedicineForm({ ...medicineForm, image_url: imageUrl });
                        setShowImageModal(false);
                        setImageUrl('');
                        toast.success('Image URL added');
                      }
                    }}
                  >
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Option 3: Search images */}
              <div>
                <label className="text-xs font-medium text-slate-600">Search Images</label>
                <div className="flex gap-2">
                  <Input
                    value={imageSearchQuery}
                    onChange={(e) => setImageSearchQuery(e.target.value)}
                    placeholder="Search for medicine images..."
                    onKeyPress={(e) => e.key === 'Enter' && searchImages()}
                  />
                  <Button onClick={searchImages} disabled={searchingImages}>
                    {searchingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {searchResults.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => selectImage(img.full_url || img.preview_url)}
                      className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-orange-500 transition-all"
                    >
                      <img src={img.preview_url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ Order Card Component ============
const OrderCard = ({ order, onStatusChange, onUploadInvoice, onSendInvoice, isUploadingInvoice, handleInvoiceUpload }) => {
  const currentStatus = ORDER_STATUSES.find(s => s.key === order.status) || ORDER_STATUSES[0];
  const currentIndex = ORDER_STATUSES.findIndex(s => s.key === order.status);
  const nextStatus = currentIndex < ORDER_STATUSES.length - 2 ? ORDER_STATUSES[currentIndex + 1] : null;

  return (
    <Card className="p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-bold text-slate-800">#{order.order_id}</p>
          <p className="text-sm text-slate-600">{order.customer_name}</p>
          <p className="text-xs text-slate-400">{order.customer_phone}</p>
        </div>
        <span 
          className="px-2 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: currentStatus.bgColor, color: currentStatus.color }}
        >
          {currentStatus.label}
        </span>
      </div>
      
      <div className="flex justify-between items-center text-sm text-slate-600 mb-3">
        <span>{order.items?.length || 0} item(s)</span>
        <span className="font-semibold text-orange-600">₹{order.total || 0}</span>
      </div>

      {/* Invoice Status */}
      {order.invoice_uploaded && (
        <div className="flex items-center gap-2 text-xs text-green-600 mb-3">
          <FileText className="w-3 h-3" />
          <span>Invoice uploaded</span>
          <button onClick={onSendInvoice} className="ml-auto text-blue-600 hover:underline flex items-center gap-1">
            <Send className="w-3 h-3" /> Send
          </button>
        </div>
      )}

      {/* Invoice Upload */}
      {isUploadingInvoice && (
        <div className="mb-3 p-3 bg-orange-50 rounded-lg">
          <p className="text-xs text-orange-700 mb-2">Upload invoice before dispatching</p>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(e) => {
              if (e.target.files[0]) {
                handleInvoiceUpload(order.order_id, e.target.files[0]);
              }
            }}
            className="text-xs"
          />
        </div>
      )}

      {/* Status Progress */}
      <div className="flex gap-1 mb-3">
        {ORDER_STATUSES.slice(0, -1).map((status, idx) => (
          <div
            key={status.key}
            className="flex-1 h-1.5 rounded-full"
            style={{ 
              backgroundColor: idx <= currentIndex ? status.color : '#e2e8f0'
            }}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!order.invoice_uploaded && order.status !== 'completed' && order.status !== 'cancelled' && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={onUploadInvoice}
          >
            <Upload className="w-3 h-3 mr-1" /> Invoice
          </Button>
        )}
        
        {nextStatus && order.status !== 'completed' && order.status !== 'cancelled' && (
          <Button 
            size="sm" 
            className="flex-1"
            style={{ backgroundColor: nextStatus.color }}
            onClick={() => onStatusChange(order.order_id, nextStatus.key)}
          >
            {nextStatus.label} <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        )}

        {order.status === 'out_for_delivery' && (
          <Button 
            size="sm" 
            className="flex-1 bg-green-500 hover:bg-green-600"
            onClick={() => onStatusChange(order.order_id, 'completed')}
          >
            <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
          </Button>
        )}
      </div>
    </Card>
  );
};

export default OrangePharmacyStaffPortal;
