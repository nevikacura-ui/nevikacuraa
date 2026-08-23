import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Layers, Sparkles, ShieldCheck, TrendingUp, Users, Pill, Syringe, Crown, Activity, AlertTriangle } from 'lucide-react';
import ServiceHeader from '@/components/ServiceHeader';
import BottomNav from '@/components/BottomNav';
import OrderAgainSection from '@/components/OrderAgainSection';

const portals = [
  {
    id: 'evara', name: 'Evara', tagline: "Women's Health & Gynaecology",
    tags: ['Prenatal Care', 'Fertility', 'Gynaec Consult'], path: '/evara',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 40%, #C084FC 100%)',
    glowColor: '#A855F7',
    logo: '/icons/evara-logo.png', logoScale: 1.2,
  },
  {
    id: 'glydex', name: 'Glydex', tagline: 'Diabetes Care & Monitoring',
    tags: ['Sugar Tracking', 'Diet Plans', 'HbA1c Reports'], path: '/glydex',
    gradient: 'linear-gradient(135deg, #4338CA 0%, #6366F1 40%, #818CF8 100%)',
    glowColor: '#6366F1',
    logo: 'https://customer-assets.emergentagent.com/job_healthhelper-7/artifacts/u2dcjapg_file_00000000c85c7209b181fb96372c6521.png', logoScale: 1.3,
  },
  {
    id: 'reneu', name: 'Reneu', tagline: 'Wellness & Fitness',
    tags: ['Nutrition Plans', 'Yoga', 'Mental Wellness'], path: '/reneu',
    gradient: 'linear-gradient(135deg, #047857 0%, #059669 40%, #34D399 100%)',
    glowColor: '#10B981',
    logo: 'https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/uy8wpc27_file_00000000caf871fdae54ae4c4854bbd4.png',
  },
  {
    id: 'alyne', name: 'ALYNE', tagline: 'Kids & Paediatric Health',
    tags: ['Vaccination', 'Growth Tracking', 'Paediatric Care'], path: '/alyne',
    gradient: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 40%, #60A5FA 100%)',
    glowColor: '#3B82F6',
    logo: 'https://customer-assets.emergentagent.com/job_alynehealth/artifacts/llhgc3hn_Blue%20White%20Professional%20Minimal%20Brand%20Logo_20260114_042449_0002.png', logoScale: 1.3,
  },
];

const tutorialSteps = [
  { icon: ShieldCheck, title: 'Specialized Care', desc: 'Each portal is designed for a specific health need with expert guidance.' },
  { icon: TrendingUp, title: 'Track Progress', desc: 'Monitor your health journey with personalized dashboards and insights.' },
  { icon: Users, title: 'Expert Network', desc: 'Connect with specialists across gynaecology, diabetes, paediatrics & more.' },
];

const servicePortals = [
  {
    id: 'medicine-reminders', name: 'Medicine Reminders', tagline: 'Never miss a dose',
    path: '/medicine-reminders',
    gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    Icon: Pill,
  },
  {
    id: 'vaccination', name: 'Vaccination', tagline: 'Adult vaccines',
    path: '/adult-vaccination',
    gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
    Icon: Syringe,
  },
  {
    id: 'health-plans', name: 'Health Plans', tagline: 'Care packages',
    path: '/health-plans',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    Icon: Crown,
  },
  {
    id: 'home-care', name: 'Home Care', tagline: 'Nursing & Physio',
    path: '/home-care',
    gradient: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
    Icon: Activity,
  },
  {
    id: 'emergency', name: 'Emergency', tagline: 'SOS & Alerts',
    path: '/emergency-sos',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    Icon: AlertTriangle,
  },
];

