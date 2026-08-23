import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, ArrowUpRight, ArrowDownLeft, Clock, Gift, RefreshCw, Wallet, Star, ChevronRight, Shield, Zap, CreditCard, Copy, Share2, Users, Heart, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import BrandedLoader from '@/components/BrandedLoader';

const API = process.env.REACT_APP_BACKEND_URL + '/api';
const CURAPAY_LOGO = 'https://customer-assets.emergentagent.com/job_68012a9b-b5c1-4eae-9d0f-d32afa652912/artifacts/k7rt09o4_file_0000000010c47208a5b0dfcdf4b305f7%20%281%29.png';
const CURAPAY_BANNER = 'https://customer-assets.emergentagent.com/job_f435cb78-8b8c-4f4d-94bf-4259b725de5d/artifacts/wutuaxv1_file_0000000056e871fa865278fc294f36ac.png';
const CURACARD_LOGO = 'https://customer-assets.emergentagent.com/job_68012a9b-b5c1-4eae-9d0f-d32afa652912/artifacts/onqgr3nv_file_0000000010c47208a5b0dfcdf4b305f7%20%283%29.png';
const CURACARE_LOGO = 'https://customer-assets.emergentagent.com/job_68012a9b-b5c1-4eae-9d0f-d32afa652912/artifacts/ao91tq3g_file_0000000010c47208a5b0dfcdf4b305f7%20%284%29.png';
const CURAINVITE_LOGO = 'https://customer-assets.emergentagent.com/job_68012a9b-b5c1-4eae-9d0f-d32afa652912/artifacts/vhu9z31z_file_0000000010c47208a5b0dfcdf4b305f7%20%282%29.png';

const getAuth = () => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('patientToken') || localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

// Glass card style helper
const glass = (opacity = 0.04) => ({
  background: `rgba(255,255,255,${opacity})`,
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.08)',
});

const HEALTH_PLANS = [
  {
    id: 'individual',
    name: 'Individual Plan',
    price: 1499,
    validity: '6 months',
    color: '#14b8a6',
    gradient: 'from-teal-500/20 to-cyan-500/10',
    features: [
      '2 Consultations (Main + Follow-up)',
      '1 Health Checkup — CuraCore',
    ],
  },
  {
    id: 'family',
    name: 'Family Plan',
    price: 3299,
    validity: '6 months',
    color: '#8b5cf6',
    gradient: 'from-violet-500/20 to-purple-500/10',
    features: [
      '4 Consultations',
      '1 Health Checkup — CuraCore',
      '1 Health Checkup — CuraPro',
    ],
  },
];

