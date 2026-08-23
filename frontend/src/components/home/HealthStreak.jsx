import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Footprints, Trophy, Gift, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const HealthStreak = () => {
  const navigate = useNavigate();
  const [streak, setStreak] = useState(0);
  const [todaySteps, setTodaySteps] = useState(0);
  const [goalReached, setGoalReached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [rewards, setRewards] = useState({ consultation: false, delivery: false });
  const phone = localStorage.getItem('guestMobile') || localStorage.getItem('userPhone') || '';

  const fetchStreak = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    try {
      const res = await axios.get(`${API}/api/health-streak/${phone}`);
      const data = res.data;
      setStreak(data.streak || 0);
      setTodaySteps(data.today_steps || 0);
      setGoalReached(data.today_goal_reached || false);
      setRewards(data.rewards || { consultation: false, delivery: false });
    } catch {
      // First time — no data yet
    } finally { setLoading(false); }
  }, [phone]);

  useEffect(() => { fetchStreak(); }, [fetchStreak]);

  const logSteps = async (steps) => {
    if (!phone) { toast.error('Please login first'); return; }
    try {
      const res = await axios.post(`${API}/api/health-streak/log`, { phone, steps });
      setTodaySteps(res.data.today_steps);
      setStreak(res.data.streak);
      setGoalReached(res.data.today_goal_reached);
      setRewards(res.data.rewards || rewards);
      if (res.data.today_goal_reached) {
        toast.success(`Goal reached! Streak: ${res.data.streak} days`);
      } else {
        toast.success(`${res.data.today_steps.toLocaleString()} steps logged today`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to log steps');
    }
  };

  // Connect Google Fit (web)
  const connectGoogleFit = () => {
    toast.info('Google Fit integration coming soon! For now, log steps manually.');
  };

  const progressPct = Math.min((todaySteps / 10000) * 100, 100);
  const streakPct = Math.min((streak / 21) * 100, 100);

  if (loading) return null;

  return (
    <div className="mb-5" data-testid="health-streak">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full rounded-2xl p-3.5 relative overflow-hidden active:scale-[0.98] transition-transform text-left"
        style={{ background: streak >= 21 ? 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(249,115,22,0.1))' : 'rgba(255,255,255,0.04)', border: streak >= 21 ? '1px solid rgba(234,179,8,0.3)' : '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: streak > 0 ? 'linear-gradient(135deg, #f97316, #ef4444)' : 'rgba(255,255,255,0.08)' }}>
            {streak > 0 ? <Flame className="w-6 h-6 text-white" /> : <Footprints className="w-5 h-5 text-white/40" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm">
                {streak > 0 ? `${streak}-Day Streak` : 'Start Your Health Streak'}
              </span>
              {goalReached && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: goalReached ? '#22c55e' : 'linear-gradient(90deg, #f97316, #ef4444)' }} />
              </div>
              <span className="text-[10px] text-white/50 font-medium whitespace-nowrap">{todaySteps.toLocaleString()}/10K</span>
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-white/30 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="mt-2 rounded-2xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-200" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {/* 21-day progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">21-Day Challenge</span>
              <span className="text-xs font-bold" style={{ color: streak >= 21 ? '#eab308' : '#f97316' }}>{streak}/21 days</span>
            </div>
            <div className="flex gap-[3px]">
              {Array.from({ length: 21 }).map((_, i) => (
                <div key={i} className="flex-1 h-2 rounded-full transition-all" style={{
                  background: i < streak ? (streak >= 21 ? 'linear-gradient(135deg, #eab308, #f97316)' : '#f97316') : 'rgba(255,255,255,0.08)'
                }} />
              ))}
            </div>
          </div>

          {/* Quick log buttons */}
          <div>
            <p className="text-xs text-white/40 mb-2">Log today's steps:</p>
            <div className="flex gap-2">
              {[3000, 5000, 8000, 10000].map(s => (
                <button key={s} onClick={() => logSteps(s)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{ background: todaySteps >= s ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', color: todaySteps >= s ? '#22c55e' : 'rgba(255,255,255,0.5)', border: todaySteps >= s ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.08)' }}
                  data-testid={`log-${s}`}>
                  {(s/1000).toFixed(0)}K
                </button>
              ))}
            </div>
          </div>

          {/* Google Fit connect */}
          <button onClick={connectGoogleFit}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-white/60 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
            style={{ border: '1px dashed rgba(255,255,255,0.15)' }}
            data-testid="connect-google-fit">
            <Footprints className="w-3.5 h-3.5" />
            Connect Google Fit (auto-sync)
          </button>

          {/* Rewards */}
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center gap-1.5 mb-2">
              <Gift className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Rewards at 21 days</span>
            </div>
            <div className="space-y-1.5">
              {[
                { label: '10% off Consultation & Lab Tests', unlocked: rewards.consultation, icon: Trophy },
                { label: 'Free home delivery on pharmacy', unlocked: rewards.delivery, icon: Gift },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: r.unlocked ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.03)' }}>
                  <r.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: r.unlocked ? '#eab308' : 'rgba(255,255,255,0.2)' }} />
                  <span className="text-xs flex-1" style={{ color: r.unlocked ? '#eab308' : 'rgba(255,255,255,0.35)' }}>{r.label}</span>
                  {r.unlocked && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthStreak;
