import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Crown, Stethoscope, IndianRupee, Loader2, Shield, Heart, Baby, Users, Sparkles, ChevronRight, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import ServiceHeader from '@/components/ServiceHeader';
import BottomNav from '@/components/BottomNav';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATIC_PLANS = [
  {
    id: 'diabetes_care', name: 'Diabetes Care', description: 'Complete sugar management program',
    doctor: 'Dr. Vikas Sharma', price: 999, billing: 'month',
    color: 'from-teal-500 to-cyan-500', gradient: 'linear-gradient(135deg, #0D9488, #06B6D4)',
    icon: Heart, popular: true,
    includes: ['Monthly HbA1c test at Mango Labs', '2 Doctor consultations', 'Diet plan by nutritionist', 'Medicine reminders setup', 'WhatsApp support group'],
  },
  {
    id: 'womens_health', name: "Women's Wellness", description: 'Comprehensive gynaecological care',
    doctor: 'Dr. Neha Gupta', price: 1499, billing: 'month',
    color: 'from-pink-500 to-rose-500', gradient: 'linear-gradient(135deg, #EC4899, #F43F5E)',
    icon: Baby, best_value: true,
    includes: ['Monthly gynaec consultation', 'Annual ultrasound scan', 'Pap smear test', 'Breast screening', 'Prenatal vitamins counseling'],
  },
  {
    id: 'family_wellness', name: 'Family Health', description: 'Coverage for the whole family',
    doctor: 'Dr. Vikas Sharma', price: 1999, billing: 'month',
    color: 'from-violet-500 to-purple-500', gradient: 'linear-gradient(135deg, #8B5CF6, #A855F7)',
    icon: Users,
    includes: ['4 family members covered', 'Annual health checkup each', 'Priority appointments', '10% off on medicines', 'Emergency support line'],
  },
  {
    id: 'maternity', name: 'Maternity Care', description: '9-month comprehensive pregnancy program',
    doctor: 'Dr. Neha Gupta', price: 15999, billing: '3 months',
    color: 'from-amber-500 to-orange-500', gradient: 'linear-gradient(135deg, #F59E0B, #F97316)',
    icon: Baby,
    includes: ['All 3 trimester scans', 'Monthly OB-GYN visits', 'Blood tests & screenings', 'Delivery planning', 'Post-partum follow-up'],
  },
];

