import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ArrowLeft, Crown, Check, Star, Sparkles, Shield, Zap,
  Video, Brain, Heart, Users, Loader2, ChevronRight, Gift
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const PLAN_ICONS = { free: Shield, basic: Star, plus: Sparkles, premium: Crown };
const PLAN_COLORS = {
  free: { bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)', accent: '#6B7280' },
  basic: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', accent: '#3B82F6' },
  plus: { bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', accent: '#8B5CF6' },
  premium: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', accent: '#F59E0B' },
};

const CuraPlusPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [billing, setBilling] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const phone = user?.phone || '';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, statusRes] = await Promise.all([
        axios.get(`${API}/api/subscriptions/plans`),
        phone ? axios.get(`${API}/api/subscriptions/status/${phone}`) : Promise.resolve({ data: { status: 'free' } }),
      ]);

      // Use existing plans API or fallback to curated list
      const planList = plansRes.data.plans || plansRes.data || [];
      if (planList.length > 0) {
        setPlans(planList);
      } else {
        setPlans(DEFAULT_PLANS);
      }
      setCurrentPlan(statusRes.data);
    } catch {
      setPlans(DEFAULT_PLANS);
    }
    setLoading(false);
  };

  const handleSubscribe = async (planId) => {
    if (!phone) { toast.error('Please log in first'); return; }
    setSubscribing(planId);
    try {
      const res = await axios.post(`${API}/api/subscriptions/subscribe`, {
        phone, plan_id: planId, billing_cycle: billing,
      });
      toast.success(res.data.message || 'Subscribed!');
      if (res.data.bonus_coins > 0) {
        toast.success(`Bonus: +${res.data.bonus_coins} CuraCoins!`);
      }
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Subscription failed');
    }
    setSubscribing(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A12' }}>
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0A0A12' }} data-testid="curaplus-page">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3" style={{ background: 'rgba(10,10,18,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div>
            <h1 className="font-bold text-base text-white flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-400" /> CuraPlus
            </h1>
            <p className="text-[11px] text-gray-500">Premium Health Subscriptions</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Hero */}
        <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(245,158,11,0.1))', border: '1px solid rgba(139,92,246,0.2)' }}>
          <Crown className="w-10 h-10 text-amber-400 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-white">Unlock Premium Healthcare</h2>
          <p className="text-xs text-gray-300 mt-1">Get unlimited AI consultations, video calls, health insights & more</p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setBilling('monthly')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition ${billing === 'monthly' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400'}`}
            data-testid="billing-monthly">Monthly</button>
          <button onClick={() => setBilling('annual')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition relative ${billing === 'annual' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400'}`}
            data-testid="billing-annual">
            Annual
            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-white">Save 15%</span>
          </button>
        </div>

        {/* Plans */}
        <div className="space-y-3">
          {(plans.length > 0 ? plans : DEFAULT_PLANS).map((plan) => {
            const planId = plan.id || plan.plan_type || 'free';
            const colors = PLAN_COLORS[planId] || PLAN_COLORS.free;
            const Icon = PLAN_ICONS[planId] || Shield;
            const isCurrentPlan = currentPlan?.plan?.id === planId || (currentPlan?.status === 'free' && planId === 'free');
            const price = billing === 'annual' ? (plan.annual_price || plan.price * 10) : plan.price;
            const features = plan.features || [];
            const isPopular = plan.popular;

            return (
              <div key={planId} className="rounded-2xl p-4 relative overflow-hidden"
                style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                data-testid={`plan-${planId}`}>
                {isPopular && (
                  <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-bold text-white" style={{ background: colors.accent }}>
                    MOST POPULAR
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${colors.accent}20` }}>
                    <Icon className="w-5 h-5" style={{ color: colors.accent }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-sm">{plan.name || planId}</h3>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      {price > 0 ? (
                        <>
                          <span className="text-xl font-bold text-white">Rs.{price}</span>
                          <span className="text-xs text-gray-400">/{billing === 'annual' ? 'year' : 'month'}</span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-gray-400">Free</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="mt-3 space-y-1.5">
                  {features.slice(0, 6).map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: colors.accent }} />
                      <span className="text-xs text-gray-300">{f}</span>
                    </div>
                  ))}
                  {features.length > 6 && (
                    <p className="text-[10px] text-gray-500 pl-5">+{features.length - 6} more features</p>
                  )}
                </div>

                {/* Action */}
                <div className="mt-3">
                  {isCurrentPlan ? (
                    <div className="py-2 rounded-xl text-center text-xs font-medium text-emerald-400" style={{ background: 'rgba(16,185,129,0.1)' }}>
                      Current Plan
                    </div>
                  ) : planId !== 'free' ? (
                    <Button onClick={() => handleSubscribe(planId)} disabled={subscribing === planId}
                      className="w-full h-10 rounded-xl text-xs font-semibold text-white" style={{ background: colors.accent }}
                      data-testid={`subscribe-${planId}`}>
                      {subscribing === planId ? <Loader2 className="w-4 h-4 animate-spin" /> : `Get ${plan.name || planId}`}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Why CuraPlus?</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Brain, label: 'AI Health Advice', desc: 'Unlimited smart consultations' },
              { icon: Video, label: 'Video Consults', desc: 'Talk to doctors from home' },
              { icon: Users, label: 'Family Coverage', desc: 'Add unlimited family members' },
              { icon: Gift, label: 'Bonus CuraCoins', desc: '2x rewards on everything' },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <item.icon className="w-5 h-5 text-purple-400 mb-1.5" />
                <p className="text-xs font-medium text-white">{item.label}</p>
                <p className="text-[10px] text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

const DEFAULT_PLANS = [
  { id: "free", name: "CuraFree", price: 0, period: "forever", features: ["Book appointments", "Order medicines", "Basic health dashboard", "2 AI health queries/day", "Family vault (1 member)"], badge_color: "#6B7280" },
  { id: "basic", name: "CuraBasic", price: 99, annual_price: 999, period: "month", features: ["Everything in Free", "10 AI health queries/day", "Family vault (5 members)", "Priority booking", "Medicine refill reminders", "Health streaks & rewards"], badge_color: "#3B82F6" },
  { id: "plus", name: "CuraPlus", price: 299, annual_price: 2999, period: "month", features: ["Everything in Basic", "Unlimited AI health queries", "Family vault (10 members)", "2 free video consultations/month", "Prescription OCR (unlimited)", "Priority support", "Health report insights (AI)", "Insurance claim assistance"], badge_color: "#8B5CF6", popular: true },
  { id: "premium", name: "CuraPremium", price: 599, annual_price: 5999, period: "month", features: ["Everything in Plus", "Unlimited video consultations", "Family vault (unlimited)", "Dedicated health manager", "Annual health checkup", "Wearable data sync", "Mental wellness programs", "Exclusive CuraCoins bonus (2x)", "VIP appointment slots"], badge_color: "#F59E0B" },
];

export default CuraPlusPage;
