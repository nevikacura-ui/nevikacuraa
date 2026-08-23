import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, CreditCard, Smartphone, Trash2, Star, X, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const CARD_NETWORKS = [
  { id: 'visa', label: 'Visa', color: '#1a1f71' },
  { id: 'mastercard', label: 'Mastercard', color: '#eb001b' },
  { id: 'rupay', label: 'RuPay', color: '#097A44' },
];

const PaymentMethods = () => {
  const navigate = useNavigate();
  const phone = localStorage.getItem('userPhone') || '';
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('upi'); // upi | card
  const [form, setForm] = useState({ upi_id: '', card_last4: '', card_network: 'visa', card_holder: '', card_expiry: '', label: '', is_default: false });

  const fetchMethods = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    try {
      const res = await axios.get(`${API}/payment-methods/${phone}`);
      setMethods(res.data.payment_methods || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [phone]);

  useEffect(() => { fetchMethods(); }, [fetchMethods]);

  const saveMethod = async () => {
    if (formType === 'upi' && !form.upi_id.includes('@')) {
      toast.error('Enter a valid UPI ID (e.g. name@upi)'); return;
    }
    if (formType === 'card' && form.card_last4.length !== 4) {
      toast.error('Enter last 4 digits of card'); return;
    }
    try {
      await axios.post(`${API}/payment-methods`, {
        phone,
        method_type: formType,
        upi_id: formType === 'upi' ? form.upi_id : null,
        card_last4: formType === 'card' ? form.card_last4 : null,
        card_network: formType === 'card' ? form.card_network : null,
        card_holder: formType === 'card' ? form.card_holder : null,
        card_expiry: formType === 'card' ? form.card_expiry : null,
        label: form.label || undefined,
        is_default: methods.length === 0 || form.is_default,
      });
      toast.success('Payment method saved!');
      setShowForm(false);
      setForm({ upi_id: '', card_last4: '', card_network: 'visa', card_holder: '', card_expiry: '', label: '', is_default: false });
      fetchMethods();
    } catch { toast.error('Failed to save'); }
  };

  const deleteMethod = async (id) => {
    try {
      await axios.delete(`${API}/payment-methods/${id}`);
      toast.success('Removed');
      setMethods(prev => prev.filter(m => m.id !== id));
    } catch { toast.error('Failed'); }
  };

  const setDefault = async (id) => {
    try {
      await axios.put(`${API}/payment-methods/${id}/default?phone=${phone}`);
      toast.success('Default updated');
      fetchMethods();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#050510' }} data-testid="payment-methods-page">
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 pt-4 pb-3" style={{ background: 'rgba(5,5,16,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <h1 className="flex-1 text-base font-semibold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Payment Methods</h1>
          <button onClick={() => setShowForm(true)} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.25)' }} data-testid="add-payment-btn">
            <Plus className="w-4 h-4 text-teal-400" />
          </button>
        </div>
      </div>

      <div className="px-4 mt-3">
        {/* Security badge */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl" style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.1)' }}>
          <Shield className="w-3.5 h-3.5 text-teal-400/60" />
          <p className="text-white/30 text-[10px]">Your payment info is encrypted & secured by Cashfree</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/20" /></div>
        ) : methods.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="w-8 h-8 text-white/8 mx-auto mb-2" />
            <p className="text-white/20 text-sm">No saved payment methods</p>
            <button onClick={() => setShowForm(true)} className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-teal-400" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}>
              Add UPI or Card
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {methods.map(m => (
              <div key={m.id} className="rounded-2xl p-4 flex items-center gap-3" style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${m.is_default ? 'rgba(20,184,166,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                  background: m.method_type === 'upi' ? 'rgba(99,102,241,0.1)' : 'rgba(249,115,22,0.1)'
                }}>
                  {m.method_type === 'upi'
                    ? <Smartphone className="w-5 h-5 text-indigo-400" />
                    : <CreditCard className="w-5 h-5 text-orange-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white/80 text-sm font-semibold">
                      {m.method_type === 'upi' ? m.upi_id : `•••• •••• •••• ${m.card_last4}`}
                    </p>
                    {m.is_default && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold text-teal-300 bg-teal-500/15">Default</span>}
                  </div>
                  <p className="text-white/25 text-xs capitalize mt-0.5">
                    {m.method_type === 'upi' ? 'UPI' : `${m.card_network || 'Card'}`}
                    {m.card_holder ? ` · ${m.card_holder}` : ''}
                    {m.card_expiry ? ` · Exp ${m.card_expiry}` : ''}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {!m.is_default && (
                    <button onClick={() => setDefault(m.id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }} data-testid={`set-default-pm-${m.id}`}>
                      <Star className="w-3.5 h-3.5 text-white/15" />
                    </button>
                  )}
                  <button onClick={() => deleteMethod(m.id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }} data-testid={`delete-pm-${m.id}`}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400/40" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Payment Method Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto" style={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.08)' }} data-testid="payment-form-modal">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Add Payment Method</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>

            {/* Type toggle */}
            <div className="flex gap-2 mb-5">
              <button onClick={() => setFormType('upi')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold ${formType === 'upi' ? 'text-indigo-300' : 'text-white/30'}`}
                style={formType === 'upi' ? { background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                data-testid="select-upi">
                <Smartphone className="w-4 h-4" /> UPI
              </button>
              <button onClick={() => setFormType('card')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold ${formType === 'card' ? 'text-orange-300' : 'text-white/30'}`}
                style={formType === 'card' ? { background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                data-testid="select-card">
                <CreditCard className="w-4 h-4" /> Card
              </button>
            </div>

            {formType === 'upi' ? (
              <div className="mb-4">
                <label className="text-white/25 text-[10px] uppercase tracking-wide mb-1 block">UPI ID</label>
                <input value={form.upi_id} onChange={e => setForm(f => ({ ...f, upi_id: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 bg-transparent text-white text-sm outline-none placeholder:text-white/12"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                  placeholder="yourname@upi" data-testid="input-upi-id" />
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <label className="text-white/25 text-[10px] uppercase tracking-wide mb-1 block">Card Last 4 Digits</label>
                  <input value={form.card_last4} onChange={e => setForm(f => ({ ...f, card_last4: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    className="w-full rounded-xl px-4 py-3 bg-transparent text-white text-sm outline-none placeholder:text-white/12"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                    placeholder="1234" maxLength={4} data-testid="input-card-last4" />
                </div>
                <div className="mb-3">
                  <label className="text-white/25 text-[10px] uppercase tracking-wide mb-2 block">Card Network</label>
                  <div className="flex gap-2">
                    {CARD_NETWORKS.map(n => (
                      <button key={n.id} onClick={() => setForm(f => ({ ...f, card_network: n.id }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold ${form.card_network === n.id ? 'text-white' : 'text-white/30'}`}
                        style={form.card_network === n.id ? { background: `${n.color}30`, border: `1px solid ${n.color}50` } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-3">
                  <label className="text-white/25 text-[10px] uppercase tracking-wide mb-1 block">Cardholder Name</label>
                  <input value={form.card_holder} onChange={e => setForm(f => ({ ...f, card_holder: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 bg-transparent text-white text-sm outline-none placeholder:text-white/12"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                    placeholder="Name on card" data-testid="input-card-holder" />
                </div>
                <div className="mb-3">
                  <label className="text-white/25 text-[10px] uppercase tracking-wide mb-1 block">Expiry (MM/YY)</label>
                  <input value={form.card_expiry} onChange={e => setForm(f => ({ ...f, card_expiry: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 bg-transparent text-white text-sm outline-none placeholder:text-white/12"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                    placeholder="12/28" maxLength={5} data-testid="input-card-expiry" />
                </div>
              </>
            )}

            <label className="flex items-center gap-2 mb-5 cursor-pointer">
              <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} className="accent-teal-500" />
              <span className="text-white/40 text-xs">Set as default payment method</span>
            </label>

            <button onClick={saveMethod} className="w-full py-3 rounded-2xl text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }} data-testid="save-payment-btn">
              Save {formType === 'upi' ? 'UPI' : 'Card'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethods;
