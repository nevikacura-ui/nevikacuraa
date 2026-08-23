import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';

const BRANDS = [
  {
    id: 'diagyn',
    name: 'DiaGyn Clinic',
    tagline: 'Expert Diabetes & Gynecology Care',
    offer: 'Free follow-up within 7 days',
    path: '/diagyn',
    gradient: 'linear-gradient(135deg, #0d9488, #14b8a6)',
    logo: 'https://customer-assets.emergentagent.com/job_4625448c-b743-44eb-9c92-5eb654622ad3/artifacts/mo04g1pk_file_0000000032dc720798054d00d20ce907%20%281%29.png',
    accentColor: '#14b8a6',
  },
  {
    id: 'orange',
    name: 'Orange Pharmacy',
    tagline: 'Your Trusted Neighborhood Pharmacy',
    offer: 'Free delivery on orders above Rs.500',
    path: '/orange',
    gradient: 'linear-gradient(135deg, #ea580c, #f97316)',
    logo: 'https://customer-assets.emergentagent.com/job_52fac319-eb99-4766-978d-d2bba8458f97/artifacts/nfvq7jld_Picsart_25-02-20_01-00-31-839%20%281%29.png',
    accentColor: '#f97316',
  },
  {
    id: 'mango',
    name: 'Mango Diagnostics',
    tagline: 'Affordable Lab Tests at Home',
    offer: 'Complete health checkup from Rs.999',
    path: '/mango',
    gradient: 'linear-gradient(135deg, #15803d, #22c55e)',
    logo: 'https://customer-assets.emergentagent.com/job_52fac319-eb99-4766-978d-d2bba8458f97/artifacts/8spn81z0_Picsart_25-02-20_01-02-08-700%20%281%29.png',
    accentColor: '#22c55e',
  },
];

const BrandOfTheWeek = () => {
  const navigate = useNavigate();
  const [weekIdx, setWeekIdx] = useState(0);

  useEffect(() => {
    const weekNumber = Math.floor((Date.now() - new Date('2026-01-01').getTime()) / (7 * 24 * 60 * 60 * 1000));
    setWeekIdx(weekNumber % BRANDS.length);
  }, []);

  const brand = BRANDS[weekIdx];

  return (
    <div className="mb-5" data-testid="brand-of-week">
      <button
        onClick={() => navigate(brand.path)}
        className="w-full rounded-2xl p-4 relative overflow-hidden group active:scale-[0.98] transition-transform"
        style={{ background: brand.gradient }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -mr-8 -mt-8 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center p-1.5 flex-shrink-0">
            <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span className="text-[9px] text-white/70 font-bold uppercase tracking-widest">Brand of the Week</span>
            </div>
            <h3 className="text-white font-bold text-sm truncate">{brand.name}</h3>
            <p className="text-white/70 text-xs truncate">{brand.offer}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/50 group-hover:translate-x-1 transition-transform flex-shrink-0" />
        </div>
      </button>
    </div>
  );
};

export default BrandOfTheWeek;
