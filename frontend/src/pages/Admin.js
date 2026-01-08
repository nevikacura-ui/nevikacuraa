import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Pill, Users, Calendar, FileText, Package, 
  Plus, Trash2, Search, Loader2, LogOut, Shield,
  TrendingUp, BarChart3
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
  const [statsLoading, setStatsLoading] = useState(false);
  
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
      fetchRecentOrders();
    }
  }, [isAuthenticated]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
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
    setStatsLoading(true);
    try {
      const response = await axios.get(`${API}/admin/stats`, { headers: getAuthHeaders() });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setStatsLoading(false);
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

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loadingMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchInventory(nextPage);
    }
  }, [hasMore, loadingMore, currentPage]);

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
              {loginLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Logging in...</>
              ) : (
                'Login to Admin'
              )}
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
                <p className="text-sm opacity-80">Pharmacy Orders</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="inventory" data-testid="inventory-tab">
              <Package className="w-4 h-4 mr-2" /> Inventory Management
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="orders-tab">
              <BarChart3 className="w-4 h-4 mr-2" /> Recent Orders
            </TabsTrigger>
          </TabsList>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                <div>
                  <h2 className="font-heading text-xl font-semibold">Medicine Inventory</h2>
                  <p className="text-sm text-muted-foreground">
                    Total: {totalMedicines.toLocaleString()} medicines
                  </p>
                </div>
                <Button onClick={() => setShowAddModal(true)} className="rounded-full" data-testid="add-medicine-button">
                  <Plus className="w-4 h-4 mr-2" /> Add Medicine
                </Button>
              </div>

              {/* Search */}
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

              {/* Medicine List */}
              {inventoryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
                </div>
              ) : (
                <div 
                  ref={listRef}
                  className="max-h-[500px] overflow-y-auto border rounded-lg"
                  onScroll={handleScroll}
                  data-testid="admin-medicine-list"
                >
                  {inventory.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      {searchTerm ? 'No medicines found matching your search' : 'No medicines in inventory'}
                    </div>
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
                          <tr key={`${med.name}-${idx}`} className="hover:bg-slate-50" data-testid={`admin-med-${idx}`}>
                            <td className="p-3 font-medium">{med.name}</td>
                            <td className="p-3 text-muted-foreground">{med.form}</td>
                            <td className="p-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(med.name)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                data-testid={`delete-med-${idx}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {loadingMore && (
                    <div className="p-4 text-center">
                      <Loader2 className="w-5 h-5 animate-spin inline-block text-brand-orange" />
                    </div>
                  )}
                  {!hasMore && inventory.length > 0 && (
                    <div className="p-3 text-center text-sm text-muted-foreground bg-slate-50">
                      End of list
                    </div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Appointments */}
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
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No recent appointments</p>
                  )}
                </div>
              </Card>

              {/* Diagnostics */}
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
                    <p className="text-muted-foreground text-sm">No recent diagnostic orders</p>
                  )}
                </div>
              </Card>

              {/* Pharmacy */}
              <Card className="p-4">
                <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-orange-500" /> Recent Pharmacy Orders
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
                data-testid="new-medicine-name"
              />
            </div>
            <div>
              <Label htmlFor="med-form">Form</Label>
              <select
                id="med-form"
                value={newMedicine.form}
                onChange={(e) => setNewMedicine({ ...newMedicine, form: e.target.value })}
                className="w-full mt-1 h-10 px-3 border rounded-md"
                data-testid="new-medicine-form"
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
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addLoading} data-testid="confirm-add-medicine">
                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Medicine'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Medicine</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget}</strong> from inventory? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteMedicine}
              disabled={deleteLoading}
              data-testid="confirm-delete-medicine"
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
