import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, Share2, Heart, Phone, Shield, Pill, AlertTriangle, Save, User, Droplets, ChevronDown, ChevronUp, Stethoscope, Scissors, Activity, Baby, FileText, Plus, X, Maximize2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const APP_URL = typeof window !== 'undefined' ? window.location.origin : '';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Other'];
const COMMON_CONDITIONS = ['Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Thyroid', 'Epilepsy', 'COPD', 'Kidney Disease'];
const COMMON_IMPLANTS = ['Pacemaker', 'Stent', 'Artificial Joint', 'Cochlear Implant', 'ICD', 'Insulin Pump'];

export default function EmergencyHealthCard() {
  const navigate = useNavigate();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({});
  const [showFullQR, setShowFullQR] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [hasChanges, setHasChanges] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const phone = user.phone || user.mobile || '8108888330';

  const fetchCard = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/emergency-card/${phone}`);
      if (res.data.success) {
        setCard(res.data.card);
        setEditData(res.data.card);
      }
    } catch (err) {
      toast.error('Failed to load health card');
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => { fetchCard(); }, [fetchCard]);

  const updateField = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateNested = (parent, field, value) => {
    setEditData(prev => ({ ...prev, [parent]: { ...(prev[parent] || {}), [field]: value } }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/api/emergency-card/${phone}`, editData);
      if (res.data.success) {
        setCard(res.data.card);
        setEditData(res.data.card);
        setHasChanges(false);
        toast.success('Health card saved!');
      }
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const scanUrl = card?.card_id ? `${APP_URL}/emergency-scan/${card.card_id}` : '';

  const handleShare = async () => {
    const d = editData;
    const allAllergies = [...(d.allergies?.drug || []), ...(d.allergies?.food || []), ...(d.allergies?.other || [])];
    const text = `EMERGENCY HEALTH CARD\n${'='.repeat(30)}\nName: ${d.full_name || d.name || ''}\nAge: ${d.age || ''} | Gender: ${d.gender || ''}\nBlood Group: ${d.blood_group || ''}\n\nAllergies: ${allAllergies.join(', ') || 'None known'}\nMedications: ${(d.current_medications || []).map(m => typeof m === 'string' ? m : `${m.name} ${m.dose}`).join(', ') || 'None'}\nConditions: ${(d.chronic_conditions || []).join(', ') || 'None'}\nImplants: ${(d.implant_devices || []).join(', ') || 'None'}\n\nDoctor: ${d.treating_doctor?.name || ''} (${d.treating_doctor?.phone || ''})\nEmergency: ${d.emergency_contact?.name || ''} (${d.emergency_contact?.phone || ''})\n\nScan QR: ${scanUrl}`;
    if (navigator.share) {
      await navigator.share({ title: 'Emergency Health Card', text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    }
  };

  // Full-screen QR overlay
  if (showFullQR) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8" onClick={() => setShowFullQR(false)} data-testid="ehc-fullscreen-qr">
        <p className="text-red-600 text-xs font-bold uppercase tracking-[0.2em] mb-4">Scan in Emergency</p>
        <QRCodeSVG value={scanUrl} size={280} level="H" includeMargin />
        <p className="text-black text-lg font-bold mt-4 font-heading">{editData.full_name || editData.name || 'Patient'}</p>
        <p className="text-gray-500 text-sm">{editData.blood_group && `Blood: ${editData.blood_group}`} {editData.age && `| Age: ${editData.age}`}</p>
        <p className="text-gray-400 text-xs mt-6">Tap anywhere to close</p>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen bg-[#050510] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
    </div>
  );

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'contacts', label: 'Emergency Contacts', icon: Phone },
    { id: 'medical', label: 'Medical History', icon: Activity },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'allergies', label: 'Allergies', icon: AlertTriangle },
    { id: 'doctor', label: 'Treating Doctor', icon: Stethoscope },
    { id: 'other', label: 'Other Details', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#050510] text-white pb-32" data-testid="emergency-health-card">
      {/* Header */}
      <div className="glass-crystal sticky top-0 z-50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/5 btn-press" data-testid="ehc-back-btn">
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-bold font-heading">Emergency Health Card</h1>
          <p className="text-[10px] text-white/40">Tap QR to expand full-screen</p>
        </div>
        <button onClick={handleShare} className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/5 btn-press" data-testid="ehc-share-btn">
          <Share2 className="w-4 h-4 text-white/60" />
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* QR Card — Red Emergency Theme */}
        <div className="relative rounded-[20px] overflow-hidden holo-shimmer" style={{
          background: 'linear-gradient(145deg, #1a0505, #2d0a0a, #1a0505)',
          border: '1.5px solid rgba(239,68,68,0.25)',
          boxShadow: '0 8px 32px rgba(239,68,68,0.15)',
        }} data-testid="ehc-main-card">
          <div className="flex items-center gap-3 px-5 pt-4 pb-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <Heart className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-[9px] uppercase tracking-[0.15em] text-red-500/50 font-bold">Emergency Health Card</p>
              <p className="text-base font-bold font-heading text-white">{editData.full_name || editData.name || 'Set Your Name'}</p>
            </div>
          </div>

          {/* QR + Key Info */}
          <div className="flex items-center gap-4 px-5 pb-4">
            <button onClick={() => setShowFullQR(true)} className="relative group" data-testid="ehc-qr-expand">
              <div className="bg-white rounded-xl p-2.5">
                <QRCodeSVG value={scanUrl || 'placeholder'} size={80} level="M" />
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
                <Maximize2 className="w-5 h-5 text-white" />
              </div>
              <p className="text-[8px] text-red-500/40 text-center mt-1 uppercase tracking-wider">Tap to expand</p>
            </button>
            
            <div className="flex-1 grid grid-cols-2 gap-2">
              <InfoChip icon={<Droplets className="w-3 h-3" />} label="Blood" value={editData.blood_group || '—'} color="red" />
              <InfoChip icon={<User className="w-3 h-3" />} label="Age" value={editData.age || '—'} />
              <InfoChip icon={<User className="w-3 h-3" />} label="Gender" value={editData.gender || '—'} />
              <InfoChip icon={<Phone className="w-3 h-3" />} label="Phone" value={phone?.slice(-4) || '—'} />
            </div>
          </div>
        </div>

        {/* Form Sections */}
        {sections.map(section => (
          <FormSection
            key={section.id}
            id={section.id}
            label={section.label}
            icon={<section.icon className="w-4 h-4" />}
            isOpen={activeSection === section.id}
            onToggle={() => setActiveSection(activeSection === section.id ? '' : section.id)}
          >
            {section.id === 'basic' && (
              <div className="space-y-3">
                <FormInput label="Full Name" value={editData.full_name || editData.name || ''} onChange={v => updateField('full_name', v)} placeholder="Enter full name" />
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="Age" value={editData.age || ''} onChange={v => updateField('age', v)} placeholder="Age" type="number" />
                  <FormInput label="Date of Birth" value={editData.dob || ''} onChange={v => updateField('dob', v)} placeholder="DD/MM/YYYY" />
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-bold">Gender</p>
                  <div className="flex gap-2">
                    {GENDERS.map(g => (
                      <button key={g} onClick={() => updateField('gender', g)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all btn-press ${editData.gender === g ? 'bg-teal-500 text-white' : 'bg-white/5 text-white/40'}`}>{g}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-bold">Blood Group</p>
                  <div className="flex flex-wrap gap-2">
                    {BLOOD_GROUPS.map(bg => (
                      <button key={bg} onClick={() => updateField('blood_group', bg)} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all btn-press ${editData.blood_group === bg ? 'bg-red-500 text-white' : 'bg-white/5 text-white/40'}`}>{bg}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {section.id === 'contacts' && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-bold">Primary Emergency Contact</p>
                  <div className="space-y-2">
                    <FormInput label="Name" value={editData.emergency_contact?.name || ''} onChange={v => updateNested('emergency_contact', 'name', v)} placeholder="Contact name" />
                    <div className="grid grid-cols-2 gap-2">
                      <FormInput label="Relation" value={editData.emergency_contact?.relation || ''} onChange={v => updateNested('emergency_contact', 'relation', v)} placeholder="e.g., Spouse" />
                      <FormInput label="Phone" value={editData.emergency_contact?.phone || ''} onChange={v => updateNested('emergency_contact', 'phone', v)} placeholder="+91..." type="tel" />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-bold">Secondary Contact (Optional)</p>
                  <div className="space-y-2">
                    <FormInput label="Name" value={editData.secondary_contact?.name || ''} onChange={v => updateNested('secondary_contact', 'name', v)} placeholder="Contact name" />
                    <div className="grid grid-cols-2 gap-2">
                      <FormInput label="Relation" value={editData.secondary_contact?.relation || ''} onChange={v => updateNested('secondary_contact', 'relation', v)} placeholder="e.g., Parent" />
                      <FormInput label="Phone" value={editData.secondary_contact?.phone || ''} onChange={v => updateNested('secondary_contact', 'phone', v)} placeholder="+91..." type="tel" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {section.id === 'medical' && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-bold">Chronic Conditions</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {COMMON_CONDITIONS.map(c => {
                      const active = (editData.chronic_conditions || []).includes(c);
                      return (
                        <button key={c} onClick={() => {
                          const curr = editData.chronic_conditions || [];
                          updateField('chronic_conditions', active ? curr.filter(x => x !== c) : [...curr, c]);
                        }} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all btn-press ${active ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-white/30'}`}>{c}</button>
                      );
                    })}
                  </div>
                  <TagInput value={editData.chronic_conditions || []} onChange={v => updateField('chronic_conditions', v)} placeholder="Add custom condition..." />
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-bold">Previous Surgeries</p>
                  <TagInput value={editData.previous_surgeries || []} onChange={v => updateField('previous_surgeries', v)} placeholder="e.g., Appendectomy 2020" />
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-bold">Implant Devices</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {COMMON_IMPLANTS.map(d => {
                      const active = (editData.implant_devices || []).includes(d);
                      return (
                        <button key={d} onClick={() => {
                          const curr = editData.implant_devices || [];
                          updateField('implant_devices', active ? curr.filter(x => x !== d) : [...curr, d]);
                        }} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all btn-press ${active ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-white/30'}`}>{d}</button>
                      );
                    })}
                  </div>
                  <TagInput value={editData.implant_devices || []} onChange={v => updateField('implant_devices', v)} placeholder="Add custom implant..." />
                </div>
              </div>
            )}

            {section.id === 'medications' && (
              <div className="space-y-3">
                {(editData.current_medications || []).map((med, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <FormInput label="Medicine" value={typeof med === 'string' ? med : med.name || ''} onChange={v => {
                        const meds = [...(editData.current_medications || [])];
                        meds[i] = typeof med === 'string' ? v : { ...med, name: v };
                        updateField('current_medications', meds);
                      }} placeholder="Name" />
                      {typeof med !== 'string' && <>
                        <FormInput label="Dose" value={med.dose || ''} onChange={v => {
                          const meds = [...(editData.current_medications || [])];
                          meds[i] = { ...med, dose: v };
                          updateField('current_medications', meds);
                        }} placeholder="e.g., 500mg" />
                        <FormInput label="Frequency" value={med.frequency || ''} onChange={v => {
                          const meds = [...(editData.current_medications || [])];
                          meds[i] = { ...med, frequency: v };
                          updateField('current_medications', meds);
                        }} placeholder="e.g., BD" />
                      </>}
                    </div>
                    <button onClick={() => {
                      const meds = (editData.current_medications || []).filter((_, idx) => idx !== i);
                      updateField('current_medications', meds);
                    }} className="mt-5 w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center btn-press">
                      <X className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                ))}
                <button onClick={() => {
                  const meds = [...(editData.current_medications || []), { name: '', dose: '', frequency: '' }];
                  updateField('current_medications', meds);
                }} className="w-full py-2.5 rounded-xl border border-dashed border-white/10 text-xs text-white/30 flex items-center justify-center gap-1.5 btn-press hover:border-white/20 hover:text-white/50">
                  <Plus className="w-3 h-3" /> Add Medication
                </button>
              </div>
            )}

            {section.id === 'allergies' && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-amber-400/60 uppercase tracking-wider mb-2 font-bold">Drug Allergies</p>
                  <TagInput value={editData.allergies?.drug || []} onChange={v => updateNested('allergies', 'drug', v)} placeholder="e.g., Penicillin, Sulfa" />
                </div>
                <div>
                  <p className="text-[10px] text-amber-400/60 uppercase tracking-wider mb-2 font-bold">Food Allergies</p>
                  <TagInput value={editData.allergies?.food || []} onChange={v => updateNested('allergies', 'food', v)} placeholder="e.g., Peanuts, Shellfish" />
                </div>
                <div>
                  <p className="text-[10px] text-amber-400/60 uppercase tracking-wider mb-2 font-bold">Other Allergies</p>
                  <TagInput value={editData.allergies?.other || []} onChange={v => updateNested('allergies', 'other', v)} placeholder="e.g., Latex, Dust" />
                </div>
              </div>
            )}

            {section.id === 'doctor' && (
              <div className="space-y-3">
                <FormInput label="Doctor Name" value={editData.treating_doctor?.name || ''} onChange={v => updateNested('treating_doctor', 'name', v)} placeholder="Dr. Name" />
                <FormInput label="Clinic / Hospital" value={editData.treating_doctor?.clinic || ''} onChange={v => updateNested('treating_doctor', 'clinic', v)} placeholder="Clinic name" />
                <FormInput label="Doctor Phone" value={editData.treating_doctor?.phone || ''} onChange={v => updateNested('treating_doctor', 'phone', v)} placeholder="+91..." type="tel" />
              </div>
            )}

            {section.id === 'other' && (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-bold">Pregnancy Status</p>
                  <div className="flex gap-2">
                    {['Not Applicable', 'Not Pregnant', 'Pregnant', 'Breastfeeding'].map(s => (
                      <button key={s} onClick={() => updateField('pregnancy_status', s)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium btn-press ${editData.pregnancy_status === s ? 'bg-pink-500/20 text-pink-300' : 'bg-white/5 text-white/30'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <FormInput label="Insurance ID" value={editData.insurance_id || ''} onChange={v => updateField('insurance_id', v)} placeholder="Insurance policy number" />
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-bold">Special Instructions</p>
                  <textarea value={editData.special_instructions || ''} onChange={e => updateField('special_instructions', e.target.value)} placeholder="e.g., Do not administer blood products (Jehovah's Witness)" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 resize-none h-20" />
                </div>
              </div>
            )}
          </FormSection>
        ))}

        {/* Save Button */}
        {hasChanges && (
          <button onClick={handleSave} disabled={saving} className="w-full py-4 rounded-2xl bg-red-500 text-white font-bold flex items-center justify-center gap-2 btn-press animate-glow-pulse sticky bottom-24 z-40" data-testid="ehc-save-btn">
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-5 h-5" /> Save Emergency Card</>}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function InfoChip({ icon, label, value, color }) {
  return (
    <div className="rounded-lg p-2 text-center" style={{ background: color === 'red' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)' }}>
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <span className={color === 'red' ? 'text-red-400' : 'text-white/40'}>{icon}</span>
        <span className="text-[8px] text-white/25 uppercase">{label}</span>
      </div>
      <p className={`text-xs font-bold ${color === 'red' ? 'text-red-400' : 'text-white/70'}`}>{value}</p>
    </div>
  );
}

function FormSection({ id, label, icon, isOpen, onToggle, children }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} data-testid={`ehc-section-${id}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 btn-press">
        <span className="text-white/40">{icon}</span>
        <span className="text-sm font-semibold text-white/80 flex-1 text-left">{label}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-white/20" /> : <ChevronDown className="w-4 h-4 text-white/20" />}
      </button>
      {isOpen && <div className="px-4 pb-4 animate-scale-in">{children}</div>}
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      {label && <p className="text-[10px] text-white/25 mb-1 font-medium">{label}</p>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/15 outline-none focus:border-white/20 transition-colors" />
    </div>
  );
}

function TagInput({ value, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const addTag = () => {
    if (input.trim() && !value.includes(input.trim())) {
      onChange([...value, input.trim()]);
      setInput('');
    }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((tag, i) => (
          <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-xs text-white/60">
            {tag}
            <button onClick={() => onChange(value.filter((_, idx) => idx !== i))} className="text-white/20 hover:text-red-400"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder={placeholder}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/15 outline-none focus:border-white/20" />
        <button onClick={addTag} className="px-3 rounded-xl bg-white/5 text-white/30 text-xs btn-press hover:text-white/60">Add</button>
      </div>
    </div>
  );
}
