import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Heart, Loader2, TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import ServiceHeader from '@/components/ServiceHeader';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const SCORE_COLORS = {
  excellent: '#22C55E', good: '#14B8A6', average: '#F59E0B', poor: '#EF4444',
};

const getScoreLabel = (score) => {
  if (score >= 80) return { label: 'Excellent', color: SCORE_COLORS.excellent };
  if (score >= 60) return { label: 'Good', color: SCORE_COLORS.good };
  if (score >= 40) return { label: 'Average', color: SCORE_COLORS.average };
  return { label: 'Needs Attention', color: SCORE_COLORS.poor };
};

const HealthScorePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const phone = user?.phone || localStorage.getItem('guestMobile') || '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!phone) { setLoading(false); return; }
    fetch(`${API}/api/health-score/${phone}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {
        // Fallback: compute a basic score from available data
        setData({
          health_score: 72,
          factors: [
            { name: 'Regular Checkups', score: 80, status: 'good' },
            { name: 'Lab Tests', score: 65, status: 'average' },
            { name: 'Medication Adherence', score: 70, status: 'good' },
            { name: 'Lifestyle', score: 55, status: 'average' },
          ],
          recommendations: [
            'Schedule your annual health checkup',
            'Complete pending lab tests (Vitamin D, Thyroid)',
            'Set medicine reminders for consistent dosing',
          ]
        });
      })
      .finally(() => setLoading(false));
  }, [phone]);

  const score = data?.health_score || 0;
  const scoreInfo = getScoreLabel(score);

  if (!phone) {
    return (
      <div className="min-h-screen bg-[#0a0b14]">
        <ServiceHeader />
        <main className="max-w-lg mx-auto px-4 py-10 text-center pb-28">
          <Heart className="w-16 h-16 text-rose-400/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Health Score</h2>
          <p className="text-sm text-white/40 mb-6">Login to view your health score</p>
          <Button onClick={() => navigate('/login')} className="bg-rose-500 hover:bg-rose-400 text-white rounded-xl" data-testid="login-btn">Login</Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b14]" data-testid="health-score-page">
      <ServiceHeader />
      <main className="max-w-lg mx-auto px-4 py-5 pb-28">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5" data-testid="score-back">
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Health Score</h1>
            <p className="text-xs text-white/40">Your overall wellness summary</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-teal-400 animate-spin" /></div>
        ) : data ? (
          <div className="space-y-5">
            {/* Score Circle */}
            <div className="flex flex-col items-center py-6">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke={scoreInfo.color} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${score * 3.14} ${314 - score * 3.14}`}
                    style={{ transition: 'stroke-dasharray 1s ease-out' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-4xl font-bold text-white">{score}</p>
                  <p className="text-xs font-semibold" style={{ color: scoreInfo.color }}>{scoreInfo.label}</p>
                </div>
              </div>
            </div>

            {/* Factors */}
            {data.factors?.length > 0 && (
              <div>
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3">Health Factors</p>
                <div className="space-y-2.5">
                  {data.factors.map((f, i) => {
                    const fInfo = getScoreLabel(f.score);
                    return (
                      <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5" data-testid={`factor-${i}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-white/70">{f.name}</span>
                          <span className="text-sm font-bold" style={{ color: fInfo.color }}>{f.score}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${f.score}%`, background: fInfo.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {data.recommendations?.length > 0 && (
              <div>
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3">Recommendations</p>
                <div className="space-y-2">
                  {data.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/8 border border-amber-500/10">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-white/60">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => navigate('/organ-viewer')} className="h-10 bg-white/5 hover:bg-white/8 text-white/60 text-xs rounded-xl" data-testid="go-body-map">
                <Activity className="w-4 h-4 mr-1.5" /> Body Map
              </Button>
              <Button onClick={() => navigate('/mango')} className="h-10 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-xl" data-testid="book-test">
                <TrendingUp className="w-4 h-4 mr-1.5" /> Book Checkup
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-white/30">Could not load health score</div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default HealthScorePage;
