import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Play } from 'lucide-react';

const NEON = '#10b981'; // Mango emerald
const BG = '#0A0A0F';

/**
 * MangoTutorial — 4-slide NeonLine animated tutorial
 * Slides: Test Booked → Sample Collection → Test in Process → Report Ready
 */
const MangoTutorial = ({ open, onClose }) => {
  const [slide, setSlide] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!open) { setSlide(0); setPlaying(false); return; }
    setPlaying(true);
  }, [open]);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (slide < 3) setSlide(s => s + 1);
      else { setPlaying(false); }
    }, 2800);
    return () => clearTimeout(t);
  }, [slide, playing]);

  const replay = useCallback(() => { setSlide(0); setPlaying(true); }, []);

  if (!open) return null;

  const labels = ['Test Booked', 'Sample Collection', 'Test in Process', 'Report Ready'];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" data-testid="mango-tutorial">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[92vw] max-w-sm rounded-2xl" style={{ background: BG, border: `1px solid ${NEON}20` }}>
        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }} data-testid="tutorial-close">
          <X className="w-4 h-4 text-white/40" />
        </button>

        {/* Title */}
        <div className="px-5 pt-3 pb-0">
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: `${NEON}80` }}>How It Works</p>
        </div>

        {/* Slide viewport */}
        <div className="relative px-5 pb-2" style={{ height: 260 }}>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full" style={{ width: 300, height: 300, background: `radial-gradient(circle, ${NEON}12 0%, ${NEON}04 45%, transparent 70%)`, filter: 'blur(40px)' }} />
          </div>
          {/* Render current slide */}
          <div key={slide} className="relative w-full h-full flex items-center justify-center" style={{ animation: 'ntSlideIn 0.4s ease-out both' }}>
            {slide === 0 && <SlideTestBooked />}
            {slide === 1 && <SlideCollection />}
            {slide === 2 && <SlideInProcess />}
            {slide === 3 && <SlideReportReady />}
          </div>
        </div>

        {/* Label + step dots */}
        <div className="px-5 pb-5">
          <p className="text-white/90 text-sm font-bold text-center mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>{labels[slide]}</p>
          <p className="text-white/30 text-[11px] text-center mb-4">Step {slide + 1} of 4</p>
          <div className="flex items-center justify-center gap-2">
            {[0,1,2,3].map(i => (
              <button key={i} onClick={() => { setSlide(i); setPlaying(false); }} className="transition-all" data-testid={`tutorial-dot-${i}`}>
                <div className="rounded-full transition-all" style={{
                  width: slide === i ? 20 : 6, height: 6,
                  background: slide === i ? NEON : `${NEON}30`,
                  boxShadow: slide === i ? `0 0 8px ${NEON}50` : 'none',
                }} />
              </button>
            ))}
            {/* Replay button */}
            {!playing && slide === 3 && (
              <button onClick={replay} className="ml-3 flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full active:scale-95 transition-all" style={{ color: NEON, background: `${NEON}15`, border: `1px solid ${NEON}30` }} data-testid="tutorial-replay">
                <Play className="w-3 h-3" /> Replay
              </button>
            )}
          </div>
        </div>

        <style>{`
          @keyframes ntSlideIn { 0% { opacity:0; transform:translateX(30px); } 100% { opacity:1; transform:translateX(0); } }
          @keyframes ntDraw { 0% { stroke-dashoffset:var(--len); } 100% { stroke-dashoffset:0; } }
          @keyframes ntFadeUp { 0% { opacity:0; transform:translateY(8px); } 100% { opacity:1; transform:translateY(0); } }
          @keyframes ntPulse { 0%,100% { opacity:0.15; } 50% { opacity:0.4; } }
          @keyframes ntRing { 0% { r:8; opacity:0.4; } 100% { r:20; opacity:0; } }
          @keyframes ntBounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-3px); } }
        `}</style>
      </div>
    </div>,
    document.body
  );
};

