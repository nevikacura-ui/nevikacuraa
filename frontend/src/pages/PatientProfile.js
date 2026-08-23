import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, ShoppingBag, ClipboardList, Stethoscope,
  Activity, CreditCard, Coins, ScanLine, MapPin, Users, Heart, RotateCcw,
  Wallet, Sparkles, UserCircle, LogOut, Settings, Bell, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const PatientProfile = () => {
  const navigate = useNavigate();
  const phone = localStorage.getItem('userPhone') || '';
  const [wallet, setWallet] = useState(null);
  const user = JSON.parse(localStorage.getItem('authUser') || 'null');

  useEffect(() => {
    if (phone) {
      axios.get(`${API}/wallet/${phone}`).then(r => setWallet(r.data.wallet)).catch(() => {});
    }
  }, [phone]);

  const MENU_ITEMS = [
    {
      id: 'orders',
      icon: ShoppingBag,
      label: 'My Orders',
      sub: 'Pharmacy orders & deliveries',
      route: '/track?filter=pharmacy',
      iconBg: 'linear-gradient(135deg, #f472b6, #ec4899, #db2777)',
      badge: null,
    },
    {
      id: 'lab-tests',
      icon: ClipboardList,
      label: 'My Lab Tests',
      sub: 'Mango Health Labs reports',
      route: '/track?filter=diagnostic',
      iconBg: 'linear-gradient(135deg, #60a5fa, #3b82f6, #2563eb)',
      badge: null,
    },
    {
      id: 'consultations',
      icon: Stethoscope,
      label: 'My Consultations',
      sub: 'DiaGyn visit records',
      route: '/track?filter=diagyn',
      iconBg: 'linear-gradient(135deg, #34d399, #10b981, #059669)',
      badge: null,
    },
    {
      id: 'health-insights',
      icon: Activity,
      label: 'Health Insights',
      sub: 'AI-powered health analysis',
      route: '/health-insights',
      iconBg: 'linear-gradient(135deg, #fb923c, #f97316, #ea580c)',
      badge: 'Beta',
      badgeColor: '#93c5fd',
    },
    {
      id: 'addresses',
      icon: MapPin,
      label: 'Saved Addresses',
      sub: 'Manage delivery addresses',
      route: '/patient-profile/addresses',
      iconBg: 'linear-gradient(135deg, #a78bfa, #8b5cf6, #7c3aed)',
      badge: null,
    },
    {
      id: 'family',
      icon: Users,
      label: 'Family Members',
      sub: 'Manage family health profiles',
      route: '/patient-profile/family',
      iconBg: 'linear-gradient(135deg, #67e8f9, #22d3ee, #06b6d4)',
      badge: null,
    },
    {
      id: 'favorites',
      icon: Heart,
      label: 'My Favorites',
      sub: 'Saved medicines & tests',
      route: '/patient-profile/favorites',
      iconBg: 'linear-gradient(135deg, #fb7185, #f43f5e, #e11d48)',
      badge: null,
    },
    {
      id: 'wallet',
      icon: Wallet,
      label: 'Cura Wallet',
      sub: wallet ? `Balance: ₹${wallet.balance}` : 'Health wallet & refunds',
      route: '/cura-wallet',
      iconBg: 'linear-gradient(135deg, #2dd4bf, #14b8a6, #0d9488)',
      badge: null,
    },
    {
      id: 'coins',
      icon: Sparkles,
      label: 'CuraX Coins',
      sub: wallet ? `${wallet.coins} coins available` : 'Earn rewards for health',
      route: '/cura-coins',
      iconBg: 'linear-gradient(135deg, #c084fc, #a855f7, #9333ea)',
      badge: null,
    },
    {
      id: 'family-wallet',
      icon: Users,
      label: 'Family Wallet',
      sub: 'Shared wallet for family',
      route: '/family-wallet',
      iconBg: 'linear-gradient(135deg, #60a5fa, #3b82f6, #2563eb)',
      badge: null,
    },
    {
      id: 'payment-methods',
      icon: CreditCard,
      label: 'Payment Methods',
      sub: 'Manage UPI & cards (Cashfree)',
      route: '/payment-methods',
      iconBg: 'linear-gradient(135deg, #60a5fa, #3b82f6, #2563eb)',
      badge: null,
    },
    {
      id: 'scan',
      icon: ScanLine,
      label: 'Scan Medicines',
      sub: 'Scan barcode for medicine info',
      route: '/medicine-scanner',
      iconBg: 'linear-gradient(135deg, #f9a8d4, #ec4899, #db2777)',
      badge: 'New',
      badgeColor: '#fecdd3',
    },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: '#050510' }} data-testid="patient-profile-page">
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 pt-4 pb-3" style={{ background: 'rgba(5,5,16,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} data-testid="profile-back-btn">
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <h1 className="flex-1 text-base font-semibold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>My Profile</h1>
          <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Settings className="w-4 h-4 text-white/40" />
          </button>
        </div>
      </div>

      <div className="px-4 mt-3">
        {/* User Card */}
        <div className="rounded-3xl p-5 mb-5 relative overflow-hidden" style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
        }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-teal-500/5 -mr-12 -mt-12 blur-2xl" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
              <UserCircle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-base truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {user?.name || 'Guest User'}
              </p>
              <p className="text-white/30 text-xs">{phone ? `+91 ${phone}` : 'Not logged in'}</p>
            </div>
            {wallet && (
              <div className="text-right flex-shrink-0">
                <p className="text-teal-400 text-sm font-bold">₹{wallet.balance}</p>
                <p className="text-amber-400/60 text-[10px]">{wallet.coins} coins</p>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items - Screenshot inspired vertical list */}
        <div className="space-y-1 mb-6">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.route)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98] hover:bg-white/[0.03]"
              data-testid={`menu-${item.id}`}
            >
              {/* Colored icon */}
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                style={{ background: item.iconBg }}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              {/* Label + sub */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <p className="text-white/85 text-sm font-semibold">{item.label}</p>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold"
                      style={{
                        background: item.badge === 'Beta' ? 'rgba(147,197,253,0.15)' : 'rgba(254,205,211,0.15)',
                        color: item.badgeColor,
                      }}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-white/25 text-[11px] mt-0.5 truncate">{item.sub}</p>
              </div>
              {/* Chevron */}
              <ChevronRight className="w-4 h-4 text-white/15 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Bottom actions */}
        <div className="space-y-1 mb-6">
          <button onClick={() => navigate('/notifications')} className="w-full flex items-center gap-4 p-4 rounded-2xl active:scale-[0.98]" data-testid="menu-notifications">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <Bell className="w-5 h-5 text-white/40" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white/60 text-sm font-medium">Notifications</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/10" />
          </button>
          <button onClick={() => navigate('/about')} className="w-full flex items-center gap-4 p-4 rounded-2xl active:scale-[0.98]" data-testid="menu-help">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <HelpCircle className="w-5 h-5 text-white/40" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white/60 text-sm font-medium">Help & About</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/10" />
          </button>
        </div>

        {/* App version */}
        <div className="text-center py-4">
          <p className="text-white/10 text-[10px]">Nevika Cura v2.0</p>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
