import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Stethoscope, Pill, FlaskConical, X } from 'lucide-react';

const PORTALS = [
  { id: 'diagyn', path: '/diagyn-staff', label: 'DiaGyn', icon: Stethoscope, color: '#0D9488', gradient: 'linear-gradient(135deg, #0D9488, #14B8A6)' },
  { id: 'orange', path: '/pharmacy-staff', label: 'Orange', icon: Pill, color: '#F97316', gradient: 'linear-gradient(135deg, #F97316, #EA580C)' },
  { id: 'mango', path: '/mango-staff', label: 'Mango', icon: FlaskConical, color: '#22C55E', gradient: 'linear-gradient(135deg, #22C55E, #16A34A)' },
];

const PortalSwitcher = ({ currentPortal, iconColor = '#94A3B8', compact = false }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const otherPortals = PORTALS.filter(p => p.id !== currentPortal);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl transition-all active:scale-90"
        style={{ background: open ? 'rgba(255,255,255,0.15)' : 'transparent' }}
        data-testid="portal-switcher-btn"
        title="Switch Portal"
      >
        <ArrowLeftRight className="w-4 h-4" style={{ color: iconColor }} />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 rounded-2xl overflow-hidden shadow-2xl z-[100]"
          style={{
            background: 'rgba(15,15,15,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            minWidth: 180,
            animation: 'portalSwitchFade 0.2s ease-out',
          }}
        >
          <style>{`@keyframes portalSwitchFade { from { opacity:0; transform: translateY(-8px) scale(0.95); } to { opacity:1; transform: translateY(0) scale(1); } }`}</style>
          <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Switch Portal</p>
          </div>
          {otherPortals.map(portal => (
            <button
              key={portal.id}
              onClick={() => { setOpen(false); navigate(portal.path); }}
              className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/5 transition-colors"
              data-testid={`switch-to-${portal.id}`}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: portal.gradient }}>
                <portal.icon className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">{portal.label}</p>
                <p className="text-[10px] text-white/40">Staff Portal</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalSwitcher;