/* ═══ SLIDE 1: Test Booked ═══ */
const SlideTestBooked = () => (
  <svg viewBox="30 10 215 180" className="w-full h-full">
    <defs>
      <filter id="ntG1"><feGaussianBlur stdDeviation="3" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
    </defs>
    {/* Phone */}
    <g filter="url(#ntG1)" style={{ animation: 'ntFadeUp 0.5s ease-out 0.1s both' }}>
      <rect x="55" y="20" width="70" height="130" rx="10" fill="rgba(16,185,129,0.03)" stroke="#10b981" strokeWidth="1.3" opacity="0.8" />
      <rect x="55" y="20" width="70" height="18" rx="10" fill="rgba(16,185,129,0.15)" />
      <rect x="55" y="34" width="70" height="6" fill="rgba(16,185,129,0.15)" />
      <circle cx="90" cy="29" r="2" fill="#10b981" opacity="0.4" />
      {/* Screen content - calendar */}
      <rect x="63" y="50" width="54" height="8" rx="3" fill="rgba(16,185,129,0.12)" />
      {[0,1,2].map(r => [0,1,2,3,4].map(c => (
        <rect key={`p-${r}-${c}`} x={65+c*10} y={65+r*12} width="7" height="7" rx="2" fill={r===1&&c===2 ? '#10b981' : 'rgba(16,185,129,0.08)'} opacity={r===1&&c===2 ? 0.6 : 0.4} />
      )))}
      {/* Tick on selected */}
      <path d="M82 75 L85 78 L91 72" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="16" strokeDashoffset="16" style={{ animation: 'ntDraw 0.4s ease-out 1.2s forwards', '--len': 16 }} />
      {/* Confirm button */}
      <rect x="65" y="110" width="50" height="12" rx="6" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="0.8" opacity="0.6" />
      <rect x="75" y="114" width="30" height="4" rx="2" fill="#10b981" opacity="0.4" />
      {/* Home button */}
      <rect x="82" y="140" width="16" height="3" rx="1.5" fill="rgba(16,185,129,0.15)" />
    </g>
    {/* Lady on couch */}
    <g filter="url(#ntG1)" style={{ animation: 'ntFadeUp 0.5s ease-out 0.3s both' }}>
      {/* Couch */}
      <path d="M140,165 Q135,140 160,140 L220,140 Q235,140 230,165 Z" fill="rgba(16,185,129,0.03)" stroke="#10b981" strokeWidth="1" opacity="0.4" />
      <path d="M138,165 L232,165" stroke="#10b981" strokeWidth="1" opacity="0.3" />
      {/* Person sitting */}
      <circle cx="185" cy="105" r="11" fill="rgba(16,185,129,0.03)" stroke="#10b981" strokeWidth="1.1" opacity="0.6" />
      <circle cx="182" cy="103" r="1.3" fill="#10b981" opacity="0.5" />
      <circle cx="188" cy="103" r="1.3" fill="#10b981" opacity="0.5" />
      <path d="M183,109 Q185,111 187,109" fill="none" stroke="#10b981" strokeWidth="0.7" opacity="0.4" />
      {/* Hair */}
      <ellipse cx="185" cy="96" rx="13" ry="14" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.35" />
      {/* Body */}
      <path d="M175,116 Q172,140 170,155 L200,155 Q198,140 195,116 Z" fill="rgba(16,185,129,0.03)" stroke="#10b981" strokeWidth="1" opacity="0.5" />
      {/* Arm holding phone */}
      <path d="M175,125 L145,135 L140,130" fill="none" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      {/* Legs */}
      <line x1="178" y1="155" x2="175" y2="175" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="192" y1="155" x2="195" y2="175" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
    </g>
    {/* Notification bell */}
    <g transform="translate(42,55)" style={{ animation: 'ntBounce 1.5s ease-in-out 1.5s infinite' }}>
      <path d="M0,-8 Q0,-14 6,-14 Q12,-14 12,-8 L12,0 Q12,4 6,4 Q0,4 0,0 Z" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.5" />
      <circle cx="6" cy="6" r="1.5" fill="#10b981" opacity="0.4" />
      <circle cx="6" cy="-8" r="4" fill="#10b981" opacity="0">
        <animate attributeName="opacity" values="0;0.2;0" dur="1.5s" begin="1.5s" repeatCount="indefinite" />
        <animate attributeName="r" values="4;12;12" dur="1.5s" begin="1.5s" repeatCount="indefinite" />
      </circle>
    </g>
    {/* Particles */}
    {[30,150,270].map((a,i) => { const r=a*Math.PI/180; return <circle key={i} cx={120+Math.cos(r)*100} cy={120+Math.sin(r)*90} r="1.5" fill="#10b981" opacity="0.1"><animate attributeName="opacity" values="0.05;0.2;0.05" dur={`${2+i*0.4}s`} repeatCount="indefinite"/></circle>; })}
  </svg>
);

