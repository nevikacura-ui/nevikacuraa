import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, CheckCircle, Activity, Brain, Heart, Bone, Eye, Stethoscope, Loader2, ArrowRight, RotateCcw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const BODY_ICONS = {
  head: Brain, chest: Heart, abdomen: Activity, back: Bone,
  arms: Activity, legs: Bone, skin: Eye, general: Stethoscope,
};

const BODY_COLORS = {
  head: '#8B5CF6', chest: '#EF4444', abdomen: '#F59E0B', back: '#3B82F6',
  arms: '#06B6D4', legs: '#10B981', skin: '#EC4899', general: '#6366F1',
};

const SeveritySlider = ({ value, onChange }) => {
  const color = value <= 3 ? '#10B981' : value <= 6 ? '#F59E0B' : '#EF4444';
  const label = value <= 3 ? 'Mild' : value <= 6 ? 'Moderate' : 'Severe';

  return (
    <div data-testid="severity-slider">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-semibold text-[#1A2B28]">How severe?</p>
        <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: color }}>
          {value}/10 - {label}
        </span>
      </div>
      <input type="range" min="1" max="10" value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(90deg, #10B981 0%, #F59E0B 50%, #EF4444 100%)` }} />
    </div>
  );
};

const BodyAreaSelector = ({ areas, selected, onSelect }) => (
  <div className="grid grid-cols-4 gap-2" data-testid="body-area-grid">
    {Object.entries(areas).map(([key, area]) => {
      const Icon = BODY_ICONS[key] || Activity;
      const isActive = selected === key;
      return (
        <button key={key} onClick={() => onSelect(key)}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${
            isActive ? 'scale-105 shadow-lg' : 'bg-white shadow-sm'
          }`}
          style={isActive ? {
            background: `linear-gradient(135deg, ${BODY_COLORS[key]}, ${BODY_COLORS[key]}CC)`,
            border: `1px solid ${BODY_COLORS[key]}`,
          } : { border: '1px solid rgba(31,79,70,0.06)' }}
          data-testid={`body-area-${key}`}>
          <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#4A6B64]'}`} />
          <span className={`text-[10px] font-semibold ${isActive ? 'text-white' : 'text-[#4A6B64]'}`}>
            {area.label}
          </span>
        </button>
      );
    })}
  </div>
);

