import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  RefreshCw, Package, Calendar, Pause, Play, X,
  Plus, Minus, Truck, Check, Clock, ChevronDown,
  ChevronUp, AlertCircle, Loader2, Sparkles
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const FREQUENCIES = [
  { value: 15, label: 'Every 15 days' },
  { value: 30, label: 'Monthly' },
  { value: 60, label: 'Every 2 months' },
  { value: 90, label: 'Quarterly' },
];

// ======= Patient-facing Auto-Refill Setup =======
export const AutoRefillSetup = ({ items = [], patientInfo = {}, onSuccess }) => {
  const [frequency, setFrequency] = useState(30);
  const [address, setAddress] = useState(patientInfo.address || '');
  const [loading, setLoading] = useState(false);
  const [refillItems, setRefillItems] = useState(
    items.map(i => ({ ...i, quantity: i.quantity || 1 }))
  );

  const updateQty = (idx, delta) => {
    setRefillItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const total = refillItems.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);
  const discounted = Math.round(total * 0.95);

  const handleSubscribe = async () => {
    if (!patientInfo.name || !patientInfo.phone) {
      toast.error('Patient name and phone required');
      return;
    }
    if (refillItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/subscriptions/auto-refill/create`, {
        patient_name: patientInfo.name,
        patient_phone: patientInfo.phone,
        patient_email: patientInfo.email || '',
        items: refillItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
        frequency_days: frequency,
        delivery_address: address,
        payment_method: 'cod'
      });
      if (res.data.success) {
        toast.success('Auto-refill subscription created! You save 5% every order.');
        onSuccess?.(res.data.subscription);
      }
    } catch (e) {
      toast.error('Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" data-testid="auto-refill-setup">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw className="w-5 h-5" />
          <h3 className="font-bold text-base">Auto-Refill & Save 5%</h3>
        </div>
        <p className="text-xs text-white/80">Never run out of your medicines. Auto-delivered at your doorstep.</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Items */}
        {refillItems.map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
            <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
              <p className="text-xs text-gray-500">Rs.{item.price}/unit</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => updateQty(i, -1)} className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center"
                data-testid={`refill-qty-minus-${i}`}>
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
              <button onClick={() => updateQty(i, 1)} className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center"
                data-testid={`refill-qty-plus-${i}`}>
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {/* Frequency */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Delivery Frequency</label>
          <div className="grid grid-cols-2 gap-2">
            {FREQUENCIES.map(f => (
              <button key={f.value} onClick={() => setFrequency(f.value)}
                className={`p-2 rounded-xl text-xs font-medium border transition-all ${
                  frequency === f.value
                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                data-testid={`refill-freq-${f.value}`}>
                <Calendar className="w-3.5 h-3.5 mx-auto mb-1" />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Delivery Address</label>
          <textarea value={address} onChange={e => setAddress(e.target.value)}
            rows={2} placeholder="Enter your delivery address"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-teal-400 outline-none resize-none text-gray-800"
            data-testid="refill-address" />
        </div>

        {/* Pricing */}
        <div className="bg-teal-50 rounded-xl p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Per order total</span>
            <span className="text-gray-400 line-through">Rs.{total}</span>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span className="text-teal-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Subscriber price
            </span>
            <span className="text-teal-700">Rs.{discounted}</span>
          </div>
          <p className="text-[10px] text-teal-600">You save Rs.{total - discounted} every {FREQUENCIES.find(f => f.value === frequency)?.label.toLowerCase()}</p>
        </div>

        {/* Subscribe Button */}
        <button onClick={handleSubscribe} disabled={loading || refillItems.length === 0}
          className="w-full py-3 bg-teal-500 text-white font-bold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          data-testid="refill-subscribe-btn">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Start Auto-Refill
        </button>
      </div>
    </div>
  );
};


// ======= My Subscriptions List (Patient View) =======
export const MySubscriptions = ({ phone }) => {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (phone) fetchSubs();
    else setLoading(false);
  }, [phone]);

  const fetchSubs = async () => {
    try {
      const res = await axios.get(`${API}/subscriptions/auto-refill/list?phone=${phone}`);
      setSubs(res.data.subscriptions || []);
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  };

  const handleAction = async (subId, action) => {
    try {
      await axios.post(`${API}/subscriptions/auto-refill/${subId}/${action}`);
      toast.success(`Subscription ${action}d`);
      fetchSubs();
    } catch (e) {
      toast.error(`Failed to ${action} subscription`);
    }
  };

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;
  if (subs.length === 0) return null;

  const statusConfig = {
    active: { color: 'bg-green-100 text-green-700', icon: Check },
    paused: { color: 'bg-amber-100 text-amber-700', icon: Pause },
    cancelled: { color: 'bg-red-100 text-red-700', icon: X }
  };

  return (
    <div className="space-y-3" data-testid="my-subscriptions">
      <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
        <RefreshCw className="w-4 h-4 text-teal-500" />
        My Auto-Refills ({subs.length})
      </h3>

      {subs.map(sub => {
        const config = statusConfig[sub.status] || statusConfig.active;
        const StatusIcon = config.icon;
        const isExpanded = expanded === sub.id;
        return (
          <div key={sub.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            data-testid={`subscription-card-${sub.id}`}>
            <button onClick={() => setExpanded(isExpanded ? null : sub.id)}
              className="w-full p-3 flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-teal-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {sub.items?.slice(0, 2).map(i => i.name).join(', ')}
                  {sub.items?.length > 2 && ` +${sub.items.length - 2}`}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${config.color}`}>
                    {sub.status}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Every {sub.frequency_days} days
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-800">Rs.{sub.discounted_total || sub.total_per_cycle}</p>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" /> : <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />}
              </div>
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-3">
                {/* Items */}
                <div className="space-y-1">
                  {sub.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-600">
                      <span>{item.name} x{item.quantity}</span>
                      <span>Rs.{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Next refill */}
                {sub.next_refill_date && sub.status === 'active' && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                    <Clock className="w-3.5 h-3.5" />
                    Next delivery: {new Date(sub.next_refill_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {sub.status === 'active' && (
                    <button onClick={() => handleAction(sub.id, 'pause')}
                      className="flex-1 py-2 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg flex items-center justify-center gap-1"
                      data-testid={`sub-pause-${sub.id}`}>
                      <Pause className="w-3 h-3" /> Pause
                    </button>
                  )}
                  {sub.status === 'paused' && (
                    <button onClick={() => handleAction(sub.id, 'resume')}
                      className="flex-1 py-2 text-xs font-medium text-green-600 bg-green-50 rounded-lg flex items-center justify-center gap-1"
                      data-testid={`sub-resume-${sub.id}`}>
                      <Play className="w-3 h-3" /> Resume
                    </button>
                  )}
                  {sub.status !== 'cancelled' && (
                    <button onClick={() => handleAction(sub.id, 'cancel')}
                      className="flex-1 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg flex items-center justify-center gap-1"
                      data-testid={`sub-cancel-${sub.id}`}>
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};


// ======= Staff Dashboard Widget =======
export const AutoRefillDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/subscriptions/auto-refill/dashboard/stats`);
      setStats(res.data);
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  };

  const processRefills = async () => {
    try {
      const res = await axios.post(`${API}/subscriptions/auto-refill/process-due`);
      toast.success(`Processed ${res.data.processed} refill orders`);
      fetchStats();
    } catch (e) {
      toast.error('Failed to process refills');
    }
  };

  if (loading) return <div className="p-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></div>;
  if (!stats) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" data-testid="auto-refill-dashboard">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-teal-500" /> Auto-Refill Subscriptions
        </h3>
        <button onClick={processRefills}
          className="px-3 py-1.5 bg-teal-500 text-white text-xs font-medium rounded-lg hover:bg-teal-600"
          data-testid="process-refills-btn">
          Process Due
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          <p className="text-[10px] text-green-500 font-medium">Active</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.paused}</p>
          <p className="text-[10px] text-amber-500 font-medium">Paused</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">Rs.{stats.monthly_recurring_revenue}</p>
          <p className="text-[10px] text-blue-500 font-medium">MRR</p>
        </div>
      </div>
    </div>
  );
};
