import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Activity, Droplets, ChevronRight, Sparkles } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import ServiceSplash from '@/components/ServiceSplash';
import EverCareHero3D from '@/components/EverCareHero3D';

const EVERCARE_IMG = 'https://customer-assets.emergentagent.com/job_1f5135b8-cca0-4052-82b8-b16fa292181e/artifacts/9z5kspuq_file_00000000add472089b2919c4975a2390%20%282%29.png';

const SERVICES = [
  { id: 'diabetes', label: 'Diabetes Management', desc: 'Blood sugar monitoring, diet plans & insulin guidance', icon: Droplets, color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' },
  { id: 'hypertension', label: 'Hypertension Care', desc: 'BP monitoring, medication management & lifestyle coaching', icon: Activity, color: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444, #DC2626)' },
  { id: 'thyroid', label: 'Thyroid Care', desc: 'Thyroid function monitoring, medication tracking & follow-ups', icon: Heart, color: '#A855F7', gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)' },
];

const Evercare = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('splash');

  /* ==================== SPLASH VIEW ==================== */
  if (view === 'splash') {
    return (
      <ServiceSplash
        heroComponent={<EverCareHero3D />}
        imageAlt="Nevika Evercare"
        caption="Long-Term Care, Made Simple"
        description="Doctor guided, nurse supported home-based care programs for diabetes, hypertension & thyroid."
        buttonGradient="linear-gradient(135deg, #7C3AED, #A855F7)"
        bgGradient="linear-gradient(160deg, #FDF2F8 0%, #FCE7F3 40%, #FFF5F7 100%)"
        accentColor="#EC4899"
        onContinue={() => setView('main')}
        testId="evercare-splash"
      />
    );
  }

  /* ==================== MAIN VIEW ==================== */
  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(180deg, #F5F3FF 0%, #FFFFFF 40%)' }} data-testid="evercare-main">
      <div className="px-4 pt-12 pb-2">
        <button onClick={() => setView('splash')} className="flex items-center gap-2 text-sm text-gray-400 mb-4" data-testid="evercare-back-btn">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-3 mb-5">
          <img src={EVERCARE_IMG} alt="Nevika Evercare" className="w-14 h-14 rounded-2xl object-cover" style={{ boxShadow: '0 4px 12px rgba(139,92,246,0.2)' }} />
          <div>
            <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Nevika Evercare</h1>
            <p className="text-gray-400 text-xs mt-0.5">Doctor Guided &middot; Nurse Supported</p>
          </div>
        </div>
      </div>

      {/* Tagline Card */}
      <div className="px-4 mb-5">
        <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(139,92,246,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <p className="text-sm font-bold text-gray-900">Home Based Care Programs</p>
          <p className="text-xs text-gray-400 mt-1">Ongoing care for chronic condition patients</p>
        </div>
      </div>

      {/* Services */}
      <div className="px-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Our Care Programs</p>
        <div className="space-y-3">
          {SERVICES.map((svc) => (
            <div key={svc.id} className="rounded-2xl p-4 active:scale-[0.98] transition-transform" style={{ background: svc.gradient, boxShadow: `0 4px 16px ${svc.color}25` }} data-testid={`evercare-service-${svc.id}`}>
              <div className="flex items-center gap-3.5 relative">
                <div className="absolute top-[-30%] right-[-10%] w-20 h-20 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                  <svc.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{svc.label}</p>
                  <p className="text-[11px] text-white/70 mt-0.5">{svc.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 mt-6">
        <button onClick={() => navigate('/health-plans')} className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-[0.97] transition-transform" style={{ background: 'linear-gradient(135deg, #7C3AED, #9333EA)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }} data-testid="evercare-book-plan-btn">
          Book Care Plan Now
        </button>
        <p className="text-center text-[10px] text-gray-400 mt-2">Our team will call you within 24 hours.</p>
      </div>

      <BottomNav />
    </div>
  );
};

export default Evercare;
