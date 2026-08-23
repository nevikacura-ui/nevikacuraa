import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mediumTap, lightTap } from '@/utils/haptics';
import { ShoppingBag, ArrowRight, ChevronRight, Package, Heart, Pill, Search, ShieldCheck, Truck, Clock, Mic } from 'lucide-react';
import ServiceHeader from '@/components/ServiceHeader';
import OrangeTutorial from '@/components/OrangeTutorial';

const PHARMACY_BANNER = 'https://customer-assets.emergentagent.com/job_ca7a3b6a-e4a4-4b10-b689-83baf03b0d17/artifacts/izzbzjdw_file_000000002b6471faac6222060e87b7d0%20%281%29.png';
const HEALTHPLUS_BANNER = 'https://customer-assets.emergentagent.com/job_ca7a3b6a-e4a4-4b10-b689-83baf03b0d17/artifacts/j78bu9ea_file_00000000c03c71fab28c874cb0fdbd41.png';
const GENERICS_BANNER = 'https://customer-assets.emergentagent.com/job_ca7a3b6a-e4a4-4b10-b689-83baf03b0d17/artifacts/vuj04bhw_file_000000004c6471faa01df42556a709dd.png';

const brands = [
  {
    id: 'pharmacy',
    name: 'Orange Pharmacy',
    path: '/pharmacy',
    banner: PHARMACY_BANNER,
    features: ['Branded Medicines', 'Prescriptions', 'Fast Delivery'],
    icon: Pill,
    accent: '#F97316',
    cardBg: 'linear-gradient(145deg, rgba(249,115,22,0.06) 0%, rgba(15,23,42,0.95) 50%, rgba(11,18,32,1) 100%)',
    cardBorder: 'rgba(249,115,22,0.15)',
    btnGradient: 'linear-gradient(135deg, #F97316, #EA580C)',
    stat: '582K+ Medicines',
  },
  {
    id: 'healthplus',
    name: 'Orange HealthPlus',
    path: '/nutricare',
    banner: HEALTHPLUS_BANNER,
    features: ['OTC Products', 'Skincare', 'Wellness Devices'],
    icon: Heart,
    accent: '#0891B2',
    cardBg: 'linear-gradient(145deg, rgba(8,145,178,0.06) 0%, rgba(15,23,42,0.95) 50%, rgba(11,18,32,1) 100%)',
    cardBorder: 'rgba(8,145,178,0.15)',
    btnGradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
    stat: '244K+ Products',
  },
  {
    id: 'generics',
    name: 'Orange Generics',
    path: '/orange-generics',
    banner: GENERICS_BANNER,
    features: ['Affordable Generics', 'Same Quality', 'Save up to 80%'],
    icon: Package,
    accent: '#16A34A',
    cardBg: 'linear-gradient(145deg, rgba(22,163,74,0.06) 0%, rgba(15,23,42,0.95) 50%, rgba(11,18,32,1) 100%)',
    cardBorder: 'rgba(22,163,74,0.15)',
    btnGradient: 'linear-gradient(135deg, #22C55E, #16A34A)',
    stat: 'Save up to 80%',
  },
];

const TRUST_STATS = [
  { value: '582K+', label: 'Medicines', icon: Pill, color: '#F97316', gradBg: 'linear-gradient(180deg, rgba(249,115,22,0.18) 0%, rgba(249,115,22,0.05) 100%)', border: 'rgba(249,115,22,0.35)' },
  { value: '100%', label: 'Genuine', icon: ShieldCheck, color: '#22C55E', gradBg: 'linear-gradient(180deg, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0.05) 100%)', border: 'rgba(34,197,94,0.35)' },
  { value: '2hr', label: 'Delivery', icon: Truck, color: '#06B6D4', gradBg: 'linear-gradient(180deg, rgba(6,182,212,0.18) 0%, rgba(6,182,212,0.05) 100%)', border: 'rgba(6,182,212,0.35)' },
  { value: '24/7', label: 'Support', icon: Clock, color: '#A855F7', gradBg: 'linear-gradient(180deg, rgba(168,85,247,0.18) 0%, rgba(168,85,247,0.05) 100%)', border: 'rgba(168,85,247,0.35)' },
];

