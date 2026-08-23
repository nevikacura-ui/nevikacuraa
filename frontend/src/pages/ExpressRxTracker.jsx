import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CheckCircle, Stethoscope, FileText, Clock, Zap } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  consulting: { icon: Stethoscope, color: '#14B8A6', label: 'Doctor Consulting', bg: 'rgba(20,184,166,0.1)' },
  prescribed: { icon: FileText, color: '#F97316', label: 'Prescription Ready', bg: 'rgba(249,115,22,0.1)' },
  preparing: { icon: Package, color: '#8B5CF6', label: 'Medicine Being Packed', bg: 'rgba(139,92,246,0.1)' },
  dispatched: { icon: Truck, color: '#3B82F6', label: 'Out for Delivery', bg: 'rgba(59,130,246,0.1)' },
  delivered: { icon: CheckCircle, color: '#22C55E', label: 'Delivered', bg: 'rgba(34,197,94,0.1)' },
};

const STEPS = ['consulting', 'prescribed', 'preparing', 'dispatched', 'delivered'];

export default function ExpressRxTracker() {
  const navigate = useNavigate();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingFlow, setStartingFlow] = useState(false);
  const [symptoms, setSymptoms] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const phone = user.phone || user.mobile || '8108888330';

  const fetchFlows = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/express-rx/active/${phone}`);
      if (res.data.success) setFlows(res.data.active_flows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => { fetchFlows(); }, [fetchFlows]);

  const startExpressFlow = async () => {
    if (!symptoms.trim()) { toast.error('Please describe your symptoms'); return; }
    setStartingFlow(true);
    try {
      const res = await axios.post(`${API_URL}/api/express-rx/start`, { phone, symptoms });
      if (res.data.success) {
        setFlows(prev => [res.data.flow, ...prev]);
        setSymptoms('');
        toast.success('Express Rx started! Doctor is reviewing.');
      }
    } catch (err) {
      toast.error('Failed to start');
    } finally {
      setStartingFlow(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050510] text-white pb-32" data-testid="express-rx-tracker">
      {/* Header */}
      <div className="glass-crystal sticky top-0 z-50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/5 btn-press" data-testid="erx-back-btn">
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-bold font-heading flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" /> Express Rx
          </h1>
          <p className="text-[10px] text-white/40">Consult → Prescribe → Deliver in 45 min</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Start New Flow */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(249,115,22,0.08), rgba(20,184,166,0.06))', border: '1px solid rgba(249,115,22,0.15)' }}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold">Quick Consult + Delivery</p>
                <p className="text-[10px] text-white/40">Describe symptoms, get medicines delivered</p>
              </div>
            </div>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Describe your symptoms... (e.g., fever since 2 days, headache)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-amber-500/30 resize-none h-20"
              data-testid="erx-symptoms-input"
            />
            <button
              onClick={startExpressFlow}
              disabled={startingFlow}
              className="w-full mt-3 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 btn-press active:scale-[0.97] transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #F97316, #EF4444)', boxShadow: '0 4px 20px rgba(249,115,22,0.3)' }}
              data-testid="erx-start-btn"
            >
              {startingFlow ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Zap className="w-4 h-4" /> Start Express Rx</>}
            </button>
          </div>
          {/* Time estimate bar */}
          <div className="px-4 py-2.5 flex items-center justify-center gap-6 text-[10px]" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <span className="flex items-center gap-1 text-white/40"><Clock className="w-3 h-3" /> ~5 min consult</span>
            <span className="flex items-center gap-1 text-white/40"><Package className="w-3 h-3" /> ~10 min pack</span>
            <span className="flex items-center gap-1 text-white/40"><Truck className="w-3 h-3" /> ~25 min deliver</span>
          </div>
        </div>

        {/* Active Flows */}
        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />)}
          </div>
        ) : flows.length === 0 ? (
          <div className="text-center pt-10">
            <Truck className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30">No active deliveries</p>
            <p className="text-xs text-white/15 mt-1">Start an Express Rx above to get medicines in ~45 min</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-bold">Active Deliveries</p>
            {flows.map((flow) => (
              <FlowTracker key={flow.flow_id} flow={flow} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FlowTracker({ flow }) {
  const currentIdx = STEPS.indexOf(flow.status);
  const config = STATUS_CONFIG[flow.status] || STATUS_CONFIG.consulting;
  const Icon = config.icon;

  return (
    <div className="rounded-2xl p-4 card-interactive" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} data-testid={`flow-${flow.flow_id}`}>
      {/* Current status */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: config.bg }}>
          <Icon className="w-5 h-5" style={{ color: config.color }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: config.color }}>{config.label}</p>
          <p className="text-[10px] text-white/30">{flow.symptoms?.slice(0, 60)}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold font-heading text-white/80">~{STEPS.length - currentIdx > 0 ? (STEPS.length - currentIdx) * 10 : 0}</p>
          <p className="text-[9px] text-white/30">min left</p>
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const stepConfig = STATUS_CONFIG[step];
          const StepIcon = stepConfig.icon;
          const isActive = i <= currentIdx;
          const isCurrent = i === currentIdx;

          return (
            <React.Fragment key={step}>
              <div className={`flex flex-col items-center ${isCurrent ? 'scale-110' : ''} transition-transform`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isActive ? '' : 'opacity-25'}`} style={isActive ? { background: stepConfig.bg, boxShadow: isCurrent ? `0 0 12px ${stepConfig.color}40` : 'none' } : { background: 'rgba(255,255,255,0.05)' }}>
                  <StepIcon className="w-3.5 h-3.5" style={{ color: isActive ? stepConfig.color : 'rgba(255,255,255,0.2)' }} />
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 rounded-full" style={{ background: i < currentIdx ? stepConfig.color : 'rgba(255,255,255,0.06)' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
