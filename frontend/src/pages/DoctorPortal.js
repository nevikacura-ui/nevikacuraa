import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, User, Lock, LogOut, Phone, Calendar, Clock, 
  CheckCircle2, Stethoscope, IndianRupee, RefreshCw,
  ChevronRight, Loader2, Users, Building2, X, FileText
} from 'lucide-react';
import { lightTap, mediumTap, heavyTap, successPattern, errorPattern, selectionTap } from '@/utils/haptics';

const API = process.env.REACT_APP_BACKEND_URL;

// Doctor Portal - Dark Teal + Navy Blue Buttons
const COLORS = {
  primary: '#0f3129',      // Darkest Teal (header/background)
  primaryLight: '#1a4d3f', // Deep Teal
  accent: '#1e3a5f',       // Navy Blue (buttons - distinct from staff)
  accentLight: '#e0f2ed',  // Light Teal
  lime: '#7ed957',         // Lime for success states
};

const STATUS_STYLES = {
  'Booked': { bg: '#dbeafe', text: '#1d4ed8', label: 'BOOKED' },
  'CheckedIn': { bg: '#fef3c7', text: '#d97706', label: 'WAITING' },
  'WithDoctor': { bg: '#e9d5ff', text: '#7c3aed', label: 'IN CONSULT' },
  'Completed': { bg: '#dcfce7', text: '#16a34a', label: 'DONE' },
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('doctorToken');
  return { headers: { Authorization: `Bearer ${token}` } };
};

const getIndianDate = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
};

