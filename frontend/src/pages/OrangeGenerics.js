import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Sparkles, Factory, BadgeDollarSign, Dna } from 'lucide-react';

const GENERICS_LOGO = "https://customer-assets.emergentagent.com/job_01733c5e-6170-4599-b958-d3155c19b432/artifacts/m5stm7a8_file_00000000dbf0720bad503a19dad44b60.png";

const OrangeGenerics = () => {
  const navigate = useNavigate();
  const [notified, setNotified] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const p = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
    }));
    setParticles(p);
  }, []);

  const handleNotify = () => {
    setNotified(true);
    const phone = localStorage.getItem('guestMobile');
    if (phone) {
      fetch(`${process.env.REACT_APP_BACKEND_URL}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, service: 'orange_generics' })
      }).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#fefefe' }} data-testid="orange-generics-page">
      <style>{`
        @keyframes ogFloat { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes ogPulse { 0%,100% { opacity: 0.15; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.5); } }
        @keyframes ogShimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes ogFadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Back button */}
      <button
        onClick={() => navigate('/orange')}
        className="fixed top-4 left-4 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
        style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}
        data-testid="generics-back-btn"
      >
        <ArrowLeft className="w-5 h-5 text-orange-500" />
      </button>

      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
        {/* Floating particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              background: 'rgba(249,115,22,0.2)',
              animation: `ogPulse ${p.duration}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}

        {/* Glow rings */}
        <div className="absolute" style={{ width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)', top: '20%', left: '50%', transform: 'translateX(-50%)' }} />

        {/* Logo with float animation */}
        <div className="relative mb-8" style={{ animation: 'ogFloat 4s ease-in-out infinite' }}>
          <div className="w-64 h-64 flex items-center justify-center">
            <img src={GENERICS_LOGO} alt="Orange Generics" className="w-full h-full object-contain drop-shadow-lg" />
          </div>
          {/* Shimmer ring */}
          <div className="absolute -inset-6 rounded-full" style={{ border: '2px solid transparent', background: 'linear-gradient(135deg, transparent, rgba(249,115,22,0.15), transparent) border-box', animation: 'ogPulse 3s ease-in-out infinite 1s' }} />
        </div>

        {/* Text content */}
        <div className="text-center max-w-sm" style={{ animation: 'ogFadeUp 0.8s ease-out 0.3s both' }}>
          <h1 className="text-3xl font-black mb-3 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#1a1a2e' }}>
            A New Standard
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #f97316, #ea580c, #c2410c)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              in Generics
            </span>
          </h1>
          <p className="text-base text-slate-500 leading-relaxed mb-2">
            Quality generic medicines at affordable prices.
          </p>
          <p className="text-sm text-slate-400">
            Same active ingredients. Same efficacy. Better value.
          </p>
        </div>

        {/* Coming Soon badge */}
        <div className="mt-8 mb-6" style={{ animation: 'ogFadeUp 0.8s ease-out 0.6s both' }}>
          <div
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
              border: '2px solid rgba(249,115,22,0.2)',
              color: '#c2410c',
              backgroundSize: '200% auto',
              animation: 'ogShimmer 3s linear infinite',
            }}
          >
            <Sparkles className="w-4 h-4" />
            Coming Soon
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        {/* Notify button */}
        <div style={{ animation: 'ogFadeUp 0.8s ease-out 0.9s both' }}>
          {!notified ? (
            <button
              onClick={handleNotify}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white transition-all active:scale-95 hover:shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                boxShadow: '0 8px 32px rgba(249,115,22,0.3)',
              }}
              data-testid="notify-me-btn"
            >
              <Bell className="w-5 h-5" />
              Notify Me When It Launches
            </button>
          ) : (
            <div className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-emerald-700" style={{ background: '#ecfdf5', border: '2px solid #a7f3d0' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              We'll notify you!
            </div>
          )}
        </div>

        {/* Features preview */}
        <div className="mt-12 w-full max-w-sm grid grid-cols-3 gap-3" style={{ animation: 'ogFadeUp 0.8s ease-out 1.2s both' }}>
          {[
            { label: 'WHO-GMP Certified', Icon: Factory },
            { label: 'Up to 80% Savings', Icon: BadgeDollarSign },
            { label: 'Same Efficacy', Icon: Dna },
          ].map((f, i) => (
            <div key={i} className="text-center p-3 rounded-2xl" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <f.Icon className="w-6 h-6 mx-auto mb-1.5 text-orange-500" />
              <p className="text-[10px] font-semibold text-slate-600 leading-tight">{f.label}</p>
            </div>
          ))}
        </div>

        {/* Nevika Cura footer */}
        <p className="mt-10 text-xs text-slate-300 tracking-wider uppercase" style={{ animation: 'ogFadeUp 0.8s ease-out 1.5s both' }}>
          A Nevika Cura Company
        </p>
      </div>

    </div>
  );
};

export default OrangeGenerics;
