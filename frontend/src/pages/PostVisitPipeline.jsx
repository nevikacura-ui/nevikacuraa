import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Pill, TestTube, ChevronRight, Sparkles, ShoppingCart } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PostVisitPipeline() {
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const phone = user.phone || user.mobile || '8108888330';

  const fetchPending = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/visit-pipeline/pending/${phone}`);
      if (res.data.success) setPending(res.data.pending_actions);
    } catch (err) {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleConfirmAll = async (action) => {
    setConfirming(action.prescription_id);
    try {
      const res = await axios.post(`${API_URL}/api/visit-pipeline/confirm`, {
        phone,
        prescription_id: action.prescription_id,
        medicines: action.medicines,
        lab_tests: action.suggested_labs,
      });
      if (res.data.success) {
        toast.success(`Added ${res.data.medicines_added} medicines to cart & booked ${res.data.labs_booked} lab tests!`);
        setPending(prev => prev.filter(p => p.prescription_id !== action.prescription_id));
      }
    } catch (err) {
      toast.error('Failed to confirm');
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="dark-page min-h-screen bg-[#050510] text-white pb-32" data-testid="post-visit-pipeline">
      {/* Header */}
      <div className="glass-crystal sticky top-0 z-50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/5 btn-press" data-testid="pvp-back-btn">
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </button>
        <div>
          <h1 className="text-sm font-bold font-heading">Post-Visit Actions</h1>
          <p className="text-[10px] text-white/40">One tap to order medicines + book labs</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />)}
          </div>
        ) : pending.length === 0 ? (
          <div className="text-center pt-20">
            <Sparkles className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30 font-medium">All caught up!</p>
            <p className="text-xs text-white/15 mt-1">No pending post-visit actions. All prescriptions have been processed.</p>
            <button onClick={() => navigate('/diagyn')} className="mt-6 px-6 py-3 rounded-2xl bg-teal-500/10 text-teal-400 text-sm font-bold btn-press">
              Book Appointment
            </button>
          </div>
        ) : (
          pending.map((action) => (
            <div key={action.prescription_id} className="rounded-2xl overflow-hidden card-interactive" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Header */}
              <div className="p-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{action.doctor_name || 'Doctor'}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{action.diagnosis || 'Consultation'}</p>
                  </div>
                  <span className="text-[9px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-bold">
                    {action.medicine_count} meds + {action.lab_count} labs
                  </span>
                </div>
              </div>

              {/* Medicines */}
              <div className="p-4 pb-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/30 font-bold mb-2 flex items-center gap-1.5">
                  <Pill className="w-3 h-3 text-teal-400" /> Medicines to Order
                </p>
                <div className="space-y-1.5">
                  {action.medicines.slice(0, 4).map((med, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-500/50" />
                      <span className="text-white/70 truncate">{med.name || med.medicine_name}</span>
                      {med.dosage && <span className="text-white/25 ml-auto text-[10px]">{med.dosage}</span>}
                    </div>
                  ))}
                  {action.medicines.length > 4 && (
                    <p className="text-[10px] text-white/20 pl-3.5">+{action.medicines.length - 4} more</p>
                  )}
                </div>
              </div>

              {/* Suggested Labs */}
              {action.suggested_labs.length > 0 && (
                <div className="px-4 pb-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/30 font-bold mb-2 flex items-center gap-1.5">
                    <TestTube className="w-3 h-3 text-purple-400" /> Recommended Lab Tests
                  </p>
                  <div className="space-y-1.5">
                    {action.suggested_labs.map((lab, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50" />
                        <span className="text-white/70">{lab.test_name}</span>
                        <span className="text-[9px] text-purple-400/50 ml-auto">{lab.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm Button */}
              <div className="p-4 pt-3">
                <button
                  onClick={() => handleConfirmAll(action)}
                  disabled={confirming === action.prescription_id}
                  className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white btn-press active:scale-[0.97] transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', boxShadow: '0 4px 20px rgba(20,184,166,0.25)' }}
                  data-testid={`confirm-all-${action.prescription_id}`}
                >
                  {confirming === action.prescription_id ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Confirm All — {action.medicine_count} Medicines + {action.lab_count} Labs
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
