import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Plus, Clock, Shield, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  FileText, User, Loader2, Star, RefreshCw, Send
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('staffToken')}` } });

const SHIFTS = [
  { key: 'morning', label: 'Morning', time: '7 AM - 1 PM', color: '#f59e0b', bg: '#f59e0b20' },
  { key: 'afternoon', label: 'Afternoon', time: '1 PM - 7 PM', color: '#f97316', bg: '#f9731620' },
  { key: 'evening', label: 'Evening', time: '7 PM - 11 PM', color: '#8b5cf6', bg: '#8b5cf620' },
  { key: 'night', label: 'Night', time: '11 PM - 7 AM', color: '#3b82f6', bg: '#3b82f620' }
];

const PRIORITY_COLORS = { high: 'text-red-400 bg-red-500/20', medium: 'text-amber-400 bg-amber-500/20', low: 'text-green-400 bg-green-500/20' };

const HandoffNotes = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedNote, setExpandedNote] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [latestNote, setLatestNote] = useState(null);
  const [stats, setStats] = useState(null);

  // Form state
  const [form, setForm] = useState({
    shift: 'morning',
    summary: '',
    critical_patients: [],
    pending_items: [],
    medications_changed: '',
    equipment_issues: '',
    staffing_notes: '',
    clinic: 'diagyn'
  });
  const [newCritical, setNewCritical] = useState({ name: '', condition: '', notes: '', priority: 'high' });
  const [newPending, setNewPending] = useState({ description: '', priority: 'normal', due_by: '' });

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const [notesRes, latestRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/handoff-notes?days=7`, getAuth()),
        axios.get(`${API}/api/handoff-notes/latest`, getAuth()),
        axios.get(`${API}/api/handoff-notes/stats?days=30`, getAuth())
      ]);
      setNotes(notesRes.data.notes || []);
      setLatestNote(latestRes.data.note);
      setStats(statsRes.data);
    } catch (err) {
      toast.error('Failed to load handoff notes');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const addCriticalPatient = () => {
    if (!newCritical.name || !newCritical.condition) { toast.error('Name and condition required'); return; }
    setForm(f => ({ ...f, critical_patients: [...f.critical_patients, { ...newCritical }] }));
    setNewCritical({ name: '', condition: '', notes: '', priority: 'high' });
  };

  const addPendingItem = () => {
    if (!newPending.description) { toast.error('Description required'); return; }
    setForm(f => ({ ...f, pending_items: [...f.pending_items, { ...newPending }] }));
    setNewPending({ description: '', priority: 'normal', due_by: '' });
  };

  const handleSubmit = async () => {
    if (!form.summary || form.summary.length < 5) { toast.error('Summary must be at least 5 characters'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/handoff-notes`, form, getAuth());
      toast.success('Handoff note created successfully');
      setShowCreateForm(false);
      setForm({ shift: 'morning', summary: '', critical_patients: [], pending_items: [], medications_changed: '', equipment_issues: '', staffing_notes: '', clinic: 'diagyn' });
      fetchNotes();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create note');
    }
    setSubmitting(false);
  };

  const handleAcknowledge = async (note) => {
    try {
      await axios.post(`${API}/api/handoff-notes/${note.date}/${note.shift}/acknowledge`, {}, getAuth());
      toast.success('Handoff acknowledged');
      fetchNotes();
    } catch (err) {
      toast.error('Failed to acknowledge');
    }
  };

  if (loading) {
    return (
      <div className="dark-page min-h-screen bg-[#050510] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading handoff notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050510]" data-testid="handoff-notes-page">
      {/* Header */}
      <div className="bg-[#1A1A1A] sticky top-0 z-50 border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-white/10">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Doctor Handoff Notes</h1>
              <p className="text-xs text-gray-500">Shift handover records</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-teal-500 hover:bg-teal-600 text-white text-sm rounded-xl" data-testid="create-handoff-btn">
            <Plus className="w-4 h-4 mr-1" /> New Note
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3" data-testid="handoff-stats">
            <div className="bg-[#1A1A1A] rounded-2xl p-3 text-center border border-white/10">
              <p className="text-2xl font-bold text-teal-400">{stats.total_notes}</p>
              <p className="text-[10px] text-gray-500">Notes (30d)</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-2xl p-3 text-center border border-white/10">
              <p className="text-2xl font-bold text-green-400">{stats.acknowledgement_rate}%</p>
              <p className="text-[10px] text-gray-500">Acknowledged</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-2xl p-3 text-center border border-white/10">
              <p className="text-2xl font-bold text-red-400">{stats.with_critical_patients}</p>
              <p className="text-[10px] text-gray-500">Had Critical</p>
            </div>
          </div>
        )}

        {/* Latest Active Note Banner */}
        {latestNote && !showCreateForm && (
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/10 rounded-2xl p-4 border border-amber-500/30" data-testid="latest-handoff-banner">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-amber-400 font-semibold uppercase">Active Handoff Note</p>
                <p className="text-sm font-bold text-white mt-1">{latestNote.doctor_name} &middot; {SHIFTS.find(s => s.key === latestNote.shift)?.label} Shift</p>
                <p className="text-xs text-gray-300 mt-1 line-clamp-2">{latestNote.summary}</p>
                {latestNote.critical_patients?.length > 0 && (
                  <p className="text-xs text-red-400 mt-2 font-semibold">{latestNote.critical_patients.length} critical patient(s) flagged</p>
                )}
                <Button onClick={() => handleAcknowledge(latestNote)}
                  className="mt-3 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-xl h-8" data-testid="acknowledge-handoff-btn">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Acknowledge & Confirm
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-teal-500/30 space-y-4" data-testid="create-handoff-form">
            <div className="flex items-center justify-between">
              <p className="font-bold text-white">Create Handoff Note</p>
              <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-white text-sm">Cancel</button>
            </div>

            {/* Shift Selection */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-2 block">Shift</label>
              <div className="grid grid-cols-4 gap-2">
                {SHIFTS.map(s => (
                  <button key={s.key} onClick={() => setForm(f => ({ ...f, shift: s.key }))}
                    className={`p-2 rounded-xl text-center transition-all border-2 ${
                      form.shift === s.key ? 'border-teal-500' : 'border-transparent'
                    }`}
                    style={{ background: form.shift === s.key ? s.bg : '#0A0A1A' }}
                    data-testid={`shift-${s.key}`}>
                    <p className="text-sm font-bold" style={{ color: s.color }}>{s.label}</p>
                    <p className="text-[10px] text-gray-500">{s.time}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Shift Summary *</label>
              <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                className="w-full h-28 px-3 py-2 bg-[#0A0A1A] border border-white/10 rounded-xl text-white placeholder:text-gray-500 resize-none"
                placeholder="Overall shift summary, key events, patient count..." data-testid="handoff-summary" />
            </div>

            {/* Critical Patients */}
            <div className="border border-red-500/20 rounded-xl p-3 bg-red-500/5">
              <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Critical Patients ({form.critical_patients.length})
              </p>
              {form.critical_patients.map((cp, i) => (
                <div key={i} className="flex items-center justify-between bg-[#0A0A1A] rounded-lg p-2 mb-2">
                  <div>
                    <p className="text-sm font-medium text-white">{cp.name}</p>
                    <p className="text-xs text-gray-400">{cp.condition}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_COLORS[cp.priority]}`}>{cp.priority}</span>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input value={newCritical.name} onChange={e => setNewCritical(n => ({ ...n, name: e.target.value }))}
                  placeholder="Patient name" className="bg-[#0A0A1A] border-white/10 text-white text-xs h-8" data-testid="critical-patient-name" />
                <Input value={newCritical.condition} onChange={e => setNewCritical(n => ({ ...n, condition: e.target.value }))}
                  placeholder="Condition" className="bg-[#0A0A1A] border-white/10 text-white text-xs h-8" data-testid="critical-patient-condition" />
                <Input value={newCritical.notes} onChange={e => setNewCritical(n => ({ ...n, notes: e.target.value }))}
                  placeholder="Notes (optional)" className="bg-[#0A0A1A] border-white/10 text-white text-xs h-8 col-span-2" />
              </div>
              <Button onClick={addCriticalPatient} size="sm" className="mt-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs w-full" data-testid="add-critical-patient-btn">
                <Plus className="w-3 h-3 mr-1" /> Add Critical Patient
              </Button>
            </div>

            {/* Pending Items */}
            <div className="border border-amber-500/20 rounded-xl p-3 bg-amber-500/5">
              <p className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Pending Items ({form.pending_items.length})
              </p>
              {form.pending_items.map((pi, i) => (
                <div key={i} className="flex items-center justify-between bg-[#0A0A1A] rounded-lg p-2 mb-2">
                  <p className="text-sm text-white">{pi.description}</p>
                  <span className="text-[10px] text-gray-500">{pi.due_by || 'ASAP'}</span>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Input value={newPending.description} onChange={e => setNewPending(n => ({ ...n, description: e.target.value }))}
                  placeholder="Task description" className="bg-[#0A0A1A] border-white/10 text-white text-xs h-8 col-span-2" data-testid="pending-item-desc" />
                <Input value={newPending.due_by} onChange={e => setNewPending(n => ({ ...n, due_by: e.target.value }))} type="time"
                  className="bg-[#0A0A1A] border-white/10 text-white text-xs h-8" />
              </div>
              <Button onClick={addPendingItem} size="sm" className="mt-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-xs w-full" data-testid="add-pending-item-btn">
                <Plus className="w-3 h-3 mr-1" /> Add Pending Item
              </Button>
            </div>

            {/* Additional Notes */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Medication Changes</label>
                <Input value={form.medications_changed} onChange={e => setForm(f => ({ ...f, medications_changed: e.target.value }))}
                  placeholder="Any medication changes..." className="bg-[#0A0A1A] border-white/10 text-white" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Equipment Issues</label>
                <Input value={form.equipment_issues} onChange={e => setForm(f => ({ ...f, equipment_issues: e.target.value }))}
                  placeholder="Any equipment issues..." className="bg-[#0A0A1A] border-white/10 text-white" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Staffing Notes</label>
                <Input value={form.staffing_notes} onChange={e => setForm(f => ({ ...f, staffing_notes: e.target.value }))}
                  placeholder="Staff availability, late arrivals..." className="bg-[#0A0A1A] border-white/10 text-white" />
              </div>
            </div>

            {/* Submit */}
            <Button onClick={handleSubmit} disabled={submitting}
              className="w-full h-12 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl" data-testid="submit-handoff-btn">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
              Submit Handoff Note
            </Button>
          </div>
        )}

        {/* Notes History */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Notes</p>
          {notes.length === 0 ? (
            <div className="bg-[#1A1A1A] rounded-2xl p-8 text-center border border-white/10">
              <FileText className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">No handoff notes yet</p>
              <p className="text-xs text-gray-500 mt-1">Create your first shift handoff note</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note, idx) => {
                const shift = SHIFTS.find(s => s.key === note.shift) || SHIFTS[0];
                const isExpanded = expandedNote === idx;
                return (
                  <div key={idx} className="bg-[#1A1A1A] rounded-2xl overflow-hidden border border-white/10" data-testid={`handoff-note-${idx}`}>
                    <button onClick={() => setExpandedNote(isExpanded ? null : idx)} className="w-full px-4 py-3 flex items-center justify-between text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: shift.bg }}>
                          <Clock className="w-5 h-5" style={{ color: shift.color }} />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{shift.label} Shift &middot; {note.date}</p>
                          <p className="text-xs text-gray-400">{note.doctor_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {note.critical_patients?.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">
                            {note.critical_patients.length} critical
                          </span>
                        )}
                        {note.acknowledged_by?.length > 0 && (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                        <p className="text-sm text-gray-200">{note.summary}</p>
                        
                        {note.critical_patients?.length > 0 && (
                          <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                            <p className="text-xs font-semibold text-red-400 mb-2">Critical Patients</p>
                            {note.critical_patients.map((cp, i) => (
                              <div key={i} className="flex items-center justify-between bg-[#0A0A1A] rounded-lg p-2 mb-1">
                                <div>
                                  <p className="text-sm font-medium text-white">{cp.name}</p>
                                  <p className="text-xs text-gray-400">{cp.condition}</p>
                                  {cp.notes && <p className="text-xs text-gray-500 mt-0.5">{cp.notes}</p>}
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_COLORS[cp.priority]}`}>{cp.priority}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {note.pending_items?.length > 0 && (
                          <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
                            <p className="text-xs font-semibold text-amber-400 mb-2">Pending Items</p>
                            {note.pending_items.map((pi, i) => (
                              <div key={i} className="flex items-center justify-between bg-[#0A0A1A] rounded-lg p-2 mb-1">
                                <p className="text-sm text-white">{pi.description}</p>
                                {pi.due_by && <span className="text-[10px] text-gray-500">{pi.due_by}</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {note.medications_changed && (
                          <div className="text-xs"><span className="text-gray-500">Medication changes:</span> <span className="text-gray-300">{note.medications_changed}</span></div>
                        )}
                        {note.equipment_issues && (
                          <div className="text-xs"><span className="text-gray-500">Equipment issues:</span> <span className="text-gray-300">{note.equipment_issues}</span></div>
                        )}
                        {note.staffing_notes && (
                          <div className="text-xs"><span className="text-gray-500">Staffing:</span> <span className="text-gray-300">{note.staffing_notes}</span></div>
                        )}
                        
                        {note.acknowledged_by?.length > 0 && (
                          <div className="text-xs text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> 
                            Acknowledged by {note.acknowledged_by.map(a => a.doctor_name).join(', ')}
                          </div>
                        )}
                        
                        <Button onClick={() => handleAcknowledge(note)}
                          size="sm" className="w-full bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 rounded-xl" data-testid={`acknowledge-${idx}`}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Acknowledge
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HandoffNotes;
