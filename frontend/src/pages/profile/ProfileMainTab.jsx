import React, { useState, useEffect } from 'react';
import { useProfile } from './ProfileContext';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ChevronRight, ShoppingBag, Wallet, MapPin, Heart,
  CreditCard, Gift, Trophy, Share2, Info, LogOut,
  User, Crown, Shield, FileText, Coins,
  Calendar, FlaskConical, Users, Camera, Bell,
  Settings, HelpCircle, Stethoscope, Pill,
  MessageCircle, Plus
} from 'lucide-react';
import { lightTap, selectionTap } from '@/utils/haptics';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const GridCard = ({ icon: Icon, label, badge, badgeColor, iconColor, gradientFrom, gradientTo, onClick, testId }) => (
  <button
    onClick={() => { selectionTap(); onClick?.(); }}
    className="relative rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 overflow-hidden"
    style={{
      background: `linear-gradient(145deg, ${gradientFrom || iconColor + '12'} 0%, ${gradientTo || iconColor + '06'} 100%)`,
      border: `1px solid ${iconColor}20`,
    }}
    data-testid={testId}>
    {/* Decorative ring */}
    <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full" style={{ border: `1px solid ${iconColor}08` }} />
    <div className="w-11 h-11 rounded-xl flex items-center justify-center"
      style={{ background: `${iconColor}20`, boxShadow: `0 4px 12px ${iconColor}15` }}>
      <Icon className="w-5 h-5" style={{ color: iconColor }} />
    </div>
    <span className="text-[11px] font-bold text-white/90 text-center leading-tight">{label}</span>
    {badge !== undefined && badge !== null && (
      <span className="absolute top-2 right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold px-1"
        style={{ background: badgeColor || '#EA580C', color: '#fff', boxShadow: `0 2px 8px ${badgeColor || '#EA580C'}40` }}>
        {badge}
      </span>
    )}
  </button>
);

