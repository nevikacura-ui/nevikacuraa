import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { useDebouncedCallback } from 'use-debounce';
import {
  ArrowLeft, LogOut, Plus, Pill, ClipboardList, CheckCircle2, ImageIcon,
  Sun, Moon, Bell, RefreshCw, Wifi, WifiOff, TrendingUp, Package, ShoppingCart, Navigation
} from 'lucide-react';
import { useBluetoothSpeaker } from '@/hooks/useBluetoothSpeaker';
import BluetoothSpeakerIndicator from '@/components/BluetoothSpeakerIndicator';
import PortalSwitcher from '@/components/PortalSwitcher';

import OrangeStaffContext from './orange-staff/OrangeStaffContext';
import OrangeInventoryTab from './orange-staff/OrangeInventoryTab';
import OrangeOrdersTab from './orange-staff/OrangeOrdersTab';
import OrangePastOrdersTab from './orange-staff/OrangePastOrdersTab';
import OrangeMissingImagesTab from './orange-staff/OrangeMissingImagesTab';
import OrangeMedicineModal from './orange-staff/OrangeMedicineModal';
import OrangeImageUploadModal from './orange-staff/OrangeImageUploadModal';
import OrangeDeliveryDashboard from './orange-staff/OrangeDeliveryDashboard';

