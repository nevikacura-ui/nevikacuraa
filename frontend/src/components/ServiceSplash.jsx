import React from 'react';

const ServiceSplash = ({ image, imageAlt, heroComponent, caption, description, buttonLabel = 'Get Started', buttonGradient, bgGradient, accentColor, onContinue, testId }) => {
  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden" data-testid={testId}>
      <style>{`
        @keyframes splFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        @keyframes splFadeUp { from { opacity:0; transform: translateY(30px); } to { opacity:1; transform: translateY(0); } }
        @keyframes splOrb { 0%,100% { transform: scale(1); opacity: 0.35; } 50% { transform: scale(1.12); opacity: 0.6; } }
      `}</style>

      {/* Full-screen pastel background */}
      <div className="absolute inset-0" style={{ background: bgGradient }} />

      {/* Floating ambient orbs */}
      <div className="absolute top-[8%] right-[-8%] w-[40vw] h-[40vw] rounded-full" style={{ background: `radial-gradient(circle, ${accentColor}15, transparent 70%)`, animation: 'splOrb 6s ease-in-out infinite' }} />
      <div className="absolute bottom-[20%] left-[-10%] w-[35vw] h-[35vw] rounded-full" style={{ background: `radial-gradient(circle, ${accentColor}10, transparent 70%)`, animation: 'splOrb 7s ease-in-out infinite 2s' }} />
      <div className="absolute top-[30%] left-[5%] w-[20vw] h-[20vw] rounded-full" style={{ background: `radial-gradient(circle, ${accentColor}08, transparent 70%)`, animation: 'splOrb 5s ease-in-out infinite 1s' }} />

      {/* Hero — upper portion */}
      <div className="relative z-10 flex-shrink-0 flex items-center justify-center pt-16 pb-4" style={{ minHeight: '48vh' }}>
        {heroComponent ? (
          heroComponent
        ) : (
          <div style={{ animation: 'splFloat 5s ease-in-out infinite', filter: `drop-shadow(0 24px 48px ${accentColor}20)` }}>
            <img
              src={image}
              alt={imageAlt}
              className="w-72 h-auto max-h-72 object-contain"
              data-testid="splash-hero-image"
            />
          </div>
        )}
      </div>

      {/* Bottom glassmorphism panel */}
      <div className="relative z-10 flex-1 flex flex-col" style={{ animation: 'splFadeUp 0.7s ease-out 0.2s both' }}>
        <div
          className="flex-1 rounded-t-[32px] px-8 pt-8 pb-10 flex flex-col items-center"
          style={{
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.7)',
            borderBottom: 'none',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.04)',
          }}
        >
          <h1
            className="text-[22px] font-extrabold text-gray-900 leading-tight text-center mb-3"
            style={{ fontFamily: 'Outfit, sans-serif' }}
            data-testid="splash-caption"
          >
            {caption}
          </h1>
          <p
            className="text-[13px] text-gray-400 leading-relaxed text-center max-w-xs mb-8"
            data-testid="splash-description"
          >
            {description}
          </p>
          <button
            onClick={onContinue}
            className="w-full max-w-xs py-4 rounded-2xl text-white font-bold text-[15px] active:scale-[0.96] transition-transform"
            style={{ background: buttonGradient, boxShadow: `0 8px 28px ${accentColor}30` }}
            data-testid="splash-get-started"
          >
            {buttonLabel}
          </button>
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-2 h-2 rounded-full" style={{ background: `${accentColor}25` }} />
            <div className="w-2 h-2 rounded-full" style={{ background: `${accentColor}25` }} />
            <div className="w-6 h-2 rounded-full" style={{ background: accentColor }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceSplash;
