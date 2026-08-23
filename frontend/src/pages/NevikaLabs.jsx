import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mediumTap } from '@/utils/haptics';
import { FlaskConical, Search, Clock, ChevronRight, Truck, BadgeCheck, Dna, Radio, Microscope, ArrowRight, Sparkles, Mic } from 'lucide-react';
import ServiceHeader from '@/components/ServiceHeader';
import MangoTutorial from '@/components/MangoTutorial';

const API = process.env.REACT_APP_BACKEND_URL;

const MANGO_BANNER = 'https://customer-assets.emergentagent.com/job_ca7a3b6a-e4a4-4b10-b689-83baf03b0d17/artifacts/064mwbpq_file_0000000024f8720b879ea12f0fb0260a%20%281%29.png';
const PROTON_BANNER = 'https://customer-assets.emergentagent.com/job_ca7a3b6a-e4a4-4b10-b689-83baf03b0d17/artifacts/1kqw40m7_file_00000000052c720b9c134b068233307a%20%281%29.png';
const NEXUGENE_BANNER = 'https://customer-assets.emergentagent.com/job_ca7a3b6a-e4a4-4b10-b689-83baf03b0d17/artifacts/d18ls975_file_00000000b5dc720bb60b795dc53d2fba%20%281%29.png';
const HERO_DESIGN = 'https://customer-assets.emergentagent.com/job_ca7a3b6a-e4a4-4b10-b689-83baf03b0d17/artifacts/9i9088th_file_00000000fef071faaaf760a0a10a356a.png';

const divisions = [
  {
    id: 'mango',
    name: 'Mango Health Labs',
    path: '/mango',
    banner: MANGO_BANNER,
    features: ['Pathology', 'Biochemistry', 'Microbiology'],
    icon: Microscope,
    accent: '#F59E0B',
    cardBg: 'linear-gradient(145deg, rgba(245,158,11,0.06) 0%, rgba(15,23,42,0.95) 50%, rgba(11,18,32,1) 100%)',
    cardBorder: 'rgba(245,158,11,0.15)',
    btnGradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
  },
  {
    id: 'proton',
    name: 'Proton Diagnostics',
    path: '/mango/ultrasound',
    banner: PROTON_BANNER,
    features: ['Ultrasonography', 'ECG', 'Cardiac Diagnostics'],
    icon: Radio,
    accent: '#0D9488',
    cardBg: 'linear-gradient(145deg, rgba(13,148,136,0.06) 0%, rgba(15,23,42,0.95) 50%, rgba(11,18,32,1) 100%)',
    cardBorder: 'rgba(13,148,136,0.15)',
    btnGradient: 'linear-gradient(135deg, #14B8A6, #0D9488)',
  },
  {
    id: 'nexugene',
    name: 'Nexugene Genomics',
    path: '/nexugene',
    banner: NEXUGENE_BANNER,
    features: ['Prenatal', 'Cancer Genomics', 'Pharmacogenomics'],
    icon: Dna,
    accent: '#7C3AED',
    textColor: '#C4B5FD',
    cardBg: 'linear-gradient(145deg, rgba(124,58,237,0.06) 0%, rgba(15,23,42,0.95) 50%, rgba(11,18,32,1) 100%)',
    cardBorder: 'rgba(124,58,237,0.15)',
    btnGradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
  },
];

const TRUST_STATS = [
  { value: '1L+', label: 'Tests Done', icon: FlaskConical, color: '#F97316', gradBg: 'linear-gradient(180deg, rgba(249,115,22,0.18) 0%, rgba(249,115,22,0.05) 100%)', border: 'rgba(249,115,22,0.35)' },
  { value: 'NABL', label: 'Certified', icon: BadgeCheck, color: '#22C55E', gradBg: 'linear-gradient(180deg, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0.05) 100%)', border: 'rgba(34,197,94,0.35)' },
  { value: '24h', label: 'Reports', icon: Clock, color: '#06B6D4', gradBg: 'linear-gradient(180deg, rgba(6,182,212,0.18) 0%, rgba(6,182,212,0.05) 100%)', border: 'rgba(6,182,212,0.35)' },
  { value: 'Free', label: 'Home Visit', icon: Truck, color: '#A855F7', gradBg: 'linear-gradient(180deg, rgba(168,85,247,0.18) 0%, rgba(168,85,247,0.05) 100%)', border: 'rgba(168,85,247,0.35)' },
];

