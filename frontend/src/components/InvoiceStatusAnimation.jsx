import React, { useEffect, useState } from 'react';

const VARIANTS = {
  success: {
    color: '#22C55E',
    colorLight: '#4ADE80',
    colorBg: 'rgba(34,197,94,0.12)',
    screenColor: '#22C55E',
    label: 'Confirmed!',
  },
  failure: {
    color: '#EF4444',
    colorLight: '#FCA5A5',
    colorBg: 'rgba(239,68,68,0.12)',
    screenColor: '#EF4444',
    label: 'Failed',
  },
  alert: {
    color: '#F59E0B',
    colorLight: '#FCD34D',
    colorBg: 'rgba(245,158,11,0.12)',
    screenColor: '#F59E0B',
    label: 'Alert',
  },
};

export default function InvoiceStatusAnimation({
  variant = 'success',
  title = '',
  subtitle = '',
  show = true,
  onComplete,
  autoHide = false,
  autoHideDelay = 3000,
}) {
  const [visible, setVisible] = useState(show);
  const [phase, setPhase] = useState(0);
  const config = VARIANTS[variant] || VARIANTS.success;

  useEffect(() => {
    if (!show) { setVisible(false); return; }
    setVisible(true);
    setPhase(0);

    // Phase 1: Screen lights up (phone appears)
    const t1 = setTimeout(() => setPhase(1), 300);
    // Phase 2: Receipt starts printing (sliding out)
    const t2 = setTimeout(() => setPhase(2), 900);
    // Phase 3: Receipt content fully revealed, icon draws
    const t3 = setTimeout(() => setPhase(3), 1700);

    let t4;
    if (autoHide) {
      t4 = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, autoHideDelay);
    }

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); if (t4) clearTimeout(t4); };
  }, [show, autoHide, autoHideDelay, onComplete]);

  if (!visible) return null;

  const displayTitle = title || (variant === 'success' ? 'Order Confirmed!' : variant === 'failure' ? 'Payment Failed' : 'Invalid Credentials');

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: 'rgba(8,8,12,0.94)', backdropFilter: 'blur(10px)' }}
      data-testid={`invoice-status-${variant}`}
    >
      {/* Ambient glow behind phone */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 280, height: 280,
          background: `radial-gradient(circle, ${config.colorBg} 0%, transparent 70%)`,
          filter: 'blur(60px)',
          opacity: phase >= 1 ? 0.8 : 0,
          transition: 'opacity 1s ease',
        }}
      />

      {/* Phone + Receipt Assembly */}
      <div className="relative" style={{ width: 200, height: 420 }}>

        {/* ──── Phone Body ──── */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0"
          style={{
            width: 170,
            height: 280,
            borderRadius: 28,
            background: 'linear-gradient(160deg, #2a2d3a 0%, #1c1e28 50%, #16171f 100%)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.06)',
            zIndex: 10,
          }}
        >
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{
            width: 60, height: 22, borderRadius: '0 0 14px 14px',
            background: '#0e0f14',
          }} />

          {/* Camera dot */}
          <div className="absolute" style={{ top: 7, left: '50%', marginLeft: 16, width: 6, height: 6, borderRadius: '50%', background: '#1a1b24', border: '1px solid rgba(255,255,255,0.05)' }} />

          {/* Screen */}
          <div
            className="absolute"
            style={{
              top: 16,
              left: 8,
              right: 8,
              bottom: 16,
              borderRadius: 18,
              background: phase >= 1 ? `linear-gradient(180deg, ${config.screenColor}18, ${config.screenColor}08)` : '#0c0d12',
              transition: 'background 0.6s ease',
              overflow: 'hidden',
            }}
          >
            {/* Screen content - processing indicator */}
            {phase >= 1 && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                {/* Animated processing dots */}
                {phase < 3 && (
                  <div className="flex gap-2">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="rounded-full"
                        style={{
                          width: 8, height: 8,
                          background: config.color,
                          animation: `invoiceDotBounce 0.6s ease-in-out ${i * 0.15}s infinite alternate`,
                          opacity: 0.7,
                        }}
                      />
                    ))}
                  </div>
                )}
                {/* Status text on screen */}
                <p style={{
                  fontSize: 11,
                  color: config.color,
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                  opacity: phase >= 1 ? 0.6 : 0,
                  transition: 'opacity 0.3s ease',
                }}>
                  {phase < 3 ? 'PROCESSING...' : 'PRINTED'}
                </p>
                {/* Status icon on screen when complete */}
                {phase >= 3 && (
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `${config.color}20`,
                    border: `2px solid ${config.color}60`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'invoiceScalePop 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                  }}>
                    {variant === 'success' && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {variant === 'failure' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth="3" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                    {variant === 'alert' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth="3" strokeLinecap="round">
                        <line x1="12" y1="8" x2="12" y2="14" /><circle cx="12" cy="18" r="1" fill={config.color} />
                      </svg>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Home indicator bar at bottom of phone */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2" style={{
            width: 40, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.06)',
          }} />
        </div>

        {/* ──── Printer Slot ──── */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: 274,
            width: 130,
            height: 6,
            borderRadius: 3,
            background: 'linear-gradient(180deg, #0a0b10, #1a1b22 50%, #0a0b10)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            zIndex: 12,
          }}
        />

        {/* ──── Receipt Container (masked above slot) ──── */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: 278,
            width: 120,
            height: 140,
            overflow: 'hidden',
            zIndex: 5,
          }}
        >
          {/* Receipt paper - slides DOWN from inside the phone */}
          <div
            style={{
              width: '100%',
              background: '#FFFFFF',
              borderRadius: '0 0 6px 6px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              transform: `translateY(${phase >= 2 ? '0%' : '-100%'})`,
              transition: 'transform 0.8s cubic-bezier(0.22,0.61,0.36,1)',
              padding: '10px 12px 6px',
            }}
          >
            {/* Receipt header line */}
            <div style={{
              width: '70%', height: 3, borderRadius: 2, margin: '0 auto 8px',
              background: phase >= 3 ? config.color : '#e5e7eb',
              transition: 'background 0.4s ease',
              opacity: 0.6,
            }} />

            {/* Status icon on receipt */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%', margin: '0 auto 6px',
              background: phase >= 3 ? `${config.color}15` : '#f3f4f6',
              border: `2px solid ${phase >= 3 ? config.color : '#e5e7eb'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.4s ease 0.2s',
            }}>
              {variant === 'success' && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <polyline
                    points="20 6 9 17 4 12"
                    stroke={config.color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="28"
                    strokeDashoffset={phase >= 3 ? 0 : 28}
                    style={{ transition: 'stroke-dashoffset 0.5s ease 0.3s' }}
                  />
                </svg>
              )}
              {variant === 'failure' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ opacity: phase >= 3 ? 1 : 0, transition: 'opacity 0.3s ease 0.3s' }}>
                  <line x1="18" y1="6" x2="6" y2="18" stroke={config.color} strokeWidth="3" strokeLinecap="round" />
                  <line x1="6" y1="6" x2="18" y2="18" stroke={config.color} strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {variant === 'alert' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ opacity: phase >= 3 ? 1 : 0, transition: 'opacity 0.3s ease 0.3s' }}>
                  <line x1="12" y1="8" x2="12" y2="16" stroke={config.color} strokeWidth="3" strokeLinecap="round" />
                  <circle cx="12" cy="20" r="1.5" fill={config.color} />
                </svg>
              )}
            </div>

            {/* Receipt text lines */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '80%', height: 3, borderRadius: 2,
                background: phase >= 3 ? `${config.color}40` : '#e5e7eb',
                transition: 'background 0.3s ease 0.4s',
              }} />
              <div style={{
                width: '55%', height: 3, borderRadius: 2,
                background: phase >= 3 ? `${config.color}25` : '#f3f4f6',
                transition: 'background 0.3s ease 0.5s',
              }} />
              <div style={{
                width: '65%', height: 3, borderRadius: 2,
                background: phase >= 3 ? `${config.color}20` : '#f3f4f6',
                transition: 'background 0.3s ease 0.6s',
              }} />
            </div>

            {/* Dashed separator */}
            <div style={{
              borderTop: '1px dashed #d1d5db',
              margin: '8px 0 6px',
            }} />

            {/* Amount placeholder */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '30%', height: 3, borderRadius: 2, background: '#e5e7eb' }} />
              <div style={{
                width: '25%', height: 4, borderRadius: 2,
                background: phase >= 3 ? config.color : '#d1d5db',
                transition: 'background 0.3s ease 0.5s',
                fontWeight: 'bold',
              }} />
            </div>

            {/* Perforated tear edge */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginTop: 8, paddingBottom: 2 }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'rgba(8,8,12,0.94)',
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Title and subtitle below animation */}
      <div className="flex flex-col items-center mt-2 gap-1.5" style={{ zIndex: 20 }}>
        <p
          className="text-lg font-semibold tracking-wide"
          style={{
            fontFamily: 'Outfit, sans-serif',
            color: config.color,
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.5s ease 0.3s',
          }}
        >
          {displayTitle}
        </p>
        {subtitle && (
          <p
            className="text-white/50 text-sm text-center max-w-[260px]"
            style={{
              opacity: phase >= 3 ? 1 : 0,
              transition: 'opacity 0.4s ease 0.5s',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      <style>{`
        @keyframes invoiceDotBounce {
          from { transform: translateY(0); opacity: 0.4; }
          to { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes invoiceScalePop {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
