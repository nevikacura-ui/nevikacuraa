import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, ChevronRight, Activity, HeartPulse, Apple, Stethoscope, Brain, Baby, Dumbbell, Heart, Users, Bone, Wind, MessageSquare, Syringe, UserCheck, Shield, Clock, Star, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import ServiceSplash from '@/components/ServiceSplash';
import HomeCareHero3D from '@/components/HomeCareHero3D';

const API = process.env.REACT_APP_BACKEND_URL;

const SPLASH_IMG = 'https://customer-assets.emergentagent.com/job_1f5135b8-cca0-4052-82b8-b16fa292181e/artifacts/oci7nm4i_file_00000000add472089b2919c4975a2390%20%283%29.png';
const SERVICES_BANNER = 'https://customer-assets.emergentagent.com/job_1f5135b8-cca0-4052-82b8-b16fa292181e/artifacts/5cqnx2yk_file_0000000015747208a7481de740314ee9.png';
const PHYSIO_HEADER = 'https://customer-assets.emergentagent.com/job_1f5135b8-cca0-4052-82b8-b16fa292181e/artifacts/8omeqzxr_Screenshot_20260331-085711.png';
const NURSING_HEADER = 'https://images.pexels.com/photos/7345474/pexels-photo-7345474.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940';
const DIETICIAN_HEADER = 'https://images.pexels.com/photos/15319019/pexels-photo-15319019.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940';

