import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Play } from 'lucide-react';

const ORANGE = '#F97316';
const BG = '#0A0A0F';

const SLIDES = [
  {
    image: 'https://customer-assets.emergentagent.com/job_81b27d4d-7f34-4ada-a233-9c43120f5ebb/artifacts/4yp6nomh_file_000000005d9c7208bbfe59c5f7fb479a%20%281%29.png',
    label: 'Order Online',
    sub: 'Browse & add medicines to cart',
  },
  {
    image: 'https://customer-assets.emergentagent.com/job_81b27d4d-7f34-4ada-a233-9c43120f5ebb/artifacts/3q9ukf9t_file_000000005d9c7208bbfe59c5f7fb479a%20%282%29.png',
    label: 'Track Delivery',
    sub: 'Real-time order tracking',
  },
  {
    image: 'https://customer-assets.emergentagent.com/job_81b27d4d-7f34-4ada-a233-9c43120f5ebb/artifacts/5tlaa07r_file_000000005d9c7208bbfe59c5f7fb479a%20%283%29.png',
    label: 'On The Way',
    sub: 'Fast delivery to your door',
  },
  {
    image: 'https://customer-assets.emergentagent.com/job_81b27d4d-7f34-4ada-a233-9c43120f5ebb/artifacts/kby6bp1q_file_000000005d9c7208bbfe59c5f7fb479a%20%284%29.png',
    label: 'Delivered!',
    sub: 'Medicines at your doorstep',
  },
];

const OrangeTutorial = ({ open, onClose }) => {
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
      else setPlaying(false);
    }, 2800);
    return () => clearTimeout(t);
  }, [slide, playing]);

  const replay = useCallback(() => { setSlide(0); setPlaying(true); }, []);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" data-testid="orange-tutorial">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[92vw] max-w-sm rounded-2xl overflow-hidden" style={{ background: BG, border: `1px solid ${ORANGE}20` }}>
        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }} data-testid="orange-tutorial-close">
          <X className="w-4 h-4 text-white/40" />
        </button>

        {/* Title */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: `${ORANGE}90` }}>How It Works</p>
        </div>

        {/* Slide viewport */}
        <div className="relative px-5 pb-3" style={{ height: 280 }}>
          {/* Ambient glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full" style={{ width: 280, height: 280, background: `radial-gradient(circle, ${ORANGE}10 0%, ${ORANGE}04 45%, transparent 70%)`, filter: 'blur(40px)' }} />
          </div>
          {/* Current slide image */}
          <div key={slide} className="relative w-full h-full flex items-center justify-center" style={{ animation: 'otSlideIn 0.4s ease-out both' }}>
            <div className="w-60 h-60 rounded-2xl overflow-hidden">
              <img
                src={SLIDES[slide].image}
                alt={SLIDES[slide].label}
                className="w-full h-full object-cover scale-110"
              />
            </div>
          </div>
        </div>

        {/* Label + step dots */}
        <div className="px-5 pb-5">
          <p className="text-white/90 text-sm font-bold text-center mb-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>{SLIDES[slide].label}</p>
          <p className="text-white/30 text-[11px] text-center mb-4">{SLIDES[slide].sub}</p>
          <div className="flex items-center justify-center gap-2">
            {[0,1,2,3].map(i => (
              <button key={i} onClick={() => { setSlide(i); setPlaying(false); }} className="transition-all" data-testid={`orange-tutorial-dot-${i}`}>
                <div className="rounded-full transition-all" style={{
                  width: slide === i ? 20 : 6, height: 6,
                  background: slide === i ? ORANGE : `${ORANGE}30`,
                  boxShadow: slide === i ? `0 0 8px ${ORANGE}50` : 'none',
                }} />
              </button>
            ))}
            {/* Replay */}
            {!playing && slide === 3 && (
              <button onClick={replay} className="ml-3 flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full active:scale-95 transition-all" style={{ color: ORANGE, background: `${ORANGE}15`, border: `1px solid ${ORANGE}30` }} data-testid="orange-tutorial-replay">
                <Play className="w-3 h-3" /> Replay
              </button>
            )}
          </div>
        </div>

        <style>{`
          @keyframes otSlideIn { 0% { opacity:0; transform:translateX(30px); } 100% { opacity:1; transform:translateX(0); } }
        `}</style>
      </div>
    </div>,
    document.body
  );
};

export default OrangeTutorial;
