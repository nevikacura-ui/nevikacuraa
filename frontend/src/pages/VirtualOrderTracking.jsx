import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Package, Truck, MapPin, CheckCircle2, Clock, Phone, MessageCircle } from 'lucide-react';
import ServiceHeader from '@/components/ServiceHeader';
import BottomNav from '@/components/BottomNav';

const TRACKING_STAGES = [
  { key: 'confirmed', label: 'Order Confirmed', desc: 'Your order has been received', icon: CheckCircle2, color: '#10B981' },
  { key: 'packed', label: 'Packed', desc: 'Items packed & quality checked', icon: Package, color: '#3B82F6' },
  { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Rider is on the way', icon: Truck, color: '#F59E0B' },
  { key: 'nearby', label: 'Almost There', desc: 'Rider is near your location', icon: MapPin, color: '#8B5CF6' },
  { key: 'delivered', label: 'Delivered', desc: 'Order delivered successfully!', icon: CheckCircle2, color: '#10B981' },
];

const VirtualOrderTracking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('id') || 'ORD-DEMO';
  const [activeStage, setActiveStage] = useState(0);
  const [animating, setAnimating] = useState(false);

  // Demo: auto-advance stages for showcase
  useEffect(() => {
    const demoPace = searchParams.get('demo');
    if (!demoPace) return;

    const interval = setInterval(() => {
      setActiveStage(prev => {
        if (prev >= TRACKING_STAGES.length - 1) { clearInterval(interval); return prev; }
        setAnimating(true);
        setTimeout(() => setAnimating(false), 600);
        return prev + 1;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [searchParams]);

  const currentStage = TRACKING_STAGES[activeStage];

  return (
    <div className="min-h-screen" style={{ background: '#07070f' }} data-testid="order-tracking-page">
      <ServiceHeader />
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Track Order</h1>
            <p className="text-[11px] text-white/30 font-mono">#{orderId}</p>
          </div>
        </div>

        {/* Virtual Map Visualization */}
        <div className="rounded-2xl overflow-hidden mb-6 relative" style={{ height: 180, background: 'linear-gradient(135deg, #0D1B2A 0%, #1B2838 100%)', border: '1px solid rgba(255,255,255,0.06)' }} data-testid="virtual-map">
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full opacity-10">
            {[...Array(8)].map((_, i) => (<line key={`h${i}`} x1="0" y1={i * 25} x2="100%" y2={i * 25} stroke="white" strokeWidth="0.5" />))}
            {[...Array(12)].map((_, i) => (<line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="100%" stroke="white" strokeWidth="0.5" />))}
          </svg>

          {/* Route line */}
          <svg className="absolute inset-0 w-full h-full">
            <path d="M40,140 Q120,120 180,80 Q240,40 320,50 Q360,55 400,90" stroke="rgba(249,115,22,0.4)" strokeWidth="2" fill="none" strokeDasharray="6 4" />
            <path d={`M40,140 Q120,120 180,80 Q240,40 320,50 Q360,55 400,90`} stroke="#F97316" strokeWidth="2.5" fill="none"
              strokeDasharray={`${(activeStage / (TRACKING_STAGES.length - 1)) * 380} 400`} style={{ transition: 'stroke-dasharray 1s ease' }} />
          </svg>

          {/* Store marker */}
          <div className="absolute" style={{ left: 28, top: 128 }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#10B981', boxShadow: '0 0 12px rgba(16,185,129,0.5)' }}>
              <Package className="w-3 h-3 text-white" />
            </div>
            <p className="text-[8px] text-white/40 mt-1 font-medium">Pharmacy</p>
          </div>

          {/* Moving rider dot */}
          {activeStage > 0 && activeStage < TRACKING_STAGES.length - 1 && (
            <div className="absolute transition-all duration-1000 ease-in-out" style={{
              left: `${20 + (activeStage / (TRACKING_STAGES.length - 1)) * 75}%`,
              top: `${80 - (activeStage / (TRACKING_STAGES.length - 1)) * 40}%`,
            }}>
              <div className="relative">
                <div className="absolute -inset-3 rounded-full" style={{ background: 'rgba(249,115,22,0.2)', animation: 'trackPulse 1.5s ease infinite' }} />
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#F97316', boxShadow: '0 0 16px rgba(249,115,22,0.6)' }}>
                  <Truck className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </div>
          )}

          {/* Destination marker */}
          <div className="absolute" style={{ right: 20, top: 70 }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: activeStage >= 4 ? '#10B981' : '#6366F1', boxShadow: `0 0 12px ${activeStage >= 4 ? 'rgba(16,185,129,0.5)' : 'rgba(99,102,241,0.5)'}` }}>
              <MapPin className="w-3 h-3 text-white" />
            </div>
            <p className="text-[8px] text-white/40 mt-1 font-medium">Your Home</p>
          </div>

          {/* Status overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 p-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
            <currentStage.icon className="w-4 h-4 flex-shrink-0" style={{ color: currentStage.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-white">{currentStage.label}</p>
              <p className="text-[9px] text-white/40">{currentStage.desc}</p>
            </div>
            {activeStage > 0 && activeStage < 4 && (
              <div className="flex items-center gap-1 text-[10px] text-orange-400 font-medium">
                <Clock className="w-3 h-3" />
                ~{Math.max(5, 30 - activeStage * 10)} min
              </div>
            )}
          </div>
        </div>

        {/* Timeline Steps */}
        <div className="space-y-0" data-testid="tracking-timeline">
          {TRACKING_STAGES.map((stage, idx) => {
            const StageIcon = stage.icon;
            const isDone = idx <= activeStage;
            const isActive = idx === activeStage;
            const isLast = idx === TRACKING_STAGES.length - 1;

            return (
              <div key={stage.key} className="flex gap-3" data-testid={`tracking-stage-${stage.key}`}>
                {/* Vertical line + dot */}
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${isActive && animating ? 'scale-125' : ''}`} style={{
                    background: isDone ? stage.color : 'rgba(255,255,255,0.05)',
                    boxShadow: isActive ? `0 0 20px ${stage.color}40` : 'none',
                  }}>
                    <StageIcon className={`w-4 h-4 ${isDone ? 'text-white' : 'text-white/20'}`} />
                  </div>
                  {!isLast && (
                    <div className="w-0.5 h-12 my-1 rounded-full transition-all duration-700" style={{
                      background: idx < activeStage
                        ? `linear-gradient(180deg, ${stage.color}, ${TRACKING_STAGES[idx + 1].color})`
                        : 'rgba(255,255,255,0.06)',
                    }} />
                  )}
                </div>

                {/* Content */}
                <div className={`pb-5 ${isLast ? '' : ''}`}>
                  <p className={`text-sm font-semibold transition-colors ${isDone ? 'text-white' : 'text-white/30'}`}>{stage.label}</p>
                  <p className={`text-[11px] mt-0.5 ${isDone ? 'text-white/50' : 'text-white/15'}`}>{stage.desc}</p>
                  {isDone && idx < activeStage && (
                    <p className="text-[10px] text-green-400/60 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Completed
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Rider */}
        {activeStage >= 2 && activeStage < 4 && (
          <div className="rounded-2xl p-4 mt-4 flex items-center gap-3" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }} data-testid="contact-rider">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Delivery Partner</p>
              <p className="text-[11px] text-white/40">Your order is on the way</p>
            </div>
            <div className="flex gap-2">
              <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Phone className="w-4 h-4 text-green-400" />
              </button>
              <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <MessageCircle className="w-4 h-4 text-blue-400" />
              </button>
            </div>
          </div>
        )}

        {/* Delivered Success */}
        {activeStage >= 4 && (
          <div className="rounded-2xl p-5 mt-4 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }} data-testid="delivery-success">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
            <p className="text-white font-bold">Order Delivered!</p>
            <p className="text-xs text-white/40 mt-1">Thank you for ordering with Nevika Cura</p>
            <button onClick={() => navigate('/rate-visit')} className="mt-3 px-6 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
              Rate Your Experience
            </button>
          </div>
        )}
      </main>
      <BottomNav />

      <style>{`
        @keyframes trackPulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.5); opacity: 0; } }
      `}</style>
    </div>
  );
};

export default VirtualOrderTracking;
