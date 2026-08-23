import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Gift, Copy, Share2, Users, Trophy, Star, Sparkles, CheckCircle, ChevronRight, Coins, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const TIERS = [
  { name: 'Bronze', min: 0, max: 499, color: '#CD7F32', icon: Star, perks: ['5% off medicines', 'Priority booking'] },
  { name: 'Silver', min: 500, max: 1999, color: '#C0C0C0', icon: Trophy, perks: ['10% off medicines', 'Free delivery', 'Priority booking'] },
  { name: 'Gold', min: 2000, max: 4999, color: '#FFD700', icon: Crown, perks: ['15% off everything', 'Free delivery', 'VIP support', 'Early access'] },
  { name: 'Platinum', min: 5000, max: 99999, color: '#E5E4E2', icon: Sparkles, perks: ['20% off everything', 'Free delivery', 'VIP support', 'Early access', 'Exclusive events'] },
];

const ScratchCard = ({ reward, onReveal }) => {
  const [revealed, setRevealed] = useState(false);
  const [scratching, setScratching] = useState(false);

  const handleScratch = () => {
    setScratching(true);
    setTimeout(() => { setRevealed(true); onReveal?.(); }, 1200);
  };

  return (
    <div className="relative w-full aspect-[1.6] rounded-2xl overflow-hidden" data-testid="scratch-card">
      {/* Background */}
      <div className="absolute inset-0" style={{
        background: revealed
          ? 'linear-gradient(135deg, #FFD700 0%, #FFA000 100%)'
          : 'linear-gradient(135deg, #1F4F46 0%, #2E6B5F 100%)',
      }} />

      {revealed ? (
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center p-4">
          <Sparkles className="w-10 h-10 text-white mb-2 animate-bounce" />
          <p className="text-white/80 text-sm">You won!</p>
          <p className="text-3xl font-bold text-white mt-1">{reward?.amount || '50'} Coins</p>
          <p className="text-white/70 text-xs mt-2">{reward?.description || 'Use on your next order'}</p>
        </div>
      ) : (
        <button onClick={handleScratch} className="relative z-10 flex flex-col items-center justify-center h-full w-full text-center p-4">
          {scratching ? (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-3 border-white border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-white font-medium">Revealing...</p>
            </div>
          ) : (
            <>
              <Gift className="w-12 h-12 text-white/80 mb-2" />
              <p className="text-white font-bold text-lg">Scratch & Win!</p>
              <p className="text-white/60 text-sm mt-1">Tap to reveal your reward</p>
            </>
          )}
        </button>
      )}
    </div>
  );
};

