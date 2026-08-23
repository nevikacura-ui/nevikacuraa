import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, MapPin, AlertTriangle, Loader2, Shield, Heart, Ambulance,
  PhoneCall, Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ServiceHeader from '@/components/ServiceHeader';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const EMERGENCY_TYPES = [
  { id: 'cardiac', label: 'Cardiac', color: '#EF4444', desc: 'Heart attack / Chest pain' },
  { id: 'accident', label: 'Accident', color: '#F97316', desc: 'Injury / Trauma' },
  { id: 'breathing', label: 'Breathing', color: '#3B82F6', desc: 'Difficulty breathing' },
  { id: 'general', label: 'General', color: '#A78BFA', desc: 'Other emergency' },
];

const EmergencySOSPage = () => {
  const navigate = useNavigate();
  const phone = localStorage.getItem('guestMobile') || localStorage.getItem('userPhone') || '';
  const [contacts, setContacts] = useState([]);
  const [location, setLocation] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [selectedType, setSelectedType] = useState('general');

  useEffect(() => {
    fetch(`${API}/api/emergency/contacts`)
      .then(r => r.json())
      .then(d => setContacts(d.contacts || []))
      .catch(() => {});

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const triggerSOS = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API}/api/emergency/sos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone, name: localStorage.getItem('userName') || 'User',
          latitude: location?.lat, longitude: location?.lng,
          emergency_type: selectedType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        toast.success('SOS sent! Emergency contacts notified.');
      }
    } catch { toast.error('SOS failed. Call 102 directly.'); }
    setSending(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#0a0b14]" data-testid="sos-sent">
        <ServiceHeader />
        <main className="max-w-lg mx-auto px-4 py-8 pb-28 text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-5 animate-pulse">
            <Shield className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">SOS Activated</h2>
          <p className="text-sm text-white/40 mb-6">Emergency services have been alerted</p>

          {location && (
            <a href={`https://maps.google.com/?q=${location.lat},${location.lng}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-sm text-white/60 mb-4" data-testid="location-link">
              <Navigation className="w-4 h-4 text-teal-400" /> Your Location Shared
            </a>
          )}

          <div className="space-y-2 mt-4">
            {contacts.map((c, i) => (
              <a key={i} href={`tel:${c.number}`} className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/15 active:scale-[0.97] transition-all" data-testid={`call-${c.type}`}>
                <PhoneCall className="w-5 h-5 text-red-400" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-white">{c.name}</p>
                  <p className="text-xs text-white/40">{c.number}</p>
                </div>
                <Phone className="w-5 h-5 text-red-400" />
              </a>
            ))}
          </div>

          <Button onClick={() => { setSent(false); setSelectedType('general'); }} variant="outline" className="mt-6 rounded-xl border-white/10 text-white/50 bg-transparent hover:bg-white/5" data-testid="reset-sos">
            Return
          </Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b14]" data-testid="emergency-page">
      <ServiceHeader />
      <main className="max-w-lg mx-auto px-4 py-5 pb-28">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5" data-testid="sos-back">
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-red-400" style={{ fontFamily: 'Outfit, sans-serif' }}>Emergency SOS</h1>
            <p className="text-xs text-white/40">One-tap emergency help</p>
          </div>
        </div>

        {/* Emergency Type Selection */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {EMERGENCY_TYPES.map(t => (
            <button key={t.id} onClick={() => setSelectedType(t.id)}
              className={`p-4 rounded-2xl text-left transition-all active:scale-[0.96] ${selectedType === t.id ? 'scale-[1.02]' : ''}`}
              style={{ background: selectedType === t.id ? `${t.color}20` : 'rgba(255,255,255,0.03)', border: `1px solid ${selectedType === t.id ? `${t.color}40` : 'rgba(255,255,255,0.05)'}` }}
              data-testid={`type-${t.id}`}>
              <AlertTriangle className="w-6 h-6 mb-2" style={{ color: t.color }} />
              <p className="text-sm font-bold text-white">{t.label}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>

        {/* Location Status */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 mb-6">
          <MapPin className={`w-4 h-4 ${location ? 'text-green-400' : 'text-white/20'}`} />
          <p className="text-xs text-white/50">{location ? 'Location detected' : 'Getting location...'}</p>
        </div>

        {/* SOS Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={triggerSOS}
            disabled={sending}
            className="w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all active:scale-95 shadow-[0_0_60px_rgba(239,68,68,0.3)]"
            style={{ background: 'linear-gradient(145deg, #EF4444, #DC2626)' }}
            data-testid="sos-btn">
            {sending ? (
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            ) : (
              <>
                <Shield className="w-12 h-12 text-white mb-1" />
                <span className="text-xl font-black text-white">SOS</span>
              </>
            )}
          </button>
        </div>
        <p className="text-center text-xs text-white/30 mb-6">Press the button to alert emergency services</p>

        {/* Quick Call Contacts */}
        <div>
          <p className="text-xs text-white/40 font-semibold mb-2">QUICK CALL</p>
          <div className="space-y-2">
            {contacts.map((c, i) => (
              <a key={i} href={`tel:${c.number}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 active:scale-[0.97] transition-all" data-testid={`contact-${c.type}`}>
                <Phone className="w-4 h-4 text-red-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <p className="text-[10px] text-white/30">{c.number}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default EmergencySOSPage;