// ============ Main Component ============
const DoctorPortal = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [selectedDate, setSelectedDate] = useState(getIndianDate());
  const [selectedClinic, setSelectedClinic] = useState('all');
  const [appointments, setAppointments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [config, setConfig] = useState(null);
  
  // Completion modal
  const [showModal, setShowModal] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);
  const [feeCode, setFeeCode] = useState('');
  const [scanCodes, setScanCodes] = useState([]);
  const [notes, setNotes] = useState('');

  // ============ Auth ============
  useEffect(() => {
    const token = localStorage.getItem('doctorToken');
    const info = localStorage.getItem('doctorInfo');
    if (token && info) {
      try {
        setDoctorInfo(JSON.parse(info));
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('doctorToken');
        localStorage.removeItem('doctorInfo');
      }
    }
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      errorPattern();
      toast.error('Enter credentials');
      return;
    }
    setLoading(true);
    heavyTap();
    try {
      const res = await axios.post(`${API}/api/staff/login`, { username, password });
      localStorage.setItem('doctorToken', res.data.token);
      const info = {
        name: res.data.staff?.name || res.data.name,
        role: res.data.staff?.role || res.data.role,
        doctor: res.data.staff?.doctor || res.data.staff?.name
      };
      localStorage.setItem('doctorInfo', JSON.stringify(info));
      setDoctorInfo(info);
      setIsAuthenticated(true);
      successPattern();
      toast.success(`Welcome, ${info.name}!`);
    } catch (error) {
      errorPattern();
      toast.error('Login failed');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    heavyTap();
    localStorage.removeItem('doctorToken');
    localStorage.removeItem('doctorInfo');
    setIsAuthenticated(false);
    toast.success('Logged out');
  };

  // ============ Data Loading ============
  const loadConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/diagyn-staff/config`, getAuthHeaders());
      setConfig(res.data);
    } catch (error) {
      console.error('Config error:', error);
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await axios.get(`${API}/api/diagyn-staff/appointments/by-date`, {
        params: { date: selectedDate, clinic: selectedClinic === 'all' ? undefined : selectedClinic },
        ...getAuthHeaders()
      });
      // Filter to show only appointments for this doctor or all if admin
      let apts = res.data.appointments || [];
      if (doctorInfo?.doctor && !doctorInfo.role?.includes('admin')) {
        apts = apts.filter(a => a.doctor?.includes(doctorInfo.doctor?.split(' ').pop()));
      }
      setAppointments(apts);
      setSummary(res.data.summary || {});
    } catch (error) {
      if (error.response?.status === 401) {
        handleLogout();
        toast.error('Session expired');
      }
    }
    setRefreshing(false);
  }, [selectedDate, selectedClinic, doctorInfo]);

  useEffect(() => {
    if (isAuthenticated) {
      loadConfig();
      loadAppointments();
    }
  }, [isAuthenticated, loadConfig, loadAppointments]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(loadAppointments, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadAppointments]);

  // ============ Actions ============
  const startConsultation = async (apt) => {
    heavyTap();
    try {
      await axios.put(`${API}/api/diagyn-staff/appointments/${apt.id}/status`,
        { status: 'WithDoctor' }, getAuthHeaders());
      successPattern();
      toast.success('Consultation started');
      loadAppointments();
    } catch (error) {
      errorPattern();
      toast.error('Failed');
    }
  };

  const openCompleteModal = (apt) => {
    setSelectedApt(apt);
    setFeeCode('');
    setScanCodes([]);
    setNotes('');
    setShowModal(true);
    mediumTap();
  };

  const completeConsultation = async () => {
    if (!feeCode) {
      errorPattern();
      toast.error('Select fee code');
      return;
    }
    
    const doctor = selectedApt?.doctor;
    const feeConfig = config?.fee_codes?.[doctor]?.[feeCode];
    let total = feeConfig?.amount || 0;
    scanCodes.forEach(code => {
      total += config?.scan_fees?.[code]?.amount || 0;
    });
    
    setLoading(true);
    heavyTap();
    try {
      await axios.put(`${API}/api/diagyn-staff/appointments/${selectedApt.id}/status`, {
        status: 'Completed',
        fee_code: feeCode,
        scan_codes: scanCodes,
        total_amount: total,
        notes: notes
      }, getAuthHeaders());
      successPattern();
      toast.success(`Completed! ₹${total}`);
      setShowModal(false);
      loadAppointments();
    } catch (error) {
      errorPattern();
      toast.error('Failed');
    }
    setLoading(false);
  };

  const toggleScanCode = (code) => {
    lightTap();
    setScanCodes(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const calculateTotal = () => {
    if (!selectedApt || !feeCode) return 0;
    const doctor = selectedApt.doctor;
    let total = config?.fee_codes?.[doctor]?.[feeCode]?.amount || 0;
    scanCodes.forEach(code => {
      total += config?.scan_fees?.[code]?.amount || 0;
    });
    return total;
  };

  // ============ Login Screen ============
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" 
           style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, #14532d 100%)` }}>
        <Card className="w-full max-w-sm p-6 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                 style={{ background: COLORS.primary }}>
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>Doctor Portal</h1>
            <p className="text-sm text-gray-500">Mango Health Labs</p>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="Username" className="pl-10 h-11" data-testid="doctor-username" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" className="pl-10 h-11" data-testid="doctor-password"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()} />
            </div>
            <Button onClick={handleLogin} disabled={loading}
              className="w-full h-12 text-base font-bold" data-testid="doctor-login-btn"
              style={{ background: COLORS.accent }}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'LOGIN'}
            </Button>
          </div>
          <Button variant="ghost" onClick={() => navigate('/')} className="w-full mt-4 text-gray-500">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </Card>
      </div>
    );
  }

  // ============ Main Portal ============
  const waitingPatients = appointments.filter(a => a.status === 'CheckedIn');
  const inConsultPatients = appointments.filter(a => a.status === 'WithDoctor');
  const completedPatients = appointments.filter(a => a.status === 'Completed');

  return (
    <div className="min-h-screen" style={{ background: '#f1f5f9' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-3 py-3" style={{ background: COLORS.primary }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-white" />
            <div>
              <h1 className="text-white font-bold text-base">Doctor Portal</h1>
              <p className="text-white/70 text-xs">{doctorInfo?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => { lightTap(); loadAppointments(); }}
              className="text-white hover:bg-white/20 h-8 w-8 p-0" disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}
              className="text-white hover:bg-white/20 h-8 w-8 p-0">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Date & Clinic Filter */}
        <div className="flex items-center gap-2 mt-2">
          <input type="date" value={selectedDate}
            onChange={(e) => { lightTap(); setSelectedDate(e.target.value); }}
            className="flex-1 h-9 px-3 rounded-lg text-sm bg-white/10 text-white border-0" />
          <select value={selectedClinic} onChange={(e) => { selectionTap(); setSelectedClinic(e.target.value); }}
            className="h-9 px-3 rounded-lg text-sm bg-white/10 text-white border-0">
            <option value="all">All Clinics</option>
            <option value="Pushpa Clinic">Pushpa</option>
            <option value="Amnion Clinic">Amnion</option>
          </select>
        </div>
      </header>

      {/* Stats */}
      <div className="px-3 py-2 bg-white border-b flex gap-2">
        <div className="flex-1 text-center p-2 rounded-lg" style={{ background: '#fef3c7' }}>
          <p className="text-2xl font-bold text-amber-600">{waitingPatients.length}</p>
          <p className="text-xs text-amber-700">Waiting</p>
        </div>
        <div className="flex-1 text-center p-2 rounded-lg" style={{ background: '#e9d5ff' }}>
          <p className="text-2xl font-bold text-purple-600">{inConsultPatients.length}</p>
          <p className="text-xs text-purple-700">In Consult</p>
        </div>
        <div className="flex-1 text-center p-2 rounded-lg" style={{ background: '#dcfce7' }}>
          <p className="text-2xl font-bold text-green-600">{completedPatients.length}</p>
          <p className="text-xs text-green-700">Done</p>
        </div>
      </div>

      {/* Content */}
      <main className="p-3 pb-20">
        {/* Waiting Queue */}
        {waitingPatients.length > 0 && (
          <div className="mb-4">
            <h2 className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" /> WAITING ({waitingPatients.length})
            </h2>
            <div className="space-y-2">
              {waitingPatients.map(apt => (
                <PatientCard key={apt.id} apt={apt} type="waiting" 
                  onAction={() => startConsultation(apt)} />
              ))}
            </div>
          </div>
        )}

        {/* In Consultation */}
        {inConsultPatients.length > 0 && (
          <div className="mb-4">
            <h2 className="text-sm font-bold text-purple-700 mb-2 flex items-center gap-2">
              <Stethoscope className="w-4 h-4" /> IN CONSULTATION ({inConsultPatients.length})
            </h2>
            <div className="space-y-2">
              {inConsultPatients.map(apt => (
                <PatientCard key={apt.id} apt={apt} type="consult" 
                  onAction={() => openCompleteModal(apt)} />
              ))}
            </div>
          </div>
        )}

        {/* Completed Today */}
        {completedPatients.length > 0 && (
          <div className="mb-4">
            <h2 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> COMPLETED ({completedPatients.length})
            </h2>
            <div className="space-y-2">
              {completedPatients.map(apt => (
                <PatientCard key={apt.id} apt={apt} type="done" />
              ))}
            </div>
          </div>
        )}

        {appointments.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No appointments today</p>
          </div>
        )}
      </main>

      {/* Complete Consultation Modal */}
      {showModal && selectedApt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b" style={{ background: COLORS.primary }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-lg">Complete Consultation</h3>
                  <p className="text-white/80 text-sm">{selectedApt.patient_name}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-full">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {/* Fee Code Selection */}
              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">CONSULTATION FEE</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(config?.fee_codes?.[selectedApt.doctor] || {}).map(([code, info]) => (
                    <button key={code}
                      onClick={() => { mediumTap(); setFeeCode(code); }}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        feeCode === code ? 'shadow-md' : 'border-gray-200'
                      }`}
                      style={feeCode === code ? { borderColor: COLORS.primary, background: COLORS.primaryLight } : {}}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold" style={{ color: COLORS.primary }}>{code}</span>
                        <span className="font-bold" style={{ color: COLORS.accent }}>₹{info.amount}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{info.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sonography/Scan Fees */}
              {config?.scan_fees && (
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">SONOGRAPHY / SCANS</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(config.scan_fees).map(([code, info]) => (
                      <button key={code}
                        onClick={() => toggleScanCode(code)}
                        className={`p-2 rounded-xl border-2 text-center transition-all ${
                          scanCodes.includes(code) ? 'shadow-md' : 'border-gray-200'
                        }`}
                        style={scanCodes.includes(code) ? { borderColor: COLORS.accent, background: COLORS.accentLight } : {}}>
                        <span className="font-bold text-sm" style={{ color: COLORS.accent }}>{code}</span>
                        <p className="text-xs text-gray-600">₹{info.amount}</p>
                        <p className="text-[10px] text-gray-500 truncate">{info.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">NOTES (Optional)</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..." className="h-10" />
              </div>

              {/* Total */}
              {feeCode && (
                <div className="p-4 rounded-xl" style={{ background: COLORS.primaryLight }}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg" style={{ color: COLORS.primary }}>TOTAL</span>
                    <span className="text-3xl font-bold" style={{ color: COLORS.accent }}>
                      ₹{calculateTotal().toLocaleString('en-IN')}
                    </span>
                  </div>
                  {scanCodes.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Fee: ₹{config?.fee_codes?.[selectedApt.doctor]?.[feeCode]?.amount || 0} + 
                      Scans: ₹{scanCodes.reduce((sum, c) => sum + (config?.scan_fees?.[c]?.amount || 0), 0)}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex gap-2">
              <Button variant="outline" className="flex-1 h-12" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={completeConsultation} disabled={loading || !feeCode}
                className="flex-1 h-12 text-base font-bold" style={{ background: COLORS.accent }}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                COMPLETE
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// ============ Patient Card ============
const PatientCard = ({ apt, type, onAction }) => {
  const status = STATUS_STYLES[apt.status] || STATUS_STYLES['Booked'];
  
  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden border-l-4`}
         style={{ borderLeftColor: status.text }}>
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: type === 'waiting' ? '#fef3c7' : type === 'consult' ? '#e9d5ff' : '#dcfce7' }}>
              <User className="w-6 h-6" style={{ color: status.text }} />
            </div>
            <div>
              <h4 className="font-bold text-base">{apt.patient_name}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-gray-100">{apt.booking_id}</span>
                {apt.time && <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {apt.time}
                </span>}
              </div>
            </div>
          </div>
          
          {type === 'done' && apt.total_amount > 0 && (
            <span className="font-bold text-lg" style={{ color: '#F97316' }}>₹{apt.total_amount}</span>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Building2 className="w-3 h-3" />
            <span>{apt.clinic?.replace(' Clinic', '')}</span>
            {apt.patient_id && <span className="text-gray-400">• {apt.patient_id}</span>}
          </div>
          
          {type === 'waiting' && (
            <button onClick={() => { heavyTap(); onAction(); }}
              className="px-4 py-2 rounded-lg text-white text-sm font-bold shadow transition-all active:scale-95"
              style={{ background: '#1e3a5f' }}>
              START CONSULT <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
          
          {type === 'consult' && (
            <button onClick={() => { heavyTap(); onAction(); }}
              className="px-4 py-2 rounded-lg text-white text-sm font-bold shadow transition-all active:scale-95"
              style={{ background: '#1e3a5f' }}>
              COMPLETE <CheckCircle2 className="w-4 h-4 inline ml-1" />
            </button>
          )}
          
          {type === 'done' && apt.fee_code && (
            <span className="text-xs px-2 py-1 rounded-lg" style={{ background: '#dcfce7', color: '#166534' }}>
              {apt.fee_code} {apt.scan_codes?.length > 0 && `+ ${apt.scan_codes.join(', ')}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorPortal;
