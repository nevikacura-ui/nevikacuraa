import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Building2, UserRound, DollarSign, Briefcase, MessageSquare,
  Heart, Award, Plus, Pencil, Trash2, ArrowLeft,
  Loader2, RefreshCw, Shield, Gift, Sparkles, Package, BarChart3
} from 'lucide-react';

import InventoryDashboard from './admin/InventoryDashboard';
import SubscriptionsManager from './admin/SubscriptionsManager';
import GiftCashManager from './admin/GiftCashManager';
import AIEnrichmentManager from './admin/AIEnrichmentManager';
import AdminEditModal from './admin/AdminEditModal';
import AnalyticsDashboard from './admin/AnalyticsDashboard';

const API = process.env.REACT_APP_BACKEND_URL;

const AdminPanel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('clinics');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staffToken, setStaffToken] = useState(null);
  const [staffInfo, setStaffInfo] = useState(null);

  // Data
  const [clinics, setClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [fees, setFees] = useState({ consultation: [], scan: [] });
  const [services, setServices] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [healthTips, setHealthTips] = useState([]);
  const [certifications, setCertifications] = useState([]);

  // Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editType, setEditType] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const info = localStorage.getItem('staffInfo');
    if (!token) { toast.error('Please login as admin first'); navigate('/staff'); return; }
    setStaffToken(token);
    if (info) {
      try {
        const parsed = JSON.parse(info);
        setStaffInfo(parsed);
        if (!['admin', 'super_admin'].includes(parsed.role)) { toast.error('Admin access required'); navigate('/staff'); }
      } catch { navigate('/staff'); }
    } else {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!['admin', 'super_admin'].includes(payload.role)) { toast.error('Admin access required'); navigate('/staff'); }
      } catch { navigate('/staff'); }
    }
  }, [navigate]);

  useEffect(() => { if (staffToken) fetchAllData(); }, [staffToken]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [clinicsRes, doctorsRes, feesRes, servicesRes, testimonialsRes, tipsRes, certsRes] = await Promise.all([
        fetch(`${API}/api/config/clinics`), fetch(`${API}/api/config/doctors`), fetch(`${API}/api/config/fees`),
        fetch(`${API}/api/config/services`), fetch(`${API}/api/config/testimonials`),
        fetch(`${API}/api/config/health-tips`), fetch(`${API}/api/config/certifications`)
      ]);
      setClinics(await clinicsRes.json()); setDoctors(await doctorsRes.json());
      const feesData = await feesRes.json(); setFees({ consultation: feesData.consultation_fees || [], scan: feesData.scan_fees || [] });
      setServices(await servicesRes.json()); setTestimonials(await testimonialsRes.json());
      setHealthTips(await tipsRes.json()); setCertifications(await certsRes.json());
    } catch { toast.error('Failed to fetch data'); }
    setLoading(false);
  };

  const getAuthHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` });

  const handleEdit = (type, item) => { setEditType(type); setEditItem(item); setFormData({ ...item }); setShowEditModal(true); };
  const handleAdd = (type) => {
    setEditType(type); setEditItem(null);
    const defaults = {
      clinic: { id: '', name: '', address: '', city: '', phone: '', hours: '', services: [], doctors: [] },
      doctor: { id: '', name: '', specialization: '', qualification: '', experience: '', avatar: '', color: 'from-teal-400 to-emerald-500', schedules: {} },
      fee: { code: '', label: '', amount: 0, color: 'bg-gray-100 text-gray-800', category: 'general', type: 'consultation' },
      service: { id: '', name: '', description: '', logo: '', path: '', bg_color: '#ffffff', is_dark: false },
      testimonial: { name: '', location: '', rating: 5, text: '', service: '', avatar: '' },
      healthTip: { tip: '', icon: '', category: '' },
      certification: { name: '', full_name: '', color: 'bg-teal-100 text-teal-700' },
    };
    setFormData(defaults[type] || {}); setShowEditModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const endpoints = {
        clinic: editItem ? `/api/config/admin/clinics/${editItem.id}` : '/api/config/admin/clinics',
        doctor: editItem ? `/api/config/admin/doctors/${editItem.id}` : '/api/config/admin/doctors',
        fee: editItem ? `/api/config/admin/fees/${editItem.code}` : '/api/config/admin/fees',
        service: editItem ? `/api/config/admin/services/${editItem.id}` : '/api/config/admin/services',
        testimonial: editItem ? `/api/config/admin/testimonials/${editItem.id}` : '/api/config/admin/testimonials',
        healthTip: editItem ? `/api/config/admin/health-tips/${healthTips.indexOf(editItem)}` : '/api/config/admin/health-tips',
        certification: editItem ? `/api/config/admin/certifications/${encodeURIComponent(editItem.name)}` : '/api/config/admin/certifications',
      };
      const response = await fetch(`${API}${endpoints[editType]}`, { method: editItem ? 'PUT' : 'POST', headers: getAuthHeaders(), body: JSON.stringify(formData) });
      if (!response.ok) { const error = await response.json(); throw new Error(error.detail || 'Failed to save'); }
      toast.success(editItem ? 'Updated successfully' : 'Created successfully'); setShowEditModal(false); fetchAllData();
    } catch (error) { toast.error(error.message); }
    setSaving(false);
  };

  const handleDelete = async (type, item) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const endpoints = {
        clinic: `/api/config/admin/clinics/${item.id}`, doctor: `/api/config/admin/doctors/${item.id}`,
        fee: `/api/config/admin/fees/${item.code}`, service: `/api/config/admin/services/${item.id}`,
        testimonial: `/api/config/admin/testimonials/${item.id}`, healthTip: `/api/config/admin/health-tips/${healthTips.indexOf(item)}`,
        certification: `/api/config/admin/certifications/${encodeURIComponent(item.name)}`,
      };
      const response = await fetch(`${API}${endpoints[type]}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to delete');
      toast.success('Deleted successfully'); fetchAllData();
    } catch (error) { toast.error(error.message); }
  };

  const renderItemCard = (type, item, index) => (
    <Card key={item.id || item.code || item.name || index} className="p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {type === 'clinic' && (<><h3 className="font-semibold text-lg">{item.name}</h3><p className="text-sm text-slate-500">{item.address}, {item.city}</p><p className="text-sm text-slate-500">{item.phone}</p><div className="flex gap-1 mt-2 flex-wrap">{item.services?.map((s, i) => <span key={i} className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs">{s}</span>)}</div></>)}
          {type === 'doctor' && (<><h3 className="font-semibold text-lg">{item.name}</h3><p className="text-sm text-slate-600">{item.specialization}</p><p className="text-xs text-slate-500">{item.qualification}</p></>)}
          {type === 'fee' && (<><div className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.color}`}>{item.code}</span><span className="font-medium">{item.label}</span></div><p className="text-lg font-bold text-teal-600 mt-1">{'\u20B9'}{item.amount}</p></>)}
          {type === 'service' && (<><h3 className="font-semibold">{item.name}</h3><p className="text-sm text-slate-500">{item.description}</p><p className="text-xs text-slate-400 mt-1">Path: {item.path}</p></>)}
          {type === 'testimonial' && (<><div className="flex items-center gap-2"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">{item.avatar}</div><div><h3 className="font-semibold">{item.name}</h3><p className="text-xs text-slate-500">{item.location}</p></div></div><p className="text-sm text-slate-600 mt-2 line-clamp-2">&quot;{item.text}&quot;</p></>)}
          {type === 'healthTip' && (<><div className="flex items-center gap-2"><span className="text-2xl">{item.icon}</span><span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs">{item.category}</span></div><p className="text-sm text-slate-600 mt-2">{item.tip}</p></>)}
          {type === 'certification' && (<><span className={`px-3 py-1 rounded-full text-sm font-medium ${item.color}`}>{item.name}</span><p className="text-xs text-slate-500 mt-2">{item.full_name}</p></>)}
        </div>
        <div className="flex gap-1 ml-2">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(type, item)} className="h-8 w-8"><Pencil className="w-4 h-4 text-slate-500" /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(type, item)} className="h-8 w-8"><Trash2 className="w-4 h-4 text-red-500" /></Button>
        </div>
      </div>
    </Card>
  );

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div>;

  const tabConfig = [
    { id: 'clinics', icon: Building2, label: 'Clinics' },
    { id: 'doctors', icon: UserRound, label: 'Doctors' },
    { id: 'fees', icon: DollarSign, label: 'Fees' },
    { id: 'services', icon: Briefcase, label: 'Services' },
    { id: 'testimonials', icon: MessageSquare, label: 'Reviews' },
    { id: 'healthTips', icon: Heart, label: 'Tips' },
    { id: 'certifications', icon: Award, label: 'Certs' },
    { id: 'subscriptions', icon: Shield, label: 'Subs', gradient: 'from-purple-500 to-pink-500' },
    { id: 'giftcash', icon: Gift, label: 'Gift Cash', gradient: 'from-amber-500 to-orange-500' },
    { id: 'ai-enrichment', icon: Sparkles, label: 'AI Enrich', gradient: 'from-emerald-500 to-teal-500' },
    { id: 'inventory', icon: Package, label: 'Inventory', gradient: 'from-blue-500 to-cyan-500' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics', gradient: 'from-teal-500 to-cyan-500' },
  ];

  const dataTabSections = {
    clinics: { title: 'Clinics', type: 'clinic', data: clinics, grid: 'md:grid-cols-2' },
    doctors: { title: 'Doctors', type: 'doctor', data: doctors, grid: 'md:grid-cols-2' },
    services: { title: 'Services', type: 'service', data: services, grid: 'md:grid-cols-2 lg:grid-cols-3' },
    testimonials: { title: 'Testimonials', type: 'testimonial', data: testimonials, grid: 'md:grid-cols-2' },
    healthTips: { title: 'Health Tips', type: 'healthTip', data: healthTips, grid: 'md:grid-cols-2 lg:grid-cols-3' },
    certifications: { title: 'Certifications', type: 'certification', data: certifications, grid: 'md:grid-cols-2 lg:grid-cols-3' },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/staff')}><ArrowLeft className="w-5 h-5" /></Button>
              <div className="flex items-center gap-2"><Shield className="w-6 h-6 text-teal-500" /><h1 className="text-xl font-bold text-slate-800">Admin Panel</h1></div>
            </div>
            <Button onClick={fetchAllData} variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 lg:grid-cols-12 gap-1 mb-6 bg-white p-1 rounded-xl shadow-sm">
            {tabConfig.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id}
                className={`flex items-center gap-1 text-xs ${tab.gradient ? `bg-gradient-to-r ${tab.gradient} text-white data-[state=active]:${tab.gradient.replace('from-', 'from-').replace('to-', 'to-')}` : ''}`}>
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Data Tabs */}
          {Object.entries(dataTabSections).map(([tabId, section]) => (
            <TabsContent key={tabId} value={tabId}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">{section.title} ({section.data.length})</h2>
                <Button onClick={() => handleAdd(section.type)} size="sm"><Plus className="w-4 h-4 mr-1" /> Add {section.type.charAt(0).toUpperCase() + section.type.slice(1)}</Button>
              </div>
              <div className={`grid gap-4 ${section.grid}`}>
                {section.data.map((item, i) => renderItemCard(section.type, item, i))}
              </div>
            </TabsContent>
          ))}

          {/* Fees Tab (special - has two sections) */}
          <TabsContent value="fees">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Fee Codes ({fees.consultation.length + fees.scan.length})</h2>
              <Button onClick={() => handleAdd('fee')} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Fee</Button>
            </div>
            <h3 className="text-sm font-medium text-slate-500 mb-2">Consultation Fees</h3>
            <div className="grid gap-3 md:grid-cols-3 mb-6">{fees.consultation.map((fee, i) => renderItemCard('fee', fee, i))}</div>
            <h3 className="text-sm font-medium text-slate-500 mb-2">Scan Fees</h3>
            <div className="grid gap-3 md:grid-cols-3">{fees.scan.map((fee, i) => renderItemCard('fee', fee, i))}</div>
          </TabsContent>

          {/* Specialized Tabs */}
          <TabsContent value="subscriptions"><SubscriptionsManager /></TabsContent>
          <TabsContent value="giftcash"><GiftCashManager staffToken={staffToken} /></TabsContent>
          <TabsContent value="ai-enrichment"><AIEnrichmentManager /></TabsContent>
          <TabsContent value="inventory"><InventoryDashboard /></TabsContent>
          <TabsContent value="analytics"><AnalyticsDashboard staffToken={staffToken} /></TabsContent>
        </Tabs>
      </main>

      <AdminEditModal open={showEditModal} onOpenChange={setShowEditModal} editType={editType} editItem={editItem}
        formData={formData} setFormData={setFormData} onSave={handleSave} saving={saving} />
    </div>
  );
};

export default AdminPanel;
