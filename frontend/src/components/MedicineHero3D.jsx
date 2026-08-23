import React from 'react';

const MedicineHero3D = () => {
  return (
    <div className="relative w-72 h-72 mx-auto" style={{ perspective: '800px' }}>
      <style>{`
        @keyframes mhFloat { 0%,100% { transform: translateY(0) rotateZ(0deg); } 50% { transform: translateY(-10px) rotateZ(2deg); } }
        @keyframes mhFloat2 { 0%,100% { transform: translateY(0) rotateZ(0deg); } 50% { transform: translateY(-14px) rotateZ(-3deg); } }
        @keyframes mhBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes mhSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes mhPulse { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.3); } }
        @keyframes mhClockTick { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .mh-capsule { border-radius: 999px; position: absolute; }
        .mh-pill { border-radius: 50%; position: absolute; }
        .mh-sparkle { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: white; }
      `}</style>

      {/* Glow backdrop */}
      <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />

      {/* === ALARM CLOCK (center) === */}
      <div className="absolute" style={{ left: '50%', top: '42%', transform: 'translate(-50%, -50%)', animation: 'mhFloat 5s ease-in-out infinite', zIndex: 10 }}>
        {/* Clock bells */}
        <div className="absolute" style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B, #D97706)', top: -14, left: 8, boxShadow: '0 2px 6px rgba(245,158,11,0.3)' }} />
        <div className="absolute" style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B, #D97706)', top: -14, right: 8, boxShadow: '0 2px 6px rgba(245,158,11,0.3)' }} />
        {/* Bell connector */}
        <div className="absolute" style={{ width: 10, height: 6, background: 'linear-gradient(135deg, #D97706, #B45309)', top: -6, left: '50%', transform: 'translateX(-50%)', borderRadius: 3 }} />
        {/* Clock body */}
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(145deg, #FB923C, #EA580C)', boxShadow: '0 12px 32px rgba(234,88,12,0.3), inset 0 2px 4px rgba(255,255,255,0.3)', position: 'relative' }}>
          {/* Inner face */}
          <div className="absolute" style={{ top: 6, left: 6, right: 6, bottom: 6, borderRadius: '50%', background: 'linear-gradient(145deg, #FFF7ED, #FFEDD5)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
            {/* Hour markers */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
              <div key={i} className="absolute" style={{ width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 6 : 4, background: '#9A3412', borderRadius: 2, top: '50%', left: '50%', transformOrigin: '50% 0', transform: `rotate(${deg}deg) translate(-50%, -32px)` }} />
            ))}
            {/* Hour hand */}
            <div className="absolute" style={{ width: 3, height: 18, background: 'linear-gradient(to top, #7C2D12, #9A3412)', borderRadius: 2, top: '50%', left: '50%', transformOrigin: 'center top', transform: 'translate(-50%, -100%) rotate(-60deg)' }} />
            {/* Minute hand */}
            <div className="absolute" style={{ width: 2, height: 24, background: 'linear-gradient(to top, #9A3412, #B45309)', borderRadius: 2, top: '50%', left: '50%', transformOrigin: 'center top', transform: 'translate(-50%, -100%) rotate(75deg)', animation: 'mhClockTick 30s linear infinite' }} />
            {/* Center dot */}
            <div className="absolute" style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C2D12', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          </div>
        </div>
        {/* Clock feet */}
        <div className="absolute" style={{ width: 10, height: 12, background: 'linear-gradient(135deg, #F59E0B, #B45309)', bottom: -8, left: 14, borderRadius: '0 0 4px 4px', transform: 'rotate(-10deg)' }} />
        <div className="absolute" style={{ width: 10, height: 12, background: 'linear-gradient(135deg, #F59E0B, #B45309)', bottom: -8, right: 14, borderRadius: '0 0 4px 4px', transform: 'rotate(10deg)' }} />
      </div>

      {/* === FLOATING CAPSULES === */}
      {/* Purple-white capsule — top left */}
      <div className="mh-capsule" style={{ width: 42, height: 18, top: '8%', left: '8%', overflow: 'hidden', animation: 'mhFloat2 4.5s ease-in-out infinite 0.3s', transform: 'rotate(-25deg)', boxShadow: '0 6px 16px rgba(139,92,246,0.25)' }}>
        <div style={{ width: '50%', height: '100%', background: 'linear-gradient(135deg, #A78BFA, #7C3AED)', position: 'absolute', left: 0 }} />
        <div style={{ width: '50%', height: '100%', background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', position: 'absolute', right: 0 }} />
        <div style={{ position: 'absolute', top: 2, left: 4, width: 8, height: 3, background: 'rgba(255,255,255,0.4)', borderRadius: 4 }} />
      </div>

      {/* Purple-white capsule — right */}
      <div className="mh-capsule" style={{ width: 38, height: 16, top: '18%', right: '5%', overflow: 'hidden', animation: 'mhFloat 5.5s ease-in-out infinite 0.8s', transform: 'rotate(20deg)', boxShadow: '0 6px 16px rgba(139,92,246,0.2)' }}>
        <div style={{ width: '50%', height: '100%', background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', position: 'absolute', left: 0 }} />
        <div style={{ width: '50%', height: '100%', background: 'linear-gradient(135deg, #FFFFFF, #F5F3FF)', position: 'absolute', right: 0 }} />
        <div style={{ position: 'absolute', top: 2, left: 3, width: 7, height: 3, background: 'rgba(255,255,255,0.35)', borderRadius: 3 }} />
      </div>

      {/* Orange-white capsule — bottom right */}
      <div className="mh-capsule" style={{ width: 36, height: 15, bottom: '20%', right: '12%', overflow: 'hidden', animation: 'mhFloat2 4s ease-in-out infinite 1.2s', transform: 'rotate(40deg)', boxShadow: '0 6px 14px rgba(249,115,22,0.2)' }}>
        <div style={{ width: '50%', height: '100%', background: 'linear-gradient(135deg, #FB923C, #EA580C)', position: 'absolute', left: 0 }} />
        <div style={{ width: '50%', height: '100%', background: 'linear-gradient(135deg, #FFFFFF, #FFF7ED)', position: 'absolute', right: 0 }} />
      </div>

      {/* Purple-white capsule — bottom left */}
      <div className="mh-capsule" style={{ width: 34, height: 14, bottom: '15%', left: '5%', overflow: 'hidden', animation: 'mhFloat 5s ease-in-out infinite 0.5s', transform: 'rotate(-15deg)', boxShadow: '0 5px 12px rgba(139,92,246,0.2)' }}>
        <div style={{ width: '50%', height: '100%', background: 'linear-gradient(135deg, #C4B5FD, #8B5CF6)', position: 'absolute', left: 0 }} />
        <div style={{ width: '50%', height: '100%', background: 'linear-gradient(135deg, #FFFFFF, #EDE9FE)', position: 'absolute', right: 0 }} />
      </div>

      {/* === ROUND PILLS === */}
      {/* Pink pill — below clock left */}
      <div className="mh-pill" style={{ width: 22, height: 22, bottom: '30%', left: '22%', background: 'linear-gradient(145deg, #F9A8D4, #EC4899)', boxShadow: '0 4px 12px rgba(236,72,153,0.3), inset 0 1px 2px rgba(255,255,255,0.4)', animation: 'mhBob 3.5s ease-in-out infinite 0.4s' }} />

      {/* Blue pill — top right area */}
      <div className="mh-pill" style={{ width: 20, height: 20, top: '30%', right: '15%', background: 'linear-gradient(145deg, #93C5FD, #3B82F6)', boxShadow: '0 4px 12px rgba(59,130,246,0.3), inset 0 1px 2px rgba(255,255,255,0.4)', animation: 'mhBob 4s ease-in-out infinite 1s' }} />

      {/* Orange pill — bottom center */}
      <div className="mh-pill" style={{ width: 18, height: 18, bottom: '25%', left: '48%', background: 'linear-gradient(145deg, #FCD34D, #F59E0B)', boxShadow: '0 4px 10px rgba(245,158,11,0.3), inset 0 1px 2px rgba(255,255,255,0.4)', animation: 'mhBob 3.8s ease-in-out infinite 0.7s' }} />

      {/* Small teal pill — left middle */}
      <div className="mh-pill" style={{ width: 14, height: 14, top: '50%', left: '8%', background: 'linear-gradient(145deg, #5EEAD4, #14B8A6)', boxShadow: '0 3px 8px rgba(20,184,166,0.3)', animation: 'mhBob 4.2s ease-in-out infinite 1.5s' }} />

      {/* Large blue pill with divider — bottom right */}
      <div className="mh-pill" style={{ width: 24, height: 24, bottom: '35%', right: '20%', background: 'linear-gradient(145deg, #818CF8, #6366F1)', boxShadow: '0 5px 14px rgba(99,102,241,0.3), inset 0 1px 2px rgba(255,255,255,0.3)', animation: 'mhBob 3.6s ease-in-out infinite 0.2s' }}>
        <div style={{ position: 'absolute', top: '50%', left: 2, right: 2, height: 1, background: 'rgba(255,255,255,0.3)', transform: 'translateY(-50%)' }} />
      </div>

      {/* === SPARKLES === */}
      <div className="mh-sparkle" style={{ top: '12%', left: '40%', animation: 'mhPulse 2.5s ease-in-out infinite' }} />
      <div className="mh-sparkle" style={{ top: '25%', right: '25%', animation: 'mhPulse 3s ease-in-out infinite 0.5s', width: 3, height: 3 }} />
      <div className="mh-sparkle" style={{ bottom: '40%', left: '30%', animation: 'mhPulse 2.8s ease-in-out infinite 1s' }} />
      <div className="mh-sparkle" style={{ top: '55%', right: '8%', animation: 'mhPulse 3.2s ease-in-out infinite 1.3s', width: 3, height: 3 }} />
      <div className="mh-sparkle" style={{ bottom: '18%', left: '42%', animation: 'mhPulse 2.6s ease-in-out infinite 0.8s', width: 5, height: 5 }} />
      <div className="mh-sparkle" style={{ top: '5%', right: '35%', animation: 'mhPulse 3.5s ease-in-out infinite 0.3s', width: 3, height: 3 }} />
      <div className="mh-sparkle" style={{ bottom: '45%', right: '5%', animation: 'mhPulse 2.4s ease-in-out infinite 1.6s' }} />
    </div>
  );
};

export default MedicineHero3D;
