import React, { useState, useEffect, useRef } from 'react';
import {
  X, FileText, FlaskConical, Droplet, Clock, CheckCircle2,
  Users, AlertCircle, Activity, Loader2, ShieldCheck
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

/* ─── Inline loader for data fetching (no video dependency) ─── */
const colorMap = {
  mango: '#166534',
  proton: '#166534',
  nexugene: '#7c3aed',
  orange: '#FF6B35',
  diagyn: '#06B6D4',
};

function SectionVideoLoader({ source }) {
  const color = colorMap[source] || '#166534';

  return (
    <div className="flex flex-col items-center justify-center py-16 relative overflow-hidden rounded-2xl mx-4" data-testid="section-video-loader">
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse at center, ${color}40 0%, #0A0A0F 100%)`
      }} />
      {/* Animated pulse rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-full" style={{
          width: 120, height: 120,
          border: `1px solid ${color}30`,
          animation: 'sectionPulse 2s ease-out infinite',
        }} />
        <div className="absolute rounded-full" style={{
          width: 120, height: 120,
          border: `1px solid ${color}20`,
          animation: 'sectionPulse 2s ease-out 0.6s infinite',
        }} />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
        <p className="text-white/80 text-sm font-medium">Generating AI insights...</p>
      </div>
      <style>{`
        @keyframes sectionPulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ─── Main Detail Sheet ─── */
export default function TestDetailSheet({ test, onClose, source = 'mango' }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!test?.name) return;
    setLoading(true);
    setError(null);
    setDetails(null);

    // Reset scroll position immediately
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    fetch(`${API}/api/tests/details/${encodeURIComponent(test.name)}?source=${source}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch');
        return r.json();
      })
      .then(data => {
        setDetails(data);
        setLoading(false);
        // Scroll to top after content renders
        requestAnimationFrame(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = 0;
        });
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [test?.name, source]);

  // Also scroll to top whenever details change
  useEffect(() => {
    if (details && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [details]);

  if (!test) return null;

  const themeColor = colorMap[source] || '#166534';

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col" data-testid="test-detail-sheet">
      <style>{`
        @keyframes glassSlideUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        @keyframes floatBubble { 0%,100% { transform:translateY(0) scale(1); } 50% { transform:translateY(-8px) scale(1.05); } }
        .glass-detail { animation: glassSlideUp .5s cubic-bezier(0.2,0.8,0.2,1) both; }
        .float-shape { animation: floatBubble 6s ease-in-out infinite; }
        .float-shape-2 { animation: floatBubble 8s ease-in-out 1s infinite; }
      `}</style>

      {/* Gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{
          background: `linear-gradient(165deg, ${themeColor} 0%, ${themeColor}CC 30%, #0A0A0F 100%)`
        }} />
        <div className="float-shape absolute top-16 left-6 w-36 h-36 rounded-full blur-[50px] opacity-30" style={{ background: themeColor }} />
        <div className="float-shape-2 absolute top-40 right-2 w-28 h-28 rounded-full blur-[40px] opacity-25" style={{ background: themeColor }} />
      </div>

      {/* Close button */}
      <div className="relative z-10 px-4 pt-5 pb-2 flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-2xl"
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
          data-testid="test-detail-close"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        {test.category && (
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-xl"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
          >{test.category}</span>
        )}
      </div>

      {/* Title on gradient */}
      <div className="relative z-10 px-6 pt-3 pb-6">
        <h1 className="text-white text-xl font-black leading-tight drop-shadow-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {test.name}
        </h1>
        {test.price > 0 && (
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-white/90 text-3xl font-black">{'\u20B9'}{test.price}</span>
          </div>
        )}
      </div>

      {/* Content card */}
      <div ref={scrollRef} className="glass-detail relative z-10 flex-1 rounded-t-[32px] overflow-y-auto"
        style={{
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderTop: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(0,0,0,0.1)' }} />
        </div>

        <div className="px-5 pt-3 pb-36">
          {loading ? (
            <SectionVideoLoader source={source} />
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Could not load details</p>
            </div>
          ) : details ? (
            <>
              {/* Description */}
              <div className="mb-5">
                <h3 className="text-[10px] font-bold text-slate-500/80 uppercase tracking-wider mb-2">About This Test</h3>
                <p className="text-slate-700/90 text-sm leading-relaxed">{details.description}</p>
              </div>

              {/* Diagnosis Use */}
              {details.diagnosis_use && (
                <div className="mb-5">
                  <h3 className="text-[10px] font-bold text-slate-500/80 uppercase tracking-wider mb-2">Diagnosis & Use</h3>
                  <p className="text-slate-700/90 text-sm leading-relaxed">{details.diagnosis_use}</p>
                </div>
              )}

              {/* Info cards */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <InfoCard icon={FileText} color={themeColor} label="Reports In" value={details.report_time || '24 Hrs'} />
                <InfoCard icon={FlaskConical} color="#ec4899" label="Parameters" value={details.parameters || 1} />
                <InfoCard icon={Clock} color="#f59e0b" label="Test Duration" value={details.estimated_time || '10 mins'} />
                <InfoCard icon={Activity} color="#06b6d4" label="Normal Range" value={details.normal_range ? 'See below' : 'Varies'} />
              </div>

              {/* Sample & Fasting chips */}
              <div className="flex flex-wrap gap-2 mb-5">
                <Chip icon={Droplet} color="#0ea5e9" text={details.sample_type || 'Blood'} />
                <Chip icon={Clock} color="#f59e0b" text={details.fasting || 'No fasting'} />
              </div>

              {/* Preparation */}
              {details.preparation && (
                <DetailSection title="Preparation Instructions" text={details.preparation} />
              )}

              {/* Who Should Test */}
              {details.who_should_test && (
                <DetailSection title="Who Should Get Tested" text={details.who_should_test} icon={Users} />
              )}

              {/* Normal Range */}
              {details.normal_range && (
                <DetailSection title="Normal Range" text={details.normal_range} icon={Activity} />
              )}

              {/* Risks */}
              {details.risks && (
                <DetailSection title="Risks & Comfort" text={details.risks} icon={ShieldCheck} />
              )}

              {/* Features list */}
              <div className="rounded-2xl p-5 mb-5 backdrop-blur-md"
                style={{ background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.6)' }}
              >
                <h3 className="text-[10px] font-bold text-slate-500/80 uppercase tracking-wider mb-3">Includes</h3>
                <div className="space-y-2.5">
                  {['Home Sample Collection', 'NABL Certified Labs', 'Free Report Consultation', 'Digital Report Delivery'].map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <span className="text-slate-600/90 text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Sticky bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 z-20 backdrop-blur-xl"
        style={{ background: 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(255,255,255,0.4)' }}
      >
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-full text-sm font-bold text-slate-500 active:scale-[0.98] transition-transform backdrop-blur-md"
            style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.06)' }}
            data-testid="test-detail-close-btn"
          >
            Close
          </button>
          <button
            onClick={() => {
              if (test.onAdd) test.onAdd();
              onClose();
            }}
            className="flex-1 py-4 rounded-full text-sm font-bold text-white active:scale-[0.98] transition-transform"
            style={{
              background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}CC 100%)`,
              boxShadow: `0 8px 24px ${themeColor}55`,
            }}
            data-testid="test-detail-add-btn"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */
function InfoCard({ icon: Icon, color, label, value }) {
  return (
    <div className="rounded-2xl p-4 backdrop-blur-md"
      style={{ background: `${color}0D`, border: `1px solid ${color}1A` }}
    >
      <Icon className="w-5 h-5 mb-2" style={{ color: `${color}CC` }} />
      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{label}</p>
      <p className="text-slate-800 font-bold text-base mt-0.5">{typeof value === 'number' ? value : value}</p>
    </div>
  );
}

function Chip({ icon: Icon, color, text }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl backdrop-blur-md"
      style={{ background: `${color}0D`, border: `1px solid ${color}1A` }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: `${color}CC` }} />
      <span className="text-slate-600 text-xs font-medium">{text}</span>
    </div>
  );
}

function DetailSection({ title, text, icon: Icon }) {
  return (
    <div className="rounded-2xl p-5 mb-5 backdrop-blur-md"
      style={{ background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.6)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        <h3 className="text-[10px] font-bold text-slate-500/80 uppercase tracking-wider">{title}</h3>
      </div>
      <p className="text-slate-700/90 text-sm leading-relaxed">{text}</p>
    </div>
  );
}
