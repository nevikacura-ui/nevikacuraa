import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_d786a99e-45bb-47d6-851a-3fcc890efd73/artifacts/1k8xe1te_1314-removebg-preview.png';

const MembershipAdBanner = ({ className = '' }) => {
  const navigate = useNavigate();

  return (
    <div className={`px-4 ${className}`}>
      <div
        onClick={() => navigate('/one')}
        className="relative overflow-hidden rounded-[18px] cursor-pointer active:scale-[0.98] transition-transform max-w-sm"
        style={{
          aspectRatio: '1.7 / 1',
          background: 'linear-gradient(145deg, rgba(90,82,75,0.7), rgba(65,60,55,0.8), rgba(80,73,66,0.7))',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
        data-testid="membership-ad-inline"
      >
        {/* Frosted metallic overlay */}
        <div className="absolute inset-0 opacity-[0.06]" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.4) 0%, transparent 35%, rgba(255,255,255,0.15) 100%)' }} />
        {/* Shine sweep */}
        <div className="absolute top-0 w-[40%] h-full pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)', animation: 'shineAd 5s ease-in-out infinite', left: '-60%' }} />

        <style>{`@keyframes shineAd { 0%{left:-60%} 100%{left:160%} }`}</style>

        <div className="relative h-full p-5 flex flex-col justify-between">
          {/* Top row: Logo + Crown */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src={LOGO_URL} alt="Nevika" className="w-10 h-10 object-contain" />
              <div>
                <p className="text-white/70 text-[10px] font-bold tracking-[0.14em] uppercase">Nevika Cura</p>
                <p className="text-white/25 text-[8px] tracking-widest uppercase">Membership</p>
              </div>
            </div>
            <Crown className="w-4 h-4 text-stone-400/30" />
          </div>

          {/* Card number dots */}
          <div className="flex items-center gap-4 my-auto">
            <div className="flex gap-1.5">
              {[0,1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />)}
            </div>
            <div className="flex gap-1.5">
              {[0,1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />)}
            </div>
            <div className="flex gap-1.5">
              {[0,1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />)}
            </div>
            <p className="text-white/30 text-xs tracking-[3px] font-mono">0999</p>
          </div>

          {/* Bottom row */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/20 text-[8px] tracking-wider uppercase">Annual Plan</p>
              <p className="text-white/60 text-sm font-semibold">₹999/year</p>
            </div>
            <div className="px-3 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-white/40 text-[10px] font-medium">Join Now</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembershipAdBanner;
