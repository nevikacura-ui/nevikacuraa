import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ArrowLeft, User, Phone, Calendar, Clock,
  Plus, Trash2, Send, FileText, Pill, Search,
  Loader2, CheckCircle2, Stethoscope, Activity,
  Heart, X, Download, Save, FolderOpen,
  Sparkles, ScanLine, Wand2, Camera,
  Mic, Square, Thermometer, Droplets, Scale, HeartPulse,
  ToggleLeft, ToggleRight
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const THEME = {
  bg: '#0A0A0F',
  surface: '#12121A',
  surfaceLight: '#1E1E2A',
  primary: '#0D9488',
  primaryLight: '#2DD4BF',
  accent: '#8B5CF6',
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
};

// ============ 1-0-0 DOSAGE PATTERNS ============
const DOSAGE_PATTERNS = [
  { code: '1-0-0', label: 'Morning only' },
  { code: '0-1-0', label: 'Afternoon only' },
  { code: '0-0-1', label: 'Night only' },
  { code: '1-1-0', label: 'Morning & Afternoon' },
  { code: '1-0-1', label: 'Morning & Night' },
  { code: '0-1-1', label: 'Afternoon & Night' },
  { code: '1-1-1', label: 'Three times daily' },
  { code: '1-1-1-1', label: 'Four times daily' },
  { code: 'SOS', label: 'As needed (SOS)' },
  { code: 'HS', label: 'At bedtime (HS)' },
  { code: 'STAT', label: 'Immediately' },
];

const TIMING_OPTIONS = [
  { value: 'Before food', label: 'Before food' },
  { value: 'After food', label: 'After food' },
  { value: 'With food', label: 'With food' },
  { value: 'Empty stomach', label: 'Empty stomach' },
];

const DURATION_OPTIONS = [
  '3 days', '5 days', '7 days', '10 days', '14 days', '21 days', '30 days', '60 days', '90 days'
];

const TEMPLATE_TYPES = [
  { id: 'diabetes', label: 'Diabetes', icon: Activity, color: '#F59E0B' },
  { id: 'obgyn', label: 'OBGYN', icon: Heart, color: '#EC4899' },
  { id: 'general', label: 'General', icon: Stethoscope, color: '#3B82F6' },
];

