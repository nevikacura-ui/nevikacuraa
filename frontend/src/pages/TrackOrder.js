import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Phone, Clock, Package, Stethoscope, Pill,
  TestTube, CheckCircle2, Truck, Home as HomeIcon, ClipboardCheck,
  MapPin, User, RefreshCw, Loader2, FlaskConical, PackageCheck,
  Share2, HeadphonesIcon, XCircle, Bell, RotateCcw,
  Moon, Footprints, Heart, Scale, Droplets, Flame, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const STEPS_CONFIG = {
  pharmacy: [
    { key: 'booked', altKeys: ['Order Booked', 'pending', 'confirmed'], label: 'Order Confirmed', desc: 'Your order has been received', icon: ClipboardCheck },
    { key: 'packing', altKeys: ['In Process', 'pharmacist_call', 'preparing'], label: 'Preparing', desc: 'Pharmacist is packing your medicines', icon: Package },
    { key: 'out_for_delivery', altKeys: ['Out for Delivery', 'dispatched'], label: 'Out for Delivery', desc: 'On the way to you', icon: Truck },
    { key: 'completed', altKeys: ['Delivered', 'delivered'], label: 'Delivered', desc: 'Order delivered', icon: HomeIcon },
  ],
  diagyn: [
    { key: 'pending', altKeys: ['booked', 'confirmed'], label: 'Booked', desc: 'Slot confirmed', icon: ClipboardCheck },
    { key: 'reminder_sent', altKeys: ['reminded'], label: 'Reminder', desc: 'WhatsApp reminder sent', icon: Phone },
    { key: 'checked_in', altKeys: ['arrived', 'check_in'], label: 'Checked In', desc: 'At the clinic', icon: MapPin },
    { key: 'in_consultation', altKeys: ['ongoing'], label: 'Consulting', desc: 'With the doctor', icon: Stethoscope },
    { key: 'completed', altKeys: ['done', 'finished'], label: 'Done', desc: 'Visit completed', icon: CheckCircle2 },
  ],
  diagnostic: [
    { key: 'Order Booked', altKeys: ['booked', 'pending', 'confirmed'], label: 'Booked', desc: 'Test scheduled', icon: ClipboardCheck },
    { key: 'Sample Collected', altKeys: ['collected', 'sample_collected'], label: 'Collected', desc: 'Sample picked up', icon: PackageCheck },
    { key: 'In Process', altKeys: ['processing', 'in_process'], label: 'Processing', desc: 'Lab analysis', icon: FlaskConical },
    { key: 'Reports Generated', altKeys: ['completed', 'report_ready', 'delivered'], label: 'Report Ready', desc: 'View your report', icon: CheckCircle2 },
  ],
};

const TYPE_THEMES = {
  pharmacy: { accent: '#f97316', accentRgb: '249,115,22', label: 'Pharmacy', icon: Pill },
  diagyn: { accent: '#14b8a6', accentRgb: '20,184,166', label: 'Appointment', icon: Stethoscope },
  diagnostic: { accent: '#a855f7', accentRgb: '168,85,247', label: 'Lab Test', icon: TestTube },
};

function getStepIndex(steps, status) {
  const norm = (status || '').toLowerCase();
  return steps.findIndex(s =>
    s.key.toLowerCase() === norm || (s.altKeys && s.altKeys.some(a => a.toLowerCase() === norm))
  );
}

