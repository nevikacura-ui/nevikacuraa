import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, ArrowLeftRight, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const CLINICS = [
  { id: 'pushpa', name: 'Pushpa Clinic', color: '#8B5CF6' },
  { id: 'amnion', name: 'Amnion Clinic', color: '#0EA5E9' },
];

const SESSIONS = [
  { id: 'morning', name: 'Morning', time: '11:00 - 14:00', icon: '☀' },
  { id: 'evening', name: 'Evening', time: '18:00 - 22:00', icon: '☽' },
];

const ClinicOverrideManager = ({ doctorToken, onClose }) => {
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClinic, setSelectedClinic] = useState('');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState(null);

  const headers = { Authorization: `Bearer ${doctorToken}` };

  const fetchOverrides = async () => {
    try {
      const res = await axios.get(`${API}/api/clinic-override`, { headers });
      setOverrides(res.data.overrides || []);
    } catch (err) {
      console.error('Failed to fetch overrides:', err);
    }
  };

  useEffect(() => { fetchOverrides(); }, []);

  const handleCreate = async () => {
    if (!selectedDate || !selectedSession || !selectedClinic) return;
    setCreating(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/api/clinic-override`, {
        date: selectedDate,
        session: selectedSession,
        override_clinic: selectedClinic,
        reason: reason || 'Doctor preference',
      }, { headers });
      setResult({ type: 'success', message: res.data.message, affected: res.data.affected_count });
      setSelectedDate('');
      setSelectedSession('');
      setSelectedClinic('');
      setReason('');
      fetchOverrides();
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.detail || 'Failed to create override' });
    }
    setCreating(false);
  };

  const handleDelete = async (date, session) => {
    if (!window.confirm('Remove this clinic override? Appointments will revert to original clinic.')) return;
    try {
      await axios.delete(`${API}/api/clinic-override/${date}/${session}`, { headers });
      fetchOverrides();
      setResult({ type: 'success', message: 'Override removed successfully.' });
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.detail || 'Failed to remove override' });
    }
  };

  const getMinDate = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  return (
    <div className="h-full flex flex-col" data-testid="clinic-override-manager">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8B5CF6, #0EA5E9)' }}>
            <ArrowLeftRight className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Clinic Switch</h2>
            <p className="text-xs text-gray-500">Override routine schedule</p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center" data-testid="close-override-modal">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Result Banner */}
        {result && (
          <div className={`p-3 rounded-xl flex items-start gap-2 text-sm ${result.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}
            data-testid="override-result-banner">
            {result.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{result.message}</span>
          </div>
        )}

        {/* Create Override Form */}
        <div className="rounded-2xl border border-gray-100 p-4 space-y-4" style={{ background: '#FAFAFA' }}>
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> New Clinic Override
          </h3>

          {/* Date Picker */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              min={getMinDate()}
              className="w-full p-3 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
              data-testid="override-date-input"
            />
          </div>

          {/* Session Picker */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Session</label>
            <div className="grid grid-cols-2 gap-2">
              {SESSIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSession(s.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${selectedSession === s.id ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white'}`}
                  data-testid={`session-${s.id}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{s.icon}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: selectedSession === s.id ? '#7C3AED' : '#374151' }}>{s.name}</p>
                      <p className="text-xs text-gray-400">{s.time}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Clinic Picker */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Switch To Clinic</label>
            <div className="grid grid-cols-2 gap-2">
              {CLINICS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClinic(c.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${selectedClinic === c.id ? 'border-violet-500' : 'border-gray-200 bg-white'}`}
                  style={selectedClinic === c.id ? { background: `${c.color}15`, borderColor: c.color } : undefined}
                  data-testid={`clinic-${c.id}`}
                >
                  <MapPin className="w-4 h-4 mx-auto mb-1" style={{ color: selectedClinic === c.id ? c.color : '#9CA3AF' }} />
                  <p className="text-sm font-bold" style={{ color: selectedClinic === c.id ? c.color : '#374151' }}>{c.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Equipment maintenance"
              className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none"
              data-testid="override-reason-input"
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={!selectedDate || !selectedSession || !selectedClinic || creating}
            className="w-full py-3 rounded-xl text-white font-bold"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}
            data-testid="create-override-btn"
          >
            {creating ? 'Creating...' : 'Create Clinic Override'}
          </Button>
        </div>

        {/* Active Overrides */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" /> Active Overrides ({overrides.length})
          </h3>
          {overrides.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-2xl">
              No active clinic overrides
            </div>
          ) : (
            <div className="space-y-2">
              {overrides.map((o, i) => (
                <div key={i} className="p-3 rounded-xl border border-gray-100 bg-white flex items-center justify-between" data-testid={`override-item-${i}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-800">{o.date}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" 
                        style={{ background: o.session === 'morning' ? '#FEF3C7' : '#EDE9FE', color: o.session === 'morning' ? '#92400E' : '#5B21B6' }}>
                        {o.session}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="font-medium" style={{ color: '#DC2626' }}>{o.original_clinic_name || 'Routine'}</span>
                      <ArrowLeftRight className="w-3 h-3" />
                      <span className="font-medium" style={{ color: '#059669' }}>{o.override_clinic_name}</span>
                    </div>
                    {o.reason && o.reason !== 'Doctor preference' && (
                      <p className="text-xs text-gray-400 mt-0.5">{o.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(o.date, o.session)}
                    className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors"
                    data-testid={`delete-override-${i}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicOverrideManager;
