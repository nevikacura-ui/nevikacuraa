import React from 'react';
import { Shield, FlaskConical, Award } from 'lucide-react';

/* Price Match Guarantee Badge — especially for Mango Labs */
export const PriceMatchBadge = ({ variant = 'mango' }) => {
  const isMango = variant === 'mango';
  const color = isMango ? '#10B981' : '#F97316';
  const label = isMango ? 'Lab Test Price Match' : 'Medicine Price Match';
  
  return (
    <div className="mx-4 my-2" data-testid="price-match-badge">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
        style={{
          background: `${color}08`,
          border: `1px solid ${color}20`,
        }}>
        <Shield className="w-5 h-5 flex-shrink-0" style={{ color }} />
        <div className="flex-1">
          <p className="text-xs font-bold text-stone-800">{label} Guarantee</p>
          <p className="text-[10px] text-stone-500">Found cheaper? We'll match it. No questions asked.</p>
        </div>
        <Award className="w-4 h-4 flex-shrink-0 text-amber-500" />
      </div>
    </div>
  );
};

/* Test Tube Fill-Up Loyalty — Mango Labs loyalty visualization */
export const TestTubeLoyalty = ({ currentPoints = 0, maxPoints = 500, rewardLabel = 'Free Basic Panel' }) => {
  const fillPercent = Math.min((currentPoints / maxPoints) * 100, 100);
  const isReady = fillPercent >= 100;
  
  return (
    <div className="mx-4 my-3" data-testid="test-tube-loyalty">
      <div className="p-3.5 rounded-xl" style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.06))',
        border: '1px solid rgba(16,185,129,0.15)',
      }}>
        <div className="flex items-center gap-3">
          {/* Test tube visualization */}
          <div className="relative flex-shrink-0" style={{ width: '28px', height: '64px' }}>
            {/* Tube cap */}
            <div style={{
              position: 'absolute', top: 0, left: '2px', right: '2px', height: '10px',
              borderRadius: '4px 4px 0 0',
              background: 'linear-gradient(180deg, #059669, #047857)',
            }} />
            {/* Tube body */}
            <div style={{
              position: 'absolute', top: '10px', left: '4px', right: '4px', bottom: '0',
              borderRadius: '0 0 10px 10px',
              background: 'rgba(200,230,220,0.3)',
              border: '1.5px solid rgba(16,185,129,0.25)',
              overflow: 'hidden',
            }}>
              {/* Liquid fill */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: `${fillPercent}%`,
                background: isReady
                  ? 'linear-gradient(0deg, #10B981, #34D399)'
                  : 'linear-gradient(0deg, #10B981, #6EE7B7)',
                borderRadius: '0 0 8px 8px',
                transition: 'height 1s ease-out',
              }} />
              {/* Bubbles */}
              {fillPercent > 20 && (
                <>
                  <div style={{ position: 'absolute', bottom: `${fillPercent * 0.3}%`, left: '25%', width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
                  <div style={{ position: 'absolute', bottom: `${fillPercent * 0.6}%`, right: '25%', width: '2px', height: '2px', borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
                </>
              )}
            </div>
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-emerald-700">{currentPoints}</span>
              <span className="text-[10px] text-stone-400">/ {maxPoints} pts</span>
            </div>
            <p className="text-[10px] text-stone-500 mt-0.5">
              {isReady ? `Claim your ${rewardLabel}!` : `${maxPoints - currentPoints} more points for ${rewardLabel}`}
            </p>
            <div className="mt-1.5 h-1.5 rounded-full bg-stone-100 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${fillPercent}%`,
                  background: isReady ? 'linear-gradient(90deg, #10B981, #34D399)' : 'linear-gradient(90deg, #6EE7B7, #10B981)',
                }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* DNA Strand Order Progress — Lab test order tracking */
export const DNAStrandProgress = ({ currentStep = 0, steps = ['Booked', 'Sample Collected', 'Processing', 'Report Ready'] }) => {
  return (
    <div className="py-4 px-2" data-testid="dna-strand-progress">
      <div className="relative flex justify-between items-center">
        {/* DNA backbone line */}
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2">
          <div className="h-full rounded-full bg-stone-200" />
          <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${(currentStep / (steps.length - 1)) * 100}%`,
              background: 'linear-gradient(90deg, #10B981, #059669)',
            }} />
        </div>
        {/* Helix nodes */}
        {steps.map((step, i) => {
          const done = i <= currentStep;
          const active = i === currentStep;
          return (
            <div key={i} className="relative flex flex-col items-center z-10" style={{ width: `${100 / steps.length}%` }}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${active ? 'scale-110' : ''}`}
                style={{
                  background: done
                    ? 'linear-gradient(135deg, #10B981, #059669)'
                    : '#F3F4F6',
                  boxShadow: active ? '0 0 12px rgba(16,185,129,0.4)' : 'none',
                  border: done ? 'none' : '2px solid #D1D5DB',
                }}>
                {done ? (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={i < currentStep ? "M5 13l4 4L19 7" : "M12 6v6m0 0v6m0-6h6m-6 0H6"} />
                  </svg>
                ) : (
                  <span className="text-[10px] text-stone-400 font-bold">{i + 1}</span>
                )}
              </div>
              <p className={`text-[9px] mt-1.5 text-center leading-tight ${done ? 'text-emerald-700 font-semibold' : 'text-stone-400'}`}>
                {step}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* Pill Journey Progress — Pharmacy order tracking */
export const PillJourneyProgress = ({ currentStep = 0, steps = ['Ordered', 'Verified', 'Packed', 'Delivering', 'Delivered'] }) => {
  return (
    <div className="py-4 px-2" data-testid="pill-journey-progress">
      <div className="relative flex justify-between items-center">
        {/* Line */}
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2">
          <div className="h-full rounded-full bg-orange-100" />
          <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${(currentStep / (steps.length - 1)) * 100}%`,
              background: 'linear-gradient(90deg, #F97316, #EA580C)',
            }} />
        </div>
        {/* Pill nodes */}
        {steps.map((step, i) => {
          const done = i <= currentStep;
          const active = i === currentStep;
          return (
            <div key={i} className="relative flex flex-col items-center z-10" style={{ width: `${100 / steps.length}%` }}>
              {/* Capsule/pill shape */}
              <div className={`w-7 h-7 flex items-center justify-center transition-all duration-500 ${active ? 'scale-110' : ''}`}
                style={{
                  borderRadius: '50%',
                  background: done
                    ? 'linear-gradient(135deg, #F97316, #EA580C)'
                    : '#FFF7ED',
                  boxShadow: active ? '0 0 12px rgba(249,115,22,0.4)' : 'none',
                  border: done ? 'none' : '2px solid #FED7AA',
                }}>
                {done ? (
                  <i className={`fa-solid ${i === steps.length - 1 ? 'fa-check' : 'fa-capsules'} text-[10px] text-white`} />
                ) : (
                  <span className="text-[9px] text-orange-300 font-bold">{i + 1}</span>
                )}
              </div>
              <p className={`text-[8px] mt-1 text-center leading-tight ${done ? 'text-orange-700 font-semibold' : 'text-stone-400'}`}>
                {step}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* Seasonal Campaign Banner */
export const SeasonalCampaignBanner = ({ 
  title = "Summer Wellness",
  subtitle = "Beat the heat with essential health checkups",
  color = "#10B981",
  icon = "fa-sun",
  onClick 
}) => (
  <div className="mx-4 my-2 cursor-pointer active:scale-[0.98] transition-transform" onClick={onClick} data-testid="seasonal-campaign-banner">
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl overflow-hidden relative"
      style={{
        background: `linear-gradient(135deg, ${color}15, ${color}08)`,
        border: `1px solid ${color}22`,
      }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 3px 10px ${color}40` }}>
        <i className={`fa-solid ${icon} text-white text-sm`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-stone-800">{title}</p>
        <p className="text-[10px] text-stone-500 truncate">{subtitle}</p>
      </div>
      <svg className="w-4 h-4 flex-shrink-0 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </div>
);
