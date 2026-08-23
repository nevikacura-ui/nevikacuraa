import React from 'react';

const VaccinationHero3D = () => {
  return (
    <div className="relative w-72 h-72 mx-auto" style={{ perspective: '800px' }}>
      <style>{`
        @keyframes vcFloat { 0%,100% { transform: translateY(0) rotateZ(0deg); } 50% { transform: translateY(-11px) rotateZ(1.5deg); } }
        @keyframes vcFloat2 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-13px); } }
        @keyframes vcBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes vcPulse { 0%,100% { opacity:0.35; transform: scale(1); } 50% { opacity:0.8; transform: scale(1.3); } }
        @keyframes vcShield { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        .vc-sparkle { position:absolute; border-radius:50%; background:white; }
      `}</style>

      <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.08) 0%, transparent 70%)' }} />

      {/* === SHIELD (center) === */}
      <div className="absolute" style={{ left: '50%', top: '38%', transform: 'translate(-50%, -50%)', animation: 'vcFloat 5s ease-in-out infinite', zIndex: 10 }}>
        <div style={{ animation: 'vcShield 3s ease-in-out infinite' }}>
          <svg width="92" height="105" viewBox="0 0 24 28" fill="none" style={{ filter: 'drop-shadow(0 10px 28px rgba(13,148,136,0.25))' }}>
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1z" fill="url(#vcShield)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
            <defs><linearGradient id="vcShield" x1="3" y1="1" x2="21" y2="23"><stop stopColor="#14B8A6"/><stop offset="1" stopColor="#0D9488"/></linearGradient></defs>
          </svg>
          {/* Checkmark on shield */}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', top: '32%', left: '50%', transform: 'translateX(-50%)' }}>
            <polyline points="6,13 10,17 18,9" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      </div>

      {/* === SYRINGE (top-left) === */}
      <div className="absolute" style={{ top: '8%', left: '5%', animation: 'vcFloat2 4.5s ease-in-out infinite 0.3s', zIndex: 5, transform: 'rotate(-30deg)' }}>
        <div style={{ position: 'relative' }}>
          {/* Needle */}
          <div style={{ width: 3, height: 14, background: 'linear-gradient(to bottom, #D1D5DB, #9CA3AF)', borderRadius: '2px 2px 0 0', margin: '0 auto' }} />
          {/* Barrel */}
          <div style={{ width: 18, height: 36, background: 'linear-gradient(145deg, #CCFBF1, #99F6E4)', borderRadius: 4, border: '2px solid rgba(13,148,136,0.15)', boxShadow: '0 4px 12px rgba(13,148,136,0.15)', position: 'relative' }}>
            {[6, 12, 18, 24].map((t, i) => (
              <div key={i} style={{ position: 'absolute', top: t, left: 0, width: 5, height: 1.5, background: 'rgba(13,148,136,0.25)' }} />
            ))}
            <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 10, height: 2, background: '#0D9488', borderRadius: 1, opacity: 0.4 }} />
          </div>
          {/* Plunger */}
          <div style={{ width: 10, height: 8, background: 'linear-gradient(135deg, #5EEAD4, #14B8A6)', borderRadius: '0 0 3px 3px', margin: '0 auto' }} />
        </div>
      </div>

      {/* === VACCINE VIAL (top-right) === */}
      <div className="absolute" style={{ top: '10%', right: '10%', animation: 'vcBob 4s ease-in-out infinite 1s', zIndex: 5 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 14, height: 7, background: 'linear-gradient(135deg, #F59E0B, #D97706)', borderRadius: '3px 3px 0 0', margin: '0 auto' }} />
          <div style={{ width: 22, height: 32, background: 'linear-gradient(145deg, #FFFFFF, #ECFDF5)', borderRadius: '0 0 5px 5px', border: '2px solid rgba(13,148,136,0.12)', boxShadow: '0 4px 10px rgba(13,148,136,0.12)' }}>
            <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, background: 'rgba(20,184,166,0.15)', borderRadius: '50%' }} />
          </div>
        </div>
      </div>

      {/* === SECOND VIAL (right) === */}
      <div className="absolute" style={{ top: '40%', right: '4%', animation: 'vcFloat 5s ease-in-out infinite 0.7s', zIndex: 5, transform: 'rotate(10deg)' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 12, height: 6, background: 'linear-gradient(135deg, #A78BFA, #7C3AED)', borderRadius: '3px 3px 0 0', margin: '0 auto' }} />
          <div style={{ width: 20, height: 28, background: 'linear-gradient(145deg, #F5F3FF, #EDE9FE)', borderRadius: '0 0 5px 5px', border: '2px solid rgba(139,92,246,0.12)', boxShadow: '0 4px 10px rgba(139,92,246,0.12)' }} />
        </div>
      </div>

      {/* === BANDAID (bottom-left) === */}
      <div className="absolute" style={{ bottom: '18%', left: '8%', animation: 'vcFloat2 4s ease-in-out infinite 1.2s', zIndex: 5, transform: 'rotate(35deg)' }}>
        <div style={{ width: 44, height: 18, borderRadius: 6, background: 'linear-gradient(135deg, #FECACA, #FCA5A5)', boxShadow: '0 4px 10px rgba(252,165,165,0.25)', position: 'relative', border: '1px solid rgba(252,165,165,0.3)' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 14, height: 10, background: 'rgba(252,165,165,0.4)', borderRadius: 3 }}>
            {[0, 1, 2].map(i => (
              <div key={i} className="absolute" style={{ width: 2, height: 2, borderRadius: '50%', background: 'rgba(239,68,68,0.3)', top: `${3 + i * 3}px`, left: `${3 + i * 4}px` }} />
            ))}
          </div>
        </div>
      </div>

      {/* === DROPLET (bottom-right) === */}
      <div className="absolute" style={{ bottom: '22%', right: '15%', animation: 'vcBob 3.5s ease-in-out infinite 0.5s', zIndex: 5 }}>
        <svg width="24" height="30" viewBox="0 0 24 30">
          <path d="M12 2C12 2 4 14 4 19a8 8 0 0016 0c0-5-8-17-8-17z" fill="url(#vcDrop)" />
          <defs><linearGradient id="vcDrop" x1="4" y1="2" x2="20" y2="27"><stop stopColor="#5EEAD4"/><stop offset="1" stopColor="#14B8A6"/></linearGradient></defs>
        </svg>
      </div>

      {/* Small cross */}
      <div className="absolute" style={{ bottom: '35%', left: '28%', animation: 'vcBob 4.2s ease-in-out infinite 1.5s', zIndex: 5 }}>
        <div style={{ position: 'relative', width: 18, height: 18 }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 14, height: 4, background: '#0D9488', borderRadius: 2, opacity: 0.5 }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 4, height: 14, background: '#0D9488', borderRadius: 2, opacity: 0.5 }} />
        </div>
      </div>

      {/* Sparkles */}
      <div className="vc-sparkle" style={{ top: '5%', left: '40%', width: 4, height: 4, animation: 'vcPulse 2.5s ease-in-out infinite' }} />
      <div className="vc-sparkle" style={{ top: '25%', right: '25%', width: 3, height: 3, animation: 'vcPulse 3s ease-in-out infinite 0.5s' }} />
      <div className="vc-sparkle" style={{ bottom: '40%', left: '18%', width: 4, height: 4, animation: 'vcPulse 2.8s ease-in-out infinite 1s' }} />
      <div className="vc-sparkle" style={{ top: '58%', right: '6%', width: 3, height: 3, animation: 'vcPulse 3.2s ease-in-out infinite 1.3s' }} />
      <div className="vc-sparkle" style={{ bottom: '12%', left: '52%', width: 5, height: 5, animation: 'vcPulse 2.6s ease-in-out infinite 0.8s' }} />
    </div>
  );
};

export default VaccinationHero3D;
