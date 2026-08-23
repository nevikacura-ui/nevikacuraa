import React from 'react';

const EverCareHero3D = () => {
  return (
    <div className="relative w-72 h-72 mx-auto" style={{ perspective: '800px' }}>
      <style>{`
        @keyframes ecFloat { 0%,100% { transform: translateY(0) rotateZ(0deg); } 50% { transform: translateY(-11px) rotateZ(2deg); } }
        @keyframes ecFloat2 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-13px); } }
        @keyframes ecBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes ecPulse { 0%,100% { opacity:0.35; transform: scale(1); } 50% { opacity:0.8; transform: scale(1.3); } }
        @keyframes ecHeartbeat { 0%,100% { transform: scale(1); } 15% { transform: scale(1.12); } 30% { transform: scale(1); } 45% { transform: scale(1.08); } 60% { transform: scale(1); } }
        @keyframes ecEcg { 0% { stroke-dashoffset: 100; } 100% { stroke-dashoffset: 0; } }
        .ec-sparkle { position:absolute; border-radius:50%; background:white; }
      `}</style>

      <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)' }} />

      {/* === HEART with ECG (center) === */}
      <div className="absolute" style={{ left: '50%', top: '38%', transform: 'translate(-50%, -50%)', animation: 'ecFloat 5s ease-in-out infinite', zIndex: 10 }}>
        {/* Heart */}
        <div style={{ animation: 'ecHeartbeat 2s ease-in-out infinite' }}>
          <svg width="90" height="82" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 8px 24px rgba(168,85,247,0.25))' }}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#ecGrad)" />
            <defs><linearGradient id="ecGrad" x1="2" y1="3" x2="22" y2="21"><stop stopColor="#A855F7"/><stop offset="1" stopColor="#7C3AED"/></linearGradient></defs>
          </svg>
        </div>
        {/* ECG line on heart */}
        <svg width="60" height="24" viewBox="0 0 60 24" fill="none" style={{ position: 'absolute', top: '38%', left: '17%' }}>
          <polyline points="0,12 10,12 15,4 20,20 25,8 30,16 35,12 60,12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray="100" style={{ animation: 'ecEcg 2.5s linear infinite' }} />
        </svg>
      </div>

      {/* === BP MONITOR (top-left) === */}
      <div className="absolute" style={{ top: '8%', left: '5%', animation: 'ecFloat2 4.5s ease-in-out infinite 0.3s', zIndex: 5 }}>
        <div style={{ width: 44, height: 38, background: 'linear-gradient(145deg, #FFFFFF, #F3E8FF)', borderRadius: 8, boxShadow: '0 6px 16px rgba(168,85,247,0.15), inset 0 1px 2px rgba(255,255,255,0.5)', border: '2px solid rgba(168,85,247,0.15)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 24, height: 16, borderRadius: 4, background: 'linear-gradient(135deg, #C4B5FD, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: 7, fontWeight: 900 }}>120</span>
          </div>
          <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
        </div>
      </div>

      {/* === MEDICINE BOTTLE (top-right) === */}
      <div className="absolute" style={{ top: '10%', right: '8%', animation: 'ecBob 4s ease-in-out infinite 1s', zIndex: 5 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 18, height: 8, background: 'linear-gradient(135deg, #E879F9, #D946EF)', borderRadius: '4px 4px 0 0', margin: '0 auto' }} />
          <div style={{ width: 28, height: 36, background: 'linear-gradient(145deg, #F5F3FF, #EDE9FE)', borderRadius: '0 0 6px 6px', border: '2px solid rgba(168,85,247,0.12)', boxShadow: '0 4px 10px rgba(168,85,247,0.15)' }}>
            <div style={{ width: 8, height: 2, background: '#A855F7', borderRadius: 1, margin: '8px auto 0' }} />
            <div style={{ width: 8, height: 8, background: '#A855F7', borderRadius: '50%', margin: '3px auto 0', opacity: 0.6 }} />
          </div>
        </div>
      </div>

      {/* === STETHOSCOPE (left) === */}
      <div className="absolute" style={{ top: '48%', left: '3%', animation: 'ecFloat 5.5s ease-in-out infinite 0.5s', zIndex: 5 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(145deg, #F0ABFC, #D946EF)', boxShadow: '0 5px 14px rgba(217,70,239,0.25), inset 0 1px 2px rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 14, height: 14, border: '2.5px solid white', borderRadius: '50%', borderTop: 'none' }} />
        </div>
      </div>

      {/* === CLIPBOARD (bottom-right) === */}
      <div className="absolute" style={{ bottom: '18%', right: '8%', animation: 'ecFloat2 4s ease-in-out infinite 1.2s', zIndex: 5, transform: 'rotate(8deg)' }}>
        <div style={{ width: 32, height: 40, background: 'linear-gradient(145deg, #FDF2F8, #FCE7F3)', borderRadius: 5, boxShadow: '0 5px 14px rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.15)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)', width: 14, height: 6, background: '#EC4899', borderRadius: 3 }} />
          {[10, 17, 24, 31].map((t, i) => (
            <div key={i} style={{ position: 'absolute', top: t, left: 5, right: 5, height: 2, background: `rgba(236,72,153,${i === 0 ? 0.3 : 0.15})`, borderRadius: 1 }} />
          ))}
        </div>
      </div>

      {/* === PILL capsule (bottom-left) === */}
      <div className="absolute" style={{ bottom: '20%', left: '12%', animation: 'ecBob 3.5s ease-in-out infinite 0.4s', zIndex: 5, transform: 'rotate(-20deg)' }}>
        <div style={{ width: 34, height: 14, borderRadius: 999, overflow: 'hidden', boxShadow: '0 4px 10px rgba(168,85,247,0.2)', display: 'flex' }}>
          <div style={{ width: '50%', height: '100%', background: 'linear-gradient(135deg, #C084FC, #A855F7)' }} />
          <div style={{ width: '50%', height: '100%', background: 'linear-gradient(135deg, #FFFFFF, #F5F3FF)' }} />
        </div>
      </div>

      {/* Small round pill */}
      <div className="absolute" style={{ bottom: '35%', right: '22%', width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(145deg, #FCA5A5, #EF4444)', boxShadow: '0 3px 8px rgba(239,68,68,0.25)', animation: 'ecBob 4.2s ease-in-out infinite 1.5s' }} />

      {/* Sparkles */}
      <div className="ec-sparkle" style={{ top: '5%', left: '35%', width: 4, height: 4, animation: 'ecPulse 2.5s ease-in-out infinite' }} />
      <div className="ec-sparkle" style={{ top: '28%', right: '18%', width: 3, height: 3, animation: 'ecPulse 3s ease-in-out infinite 0.5s' }} />
      <div className="ec-sparkle" style={{ bottom: '42%', left: '28%', width: 4, height: 4, animation: 'ecPulse 2.8s ease-in-out infinite 1s' }} />
      <div className="ec-sparkle" style={{ top: '60%', right: '3%', width: 3, height: 3, animation: 'ecPulse 3.2s ease-in-out infinite 1.3s' }} />
      <div className="ec-sparkle" style={{ bottom: '10%', left: '45%', width: 5, height: 5, animation: 'ecPulse 2.6s ease-in-out infinite 0.8s' }} />
    </div>
  );
};

export default EverCareHero3D;