const API = process.env.REACT_APP_BACKEND_URL;
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('staffToken')}` } });
const salePrice = (mrp, disc) => Math.round((parseFloat(mrp) || 0) * (1 - (parseFloat(disc) || 0) / 100));

const CATEGORIES = [
  'All', 'Antibiotics', 'Pain Relief & Anti-inflammatory', 'Diabetes', 'Cardiac & BP',
  'Gastro & Digestive', 'Women\'s Health', 'Respiratory & Allergy', 'Vitamins & Supplements',
  'Skin & Dermatology', 'Neuro & CNS', 'Eye & ENT', 'Urology & Kidney', 'Bones & Joints',
  'Hormones & Thyroid', 'Liver Care', 'General & OTC', 'General'
];

const TABS = [
  { id: 'products', icon: Pill, label: 'Inventory' },
  { id: 'orders', icon: ClipboardList, label: 'Orders' },
  { id: 'deliveries', icon: Navigation, label: 'Deliveries' },
  { id: 'past_orders', icon: CheckCircle2, label: 'Past Orders' },
  { id: 'missing_images', icon: ImageIcon, label: 'Missing Images' },
];

const OrangePharmacyStaffPortal = () => {
  const navigate = useNavigate();
  const btSpeaker = useBluetoothSpeaker();
  const [isAuth, setIsAuth] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('products');
  const [orders, setOrders] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingMeds, setLoadingMeds] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [medPage, setMedPage] = useState(1);
  const [medTotal, setMedTotal] = useState(0);
  const [medPages, setMedPages] = useState(1);
  const [editingMed, setEditingMed] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [medForm, setMedForm] = useState({ name: '', unit: 'Tablet', mrp: '', discount_percent: '', category: 'General', image_url: '', manufacturer: '', generic_name: '', description: '', composition: '', uses: '', side_effects: '' });
  const [savingMed, setSavingMed] = useState(false);
  const [inlineEdits, setInlineEdits] = useState({});
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageTargetId, setImageTargetId] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [missingImageMeds, setMissingImageMeds] = useState([]);
  const [loadingMissing, setLoadingMissing] = useState(false);
  const [stats, setStats] = useState({ pending: 0 });
  const [uploadingInvoice, setUploadingInvoice] = useState(null);
  const [sendingInvoice, setSendingInvoice] = useState(null);
  const invoiceInputRef = useRef(null);
  const [invoiceTargetOrder, setInvoiceTargetOrder] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('staffDarkMode') === 'true');

  const debouncedSetSearch = useDebouncedCallback((value) => { setSearchQuery(value); setMedPage(1); }, 350);
  const handleSearchChange = useCallback((e) => { setSearchInput(e.target.value); debouncedSetSearch(e.target.value); }, [debouncedSetSearch]);

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const staff = localStorage.getItem('staffInfo');
    if (token && staff) {
      try { setIsAuth(true); setStaffInfo(JSON.parse(staff)); } catch { navigate('/staff'); }
    } else { navigate('/staff'); }
  }, [navigate]);

  const handleLogout = () => { localStorage.removeItem('staffToken'); localStorage.removeItem('staffInfo'); localStorage.removeItem('staffLoginExpiry'); navigate('/staff'); };

  const fetchMedicines = useCallback(async () => {
    setLoadingMeds(true);
    try {
      const params = new URLSearchParams({ page: medPage, limit: 30, sort: 'name' });
      if (searchQuery) params.set('q', searchQuery);
      if (categoryFilter !== 'All') params.set('category', categoryFilter);
      const res = await axios.get(`${API}/api/pharmacy/medicines?${params}`, getAuth());
      setMedicines(res.data.medicines || []); setMedTotal(res.data.total || 0); setMedPages(res.data.pages || 1);
    } catch { toast.error('Failed to load medicines'); }
    setLoadingMeds(false);
  }, [searchQuery, categoryFilter, medPage]);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const params = new URLSearchParams({ page: 1, limit: 50 });
      if (orderStatusFilter !== 'all') params.set('status', orderStatusFilter);
      const res = await axios.get(`${API}/api/pharmacy/staff/orders?${params}`, getAuth());
      const ordersList = res.data.orders || [];
      setOrders(ordersList);
      const normalizeStatus = (s) => ({ 'booked': 'order_placed', 'pharmacist_call': 'prescription_validated', 'packing': 'in_process', 'out_for_delivery': 'shipped', 'completed': 'delivered' }[s] || s);
      const pending = ordersList.filter(o => !['delivered', 'completed', 'cancelled'].includes(normalizeStatus(o.status))).length;
      setStats({ pending });
    } catch { /* silent */ }
    setLoadingOrders(false);
  }, [orderStatusFilter]);

  const fetchMissingImages = useCallback(async () => {
    setLoadingMissing(true);
    try { const res = await axios.get(`${API}/api/pharmacy/medicines?limit=100&missing_images=true`, getAuth()); setMissingImageMeds(res.data.medicines || []); } catch { /* silent */ }
    setLoadingMissing(false);
  }, []);

  useEffect(() => {
    if (isAuth) {
      if (activeTab === 'products') fetchMedicines();
      if (activeTab === 'orders' || activeTab === 'past_orders') fetchOrders();
      if (activeTab === 'missing_images') fetchMissingImages();
    }
  }, [isAuth, activeTab, fetchMedicines, fetchOrders, fetchMissingImages]);

  const saveMedicine = async () => {
    if (!medForm.name || !medForm.mrp) { toast.error('Name & MRP required'); return; }
    setSavingMed(true);
    try {
      const payload = { ...medForm, mrp: parseFloat(medForm.mrp), sale_price: salePrice(medForm.mrp, medForm.discount_percent), discount_percent: parseFloat(medForm.discount_percent) || 0 };
      if (editingMed) { await axios.put(`${API}/api/pharmacy/medicines/${editingMed.id}`, payload, getAuth()); toast.success('Product updated!'); }
      else { await axios.post(`${API}/api/pharmacy/medicines`, payload, getAuth()); toast.success('Product added!'); }
      setShowAddForm(false); setEditingMed(null); fetchMedicines();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    setSavingMed(false);
  };

  const deleteMedicine = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await axios.delete(`${API}/api/pharmacy/medicines/${id}`, getAuth()); toast.success('Deleted'); fetchMedicines(); } catch { toast.error('Failed'); }
  };

  const openEditForm = (med) => {
    setEditingMed(med);
    setMedForm({ name: med.name || '', unit: med.unit || 'Tablet', mrp: String(med.mrp || ''), discount_percent: String(med.discount_percent || ''), category: med.category || 'General', image_url: med.image_url || '', manufacturer: med.manufacturer || '', generic_name: med.generic_name || '', description: med.description || '', composition: med.composition || '', uses: med.uses || '', side_effects: med.side_effects || '' });
    setShowAddForm(true);
  };

  const openAddForm = () => {
    setEditingMed(null);
    setMedForm({ name: '', unit: 'Tablet', mrp: '', discount_percent: '', category: 'General', image_url: '', manufacturer: '', generic_name: '', description: '', composition: '', uses: '', side_effects: '' });
    setShowAddForm(true);
  };

  const handleInlineChange = (medId, field, value) => { setInlineEdits(p => ({ ...p, [medId]: { ...p[medId], [field]: value } })); };
  const cancelInlineEdit = (medId) => { setInlineEdits(p => { const n = { ...p }; delete n[medId]; return n; }); };
  const saveInlineEdit = async (medId) => {
    const edits = inlineEdits[medId]; if (!edits) return;
    try { await axios.put(`${API}/api/pharmacy/medicines/${medId}`, { mrp: parseFloat(edits.mrp), discount_percent: parseFloat(edits.discount_percent) || 0, sale_price: salePrice(edits.mrp, edits.discount_percent) }, getAuth()); toast.success('Updated'); cancelInlineEdit(medId); fetchMedicines(); } catch { toast.error('Failed'); }
  };

  const openImageUpload = (medId) => { setImageTargetId(medId); setShowImageUpload(true); };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large. Max 5MB.'); return; }
    const formData = new FormData(); formData.append('file', file);
    const targetId = imageTargetId;
    if (targetId) {
      try {
        const res = await axios.post(`${API}/api/pharmacy/medicines/${targetId}/upload-image`, formData, { ...getAuth(), headers: { ...getAuth().headers, 'Content-Type': 'multipart/form-data' } });
        toast.success('Image uploaded!'); fetchMedicines();
        if (activeTab === 'missing_images') fetchMissingImages();
        if (editingMed && editingMed.id === targetId && res.data?.images) { setEditingMed(prev => ({ ...prev, images: res.data.images })); }
      } catch { toast.error('Upload failed'); }
    } else {
      const reader = new FileReader();
      reader.onload = () => setMedForm(p => ({ ...p, image_url: reader.result }));
      reader.readAsDataURL(file);
    }
    setShowImageUpload(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleUrlUpload = async (url) => {
    if (!url || !imageTargetId) return;
    try { await axios.put(`${API}/api/pharmacy/medicines/${imageTargetId}`, { image_url: url }, getAuth()); toast.success('Image updated'); fetchMedicines(); if (activeTab === 'missing_images') fetchMissingImages(); } catch { toast.error('Failed'); }
    setShowImageUpload(false); setImageTargetId(null);
  };

  const removeImage = async (medId, imgId) => {
    try {
      await axios.delete(`${API}/api/pharmacy/medicines/${medId}/images/${imgId}`, getAuth());
      setEditingMed(prev => ({ ...prev, images: prev.images.filter(i => i.id !== imgId) }));
      toast.success('Image removed');
    } catch { toast.error('Failed to remove'); }
  };

  const triggerFileUpload = (medId) => { if (medId) setImageTargetId(medId); fileInputRef.current?.click(); };
  const triggerCameraUpload = (medId) => { if (medId) setImageTargetId(medId); cameraInputRef.current?.click(); };
  const triggerInvoiceUpload = (orderId) => { setInvoiceTargetOrder(orderId); invoiceInputRef.current?.click(); };

  const updateOrderStatus = async (orderId, newStatus) => {
    try { await axios.put(`${API}/api/pharmacy/staff/orders/${orderId}/status`, { status: newStatus }, getAuth()); toast.success('Status updated'); fetchOrders(); }
    catch (err) {
      const detail = err.response?.data?.detail || '';
      if (detail.includes('Invoice must be uploaded')) { toast.error('Upload invoice before dispatching!', { description: 'Invoice is required before the order can be shipped.' }); }
      else { toast.error(detail || 'Failed to update status'); }
    }
  };

  const handleInvoiceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !invoiceTargetOrder) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large. Max 10MB.'); return; }
    setUploadingInvoice(invoiceTargetOrder);
    try {
      const formData = new FormData(); formData.append('file', file);
      await axios.post(`${API}/api/pharmacy/orders/${invoiceTargetOrder}/invoice`, formData, { ...getAuth(), headers: { ...getAuth().headers, 'Content-Type': 'multipart/form-data' } });
      toast.success('Invoice uploaded!'); fetchOrders();
    } catch (err) { toast.error(err.response?.data?.detail || 'Invoice upload failed'); }
    setUploadingInvoice(null); setInvoiceTargetOrder(null);
    if (invoiceInputRef.current) invoiceInputRef.current.value = '';
  };

  const sendInvoiceToCustomer = async (orderId) => {
    setSendingInvoice(orderId);
    try {
      const res = await axios.post(`${API}/api/pharmacy/orders/${orderId}/send-invoice`, {}, getAuth());
      const { email_sent, whatsapp_sent } = res.data;
      if (email_sent && whatsapp_sent) toast.success('Invoice sent via Email & WhatsApp!');
      else if (email_sent) toast.success('Invoice sent via Email!');
      else if (whatsapp_sent) toast.success('Invoice sent via WhatsApp!');
      else toast.info('Invoice processed but no delivery channel available.');
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to send invoice'); }
    setSendingInvoice(null);
  };

  const debouncedFetchSuggestions = useDebouncedCallback(async (q) => {
    if (!q || q.length < 2) { setSuggestions([]); return; }
    try { const res = await axios.get(`${API}/api/pharmacy/medicines/suggest?q=${encodeURIComponent(q)}&limit=8`, getAuth()); setSuggestions(res.data.suggestions || []); setShowSuggestions(true); } catch { setSuggestions([]); }
  }, 300);

  const applySuggestion = (s) => {
    setMedForm(p => ({ ...p, name: s.name || p.name, generic_name: s.generic_name || p.generic_name, manufacturer: s.manufacturer || p.manufacturer, unit: s.unit || s.form || p.unit, mrp: s.mrp ? String(s.mrp) : p.mrp, category: s.category || p.category, image_url: s.image_url || p.image_url, composition: s.composition || p.composition }));
    setShowSuggestions(false);
  };

  if (!isAuth) return null;

  const ctx = {
    staffInfo, orders, medicines, loadingOrders, loadingMeds, searchInput, searchQuery, categoryFilter, setCategoryFilter,
    orderStatusFilter, setOrderStatusFilter, medPage, setMedPage, medTotal, medPages, editingMed, setEditingMed,
    showAddForm, setShowAddForm, medForm, setMedForm, savingMed, inlineEdits, showImageUpload, setShowImageUpload,
    imageTargetId, fileInputRef, cameraInputRef, suggestions, showSuggestions, setShowSuggestions, missingImageMeds,
    loadingMissing, stats, uploadingInvoice, sendingInvoice, CATEGORIES,
    handleSearchChange, openEditForm, openAddForm, handleInlineChange, saveInlineEdit, cancelInlineEdit,
    openImageUpload, handleUrlUpload, removeImage, triggerFileUpload, triggerCameraUpload, triggerInvoiceUpload,
    updateOrderStatus, sendInvoiceToCustomer, saveMedicine, deleteMedicine, debouncedFetchSuggestions, applySuggestion,
  };

  return (
    <OrangeStaffContext.Provider value={ctx}>
      <div className="min-h-screen" style={{ background: darkMode ? '#0F0F0F' : '#FFFBF5', color: darkMode ? '#E5E5E5' : 'inherit', transition: 'background 0.3s, color 0.3s' }} data-testid="pharmacy-portal">
        <style>{`
          @keyframes orangeCardEntry { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }
          .orange-card-anim { animation: orangeCardEntry 0.4s cubic-bezier(0.22,1,0.36,1) both; }
          @keyframes orangePulse { 0%,100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.3); } 50% { box-shadow: 0 0 0 8px rgba(249,115,22,0); } }
        `}</style>

        {/* HEADER — Premium Curved */}
        <header className="sticky top-0 z-40 overflow-hidden" style={{
          background: darkMode
            ? 'linear-gradient(160deg, #7C2D12 0%, #9A3412 50%, #C2410C 100%)'
            : 'linear-gradient(160deg, #FB923C 0%, #F97316 50%, #EA580C 100%)',
          borderRadius: '0 0 28px 28px',
          boxShadow: '0 8px 32px rgba(249,115,22,0.15)',
          transition: 'background 0.4s ease',
        }}>
          {/* Orange accent bar */}
          <div style={{ height: 3, background: darkMode ? 'linear-gradient(90deg, #9A3412, #FDBA74, #9A3412)' : 'linear-gradient(90deg, #FDBA74, #FDE68A, #FDBA74)' }} />

          <div className="px-4 py-3">
            {/* Row 1: Brand + Icons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/staff')} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <ArrowLeft className="w-4 h-4 text-white" />
                </button>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <Pill className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white">Orange Pharmacy</h1>
                  <p className="text-[10px] font-medium text-white/70">{staffInfo?.name || 'Staff Portal'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <PortalSwitcher currentPortal="orange" iconColor="rgba(255,255,255,0.7)" />
                <BluetoothSpeakerIndicator connected={btSpeaker.connected} deviceName={btSpeaker.deviceName} scanning={btSpeaker.scanning} scanResults={btSpeaker.scanResults} autoConnectEnabled={btSpeaker.autoConnectEnabled} onScan={btSpeaker.scan} onConnectDevice={btSpeaker.connectDevice} onDisconnect={btSpeaker.disconnect} onToggleAutoConnect={btSpeaker.toggleAutoConnect} />
                <button className="p-2 rounded-lg relative" style={{ background: 'rgba(255,255,255,0.12)' }} data-testid="notification-bell">
                  <Bell className="w-4 h-4 text-white/80" />
                  {stats.pending > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[8px] text-white flex items-center justify-center font-bold">{stats.pending}</span>}
                </button>
                <button onClick={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem('staffDarkMode', String(next)); }}
                  className="p-2 rounded-lg transition-colors" style={{ background: 'rgba(255,255,255,0.12)' }} data-testid="dark-mode-toggle">
                  {darkMode ? <Sun className="w-4 h-4 text-amber-200" /> : <Moon className="w-4 h-4 text-white/80" />}
                </button>
                <button onClick={handleLogout} className="p-2 rounded-lg transition-colors" style={{ background: 'rgba(255,255,255,0.12)' }} data-testid="logout-btn">
                  <LogOut className="w-4 h-4 text-white/80" />
                </button>
              </div>
            </div>
          </div>

          {/* TABS — Inside curved header */}
          <div className="overflow-x-auto scrollbar-hide px-4 pb-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap rounded-lg transition-all"
                  style={activeTab === tab.id
                    ? { background: '#FFFFFF', color: '#EA580C', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
                    : { color: 'rgba(255,255,255,0.7)' }
                  } data-testid={`tab-${tab.id}`}>
                  <tab.icon className="w-3.5 h-3.5" />{tab.label}
                  {tab.id === 'orders' && stats.pending > 0 && <span className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center text-white bg-red-500 ml-0.5">{stats.pending}</span>}
                  {tab.id === 'missing_images' && missingImageMeds.length > 0 && <span className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center text-white bg-amber-500 ml-0.5">{missingImageMeds.length}</span>}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto p-4 pb-6">
          {/* Dashboard Summary — Gradient Stat Cards */}
          <div className="mb-4" data-testid="staff-dashboard-summary">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: darkMode ? '#FB923C' : '#EA580C' }}>Today's Dashboard</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide p-3 rounded-2xl" style={{
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
              border: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)',
              backdropFilter: 'blur(12px)',
            }}>
              {[
                { label: 'Inventory', value: medTotal.toLocaleString(), gradient: 'linear-gradient(135deg, #F97316, #EA580C)', icon: Package },
                { label: 'Pending', value: stats.pending, gradient: 'linear-gradient(135deg, #EF4444, #DC2626)', icon: ShoppingCart },
                { label: 'Missing Img', value: missingImageMeds.length, gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', icon: ImageIcon },
                { label: 'Products', value: medicines.length, gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', icon: Pill },
              ].map((s, i) => (
                <div key={s.label} className="orange-card-anim flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-xl min-w-[72px]"
                  style={{ background: s.gradient, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', animationDelay: `${i * 60}ms` }}>
                  <s.icon className="w-4 h-4 text-white/80 mb-1" />
                  <span className="text-lg font-black text-white">{s.value}</span>
                  <span className="text-[9px] font-medium text-white/80">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'products' && <OrangeInventoryTab />}
          {activeTab === 'orders' && <OrangeOrdersTab />}
          {activeTab === 'deliveries' && <OrangeDeliveryDashboard />}
          {activeTab === 'past_orders' && <OrangePastOrdersTab />}
          {activeTab === 'missing_images' && <OrangeMissingImagesTab />}
        </main>

        {/* Modals */}
        <OrangeMedicineModal />
        <OrangeImageUploadModal />

        {/* FAB */}
        <button onClick={() => { setActiveTab('products'); }}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-50 transition-all active:scale-90 hover:shadow-xl"
          style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', boxShadow: '0 4px 20px rgba(249,115,22,0.4)' }}
          data-testid="fab-orange-staff">
          <Plus className="w-6 h-6 text-white" />
        </button>

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
        <input ref={invoiceInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,image/*,application/pdf" className="hidden" onChange={handleInvoiceUpload} data-testid="invoice-file-input" />
      </div>
    </OrangeStaffContext.Provider>
  );
};

export default OrangePharmacyStaffPortal;
