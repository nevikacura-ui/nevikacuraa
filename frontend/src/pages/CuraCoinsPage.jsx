import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Coins, Gift, Star, TrendingUp, Loader2, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import ServiceHeader from '@/components/ServiceHeader';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const ACTION_LABELS = {
  appointment: 'Appointment Booked', lab_test: 'Lab Test', pharmacy_order: 'Pharmacy Order',
  wallet_topup: 'Wallet Top-up', referral: 'Referral', review: 'Review',
  voice_booking: 'Voice Booking Bonus', profile_complete: 'Profile Complete',
};

const CuraCoinsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const phone = user?.phone || localStorage.getItem('guestMobile') || localStorage.getItem('userPhone') || '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);

  useEffect(() => {
    if (!phone) { setLoading(false); return; }
    fetch(`${API}/api/curacoins/balance/${phone}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [phone]);

  const handleRedeem = async (optionId) => {
    setRedeeming(optionId);
    try {
      const res = await fetch(`${API}/api/curacoins/redeem`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, option_id: optionId }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(d.message);
        setData(prev => prev ? { ...prev, balance: d.new_balance } : prev);
      } else {
        toast.error(d.detail || 'Insufficient coins');
      }
    } catch { toast.error('Redemption failed'); }
    setRedeeming(null);
  };

  if (!phone) {
    return (
      <div className="min-h-screen bg-[#0a0b14]">
        <ServiceHeader />
        <main className="max-w-lg mx-auto px-4 py-10 text-center pb-28">
          <Coins className="w-16 h-16 text-amber-400/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">CuraCoins</h2>
          <p className="text-sm text-white/40 mb-6">Login to view your loyalty rewards</p>
          <Button onClick={() => navigate('/login')} className="bg-amber-500 hover:bg-amber-400 text-black rounded-xl" data-testid="login-btn">Login</Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b14]" data-testid="curacoins-page">
      <ServiceHeader />
      <main className="max-w-lg mx-auto px-4 py-5 pb-28">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5" data-testid="coins-back">
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>CuraCoins</h1>
            <p className="text-xs text-white/40">Earn rewards, redeem benefits</p>
          </div>
          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse ml-auto" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-amber-400 animate-spin" /></div>
        ) : data ? (
          <div className="space-y-5">
            {/* Balance Card */}
            <div className="p-6 rounded-3xl text-center" style={{ background: 'linear-gradient(145deg, rgba(245,158,11,0.15), rgba(217,119,6,0.08))', border: '1px solid rgba(245,158,11,0.2)' }} data-testid="balance-card">
              <Coins className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <p className="text-4xl font-bold text-white">{data.balance}</p>
              <p className="text-sm text-white/40 mt-1">CuraCoins</p>
              <div className="flex justify-center gap-6 mt-4">
                <div><p className="text-lg font-bold text-amber-400">{data.total_earned}</p><p className="text-[10px] text-white/30">Earned</p></div>
                <div><p className="text-lg font-bold text-rose-400">{data.total_redeemed}</p><p className="text-[10px] text-white/30">Redeemed</p></div>
              </div>
            </div>

            {/* How to Earn */}
            <div>
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">How to Earn</p>
              <div className="grid grid-cols-2 gap-2">
                {data.earn_rates && Object.entries(data.earn_rates).map(([action, coins]) => (
                  <div key={action} className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-xs text-white/60 capitalize">{action.replace(/_/g, ' ')}</p>
                    <p className="text-sm font-bold text-amber-400">+{coins}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Redeem Options */}
            <div>
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">Redeem Rewards</p>
              <div className="space-y-2">
                {data.redeem_options?.map(opt => {
                  const canRedeem = data.balance >= opt.coins;
                  return (
                    <div key={opt.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5" data-testid={`redeem-${opt.id}`}>
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{opt.label}</p>
                        <p className="text-xs text-amber-400">{opt.coins} coins</p>
                      </div>
                      <Button
                        onClick={() => handleRedeem(opt.id)}
                        disabled={!canRedeem || redeeming === opt.id}
                        className={`h-8 px-3 text-xs rounded-lg ${canRedeem ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-white/5 text-white/20'}`}
                        data-testid={`redeem-btn-${opt.id}`}>
                        {redeeming === opt.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Redeem'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Transactions */}
            {data.transactions?.length > 0 && (
              <div>
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">Recent Activity</p>
                <div className="space-y-1.5">
                  {data.transactions.slice(0, 10).map((txn, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${txn.type === 'earn' ? 'bg-green-500/15' : 'bg-rose-500/15'}`}>
                        {txn.type === 'earn' ? <TrendingUp className="w-3.5 h-3.5 text-green-400" /> : <Gift className="w-3.5 h-3.5 text-rose-400" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-white/60">{ACTION_LABELS[txn.action] || txn.action?.replace(/_/g, ' ')}</p>
                      </div>
                      <span className={`text-sm font-bold ${txn.coins > 0 ? 'text-green-400' : 'text-rose-400'}`}>
                        {txn.coins > 0 ? '+' : ''}{txn.coins}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 text-white/30">Could not load CuraCoins data</div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default CuraCoinsPage;
