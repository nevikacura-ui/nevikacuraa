import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Check, Loader2, CreditCard, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { lightTap, successPattern } from '@/utils/haptics';

const API = process.env.REACT_APP_BACKEND_URL;
const NEVIKA_LOGO = 'https://customer-assets.emergentagent.com/job_d786a99e-45bb-47d6-851a-3fcc890efd73/artifacts/1k8xe1te_1314-removebg-preview.png';

const TIERS = ['gold', 'silver', 'bronze'];

const TIER = {
  gold: {
    color: '#D4AF37', name: 'GOLD', price: 999,
    grad: 'linear-gradient(145deg, rgba(212,175,55,0.22), rgba(15,12,8,0.6), rgba(212,175,55,0.12))',
    border: 'rgba(212,175,55,0.50)', glow: 'rgba(212,175,55,0.20)',
    shadow: '0 24px 64px rgba(212,175,55,0.18), 0 8px 24px rgba(0,0,0,0.5)',
    feat1: '25% Medicine Discount', feat2: '12 Free Services', feat3: 'All Portals · 1 Year',
  },
  silver: {
    color: '#C0C0C0', name: 'SILVER', price: 799,
    grad: 'linear-gradient(145deg, rgba(192,192,192,0.20), rgba(12,12,14,0.6), rgba(192,192,192,0.10))',
    border: 'rgba(192,192,192,0.45)', glow: 'rgba(192,192,192,0.18)',
    shadow: '0 24px 64px rgba(192,192,192,0.12), 0 8px 24px rgba(0,0,0,0.5)',
    feat1: '20% Medicine Discount', feat2: '9 Free Services', feat3: '2 Portals · 9 Months',
  },
  bronze: {
    color: '#CD7F32', name: 'BRONZE', price: 499,
    grad: 'linear-gradient(145deg, rgba(205,127,50,0.22), rgba(14,10,6,0.6), rgba(205,127,50,0.12))',
    border: 'rgba(205,127,50,0.48)', glow: 'rgba(205,127,50,0.18)',
    shadow: '0 24px 64px rgba(205,127,50,0.14), 0 8px 24px rgba(0,0,0,0.5)',
    feat1: '15% Medicine Discount', feat2: '6 Free Services', feat3: '1 Portal · 6 Months',
  },
};

