import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { ArrowLeft, Settings } from 'lucide-react';
import { lightTap, mediumTap, selectionTap } from '@/utils/haptics';
import BottomNav from '@/components/BottomNav';
import { FamilyProfiles } from '@/components/FamilyProfiles';
import { SubscriptionRefills } from '@/components/SubscriptionRefills';
import { MySubscriptions } from '@/components/AutoRefillSubscription';

import ProfileContext from './profile/ProfileContext';
import ProfileMainTab from './profile/ProfileMainTab';
import ProfileOrdersTab from './profile/ProfileOrdersTab';
import ProfileRecordsTab from './profile/ProfileRecordsTab';
import ProfileWalletTab from './profile/ProfileWalletTab';
import ProfileRewardsTab from './profile/ProfileRewardsTab';
import ProfileSecurityTab from './profile/ProfileSecurityTab';
import ProfileNotificationsTab from './profile/ProfileNotificationsTab';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const RAMADAN_TOGGLE_END_DATE = new Date('2026-03-20');

const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [ramadanGreetings, setRamadanGreetings] = useState(false);
  const showRamadanToggle = new Date() <= RAMADAN_TOGGLE_END_DATE;
  const [appointments, setAppointments] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [pharmacyOrders, setPharmacyOrders] = useState([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [healthRecords, setHealthRecords] = useState([]);
  const [showFamilyProfiles, setShowFamilyProfiles] = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [prescriptionRecords, setPrescriptionRecords] = useState([]);
  const [scanningPrescription, setScanningPrescription] = useState(false);
  const prescriptionInputRef = useRef(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState([]);

  const user = useMemo(() => {
    if (authUser) return authUser;
    const patientInfo = localStorage.getItem('patientInfo');
    if (patientInfo) { try { return JSON.parse(patientInfo); } catch {} }
    const guestMobile = localStorage.getItem('guestMobile');
    if (guestMobile) return { name: 'Guest User', phone: guestMobile, isGuest: true };
    return null;
  }, [authUser]);

  const isLoggedIn = useMemo(() => !!(authUser || localStorage.getItem('patientToken') || localStorage.getItem('token') || localStorage.getItem('guestMobile')), [authUser]);

  useEffect(() => { if (!isLoggedIn) { navigate('/login'); return; } fetchData(); }, [isLoggedIn, navigate]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('patientToken');
      const headers = { Authorization: `Bearer ${token}` };
      const [appointmentsRes, diagnosticsRes, pharmacyRes, loyaltyRes, recordsRes, walletRes] = await Promise.all([
        axios.get(`${API}/appointments`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/diagnostics`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/pharmacy`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/user/loyalty-points`, { headers }).catch(() => ({ data: { loyalty_points: 0 } })),
        axios.get(`${API}/health-records`, { headers }).catch(() => ({ data: { records: [] } })),
        axios.get(`${API}/wallet/balance`, { headers }).catch(() => ({ data: { balance: 0 } }))
      ]);
      setAppointments(appointmentsRes.data || []);
      setDiagnostics(diagnosticsRes.data || []);
      setPharmacyOrders(pharmacyRes.data || []);
      setLoyaltyPoints(loyaltyRes.data.loyalty_points || 0);
      setHealthRecords(recordsRes.data.records || []);
      setWalletBalance(walletRes.data.balance || 0);
    } catch (error) { console.error('Failed to fetch data:', error); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    mediumTap();
    // Clear all auth data first
    ['patientToken', 'patientInfo', 'patientLoginExpiry', 'token', 'user', 'guestMobile', 'authToken', 'guestMode', 'skippedLogin', 'intro_seen'].forEach(k => localStorage.removeItem(k));
    // Single atomic redirect — avoid competing navigate() + reload() race condition
    toast.success('Logged out successfully');
    window.location.href = '/';
  };

  const handlePrescriptionCapture = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setScanningPrescription(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        const token = localStorage.getItem('token') || localStorage.getItem('patientToken');
        const phone = user?.phone || localStorage.getItem('guestMobile');
        try {
          const response = await axios.post(`${API}/prescriptions/upload`, { image: base64, phone, name: `Prescription ${new Date().toLocaleDateString()}` }, { headers: { Authorization: `Bearer ${token}` } });
          if (response.data.success) { setPrescriptionRecords(prev => [{ id: response.data.prescription_id, name: `Prescription ${new Date().toLocaleDateString()}`, image_url: base64, created_at: new Date().toISOString() }, ...prev]); toast.success('Prescription saved!'); }
        } catch {
          const localRecords = JSON.parse(localStorage.getItem('prescriptionRecords') || '[]');
          localRecords.unshift({ id: `local_${Date.now()}`, name: `Prescription ${new Date().toLocaleDateString()}`, image_url: base64, created_at: new Date().toISOString() });
          localStorage.setItem('prescriptionRecords', JSON.stringify(localRecords));
          setPrescriptionRecords(localRecords);
          toast.success('Prescription saved locally!');
        }
      };
      reader.readAsDataURL(file);
    } catch { toast.error('Failed to capture prescription'); }
    finally { setScanningPrescription(false); if (prescriptionInputRef.current) prescriptionInputRef.current.value = ''; }
  };

  useEffect(() => {
    const loadPrescriptions = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('patientToken');
        const phone = user?.phone || localStorage.getItem('guestMobile');
        if (phone) {
          const response = await axios.get(`${API}/prescriptions/${phone}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
          if (response?.data?.prescriptions) { setPrescriptionRecords(response.data.prescriptions); }
          else { setPrescriptionRecords(JSON.parse(localStorage.getItem('prescriptionRecords') || '[]')); }
        }
      } catch { setPrescriptionRecords(JSON.parse(localStorage.getItem('prescriptionRecords') || '[]')); }
    };
    if (user) loadPrescriptions();
  }, [user]);

  // Ramadan preference
  useEffect(() => {
    const fetchRamadanPref = async () => {
      if (!user?.phone) return;
      try {
        const response = await axios.get(`${API}/faithcare/ramadan-preference/${user.phone}`);
        if (response.data.subscribed !== undefined) setRamadanGreetings(response.data.subscribed);
      } catch {}
    };
    if (showRamadanToggle) fetchRamadanPref();
  }, [user?.phone, showRamadanToggle]);

  const handleRamadanToggle = async (enabled) => {
    if (!user?.phone) { toast.error('Please login to change this setting'); return; }
    try {
      selectionTap(); setRamadanGreetings(enabled);
      await axios.post(`${API}/faithcare/ramadan-preference`, { phone: user.phone, name: user.name || 'User', subscribed: enabled });
      toast.success(enabled ? 'Ramadan greetings enabled!' : 'Ramadan greetings disabled');
    } catch { setRamadanGreetings(!enabled); toast.error('Failed to update preference'); }
  };

  const ctx = {
    user, navigate, activeTab, setActiveTab, appointments, diagnostics, pharmacyOrders, loyaltyPoints, healthRecords,
    prescriptionRecords, prescriptionInputRef, walletBalance, setWalletBalance, walletTransactions, setWalletTransactions,
    showFamilyProfiles, setShowFamilyProfiles, showSubscriptions, setShowSubscriptions, scanningPrescription,
    ramadanGreetings, handleRamadanToggle, showRamadanToggle, handleLogout, handlePrescriptionCapture
  };

  if (loading) {
    return (
      <div className="dark-page min-h-screen bg-[#050510]">
        <div className="bg-[#1A1A1A] sticky top-0 z-50 border-b border-white/10 px-4 py-3"><div className="h-5 w-32 bg-white/10 rounded animate-pulse" /></div>
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center gap-4"><div className="w-16 h-16 rounded-full bg-white/10 animate-pulse" /><div className="space-y-2 flex-1"><div className="h-5 w-36 bg-white/10 rounded animate-pulse" /><div className="h-3 w-28 bg-white/10 rounded animate-pulse" /></div></div>
          <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="bg-white/5 rounded-2xl p-4 h-24 animate-pulse" />)}</div>
          {[1,2,3,4,5].map(i => <div key={i} className="flex items-center gap-3 p-3"><div className="w-10 h-10 rounded-xl bg-white/10 animate-pulse" /><div className="flex-1 space-y-1.5"><div className="h-4 w-28 bg-white/10 rounded animate-pulse" /><div className="h-3 w-20 bg-white/5 rounded animate-pulse" /></div></div>)}
        </div>
      </div>
    );
  }

  return (
    <ProfileContext.Provider value={ctx}>
      <div className="dark-page min-h-screen bg-[#050510]">
        {/* Header */}
        <div className="bg-[#1A1A1A] sticky top-0 z-50 border-b border-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {activeTab !== 'profile' && (
                <button onClick={() => { lightTap(); setActiveTab('profile'); }} className="p-2 -ml-2 rounded-full hover:bg-white/10">
                  <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
              )}
              <h1 className="text-lg font-bold text-white">
                {activeTab === 'profile' && 'Your account'}
                {activeTab === 'orders' && 'Your orders'}
                {activeTab === 'records' && 'Health records'}
                {activeTab === 'security' && 'Security'}
                {activeTab === 'notifications' && 'Notifications'}
                {activeTab === 'wallet' && 'Wallet'}
                {activeTab === 'rewards' && 'Rewards'}
                {activeTab === 'prescriptions' && 'Prescriptions'}
              </h1>
            </div>
            <button onClick={() => { lightTap(); navigate('/settings'); }} className="p-2 rounded-full hover:bg-white/10">
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Tab Bar */}
          {activeTab === 'profile' && (
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
              {[
                { id: 'profile', label: 'Profile' },
                { id: 'orders', label: 'Orders' },
                { id: 'records', label: 'Records' },
                { id: 'security', label: 'Security' },
                { id: 'notifications', label: 'Notifications' }
              ].map(tab => (
                <button key={tab.id} onClick={() => { selectionTap(); setActiveTab(tab.id); }}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id ? 'bg-teal-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {activeTab === 'profile' && <ProfileMainTab />}
        {activeTab === 'orders' && <ProfileOrdersTab />}
        {activeTab === 'records' && <ProfileRecordsTab />}
        {activeTab === 'security' && <ProfileSecurityTab />}
        {activeTab === 'notifications' && <ProfileNotificationsTab />}
        {activeTab === 'wallet' && <ProfileWalletTab />}
        {activeTab === 'rewards' && <ProfileRewardsTab />}
        {activeTab === 'prescriptions' && <ProfileMainTab />}

        {/* Family Profiles Modal */}
        <FamilyProfiles isOpen={showFamilyProfiles} onClose={() => setShowFamilyProfiles(false)} />

        {/* My Auto-Refill Subscriptions */}
        {authUser?.phone && (
          <div className="mx-4 mt-4"><MySubscriptions phone={authUser.phone} /></div>
        )}

        {/* Subscription Refills Modal */}
        <SubscriptionRefills isOpen={showSubscriptions} onClose={() => setShowSubscriptions(false)} />

        {/* Hidden prescription input */}
        <input ref={prescriptionInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePrescriptionCapture} />

        <BottomNav />
      </div>
    </ProfileContext.Provider>
  );
};

export default Profile;
