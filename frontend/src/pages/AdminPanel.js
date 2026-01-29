import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Building2, UserRound, DollarSign, Briefcase, MessageSquare, 
  Heart, Award, Plus, Pencil, Trash2, Save, X, ArrowLeft,
  Loader2, RefreshCw, Shield, Gift, Users as UsersIcon, Calendar as CalendarIcon, CreditCard
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Subscriptions Manager Component
const SubscriptionsManager = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('subscriptions');
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantForm, setGrantForm] = useState({ patient_id: '', plan_type: 'glydex', validity_days: 365, reason: '' });
  const [couponFilter, setCouponFilter] = useState({ plan_type: '', used: '' });

  useEffect(() => {
    fetchSubscriptions();
    fetchCoupons();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch(`${API}/api/subscriptions/admin/all-subscriptions`);
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    }
  };

  const fetchCoupons = async () => {
    try {
      let url = `${API}/api/subscriptions/admin/coupons`;
      const params = new URLSearchParams();
      if (couponFilter.plan_type) params.append('plan_type', couponFilter.plan_type);
      if (couponFilter.used !== '') params.append('used', couponFilter.used);
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await fetch(url);
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!grantForm.patient_id) {
      toast.error('Please enter patient ID');
      return;
    }
    
    try {
      const res = await fetch(`${API}/api/subscriptions/admin/grant-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(grantForm)
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        setShowGrantModal(false);
        setGrantForm({ patient_id: '', plan_type: 'glydex', validity_days: 365, reason: '' });
        fetchSubscriptions();
      } else {
        toast.error(data.detail || 'Failed to grant access');
      }
    } catch (error) {
      toast.error('Failed to grant access');
    }
  };

  const generateCoupons = async (planType, count) => {
    try {
      const res = await fetch(`${API}/api/subscriptions/admin/generate-coupons?plan_type=${planType}&count=${count}&discount_percent=100&validity_days=365`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Generated ${data.count} ${planType.toUpperCase()} coupons`);
        fetchCoupons();
      }
    } catch (error) {
      toast.error('Failed to generate coupons');
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button 
          variant={activeSubTab === 'subscriptions' ? 'default' : 'outline'} 
          onClick={() => setActiveSubTab('subscriptions')}
          size="sm"
        >
          <UsersIcon className="w-4 h-4 mr-1" /> Subscriptions ({subscriptions.length})
        </Button>
        <Button 
          variant={activeSubTab === 'coupons' ? 'default' : 'outline'} 
          onClick={() => setActiveSubTab('coupons')}
          size="sm"
        >
          <Gift className="w-4 h-4 mr-1" /> Coupons ({coupons.length})
        </Button>
        <Button 
          onClick={() => setShowGrantModal(true)}
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white ml-auto"
        >
          <Plus className="w-4 h-4 mr-1" /> Grant Free Access
        </Button>
      </div>

      {/* Subscriptions List */}
      {activeSubTab === 'subscriptions' && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No subscriptions yet</div>
          ) : (
            subscriptions.map((sub, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{sub.patient_name || sub.patient_id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        sub.plan_type === 'glydex' ? 'bg-purple-100 text-purple-700' : 'bg-pink-100 text-pink-700'
                      }`}>
                        {sub.plan_type?.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {sub.patient_phone} • ₹{sub.amount_paid || 0} via {sub.payment_method}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-gray-500">Expires</div>
                    <div className="font-medium">{new Date(sub.end_date).toLocaleDateString()}</div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Coupons List */}
      {activeSubTab === 'coupons' && (
        <div className="space-y-4">
          {/* Filters & Actions */}
          <div className="flex gap-2 flex-wrap items-center">
            <select 
              className="border rounded-md px-3 py-1.5 text-sm"
              value={couponFilter.plan_type}
              onChange={(e) => { setCouponFilter({...couponFilter, plan_type: e.target.value}); }}
            >
              <option value="">All Plans</option>
              <option value="glydex">Glydex</option>
              <option value="evara">Evara</option>
            </select>
            <select 
              className="border rounded-md px-3 py-1.5 text-sm"
              value={couponFilter.used}
              onChange={(e) => { setCouponFilter({...couponFilter, used: e.target.value}); }}
            >
              <option value="">All Status</option>
              <option value="false">Unused</option>
              <option value="true">Used</option>
            </select>
            <Button size="sm" variant="outline" onClick={fetchCoupons}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <div className="ml-auto flex gap-2">
              <Button size="sm" onClick={() => generateCoupons('glydex', 50)} className="bg-purple-600 hover:bg-purple-700">
                +50 Glydex
              </Button>
              <Button size="sm" onClick={() => generateCoupons('evara', 50)} className="bg-pink-600 hover:bg-pink-700">
                +50 Evara
              </Button>
            </div>
          </div>

          {/* Coupon List */}
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-[60vh] overflow-y-auto">
            {coupons.slice(0, 100).map((coupon, i) => (
              <div key={i} className={`p-3 rounded-lg border ${
                coupon.used_by ? 'bg-gray-50 border-gray-200' : 
                coupon.plan_type === 'glydex' ? 'bg-purple-50 border-purple-200' : 'bg-pink-50 border-pink-200'
              }`}>
                <div className="flex items-center justify-between">
                  <code className="font-mono font-bold">{coupon.code}</code>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    coupon.used_by ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'
                  }`}>
                    {coupon.used_by ? 'Used' : 'Active'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {coupon.plan_type?.toUpperCase()} • {coupon.discount_percent}% off
                  {coupon.used_by && <span className="ml-2">• Used by: {coupon.used_by}</span>}
                </div>
              </div>
            ))}
          </div>
          {coupons.length > 100 && (
            <p className="text-sm text-gray-500 text-center">Showing 100 of {coupons.length} coupons</p>
          )}
        </div>
      )}

      {/* Grant Access Modal */}
      <Dialog open={showGrantModal} onOpenChange={setShowGrantModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Free Subscription Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Patient ID</Label>
              <Input 
                placeholder="Enter patient ID (e.g., NC-2026-00001)"
                value={grantForm.patient_id}
                onChange={(e) => setGrantForm({...grantForm, patient_id: e.target.value})}
              />
            </div>
            <div>
              <Label>Plan Type</Label>
              <select 
                className="w-full border rounded-md px-3 py-2"
                value={grantForm.plan_type}
                onChange={(e) => setGrantForm({...grantForm, plan_type: e.target.value})}
              >
                <option value="glydex">Glydex (Diabetes Care)</option>
                <option value="evara">Evara (Womens Wellness)</option>
              </select>
            </div>
            <div>
              <Label>Validity (Days)</Label>
              <Input 
                type="number"
                value={grantForm.validity_days}
                onChange={(e) => setGrantForm({...grantForm, validity_days: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <Label>Reason (Optional)</Label>
              <Input 
                placeholder="e.g., Beta tester, VIP patient"
                value={grantForm.reason}
                onChange={(e) => setGrantForm({...grantForm, reason: e.target.value})}
              />
            </div>
            <Button onClick={handleGrantAccess} className="w-full bg-green-600 hover:bg-green-700">
              Grant Access
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminPanel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('clinics');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staffToken, setStaffToken] = useState(null);
  const [staffInfo, setStaffInfo] = useState(null);
  
  // Data states
  const [clinics, setClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [fees, setFees] = useState({ consultation: [], scan: [] });
  const [services, setServices] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [healthTips, setHealthTips] = useState([]);
  const [certifications, setCertifications] = useState([]);
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editType, setEditType] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});

  // Check admin access
  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const info = localStorage.getItem('staffInfo');
    
    if (!token) {
      toast.error('Please login as admin first');
      navigate('/staff');
      return;
    }
    
    setStaffToken(token);
    
    if (info) {
      try {
        const parsed = JSON.parse(info);
        setStaffInfo(parsed);
        
        if (!['admin', 'super_admin'].includes(parsed.role)) {
          toast.error('Admin access required');
          navigate('/staff');
        }
      } catch (e) {
        navigate('/staff');
      }
    } else {
      // Decode token to check role
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!['admin', 'super_admin'].includes(payload.role)) {
          toast.error('Admin access required');
          navigate('/staff');
        }
      } catch (e) {
        navigate('/staff');
      }
    }
  }, [navigate]);

  // Fetch all data
  useEffect(() => {
    if (staffToken) {
      fetchAllData();
    }
  }, [staffToken]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [clinicsRes, doctorsRes, feesRes, servicesRes, testimonialsRes, tipsRes, certsRes] = await Promise.all([
        fetch(`${API}/api/config/clinics`),
        fetch(`${API}/api/config/doctors`),
        fetch(`${API}/api/config/fees`),
        fetch(`${API}/api/config/services`),
        fetch(`${API}/api/config/testimonials`),
        fetch(`${API}/api/config/health-tips`),
        fetch(`${API}/api/config/certifications`)
      ]);
      
      setClinics(await clinicsRes.json());
      setDoctors(await doctorsRes.json());
      const feesData = await feesRes.json();
      setFees({ consultation: feesData.consultation_fees || [], scan: feesData.scan_fees || [] });
      setServices(await servicesRes.json());
      setTestimonials(await testimonialsRes.json());
      setHealthTips(await tipsRes.json());
      setCertifications(await certsRes.json());
    } catch (error) {
      toast.error('Failed to fetch data');
    }
    setLoading(false);
  };

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${staffToken}`
  });

  const handleEdit = (type, item) => {
    setEditType(type);
    setEditItem(item);
    setFormData({ ...item });
    setShowEditModal(true);
  };

  const handleAdd = (type) => {
    setEditType(type);
    setEditItem(null);
    setFormData(getDefaultFormData(type));
    setShowEditModal(true);
  };

  const getDefaultFormData = (type) => {
    switch (type) {
      case 'clinic':
        return { id: '', name: '', address: '', city: '', phone: '', hours: '', services: [], doctors: [] };
      case 'doctor':
        return { id: '', name: '', specialization: '', qualification: '', experience: '', avatar: '', color: 'from-teal-400 to-emerald-500', schedules: {} };
      case 'fee':
        return { code: '', label: '', amount: 0, color: 'bg-gray-100 text-gray-800', category: 'general', type: 'consultation' };
      case 'service':
        return { id: '', name: '', description: '', logo: '', path: '', bg_color: '#ffffff', is_dark: false };
      case 'testimonial':
        return { name: '', location: '', rating: 5, text: '', service: '', avatar: '' };
      case 'healthTip':
        return { tip: '', icon: '💡', category: '' };
      case 'certification':
        return { name: '', full_name: '', color: 'bg-teal-100 text-teal-700' };
      default:
        return {};
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let endpoint = '';
      let method = editItem ? 'PUT' : 'POST';
      
      switch (editType) {
        case 'clinic':
          endpoint = editItem ? `/api/config/admin/clinics/${editItem.id}` : '/api/config/admin/clinics';
          break;
        case 'doctor':
          endpoint = editItem ? `/api/config/admin/doctors/${editItem.id}` : '/api/config/admin/doctors';
          break;
        case 'fee':
          endpoint = editItem ? `/api/config/admin/fees/${editItem.code}` : '/api/config/admin/fees';
          break;
        case 'service':
          endpoint = editItem ? `/api/config/admin/services/${editItem.id}` : '/api/config/admin/services';
          break;
        case 'testimonial':
          endpoint = editItem ? `/api/config/admin/testimonials/${editItem.id}` : '/api/config/admin/testimonials';
          break;
        case 'healthTip':
          endpoint = editItem ? `/api/config/admin/health-tips/${healthTips.indexOf(editItem)}` : '/api/config/admin/health-tips';
          break;
        case 'certification':
          endpoint = editItem ? `/api/config/admin/certifications/${encodeURIComponent(editItem.name)}` : '/api/config/admin/certifications';
          break;
        default:
          throw new Error('Unknown type');
      }

      const response = await fetch(`${API}${endpoint}`, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save');
      }

      toast.success(editItem ? 'Updated successfully' : 'Created successfully');
      setShowEditModal(false);
      fetchAllData();
    } catch (error) {
      toast.error(error.message);
    }
    setSaving(false);
  };

  const handleDelete = async (type, item) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      let endpoint = '';
      switch (type) {
        case 'clinic': endpoint = `/api/config/admin/clinics/${item.id}`; break;
        case 'doctor': endpoint = `/api/config/admin/doctors/${item.id}`; break;
        case 'fee': endpoint = `/api/config/admin/fees/${item.code}`; break;
        case 'service': endpoint = `/api/config/admin/services/${item.id}`; break;
        case 'testimonial': endpoint = `/api/config/admin/testimonials/${item.id}`; break;
        case 'healthTip': endpoint = `/api/config/admin/health-tips/${healthTips.indexOf(item)}`; break;
        case 'certification': endpoint = `/api/config/admin/certifications/${encodeURIComponent(item.name)}`; break;
        default: return;
      }

      const response = await fetch(`${API}${endpoint}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to delete');
      toast.success('Deleted successfully');
      fetchAllData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Render item cards
  const renderItemCard = (type, item, index) => (
    <Card key={item.id || item.code || item.name || index} className="p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {type === 'clinic' && (
            <>
              <h3 className="font-semibold text-lg">{item.name}</h3>
              <p className="text-sm text-slate-500">{item.address}, {item.city}</p>
              <p className="text-sm text-slate-500">{item.phone}</p>
              <div className="flex gap-1 mt-2 flex-wrap">
                {item.services?.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs">{s}</span>
                ))}
              </div>
            </>
          )}
          {type === 'doctor' && (
            <>
              <h3 className="font-semibold text-lg">{item.name}</h3>
              <p className="text-sm text-slate-600">{item.specialization}</p>
              <p className="text-xs text-slate-500">{item.qualification}</p>
            </>
          )}
          {type === 'fee' && (
            <>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.color}`}>{item.code}</span>
                <span className="font-medium">{item.label}</span>
              </div>
              <p className="text-lg font-bold text-teal-600 mt-1">₹{item.amount}</p>
            </>
          )}
          {type === 'service' && (
            <>
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-sm text-slate-500">{item.description}</p>
              <p className="text-xs text-slate-400 mt-1">Path: {item.path}</p>
            </>
          )}
          {type === 'testimonial' && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                  {item.avatar}
                </div>
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-xs text-slate-500">{item.location}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-2 line-clamp-2">&quot;{item.text}&quot;</p>
            </>
          )}
          {type === 'healthTip' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{item.icon}</span>
                <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs">{item.category}</span>
              </div>
              <p className="text-sm text-slate-600 mt-2">{item.tip}</p>
            </>
          )}
          {type === 'certification' && (
            <>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${item.color}`}>{item.name}</span>
              <p className="text-xs text-slate-500 mt-2">{item.full_name}</p>
            </>
          )}
        </div>
        <div className="flex gap-1 ml-2">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(type, item)} className="h-8 w-8">
            <Pencil className="w-4 h-4 text-slate-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(type, item)} className="h-8 w-8">
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/staff')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-teal-500" />
                <h1 className="text-xl font-bold text-slate-800">Admin Panel</h1>
              </div>
            </div>
            <Button onClick={fetchAllData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 lg:grid-cols-7 gap-1 mb-6 bg-white p-1 rounded-xl shadow-sm">
            <TabsTrigger value="clinics" className="flex items-center gap-1 text-xs">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clinics</span>
            </TabsTrigger>
            <TabsTrigger value="doctors" className="flex items-center gap-1 text-xs">
              <UserRound className="w-4 h-4" />
              <span className="hidden sm:inline">Doctors</span>
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-1 text-xs">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Fees</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-1 text-xs">
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Services</span>
            </TabsTrigger>
            <TabsTrigger value="testimonials" className="flex items-center gap-1 text-xs">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Reviews</span>
            </TabsTrigger>
            <TabsTrigger value="healthTips" className="flex items-center gap-1 text-xs">
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">Tips</span>
            </TabsTrigger>
            <TabsTrigger value="certifications" className="flex items-center gap-1 text-xs">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Certs</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white data-[state=active]:from-purple-600 data-[state=active]:to-pink-600">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Subs</span>
            </TabsTrigger>
          </TabsList>

          {/* Clinics Tab */}
          <TabsContent value="clinics">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Clinics ({clinics.length})</h2>
              <Button onClick={() => handleAdd('clinic')} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add Clinic
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {clinics.map((clinic, i) => renderItemCard('clinic', clinic, i))}
            </div>
          </TabsContent>

          {/* Doctors Tab */}
          <TabsContent value="doctors">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Doctors ({doctors.length})</h2>
              <Button onClick={() => handleAdd('doctor')} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add Doctor
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {doctors.map((doctor, i) => renderItemCard('doctor', doctor, i))}
            </div>
          </TabsContent>

          {/* Fees Tab */}
          <TabsContent value="fees">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Fee Codes ({fees.consultation.length + fees.scan.length})</h2>
              <Button onClick={() => handleAdd('fee')} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add Fee
              </Button>
            </div>
            <h3 className="text-sm font-medium text-slate-500 mb-2">Consultation Fees</h3>
            <div className="grid gap-3 md:grid-cols-3 mb-6">
              {fees.consultation.map((fee, i) => renderItemCard('fee', fee, i))}
            </div>
            <h3 className="text-sm font-medium text-slate-500 mb-2">Scan Fees</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {fees.scan.map((fee, i) => renderItemCard('fee', fee, i))}
            </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Services ({services.length})</h2>
              <Button onClick={() => handleAdd('service')} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add Service
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service, i) => renderItemCard('service', service, i))}
            </div>
          </TabsContent>

          {/* Testimonials Tab */}
          <TabsContent value="testimonials">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Testimonials ({testimonials.length})</h2>
              <Button onClick={() => handleAdd('testimonial')} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add Testimonial
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {testimonials.map((t, i) => renderItemCard('testimonial', t, i))}
            </div>
          </TabsContent>

          {/* Health Tips Tab */}
          <TabsContent value="healthTips">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Health Tips ({healthTips.length})</h2>
              <Button onClick={() => handleAdd('healthTip')} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add Tip
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {healthTips.map((tip, i) => renderItemCard('healthTip', tip, i))}
            </div>
          </TabsContent>

          {/* Certifications Tab */}
          <TabsContent value="certifications">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Certifications ({certifications.length})</h2>
              <Button onClick={() => handleAdd('certification')} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add Certification
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {certifications.map((cert, i) => renderItemCard('certification', cert, i))}
            </div>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <SubscriptionsManager />
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit' : 'Add'} {editType}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editType === 'clinic' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>ID</Label>
                    <Input value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} placeholder="pushpa_clinic" />
                  </div>
                  <div>
                    <Label>Name</Label>
                    <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Pushpa Clinic" />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>
                <div>
                  <Label>Hours</Label>
                  <Input value={formData.hours || ''} onChange={e => setFormData({...formData, hours: e.target.value})} placeholder="11 AM - 2 PM, 6 PM - 10 PM" />
                </div>
                <div>
                  <Label>Services (comma-separated)</Label>
                  <Input value={(formData.services || []).join(', ')} onChange={e => setFormData({...formData, services: e.target.value.split(',').map(s => s.trim())})} />
                </div>
                <div>
                  <Label>Doctors (comma-separated)</Label>
                  <Input value={(formData.doctors || []).join(', ')} onChange={e => setFormData({...formData, doctors: e.target.value.split(',').map(s => s.trim())})} />
                </div>
              </>
            )}
            {editType === 'doctor' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>ID</Label>
                    <Input value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} placeholder="dr_vikas_jha" />
                  </div>
                  <div>
                    <Label>Name</Label>
                    <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Dr. Vikas Jha" />
                  </div>
                </div>
                <div>
                  <Label>Specialization</Label>
                  <Input value={formData.specialization || ''} onChange={e => setFormData({...formData, specialization: e.target.value})} />
                </div>
                <div>
                  <Label>Qualification</Label>
                  <Input value={formData.qualification || ''} onChange={e => setFormData({...formData, qualification: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Avatar (2 letters)</Label>
                    <Input value={formData.avatar || ''} onChange={e => setFormData({...formData, avatar: e.target.value})} maxLength={2} placeholder="VJ" />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input value={formData.color || ''} onChange={e => setFormData({...formData, color: e.target.value})} placeholder="from-teal-400 to-emerald-500" />
                  </div>
                </div>
              </>
            )}
            {editType === 'fee' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Code</Label>
                    <Input value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="G1" />
                  </div>
                  <div>
                    <Label>Amount (₹)</Label>
                    <Input type="number" value={formData.amount || 0} onChange={e => setFormData({...formData, amount: parseInt(e.target.value)})} />
                  </div>
                </div>
                <div>
                  <Label>Label</Label>
                  <Input value={formData.label || ''} onChange={e => setFormData({...formData, label: e.target.value})} placeholder="General - First" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <select className="w-full border rounded-md p-2" value={formData.type || 'consultation'} onChange={e => setFormData({...formData, type: e.target.value})}>
                      <option value="consultation">Consultation</option>
                      <option value="scan">Scan</option>
                    </select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="general" />
                  </div>
                </div>
                <div>
                  <Label>Color Classes</Label>
                  <Input value={formData.color || ''} onChange={e => setFormData({...formData, color: e.target.value})} placeholder="bg-gray-100 text-gray-800" />
                </div>
              </>
            )}
            {editType === 'service' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>ID</Label>
                    <Input value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} placeholder="diagyn" />
                  </div>
                  <div>
                    <Label>Name</Label>
                    <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="DiaGyn Healthcare" />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <div>
                  <Label>Logo URL</Label>
                  <Input value={formData.logo || ''} onChange={e => setFormData({...formData, logo: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Path</Label>
                    <Input value={formData.path || ''} onChange={e => setFormData({...formData, path: e.target.value})} placeholder="/diagyn" />
                  </div>
                  <div>
                    <Label>BG Color</Label>
                    <Input value={formData.bg_color || ''} onChange={e => setFormData({...formData, bg_color: e.target.value})} placeholder="#ffffff" />
                  </div>
                </div>
              </>
            )}
            {editType === 'testimonial' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Avatar (2 letters)</Label>
                    <Input value={formData.avatar || ''} onChange={e => setFormData({...formData, avatar: e.target.value})} maxLength={2} />
                  </div>
                  <div>
                    <Label>Rating (1-5)</Label>
                    <Input type="number" min={1} max={5} value={formData.rating || 5} onChange={e => setFormData({...formData, rating: parseInt(e.target.value)})} />
                  </div>
                </div>
                <div>
                  <Label>Service</Label>
                  <Input value={formData.service || ''} onChange={e => setFormData({...formData, service: e.target.value})} placeholder="DiaGyn Healthcare" />
                </div>
                <div>
                  <Label>Testimonial Text</Label>
                  <Textarea value={formData.text || ''} onChange={e => setFormData({...formData, text: e.target.value})} rows={3} />
                </div>
              </>
            )}
            {editType === 'healthTip' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Icon (emoji)</Label>
                    <Input value={formData.icon || ''} onChange={e => setFormData({...formData, icon: e.target.value})} placeholder="💡" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Nutrition" />
                  </div>
                </div>
                <div>
                  <Label>Tip Text</Label>
                  <Textarea value={formData.tip || ''} onChange={e => setFormData({...formData, tip: e.target.value})} rows={3} />
                </div>
              </>
            )}
            {editType === 'certification' && (
              <>
                <div>
                  <Label>Short Name</Label>
                  <Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="ISO 9001" />
                </div>
                <div>
                  <Label>Full Name</Label>
                  <Input value={formData.full_name || ''} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="Quality Management Certified" />
                </div>
                <div>
                  <Label>Color Classes</Label>
                  <Input value={formData.color || ''} onChange={e => setFormData({...formData, color: e.target.value})} placeholder="bg-teal-100 text-teal-700" />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
