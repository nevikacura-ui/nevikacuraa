import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Crown } from 'lucide-react';

const NEVIKA_LOGO = 'https://customer-assets.emergentagent.com/job_d786a99e-45bb-47d6-851a-3fcc890efd73/artifacts/1k8xe1te_1314-removebg-preview.png';

const TIERS = [
  { id: 'bronze', name: 'BRONZE', color: '#CD7F32', rotate: 5, x: 12, y: 10, z: 10 },
  { id: 'silver', name: 'SILVER', color: '#C0C0C0', rotate: -2, x: -4, y: 5, z: 20 },
  { id: 'gold', name: 'GOLD', color: '#D4AF37', rotate: 0, x: 0, y: 0, z: 30 },
];

const MembershipCard = () => {
  const navigate = useNavigate();

  return (
    <div className="px-4" data-testid="home-membership-card">
      <div
        onClick={() => navigate('/one')}
        className="relative rounded-[22px] overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
        style={{
          background: 'linear-gradient(135deg, #1a1033 0%, #0f1628 25%, #0d1f2d 50%, #12152a 75%, #1a1033 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Gradient glow orbs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 40%, transparent 70%)' }}
        />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 60%)' }}
        />
        {/* Top glass highlight */}
        <div className="absolute top-0 left-0 w-full h-[1px]" style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(212,175,55,0.25) 50%, transparent 90%)' }} />

        <div className="relative p-5">
          {/* Brand row */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))', border: '1px solid rgba(212,175,55,0.15)' }}>
              <Crown className="w-3.5 h-3.5 text-amber-400/80" />
            </div>
            <div>
              <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-amber-400/50">Nevika Cura</span>
              <h2 className="text-base font-black text-white/95 tracking-tight leading-none">Cura Card</h2>
            </div>
          </div>

          {/* Mini stacked cards */}
          <div className="relative h-[72px] mb-3">
            {TIERS.map((t) => (
              <div
                key={t.id}
                className="absolute"
                style={{
                  left: 0, right: 0,
                  zIndex: t.z,
                  transform: `translateX(${t.x}px) translateY(${t.y}px) rotate(${t.rotate}deg)`,
                }}
              >
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    aspectRatio: '1.586 / 1',
                    maxHeight: 56,
                    background: `linear-gradient(145deg, ${t.color}25, ${t.color}08, ${t.color}15)`,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1px solid ${t.color}20`,
                    boxShadow: `0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 ${t.color}10`,
                  }}
                >
                  <div className="p-2.5 flex items-center justify-between h-full">
                    <div>
                      <p style={{ fontSize: 7, color: 'transparent', WebkitTextStroke: `0.3px ${t.color}50`, fontWeight: 900, letterSpacing: '0.15em' }}>NEVIKA CURA</p>
                      <p style={{ fontSize: 13, color: t.color, fontWeight: 900, lineHeight: 1, textShadow: `0 1px 8px ${t.color}40` }}>{t.name}</p>
                    </div>
                    <img src={NEVIKA_LOGO} alt="" className="w-5 h-5 object-contain opacity-25" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA row */}
          <div className="flex items-center justify-between mt-1">
            <div>
              <span className="text-[9px] text-white/30">Starting at</span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-[10px] text-white/35">Rs.</span>
                <span className="text-lg font-black text-white/90">499</span>
                <span className="text-[9px] text-white/25">/year</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #D4AF37, #A07820, #D4AF37)',
                boxShadow: '0 4px 20px rgba(212,175,55,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              View Plans <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembershipCard;
