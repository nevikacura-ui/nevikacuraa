import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Percent, Truck, Zap, HeartPulse, Crown, Rocket, Trophy, Star, Coins, ChevronRight, Check, Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const STEP_ICONS = {
  gift: Gift, percent: Percent, truck: Truck, zap: Zap,
  'heart-pulse': HeartPulse, crown: Crown, rocket: Rocket, trophy: Trophy,
};

// Confetti burst
const ConfettiBurst = ({ active }) => {
  if (!active) return null;
  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden" data-testid="confetti-burst">
      {Array.from({ length: 40 }).map((_, i) => {
        const x = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const dur = 1.5 + Math.random() * 1;
        const size = 6 + Math.random() * 8;
        const colors = ['#F97316', '#22C55E', '#FBBF24', '#F43F5E', '#8B5CF6', '#06B6D4'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        return (
          <div key={i} className="absolute rounded-sm" style={{
            left: `${x}%`, top: '-10px', width: size, height: size, background: color,
            animation: `confettiFall ${dur}s ease-in ${delay}s forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }} />
        );
      })}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// Tier badge
const TierBadge = ({ tier, tierInfo }) => {
  const colors = {
    bronze: { bg: 'linear-gradient(135deg, #92400E, #B45309)', glow: 'rgba(180,83,9,0.3)' },
    silver: { bg: 'linear-gradient(135deg, #6B7280, #9CA3AF)', glow: 'rgba(156,163,175,0.3)' },
    gold: { bg: 'linear-gradient(135deg, #D97706, #F59E0B)', glow: 'rgba(245,158,11,0.4)' },
  };
  const c = colors[tier] || colors.bronze;
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black text-white uppercase tracking-wider"
      style={{ background: c.bg, boxShadow: `0 4px 16px ${c.glow}` }}
      data-testid="tier-badge">
      <Crown className="w-3.5 h-3.5" />
      {tierInfo?.name || tier}
    </div>
  );
};

export default function CuraBonus() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confetti, setConfetti] = useState(false);
  const [claimingStep, setClaimingStep] = useState(null);
  const scrollRef = useRef(null);

  const phone = localStorage.getItem('guestMobile') || localStorage.getItem('userPhone') || '';

  const fetchProfile = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    try {
      const res = await axios.get(`${API}/api/curabonus/profile?phone=${phone}`);
      setProfile(res.data);
    } catch {
      toast.error('Failed to load CuraBonus profile');
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const claimReward = async (step) => {
    setClaimingStep(step);
    try {
      const res = await axios.post(`${API}/api/curabonus/claim-reward`, { phone, step });
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3000);
      toast.success(res.data.reward || 'Reward claimed!');
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to claim reward');
    } finally {
      setClaimingStep(null);
    }
  };

  if (loading) {
    return (
      <div className="dark-page min-h-screen flex items-center justify-center" style={{ background: '#050510' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          <p className="text-white/40 text-sm">Loading CuraBonus...</p>
        </div>
      </div>
    );
  }

  if (!phone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#050510' }}>
        <Coins className="w-16 h-16 text-orange-500/40 mb-4" />
        <h2 className="text-white text-xl font-bold mb-2" style={{ fontFamily: 'Outfit' }}>Login to View CuraBonus</h2>
        <p className="text-white/40 text-sm text-center mb-6">Your rewards journey awaits. Sign in to track your progress.</p>
        <button onClick={() => navigate('/login')} className="px-6 py-3 rounded-full text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', boxShadow: '0 4px 20px rgba(249,115,22,0.3)' }}
          data-testid="curabonus-login-btn">
          Login Now
        </button>
        <BottomNav />
      </div>
    );
  }

  const p = profile || {};
  const steps = p.steps || [];
  const currentStep = p.current_step || 0;
  const nextStep = p.next_step;
  const coins = p.coins || 0;
  const tier = p.tier || 'bronze';
  const tierInfo = p.tier_info || {};

  return (
    <div className="min-h-screen pb-28" style={{ background: '#050510' }} data-testid="curabonus-page">
      <ConfettiBurst active={confetti} />

      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[200px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)' }} />

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(5,5,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}
          data-testid="curabonus-back-btn">
          <ArrowLeft className="w-5 h-5 text-orange-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-bold text-lg" style={{ fontFamily: 'Outfit' }}>CuraBonus</h1>
          <p className="text-white/30 text-[10px]">Orange Pharmacy Rewards</p>
        </div>
        <TierBadge tier={tier} tierInfo={tierInfo} />
      </div>

      {/* Coin Balance Card */}
      <div className="mx-4 mt-4">
        <div className="relative rounded-3xl overflow-hidden p-6"
          style={{
            background: 'linear-gradient(145deg, rgba(249,115,22,0.15) 0%, rgba(34,197,94,0.08) 50%, rgba(249,115,22,0.05) 100%)',
            border: '1px solid rgba(249,115,22,0.2)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 40px rgba(249,115,22,0.1)',
          }}
          data-testid="coin-balance-card">
          {/* Decorative rings */}
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full border border-orange-500/10" />
          <div className="absolute -right-5 -top-5 w-28 h-28 rounded-full border border-green-500/10" />

          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F97316, #22C55E)', boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}>
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Your Cura Coins</p>
              <p className="text-white text-3xl font-black" style={{ fontFamily: 'Outfit' }} data-testid="coin-balance">{coins}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex-1 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-white/30 text-[9px] font-bold uppercase">Orders</p>
              <p className="text-white font-bold text-sm" data-testid="total-orders">{p.total_orders || 0}</p>
            </div>
            <div className="flex-1 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-white/30 text-[9px] font-bold uppercase">Total Spent</p>
              <p className="text-white font-bold text-sm">₹{(p.total_spent || 0).toLocaleString()}</p>
            </div>
            <div className="flex-1 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-white/30 text-[9px] font-bold uppercase">Coin Value</p>
              <p className="text-green-400 font-bold text-sm">₹{coins}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Milestone */}
      {nextStep && (
        <div className="mx-4 mt-4">
          <div className="rounded-2xl p-4" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Next Milestone</span>
            </div>
            <p className="text-white text-sm font-semibold mb-2">{nextStep.reward}</p>
            <div className="flex items-center gap-3 text-[11px]">
              {nextStep.orders_needed > 0 && (
                <span className="px-2.5 py-1 rounded-full text-orange-300 font-medium" style={{ background: 'rgba(249,115,22,0.1)' }}>
                  {nextStep.orders_needed} more order{nextStep.orders_needed > 1 ? 's' : ''}
                </span>
              )}
              {nextStep.spend_needed > 0 && (
                <span className="px-2.5 py-1 rounded-full text-green-300 font-medium" style={{ background: 'rgba(34,197,94,0.1)' }}>
                  ₹{nextStep.spend_needed.toLocaleString()} more spend
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Earn Info */}
      <div className="mx-4 mt-4 p-3 rounded-xl flex items-center gap-3"
        style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.1)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
          <Star className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-white text-xs font-semibold">Earn 1 Coin per ₹100 spent</p>
          <p className="text-white/30 text-[10px]">Coins awarded after delivery confirmation</p>
        </div>
        {tier === 'silver' && <span className="text-[9px] font-bold text-green-400 px-2 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.1)' }}>1.25x</span>}
        {tier === 'gold' && <span className="text-[9px] font-bold text-yellow-400 px-2 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.1)' }}>1.5x</span>}
      </div>

      {/* 8-Step Journey */}
      <div className="mx-4 mt-6" data-testid="step-journey">
        <h2 className="text-white font-bold text-base mb-4" style={{ fontFamily: 'Outfit' }}>Your Reward Journey</h2>

        <div className="relative" ref={scrollRef}>
          {/* Vertical line */}
          <div className="absolute left-[23px] top-0 bottom-0 w-[2px]"
            style={{ background: 'linear-gradient(180deg, rgba(249,115,22,0.4) 0%, rgba(34,197,94,0.2) 50%, rgba(255,255,255,0.05) 100%)' }} />

          <div className="space-y-3">
            {steps.map((step, idx) => {
              const Icon = STEP_ICONS[step.icon] || Gift;
              const isUnlocked = step.unlocked;
              const isClaimed = step.claimed;
              const isClaimable = step.claimable;
              const isCurrent = step.step === currentStep + 1;
              const isComplete = step.step <= currentStep;

              return (
                <div key={step.step}
                  className="relative flex gap-4 transition-all duration-300"
                  style={{ animation: `stepReveal 0.4s ease-out ${idx * 0.08}s both` }}
                  data-testid={`step-${step.step}`}>

                  {/* Step node */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isComplete ? '' : isCurrent ? '' : ''
                    }`}
                      style={isComplete ? {
                        background: 'linear-gradient(135deg, #F97316, #22C55E)',
                        boxShadow: '0 4px 20px rgba(249,115,22,0.35), 0 0 0 3px rgba(249,115,22,0.15)',
                      } : isCurrent ? {
                        background: 'rgba(249,115,22,0.15)',
                        border: '2px solid rgba(249,115,22,0.4)',
                        boxShadow: '0 0 20px rgba(249,115,22,0.15)',
                      } : {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}>
                      {isComplete ? (
                        isClaimed ? <Check className="w-5 h-5 text-white" /> : <Icon className="w-5 h-5 text-white" />
                      ) : isCurrent ? (
                        <Icon className="w-5 h-5 text-orange-400" />
                      ) : (
                        <Lock className="w-4 h-4 text-white/20" />
                      )}
                    </div>
                  </div>

                  {/* Step card */}
                  <div className="flex-1 rounded-2xl p-4 transition-all"
                    style={isComplete ? {
                      background: 'rgba(249,115,22,0.06)',
                      border: '1px solid rgba(249,115,22,0.15)',
                    } : isCurrent ? {
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px dashed rgba(249,115,22,0.3)',
                    } : {
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${
                          isComplete ? 'text-orange-400' : isCurrent ? 'text-orange-400/60' : 'text-white/15'
                        }`}>Step {step.step}</span>
                        <p className={`text-sm font-semibold mt-0.5 ${
                          isComplete ? 'text-white' : isCurrent ? 'text-white/60' : 'text-white/20'
                        }`}>{step.reward}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                          <span className={isComplete ? 'text-white/40' : 'text-white/15'}>
                            {step.orders_required} orders
                          </span>
                          {step.spend_required > 0 && (
                            <span className={isComplete ? 'text-white/40' : 'text-white/15'}>
                              ₹{step.spend_required.toLocaleString()} spent
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      {isClaimable && (
                        <button
                          onClick={() => claimReward(step.step)}
                          disabled={claimingStep === step.step}
                          className="px-3 py-1.5 rounded-full text-[10px] font-bold text-white transition-all active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #F97316, #22C55E)', boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}
                          data-testid={`claim-step-${step.step}`}>
                          {claimingStep === step.step ? '...' : 'Claim'}
                        </button>
                      )}
                      {isClaimed && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(34,197,94,0.1)' }}>
                          <Check className="w-3 h-3" /> Claimed
                        </span>
                      )}
                      {!isUnlocked && isCurrent && (
                        <span className="text-[10px] font-bold text-orange-400/50 px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(249,115,22,0.08)' }}>
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tier Progression */}
      <div className="mx-4 mt-6 mb-4" data-testid="tier-progression">
        <h2 className="text-white font-bold text-base mb-3" style={{ fontFamily: 'Outfit' }}>Membership Tiers</h2>
        <div className="flex gap-3">
          {[
            { key: 'bronze', label: 'Bronze', icon: '🥉', steps: '0-3', perk: '1x Coins', bg: 'linear-gradient(145deg, #92400E20, #B4530920)', border: '#92400E40' },
            { key: 'silver', label: 'Silver', icon: '🥈', steps: '4-6', perk: '1.25x Coins + 5% Off', bg: 'linear-gradient(145deg, #6B728020, #9CA3AF20)', border: '#6B728040' },
            { key: 'gold', label: 'Gold', icon: '🥇', steps: '7-8', perk: '1.5x Coins + 10% Off', bg: 'linear-gradient(145deg, #D9770620, #F59E0B20)', border: '#D9770640' },
          ].map((t) => {
            const isActive = tier === t.key;
            return (
              <div key={t.key}
                className="flex-1 rounded-2xl p-3 text-center transition-all"
                style={{
                  background: isActive ? t.bg : 'rgba(255,255,255,0.02)',
                  border: isActive ? `2px solid ${t.border}` : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: isActive ? `0 4px 20px ${t.border}` : 'none',
                }}
                data-testid={`tier-${t.key}`}>
                <div className="text-2xl mb-1">{t.icon}</div>
                <p className={`text-xs font-bold ${isActive ? 'text-white' : 'text-white/30'}`}>{t.label}</p>
                <p className={`text-[9px] mt-1 ${isActive ? 'text-white/50' : 'text-white/15'}`}>Steps {t.steps}</p>
                <p className={`text-[9px] mt-0.5 ${isActive ? 'text-green-400/70' : 'text-white/10'}`}>{t.perk}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Redeem CTA */}
      {coins >= 50 && (
        <div className="mx-4 mb-4">
          <button
            onClick={() => {
              toast.info('Add items to your Orange Pharmacy cart and apply coins at checkout!');
              navigate('/pharmacy');
            }}
            className="w-full p-4 rounded-2xl flex items-center gap-3 transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(34,197,94,0.08))',
              border: '1px solid rgba(249,115,22,0.2)',
            }}
            data-testid="redeem-coins-btn">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F97316, #22C55E)' }}>
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white text-sm font-bold">Redeem {coins} Coins = ₹{coins}</p>
              <p className="text-white/30 text-[10px]">Apply at Orange Pharmacy checkout</p>
            </div>
            <ChevronRight className="w-5 h-5 text-orange-400/50" />
          </button>
        </div>
      )}

      {/* Exclusion Note */}
      <div className="mx-4 mb-6 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="text-white/20 text-[10px] text-center">
          CuraBonus is exclusively for Orange Pharmacy orders. Orange Generics orders are not eligible.
        </p>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes stepReveal {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <BottomNav />
    </div>
  );
}
