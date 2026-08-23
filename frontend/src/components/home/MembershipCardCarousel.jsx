import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Star, Shield, Pill, Truck, Sparkles, ChevronRight } from 'lucide-react';
import { lightTap } from '@/utils/haptics';

const NEVIKA_LOGO = 'https://customer-assets.emergentagent.com/job_d786a99e-45bb-47d6-851a-3fcc890efd73/artifacts/1k8xe1te_1314-removebg-preview.png';

const SLIDES = [
  {
    id: 'cards',
    title: 'Nevika Cura ONE',
    subtitle: 'Gold · Silver · Bronze',
    accent: '#D4AF37',
    orbs: ['#D4AF37', '#C0C0C0', '#CD7F32'],
  },
  {
    id: 'gold',
    icon: Crown,
    title: 'Gold · ₹1,499/yr',
    subtitle: '3,000 CuraCoins, 5x rewards, VIP booking, all portals',
    accent: '#D4AF37',
    orbs: ['#D4AF37', '#B8941E', '#D4AF37'],
  },
  {
    id: 'silver',
    icon: Star,
    title: 'Silver · ₹999/yr',
    subtitle: '1,500 CuraCoins, 3x rewards, priority booking',
    accent: '#C0C0C0',
    orbs: ['#C0C0C0', '#A0A0A0', '#C0C0C0'],
  },
  {
    id: 'bronze',
    icon: Shield,
    title: 'Bronze · ₹499/yr',
    subtitle: '500 CuraCoins, 2x rewards, health records access',
    accent: '#CD7F32',
    orbs: ['#CD7F32', '#A06020', '#CD7F32'],
  },
];

const MembershipCardCarousel = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setActive(p => (p + 1) % SLIDES.length), 4000);
    return () => clearInterval(timerRef.current);
  }, []);

  const goTo = (i) => {
    setActive(i);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setActive(p => (p + 1) % SLIDES.length), 4000);
  };

  const slide = SLIDES[active];

  return (
    <div
      className="relative rounded-[24px] overflow-hidden cursor-pointer group"
      onClick={() => { lightTap(); navigate('/one'); }}
      style={{ background: '#080810' }}
      data-testid="membership-carousel"
    >
      <style>{`
        @keyframes cShine { 0% { transform:translateX(-100%); } 100% { transform:translateX(200%); } }
        @keyframes orbP { 0%,100% { opacity:0.35; transform:scale(1); } 50% { opacity:0.55; transform:scale(1.08); } }
        .c-shine::after { content:''; position:absolute; top:0; left:0; width:50%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent); animation:cShine 4s ease-in-out infinite; }
        .c-orb { animation: orbP 6s ease-in-out infinite; }
        .c-orb2 { animation: orbP 8s ease-in-out 1.5s infinite; }
      `}</style>

      <div className="c-orb absolute -top-6 -right-6 w-32 h-32 rounded-full blur-[50px]" style={{ background: slide.orbs[0] }} />
      <div className="c-orb2 absolute -bottom-8 -left-8 w-36 h-36 rounded-full blur-[55px]" style={{ background: slide.orbs[1] }} />

      <div className="relative z-10 p-5">
        {slide.id === 'cards' ? (
          <div>
            {/* Stacked mini credit cards */}
            <div className="relative h-28 mb-3">
              {[
                { name: 'BRONZE', color: '#CD7F32', r: 5, x: 10, y: 12, z: 10 },
                { name: 'SILVER', color: '#C0C0C0', r: -2, x: -4, y: 6, z: 20 },
                { name: 'GOLD', color: '#D4AF37', r: 0, x: 0, y: 0, z: 30 },
              ].map((c) => (
                <div key={c.name} className="absolute left-2 right-2" style={{ zIndex: c.z, transform: `translateX(${c.x}px) translateY(${c.y}px) rotate(${c.r}deg)` }}>
                  <div className="c-shine relative rounded-[14px] overflow-hidden" style={{ aspectRatio: '1.586/1', maxHeight: 80, background: `linear-gradient(145deg, ${c.color}18, ${c.color}05, ${c.color}0C)`, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: `1px solid ${c.color}25`, boxShadow: `0 6px 20px rgba(0,0,0,0.3), inset 0 1px 0 ${c.color}12` }}>
                    <div className="p-3 flex items-start justify-between h-full">
                      <div>
                        <p style={{ fontSize: 8, color: 'transparent', WebkitTextStroke: `0.35px ${c.color}50`, fontWeight: 900, letterSpacing: '0.15em' }}>NEVIKA CURA</p>
                        <p style={{ fontSize: 16, color: c.color, fontWeight: 900, lineHeight: 1.1, textShadow: `0 1px 8px ${c.color}25` }}>{c.name}</p>
                      </div>
                      <img src={NEVIKA_LOGO} alt="" className="w-6 h-6 object-contain opacity-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-bold">Choose Your Plan</p>
                <p className="text-white/30 text-[11px]">Gold · Silver · Bronze</p>
              </div>
              <div className="flex items-center gap-1 text-white/40 text-xs group-hover:text-white/70 transition-colors">
                <span>View Plans</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 py-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(140deg, ${slide.orbs[0]}, ${slide.orbs[1]})`, boxShadow: `0 6px 20px ${slide.orbs[0]}30` }}>
              <slide.icon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-[15px] leading-tight">{slide.title}</p>
              <p className="text-white/40 text-xs mt-0.5">{slide.subtitle}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/20 flex-shrink-0" />
          </div>
        )}

        <div className="flex justify-center gap-1.5 mt-3">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); goTo(i); }} className="rounded-full transition-all" style={{ width: i === active ? 18 : 5, height: 5, background: i === active ? slide.accent : 'rgba(255,255,255,0.10)' }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MembershipCardCarousel;