const LabBrandCard = ({ d, navigate }) => (
  <button
    onClick={() => { mediumTap(); navigate(d.path); }}
    className="w-full rounded-[22px] mb-4 overflow-hidden active:scale-[0.98] transition-all duration-300 text-left group"
    style={{
      background: d.cardBg,
      border: `1.5px solid ${d.cardBorder}`,
      boxShadow: `0 4px 30px rgba(0,0,0,0.3), inset 0 1px 0 ${d.cardBorder}`,
    }}
    data-testid={`labs-card-${d.id}`}
  >
    <div className="w-full h-48 relative overflow-hidden rounded-t-[20px]">
      <img
        src={d.banner}
        alt={d.name}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
      />
    </div>
    <div className="px-4 py-3.5">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {d.features.map((f, i) => (
          <span
            key={i}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: `${d.accent}18`, color: d.textColor || d.accent, border: `1px solid ${d.accent}30` }}
          >
            {f}
          </span>
        ))}
      </div>
      <div className="h-px w-full mb-3" style={{ background: `${d.accent}15` }} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <d.icon className="w-4 h-4" style={{ color: d.accent }} />
          <span className="text-xs font-medium" style={{ color: d.textColor || d.accent }}>Explore Services</span>
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

const NevikaLabs = () => {
  const navigate = useNavigate();
  const [showTutorial, setShowTutorial] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/health-packages/all`)
      .then(r => r.ok ? r.json() : { packages: [] })
      .then(d => setPackages((d.packages || []).slice(0, 4)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      fetch(`${API}/api/mango/test-catalog?search=${encodeURIComponent(searchQuery)}&limit=8`)
        .then(r => r.ok ? r.json() : { tests: [] })
        .then(d => setSearchResults(d.tests || []))
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0B1220 0%, #0F172A 100%)' }} data-testid="nevika-labs-page">
      <ServiceHeader />

      {/* ===== PREMIUM HERO — Smart Diagnostics Hub ===== */}
      <div className="relative px-5 pt-6 pb-2 text-center">
        {/* Radial glow behind CTA area */}
        <div className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-[340px] h-[200px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(0,212,255,0.08) 0%, rgba(34,197,94,0.04) 40%, transparent 70%)' }} />

        {/* Nevika Cura Logo — Icon + Colored Text */}
        <div className="flex items-center justify-center gap-2.5 mb-6" data-testid="hero-logo">
          <img src="/nevika-light-logo.png" alt="" className="h-10 w-10" />
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-black tracking-tight" style={{ color: '#22C55E', fontFamily: 'Outfit, sans-serif' }}>Nevika</span>
            <span className="text-xl font-black tracking-tight" style={{ color: '#F97316', fontFamily: 'Outfit, sans-serif' }}>Cura</span>
          </div>
        </div>

        {/* Main Title — SINGLE LINE */}
        <h1
          className="text-[28px] sm:text-[36px] font-black text-white leading-[1.1] tracking-tight mb-3"
          style={{ fontFamily: 'Outfit, sans-serif' }}
          data-testid="lab-services-hub-title"
        >
          Smart Diagnostics Hub
        </h1>

        {/* Subtext */}
        <p className="text-[13px] text-white/55 mb-7" data-testid="hero-subtext">
          NABL certified labs &bull; Reports in 24 hrs &bull; Free home collection
        </p>

        {/* Primary CTA — Gradient Pill Button */}
        <button
          onClick={() => { mediumTap(); navigate('/mango'); }}
          className="relative mx-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full text-white font-bold text-base active:scale-[0.96] transition-all mb-7"
          style={{
            background: 'linear-gradient(135deg, #00D4FF 0%, #22C55E 100%)',
            boxShadow: '0 0 30px rgba(0,212,255,0.3), 0 4px 20px rgba(34,197,94,0.25)',
          }}
          data-testid="find-tests-cta"
        >
          <Search className="w-5 h-5" />
          Find Tests Now
        </button>

        {/* Glassmorphism Search Bar */}
        <div className="relative mb-6" data-testid="labs-search">
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Search className="w-4 h-4 text-white/35 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              placeholder="Search tests, profiles, packages..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
              data-testid="labs-search-input"
            />
            {searchQuery ? (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="text-white/40 text-xs font-medium" data-testid="labs-search-clear">Clear</button>
            ) : (
              <Mic className="w-4 h-4 text-white/25 flex-shrink-0" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50" style={{ background: 'rgba(11,18,32,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }} data-testid="labs-search-results">
              {searchResults.map((test, i) => (
                <button key={i} onClick={() => { setShowSearch(false); setSearchQuery(''); navigate('/mango'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  data-testid={`labs-search-result-${i}`}
                >
                  <FlaskConical className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{test.name}</p>
                    <p className="text-white/30 text-[10px]">{test.category}</p>
                  </div>
                  {test.price > 0 && <span className="text-cyan-400 text-xs font-bold">₹{test.price}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Trust Stats — Colorful Individual Cards */}
        <div className="grid grid-cols-4 gap-2 mb-2" data-testid="labs-trust-stats">
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

      {/* How to Book — Detailed Two-Row Card */}
      <div className="px-5 py-3 relative z-10">
        <button
          onClick={() => setShowTutorial(true)}
          className="w-full rounded-2xl overflow-hidden active:scale-[0.98] transition-all text-left"
          style={{ background: 'linear-gradient(145deg, rgba(0,212,255,0.1) 0%, rgba(34,197,94,0.08) 100%)', border: '1.5px solid rgba(34,197,94,0.2)' }}
          data-testid="how-to-book-banner"
        >
          {/* Top row */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #00D4FF, #22C55E)' }}>
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <span className="text-base font-bold text-white block">How to Book</span>
              <span className="text-[11px] text-white/50">Book lab tests in 3 simple steps</span>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
              <ChevronRight className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          {/* Bottom row — 3 step cards */}
          <div className="flex gap-2 px-4 pb-4 pt-2">
            <div className="flex-1 rounded-xl py-2.5 px-2 text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.12)' }}>
              <Search className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
              <span className="text-[10px] font-semibold text-white/70 block leading-tight">Search<br/>Test</span>
            </div>
            <div className="flex-1 rounded-xl py-2.5 px-2 text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.12)' }}>
              <BadgeCheck className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
              <span className="text-[10px] font-semibold text-white/70 block leading-tight">Select &<br/>Book</span>
            </div>
            <div className="flex-1 rounded-xl py-2.5 px-2 text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.12)' }}>
              <Truck className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
              <span className="text-[10px] font-semibold text-white/70 block leading-tight">Home<br/>Collection</span>
            </div>
          </div>
        </button>
      </div>

      {/* ===== 3 LAB BRAND CARDS ===== */}
      <div className="px-5 pb-5 relative z-10">
        <h2 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="our-labs-heading">Our Labs</h2>
        {divisions.map((d) => (
          <LabBrandCard key={d.id} d={d} navigate={navigate} />
        ))}
      </div>

      {/* Health Packages — Horizontal Scroller */}
      {packages.length > 0 && (
        <div className="pb-5 relative z-10" data-testid="health-packages-section">
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Health Packages</h2>
            <button onClick={() => navigate('/mango')} className="text-[10px] text-cyan-400 font-semibold flex items-center gap-0.5" data-testid="packages-see-all">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => navigate('/mango')}
                className="flex-shrink-0 w-[260px] rounded-2xl p-4 cursor-pointer active:scale-[0.97] transition-all"
                style={{
                  scrollSnapAlign: 'start',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                data-testid={`health-package-${pkg.id}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-white text-sm font-bold leading-tight">{pkg.name}</span>
                </div>
                <p className="text-white/55 text-[11px] mb-3 line-clamp-2">{pkg.description}</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-cyan-400 text-lg font-black">₹{pkg.discounted_price}</span>
                  <span className="text-white/35 text-xs line-through">₹{pkg.original_price}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">{pkg.discount_percent}% OFF</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {pkg.tests?.slice(0, 3).map((t, i) => (
                    <span key={i} className="text-[8px] text-white/50 px-1.5 py-0.5 rounded bg-white/[0.07]">{t}</span>
                  ))}
                  {pkg.tests?.length > 3 && (
                    <span className="text-[8px] text-cyan-400/70 px-1.5 py-0.5">+{pkg.tests.length - 3} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Branding */}
      <div className="px-5 pb-20 relative z-10">
        <div className="flex items-center gap-3 pt-1 pb-2">
          <div className="flex-1 h-px bg-white/6" />
          <span className="text-[9px] text-white/15 font-medium tracking-widest uppercase whitespace-nowrap">A Nevika Cura Company</span>
          <div className="flex-1 h-px bg-white/6" />
        </div>
      </div>

      <MangoTutorial open={showTutorial} onClose={() => setShowTutorial(false)} />
    </div>
  );
};

export default NevikaLabs;
