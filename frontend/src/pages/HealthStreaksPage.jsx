import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ArrowLeft, Flame, Trophy, Star, Target, Crown,
  Footprints, Droplet, Moon, Dumbbell, Brain, Pill,
  HeartPulse, Check, Lock, ChevronRight, Zap
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const ACTIVITY_ICONS = {
  steps: Footprints, water: Droplet, sleep: Moon,
  exercise: Dumbbell, meditation: Brain, medicine: Pill, checkup: HeartPulse,
};
const ACTIVITY_COLORS = {
  steps: '#10B981', water: '#3B82F6', sleep: '#8B5CF6',
  exercise: '#F97316', meditation: '#EC4899', medicine: '#06B6D4', checkup: '#EF4444',
};
const BADGE_ICONS = { flame: Flame, crown: Crown, trophy: Trophy, star: Star, target: Target };

const HealthStreaksPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(null);
  const [tab, setTab] = useState('activities');
  const phone = user?.phone || '';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, leaderRes] = await Promise.all([
        phone ? axios.get(`${API}/api/gamification/profile/${phone}`) : Promise.resolve({ data: null }),
        axios.get(`${API}/api/gamification/leaderboard`),
      ]);
      setProfile(profileRes.data);
      setLeaderboard(leaderRes.data.leaderboard || []);
    } catch {}
    setLoading(false);
  };

  const handleCheckIn = async (activity) => {
    if (!phone) { toast.error('Please log in'); return; }
    setCheckingIn(activity);
    try {
      const res = await axios.post(`${API}/api/gamification/check-in`, { phone, activity });
      if (res.data.already_done) {
        toast.info('Already checked in for this today!');
      } else {
        toast.success(`+${res.data.points_earned} points! Streak: ${res.data.current_streak} days`);
        if (res.data.new_badges?.length > 0) {
          res.data.new_badges.forEach(b => toast.success(`Badge earned: ${b.badge.name} (+${b.coins_earned} CuraCoins)`));
        }
      }
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Check-in failed');
    }
    setCheckingIn(null);
  };

  const streak = profile?.current_streak || 0;
  const todayDone = profile?.today_activities || [];

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0A0A12' }} data-testid="health-streaks-page">
      <header className="sticky top-0 z-50 px-4 py-3" style={{ background: 'rgba(10,10,18,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div>
            <h1 className="font-bold text-base text-white flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" /> Health Streaks
            </h1>
            <p className="text-[11px] text-gray-500">Build healthy habits daily</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Streak Card */}
        <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(239,68,68,0.1))', border: '1px solid rgba(249,115,22,0.2)' }}>
          <Flame className="w-10 h-10 text-orange-400 mx-auto mb-1" />
          <p className="text-4xl font-black text-white" data-testid="streak-count">{streak}</p>
          <p className="text-xs text-orange-300">Day Streak</p>
          <div className="flex justify-center gap-6 mt-3">
            <div><p className="text-lg font-bold text-white">{profile?.longest_streak || 0}</p><p className="text-[10px] text-gray-400">Best</p></div>
            <div><p className="text-lg font-bold text-white">{profile?.total_points || 0}</p><p className="text-[10px] text-gray-400">Points</p></div>
            <div><p className="text-lg font-bold text-white">{profile?.earned_badge_count || 0}</p><p className="text-[10px] text-gray-400">Badges</p></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {['activities', 'badges', 'leaderboard'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition ${tab === t ? 'bg-orange-600 text-white' : 'bg-white/5 text-gray-400'}`}
              data-testid={`tab-${t}`}>{t}</button>
          ))}
        </div>

        {/* Activities Tab */}
        {tab === 'activities' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">Check in to earn points & maintain your streak</p>
            {profile?.activities && Object.entries(profile.activities).map(([key, info]) => {
              const Icon = ACTIVITY_ICONS[key] || HeartPulse;
              const color = ACTIVITY_COLORS[key] || '#8B5CF6';
              const done = todayDone.includes(key);
              return (
                <button key={key} onClick={() => !done && handleCheckIn(key)} disabled={done || checkingIn === key}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition active:scale-[0.98]"
                  style={{ background: done ? `${color}10` : 'rgba(255,255,255,0.03)', border: `1px solid ${done ? `${color}30` : 'rgba(255,255,255,0.06)'}` }}
                  data-testid={`activity-${key}`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{info.name}</p>
                    <p className="text-[10px] text-gray-500">+{info.points} points</p>
                  </div>
                  {done ? (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${color}20` }}>
                      <Check className="w-4 h-4" style={{ color }} />
                    </div>
                  ) : checkingIn === key ? (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5">
                      <Zap className="w-4 h-4 text-orange-400 animate-pulse" />
                    </div>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Badges Tab */}
        {tab === 'badges' && (
          <div className="grid grid-cols-2 gap-2">
            {profile?.badges?.map((badge) => {
              const Icon = BADGE_ICONS[badge.icon] || Star;
              return (
                <div key={badge.id} className={`p-3 rounded-xl text-center ${badge.earned ? '' : 'opacity-40'}`}
                  style={{ background: badge.earned ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${badge.earned ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.05)'}` }}
                  data-testid={`badge-${badge.id}`}>
                  <div className="w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center" style={{ background: badge.earned ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)' }}>
                    {badge.earned ? <Icon className="w-5 h-5 text-orange-400" /> : <Lock className="w-4 h-4 text-gray-600" />}
                  </div>
                  <p className="text-xs font-semibold text-white">{badge.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{badge.desc}</p>
                  <p className="text-[10px] text-amber-400 mt-1">+{badge.coins} CuraCoins</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Leaderboard Tab */}
        {tab === 'leaderboard' && (
          <div className="space-y-2">
            {leaderboard.map((user, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: i < 3 ? 'rgba(249,115,22,0.06)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                data-testid={`leaderboard-${i}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-gray-500'}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-[10px] text-gray-500">{user.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-orange-400">{user.longest_streak}</p>
                  <p className="text-[10px] text-gray-500">best streak</p>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && <p className="text-center text-xs text-gray-600 py-8">No data yet. Start your streak!</p>}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default HealthStreaksPage;
