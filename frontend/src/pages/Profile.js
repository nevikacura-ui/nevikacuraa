import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  ArrowLeft, ChevronRight, ShoppingBag, Wallet, HelpCircle, 
  Sun, Moon, Eye, EyeOff, MapPin, Bookmark, Heart, Receipt, 
  CreditCard, Gift, Trophy, Share2, Info, Bell, LogOut, 
  User, Settings, Cake, Star, Crown, Shield, FileText,
  Pill, Calendar, FlaskConical, Smartphone, Fingerprint, Monitor
} from 'lucide-react';
import { lightTap, mediumTap, selectionTap } from '@/utils/haptics';
import BottomNav from '@/components/BottomNav';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [darkMode, setDarkMode] = useState(false);
  const [hideSexy, setHideSexy] = useState(false);
  
  // User data states
  const [appointments, setAppointments] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [pharmacyOrders, setPharmacyOrders] = useState([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [healthRecords, setHealthRecords] = useState([]);

  // Get user from auth context OR localStorage (for patient portal users)
  const user = useMemo(() => {
    if (authUser) return authUser;
    
    // Check patient info from localStorage
    const patientInfo = localStorage.getItem('patientInfo');
    if (patientInfo) {
      try {
        return JSON.parse(patientInfo);
      } catch (e) {
        console.error('Failed to parse patient info:', e);
      }
    }
    
    // Check guest info
    const guestMobile = localStorage.getItem('guestMobile');
    if (guestMobile) {
      return { name: 'Guest User', phone: guestMobile, isGuest: true };
    }
    
    return null;
  }, [authUser]);

  // Check if user is logged in (any method)
  const isLoggedIn = useMemo(() => {
    return !!(
      authUser || 
      localStorage.getItem('patientToken') || 
      localStorage.getItem('token') ||
      localStorage.getItem('guestMobile')
    );
  }, [authUser]);

  useEffect(() => {
    if (!isLoggedIn) {
      // Redirect to login page
      navigate('/login');
      return;
    }
    fetchData();
  }, [isLoggedIn, navigate]);

  const fetchData = async () => {
    try {
      // Try token first (staff/admin), then patientToken (patient portal)
      const token = localStorage.getItem('token') || localStorage.getItem('patientToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [appointmentsRes, diagnosticsRes, pharmacyRes, loyaltyRes, recordsRes] = await Promise.all([
        axios.get(`${API}/appointments`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/diagnostics`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/pharmacy`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/user/loyalty-points`, { headers }).catch(() => ({ data: { loyalty_points: 0 } })),
        axios.get(`${API}/health-records`, { headers }).catch(() => ({ data: { records: [] } }))
      ]);

      setAppointments(appointmentsRes.data || []);
      setDiagnostics(diagnosticsRes.data || []);
      setPharmacyOrders(pharmacyRes.data || []);
      setLoyaltyPoints(loyaltyRes.data.loyalty_points || 0);
      setHealthRecords(recordsRes.data.records || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    mediumTap();
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  // Menu item component
  const MenuItem = ({ icon: Icon, label, sublabel, onClick, rightElement, showArrow = true, color = "text-slate-600" }) => (
    <button 
      onClick={() => {
        lightTap();
        onClick?.();
      }}
      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-left">
          <p className="font-medium text-slate-800">{label}</p>
          {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
        </div>
      </div>
      {rightElement ? rightElement : (showArrow && <ChevronRight className="w-5 h-5 text-slate-400" />)}
    </button>
  );

  // Section header
  const SectionHeader = ({ title }) => (
    <div className="px-4 py-2 bg-slate-100">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
    </div>
  );

  // Orders tab content
  const OrdersTab = () => (
    <div className="space-y-4 pb-6">
      {/* Appointments */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-500" />
            <span className="font-semibold text-slate-800">Appointments</span>
          </div>
          <span className="text-xs text-slate-500">{appointments.length} total</span>
        </div>
        {appointments.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No appointments yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.slice(0, 3).map((apt, idx) => (
              <div key={idx} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{apt.doctor_name || 'Doctor Visit'}</p>
                  <p className="text-xs text-slate-500">{new Date(apt.date).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {apt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lab Tests */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-500" />
            <span className="font-semibold text-slate-800">Lab Tests</span>
          </div>
          <span className="text-xs text-slate-500">{diagnostics.length} total</span>
        </div>
        {diagnostics.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No lab tests booked</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {diagnostics.slice(0, 3).map((test, idx) => (
              <div key={idx} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{test.tests?.join(', ') || 'Lab Test'}</p>
                  <p className="text-xs text-slate-500">{new Date(test.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  test.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {test.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pharmacy Orders */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-slate-800">Pharmacy Orders</span>
          </div>
          <span className="text-xs text-slate-500">{pharmacyOrders.length} total</span>
        </div>
        {pharmacyOrders.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            <Pill className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No pharmacy orders</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pharmacyOrders.slice(0, 3).map((order, idx) => (
              <div key={idx} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">Order #{order._id?.slice(-6) || idx + 1}</p>
                  <p className="text-xs text-slate-500">{order.medicines?.length || 0} items • ₹{order.total || 0}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Main profile tab content
  const ProfileTab = () => (
    <div className="pb-24">
      {/* Profile Header */}
      <div className="bg-white px-4 py-5 flex items-center gap-4 border-b border-slate-100">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-800">{user?.name || 'User'}</h2>
          <p className="text-sm text-slate-500">{user?.phone || user?.email}</p>
          <button 
            onClick={() => {
              lightTap();
              toast.info('Edit profile coming soon!');
            }}
            className="text-xs text-teal-600 font-semibold mt-1"
          >
            Edit profile →
          </button>
        </div>
      </div>

      {/* Birthday Banner */}
      <div className="mx-4 mt-4 bg-gradient-to-r from-pink-100 via-rose-50 to-amber-50 rounded-2xl p-4 flex items-center gap-4 border border-pink-200">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
          <Cake className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-800">Add your birthday</p>
          <p className="text-xs text-slate-600">We'll send you a special gift!</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mx-4 mt-4">
        <button 
          onClick={() => {
            lightTap();
            setActiveTab('orders');
          }}
          className="bg-white rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 mx-auto rounded-xl bg-teal-100 flex items-center justify-center mb-2">
            <ShoppingBag className="w-6 h-6 text-teal-600" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Your orders</p>
        </button>
        
        <button 
          onClick={() => {
            lightTap();
            toast.info('Wallet feature coming soon!');
          }}
          className="bg-white rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 mx-auto rounded-xl bg-amber-100 flex items-center justify-center mb-2">
            <Wallet className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Wallet</p>
          <p className="text-xs text-slate-500">₹{loyaltyPoints}</p>
        </button>
        
        <button 
          onClick={() => {
            lightTap();
            toast.info('Help center coming soon!');
          }}
          className="bg-white rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 mx-auto rounded-xl bg-blue-100 flex items-center justify-center mb-2">
            <HelpCircle className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Need help?</p>
        </button>
      </div>

      {/* Membership Card */}
      <div className="mx-4 mt-4 bg-gradient-to-r from-purple-600 to-violet-600 rounded-2xl p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8" />
            <div>
              <p className="font-bold text-lg">Loyalty Points</p>
              <p className="text-white/80 text-sm">You have {loyaltyPoints} points</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">₹{(loyaltyPoints / 10).toFixed(0)}</p>
            <p className="text-xs text-white/70">Redeemable value</p>
          </div>
        </div>
      </div>

      {/* App Settings */}
      <div className="bg-white rounded-2xl mx-4 mt-4 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">App Settings</p>
        </div>
        
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              {darkMode ? <Moon className="w-5 h-5 text-indigo-600" /> : <Sun className="w-5 h-5 text-amber-500" />}
            </div>
            <div>
              <p className="font-medium text-slate-800">Appearance</p>
              <p className="text-xs text-slate-500">{darkMode ? 'Dark mode' : 'Light mode'}</p>
            </div>
          </div>
          <Switch 
            checked={darkMode} 
            onCheckedChange={(checked) => {
              selectionTap();
              setDarkMode(checked);
              toast.info(`${checked ? 'Dark' : 'Light'} mode ${checked ? 'enabled' : 'disabled'}`);
            }}
          />
        </div>
        
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              {hideSexy ? <EyeOff className="w-5 h-5 text-slate-600" /> : <Eye className="w-5 h-5 text-slate-600" />}
            </div>
            <div>
              <p className="font-medium text-slate-800">Hide sensitive items</p>
              <p className="text-xs text-slate-500">Hide adult products</p>
            </div>
          </div>
          <Switch 
            checked={hideSexy} 
            onCheckedChange={(checked) => {
              selectionTap();
              setHideSexy(checked);
            }}
          />
        </div>
      </div>

      {/* Your Information */}
      <div className="bg-white rounded-2xl mx-4 mt-4 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Information</p>
        </div>
        
        <MenuItem 
          icon={MapPin} 
          label="Address book" 
          sublabel="Save your addresses" 
          onClick={() => toast.info('Address book coming soon!')}
          color="text-red-500"
        />
        <div className="h-px bg-slate-100" />
        <MenuItem 
          icon={Heart} 
          label="Your wishlist" 
          sublabel={`${(JSON.parse(localStorage.getItem('mango_wishlist') || '[]')).length} items saved`}
          onClick={() => navigate('/mango')}
          color="text-pink-500"
        />
        <div className="h-px bg-slate-100" />
        <MenuItem 
          icon={FileText} 
          label="Health records" 
          sublabel={`${healthRecords.length} documents`}
          onClick={() => setActiveTab('records')}
          color="text-blue-500"
        />
        <div className="h-px bg-slate-100" />
        <MenuItem 
          icon={Receipt} 
          label="Your prescriptions" 
          onClick={() => toast.info('Prescriptions coming soon!')}
          color="text-emerald-500"
        />
      </div>

      {/* Payment & Rewards */}
      <div className="bg-white rounded-2xl mx-4 mt-4 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment & Rewards</p>
        </div>
        
        <MenuItem 
          icon={Wallet} 
          label="Wallet" 
          sublabel={`Balance: ₹${loyaltyPoints}`}
          onClick={() => toast.info('Wallet coming soon!')}
          color="text-amber-500"
        />
        <div className="h-px bg-slate-100" />
        <MenuItem 
          icon={CreditCard} 
          label="Payment settings" 
          onClick={() => toast.info('Payment settings coming soon!')}
          color="text-indigo-500"
        />
        <div className="h-px bg-slate-100" />
        <MenuItem 
          icon={Gift} 
          label="Claim Gift card" 
          onClick={() => toast.info('Gift cards coming soon!')}
          color="text-purple-500"
        />
        <div className="h-px bg-slate-100" />
        <MenuItem 
          icon={Trophy} 
          label="Your rewards" 
          sublabel={`${loyaltyPoints} points earned`}
          onClick={() => toast.info('Rewards coming soon!')}
          color="text-orange-500"
        />
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl mx-4 mt-4 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security</p>
        </div>
        
        <MenuItem 
          icon={Fingerprint} 
          label="Biometric login" 
          sublabel="Face ID / Fingerprint" 
          onClick={() => setActiveTab('security')}
          color="text-violet-500"
        />
        <div className="h-px bg-slate-100" />
        <MenuItem 
          icon={Monitor} 
          label="Trusted devices" 
          onClick={() => setActiveTab('security')}
          color="text-slate-600"
        />
      </div>

      {/* Other Information */}
      <div className="bg-white rounded-2xl mx-4 mt-4 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Other Information</p>
        </div>
        
        <MenuItem 
          icon={Share2} 
          label="Share the app" 
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: 'Nevika Cura', text: 'Check out Nevika Cura!', url: window.location.origin });
            } else {
              toast.info('Share feature not available');
            }
          }}
          color="text-blue-500"
        />
        <div className="h-px bg-slate-100" />
        <MenuItem 
          icon={Info} 
          label="About us" 
          onClick={() => toast.info('About page coming soon!')}
          color="text-slate-500"
        />
        <div className="h-px bg-slate-100" />
        <MenuItem 
          icon={Shield} 
          label="Account privacy" 
          onClick={() => toast.info('Privacy settings coming soon!')}
          color="text-emerald-500"
        />
        <div className="h-px bg-slate-100" />
        <MenuItem 
          icon={Bell} 
          label="Notification preferences" 
          onClick={() => setActiveTab('notifications')}
          color="text-rose-500"
        />
        <div className="h-px bg-slate-100" />
        <MenuItem 
          icon={LogOut} 
          label="Log out" 
          onClick={handleLogout}
          showArrow={false}
          color="text-red-500"
        />
      </div>

      {/* App Version */}
      <div className="text-center mt-6 mb-24">
        <p className="text-xs text-slate-400">Version 2.1.0</p>
        <p className="text-xs text-slate-400 mt-1">Made with ❤️ by Nevika Cura</p>
      </div>
    </div>
  );

  // Health Records Tab
  const RecordsTab = () => (
    <div className="pb-24">
      <div className="bg-white rounded-2xl mx-4 mt-4 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="font-semibold text-slate-800">Health Records</p>
          <Button size="sm" variant="outline" onClick={() => toast.info('Upload coming soon!')}>
            Upload
          </Button>
        </div>
        {healthRecords.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No health records yet</p>
            <p className="text-xs text-slate-400 mt-1">Upload prescriptions, reports & more</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {healthRecords.map((record, idx) => (
              <div key={idx} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="font-medium text-slate-800">{record.title}</p>
                    <p className="text-xs text-slate-500">{record.record_type} • {new Date(record.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Security Tab
  const SecurityTab = () => (
    <div className="pb-24">
      <div className="bg-white rounded-2xl mx-4 mt-4 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="font-semibold text-slate-800">Security Settings</p>
        </div>
        
        <MenuItem 
          icon={Fingerprint} 
          label="Biometric authentication" 
          sublabel="Use Face ID or fingerprint to login"
          onClick={() => toast.info('Biometric setup coming soon!')}
          color="text-violet-500"
        />
        <div className="h-px bg-slate-100" />
        <MenuItem 
          icon={Smartphone} 
          label="Two-factor authentication" 
          sublabel="Add extra security to your account"
          onClick={() => toast.info('2FA coming soon!')}
          color="text-blue-500"
        />
        <div className="h-px bg-slate-100" />
        <MenuItem 
          icon={Monitor} 
          label="Manage devices" 
          sublabel="View and manage trusted devices"
          onClick={() => toast.info('Device management coming soon!')}
          color="text-slate-600"
        />
      </div>
    </div>
  );

  // Notifications Tab
  const NotificationsTab = () => (
    <div className="pb-24">
      <div className="bg-white rounded-2xl mx-4 mt-4 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="font-semibold text-slate-800">Notification Preferences</p>
        </div>
        
        <div className="px-4 py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Push notifications</p>
                <p className="text-xs text-slate-500">Get alerts on your device</p>
              </div>
              <Switch defaultChecked onCheckedChange={() => selectionTap()} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Order updates</p>
                <p className="text-xs text-slate-500">Track your orders in real-time</p>
              </div>
              <Switch defaultChecked onCheckedChange={() => selectionTap()} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Promotional offers</p>
                <p className="text-xs text-slate-500">Get discounts and deals</p>
              </div>
              <Switch onCheckedChange={() => selectionTap()} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Appointment reminders</p>
                <p className="text-xs text-slate-500">Never miss an appointment</p>
              </div>
              <Switch defaultChecked onCheckedChange={() => selectionTap()} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {activeTab !== 'profile' && (
              <button 
                onClick={() => {
                  lightTap();
                  setActiveTab('profile');
                }}
                className="p-2 -ml-2 rounded-full hover:bg-slate-100"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            )}
            <h1 className="text-lg font-bold text-slate-800">
              {activeTab === 'profile' && 'Your account'}
              {activeTab === 'orders' && 'Your orders'}
              {activeTab === 'records' && 'Health records'}
              {activeTab === 'security' && 'Security'}
              {activeTab === 'notifications' && 'Notifications'}
            </h1>
          </div>
          <button 
            onClick={() => {
              lightTap();
              toast.info('Settings coming soon!');
            }}
            className="p-2 rounded-full hover:bg-slate-100"
          >
            <Settings className="w-5 h-5 text-slate-600" />
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
              <button
                key={tab.id}
                onClick={() => {
                  selectionTap();
                  setActiveTab(tab.id);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-teal-500 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'orders' && <OrdersTab />}
      {activeTab === 'records' && <RecordsTab />}
      {activeTab === 'security' && <SecurityTab />}
      {activeTab === 'notifications' && <NotificationsTab />}

      <BottomNav />
    </div>
  );
};

export default Profile;