const ProfileMainTab = () => {
  const p = useProfile();
  const { user, navigate, appointments, diagnostics, pharmacyOrders, loyaltyPoints, healthRecords, prescriptionRecords, walletBalance, setActiveTab, handleLogout, setShowFamilyProfiles, prescriptionInputRef, scanningPrescription } = p;

  const [curaBonusProfile, setCuraBonusProfile] = useState(null);

  useEffect(() => {
    const phone = user?.phone || localStorage.getItem('guestMobile') || '';
    if (!phone) return;
    axios.get(`${API}/curabonus/profile?phone=${phone}`)
      .then(res => setCuraBonusProfile(res.data))
      .catch(() => {});
  }, [user?.phone]);

  const tierColors = { bronze: '#D97706', silver: '#9CA3AF', gold: '#F59E0B' };
  const tier = curaBonusProfile?.tier || 'bronze';

  return (
    <div className="pb-28" data-testid="profile-main-tab">

      {/* Profile Header */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
          style={{ background: 'linear-gradient(135deg, #14B8A6, #10B981)', boxShadow: '0 6px 24px rgba(20,184,166,0.2)' }}>
          {(user?.name || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Outfit' }}>
            {user?.name || 'User'}
          </h2>
          <p className="text-sm text-white/50 mt-0.5">{user?.phone || user?.email || ''}</p>
        </div>
        <button onClick={() => { lightTap(); navigate('/edit-profile'); }}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
          data-testid="edit-profile-btn">
          Edit profile <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* CuraPay Wallet Banner */}
      <div className="mx-4">
        <button onClick={() => navigate('/cura-wallet')}
          className="w-full rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.12) 0%, rgba(16,185,129,0.06) 100%)', border: '1px solid rgba(20,184,166,0.18)' }}
          data-testid="curapay-banner-card">
          <div className="px-4 py-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #14B8A6, #10B981)', boxShadow: '0 4px 14px rgba(20,184,166,0.2)' }}>
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-bold text-white flex-1 text-left">CuraPay Wallet</span>
            <ChevronRight className="w-4 h-4 text-teal-400/50" />
          </div>
          <div className="px-4 pb-3.5 flex items-center justify-between" style={{ borderTop: '1px dashed rgba(20,184,166,0.15)' }}>
            <div className="flex items-center gap-2 pt-2.5">
              <span className="text-xs text-white/40">Available Balance</span>
              <span className="text-lg font-black text-white" style={{ fontFamily: 'Outfit' }}>₹{walletBalance}</span>
            </div>
            <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg mt-2"
              style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)', color: '#5EEAD4' }}>
              <Plus className="w-3 h-3 inline -mt-0.5 mr-0.5" />Add Balance
            </span>
          </div>
        </button>
      </div>

      {/* CuraBonus Coins Banner */}
      {curaBonusProfile && (
        <div className="mx-4 mt-3">
          <button onClick={() => navigate('/cura-bonus')}
            className="w-full rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(34,197,94,0.05) 100%)', border: '1px solid rgba(249,115,22,0.18)' }}
            data-testid="curabonus-banner-card">
            <div className="px-4 py-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #F97316, #22C55E)', boxShadow: '0 4px 14px rgba(249,115,22,0.2)' }}>
                <Coins className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">CuraBonus Coins</span>
                  <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                    style={{ background: `${tierColors[tier]}20`, color: tierColors[tier] }}>
                    {curaBonusProfile.tier_info?.name}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-400/50" />
            </div>
            <div className="px-4 pb-3.5 flex items-center justify-between" style={{ borderTop: '1px dashed rgba(249,115,22,0.15)' }}>
              <div className="pt-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">Balance</span>
                  <span className="text-lg font-black text-white" style={{ fontFamily: 'Outfit' }}>{curaBonusProfile.coins} Coins</span>
                </div>
                <p className="text-[10px] text-white/35 mt-0.5">
                  Step {curaBonusProfile.current_step}/8
                  {curaBonusProfile.next_step && ` — Next: ${curaBonusProfile.next_step.reward}`}
                </p>
              </div>
              <div className="flex items-center gap-1 pt-2.5">
                {[1,2,3,4,5,6,7,8].map(s => (
                  <div key={s} className="w-2.5 h-2.5 rounded-full"
                    style={{
                      background: s <= curaBonusProfile.current_step
                        ? 'linear-gradient(135deg, #F97316, #22C55E)'
                        : 'rgba(255,255,255,0.08)',
                      boxShadow: s <= curaBonusProfile.current_step ? '0 0 6px rgba(249,115,22,0.3)' : 'none',
                    }} />
                ))}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* My Activity — 3x3 Grid */}
      <div className="mx-4 mt-5">
        <p className="text-xs font-black uppercase tracking-widest mb-3 px-0.5"
          style={{ background: 'linear-gradient(90deg, #F97316, #FB923C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          My Activity
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          <GridCard icon={ShoppingBag} label="My Orders"
            badge={pharmacyOrders.length || null} badgeColor="#EA580C" iconColor="#F97316"
            gradientFrom="rgba(249,115,22,0.14)" gradientTo="rgba(251,146,60,0.04)"
            onClick={() => navigate('/my-orders')} testId="card-orders" />
          <GridCard icon={FlaskConical} label="Lab Tests"
            badge={diagnostics.length || null} badgeColor="#F59E0B" iconColor="#F59E0B"
            gradientFrom="rgba(245,158,11,0.14)" gradientTo="rgba(252,211,77,0.04)"
            onClick={() => navigate('/my-orders')} testId="card-lab-tests" />
          <GridCard icon={Stethoscope} label="Consultations"
            badge={appointments.length || null} badgeColor="#14B8A6" iconColor="#14B8A6"
            gradientFrom="rgba(20,184,166,0.14)" gradientTo="rgba(94,234,212,0.04)"
            onClick={() => navigate('/my-appointments')} testId="card-consultations" />
          <GridCard icon={FileText} label="Health Records"
            badge={healthRecords.length || null} badgeColor="#3B82F6" iconColor="#3B82F6"
            gradientFrom="rgba(59,130,246,0.14)" gradientTo="rgba(96,165,250,0.04)"
            onClick={() => setActiveTab('records')} testId="card-health-records" />
          <GridCard icon={Pill} label="Prescriptions"
            badge={prescriptionRecords.length || null} badgeColor="#10B981" iconColor="#10B981"
            gradientFrom="rgba(16,185,129,0.14)" gradientTo="rgba(52,211,153,0.04)"
            onClick={() => setActiveTab('prescriptions')} testId="card-prescriptions" />
          <GridCard icon={Camera} label={scanningPrescription ? 'Scanning...' : 'Scan Rx'}
            iconColor="#06B6D4"
            gradientFrom="rgba(6,182,212,0.14)" gradientTo="rgba(34,211,238,0.04)"
            onClick={() => navigate('/medicine-scanner')} testId="card-scan-rx" />
          <GridCard icon={CreditCard} label="Payments"
            iconColor="#818CF8"
            gradientFrom="rgba(129,140,248,0.14)" gradientTo="rgba(165,180,252,0.04)"
            onClick={() => navigate('/payment-history')} testId="card-payments" />
          <GridCard icon={Trophy} label="Rewards"
            badge={loyaltyPoints > 0 ? loyaltyPoints : null} badgeColor="#D946EF" iconColor="#D946EF"
            gradientFrom="rgba(217,70,239,0.14)" gradientTo="rgba(232,121,249,0.04)"
            onClick={() => setActiveTab('rewards')} testId="card-rewards" />
          <GridCard icon={Bell} label="Notifications"
            iconColor="#FBBF24"
            gradientFrom="rgba(251,191,36,0.14)" gradientTo="rgba(253,224,71,0.04)"
            onClick={() => setActiveTab('notifications')} testId="card-notifications" />
        </div>
      </div>

      {/* More — 3x3 Grid */}
      <div className="mx-4 mt-5">
        <p className="text-xs font-black uppercase tracking-widest mb-3 px-0.5"
          style={{ background: 'linear-gradient(90deg, #F97316, #FB923C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          More
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          <GridCard icon={Users} label="Family"
            iconColor="#A78BFA"
            gradientFrom="rgba(167,139,250,0.14)" gradientTo="rgba(196,181,253,0.04)"
            onClick={() => setShowFamilyProfiles(true)} testId="card-family" />
          <GridCard icon={MapPin} label="Addresses"
            iconColor="#F43F5E"
            gradientFrom="rgba(244,63,94,0.14)" gradientTo="rgba(251,113,133,0.04)"
            onClick={() => navigate('/profile')} testId="card-addresses" />
          <GridCard icon={Heart} label="Wishlist"
            iconColor="#EC4899"
            gradientFrom="rgba(236,72,153,0.14)" gradientTo="rgba(244,114,182,0.04)"
            onClick={() => navigate('/mango')} testId="card-wishlist" />
          <GridCard icon={Shield} label="Health Card"
            iconColor="#14B8A6"
            gradientFrom="rgba(20,184,166,0.14)" gradientTo="rgba(94,234,212,0.04)"
            onClick={() => navigate('/health-card')} testId="card-health-card" />
          <GridCard icon={Gift} label="Gift Cards"
            iconColor="#C084FC"
            gradientFrom="rgba(192,132,252,0.14)" gradientTo="rgba(216,180,254,0.04)"
            onClick={() => navigate('/gift-health-cards')} testId="card-gift-cards" />
          <GridCard icon={Calendar} label="Appointments"
            iconColor="#F59E0B"
            gradientFrom="rgba(245,158,11,0.14)" gradientTo="rgba(252,211,77,0.04)"
            onClick={() => navigate('/appointments')} testId="card-appointments" />
        </div>
      </div>

      {/* Bottom Links */}
      <div className="mx-4 mt-5 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { icon: HelpCircle, label: 'Need help?', onClick: () => navigate('/help'), color: '#60A5FA' },
          { icon: Settings, label: 'Settings', onClick: () => navigate('/settings'), color: '#9CA3AF' },
          { icon: Info, label: 'About us', onClick: () => navigate('/about'), color: '#94A3B8' },
          { icon: Share2, label: 'Share the app', onClick: () => {
            if (navigator.share) navigator.share({ title: 'Nevika Cura', text: 'Check out Nevika Cura - Making healthcare accessible!', url: window.location.origin });
            else { navigator.clipboard?.writeText(window.location.origin); toast.success('Link copied!'); }
          }, color: '#3B82F6' },
        ].map((item, i) => (
          <button key={i} onClick={() => { lightTap(); item.onClick(); }}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 transition-all active:bg-white/[0.02]"
            style={{ borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
            data-testid={`link-${item.label.toLowerCase().replace(/[\s?]/g, '-')}`}>
            <item.icon className="w-[18px] h-[18px]" style={{ color: item.color }} />
            <span className="flex-1 text-left text-sm font-medium text-white/70">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </button>
        ))}
      </div>

      {/* Sign Out */}
      <div className="mx-4 mt-4">
        <button onClick={handleLogout}
          className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', color: '#EF4444' }}
          data-testid="sign-out-btn">
          <LogOut className="w-4 h-4 inline mr-2 -mt-0.5" />
          Sign out
        </button>
      </div>

      {/* Footer */}
      <div className="mt-6 mb-8 px-4">
        <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <p className="text-sm text-white/30">Making healthcare</p>
          <p className="text-base font-bold text-white/50 mt-1" style={{ fontFamily: 'Outfit' }}>
            Understandable, Accessible & Affordable
          </p>
          <p className="text-xs text-white/20 mt-3">Made with care by Nevika Cura</p>
          <p className="text-[10px] text-white/15 mt-1">Version 2.1.0</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileMainTab;