const TrackOrder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialPhone = searchParams.get('phone') || localStorage.getItem('userPhone') || '';
  const [phone, setPhone] = useState(initialPhone);
  const [refreshing, setRefreshing] = useState(false);
  const [healthStats, setHealthStats] = useState([]);

  const METRIC_ICONS = { sleep: Moon, steps: Footprints, heart_rate: Heart, bmi: Scale, water: Droplets, calories: Flame };
  const TREND_ICONS = { up: TrendingUp, down: TrendingDown, stable: Minus };

  const fetchHealthStats = async (ph) => {
    try {
      const res = await axios.get(`${API}/health-stats/${ph || phone || '0000000000'}`);
      setHealthStats(res.data?.metrics || []);
    } catch { /* use defaults */ }
  };

  const fetchOrders = async (showToast = false) => {
    if (!phone) { setLoading(false); return; }
    setRefreshing(true);
    try {
      const res = await axios.get(`${API}/guest/orders?phone=${phone}`);
      const data = res.data || {};
      const pharma = (data.pharmacy_orders || []).map(o => ({ ...o, _type: 'pharmacy' }));
      const diag = (data.diagnostic_orders || []).map(o => ({ ...o, _type: 'diagnostic' }));
      const appt = (data.appointments || []).map(o => ({ ...o, _type: 'diagyn' }));
      const all = [...pharma, ...diag, ...appt].sort((a, b) =>
        new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0)
      );
      setOrders(all);
      if (showToast) toast.success('Refreshed');
    } catch {
      toast.error('Could not fetch orders');
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { 
    if (initialPhone) fetchOrders(); else setLoading(false); 
    fetchHealthStats(initialPhone);
  }, []);

  return (
    <div className="dark-page min-h-screen pb-24" style={{ background: '#050510' }} data-testid="track-order-page">
      <style>{`
        @keyframes slowGlow { 0%,100% { opacity:0.2; transform:scale(1); } 50% { opacity:0.7; transform:scale(1.2); } }
        @keyframes cardIn { from { opacity:0; transform:translateY(20px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes heartbeat {
          0% { transform:scale(1); box-shadow: 0 0 0 0 rgba(var(--pulse-rgb),0.5); }
          15% { transform:scale(1.15); box-shadow: 0 0 12px 4px rgba(var(--pulse-rgb),0.35); }
          30% { transform:scale(1); box-shadow: 0 0 0 0 rgba(var(--pulse-rgb),0.1); }
          45% { transform:scale(1.1); box-shadow: 0 0 8px 3px rgba(var(--pulse-rgb),0.25); }
          60%,100% { transform:scale(1); box-shadow: 0 0 0 0 rgba(var(--pulse-rgb),0); }
        }
        @keyframes ecgLine {
          0% { stroke-dashoffset: 200; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[300px] h-[300px] rounded-full blur-[120px] opacity-[0.07]" style={{ background: '#14b8a6', top: '-10%', right: '-15%' }} />
        <div className="absolute w-[250px] h-[250px] rounded-full blur-[100px] opacity-[0.05]" style={{ background: '#f97316', bottom: '10%', left: '-10%' }} />
      </div>

      {/* Header — glass bar */}
      <div className="sticky top-0 z-50 px-4 pt-4 pb-3"
        style={{ background: 'rgba(5,5,16,0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            data-testid="track-back-btn">
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Live Status</h1>
            <p className="text-[10px] text-white/25 font-light">{orders.length} active items</p>
          </div>
          <button onClick={() => navigate('/patient-profile')}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            data-testid="track-profile-btn">
            <User className="w-4 h-4 text-white/40" />
          </button>
          <button onClick={() => navigate('/notifications')}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            data-testid="track-notifications-btn">
            <Bell className="w-4 h-4 text-white/40" />
          </button>
          <button onClick={() => fetchOrders(true)} disabled={refreshing}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            data-testid="track-refresh-btn">
            <RefreshCw className={`w-4 h-4 text-white/40 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Phone input if missing */}
      {!phone && (
        <form onSubmit={e => { e.preventDefault(); setLoading(true); fetchOrders(); }} className="relative z-10 px-4 mb-4">
          <div className="flex gap-2">
            <div className="flex-1 rounded-2xl px-4 py-3 flex items-center gap-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
              <Phone className="w-4 h-4 text-white/15" />
              <input type="tel" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                className="flex-1 bg-transparent text-white text-sm font-light outline-none placeholder:text-white/15"
                placeholder="Enter phone number" data-testid="track-phone-input" />
            </div>
            <button type="submit" className="px-5 rounded-2xl text-white text-xs font-semibold"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }} data-testid="track-search-btn">Track</button>
          </div>
        </form>
      )}

      {/* Content */}
      <div className="relative z-10 px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-white/20" />
          </div>
        ) : orders.length === 0 ? (
          /* ============ EMPTY STATE - Translucent Hero + Dark Cards ============ */
          <div style={{ animation: 'cardIn 0.5s ease-out both' }}>
            {/* Translucent pastel hero - light glass morphism */}
            <div className="rounded-[24px] overflow-hidden mb-4" style={{
              background: 'linear-gradient(160deg, rgba(255,255,255,0.12) 0%, rgba(200,230,220,0.1) 30%, rgba(180,210,240,0.08) 60%, rgba(5,5,16,0.6) 100%)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}>
              <div className="px-6 pt-6 pb-2">
                <p className="text-white/40 text-xs tracking-widest uppercase font-light mb-1">Health Status</p>
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-5xl font-black text-emerald-400" style={{ fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>100</span>
                  <span className="text-lg font-semibold text-emerald-400/60 pb-1">%</span>
                </div>
                <p className="text-emerald-300/70 text-sm font-medium">All Clear</p>
              </div>
              {/* ECG heartbeat line */}
              <div className="px-4 pb-4">
                <svg viewBox="0 0 300 40" className="w-full h-8 mt-2" preserveAspectRatio="none">
                  <path d="M0,20 L60,20 L70,20 L80,5 L90,35 L100,10 L110,30 L120,20 L180,20 L190,20 L200,5 L210,35 L220,10 L230,30 L240,20 L300,20"
                    fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="1.5"
                  />
                  <path d="M0,20 L60,20 L70,20 L80,5 L90,35 L100,10 L110,30 L120,20 L180,20 L190,20 L200,5 L210,35 L220,10 L230,30 L240,20 L300,20"
                    fill="none" stroke="rgba(16,185,129,0.5)" strokeWidth="1.5"
                    strokeDasharray="200" strokeDashoffset="0"
                    style={{ animation: 'ecgLine 3s linear infinite' }}
                  />
                </svg>
              </div>
            </div>

            {/* Health Stats 3x2 Grid */}
            {healthStats.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 mb-4">
                {healthStats.map((m) => {
                  const Icon = METRIC_ICONS[m.key] || Heart;
                  const TrendIcon = TREND_ICONS[m.trend] || Minus;
                  const pct = Math.min(100, Math.round((m.value / m.target) * 100));
                  return (
                    <div key={m.key} className="rounded-2xl p-3 relative overflow-hidden" style={{
                      background: 'rgba(10,10,18,0.95)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${m.color}18` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                        </div>
                        <TrendIcon className="w-3 h-3" style={{ color: m.trend === 'up' ? '#22c55e' : m.trend === 'down' ? '#ef4444' : '#6b7280' }} />
                      </div>
                      <p className="text-white/90 text-lg font-black leading-none">{typeof m.value === 'number' && m.value > 999 ? `${(m.value/1000).toFixed(1)}k` : m.value}</p>
                      <p className="text-white/25 text-[9px] mt-0.5">{m.unit ? `${m.unit} ` : ''}{m.label}</p>
                      {/* Progress bar */}
                      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: m.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dark Nevika Cura style cards for Order Activity */}
            <div className="rounded-[24px] overflow-hidden" style={{
              background: 'rgba(10,10,18,0.95)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div className="px-5 pt-5 pb-3">
                <p className="text-white/40 text-xs tracking-widest uppercase font-light">Order Activity</p>
              </div>
              <div className="px-4 pb-5 space-y-2.5">
                {[
                  { icon: Stethoscope, label: 'Appointments', desc: 'No upcoming appointments', color: '#14b8a6' },
                  { icon: FlaskConical, label: 'Lab Tests', desc: 'No pending tests', color: '#22c55e' },
                  { icon: Pill, label: 'Pharmacy', desc: 'No active deliveries', color: '#f97316' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl" style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ 
                      background: `${item.color}15`,
                      border: `1px solid ${item.color}20`
                    }}>
                      <item.icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white/80 text-sm font-semibold">{item.label}</p>
                      <p className="text-white/25 text-xs">{item.desc}</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500/50" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order, idx) => (
              <GlassCard key={order.order_id || order.booking_id || order.id || idx} order={order} idx={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============ PREMIUM GLASS CARD ============ */
const GlassCard = ({ order, idx }) => {
  const type = order._type || 'pharmacy';
  const theme = TYPE_THEMES[type] || TYPE_THEMES.pharmacy;
  const steps = STEPS_CONFIG[type] || STEPS_CONFIG.pharmacy;
  const status = order.status || order.order_status || 'pending';
  const currentIdx = getStepIndex(steps, status);
  const isCancelled = status.toLowerCase().includes('cancel');
  const ThemeIcon = theme.icon;

  const orderId = order.order_id || order.booking_id || order.id || '—';
  const orderDate = order.created_at || order.date || '';

  const details = type === 'pharmacy'
    ? [
        { label: 'Items', value: order.items?.length ? `${order.items.length} item(s)` : '—' },
        { label: 'Total', value: order.total ? `₹${order.total}` : '—' },
        { label: 'Payment', value: order.payment_method === 'cod' ? 'COD' : 'Paid' },
      ]
    : type === 'diagyn'
    ? [
        { label: 'Doctor', value: order.doctor || '—' },
        { label: 'Clinic', value: (order.clinic || '—').split(' - ').pop() },
        { label: 'Slot', value: order.time || order.time_slot || '—' },
      ]
    : [
        { label: 'Tests', value: order.tests?.length ? `${order.tests.length}` : '1' },
        { label: 'Mode', value: order.collection_type || 'Lab' },
        { label: 'Total', value: order.total ? `₹${order.total}` : '—' },
      ];

  return (
    <div
      className="rounded-[24px] overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
        animation: `cardIn 0.5s ease-out ${idx * 0.08}s both`,
      }}
      data-testid={`order-card-${type}-${orderId}`}
    >
      {/* ---- Header with accent glow ---- */}
      <div className="relative p-5 pb-4">
        {/* Subtle accent orb */}
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[50px] opacity-[0.12] pointer-events-none"
          style={{ background: theme.accent }} />

        <div className="flex items-start gap-3 relative">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `rgba(${theme.accentRgb},0.12)`, border: `1px solid rgba(${theme.accentRgb},0.18)` }}>
            <ThemeIcon className="w-5 h-5" style={{ color: theme.accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-semibold">{theme.label}</span>
              {!isCancelled && currentIdx >= 0 && currentIdx < steps.length - 1 && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: `rgba(${theme.accentRgb},0.15)`, color: theme.accent }}>
                  {steps[currentIdx]?.label}
                </span>
              )}
              {currentIdx === steps.length - 1 && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/15 text-green-400">
                  Completed
                </span>
              )}
            </div>
            <p className="text-white/20 text-[11px] font-light mt-0.5">
              #{orderId}
              {orderDate && <> · {new Date(orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</>}
            </p>
          </div>
        </div>

        {/* ---- Details chips ---- */}
        <div className="flex gap-2 mt-4">
          {details.map((d, i) => (
            <div key={i} className="flex-1 py-2 px-2.5 rounded-xl text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="text-white/20 text-[8px] uppercase tracking-widest font-light">{d.label}</p>
              <p className="text-white/70 text-[11px] font-medium mt-0.5 truncate">{d.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Timeline ---- */}
      {isCancelled ? (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 p-3 rounded-2xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-300/80 text-xs font-light">Cancelled</span>
          </div>
        </div>
      ) : (
        <div className="px-5 pb-4">
          {/* Horizontal step dots */}
          <div className="flex items-center gap-1 mb-1">
            {steps.map((step, i) => {
              const isCompleted = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <React.Fragment key={step.key}>
                  <div className="relative flex flex-col items-center" style={{ flex: '0 0 auto' }}>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                      style={{
                        '--pulse-rgb': theme.accentRgb,
                        background: isCompleted ? theme.accent : 'rgba(255,255,255,0.04)',
                        border: isCompleted ? 'none' : '1px solid rgba(255,255,255,0.08)',
                        animation: isCurrent ? `heartbeat 1.8s ease-in-out infinite` : 'none',
                      }}
                    >
                      <step.icon className="w-3 h-3" style={{ color: isCompleted ? 'white' : 'rgba(255,255,255,0.15)' }} />
                    </div>
                    {isCurrent && (
                      <div className="absolute -inset-1 rounded-full border"
                        style={{ borderColor: `rgba(${theme.accentRgb},0.4)`, animation: 'slowGlow 3s ease-in-out infinite' }} />
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex-1 h-[2px] rounded-full mx-0.5"
                      style={{ background: i < currentIdx ? theme.accent : 'rgba(255,255,255,0.05)' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {/* Step labels */}
          <div className="flex items-start">
            {steps.map((step, i) => {
              const isCompleted = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div key={step.key} className="flex-1 text-center px-0.5" style={{ minWidth: 0 }}>
                  <p className={`text-[8px] font-medium mt-1.5 leading-tight truncate ${
                    isCurrent ? 'text-white/80' : isCompleted ? 'text-white/35' : 'text-white/12'
                  }`}>{step.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Footer actions ---- */}
      <div className="px-5 pb-4 flex gap-2">
        {type === 'pharmacy' && (
          <button
            onClick={async () => {
              try {
                const res = await axios.post(`${API}/pharmacy/v2/reorder`, { order_id: order.id || order.order_id });
                if (res.data?.status === 'success') toast.success(res.data.message || 'Reorder placed!');
                else toast.error(res.data?.detail || 'Reorder failed');
              } catch { navigate('/pharmacy'); }
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all"
            style={{ background: `rgba(${theme.accentRgb},0.12)`, color: theme.accent, border: `1px solid rgba(${theme.accentRgb},0.2)` }}
            data-testid={`reorder-${orderId}`}>
            <RotateCcw className="w-3 h-3" /> Reorder
          </button>
        )}
        {type === 'diagnostic' && (
          <button
            onClick={() => navigate('/mango')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all"
            style={{ background: `rgba(${theme.accentRgb},0.12)`, color: theme.accent, border: `1px solid rgba(${theme.accentRgb},0.2)` }}
            data-testid={`rebook-${orderId}`}>
            <RotateCcw className="w-3 h-3" /> Book Again
          </button>
        )}
        {type === 'diagyn' && (
          <button
            onClick={() => navigate('/appointment-calendar')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all"
            style={{ background: `rgba(${theme.accentRgb},0.12)`, color: theme.accent, border: `1px solid rgba(${theme.accentRgb},0.2)` }}
            data-testid={`view-calendar-${orderId}`}>
            <RotateCcw className="w-3 h-3" /> Calendar
          </button>
        )}
        <a href="tel:+919876543210"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-medium text-white/30 transition-all hover:text-white/50"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
          data-testid={`order-call-${orderId}`}>
          <HeadphonesIcon className="w-3 h-3" /> Support
        </a>
        <button
          onClick={() => {
            if (navigator.share) navigator.share({ title: `${theme.label} #${orderId}` });
            else { navigator.clipboard.writeText(`${theme.label} #${orderId}`); toast.success('Copied'); }
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-medium text-white/30 transition-all hover:text-white/50"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
          data-testid={`order-share-${orderId}`}>
          <Share2 className="w-3 h-3" /> Share
        </button>
      </div>
    </div>
  );
};

export default TrackOrder;