const NevikaCuraOne = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [tierIdx, setTierIdx] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showBenefits, setShowBenefits] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [autoPlay, setAutoPlay] = useState(true);
  const touchRef = useRef({ startX: 0, startTime: 0 });
  const autoTimerRef = useRef(null);

  const selectedTier = TIERS[tierIdx];
  const tc = TIER[selectedTier];
  const currentPlan = plans.find(p => p.id === selectedTier);

  useEffect(() => {
    fetch(`${API}/api/membership-tiers/plans`)
      .then(r => r.json())
      .then(data => { if (data.success) setPlans(data.plans); })
      .catch(() => {});
    // Read verified phone from OTP flow
    const ph = searchParams.get('phone');
    if (ph) setVerifiedPhone(ph);
    // Pre-select tier from query param (from CuraOne page)
    const tierParam = searchParams.get('tier');
    if (tierParam) {
      const idx = TIERS.indexOf(tierParam.toLowerCase());
      if (idx !== -1) { setTierIdx(idx); setAutoPlay(false); }
    }
  }, [searchParams]);

  useEffect(() => {
    const orderId = searchParams.get('order_id');
    if (orderId) {
      fetch(`${API}/api/payments/cashfree/verify/${orderId}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setPaymentSuccess(data.membership || { plan_name: 'Nevika Cura ONE' });
            toast.success('Membership activated!');
          }
        })
        .catch(() => {});
    }
  }, [searchParams]);

  /* ── Auto-swipe: cycle Gold→Silver→Bronze every 4s until user interacts ── */
  useEffect(() => {
    if (!autoPlay) return;
    autoTimerRef.current = setInterval(() => {
      setTierIdx(p => (p + 1) % TIERS.length);
    }, 4000);
    return () => clearInterval(autoTimerRef.current);
  }, [autoPlay]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlay) {
      setAutoPlay(false);
      clearInterval(autoTimerRef.current);
    }
  }, [autoPlay]);

  /* ── Swipe handlers ── */
  const onTouchStart = useCallback((e) => {
    stopAutoPlay();
    touchRef.current = { startX: e.touches[0].clientX, startTime: Date.now() };
    setIsSwiping(true);
  }, [stopAutoPlay]);

  const onTouchMove = useCallback((e) => {
    if (!isSwiping) return;
    const dx = e.touches[0].clientX - touchRef.current.startX;
    setSwipeX(dx * 0.5); // dampen
  }, [isSwiping]);

  const onTouchEnd = useCallback(() => {
    setIsSwiping(false);
    const threshold = 40;
    if (swipeX < -threshold) {
      // Swipe left → next
      lightTap();
      setTierIdx(p => (p + 1) % TIERS.length);
      setShowBenefits(false);
    } else if (swipeX > threshold) {
      // Swipe right → prev
      lightTap();
      setTierIdx(p => (p - 1 + TIERS.length) % TIERS.length);
      setShowBenefits(false);
    }
    setSwipeX(0);
  }, [swipeX]);

  const goTier = (idx) => {
    stopAutoPlay();
    lightTap();
    setTierIdx(idx);
    setShowBenefits(false);
  };

  const handleSubmit = async () => {
    if (!name.trim() || name.trim().length < 2) { toast.error('Please enter your name'); return; }
    if (!email || !email.includes('@')) { toast.error('Please enter a valid email'); return; }
    lightTap(); setProcessing(true);
    const plan = currentPlan;
    try {
      const res = await fetch(`${API}/api/payments/cashfree/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: `MEM_${selectedTier.toUpperCase()}_${Date.now()}`,
          customer_name: name.trim(), customer_email: email.toLowerCase().trim(),
          customer_phone: verifiedPhone || '9999999999', amount: plan.price,
          product_type: 'membership', product_id: `NEVIKA_${selectedTier.toUpperCase()}`,
          membership_plan: selectedTier,
          return_url: `${window.location.origin}/one?order_id=`,
        }),
      });
      const data = await res.json();
      if (data.success && data.payment_session_id) {
        successPattern(); toast.success('Redirecting to payment...');
        if (window.Cashfree) {
          const cashfree = window.Cashfree({ mode: 'production' });
          cashfree.checkout({ paymentSessionId: data.payment_session_id, redirectTarget: '_self' });
        }
      } else { toast.error(data.detail || 'Something went wrong'); }
    } catch { toast.error('Payment failed.'); }
    finally { setProcessing(false); }
  };

  /* ===== SUCCESS ===== */
  if (paymentSuccess) {
    return (
      <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center px-8" style={{ background: '#050507' }} data-testid="membership-success">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.25)' }}>
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <p className="text-white font-bold text-xl text-center mb-2">Membership Activated!</p>
        <p className="text-white/35 text-sm text-center mb-6">Check your email for the 16-digit code</p>
        {paymentSuccess.membership_code && (
          <div className="w-full rounded-2xl p-5 mb-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] tracking-[2px] mb-2 uppercase text-white/25">Membership Code</p>
            <p className="text-white font-bold text-2xl tracking-[4px] font-mono">{paymentSuccess.membership_code}</p>
          </div>
        )}
        <button onClick={() => navigate('/')} className="w-full py-3.5 rounded-2xl text-sm font-bold text-white mt-4" style={{ background: 'linear-gradient(135deg, #D4AF37, #8B6914)' }} data-testid="membership-go-home">Go to Home</button>
      </div>
    );
  }

  /* ===== FORM ===== */
  if (showForm) {
    return (
      <div className="fixed inset-0 z-[10000] flex flex-col" style={{ background: '#050507' }} data-testid="membership-form">
        <style>{`
          .f-input { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.07); color: #fff; outline: none; transition: all .25s; border-radius: 14px; }
          .f-input:focus { border-color: ${tc.border}; background: rgba(255,255,255,0.05); box-shadow: 0 0 0 3px ${tc.glow}; }
          .f-input::placeholder { color: rgba(255,255,255,0.18); }
        `}</style>
        <div className="relative z-10 flex-1 overflow-y-auto">
          <div className="px-5 pt-5 flex items-center gap-3">
            <button onClick={() => setShowForm(false)} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }} data-testid="form-back-btn">
              <ArrowLeft className="w-5 h-5 text-white/40" />
            </button>
            <span className="font-bold text-sm" style={{ color: tc.color }}>{tc.name} · ₹{tc.price}/yr</span>
          </div>
          <div className="px-7 pt-6 pb-4">
            <GlassCard tier={selectedTier} />
          </div>
          <div className="px-5 pb-36">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-4" style={{ color: `${tc.color}50` }}>Your Details</p>
            <div className="space-y-3">
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="f-input w-full h-12 px-4 text-sm" data-testid="membership-name" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" className="f-input w-full h-12 px-4 text-sm" data-testid="membership-email" />
              <input type="text" value={age} onChange={e => setAge(e.target.value)} placeholder="Age" className="f-input w-full h-12 px-4 text-sm" data-testid="membership-age" />
              <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" className="f-input w-full h-24 px-4 py-3 text-sm resize-none" data-testid="membership-address" />
            </div>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-7 z-20" style={{ background: 'linear-gradient(to top, #050507 60%, transparent)' }}>
          <button onClick={handleSubmit} disabled={processing} className="w-full py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 text-white active:scale-[0.98] transition-all disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${tc.color}, ${tc.color}88)`, boxShadow: `0 8px 32px ${tc.glow}` }} data-testid="membership-pay-btn">
            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CreditCard className="w-5 h-5" /> Pay ₹{tc.price}</>}
          </button>
          <p className="text-center text-[10px] mt-2 text-white/12">Secured by Cashfree Payments</p>
        </div>
      </div>
    );
  }

  /* ===== MAIN — SWIPEABLE CARD ===== */
  return (
    <div className="fixed inset-0 z-[10000] flex flex-col" style={{ background: '#0D1117' }} data-testid="membership-page">
      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } }
        .card-shimmer::before {
          content:''; position:absolute; top:0; left:0; width:30%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.035),transparent);
          animation:shimmer 5s ease-in-out infinite; pointer-events:none; z-index:5;
        }
      `}</style>

      {/* Ambient glow — follows selected tier */}
      <div className="absolute top-[-40px] right-[-40px] w-72 h-72 rounded-full blur-[120px] pointer-events-none transition-all duration-700" style={{ background: tc.color, opacity: 0.25 }} />
      <div className="absolute bottom-[-30px] left-[-30px] w-56 h-56 rounded-full blur-[100px] pointer-events-none transition-all duration-700" style={{ background: tc.color, opacity: 0.12 }} />

      <div className="relative z-10 flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-5 pt-5 pb-1 flex items-center">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }} data-testid="membership-back">
            <ArrowLeft className="w-5 h-5 text-white/80" />
          </button>
        </div>

        {/* Brand */}
        <div className="text-center pt-1 pb-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img src={NEVIKA_LOGO} alt="" className="w-7 h-7 object-contain opacity-60" />
            <span className="text-white/50 text-[11px] font-bold tracking-[0.25em] uppercase">Nevika Cura</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">ONE Membership</h1>
          <p className="text-white/40 text-[10px] mt-0.5 flex items-center justify-center gap-1">
            <ChevronLeft className="w-3 h-3" /> Swipe to explore <ChevronRight className="w-3 h-3" />
          </p>
        </div>

        {/* ══ SWIPEABLE CARD WITH STACK ══ */}
        <div
          className="px-6 pt-3 pb-2 select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          data-testid="swipe-card-area"
        >
          <div className="relative" style={{ paddingBottom: 26, paddingRight: 20 }}>
            {/* Ghost card 2 (back — clearly peeking bottom-right) */}
            <div
              className="absolute inset-0 transition-all duration-500 pointer-events-none"
              style={{
                transform: 'translateY(24px) translateX(18px) rotate(6deg) scale(0.92)',
                opacity: 0.6,
                zIndex: 1,
              }}
            >
              <GlassCard tier={TIERS[(tierIdx + 2) % TIERS.length]} ghost />
            </div>
            {/* Ghost card 1 (middle — peeking) */}
            <div
              className="absolute inset-0 transition-all duration-500 pointer-events-none"
              style={{
                transform: 'translateY(13px) translateX(9px) rotate(3deg) scale(0.96)',
                opacity: 0.75,
                zIndex: 2,
              }}
            >
              <GlassCard tier={TIERS[(tierIdx + 1) % TIERS.length]} ghost />
            </div>
            {/* Active card (front) */}
            <div
              className="relative transition-transform duration-300 ease-out"
              style={{
                transform: isSwiping ? `translateX(${swipeX}px) rotate(${swipeX * 0.02}deg)` : 'translateX(0) rotate(0deg)',
                zIndex: 3,
              }}
            >
              <GlassCard tier={selectedTier} selected />
            </div>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2.5 pt-4 pb-1">
          {TIERS.map((t, i) => {
            const s = TIER[t];
            const isActive = i === tierIdx;
            return (
              <button
                key={t}
                onClick={() => goTier(i)}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: isActive ? 28 : 8,
                  height: 8,
                  background: isActive ? s.color : 'rgba(255,255,255,0.12)',
                  boxShadow: isActive ? `0 0 12px ${s.glow}` : 'none',
                }}
                data-testid={`dot-${t}`}
              />
            );
          })}
        </div>

        {/* Tier label */}
        <div className="text-center pt-3 pb-2">
          <p className="text-[11px] font-black tracking-[0.3em] uppercase transition-colors duration-300" style={{ color: tc.color }}>
            {tc.name}
          </p>
          <div className="inline-flex items-baseline gap-0.5 mt-1">
            <span className="text-white/20 text-sm">₹</span>
            <span className="text-3xl font-black text-white">{tc.price}</span>
            <span className="text-white/18 text-sm">/year</span>
          </div>
          {currentPlan && <p className="text-[11px] mt-0.5" style={{ color: `${tc.color}45` }}>{currentPlan.tagline}</p>}
        </div>

        {/* Benefits */}
        <div className="px-5 pb-6">
          <button
            onClick={() => { lightTap(); setShowBenefits(!showBenefits); }}
            className="w-full flex items-center justify-between py-3 px-4 rounded-2xl mb-3 transition-all duration-300"
            style={{ background: `${tc.color}08`, border: `1px solid ${tc.color}15` }}
            data-testid="toggle-benefits"
          >
            <span className="text-[12px] font-semibold transition-colors duration-300" style={{ color: `${tc.color}70` }}>All Benefits</span>
            <ChevronDown className={`w-4 h-4 transition-all duration-300 ${showBenefits ? 'rotate-180' : ''}`} style={{ color: `${tc.color}40` }} />
          </button>

          {showBenefits && currentPlan && (
            <div className="space-y-1.5 mb-4">
              {currentPlan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl" style={{ background: `${tc.color}05` }}>
                  <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `${tc.color}70` }} />
                  <span className="text-[12px] text-white/55">{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-28" />
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-7 z-20" style={{ background: 'linear-gradient(to top, #050507 60%, transparent)' }}>
        <button
          onClick={() => { lightTap(); setShowForm(true); }}
          className="w-full py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 text-white active:scale-[0.98] transition-all duration-300"
          style={{ background: `linear-gradient(135deg, ${tc.color}, ${tc.color}88)`, boxShadow: `0 8px 32px ${tc.glow}`, transition: 'background 0.4s, box-shadow 0.4s' }}
          data-testid="get-plan-btn"
        >
          <CreditCard className="w-5 h-5" /> Get {tc.name} Card · ₹{tc.price}/yr
        </button>
      </div>
    </div>
  );
};

/* ═══════════════ GLASS CREDIT CARD ═══════════════ */

const GlassCard = ({ tier, selected = false, ghost = false }) => {
  const s = TIER[tier];
  // Ghost cards: brighter border so they're visible behind the active card
  const borderColor = ghost ? `${s.color}50` : s.border;

  return (
    <div
      className={`${ghost ? '' : 'card-shimmer holo-shimmer'} relative overflow-hidden rounded-[20px]`}
      style={{
        aspectRatio: '1.586 / 1',
        background: ghost ? `linear-gradient(145deg, ${s.color}14, rgba(8,8,12,0.8), ${s.color}08)` : s.grad,
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: `1.5px solid ${borderColor}`,
        boxShadow: selected ? s.shadow : ghost ? `0 4px 20px ${s.color}15` : `0 8px 32px rgba(0,0,0,0.35)`,
      }}
      data-testid={ghost ? undefined : `glass-card-${tier}`}
    >
      {/* Inner radial glow */}
      <div className="absolute inset-0 opacity-[0.12]" style={{ background: `radial-gradient(ellipse at 25% 15%, ${s.color}, transparent 65%)` }} />

      {/* Large watermark logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img src={NEVIKA_LOGO} alt="" className="opacity-[0.04]" style={{ width: '48%', objectFit: 'contain', filter: `drop-shadow(0 0 2px ${s.color})` }} />
      </div>

      <div className="relative z-10 h-full flex flex-col justify-between p-5">
        {/* Top: Engraved brand + logo */}
        <div className="flex items-start justify-between">
          <div>
            <p
              className="font-black uppercase"
              style={{
                fontSize: 11,
                color: 'transparent',
                WebkitTextStroke: `0.8px ${s.color}90`,
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                letterSpacing: '0.22em',
              }}
            >
              NEVIKA CURA
            </p>
            <p
              className="font-black"
              style={{
                fontSize: 30,
                color: s.color,
                textShadow: `0 2px 14px ${s.glow}, 0 0 30px ${s.glow}`,
                lineHeight: 1.05,
                marginTop: 3,
                letterSpacing: '0.08em',
              }}
            >
              {s.name}
            </p>
          </div>
          <img src={NEVIKA_LOGO} alt="" className="object-contain opacity-25" style={{ width: 34, height: 34 }} />
        </div>

        {/* Middle: Engraved features */}
        <div className="space-y-0.5">
          {[s.feat1, s.feat2, s.feat3].map((f, i) => (
            <p
              key={i}
              className="font-bold"
              style={{
                fontSize: 9.5,
                color: 'transparent',
                WebkitTextStroke: `0.4px ${s.color}50`,
                textShadow: '0 1px 1px rgba(0,0,0,0.15)',
                letterSpacing: '0.06em',
              }}
            >
              {f}
            </p>
          ))}
        </div>

        {/* Bottom: Dots + price */}
        <div className="flex items-end justify-between">
          <p className="font-mono" style={{ fontSize: 12, color: `${s.color}28`, letterSpacing: '0.22em' }}>
            ····  ····  ····  ····
          </p>
          <div className="text-right">
            <p className="uppercase font-bold" style={{ fontSize: 7, color: `${s.color}30`, letterSpacing: '0.15em' }}>ONE</p>
            <p className="font-black" style={{ fontSize: 18, color: `${s.color}90` }}>
              ₹{s.price}<span className="font-normal" style={{ fontSize: 8, color: `${s.color}35` }}>/yr</span>
            </p>
          </div>
        </div>
      </div>

      {/* Edge highlights */}
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${s.color}28, transparent)` }} />
      <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${s.color}14, transparent)` }} />
    </div>
  );
};

export default NevikaCuraOne;
