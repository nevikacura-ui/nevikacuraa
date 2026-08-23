import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Activity, Download, ChevronRight, Beaker } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  normal: { color: '#10B981', bg: '#ECFDF5', label: 'Normal', icon: CheckCircle },
  borderline: { color: '#F59E0B', bg: '#FFFBEB', label: 'Borderline', icon: AlertTriangle },
  abnormal: { color: '#EF4444', bg: '#FEF2F2', label: 'Abnormal', icon: AlertTriangle },
};

const Sparkline = ({ data, color, height = 40, width = 120 }) => {
  if (!data || data.length < 2) return null;
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) =>
    `${(i / (values.length - 1)) * width},${height - ((v - min) / range) * (height - 8) - 4}`
  ).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={(i / (values.length - 1)) * width} cy={height - ((v - min) / range) * (height - 8) - 4}
          r={i === values.length - 1 ? 4 : 2} fill={i === values.length - 1 ? color : `${color}60`} />
      ))}
    </svg>
  );
};

const ScoreRing = ({ score, size = 120 }) => {
  const radius = (size - 12) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f0f0f0" strokeWidth="10" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
          strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-500">Health Score</span>
      </div>
    </div>
  );
};

const TestCard = ({ test, onSelect }) => {
  const config = STATUS_CONFIG[test.status] || STATUS_CONFIG.normal;
  const StatusIcon = config.icon;
  const isUp = test.trend === 'up';
  const TrendIcon = test.trend === 'up' ? TrendingUp : test.trend === 'down' ? TrendingDown : Minus;

  return (
    <button onClick={() => onSelect(test)} className="w-full text-left rounded-2xl p-4 transition-all hover:shadow-md"
      style={{ background: 'white', border: `1px solid ${config.color}15` }}
      data-testid={`test-card-${test.test}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: config.bg }}>
            <StatusIcon className="w-4 h-4" style={{ color: config.color }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1A2B28] capitalize">{test.test.replace(/_/g, ' ')}</p>
            <p className="text-xs text-[#8A9E99]">{test.unit}</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-bold" style={{ color: config.color }}>{test.value}</span>
          <span className="text-xs text-[#8A9E99] ml-1">{test.unit}</span>
        </div>
        {test.sparklineData && (
          <Sparkline data={test.sparklineData} color={config.color} height={32} width={80} />
        )}
      </div>
      <div className="flex items-center gap-1 mt-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold`} style={{ background: config.bg, color: config.color }}>
          {config.label}
        </span>
      </div>
    </button>
  );
};

export default function LabReportViewer() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
  const [trends, setTrends] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const phone = localStorage.getItem('guestMobile') || '9999999999';

  useEffect(() => {
    Promise.all([fetchSummary(), fetchReports()]).finally(() => setLoading(false));
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await axios.get(`${API}/api/lab-reports/summary/${phone}`);
      // Add sparkline data to details
      const details = await Promise.all((res.data.details || []).map(async d => {
        try {
          const tr = await axios.get(`${API}/api/lab-reports/trends/${phone}/${d.test}`);
          return { ...d, sparklineData: tr.data.trends };
        } catch { return d; }
      }));
      setSummary({ ...res.data, details });
    } catch { }
  };

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${API}/api/lab-reports/patient/${phone}`);
      setReports(res.data.reports || []);
    } catch { }
  };

  const selectTest = async (test) => {
    setSelectedTest(test);
    try {
      const res = await axios.get(`${API}/api/lab-reports/trends/${phone}/${test.test}`);
      setTrends(res.data);
    } catch { }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7FAF9' }}>
        <div className="w-10 h-10 border-3 border-[#1F4F46] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F7FAF9' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg, #1F4F46 0%, #2A6B5E 100%)' }} className="px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => selectedTest ? setSelectedTest(null) : navigate(-1)} className="p-2 rounded-full bg-white/10" data-testid="back-btn">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white">{selectedTest ? selectedTest.test.replace(/_/g, ' ') : 'Lab Reports'}</h1>
        </div>

        {!selectedTest && summary && (
          <div className="flex items-center justify-center">
            <ScoreRing score={summary.score} />
            <div className="ml-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-white/80 text-sm">{summary.normal} Normal</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-white/80 text-sm">{summary.borderline} Borderline</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="text-white/80 text-sm">{summary.abnormal} Attention</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail View */}
      {selectedTest && trends ? (
        <div className="px-4 -mt-4">
          <div className="rounded-2xl p-5 bg-white shadow-sm" style={{ border: '1px solid rgba(31,79,70,0.06)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-2xl font-bold text-[#1A2B28]">{selectedTest.value} <span className="text-sm text-[#8A9E99]">{selectedTest.unit}</span></p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold`}
                  style={{ background: STATUS_CONFIG[selectedTest.status]?.bg, color: STATUS_CONFIG[selectedTest.status]?.color }}>
                  {STATUS_CONFIG[selectedTest.status]?.label}
                </span>
              </div>
              <Activity className="w-6 h-6 text-[#1F4F46]" />
            </div>

            {/* Full trend chart */}
            <div className="mt-4">
              <p className="text-xs text-[#8A9E99] mb-2">Historical Trend</p>
              <div className="h-32 flex items-end gap-2">
                {trends.trends?.map((t, i) => {
                  const max = Math.max(...trends.trends.map(x => x.value));
                  const min = Math.min(...trends.trends.map(x => x.value));
                  const range = max - min || 1;
                  const h = ((t.value - min) / range) * 100 + 20;
                  const nMin = trends.normal_range?.min || 0;
                  const nMax = trends.normal_range?.max || 999;
                  const isNormal = t.value >= nMin && t.value <= nMax;

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-medium" style={{ color: isNormal ? '#10B981' : '#EF4444' }}>{t.value}</span>
                      <div className="w-full rounded-t-lg transition-all" style={{
                        height: `${h}%`,
                        background: isNormal ? 'linear-gradient(180deg, #10B981, #6EE7B7)' : 'linear-gradient(180deg, #EF4444, #FCA5A5)',
                        opacity: i === trends.trends.length - 1 ? 1 : 0.6,
                      }} />
                      <span className="text-[9px] text-[#8A9E99]">{t.date?.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
              {/* Normal range indicator */}
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-[#8A9E99]">
                <span>Normal: {trends.normal_range?.min} - {trends.normal_range?.max} {trends.unit}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="px-4 -mt-4">
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {['overview', 'reports'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab ? 'bg-[#1F4F46] text-white shadow-md' : 'bg-white text-[#4A6B64]'
                }`} data-testid={`tab-${tab}`}>
                {tab === 'overview' ? 'Overview' : 'All Reports'}
              </button>
            ))}
          </div>

          {activeTab === 'overview' ? (
            <div className="grid grid-cols-1 gap-3">
              {summary?.details?.map(test => (
                <TestCard key={test.test} test={test} onSelect={selectTest} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r.report_id} className="rounded-2xl p-4 bg-white shadow-sm" style={{ border: '1px solid rgba(31,79,70,0.06)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[#1F4F46]" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[#1A2B28]">{r.type}</p>
                        <p className="text-xs text-[#8A9E99]">{r.date} - {r.lab}</p>
                      </div>
                    </div>
                    <Button variant="ghost" className="h-8 text-xs text-[#1F4F46]" data-testid={`view-report-${r.report_id}`}>
                      <Download className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
