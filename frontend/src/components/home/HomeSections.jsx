import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Sparkles, ChevronRight, CalendarCheck, Stethoscope, Baby } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import BottomSheet from '@/components/ui/BottomSheet';
import { ViewModeSettings } from '@/components/ViewModeSwitcher';

// Savings Counter Component
export const SavingsCounter = () => {
  const [savings, setSavings] = useState(0);
  const [animatedSavings, setAnimatedSavings] = useState(0);

  useEffect(() => {
    try {
      const orders = JSON.parse(localStorage.getItem('nc_order_savings') || '[]');
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthSavings = orders
        .filter(o => new Date(o.date) >= monthStart)
        .reduce((sum, o) => sum + (o.saved || 0), 0);
      const curaCoins = parseInt(localStorage.getItem('curaCoins') || '0');
      const totalSaved = monthSavings + Math.floor(curaCoins / 10);
      setSavings(totalSaved);
    } catch {
      setSavings(0);
    }
  }, []);

  useEffect(() => {
    if (savings === 0) return;
    const duration = 1200;
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedSavings(Math.round(savings * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [savings]);

  if (savings <= 0) return null;

  return (
    <div className="mb-5 rounded-2xl p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.12), rgba(34,197,94,0.06))', border: '1px solid rgba(34,197,94,0.15)' }} data-testid="savings-counter">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.08), transparent 70%)', transform: 'translate(30%, -30%)' }} />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.15)' }}>
          <Trophy className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-white text-xs font-semibold">You saved this month</p>
          <p className="text-emerald-400 text-xl font-black tabular-nums" data-testid="savings-amount">₹{animatedSavings}</p>
        </div>
        <div className="text-right">
          <p className="text-white/30 text-[9px]">with Nevika Cura</p>
          <p className="text-emerald-400/60 text-[10px] font-medium">Keep saving</p>
        </div>
      </div>
    </div>
  );
};

// Hero Carousel Component
export const HeroCarousel = () => {
  const [ncSlideIdx, setNcSlideIdx] = useState(0);
  const ncScrollRef = useRef(null);
  const NC_SLIDES = [
    'https://customer-assets.emergentagent.com/job_5f77c833-80cb-4ed5-a62e-988f56319661/artifacts/5z5syn4b_file_000000002950720ba511a3e03c294c08.png',
    'https://customer-assets.emergentagent.com/job_5f77c833-80cb-4ed5-a62e-988f56319661/artifacts/lrrshyj0_file_000000007c28720bbe027ed3564735ca.png',
    'https://customer-assets.emergentagent.com/job_5f77c833-80cb-4ed5-a62e-988f56319661/artifacts/g5zexbbc_file_00000000f82c720888e320c232edeebe.png',
    'https://customer-assets.emergentagent.com/job_5f77c833-80cb-4ed5-a62e-988f56319661/artifacts/wh6tw12k_file_0000000044b47208a2c6734ad4006f31.png',
  ];

  useEffect(() => {
    const el = ncScrollRef.current;
    if (!el) return;
    const timer = setInterval(() => {
      const next = (ncSlideIdx + 1) % NC_SLIDES.length;
      el.scrollTo({ left: next * el.offsetWidth, behavior: 'smooth' });
    }, 4000);
    return () => clearInterval(timer);
  }, [ncSlideIdx, NC_SLIDES.length]);

  return (
    <div className="mb-5" data-testid="nevika-cura-ad-banner">
      <div
        ref={ncScrollRef}
        onScroll={() => { const el = ncScrollRef.current; if (el) setNcSlideIdx(Math.round(el.scrollLeft / el.offsetWidth)); }}
        className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory"
      >
        {NC_SLIDES.map((src, i) => (
          <div key={i} className="flex-shrink-0 w-full rounded-2xl overflow-hidden snap-start relative">
            <img src={src} alt="" className="w-full h-auto" loading="lazy" style={{ objectFit: 'cover' }} />
            <div className="absolute inset-0 flex items-end" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 60%)' }}>
              <div className="p-4 w-full">
                <p className="text-white text-sm font-bold leading-tight">{
                  ['Free delivery on orders above ₹999', 'Flat 15% off on first medicine order', 'Lab tests at home — Book now', 'CuraOne members save up to 25%'][i] || ''
                }</p>
                <p className="text-white/60 text-[10px] mt-0.5">{
                  ['Use code NEVIKA999', 'ORANGE15 at checkout', 'Home collection free', 'Join today at ₹199/yr'][i] || ''
                }</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 mt-2">
        {NC_SLIDES.map((_, i) => (
          <div key={i} className={`rounded-full transition-all duration-300 ${i === ncSlideIdx ? 'w-5 h-[6px] bg-white/50' : 'w-[6px] h-[6px] bg-white/15'}`} />
        ))}
      </div>
    </div>
  );
};

// Cura Services Grid (2x2 image cards)
export const CuraServicesGrid = () => {
  const navigate = useNavigate();
  const cards = [
    { path: '/home-care', img: 'https://customer-assets.emergentagent.com/job_77835158-0b09-4cf1-8493-3090799fd646/artifacts/24ws4byt_file_00000000e37c720bba2f8a6f3446e133%20%282%29.png', alt: 'Nevika Home Care', testId: 'home-home-care' },
    { path: '/medicine-reminders', img: 'https://customer-assets.emergentagent.com/job_77835158-0b09-4cf1-8493-3090799fd646/artifacts/hseu8hof_file_00000000dd7c720bbe04af67aac000e1%20%281%29.png', alt: 'Medicine Reminders', testId: 'home-medicine-reminders' },
    { path: '/evercare', img: 'https://customer-assets.emergentagent.com/job_77835158-0b09-4cf1-8493-3090799fd646/artifacts/t3h4yt91_file_000000005f18720b95a81f7289f3148d%20%281%29.png', alt: 'Nevika Evercare', testId: 'home-evercare' },
    { path: '/adult-vaccination', img: 'https://customer-assets.emergentagent.com/job_77835158-0b09-4cf1-8493-3090799fd646/artifacts/z88ih64g_file_00000000bb80720bab4498e89b4a0f98%20%281%29.png', alt: 'Adult Vaccination', testId: 'home-vaccination' },
  ];

  return (
    <div className="mb-5" data-testid="cura-services-section">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0D9488, #14B8A6)' }}>
          <Sparkles className="w-2.5 h-2.5 text-white" />
        </div>
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Nevika Cura Services</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <button
            key={card.path}
            onClick={() => navigate(card.path)}
            className="rounded-2xl overflow-hidden active:scale-[0.96] transition-transform duration-200"
            style={{ border: '2px solid rgba(255,255,255,0.2)', backgroundColor: '#e4ecf4' }}
            data-testid={card.testId}
          >
            <img src={card.img} alt={card.alt} className="w-full h-auto" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </div>
  );
};

// Quick Access Grid (4 columns)
export const QuickAccessGrid = () => {
  const navigate = useNavigate();
  const items = [
    { path: '/appointment-calendar', icon: CalendarCheck, label: 'Calendar', color: '#14B8A6' },
    { path: '/queue', icon: () => <svg className="w-5 h-5" style={{ color: '#3B82F6' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, label: 'Live Queue', color: '#3B82F6' },
    { path: '/prescriptions', icon: () => <svg className="w-5 h-5" style={{ color: '#F97316' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>, label: 'My Rx', color: '#F97316' },
    { path: '/my-orders', icon: () => <svg className="w-5 h-5" style={{ color: '#A855F7' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>, label: 'Orders', color: '#A855F7' },
  ];

  return (
    <div className="mb-6" data-testid="for-you-section">
      <div className="grid grid-cols-4 gap-2.5">
        {items.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="rounded-2xl py-3.5 px-1 text-center active:scale-[0.93] transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
            data-testid={`quick-${item.path.slice(1)}`}
          >
            <div className="w-10 h-10 mx-auto rounded-2xl flex items-center justify-center mb-1.5"
              style={{ background: `${item.color}18`, border: `1px solid ${item.color}25` }}>
              {typeof item.icon === 'function' ? <item.icon /> : <item.icon className="w-5 h-5" style={{ color: item.color }} />}
            </div>
            <p className="text-[10px] font-semibold text-white/90 leading-tight">{item.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

// Booking Bottom Sheets
export const BookingBottomSheets = ({ showSettings, setShowSettings, showBookingModal, setShowBookingModal }) => {
  const navigate = useNavigate();

  return (
    <>
      <BottomSheet open={showSettings} onClose={() => setShowSettings(false)} title="Settings">
        <ViewModeSettings />
      </BottomSheet>
      <BottomSheet open={showBookingModal} onClose={() => setShowBookingModal(false)} title="Book Now">
        <div className="space-y-3 pt-1">
          <button
            onClick={() => { setShowBookingModal(false); navigate('/diagyn'); }}
            className="w-full p-4 glass-card-tint-teal rounded-2xl flex items-center gap-4 transition-all group active:scale-[0.98]"
            data-testid="book-doctor-btn"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold text-white">Doctor Appointment</h3>
              <p className="text-sm text-white/40">Consult with our specialists</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => { setShowBookingModal(false); navigate('/diagyn?service=sonography'); }}
            className="w-full p-4 glass-card rounded-2xl flex items-center gap-4 transition-all group active:scale-[0.98]"
            data-testid="book-sonography-btn"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Baby className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold text-white">Sonography</h3>
              <p className="text-sm text-white/40">Ultrasound & imaging scans</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </BottomSheet>
    </>
  );
};