const PharmaBrandCard = ({ d, navigate }) => (
  <button
    onClick={() => { mediumTap(); navigate(d.path); }}
    className="w-full rounded-[22px] mb-4 overflow-hidden active:scale-[0.98] transition-all duration-300 text-left group"
    style={{
      background: d.cardBg,
      border: `1.5px solid ${d.cardBorder}`,
      boxShadow: `0 4px 30px rgba(0,0,0,0.3), inset 0 1px 0 ${d.cardBorder}`,
    }}
    data-testid={`pharma-card-${d.id}`}
  >
    {/* Banner image */}
    <div className="w-full h-48 relative overflow-hidden rounded-t-[20px]">
      <img
        src={d.banner}
        alt={d.name}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
      />
    </div>

    {/* Features + CTA */}
    <div className="px-4 py-3.5">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {d.features.map((f, i) => (
          <span
            key={i}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: `${d.accent}18`, color: d.accent, border: `1px solid ${d.accent}30` }}
          >
            {f}
          </span>
        ))}
      </div>
      <div className="h-px w-full mb-3" style={{ background: `${d.accent}15` }} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <d.icon className="w-4 h-4" style={{ color: d.accent }} />
          <span className="text-xs font-semibold" style={{ color: d.accent }}>{d.stat}</span>
        </div>
        <div
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-xs font-bold shadow-lg"
          style={{ background: d.btnGradient, boxShadow: `0 4px 14px ${d.accent}40` }}
        >
          Visit <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  </button>
);