/* ═══ SLIDE 2: Sample Collection ═══ */
const SlideCollection = () => (
  <svg viewBox="15 55 200 165" className="w-full h-full">
    <defs><filter id="ntG2"><feGaussianBlur stdDeviation="3" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
    {/* Patient sitting on chair */}
    <g filter="url(#ntG2)" style={{ animation: 'ntFadeUp 0.5s ease-out 0.1s both' }}>
      {/* Chair */}
      <rect x="30" y="155" width="55" height="35" rx="4" fill="rgba(16,185,129,0.02)" stroke="#10b981" strokeWidth="1" opacity="0.35" />
      <line x1="35" y1="190" x2="35" y2="210" stroke="#10b981" strokeWidth="1" opacity="0.3" />
      <line x1="80" y1="190" x2="80" y2="210" stroke="#10b981" strokeWidth="1" opacity="0.3" />
      {/* Patient */}
      <circle cx="57" cy="110" r="12" fill="rgba(16,185,129,0.03)" stroke="#10b981" strokeWidth="1.1" opacity="0.6" />
      <circle cx="54" cy="108" r="1.3" fill="#10b981" opacity="0.45" />
      <circle cx="60" cy="108" r="1.3" fill="#10b981" opacity="0.45" />
      <ellipse cx="57" cy="100" rx="14" ry="13" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.35" />
      <path d="M45,122 Q42,145 40,160 L74,160 Q72,145 69,122 Z" fill="rgba(16,185,129,0.02)" stroke="#10b981" strokeWidth="1" opacity="0.5" />
      {/* Extended arm for blood draw */}
      <path d="M69,130 L115,125 L120,122" fill="none" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      <line x1="52" y1="160" x2="48" y2="195" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="62" y1="160" x2="66" y2="195" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
    </g>
    {/* Phlebotomist */}
    <g filter="url(#ntG2)" style={{ animation: 'ntFadeUp 0.5s ease-out 0.3s both' }}>
      <circle cx="160" cy="80" r="12" fill="rgba(16,185,129,0.03)" stroke="#10b981" strokeWidth="1.1" opacity="0.6" />
      <circle cx="157" cy="78" r="1.3" fill="#10b981" opacity="0.45" />
      <circle cx="163" cy="78" r="1.3" fill="#10b981" opacity="0.45" />
      <ellipse cx="160" cy="72" rx="14" ry="13" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.35" />
      <path d="M148,92 Q145,125 142,155 L178,155 Q175,125 172,92 Z" fill="rgba(16,185,129,0.02)" stroke="#10b981" strokeWidth="1" opacity="0.5" />
      {/* Arm reaching to patient's arm — syringe */}
      <path d="M148,105 L125,118 L120,122" fill="none" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      <line x1="155" y1="155" x2="152" y2="195" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="165" y1="155" x2="168" y2="195" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      {/* Lab coat detail */}
      <path d="M148,92 L145,95 L147,100" fill="none" stroke="#10b981" strokeWidth="0.7" opacity="0.3" />
      {/* Cross on coat */}
      <rect x="156" y="100" width="8" height="2.5" rx="1" fill="#10b981" opacity="0.3" />
      <rect x="159" y="97" width="2.5" height="8" rx="1" fill="#10b981" opacity="0.3" />
    </g>
    {/* Syringe / Needle at contact point */}
    <g transform="translate(118,118)" style={{ animation: 'ntFadeUp 0.4s ease-out 0.7s both' }}>
      <rect x="-2" y="-8" width="4" height="16" rx="1.5" fill="rgba(16,185,129,0.08)" stroke="#10b981" strokeWidth="0.8" opacity="0.6" />
      <line x1="0" y1="-8" x2="0" y2="-14" stroke="#10b981" strokeWidth="0.8" opacity="0.5" />
      {/* Blood drop */}
      <circle cx="0" cy="12" r="3" fill="#10b981" opacity="0">
        <animate attributeName="opacity" values="0;0.3;0.3;0" dur="2.5s" begin="1s" repeatCount="indefinite" keyTimes="0;0.3;0.7;1" />
        <animate attributeName="cy" values="12;18;18" dur="2.5s" begin="1s" repeatCount="indefinite" keyTimes="0;0.4;1" />
      </circle>
    </g>
    {/* Test tube being filled */}
    <g transform="translate(190,130)" style={{ animation: 'ntFadeUp 0.4s ease-out 0.9s both' }}>
      <rect x="-6" y="0" width="12" height="40" rx="4" fill="rgba(16,185,129,0.03)" stroke="#10b981" strokeWidth="1" opacity="0.5" />
      <rect x="-4" y="20" width="8" height="18" rx="3" fill="#10b981" opacity="0">
        <animate attributeName="opacity" values="0;0.15;0.15" dur="2.5s" begin="1.2s" fill="freeze" keyTimes="0;0.5;1" />
        <animate attributeName="height" values="0;18;18" dur="2.5s" begin="1.2s" fill="freeze" keyTimes="0;0.5;1" />
      </rect>
      <rect x="-8" y="-3" width="16" height="5" rx="2" fill="rgba(16,185,129,0.1)" stroke="#10b981" strokeWidth="0.7" opacity="0.5" />
    </g>
    {[60,200,320].map((a,i) => { const r=a*Math.PI/180; return <circle key={i} cx={120+Math.cos(r)*100} cy={120+Math.sin(r)*90} r="1.5" fill="#10b981" opacity="0.1"><animate attributeName="opacity" values="0.05;0.2;0.05" dur={`${2+i*0.4}s`} repeatCount="indefinite"/></circle>; })}
  </svg>
);