const Portals = () => {
  const navigate = useNavigate();
  const [tutorialStep, setTutorialStep] = useState(0);
  const StepIcon = tutorialSteps[tutorialStep].icon;

  return (
    <div className="min-h-screen" style={{ background: '#07070f' }} data-testid="portals-page">
      <style>{`
        @keyframes ptFade { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glowPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .pt-anim { animation: ptFade 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .glow-pulse { animation: glowPulse 3s ease-in-out infinite; }
      `}</style>
      <ServiceHeader />
      
      <main className="max-w-lg mx-auto px-4 py-5 pb-24">
        {/* Header */}
        <div className="pt-anim mb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
              <Layers className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-[10px] font-bold text-indigo-300/50 uppercase tracking-[0.2em]" style={{ fontFamily: 'Manrope, sans-serif' }}>Nevika Cura</p>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Health <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #A78BFA, #C084FC, #E9D5FF)' }}>Portals</span>
          </h1>
          <p className="text-xs text-white/30 mt-1">Specialized care for every health journey</p>
        </div>

        {/* Tutorial Hero — Glassmorphic */}
        <div 
          className="pt-anim mb-7 rounded-3xl p-5 relative overflow-hidden backdrop-blur-xl" 
          style={{ 
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.08) 50%, rgba(99,102,241,0.05) 100%)', 
            border: '1px solid rgba(99,102,241,0.2)',
            boxShadow: '0 8px 32px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
            animationDelay: '80ms',
          }} 
          data-testid="portal-tutorial"
        >
          {/* Animated glow orbs */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full glow-pulse" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full glow-pulse" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)', transform: 'translate(-20%, 20%)', animationDelay: '1.5s' }} />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.2)' }}>
                <StepIcon className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-[10px] font-bold text-indigo-300/60 uppercase tracking-[0.15em]">How Portals Work</p>
            </div>

            <div className="min-h-[56px]">
              <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {tutorialSteps[tutorialStep].title}
              </h3>
              <p className="text-xs text-white/40 mt-1.5 leading-relaxed">
                {tutorialSteps[tutorialStep].desc}
              </p>
            </div>

            <div className="flex items-center gap-2 mt-4">
              {tutorialSteps.map((_, i) => (
                <button key={i} onClick={() => setTutorialStep(i)} data-testid={`tutorial-step-${i}`}>
                  <div className="rounded-full transition-all duration-300" style={{
                    width: tutorialStep === i ? 24 : 7, height: 7,
                    background: tutorialStep === i ? 'linear-gradient(90deg, #818CF8, #A78BFA)' : 'rgba(129,140,248,0.15)',
                    boxShadow: tutorialStep === i ? '0 0 12px rgba(129,140,248,0.4)' : 'none',
                  }} />
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={() => setTutorialStep(p => (p + 1) % 3)}
                className="text-[10px] font-bold text-indigo-300/50 hover:text-indigo-300 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-500/10"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Order Again Section */}
        <OrderAgainSection />

        {/* Portal Cards — Premium Glassmorphic */}
        <div className="space-y-4">
          {portals.map((portal, idx) => (
            <button
              key={portal.id}
              onClick={() => navigate(portal.path)}
              className="pt-anim w-full rounded-3xl overflow-hidden active:scale-[0.97] transition-all duration-300 relative group text-left"
              style={{ animationDelay: `${180 + idx * 80}ms` }}
              data-testid={`portal-${portal.id}`}
            >
              {/* Gradient background */}
              <div className="absolute inset-0" style={{ background: portal.gradient, opacity: 0.85 }} />
              
              {/* Glassmorphic overlay */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.15) 100%)' }} />
              
              {/* Glow effect on press */}
              <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity duration-200" style={{ background: `radial-gradient(ellipse at 70% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)` }} />
              
              {/* Decorative circles */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />

              {/* Shimmer on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity overflow-hidden">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', animation: 'shimmer 2s ease-in-out' }} />
              </div>

              <div className="relative flex items-center min-h-[120px] p-1.5">
                {/* Logo section */}
                <div className="w-28 h-[108px] rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden" 
                  style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  {portal.logo ? (
                    <img 
                      src={portal.logo} 
                      alt={portal.name} 
                      className="h-full w-full object-cover" 
                      style={{ transform: `scale(${portal.logoScale || 1})` }} 
                    />
                  ) : (
                    <span className="text-5xl font-black text-white/70" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {portal.name.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 px-4 py-3">
                  <h3 className="text-lg font-extrabold text-white leading-tight tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                    {portal.name}
                  </h3>
                  <p className="text-[11px] mt-1 text-white/70 font-medium">{portal.tagline}</p>
                  
                  {/* Service tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {portal.tags.map((tag, i) => (
                      <span 
                        key={i} 
                        className="px-2 py-0.5 rounded-full text-[8px] font-semibold text-white/80 uppercase tracking-wider"
                        style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="pr-3 flex-shrink-0">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-active:scale-90" 
                    style={{ 
                      background: 'rgba(255,255,255,0.15)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(4px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  >
                    <ChevronRight className="w-5 h-5 text-white/90" />
                  </div>
                </div>
              </div>

              {/* Bottom accent line */}
              <div className="h-[2px] mx-4 mb-1 rounded-full" style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)` }} />
            </button>
          ))}
        </div>

        {/* Nevika Cura Services */}
        <div className="mt-8 mb-6">
          <div className="pt-anim flex items-center gap-2 mb-3" style={{ animationDelay: '500ms' }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0D9488, #14B8A6)' }}>
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]">Nevika Cura Services</p>
          </div>
          <div className="grid grid-cols-3 gap-2.5 mb-2.5">
            {servicePortals.slice(0, 3).map((sp, idx) => (
              <button
                key={sp.id}
                onClick={() => navigate(sp.path)}
                className="pt-anim rounded-2xl p-3 text-center active:scale-[0.95] transition-all relative overflow-hidden group"
                style={{ animationDelay: `${560 + idx * 60}ms` }}
                data-testid={`service-portal-${sp.id}`}
              >
                <div className="absolute inset-0" style={{ background: sp.gradient, opacity: 0.85 }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.1) 100%)' }} />
                <div className="relative z-10">
                  <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2" style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <sp.Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-bold text-white">{sp.name}</p>
                  <p className="text-[8px] text-white/60 mt-0.5">{sp.tagline}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {servicePortals.slice(3).map((sp, idx) => (
              <button
                key={sp.id}
                onClick={() => navigate(sp.path)}
                className="pt-anim rounded-2xl p-3 text-center active:scale-[0.95] transition-all relative overflow-hidden group"
                style={{ animationDelay: `${740 + idx * 60}ms` }}
                data-testid={`service-portal-${sp.id}`}
              >
                <div className="absolute inset-0" style={{ background: sp.gradient, opacity: 0.85 }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.1) 100%)' }} />
                <div className="relative z-10">
                  <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2" style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <sp.Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-bold text-white">{sp.name}</p>
                  <p className="text-[8px] text-white/60 mt-0.5">{sp.tagline}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-anim text-center mt-8" style={{ animationDelay: '700ms' }}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <a href="/return-refund-policy" className="text-[9px] text-white/20 hover:text-orange-400 transition-colors" data-testid="portal-return-policy">Return & Refund Policy</a>
            <span className="text-white/10">|</span>
            <a href="/terms" className="text-[9px] text-white/20 hover:text-orange-400 transition-colors">Terms</a>
            <span className="text-white/10">|</span>
            <a href="/privacy-policy" className="text-[9px] text-white/20 hover:text-orange-400 transition-colors">Privacy</a>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
            <span className="text-[8px] text-white/15 font-medium tracking-[0.25em] uppercase">A Nevika Cura Health Company</span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Portals;
