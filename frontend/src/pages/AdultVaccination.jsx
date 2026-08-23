import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import { ArrowLeft, Search, ShoppingCart, ChevronRight, CheckCircle2, Shield, Clock, Home as HomeIcon, MapPin, Phone, FileText, Calendar, Star, Syringe } from 'lucide-react';
import ServiceSplash from '@/components/ServiceSplash';
import VaccinationHero3D from '@/components/VaccinationHero3D';

const VAX_SPLASH_IMG = 'https://customer-assets.emergentagent.com/job_1f5135b8-cca0-4052-82b8-b16fa292181e/artifacts/io6fpvvk_file_00000000add472089b2919c4975a2390%20%284%29.png';

const VACCINES = [
  { id: 'flu', name: 'Influenza', subtitle: 'Flu shot', description: 'Annual protection against seasonal flu viruses. Recommended for all adults.', price: 1500, mrp: 1800, doses: '1 dose/year', Icon: Shield, color: '#0D9488', bgColor: '#CCFBF1' },
  { id: 'hpv', name: 'HPV', subtitle: 'Gardasil/Cervarix', description: 'Protects against human papillomavirus. Recommended for adults up to 45.', price: 4200, mrp: 5000, doses: '2-3 doses', Icon: Shield, color: '#7C3AED', bgColor: '#EDE9FE' },
  { id: 'shingles', name: 'Shingles', subtitle: 'Shingrix', description: 'Prevents shingles (herpes zoster). Recommended for adults 50+.', price: 12000, mrp: 14000, doses: '2 doses', Icon: Syringe, color: '#16A34A', bgColor: '#DCFCE7' },
  { id: 'pneumonia', name: 'Pneumonia', subtitle: 'Pneumococcal', description: 'Prevents pneumococcal disease. Recommended for adults 65+ and high-risk groups.', price: 3800, mrp: 4500, doses: '1-2 doses', Icon: Syringe, color: '#2563EB', bgColor: '#DBEAFE' },
  { id: 'tdap', name: 'Tdap', subtitle: 'Tetanus/Diphtheria', description: 'Booster for tetanus, diphtheria, and pertussis. Every 10 years.', price: 800, mrp: 1000, doses: '1 booster', Icon: Syringe, color: '#DC2626', bgColor: '#FEE2E2' },
  { id: 'hepatitis', name: 'Hepatitis B', subtitle: 'HepB Vaccine', description: 'Protects against hepatitis B virus. Recommended for unvaccinated adults.', price: 2500, mrp: 3000, doses: '3 doses', Icon: Shield, color: '#EA580C', bgColor: '#FED7AA' },
];

const HOW_IT_WORKS = [
  { icon: ShoppingCart, title: 'Select your required vaccine and add to cart', desc: 'Select your desired vaccine from our wide range of recommended vaccines.', color: '#0D9488' },
  { icon: FileText, title: "Upload your doctor's prescription", desc: 'Upload a prescription, or let us arrange one for you for free.', color: '#0D9488' },
  { icon: Calendar, title: 'Select your slot and address', desc: 'Share your address, and pick a convenient date and time for your vaccination appointment.', color: '#0D9488' },
  { icon: HomeIcon, title: 'Expert vaccination at your doorstep', desc: 'A certified professional will administer your vaccination with care, in the comfort of your home.', color: '#0D9488' },
];