/* ═══ SLIDE 3: Test in Process ═══ */
const SlideInProcess = () => (
  <svg viewBox="15 45 205 160" className="w-full h-full">
    <defs><filter id="ntG3"><feGaussianBlur stdDeviation="3" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
    {/* Microscope */}
    <g filter="url(#ntG3)" style={{ animation: 'ntFadeUp 0.5s ease-out 0.1s both' }}>
      {/* Base */}
      <rect x="25" y="180" width="70" height="8" rx="3" fill="rgba(16,185,129,0.05)" stroke="#10b981" strokeWidth="1" opacity="0.5" />
      {/* Stand */}
      <rect x="55" y="90" width="8" height="90" rx="2" fill="rgba(16,185,129,0.03)" stroke="#10b981" strokeWidth="1" opacity="0.45" />
      {/* Eyepiece */}
      <rect x="42" y="60" width="34" height="14" rx="5" fill="rgba(16,185,129,0.05)" stroke="#10b981" strokeWidth="1" opacity="0.55" />
      <rect x="52" y="50" width="14" height="12" rx="3" fill="rgba(16,185,129,0.08)" stroke="#10b981" strokeWidth="1" opacity="0.5" />
      {/* Lens */}
      <circle cx="59" cy="85" r="6" fill="rgba(16,185,129,0.04)" stroke="#10b981" strokeWidth="1" opacity="0.5">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Stage */}
      <rect x="40" y="150" width="38" height="5" rx="2" fill="rgba(16,185,129,0.08)" stroke="#10b981" strokeWidth="0.8" opacity="0.45" />
      {/* Slide on stage */}
      <rect x="48" y="145" width="22" height="6" rx="1.5" fill="rgba(16,185,129,0.12)" stroke="#10b981" strokeWidth="0.7" opacity="0.5" />
      {/* Knobs */}
      <circle cx="40" cy="120" r="4" fill="rgba(16,185,129,0.06)" stroke="#10b981" strokeWidth="0.8" opacity="0.4" />
      <circle cx="78" cy="120" r="4" fill="rgba(16,185,129,0.06)" stroke="#10b981" strokeWidth="0.8" opacity="0.4" />
    </g>
    {/* Test tubes rack */}
    <g filter="url(#ntG3)" style={{ animation: 'ntFadeUp 0.5s ease-out 0.3s both' }}>
      <rect x="120" y="125" width="60" height="6" rx="2" fill="rgba(16,185,129,0.06)" stroke="#10b981" strokeWidth="0.8" opacity="0.45" />
      {[0,1,2,3].map(i => (
        <g key={i}>
          <rect x={128+i*13} y={135} width="8" height="38" rx="3" fill="rgba(16,185,129,0.03)" stroke="#10b981" strokeWidth="0.8" opacity="0.45" />
          <rect x={129+i*13} y={155-i*4} width="6" height={18+i*4} rx="2.5" fill="#10b981" opacity={0.08+i*0.04}>
            <animate attributeName="opacity" values={`${0.06+i*0.03};${0.15+i*0.04};${0.06+i*0.03}`} dur={`${2+i*0.3}s`} repeatCount="indefinite" />
          </rect>
          <rect x={126+i*13} y={131} width="12" height="4" rx="1.5" fill="rgba(16,185,129,0.1)" stroke="#10b981" strokeWidth="0.5" opacity="0.4" />
        </g>
      ))}
    </g>
    {/* Machine / Analyzer */}
    <g filter="url(#ntG3)" style={{ animation: 'ntFadeUp 0.5s ease-out 0.5s both' }}>
      <rect x="125" y="60" width="80" height="55" rx="6" fill="rgba(16,185,129,0.03)" stroke="#10b981" strokeWidth="1.1" opacity="0.5" />
      {/* Screen */}
      <rect x="132" y="67" width="40" height="22" rx="3" fill="rgba(16,185,129,0.06)" stroke="#10b981" strokeWidth="0.8" opacity="0.5" />
      {/* Waveform */}
      <polyline points="136,78 142,72 148,82 154,74 160,80 166,76" fill="none" stroke="#10b981" strokeWidth="1" strokeLinecap="round" opacity="0.5">
        <animate attributeName="points" values="136,78 142,72 148,82 154,74 160,80 166,76;136,76 142,80 148,74 154,82 160,72 166,78;136,78 142,72 148,82 154,74 160,80 166,76" dur="3s" repeatCount="indefinite" />
      </polyline>
      {/* Buttons */}
      <circle cx="180" cy="72" r="3" fill="#10b981" opacity="0.2"><animate attributeName="opacity" values="0.15;0.35;0.15" dur="1.5s" repeatCount="indefinite"/></circle>
      <circle cx="180" cy="82" r="3" fill="rgba(16,185,129,0.08)" stroke="#10b981" strokeWidth="0.6" opacity="0.35" />
      {/* Slots */}
      <rect x="132" y="96" width="12" height="10" rx="2" fill="rgba(16,185,129,0.06)" stroke="#10b981" strokeWidth="0.6" opacity="0.35" />
      <rect x="148" y="96" width="12" height="10" rx="2" fill="rgba(16,185,129,0.06)" stroke="#10b981" strokeWidth="0.6" opacity="0.35" />
    </g>
    {/* Spinning gear / processing indicator */}
    <g transform="translate(175,185)" opacity="0.35">
      <circle r="12" fill="none" stroke="#10b981" strokeWidth="1.2" strokeDasharray="6 4">
        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle r="4" fill="rgba(16,185,129,0.1)" stroke="#10b981" strokeWidth="0.8" />
    </g>
    {[45,180,300].map((a,i) => { const r=a*Math.PI/180; return <circle key={i} cx={120+Math.cos(r)*105} cy={120+Math.sin(r)*95} r="1.5" fill="#10b981" opacity="0.1"><animate attributeName="opacity" values="0.05;0.2;0.05" dur={`${2+i*0.4}s`} repeatCount="indefinite"/></circle>; })}
  </svg>
);