const HealthPlans = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [plans, setPlans] = useState(STATIC_PLANS);
  const [mySubs, setMySubs] = useState([]);
  const [subscribing, setSubscribing] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(null);

  useEffect(() => {
    axios.get(`${API}/health-plans`).then(res => {
      if (res.data?.plans?.length) setPlans(res.data.plans);
    }).catch(() => {});
    if (user?.phone) {
      axios.get(`${API}/health-plans/my-subscriptions/${user.phone}`).then(res => setMySubs(res.data.subscriptions || [])).catch(() => {});
    }
  }, [user]);

  const handleSubscribe = async (plan) => {
    if (!user) { toast.error('Please login to subscribe'); navigate('/login'); return; }
    
    setPaymentLoading(plan.id);
    try {
      // Create Cashfree order
      const orderRes = await axios.post(`${API}/payments/cashfree/create-order`, {
        customer_id: user.phone || user.id || 'guest',
        customer_name: user.name || 'Patient',
        customer_email: user.email || `${user.phone}@nevikacura.com`,
        customer_phone: user.phone || '9999999999',
        amount: plan.price,
        product_type: 'health_plan',
        product_id: plan.id,
        membership_plan: plan.billing === 'month' ? 'monthly' : plan.billing === '3 months' ? 'quarterly' : 'yearly',
      });

      if (orderRes.data?.success && orderRes.data?.payment_session_id) {
        // Initialize Cashfree checkout
        if (window.Cashfree) {
          const cashfree = window.Cashfree({ mode: 'production' });
          cashfree.checkout({ paymentSessionId: orderRes.data.payment_session_id, redirectTarget: '_self' });
        } else {
          // Fallback: Open payment link
          toast.success(`Order created: ${orderRes.data.order_id}. Redirecting to payment...`);
          // Store subscription as pending
          await axios.post(`${API}/health-plans/subscribe`, {
            plan_id: plan.id,
            phone: user.phone,
            patient_name: user.name || '',
            cashfree_order_id: orderRes.data.order_id,
          });
          setMySubs(prev => [...prev, { plan_id: plan.id, plan_name: plan.name, status: 'payment_pending' }]);
        }
      } else {
        toast.error('Payment initialization failed');
      }
    } catch (err) {
      console.error('Subscription error:', err);
      toast.error(err.response?.data?.detail || 'Payment failed. Please try again.');
    } finally {
      setPaymentLoading(null);
    }
  };

  const isSubscribed = (planId) => mySubs.some(s => s.plan_id === planId);

  return (
    <div className="min-h-screen" style={{ background: '#07070f' }} data-testid="health-plans-page">
      <style>{`
        @keyframes hpFade { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
        .hp-anim { animation: hpFade 0.5s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>
      <ServiceHeader />
      <main className="max-w-lg mx-auto px-4 py-5 pb-28">
        {/* Header */}
        <div className="hp-anim mb-6">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <ArrowLeft className="w-4 h-4 text-white/50" />
            </button>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8B5CF6, #A855F7)' }}>
              <Crown className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mt-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Health <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #8B5CF6, #C084FC)' }}>Plans</span>
          </h1>
          <p className="text-xs text-white/30 mt-1">Subscribe to ongoing care packages & save</p>
        </div>

        {/* Benefits Bar */}
        <div className="hp-anim flex gap-3 mb-6 overflow-x-auto scrollbar-hide" style={{ animationDelay: '100ms' }}>
          {[
            { icon: Shield, label: 'Verified Doctors' },
            { icon: CreditCard, label: 'Pay Monthly' },
            { icon: Sparkles, label: 'Save up to 40%' },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-shrink-0" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
              <b.icon className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[10px] font-bold text-violet-300 whitespace-nowrap">{b.label}</span>
            </div>
          ))}
        </div>

        {/* Plan Cards */}
        <div className="space-y-4">
          {plans.map((plan, idx) => {
            const PlanIcon = plan.icon || Crown;
            const isSub = isSubscribed(plan.id);
            return (
              <div key={plan.id} className="hp-anim rounded-2xl overflow-hidden relative" style={{ animationDelay: `${150 + idx * 80}ms` }} data-testid={`health-plan-${plan.id}`}>
                {/* Badge */}
                {(plan.popular || plan.best_value) && (
                  <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl z-10 text-[9px] font-black text-white uppercase tracking-wider" style={{
                    background: plan.popular ? 'linear-gradient(135deg, #0D9488, #14B8A6)' : 'linear-gradient(135deg, #8B5CF6, #A855F7)',
                  }}>
                    {plan.popular ? 'Most Popular' : 'Best Value'}
                  </div>
                )}

                {/* Card Header */}
                <div className="p-5 pb-3" style={{ background: plan.gradient || `linear-gradient(135deg, ${plan.color?.split(' ').pop()}, ${plan.color?.split(' ').pop()}CC)` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                      <PlanIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-white">{plan.name}</h3>
                      <p className="text-[11px] text-white/70 mt-0.5">{plan.description}</p>
                      <p className="text-[10px] text-white/50 mt-0.5 flex items-center gap-1">
                        <Stethoscope className="w-3 h-3" /> {plan.doctor}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 pt-4" style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-3">
                    <IndianRupee className="w-4 h-4 text-white" />
                    <span className="text-3xl font-black text-white">{plan.price?.toLocaleString()}</span>
                    <span className="text-xs text-white/40">/{plan.billing}</span>
                  </div>

                  {/* Includes */}
                  <div className="space-y-1.5 mb-4">
                    {(plan.includes || []).map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                        <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Button
                    onClick={() => handleSubscribe(plan)}
                    disabled={isSub || paymentLoading === plan.id}
                    className="w-full rounded-xl py-3 font-bold text-sm"
                    style={isSub
                      ? { background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }
                      : { background: plan.gradient || 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }
                    }
                    data-testid={`subscribe-${plan.id}`}
                  >
                    {isSub ? (
                      <><Check className="w-4 h-4 mr-1" /> Subscribed</>
                    ) : paymentLoading === plan.id ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Processing...</>
                    ) : (
                      <><CreditCard className="w-4 h-4 mr-1" /> Subscribe — ₹{plan.price}/{plan.billing}</>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Terms */}
        <p className="text-[9px] text-white/20 text-center mt-6 px-4 leading-relaxed">
          Subscriptions are billed via Cashfree. Cancel anytime from your account. Plans auto-renew unless cancelled. Prices may vary based on location.
        </p>
      </main>
      <BottomNav />
    </div>
  );
};

export default HealthPlans;
