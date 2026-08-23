import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Plus, Heart, Calendar, FileText, Activity, Loader2, User,
  ChevronRight, Shield, AlertTriangle, Pill, Stethoscope, X, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import ServiceHeader from '@/components/ServiceHeader';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const relationColors = {
  self: '#14B8A6', spouse: '#F472B6', child: '#60A5FA', parent: '#A78BFA', other: '#F59E0B',
};
const recordIcons = {
  allergy: AlertTriangle, condition: Activity, medication: Pill, surgery: Stethoscope, note: FileText,
};
const recordColors = {
  allergy: '#F43F5E', condition: '#F59E0B', medication: '#14B8A6', surgery: '#A78BFA', note: '#64748B',
};

const FamilyHealthPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', relation: 'spouse', age: '', phone: '', blood_group: '' });
  const [selectedMember, setSelectedMember] = useState(null);
  const [vaultRecords, setVaultRecords] = useState([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [recordForm, setRecordForm] = useState({ record_type: 'allergy', title: '', details: '', severity: 'mild' });

  const phone = user?.phone || localStorage.getItem('guestMobile') || localStorage.getItem('userPhone');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchMembers = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/api/family/members/${phone}`, { headers });
      const data = await res.json();
      setMembers(data.members || data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [phone]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const addMember = async () => {
    if (!form.name || !form.relation) { toast.error('Name and relation required'); return; }
    try {
      const res = await fetch(`${API}/api/family/members?phone=${phone}`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, relation: form.relation, age: form.age ? parseInt(form.age) : null, phone: form.phone || null, blood_group: form.blood_group || null }),
      });
      const data = await res.json();
      if (data.success || data.id) {
        toast.success('Family member added');
        setShowAdd(false);
        setForm({ name: '', relation: 'spouse', age: '', phone: '', blood_group: '' });
        fetchMembers();
      }
    } catch { toast.error('Failed to add member'); }
  };

  const openVault = async (member) => {
    setSelectedMember(member);
    setVaultLoading(true);
    try {
      const memberId = member.id || member.name;
      const res = await fetch(`${API}/api/family-vault/records/${memberId}`);
      const data = await res.json();
      setVaultRecords(data.records || []);
    } catch { setVaultRecords([]); }
    setVaultLoading(false);
  };

  const addRecord = async () => {
    if (!recordForm.title) { toast.error('Title required'); return; }
    try {
      const memberId = selectedMember.id || selectedMember.name;
      const res = await fetch(`${API}/api/family-vault/records`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...recordForm, member_id: memberId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Record added');
        setShowAddRecord(false);
        setRecordForm({ record_type: 'allergy', title: '', details: '', severity: 'mild' });
        openVault(selectedMember);
      }
    } catch { toast.error('Failed to add record'); }
  };

  const deleteRecord = async (recordId) => {
    try {
      await fetch(`${API}/api/family-vault/records/${recordId}`, { method: 'DELETE' });
      toast.success('Record deleted');
      openVault(selectedMember);
    } catch { toast.error('Failed to delete'); }
  };

  if (!phone) {
    return (
      <div className="min-h-screen bg-[#0a0b14]">
        <ServiceHeader />
        <main className="max-w-lg mx-auto px-4 py-6 pb-28 text-center">
          <Users className="w-16 h-16 text-violet-400/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Family Health Vault</h2>
          <p className="text-sm text-white/40 mb-6">Login to manage family health profiles</p>
          <Button onClick={() => navigate('/login')} className="bg-violet-500 hover:bg-violet-400 text-white rounded-xl" data-testid="login-btn">Login</Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ──── Vault Detail View ────
  if (selectedMember) {
    const color = relationColors[selectedMember.relation] || relationColors.other;
    return (
      <div className="min-h-screen bg-[#0a0b14]" data-testid="vault-detail">
        <ServiceHeader />
        <main className="max-w-lg mx-auto px-4 py-5 pb-28">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setSelectedMember(null)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5" data-testid="vault-back">
              <ArrowLeft className="w-5 h-5 text-white/70" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>{selectedMember.name}</h1>
              <p className="text-xs text-white/40 capitalize">{selectedMember.relation} {selectedMember.age ? `· ${selectedMember.age} yrs` : ''} {selectedMember.blood_group ? `· ${selectedMember.blood_group}` : ''}</p>
            </div>
            <button onClick={() => setShowAddRecord(true)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${color}15` }} data-testid="add-record-btn">
              <Plus className="w-5 h-5" style={{ color }} />
            </button>
          </div>

          {/* Vault Stats */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: 'Allergies', count: vaultRecords.filter(r => r.record_type === 'allergy').length, color: recordColors.allergy },
              { label: 'Conditions', count: vaultRecords.filter(r => r.record_type === 'condition').length, color: recordColors.condition },
              { label: 'Medications', count: vaultRecords.filter(r => r.record_type === 'medication').length, color: recordColors.medication },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: `${s.color}10`, border: `1px solid ${s.color}15` }}>
                <p className="text-lg font-bold text-white">{s.count}</p>
                <p className="text-[10px] text-white/40">{s.label}</p>
              </div>
            ))}
          </div>

          {vaultLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-violet-400 animate-spin" /></div>
          ) : vaultRecords.length === 0 ? (
            <div className="text-center py-10">
              <Shield className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30">No health records yet</p>
              <p className="text-xs text-white/15 mt-1">Add allergies, conditions, or medications</p>
              <Button onClick={() => setShowAddRecord(true)} variant="outline" className="mt-4 rounded-xl border-white/10 text-white/50 bg-transparent hover:bg-white/5" data-testid="add-first-record-btn">
                <Plus className="w-4 h-4 mr-2" /> Add Health Record
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {vaultRecords.map((rec, i) => {
                const Icon = recordIcons[rec.record_type] || FileText;
                const rColor = recordColors[rec.record_type] || '#64748B';
                return (
                  <div key={rec.id || i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5" data-testid={`record-${i}`}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${rColor}15` }}>
                      <Icon className="w-4 h-4" style={{ color: rColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{rec.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize" style={{ background: `${rColor}12`, color: rColor }}>{rec.record_type}</span>
                        {rec.severity && <span className="text-[10px] text-white/25 capitalize">{rec.severity}</span>}
                      </div>
                      {rec.details && <p className="text-[11px] text-white/30 mt-1 truncate">{rec.details}</p>}
                    </div>
                    <button onClick={() => deleteRecord(rec.id)} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 hover:bg-red-500/10" data-testid={`delete-record-${i}`}>
                      <Trash2 className="w-3.5 h-3.5 text-white/20 hover:text-red-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            {[
              { label: 'Book Appointment', icon: Calendar, path: `/diagyn?member=${selectedMember.name}`, color: '#14B8A6' },
              { label: 'View Reports', icon: FileText, path: '/lab-reports', color: '#06B6D4' },
              { label: 'Body Map', icon: Activity, path: '/organ-viewer', color: '#A78BFA' },
              { label: 'Symptom Check', icon: Heart, path: '/symptom-checker', color: '#F43F5E' },
            ].map(a => (
              <button key={a.label} onClick={() => navigate(a.path)} className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 text-left active:scale-[0.97] transition-all" data-testid={`vault-action-${a.label.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${a.color}15` }}>
                  <a.icon className="w-4 h-4" style={{ color: a.color }} />
                </div>
                <span className="text-xs font-semibold text-white">{a.label}</span>
              </button>
            ))}
          </div>

          {/* Add Record Dialog */}
          {showAddRecord && (
            <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowAddRecord(false)}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <div className="relative w-full max-w-lg bg-[#13141f] rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()} data-testid="add-record-dialog">
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
                <h3 className="text-lg font-bold text-white mb-4">Add Health Record</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Record Type</label>
                    <div className="flex gap-2 flex-wrap">
                      {['allergy', 'condition', 'medication', 'surgery', 'note'].map(t => (
                        <button key={t} onClick={() => setRecordForm(f => ({ ...f, record_type: t }))}
                          className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all capitalize ${recordForm.record_type === t ? 'text-white border' : 'bg-white/5 text-white/40 border border-white/5'}`}
                          style={recordForm.record_type === t ? { background: `${recordColors[t]}20`, borderColor: `${recordColors[t]}40`, color: recordColors[t] } : {}}
                          data-testid={`type-${t}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Title</label>
                    <Input value={recordForm.title} onChange={e => setRecordForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Penicillin allergy" className="bg-white/5 border-white/10 text-white rounded-xl" data-testid="input-record-title" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Details (optional)</label>
                    <Input value={recordForm.details} onChange={e => setRecordForm(f => ({ ...f, details: e.target.value }))} placeholder="Additional notes" className="bg-white/5 border-white/10 text-white rounded-xl" data-testid="input-record-details" />
                  </div>
                  {(recordForm.record_type === 'allergy' || recordForm.record_type === 'condition') && (
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Severity</label>
                      <div className="flex gap-2">
                        {['mild', 'moderate', 'severe'].map(s => (
                          <button key={s} onClick={() => setRecordForm(f => ({ ...f, severity: s }))}
                            className={`flex-1 py-2 text-xs font-semibold rounded-xl capitalize transition-all ${recordForm.severity === s ? 'bg-white/10 text-white border border-white/20' : 'bg-white/5 text-white/30 border border-white/5'}`}
                            data-testid={`severity-${s}`}>{s}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button onClick={addRecord} className="w-full h-11 bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-xl mt-2" data-testid="save-record-btn">
                    Save Record
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    );
  }

  // ──── Members List View ────
  return (
    <div className="min-h-screen bg-[#0a0b14]" data-testid="family-health-page">
      <ServiceHeader />
      <main className="max-w-lg mx-auto px-4 py-6 pb-28">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5" data-testid="family-back">
              <ArrowLeft className="w-5 h-5 text-white/70" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Family Health Vault</h1>
              <p className="text-xs text-white/40">Health records for your loved ones</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} className="w-10 h-10 rounded-full bg-violet-500/15 flex items-center justify-center" data-testid="add-member-btn">
            <Plus className="w-5 h-5 text-violet-400" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-4 rounded-2xl mb-3" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.08))', border: '1px solid rgba(139,92,246,0.15)' }}>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Family Health Vault</p>
              <p className="text-xs text-white/40 mt-1">Store allergies, conditions, medications & medical history for each family member. Tap a member to manage their vault.</p>
            </div>
          </div>
        </div>

        {/* Cross-link to Health Insights */}
        <button
          onClick={() => navigate('/health-insights')}
          className="w-full flex items-center gap-3 p-3 rounded-xl mb-5 active:scale-[0.98] transition-all"
          style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.15)' }}
          data-testid="health-insights-link"
        >
          <Activity className="w-5 h-5 text-purple-400" />
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold text-white">View Health Insights & Family Hub</p>
            <p className="text-[10px] text-white/30">Leaderboards, metrics & AI assistant</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/20" />
        </button>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2"><div className="h-4 w-24 bg-white/10 rounded" /><div className="h-3 w-32 bg-white/5 rounded" /></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Self card */}
            <button onClick={() => openVault({ id: 'self', name: user?.name || 'You', relation: 'self', phone })} className="w-full p-4 rounded-2xl text-left active:scale-[0.98] transition-all" style={{ background: `${relationColors.self}10`, border: `1px solid ${relationColors.self}20` }} data-testid="self-vault-btn">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${relationColors.self}20` }}>
                  <User className="w-6 h-6" style={{ color: relationColors.self }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{user?.name || user?.username || 'You'}</p>
                  <p className="text-[11px] text-white/40">Self · Tap to view health vault</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/20" />
              </div>
            </button>

            {/* Family members */}
            {members.length === 0 ? (
              <div className="text-center py-6">
                <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-sm text-white/30">No family members added yet</p>
                <Button onClick={() => setShowAdd(true)} variant="outline" className="mt-3 rounded-xl border-white/10 text-white/50 bg-transparent hover:bg-white/5" data-testid="add-first-member-btn">Add Member</Button>
              </div>
            ) : members.map((m, idx) => {
              const color = relationColors[m.relation] || relationColors.other;
              return (
                <button key={m.id || idx} onClick={() => openVault(m)} className="w-full p-4 rounded-2xl text-left active:scale-[0.98] transition-all" style={{ background: `${color}08`, border: `1px solid ${color}15` }} data-testid={`member-${idx}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${color}20` }}>
                      <User className="w-6 h-6" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{m.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: `${color}15`, color }}>{m.relation}</span>
                        {m.age && <span className="text-[10px] text-white/30">{m.age} yrs</span>}
                        {m.blood_group && <span className="text-[10px] text-white/30">{m.blood_group}</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/20" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Add Member Dialog */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowAdd(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg bg-[#13141f] rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()} data-testid="add-member-dialog">
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
              <h3 className="text-lg font-bold text-white mb-4">Add Family Member</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Name</label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" className="bg-white/5 border-white/10 text-white rounded-xl" data-testid="input-member-name" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Relation</label>
                  <div className="flex gap-2 flex-wrap">
                    {['spouse', 'child', 'parent', 'other'].map(r => (
                      <button key={r} onClick={() => setForm(f => ({ ...f, relation: r }))}
                        className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all capitalize ${form.relation === r ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-white/5 text-white/40 border border-white/5'}`}
                        data-testid={`relation-${r}`}>{r}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Age</label>
                    <Input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="Age" className="bg-white/5 border-white/10 text-white rounded-xl" data-testid="input-member-age" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Blood Group</label>
                    <Input value={form.blood_group} onChange={e => setForm(f => ({ ...f, blood_group: e.target.value }))} placeholder="e.g. O+" className="bg-white/5 border-white/10 text-white rounded-xl" data-testid="input-blood-group" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Phone (optional)</label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" className="bg-white/5 border-white/10 text-white rounded-xl" data-testid="input-member-phone" />
                </div>
                <Button onClick={addMember} className="w-full h-11 bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-xl mt-2" data-testid="save-member-btn">
                  <Users className="w-4 h-4 mr-2" /> Add Member
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default FamilyHealthPage;
