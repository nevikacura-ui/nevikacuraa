import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import BottomNav from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ChevronRight, Calendar, Clock, Package, TestTube2,
  Stethoscope, MapPin, Truck, CheckCircle2, ArrowRight,
  Compass, Crown, User, Pill, FlaskConical
} from 'lucide-react';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import ServiceHeader from '@/components/ServiceHeader';
import { useThemeLanguage } from '@/context/ThemeLanguageContext';
import PullToRefresh from '@/components/common/PullToRefresh';
import RatingPrompt from '@/components/RatingPrompt';
import BrandShowcase from '@/components/home/BrandShowcase';
import FooterBadge from '@/components/common/FooterBadge';
import GlobalSearch from '@/components/GlobalSearch';
import EmergencySOSFloat from '@/components/EmergencySOSFloat';
import PortalScrollBar from '@/components/PortalScrollBar';

const API = process.env.REACT_APP_BACKEND_URL;

/* ── Claymorphism Styles (Light Mode) ── */
const clay = {
  card: {
    background: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(255,255,255,0.8)',
    borderRadius: '20px',
    boxShadow: '8px 8px 20px rgba(166,160,154,0.18), -6px -6px 16px rgba(255,255,255,0.85), inset 2px 2px 4px rgba(255,255,255,0.6), inset -1px -1px 3px rgba(0,0,0,0.02)',
  },
  btn: {
    background: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(255,255,255,0.7)',
    boxShadow: '5px 5px 12px rgba(166,160,154,0.15), -4px -4px 10px rgba(255,255,255,0.8), inset 1px 1px 3px rgba(255,255,255,0.5)',
  },
  pill: {
    background: 'rgba(255,255,255,0.55)',
    boxShadow: '4px 4px 10px rgba(166,160,154,0.12), -3px -3px 8px rgba(255,255,255,0.7)',
  },
  header: {
    background: 'rgba(245,240,235,0.75)',
    backdropFilter: 'blur(24px) saturate(1.3)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
    borderBottom: '1px solid rgba(255,255,255,0.5)',
    boxShadow: '0 4px 16px rgba(166,160,154,0.1)',
  },
  activePill: {
    background: '#fff',
    boxShadow: '4px 4px 10px rgba(166,160,154,0.15), -3px -3px 8px rgba(255,255,255,0.8), inset 1px 1px 2px rgba(255,255,255,0.5)',
  },
};

