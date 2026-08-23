import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, MapPin, Trash2, Star, Home as HomeIcon, Briefcase, Building2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const SavedAddresses = () => {
  const navigate = useNavigate();
  const phone = localStorage.getItem('userPhone') || '';
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: 'home', full_address: '', landmark: '', pincode: '', city: 'Chhindwara', state: 'Madhya Pradesh', is_default: false });

  const fetchAddresses = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    try {
      const res = await axios.get(`${API}/addresses/${phone}`);
      setAddresses(res.data.addresses || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [phone]);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const saveAddress = async () => {
    if (!form.full_address.trim() || !form.pincode.trim()) { toast.error('Fill address and pincode'); return; }
    try {
      await axios.post(`${API}/addresses?phone=${phone}`, form);
      toast.success('Address saved!');
      setShowForm(false);
      setForm({ label: 'home', full_address: '', landmark: '', pincode: '', city: 'Chhindwara', state: 'Madhya Pradesh', is_default: false });
      fetchAddresses();
    } catch { toast.error('Failed to save'); }
  };

  const deleteAddress = async (id) => {
    try {
      await axios.delete(`${API}/addresses/${id}`);
      toast.success('Removed');
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch { toast.error('Failed'); }
  };

  const setDefault = async (id) => {
    try {
      await axios.put(`${API}/addresses/${id}/default?phone=${phone}`);
      toast.success('Default updated');
      fetchAddresses();
    } catch { toast.error('Failed'); }
  };

  const LABEL_ICONS = { home: HomeIcon, work: Briefcase, other: Building2 };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#050510' }} data-testid="saved-addresses-page">
      <div className="sticky top-0 z-50 px-4 pt-4 pb-3" style={{ background: 'rgba(5,5,16,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <h1 className="flex-1 text-base font-semibold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Saved Addresses</h1>
          <button onClick={() => setShowForm(true)} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.25)' }} data-testid="add-address-btn">
            <Plus className="w-4 h-4 text-teal-400" />
          </button>
        </div>
      </div>

      <div className="px-4 mt-3">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/20" /></div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="w-8 h-8 text-white/8 mx-auto mb-2" />
            <p className="text-white/20 text-sm">No saved addresses</p>
            <button onClick={() => setShowForm(true)} className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-teal-400" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}>
              Add Address
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {addresses.map(a => {
              const LabelIcon = LABEL_ICONS[a.label] || MapPin;
              return (
                <div key={a.id} className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${a.is_default ? 'rgba(20,184,166,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: a.is_default ? 'rgba(20,184,166,0.12)' : 'rgba(255,255,255,0.05)' }}>
                    <LabelIcon className="w-4 h-4" style={{ color: a.is_default ? '#14b8a6' : 'rgba(255,255,255,0.3)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white/80 text-sm font-semibold capitalize">{a.label}</p>
                      {a.is_default && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold text-teal-300 bg-teal-500/15">Default</span>}
                    </div>
                    <p className="text-white/30 text-xs mt-0.5 line-clamp-2">{a.full_address}</p>
                    {a.landmark && <p className="text-white/15 text-[10px] mt-0.5">Near {a.landmark}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {!a.is_default && (
                      <button onClick={() => setDefault(a.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }} data-testid={`set-default-${a.id}`}>
                        <Star className="w-3 h-3 text-white/15" />
                      </button>
                    )}
                    <button onClick={() => deleteAddress(a.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }} data-testid={`delete-addr-${a.id}`}>
                      <Trash2 className="w-3 h-3 text-red-400/40" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Address Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto" style={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.08)' }} data-testid="address-form-modal">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Add Address</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
            {/* Label picker */}
            <div className="flex gap-2 mb-4">
              {['home', 'work', 'other'].map(l => (
                <button key={l} onClick={() => setForm(f => ({ ...f, label: l }))}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${form.label === l ? 'text-teal-300' : 'text-white/30'}`}
                  style={form.label === l ? { background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.3)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {l}
                </button>
              ))}
            </div>
            {/* Fields */}
            {[
              { key: 'full_address', label: 'Full Address', placeholder: 'House no, street, area' },
              { key: 'landmark', label: 'Landmark', placeholder: 'Near...' },
              { key: 'pincode', label: 'PIN Code', placeholder: '480001' },
              { key: 'city', label: 'City', placeholder: 'City' },
              { key: 'state', label: 'State', placeholder: 'State' },
            ].map(f => (
              <div key={f.key} className="mb-3">
                <label className="text-white/25 text-[10px] uppercase tracking-wide mb-1 block">{f.label}</label>
                <input value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 bg-transparent text-white text-sm outline-none placeholder:text-white/12"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                  placeholder={f.placeholder} data-testid={`addr-${f.key}`} />
              </div>
            ))}
            <label className="flex items-center gap-2 mb-5 cursor-pointer">
              <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} className="accent-teal-500" />
              <span className="text-white/40 text-xs">Set as default address</span>
            </label>
            <button onClick={saveAddress} className="w-full py-3 rounded-2xl text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }} data-testid="save-address-btn">
              Save Address
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedAddresses;