const OrangeMedcare = () => {
  const navigate = useNavigate();
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0B1220 0%, #0F172A 100%)' }} data-testid="orange-medcare-page">
      <ServiceHeader currentService="orange" />

      {/* ===== PREMIUM HERO — Smart Medcare Hub ===== */}
      <div className="relative px-5 pt-6 pb-2 text-center">
        {/* Radial glow behind CTA */}
        <div className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-[340px] h-[200px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,0.08) 0%, rgba(234,88,12,0.04) 40%, transparent 70%)' }} />

        {/* Nevika Cura Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-6" data-testid="hero-logo">
          <img src="/nevika-light-logo.png" alt="" className="h-10 w-10" />
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-black tracking-tight" style={{ color: '#22C55E', fontFamily: 'Outfit, sans-serif' }}>Nevika</span>
            <span className="text-xl font-black tracking-tight" style={{ color: '#F97316', fontFamily: 'Outfit, sans-serif' }}>Cura</span>
          </div>
        </div>

        {/* Main Title */}
        <h1
          className="text-[28px] sm:text-[36px] font-black text-white leading-[1.1] tracking-tight mb-3"
          style={{ fontFamily: 'Outfit, sans-serif' }}
          data-testid="pharmacy-hub-title"
        >
          Smart Medcare Hub
        </h1>

        {/* Subtext */}
        <p className="text-[13px] text-white/55 mb-7" data-testid="hero-subtext">
          Genuine medicines &bull; Wellness products &bull; Delivered to your door
        </p>

        {/* Primary CTA — Orange Gradient Pill Button */}
        <button
          onClick={() => { mediumTap(); navigate('/pharmacy'); }}
          className="relative mx-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full text-white font-bold text-base active:scale-[0.96] transition-all mb-7"
          style={{
            background: 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)',
            boxShadow: '0 0 30px rgba(249,115,22,0.3), 0 4px 20px rgba(239,68,68,0.25)',
          }}
          data-testid="shop-now-cta"
        >
          <Search className="w-5 h-5" />
          Shop Medicines
        </button>

        {/* Glassmorphism Search Bar */}
        <div
          onClick={() => navigate('/pharmacy')}
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-6 cursor-pointer"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          data-testid="pharmacy-search-bar"
        >
          <Search className="w-4 h-4 text-white/35 flex-shrink-0" />
          <span className="flex-1 text-sm text-white/35 text-left">Search medicines, health products...</span>
          <Mic className="w-4 h-4 text-white/30 flex-shrink-0" />
        </div>

        {/* Trust Stats — Colorful Individual Cards */}
        <div className="grid grid-cols-4 gap-2 mb-2" data-testid="pharmacy-trust-stats">
          {TRUST_STATS.map((stat, i) => (
            <div
              key={i}
              className="rounded-2xl py-4 px-2 text-center"
              style={{ background: stat.gradBg, border: `1.5px solid ${stat.border}` }}
            >
              <stat.icon className="w-6 h-6 mx-auto mb-2" style={{ color: stat.color }} />
              <p className="text-white text-sm font-bold">{stat.value}</p>
              <p className="text-[10px] mt-0.5 font-semibold" style={{ color: stat.color }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How to Order — Detailed Two-Row Card */}
      <div className="px-5 py-3 relative z-10">
        <button
          onClick={() => { lightTap(); setShowTutorial(true); }}
          className="w-full rounded-2xl overflow-hidden active:scale-[0.98] transition-all text-left"
          style={{ background: 'linear-gradient(145deg, rgba(249,115,22,0.1) 0%, rgba(234,88,12,0.06) 100%)', border: '1.5px solid rgba(249,115,22,0.2)' }}
          data-testid="how-to-order-banner"
        >
          {/* Top row */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <span className="text-base font-bold text-white block">How to Order</span>
              <span className="text-[11px] text-white/50">Order medicines in 3 simple steps</span>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.15)' }}>
              <ChevronRight className="w-5 h-5 text-orange-400" />
            </div>
          </div>
          {/* Bottom row — 3 step cards */}
          <div className="flex gap-2 px-4 pb-4 pt-2">
            <div className="flex-1 rounded-xl py-2.5 px-2 text-center" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.12)' }}>
              <Search className="w-5 h-5 mx-auto mb-1 text-orange-400" />
              <span className="text-[10px] font-semibold text-white/70 block leading-tight">Search<br/>Medicine</span>
            </div>
            <div className="flex-1 rounded-xl py-2.5 px-2 text-center" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.12)' }}>
              <ShoppingBag className="w-5 h-5 mx-auto mb-1 text-orange-400" />
              <span className="text-[10px] font-semibold text-white/70 block leading-tight">Add to<br/>Cart</span>
            </div>
            <div className="flex-1 rounded-xl py-2.5 px-2 text-center" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.12)' }}>
              <Truck className="w-5 h-5 mx-auto mb-1 text-orange-400" />
              <span className="text-[10px] font-semibold text-white/70 block leading-tight">Get<br/>Delivered</span>
            </div>
          </div>
        </button>
      </div>

      {/* Brand Cards */}
      <div className="px-5 pb-6 relative z-10">
        <h2 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="our-brands-heading">Our Brands</h2>
        {brands.map((d) => (
          <PharmaBrandCard key={d.id} d={d} navigate={navigate} />
        ))}
      </div>

      {/* Bottom Branding */}
      <div className="px-5 pb-20 relative z-10">
        <div className="flex items-center gap-3 pt-1 pb-2">
          <div className="flex-1 h-px bg-white/6" />
          <span className="text-[9px] text-white/20 font-medium tracking-widest uppercase whitespace-nowrap">A Nevika Cura Company</span>
          <div className="flex-1 h-px bg-white/6" />
        </div>
      </div>

      <OrangeTutorial open={showTutorial} onClose={() => setShowTutorial(false)} />
    </div>
  );
};

export default OrangeMedcare;