const CuraWallet = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingTopup, setProcessingTopup] = useState(false);
  const [activeSection, setActiveSection] = useState('wallet');
  const [referralCode, setReferralCode] = useState('');
  const [membership, setMembership] = useState(null);

  const fetchWallet = useCallback(async () => {
    try {
      const [wRes, tRes] = await Promise.all([
        axios.get(`${API}/wallet/balance`, getAuth()),
        axios.get(`${API}/wallet/transactions`, getAuth()),
      ]);
      setWallet(wRes.data);
      setTransactions(tRes.data.transactions || []);
    } catch { /* wallet may not exist yet */ }
    setLoading(false);
  }, []);

  const fetchMembership = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/subscriptions/my-subscription`, getAuth());
      setMembership(res.data);
    } catch { /* no subscription */ }
  }, []);

  const generateReferralCode = useCallback(() => {
    const phone = localStorage.getItem('userPhone') || localStorage.getItem('guestMobile') || '';
    const suffix = phone.slice(-4) || Math.random().toString(36).slice(2, 6).toUpperCase();
    setReferralCode(`CURA${suffix}`);
  }, []);

  useEffect(() => {
    fetchWallet();
    fetchMembership();
    generateReferralCode();
  }, [fetchWallet, fetchMembership, generateReferralCode]);

  // Handle Cashfree return
  useEffect(() => {
    const topupOrder = searchParams.get('topup_order');
    if (topupOrder) {
      (async () => {
        try {
          const res = await axios.post(`${API}/wallet/cashfree-topup/verify/${topupOrder}`, {}, getAuth());
          if (res.data.success) {
            toast.success(res.data.message);
            fetchWallet();
          } else {
            toast.info(res.data.message || 'Payment pending verification');
          }
        } catch { toast.error('Could not verify payment'); }
        window.history.replaceState({}, '', '/cura-wallet');
      })();
    }
  }, [searchParams, fetchWallet]);

  const handleCashfreeTopup = async () => {
    const amt = parseFloat(addAmount);
    if (!amt || amt < 50) { toast.error('Minimum top-up is ₹50'); return; }
    setProcessingTopup(true);
    try {
      const res = await axios.post(`${API}/wallet/cashfree-topup`, { amount: amt }, getAuth());
      if (res.data.success && res.data.payment_session_id) {
        const sessionId = res.data.payment_session_id;
        if (window.Cashfree) {
          const cashfree = window.Cashfree({ mode: 'production' });
          cashfree.checkout({ paymentSessionId: sessionId, redirectTarget: '_self' });
        } else {
          window.location.href = `https://payments.cashfree.com/order/#${sessionId}`;
        }
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create payment');
    }
    setProcessingTopup(false);
  };

  const copyReferral = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('Referral code copied!');
  };

  const shareReferral = () => {
    const text = `Use my referral code ${referralCode} at Nevika Cura and get 5% extra discount on your next transaction! Download: https://nevikacura.com`;
    if (navigator.share) {
      navigator.share({ title: 'CuraInvite', text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Referral link copied!');
    }
  };

  const balance = wallet?.balance || 0;
  const loyaltyPoints = wallet?.loyalty_points || 0;

  if (loading) return null;

  const sections = [
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'points', label: 'Points', icon: Star },
    { id: 'invite', label: 'Invite', icon: Gift },
  ];

  return (
    <div className="dark-page min-h-screen pb-24" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0f1628 50%, #0a1e1c 100%)' }} data-testid="curapay-wallet-page">
      {/* Floating orbs */}
      <div className="fixed top-20 right-[-50px] w-40 h-40 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(76,29,149,0.3) 0%, transparent 70%)' }} />
      <div className="fixed bottom-40 left-[-30px] w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(22,163,74,0.2) 0%, transparent 70%)' }} />

      {/* Header */}
      <div className="sticky top-0 z-50 px-4 pt-4 pb-3" style={{ background: 'rgba(26,10,46,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ ...glass(0.06), border: '1px solid rgba(255,255,255,0.1)' }} data-testid="curapay-back-btn">
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <img src={CURAPAY_LOGO} alt="CuraPay" className="w-7 h-7 object-contain" />
          <h1 className="text-base font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>CuraPay</h1>
        </div>
      </div>

      {/* Banner — Full Size, No Crop */}
      <div className="px-4 mt-3">
        <div className="rounded-3xl overflow-hidden relative" style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(76,29,149,0.2)' }}>
          <img src={CURAPAY_BANNER} alt="CuraPay" className="w-full object-contain" style={{ minHeight: '220px' }} />
        </div>
      </div>

      {/* Section Tabs */}
      <div className="px-4 mt-4 mb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {sections.map(s => {
            const active = activeSection === s.id;
            return (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all flex-shrink-0"
                style={{
                  background: active ? 'linear-gradient(135deg, rgba(76,29,149,0.5), rgba(22,163,74,0.3))' : 'rgba(255,255,255,0.04)',
                  border: active ? '1px solid rgba(76,29,149,0.5)' : '1px solid rgba(255,255,255,0.06)',
                  color: active ? '#fff' : 'rgba(255,255,255,0.35)',
                }}
                data-testid={`section-${s.id}`}
              >
                <s.icon className="w-3 h-3" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 space-y-4">

        {/* ==================== WALLET SECTION ==================== */}
        {activeSection === 'wallet' && (
          <>
            {/* Balance Card */}
            <div className="rounded-3xl p-5 relative overflow-hidden" data-testid="curapay-balance-card" style={{
              background: 'linear-gradient(135deg, rgba(76,29,149,0.6) 0%, rgba(22,163,74,0.4) 50%, rgba(76,29,149,0.3) 100%)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 16px 48px rgba(76,29,149,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}>
              <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-green-400/10 -mr-12 -mt-12 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-purple-400/10 -ml-10 -mb-10 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1.5">
                  <Wallet className="w-4 h-4 text-white/60" />
                  <p className="text-white/60 text-[10px] font-bold tracking-[0.2em] uppercase">CuraPay Balance</p>
                </div>
                <p className="text-4xl font-black text-white mb-4" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="curapay-balance">
                  ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <Star className="w-3.5 h-3.5 text-amber-300" />
                    <span className="text-white/80 text-xs font-medium">{loyaltyPoints} CuraCoins</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <Zap className="w-3.5 h-3.5 text-green-300" />
                    <span className="text-white/80 text-xs font-medium">3% Cashback</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddMoney(true)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-sm font-bold active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }} data-testid="curapay-add-money-btn">
                    <Plus className="w-4 h-4" /> Add Money
                  </button>
                  <button onClick={() => setActiveSection('points')} className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white/70 text-sm font-medium" style={glass(0.1)} data-testid="curapay-rewards-btn">
                    <Gift className="w-4 h-4" /> Rewards
                  </button>
                </div>
              </div>
            </div>

            {/* Pay At Grid */}
            <div className="rounded-2xl p-4" style={glass()}>
              <h3 className="text-white/60 text-[10px] uppercase tracking-widest font-bold mb-3">Pay at</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'Orange Pharmacy', color: '#EA580C', icon: '🧡' },
                  { name: 'Mango Labs', color: '#C8F56A', icon: '🥭' },
                  { name: 'DiaGyn Clinic', color: '#14b8a6', icon: '🏥' },
                ].map(s => (
                  <div key={s.name} className="text-center p-3 rounded-xl" style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}>
                    <p className="text-xl mb-1">{s.icon}</p>
                    <p className="text-white/70 text-[9px] font-medium">{s.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Transactions */}
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest font-light mb-3">Recent Transactions</p>
              {transactions.length === 0 ? (
                <div className="text-center py-10 rounded-2xl" style={glass(0.02)}>
                  <Clock className="w-8 h-8 text-white/10 mx-auto mb-2" />
                  <p className="text-white/20 text-xs">No transactions yet</p>
                  <p className="text-white/10 text-[10px] mt-1">Add money to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 10).map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-3.5 rounded-2xl" style={glass(0.03)} data-testid={`txn-${t.id}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.type === 'topup' || t.type === 'credit' || t.type === 'gift_cash' ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
                        {t.type === 'topup' || t.type === 'credit' || t.type === 'gift_cash' ? <ArrowDownLeft className="w-4 h-4 text-green-400" /> : <ArrowUpRight className="w-4 h-4 text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/70 text-xs font-medium truncate">{t.description || t.service_type || 'Transaction'}</p>
                        <p className="text-white/20 text-[10px]">
                          {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                        </p>
                      </div>
                      <p className={`text-sm font-bold ${t.type === 'topup' || t.type === 'credit' || t.type === 'gift_cash' ? 'text-green-400' : 'text-red-400'}`}>
                        {t.type === 'topup' || t.type === 'credit' || t.type === 'gift_cash' ? '+' : '-'}₹{t.amount}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================== CURACARE POINTS SECTION ==================== */}
        {activeSection === 'points' && (
          <>
            {/* CuraCare Points Logo */}
            <div className="rounded-2xl overflow-hidden mb-2" style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.15)' }}>
              <img src={CURACARE_LOGO} alt="CuraCare Points" className="w-full h-28 object-contain" />
            </div>

            <div className="rounded-3xl p-5 relative overflow-hidden" style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.3) 0%, rgba(76,29,149,0.2) 100%)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-amber-400/10 -mr-8 -mt-8 blur-2xl" />
              <div className="relative">
                <p className="text-amber-200/50 text-[10px] font-bold tracking-[0.2em] uppercase mb-1">CuraCare Points</p>
                <p className="text-4xl font-black text-white mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>{loyaltyPoints}</p>
                <p className="text-white/40 text-xs mb-4">CuraCoins available</p>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="rounded-xl p-3" style={glass(0.06)}>
                    <p className="text-white/30 text-[9px] uppercase tracking-wider">Earned this month</p>
                    <p className="text-amber-300 text-lg font-bold">{Math.round(loyaltyPoints * 0.3)}</p>
                  </div>
                  <div className="rounded-xl p-3" style={glass(0.06)}>
                    <p className="text-white/30 text-[9px] uppercase tracking-wider">Redeemed</p>
                    <p className="text-green-400 text-lg font-bold">{Math.round(loyaltyPoints * 0.1)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-4" style={glass()}>
              <h3 className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-3">How to earn</h3>
              {[
                { action: 'CuraPay wallet payment', points: '3% of amount', icon: Wallet, color: '#4ade80' },
                { action: 'Wallet top-up', points: '2% of amount', icon: Plus, color: '#22d3ee' },
                { action: 'Complete a booking', points: '10 CuraCoins', icon: CheckCircle2, color: '#a78bfa' },
                { action: 'Refer a friend', points: '25 CuraCoins', icon: Users, color: '#f472b6' },
              ].map(item => (
                <div key={item.action} className="flex items-center gap-3 p-3 rounded-xl mb-2" style={glass(0.03)}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${item.color}15` }}>
                    <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white/70 text-xs font-medium">{item.action}</p>
                  </div>
                  <span className="text-amber-300 text-[10px] font-bold">{item.points}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ==================== CURAINVITE SECTION ==================== */}
        {activeSection === 'invite' && (
          <>
            {/* CuraInvite Logo */}
            <div className="rounded-2xl overflow-hidden mb-2" style={{ background: '#faf5ff', border: '1px solid rgba(139,92,246,0.15)' }}>
              <img src={CURAINVITE_LOGO} alt="CuraInvite" className="w-full h-28 object-contain" />
            </div>

            <div className="rounded-3xl p-5 relative overflow-hidden text-center" style={{
              background: 'linear-gradient(135deg, rgba(236,72,153,0.3) 0%, rgba(76,29,149,0.3) 50%, rgba(22,163,74,0.2) 100%)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(236,72,153,0.2)',
            }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full bg-pink-400/10 -mt-16 blur-2xl" />
              <div className="relative">
                <Sparkles className="w-8 h-8 text-pink-300 mx-auto mb-2" />
                <h2 className="text-xl font-black text-white mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>CuraInvite</h2>
                <p className="text-white/40 text-xs mb-5">Share with friends & family. They get 5% extra discount!</p>

                {/* Referral Code */}
                <div className="rounded-2xl p-4 mb-4" style={glass(0.1)}>
                  <p className="text-white/30 text-[9px] uppercase tracking-wider mb-2">Your Referral Code</p>
                  <div className="flex items-center justify-center gap-3">
                    <p className="text-2xl font-black text-white tracking-[0.15em]" style={{ fontFamily: 'Outfit, monospace' }} data-testid="referral-code">{referralCode}</p>
                    <button onClick={copyReferral} className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-all" style={glass(0.15)} data-testid="copy-referral-btn">
                      <Copy className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                </div>

                {/* Share Button */}
                <button onClick={shareReferral} className="w-full py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg, #ec4899, #4c1d95)', boxShadow: '0 4px 16px rgba(236,72,153,0.3)' }} data-testid="share-referral-btn">
                  <Share2 className="w-4 h-4" />
                  Share & Earn
                </button>
              </div>
            </div>

            <div className="rounded-2xl p-4" style={glass()}>
              <h3 className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-3">How CuraInvite works</h3>
              {[
                { step: '1', text: 'Share your unique code with friends & family', color: '#ec4899' },
                { step: '2', text: 'They present the code at the counter or enter online', color: '#a78bfa' },
                { step: '3', text: 'They get 5% extra discount on that transaction', color: '#22c55e' },
                { step: '4', text: 'You earn 25 CuraCoins for every successful referral', color: '#f59e0b' },
              ].map(item => (
                <div key={item.step} className="flex items-center gap-3 p-3 rounded-xl mb-2" style={glass(0.03)}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}20`, border: `1px solid ${item.color}30` }}>
                    <span className="text-xs font-black" style={{ color: item.color }}>{item.step}</span>
                  </div>
                  <p className="text-white/60 text-xs">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-4" style={glass()}>
              <p className="text-white/30 text-[9px] uppercase tracking-wider mb-2">Your Referrals</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center p-3 rounded-xl" style={glass(0.05)}>
                  <p className="text-white font-bold text-lg">0</p>
                  <p className="text-white/30 text-[9px]">Invites Sent</p>
                </div>
                <div className="flex-1 text-center p-3 rounded-xl" style={glass(0.05)}>
                  <p className="text-green-400 font-bold text-lg">0</p>
                  <p className="text-white/30 text-[9px]">Redeemed</p>
                </div>
                <div className="flex-1 text-center p-3 rounded-xl" style={glass(0.05)}>
                  <p className="text-amber-300 font-bold text-lg">0</p>
                  <p className="text-white/30 text-[9px]">Coins Earned</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Security Badge */}
        <div className="flex items-center gap-2 justify-center py-4">
          <Shield className="w-3.5 h-3.5 text-white/15" />
          <p className="text-white/15 text-[10px]">Secured by Cashfree Payments</p>
        </div>
      </div>

      {/* Add Money Bottom Sheet */}
      {showAddMoney && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={(e) => { if (e.target === e.currentTarget) setShowAddMoney(false); }}>
          <div className="w-full max-w-lg rounded-t-3xl p-6" style={{
            background: 'linear-gradient(180deg, #1a0a2e 0%, #0f1628 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderBottom: 'none',
            boxShadow: '0 -16px 48px rgba(0,0,0,0.5)'
          }} data-testid="curapay-add-money-modal">
            <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-5">
              <img src={CURAPAY_LOGO} alt="CuraPay" className="w-8 h-8 object-contain" />
              <div>
                <h3 className="text-white text-base font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Add Money</h3>
                <p className="text-green-400/60 text-[10px]">Earn 2% CuraCoins on every top-up</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[100, 250, 500, 1000].map(amt => (
                <button key={amt} onClick={() => setAddAmount(String(amt))}
                  className="py-3 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{
                    background: addAmount === String(amt) ? 'linear-gradient(135deg, rgba(22,163,74,0.3), rgba(76,29,149,0.3))' : 'rgba(255,255,255,0.04)',
                    border: addAmount === String(amt) ? '1px solid rgba(22,163,74,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    color: addAmount === String(amt) ? '#4ade80' : 'rgba(255,255,255,0.4)'
                  }}>₹{amt}</button>
              ))}
            </div>
            <div className="rounded-2xl px-4 py-3 mb-5" style={glass(0.04)}>
              <p className="text-white/20 text-[9px] uppercase tracking-wider mb-1">Enter Amount</p>
              <div className="flex items-center gap-2">
                <span className="text-white/30 text-xl font-bold">₹</span>
                <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)}
                  className="flex-1 bg-transparent text-white text-2xl font-black outline-none placeholder:text-white/10"
                  placeholder="0" data-testid="curapay-amount-input" style={{ fontFamily: 'Outfit, sans-serif' }} />
              </div>
            </div>
            {addAmount && parseFloat(addAmount) >= 50 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4" style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)' }}>
                <Zap className="w-3.5 h-3.5 text-green-400" />
                <p className="text-green-400/80 text-[10px]">You'll earn <span className="font-bold">{Math.round(parseFloat(addAmount) * 0.02)} CuraCoins</span></p>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowAddMoney(false)} className="flex-1 py-3.5 rounded-2xl text-white/30 text-xs font-medium" style={glass(0.04)}>Cancel</button>
              <button onClick={handleCashfreeTopup} disabled={processingTopup} className="flex-1 py-3.5 rounded-2xl text-white text-sm font-bold active:scale-95 transition-all disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #16a34a, #4c1d95)', boxShadow: '0 4px 16px rgba(76,29,149,0.3)' }} data-testid="curapay-confirm-topup">
                {processingTopup ? <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> : <CreditCard className="w-4 h-4 inline mr-2" />}
                {processingTopup ? 'Processing...' : `Pay ₹${addAmount || '0'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CuraWallet;
