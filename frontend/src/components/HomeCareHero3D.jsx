import React from 'react';

const HomeCareHero3D = () => {
  return (
    <div className="relative w-72 h-72 mx-auto" style={{ perspective: '800px' }}>
      <style>{`
        @keyframes hcFloat { 0%,100% { transform: translateY(0) rotateZ(0deg); } 50% { transform: translateY(-10px) rotateZ(2deg); } }
        @keyframes hcFloat2 { 0%,100% { transform: translateY(0) rotateZ(0deg); } 50% { transform: translateY(-12px) rotateZ(-2deg); } }
        @keyframes hcBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes hcPulse { 0%,100% { opacity:0.35; transform: scale(1); } 50% { opacity:0.8; transform: scale(1.3); } }
        @keyframes hcHeartbeat { 0%,100% { transform: scale(1); } 15% { transform: scale(1.15); } 30% { transform: scale(1); } 45% { transform: scale(1.1); } 60% { transform: scale(1); } }
        .hc-sparkle { position:absolute; border-radius:50%; background:white; }
      `}</style>

      {/* Glow */}
      <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)' }} />

      {/* === HOUSE (center) === */}
      <div className="absolute" style={{ left: '50%', top: '40%', transform: 'translate(-50%, -50%)', animation: 'hcFloat 5s ease-in-out infinite', zIndex: 10 }}>
        {/* Roof */}
        <div style={{ width: 0, height: 0, borderLeft: '55px solid transparent', borderRight: '55px solid transparent', borderBottom: '40px solid #059669', position: 'relative', left: '-6px', filter: 'drop-shadow(0 -2px 4px rgba(5,150,105,0.2))' }}>
          {/* Chimney */}
          <div style={{ position: 'absolute', top: -8, right: -30, width: 14, height: 22, background: 'linear-gradient(135deg, #DC2626, #EF4444)', borderRadius: '2px 2px 0 0', boxShadow: '0 2px 6px rgba(220,38,38,0.2)' }} />
        </div>
        {/* House body */}
        <div style={{ width: 98, height: 70, background: 'linear-gradient(145deg, #ECFDF5, #D1FAE5)', borderRadius: '0 0 12px 12px', position: 'relative', left: '-6px', boxShadow: '0 10px 30px rgba(16,185,129,0.2), inset 0 1px 2px rgba(255,255,255,0.5)', border: '2px solid rgba(16,185,129,0.15)' }}>
          {/* Medical cross on door */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div style={{ width: 20, height: 36, background: 'linear-gradient(135deg, #10B981, #059669)', borderRadius: 4, position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 14, height: 4, background: 'white', borderRadius: 2 }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 4, height: 14, background: 'white', borderRadius: 2 }} />
            </div>
          </div>
          {/* Windows */}
          <div style={{ position: 'absolute', top: 12, left: 10, width: 18, height: 18, background: 'linear-gradient(135deg, #A7F3D0, #6EE7B7)', borderRadius: 4, border: '2px solid rgba(16,185,129,0.2)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)' }} />
          <div style={{ position: 'absolute', top: 12, right: 10, width: 18, height: 18, background: 'linear-gradient(135deg, #A7F3D0, #6EE7B7)', borderRadius: 4, border: '2px solid rgba(16,185,129,0.2)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)' }} />
        </div>
      </div>

      {/* === STETHOSCOPE (top-left) === */}
      <div className="absolute" style={{ top: '10%', left: '5%', animation: 'hcFloat2 4.5s ease-in-out infinite 0.3s', zIndex: 5 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(145deg, #6EE7B7, #10B981)', boxShadow: '0 6px 16px rgba(16,185,129,0.25), inset 0 1px 2px rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 18, height: 18, border: '3px solid white', borderRadius: '50%', borderTop: 'none', position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: -3, left: -3, width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
            <div style={{ position: 'absolute', bottom: -3, right: -3, width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
          </div>
        </div>
      </div>

      {/* === HEART (top-right) === */}
      <div className="absolute" style={{ top: '12%', right: '10%', animation: 'hcHeartbeat 2.5s ease-in-out infinite', zIndex: 5 }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#hcHeart)" />
          <defs><linearGradient id="hcHeart" x1="2" y1="3" x2="22" y2="21"><stop stopColor="#F472B6"/><stop offset="1" stopColor="#EC4899"/></linearGradient></defs>
        </svg>
      </div>

      {/* === NURSE CAP (right) === */}
      <div className="absolute" style={{ top: '35%', right: '5%', animation: 'hcBob 4s ease-in-out infinite 0.8s', zIndex: 5 }}>
        <div style={{ width: 38, height: 26, background: 'linear-gradient(145deg, #FFFFFF, #F0FDF9)', borderRadius: '6px 6px 0 0', border: '2px solid rgba(16,185,129,0.2)', position: 'relative', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: 10, height: 3, background: '#EF4444', borderRadius: 2 }} />
          <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: 3, height: 10, background: '#EF4444', borderRadius: 2 }} />
        </div>
      </div>

      {/* === CLIPBOARD (bottom-left) === */}
      <div className="absolute" style={{ bottom: '18%', left: '8%', animation: 'hcFloat 5.5s ease-in-out infinite 1.2s', zIndex: 5, transform: 'rotate(-10deg)' }}>
        <div style={{ width: 34, height: 42, background: 'linear-gradient(145deg, #FEF3C7, #FDE68A)', borderRadius: 5, boxShadow: '0 5px 14px rgba(245,158,11,0.2)', position: 'relative', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', width: 16, height: 7, background: '#F59E0B', borderRadius: 3 }} />
          {[12, 20, 28].map((t, i) => (
            <div key={i} style={{ position: 'absolute', top: t, left: 6, right: 6, height: 2, background: 'rgba(180,131,9,0.2)', borderRadius: 1 }} />
          ))}
        </div>
      </div>

      {/* === PILL (bottom-right) === */}
      <div className="absolute" style={{ bottom: '22%', right: '12%', animation: 'hcBob 3.5s ease-in-out infinite 0.5s', zIndex: 5 }}>
        <div style={{ width: 36, height: 16, borderRadius: 999, overflow: 'hidden', boxShadow: '0 4px 10px rgba(59,130,246,0.2)', display: 'flex' }}>
          <div style={{ width: '50%', height: '100%', background: 'linear-gradient(135deg, #60A5FA, #3B82F6)' }} />
          <div style={{ width: '50%', height: '100%', background: 'linear-gradient(135deg, #FFFFFF, #EFF6FF)' }} />
        </div>
      </div>

      {/* Small heart — bottom center */}
      <div className="absolute" style={{ bottom: '32%', left: '42%', animation: 'hcHeartbeat 3s ease-in-out infinite 1.5s' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#F9A8D4"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      </div>

      {/* Sparkles */}
      <div className="hc-sparkle" style={{ top: '6%', left: '38%', width: 4, height: 4, animation: 'hcPulse 2.5s ease-in-out infinite' }} />
      <div className="hc-sparkle" style={{ top: '22%', right: '22%', width: 3, height: 3, animation: 'hcPulse 3s ease-in-out infinite 0.5s' }} />
      <div className="hc-sparkle" style={{ bottom: '38%', left: '25%', width: 4, height: 4, animation: 'hcPulse 2.8s ease-in-out infinite 1s' }} />
      <div className="hc-sparkle" style={{ top: '55%', right: '4%', width: 3, height: 3, animation: 'hcPulse 3.2s ease-in-out infinite 1.3s' }} />
      <div className="hc-sparkle" style={{ bottom: '12%', left: '50%', width: 5, height: 5, animation: 'hcPulse 2.6s ease-in-out infinite 0.8s' }} />
    </div>
  );
};

export default HomeCareHero3D;