/* ═══ SLIDE 4: Report Ready ═══ */
const SlideReportReady = () => (
  <svg viewBox="25 25 200 185" className="w-full h-full">
    <defs><filter id="ntG4"><feGaussianBlur stdDeviation="3" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter></defs>
    {/* Phone with report */}
    <g filter="url(#ntG4)" style={{ animation: 'ntFadeUp 0.5s ease-out 0.1s both' }}>
      <rect x="35" y="35" width="75" height="140" rx="10" fill="rgba(16,185,129,0.03)" stroke="#10b981" strokeWidth="1.3" opacity="0.8" />
      <rect x="35" y="35" width="75" height="20" rx="10" fill="rgba(16,185,129,0.12)" />
      <rect x="35" y="50" width="75" height="6" fill="rgba(16,185,129,0.12)" />
      <circle cx="72" cy="45" r="2" fill="#10b981" opacity="0.4" />
      {/* Report content */}
      <rect x="43" y="65" width="40" height="5" rx="2" fill="rgba(16,185,129,0.15)" />
      <rect x="43" y="75" width="55" height="3" rx="1.5" fill="rgba(16,185,129,0.08)" />
      <rect x="43" y="82" width="48" height="3" rx="1.5" fill="rgba(16,185,129,0.08)" />
      <rect x="43" y="89" width="52" height="3" rx="1.5" fill="rgba(16,185,129,0.08)" />
      {/* Values */}
      <rect x="43" y="100" width="30" height="8" rx="3" fill="rgba(16,185,129,0.06)" stroke="#10b981" strokeWidth="0.6" opacity="0.4" />
      <rect x="78" y="100" width="25" height="8" rx="3" fill="rgba(16,185,129,0.06)" stroke="#10b981" strokeWidth="0.6" opacity="0.4" />
      <rect x="43" y="114" width="30" height="8" rx="3" fill="rgba(16,185,129,0.06)" stroke="#10b981" strokeWidth="0.6" opacity="0.4" />
      <rect x="78" y="114" width="25" height="8" rx="3" fill="rgba(16,185,129,0.06)" stroke="#10b981" strokeWidth="0.6" opacity="0.4" />
      {/* Download button */}
      <rect x="48" y="135" width="50" height="14" rx="7" fill="rgba(16,185,129,0.12)" stroke="#10b981" strokeWidth="0.8" opacity="0.55" />
      <rect x="58" y="140" width="30" height="4" rx="2" fill="#10b981" opacity="0.4" />
      {/* Home bar */}
      <rect x="62" y="165" width="22" height="3" rx="1.5" fill="rgba(16,185,129,0.15)" />
    </g>
    {/* Lady looking at phone happily */}
    <g filter="url(#ntG4)" style={{ animation: 'ntFadeUp 0.5s ease-out 0.3s both' }}>
      <circle cx="170" cy="85" r="13" fill="rgba(16,185,129,0.03)" stroke="#10b981" strokeWidth="1.1" opacity="0.6" />
      <circle cx="167" cy="83" r="1.4" fill="#10b981" opacity="0.5" />
      <circle cx="173" cy="83" r="1.4" fill="#10b981" opacity="0.5" />
      <path d="M167,90 Q170,93 173,90" fill="none" stroke="#10b981" strokeWidth="0.8" opacity="0.45" />
      <ellipse cx="170" cy="77" rx="15" ry="14" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.35" />
      <path d="M157,98 Q154,130 152,160 L188,160 Q186,130 183,98 Z" fill="rgba(16,185,129,0.02)" stroke="#10b981" strokeWidth="1" opacity="0.5" />
      {/* Arm pointing at phone */}
      <path d="M157,110 L120,120 L115,118" fill="none" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
      <path d="M183,110 L200,135 L198,145" fill="none" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round" opacity="0.4" />
      <line x1="162" y1="160" x2="158" y2="200" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="178" y1="160" x2="182" y2="200" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
    </g>
    {/* Big checkmark badge */}
    <g transform="translate(195,55)" style={{ animation: 'ntFadeUp 0.4s ease-out 0.8s both' }}>
      <circle r="16" fill="rgba(16,185,129,0.08)" stroke="#10b981" strokeWidth="1.5" opacity="0.7" />
      <path d="M-6,1 L-2,5.5 L7,-4.5" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="22" strokeDashoffset="22" style={{ animation: 'ntDraw 0.5s ease-out 1.2s forwards', '--len': 22 }} />
      <circle r="16" fill="none" stroke="#10b981" strokeWidth="0.8" opacity="0">
        <animate attributeName="r" values="16;28;28" dur="2s" begin="1.3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0" dur="2s" begin="1.3s" repeatCount="indefinite" />
      </circle>
    </g>
    {/* Confetti-like particles */}
    {[20,100,200,300].map((a,i) => { const r=a*Math.PI/180; return <circle key={i} cx={120+Math.cos(r)*105} cy={120+Math.sin(r)*90} r="1.5" fill="#10b981" opacity="0.1"><animate attributeName="opacity" values="0.05;0.25;0.05" dur={`${1.8+i*0.4}s`} repeatCount="indefinite"/></circle>; })}
  </svg>
);

export default MangoTutorial;
