import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Activity, Brain, Heart, Moon, Flame, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Clock, Calendar, FlaskConical, Bell, Info,
  ChevronRight, Zap, Shield, Target, BarChart3, RefreshCw, Sparkles,
  Sun, Droplets, Timer, Scale, Ruler, Pill, LineChart, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Theme configuration
const THEME = {
  dark: {
    bg: 'bg-slate-950',
    bgSecondary: 'bg-slate-900',
    bgCard: 'bg-slate-900/80',
    border: 'border-slate-800',
    text: 'text-white',
    textMuted: 'text-slate-400',
    accent: 'from-cyan-500 to-blue-600'
  },
  light: {
    bg: 'bg-slate-50',
    bgSecondary: 'bg-white',
    bgCard: 'bg-white',
    border: 'border-slate-200',
    text: 'text-slate-900',
    textMuted: 'text-slate-500',
    accent: 'from-cyan-500 to-blue-600'
  }
};

// Risk band colors
const getRiskColor = (risk) => {
  if (risk < 20) return { bg: 'bg-emerald-500', text: 'text-emerald-500', label: 'Low' };
  if (risk < 40) return { bg: 'bg-green-500', text: 'text-green-500', label: 'Low-Moderate' };
  if (risk < 60) return { bg: 'bg-amber-500', text: 'text-amber-500', label: 'Moderate' };
  if (risk < 80) return { bg: 'bg-orange-500', text: 'text-orange-500', label: 'Elevated' };
  return { bg: 'bg-red-500', text: 'text-red-500', label: 'High' };
};

// Score color gradient
const getScoreColor = (score) => {
  if (score >= 80) return 'from-emerald-500 to-green-400';
  if (score >= 60) return 'from-green-500 to-lime-400';
  if (score >= 40) return 'from-amber-500 to-yellow-400';
  if (score >= 20) return 'from-orange-500 to-amber-400';
  return 'from-red-500 to-rose-400';
};

// Module definitions
const MODULES = [
  { id: 'bioage', name: 'BioAge', icon: Brain, color: 'from-violet-500 to-purple-600', description: 'Biological Age Analysis' },
  { id: 'risk', name: 'Predictive Risk', icon: Shield, color: 'from-rose-500 to-pink-600', description: 'Disease Risk Assessment' },
  { id: 'sleep', name: 'Sleep & Recovery', icon: Moon, color: 'from-indigo-500 to-blue-600', description: 'Rest Quality Analysis' },
  { id: 'metabolic', name: 'Metabolic Core', icon: Flame, color: 'from-orange-500 to-amber-500', description: 'Metabolic Health Score' },
  { id: 'inflammation', name: 'Inflammation', icon: Activity, color: 'from-red-500 to-rose-500', description: 'Inflammation Tracking' }
];

// Biomarker reference ranges
const BIOMARKERS = {
  hba1c: { name: 'HbA1c', unit: '%', optimal: [4.0, 5.6], warning: [5.7, 6.4], weight: 0.20 },
  hscrp: { name: 'hs-CRP', unit: 'mg/L', optimal: [0, 1.0], warning: [1.0, 3.0], weight: 0.15 },
  tg_hdl: { name: 'TG/HDL Ratio', unit: '', optimal: [0, 2.0], warning: [2.0, 4.0], weight: 0.15 },
  bmi: { name: 'BMI', unit: 'kg/m²', optimal: [18.5, 24.9], warning: [25, 29.9], weight: 0.15 },
  waist: { name: 'Waist Circumference', unit: 'cm', optimal: [0, 94], warning: [94, 102], weight: 0.15 },
  vitamin_d: { name: 'Vitamin D', unit: 'ng/mL', optimal: [30, 100], warning: [20, 30], weight: 0.10 },
  alt: { name: 'ALT', unit: 'U/L', optimal: [0, 33], warning: [33, 50], weight: 0.10 },
  b12: { name: 'Vitamin B12', unit: 'pg/mL', optimal: [300, 900], warning: [200, 300], weight: 0.10 },
  iron: { name: 'Iron', unit: 'µg/dL', optimal: [60, 170], warning: [40, 60], weight: 0.10 },
  tsh: { name: 'TSH', unit: 'mIU/L', optimal: [0.4, 4.0], warning: [4.0, 10.0], weight: 0.10 },
  fasting_glucose: { name: 'Fasting Glucose', unit: 'mg/dL', optimal: [70, 100], warning: [100, 125], weight: 0.15 },
  esr: { name: 'ESR', unit: 'mm/hr', optimal: [0, 20], warning: [20, 40], weight: 0.10 },
  ferritin: { name: 'Ferritin', unit: 'ng/mL', optimal: [30, 300], warning: [15, 30], weight: 0.10 }
};

