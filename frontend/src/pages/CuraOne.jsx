import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Stethoscope, FlaskConical, Package, ChevronRight, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { selectionTap } from '@/utils/haptics';
import BrandedLoader from '@/components/BrandedLoader';
import BottomNav from '@/components/BottomNav';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CURAONE_LOGO_URL = '/images/curaone-logo.png';

// Reusable logo component using the actual image
const CuraOneLogo = ({ size = 40 }) => (
  <img src={CURAONE_LOGO_URL} alt="CuraOne" style={{ width: size, height: size * 1.3, objectFit: 'contain' }} draggable={false} />
);

// Nav icon version — gray glass icon for bottom nav
export const CuraOneNavIcon = ({ size = 22 }) => (
  <img src="/images/curaone-nav-icon.png" alt="CuraOne" style={{ width: size, height: size * 1.3, objectFit: 'contain' }} draggable={false} />
);

// Health plans
const HEALTH_PLANS = [
  {
    id: 'individual',
    name: 'CuraOne Individual',
    price: 1999,
    validity: '1 year',
    color: '#FF8C42',
    features: [
      '2 Doctor Consultations Included',
      '1 Annual Health Checkup (Basic Panel)',
      'CuraCore Wellness Package',
      'Unlimited Digital Prescriptions',
      'Health Reports Dashboard Access',
      '24/7 Teleconsult Priority Line',
    ],
  },
  {
    id: 'family',
    name: 'CuraOne Family',
    price: 2999,
    validity: '1 year',
    color: '#7B2FBE',
    features: [
      '4 Doctor Consultations Included',
      '2 Annual Health Checkups (Full Panel)',
      'CuraCore + CuraPro Wellness Packages',
      'Up to 4 Family Members Covered',
      'Dedicated Family Health Manager',
      'Free Home Sample Collection',
      '24/7 Teleconsult Priority Line',
    ],
  },
  {
    id: 'diacare',
    name: 'CuraOne DiaCare',
    price: 9999,
    validity: '1 year',
    color: '#2563EB',
    features: [
      '12 Monthly Doctor Visits',
      'Monthly: FBS, PPBS, Urine Routine',
      'Every 3 Months: HbA1c',
      'Annual CuraPro / CuraElite Package',
      '12 Free Home Deliveries (Medicine Refill)',
      'Dedicated Diabetes Care Coordinator',
    ],
  },
  {
    id: 'hercare',
    name: 'CuraOne HerCare',
    price: 7999,
    validity: '1 year',
    color: '#DB2777',
    features: [
      '6 Gynecologist Consultations (Online/Offline)',
      'Every 6 Months: Thyroid, Iron, Vitamin D & B12',
      'Annual: Pap Smear + Hormonal Panel',
      'CuraCore Women\'s Wellness Package',
      '6 Free Home Sample Collections',
      'Dedicated Women\'s Health Helpline',
    ],
  },
  {
    id: 'eldershield',
    name: 'CuraOne ElderShield',
    price: 12999,
    validity: '1 year',
    color: '#059669',
    features: [
      '12 Monthly Doctor Visits (GP + Specialist)',
      'Monthly: BP Monitoring, Blood Sugar (FBS)',
      'Every 3 Months: CBC, Kidney & Liver Function',
      'Every 6 Months: ECG + Cardiac Review',
      'Annual CuraElite Full Body Checkup',
      '12 Free Home Sample Collections',
      'Priority Emergency Assistance',
    ],
  },
];

const glass = (opacity = 0.06) => ({
  background: `rgba(255,255,255,${opacity})`,
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.08)',
});

