import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, AlertTriangle, CheckCircle2, DollarSign, ChevronDown, ChevronUp, Timer } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const BillingTimerPanel = ({ token, isDoctor = false, clinic = null }) => {
  const [pendingBills, setPendingBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [closingBill, setClosingBill] = useState(null); // appointment_id being closed
  const [finalAmount, setFinalAmount] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closing, setClosing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const timerRef = useRef(null);
  const fetchRef = useRef(null);

  const fetchPending = useCallback(async () => {
    try {
      const params = clinic ? { clinic } : {};
      const res = await axios.get(`${API}/api/diagyn-staff/billing/pending`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      if (res.data.success) {
        setPendingBills(res.data.appointments);
      }
    } catch (err) {
      console.error('Failed to fetch pending bills:', err);
    } finally {
      setLoading(false);
    }
  }, [token, clinic]);

  useEffect(() => {
    fetchPending();
    fetchRef.current = setInterval(fetchPending, 15000);
    return () => clearInterval(fetchRef.current);
  }, [fetchPending]);

  // Live timer tick every second
  const [tick, setTick] = useState(0);
  useEffect(() => {
    timerRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const getElapsed = (timerStart) => {
    if (!timerStart) return { seconds: 0, display: '0:00' };
    try {
      const start = new Date(timerStart);
      const now = new Date();
      const secs = Math.max(0, Math.floor((now - start) / 1000));
      const mins = Math.floor(secs / 60);
      const remainSecs = secs % 60;
      return {
        seconds: secs,
        display: `${mins}:${String(remainSecs).padStart(2, '0')}`
      };
    } catch {
      return { seconds: 0, display: '0:00' };
    }
  };

  const getTimerColor = (seconds) => {
    if (seconds < 180) return '#10B981'; // green < 3min
    if (seconds < 600) return '#F59E0B'; // amber < 10min
    return '#EF4444'; // red > 10min
  };

  const handleCloseBill = async (appointmentId) => {
    if (!finalAmount || parseFloat(finalAmount) <= 0) return;
    setClosing(true);
    try {
      const res = await axios.post(`${API}/api/diagyn-staff/billing/close`, {
        appointment_id: appointmentId,
        final_amount: parseFloat(finalAmount),
        notes: closeNotes || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSuccessMsg(`Bill closed — ${res.data.billing_duration_display}. Patient notified.`);
        setClosingBill(null);
        setFinalAmount('');
        setCloseNotes('');
        fetchPending();
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to close bill');
    } finally {
      setClosing(false);
    }
  };

  if (loading) return null;
  if (pendingBills.length === 0 && !successMsg) return null;

  return (
    <div className="mb-3" data-testid="billing-timer-panel">
      {/* Header Bar — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-t-2xl transition-all"
        style={{
          background: pendingBills.length > 0
            ? 'linear-gradient(135deg, #1E3A5F, #0F172A)'
            : 'linear-gradient(135deg, #064E3B, #0F172A)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
        data-testid="billing-timer-header"
      >
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-bold text-white">Billing Queue</span>
          {pendingBills.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
              {pendingBills.length}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {/* Success Message */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-900/50 border-b border-emerald-700/30">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-emerald-300">{successMsg}</span>
        </div>
      )}

      {/* Expanded Content */}
      {expanded && pendingBills.length > 0 && (
        <div className="rounded-b-2xl overflow-hidden" style={{ background: '#0F172A' }}>
          {pendingBills.map((bill) => {
            const elapsed = getElapsed(bill.billing_timer_start);
            const timerColor = getTimerColor(elapsed.seconds);
            const isClosing = closingBill === bill.id;

            return (
              <div
                key={bill.id}
                className="border-b border-slate-800 last:border-b-0"
                data-testid={`billing-item-${bill.id}`}
              >
                {/* Patient info + timer */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{bill.patient_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {bill.doctor} · {bill.appointment_type || 'SCHEDULED'}
                    </p>
                    {bill.doctor_fee_amount > 0 && (
                      <p className="text-xs text-amber-400 mt-1 font-medium">
                        Doctor's fee: ₹{bill.doctor_fee_amount}
                      </p>
                    )}
                  </div>

                  {/* Live Timer */}
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="px-3 py-1.5 rounded-xl font-mono text-lg font-black tabular-nums"
                      style={{ color: timerColor, background: `${timerColor}15` }}
                      data-testid={`timer-${bill.id}`}
                    >
                      {elapsed.display}
                    </div>
                    {elapsed.seconds > 600 && (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                        <span className="text-[10px] text-red-400 font-medium">Overdue</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Close Bill Section */}
                {!isDoctor && (
                  <div className="px-4 pb-3">
                    {!isClosing ? (
                      <button
                        onClick={() => { setClosingBill(bill.id); setFinalAmount(String(bill.doctor_fee_amount || '')); }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                        data-testid={`close-bill-btn-${bill.id}`}
                      >
                        <DollarSign className="w-4 h-4" />
                        Close Bill
                      </button>
                    ) : (
                      <div className="space-y-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Final Amount Collected (₹)</label>
                          <input
                            type="number"
                            value={finalAmount}
                            onChange={(e) => setFinalAmount(e.target.value)}
                            placeholder="Enter amount"
                            className="w-full px-3 py-2.5 rounded-xl text-white text-sm font-bold bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none"
                            autoFocus
                            data-testid={`final-amount-input-${bill.id}`}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
                          <input
                            type="text"
                            value={closeNotes}
                            onChange={(e) => setCloseNotes(e.target.value)}
                            placeholder="Any remarks..."
                            className="w-full px-3 py-2 rounded-xl text-white text-sm bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none"
                            data-testid={`close-notes-input-${bill.id}`}
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => { setClosingBill(null); setFinalAmount(''); setCloseNotes(''); }}
                            className="flex-1 py-2.5 rounded-xl text-xs font-medium text-gray-400 bg-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleCloseBill(bill.id)}
                            disabled={closing || !finalAmount || parseFloat(finalAmount) <= 0}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                            style={{ background: closing ? '#6B7280' : 'linear-gradient(135deg, #10B981, #059669)' }}
                            data-testid={`confirm-close-btn-${bill.id}`}
                          >
                            {closing ? 'Closing...' : `Confirm ₹${finalAmount || '0'}`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BillingTimerPanel;
