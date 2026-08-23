import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, Clock, Navigation, Moon, Sunrise, Sunset, AlertTriangle, ChevronRight, Brain, Sparkles, Footprints, Coins } from 'lucide-react';
import { certifications, clinicLocations } from '@/data/homeData';

// Clinic Locations Section
export const ClinicLocations = () => {
  return (
    <div className="mb-0" data-testid="clinic-locations">
      <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5 lt-text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <MapPin className="w-3.5 h-3.5 text-teal-400" />
        Visit Us
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollSnapType: 'x mandatory' }}>
        {clinicLocations.map((clinic) => (
          <a
            key={clinic.id}
            href={clinic.mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-[75%] glass-card rounded-2xl p-3.5 transition-all"
            style={{ scrollSnapAlign: 'start' }}
          >
            <p className="text-sm font-bold text-white mb-1.5">{clinic.name}</p>
            <div className="space-y-1 text-[12px]">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400/70 mt-0.5 flex-shrink-0" />
                <span className="text-white/70 leading-tight">{clinic.address}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <span className="text-white/90 font-semibold">{clinic.phone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400/70 flex-shrink-0" />
                <span className="text-white/60">{clinic.hours}</span>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-teal-400 text-[11px] font-semibold">
              <Navigation className="w-3 h-3" /> Get Directions
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

// Stats Bar
export const StatsBar = () => (
  <div className="mb-6 text-center">
    <p className="text-white/80 text-[11px] font-medium">
      <span className="text-purple-400 font-bold">6+</span> Services &middot; <span className="text-blue-400 font-bold">2</span> Clinics &middot; <span className="text-orange-400 font-bold">4K+</span> Medicines &middot; <span className="text-pink-400 font-bold">100+</span> Lab Tests
    </p>
    <p className="text-white/50 text-[10px] mt-1">
      {certifications.map(c => c.name).join(' · ')}
    </p>
  </div>
);

// Ramadan Timings Card
export const RamadanCard = ({ ramadanToday }) => {
  if (!ramadanToday || new Date() > new Date('2026-03-20T23:59:59')) return null;

  return (
    <div
      className="mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900/50 to-teal-900/50 backdrop-blur-xl border border-emerald-500/30 shadow-xl"
      data-testid="ramadan-timings-card"
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-amber-500/20 to-transparent rounded-full -mr-16 -mt-16"></div>
      <div className="relative p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
              <Moon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Ramadan Mubarak</h3>
              <p className="text-emerald-200 text-sm">Day {ramadanToday.day} &middot; {new Date(ramadanToday.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
            </div>
          </div>
          <button className="text-xs text-amber-300 font-medium flex items-center gap-1">
            Ramadan Special
          </button>
        </div>
        <div className="flex gap-4">
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2"><Sunrise className="w-5 h-5 text-amber-300" /><span className="text-amber-200 text-sm font-medium">Sehri</span></div>
            <p className="text-3xl font-bold text-white">{ramadanToday.sehri}</p>
          </div>
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2"><Sunset className="w-5 h-5 text-orange-300" /><span className="text-orange-200 text-sm font-medium">Iftar</span></div>
            <p className="text-3xl font-bold text-white">{ramadanToday.iftar}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Emergency SOS Banner
export const EmergencySOSBanner = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/emergency-sos')}
      className="w-full rounded-2xl p-3.5 mb-6 text-left active:scale-[0.97] transition-all relative overflow-hidden flex items-center gap-3"
      style={{ background: 'linear-gradient(145deg, #DC2626, #991B1B)', boxShadow: '0 4px 20px rgba(239,68,68,0.2)' }}
      data-testid="home-emergency-banner"
    >
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
        <AlertTriangle className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-[12px] font-bold text-white">Emergency SOS</p>
        <p className="text-[9px] text-white/60">Call, WhatsApp, or share location instantly</p>
      </div>
      <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
    </button>
  );
};

// Health Insights + Steps Row
export const HealthInsightsRow = () => {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-2 gap-2.5 mb-5">
      <button
        onClick={() => navigate('/health-insights')}
        className="rounded-2xl p-3.5 text-left active:scale-[0.96] transition-all relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #7C3AED, #9333EA)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
        data-testid="home-health-insights"
      >
        <div className="absolute top-0 right-0 w-20 h-20 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.1), transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <Brain className="w-7 h-7 text-white/90 mb-2" />
        <p className="text-[12px] font-bold text-white leading-tight">Health Insights</p>
        <p className="text-[9px] text-white/60 mt-0.5 flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> AI-powered</p>
      </button>
      <button
        onClick={() => navigate('/health-streaks')}
        className="rounded-2xl p-3.5 text-left active:scale-[0.96] transition-all relative overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        data-testid="home-steps-counter"
      >
        <div className="flex items-center justify-between mb-1.5">
          <Footprints className="w-5 h-5 text-emerald-400" />
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Coins className="w-3 h-3 text-amber-400" />
            <span className="text-[8px] font-bold text-amber-400">+5</span>
          </div>
        </div>
        <p className="text-sm font-bold text-white">Health Streaks</p>
        <p className="text-[9px] text-white/40">Track activity & earn coins</p>
        <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: '0%' }} />
        </div>
        <p className="text-[8px] text-white/30 mt-1">Walk 5K steps = 5 CuraCoins</p>
      </button>
    </div>
  );
};