/* ── Minimal Status Badge ── */
const StatusBadge = ({ status, isDark }) => {
  const map = {
    'Confirmed': { bg: 'rgba(16,185,129,0.12)', text: '#10B981', label: 'Confirmed' },
    'confirmed': { bg: 'rgba(16,185,129,0.12)', text: '#10B981', label: 'Confirmed' },
    'Order Booked': { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6', label: 'Booked' },
    'pending': { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', label: 'Pending' },
    'Pending': { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', label: 'Pending' },
    'In Queue': { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', label: 'In Queue' },
    'In Progress': { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6', label: 'In Progress' },
    'Processing': { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6', label: 'Processing' },
    'Shipped': { bg: 'rgba(139,92,246,0.12)', text: '#8B5CF6', label: 'Shipped' },
    'Out for Delivery': { bg: 'rgba(234,88,12,0.12)', text: '#EA580C', label: 'Out for Delivery' },
    'Delivered': { bg: 'rgba(16,185,129,0.12)', text: '#10B981', label: 'Delivered' },
    'delivered': { bg: 'rgba(16,185,129,0.12)', text: '#10B981', label: 'Delivered' },
    'Sample Collected': { bg: 'rgba(6,182,212,0.12)', text: '#06B6D4', label: 'Collected' },
    'Report Ready': { bg: 'rgba(16,185,129,0.12)', text: '#10B981', label: 'Report Ready' },
    'Completed': { bg: 'rgba(16,185,129,0.12)', text: '#10B981', label: 'Completed' },
    'completed': { bg: 'rgba(16,185,129,0.12)', text: '#10B981', label: 'Completed' },
  };
  const s = map[status] || { bg: 'rgba(107,114,128,0.12)', text: '#6B7280', label: status || 'Pending' };
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
};

/* ── Hero Tracking Card ── */
const HeroTrackingCard = ({ appointments, pharmacyOrders, labOrders, isDarkMode, navigate }) => {
  const totalActive = appointments.length + pharmacyOrders.length + labOrders.length;
  if (totalActive === 0) return null;

  const bg = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)';
  const border = isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)';
  const textPrimary = isDarkMode ? '#fff' : '#111827';
  const textSecondary = isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280';

  return (
    <div className="mb-4 rounded-2xl overflow-hidden" style={{ background: bg, border, backdropFilter: 'blur(16px)' }}
      data-testid="hero-tracking-card">

      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: textPrimary }}>Your Activity</h3>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-medium" style={{ color: textSecondary }}>{totalActive} active</span>
        </div>
      </div>

      {/* Appointments */}
      {appointments.map((apt, i) => (
        <div key={`apt-${i}`} onClick={() => navigate(apt.trackingPath || '/queue')}
          className="mx-3 mb-2 px-3 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
          style={{ background: isDarkMode ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.06)', border: isDarkMode ? '1px solid rgba(20,184,166,0.15)' : '1px solid rgba(20,184,166,0.1)' }}
          data-testid={`tracking-appointment-${i}`}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.15)' }}>
            <Stethoscope className="w-4 h-4 text-teal-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: textPrimary }}>{apt.doctor || 'Appointment'}</p>
            <p className="text-[10px]" style={{ color: textSecondary }}>{apt.date_display || apt.date} · {apt.time || apt.session}</p>
          </div>
          <StatusBadge status={apt.status || 'Confirmed'} isDark={isDarkMode} />
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: textSecondary }} />
        </div>
      ))}

      {/* Pharmacy Orders */}
      {pharmacyOrders.map((order, i) => (
        <div key={`pharm-${i}`} onClick={() => navigate('/my-orders')}
          className="mx-3 mb-2 px-3 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
          style={{ background: isDarkMode ? 'rgba(234,88,12,0.08)' : 'rgba(234,88,12,0.06)', border: isDarkMode ? '1px solid rgba(234,88,12,0.15)' : '1px solid rgba(234,88,12,0.1)' }}
          data-testid={`tracking-pharmacy-${i}`}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(234,88,12,0.15)' }}>
            <Package className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: textPrimary }}>{order.order_id || order.booking_id || 'Pharmacy Order'}</p>
            <p className="text-[10px]" style={{ color: textSecondary }}>{(order.items || order.medicines || []).length || '?'} items · ₹{order.total_amount || order.total || order.amount || '—'}</p>
          </div>
          <StatusBadge status={order.status} isDark={isDarkMode} />
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: textSecondary }} />
        </div>
      ))}

      {/* Lab Orders */}
      {labOrders.map((order, i) => (
        <div key={`lab-${i}`} onClick={() => navigate('/my-orders')}
          className="mx-3 mb-2 px-3 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
          style={{ background: isDarkMode ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.06)', border: isDarkMode ? '1px solid rgba(6,182,212,0.15)' : '1px solid rgba(6,182,212,0.1)' }}
          data-testid={`tracking-lab-${i}`}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.15)' }}>
            <FlaskConical className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: textPrimary }}>{order.order_id || order.booking_id || 'Lab Test'}</p>
            <p className="text-[10px]" style={{ color: textSecondary }}>{(order.tests || order.items || []).length || '?'} tests · ₹{order.total_amount || order.total || order.amount || '—'}</p>
          </div>
          <StatusBadge status={order.status} isDark={isDarkMode} />
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: textSecondary }} />
        </div>
      ))}

      <div className="h-2" />
    </div>
  );
};

