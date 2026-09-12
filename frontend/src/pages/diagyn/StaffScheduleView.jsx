import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { COLORS } from './staffConstants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CalendarOff, Ban, Loader2, X, AlertTriangle, ShieldAlert, User, Phone, Clock
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const StaffScheduleView = () => {
  const token = localStorage.getItem('staffToken');
  const headers = React.useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [subTab, setSubTab] = useState('block'); // 'block' | 'audit'
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [blocks, setBlocks] = useState({ blocked_dates: [], blocked_sessions: [] });
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  const [dateForm, setDateForm] = useState({ date: '', reason: 'Leave' });
  const [sessionForm, setSessionForm] = useState({ date: '', start_time: '', end_time: '', reason: 'Break' });
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState(null); // { type: 'date'|'session', data, message, patients }

  const [attempts, setAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/diagyn-staff/schedule/doctors`, { headers }).then(res => {
      const list = res.data.doctors || [];
      setDoctors(list);
      if (list.length && !selectedDoctor) setSelectedDoctor(list[0]);
    }).catch(() => toast.error('Failed to load doctor list'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBlocks = useCallback(async () => {
    if (!selectedDoctor) return;
    setLoadingBlocks(true);
    try {
      const res = await axios.get(`${API}/api/diagyn-staff/schedule/blocked-dates`, {
        headers, params: { doctor: selectedDoctor },
      });
      setBlocks(res.data);
    } catch {
      toast.error('Failed to load blocked dates');
    } finally {
      setLoadingBlocks(false);
    }
  }, [selectedDoctor, headers]);

  useEffect(() => { loadBlocks(); }, [loadBlocks]);

  const loadAttempts = useCallback(async () => {
    setLoadingAttempts(true);
    try {
      const res = await axios.get(`${API}/api/diagyn-staff/schedule/blocked-attempts`, { headers, params: { limit: 100 } });
      setAttempts(res.data.attempts || []);
    } catch {
      toast.error('Failed to load audit log');
    } finally {
      setLoadingAttempts(false);
    }
  }, [headers]);

  useEffect(() => { if (subTab === 'audit') loadAttempts(); }, [subTab, loadAttempts]);

  const submitBlockDate = async (forceOverride = false) => {
    if (!dateForm.date) return toast.error('Pick a date');
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/api/diagyn-staff/schedule/block-date`, {
        doctor: selectedDoctor, date: dateForm.date, reason: dateForm.reason || 'Leave', force_override: forceOverride,
      }, { headers });
      if (res.data.conflict) {
        setConflict({ type: 'date', message: res.data.message, patients: res.data.patients });
        return;
      }
      toast.success(res.data.message);
      setConflict(null);
      setDateForm({ date: '', reason: 'Leave' });
      loadBlocks();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to block date');
    } finally {
      setSubmitting(false);
    }
  };

  const submitBlockSession = async (forceOverride = false) => {
    if (!sessionForm.date || !sessionForm.start_time || !sessionForm.end_time) return toast.error('Fill date, start and end time');
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/api/diagyn-staff/schedule/block-session`, {
        doctor: selectedDoctor, ...sessionForm, reason: sessionForm.reason || 'Break', force_override: forceOverride,
      }, { headers });
      if (res.data.conflict) {
        setConflict({ type: 'session', message: res.data.message, patients: res.data.patients });
        return;
      }
      toast.success(res.data.message);
      setConflict(null);
      setSessionForm({ date: '', start_time: '', end_time: '', reason: 'Break' });
      loadBlocks();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to block session');
    } finally {
      setSubmitting(false);
    }
  };

  const unblockDate = async (date) => {
    try {
      await axios.delete(`${API}/api/diagyn-staff/schedule/block-date/${encodeURIComponent(selectedDoctor)}/${date}`, { headers });
      toast.success(`Unblocked ${date}`);
      loadBlocks();
    } catch {
      toast.error('Failed to unblock');
    }
  };

  const unblockSession = async (date, startTime) => {
    try {
      await axios.delete(`${API}/api/diagyn-staff/schedule/block-session/${encodeURIComponent(selectedDoctor)}/${date}/${startTime}`, { headers });
      toast.success(`Unblocked session on ${date}`);
      loadBlocks();
    } catch {
      toast.error('Failed to unblock');
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Sub-tab switcher */}
      <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.6)' }}>
        <button onClick={() => setSubTab('block')} data-testid="schedule-subtab-block"
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
          style={subTab === 'block' ? { background: COLORS.danger, color: '#fff' } : { color: COLORS.textMuted }}>
          <Ban className="w-3.5 h-3.5" /> Block Dates/Slots
        </button>
        <button onClick={() => setSubTab('audit')} data-testid="schedule-subtab-audit"
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
          style={subTab === 'audit' ? { background: COLORS.info, color: '#fff' } : { color: COLORS.textMuted }}>
          <ShieldAlert className="w-3.5 h-3.5" /> Audit Log
        </button>
      </div>

      {subTab === 'block' && (
        <>
          {/* Doctor selector */}
          <div className="rounded-2xl p-4 shadow-sm" style={{ background: COLORS.bgCard }}>
            <label className="text-xs font-bold mb-2 block" style={{ color: COLORS.textMuted }}>DOCTOR</label>
            <div className="flex gap-2 flex-wrap">
              {doctors.map(doc => (
                <button key={doc} onClick={() => setSelectedDoctor(doc)} data-testid={`schedule-doctor-${doc.replace(/\s/g, '-')}`}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={selectedDoctor === doc ? { background: COLORS.teal, color: '#fff' } : { background: COLORS.bgCardHover, color: COLORS.textLight }}>
                  {doc}
                </button>
              ))}
            </div>
          </div>

          {/* Conflict warning */}
          {conflict && (
            <div className="rounded-2xl p-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }} data-testid="schedule-conflict-warning">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: COLORS.danger }} />
                <p className="text-sm font-medium" style={{ color: COLORS.danger }}>{conflict.message}</p>
              </div>
              <div className="space-y-1.5 mb-3">
                {(conflict.patients || []).map((p, i) => (
                  <div key={i} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: '#fff', color: COLORS.textLight }}>
                    {p.name} — {p.time} <span style={{ color: COLORS.textMuted }}>({p.phone})</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 rounded-xl" onClick={() => setConflict(null)} data-testid="schedule-conflict-cancel">
                  Cancel
                </Button>
                <Button size="sm" className="flex-1 rounded-xl" style={{ background: COLORS.danger }}
                  onClick={() => conflict.type === 'date' ? submitBlockDate(true) : submitBlockSession(true)}
                  disabled={submitting} data-testid="schedule-conflict-override">
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cancel Appointments & Block'}
                </Button>
              </div>
            </div>
          )}

          {/* Block full day */}
          <div className="rounded-2xl p-4 shadow-sm" style={{ background: COLORS.bgCard }}>
            <label className="text-xs font-bold mb-3 block" style={{ color: COLORS.textMuted }}>
              <CalendarOff className="w-4 h-4 inline mr-1.5" /> BLOCK A FULL DAY (LEAVE)
            </label>
            <div className="flex gap-2 flex-wrap">
              <Input type="date" value={dateForm.date} onChange={e => setDateForm(f => ({ ...f, date: e.target.value }))}
                className="h-11 rounded-xl flex-1 min-w-[140px]" style={{ background: COLORS.bgCardHover }} data-testid="block-date-input" />
              <Input value={dateForm.reason} onChange={e => setDateForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Reason (e.g. Leave)" className="h-11 rounded-xl flex-1 min-w-[140px]" style={{ background: COLORS.bgCardHover }} data-testid="block-date-reason-input" />
              <Button onClick={() => submitBlockDate(false)} disabled={submitting} className="h-11 rounded-xl font-bold" style={{ background: COLORS.danger }} data-testid="block-date-submit-btn">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Block Date'}
              </Button>
            </div>
            {blocks.blocked_dates?.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {blocks.blocked_dates.map((b, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: '#FEF2F2' }} data-testid={`blocked-date-item-${b.date}`}>
                    <span className="text-xs font-medium" style={{ color: COLORS.danger }}>{b.date} — {b.reason}</span>
                    <button onClick={() => unblockDate(b.date)} data-testid={`unblock-date-btn-${b.date}`}><X className="w-3.5 h-3.5" style={{ color: COLORS.danger }} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Block partial session */}
          <div className="rounded-2xl p-4 shadow-sm" style={{ background: COLORS.bgCard }}>
            <label className="text-xs font-bold mb-3 block" style={{ color: COLORS.textMuted }}>
              <Ban className="w-4 h-4 inline mr-1.5" /> BLOCK A TIME WINDOW ON A DATE
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Input type="date" value={sessionForm.date} onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))}
                className="h-11 rounded-xl" style={{ background: COLORS.bgCardHover }} data-testid="block-session-date-input" />
              <Input value={sessionForm.reason} onChange={e => setSessionForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Reason" className="h-11 rounded-xl" style={{ background: COLORS.bgCardHover }} data-testid="block-session-reason-input" />
              <Input type="time" value={sessionForm.start_time} onChange={e => setSessionForm(f => ({ ...f, start_time: e.target.value }))}
                className="h-11 rounded-xl" style={{ background: COLORS.bgCardHover }} data-testid="block-session-start-input" />
              <Input type="time" value={sessionForm.end_time} onChange={e => setSessionForm(f => ({ ...f, end_time: e.target.value }))}
                className="h-11 rounded-xl" style={{ background: COLORS.bgCardHover }} data-testid="block-session-end-input" />
            </div>
            <Button onClick={() => submitBlockSession(false)} disabled={submitting} className="w-full h-11 rounded-xl font-bold" style={{ background: COLORS.warning }} data-testid="block-session-submit-btn">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Block Time Window'}
            </Button>
            {blocks.blocked_sessions?.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {blocks.blocked_sessions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: '#FFFBEB' }} data-testid={`blocked-session-item-${s.date}-${s.start_time}`}>
                    <span className="text-xs font-medium" style={{ color: COLORS.warning }}>{s.date} · {s.start_time}-{s.end_time} — {s.reason}</span>
                    <button onClick={() => unblockSession(s.date, s.start_time)} data-testid={`unblock-session-btn-${s.date}-${s.start_time}`}><X className="w-3.5 h-3.5" style={{ color: COLORS.warning }} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {loadingBlocks && <div className="text-center py-2"><Loader2 className="w-4 h-4 animate-spin inline" style={{ color: COLORS.textMuted }} /></div>}
        </>
      )}

      {subTab === 'audit' && (
        <div className="rounded-2xl p-4 shadow-sm" style={{ background: COLORS.bgCard }}>
          <label className="text-xs font-bold mb-3 block" style={{ color: COLORS.textMuted }}>
            <ShieldAlert className="w-4 h-4 inline mr-1.5" /> REJECTED BOOKING ATTEMPTS ({attempts.length})
          </label>
          {loadingAttempts ? (
            <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin inline" style={{ color: COLORS.textMuted }} /></div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-8">
              <ShieldAlert className="w-10 h-10 mx-auto mb-2" style={{ color: COLORS.textMuted }} />
              <p className="text-sm" style={{ color: COLORS.textMuted }}>No blocked-slot attempts logged yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {attempts.map((a) => (
                <div key={a.id} className="rounded-xl p-3" style={{ background: COLORS.bgCardHover }} data-testid={`audit-attempt-${a.id}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold" style={{ color: COLORS.textLight }}>{a.doctor}</p>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: COLORS.danger + '20', color: COLORS.danger }}>
                      {a.block_type === 'full_day' ? 'FULL DAY' : 'SESSION'}
                    </span>
                  </div>
                  <p className="text-[11px] mb-1" style={{ color: COLORS.textMuted }}>
                    <Clock className="w-3 h-3 inline mr-1" />{a.date} at {a.time} &middot; Reason: {a.reason} &middot; Source: {a.source}
                  </p>
                  {(a.patient_name || a.patient_phone) && (
                    <p className="text-[11px]" style={{ color: COLORS.textMuted }}>
                      <User className="w-3 h-3 inline mr-1" />{a.patient_name || 'Unknown'}
                      {a.patient_phone && <><Phone className="w-3 h-3 inline mx-1" />{a.patient_phone}</>}
                    </p>
                  )}
                  <p className="text-[10px] mt-1" style={{ color: COLORS.textFaded }}>{new Date(a.attempted_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffScheduleView;
