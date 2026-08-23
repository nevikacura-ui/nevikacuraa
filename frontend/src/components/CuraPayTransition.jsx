import React, { useState, useEffect, useRef } from 'react';

const phases = [
  { text: 'Initializing CuraPay', sub: 'Setting up secure channel' },
  { text: 'Verifying order', sub: 'Encrypting payment details' },
  { text: 'Securing payment', sub: 'Connecting to gateway' },
  { text: 'Almost there!', sub: 'Opening payment page...' },
];

/* ── Pure-CSS animated payment scene ── */
const PaymentScene = ({ phase }) => (
  <div className="relative w-64 h-44 mx-auto mb-4" style={{ animation: 'cpSceneIn 0.7s ease-out both' }}>
    <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Floor / counter surface */}
      <rect x="0" y="180" width="320" height="40" rx="4" fill="rgba(255,255,255,0.03)" />
      <line x1="0" y1="180" x2="320" y2="180" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

      {/* Payment Terminal */}
      <g style={{ animation: 'cpTerminalBob 3s ease-in-out infinite' }}>
        {/* Terminal body */}
        <rect x="60" y="90" width="56" height="90" rx="10" fill="#1a1a2e" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
        {/* Screen */}
        <rect x="68" y="100" width="40" height="32" rx="4" fill="#0f0f1a" />
        {/* Screen content - amount */}
        <rect x="74" y="108" width="28" height="4" rx="2" fill="rgba(16,185,129,0.5)" style={{ animation: phase >= 2 ? 'cpGlow 1s ease-in-out infinite alternate' : 'none' }} />
        <rect x="78" y="116" width="20" height="3" rx="1.5" fill="rgba(139,92,246,0.3)" />
        <rect x="74" y="123" width="28" height="3" rx="1.5" fill="rgba(255,255,255,0.08)" />
        {/* NFC icon on terminal */}
        <g transform="translate(80, 140)" style={{ animation: phase >= 1 ? 'cpNfcPulse 1.2s ease-in-out infinite' : 'none' }}>
          <path d="M4 12 C4 8, 8 4, 12 4" stroke={phase >= 2 ? '#10B981' : 'rgba(255,255,255,0.2)'} strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M4 8 C4 6, 6 4, 8 4" stroke={phase >= 2 ? '#10B981' : 'rgba(255,255,255,0.15)'} strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="4" cy="14" r="2" fill={phase >= 2 ? '#10B981' : 'rgba(255,255,255,0.15)'} />
        </g>
        {/* Terminal stand */}
        <rect x="78" y="175" width="20" height="6" rx="2" fill="#1a1a2e" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      </g>

      {/* Contactless waves - appear on tap */}
      {phase >= 2 && (
        <g transform="translate(118, 130)">
          <path d="M0 16 C4 12, 8 6, 14 0" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" style={{ animation: 'cpWave 0.8s ease-out infinite' }} />
          <path d="M0 16 C4 12, 8 6, 14 0" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" style={{ animation: 'cpWave 0.8s ease-out 0.3s infinite' }} />
          <path d="M0 16 C4 12, 8 6, 14 0" stroke="#10B981" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.3" style={{ animation: 'cpWave 0.8s ease-out 0.6s infinite' }} />
        </g>
      )}

      {/* Success checkmark on terminal screen */}
      {phase >= 3 && (
        <g transform="translate(80, 106)">
          <circle cx="14" cy="14" r="12" fill="rgba(16,185,129,0.2)" style={{ animation: 'cpCheckPop 0.4s ease-out both' }} />
          <path d="M8 14 L12 18 L20 10" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ animation: 'cpCheckDraw 0.4s ease-out 0.2s both', strokeDasharray: 20, strokeDashoffset: 20 }} />
        </g>
      )}

      {/* Person */}
      <g style={{ animation: 'cpPersonWalk 4.5s ease-in-out both' }}>
        {/* Body */}
        <rect x="200" y="105" width="36" height="50" rx="12" fill="#8B5CF6" />
        {/* Head */}
        <circle cx="218" cy="85" r="18" fill="#fbbf7a" />
        {/* Hair */}
        <path d="M200 80 Q205 65, 218 67 Q231 65, 236 80" fill="#3a2820" />
        {/* Eyes */}
        <circle cx="212" cy="84" r="2" fill="#1a1a2e" />
        <circle cx="224" cy="84" r="2" fill="#1a1a2e" />
        {/* Smile */}
        <path d="M213 92 Q218 96, 223 92" stroke="#c77a40" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {/* Legs */}
        <rect x="206" y="153" width="10" height="28" rx="5" fill="#2d2d4e" />
        <rect x="220" y="153" width="10" height="28" rx="5" fill="#2d2d4e" />
        {/* Shoes */}
        <rect x="203" y="177" width="15" height="6" rx="3" fill="#1a1a2e" />
        <rect x="218" y="177" width="15" height="6" rx="3" fill="#1a1a2e" />

        {/* Arm holding phone - animates toward terminal */}
        <g style={{ transformOrigin: '200px 120px', animation: 'cpArmTap 4.5s ease-in-out both' }}>
          {/* Arm */}
          <rect x="175" y="115" width="30" height="10" rx="5" fill="#fbbf7a" />
          {/* Phone in hand */}
          <g style={{ animation: phase >= 2 ? 'cpPhoneGlow 1s ease-in-out infinite alternate' : 'none' }}>
            <rect x="160" y="108" width="18" height="30" rx="4" fill="#0f0f1a" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            {/* Phone screen glow */}
            <rect x="163" y="112" width="12" height="18" rx="2" fill={phase >= 2 ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.1)'} />
            {/* Phone NFC icon */}
            <circle cx="169" cy="120" r="3" fill={phase >= 2 ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'} />
          </g>
        </g>
      </g>

      {/* Sparkle particles on success */}
      {phase >= 3 && [0,1,2,3,4,5].map(i => (
        <circle key={i} r="2"
          fill={i % 2 === 0 ? '#10B981' : '#8B5CF6'}
          style={{
            cx: 88 + Math.cos(i * 1.05) * (20 + i * 8),
            cy: 130 + Math.sin(i * 1.05) * (15 + i * 6),
            animation: `cpSparkle 0.8s ease-out ${i * 0.1}s both`,
          }}
        />
      ))}
    </svg>
  </div>
);