/* ── Quick Service Button ── */
const QuickServiceBtn = ({ icon: Icon, label, color, bgColor, onClick, isDarkMode, testId }) => (
  <button onClick={onClick}
    className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl active:scale-95 transition-transform"
    style={{ background: isDarkMode ? 'rgba(255,255,255,0.04)' : bgColor, border: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : `1px solid ${color}20` }}
    data-testid={testId}>
    <Icon className="w-5 h-5" style={{ color }} />
    <span className="text-[10px] font-semibold" style={{ color: isDarkMode ? '#fff' : '#374151' }}>{label}</span>
  </button>
);

/* ── Main Home Page ── */
const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode } = useThemeLanguage();
  const [showAuth, setShowAuth] = useState(false);
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'portal' | 'curaone'

  // Tracking data
  const [appointments, setAppointments] = useState([]);
  const [pharmacyOrders, setPharmacyOrders] = useState([]);
  const [labOrders, setLabOrders] = useState([]);

  const patientPhone = localStorage.getItem('guestMobile') || localStorage.getItem('userPhone') || '';
  const storedInfo = (() => { try { return JSON.parse(localStorage.getItem('patientInfo') || '{}'); } catch { return {}; } })();
  const patientName = storedInfo.name || user?.name?.split(' ')[0] || '';

  const handleRefresh = useCallback(async () => { window.location.reload(); }, []);

  // Greeting
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Fetch tracking data
  useEffect(() => {
    if (!patientPhone) return;
    const phone = patientPhone.replace(/\D/g, '');

    // Fetch appointments
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    fetch(`${API}/api/appointments/v2/calendar?month=${month}&year=${year}&patient_phone=${phone}`)
      .then(r => r.json())
      .then(data => {
        const today = new Date().toISOString().split('T')[0];
        const upcoming = [];
        (data.calendar || []).forEach(day => {
          if (day.date >= today) {
            (day.appointments || []).forEach(a => {
              if (a.status !== 'cancelled' && a.status !== 'completed') upcoming.push({ ...a, date_display: day.date });
            });
          }
        });
        setAppointments(upcoming.slice(0, 3));
      })
      .catch(() => {});

    // Fetch pharmacy + lab orders from unified my-orders endpoint
    fetch(`${API}/api/orders/my-orders?phone=${phone}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) return;
        const allOrders = data.orders || [];
        const excludeStatuses = ['delivered', 'cancelled', 'completed', 'report ready', 'draft'];
        const pharmActive = allOrders
          .filter(o => o.order_type === 'pharmacy' && !excludeStatuses.includes((o.status || '').toLowerCase()))
          .slice(0, 3);
        const labActive = allOrders
          .filter(o => o.order_type === 'diagnostic' && !excludeStatuses.includes((o.status || '').toLowerCase()))
          .slice(0, 3);
        setPharmacyOrders(pharmActive);
        setLabOrders(labActive);
      })
      .catch(() => {});
  }, [patientPhone]);

  const textPrimary = isDarkMode ? '#fff' : '#111827';
  const textSecondary = isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280';
  const cardBg = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)';
  const cardBorder = isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)';

  return (
    <div className={`min-h-screen relative font-body transition-colors duration-300 ${isDarkMode ? 'bg-[#050510]' : 'bg-[#F8FAFB]'}`}>

      {/* Background */}
      {isDarkMode ? (
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-gradient-to-br from-teal-600/15 via-cyan-500/10 to-transparent rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] bg-gradient-to-br from-purple-600/10 via-blue-500/8 to-transparent rounded-full blur-[100px]" />
        </div>
      ) : (
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-gradient-to-br from-teal-50/60 via-cyan-50/40 to-transparent rounded-full blur-[100px]" />
          <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] bg-gradient-to-br from-orange-50/40 to-transparent rounded-full blur-[80px]" />
        </div>
      )}

      <ServiceHeader lightMode={!isDarkMode} />

      <PullToRefresh onRefresh={handleRefresh}>
        <div style={{ position: 'relative', zIndex: 2 }}><PortalScrollBar /></div>

        {/* Toggle: Home | My Portal | CuraOne */}
        <div className="px-4 pt-2 pb-1">
          <div className="flex p-1 rounded-2xl" style={{ background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
            {[
              { id: 'home', label: 'Home', icon: null },
              { id: 'portal', label: 'My Portal', icon: Compass },
              { id: 'curaone', label: 'CuraOne', icon: Crown },
            ].map(tab => (
              <button key={tab.id}
                onClick={() => {
                  if (tab.id === 'portal') { navigate('/portals'); return; }
                  if (tab.id === 'curaone') { navigate('/cura-one'); return; }
                  setActiveTab(tab.id);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                style={activeTab === tab.id ? {
                  background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#fff',
                  color: isDarkMode ? '#fff' : '#0d9488',
                  boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                } : {
                  color: textSecondary,
                }}
                data-testid={`home-tab-${tab.id}`}>
                {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Greeting */}
        <div className="px-4 pt-2 pb-1">
          <p className="text-lg font-bold" style={{ color: textPrimary, fontFamily: 'Outfit, sans-serif' }}>
            {getGreeting()}{patientName ? `, ${patientName}` : ''}
          </p>
        </div>

        {/* Search */}
        <div className="px-4 py-2" style={{ position: 'relative', zIndex: 40 }}>
          <GlobalSearch isDarkMode={isDarkMode} />
        </div>

        <main className="px-4 pb-24">

          {/* Hero Tracking Card */}
          <HeroTrackingCard
            appointments={appointments}
            pharmacyOrders={pharmacyOrders}
            labOrders={labOrders}
            isDarkMode={isDarkMode}
            navigate={navigate}
          />

          {/* Quick Services */}
          <div className="flex gap-2 mb-4" data-testid="quick-services">
            <QuickServiceBtn icon={Stethoscope} label="Consult" color="#14B8A6" bgColor="rgba(20,184,166,0.06)" onClick={() => navigate('/diagyn')} isDarkMode={isDarkMode} testId="quick-consult" />
            <QuickServiceBtn icon={Pill} label="Pharmacy" color="#EA580C" bgColor="rgba(234,88,12,0.06)" onClick={() => navigate('/pharmacy')} isDarkMode={isDarkMode} testId="quick-pharmacy" />
            <QuickServiceBtn icon={FlaskConical} label="Labs" color="#06B6D4" bgColor="rgba(6,182,212,0.06)" onClick={() => navigate('/mango')} isDarkMode={isDarkMode} testId="quick-labs" />
            <QuickServiceBtn icon={Calendar} label="Book" color="#8B5CF6" bgColor="rgba(139,92,246,0.06)" onClick={() => navigate('/diagyn/book')} isDarkMode={isDarkMode} testId="quick-book" />
          </div>

          {/* Brands */}
          <BrandShowcase />

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: 'My Orders', desc: 'Track all orders', icon: Package, path: '/my-orders', color: '#F59E0B' },
              { label: 'Prescriptions', desc: 'View Rx history', icon: Stethoscope, path: '/prescriptions', color: '#10B981' },
              { label: 'CuraPay', desc: 'Wallet & rewards', icon: Crown, path: '/cura-wallet', color: '#8B5CF6' },
              { label: 'Profile', desc: 'Your health data', icon: User, path: '/patient-profile', color: '#3B82F6' },
            ].map((item, i) => (
              <div key={i} onClick={() => navigate(item.path)}
                className="px-3 py-3 rounded-xl cursor-pointer active:scale-[0.97] transition-transform"
                style={{ background: cardBg, border: cardBorder, backdropFilter: 'blur(12px)' }}
                data-testid={`quick-link-${item.label.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  <span className="text-xs font-semibold" style={{ color: textPrimary }}>{item.label}</span>
                </div>
                <p className="text-[10px]" style={{ color: textSecondary }}>{item.desc}</p>
              </div>
            ))}
          </div>

        </main>

        <FooterBadge />
        <Footer />
      </PullToRefresh>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      <RatingPrompt />
      <EmergencySOSFloat />
      <BottomNav />
    </div>
  );
};

export default Home;
