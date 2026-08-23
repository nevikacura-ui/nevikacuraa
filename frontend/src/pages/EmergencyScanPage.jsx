import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, Phone, Droplets, AlertTriangle, Pill, Shield, Stethoscope, Activity, ChevronDown, ChevronUp, User } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function EmergencyScanPage() {
  const { cardId } = useParams();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const mode = showFull ? 'full' : 'critical';
        const res = await axios.get(`${API_URL}/api/emergency-card/scan/${cardId}?mode=${mode}`);
        if (res.data.success) setCard(res.data.card);
      } catch (err) {
        setError(err.response?.status === 404 ? 'Emergency card not found' : 'Failed to load card');
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [cardId, showFull]);

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-red-200 border-t-red-500 rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-sm mt-3">Loading emergency card...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="text-center">
        <Heart className="w-12 h-12 text-red-200 mx-auto mb-3" />
        <p className="text-gray-800 font-bold">{error}</p>
        <p className="text-gray-400 text-sm mt-1">This QR code may be invalid or expired.</p>
      </div>
    </div>
  );

  const allAllergies = [
    ...(card?.allergies?.drug || []),
    ...(card?.allergies?.food || []),
    ...(card?.allergies?.other || []),
    // Backward compat: if allergies is an array
    ...(Array.isArray(card?.allergies) ? card.allergies : []),
  ];

  const medications = (card?.current_medications || []).map(m => 
    typeof m === 'string' ? m : `${m.name}${m.dose ? ` (${m.dose})` : ''}${m.frequency ? ` — ${m.frequency}` : ''}`
  );

  return (
    <div className="min-h-screen bg-white" data-testid="emergency-scan-page">
      {/* Red Emergency Banner */}
      <div className="bg-red-600 text-white py-4 px-5" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70">Emergency Health Card</p>
            <p className="text-xl font-bold font-heading">{card?.full_name || card?.name || 'Patient'}</p>
          </div>
        </div>
      </div>

      {/* Critical Info Grid */}
      <div className="grid grid-cols-3 border-b border-gray-100">
        <CriticalCell icon={<Droplets className="w-4 h-4 text-red-500" />} label="Blood Group" value={card?.blood_group || '—'} highlight />
        <CriticalCell icon={<User className="w-4 h-4 text-gray-400" />} label="Age" value={card?.age ? `${card.age} yrs` : '—'} />
        <CriticalCell icon={<User className="w-4 h-4 text-gray-400" />} label="Gender" value={card?.gender || '—'} />
      </div>

      <div className="p-5 space-y-5">
        {/* Allergies — CRITICAL HIGHLIGHT */}
        {allAllergies.length > 0 && (
          <div className="rounded-xl p-4 bg-red-50 border border-red-100" data-testid="scan-allergies">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Allergies</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allAllergies.map((a, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-sm font-semibold">{a}</span>
              ))}
            </div>
          </div>
        )}

        {/* Current Medications */}
        {medications.length > 0 && (
          <ScanSection icon={<Pill className="w-4 h-4 text-blue-500" />} title="Current Medications" color="blue">
            {medications.map((m, i) => (
              <p key={i} className="text-sm text-gray-700 py-1 border-b border-gray-50 last:border-0">{m}</p>
            ))}
          </ScanSection>
        )}

        {/* Chronic Conditions */}
        {(card?.chronic_conditions || []).length > 0 && (
          <ScanSection icon={<Activity className="w-4 h-4 text-purple-500" />} title="Medical Conditions" color="purple">
            <div className="flex flex-wrap gap-1.5">
              {card.chronic_conditions.map((c, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-sm font-medium">{c}</span>
              ))}
            </div>
          </ScanSection>
        )}

        {/* Implant Devices */}
        {(card?.implant_devices || []).length > 0 && (
          <ScanSection icon={<Shield className="w-4 h-4 text-amber-500" />} title="Implant Devices" color="amber">
            <div className="flex flex-wrap gap-1.5">
              {card.implant_devices.map((d, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium">{d}</span>
              ))}
            </div>
          </ScanSection>
        )}

        {/* Special Instructions */}
        {card?.special_instructions && (
          <div className="rounded-xl p-4 bg-yellow-50 border border-yellow-100">
            <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider mb-1">Special Instructions</p>
            <p className="text-sm text-yellow-800">{card.special_instructions}</p>
          </div>
        )}

        {/* Emergency Contacts — Click to Call */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Emergency Contacts</p>
          {card?.emergency_contact?.phone && (
            <a href={`tel:${card.emergency_contact.phone}`} className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-100 active:scale-[0.98] transition-transform" data-testid="scan-call-emergency">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{card.emergency_contact.name || 'Emergency Contact'}</p>
                <p className="text-xs text-gray-400">{card.emergency_contact.relation} — {card.emergency_contact.phone}</p>
              </div>
              <span className="ml-auto text-xs font-bold text-green-600">CALL</span>
            </a>
          )}
          {card?.secondary_contact?.phone && (
            <a href={`tel:${card.secondary_contact.phone}`} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 active:scale-[0.98] transition-transform">
              <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{card.secondary_contact.name || 'Secondary Contact'}</p>
                <p className="text-xs text-gray-400">{card.secondary_contact.relation} — {card.secondary_contact.phone}</p>
              </div>
              <span className="ml-auto text-xs font-bold text-gray-500">CALL</span>
            </a>
          )}
          {card?.treating_doctor?.phone && (
            <a href={`tel:${card.treating_doctor.phone}`} className="flex items-center gap-3 p-3 rounded-xl bg-teal-50 border border-teal-100 active:scale-[0.98] transition-transform" data-testid="scan-call-doctor">
              <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{card.treating_doctor.name}</p>
                <p className="text-xs text-gray-400">{card.treating_doctor.clinic} — {card.treating_doctor.phone}</p>
              </div>
              <span className="ml-auto text-xs font-bold text-teal-600">CALL</span>
            </a>
          )}
        </div>

        {/* Toggle Full/Critical */}
        <button onClick={() => setShowFull(!showFull)} className="w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 flex items-center justify-center gap-2 active:bg-gray-50" data-testid="scan-toggle-view">
          {showFull ? <><ChevronUp className="w-4 h-4" /> Show Critical Only</> : <><ChevronDown className="w-4 h-4" /> Show Full Details</>}
        </button>

        {/* Full details extras */}
        {showFull && card?.previous_surgeries?.length > 0 && (
          <ScanSection icon={<Activity className="w-4 h-4 text-gray-400" />} title="Previous Surgeries" color="gray">
            {card.previous_surgeries.map((s, i) => <p key={i} className="text-sm text-gray-700 py-1">{s}</p>)}
          </ScanSection>
        )}

        <p className="text-center text-[10px] text-gray-300 pt-4">Powered by Nevika Cura</p>
      </div>
    </div>
  );
}

function CriticalCell({ icon, label, value, highlight }) {
  return (
    <div className={`p-4 text-center ${highlight ? 'bg-red-50' : ''}`}>
      <div className="flex items-center justify-center gap-1 mb-1">{icon}<span className="text-[9px] text-gray-400 uppercase">{label}</span></div>
      <p className={`text-lg font-bold ${highlight ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

function ScanSection({ icon, title, color, children }) {
  const bgMap = { blue: 'bg-blue-50', purple: 'bg-purple-50', amber: 'bg-amber-50', gray: 'bg-gray-50' };
  return (
    <div className={`rounded-xl p-4 ${bgMap[color] || 'bg-gray-50'}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</p></div>
      {children}
    </div>
  );
}
