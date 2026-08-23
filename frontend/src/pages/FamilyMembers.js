import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Trash2, X, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const FamilyMembers = () => {
  const navigate = useNavigate();
  const phone = localStorage.getItem('userPhone') || localStorage.getItem('guestMobile') || '';
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', relation: 'spouse', age: '', gender: 'female', phone: '', blood_group: '' });

  const fetchMembers = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    try {
      const res = await axios.get(`${API}/family/members/${phone}`);
      setMembers(res.data.members || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [phone]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const saveMember = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    try {
      await axios.post(`${API}/family/members?phone=${phone}`, form);
      toast.success('Family member added!');
      setShowForm(false);
      setForm({ name: '', relation: 'spouse', age: '', gender: 'female', phone: '', blood_group: '' });
      fetchMembers();
    } catch { toast.error('Failed to add'); }
  };

  const deleteMember = async (id) => {
    try {
      await axios.delete(`${API}/family/members/${id}`);
      toast.success('Removed');
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch { toast.error('Failed'); }
  };

  const RELATION_COLORS = { self: '#14b8a6', spouse: '#ec4899', child: '#f59e0b', parent: '#8b5cf6', sibling: '#3b82f6', other: '#6b7280' };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#050510' }} data-testid="family-members-page">
      <div className="sticky top-0 z-50 px-4 pt-4 pb-3" style={{ background: 'rgba(5,5,16,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <h1 className="flex-1 text-base font-semibold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Family Members</h1>
          <button onClick={() => setShowForm(true)} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }} data-testid="add-family-btn">
            <Plus className="w-4 h-4 text-purple-400" />
          </button>
        </div>
      </div>

      <div className="px-4 mt-3">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/20" /></div>
        ) : members.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-8 h-8 text-white/8 mx-auto mb-2" />
            <p className="text-white/20 text-sm">No family members added</p>
            <button onClick={() => setShowForm(true)} className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-purple-400" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
              Add Member
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {members.map(m => {
              const color = RELATION_COLORS[m.relation] || '#6b7280';
              return (
                <div key={m.id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                    <User className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm font-semibold">{m.name}</p>
                    <p className="text-white/25 text-xs capitalize">{m.relation}{m.age ? ` · ${m.age} yrs` : ''}{m.blood_group ? ` · ${m.blood_group}` : ''}</p>
                  </div>
                  <button onClick={() => deleteMember(m.id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400/40" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto" style={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.08)' }} data-testid="family-form-modal">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Add Family Member</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
            {/* Relation picker */}
            <label className="text-white/25 text-[10px] uppercase tracking-wide mb-2 block">Relation</label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['self', 'spouse', 'child', 'parent', 'sibling', 'other'].map(r => (
                <button key={r} onClick={() => setForm(f => ({ ...f, relation: r }))}
                  className={`py-2 rounded-xl text-xs font-bold capitalize ${form.relation === r ? 'text-purple-300' : 'text-white/30'}`}
                  style={form.relation === r ? { background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {r}
                </button>
              ))}
            </div>
            {/* Fields */}
            {[
              { key: 'name', label: 'Name', placeholder: 'Full name', type: 'text' },
              { key: 'age', label: 'Age', placeholder: 'Age', type: 'number' },
              { key: 'phone', label: 'Phone', placeholder: '10-digit phone', type: 'tel' },
              { key: 'blood_group', label: 'Blood Group', placeholder: 'A+, B-, O+ etc.', type: 'text' },
            ].map(f => (
              <div key={f.key} className="mb-3">
                <label className="text-white/25 text-[10px] uppercase tracking-wide mb-1 block">{f.label}</label>
                <input value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 bg-transparent text-white text-sm outline-none placeholder:text-white/12"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                  type={f.type} placeholder={f.placeholder} data-testid={`fam-${f.key}`} />
              </div>
            ))}
            {/* Gender */}
            <label className="text-white/25 text-[10px] uppercase tracking-wide mb-2 block">Gender</label>
            <div className="flex gap-2 mb-5">
              {['male', 'female'].map(g => (
                <button key={g} onClick={() => setForm(f => ({ ...f, gender: g }))}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold capitalize ${form.gender === g ? 'text-purple-300' : 'text-white/30'}`}
                  style={form.gender === g ? { background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {g}
                </button>
              ))}
            </div>
            <button onClick={saveMember} className="w-full py-3 rounded-2xl text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }} data-testid="save-family-btn">
              Add Member
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyMembers;
