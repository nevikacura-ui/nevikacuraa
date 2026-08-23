import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStaff } from './StaffContext';
import { COLORS } from './staffConstants';
import AppointmentCard from './AppointmentCard';
import BillingCheckoutModal from './BillingCheckoutModal';
import DoctorChargesModal from './DoctorChargesModal';
import { Calendar, Clock, ChevronRight, Loader2, Sun, Moon } from 'lucide-react';
import { lightTap } from '@/utils/haptics';
import axios from 'axios';
import { toast } from 'sonner';

// Parse HH:MM time string to minutes since midnight
const timeToMinutes = (timeStr) => {
  if (!timeStr) return -1;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return -1;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const ampm = match[3];
  if (ampm) {
    if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
  }
  return h * 60 + m;
};

const SESSION_RANGES = {
  morning: { start: 11 * 60, end: 14 * 60, label: 'Morning', sublabel: '11:30 AM – 2 PM' },
  evening: { start: 18 * 60, end: 22 * 60, label: 'Evening', sublabel: '6 PM – 10 PM' },
};

const StaffAppointmentsView = () => {
  const s = useStaff();
  const [billingApt, setBillingApt] = useState(null);
  const rawAppointments = s.filteredAppointments || s.appointments;

  // Track new appointments and status changes for animations (#9, #10)
  const prevAptIdsRef = useRef(new Set());
  const prevStatusRef = useRef({});
  const [newAptIds, setNewAptIds] = useState(new Set());
  const [changedStatusIds, setChangedStatusIds] = useState(new Set());

  useEffect(() => {
    const currentIds = new Set(rawAppointments.map(a => a.id));
    const currentStatuses = {};
    rawAppointments.forEach(a => { currentStatuses[a.id] = a.status; });

    // Detect newly added appointments
    if (prevAptIdsRef.current.size > 0) {
      const added = new Set();
      currentIds.forEach(id => { if (!prevAptIdsRef.current.has(id)) added.add(id); });
      if (added.size > 0) {
        setNewAptIds(added);
        setTimeout(() => setNewAptIds(new Set()), 1500);
      }
    }

    // Detect status changes
    const changed = new Set();
    Object.entries(currentStatuses).forEach(([id, status]) => {
      if (prevStatusRef.current[id] && prevStatusRef.current[id] !== status) changed.add(id);
    });
    if (changed.size > 0) {
      setChangedStatusIds(changed);
      setTimeout(() => setChangedStatusIds(new Set()), 1500);
    }

    prevAptIdsRef.current = currentIds;
    prevStatusRef.current = currentStatuses;
  }, [rawAppointments]);

  // Session filter logic
  const displayAppointments = useMemo(() => {
    if (!s.sessionFilter || s.sessionFilter === 'all') return rawAppointments;
    const range = SESSION_RANGES[s.sessionFilter];
    if (!range) return rawAppointments;
    return rawAppointments.filter(apt => {
      const t = timeToMinutes(apt.time || apt.slot || '');
      if (t === -1) return true; // Walk-in/emergency without time — always show
      return t >= range.start && t < range.end;
    });
  }, [rawAppointments, s.sessionFilter]);

  const handleBillingComplete = async (billingData) => {
    try {
      const API = process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('staffToken');
      if (!token) {
        toast.error('Session expired. Please login again.');
        return;
      }
      // Try UUID id first (more reliable), then booking_id
      const aptId = billingApt.id || billingApt.booking_id;
      
      // Try the dedicated billing/close endpoint first
      try {
        await axios.post(`${API}/api/diagyn-staff/billing/close`, {
          appointment_id: aptId,
          final_amount: billingData.total_amount,
          fee_code: billingData.fee_code || null,
          scan_codes: billingData.scan_codes || [],
          payment_method: billingData.payment_method || 'cash',
          medicine_amount: billingData.medicine_amount || 0,
          misc_amount: billingData.misc_amount || 0,
          notes: billingData.notes,
        }, { headers: { Authorization: `Bearer ${token}` } });
      } catch (billingErr) {
        console.error('billing/close failed:', billingErr?.response?.data || billingErr?.message);
        // Fallback to status update endpoint
        await axios.put(`${API}/api/diagyn-staff/appointments/${aptId}/status`, {
          status: 'Completed',
          fee_code: billingData.fee_code,
          scan_codes: billingData.scan_codes,
          total_amount: billingData.total_amount,
          notes: billingData.notes,
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      
      toast.success(`Collected ₹${billingData.total_amount}`);
      
      // Auto-print thermal bill — pass raw codes, printBill resolves details
      const aptForPrint = {
        ...billingApt,
        fee_code: billingData.fee_code,
        scan_codes: billingData.scan_codes || [],
        medicine_amount: billingData.medicine_amount || 0,
        misc_amount: billingData.misc_amount || 0,
        total_amount: billingData.total_amount,
        payment_method: billingData.payment_method,
      };
      if (s.printerConnected) {
        s.printBill(aptForPrint);
      }
      
      setBillingApt(null);
      s.loadAppointments();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to close consultation';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      console.error('Close billing error:', err?.response?.data || err);
    }
  };

  // Doctor charges modal
  const [chargesApt, setChargesApt] = useState(null);

  const handleDoctorCharges = async (chargesData) => {
    try {
      const API = process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('staffToken');
      const aptId = chargesApt.booking_id || chargesApt.id;
      await axios.put(`${API}/api/diagyn-staff/appointments/${aptId}/doctor-charges`, {
        fee_code: chargesData.fee_code,
        scan_codes: chargesData.scan_codes,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Charges saved by doctor');
      setChargesApt(null);
      s.loadAppointments();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to save charges';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  return (
    <div className="space-y-3">
      {/* Archives Toggle */}
      <div className="flex items-center gap-2">
        <button onClick={() => s.setShowArchives(false)}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${!s.showArchives ? 'shadow-md' : ''}`}
          style={{ background: !s.showArchives ? COLORS.gold : COLORS.bgCard, color: !s.showArchives ? '#fff' : COLORS.textMuted }}
          data-testid="toggle-active-appointments">Today's Appointments</button>
        <button onClick={() => s.setShowArchives(true)}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${s.showArchives ? 'shadow-md' : ''}`}
          style={{ background: s.showArchives ? '#6B7280' : COLORS.bgCard, color: s.showArchives ? '#fff' : COLORS.textMuted }}
          data-testid="toggle-archives">Archives</button>
      </div>

      {s.showArchives ? (
        <div className="space-y-3">
          <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: COLORS.bgCard }}>
            <Clock className="w-5 h-5" style={{ color: COLORS.textMuted }} />
            <div>
              <p className="text-sm font-bold" style={{ color: COLORS.textLight }}>Past 30 Days Archives</p>
              <p className="text-[10px]" style={{ color: COLORS.textMuted }}>Completed & cancelled appointments (post IST day-end)</p>
            </div>
          </div>
          {s.loadingArchives ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.gold }} /></div>
          ) : s.archivedAppointments.length === 0 ? (
            <div className="text-center py-12 rounded-2xl" style={{ background: COLORS.bgCard }}>
              <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: COLORS.textMuted }} />
              <p className="text-sm" style={{ color: COLORS.textMuted }}>No archived appointments</p>
            </div>
          ) : (
            <div className="space-y-2">
              {s.archivedAppointments.map(apt => (
                <div key={apt.id} className="rounded-2xl p-3 shadow-sm" style={{ background: COLORS.bgCard, opacity: 0.85 }} data-testid={`archive-apt-${apt.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate" style={{ color: COLORS.textLight }}>{apt.patient_name || 'Patient'}</p>
                      <p className="text-[11px]" style={{ color: COLORS.textMuted }}>
                        {apt.date || apt.appointment_date} &middot; {apt.time || apt.slot || 'N/A'} &middot; Dr. {apt.doctor || 'N/A'}
                      </p>
                      {apt.token_number && <p className="text-[10px] mt-0.5" style={{ color: COLORS.gold }}>Token #{apt.token_number}</p>}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg ml-2 flex-shrink-0"
                      style={{ background: (apt.status === 'Completed' || apt.status === 'completed') ? COLORS.teal + '20' : COLORS.danger + '20', color: (apt.status === 'Completed' || apt.status === 'completed') ? COLORS.teal : COLORS.danger }}>
                      {apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Top Bar: Date Picker + View Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-2xl p-3 shadow-sm" style={{ background: COLORS.bgCard }}>
              <Calendar className="w-4 h-4" style={{ color: COLORS.gold }} />
              {s.appointmentViewMode === 'list' ? (
                <>
                  <input type="date" value={s.selectedDate} onChange={(e) => { lightTap(); s.setSelectedDate(e.target.value); }}
                    className="flex-1 text-sm font-medium bg-transparent outline-none" style={{ color: COLORS.textLight }} />
                  <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: COLORS.gold + '20', color: COLORS.gold }}>{s.getDayName(s.selectedDate)}</span>
                </>
              ) : (
                <span className="flex-1 text-sm font-medium" style={{ color: COLORS.textLight }}>
                  {new Date(s.calendarYear, s.calendarMonth - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
            <div className="flex rounded-xl overflow-hidden" style={{ background: COLORS.bgCard }}>
              <button data-testid="view-toggle-list" onClick={() => { lightTap(); s.setAppointmentViewMode('list'); }}
                className="px-3 py-2.5 text-xs font-medium transition-colors"
                style={{ background: s.appointmentViewMode === 'list' ? COLORS.gold : 'transparent', color: s.appointmentViewMode === 'list' ? '#fff' : COLORS.textMuted }}>List</button>
              <button data-testid="view-toggle-calendar" onClick={() => { lightTap(); s.setAppointmentViewMode('calendar'); }}
                className="px-3 py-2.5 text-xs font-medium transition-colors"
                style={{ background: s.appointmentViewMode === 'calendar' ? COLORS.gold : 'transparent', color: s.appointmentViewMode === 'calendar' ? '#fff' : COLORS.textMuted }}>Cal</button>
            </div>
          </div>

          {/* Session Filter */}
          <div className="flex items-center gap-1.5 rounded-2xl p-1.5" style={{ background: COLORS.bgCard }}>
            {[
              { key: 'all', label: 'All', icon: null },
              { key: 'morning', label: 'Morning', sublabel: '11:30AM–2PM', icon: Sun },
              { key: 'evening', label: 'Evening', sublabel: '6PM–10PM', icon: Moon },
            ].map(opt => {
              const active = s.sessionFilter === opt.key;
              return (
                <button key={opt.key}
                  onClick={() => { lightTap(); s.setSessionFilter(opt.key); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all"
                  style={active
                    ? { background: 'linear-gradient(135deg, #0D9488, #0F766E)', color: '#fff', boxShadow: '0 2px 8px rgba(13,148,136,0.3)' }
                    : { background: 'transparent', color: COLORS.textMuted }
                  }
                  data-testid={`session-filter-${opt.key}`}>
                  {opt.icon && <opt.icon className="w-3.5 h-3.5" />}
                  {opt.label}
                  {active && opt.sublabel && <span className="text-[9px] font-normal opacity-80">{opt.sublabel}</span>}
                </button>
              );
            })}
          </div>

          {/* LIST VIEW */}
          {s.appointmentViewMode === 'list' && (
            displayAppointments.length === 0 ? (
              <div className="text-center py-12 rounded-2xl" style={{ background: COLORS.bgCard }}>
                <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: COLORS.textMuted }} />
                <p className="text-sm" style={{ color: COLORS.textMuted }}>No appointments for {s.portalTheme?.name || 'selected doctor'} at {s.selectedClinic.replace(' Clinic', '')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayAppointments.map(apt => (
                  <AppointmentCard key={apt.id} apt={apt} config={s.config}
                    isNew={newAptIds.has(apt.id)} statusChanged={changedStatusIds.has(apt.id)}
                    onCheckIn={() => s.handleCheckIn(apt)} onWithDoctor={() => s.updateStatus(apt.id, 'WithDoctor')}
                    onCloseBilling={() => setBillingApt(apt)}
                    onAddCharges={(a) => setChargesApt(a)}
                    onCancel={() => s.updateStatus(apt.id, 'Cancelled')} onReprint={s.reprintToken}
                    onPrintBill={s.printBill} onSendReview={s.sendReviewRequest} printerConnected={s.printerConnected} />
                ))}
              </div>
            )
          )}

          {/* CALENDAR VIEW */}
          {s.appointmentViewMode === 'calendar' && (
            <div data-testid="staff-calendar-view">
              <div className="flex items-center justify-between rounded-2xl p-3 mb-3" style={{ background: COLORS.bgCard }}>
                <button onClick={() => { lightTap(); if (s.calendarMonth === 1) { s.setCalendarMonth(12); s.setCalendarYear(y => y - 1); } else s.setCalendarMonth(m => m - 1); }}
                  className="p-2 rounded-lg" style={{ background: COLORS.bgDark }}><ChevronRight className="w-4 h-4 rotate-180" style={{ color: COLORS.textLight }} /></button>
                <span className="text-sm font-semibold" style={{ color: COLORS.textLight }}>
                  {new Date(s.calendarYear, s.calendarMonth - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => { lightTap(); if (s.calendarMonth === 12) { s.setCalendarMonth(1); s.setCalendarYear(y => y + 1); } else s.setCalendarMonth(m => m + 1); }}
                  className="p-2 rounded-lg" style={{ background: COLORS.bgDark }}><ChevronRight className="w-4 h-4" style={{ color: COLORS.textLight }} /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
                  <div key={day} className="text-center text-[10px] font-medium py-1" style={{ color: COLORS.textMuted }}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const firstDay = new Date(s.calendarYear, s.calendarMonth - 1, 1).getDay();
                  const daysInMonth = new Date(s.calendarYear, s.calendarMonth, 0).getDate();
                  const today = new Date().toISOString().split('T')[0];
                  const cells = [];
                  for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} className="aspect-square" />);
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${s.calendarYear}-${String(s.calendarMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const dayData = s.calendarData.find(cd => cd.date === dateStr);
                    const count = dayData?.count || 0;
                    const isToday = dateStr === today;
                    const isSelected = dateStr === s.selectedDate;
                    cells.push(
                      <button key={dateStr} data-testid={`cal-day-${d}`}
                        onClick={() => { lightTap(); s.setSelectedDate(dateStr); s.setAppointmentViewMode('list'); }}
                        className="aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all"
                        style={{ background: isSelected ? COLORS.gold : isToday ? COLORS.teal + '30' : COLORS.bgCard, border: isToday ? `1px solid ${COLORS.teal}` : '1px solid transparent' }}>
                        <span className="text-xs font-medium" style={{ color: isSelected ? '#fff' : COLORS.textLight }}>{d}</span>
                        {count > 0 && <span className="text-[9px] font-bold mt-0.5 px-1 rounded-full" style={{ background: count >= 5 ? COLORS.danger + '30' : COLORS.gold + '30', color: count >= 5 ? '#FCA5A5' : COLORS.gold }}>{count}</span>}
                      </button>
                    );
                  }
                  return cells;
                })()}
              </div>
              <div className="flex items-center justify-center gap-4 mt-3 text-[10px]" style={{ color: COLORS.textMuted }}>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.teal }} /> Today</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.gold }} /> Selected</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.danger }} /> 5+ appts</span>
              </div>
              <div className="text-center mt-3 text-[11px]" style={{ color: COLORS.textMuted }}>Tap a date to view its appointments</div>
            </div>
          )}
        </>
      )}

      {/* Billing Checkout Modal */}
      {billingApt && (
        <BillingCheckoutModal
          appointment={billingApt}
          feeCodes={s.config?.fee_codes}
          scanFees={s.config?.scan_fees}
          onComplete={handleBillingComplete}
          onClose={() => setBillingApt(null)}
        />
      )}
      {chargesApt && (
        <DoctorChargesModal
          appointment={chargesApt}
          feeCodes={s.config?.fee_codes}
          scanFees={s.config?.scan_fees}
          onComplete={handleDoctorCharges}
          onClose={() => setChargesApt(null)}
        />
      )}
    </div>
  );
};

export default StaffAppointmentsView;
