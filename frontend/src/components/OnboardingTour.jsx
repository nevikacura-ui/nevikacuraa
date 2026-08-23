import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Sparkles, CheckCircle2, Calendar, Pill, FileText } from 'lucide-react';

const HAPTIC = (pattern = [12]) => {
  try { navigator.vibrate?.(pattern); } catch {}
};

const IMAGES = {
  verify: '/icons/onboard-otp.png',
  booking: '/icons/onboard-booking.png',
  curapay: '/icons/curapay-transparent.png',
};

/* ── Animated OTP Verification Mini ── */
const VerifyAnim = ({ active }) => {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) { setPhase(0); return; }
    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => { setPhase(2); HAPTIC([8, 30, 8]); }, 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  return (
    <div className="flex items-center gap-1.5 mt-2">
      {[0,1,2,3,4,5].map(i => (
        <div key={i} className="w-7 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300"
          style={{
            background: phase >= 2 ? 'rgba(124,58,237,0.12)' : phase >= 1 ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.03)',
            border: `1.5px solid ${phase >= 2 ? '#7C3AED' : phase >= 1 ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)'}`,
            color: phase >= 2 ? '#7C3AED' : 'rgba(0,0,0,0.4)',
            transitionDelay: `${i * 60}ms`,
            transform: phase >= 1 ? 'scale(1)' : 'scale(0.9)',
          }}>
          {phase >= 1 && ['4','7','2','9','1','8'][i]}
        </div>
      ))}
      {phase >= 2 && (
        <CheckCircle2 className="w-5 h-5 text-purple-400 ml-1" style={{ animation: 'ob-pop 0.3s ease-out' }} />
      )}
    </div>
  );
};

/* ── Animated Booking Card Mini ── */
const BookingAnim = ({ active }) => {
  const [show, setShow] = useState(0);
  useEffect(() => {
    if (!active) { setShow(0); return; }
    const t1 = setTimeout(() => setShow(1), 500);
    const t2 = setTimeout(() => { setShow(2); HAPTIC([8, 30, 8]); }, 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  return (
    <div className="mt-2 space-y-1.5 w-full max-w-[220px]">
      {[
        { icon: Calendar, text: 'Dr. Vikas — 10:00 AM', color: '#FB923C' },
        { icon: Pill, text: 'Paracetamol 500mg x2', color: '#FBBF24' },
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-400"
          style={{
            background: 'rgba(0,0,0,0.03)',
            border: '1px solid rgba(0,0,0,0.06)',
            opacity: show > i ? 1 : 0,
            transform: show > i ? 'translateX(0)' : 'translateX(16px)',
            transitionDelay: `${i * 200}ms`,
          }}>
          <item.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: item.color }} />
          <span className="text-[10px] font-medium text-gray-600">{item.text}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Animated Invoice Generation ── */
const InvoiceAnim = ({ active }) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) { setStep(0); return; }
    const t1 = setTimeout(() => setStep(1), 400);
    const t2 = setTimeout(() => setStep(2), 1000);
    const t3 = setTimeout(() => { setStep(3); HAPTIC([8, 20, 8, 20, 12]); }, 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [active]);

  const items = [
    { name: 'Consultation', amt: '500' },
    { name: 'CBC + Thyroid', amt: '850' },
    { name: 'Paracetamol x2', amt: '50' },
  ];

  return (
    <div className="mt-2 w-full max-w-[240px] rounded-2xl overflow-hidden transition-all duration-500"
      style={{
        background: 'rgba(255,255,255,0.8)',
        border: '1px solid rgba(0,0,0,0.06)',
        backdropFilter: 'blur(8px)',
        opacity: step >= 1 ? 1 : 0,
        transform: step >= 1 ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.95)',
      }}>
      <div className="px-3.5 py-2 border-b border-gray-100">
        <p className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">Invoice #INV-2847</p>
      </div>
      <div className="px-3.5 py-1.5 space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between transition-all duration-300"
            style={{
              opacity: step >= 2 ? 1 : 0,
              transitionDelay: `${i * 120}ms`,
            }}>
            <span className="text-[9px] text-gray-500">{item.name}</span>
            <span className="text-[9px] font-bold text-gray-700">&#8377;{item.amt}</span>
          </div>
        ))}
      </div>
      {step >= 3 && (
        <div className="px-3.5 py-2 flex items-center justify-between border-t border-gray-100">
          <span className="text-[10px] font-bold text-gray-900">&#8377;1,400</span>
          <span className="text-[8px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full"
            style={{ animation: 'ob-pop 0.3s ease-out' }}>PAID</span>
        </div>
      )}
    </div>
  );
};

