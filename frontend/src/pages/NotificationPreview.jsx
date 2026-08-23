import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, X, Info, ShieldCheck } from 'lucide-react';

const NotificationPreview = () => {
  const [active, setActive] = useState(null);

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center pt-8 px-4 gap-6 pb-20">
      <h1 className="text-white text-lg font-bold tracking-wide" style={{ fontFamily: 'Outfit, sans-serif' }}>Notification Styles</h1>
      <p className="text-white/40 text-xs -mt-4 mb-2">Tap each to preview</p>

      {/* Trigger Buttons */}
      {['a', 'b', 'c', 'd'].map((id, i) => (
        <button key={id} onClick={() => { setActive(id); setTimeout(() => setActive(null), 3500); }}
          className="w-full max-w-sm py-3 rounded-xl text-white text-sm font-semibold active:scale-[0.97] transition-all"
          style={{
            background: ['rgba(6,182,212,0.12)', 'rgba(139,92,246,0.12)', 'rgba(34,197,94,0.12)', 'rgba(255,107,53,0.12)'][i],
            border: `1px solid ${['rgba(6,182,212,0.3)', 'rgba(139,92,246,0.3)', 'rgba(34,197,94,0.3)', 'rgba(255,107,53,0.3)'][i]}`,
          }}
        >
          {['A. Floating Glass Card', 'B. Radial Pulse', 'C. Split Banner', 'D. Minimal Floating Pill'][i]}
        </button>
      ))}

      {/* ═══ STYLE A: Floating Glass Card ═══ */}
      {active === 'a' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none" style={{ animation: 'nfFadeIn 0.3s ease-out both' }}>
          <div className="pointer-events-auto rounded-2xl px-6 py-5 flex flex-col items-center gap-3 max-w-[85vw]"
            style={{
              background: 'rgba(15,15,25,0.85)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(6,182,212,0.2)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 30px rgba(6,182,212,0.1)',
              animation: 'nfScaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)', boxShadow: '0 0 20px rgba(34,197,94,0.2)' }}>
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-white/90 text-sm font-semibold text-center">Appointment Booked Successfully!</p>
            <p className="text-white/40 text-xs text-center">Dr. Vikas Jha · Mar 28 · 6:30 PM</p>
            <div className="w-full h-[2px] rounded-full overflow-hidden mt-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full bg-emerald-400/60 rounded-full" style={{ animation: 'nfProgress 3s linear both' }} />
            </div>
          </div>
        </div>
      )}

      {/* ═══ STYLE B: Radial Pulse ═══ */}
      {active === 'b' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none" style={{ animation: 'nfFadeIn 0.2s ease-out both' }}>
          <div className="pointer-events-auto flex flex-col items-center gap-4" style={{ animation: 'nfScaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            {/* Pulse rings */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full" style={{ width: 80, height: 80, border: '2px solid rgba(139,92,246,0.3)', animation: 'nfRipple 1.5s ease-out infinite' }} />
              <div className="absolute inset-0 rounded-full" style={{ width: 80, height: 80, border: '2px solid rgba(139,92,246,0.2)', animation: 'nfRipple 1.5s ease-out 0.3s infinite' }} />
              <div className="w-20 h-20 rounded-full flex items-center justify-center relative" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', boxShadow: '0 8px 30px rgba(139,92,246,0.5)' }}>
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="text-center px-8 py-3 rounded-xl" style={{ background: 'rgba(15,15,25,0.8)', backdropFilter: 'blur(16px)', border: '1px solid rgba(139,92,246,0.15)' }}>
              <p className="text-white/90 text-sm font-semibold">Payment Confirmed</p>
              <p className="text-purple-300/50 text-xs mt-1">₹500 · Consultation Fee</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STYLE C: Split Banner ═══ */}
      {active === 'c' && (
        <div className="fixed inset-x-0 z-[9999] flex justify-center pointer-events-none" style={{ top: '40%', animation: 'nfFadeIn 0.2s ease-out both' }}>
          <div className="pointer-events-auto flex items-stretch rounded-xl overflow-hidden max-w-[90vw] w-full mx-4"
            style={{
              background: 'rgba(15,15,25,0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(34,197,94,0.15)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              animation: 'nfSlideUp 0.35s ease-out both',
            }}
          >
            {/* Accent bar */}
            <div className="w-1.5 flex-shrink-0" style={{ background: 'linear-gradient(180deg, #22C55E, #16A34A)' }} />
            <div className="flex items-center gap-3 px-4 py-4 flex-1">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white/90 text-sm font-semibold">Booking Confirmed</p>
                <p className="text-white/35 text-xs mt-0.5">Dr. Vikas Jha · 6:30 PM · Pushpa Hospital</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STYLE D: Minimal Floating Pill ═══ */}
      {active === 'd' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none" style={{ animation: 'nfFadeIn 0.15s ease-out both' }}>
          <div className="pointer-events-auto flex items-center gap-2.5 pl-3 pr-5 py-2.5 rounded-full"
            style={{
              background: 'rgba(20,20,30,0.92)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(34,197,94,0.2)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 15px rgba(34,197,94,0.08)',
              animation: 'nfPillIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-white/85 text-sm font-medium">Appointment Booked</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes nfFadeIn { 0% { opacity:0; } 100% { opacity:1; } }
        @keyframes nfScaleIn { 0% { opacity:0; transform:scale(0.8); } 100% { opacity:1; transform:scale(1); } }
        @keyframes nfSlideUp { 0% { opacity:0; transform:translateY(20px); } 100% { opacity:1; transform:translateY(0); } }
        @keyframes nfPillIn { 0% { opacity:0; transform:scale(0.7); } 100% { opacity:1; transform:scale(1); } }
        @keyframes nfProgress { 0% { width:100%; } 100% { width:0%; } }
        @keyframes nfRipple { 0% { transform:scale(1); opacity:0.5; } 100% { transform:scale(2.5); opacity:0; } }
      `}</style>
    </div>
  );
};

export default NotificationPreview;