const ResultCard = ({ result }) => {
  if (!result) return null;
  const urgencyConfig = {
    low: { color: '#10B981', bg: '#ECFDF5', label: 'Low Urgency' },
    medium: { color: '#F59E0B', bg: '#FFFBEB', label: 'Medium Urgency' },
    high: { color: '#EF4444', bg: '#FEF2F2', label: 'High Urgency - See a doctor soon' },
  };
  const urg = urgencyConfig[result.urgency] || urgencyConfig.low;

  return (
    <div className="space-y-4" data-testid="symptom-results">
      {/* Urgency Banner */}
      <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: urg.bg, border: `1px solid ${urg.color}20` }}>
        <AlertTriangle className="w-6 h-6 flex-shrink-0" style={{ color: urg.color }} />
        <div>
          <p className="font-bold text-sm" style={{ color: urg.color }}>{urg.label}</p>
          <p className="text-xs text-gray-600 mt-0.5">{result.disclaimer?.slice(0, 100)}</p>
        </div>
      </div>

      {/* Recommended Specialists */}
      <div className="rounded-2xl p-4 bg-white shadow-sm" style={{ border: '1px solid rgba(31,79,70,0.06)' }}>
        <h3 className="font-bold text-[#1A2B28] mb-3 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-[#1F4F46]" /> Recommended Specialists
        </h3>
        {result.recommended_specialists?.map((s, i) => (
          <div key={i} className="flex items-center justify-between py-2.5" style={{ borderBottom: i < result.recommended_specialists.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
            <div>
              <p className="font-semibold text-sm text-[#1A2B28]">{s.specialist}</p>
              <p className="text-xs text-[#8A9E99]">For: {s.for_symptoms?.join(', ')}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              s.priority === 'primary' ? 'bg-[#1F4F46] text-white' : 'bg-gray-100 text-gray-600'
            }`}>{s.priority}</span>
          </div>
        ))}
      </div>

      {/* AI Analysis */}
      {result.ai_analysis && (
        <div className="rounded-2xl p-4 bg-white shadow-sm" style={{ border: '1px solid rgba(31,79,70,0.06)' }}>
          <h3 className="font-bold text-[#1A2B28] mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#8B5CF6]" /> AI Assessment
          </h3>
          <p className="text-sm text-[#4A6B64] leading-relaxed">{result.ai_analysis.assessment}</p>

          {result.ai_analysis.possible_conditions?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-[#8A9E99] mb-2">Possible Conditions</p>
              {result.ai_analysis.possible_conditions.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-[#1A2B28]">{c.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    c.likelihood === 'high' ? 'bg-red-50 text-red-600' :
                    c.likelihood === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                  }`}>{c.likelihood}</span>
                </div>
              ))}
            </div>
          )}

          {result.ai_analysis.self_care_tips?.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50">
              <p className="text-xs font-semibold text-emerald-700 mb-1">Self-Care Tips</p>
              {result.ai_analysis.self_care_tips.map((t, i) => (
                <p key={i} className="text-xs text-emerald-600 flex items-start gap-1.5 mt-1">
                  <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {t}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Safety Notice */}
      <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
        <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-700 leading-relaxed">
          This assessment is for informational purposes only and does not replace professional medical advice. Always consult a qualified healthcare provider for proper diagnosis.
        </p>
      </div>
    </div>
  );
};

export default function SymptomChecker() {
  const navigate = useNavigate();
  const [bodyAreas, setBodyAreas] = useState({});
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [severity, setSeverity] = useState(5);
  const [duration, setDuration] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [step, setStep] = useState('area'); // area -> symptoms -> details -> result

  useEffect(() => {
    fetchBodyAreas();
  }, []);

  const fetchBodyAreas = async () => {
    try {
      const res = await axios.get(`${API}/api/symptom-checker/body-areas`);
      setBodyAreas(res.data.body_areas || {});
    } catch { }
  };

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const analyze = async () => {
    if (selectedSymptoms.length === 0) {
      toast.error('Select at least one symptom');
      return;
    }
    setAnalyzing(true);
    setStep('result');
    try {
      const res = await axios.post(`${API}/api/symptom-checker/analyze`, {
        symptoms: selectedSymptoms,
        severity,
        duration_days: duration,
        body_area: selectedArea,
      });
      setResult(res.data);
    } catch (e) {
      toast.error('Analysis failed. Please try again.');
      setStep('details');
    }
    setAnalyzing(false);
  };

  const reset = () => {
    setSelectedArea(null);
    setSelectedSymptoms([]);
    setSeverity(5);
    setDuration(1);
    setResult(null);
    setStep('area');
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F7FAF9' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg, #1F4F46 0%, #2A6B5E 100%)' }} className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => step === 'area' ? navigate(-1) : step === 'result' ? reset() : setStep('area')}
            className="p-2 rounded-full bg-white/10" data-testid="back-btn">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">AI Symptom Checker</h1>
            <p className="text-xs text-white/60">Powered by AI analysis</p>
          </div>
        </div>

        {/* Progress dots */}
        {step !== 'result' && (
          <div className="flex gap-2 mt-3 justify-center">
            {['area', 'symptoms', 'details'].map((s, i) => (
              <div key={s} className={`h-1.5 rounded-full transition-all ${
                s === step ? 'w-8 bg-white' : i < ['area', 'symptoms', 'details'].indexOf(step) ? 'w-4 bg-white/60' : 'w-4 bg-white/20'
              }`} />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 mt-4">
        {/* Step 1: Body Area */}
        {step === 'area' && (
          <div>
            <h2 className="font-bold text-[#1A2B28] text-base mb-1">Where does it hurt?</h2>
            <p className="text-sm text-[#8A9E99] mb-4">Tap the area that best matches</p>
            <BodyAreaSelector areas={bodyAreas} selected={selectedArea} onSelect={(area) => { setSelectedArea(area); setStep('symptoms'); }} />
          </div>
        )}

        {/* Step 2: Symptoms */}
        {step === 'symptoms' && selectedArea && (
          <div>
            <h2 className="font-bold text-[#1A2B28] text-base mb-1">Select your symptoms</h2>
            <p className="text-sm text-[#8A9E99] mb-4">Choose all that apply for {bodyAreas[selectedArea]?.label}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {bodyAreas[selectedArea]?.symptoms?.map(symptom => (
                <button key={symptom} onClick={() => toggleSymptom(symptom)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedSymptoms.includes(symptom)
                      ? 'text-white shadow-md scale-105'
                      : 'bg-white text-[#4A6B64] shadow-sm'
                  }`}
                  style={selectedSymptoms.includes(symptom) ? {
                    background: BODY_COLORS[selectedArea],
                    border: `1px solid ${BODY_COLORS[selectedArea]}`,
                  } : { border: '1px solid rgba(31,79,70,0.08)' }}
                  data-testid={`symptom-${symptom.replace(/\s/g, '-').toLowerCase()}`}>
                  {selectedSymptoms.includes(symptom) && <CheckCircle className="w-3.5 h-3.5 mr-1.5 inline" />}
                  {symptom}
                </button>
              ))}
            </div>

            {/* Also show symptoms from other areas */}
            <p className="text-xs text-[#8A9E99] mb-2">Other symptoms you may have</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(bodyAreas)
                .filter(([k]) => k !== selectedArea)
                .flatMap(([, a]) => a.symptoms)
                .slice(0, 8)
                .map(symptom => (
                  <button key={symptom} onClick={() => toggleSymptom(symptom)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedSymptoms.includes(symptom) ? 'bg-[#1F4F46] text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                    data-testid={`other-symptom-${symptom.replace(/\s/g, '-').toLowerCase()}`}>
                    {symptom}
                  </button>
                ))}
            </div>

            <Button onClick={() => setStep('details')} disabled={selectedSymptoms.length === 0}
              className="w-full h-12 mt-6 rounded-xl font-bold text-white"
              style={{ background: selectedSymptoms.length ? 'linear-gradient(135deg, #1F4F46, #2E6B5F)' : '#ccc' }}
              data-testid="next-to-details">
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 'details' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-bold text-[#1A2B28] text-base mb-1">A few more details</h2>
              <p className="text-sm text-[#8A9E99] mb-4">Help us give a better assessment</p>
            </div>

            {/* Selected symptoms summary */}
            <div className="flex flex-wrap gap-1.5">
              {selectedSymptoms.map(s => (
                <span key={s} className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#1F4F46] text-white">{s}</span>
              ))}
            </div>

            <SeveritySlider value={severity} onChange={setSeverity} />

            <div>
              <p className="text-sm font-semibold text-[#1A2B28] mb-2">How long have you had these symptoms?</p>
              <div className="flex gap-2">
                {[1, 3, 7, 14, 30].map(d => (
                  <button key={d} onClick={() => setDuration(d)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                      duration === d ? 'bg-[#1F4F46] text-white shadow-md' : 'bg-white text-[#4A6B64] shadow-sm'
                    }`}
                    style={duration !== d ? { border: '1px solid rgba(31,79,70,0.08)' } : {}}
                    data-testid={`duration-${d}`}>
                    {d === 1 ? 'Today' : d === 30 ? '1mo+' : `${d}d`}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={analyze}
              className="w-full h-12 rounded-xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #1F4F46, #2E6B5F)' }}
              data-testid="analyze-btn">
              <Brain className="w-4 h-4 mr-2" /> Analyze Symptoms
            </Button>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 'result' && (
          analyzing ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-[#1F4F46]/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-[#1F4F46] border-t-transparent rounded-full animate-spin" />
                <Brain className="absolute inset-0 m-auto w-8 h-8 text-[#1F4F46]" />
              </div>
              <p className="text-[#1A2B28] font-medium mt-4">Analyzing your symptoms...</p>
              <p className="text-xs text-[#8A9E99] mt-1">AI is processing your information</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[#1A2B28] text-base">Assessment Results</h2>
                <button onClick={reset} className="flex items-center gap-1 text-sm text-[#1F4F46] font-medium" data-testid="new-check-btn">
                  <RotateCcw className="w-3.5 h-3.5" /> New Check
                </button>
              </div>
              <ResultCard result={result} />

              <Button onClick={() => navigate('/doctor-search')}
                className="w-full h-12 mt-4 rounded-xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1F4F46, #2E6B5F)' }}
                data-testid="find-doctor-btn">
                <Stethoscope className="w-4 h-4 mr-2" /> Find a Doctor Now
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
