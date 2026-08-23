import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Stethoscope, FlaskConical, Package, Calendar, Clock,
  ChevronDown, ChevronUp, MapPin, Loader2, X, Check,
  AlertTriangle, Truck
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

/* ── DiaGyn Step Tracker ── */
const STEPS = [
  { key: 'Booked', label: 'Booked', icon: Calendar },
  { key: 'CheckedIn', label: 'Checked In', icon: Check },
  { key: 'WithDoctor', label: 'With Doctor', icon: Stethoscope },
  { key: 'Completed', label: 'Completed', icon: Check },
];

const StepTracker = ({ status }) => {
  const idx = STEPS.findIndex(s => s.key === status);
  const activeIdx = idx >= 0 ? idx : 0;

  return (
    <div className="flex items-center w-full mt-3" data-testid="step-tracker">
      {STEPS.map((step, i) => {
        const done = i <= activeIdx;
        const isCurrent = i === activeIdx;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  done ? (isCurrent ? 'bg-purple-600 ring-2 ring-purple-300 ring-offset-1' : 'bg-purple-600') : 'bg-gray-200'
                }`}
              >
                <step.icon className={`w-3 h-3 ${done ? 'text-white' : 'text-gray-400'}`} />
              </div>
              <span className={`text-[9px] mt-1 font-semibold text-center leading-tight ${done ? 'text-purple-700' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-[2px] mx-0.5 mt-[-14px] rounded ${i < activeIdx ? 'bg-purple-500' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ── Cancel Confirmation ── */
const CancelModal = ({ apt, onCancel, onClose }) => {
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/api/appointments/${apt.id || apt.booking_id}/patient-cancel`, {
        phone: apt.patient_phone,
        reason: 'Cancelled by patient'
      });
      toast.success('Appointment cancelled');
      onCancel();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cannot cancel');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="font-bold text-gray-900">Cancel Appointment?</span>
        </div>
        <div className="rounded-xl bg-red-50 border border-red-100 p-3">
          <p className="font-semibold text-gray-800 text-sm">{apt.doctor}</p>
          <p className="text-xs text-gray-500 mt-0.5">{apt.date} · {apt.time}</p>
        </div>
        <p className="text-sm text-gray-500">This action cannot be undone.</p>
        <div className="flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1 rounded-xl py-5" data-testid="cancel-keep-btn">Keep</Button>
          <Button onClick={handleConfirm} disabled={loading} className="flex-1 rounded-xl py-5 bg-red-500 hover:bg-red-600 text-white" data-testid="cancel-confirm-btn">
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ── Active Tracking Section ── */
const ActiveTrackingSection = ({ data, onRefresh }) => {
  const navigate = useNavigate();
  const [cancelTarget, setCancelTarget] = useState(null);

  const ACTIVE_APT_STATUSES = ['Booked', 'CheckedIn', 'WithDoctor'];
  const ACTIVE_LAB_STATUSES = ['pending', 'processing', 'sample_collected', 'confirmed', 'booked'];
  const ACTIVE_PHARM_STATUSES = ['pending', 'processing', 'out_for_delivery', 'confirmed', 'packed'];

  const activeApts = (data.appointments || []).filter(a => ACTIVE_APT_STATUSES.includes(a.status));
  const activeLabs = (data.lab_orders || []).filter(l => ACTIVE_LAB_STATUSES.includes(l.status?.toLowerCase()));
  const activePharm = (data.pharmacy_orders || []).filter(o => ACTIVE_PHARM_STATUSES.includes(o.status?.toLowerCase()));

  const totalActive = activeApts.length + activeLabs.length + activePharm.length;

  if (totalActive === 0) {
    return (
      <Card className="p-5 border-0 shadow-sm rounded-2xl bg-white text-center" data-testid="no-active-items">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
          <Check className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-gray-600">No Active Appointments or Orders</p>
        <p className="text-xs text-gray-400 mt-1">All clear! Book a new appointment or order below.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2.5" data-testid="active-tracking-section">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">Active Tracking</h3>
        <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{totalActive} active</span>
      </div>

      {/* Active DiaGyn Appointments */}
      {activeApts.map((apt, i) => (
        <Card key={`apt-${i}`} className="p-4 border-0 shadow-sm rounded-2xl bg-white" data-testid={`active-apt-${i}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-5 h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-800 truncate">{apt.doctor || 'Doctor'}</p>
                <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{apt.clinic || 'DiaGyn'}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[11px] text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" />{apt.date}</span>
                  <span className="text-[11px] text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{apt.time}</span>
                </div>
                {apt.booking_id && (
                  <p className="text-[10px] text-gray-400 mt-1 font-mono">{apt.booking_id}</p>
                )}
              </div>
            </div>
            {apt.token_number && (
              <div className="bg-purple-600 text-white px-2.5 py-1 rounded-lg text-center flex-shrink-0">
                <p className="text-[8px] font-semibold uppercase tracking-wider opacity-80">Token</p>
                <p className="text-lg font-black leading-none">{apt.token_number}</p>
              </div>
            )}
          </div>

          {/* Step Progress Tracker */}
          <StepTracker status={apt.status} />

          {/* Cancel button for Booked appointments */}
          {apt.status === 'Booked' && (
            <button
              onClick={() => setCancelTarget(apt)}
              className="mt-3 w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 active:scale-[0.97] transition-all"
              data-testid={`cancel-apt-btn-${i}`}
            >
              <X className="w-3.5 h-3.5" />Cancel Appointment
            </button>
          )}
        </Card>
      ))}

      {/* Active Lab Orders */}
      {activeLabs.map((lab, i) => {
        const tests = (lab.tests || []).map(t => typeof t === 'string' ? t : t.name).filter(Boolean);
        return (
          <Card key={`lab-${i}`} className="p-4 border-0 shadow-sm rounded-2xl bg-white" data-testid={`active-lab-${i}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <FlaskConical className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-800">Lab Test</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{tests.slice(0, 2).join(', ')}{tests.length > 2 ? ` +${tests.length - 2}` : ''}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-gray-500">{lab.preferred_date || lab.date || 'N/A'}</span>
                    <span className="text-[11px] text-gray-500">{lab.collection_type || 'Lab'}</span>
                    {(lab.total_amount > 0) && <span className="text-[11px] font-bold text-green-600">₹{lab.total_amount}</span>}
                  </div>
                  {lab.booking_id && <p className="text-[10px] text-gray-400 mt-1 font-mono">{lab.booking_id}</p>}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                {lab.status?.replace(/_/g, ' ')}
              </span>
            </div>
          </Card>
        );
      })}

      {/* Active Pharmacy Orders */}
      {activePharm.map((ord, i) => {
        const items = (ord.items || []).map(it => typeof it === 'string' ? it : it.name).filter(Boolean);
        const orderId = ord.order_id || ord.booking_id || 'Order';
        return (
          <Card key={`pharm-${i}`} className="p-4 border-0 shadow-sm rounded-2xl bg-white cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/track?id=${orderId}`)} data-testid={`active-pharm-${i}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  {ord.status?.toLowerCase() === 'out_for_delivery' ? <Truck className="w-5 h-5 text-orange-600" /> : <Package className="w-5 h-5 text-orange-600" />}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-800">{orderId}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{items.slice(0, 2).join(', ')}{items.length > 2 ? ` +${items.length - 2}` : ''}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] font-bold text-orange-600">₹{ord.total_amount || ord.total || 0}</span>
                    <span className="text-[11px] text-gray-400">{ord.payment_method || ''}</span>
                  </div>
                  {ord.booking_id && ord.booking_id !== orderId && <p className="text-[10px] text-gray-400 mt-1 font-mono">{ord.booking_id}</p>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700">
                  {ord.status?.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] text-gray-400">Track →</span>
              </div>
            </div>
          </Card>
        );
      })}

      {cancelTarget && (
        <CancelModal apt={cancelTarget} onCancel={() => { setCancelTarget(null); onRefresh(); }} onClose={() => setCancelTarget(null)} />
      )}
    </div>
  );
};

export default ActiveTrackingSection;
