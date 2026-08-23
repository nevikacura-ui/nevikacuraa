import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Clock, User, MapPin, Loader2, Home, TestTube, Plus, X
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const AppointmentCalendar = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showHomeTest, setShowHomeTest] = useState(searchParams.get('hometest') === 'true');
  const [showPreConsult, setShowPreConsult] = useState(!!searchParams.get('preconsult'));
  const [preConsultAptId, setPreConsultAptId] = useState(searchParams.get('preconsult') || '');
  const [patientPhone, setPatientPhone] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('patientInfo');
    if (stored) {
      try {
        const info = JSON.parse(stored);
        setPatientPhone(info.mobile || info.phone || '');
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => { fetchCalendar(); }, [month, year, patientPhone]);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      let url = `${API}/api/appointments/v2/calendar?month=${month}&year=${year}`;
      if (patientPhone) {
        url += `&patient_phone=${encodeURIComponent(patientPhone)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setCalendarData(data.calendar || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateStr = (d) => `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const getDateData = (d) => calendarData.find(c => c.date === dateStr(d));
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const selectedAppts = selectedDate ? getDateData(selectedDate)?.appointments || [] : [];

  const statusColor = (s) => {
    const map = { Booked: 'bg-amber-500', CheckedIn: 'bg-yellow-500', WithDoctor: 'bg-purple-500', Completed: 'bg-green-500' };
    return map[s] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-[#0A0A1A] text-white pb-24" data-testid="appointment-calendar">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0F0F1F] border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/10" data-testid="back-btn">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-lg">My Appointments</h1>
          </div>
          <Button onClick={() => setShowHomeTest(true)} variant="outline" className="rounded-xl h-9 px-3 border-teal-500/30 text-teal-400 hover:bg-teal-500/10" data-testid="schedule-home-test-btn">
            <Home className="w-4 h-4 mr-1" /> Home Test
          </Button>
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Month Navigator */}
        <div className="flex items-center justify-between bg-[#141428] rounded-2xl p-3 border border-white/10">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white/10" data-testid="prev-month"><ChevronLeft className="w-5 h-5" /></button>
          <h2 className="font-bold text-base">{MONTHS[month-1]} {year}</h2>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/10" data-testid="next-month"><ChevronRight className="w-5 h-5" /></button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-[#141428] rounded-2xl border border-white/10 p-3">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-500 py-1">{d}</div>)}
          </div>
          {/* Date cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={`e-${i}`} />;
              const data = getDateData(d);
              const isToday = dateStr(d) === todayStr;
              const isSelected = selectedDate === d;
              const hasApts = data && data.count > 0;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all ${
                    isSelected ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' :
                    isToday ? 'bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/30' :
                    hasApts ? 'bg-white/5 hover:bg-white/10' : 'hover:bg-white/5'
                  }`}
                  data-testid={`date-${d}`}
                >
                  {d}
                  {hasApts && !isSelected && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {Object.entries(data.status_summary || {}).slice(0, 3).map(([status, count]) => (
                        <div key={status} className={`w-1.5 h-1.5 rounded-full ${statusColor(status)}`} />
                      ))}
                    </div>
                  )}
                  {isSelected && hasApts && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-[9px] font-bold flex items-center justify-center">{data.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Appointments */}
        {selectedDate && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-400">{dateStr(selectedDate)} &middot; {selectedAppts.length} visit{selectedAppts.length !== 1 ? 's' : ''}</h3>
            {selectedAppts.length === 0 ? (
              <div className="bg-[#141428] rounded-2xl border border-white/10 p-6 text-center">
                <CalendarIcon className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                <p className="text-gray-500 text-sm">No appointments on this date</p>
                <Button onClick={() => navigate('/diagyn')} className="mt-3 bg-teal-500 hover:bg-teal-600 rounded-xl h-9" data-testid="book-appointment-btn">
                  Book Appointment
                </Button>
              </div>
            ) : (
              selectedAppts.map(apt => (
                <div key={apt.id} className="bg-[#141428] rounded-2xl border border-white/10 p-4" data-testid={`apt-${apt.id}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{apt.doctor}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{apt.clinic}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                      apt.status === 'Booked' ? 'bg-amber-500/15 text-amber-400 status-booked' :
                      apt.status === 'Completed' ? 'bg-green-500/15 text-green-400 status-completed' :
                      apt.status === 'CheckedIn' ? 'bg-yellow-500/15 text-yellow-400 status-checkedin' :
                      'bg-purple-500/15 text-purple-400'
                    }`}>{apt.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{apt.time}</span>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{apt.appointment_type || 'NORMAL'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Home Test Scheduler Modal */}
      {showHomeTest && <HomeTestModal onClose={() => setShowHomeTest(false)} />}

      {/* Pre-Consultation Form Modal */}
      {showPreConsult && <PreConsultModal appointmentId={preConsultAptId} onClose={() => setShowPreConsult(false)} />}
    </div>
  );
};

const HomeTestModal = ({ onClose }) => {
  const [form, setForm] = useState({
    patient_name: '', patient_phone: '', address: '', tests: '',
    preferred_date: '', preferred_time: 'Morning (7-10 AM)', special_instructions: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('patientInfo');
    if (stored) {
      const info = JSON.parse(stored);
      setForm(f => ({ ...f, patient_name: info.name || '', patient_phone: info.mobile || info.phone || '' }));
    }
  }, []);

  const handleSubmit = async () => {
    if (!form.patient_name || !form.patient_phone || !form.address || !form.tests || !form.preferred_date) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/appointments/v2/home-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tests: form.tests.split(',').map(t => t.trim()).filter(Boolean),
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Home test collection scheduled!');
        onClose();
      }
    } catch {
      toast.error('Failed to schedule');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-[#141428] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-white/10 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="home-test-modal">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-white">Schedule Home Test</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <div className="space-y-3">
            <Input value={form.patient_name} onChange={e => setForm(f => ({...f, patient_name: e.target.value}))}
              placeholder="Patient Name *" className="bg-[#1E1E36] border-white/10 text-white rounded-xl" data-testid="ht-name" />
            <Input value={form.patient_phone} onChange={e => setForm(f => ({...f, patient_phone: e.target.value.replace(/\D/g,'').slice(0,10)}))}
              placeholder="Phone Number *" className="bg-[#1E1E36] border-white/10 text-white rounded-xl" data-testid="ht-phone" />
            <Input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))}
              placeholder="Collection Address *" className="bg-[#1E1E36] border-white/10 text-white rounded-xl" data-testid="ht-address" />
            <Input value={form.tests} onChange={e => setForm(f => ({...f, tests: e.target.value}))}
              placeholder="Tests (comma separated) *" className="bg-[#1E1E36] border-white/10 text-white rounded-xl" data-testid="ht-tests" />
            <Input type="date" value={form.preferred_date} onChange={e => setForm(f => ({...f, preferred_date: e.target.value}))}
              className="bg-[#1E1E36] border-white/10 text-white rounded-xl" data-testid="ht-date" />
            <select value={form.preferred_time} onChange={e => setForm(f => ({...f, preferred_time: e.target.value}))}
              className="w-full h-10 px-3 rounded-xl bg-[#1E1E36] border border-white/10 text-white text-sm" data-testid="ht-time">
              <option>Morning (7-10 AM)</option>
              <option>Afternoon (12-3 PM)</option>
              <option>Evening (5-7 PM)</option>
            </select>
            <Input value={form.special_instructions} onChange={e => setForm(f => ({...f, special_instructions: e.target.value}))}
              placeholder="Special Instructions (optional)" className="bg-[#1E1E36] border-white/10 text-white rounded-xl" data-testid="ht-instructions" />
          </div>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 bg-teal-500 hover:bg-teal-600 rounded-xl font-bold" data-testid="ht-submit">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><TestTube className="w-4 h-4 mr-2" />Schedule Collection</>}
          </Button>
          <p className="text-[10px] text-gray-500 text-center">Collection fee: ₹100 &middot; Payable at collection</p>
        </div>
      </div>
    </div>
  );
};

const PreConsultModal = ({ appointmentId, onClose }) => {
  const [form, setForm] = useState({
    chief_complaint: '', duration: '', current_medications: '', allergies: '',
    bp: '', weight: '', temperature: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.chief_complaint) { toast.error('Please describe your chief complaint'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/appointments/v2/pre-consultation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: appointmentId,
          chief_complaint: form.chief_complaint,
          duration: form.duration,
          current_medications: form.current_medications,
          allergies: form.allergies,
          vitals: { bp: form.bp, weight: form.weight, temperature: form.temperature }
        })
      });
      const data = await res.json();
      if (data.status === 'success') { toast.success('Pre-consultation form submitted!'); onClose(); }
      else toast.error(data.detail || 'Submission failed');
    } catch { toast.error('Failed to submit'); }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-[#141428] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-white/10 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="pre-consult-modal">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg text-white">Pre-Consultation Form</h2>
              <p className="text-xs text-gray-400 mt-0.5">Save time at the clinic by filling this form</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Chief Complaint *</label>
              <textarea value={form.chief_complaint} onChange={e => setForm(f => ({...f, chief_complaint: e.target.value}))}
                placeholder="Describe your main health concern..." rows={3}
                className="w-full px-3 py-2 rounded-xl bg-[#1E1E36] border border-white/10 text-white text-sm resize-none placeholder:text-gray-500" data-testid="pc-complaint" />
            </div>
            <Input value={form.duration} onChange={e => setForm(f => ({...f, duration: e.target.value}))}
              placeholder="How long? (e.g., 3 days, 2 weeks)" className="bg-[#1E1E36] border-white/10 text-white rounded-xl" data-testid="pc-duration" />
            <Input value={form.current_medications} onChange={e => setForm(f => ({...f, current_medications: e.target.value}))}
              placeholder="Current medications (if any)" className="bg-[#1E1E36] border-white/10 text-white rounded-xl" data-testid="pc-medications" />
            <Input value={form.allergies} onChange={e => setForm(f => ({...f, allergies: e.target.value}))}
              placeholder="Known allergies (if any)" className="bg-[#1E1E36] border-white/10 text-white rounded-xl" data-testid="pc-allergies" />
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Vitals (optional)</label>
              <div className="grid grid-cols-3 gap-2">
                <Input value={form.bp} onChange={e => setForm(f => ({...f, bp: e.target.value}))}
                  placeholder="BP" className="bg-[#1E1E36] border-white/10 text-white rounded-xl text-xs" data-testid="pc-bp" />
                <Input value={form.weight} onChange={e => setForm(f => ({...f, weight: e.target.value}))}
                  placeholder="Weight (kg)" className="bg-[#1E1E36] border-white/10 text-white rounded-xl text-xs" data-testid="pc-weight" />
                <Input value={form.temperature} onChange={e => setForm(f => ({...f, temperature: e.target.value}))}
                  placeholder="Temp (°F)" className="bg-[#1E1E36] border-white/10 text-white rounded-xl text-xs" data-testid="pc-temp" />
              </div>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 bg-teal-500 hover:bg-teal-600 rounded-xl font-bold" data-testid="pc-submit">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Pre-Consultation Form'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentCalendar;