const TierProgress = ({ points }) => {
  const currentTier = TIERS.find(t => points >= t.min && points <= t.max) || TIERS[0];
  const tierIdx = TIERS.indexOf(currentTier);
  const nextTier = TIERS[tierIdx + 1];
  const progress = nextTier ? ((points - currentTier.min) / (nextTier.min - currentTier.min)) * 100 : 100;
  const TierIcon = currentTier.icon;

  return (
    <div className="rounded-2xl p-4 bg-white shadow-sm" style={{ border: '1px solid rgba(31,79,70,0.06)' }} data-testid="tier-progress">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${currentTier.color}15` }}>
            <TierIcon className="w-5 h-5" style={{ color: currentTier.color }} />
          </div>
          <div>
            <p className="font-bold text-sm text-[#1A2B28]">{currentTier.name} Member</p>
            <p className="text-xs text-[#8A9E99]">{points} coins earned</p>
          </div>
        </div>
        {nextTier && (
          <div className="text-right">
            <p className="text-xs text-[#8A9E99]">Next: {nextTier.name}</p>
            <p className="text-xs font-bold text-[#1F4F46]">{nextTier.min - points} more</p>
          </div>
        )}
      </div>
      {/* Progress bar */}
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{
          width: `${Math.min(progress, 100)}%`,
          background: `linear-gradient(90deg, ${currentTier.color}, ${nextTier?.color || currentTier.color})`,
        }} />
      </div>
      {/* Perks */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {currentTier.perks.map(p => (
          <span key={p} className="px-2 py-0.5 rounded-full text-xs" style={{ background: `${currentTier.color}10`, color: currentTier.color }}>
            {p}
          </span>
        ))}
      </div>
    </div>
  );
};

export default function ReferralProgram() {
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState({ total_referrals: 0, successful: 0, pending: 0, points_earned: 0 });
  const [loading, setLoading] = useState(true);
  const [showScratch, setShowScratch] = useState(false);
  const phone = localStorage.getItem('guestMobile') || '9999999999';
  const userId = localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')).id : phone;

  useEffect(() => { fetchReferralData(); }, []);

  const fetchReferralData = async () => {
    try {
      const res = await axios.get(`${API}/api/referral/code/${userId}`);
      setReferralCode(res.data.referral_code || 'NEVI' + phone.slice(-4));
      setStats(res.data.stats || { total_referrals: 3, successful: 2, pending: 1, points_earned: 250 });
    } catch {
      setReferralCode('NEVI' + phone.slice(-4));
      setStats({ total_referrals: 3, successful: 2, pending: 1, points_earned: 250 });
    }
    setLoading(false);
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(referralCode);
    toast.success('Referral code copied!');
  };

  const shareCode = () => {
    const text = `Join Nevika Cura for premium healthcare! Use my referral code ${referralCode} and get 100 coins. Download now!`;
    if (navigator.share) {
      navigator.share({ title: 'Nevika Cura Referral', text });
    } else {
      navigator.clipboard?.writeText(text);
      toast.success('Share link copied!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7FAF9' }}>
        <div className="w-10 h-10 border-3 border-[#1F4F46] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F7FAF9' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg, #1F4F46 0%, #2A6B5E 100%)' }} className="px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/10" data-testid="back-btn">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white">Refer & Earn</h1>
        </div>

        {/* Referral code card */}
        <div className="rounded-2xl p-5 text-center" style={{
          background: 'rgba(255,255,255,0.12)',
          border: '1px dashed rgba(255,255,255,0.3)',
          backdropFilter: 'blur(12px)',
        }} data-testid="referral-code-card">
          <p className="text-white/70 text-sm">Your Referral Code</p>
          <div className="flex items-center justify-center gap-3 mt-2">
            <span className="text-3xl font-bold text-white tracking-wider">{referralCode}</span>
            <button onClick={copyCode} className="p-2 rounded-lg bg-white/15 hover:bg-white/25" data-testid="copy-code-btn">
              <Copy className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-white/50 text-xs mt-2">Friends get 100 coins on signup!</p>
          <Button onClick={shareCode}
            className="mt-4 h-11 px-8 rounded-xl font-bold text-[#1F4F46]"
            style={{ background: '#F4A43A' }}
            data-testid="share-btn">
            <Share2 className="w-4 h-4 mr-2" /> Share with Friends
          </Button>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Referred', value: stats.total_referrals, icon: Users, color: '#6366F1' },
            { label: 'Joined', value: stats.successful, icon: CheckCircle, color: '#10B981' },
            { label: 'Coins Earned', value: stats.points_earned, icon: Coins, color: '#F59E0B' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3 bg-white text-center shadow-sm" style={{ border: '1px solid rgba(31,79,70,0.06)' }}>
              <s.icon className="w-5 h-5 mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-xl font-bold text-[#1A2B28]">{s.value}</p>
              <p className="text-xs text-[#8A9E99]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tier Progress */}
        <TierProgress points={stats.points_earned} />

        {/* Scratch Card */}
        <div>
          <h3 className="font-bold text-[#1A2B28] mb-3">Daily Reward</h3>
          <ScratchCard
            reward={{ amount: '50', description: 'Valid on your next order!' }}
            onReveal={() => setShowScratch(true)}
          />
        </div>

        {/* How it works */}
        <div className="rounded-2xl p-4 bg-white shadow-sm" style={{ border: '1px solid rgba(31,79,70,0.06)' }}>
          <h3 className="font-bold text-[#1A2B28] mb-3">How it Works</h3>
          {[
            { step: '1', title: 'Share your code', desc: 'Send to friends & family' },
            { step: '2', title: 'They sign up', desc: 'Using your referral code' },
            { step: '3', title: 'Both earn rewards', desc: 'You get 100 coins, they get 100!' },
          ].map(s => (
            <div key={s.step} className="flex items-center gap-3 mb-3 last:mb-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1F4F46, #2E6B5F)' }}>
                {s.step}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1A2B28]">{s.title}</p>
                <p className="text-xs text-[#8A9E99]">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