const SLIDES = [
  {
    image: IMAGES.verify,
    title: 'Instant Verification',
    desc: 'Secure OTP login via SMS & Email. Quick, safe, and verified in seconds.',
    accent: '#7C3AED',
    btnGradient: 'linear-gradient(135deg, #7C3AED, #A78BFA, #C4B5FD)',
    Animation: VerifyAnim,
    orbColors: ['rgba(139,92,246,0.12)', 'rgba(192,132,252,0.08)'],
    bgGradient: 'linear-gradient(155deg, #F5F3FF 0%, #EDE9FE 30%, #DDD6FE 55%, #EDE9FE 80%, #F5F3FF 100%)',
    dark: false,
  },
  {
    image: IMAGES.booking,
    title: 'Easy Booking',
    desc: 'Book appointments, order medicines & schedule lab tests — all in a few taps.',
    accent: '#EA580C',
    btnGradient: 'linear-gradient(135deg, #EA580C, #FB923C, #FDBA74)',
    Animation: BookingAnim,
    orbColors: ['rgba(251,146,60,0.12)', 'rgba(249,115,22,0.08)'],
    bgGradient: 'linear-gradient(155deg, #FFF7ED 0%, #FFEDD5 30%, #FED7AA 55%, #FFEDD5 80%, #FFF7ED 100%)',
    dark: false,
  },
  {
    image: IMAGES.curapay,
    title: 'Digital Payment',
    desc: 'Pay for consultations, pharmacy & labs with CuraPay. Fast, secure & rewarding.',
    accent: '#0D9488',
    btnGradient: 'linear-gradient(135deg, #0D9488, #2DD4BF, #5EEAD4)',
    Animation: InvoiceAnim,
    orbColors: ['rgba(20,184,166,0.12)', 'rgba(45,212,191,0.08)'],
    bgGradient: 'linear-gradient(155deg, #F0FDFA 0%, #CCFBF1 30%, #99F6E4 55%, #CCFBF1 80%, #F0FDFA 100%)',
    badge: 'Powered by CuraPay',
    dark: false,
  },
];