const PHYSIO_SERVICES = [
  { id: 'musculoskeletal', name: 'Musculoskeletal', desc: 'Joint & muscle pain relief', icon: Bone, color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', img: 'https://images.unsplash.com/photo-1649751361457-01d3a696c7e6?w=400&h=300&fit=crop' },
  { id: 'neurological', name: 'Neurological', desc: 'Stroke & nerve recovery', icon: Brain, color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', img: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&h=300&fit=crop' },
  { id: 'sports', name: 'Sports Rehab', desc: 'Sports injury recovery', icon: Dumbbell, color: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444, #DC2626)', img: 'https://images.pexels.com/photos/7187821/pexels-photo-7187821.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },
  { id: 'cardiorespiratory', name: 'Cardiorespiratory', desc: 'Heart & lung rehab', icon: Wind, color: '#0D9488', gradient: 'linear-gradient(135deg, #0D9488, #0F766E)', img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop' },
  { id: 'paediatric', name: 'Paediatric', desc: 'Child development therapy', icon: Baby, color: '#F97316', gradient: 'linear-gradient(135deg, #F97316, #EA580C)', img: 'https://images.unsplash.com/photo-1709127347884-a106974ef58d?w=400&h=300&fit=crop' },
  { id: 'geriatric', name: 'Geriatric', desc: 'Elderly mobility care', icon: Users, color: '#6366F1', gradient: 'linear-gradient(135deg, #6366F1, #4F46E5)', img: 'https://images.unsplash.com/photo-1773227060944-dc7b00b09ae2?w=400&h=300&fit=crop' },
  { id: 'womens_health', name: "Women's Health", desc: 'Pre/postnatal & pelvic floor', icon: Heart, color: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899, #DB2777)', img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop' },
  { id: 'speech', name: 'Speech & Language', desc: 'Communication therapy', icon: MessageSquare, color: '#14B8A6', gradient: 'linear-gradient(135deg, #14B8A6, #0D9488)', img: 'https://images.unsplash.com/photo-1772419130717-e0630e3e4f28?w=400&h=300&fit=crop' },
];

const NURSING_SERVICES = [
  { id: 'wound', name: 'Wound Care', desc: 'Post-surgery dressing & care', icon: HeartPulse, color: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444, #DC2626)' },
  { id: 'iv_injection', name: 'IV / Injection', desc: 'IM/IV injections at home', icon: Syringe, color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
  { id: 'vitals', name: 'Vitals Monitoring', desc: 'BP, sugar, SpO2 checks', icon: Activity, color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' },
  { id: 'elder_care', name: 'Elder Care', desc: 'Daily assistance & companionship', icon: UserCheck, color: '#0D9488', gradient: 'linear-gradient(135deg, #0D9488, #0F766E)' },
  { id: 'postpartum', name: 'Post-Partum Care', desc: 'Mother & newborn support', icon: Heart, color: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899, #DB2777)' },
  { id: 'catheter', name: 'Catheter / Ostomy', desc: 'Catheter & stoma management', icon: Stethoscope, color: '#F97316', gradient: 'linear-gradient(135deg, #F97316, #EA580C)' },
];

const DIETICIAN_SERVICES = [
  { id: 'diabetes_diet', name: 'Diabetes Diet Plan', desc: 'Blood sugar management diet', icon: Apple, color: '#22C55E', gradient: 'linear-gradient(135deg, #22C55E, #16A34A)' },
  { id: 'weight_mgmt', name: 'Weight Management', desc: 'Healthy weight loss/gain plans', icon: Dumbbell, color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' },
  { id: 'heart_diet', name: 'Heart-Healthy Diet', desc: 'Cholesterol & BP friendly meals', icon: Heart, color: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444, #DC2626)' },
  { id: 'pregnancy_diet', name: 'Pregnancy Nutrition', desc: 'Prenatal & postnatal nutrition', icon: Baby, color: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899, #DB2777)' },
  { id: 'thyroid_diet', name: 'Thyroid Diet Plan', desc: 'Hypo/hyperthyroid meal planning', icon: Activity, color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
  { id: 'general', name: 'General Wellness', desc: 'Balanced diet for daily health', icon: Star, color: '#F97316', gradient: 'linear-gradient(135deg, #F97316, #EA580C)' },
];

const SPECIALTIES = [
  { id: 'physio', name: 'Physio Care', desc: '8 specialized therapies', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)', icon: Activity, services: PHYSIO_SERVICES, header: PHYSIO_HEADER },
  { id: 'nursing', name: 'Nursing Care', desc: '6 home nursing services', gradient: 'linear-gradient(135deg, #EF4444, #DC2626)', icon: HeartPulse, services: NURSING_SERVICES, header: NURSING_HEADER },
  { id: 'dietician', name: 'Dietician Support', desc: '6 nutrition programs', gradient: 'linear-gradient(135deg, #22C55E, #16A34A)', icon: Apple, services: DIETICIAN_SERVICES, header: DIETICIAN_HEADER },
];

const HomeCare = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('splash');
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', service: '', address: '', preferred_time: 'morning', notes: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.service) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      await fetch(`${API}/api/home-care/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, requested_at: new Date().toISOString() }),
      });
    } catch {}
    setSubmitted(true);
    toast.success('Callback request submitted!');
  };

  const currentSpec = SPECIALTIES.find(s => s.id === selectedSpecialty);

  /* ==================== SPLASH VIEW ==================== */
  if (view === 'splash') {
    return (
      <ServiceSplash
        heroComponent={<HomeCareHero3D />}
        imageAlt="Nevika Home Care"
        caption="Care at Your Doorstep"
        description="Professional nursing, physiotherapy & nutrition support in the comfort of your home."
        buttonGradient="linear-gradient(135deg, #10B981, #059669)"
        bgGradient="linear-gradient(160deg, #ECFDF5 0%, #D1FAE5 40%, #F0FDF4 100%)"
        accentColor="#10B981"
        onContinue={() => setView('services')}
        testId="home-care-splash"
      />
    );
  }

  /* ==================== CALLBACK FORM VIEW ==================== */
  if (showForm && !submitted) {
    return (
      <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(180deg, #F0FDF9 0%, #FFFFFF 40%)' }} data-testid="home-care-form">
        <div className="px-4 pt-12 pb-4">
          <button onClick={() => setShowForm(false)} className="flex items-center gap-2 text-sm text-gray-500 mb-5" data-testid="form-back-btn">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="rounded-3xl p-6" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Request Callback</h2>
            <p className="text-xs text-gray-400 mb-5">We'll call you within 30 minutes</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Service</label>
                <p className="text-sm font-bold text-emerald-600 mt-0.5">{form.service}</p>
              </div>
              <Input placeholder="Your Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-gray-50 border-gray-200 text-gray-900" data-testid="hc-name" />
              <Input placeholder="Phone Number *" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-gray-50 border-gray-200 text-gray-900" data-testid="hc-phone" />
              <Input placeholder="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="bg-gray-50 border-gray-200 text-gray-900" data-testid="hc-address" />
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Preferred Time</label>
                <div className="flex gap-2">
                  {['morning', 'afternoon', 'evening'].map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, preferred_time: t }))} className="flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all" style={form.preferred_time === t ? { background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff' } : { background: '#f3f4f6', color: '#9ca3af' }}>{t}</button>
                  ))}
                </div>
              </div>
              <Input placeholder="Any special notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-gray-50 border-gray-200 text-gray-900" />
              <Button type="submit" className="w-full py-3 rounded-2xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }} data-testid="submit-callback">Request Callback</Button>
            </form>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  /* ==================== SUCCESS VIEW ==================== */
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-24" style={{ background: 'linear-gradient(180deg, #F0FDF9 0%, #FFFFFF 40%)' }} data-testid="home-care-success">
        <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 32px rgba(16,185,129,0.3)' }}>
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
        <p className="text-sm text-gray-400 text-center mb-8 max-w-xs">Our care coordinator will call you within 30 minutes.</p>
        <div className="space-y-2 w-full max-w-xs">
          <Button onClick={() => { setSubmitted(false); setShowForm(false); setSelectedSpecialty(null); setView('services'); }} className="w-full rounded-2xl" variant="outline" data-testid="book-another">Book Another Service</Button>
          <Button onClick={() => navigate('/')} className="w-full rounded-2xl text-white" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>Go Home</Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  /* ==================== SPECIALTY DETAIL VIEW ==================== */
  if (selectedSpecialty && currentSpec) {
    const isPhysio = selectedSpecialty === 'physio';

    return (
      <div className="min-h-screen pb-32" style={{ background: 'linear-gradient(180deg, #F0FDF9 0%, #FFFFFF 40%)' }} data-testid={`specialty-${selectedSpecialty}`}>
        {/* Image Header */}
        <div className="relative w-full h-56 overflow-hidden">
          <img src={currentSpec.header} alt={currentSpec.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.55))' }} />
          <button onClick={() => setSelectedSpecialty(null)} className="absolute top-12 left-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }} data-testid="specialty-back-btn">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>{currentSpec.name}</h1>
            <p className="text-white/70 text-xs mt-0.5">{currentSpec.desc}</p>
          </div>
        </div>

        {/* Services Grid */}
        <div className="px-4 py-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Our Specialties</p>

          {isPhysio ? (
            /* PHYSIO — Image-based cards */
            <div className="grid grid-cols-2 gap-3">
              {currentSpec.services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => { setForm(f => ({ ...f, service: `Physio Care - ${svc.name}` })); setShowForm(true); }}
                  className="rounded-2xl overflow-hidden text-left active:scale-[0.96] transition-all relative group"
                  style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  data-testid={`specialty-service-${svc.id}`}
                >
                  <div className="relative h-28 overflow-hidden">
                    <img src={svc.img} alt={svc.name} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 20%, ${svc.color}CC 100%)` }} />
                    <div className="absolute bottom-2 left-2.5 right-2.5">
                      <p className="text-[12px] font-bold text-white leading-tight drop-shadow-sm">{svc.name}</p>
                      <p className="text-[9px] text-white/80 mt-0.5">{svc.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* NURSING & DIETICIAN — Gradient cards with icons */
            <div className="grid grid-cols-2 gap-3">
              {currentSpec.services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => { setForm(f => ({ ...f, service: `${currentSpec.name} - ${svc.name}` })); setShowForm(true); }}
                  className="rounded-2xl p-4 text-left active:scale-[0.96] transition-all relative overflow-hidden"
                  style={{ background: svc.gradient, boxShadow: `0 4px 16px ${svc.color}30` }}
                  data-testid={`specialty-service-${svc.id}`}
                >
                  <div className="absolute top-[-15%] right-[-15%] w-16 h-16 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
                  <svc.icon className="w-7 h-7 text-white/90 mb-2.5" />
                  <p className="text-[12px] font-bold text-white leading-tight">{svc.name}</p>
                  <p className="text-[9px] text-white/70 mt-0.5">{svc.desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Meet Our Specialists Button (Physio only) */}
        {isPhysio && (
          <div className="px-4 mt-2 mb-4">
            <div
              className="rounded-2xl p-4 text-center relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #1E40AF, #3B82F6)', boxShadow: '0 4px 20px rgba(59,130,246,0.25)' }}
              data-testid="meet-specialists-btn"
            >
              <div className="absolute top-[-20%] left-[-10%] w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="absolute bottom-[-20%] right-[-10%] w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <p className="text-sm font-bold text-white">Meet Our Specialists</p>
              </div>
              <p className="text-[11px] text-white/60">Expert physiotherapists for your recovery</p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-5 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <p className="text-xs font-bold text-white/80">Coming Soon</p>
              </div>
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="px-4 mt-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Why Choose Us</p>
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {[
              { icon: Shield, title: 'Certified', gradient: 'linear-gradient(135deg, #10B981, #059669)' },
              { icon: Clock, title: 'Flexible Hours', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' },
              { icon: Star, title: 'Quality Care', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
            ].map((b, i) => (
              <div key={i} className="flex-shrink-0 rounded-2xl px-4 py-3 flex items-center gap-2" style={{ background: b.gradient }}>
                <b.icon className="w-4 h-4 text-white" />
                <p className="text-[11px] font-bold text-white whitespace-nowrap">{b.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="fixed bottom-16 left-0 right-0 px-4 pb-4" style={{ background: 'linear-gradient(to top, white 60%, transparent)' }}>
          <div className="flex gap-2.5 max-w-lg mx-auto">
            <a href="tel:+919876543210" className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm active:scale-[0.96] transition-transform" style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: '#fff', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }} data-testid="specialty-call-btn">
              <Phone className="w-4 h-4" /> Call Now
            </a>
            <button onClick={() => { setForm(f => ({ ...f, service: currentSpec.name })); setShowForm(true); }} className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white active:scale-[0.96] transition-transform" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }} data-testid="specialty-book-btn">
              Book Now
            </button>
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  /* ==================== SERVICES VIEW ==================== */
  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(180deg, #F0FDF9 0%, #FFFFFF 40%)' }} data-testid="home-care-services">
      <div className="px-4 pt-12 pb-2">
        <button onClick={() => setView('splash')} className="flex items-center gap-2 text-sm text-gray-400 mb-3" data-testid="services-back-btn">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Combined Services Banner */}
      <div className="px-4 mb-5">
        <div className="rounded-3xl overflow-hidden" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <img src={SERVICES_BANNER} alt="Nevika Home Care Services" className="w-full h-auto" data-testid="services-banner" />
        </div>
      </div>

      {/* Three Specialty Sections */}
      <div className="px-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Choose Your Specialty</p>
        {SPECIALTIES.map((spec) => (
          <button
            key={spec.id}
            onClick={() => setSelectedSpecialty(spec.id)}
            className="w-full rounded-2xl p-4 text-left active:scale-[0.97] transition-all relative overflow-hidden group"
            style={{ background: spec.gradient, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            data-testid={`specialty-card-${spec.id}`}
          >
            <div className="absolute top-[-20%] right-[-15%] w-28 h-28 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="absolute bottom-[-25%] left-[-10%] w-20 h-20 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                <spec.icon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">{spec.name}</h3>
                <p className="text-[11px] text-white/70 mt-0.5">{spec.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/50 group-hover:text-white/80 transition-colors flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>

      {/* Benefits */}
      <div className="px-4 mt-6">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Why Nevika Home Care</p>
        <div className="space-y-2">
          {[
            { icon: Shield, title: 'Certified Professionals', desc: 'Verified healthcare workers', gradient: 'linear-gradient(135deg, #10B981, #059669)' },
            { icon: Clock, title: 'Flexible Scheduling', desc: 'Morning, afternoon, or evening', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' },
            { icon: Star, title: 'Quality Assured', desc: 'Monitored by Nevika Cura team', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
          ].map((b, i) => (
            <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.04)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: b.gradient }}>
                <b.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">{b.title}</p>
                <p className="text-[10px] text-gray-400">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Call CTA — Gradient Button */}
      <div className="px-4 mt-5">
        <a href="tel:+919876543210" className="flex items-center justify-center gap-2 p-4 rounded-2xl active:scale-[0.97] transition-transform" style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: '0 4px 20px rgba(99,102,241,0.25)' }} data-testid="call-clinic-btn">
          <Phone className="w-5 h-5 text-white" />
          <span className="text-sm font-bold text-white">Call Us Directly</span>
        </a>
      </div>

      <BottomNav />
    </div>
  );
};

export default HomeCare;
