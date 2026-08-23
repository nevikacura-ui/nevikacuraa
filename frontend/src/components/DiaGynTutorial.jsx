import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Play } from 'lucide-react';

const CYAN = '#06B6D4';
const BG = '#0A0A0F';

const SLIDES = [
  {
    image: 'https://customer-assets.emergentagent.com/job_81b27d4d-7f34-4ada-a233-9c43120f5ebb/artifacts/mzn9z56u_file_00000000d5747208b87d364cb4d9015a%20%281%29.png',
    label: 'Select Doctor',
    sub: 'Browse profiles, ratings & specialties',
  },
  {
    image: 'https://customer-assets.emergentagent.com/job_81b27d4d-7f34-4ada-a233-9c43120f5ebb/artifacts/7xfow5e9_file_00000000d5747208b87d364cb4d9015a%20%282%29.png',
    label: 'Choose Date',
    sub: 'Select your preferred appointment slot',
  },
  {
    image: 'https://customer-assets.emergentagent.com/job_81b27d4d-7f34-4ada-a233-9c43120f5ebb/artifacts/lncsvy32_file_00000000d5747208b87d364cb4d9015a%20%284%29.png',
    label: 'Confirm Booking',
    sub: 'Your appointment is booked!',
  },
];

const DiaGynTutorial = ({ open, onClose }) => {
  const [slide, setSlide] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [revealing, setRevealing] = useState(true);

  useEffect(() => {
    if (!open) { setSlide(0); setPlaying(false); return; }
    setPlaying(true);
    setRevealing(true);
  }, [open]);

  useEffect(() => {
    if (!playing) return;
    setRevealing(true);
    const revealTimer = setTimeout(() => setRevealing(false), 600);
    const slideTimer = setTimeout(() => {
      if (slide < 2) setSlide(s => s + 1);
      else setPlaying(false);
    }, 2800);
    return () => { clearTimeout(revealTimer); clearTimeout(slideTimer); };
  }, [slide, playing]);

  const replay = useCallback(() => { setSlide(0); setPlaying(true); setRevealing(true); }, []);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" data-testid="diagyn-tutorial">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[92vw] max-w-sm rounded-2xl overflow-hidden" style={{ background: BG, border: `1px solid ${CYAN}18`, boxShadow: `0 0 40px ${CYAN}08, inset 0 1px 0 ${CYAN}10` }}>
        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: `${CYAN}10`, backdropFilter: 'blur(8px)' }} data-testid="diagyn-tutorial-close">
          <X className="w-4 h-4 text-white/40" />
        </button>

        {/* Title */}
        <div className="px-5 pt-3 pb-0">
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: `${CYAN}90` }}>How to Book</p>
        </div>

        {/* Frosted Reveal Slide Viewport */}
        <div className="relative px-5 pb-2" style={{ height: 280 }}>
          {/* Ambient glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full transition-all duration-700" style={{
              width: 300, height: 300,
              background: `radial-gradient(circle, ${CYAN}12 0%, ${CYAN}05 40%, transparent 70%)`,
              filter: 'blur(50px)',
              opacity: revealing ? 0.3 : 0.8,
            }} />
          </div>

          {/* Image with Frosted Reveal effect */}
          <div key={slide} className="relative w-full h-full flex items-center justify-center">
            {/* The image */}
            <div className="w-60 h-60 rounded-2xl overflow-hidden relative" style={{ animation: 'dgSlideIn 0.5s ease-out both' }}>
              <img
                src={SLIDES[slide].image}
                alt={SLIDES[slide].label}
                className="w-full h-full object-cover scale-110"
              />
              {/* Frosted glass overlay that fades away */}
              <div
                className="absolute inset-0 rounded-2xl transition-all pointer-events-none"
                style={{
                  backdropFilter: revealing ? 'blur(20px)' : 'blur(0px)',
                  WebkitBackdropFilter: revealing ? 'blur(20px)' : 'blur(0px)',
                  background: revealing ? `linear-gradient(135deg, ${CYAN}15, rgba(255,255,255,0.05))` : 'transparent',
                  border: revealing ? `1px solid ${CYAN}20` : '1px solid transparent',
                  transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
              {/* Shimmer sweep during reveal */}
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
                style={{ opacity: revealing ? 1 : 0, transition: 'opacity 0.3s ease' }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0, left: '-100%',
                  width: '100%', height: '100%',
                  background: `linear-gradient(90deg, transparent 0%, ${CYAN}12 50%, transparent 100%)`,
                  animation: revealing ? 'dgSweep 0.8s ease-out forwards' : 'none',
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Label + step dots */}
        <div className="px-5 pb-5">
          <p className="text-white/90 text-sm font-bold text-center mb-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>{SLIDES[slide].label}</p>
          <p className="text-white/30 text-[11px] text-center mb-4">{SLIDES[slide].sub}</p>
          <div className="flex items-center justify-center gap-2">
            {[0,1,2].map(i => (
              <button key={i} onClick={() => { setSlide(i); setPlaying(false); setRevealing(true); setTimeout(() => setRevealing(false), 600); }} className="transition-all" data-testid={`diagyn-tutorial-dot-${i}`}>
                <div className="rounded-full transition-all" style={{
                  width: slide === i ? 20 : 6, height: 6,
                  background: slide === i ? CYAN : `${CYAN}30`,
                  boxShadow: slide === i ? `0 0 10px ${CYAN}50` : 'none',
                }} />
              </button>
            ))}
            {/* Replay */}
            {!playing && slide === 2 && (
              <button onClick={replay} className="ml-3 flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full active:scale-95 transition-all" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30`, backdropFilter: 'blur(4px)' }} data-testid="diagyn-tutorial-replay">
                <Play className="w-3 h-3" /> Replay
              </button>
            )}
          </div>
        </div>

        <style>{`
          @keyframes dgSlideIn { 0% { opacity:0; transform:scale(0.92) translateY(8px); } 100% { opacity:1; transform:scale(1) translateY(0); } }
          @keyframes dgSweep { 0% { left:-100%; } 100% { left:100%; } }
        `}</style>
      </div>
    </div>,
    document.body
  );
};

export default DiaGynTutorial;
