import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, MapPin, X, AlertTriangle } from 'lucide-react';

const CLINIC_PHONE = '+919876543210';

const EmergencySOSFloat = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleWhatsApp = () => {
    let msg = 'EMERGENCY: I need immediate medical help.';
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          msg += ` My location: https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
          window.open(`https://wa.me/919876543210?text=${encodeURIComponent(msg)}`, '_blank');
        },
        () => window.open(`https://wa.me/919876543210?text=${encodeURIComponent(msg)}`, '_blank'),
        { enableHighAccuracy: true, timeout: 3000 }
      );
    } else {
      window.open(`https://wa.me/919876543210?text=${encodeURIComponent(msg)}`, '_blank');
    }
    setOpen(false);
  };

  return (
    <div className="fixed z-50" style={{ bottom: 90, right: 16 }} ref={ref}>
      {/* Action Menu */}
      {open && (
        <div className="absolute bottom-16 right-0 mb-2 rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: 'rgba(15,15,15,0.95)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(239,68,68,0.2)',
            minWidth: 220,
            animation: 'sosFadeUp 0.25s ease-out',
          }}>
          <style>{`@keyframes sosFadeUp { from { opacity:0; transform:translateY(8px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } } @keyframes sosPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 0 10px rgba(239,68,68,0); } }`}</style>

          <div className="px-4 py-2.5 border-b" style={{ borderColor: 'rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.08)' }}>
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> Emergency Actions
            </p>
          </div>

          <button onClick={() => { window.location.href = `tel:${CLINIC_PHONE}`; setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
            data-testid="sos-call-clinic">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
              <Phone className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">Call Clinic</p>
              <p className="text-[10px] text-white/40">Direct emergency line</p>
            </div>
          </button>

          <button onClick={handleWhatsApp}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
            data-testid="sos-whatsapp">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}>
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">WhatsApp SOS</p>
              <p className="text-[10px] text-white/40">Send with location</p>
            </div>
          </button>

          <button onClick={() => { navigate('/emergency-sos'); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
            data-testid="sos-full-page">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">Full Emergency</p>
              <p className="text-[10px] text-white/40">SOS with contacts & location</p>
            </div>
          </button>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90"
        style={{
          background: open ? 'rgba(239,68,68,0.9)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
          animation: open ? 'none' : 'sosPulse 2s ease-in-out infinite',
          boxShadow: '0 6px 24px rgba(239,68,68,0.4)',
        }}
        data-testid="emergency-sos-fab"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <AlertTriangle className="w-6 h-6 text-white" />}
      </button>
    </div>
  );
};

export default EmergencySOSFloat;