const OnboardingTour = ({ onComplete }) => {
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState('enter');
  const [mounted, setMounted] = useState(false);
  const touchRef = useRef(null);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  useEffect(() => {
    SLIDES.forEach(s => { const img = new Image(); img.src = s.image; });
  }, []);

  const goNext = () => {
    if (current >= SLIDES.length - 1) {
      HAPTIC([8, 30, 12]);
      localStorage.setItem('onboarding_done', '1');
      onComplete();
      return;
    }
    HAPTIC([8]);
    setDir('exit');
    setTimeout(() => {
      setCurrent(c => c + 1);
      setDir('enter');
    }, 280);
  };

  const handleTouchStart = (e) => { touchRef.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (!touchRef.current) return;
    if (touchRef.current - e.changedTouches[0].clientX > 60) goNext();
    touchRef.current = null;
  };

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <div
      className={`fixed inset-0 z-[10000] flex flex-col transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: slide.bgGradient }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-testid="onboarding-tour"
    >
      <style>{`
        @keyframes ob-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes ob-pop { 0%{opacity:0;transform:scale(0)} 60%{transform:scale(1.15)} 100%{opacity:1;transform:scale(1)} }
        @keyframes ob-orb-move { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(15px,-10px) scale(1.1)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes ob-slide-in { from{opacity:0;transform:translateX(50px)} to{opacity:1;transform:translateX(0)} }
        @keyframes ob-slide-out { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(-50px)} }
        @keyframes ob-text-up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ob-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      `}</style>

      {/* Soft floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {slide.orbColors.map((color, i) => (
          <div key={`${current}-${i}`} className="absolute rounded-full"
            style={{
              width: `${160 + i * 80}px`, height: `${160 + i * 80}px`,
              background: `radial-gradient(circle, ${color}, transparent 70%)`,
              top: i === 0 ? '5%' : '55%',
              left: i === 0 ? '55%' : '-8%',
              animation: `ob-orb-move ${7 + i * 3}s ease-in-out infinite`,
            }} />
        ))}
        {/* Water shimmer line */}
        <div className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
            backgroundSize: '200% 100%',
            animation: 'ob-shimmer 3s ease-in-out infinite',
          }} />
      </div>

      {/* Image — top area */}
      <div className="flex-shrink-0 flex items-center justify-center px-6 pt-12 pb-2"
        style={{
          height: '42%',
          animation: dir === 'enter' ? 'ob-slide-in 0.4s cubic-bezier(0.22,1,0.36,1)' : 'ob-slide-out 0.25s ease-in forwards',
        }}>
        <img src={slide.image} alt={slide.title}
          className="max-h-full w-auto object-contain"
          style={{
            maxWidth: current === 2 ? '55%' : '75%',
            animation: 'ob-float 4.5s ease-in-out infinite',
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.06))',
          }} />
      </div>

      {/* Glass card with animation + text */}
      <div className="flex-1 px-4 pb-20 flex flex-col">
        <div className="flex-1 rounded-3xl flex flex-col p-5"
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(20px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
          }}>

          {/* Animated content area */}
          <div className="flex items-center justify-center mb-3"
            style={{ animation: dir === 'enter' ? 'ob-text-up 0.35s ease-out 0.2s both' : undefined }}>
            <slide.Animation active={mounted && dir === 'enter'} />
          </div>

          {/* Badge for CuraPay */}
          {slide.badge && (
            <div className="flex justify-center mb-2">
              <span className="text-[9px] font-bold px-3 py-1 rounded-full"
                style={{ color: slide.accent, background: `${slide.accent}15`, border: `1px solid ${slide.accent}25` }}>
                {slide.badge}
              </span>
            </div>
          )}

          {/* Dots */}
          <div className="flex justify-center gap-2 mb-3">
            {SLIDES.map((_, i) => (
              <div key={i} className="h-[4px] rounded-full transition-all duration-400"
                style={{
                  width: i === current ? '24px' : '6px',
                  background: i === current ? slide.accent : 'rgba(0,0,0,0.1)',
                }} />
            ))}
          </div>

          {/* Title & desc */}
          <div className="text-center mb-3"
            style={{ animation: dir === 'enter' ? 'ob-text-up 0.4s ease-out 0.15s both' : undefined }}>
            <h2 className="text-xl font-bold text-gray-900 mb-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {slide.title}
            </h2>
            <p className="text-[13px] text-gray-500 leading-relaxed max-w-xs mx-auto">{slide.desc}</p>
          </div>

          {/* CTA */}
          <button onClick={goNext}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            style={{ background: slide.btnGradient, boxShadow: `0 6px 20px ${slide.accent}30` }}
            data-testid="onboarding-next">
            {isLast ? <><Sparkles className="w-4 h-4" /> Get Started</> : <>Next <ChevronRight className="w-4 h-4" /></>}
          </button>

          <p className="text-center text-[10px] text-gray-400 mt-2 font-medium">{current + 1} of {SLIDES.length}</p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