const AdultVaccination = () => {
  const navigate = useNavigate();
  const { addToPharmacyCart } = useCart();
  const [search, setSearch] = useState('');
  const [selectedVaccine, setSelectedVaccine] = useState(null);
  const [view, setView] = useState('splash');

  const filteredVaccines = useMemo(() => {
    if (!search.trim()) return VACCINES;
    const q = search.toLowerCase();
    return VACCINES.filter(v => v.name.toLowerCase().includes(q) || v.subtitle.toLowerCase().includes(q));
  }, [search]);

  const handleAddToCart = (vaccine) => {
    addToPharmacyCart({
      id: `vaccine-${vaccine.id}`,
      name: `${vaccine.name} Vaccine (${vaccine.subtitle})`,
      price: vaccine.price,
      mrp: vaccine.mrp,
      quantity: 1,
      form: 'Vaccine',
      category: 'vaccination',
      discount_percent: Math.round(((vaccine.mrp - vaccine.price) / vaccine.mrp) * 100),
    });
    toast.success(`${vaccine.name} vaccine added to cart`);
  };

  /* ==================== SPLASH VIEW ==================== */
  if (view === 'splash') {
    return (
      <ServiceSplash
        heroComponent={<VaccinationHero3D />}
        imageAlt="Nevika Vaccination"
        caption="Safe Vaccination at Home"
        description="Certified professionals, convenient scheduling, and quality-assured vaccines delivered to your doorstep."
        buttonGradient="linear-gradient(135deg, #0D9488, #14B8A6)"
        bgGradient="linear-gradient(160deg, #ECFDF5 0%, #CCFBF1 40%, #F0FDFA 100%)"
        accentColor="#0D9488"
        onContinue={() => setView('main')}
        testId="vaccination-splash"
      />
    );
  }

  /* ==================== MAIN VIEW ==================== */
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #ECFDF5 0%, #D1FAE5 30%, #F0FDF4 100%)' }}>
      {/* Hero Section */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #ECFDF5, #CCFBF1, #D1FAE5)' }}>
        <div className="absolute left-0 top-0 bottom-0 w-2" style={{ background: 'linear-gradient(180deg, #0D9488, #14B8A6, #34D399)' }} />
        
        <div className="sticky top-0 z-10 px-4 pt-4 pb-2 flex items-center gap-3">
          <button onClick={() => setView('splash')} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(13,148,136,0.1)' }} data-testid="vaccination-back">
            <ArrowLeft className="w-4.5 h-4.5 text-teal-700" />
          </button>
          <h1 className="text-base font-bold text-teal-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Nevika Cura</h1>
        </div>

        <div className="px-6 pt-4 pb-8 text-center">
          <div className="inline-block px-3 py-1 rounded-full mb-3" style={{ background: 'linear-gradient(135deg, #10B981, #14B8A6)', color: '#fff' }}>
            <span className="text-[10px] font-bold tracking-wide">INDIA&apos;S MOST TRUSTED</span>
          </div>
          <h2 className="text-3xl font-black text-teal-900 mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>Vaccination for Adults</h2>
          <p className="text-teal-700/70 text-sm leading-relaxed max-w-md mx-auto">
            Adult vaccinations complement childhood vaccines, strengthening immunity. Stay protected with our at-home vaccination service, administered by trusted professionals
          </p>
        </div>

        <div className="px-4 pb-6">
          <div className="flex items-center gap-2 rounded-2xl px-4 py-3 shadow-sm" style={{ background: '#fff', border: '1px solid #D1FAE5' }}>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by keyword/vaccine..." className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              data-testid="vaccine-search-input" />
            <button className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EF4444, #F87171)' }} data-testid="vaccine-search-btn">
              <Search className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="flex justify-center gap-6 pb-6">
          {[
            { icon: CheckCircle2, label: 'Safe' },
            { icon: Clock, label: 'Convenient' },
            { icon: Shield, label: 'Professional' },
            { icon: Star, label: '75k+ delivered' },
          ].map((b, i) => (
            <div key={i} className="text-center">
              <b.icon className="w-5 h-5 text-teal-600 mx-auto mb-1" />
              <p className="text-teal-700 text-[10px] font-bold">{b.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Available Vaccines Grid */}
      <div className="px-4 py-6">
        <h3 className="text-xl font-black text-gray-900 text-center mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>Available Vaccines</h3>
        <div className="grid grid-cols-2 gap-3" data-testid="vaccine-grid">
          {filteredVaccines.map((vaccine) => (
            <button key={vaccine.id}
              onClick={() => setSelectedVaccine(selectedVaccine?.id === vaccine.id ? null : vaccine)}
              className="rounded-2xl p-4 text-left active:scale-[0.97] transition-all relative overflow-hidden"
              style={{
                background: selectedVaccine?.id === vaccine.id ? vaccine.bgColor : '#fff',
                border: `1px solid ${selectedVaccine?.id === vaccine.id ? vaccine.color + '40' : '#E5E7EB'}`,
                boxShadow: selectedVaccine?.id === vaccine.id ? `0 4px 12px ${vaccine.color}20` : '0 1px 3px rgba(0,0,0,0.05)',
              }}
              data-testid={`vaccine-${vaccine.id}`}
            >
              <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ background: vaccine.bgColor }}>
                <vaccine.Icon className="w-7 h-7" style={{ color: vaccine.color }} />
              </div>
              <h4 className="text-sm font-bold text-gray-900">{vaccine.name}</h4>
              <p className="text-[10px] text-gray-500">{vaccine.subtitle}</p>
              <div className="flex items-center gap-1 mt-1.5">
                <ChevronRight className="w-3 h-3" style={{ color: vaccine.color }} />
              </div>
              
              {selectedVaccine?.id === vaccine.id && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: vaccine.color + '30' }}>
                  <p className="text-xs text-gray-600 mb-2">{vaccine.description}</p>
                  <p className="text-[10px] text-gray-500 mb-2">{vaccine.doses}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs line-through text-gray-400">₹{vaccine.mrp}</span>
                    <span className="text-sm font-bold" style={{ color: vaccine.color }}>₹{vaccine.price}</span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold text-white" style={{ background: '#22C55E' }}>
                      {Math.round(((vaccine.mrp - vaccine.price) / vaccine.mrp) * 100)}% off
                    </span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleAddToCart(vaccine); }}
                    className="w-full py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.97]"
                    style={{ background: `linear-gradient(135deg, ${vaccine.color}, ${vaccine.color}CC)` }}
                    data-testid={`add-vaccine-${vaccine.id}`}
                  >
                    Add to Cart ₹{vaccine.price}
                  </button>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Orange Pharmacy Connection Banner */}
      <div className="px-4 py-4" style={{ background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)' }}>
        <div className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', boxShadow: '0 4px 16px rgba(249,115,22,0.2)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-white">Powered by Orange Pharmacy</p>
            <p className="text-[9px] text-white/70">All vaccines sourced & delivered by Orange Pharmacy</p>
          </div>
          <button onClick={() => navigate('/orange')} className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-orange-700" style={{ background: 'rgba(255,255,255,0.9)' }} data-testid="goto-orange-pharmacy">
            Visit
          </button>
        </div>
      </div>

      {/* How It Works */}
      <div className="px-4 py-6" style={{ background: '#fff' }}>
        <h3 className="text-xl font-black text-gray-900 text-center mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>How it works</h3>
        <div className="space-y-4 relative" data-testid="how-it-works">
          <div className="absolute left-7 top-8 bottom-8 w-0.5" style={{ background: 'linear-gradient(180deg, #0D9488, #34D399)' }} />
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="flex items-start gap-4 relative">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 z-10" style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}>
                <step.icon className="w-6 h-6" style={{ color: step.color }} />
              </div>
              <div className="flex-1 pt-1">
                <h4 className="text-sm font-bold text-gray-900 leading-tight">{step.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="sticky bottom-0 px-4 py-3" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid #D1FAE5' }}>
        <div className="flex items-center gap-3">
          <a href="tel:+919876543210" className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: '#F0FDF4', color: '#0D9488', border: '1px solid #CCFBF1' }} data-testid="vaccination-call-btn">
            <Phone className="w-4 h-4" /> Call Us
          </a>
          <button onClick={() => navigate('/cart')} className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg, #0D9488, #14B8A6)', boxShadow: '0 4px 12px rgba(13,148,136,0.3)' }}
            data-testid="vaccination-view-cart">
            <ShoppingCart className="w-4 h-4" /> View Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdultVaccination;