const TIERS = [
  {
    id: 'bronze', name: 'BRONZE', color: '#CD7F32',
    price: 499, validity: '1 year',
    features: ['500 CuraCoins on Signup', '2x CuraCoins per Transaction', 'Standard Booking Priority', 'Digital Health Records Access'],
  },
  {
    id: 'silver', name: 'SILVER', color: '#C0C0C0',
    price: 999, validity: '1 year',
    features: ['1,500 CuraCoins on Signup', '3x CuraCoins per Transaction', 'Priority Booking', 'CuraCore Portal Access (9 Months)', 'Birthday Bonus Coins'],
  },
  {
    id: 'gold', name: 'GOLD', color: '#D4AF37',
    price: 1499, validity: '1 year',
    features: ['3,000 CuraCoins on Signup', '5x CuraCoins per Transaction', 'VIP Priority Booking', 'All Portals Access (1 Year)', 'Birthday Bonus Coins', 'Free Home Sample Collection'],
  },
];

// Layout positions for the 3-card stack based on which card is active
const getCardLayout = (cardIdx, activeIdx) => {
  const total = TIERS.length;
  const offset = (cardIdx - activeIdx + total) % total;
  // offset 0 = front, 1 = middle-back, 2 = far-back
  if (offset === 0) return { x: 0, y: 0, rotate: 0, z: 30, scale: 1, opacity: 1 };
  if (offset === 1) return { x: -8, y: 8, rotate: -4, z: 20, scale: 0.95, opacity: 0.7 };
  return { x: 10, y: 14, rotate: 5, z: 10, scale: 0.9, opacity: 0.5 };
};

