import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { RefreshCw, Calendar, ChevronRight, CheckCircle2, Plus, Clock } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const CHRONIC_CONDITIONS = [
  { name: 'Diabetes', icon: '🩸', medicines: ['Metformin', 'Glimepiride', 'Januvia', 'Glucometer Strips'] },
  { name: 'Blood Pressure', icon: '❤️', medicines: ['Amlodipine', 'Telmisartan', 'Losartan', 'Atenolol'] },
  { name: 'Thyroid', icon: '🦋', medicines: ['Thyroxine', 'Eltroxin', 'Thyronorm'] },
  { name: 'Cholesterol', icon: '🫀', medicines: ['Atorvastatin', 'Rosuvastatin', 'Ecosprin'] },
  { name: 'Vitamins', icon: '💊', medicines: ['Shelcal', 'Limcee', 'Vitamin D3', 'B12'] },
];

const INTERVALS = [
  { label: 'Monthly', days: 30, badge: 'Popular' },
  { label: 'Bi-Monthly', days: 60, badge: null },
  { label: '3 Months', days: 90, badge: 'Best Value' },
];

const SubscriptionRefill = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [selectedInterval, setSelectedInterval] = useState(30);
  const [selectedMeds, setSelectedMeds] = useState([]);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const toggleMed = (med) => {
    setSelectedMeds(prev => prev.includes(med) ? prev.filter(m => m !== med) : [...prev, med]);
  };

  const handleSave = async () => {
    const phone = localStorage.getItem('guestMobile');
    if (!phone || !selectedMeds.length) return;

    setSaving(true);
    try {
      await axios.post(`${API}/pharmacy/subscription-refill`, {
        phone,
        medicines: selectedMeds,
        interval_days: selectedInterval,
        condition: selectedCondition?.name || 'General',
      });
      toast.success('Subscription created! We\'ll remind you before each refill.');
      onClose?.();
    } catch (e) {
      toast.error('Could not save subscription. Please try again.');
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" data-testid="subscription-refill-modal">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#111118] rounded-t-3xl max-h-[85vh] overflow-y-auto pb-8" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#111118] p-4 pb-3 border-b border-white/5">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Auto Refill</h2>
              <p className="text-[10px] text-white/30">Never run out of your regular medicines</p>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">
          {/* Step 1: Select condition */}
          {step === 1 && (
            <div data-testid="refill-step-1">
              <p className="text-xs text-white/50 font-medium mb-3">Select your health condition</p>
              <div className="space-y-2">
                {CHRONIC_CONDITIONS.map((condition) => (
                  <button
                    key={condition.name}
                    onClick={() => { setSelectedCondition(condition); setSelectedMeds(condition.medicines); setStep(2); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98]"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    data-testid={`condition-${condition.name.toLowerCase()}`}
                  >
                    <span className="text-xl">{condition.icon}</span>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-white">{condition.name}</p>
                      <p className="text-[10px] text-white/30">{condition.medicines.length} commonly prescribed medicines</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select medicines + interval */}
          {step === 2 && selectedCondition && (
            <div data-testid="refill-step-2">
              <button onClick={() => setStep(1)} className="text-[11px] text-white/30 mb-3 hover:text-white/50">&larr; Back</button>

              <p className="text-xs text-white/50 font-medium mb-2">Select medicines for {selectedCondition.name}</p>
              <div className="space-y-2 mb-5">
                {selectedCondition.medicines.map((med) => (
                  <button
                    key={med}
                    onClick={() => toggleMed(med)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedMeds.includes(med) ? '' : 'opacity-50'}`}
                    style={{
                      background: selectedMeds.includes(med) ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedMeds.includes(med) ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                    data-testid={`med-${med.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{
                      background: selectedMeds.includes(med) ? '#8B5CF6' : 'rgba(255,255,255,0.05)',
                    }}>
                      {selectedMeds.includes(med) ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3.5 h-3.5 text-white/30" />}
                    </div>
                    <span className="text-sm font-medium text-white">{med}</span>
                  </button>
                ))}
              </div>

              <p className="text-xs text-white/50 font-medium mb-2">Refill frequency</p>
              <div className="flex gap-2 mb-5">
                {INTERVALS.map((interval) => (
                  <button
                    key={interval.days}
                    onClick={() => setSelectedInterval(interval.days)}
                    className="flex-1 p-3 rounded-xl text-center transition-all relative"
                    style={{
                      background: selectedInterval === interval.days ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedInterval === interval.days ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                    data-testid={`interval-${interval.days}`}
                  >
                    <Calendar className={`w-4 h-4 mx-auto mb-1 ${selectedInterval === interval.days ? 'text-purple-400' : 'text-white/20'}`} />
                    <span className={`text-xs font-semibold block ${selectedInterval === interval.days ? 'text-purple-300' : 'text-white/40'}`}>{interval.label}</span>
                    {interval.badge && (
                      <span className="absolute -top-1.5 right-1 text-[7px] px-1.5 py-0.5 rounded-full bg-purple-500 text-white font-bold">{interval.badge}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={!selectedMeds.length || saving}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', boxShadow: '0 4px 16px rgba(139,92,246,0.4)' }}
                data-testid="save-subscription-btn"
              >
                {saving ? 'Saving...' : `Set Auto Refill (${selectedMeds.length} items, every ${selectedInterval} days)`}
              </button>

              <div className="mt-3 flex items-center gap-2 justify-center text-[10px] text-white/25">
                <Clock className="w-3 h-3" />
                You'll get a WhatsApp reminder 3 days before each refill
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRefill;