// ============ MEDICINE ROW ============
const MedicineRow = ({ medicine, index, onUpdate, onRemove, searchAll }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchMedicines = useCallback(async (query) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const endpoint = searchAll
        ? `${API}/api/emr/formulary/all-search?q=${encodeURIComponent(query)}`
        : `${API}/api/emr/formulary/search?q=${encodeURIComponent(query)}`;
      const response = await axios.get(endpoint);
      setSearchResults(response.data.medicines || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Medicine search failed:', error);
    } finally {
      setSearching(false);
    }
  }, [searchAll]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchMedicines(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchMedicines]);

  const selectMedicine = (med) => {
    onUpdate(index, 'name', med.name);
    onUpdate(index, 'is_formulary', !!med.is_formulary);
    setSearchQuery('');
    setShowSuggestions(false);
    setSearchResults([]);
  };

  return (
    <div data-testid={`medicine-row-${index}`} className="p-4 rounded-xl mb-3" style={{ background: THEME.surfaceLight }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Medicine #{index + 1}</span>
          {medicine.is_formulary && (
            <span className="px-1.5 py-0.5 bg-teal-500/20 text-teal-400 rounded text-[10px] font-bold">TF</span>
          )}
        </div>
        <button data-testid={`remove-medicine-${index}`} onClick={() => onRemove(index)} className="text-red-400 hover:text-red-300">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Medicine Name with Search */}
      <div className="relative mb-3">
        <Label className="text-slate-400 text-xs">Medicine Name *</Label>
        <div className="relative">
          <Input
            data-testid={`medicine-name-${index}`}
            value={medicine.name || searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              if (!medicine.name) {
                setSearchQuery(val);
              } else {
                onUpdate(index, 'name', val);
              }
            }}
            onFocus={() => { if (medicine.name) { setSearchQuery(''); onUpdate(index, 'name', ''); } }}
            placeholder="Type to search Orange Select..."
            className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-10"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
        </div>

        {showSuggestions && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto"
               style={{ background: THEME.surface, border: `1px solid ${THEME.surfaceLight}` }}>
            {searchResults.map((med, i) => (
              <button key={i} onClick={() => selectMedicine(med)}
                      className="w-full px-4 py-2.5 text-left hover:bg-white/5 flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm truncate">{med.name}</p>
                    {med.is_formulary && <span className="px-1 py-0.5 bg-orange-500/20 text-orange-400 rounded text-[9px] font-bold shrink-0">OS</span>}
                  </div>
                  {(med.manufacturer || med.company) && <p className="text-slate-500 text-xs truncate">{med.manufacturer || med.company}</p>}
                </div>
                {med.mrp && <span className="text-slate-400 text-xs shrink-0">₹{med.mrp}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dosage & Frequency (1-0-0) */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <Label className="text-slate-400 text-xs">Dosage</Label>
          <Input
            data-testid={`medicine-dosage-${index}`}
            value={medicine.dosage}
            onChange={(e) => onUpdate(index, 'dosage', e.target.value)}
            placeholder="e.g., 500mg"
            className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-10"
          />
        </div>
        <div>
          <Label className="text-slate-400 text-xs">Frequency (1-0-0)</Label>
          <select
            data-testid={`medicine-frequency-${index}`}
            value={medicine.frequency}
            onChange={(e) => onUpdate(index, 'frequency', e.target.value)}
            className="w-full mt-1 h-10 rounded-xl bg-[#0A0A0F] border border-slate-700 text-white px-3 text-sm"
          >
            <option value="">Select</option>
            {DOSAGE_PATTERNS.map(f => (
              <option key={f.code} value={f.code}>{f.code} — {f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Duration & Timing */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-slate-400 text-xs">Duration</Label>
          <select
            data-testid={`medicine-duration-${index}`}
            value={medicine.duration}
            onChange={(e) => onUpdate(index, 'duration', e.target.value)}
            className="w-full mt-1 h-10 rounded-xl bg-[#0A0A0F] border border-slate-700 text-white px-3 text-sm"
          >
            <option value="">Select</option>
            {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-slate-400 text-xs">Timing</Label>
          <select
            data-testid={`medicine-timing-${index}`}
            value={medicine.timing}
            onChange={(e) => onUpdate(index, 'timing', e.target.value)}
            className="w-full mt-1 h-10 rounded-xl bg-[#0A0A0F] border border-slate-700 text-white px-3 text-sm"
          >
            <option value="">Select</option>
            {TIMING_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

// ============ VITALS SECTION ============
const VitalsSection = ({ vitals, setVitals }) => (
  <Card data-testid="vitals-section" className="p-4 mb-4 rounded-2xl" style={{ background: THEME.surface, border: '1px solid #0D948830' }}>
    <h3 className="text-teal-400 font-semibold mb-3 flex items-center gap-2">
      <HeartPulse className="w-5 h-5" /> Patient Vitals
    </h3>
    <div className="grid grid-cols-3 gap-3">
      <div>
        <Label className="text-slate-400 text-xs flex items-center gap-1"><Droplets className="w-3 h-3" /> BP (mmHg)</Label>
        <Input value={vitals.blood_pressure} onChange={(e) => setVitals({ ...vitals, blood_pressure: e.target.value })}
               placeholder="120/80" className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-9 text-sm"
               data-testid="vital-bp" />
      </div>
      <div>
        <Label className="text-slate-400 text-xs flex items-center gap-1"><HeartPulse className="w-3 h-3" /> Pulse</Label>
        <Input value={vitals.pulse} onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
               placeholder="72" className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-9 text-sm"
               data-testid="vital-pulse" />
      </div>
      <div>
        <Label className="text-slate-400 text-xs flex items-center gap-1"><Thermometer className="w-3 h-3" /> Temp (F)</Label>
        <Input value={vitals.temperature} onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
               placeholder="98.6" className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-9 text-sm"
               data-testid="vital-temp" />
      </div>
      <div>
        <Label className="text-slate-400 text-xs">SpO2 (%)</Label>
        <Input value={vitals.spo2} onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
               placeholder="98" className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-9 text-sm"
               data-testid="vital-spo2" />
      </div>
      <div>
        <Label className="text-slate-400 text-xs flex items-center gap-1"><Scale className="w-3 h-3" /> Weight (kg)</Label>
        <Input value={vitals.weight} onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
               placeholder="70" className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-9 text-sm"
               data-testid="vital-weight" />
      </div>
      <div>
        <Label className="text-slate-400 text-xs">Height (cm)</Label>
        <Input value={vitals.height} onChange={(e) => setVitals({ ...vitals, height: e.target.value })}
               placeholder="170" className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-9 text-sm"
               data-testid="vital-height" />
      </div>
    </div>
  </Card>
);

// ============ MAIN EMR DASHBOARD ============
const DoctorEMRDashboard = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [searchAll, setSearchAll] = useState(false);

  // Template state
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [ocrImage, setOcrImage] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const ocrInputRef = useRef(null);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef(null);

  // Form state
  const [templateType, setTemplateType] = useState('general');
  const [vitals, setVitals] = useState({
    blood_pressure: '', pulse: '', temperature: '', spo2: '', weight: '', height: '', bmi: ''
  });
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState([{ name: '', dosage: '', frequency: '', duration: '', timing: '', notes: '', is_formulary: false }]);
  const [investigations, setInvestigations] = useState([]);
  const [newInvestigation, setNewInvestigation] = useState('');
  const [advice, setAdvice] = useState('');
  const [dietAdvice, setDietAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');

  // Diabetes-specific
  const [diabetesData, setDiabetesData] = useState({
    fasting_sugar: '', pp_sugar: '', hba1c: '', diet_advice: '', exercise_advice: ''
  });
  // OBGYN-specific
  const [obgynData, setObgynData] = useState({
    lmp: '', gestational_age: '', edd: '', gravida: '', para: '', chief_complaint_details: ''
  });

  // ============ AI ============
  const getAISuggestions = async () => {
    if (!chiefComplaints.trim()) { toast.error('Enter chief complaints first'); return; }
    setAiLoading(true);
    try {
      const token = localStorage.getItem('doctorToken');
      const response = await axios.post(`${API}/api/emr/ai/suggest-prescription`, {
        chief_complaints: chiefComplaints,
        patient_age: appointment?.patient_age || '',
        template_type: templateType
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success && response.data.suggestions) {
        const s = response.data.suggestions;
        if (s.diagnosis) setDiagnosis(s.diagnosis);
        if (s.medicines?.length) setMedicines(s.medicines.map(m => ({
          name: m.name || '', dosage: m.dosage || '', frequency: m.frequency || '',
          duration: m.duration || '', timing: m.timing || '', notes: m.notes || '', is_formulary: false
        })));
        if (s.investigations) setInvestigations(s.investigations);
        if (s.advice) setAdvice(s.advice);
        toast.success('AI suggestions applied!');
      }
    } catch { toast.error('AI suggestions failed'); }
    finally { setAiLoading(false); }
  };

  // ============ OCR ============
  const handleOCRImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => { setOcrImage(event.target.result); setOcrResult(null); };
    reader.readAsDataURL(file);
  };

  const processOCR = async () => {
    if (!ocrImage) return;
    setOcrLoading(true);
    try {
      const token = localStorage.getItem('doctorToken');
      const response = await axios.post(`${API}/api/emr/ai/ocr-handwritten`,
        { image_base64: ocrImage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) { setOcrResult(response.data.extracted_data); toast.success('Text extracted!'); }
    } catch { toast.error('OCR failed'); }
    finally { setOcrLoading(false); }
  };

  const applyOCRResult = () => {
    if (!ocrResult) return;
    if (ocrResult.chief_complaints) setChiefComplaints(ocrResult.chief_complaints);
    if (ocrResult.diagnosis) setDiagnosis(ocrResult.diagnosis);
    if (ocrResult.medicines?.length) setMedicines(ocrResult.medicines.map(m => ({
      name: m.name || '', dosage: m.dosage || '', frequency: m.frequency || '',
      duration: m.duration || '', timing: m.timing || '', notes: m.notes || '', is_formulary: false
    })));
    if (ocrResult.investigations?.length) setInvestigations(ocrResult.investigations);
    if (ocrResult.advice) setAdvice(ocrResult.advice);
    setShowOCRModal(false);
    toast.success('Data applied!');
  };

  // ============ VOICE ============
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        await processVoice(new Blob(chunks, { type: 'audio/webm' }));
      };
      setMediaRecorder(recorder);
      recorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch { toast.error('Microphone access denied'); }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const processVoice = async (blob) => {
    setVoiceLoading(true);
    try {
      const token = localStorage.getItem('doctorToken');
      const fd = new FormData();
      fd.append('audio', blob, 'recording.webm');
      const response = await axios.post(`${API}/api/emr/ai/voice-to-prescription-upload`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success && response.data.data) {
        const d = response.data.data;
        if (d.chief_complaints) setChiefComplaints(d.chief_complaints);
        if (d.diagnosis) setDiagnosis(d.diagnosis);
        if (d.medicines?.length) setMedicines(d.medicines.map(m => ({
          name: m.name || '', dosage: m.dosage || '', frequency: m.frequency || '',
          duration: m.duration || '', timing: m.timing || '', notes: m.notes || '', is_formulary: false
        })));
        if (d.investigations?.length) setInvestigations(d.investigations);
        if (d.advice) setAdvice(d.advice);
        toast.success('Voice prescription applied!');
      }
    } catch { toast.error('Voice processing failed'); }
    finally { setVoiceLoading(false); setRecordingTime(0); }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ============ TEMPLATES ============
  const fetchTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const token = localStorage.getItem('doctorToken');
      const response = await axios.get(`${API}/api/emr/templates`, { headers: { Authorization: `Bearer ${token}` } });
      setSavedTemplates(response.data.templates || []);
    } catch { /* silent */ }
    finally { setLoadingTemplates(false); }
  }, []);

  const loadTemplate = async (template) => {
    try {
      const token = localStorage.getItem('doctorToken');
      await axios.get(`${API}/api/emr/templates/${template.template_id}`, { headers: { Authorization: `Bearer ${token}` } });
      setTemplateType(template.template_type || 'general');
      setChiefComplaints(template.chief_complaints || '');
      setDiagnosis(template.diagnosis || '');
      setMedicines(template.medicines?.length ? template.medicines : [{ name: '', dosage: '', frequency: '', duration: '', timing: '', notes: '', is_formulary: false }]);
      setInvestigations(template.investigations || []);
      setAdvice(template.advice || '');
      if (template.diabetes_data) setDiabetesData(template.diabetes_data);
      if (template.obgyn_data) setObgynData(template.obgyn_data);
      setShowTemplateModal(false);
      toast.success(`Template "${template.name}" loaded!`);
    } catch { toast.error('Failed to load template'); }
  };

  const saveAsTemplate = async () => {
    if (!newTemplateName.trim()) { toast.error('Enter template name'); return; }
    if (!medicines.some(m => m.name.trim())) { toast.error('Add at least one medicine'); return; }
    try {
      const token = localStorage.getItem('doctorToken');
      await axios.post(`${API}/api/emr/templates`, {
        name: newTemplateName, category: newTemplateCategory || templateType,
        template_type: templateType, chief_complaints: chiefComplaints, diagnosis,
        medicines: medicines.filter(m => m.name.trim()), investigations, advice,
        diabetes_data: templateType === 'diabetes' ? diabetesData : null,
        obgyn_data: templateType === 'obgyn' ? obgynData : null
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Template saved!');
      setShowSaveTemplateModal(false); setNewTemplateName(''); setNewTemplateCategory('');
      fetchTemplates();
    } catch { toast.error('Failed to save'); }
  };

  const deleteTemplate = async (tid) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      const token = localStorage.getItem('doctorToken');
      await axios.delete(`${API}/api/emr/templates/${tid}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Deleted'); fetchTemplates();
    } catch { toast.error('Failed'); }
  };

  // ============ FETCH APPOINTMENT ============
  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const token = localStorage.getItem('doctorToken');
        if (!token) { toast.error('Login as doctor'); navigate('/doctor-login'); return; }
        const response = await axios.get(`${API}/api/emr/appointment/${bookingId}`,
          { headers: { Authorization: `Bearer ${token}` } });
        setAppointment(response.data);
        if (response.data.doctor_name?.toLowerCase().includes('vikas')) setTemplateType('diabetes');
        else if (response.data.doctor_name?.toLowerCase().includes('neha')) setTemplateType('obgyn');
        fetchTemplates();
      } catch { toast.error('Failed to load appointment'); }
      finally { setLoading(false); }
    };
    if (bookingId) fetchAppointment();
  }, [bookingId, navigate, fetchTemplates]);

  // ============ HANDLERS ============
  const addMedicine = () => setMedicines([...medicines, { name: '', dosage: '', frequency: '', duration: '', timing: '', notes: '', is_formulary: false }]);
  const updateMedicine = (i, field, value) => { const u = [...medicines]; u[i][field] = value; setMedicines(u); };
  const removeMedicine = (i) => { if (medicines.length === 1) { toast.error('At least one medicine'); return; } setMedicines(medicines.filter((_, idx) => idx !== i)); };
  const addInvestigation = () => { if (newInvestigation.trim()) { setInvestigations([...investigations, newInvestigation.trim()]); setNewInvestigation(''); } };
  const removeInvestigation = (i) => setInvestigations(investigations.filter((_, idx) => idx !== i));

  // ============ SAVE ============
  const savePrescription = async () => {
    if (!chiefComplaints.trim()) { toast.error('Enter chief complaints'); return null; }
    if (!diagnosis.trim()) { toast.error('Enter diagnosis'); return null; }
    if (!medicines.some(m => m.name.trim())) { toast.error('Add at least one medicine'); return null; }
    setSaving(true);
    try {
      const token = localStorage.getItem('doctorToken');
      const payload = {
        booking_id: bookingId, template_type: templateType,
        vitals, chief_complaints: chiefComplaints, diagnosis,
        medicines: medicines.filter(m => m.name.trim()),
        investigations, advice, diet_advice: dietAdvice,
        follow_up_date: followUpDate, notes,
        diabetes_data: templateType === 'diabetes' ? diabetesData : null,
        obgyn_data: templateType === 'obgyn' ? obgynData : null
      };
      const response = await axios.post(`${API}/api/emr/prescription/create`, payload,
        { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) { toast.success('Prescription saved!'); return response.data.prescription_id; }
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
    return null;
  };

  const sendToPatient = async () => {
    setSending(true);
    try {
      const pid = await savePrescription();
      if (!pid) { setSending(false); return; }
      const token = localStorage.getItem('doctorToken');
      const response = await axios.post(`${API}/api/emr/prescription/${pid}/send-whatsapp`, {},
        { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) {
        toast.success(`Sent to ${appointment?.patient_phone}!`);
        setTimeout(() => navigate('/doctor-portal'), 2000);
      }
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const downloadPDF = async () => {
    try {
      const pid = await savePrescription();
      if (!pid) return;
      const token = localStorage.getItem('doctorToken');
      const response = await axios.post(`${API}/api/emr/prescription/${pid}/generate-pdf`, {},
        { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success && response.data.pdf_base64) {
        const bytes = atob(response.data.pdf_base64);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        const blob = new Blob([arr], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = response.data.filename || `Rx_${bookingId}.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('PDF downloaded!');
      }
    } catch { toast.error('PDF generation failed'); }
  };

  // ============ RENDER ============
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: THEME.bg }}>
      <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
    </div>
  );

  if (!appointment) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: THEME.bg }}>
      <p className="text-white mb-4">Appointment not found</p>
      <Button data-testid="back-to-portal" onClick={() => navigate('/doctor-portal')} variant="outline">Back to Portal</Button>
    </div>
  );

  return (
    <div data-testid="emr-dashboard" className="min-h-screen pb-32" style={{ background: THEME.bg }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3" style={{ background: `${THEME.surface}ee`, backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-3">
          <button data-testid="emr-back-btn" onClick={() => navigate('/doctor-portal')}
                  className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: THEME.surfaceLight }}>
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-bold text-base">EMR - Prescription</h1>
            <p className="text-slate-500 text-xs">ID: {bookingId}</p>
          </div>
          <div className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: '#0D948830', color: '#2DD4BF' }}>
            DiaGyn
          </div>
        </div>
      </header>

      <main className="px-4 pt-3 max-w-2xl mx-auto">
        {/* Patient Info */}
        <Card data-testid="patient-info-card" className="p-4 mb-4 rounded-2xl" style={{ background: THEME.surface, border: 'none' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${THEME.primary}20` }}>
              <User className="w-6 h-6" style={{ color: THEME.primary }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-base truncate">{appointment.patient_name}</h3>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <span className="text-slate-400 text-xs flex items-center gap-1"><Phone className="w-3 h-3" />{appointment.patient_phone}</span>
                {appointment.patient_age && <span className="text-slate-400 text-xs">Age: {appointment.patient_age}y</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-3 pt-3 border-t border-slate-800 flex-wrap">
            <span className="text-slate-500 text-xs flex items-center gap-1"><Calendar className="w-3 h-3" />{appointment.date}</span>
            <span className="text-slate-500 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{appointment.time}</span>
            {appointment.is_online && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-medium">ONLINE</span>}
          </div>
        </Card>

        {/* Vitals */}
        <VitalsSection vitals={vitals} setVitals={setVitals} />

        {/* AI & Voice Actions */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2">
            {isRecording ? (
              <Button data-testid="stop-recording-btn" onClick={stopRecording}
                      className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white animate-pulse">
                <Square className="w-4 h-4 mr-2 fill-current" /> Stop ({formatTime(recordingTime)})
              </Button>
            ) : voiceLoading ? (
              <Button disabled className="flex-1 h-12 rounded-xl bg-slate-700 text-white">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
              </Button>
            ) : (
              <Button data-testid="voice-dictate-btn" onClick={startRecording}
                      className="flex-1 h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
                <Mic className="w-4 h-4 mr-2" /> Voice Dictate
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button data-testid="scan-rx-btn" onClick={() => setShowOCRModal(true)} variant="outline"
                    className="flex-1 h-10 rounded-xl border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
              <ScanLine className="w-4 h-4 mr-2" /> Scan Rx
            </Button>
            <Button data-testid="ai-suggest-btn" onClick={getAISuggestions} disabled={aiLoading || !chiefComplaints.trim()}
                    className="flex-1 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white">
              {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              AI Suggest
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button data-testid="load-template-btn" onClick={() => setShowTemplateModal(true)} variant="outline"
                    className="flex-1 h-10 rounded-xl border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
              <FolderOpen className="w-4 h-4 mr-2" /> Templates {savedTemplates.length > 0 && `(${savedTemplates.length})`}
            </Button>
            <Button data-testid="save-template-btn" onClick={() => setShowSaveTemplateModal(true)} variant="outline"
                    className="flex-1 h-10 rounded-xl border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
              <Save className="w-4 h-4 mr-2" /> Save Template
            </Button>
          </div>
        </div>

        {/* Template Type */}
        <div className="mb-4">
          <Label className="text-white font-medium mb-2 block text-sm">Template</Label>
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATE_TYPES.map(t => {
              const Icon = t.icon;
              const sel = templateType === t.id;
              return (
                <button key={t.id} data-testid={`template-${t.id}`} onClick={() => setTemplateType(t.id)}
                  className={`p-3 rounded-xl text-center transition-all ${sel ? 'ring-2' : ''}`}
                  style={{ background: sel ? `${t.color}20` : THEME.surfaceLight, ringColor: t.color }}>
                  <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: t.color }} />
                  <span className={`text-xs font-medium ${sel ? 'text-white' : 'text-slate-400'}`}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chief Complaints */}
        <div className="mb-4">
          <Label className="text-white font-medium text-sm">Chief Complaints *</Label>
          <textarea data-testid="chief-complaints" value={chiefComplaints} onChange={(e) => setChiefComplaints(e.target.value)}
                    placeholder="Enter patient's chief complaints..."  rows={2}
                    className="w-full mt-1 p-3 rounded-xl bg-[#1E1E2A] border border-slate-700 text-white placeholder:text-slate-500 resize-none text-sm" />
        </div>

        {/* Diabetes Fields */}
        {templateType === 'diabetes' && (
          <Card className="p-4 mb-4 rounded-2xl" style={{ background: THEME.surface, border: '1px solid #F59E0B30' }}>
            <h3 className="text-amber-400 font-semibold mb-3 text-sm flex items-center gap-2"><Activity className="w-4 h-4" /> Diabetes Parameters</h3>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-slate-400 text-xs">Fasting (mg/dL)</Label>
                <Input value={diabetesData.fasting_sugar} onChange={(e) => setDiabetesData({...diabetesData, fasting_sugar: e.target.value})}
                       placeholder="120" className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-9 text-sm" /></div>
              <div><Label className="text-slate-400 text-xs">PP (mg/dL)</Label>
                <Input value={diabetesData.pp_sugar} onChange={(e) => setDiabetesData({...diabetesData, pp_sugar: e.target.value})}
                       placeholder="180" className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-9 text-sm" /></div>
              <div><Label className="text-slate-400 text-xs">HbA1c (%)</Label>
                <Input value={diabetesData.hba1c} onChange={(e) => setDiabetesData({...diabetesData, hba1c: e.target.value})}
                       placeholder="7.2" className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-9 text-sm" /></div>
            </div>
            <div className="mt-3"><Label className="text-slate-400 text-xs">Diet Advice</Label>
              <textarea value={diabetesData.diet_advice} onChange={(e) => setDiabetesData({...diabetesData, diet_advice: e.target.value})}
                        placeholder="Diet recommendations..." rows={2}
                        className="w-full mt-1 p-2 rounded-xl bg-[#0A0A0F] border border-slate-700 text-white placeholder:text-slate-500 resize-none text-sm" /></div>
            <div className="mt-2"><Label className="text-slate-400 text-xs">Exercise Advice</Label>
              <textarea value={diabetesData.exercise_advice} onChange={(e) => setDiabetesData({...diabetesData, exercise_advice: e.target.value})}
                        placeholder="Exercise recommendations..." rows={2}
                        className="w-full mt-1 p-2 rounded-xl bg-[#0A0A0F] border border-slate-700 text-white placeholder:text-slate-500 resize-none text-sm" /></div>
          </Card>
        )}

        {/* OBGYN Fields */}
        {templateType === 'obgyn' && (
          <Card className="p-4 mb-4 rounded-2xl" style={{ background: THEME.surface, border: '1px solid #EC489930' }}>
            <h3 className="text-pink-400 font-semibold mb-3 text-sm flex items-center gap-2"><Heart className="w-4 h-4" /> OBGYN Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-400 text-xs">LMP</Label>
                <Input type="date" value={obgynData.lmp} onChange={(e) => setObgynData({...obgynData, lmp: e.target.value})}
                       className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-9 text-sm" /></div>
              <div><Label className="text-slate-400 text-xs">Gestational Age</Label>
                <Input value={obgynData.gestational_age} onChange={(e) => setObgynData({...obgynData, gestational_age: e.target.value})}
                       placeholder="12 weeks" className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-9 text-sm" /></div>
              <div><Label className="text-slate-400 text-xs">EDD</Label>
                <Input type="date" value={obgynData.edd} onChange={(e) => setObgynData({...obgynData, edd: e.target.value})}
                       className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-9 text-sm" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-slate-400 text-xs">Gravida</Label>
                  <Input value={obgynData.gravida} onChange={(e) => setObgynData({...obgynData, gravida: e.target.value})}
                         placeholder="G" className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-9 text-sm" /></div>
                <div><Label className="text-slate-400 text-xs">Para</Label>
                  <Input value={obgynData.para} onChange={(e) => setObgynData({...obgynData, para: e.target.value})}
                         placeholder="P" className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-9 text-sm" /></div>
              </div>
            </div>
          </Card>
        )}

        {/* Diagnosis */}
        <div className="mb-4">
          <Label className="text-white font-medium text-sm">Diagnosis *</Label>
          <textarea data-testid="diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Enter diagnosis..." rows={2}
                    className="w-full mt-1 p-3 rounded-xl bg-[#1E1E2A] border border-slate-700 text-white placeholder:text-slate-500 resize-none text-sm" />
        </div>

        {/* Medicines Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-white font-medium text-sm flex items-center gap-2">
              <Pill className="w-4 h-4 text-teal-400" /> Medicines (Rx)
            </Label>
            <div className="flex items-center gap-2">
              <button data-testid="toggle-search-all" onClick={() => setSearchAll(!searchAll)}
                      className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-all"
                      style={{ background: searchAll ? '#F59E0B20' : THEME.surfaceLight, color: searchAll ? '#F59E0B' : '#94A3B8' }}>
                {searchAll ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {searchAll ? 'All Medicines' : 'Formulary'}
              </button>
              <Button data-testid="add-medicine-btn" onClick={addMedicine} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-8 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
          </div>

          {!searchAll && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
              <p className="text-teal-400 text-[11px]">Searching from <b>Orange Select</b> (1500+ curated medicines). Toggle to search all 582K.</p>
            </div>
          )}

          {medicines.map((med, i) => (
            <MedicineRow key={i} medicine={med} index={i} onUpdate={updateMedicine} onRemove={removeMedicine} searchAll={searchAll} />
          ))}
        </div>

        {/* Investigations */}
        <div className="mb-4">
          <Label className="text-white font-medium text-sm mb-2 block">Investigations Advised</Label>
          <div className="flex gap-2 mb-2">
            <Input data-testid="investigation-input" value={newInvestigation} onChange={(e) => setNewInvestigation(e.target.value)}
                   placeholder="e.g., CBC, HbA1c, Lipid Profile"
                   className="flex-1 bg-[#1E1E2A] border-slate-700 text-white rounded-xl h-9 text-sm"
                   onKeyDown={(e) => e.key === 'Enter' && addInvestigation()} />
            <Button data-testid="add-investigation-btn" onClick={addInvestigation} className="bg-slate-700 hover:bg-slate-600 rounded-xl h-9">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {investigations.map((inv, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-xs flex items-center gap-1.5" style={{ background: THEME.surfaceLight }}>
                <span className="text-white">{inv}</span>
                <button onClick={() => removeInvestigation(i)} className="text-slate-400 hover:text-red-400"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        </div>

        {/* Advice */}
        <div className="mb-4">
          <Label className="text-white font-medium text-sm">Advice</Label>
          <textarea data-testid="advice-input" value={advice} onChange={(e) => setAdvice(e.target.value)}
                    placeholder="General advice..." rows={2}
                    className="w-full mt-1 p-3 rounded-xl bg-[#1E1E2A] border border-slate-700 text-white placeholder:text-slate-500 resize-none text-sm" />
        </div>

        {/* Diet Advice */}
        <div className="mb-4">
          <Label className="text-white font-medium text-sm">Diet Advice</Label>
          <textarea data-testid="diet-advice-input" value={dietAdvice} onChange={(e) => setDietAdvice(e.target.value)}
                    placeholder="Dietary recommendations..." rows={2}
                    className="w-full mt-1 p-3 rounded-xl bg-[#1E1E2A] border border-slate-700 text-white placeholder:text-slate-500 resize-none text-sm" />
        </div>

        {/* Follow-up & Notes */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <Label className="text-white font-medium text-sm">Follow-up</Label>
            <Input data-testid="follow-up-date" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)}
                   className="mt-1 bg-[#1E1E2A] border-slate-700 text-white rounded-xl h-10" />
          </div>
          <div>
            <Label className="text-white font-medium text-sm">Notes</Label>
            <Input data-testid="notes-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes"
                   className="mt-1 bg-[#1E1E2A] border-slate-700 text-white rounded-xl h-10" />
          </div>
        </div>
      </main>

      {/* Fixed Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t z-40"
           style={{ background: `${THEME.surface}ee`, borderColor: THEME.surfaceLight, backdropFilter: 'blur(10px)' }}>
        <div className="flex gap-3 max-w-2xl mx-auto">
          <Button data-testid="download-pdf-btn" onClick={downloadPDF} variant="outline"
                  className="flex-1 h-12 rounded-xl border-slate-700 text-white hover:bg-slate-800">
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
          <Button data-testid="send-to-patient-btn" onClick={sendToPatient} disabled={sending || saving}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold">
            {(sending || saving) ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send to Patient
          </Button>
        </div>
      </div>

      {/* ======== MODALS ======== */}

      {/* Load Template */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg max-h-[80vh] rounded-t-3xl overflow-hidden" style={{ background: THEME.surface }}>
            <div className="sticky top-0 px-4 py-3 border-b flex items-center justify-between" style={{ background: THEME.surface, borderColor: THEME.surfaceLight }}>
              <h3 className="text-white font-bold text-base">Load Template</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>
              ) : savedTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  <p className="text-slate-400 text-sm">No templates yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedTemplates.map(t => (
                    <div key={t.template_id} className="p-3 rounded-xl border transition-all hover:border-purple-500/50"
                         style={{ background: THEME.surfaceLight, borderColor: 'transparent' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold text-sm truncate">{t.name}</h4>
                          <p className="text-slate-400 text-xs">{t.category} - {t.medicines?.length || 0} meds</p>
                        </div>
                        <div className="flex gap-1.5">
                          <Button onClick={() => loadTemplate(t)} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3 h-7 text-xs">Load</Button>
                          <button onClick={() => deleteTemplate(t.template_id)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Template */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl" style={{ background: THEME.surface }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: THEME.surfaceLight }}>
              <h3 className="text-white font-bold text-base">Save as Template</h3>
              <button onClick={() => setShowSaveTemplateModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <div className="mb-3"><Label className="text-slate-300 text-xs">Name *</Label>
                <Input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)}
                       placeholder="e.g., Type 2 Diabetes - Standard" className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-10" /></div>
              <div className="mb-3"><Label className="text-slate-300 text-xs">Category</Label>
                <Input value={newTemplateCategory} onChange={(e) => setNewTemplateCategory(e.target.value)}
                       placeholder={`Default: ${templateType}`} className="mt-1 bg-[#0A0A0F] border-slate-700 text-white rounded-xl h-10" /></div>
              <Button onClick={saveAsTemplate}
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold">
                <Save className="w-4 h-4 mr-2" /> Save Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* OCR Modal */}
      {showOCRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-lg max-h-[90vh] rounded-2xl overflow-hidden" style={{ background: THEME.surface }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: THEME.surfaceLight }}>
              <div><h3 className="text-white font-bold text-base flex items-center gap-2"><ScanLine className="w-4 h-4 text-amber-400" />Scan Handwritten Rx</h3></div>
              <button onClick={() => { setShowOCRModal(false); setOcrImage(null); setOcrResult(null); }} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              <input type="file" ref={ocrInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleOCRImageSelect} />
              {!ocrImage ? (
                <button onClick={() => ocrInputRef.current?.click()}
                        className="w-full py-10 border-2 border-dashed border-amber-500/30 rounded-xl flex flex-col items-center gap-2 hover:bg-amber-500/5">
                  <Camera className="w-10 h-10 text-amber-400" />
                  <p className="text-white text-sm font-medium">Tap to capture or upload</p>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-slate-800">
                    <img src={ocrImage} alt="Rx" className="w-full max-h-56 object-contain" />
                    <button onClick={() => { setOcrImage(null); setOcrResult(null); }}
                            className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded-full text-white"><X className="w-3 h-3" /></button>
                  </div>
                  {!ocrResult && (
                    <Button onClick={processOCR} disabled={ocrLoading}
                            className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold">
                      {ocrLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Extracting...</> : <><Wand2 className="w-4 h-4 mr-2" />Extract</>}
                    </Button>
                  )}
                  {ocrResult && (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl" style={{ background: THEME.surfaceLight }}>
                        <p className="text-emerald-400 text-xs font-medium mb-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Extracted</p>
                        {ocrResult.diagnosis && <p className="text-slate-300 text-xs"><b>Dx:</b> {ocrResult.diagnosis}</p>}
                        {ocrResult.medicines?.length > 0 && <p className="text-slate-300 text-xs"><b>Meds:</b> {ocrResult.medicines.map(m => m.name).join(', ')}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => { setOcrImage(null); setOcrResult(null); }} variant="outline"
                                className="flex-1 h-10 rounded-xl border-slate-600 text-slate-300">Rescan</Button>
                        <Button onClick={applyOCRResult}
                                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold">Apply</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorEMRDashboard;