export default function CuraOne() {
  const navigate = useNavigate();
  const [membership, setMembership] = useState(null);
  const [activeTier, setActiveTier] = useState(2);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (data.membership) setMembership(data.membership); })
        .catch(() => {})
        .finally(() => setTimeout(() => setLoading(false), 1500));
    } else {
      setTimeout(() => setLoading(false), 1500);
    }
  }, []);

  const handleCardTap = useCallback(() => {
    selectionTap();
    setActiveTier(prev => (prev + 1) % TIERS.length);
  }, []);

  if (loading) return null;

  return (
    <div className="min-h-screen pb-24" style={{ background: '#030308' }} data-testid="curaone-page">
      {/* Header */}
      <div className="sticky top-0 z-10" style={{ background: 'rgba(3,3,8,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10 transition-colors" data-testid="curaone-back-btn">
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <div className="flex items-center gap-2.5">
            <CuraOneLogo size={26} />
            <span className="text-lg font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <span className="text-white">Cura</span>
              <span style={{ color: '#2BA6FF' }}>O</span>
              <span className="text-white">ne</span>
            </span>
          </div>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-4 space-y-5 mt-4">
        {/* Hero */}
        <div className="flex flex-col items-center py-4" data-testid="curaone-hero">
          <CuraOneLogo size={110} />
          <h1 className="text-2xl font-black mt-4 leading-tight text-center" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <span style={{ background: 'linear-gradient(135deg, #FF8C42, #E0507A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>One Card.</span>
            <br />
            <span className="text-white">All Healthcare.</span>
          </h1>
          <p className="text-sm text-white/40 mt-2 max-w-[280px] text-center">
            Up to 20% off Diagnostics &bull; 10% off Pharmacy &bull; Priority Consultation
          </p>
        </div>

        {/* ===== MEMBERSHIP CARD — Full Dark Glassmorphism ===== */}
        <div className="relative rounded-[24px] overflow-hidden" style={{
          background: 'rgba(8,8,20,0.6)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
        }} data-testid="curaone-membership-card">

          {/* Animated glow orbs — follow active tier */}
          <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full pointer-events-none transition-all duration-700" style={{ background: `radial-gradient(circle, ${TIERS[activeTier].color}18 0%, transparent 65%)` }} />
          <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full pointer-events-none transition-all duration-700" style={{ background: `radial-gradient(circle, ${TIERS[activeTier].color}10 0%, transparent 60%)` }} />
          <div className="absolute top-1/3 right-1/4 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 60%)' }} />

          {/* Top edge glass highlight */}
          <div className="absolute top-0 left-0 w-full h-[1px] transition-all duration-500" style={{ background: `linear-gradient(90deg, transparent 5%, ${TIERS[activeTier].color}30 35%, rgba(255,255,255,0.12) 50%, ${TIERS[activeTier].color}30 65%, transparent 95%)` }} />

          <div className="relative p-5">
            {/* Brand row */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}>
                <Crown className="w-4 h-4 text-amber-400/70" />
              </div>
              <div>
                <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-white/25">Nevika Cura</span>
                <h2 className="text-base font-black text-white/90 tracking-tight leading-none" style={{ fontFamily: 'Outfit, sans-serif' }}>CuraOne Card</h2>
              </div>
            </div>

            {/* Interactive stacked tier cards — tap to cycle */}
            <div
              className="relative h-[88px] mb-4 cursor-pointer select-none"
              onClick={handleCardTap}
              data-testid="curaone-card-stack"
            >
              {TIERS.map((t, idx) => {
                const layout = getCardLayout(idx, activeTier);
                const isFront = idx === activeTier;
                return (
                  <div
                    key={t.id}
                    className="absolute left-0 right-0"
                    style={{
                      zIndex: layout.z,
                      transform: `translateX(${layout.x}px) translateY(${layout.y}px) rotate(${layout.rotate}deg) scale(${layout.scale})`,
                      opacity: layout.opacity,
                      transition: 'all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                    data-testid={`tier-card-${t.id}`}
                  >
                    <div className="rounded-2xl overflow-hidden" style={{
                      aspectRatio: '1.586 / 1', maxHeight: 68,
                      background: isFront
                        ? `linear-gradient(145deg, ${t.color}18, rgba(255,255,255,0.03), ${t.color}0a)`
                        : `linear-gradient(145deg, ${t.color}0c, rgba(0,0,0,0.2))`,
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      border: `1px solid ${isFront ? `${t.color}35` : `${t.color}12`}`,
                      boxShadow: isFront
                        ? `0 8px 32px rgba(0,0,0,0.5), 0 0 24px ${t.color}08, inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.2)`
                        : `0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)`,
                    }}>
                      {/* Inner glass highlight */}
                      <div className="absolute top-0 left-0 w-full h-1/2 pointer-events-none" style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
                        borderRadius: '16px 16px 0 0',
                      }} />
                      <div className="p-3 flex items-center justify-between h-full relative">
                        <div>
                          <p style={{ fontSize: 7, color: `${t.color}30`, fontWeight: 900, letterSpacing: '0.2em' }}>CURAONE</p>
                          <p style={{ fontSize: 16, color: t.color, fontWeight: 900, lineHeight: 1, textShadow: `0 2px 12px ${t.color}30` }}>{t.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tier indicator dots */}
            <div className="flex justify-center gap-2 mb-2" data-testid="tier-dots">
              {TIERS.map((t, idx) => (
                <div
                  key={t.id}
                  className="rounded-full transition-all duration-400 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); selectionTap(); setActiveTier(idx); }}
                  style={{
                    width: idx === activeTier ? 20 : 6,
                    height: 6,
                    background: idx === activeTier
                      ? `linear-gradient(90deg, ${t.color}, ${t.color}80)`
                      : 'rgba(255,255,255,0.1)',
                    boxShadow: idx === activeTier ? `0 0 12px ${t.color}30` : 'none',
                  }}
                />
              ))}
            </div>

            <p className="text-center text-[9px] text-white/20 mb-3">Tap cards to switch tiers</p>

            {/* ===== Active tier package details — glass panel ===== */}
            {(() => {
              const tier = TIERS[activeTier];
              return (
                <div className="rounded-2xl p-4 transition-all duration-400" style={{
                  background: 'rgba(255,255,255,0.025)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: `1px solid ${tier.color}18`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.3)`,
                }} data-testid={`tier-details-${tier.id}`}>
                  {/* Tier header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: tier.color, boxShadow: `0 0 8px ${tier.color}50` }} />
                      <h3 className="text-sm font-bold tracking-wide" style={{ color: tier.color }}>{tier.name}</h3>
                    </div>
                    <span className="text-[9px] font-bold px-2.5 py-1 rounded-full" style={{
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.45)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>{tier.validity}</span>
                  </div>

                  {/* Features list */}
                  <div className="space-y-2 mb-4">
                    {tier.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{
                          background: `${tier.color}12`,
                          border: `1px solid ${tier.color}20`,
                        }}>
                          <CheckCircle2 className="w-2.5 h-2.5" style={{ color: tier.color }} />
                        </div>
                        <p className="text-white/45 text-[11px] leading-snug">{f}</p>
                      </div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="h-[1px] mb-3" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />

                  {/* Price + CTA */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-white/20 block mb-0.5">Starting at</span>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-[11px] text-white/30">₹</span>
                        <span className="text-2xl font-black text-white/90" style={{ fontFamily: 'Outfit, sans-serif' }}>{tier.price.toLocaleString('en-IN')}</span>
                        <span className="text-[9px] text-white/20 ml-0.5">/{tier.validity}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/one?tier=${tier.id}`)}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[11px] font-bold text-white active:scale-95 transition-all"
                      style={{
                        background: `linear-gradient(135deg, ${tier.color}cc, ${tier.color}88)`,
                        boxShadow: `0 4px 20px ${tier.color}20, inset 0 1px 0 rgba(255,255,255,0.12)`,
                        border: `1px solid ${tier.color}30`,
                      }}
                      data-testid={`get-tier-${tier.id}`}
                    >
                      Get {tier.name} <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Status indicator if active */}
            {membership?.is_active && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <p className="text-green-400 text-xs font-medium">Active — {membership.plan_name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-3 justify-center" data-testid="curaone-categories">
          {[
            { label: 'Clinic', icon: Stethoscope, color: '#FF8C42' },
            { label: 'Diagnostics', icon: FlaskConical, color: '#E0507A' },
            { label: 'Pharmacy', icon: Package, color: '#7B2FBE' },
          ].map(cat => (
            <div key={cat.label} className="flex items-center gap-2 px-4 py-2.5 rounded-full" style={{ ...glass(0.06), border: `1px solid ${cat.color}25` }} data-testid={`curaone-cat-${cat.label.toLowerCase()}`}>
              <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
              <span className="text-xs font-semibold" style={{ color: cat.color }}>{cat.label}</span>
            </div>
          ))}
        </div>

        {/* Health Plans */}
        <div data-testid="curaone-plans">
          <h3 className="text-white/30 text-[10px] uppercase tracking-widest font-bold mb-3">Health Plans</h3>
          <div className="space-y-4">
            {HEALTH_PLANS.map(plan => (
              <div key={plan.id} className="rounded-3xl p-5 relative overflow-hidden" style={{
                background: `linear-gradient(135deg, ${plan.color}12, ${plan.color}08)`,
                backdropFilter: 'blur(16px)',
                border: `1px solid ${plan.color}20`,
                boxShadow: `0 8px 32px ${plan.color}08`,
              }} data-testid={`health-plan-${plan.id}`}>
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${plan.color}15`, color: plan.color, border: `1px solid ${plan.color}20` }}>{plan.validity}</span>
                </div>
                <h3 className="text-base font-bold text-white/90 mb-1">{plan.name}</h3>
                <p className="text-3xl font-black mb-3" style={{ fontFamily: 'Outfit, sans-serif', color: plan.color }}>
                  ₹{plan.price.toLocaleString('en-IN')}
                </p>
                <div className="space-y-2 mb-4">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                      <p className="text-white/50 text-xs leading-relaxed">{f}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate(`/one?tier=gold`)}
                  className="w-full py-3 rounded-2xl text-white text-sm font-bold active:scale-95 transition-all"
                  style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`, boxShadow: `0 4px 16px ${plan.color}25` }}
                  data-testid={`buy-plan-${plan.id}`}
                >
                  Get {plan.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-white/15 text-[10px] pb-4"></p>
      </div>
      <BottomNav />
    </div>
  );
}