const CuraPayTransition = ({ amount, visible, onComplete }) => {
  const [phase, setPhase] = useState(0);
  const [show, setShow] = useState(false);
  const onCompleteRef = useRef(onComplete);

  // Always keep the ref up to date without restarting timers
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (visible) {
      setShow(true);
      setPhase(0);
      const t1 = setTimeout(() => setPhase(1), 1250);
      const t2 = setTimeout(() => setPhase(2), 2500);
      const t3 = setTimeout(() => setPhase(3), 3750);
      const t4 = setTimeout(() => { if (onCompleteRef.current) onCompleteRef.current(); }, 5000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    } else {
      setShow(false);
    }
  }, [visible]);

  if (!show) return null;

  const current = phases[phase] || phases[0];

  return (
    <div className="fixed inset-0 z-[9999]" data-testid="curapay-transition">
      {/* Deep background with subtle grain */}
      <div className="absolute inset-0" style={{
        background: '#030308',
        animation: 'cpFadeIn 0.4s ease-out',
      }} />

      {/* Glassmorphic ambient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute rounded-full" style={{
          width: '300px', height: '300px', top: '-8%', left: '-12%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 70%)',
          filter: 'blur(60px)', animation: 'cpOrb 8s ease-in-out infinite alternate',
        }} />
        <div className="absolute rounded-full" style={{
          width: '350px', height: '350px', bottom: '-12%', right: '-8%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          filter: 'blur(60px)', animation: 'cpOrb 9s ease-in-out 1.5s infinite alternate',
        }} />
        <div className="absolute rounded-full" style={{
          width: '200px', height: '200px', top: '35%', left: '50%', marginLeft: '-100px',
          background: 'radial-gradient(circle, rgba(251,146,60,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)', animation: 'cpOrb 6s ease-in-out 0.8s infinite alternate',
        }} />
      </div>

      {/* Center content */}
      <div className="relative flex flex-col items-center justify-center h-full px-5">

        {/* Glassmorphic main card — BIGGER */}
        <div className="w-full max-w-md rounded-3xl overflow-hidden" style={{
          background: 'rgba(255,255,255,0.025)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.2)',
          animation: 'cpCardEntry 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}>

          {/* Inner glass gradient strip */}
          <div className="h-1.5" style={{
            background: 'linear-gradient(90deg, #10B981, #8B5CF6, #F97316)',
            opacity: 0.6,
          }} />

          <div className="px-8 pt-7 pb-8 flex flex-col items-center">

            {/* Logo + Brand */}
            <div className="flex items-center gap-3 mb-2" style={{ animation: 'cpSlideUp 0.4s ease-out 0.2s both' }}>
              <img src="https://customer-assets.emergentagent.com/job_63b98a0f-e3c9-4fa0-a325-7dbd8b4c450b/artifacts/brfe80ec_file_00000000ca5c7208bdd5e559e8f91fba.png" alt="CuraPay" className="h-12 w-auto object-contain" style={{ filter: 'drop-shadow(0 0 12px rgba(16,185,129,0.3))' }} />
            </div>

            {/* Animated cartoon scene */}
            <PaymentScene phase={phase} />

            {/* Amount in glass pill */}
            {amount != null && (
              <div className="mb-4 px-7 py-2 rounded-2xl" style={{
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.12)',
                animation: 'cpSlideUp 0.5s ease-out 0.5s both',
              }}>
                <span className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  ₹{typeof amount === 'number' ? amount.toLocaleString('en-IN') : amount}
                </span>
              </div>
            )}

            {/* Phase text */}
            <div className="text-center min-h-[40px] mb-4">
              <p key={phase} className="text-sm font-semibold text-white/85" style={{
                animation: 'cpTextSwap 0.35s ease-out both', fontFamily: 'Outfit, sans-serif',
              }}>{current.text}</p>
              <p key={`s-${phase}`} className="text-[11px] text-white/30 mt-0.5" style={{
                animation: 'cpTextSwap 0.35s ease-out 0.08s both',
              }}>{current.sub}</p>
            </div>

            {/* Dot progress */}
            <div className="flex items-center gap-3">
              {phases.map((_, i) => (
                <div key={i} className="relative">
                  <div className="w-2 h-2 rounded-full transition-all duration-500" style={{
                    background: i <= phase ? 'linear-gradient(135deg, #10B981, #8B5CF6)' : 'rgba(255,255,255,0.06)',
                    boxShadow: i <= phase ? '0 0 8px rgba(16,185,129,0.4)' : 'none',
                    transform: i === phase ? 'scale(1.4)' : 'scale(1)',
                  }} />
                  {i === phase && <div className="absolute inset-0 rounded-full" style={{
                    background: 'rgba(16,185,129,0.3)', animation: 'cpDotPulse 1s ease-out infinite',
                  }} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security footer */}
        <div className="mt-5 flex items-center gap-2" style={{ animation: 'cpSlideUp 0.5s ease-out 0.7s both' }}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="rgba(16,185,129,0.35)" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[9px] text-white/15 tracking-wider">256-bit encrypted · PCI DSS compliant</span>
        </div>
      </div>

      <style>{`
        @keyframes cpFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes cpCardEntry{from{opacity:0;transform:translateY(40px) scale(0.92)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes cpSlideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cpTextSwap{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cpDotPulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(3.5);opacity:0}}
        @keyframes cpOrb{0%{transform:translate(0,0)}100%{transform:translate(25px,-20px)}}
        @keyframes cpSceneIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
        @keyframes cpTerminalBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
        @keyframes cpPersonWalk{0%{transform:translateX(40px)}25%{transform:translateX(0)}100%{transform:translateX(0)}}
        @keyframes cpArmTap{0%,20%{transform:rotate(0deg)}35%{transform:rotate(-25deg)}50%,65%{transform:rotate(-30deg) translateX(-8px)}80%{transform:rotate(-25deg)}100%{transform:rotate(0deg)}}
        @keyframes cpNfcPulse{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes cpWave{0%{transform:translate(0,0) scale(1);opacity:.6}100%{transform:translate(8px,-8px) scale(1.5);opacity:0}}
        @keyframes cpPhoneGlow{0%{filter:drop-shadow(0 0 2px rgba(16,185,129,0.1))}100%{filter:drop-shadow(0 0 8px rgba(16,185,129,0.3))}}
        @keyframes cpCheckPop{from{transform:scale(0)}to{transform:scale(1)}}
        @keyframes cpCheckDraw{to{stroke-dashoffset:0}}
        @keyframes cpSparkle{0%{transform:scale(0);opacity:1}60%{transform:scale(1.5);opacity:.8}100%{transform:scale(0);opacity:0}}
        @keyframes cpGlow{0%{fill:rgba(16,185,129,0.4)}100%{fill:rgba(16,185,129,0.7)}}
      `}</style>
    </div>
  );
};

export default CuraPayTransition;
