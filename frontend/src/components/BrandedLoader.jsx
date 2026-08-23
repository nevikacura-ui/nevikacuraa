import React from 'react';

/* ═══════════════════════════════════════════════════════
   BRANDED LOADER — Pure CSS/SVG Animations (No Videos)
   Each portal gets a unique, themed medical animation
   All on dark #0A0A0F with glassmorphism + neon glow
   ═══════════════════════════════════════════════════════ */

/* ─── PHARMACY LOADER — Person Adding Medicine from Pharmacy Store to Cart ─── */
function PharmacyLoader() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: '#0A0A0F' }}
      data-testid="branded-loader-orange"
    >
      {/* Ambient glow */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(255,107,53,0.16) 0%, rgba(255,160,60,0.06) 40%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'blGlowPulse 3s ease-in-out infinite',
        }}
      />

      <div className="relative" style={{ width: 280, height: 300, animation: 'blCardPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <svg viewBox="0 0 280 300" className="w-full h-full">
          <defs>
            <linearGradient id="cartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF8C42" />
              <stop offset="100%" stopColor="#FF6B35" />
            </linearGradient>
            <linearGradient id="shelfGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FF6B35" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="pillG1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF8C42" />
              <stop offset="100%" stopColor="#E84D1C" />
            </linearGradient>
            <linearGradient id="pillG2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFEEDD" />
              <stop offset="100%" stopColor="#FFD4B8" />
            </linearGradient>
            <linearGradient id="bottleG" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF9F5A" />
              <stop offset="100%" stopColor="#E8601A" />
            </linearGradient>
            <linearGradient id="personGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFB088" />
              <stop offset="100%" stopColor="#FF6B35" />
            </linearGradient>
            <filter id="glowOr">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ═══ PHARMACY STORE — visible shelves on left ═══ */}
          <g>
            {/* Shelf unit — left side */}
            <rect x="15" y="40" width="80" height="155" rx="5" fill="rgba(255,107,53,0.06)" stroke="#FF6B35" strokeWidth="1.2" opacity="0.7" />
            {/* Shelf header / pharmacy sign */}
            <rect x="15" y="40" width="80" height="22" rx="5" fill="rgba(255,107,53,0.18)" stroke="#FF6B35" strokeWidth="1" opacity="0.8" />
            <rect x="15" y="57" width="80" height="5" fill="rgba(255,107,53,0.18)" opacity="0.8" />
            {/* Cross on shelf */}
            <rect x="47" y="44" width="16" height="4" rx="2" fill="#FF6B35" opacity="0.9" />
            <rect x="53" y="38" width="4" height="16" rx="2" fill="#FF6B35" opacity="0.9" />

            {/* Shelf rows */}
            <line x1="18" y1="95" x2="92" y2="95" stroke="#FF6B35" strokeWidth="1" opacity="0.5" />
            <line x1="18" y1="135" x2="92" y2="135" stroke="#FF6B35" strokeWidth="1" opacity="0.5" />
            <line x1="18" y1="170" x2="92" y2="170" stroke="#FF6B35" strokeWidth="1" opacity="0.5" />

            {/* Medicines on shelf row 1 */}
            <rect x="24" y="72" width="10" height="20" rx="2" fill="#FF6B35" opacity="0.6" />
            <rect x="24" y="68" width="10" height="5" rx="1" fill="#FFD4B8" opacity="0.5" />
            <rect x="38" y="76" width="10" height="16" rx="2" fill="#E84D1C" opacity="0.5" />
            <rect x="38" y="72" width="10" height="5" rx="1" fill="#FFB088" opacity="0.5" />
            <rect x="52" y="70" width="10" height="22" rx="2" fill="#FF8C42" opacity="0.55" />
            <rect x="52" y="66" width="10" height="5" rx="1" fill="#FFEEDD" opacity="0.45" />
            <rect x="66" y="74" width="10" height="18" rx="2" fill="#FF6B35" opacity="0.45" />
            <rect x="80" y="78" width="8" height="14" rx="2" fill="#FFB088" opacity="0.4" />

            {/* Medicines on shelf row 2 */}
            <rect x="24" y="102" width="12" height="28" rx="3" fill="#FF8C42" opacity="0.5" />
            <rect x="24" y="98" width="12" height="5" rx="1" fill="#FFD4B8" opacity="0.4" />
            <rect x="40" y="108" width="10" height="24" rx="2" fill="#E84D1C" opacity="0.45" />
            <circle cx="60" cy="120" r="8" fill="none" stroke="#FF6B35" strokeWidth="1" opacity="0.4" />
            <circle cx="60" cy="120" r="3" fill="#FF6B35" opacity="0.35" />
            <rect x="72" y="106" width="10" height="26" rx="2" fill="#FFB088" opacity="0.4" />

            {/* Medicines on shelf row 3 */}
            <rect x="24" y="142" width="14" height="24" rx="3" fill="#FF6B35" opacity="0.5" />
            <rect x="42" y="146" width="10" height="20" rx="2" fill="#FF8C42" opacity="0.4" />
            <rect x="56" y="144" width="12" height="22" rx="3" fill="#E84D1C" opacity="0.45" />
            <rect x="72" y="148" width="10" height="18" rx="2" fill="#FFB088" opacity="0.35" />
          </g>

          {/* ═══ PERSON FIGURE — center, reaching toward shelf ═══ */}
          <g filter="url(#glowOr)" transform="translate(140, 140)">
            {/* Head */}
            <circle cx="0" cy="-52" r="12" fill="none" stroke="url(#personGrad)" strokeWidth="2.5" />
            {/* Body */}
            <line x1="0" y1="-40" x2="0" y2="-5" stroke="url(#personGrad)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Left arm — reaching toward shelf, animated */}
            <line x1="0" y1="-32" x2="-28" y2="-38" stroke="url(#personGrad)" strokeWidth="2.5" strokeLinecap="round">
              <animate attributeName="x2" values="-28;-32;-28" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="y2" values="-38;-28;-38" dur="2.5s" repeatCount="indefinite" />
            </line>
            {/* Right arm — placing into cart */}
            <line x1="0" y1="-32" x2="22" y2="-15" stroke="url(#personGrad)" strokeWidth="2.5" strokeLinecap="round">
              <animate attributeName="x2" values="22;26;22" dur="2.8s" repeatCount="indefinite" />
              <animate attributeName="y2" values="-15;-8;-15" dur="2.8s" repeatCount="indefinite" />
            </line>
            {/* Left leg */}
            <line x1="0" y1="-5" x2="-12" y2="18" stroke="url(#personGrad)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Right leg */}
            <line x1="0" y1="-5" x2="12" y2="18" stroke="url(#personGrad)" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* ═══ SHOPPING CART — bigger, right side ═══ */}
          <g filter="url(#glowOr)" transform="translate(185, 192)">
            {/* Cart basket — larger */}
            <path d="M-38,0 L-30,-38 L30,-38 L38,0 Z" fill="rgba(10,10,15,0.85)" stroke="url(#cartGrad)" strokeWidth="2.8" strokeLinejoin="round" />
            {/* Cart handle */}
            <path d="M-44,-4 L-50,-4 L-56,-16" fill="none" stroke="#FF6B35" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {/* Cart bottom line */}
            <line x1="-36" y1="0" x2="36" y2="0" stroke="url(#cartGrad)" strokeWidth="2.5" />
            {/* Cart wheels */}
            <circle cx="-22" cy="10" r="7" fill="none" stroke="#FF6B35" strokeWidth="2.5" />
            <circle cx="-22" cy="10" r="2" fill="#FF6B35" />
            <circle cx="22" cy="10" r="7" fill="none" stroke="#FF6B35" strokeWidth="2.5" />
            <circle cx="22" cy="10" r="2" fill="#FF6B35" />
            {/* Cart wire lines */}
            <line x1="-24" y1="-19" x2="24" y2="-19" stroke="rgba(255,107,53,0.25)" strokeWidth="0.8" />
            {/* Items already in cart */}
            <rect x="-18" y="-32" width="12" height="8" rx="4" fill="#FF6B35" opacity="0.6" />
            <circle cx="8" cy="-28" r="6" fill="#FFB088" opacity="0.5" />
            <rect x="16" y="-34" width="8" height="12" rx="2" fill="#E84D1C" opacity="0.45" />
          </g>

          {/* ═══ MEDICINE FLYING — shelf to cart via person ═══ */}

          {/* Capsule pill — arcs from shelf through person to cart */}
          <g>
            <g>
              <animateMotion
                dur="2.5s"
                repeatCount="indefinite"
                path="M65,82 C90,90 120,120 162,162"
              />
              <rect x="-9" y="-5" width="18" height="10" rx="5" fill="url(#pillG1)" opacity="0.9">
                <animate attributeName="opacity" values="0;0.95;0.95;0" dur="2.5s" repeatCount="indefinite" keyTimes="0;0.12;0.75;1" />
              </rect>
              <rect x="-9" y="-5" width="8" height="10" rx="5" fill="url(#pillG2)" opacity="0.9">
                <animate attributeName="opacity" values="0;0.95;0.95;0" dur="2.5s" repeatCount="indefinite" keyTimes="0;0.12;0.75;1" />
              </rect>
            </g>
          </g>

          {/* Medicine bottle — arcs from shelf row 2 to cart */}
          <g>
            <g>
              <animateMotion
                dur="3s"
                repeatCount="indefinite"
                path="M50,115 C85,120 130,140 170,165"
                begin="1s"
              />
              <rect x="-6" y="-10" width="12" height="20" rx="3" fill="url(#bottleG)" opacity="0.85">
                <animate attributeName="opacity" values="0;0.9;0.9;0" dur="3s" begin="1s" repeatCount="indefinite" keyTimes="0;0.1;0.75;1" />
              </rect>
              <rect x="-4" y="-14" width="8" height="5" rx="1.5" fill="#FFD4B8" opacity="0.85">
                <animate attributeName="opacity" values="0;0.9;0.9;0" dur="3s" begin="1s" repeatCount="indefinite" keyTimes="0;0.1;0.75;1" />
              </rect>
              <rect x="-3.5" y="-5" width="7" height="5" rx="1" fill="rgba(255,255,255,0.3)">
                <animate attributeName="opacity" values="0;0.6;0.6;0" dur="3s" begin="1s" repeatCount="indefinite" keyTimes="0;0.1;0.75;1" />
              </rect>
            </g>
          </g>

          {/* Small round pill — from shelf row 3 */}
          <g>
            <g>
              <animateMotion
                dur="2.8s"
                repeatCount="indefinite"
                path="M42,155 C80,150 140,155 175,170"
                begin="1.8s"
              />
              <circle r="7" fill="#FF6B35" opacity="0.85">
                <animate attributeName="opacity" values="0;0.9;0.9;0" dur="2.8s" begin="1.8s" repeatCount="indefinite" keyTimes="0;0.08;0.72;1" />
              </circle>
              <text x="0" y="3.5" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
                <animate attributeName="opacity" values="0;1;1;0" dur="2.8s" begin="1.8s" repeatCount="indefinite" keyTimes="0;0.08;0.72;1" />
                Rx
              </text>
            </g>
          </g>

          {/* Sparkle/pop effects at cart */}
          {[-12, 4, 18].map((ox, i) => (
            <circle key={`sp-${i}`} cx={185 + ox} cy={162} r="2" fill="#FF6B35" opacity="0">
              <animate attributeName="opacity" values="0;0.9;0" dur="0.5s" begin={`${2 + i * 0.9}s`} repeatCount="indefinite" />
              <animate attributeName="r" values="1;6;1" dur="0.5s" begin={`${2 + i * 0.9}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {/* Floor line */}
          <line x1="10" y1="212" x2="270" y2="212" stroke="rgba(255,107,53,0.1)" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Brand label */}
      <div className="flex flex-col items-center mt-4 gap-2.5">
        <p className="text-white/85 text-[15px] font-semibold tracking-wide" style={{ fontFamily: 'Outfit, sans-serif', animation: 'blFadeUp .5s ease-out .4s both' }}>
          Orange Pharmacy
        </p>
        <LoadingDots color="#FF6B35" />
      </div>

      <LoaderStyles />
    </div>
  );
}

/* ─── MANGO LABS LOADER — Test Tube + DNA Helix (Original) ─── */
function MangoLabsLoader() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: '#0A0A0F' }}
      data-testid="branded-loader-mango"
    >
      {/* Ambient glow */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, rgba(22,101,52,0.06) 40%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'blGlowPulse 3s ease-in-out infinite',
        }}
      />

      <div className="relative" style={{ width: 300, height: 300, animation: 'blCardPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <svg viewBox="0 0 300 300" className="w-full h-full">
          <defs>
            <linearGradient id="tubeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#16A34A" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="liquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4ADE80" />
              <stop offset="60%" stopColor="#16A34A" />
              <stop offset="100%" stopColor="#166534" />
            </linearGradient>
            <filter id="glowGreen">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <clipPath id="tubeClip">
              <rect x="122" y="80" width="56" height="160" rx="28" />
            </clipPath>
          </defs>

          {/* Orbit ring */}
          <ellipse cx="150" cy="150" rx="120" ry="120" fill="none" stroke="rgba(34,197,94,0.08)" strokeWidth="0.8" strokeDasharray="3 9">
            <animateTransform attributeName="transform" type="rotate" from="0 150 150" to="360 150 150" dur="25s" repeatCount="indefinite" />
          </ellipse>

          {/* Test tube body */}
          <g filter="url(#glowGreen)">
            {/* Tube outline */}
            <rect x="122" y="80" width="56" height="160" rx="28" fill="none" stroke="#22C55E" strokeWidth="2" opacity="0.6" />

            {/* Tube glass effect */}
            <rect x="124" y="82" width="52" height="156" rx="26" fill="rgba(34,197,94,0.05)" />

            {/* Liquid fill — animated */}
            <g clipPath="url(#tubeClip)">
              <rect x="122" y="140" width="56" height="100" fill="url(#liquidGrad)" opacity="0.8">
                <animate attributeName="y" values="180;130;180" dur="4s" repeatCount="indefinite" />
              </rect>
              {/* Bubbles */}
              <circle cx="140" cy="200" r="4" fill="#4ADE80" opacity="0.6">
                <animate attributeName="cy" values="220;120;220" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="155" cy="210" r="3" fill="#86EFAC" opacity="0.5">
                <animate attributeName="cy" values="230;110;230" dur="3.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0;0.5" dur="3.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="148" cy="215" r="2.5" fill="#BBF7D0" opacity="0.4">
                <animate attributeName="cy" values="225;100;225" dur="2.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="2.8s" repeatCount="indefinite" />
              </circle>
            </g>

            {/* Tube rim */}
            <rect x="118" y="76" width="64" height="12" rx="3" fill="none" stroke="#22C55E" strokeWidth="1.5" opacity="0.5" />

            {/* Glass shine */}
            <rect x="130" y="90" width="4" height="50" rx="2" fill="rgba(255,255,255,0.15)" />
          </g>

          {/* DNA Helix — orbiting around tube */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
            const yPos = 100 + i * 18;
            return (
              <g key={i}>
                <circle cx="100" cy={yPos} r="4" fill="#22C55E" opacity="0.7">
                  <animate attributeName="cx" values="100;200;100" dur="3s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
                </circle>
                <circle cx="200" cy={yPos} r="4" fill="#4ADE80" opacity="0.7">
                  <animate attributeName="cx" values="200;100;200" dur="3s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.3;0.8" dur="3s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
                </circle>
                <line x1="100" y1={yPos} x2="200" y2={yPos} stroke="#22C55E" strokeWidth="0.5" opacity="0.2">
                  <animate attributeName="opacity" values="0.1;0.3;0.1" dur="3s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
                </line>
              </g>
            );
          })}

          {/* Blood drops falling */}
          <g>
            <path d="M80,60 Q80,50 85,55 Q90,60 85,67 Q80,72 80,60Z" fill="#EF4444" opacity="0.5">
              <animate attributeName="opacity" values="0;0.6;0" dur="4s" repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="translate" values="0,-20;0,40;0,-20" dur="4s" repeatCount="indefinite" />
            </path>
          </g>
          <g>
            <path d="M220,80 Q220,70 225,75 Q230,80 225,87 Q220,92 220,80Z" fill="#EF4444" opacity="0.4">
              <animate attributeName="opacity" values="0;0.5;0" dur="5s" begin="1s" repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="translate" values="0,-15;0,35;0,-15" dur="5s" begin="1s" repeatCount="indefinite" />
            </path>
          </g>
        </svg>
      </div>

      {/* Brand label */}
      <div className="flex flex-col items-center mt-4 gap-2.5">
        <p className="text-white/85 text-[15px] font-semibold tracking-wide" style={{ fontFamily: 'Outfit, sans-serif', animation: 'blFadeUp .5s ease-out .4s both' }}>
          Mango Health Labs
        </p>
        <LoadingDots color="#22C55E" />
      </div>

      <LoaderStyles />
    </div>
  );
}

/* ─── DIAGYN LOADER — Hybrid Dual Colour: Cyan + Rose, Big Tick ─── */
function DiaGynLoader() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: '#0A0A0F' }}
      data-testid="branded-loader-diagyn"
    >
      {/* Dual ambient glow — cyan left, rose right */}
      <div className="absolute rounded-full pointer-events-none" style={{ width: 350, height: 350, left: '15%', top: '25%', background: 'radial-gradient(circle, rgba(6,182,212,0.16) 0%, transparent 65%)', filter: 'blur(60px)', animation: 'blGlowPulse 3s ease-in-out infinite' }} />
      <div className="absolute rounded-full pointer-events-none" style={{ width: 300, height: 300, right: '10%', top: '30%', background: 'radial-gradient(circle, rgba(225,29,72,0.12) 0%, transparent 65%)', filter: 'blur(60px)', animation: 'blGlowPulse 3s ease-in-out 1.5s infinite' }} />

      <div className="relative" style={{ width: 280, height: 300, animation: 'blCardPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <svg viewBox="0 0 280 300" className="w-full h-full">
          <defs>
            <linearGradient id="calHeaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891B2" />
              <stop offset="100%" stopColor="#E11D48" />
            </linearGradient>
            <linearGradient id="tickGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#E11D48" />
            </linearGradient>
            <filter id="glowCyan">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowRose">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ═══ CALENDAR — cyan tones ═══ */}
          <g filter="url(#glowCyan)" transform="translate(30, 35) scale(0.85)">
            <rect x="0" y="0" width="160" height="195" rx="10" fill="rgba(6,182,212,0.03)" stroke="#06B6D4" strokeWidth="1.3" opacity="0.8" />
            <rect x="0" y="0" width="160" height="36" rx="10" fill="url(#calHeaderGrad)" opacity="0.25" />
            <rect x="0" y="30" width="160" height="10" fill="url(#calHeaderGrad)" opacity="0.2" />
            <rect x="35" y="-5" width="3.5" height="18" rx="1.75" fill="#06B6D4" opacity="0.6" />
            <rect x="78" y="-5" width="3.5" height="18" rx="1.75" fill="#E11D48" opacity="0.5" />
            <rect x="121" y="-5" width="3.5" height="18" rx="1.75" fill="#06B6D4" opacity="0.6" />
            <rect x="30" y="12" width="60" height="6" rx="3" fill="rgba(255,255,255,0.4)" />
            <rect x="100" y="13" width="25" height="4" rx="2" fill="rgba(225,29,72,0.3)" />

            {['M','T','W','T','F','S','S'].map((d,i) => (
              <text key={`dh-${i}`} x={14+i*20} y="52" textAnchor="middle" fill={i%2===0 ? 'rgba(6,182,212,0.3)' : 'rgba(225,29,72,0.25)'} fontSize="8" fontFamily="sans-serif" fontWeight="600">{d}</text>
            ))}

            {[0,1,2,3,4].map(r => [0,1,2,3,4,5,6].map(c => {
              const num = r*7+c+1;
              if(num>31) return null;
              const cx = 14+c*20, cy = 70+r*26;
              const isSelected = num===15;
              return (
                <g key={`d-${num}`}>
                  {isSelected && (
                    <circle cx={cx} cy={cy} r="10" fill="rgba(225,29,72,0.08)" stroke="#E11D48" strokeWidth="1.2" opacity="0">
                      <animate attributeName="opacity" values="0;0.9;0.9;0.9" dur="3.5s" repeatCount="indefinite" keyTimes="0;0.15;0.5;1" fill="freeze" />
                    </circle>
                  )}
                  <text x={cx} y={cy+3} textAnchor="middle" fill={isSelected ? '#E11D48' : 'rgba(255,255,255,0.12)'} fontSize="9" fontFamily="sans-serif" fontWeight={isSelected?'700':'400'}>
                    {num}
                    {isSelected && <animate attributeName="fill" values="rgba(255,255,255,0.12);#E11D48;#E11D48;#E11D48" dur="3.5s" repeatCount="indefinite" keyTimes="0;0.15;0.5;1" />}
                  </text>
                </g>
              );
            }))}
          </g>

          {/* ═══ BIG TICK — centered, prominent, dual gradient ═══ */}
          <g filter="url(#glowRose)" transform="translate(140, 210)">
            {/* Outer ring — gradient */}
            <circle r="30" fill="rgba(225,29,72,0.06)" stroke="url(#tickGrad)" strokeWidth="2.5" opacity="0">
              <animate attributeName="opacity" values="0;0;1;1;0" dur="3.5s" repeatCount="indefinite" keyTimes="0;0.25;0.35;0.85;1" />
            </circle>
            {/* Inner fill glow */}
            <circle r="24" fill="rgba(225,29,72,0.04)" opacity="0">
              <animate attributeName="opacity" values="0;0;0.6;0.6;0" dur="3.5s" repeatCount="indefinite" keyTimes="0;0.3;0.4;0.85;1" />
            </circle>
            {/* Big checkmark — thick stroke */}
            <path d="M-12,2 L-4,11 L14,-10" fill="none" stroke="url(#tickGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="44" strokeDashoffset="44">
              <animate attributeName="stroke-dashoffset" values="44;44;0;0;44" dur="3.5s" repeatCount="indefinite" keyTimes="0;0.3;0.5;0.85;1" />
            </path>
            {/* Pulse ring 1 */}
            <circle r="30" fill="none" stroke="#E11D48" strokeWidth="1.5" opacity="0">
              <animate attributeName="r" values="30;50;50" dur="3.5s" repeatCount="indefinite" keyTimes="0;0.65;1" />
              <animate attributeName="opacity" values="0;0;0.4;0" dur="3.5s" repeatCount="indefinite" keyTimes="0;0.4;0.5;0.7" />
            </circle>
            {/* Pulse ring 2 — cyan */}
            <circle r="30" fill="none" stroke="#06B6D4" strokeWidth="1" opacity="0">
              <animate attributeName="r" values="30;55;55" dur="3.5s" repeatCount="indefinite" keyTimes="0;0.7;1" />
              <animate attributeName="opacity" values="0;0;0.25;0" dur="3.5s" repeatCount="indefinite" keyTimes="0;0.45;0.55;0.75" />
            </circle>
            {/* "CONFIRMED" text */}
            <text x="0" y="48" textAnchor="middle" fill="#E11D48" fontSize="8" fontFamily="sans-serif" fontWeight="700" letterSpacing="0.12em" opacity="0">
              CONFIRMED
              <animate attributeName="opacity" values="0;0;0.8;0.8;0" dur="3.5s" repeatCount="indefinite" keyTimes="0;0.45;0.55;0.85;1" />
            </text>
          </g>

          {/* ═══ LADY FIGURE — rose tones ═══ */}
          <g filter="url(#glowRose)" transform="translate(190, 15)">
            <ellipse cx="40" cy="14" rx="18" ry="20" fill="none" stroke="#E11D48" strokeWidth="1.2" opacity="0.45" />
            <path d="M24,20 Q18,30 22,42" stroke="#E11D48" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.35" />
            <path d="M56,12 Q62,20 58,32" stroke="#E11D48" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.25" />
            <circle cx="40" cy="22" r="14" fill="rgba(225,29,72,0.03)" stroke="#E11D48" strokeWidth="1.3" opacity="0.65" />
            <circle cx="35" cy="20" r="1.8" fill="#E11D48" opacity="0.55" />
            <circle cx="43" cy="20" r="1.8" fill="#E11D48" opacity="0.55" />
            <circle cx="34" cy="19.5" r="0.6" fill="white" opacity="0.35" />
            <circle cx="42" cy="19.5" r="0.6" fill="white" opacity="0.35" />
            <path d="M35,27 Q40,31 45,27" fill="none" stroke="#E11D48" strokeWidth="0.9" strokeLinecap="round" opacity="0.45" />
            <rect x="36" y="35" width="8" height="8" rx="3" fill="none" stroke="#E11D48" strokeWidth="1" opacity="0.35" />
            <path d="M22,43 Q18,85 15,120 L65,120 Q62,85 58,43 Z" fill="rgba(225,29,72,0.03)" stroke="#E11D48" strokeWidth="1.3" opacity="0.55" />
            <path d="M28,48 Q24,70 22,90" stroke="#E11D48" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.2" />
            <g>
              <path d="M22,55 L-8,72 L-18,67" fill="none" stroke="#E11D48" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
                <animate attributeName="d" values="M22,55 L8,62 L2,59;M22,55 L-5,69 L-15,65;M22,55 L-5,69 L-15,65;M22,55 L8,62 L2,59" dur="3.5s" repeatCount="indefinite" keyTimes="0;0.15;0.8;1" />
              </path>
              <circle cx="-15" cy="65" r="3" fill="rgba(225,29,72,0.1)" stroke="#E11D48" strokeWidth="1" opacity="0">
                <animate attributeName="opacity" values="0;0.5;0.5;0" dur="3.5s" repeatCount="indefinite" keyTimes="0;0.15;0.8;1" />
                <animate attributeName="cx" values="2;-15;-15;2" dur="3.5s" repeatCount="indefinite" keyTimes="0;0.15;0.8;1" />
                <animate attributeName="cy" values="59;65;65;59" dur="3.5s" repeatCount="indefinite" keyTimes="0;0.15;0.8;1" />
              </circle>
            </g>
            <path d="M58,55 L72,76 L70,88" fill="none" stroke="#E11D48" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
            <line x1="32" y1="120" x2="28" y2="168" stroke="#E11D48" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
            <line x1="48" y1="120" x2="52" y2="168" stroke="#E11D48" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
            <ellipse cx="27" cy="171" rx="7" ry="3.5" fill="none" stroke="#E11D48" strokeWidth="1" opacity="0.35" />
            <ellipse cx="53" cy="171" rx="7" ry="3.5" fill="none" stroke="#E11D48" strokeWidth="1" opacity="0.35" />
          </g>

          {/* Stethoscope — dual color */}
          <g transform="translate(240, 8)" opacity="0.2">
            <circle cx="0" cy="0" r="5" fill="none" stroke="#06B6D4" strokeWidth="0.8" />
            <path d="M-3,4 Q-3,16 0,20 Q3,16 3,4" fill="none" stroke="#E11D48" strokeWidth="0.8" />
            <circle cx="0" cy="22" r="2" fill="none" stroke="#E11D48" strokeWidth="0.8" />
          </g>

          {/* Dual-color particles */}
          {[30, 140, 260, 320].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const px = 140 + Math.cos(rad) * 125;
            const py = 140 + Math.sin(rad) * 110;
            const color = i % 2 === 0 ? '#06B6D4' : '#E11D48';
            return (
              <circle key={i} cx={px} cy={py} r="2" fill={color} opacity="0.15">
                <animate attributeName="opacity" values="0.06;0.25;0.06" dur={`${2.5+i*0.5}s`} repeatCount="indefinite" />
              </circle>
            );
          })}

          {/* Floor line — gradient */}
          <line x1="20" y1="270" x2="265" y2="270" stroke="rgba(6,182,212,0.06)" strokeWidth="0.8" />
          <line x1="140" y1="270" x2="265" y2="270" stroke="rgba(225,29,72,0.05)" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Brand label — dual color */}
      <div className="flex flex-col items-center mt-4 gap-2.5">
        <p className="text-white/85 text-[15px] font-semibold tracking-wide" style={{ fontFamily: 'Outfit, sans-serif', animation: 'blFadeUp .5s ease-out .4s both' }}>
          <span style={{ color: '#06B6D4' }}>Dia</span><span style={{ color: '#E11D48' }}>Gyn</span> <span className="text-white/60">Healthcare</span>
        </p>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="block w-1.5 h-1.5 rounded-full" style={{ background: i % 2 === 0 ? '#06B6D4' : '#E11D48', boxShadow: `0 0 8px ${i % 2 === 0 ? '#06B6D4' : '#E11D48'}`, animation: `blDotBounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
      </div>

      <LoaderStyles />
    </div>
  );
}

/* ─── CURAPAY LOADER — Coins Flying Into Wallet + Card Sliding Out Like ATM ─── */
function CuraPayLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center" style={{ background: '#0A0A0F' }} data-testid="branded-loader-curapay">
      <div className="absolute rounded-full pointer-events-none" style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, rgba(22,163,74,0.06) 40%, transparent 70%)', filter: 'blur(60px)', animation: 'blGlowPulse 3s ease-in-out infinite' }} />

      <div className="relative" style={{ width: 280, height: 300, animation: 'blCardPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <svg viewBox="0 0 280 300" className="w-full h-full">
          <defs>
            <linearGradient id="walletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#6D28D9" />
            </linearGradient>
            <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#16A34A" />
            </linearGradient>
            <filter id="glowPurp"><feGaussianBlur stdDeviation="4" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
            <filter id="coinGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
          </defs>

          {/* ═══ WALLET BODY ═══ */}
          <g filter="url(#glowPurp)" transform="translate(140,135)">
            {/* Main wallet */}
            <rect x="-65" y="-50" width="130" height="100" rx="14" fill="rgba(10,10,15,0.9)" stroke="url(#walletGrad)" strokeWidth="2.5" />
            {/* Wallet flap */}
            <path d="M-65,-50 Q-65,-65 -50,-65 L50,-65 Q65,-65 65,-50" fill="none" stroke="url(#walletGrad)" strokeWidth="2" opacity="0.6" />
            {/* Coin slot on top */}
            <rect x="-18" y="-56" width="36" height="8" rx="4" fill="rgba(139,92,246,0.15)" stroke="#8B5CF6" strokeWidth="1.5" />
            {/* Inner details */}
            <rect x="-50" y="-30" width="40" height="6" rx="3" fill="rgba(139,92,246,0.1)" />
            <rect x="-50" y="-18" width="28" height="4" rx="2" fill="rgba(139,92,246,0.07)" />
            {/* Card pocket clasp */}
            <rect x="20" y="-5" width="35" height="22" rx="4" fill="rgba(34,197,94,0.08)" stroke="#22C55E" strokeWidth="1" opacity="0.6" />
            {/* Wallet shine */}
            <rect x="-60" y="-46" width="8" height="40" rx="4" fill="rgba(255,255,255,0.04)" />
            {/* Card slot at bottom */}
            <rect x="-40" y="40" width="80" height="10" rx="3" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.2)" strokeWidth="1" />
          </g>

          {/* ═══ COINS FLYING IN — arc paths into wallet slot ═══ */}
          {/* Coin 1 — from top-left */}
          <g filter="url(#coinGlow)">
            <g>
              <animateMotion dur="2s" repeatCount="indefinite" path="M40,40 C70,20 110,50 140,80" />
              <circle r="10" fill="url(#coinGrad)" opacity="0">
                <animate attributeName="opacity" values="0;0.95;0.95;0" dur="2s" repeatCount="indefinite" keyTimes="0;0.1;0.7;1" />
              </circle>
              <text x="0" y="4" textAnchor="middle" fill="#92400E" fontSize="10" fontWeight="bold" opacity="0">
                <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" keyTimes="0;0.1;0.7;1" />
                ₹
              </text>
            </g>
          </g>

          {/* Coin 2 — from top-right */}
          <g filter="url(#coinGlow)">
            <g>
              <animateMotion dur="2.4s" repeatCount="indefinite" path="M240,30 C210,40 170,55 140,80" begin="0.6s" />
              <circle r="8" fill="url(#coinGrad)" opacity="0">
                <animate attributeName="opacity" values="0;0.9;0.9;0" dur="2.4s" begin="0.6s" repeatCount="indefinite" keyTimes="0;0.1;0.7;1" />
              </circle>
              <text x="0" y="3.5" textAnchor="middle" fill="#92400E" fontSize="8" fontWeight="bold" opacity="0">
                <animate attributeName="opacity" values="0;1;1;0" dur="2.4s" begin="0.6s" repeatCount="indefinite" keyTimes="0;0.1;0.7;1" />
                ₹
              </text>
            </g>
          </g>

          {/* Coin 3 — from far left */}
          <g filter="url(#coinGlow)">
            <g>
              <animateMotion dur="2.2s" repeatCount="indefinite" path="M20,90 C60,70 100,65 140,80" begin="1.2s" />
              <circle r="7" fill="url(#coinGrad)" opacity="0">
                <animate attributeName="opacity" values="0;0.85;0.85;0" dur="2.2s" begin="1.2s" repeatCount="indefinite" keyTimes="0;0.1;0.7;1" />
              </circle>
              <text x="0" y="3" textAnchor="middle" fill="#92400E" fontSize="7" fontWeight="bold" opacity="0">
                <animate attributeName="opacity" values="0;1;1;0" dur="2.2s" begin="1.2s" repeatCount="indefinite" keyTimes="0;0.1;0.7;1" />
                ₹
              </text>
            </g>
          </g>

          {/* Coin sparkles at wallet slot */}
          {[-8, 0, 8].map((ox, i) => (
            <circle key={`cs-${i}`} cx={140 + ox} cy={80} r="2" fill="#FBBF24" opacity="0">
              <animate attributeName="opacity" values="0;0.8;0" dur="0.6s" begin={`${1.8 + i * 0.7}s`} repeatCount="indefinite" />
              <animate attributeName="r" values="1;5;1" dur="0.6s" begin={`${1.8 + i * 0.7}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {/* ═══ CARD SLIDING OUT — ATM/POS style from bottom ═══ */}
          <g transform="translate(140,185)">
            {/* The card */}
            <g>
              <animateTransform attributeName="transform" type="translate" values="0,0;0,35;0,35;0,0" dur="4s" repeatCount="indefinite" keyTimes="0;0.3;0.7;1" />
              <rect x="-35" y="0" width="70" height="44" rx="6" fill="rgba(10,10,15,0.95)" stroke="url(#cardGrad)" strokeWidth="2">
                <animate attributeName="opacity" values="0.3;1;1;0.3" dur="4s" repeatCount="indefinite" keyTimes="0;0.3;0.7;1" />
              </rect>
              {/* Card chip */}
              <rect x="-22" y="8" width="14" height="10" rx="2" fill="rgba(34,197,94,0.25)" stroke="#22C55E" strokeWidth="0.8">
                <animate attributeName="opacity" values="0.2;1;1;0.2" dur="4s" repeatCount="indefinite" keyTimes="0;0.3;0.7;1" />
              </rect>
              {/* Card lines */}
              <rect x="-22" y="24" width="30" height="3" rx="1.5" fill="rgba(34,197,94,0.15)">
                <animate attributeName="opacity" values="0.1;0.5;0.5;0.1" dur="4s" repeatCount="indefinite" keyTimes="0;0.3;0.7;1" />
              </rect>
              <rect x="-22" y="30" width="18" height="3" rx="1.5" fill="rgba(34,197,94,0.1)">
                <animate attributeName="opacity" values="0.1;0.4;0.4;0.1" dur="4s" repeatCount="indefinite" keyTimes="0;0.3;0.7;1" />
              </rect>
              {/* CuraPay text */}
              <text x="18" y="38" textAnchor="end" fill="#22C55E" fontSize="6" fontWeight="bold" opacity="0.5">
                <animate attributeName="opacity" values="0.2;0.7;0.7;0.2" dur="4s" repeatCount="indefinite" keyTimes="0;0.3;0.7;1" />
                CuraPay
              </text>
            </g>
          </g>
        </svg>
      </div>

      <div className="flex flex-col items-center mt-4 gap-2.5">
        <p className="text-white/85 text-[15px] font-semibold tracking-wide" style={{ fontFamily: 'Outfit, sans-serif', animation: 'blFadeUp .5s ease-out .4s both' }}>CuraPay</p>
        <LoadingDots color="#8B5CF6" />
      </div>
      <LoaderStyles />
    </div>
  );
}

/* ─── CURAONE LOADER — Bouncing Membership Card + Shield with Tick ─── */
function CuraOneLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center" style={{ background: '#0A0A0F' }} data-testid="branded-loader-curaone">
      <div className="absolute rounded-full pointer-events-none" style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, rgba(139,92,246,0.06) 40%, transparent 70%)', filter: 'blur(60px)', animation: 'blGlowPulse 3s ease-in-out infinite' }} />

      <div className="relative" style={{ width: 280, height: 280, animation: 'blCardPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <svg viewBox="0 0 280 280" className="w-full h-full">
          <defs>
            <linearGradient id="memGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" />
              <stop offset="50%" stopColor="#B8860B" />
              <stop offset="100%" stopColor="#D4AF37" />
            </linearGradient>
            <linearGradient id="shieldGrad" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#16A34A" />
            </linearGradient>
            <filter id="glowGold"><feGaussianBlur stdDeviation="5" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
            <filter id="shieldGlow"><feGaussianBlur stdDeviation="6" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
          </defs>

          {/* ═══ BOUNCING MEMBERSHIP CARD ═══ */}
          <g filter="url(#glowGold)" transform="translate(140,130)">
            <g>
              <animateTransform attributeName="transform" type="translate" values="0,0;0,-12;0,0;0,-6;0,0" dur="2s" repeatCount="indefinite" keyTimes="0;0.25;0.5;0.7;1" />
              {/* Card body */}
              <rect x="-80" y="-52" width="160" height="104" rx="12" fill="rgba(10,10,15,0.95)" stroke="url(#memGold)" strokeWidth="2.2" />
              {/* Card glass shine */}
              <rect x="-75" y="-48" width="30" height="60" rx="6" fill="rgba(255,255,255,0.03)" />
              {/* Card top edge highlight */}
              <rect x="-78" y="-52" width="156" height="1" rx="0.5" fill="rgba(212,175,55,0.3)" />

              {/* CURAONE watermark text */}
              <text x="-60" y="-28" fill="rgba(212,175,55,0.12)" fontSize="9" fontWeight="900" letterSpacing="3">CURAONE</text>

              {/* Logo area placeholder — the "1" */}
              <g transform="translate(50,-20)">
                <text x="0" y="0" textAnchor="middle" fill="url(#memGold)" fontSize="32" fontWeight="900" fontFamily="Outfit, sans-serif" opacity="0.4">1</text>
              </g>

              {/* GOLD tier label */}
              <text x="-60" y="-6" fill="#D4AF37" fontSize="22" fontWeight="900" fontFamily="Outfit, sans-serif">GOLD</text>

              {/* Card bottom details */}
              <rect x="-60" y="14" width="50" height="5" rx="2.5" fill="rgba(212,175,55,0.12)" />
              <rect x="-60" y="24" width="30" height="4" rx="2" fill="rgba(212,175,55,0.08)" />

              {/* Card chip */}
              <rect x="30" y="14" width="20" height="16" rx="3" fill="rgba(212,175,55,0.1)" stroke="#D4AF37" strokeWidth="1" opacity="0.5" />
              <line x1="30" y1="20" x2="50" y2="20" stroke="#D4AF37" strokeWidth="0.5" opacity="0.3" />
              <line x1="30" y1="25" x2="50" y2="25" stroke="#D4AF37" strokeWidth="0.5" opacity="0.3" />
              <line x1="40" y1="14" x2="40" y2="30" stroke="#D4AF37" strokeWidth="0.5" opacity="0.3" />

              {/* CuraOne small text */}
              <text x="55" y="42" textAnchor="end" fill="#D4AF37" fontSize="7" fontWeight="700" opacity="0.35">CuraOne</text>
            </g>
          </g>

          {/* ═══ SHIELD WITH TICK — appears over card ═══ */}
          <g filter="url(#shieldGlow)" transform="translate(140,125)">
            <g>
              {/* Shield fades in after bounce, then pulses */}
              <animate attributeName="opacity" values="0;0;1;1;0" dur="4s" repeatCount="indefinite" keyTimes="0;0.3;0.45;0.85;1" />
              <animateTransform attributeName="transform" type="scale" values="0.5;0.5;1.05;1;1" dur="4s" repeatCount="indefinite" keyTimes="0;0.3;0.45;0.55;1" />

              {/* Shield shape */}
              <path d="M0,-38 L30,-26 L30,8 C30,24 16,36 0,42 C-16,36 -30,24 -30,8 L-30,-26 Z"
                fill="rgba(10,10,15,0.92)" stroke="url(#shieldGrad)" strokeWidth="2.5" />
              {/* Shield inner glow */}
              <path d="M0,-32 L24,-22 L24,6 C24,20 13,30 0,35 C-13,30 -24,20 -24,6 L-24,-22 Z"
                fill="rgba(34,197,94,0.06)" />

              {/* Tick mark — draws in */}
              <path d="M-12,4 L-4,12 L14,-8" fill="none" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" strokeDashoffset="40">
                <animate attributeName="stroke-dashoffset" values="40;40;0;0;40" dur="4s" repeatCount="indefinite" keyTimes="0;0.35;0.55;0.85;1" />
              </path>

              {/* Pulse ring */}
              <path d="M0,-38 L30,-26 L30,8 C30,24 16,36 0,42 C-16,36 -30,24 -30,8 L-30,-26 Z"
                fill="none" stroke="#22C55E" strokeWidth="1.5" opacity="0">
                <animate attributeName="opacity" values="0;0;0.4;0" dur="4s" repeatCount="indefinite" keyTimes="0;0.4;0.5;0.7" />
                <animateTransform attributeName="transform" type="scale" values="1;1;1.3;1.3" dur="4s" repeatCount="indefinite" keyTimes="0;0.4;0.7;1" />
              </path>
            </g>
          </g>

          {/* Sparkles around shield */}
          {[{x:110,y:90,d:0.5},{x:170,y:85,d:0.8},{x:105,y:155,d:1.1},{x:175,y:160,d:1.4}].map((s,i) => (
            <circle key={`sh-${i}`} cx={s.x} cy={s.y} r="2" fill="#D4AF37" opacity="0">
              <animate attributeName="opacity" values="0;0;0.7;0" dur="4s" begin={`${s.d}s`} repeatCount="indefinite" keyTimes="0;0.4;0.55;0.75" />
              <animate attributeName="r" values="1;1;4;1" dur="4s" begin={`${s.d}s`} repeatCount="indefinite" keyTimes="0;0.4;0.55;0.75" />
            </circle>
          ))}
        </svg>
      </div>

      <div className="flex flex-col items-center mt-4 gap-2.5">
        <p className="text-white/85 text-[15px] font-semibold tracking-wide" style={{ fontFamily: 'Outfit, sans-serif', animation: 'blFadeUp .5s ease-out .4s both' }}>CuraOne</p>
        <LoadingDots color="#D4AF37" />
      </div>
      <LoaderStyles />
    </div>
  );
}

/* ─── HOME LOADER — 2x2 Grid with Rotating Glow Highlight ─── */
function OrbitingIconsLoader() {
  const items = [
    { label: 'Consult', color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: 'M0,-10 C-6,-10 -10,-6 -10,0 L-10,2 C-10,8 -6,12 0,12 C6,12 10,8 10,2 L10,0 C10,-6 6,-10 0,-10 Z M-6,12 L-6,16 C-6,16 -4,20 0,20 C4,20 6,16 6,16 L6,12', icon2: 'M0,-4 L0,4 M-4,0 L4,0' },
    { label: 'Labs', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'M-4,-14 L-4,-8 L-8,-8 L-8,10 C-8,14 -4,16 0,16 C4,16 8,14 8,10 L8,-8 L4,-8 L4,-14 Z', icon2: 'M-6,4 L6,4' },
    { label: 'Medicine', color: '#FF6B35', bg: 'rgba(255,107,53,0.12)', icon: 'M-5,-12 L5,-12 C8,-12 10,-10 10,-7 L10,7 C10,10 8,12 5,12 L-5,12 C-8,12 -10,10 -10,7 L-10,-7 C-10,-10 -8,-12 -5,-12 Z', icon2: 'M0,-6 L0,6 M-6,0 L6,0' },
    { label: 'Preventive', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'M0,-14 L12,-8 L12,4 C12,12 7,16 0,18 C-7,16 -12,12 -12,4 L-12,-8 Z', icon2: 'M-5,2 L-1,6 L7,-3' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center" style={{ background: '#0A0A0F' }} data-testid="branded-loader-default">
      <div className="absolute rounded-full pointer-events-none" style={{ width: 380, height: 380, background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)', filter: 'blur(50px)', animation: 'blGlowPulse 3s ease-in-out infinite' }} />

      <div style={{ animation: 'blCardPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <div className="grid grid-cols-2 gap-5" style={{ width: 200 }}>
          {items.map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className="w-[76px] h-[76px] rounded-2xl flex items-center justify-center"
                style={{
                  background: item.bg,
                  border: `1.5px solid ${item.color}25`,
                  animation: `hlGlow${i} 4s ease-in-out infinite`,
                }}
              >
                <svg viewBox="-16 -18 32 36" width="32" height="32">
                  <path d={item.icon} fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
                  {item.icon2 && <path d={item.icon2} fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />}
                </svg>
              </div>
              <span className="text-[11px] font-medium tracking-wide" style={{ color: `${item.color}BB`, fontFamily: 'Outfit, sans-serif' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center mt-8 gap-2">
        <p className="text-white/90 text-lg font-semibold tracking-wide" style={{ fontFamily: 'Outfit, sans-serif', animation: 'blFadeUp .5s ease-out .4s both' }}>Nevika Cura</p>
        <p className="text-white/30 text-xs tracking-wider uppercase" style={{ animation: 'blFadeUp .5s ease-out .6s both' }}>Your Health, Our Priority</p>
        <LoadingDots color="#06B6D4" />
      </div>

      <style>{`
        @keyframes hlGlow0 {
          0%,100% { box-shadow: 0 0 20px rgba(6,182,212,0.4), inset 0 0 12px rgba(6,182,212,0.15); border-color: rgba(6,182,212,0.5); }
          25%,75% { box-shadow: none; border-color: rgba(6,182,212,0.1); }
        }
        @keyframes hlGlow1 {
          0%,24% { box-shadow: none; border-color: rgba(34,197,94,0.1); }
          25% { box-shadow: 0 0 20px rgba(34,197,94,0.4), inset 0 0 12px rgba(34,197,94,0.15); border-color: rgba(34,197,94,0.5); }
          50%,100% { box-shadow: none; border-color: rgba(34,197,94,0.1); }
        }
        @keyframes hlGlow2 {
          0%,49% { box-shadow: none; border-color: rgba(255,107,53,0.1); }
          50% { box-shadow: 0 0 20px rgba(255,107,53,0.4), inset 0 0 12px rgba(255,107,53,0.15); border-color: rgba(255,107,53,0.5); }
          75%,100% { box-shadow: none; border-color: rgba(255,107,53,0.1); }
        }
        @keyframes hlGlow3 {
          0%,74% { box-shadow: none; border-color: rgba(139,92,246,0.1); }
          75% { box-shadow: 0 0 20px rgba(139,92,246,0.4), inset 0 0 12px rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.5); }
          100% { box-shadow: none; border-color: rgba(139,92,246,0.1); }
        }
      `}</style>
      <LoaderStyles />
    </div>
  );
}

/* ─── SHARED COMPONENTS ─── */
function LoadingDots({ color }) {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="block w-1.5 h-1.5 rounded-full"
          style={{
            background: color,
            boxShadow: `0 0 8px ${color}`,
            animation: `blDotBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function LoaderStyles() {
  return (
    <style>{`
      @keyframes blCardPop { 0% { opacity: 0; transform: scale(0.85); } 100% { opacity: 1; transform: scale(1); } }
      @keyframes blFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes blDotBounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1.2); opacity: 1; } }
      @keyframes blGlowPulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.15); } }
    `}</style>
  );
}

/* ─── MAIN EXPORT ─── */
const VARIANT_MAP = {
  orange: PharmacyLoader,
  mango: MangoLabsLoader,
  diagyn: DiaGynLoader,
  curapay: CuraPayLoader,
  curaone: CuraOneLoader,
};

export default function BrandedLoader({ variant = 'default' }) {
  const Loader = VARIANT_MAP[variant];
  if (Loader) return <Loader />;
  return <OrbitingIconsLoader />;
}
