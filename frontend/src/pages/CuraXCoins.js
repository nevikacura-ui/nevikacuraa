import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Star, Trophy, Users, Coins, ArrowDownLeft, RefreshCw, Sparkles, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const CuraXCoins = () => {
  const navigate = useNavigate();
  const phone = localStorage.getItem('userPhone') || '9876543210';
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [rules, setRules] = useState(null);
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [wRes, tRes, rRes] = await Promise.all([
        axios.get(`${API}/wallet/${phone}`),
        axios.get(`${API}/coins/transactions/${phone}`),
        axios.get(`${API}/coins/rules`),
      ]);
      setWallet(wRes.data.wallet);
      setTransactions(tRes.data.transactions || []);
      setRules(rRes.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleRedeem = async () => {
    const coins = parseInt(redeemAmount);
    if (!coins || coins < 100) { toast.error('Minimum 100 coins required'); return; }
    if (coins > (wallet?.coins || 0)) { toast.error('Not enough coins'); return; }
    try {
      await axios.post(`${API}/coins/redeem`, { phone, coins });
      toast.success(`${coins} coins redeemed → ₹${coins} added to wallet!`);
      setShowRedeem(false);
      setRedeemAmount('');
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to redeem'); }
  };

  const EARNING_ITEMS = [
    { action: 'Consultation Booking', coins: 20, icon: '🩺', color: '#14b8a6' },
    { action: 'Lab Test Booking', coins: 40, icon: '🧪', color: '#22c55e' },
    { action: 'Full Body Checkup', coins: 100, icon: '💪', color: '#a855f7' },
    { action: 'Pharmacy Purchase', coins: 10, icon: '💊', color: '#f97316' },
    { action: 'Referral', coins: 150, icon: '👥', color: '#3b82f6' },
    { action: 'App Download', coins: 50, icon: '📱', color: '#ec4899' },
    { action: 'Google Review', coins: 30, icon: '⭐', color: '#eab308' },
  ];

  if (loading) return (
    <div className="dark-page min-h-screen flex items-center justify-center" style={{ background: '#050510' }}>
      <RefreshCw className="w-6 h-6 animate-spin text-white/20" />
    </div>
  );

  return (
    <div className="min-h-screen pb-24" style={{ background: '#050510' }} data-testid="curax-coins-page">
      <style>{`
        @keyframes coinShine { 0%{background-position:-200% center} 100%{background-position:200% center} }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-50 px-4 pt-4 pb-3" style={{ background: 'rgba(5,5,16,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <h1 className="text-base font-semibold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>CuraX Coins</h1>
        </div>
      </div>

      <div className="px-4 mt-2">
        {/* Coins Hero */}
        <div className="rounded-3xl p-6 mb-5 relative overflow-hidden" style={{
          background: 'linear-gradient(135deg, #7c3aed, #a855f7, #c084fc, #f472b6)',
          boxShadow: '0 16px 48px rgba(168,85,247,0.25)',
        }}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -mr-16 -mt-16 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-amber-400/15 -ml-8 -mb-8 blur-xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-200" />
              <p className="text-white/70 text-xs font-medium tracking-wide uppercase">CuraX Coins</p>
            </div>
            <div className="flex items-end gap-2 mb-1">
              <p className="text-5xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif', backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', animation: 'coinShine 3s linear infinite' }}>
                {wallet?.coins || 0}
              </p>
              <p className="text-white/50 text-sm font-medium pb-1 mb-1">coins</p>
            </div>
            <p className="text-white/50 text-xs mb-4">= ₹{wallet?.coins || 0} redemption value</p>
            <div className="flex gap-2">
              <button onClick={() => setShowRedeem(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-bold" data-testid="redeem-coins-btn">
                <Gift className="w-3.5 h-3.5" /> Redeem Coins
              </button>
              <button onClick={() => navigate('/cura-wallet')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-bold" data-testid="go-wallet-btn">
                <Coins className="w-3.5 h-3.5" /> Cura Wallet
              </button>
            </div>
          </div>
        </div>

        {/* Tier Badge */}
        <div className="rounded-2xl p-4 mb-5 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(234,179,8,0.12)' }}>
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-white/70 text-sm font-semibold capitalize">{wallet?.tier === 'none' ? 'Standard' : wallet?.tier} Tier</p>
            <p className="text-white/25 text-[10px]">Earn coins {wallet?.tier === 'none' ? 'at 1x' : wallet?.tier === 'silver' ? 'at 1.2x' : wallet?.tier === 'gold' ? 'at 1.5x' : 'at 2x'} rate</p>
          </div>
          <div className="flex gap-1">
            {['silver', 'gold', 'platinum'].map(t => (
              <div key={t} className={`w-2 h-2 rounded-full ${wallet?.tier === t || (t === 'silver' && wallet?.tier !== 'none') || (t === 'gold' && wallet?.tier === 'platinum') ? 'bg-amber-400' : 'bg-white/10'}`} />
            ))}
          </div>
        </div>

        {/* How to Earn */}
        <div className="mb-5">
          <p className="text-white/40 text-xs uppercase tracking-widest font-light mb-3">How to Earn</p>
          <div className="space-y-2">
            {EARNING_ITEMS.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: `${item.color}15` }}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="text-white/70 text-xs font-medium">{item.action}</p>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.15)' }}>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-300 text-[11px] font-bold">+{item.coins}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div className="mb-4">
          <p className="text-white/40 text-xs uppercase tracking-widest font-light mb-3">Coin History</p>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-6 h-6 text-white/10 mx-auto mb-2" />
              <p className="text-white/15 text-xs">Start earning coins today!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.type === 'earned' ? 'bg-amber-500/10' : 'bg-purple-500/10'}`}>
                    {t.type === 'earned' ? <Star className="w-4 h-4 text-amber-400" /> : <Gift className="w-4 h-4 text-purple-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-xs font-medium truncate">{t.description}</p>
                    <p className="text-white/20 text-[10px]">{new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <p className={`text-sm font-bold ${t.type === 'earned' ? 'text-amber-400' : 'text-purple-400'}`}>
                    {t.type === 'earned' ? '+' : '-'}{t.coins}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Redeem Modal */}
      {showRedeem && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-t-3xl p-6" style={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.08)' }} data-testid="redeem-modal">
            <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-5" />
            <h3 className="text-white text-lg font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Redeem CuraX Coins</h3>
            <p className="text-white/30 text-xs mb-4">Min 100 coins. 1 coin = ₹1 added to your Cura Wallet.</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[100, 200, 500].map(amt => (
                <button key={amt} onClick={() => setRedeemAmount(String(amt))}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all ${redeemAmount === String(amt) ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40' : 'text-white/40'}`}
                  style={redeemAmount !== String(amt) ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } : {}}
                  disabled={amt > (wallet?.coins || 0)}>
                  {amt} coins
                </button>
              ))}
            </div>
            <div className="rounded-2xl px-4 py-3 mb-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <input type="number" value={redeemAmount} onChange={e => setRedeemAmount(e.target.value)}
                className="w-full bg-transparent text-white text-lg font-bold outline-none placeholder:text-white/15"
                placeholder="Enter coins to redeem" data-testid="redeem-input" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowRedeem(false)} className="flex-1 py-3 rounded-2xl text-white/40 text-xs font-medium" style={{ background: 'rgba(255,255,255,0.04)' }}>Cancel</button>
              <button onClick={handleRedeem} className="flex-1 py-3 rounded-2xl text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }} data-testid="confirm-redeem">
                Redeem → ₹{redeemAmount || '0'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CuraXCoins;