const InnerScore = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(true);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [showInputModal, setShowInputModal] = useState(false);
  const [showLabBooking, setShowLabBooking] = useState(false);
  
  // User biomarker data
  const [biomarkerData, setBiomarkerData] = useState({
    age: 35,
    gender: 'male',
    hba1c: 5.4,
    hscrp: 1.2,
    tg_hdl: 2.1,
    bmi: 24.5,
    waist: 88,
    vitamin_d: 28,
    alt: 25,
    b12: 450,
    iron: 95,
    tsh: 2.5,
    fasting_glucose: 92,
    fasting_insulin: null,
    esr: 12,
    ferritin: 120
  });
  
  // Sleep questionnaire
  const [sleepData, setSleepData] = useState({
    hoursPerNight: 6.5,
    sleepQuality: 3, // 1-5
    wakeUps: 2,
    feelRested: 2, // 1-5
    caffeine: true,
    screenTime: true
  });
  
  // Historical data for trends
  const [historicalScores, setHistoricalScores] = useState([
    { date: '2025-10', score: 62 },
    { date: '2025-11', score: 65 },
    { date: '2025-12', score: 68 },
    { date: '2026-01', score: 71 },
    { date: '2026-02', score: null } // Current
  ]);

  const theme = darkMode ? THEME.dark : THEME.light;

  // ============ CALCULATION ENGINES ============

  // BioAge Engine
  const calculateBioAge = useMemo(() => {
    const { age, hba1c, hscrp, tg_hdl, bmi, waist, vitamin_d, alt } = biomarkerData;
    
    // Score each biomarker (0-100)
    const scores = {
      hba1c: hba1c < 5.7 ? 100 : hba1c < 6.5 ? 60 : 20,
      hscrp: hscrp < 1 ? 100 : hscrp < 3 ? 60 : 20,
      tg_hdl: tg_hdl < 2 ? 100 : tg_hdl < 4 ? 60 : 20,
      bmi: bmi >= 18.5 && bmi < 25 ? 100 : bmi < 30 ? 60 : 20,
      waist: waist < 94 ? 100 : waist < 102 ? 60 : 20,
      vitamin_d: vitamin_d >= 30 ? 100 : vitamin_d >= 20 ? 60 : 20,
      alt: alt < 33 ? 100 : alt < 50 ? 60 : 20
    };
    
    // Weighted average
    const weightedScore = (
      scores.hba1c * 0.20 +
      scores.hscrp * 0.15 +
      scores.tg_hdl * 0.15 +
      scores.bmi * 0.15 +
      scores.waist * 0.15 +
      scores.vitamin_d * 0.10 +
      scores.alt * 0.10
    );
    
    // Calculate biological age (deviation from chronological)
    const ageDeviation = ((100 - weightedScore) / 100) * 15; // Max 15 years deviation
    const bioAge = Math.round(age + ageDeviation - 5);
    const ageGap = bioAge - age;
    
    return {
      bioAge,
      chronoAge: age,
      ageGap,
      score: Math.round(weightedScore),
      breakdown: scores
    };
  }, [biomarkerData]);

  // Predictive Risk Engine
  const calculateRisks = useMemo(() => {
    const { hba1c, hscrp, tg_hdl, bmi, waist, fasting_glucose, alt, tsh } = biomarkerData;
    
    // Type 2 Diabetes Risk
    const diabetesRisk = Math.min(100, Math.round(
      (hba1c > 5.6 ? (hba1c - 5.6) * 30 : 0) +
      (fasting_glucose > 100 ? (fasting_glucose - 100) * 2 : 0) +
      (bmi > 25 ? (bmi - 25) * 3 : 0) +
      (waist > 94 ? (waist - 94) * 1.5 : 0)
    ));
    
    // Cardiovascular Risk
    const cvdRisk = Math.min(100, Math.round(
      (hscrp > 1 ? hscrp * 10 : 0) +
      (tg_hdl > 2 ? (tg_hdl - 2) * 12 : 0) +
      (bmi > 25 ? (bmi - 25) * 2 : 0)
    ));
    
    // Fatty Liver Risk (NAFLD)
    const liverRisk = Math.min(100, Math.round(
      (alt > 33 ? (alt - 33) * 3 : 0) +
      (bmi > 25 ? (bmi - 25) * 4 : 0) +
      (tg_hdl > 2 ? (tg_hdl - 2) * 10 : 0)
    ));
    
    // Thyroid Risk
    const thyroidRisk = Math.min(100, Math.round(
      tsh < 0.4 || tsh > 4 ? Math.abs(tsh - 2.2) * 15 : 5
    ));
    
    return {
      diabetes: { value: diabetesRisk, ...getRiskColor(diabetesRisk) },
      cardiovascular: { value: cvdRisk, ...getRiskColor(cvdRisk) },
      liver: { value: liverRisk, ...getRiskColor(liverRisk) },
      thyroid: { value: thyroidRisk, ...getRiskColor(thyroidRisk) }
    };
  }, [biomarkerData]);

  // Sleep & Recovery Engine
  const calculateSleepScore = useMemo(() => {
    const { b12, vitamin_d, iron, tsh } = biomarkerData;
    const { hoursPerNight, sleepQuality, wakeUps, feelRested, caffeine, screenTime } = sleepData;
    
    // Biomarker contribution (40%)
    const b12Score = b12 >= 300 ? 100 : b12 >= 200 ? 60 : 30;
    const dScore = vitamin_d >= 30 ? 100 : vitamin_d >= 20 ? 60 : 30;
    const ironScore = iron >= 60 ? 100 : iron >= 40 ? 60 : 30;
    const thyroidScore = tsh >= 0.4 && tsh <= 4 ? 100 : 40;
    const biomarkerScore = (b12Score + dScore + ironScore + thyroidScore) / 4;
    
    // Sleep habits contribution (60%)
    const hoursScore = hoursPerNight >= 7 && hoursPerNight <= 9 ? 100 : hoursPerNight >= 6 ? 70 : 40;
    const qualityScore = sleepQuality * 20;
    const wakeScore = wakeUps === 0 ? 100 : wakeUps <= 2 ? 70 : 40;
    const restedScore = feelRested * 20;
    const lifestyleDeduction = (caffeine ? 10 : 0) + (screenTime ? 10 : 0);
    const habitsScore = Math.max(0, ((hoursScore + qualityScore + wakeScore + restedScore) / 4) - lifestyleDeduction);
    
    const totalScore = Math.round(biomarkerScore * 0.4 + habitsScore * 0.6);
    
    // Fatigue classification
    let fatigueLevel = 'Optimal';
    if (totalScore < 40) fatigueLevel = 'Severe Fatigue';
    else if (totalScore < 60) fatigueLevel = 'Moderate Fatigue';
    else if (totalScore < 75) fatigueLevel = 'Mild Fatigue';
    
    return {
      score: totalScore,
      fatigueLevel,
      biomarkerContribution: Math.round(biomarkerScore),
      habitsContribution: Math.round(habitsScore)
    };
  }, [biomarkerData, sleepData]);

  // Metabolic Core Engine
  const calculateMetabolicScore = useMemo(() => {
    const { bmi, waist, tg_hdl, fasting_glucose, fasting_insulin } = biomarkerData;
    
    const bmiScore = bmi >= 18.5 && bmi < 25 ? 100 : bmi < 30 ? 60 : 30;
    const waistScore = waist < 94 ? 100 : waist < 102 ? 60 : 30;
    const tgHdlScore = tg_hdl < 2 ? 100 : tg_hdl < 4 ? 60 : 30;
    const glucoseScore = fasting_glucose < 100 ? 100 : fasting_glucose < 126 ? 60 : 30;
    
    // HOMA-IR if insulin available
    let insulinScore = 70; // Default if not available
    if (fasting_insulin) {
      const homaIR = (fasting_glucose * fasting_insulin) / 405;
      insulinScore = homaIR < 1 ? 100 : homaIR < 2 ? 70 : homaIR < 3 ? 50 : 30;
    }
    
    const score = Math.round((bmiScore + waistScore + tgHdlScore + glucoseScore + insulinScore) / 5);
    
    // Visceral risk category
    let visceralRisk = 'Low';
    if (score < 40) visceralRisk = 'High';
    else if (score < 60) visceralRisk = 'Elevated';
    else if (score < 75) visceralRisk = 'Moderate';
    
    return {
      score,
      visceralRisk,
      breakdown: { bmi: bmiScore, waist: waistScore, tgHdl: tgHdlScore, glucose: glucoseScore, insulin: insulinScore }
    };
  }, [biomarkerData]);

  // Inflammation Engine
  const calculateInflammation = useMemo(() => {
    const { hscrp, esr, ferritin } = biomarkerData;
    
    const crpScore = hscrp < 1 ? 100 : hscrp < 3 ? 60 : 30;
    const esrScore = esr < 20 ? 100 : esr < 40 ? 60 : 30;
    const ferritinScore = ferritin >= 30 && ferritin <= 300 ? 100 : 50;
    
    const score = Math.round((crpScore * 0.5 + esrScore * 0.3 + ferritinScore * 0.2));
    
    let level = 'Low';
    if (score < 40) level = 'High';
    else if (score < 60) level = 'Moderate';
    else if (score < 80) level = 'Mild';
    
    return {
      score,
      level,
      breakdown: { crp: crpScore, esr: esrScore, ferritin: ferritinScore }
    };
  }, [biomarkerData]);

  // Master INNERSCORE
  const masterScore = useMemo(() => {
    const bioAgeContrib = calculateBioAge.score * 0.25;
    const riskContrib = (100 - (calculateRisks.diabetes.value + calculateRisks.cardiovascular.value + calculateRisks.liver.value) / 3) * 0.25;
    const sleepContrib = calculateSleepScore.score * 0.20;
    const metabolicContrib = calculateMetabolicScore.score * 0.15;
    const inflammationContrib = calculateInflammation.score * 0.15;
    
    return Math.round(bioAgeContrib + riskContrib + sleepContrib + metabolicContrib + inflammationContrib);
  }, [calculateBioAge, calculateRisks, calculateSleepScore, calculateMetabolicScore, calculateInflammation]);

  // Update current month's score
  useEffect(() => {
    setHistoricalScores(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], score: masterScore };
      return updated;
    });
  }, [masterScore]);

  // ============ ACTION RECOMMENDATIONS ============
  const getActionSteps = () => {
    const actions = [];
    
    if (biomarkerData.vitamin_d < 30) {
      actions.push({ priority: 'high', category: 'Supplement', text: 'Start Vitamin D3 supplementation (60,000 IU weekly)' });
    }
    if (biomarkerData.hba1c > 5.6) {
      actions.push({ priority: 'high', category: 'Lifestyle', text: 'Reduce refined carbs, increase fiber intake' });
    }
    if (biomarkerData.hscrp > 1) {
      actions.push({ priority: 'medium', category: 'Diet', text: 'Add omega-3 rich foods (fatty fish, walnuts)' });
    }
    if (calculateSleepScore.score < 70) {
      actions.push({ priority: 'medium', category: 'Sleep', text: 'Aim for 7-8 hours, limit screen time before bed' });
    }
    if (biomarkerData.bmi > 25) {
      actions.push({ priority: 'medium', category: 'Exercise', text: '150 mins/week moderate exercise recommended' });
    }
    if (biomarkerData.b12 < 300) {
      actions.push({ priority: 'low', category: 'Diet', text: 'Include more B12 sources (eggs, dairy, fortified foods)' });
    }
    
    return actions.slice(0, 5);
  };

  // ============ RENDER FUNCTIONS ============

  // Circular Progress Ring
  const ScoreRing = ({ score, size = 180, strokeWidth = 12, label, sublabel }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;
    
    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={darkMode ? '#1e293b' : '#e2e8f0'}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={score >= 60 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'} />
              <stop offset="100%" stopColor={score >= 60 ? '#06b6d4' : score >= 40 ? '#eab308' : '#f97316'} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${theme.text}`}>{score}</span>
          {label && <span className={`text-sm ${theme.textMuted}`}>{label}</span>}
          {sublabel && <span className={`text-xs ${theme.textMuted}`}>{sublabel}</span>}
        </div>
      </div>
    );
  };

  // Radar Chart (simplified SVG)
  const RadarChart = () => {
    const scores = [
      { name: 'BioAge', value: calculateBioAge.score },
      { name: 'Risk', value: 100 - (calculateRisks.diabetes.value + calculateRisks.cardiovascular.value) / 2 },
      { name: 'Sleep', value: calculateSleepScore.score },
      { name: 'Metabolic', value: calculateMetabolicScore.score },
      { name: 'Inflammation', value: calculateInflammation.score }
    ];
    
    const center = 100;
    const maxRadius = 80;
    const angleStep = (2 * Math.PI) / scores.length;
    
    const getPoint = (index, value) => {
      const angle = index * angleStep - Math.PI / 2;
      const radius = (value / 100) * maxRadius;
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle)
      };
    };
    
    const polygonPoints = scores.map((s, i) => {
      const point = getPoint(i, s.value);
      return `${point.x},${point.y}`;
    }).join(' ');
    
    return (
      <svg viewBox="0 0 200 200" className="w-full max-w-[250px] mx-auto">
        {/* Grid circles */}
        {[20, 40, 60, 80, 100].map((r) => (
          <circle
            key={r}
            cx={center}
            cy={center}
            r={(r / 100) * maxRadius}
            fill="none"
            stroke={darkMode ? '#334155' : '#e2e8f0'}
            strokeWidth="0.5"
          />
        ))}
        {/* Axis lines */}
        {scores.map((_, i) => {
          const point = getPoint(i, 100);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke={darkMode ? '#334155' : '#e2e8f0'}
              strokeWidth="0.5"
            />
          );
        })}
        {/* Data polygon */}
        <polygon
          points={polygonPoints}
          fill="url(#radarGradient)"
          fillOpacity="0.3"
          stroke="url(#radarGradient)"
          strokeWidth="2"
        />
        {/* Labels */}
        {scores.map((s, i) => {
          const point = getPoint(i, 115);
          return (
            <text
              key={i}
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className={`text-[10px] ${darkMode ? 'fill-slate-400' : 'fill-slate-600'}`}
            >
              {s.name}
            </text>
          );
        })}
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  // Trend Line Chart
  const TrendChart = () => {
    const validScores = historicalScores.filter(s => s.score !== null);
    const maxScore = Math.max(...validScores.map(s => s.score), 100);
    const minScore = Math.min(...validScores.map(s => s.score), 0);
    const range = maxScore - minScore || 1;
    
    return (
      <div className="h-32 flex items-end gap-1">
        {historicalScores.map((item, idx) => {
          const height = item.score ? ((item.score - minScore) / range) * 100 : 0;
          const isLast = idx === historicalScores.length - 1;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div 
                className={`w-full rounded-t-lg transition-all ${
                  isLast 
                    ? 'bg-gradient-to-t from-cyan-500 to-blue-500' 
                    : darkMode ? 'bg-slate-700' : 'bg-slate-300'
                }`}
                style={{ height: `${height}%`, minHeight: item.score ? '20px' : '4px' }}
              >
                {item.score && (
                  <span className={`block text-center text-xs font-bold pt-1 ${isLast ? 'text-white' : theme.textMuted}`}>
                    {item.score}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${theme.textMuted}`}>{item.date.split('-')[1]}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Risk Bar
  const RiskBar = ({ name, risk }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${theme.text}`}>{name}</span>
        <div className="flex items-center gap-2">
          <Badge className={`${risk.bg} text-white text-xs`}>{risk.label}</Badge>
          <span className={`text-sm font-bold ${risk.text}`}>{risk.value}%</span>
        </div>
      </div>
      <div className={`h-2 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
        <div 
          className={`h-full rounded-full ${risk.bg} transition-all duration-500`}
          style={{ width: `${risk.value}%` }}
        />
      </div>
    </div>
  );

  // Module Card
  const ModuleCard = ({ module, score, subtitle, onClick }) => {
    const Icon = module.icon;
    return (
      <button
        onClick={onClick}
        className={`w-full p-4 rounded-2xl ${theme.bgCard} border ${theme.border} text-left transition-all hover:scale-[1.02] hover:shadow-xl`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className={`font-bold ${theme.text}`}>{module.name}</h3>
            <p className={`text-xs ${theme.textMuted}`}>{subtitle}</p>
          </div>
          <div className="text-right">
            <span className={`text-2xl font-bold ${theme.text}`}>{score}</span>
            <ChevronRight className={`w-5 h-5 ${theme.textMuted} ml-auto`} />
          </div>
        </div>
      </button>
    );
  };

  return (
    <AnimatedPage>
      <div className={`min-h-screen ${theme.bg} transition-colors duration-300`} data-testid="innerscore-page">
        {/* Premium Header */}
        <header className={`sticky top-0 z-50 ${theme.bgSecondary} border-b ${theme.border}`}>
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/')}
                  className={`rounded-full ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                  data-testid="innerscore-back-btn"
                >
                  <ArrowLeft className={`w-5 h-5 ${theme.text}`} />
                </Button>
                <div>
                  <h1 className={`text-xl font-bold tracking-wider ${theme.text}`}>
                    INNER<span className="text-cyan-500">SCORE</span>
                  </h1>
                  <p className={`text-xs ${theme.textMuted}`}>Health Intelligence Portal</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLabBooking(true)}
                  className={`rounded-full ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                >
                  <FlaskConical className={`w-5 h-5 ${theme.text}`} />
                </Button>
                <div className="flex items-center gap-2">
                  <Sun className={`w-4 h-4 ${!darkMode ? 'text-amber-500' : theme.textMuted}`} />
                  <Switch 
                    checked={darkMode} 
                    onCheckedChange={setDarkMode}
                    data-testid="dark-mode-toggle"
                  />
                  <Moon className={`w-4 h-4 ${darkMode ? 'text-blue-400' : theme.textMuted}`} />
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6">
          {/* Main Dashboard */}
          {activeModule === 'dashboard' && (
            <div className="space-y-6">
              {/* Master Score Card */}
              <Card className={`p-6 ${theme.bgCard} border ${theme.border} overflow-hidden relative`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ScoreRing 
                      score={masterScore} 
                      label="INNERSCORE" 
                      sublabel="Master Health Index"
                    />
                    <div className="flex-1 space-y-4">
                      <div>
                        <h2 className={`text-lg font-bold ${theme.text}`}>Your Health Summary</h2>
                        <p className={`text-sm ${theme.textMuted}`}>
                          {masterScore >= 75 ? 'Excellent health markers! Keep up the good work.' :
                           masterScore >= 50 ? 'Good progress! Focus on the highlighted areas.' :
                           'Action needed. Follow the personalized recommendations below.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {masterScore > (historicalScores[historicalScores.length - 2]?.score || 0) ? (
                            <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5 text-rose-500" />
                          )}
                          <span className={`text-sm ${theme.textMuted}`}>
                            {Math.abs(masterScore - (historicalScores[historicalScores.length - 2]?.score || masterScore))} pts from last month
                          </span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => setShowInputModal(true)}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Update Biomarkers
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Radar + Trend Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className={`p-4 ${theme.bgCard} border ${theme.border}`}>
                  <h3 className={`text-sm font-bold mb-4 ${theme.text}`}>Score Breakdown</h3>
                  <RadarChart />
                </Card>
                <Card className={`p-4 ${theme.bgCard} border ${theme.border}`}>
                  <h3 className={`text-sm font-bold mb-4 ${theme.text}`}>5-Month Trend</h3>
                  <TrendChart />
                </Card>
              </div>

              {/* Module Cards */}
              <div className="space-y-3">
                <h3 className={`text-sm font-bold ${theme.textMuted} uppercase tracking-wider`}>Health Modules</h3>
                <ModuleCard 
                  module={MODULES[0]} 
                  score={calculateBioAge.bioAge}
                  subtitle={`${calculateBioAge.ageGap > 0 ? '+' : ''}${calculateBioAge.ageGap} years from chronological`}
                  onClick={() => setActiveModule('bioage')}
                />
                <ModuleCard 
                  module={MODULES[1]} 
                  score={`${Math.round((calculateRisks.diabetes.value + calculateRisks.cardiovascular.value + calculateRisks.liver.value) / 3)}%`}
                  subtitle="Average risk score"
                  onClick={() => setActiveModule('risk')}
                />
                <ModuleCard 
                  module={MODULES[2]} 
                  score={calculateSleepScore.score}
                  subtitle={calculateSleepScore.fatigueLevel}
                  onClick={() => setActiveModule('sleep')}
                />
                <ModuleCard 
                  module={MODULES[3]} 
                  score={calculateMetabolicScore.score}
                  subtitle={`Visceral risk: ${calculateMetabolicScore.visceralRisk}`}
                  onClick={() => setActiveModule('metabolic')}
                />
                <ModuleCard 
                  module={MODULES[4]} 
                  score={calculateInflammation.score}
                  subtitle={`Inflammation: ${calculateInflammation.level}`}
                  onClick={() => setActiveModule('inflammation')}
                />
              </div>

              {/* Action Steps */}
              <Card className={`p-4 ${theme.bgCard} border ${theme.border}`}>
                <h3 className={`text-sm font-bold mb-4 ${theme.text} flex items-center gap-2`}>
                  <Target className="w-4 h-4 text-cyan-500" />
                  Personalized Action Steps
                </h3>
                <div className="space-y-3">
                  {getActionSteps().map((action, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-start gap-3 p-3 rounded-xl ${
                        darkMode ? 'bg-slate-800/50' : 'bg-slate-100'
                      }`}
                    >
                      <div className={`w-2 h-2 mt-1.5 rounded-full ${
                        action.priority === 'high' ? 'bg-rose-500' :
                        action.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      <div className="flex-1">
                        <Badge variant="outline" className="text-xs mb-1">{action.category}</Badge>
                        <p className={`text-sm ${theme.text}`}>{action.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => setShowLabBooking(true)}
                  className={`h-14 rounded-xl ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-200 hover:bg-slate-300'} ${theme.text}`}
                >
                  <FlaskConical className="w-5 h-5 mr-2" />
                  Book Lab Tests
                </Button>
                <Button 
                  onClick={() => navigate('/reneu')}
                  className={`h-14 rounded-xl ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-200 hover:bg-slate-300'} ${theme.text}`}
                >
                  <Pill className="w-5 h-5 mr-2" />
                  Get Supplements
                </Button>
              </div>

              {/* Subscription Reminder */}
              <Card className={`p-4 ${theme.bgCard} border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10`}>
                <div className="flex items-center gap-4">
                  <Bell className="w-8 h-8 text-cyan-500" />
                  <div className="flex-1">
                    <h4 className={`font-bold ${theme.text}`}>Schedule Next Check-up</h4>
                    <p className={`text-xs ${theme.textMuted}`}>Set reminders for periodic health tracking</p>
                  </div>
                  <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 rounded-full">
                    <Calendar className="w-4 h-4 mr-1" />
                    Set
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* BioAge Module */}
          {activeModule === 'bioage' && (
            <div className="space-y-6">
              <button 
                onClick={() => setActiveModule('dashboard')}
                className={`flex items-center gap-2 ${theme.textMuted} hover:${theme.text}`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
              
              <Card className={`p-6 ${theme.bgCard} border ${theme.border}`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Brain className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${theme.text}`}>BioAge Engine</h2>
                    <p className={`text-sm ${theme.textMuted}`}>Your body's true age based on biomarkers</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                  <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} text-center`}>
                    <p className={`text-xs ${theme.textMuted} mb-1`}>Chronological Age</p>
                    <p className={`text-3xl font-bold ${theme.text}`}>{calculateBioAge.chronoAge}</p>
                    <p className={`text-xs ${theme.textMuted}`}>years</p>
                  </div>
                  <div className={`p-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-center border-2 border-violet-500`}>
                    <p className="text-xs text-violet-400 mb-1">Biological Age</p>
                    <p className={`text-4xl font-bold ${calculateBioAge.ageGap <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {calculateBioAge.bioAge}
                    </p>
                    <p className="text-xs text-violet-400">years</p>
                  </div>
                  <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} text-center`}>
                    <p className={`text-xs ${theme.textMuted} mb-1`}>Age Gap</p>
                    <p className={`text-3xl font-bold ${calculateBioAge.ageGap <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {calculateBioAge.ageGap > 0 ? '+' : ''}{calculateBioAge.ageGap}
                    </p>
                    <p className={`text-xs ${theme.textMuted}`}>years</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className={`text-sm font-bold ${theme.text}`}>Biomarker Contribution</h3>
                  {Object.entries(calculateBioAge.breakdown).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={theme.textMuted}>{BIOMARKERS[key]?.name || key}</span>
                        <span className={value >= 80 ? 'text-emerald-400' : value >= 50 ? 'text-amber-400' : 'text-rose-400'}>
                          {value}/100
                        </span>
                      </div>
                      <Progress value={value} className="h-2" />
                    </div>
                  ))}
                </div>
              </Card>
              
              <Card className={`p-4 ${theme.bgCard} border ${theme.border}`}>
                <h3 className={`text-sm font-bold mb-3 ${theme.text}`}>Improvement Suggestions</h3>
                <ul className="space-y-2">
                  {calculateBioAge.breakdown.vitamin_d < 80 && (
                    <li className={`text-sm ${theme.textMuted} flex items-start gap-2`}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                      Optimize Vitamin D levels to 30-50 ng/mL
                    </li>
                  )}
                  {calculateBioAge.breakdown.hba1c < 80 && (
                    <li className={`text-sm ${theme.textMuted} flex items-start gap-2`}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                      Reduce HbA1c through low-glycemic diet
                    </li>
                  )}
                  {calculateBioAge.breakdown.hscrp < 80 && (
                    <li className={`text-sm ${theme.textMuted} flex items-start gap-2`}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                      Lower inflammation with omega-3 supplementation
                    </li>
                  )}
                </ul>
              </Card>
            </div>
          )}

          {/* Risk Module */}
          {activeModule === 'risk' && (
            <div className="space-y-6">
              <button 
                onClick={() => setActiveModule('dashboard')}
                className={`flex items-center gap-2 ${theme.textMuted}`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
              
              <Card className={`p-6 ${theme.bgCard} border ${theme.border}`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${theme.text}`}>Predictive Risk Engine</h2>
                    <p className={`text-sm ${theme.textMuted}`}>Disease risk assessment based on biomarkers</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <RiskBar name="Type 2 Diabetes" risk={calculateRisks.diabetes} />
                  <RiskBar name="Cardiovascular Disease" risk={calculateRisks.cardiovascular} />
                  <RiskBar name="Fatty Liver (NAFLD)" risk={calculateRisks.liver} />
                  <RiskBar name="Thyroid Dysfunction" risk={calculateRisks.thyroid} />
                </div>
              </Card>
              
              <Card className={`p-4 ${theme.bgCard} border ${theme.border}`}>
                <h3 className={`text-sm font-bold mb-3 ${theme.text}`}>Prevention Guidance</h3>
                <div className="space-y-3">
                  {calculateRisks.diabetes.value > 30 && (
                    <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <p className={`text-sm font-medium ${theme.text}`}>Diabetes Prevention</p>
                      <p className={`text-xs ${theme.textMuted}`}>Limit sugar intake, increase fiber, exercise 30 min daily</p>
                    </div>
                  )}
                  {calculateRisks.cardiovascular.value > 30 && (
                    <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <p className={`text-sm font-medium ${theme.text}`}>Heart Health</p>
                      <p className={`text-xs ${theme.textMuted}`}>Monitor BP, reduce sodium, add omega-3 rich foods</p>
                    </div>
                  )}
                  {calculateRisks.liver.value > 30 && (
                    <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <p className={`text-sm font-medium ${theme.text}`}>Liver Health</p>
                      <p className={`text-xs ${theme.textMuted}`}>Avoid alcohol, reduce fructose, maintain healthy weight</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Sleep Module */}
          {activeModule === 'sleep' && (
            <div className="space-y-6">
              <button 
                onClick={() => setActiveModule('dashboard')}
                className={`flex items-center gap-2 ${theme.textMuted}`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
              
              <Card className={`p-6 ${theme.bgCard} border ${theme.border}`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                    <Moon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${theme.text}`}>Sleep & Recovery</h2>
                    <p className={`text-sm ${theme.textMuted}`}>Rest quality analysis</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-center mb-6">
                  <ScoreRing score={calculateSleepScore.score} size={150} label="Sleep Score" />
                  <Badge className={`mt-3 ${
                    calculateSleepScore.fatigueLevel === 'Optimal' ? 'bg-emerald-500' :
                    calculateSleepScore.fatigueLevel === 'Mild Fatigue' ? 'bg-amber-500' : 'bg-rose-500'
                  } text-white`}>
                    {calculateSleepScore.fatigueLevel}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} text-center`}>
                    <p className={`text-xs ${theme.textMuted}`}>Biomarker Score</p>
                    <p className={`text-2xl font-bold ${theme.text}`}>{calculateSleepScore.biomarkerContribution}</p>
                  </div>
                  <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} text-center`}>
                    <p className={`text-xs ${theme.textMuted}`}>Habits Score</p>
                    <p className={`text-2xl font-bold ${theme.text}`}>{calculateSleepScore.habitsContribution}</p>
                  </div>
                </div>
                
                {/* Sleep Questionnaire */}
                <div className="space-y-4">
                  <h3 className={`text-sm font-bold ${theme.text}`}>Sleep Habits</h3>
                  <div>
                    <label className={`text-sm ${theme.textMuted}`}>Hours per night: {sleepData.hoursPerNight}</label>
                    <Slider 
                      value={[sleepData.hoursPerNight]} 
                      min={4} 
                      max={10} 
                      step={0.5}
                      onValueChange={(v) => setSleepData({...sleepData, hoursPerNight: v[0]})}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className={`text-sm ${theme.textMuted}`}>Sleep Quality (1-5): {sleepData.sleepQuality}</label>
                    <Slider 
                      value={[sleepData.sleepQuality]} 
                      min={1} 
                      max={5} 
                      step={1}
                      onValueChange={(v) => setSleepData({...sleepData, sleepQuality: v[0]})}
                      className="mt-2"
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Metabolic Module */}
          {activeModule === 'metabolic' && (
            <div className="space-y-6">
              <button 
                onClick={() => setActiveModule('dashboard')}
                className={`flex items-center gap-2 ${theme.textMuted}`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
              
              <Card className={`p-6 ${theme.bgCard} border ${theme.border}`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    <Flame className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${theme.text}`}>Metabolic Core</h2>
                    <p className={`text-sm ${theme.textMuted}`}>Metabolic health assessment</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-center mb-6">
                  <ScoreRing score={calculateMetabolicScore.score} size={150} label="Metabolic Score" />
                  <Badge className={`mt-3 ${
                    calculateMetabolicScore.visceralRisk === 'Low' ? 'bg-emerald-500' :
                    calculateMetabolicScore.visceralRisk === 'Moderate' ? 'bg-amber-500' : 'bg-rose-500'
                  } text-white`}>
                    Visceral Risk: {calculateMetabolicScore.visceralRisk}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(calculateMetabolicScore.breakdown).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={`${theme.textMuted} capitalize`}>{key.replace('_', ' ')}</span>
                        <span className={value >= 80 ? 'text-emerald-400' : value >= 50 ? 'text-amber-400' : 'text-rose-400'}>
                          {value}/100
                        </span>
                      </div>
                      <Progress value={value} className="h-2" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Inflammation Module */}
          {activeModule === 'inflammation' && (
            <div className="space-y-6">
              <button 
                onClick={() => setActiveModule('dashboard')}
                className={`flex items-center gap-2 ${theme.textMuted}`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
              
              <Card className={`p-6 ${theme.bgCard} border ${theme.border}`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
                    <Activity className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${theme.text}`}>Inflammation Engine</h2>
                    <p className={`text-sm ${theme.textMuted}`}>Inflammatory marker tracking</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-center mb-6">
                  <ScoreRing score={calculateInflammation.score} size={150} label="Inflammation Score" />
                  <Badge className={`mt-3 ${
                    calculateInflammation.level === 'Low' ? 'bg-emerald-500' :
                    calculateInflammation.level === 'Mild' ? 'bg-amber-500' : 'bg-rose-500'
                  } text-white`}>
                    {calculateInflammation.level} Inflammation
                  </Badge>
                </div>
                
                <div className="space-y-4">
                  <h3 className={`text-sm font-bold ${theme.text}`}>Marker Breakdown</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} text-center`}>
                      <p className={`text-xs ${theme.textMuted}`}>hs-CRP</p>
                      <p className={`text-xl font-bold ${calculateInflammation.breakdown.crp >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {biomarkerData.hscrp}
                      </p>
                      <p className={`text-xs ${theme.textMuted}`}>mg/L</p>
                    </div>
                    <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} text-center`}>
                      <p className={`text-xs ${theme.textMuted}`}>ESR</p>
                      <p className={`text-xl font-bold ${calculateInflammation.breakdown.esr >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {biomarkerData.esr}
                      </p>
                      <p className={`text-xs ${theme.textMuted}`}>mm/hr</p>
                    </div>
                    <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} text-center`}>
                      <p className={`text-xs ${theme.textMuted}`}>Ferritin</p>
                      <p className={`text-xl font-bold ${calculateInflammation.breakdown.ferritin >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {biomarkerData.ferritin}
                      </p>
                      <p className={`text-xs ${theme.textMuted}`}>ng/mL</p>
                    </div>
                  </div>
                </div>
                
                {/* Longitudinal Trend */}
                <div className="mt-6">
                  <h3 className={`text-sm font-bold mb-3 ${theme.text}`}>Inflammation Trend</h3>
                  <TrendChart />
                </div>
              </Card>
            </div>
          )}
        </main>

        {/* Biomarker Input Modal */}
        <Dialog open={showInputModal} onOpenChange={setShowInputModal}>
          <DialogContent className={`max-w-md ${theme.bgSecondary} ${theme.border}`}>
            <DialogHeader>
              <DialogTitle className={theme.text}>Update Your Biomarkers</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs ${theme.textMuted}`}>Age</label>
                  <Input 
                    type="number"
                    value={biomarkerData.age}
                    onChange={(e) => setBiomarkerData({...biomarkerData, age: parseFloat(e.target.value) || 0})}
                    className={`${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${theme.textMuted}`}>HbA1c (%)</label>
                  <Input 
                    type="number"
                    step="0.1"
                    value={biomarkerData.hba1c}
                    onChange={(e) => setBiomarkerData({...biomarkerData, hba1c: parseFloat(e.target.value) || 0})}
                    className={`${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${theme.textMuted}`}>hs-CRP (mg/L)</label>
                  <Input 
                    type="number"
                    step="0.1"
                    value={biomarkerData.hscrp}
                    onChange={(e) => setBiomarkerData({...biomarkerData, hscrp: parseFloat(e.target.value) || 0})}
                    className={`${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${theme.textMuted}`}>TG/HDL Ratio</label>
                  <Input 
                    type="number"
                    step="0.1"
                    value={biomarkerData.tg_hdl}
                    onChange={(e) => setBiomarkerData({...biomarkerData, tg_hdl: parseFloat(e.target.value) || 0})}
                    className={`${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${theme.textMuted}`}>BMI (kg/m²)</label>
                  <Input 
                    type="number"
                    step="0.1"
                    value={biomarkerData.bmi}
                    onChange={(e) => setBiomarkerData({...biomarkerData, bmi: parseFloat(e.target.value) || 0})}
                    className={`${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${theme.textMuted}`}>Waist (cm)</label>
                  <Input 
                    type="number"
                    value={biomarkerData.waist}
                    onChange={(e) => setBiomarkerData({...biomarkerData, waist: parseFloat(e.target.value) || 0})}
                    className={`${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${theme.textMuted}`}>Vitamin D (ng/mL)</label>
                  <Input 
                    type="number"
                    value={biomarkerData.vitamin_d}
                    onChange={(e) => setBiomarkerData({...biomarkerData, vitamin_d: parseFloat(e.target.value) || 0})}
                    className={`${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${theme.textMuted}`}>ALT (U/L)</label>
                  <Input 
                    type="number"
                    value={biomarkerData.alt}
                    onChange={(e) => setBiomarkerData({...biomarkerData, alt: parseFloat(e.target.value) || 0})}
                    className={`${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${theme.textMuted}`}>Vitamin B12 (pg/mL)</label>
                  <Input 
                    type="number"
                    value={biomarkerData.b12}
                    onChange={(e) => setBiomarkerData({...biomarkerData, b12: parseFloat(e.target.value) || 0})}
                    className={`${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${theme.textMuted}`}>Iron (µg/dL)</label>
                  <Input 
                    type="number"
                    value={biomarkerData.iron}
                    onChange={(e) => setBiomarkerData({...biomarkerData, iron: parseFloat(e.target.value) || 0})}
                    className={`${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${theme.textMuted}`}>TSH (mIU/L)</label>
                  <Input 
                    type="number"
                    step="0.1"
                    value={biomarkerData.tsh}
                    onChange={(e) => setBiomarkerData({...biomarkerData, tsh: parseFloat(e.target.value) || 0})}
                    className={`${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${theme.textMuted}`}>Fasting Glucose (mg/dL)</label>
                  <Input 
                    type="number"
                    value={biomarkerData.fasting_glucose}
                    onChange={(e) => setBiomarkerData({...biomarkerData, fasting_glucose: parseFloat(e.target.value) || 0})}
                    className={`${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${theme.textMuted}`}>ESR (mm/hr)</label>
                  <Input 
                    type="number"
                    value={biomarkerData.esr}
                    onChange={(e) => setBiomarkerData({...biomarkerData, esr: parseFloat(e.target.value) || 0})}
                    className={`${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${theme.textMuted}`}>Ferritin (ng/mL)</label>
                  <Input 
                    type="number"
                    value={biomarkerData.ferritin}
                    onChange={(e) => setBiomarkerData({...biomarkerData, ferritin: parseFloat(e.target.value) || 0})}
                    className={`${darkMode ? 'bg-slate-800 border-slate-700' : ''}`}
                  />
                </div>
              </div>
              <Button 
                onClick={() => {
                  setShowInputModal(false);
                  toast.success('Biomarkers updated! Your scores have been recalculated.');
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
              >
                Update Scores
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Lab Booking Modal */}
        <Dialog open={showLabBooking} onOpenChange={setShowLabBooking}>
          <DialogContent className={`max-w-md ${theme.bgSecondary} ${theme.border}`}>
            <DialogHeader>
              <DialogTitle className={theme.text}>Recommended Lab Tests</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} border-2 border-cyan-500`}>
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-cyan-500 text-white mb-1">Best Value</Badge>
                    <h4 className={`font-bold ${theme.text}`}>InnerScore Complete Panel</h4>
                    <p className={`text-xs ${theme.textMuted}`}>All biomarkers for comprehensive analysis</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-cyan-500">₹2,999</p>
                    <p className={`text-xs line-through ${theme.textMuted}`}>₹4,500</p>
                  </div>
                </div>
              </div>
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} flex justify-between items-center`}>
                <div>
                  <p className={`font-medium ${theme.text}`}>Basic Metabolic Panel</p>
                  <p className={`text-xs ${theme.textMuted}`}>HbA1c, Glucose, Lipids</p>
                </div>
                <p className={`font-bold ${theme.text}`}>₹999</p>
              </div>
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} flex justify-between items-center`}>
                <div>
                  <p className={`font-medium ${theme.text}`}>Vitamin Panel</p>
                  <p className={`text-xs ${theme.textMuted}`}>D3, B12, Iron, Ferritin</p>
                </div>
                <p className={`font-bold ${theme.text}`}>₹1,299</p>
              </div>
              <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} flex justify-between items-center`}>
                <div>
                  <p className={`font-medium ${theme.text}`}>Inflammation Markers</p>
                  <p className={`text-xs ${theme.textMuted}`}>hs-CRP, ESR</p>
                </div>
                <p className={`font-bold ${theme.text}`}>₹599</p>
              </div>
              <Button 
                onClick={() => {
                  setShowLabBooking(false);
                  navigate('/mango');
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
              >
                Book via Mango Labs
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AnimatedPage>
  );
};

export default InnerScore;
