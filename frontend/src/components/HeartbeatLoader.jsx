import React from 'react';

/* ECG-style heartbeat loading animation — brand-colored per service */
const HeartbeatLoader = ({ variant = 'default', text = 'Loading...' }) => {
  const colors = {
    pharmacy: { stroke: '#F97316', bg: 'rgba(249,115,22,0.08)' },
    labs: { stroke: '#10B981', bg: 'rgba(16,185,129,0.08)' },
    diagyn: { stroke: '#06B6D4', bg: 'rgba(6,182,212,0.08)' },
    default: { stroke: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  };
  const c = colors[variant] || colors.default;

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3" data-testid="heartbeat-loader">
      <div className="relative w-48 h-12 overflow-hidden rounded-xl" style={{ background: c.bg }}>
        <svg viewBox="0 0 200 50" className="w-full h-full" preserveAspectRatio="none">
          <style>{`
            @keyframes ecg-draw{0%{stroke-dashoffset:400}100%{stroke-dashoffset:0}}
          `}</style>
          <path
            d="M0 25 L30 25 L40 25 L50 10 L55 40 L60 5 L65 35 L70 25 L80 25 L200 25"
            fill="none"
            stroke={c.stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 400,
              animation: 'ecg-draw 1.5s linear infinite',
            }}
          />
        </svg>
      </div>
      <p className="text-xs font-medium text-stone-400">{text}</p>
    </div>
  );
};

export default HeartbeatLoader;
