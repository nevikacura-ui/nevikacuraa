import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useSubscriptionRedirect } from '@/hooks/useSubscriptionRedirect';
import PortalCheckout from '@/components/PortalCheckout';
import HealthReminders from '@/components/HealthReminders';
import { SleepQualityChart, WorkoutStreak } from '@/components/HealthCharts';
import { WaterIntakeRing } from '@/components/HealthRings';
import {
  ArrowLeft, Sparkles, Activity, Brain, Heart, Leaf, Crown,
  Dumbbell, Target, Zap, TrendingUp, Shield, Sun, Moon,
  ChevronRight, Timer, Scale, Droplets, Apple, Utensils,
  Bed, Clock, Smartphone, Check, Lock, Star, X,
  Scissors, Eye, BookOpen, Bell
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TABS = [
  { id: 'fitness', label: 'Fitness', icon: Dumbbell, gradient: 'from-orange-400 via-rose-400 to-pink-400' },
  { id: 'nutrition', label: 'Nutrition', icon: Apple, gradient: 'from-emerald-400 via-green-400 to-teal-400' },
  { id: 'sleep', label: 'Sleep', icon: Moon, gradient: 'from-indigo-400 via-violet-400 to-purple-400' },
  { id: 'beauty', label: 'Beauty', icon: Sparkles, gradient: 'from-pink-400 via-rose-400 to-red-400' },
];

const Reneu = () => {
  const navigate = useNavigate();
  const { isSubscribed, trial, gate, canAccess, startTrial } = useSubscriptionRedirect();
  const [activeTab, setActiveTab] = useState('fitness');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReminders, setShowReminders] = useState(false);

  // Data from API
  const [programs, setPrograms] = useState([]);
  const [nutritionPlans, setNutritionPlans] = useState([]);
  const [sleepTips, setSleepTips] = useState([]);
  const [skinCare, setSkinCare] = useState(null);
  const [hairCare, setHairCare] = useState(null);

  // Dialog states
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedNutrition, setSelectedNutrition] = useState(null);
  const [showSleepLog, setShowSleepLog] = useState(false);
  const [showSkinCare, setShowSkinCare] = useState(false);
  const [showHairCare, setShowHairCare] = useState(false);
  const [sleepLogs, setSleepLogs] = useState([]);
  const [fitnessLogs, setFitnessLogs] = useState([]);
  const [newSleepLog, setNewSleepLog] = useState({ date: new Date().toISOString().split('T')[0], bedtime: '23:00', wakeup_time: '07:00', screen_time_minutes: 0, quality: 'fair', notes: '' });

  const token = localStorage.getItem('token') || localStorage.getItem('staffToken');

  const fetchData = useCallback(async () => {
    try {
      const [progRes, nutRes, sleepRes, skinRes, hairRes] = await Promise.all([
        fetch(`${API_URL}/api/reneu/programs`),
        fetch(`${API_URL}/api/reneu/nutrition`),
        fetch(`${API_URL}/api/reneu/sleep-tips`),
        fetch(`${API_URL}/api/reneu/skin-care`),
        fetch(`${API_URL}/api/reneu/hair-care`),
      ]);
      if (progRes.ok) setPrograms((await progRes.json()).programs || []);
      if (nutRes.ok) setNutritionPlans((await nutRes.json()).plans || []);
      if (sleepRes.ok) setSleepTips((await sleepRes.json()).tips || []);
      if (skinRes.ok) setSkinCare((await skinRes.json()).data || null);
      if (hairRes.ok) setHairCare((await hairRes.json()).data || null);
    } catch {}
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/api/reneu/sleep-logs`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => d && setSleepLogs(d.logs || []))
        .catch(() => {});
      fetch(`${API_URL}/api/reneu/fitness-logs`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => d && setFitnessLogs(d.logs || []))
        .catch(() => {});
    }
  }, [token]);

  const addSleepLog = async () => {
    if (!gate('sleep')) return;
    try {
      const res = await fetch(`${API_URL}/api/reneu/sleep-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newSleepLog),
      });
      if (res.ok) {
        toast.success('Sleep log added!');
        const data = await res.json();
        setSleepLogs(prev => [data.log, ...prev]);
        setShowSleepLog(false);
      }
    } catch { toast.error('Failed to log sleep'); }
  };

  const logWorkout = async (program) => {
    if (!gate('fitness')) return;
    try {
      const res = await fetch(`${API_URL}/api/reneu/fitness-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: new Date().toISOString().split('T')[0], program_id: program.id, duration_minutes: parseInt(program.duration) || 30 }),
      });
      if (res.ok) toast.success(`${program.name} workout logged!`);
    } catch { toast.error('Failed to log workout'); }
  };

  const getSleepDuration = (bedtime, wakeup) => {
    const [bh, bm] = bedtime.split(':').map(Number);
    const [wh, wm] = wakeup.split(':').map(Number);
    let hours = wh - bh + (wm - bm) / 60;
    if (hours < 0) hours += 24;
    return hours.toFixed(1);
  };

  const PROGRAM_ICONS = { yoga: Leaf, meditation: Brain, weight_training: Dumbbell, hiit: Zap, walking: Target };
  const PROGRAM_GRADIENTS = { yoga: 'from-teal-400 to-cyan-400', meditation: 'from-indigo-400 to-violet-400', weight_training: 'from-red-400 to-rose-400', hiit: 'from-orange-400 to-amber-400', walking: 'from-green-400 to-emerald-400' };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-teal-50" data-testid="reneu-page">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-gray-100" data-testid="reneu-back-btn">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-800 text-lg">Reneu</span>
            <span className="text-[9px] text-gray-400 font-medium ml-1">A Nevika Cura Company</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowReminders(true)} className="p-2 rounded-xl hover:bg-gray-100" data-testid="reneu-bell-btn"><Bell className="w-5 h-5 text-gray-500" /></button>
            {isSubscribed && <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] px-2 border-0"><Crown className="w-3 h-3 mr-1" />Pro</Badge>}
            {trial?.active && !isSubscribed && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 border border-emerald-200">{trial.days_remaining}d trial</Badge>}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1.5 px-4 pb-3 max-w-lg mx-auto overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} data-testid={`reneu-tab-${tab.id}`}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg`
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 pb-32 space-y-5">

        {/* Today Summary Card */}
        {token && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border" data-testid="reneu-today-summary">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Today</h3>
            <div className="flex gap-3">
              <div className="flex-1 bg-orange-50 rounded-xl p-3 text-center">
                <Dumbbell className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <p className="text-xs font-semibold text-gray-700">{fitnessLogs.filter(l => l.date === new Date().toISOString().split('T')[0]).length > 0 ? 'Done' : 'Pending'}</p>
                <p className="text-[10px] text-gray-400">Workout</p>
              </div>
              <div className="flex-1 bg-indigo-50 rounded-xl p-3 text-center">
                <Moon className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                <p className="text-xs font-semibold text-gray-700">{sleepLogs[0]?.quality || '—'}</p>
                <p className="text-[10px] text-gray-400">Last Sleep</p>
              </div>
              <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
                <Target className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs font-semibold text-gray-700">{(() => { let s = 0; const today = new Date(); for (let i = 0; i < 30; i++) { const d = new Date(today); d.setDate(d.getDate() - i); if (fitnessLogs.some(l => l.date === d.toISOString().split('T')[0])) s++; else if (i > 0) break; } return s; })()}d</p>
                <p className="text-[10px] text-gray-400">Streak</p>
              </div>
            </div>
          </div>
        )}

        {/* ========== FITNESS TAB ========== */}
        {activeTab === 'fitness' && (
          <div className="space-y-4" data-testid="reneu-fitness-section">
            <div className="text-center mb-2">
              <h2 className="text-lg font-bold text-gray-800">Fitness Programs</h2>
              <p className="text-xs text-gray-400">Yoga, meditation, weight training & more</p>
            </div>
            {fitnessLogs.length > 0 && <WorkoutStreak logs={fitnessLogs} />}
            <WaterIntakeRing glasses={5} target={8} />
            <div className="grid grid-cols-2 gap-3">
              {programs.map((program) => {
                const Icon = PROGRAM_ICONS[program.id] || Dumbbell;
                const grad = PROGRAM_GRADIENTS[program.id] || 'from-gray-400 to-gray-500';
                return (
                  <button key={program.id} onClick={() => { if (gate('fitness')) setSelectedProgram(program); }}
                    data-testid={`fitness-${program.id}`}
                    className={`bg-gradient-to-br ${grad} text-white p-4 rounded-2xl text-left hover:opacity-90 transition-all hover:scale-[1.03] shadow-lg relative`}>
                    {!canAccess('fitness') && <Lock className="w-4 h-4 absolute top-2 right-2 text-white/50" />}
                    <Icon className="w-7 h-7 mb-2" />
                    <h4 className="font-bold text-sm">{program.name}</h4>
                    <p className="text-[10px] text-white/70 mt-0.5">{program.level}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="bg-white/20 text-white text-[9px] border-0"><Timer className="w-2.5 h-2.5 mr-1" />{program.duration}</Badge>
                      <span className="text-[9px] text-white/60">{program.sessions} sessions</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ========== NUTRITION TAB ========== */}
        {activeTab === 'nutrition' && (
          <div className="space-y-4" data-testid="reneu-nutrition-section">
            <div className="text-center mb-2">
              <h2 className="text-lg font-bold text-gray-800">Nutrition & Diet</h2>
              <p className="text-xs text-gray-400">Plans for weight loss & weight gain</p>
            </div>
            {nutritionPlans.map((plan) => (
              <button key={plan.id} onClick={() => { if (gate('nutrition')) setSelectedNutrition(plan); }}
                data-testid={`nutrition-${plan.id}`}
                className={`w-full bg-gradient-to-r ${plan.id === 'weight_loss' ? 'from-emerald-400 to-teal-500' : 'from-orange-400 to-amber-500'} text-white p-5 rounded-2xl text-left hover:opacity-90 transition-all shadow-lg relative`}>
                {!canAccess('nutrition') && <Lock className="w-4 h-4 absolute top-3 right-3 text-white/50" />}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base">{plan.name}</h3>
                    <p className="text-[11px] text-white/80 mt-1">{plan.goal}</p>
                    <p className="text-[10px] text-white/60 mt-0.5">{plan.calories}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    {plan.id === 'weight_loss' ? <TrendingUp className="w-6 h-6 rotate-180" /> : <TrendingUp className="w-6 h-6" />}
                  </div>
                </div>
                <p className="text-xs text-white/70 mt-2">{plan.description}</p>
                <div className="flex gap-2 mt-3">
                  {plan.tips?.slice(0, 2).map((tip, i) => (
                    <Badge key={i} className="bg-white/20 text-white text-[9px] border-0">{tip}</Badge>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ========== SLEEP TAB ========== */}
        {activeTab === 'sleep' && (
          <div className="space-y-4" data-testid="reneu-sleep-section">
            <div className="text-center mb-2">
              <h2 className="text-lg font-bold text-gray-800">Sleep & Screen Time</h2>
              <p className="text-xs text-gray-400">Track sleep quality & screen time habits</p>
            </div>

            {/* Sleep Quality Chart */}
            {sleepLogs.length > 0 && <SleepQualityChart logs={sleepLogs} />}

            {/* Log Sleep Button */}
            <Button onClick={() => { if (gate('sleep')) setShowSleepLog(true); }}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-400 to-violet-500 text-white font-semibold shadow-lg"
              data-testid="log-sleep-btn">
              <Bed className="w-5 h-5 mr-2" /> Log Tonight's Sleep
            </Button>

            {/* Recent Sleep Logs */}
            {sleepLogs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Recent Logs</h3>
                {sleepLogs.slice(0, 5).map((log, i) => (
                  <div key={log.id || i} className="bg-white rounded-xl p-3 shadow-sm border flex items-center justify-between" data-testid={`sleep-log-${i}`}>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{log.date}</p>
                      <p className="text-[10px] text-gray-400">{log.bedtime} - {log.wakeup_time}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-indigo-600">{getSleepDuration(log.bedtime, log.wakeup_time)}h</p>
                      {log.screen_time_minutes > 0 && (
                        <p className="text-[10px] text-gray-400 flex items-center gap-0.5 justify-end"><Smartphone className="w-2.5 h-2.5" />{log.screen_time_minutes} min</p>
                      )}
                    </div>
                    <Badge className={`text-[10px] border-0 ml-2 ${log.quality === 'excellent' ? 'bg-emerald-100 text-emerald-700' : log.quality === 'good' ? 'bg-blue-100 text-blue-700' : log.quality === 'fair' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {log.quality}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Sleep Tips */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Sleep Tips</h3>
              <div className="grid grid-cols-2 gap-2">
                {sleepTips.map((tip, i) => {
                  const icons = { moon: Moon, clock: Clock, thermometer: Activity, coffee: Utensils, dumbbell: Dumbbell, book: BookOpen };
                  const TipIcon = icons[tip.icon] || Star;
                  return (
                    <div key={i} className="bg-white rounded-xl p-3 shadow-sm border" data-testid={`sleep-tip-${i}`}>
                      <TipIcon className="w-5 h-5 text-indigo-500 mb-1" />
                      <h4 className="text-xs font-semibold text-gray-700">{tip.title}</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">{tip.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========== BEAUTY TAB (Skin & Hair) ========== */}
        {activeTab === 'beauty' && (
          <div className="space-y-4" data-testid="reneu-beauty-section">
            <div className="text-center mb-2">
              <h2 className="text-lg font-bold text-gray-800">Skin & Hair Care</h2>
              <p className="text-xs text-gray-400">Expert routines & concern-based advice</p>
            </div>

            <button onClick={() => { if (gate('beauty')) setShowSkinCare(true); }} data-testid="skin-care-btn"
              className="w-full bg-gradient-to-r from-pink-400 to-rose-500 text-white p-5 rounded-2xl text-left hover:opacity-90 transition-all shadow-lg relative">
              {!canAccess('beauty') && <Lock className="w-4 h-4 absolute top-3 right-3 text-white/50" />}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><Sun className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-base">Skin Care</h3>
                  <p className="text-[11px] text-white/80">Morning & evening routines, concern fixes</p>
                </div>
                <ChevronRight className="w-5 h-5 ml-auto" />
              </div>
            </button>

            <button onClick={() => { if (gate('beauty')) setShowHairCare(true); }} data-testid="hair-care-btn"
              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white p-5 rounded-2xl text-left hover:opacity-90 transition-all shadow-lg relative">
              {!canAccess('beauty') && <Lock className="w-4 h-4 absolute top-3 right-3 text-white/50" />}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><Scissors className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-base">Hair Care</h3>
                  <p className="text-[11px] text-white/80">Routines, treatments & concern solutions</p>
                </div>
                <ChevronRight className="w-5 h-5 ml-auto" />
              </div>
            </button>
          </div>
        )}

        {/* ========== SUBSCRIBE / TRIAL CTA ========== */}
        {!isSubscribed && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 text-center" data-testid="reneu-cta">
            {trial?.active ? (
              <><h3 className="text-lg font-bold text-gray-800">Trial Active — {trial.days_remaining} days left</h3><p className="text-sm text-gray-500 mt-1 mb-4">Upgrade for unlimited access to all programs</p></>
            ) : (
              <><h3 className="text-lg font-bold text-gray-800">Unlock All Features</h3><p className="text-sm text-gray-500 mt-1 mb-4">Full access to fitness, nutrition, sleep tracking & beauty care</p></>
            )}
            <div className="flex gap-3 justify-center flex-wrap">
              {!trial?.active && (
                <Button onClick={startTrial} className="rounded-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md" data-testid="reneu-trial-btn">
                  <Zap className="w-4 h-4 mr-2" /> 7-Day Free Trial
                </Button>
              )}
              <Button onClick={() => setShowCheckout(true)} className="rounded-full px-6 py-3 bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-md hover:shadow-lg" data-testid="reneu-subscribe-btn">
                <Crown className="w-4 h-4 mr-2" /> Subscribe Now
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ========== PROGRAM DETAIL DIALOG ========== */}
      <Dialog open={!!selectedProgram} onOpenChange={(o) => !o && setSelectedProgram(null)}>
        <DialogContent className="max-w-md p-0 rounded-2xl border-0 overflow-hidden" data-testid="program-detail-modal">
          {selectedProgram && (
            <>
              <div className={`bg-gradient-to-r ${PROGRAM_GRADIENTS[selectedProgram.id] || 'from-gray-400 to-gray-500'} p-5 text-white`}>
                <DialogHeader>
                  <DialogTitle className="text-xl text-white">{selectedProgram.name}</DialogTitle>
                </DialogHeader>
                <div className="flex gap-2 mt-2">
                  <Badge className="bg-white/20 text-white border-0">{selectedProgram.level}</Badge>
                  <Badge className="bg-white/20 text-white border-0">{selectedProgram.duration}</Badge>
                  <Badge className="bg-white/20 text-white border-0">{selectedProgram.sessions} sessions</Badge>
                </div>
              </div>
              <ScrollArea className="max-h-[55vh] px-5 py-4 space-y-4">
                <p className="text-sm text-gray-600 mb-4">{selectedProgram.description}</p>

                <h4 className="text-sm font-bold text-gray-700 mb-2">Weekly Schedule</h4>
                <div className="space-y-2 mb-4">
                  {selectedProgram.schedule?.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-700">{s.day}</p>
                        <p className="text-[11px] text-gray-500">{s.focus}</p>
                      </div>
                      <Badge className="bg-blue-50 text-blue-600 text-[10px] border-0">{s.duration}</Badge>
                    </div>
                  ))}
                </div>

                <h4 className="text-sm font-bold text-gray-700 mb-2">Benefits</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedProgram.benefits?.map((b, i) => (
                    <Badge key={i} className="bg-emerald-50 text-emerald-700 text-[10px] border border-emerald-200"><Check className="w-3 h-3 mr-1" />{b}</Badge>
                  ))}
                </div>

                <Button onClick={() => { logWorkout(selectedProgram); setSelectedProgram(null); }}
                  className={`w-full h-11 rounded-xl bg-gradient-to-r ${PROGRAM_GRADIENTS[selectedProgram.id] || 'from-gray-400 to-gray-500'} text-white font-semibold`}
                  data-testid="log-workout-btn">
                  <Dumbbell className="w-4 h-4 mr-2" /> Log Workout
                </Button>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== NUTRITION DETAIL DIALOG ========== */}
      <Dialog open={!!selectedNutrition} onOpenChange={(o) => !o && setSelectedNutrition(null)}>
        <DialogContent className="max-w-md p-0 rounded-2xl border-0 overflow-hidden" data-testid="nutrition-detail-modal">
          {selectedNutrition && (
            <>
              <div className={`bg-gradient-to-r ${selectedNutrition.id === 'weight_loss' ? 'from-emerald-400 to-teal-500' : 'from-orange-400 to-amber-500'} p-5 text-white`}>
                <DialogHeader>
                  <DialogTitle className="text-xl text-white flex items-center gap-2"><Utensils className="w-5 h-5" /> {selectedNutrition.name}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-white/80 mt-1">{selectedNutrition.goal} | {selectedNutrition.calories}</p>
              </div>
              <ScrollArea className="max-h-[55vh] px-5 py-4">
                <p className="text-sm text-gray-600 mb-4">{selectedNutrition.description}</p>
                {Object.entries(selectedNutrition.meals || {}).map(([meal, items]) => (
                  <div key={meal} className="mb-4">
                    <h4 className="text-sm font-bold text-gray-700 capitalize flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-500" /> {meal}
                    </h4>
                    {items.map((item, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 mb-1.5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{item.item}</p>
                          <p className="text-[10px] text-gray-400">Protein: {item.protein}</p>
                        </div>
                        <Badge className="bg-blue-50 text-blue-600 text-[10px] border-0">{item.calories} cal</Badge>
                      </div>
                    ))}
                  </div>
                ))}
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <h4 className="text-sm font-bold text-emerald-700 mb-2">Pro Tips</h4>
                  {selectedNutrition.tips?.map((tip, i) => (
                    <p key={i} className="text-xs text-gray-600 flex items-start gap-2 mb-1"><Check className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />{tip}</p>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== SLEEP LOG DIALOG ========== */}
      <Dialog open={showSleepLog} onOpenChange={setShowSleepLog}>
        <DialogContent className="max-w-md rounded-2xl" data-testid="sleep-log-modal">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2"><Bed className="w-5 h-5 text-indigo-500" /> Log Sleep</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-gray-500 block mb-1">Date</label><Input type="date" value={newSleepLog.date} onChange={e => setNewSleepLog({...newSleepLog, date: e.target.value})} data-testid="sleep-date" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500 block mb-1">Bedtime</label><Input type="time" value={newSleepLog.bedtime} onChange={e => setNewSleepLog({...newSleepLog, bedtime: e.target.value})} data-testid="sleep-bedtime" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Wake Up</label><Input type="time" value={newSleepLog.wakeup_time} onChange={e => setNewSleepLog({...newSleepLog, wakeup_time: e.target.value})} data-testid="sleep-wakeup" /></div>
            </div>
            <div><label className="text-xs text-gray-500 block mb-1">Screen Time Before Bed (minutes)</label><Input type="number" min={0} placeholder="e.g. 45" value={newSleepLog.screen_time_minutes || ''} onChange={e => setNewSleepLog({...newSleepLog, screen_time_minutes: parseInt(e.target.value) || 0})} data-testid="sleep-screentime" /></div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Sleep Quality</label>
              <div className="grid grid-cols-4 gap-2">
                {['poor', 'fair', 'good', 'excellent'].map(q => (
                  <button key={q} onClick={() => setNewSleepLog({...newSleepLog, quality: q})} data-testid={`sleep-quality-${q}`}
                    className={`py-2 rounded-lg text-xs font-semibold capitalize transition-all ${newSleepLog.quality === q ? 'bg-indigo-500 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={addSleepLog} className="w-full h-11 bg-gradient-to-r from-indigo-400 to-violet-500 text-white rounded-xl font-semibold" data-testid="submit-sleep-log">
              Save Sleep Log
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== SKIN CARE DIALOG ========== */}
      <Dialog open={showSkinCare} onOpenChange={setShowSkinCare}>
        <DialogContent className="max-w-md p-0 rounded-2xl border-0 overflow-hidden" data-testid="skin-care-modal">
          <div className="bg-gradient-to-r from-pink-400 to-rose-500 p-5 text-white">
            <DialogHeader><DialogTitle className="text-xl text-white flex items-center gap-2"><Sun className="w-5 h-5" /> Skin Care Guide</DialogTitle></DialogHeader>
          </div>
          <ScrollArea className="max-h-[55vh] px-5 py-4">
            {skinCare && (
              <Tabs defaultValue="morning">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="morning">Morning</TabsTrigger>
                  <TabsTrigger value="evening">Evening</TabsTrigger>
                </TabsList>
                {['morning', 'evening'].map(time => (
                  <TabsContent key={time} value={time} className="space-y-2">
                    {skinCare.routines?.[time]?.map((step, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm flex-shrink-0">{step.step}</div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700">{step.name}</p>
                          <p className="text-[10px] text-gray-500">{step.desc}</p>
                          <Badge className="mt-1 bg-pink-50 text-pink-600 text-[9px] border-0">{step.duration}</Badge>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            )}
            {skinCare?.concerns && (
              <div className="mt-4">
                <h4 className="text-sm font-bold text-gray-700 mb-2">Common Concerns</h4>
                {skinCare.concerns.map((c, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 mb-2">
                    <h5 className="text-xs font-bold text-pink-600">{c.issue}</h5>
                    <ul className="mt-1 space-y-0.5">{c.tips.map((t, j) => <li key={j} className="text-[10px] text-gray-600 flex gap-1"><Check className="w-3 h-3 text-pink-400 flex-shrink-0" />{t}</li>)}</ul>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ========== HAIR CARE DIALOG ========== */}
      <Dialog open={showHairCare} onOpenChange={setShowHairCare}>
        <DialogContent className="max-w-md p-0 rounded-2xl border-0 overflow-hidden" data-testid="hair-care-modal">
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-5 text-white">
            <DialogHeader><DialogTitle className="text-xl text-white flex items-center gap-2"><Scissors className="w-5 h-5" /> Hair Care Guide</DialogTitle></DialogHeader>
          </div>
          <ScrollArea className="max-h-[55vh] px-5 py-4">
            {hairCare && (
              <>
                <h4 className="text-sm font-bold text-gray-700 mb-2">Weekly Routine</h4>
                <div className="space-y-2 mb-4">
                  {hairCare.routines?.map((step, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm flex-shrink-0">{step.step}</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{step.name} <span className="text-[10px] text-gray-400 font-normal">({step.freq})</span></p>
                        <p className="text-[10px] text-gray-500">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <h4 className="text-sm font-bold text-gray-700 mb-2">Common Concerns</h4>
                {hairCare.concerns?.map((c, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 mb-2">
                    <h5 className="text-xs font-bold text-amber-600">{c.issue}</h5>
                    <ul className="mt-1 space-y-0.5">{c.tips.map((t, j) => <li key={j} className="text-[10px] text-gray-600 flex gap-1"><Check className="w-3 h-3 text-amber-400 flex-shrink-0" />{t}</li>)}</ul>
                  </div>
                ))}
              </>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <PortalCheckout open={showCheckout} onOpenChange={setShowCheckout} portalName="Reneu" accentGradient="from-emerald-400 to-teal-500" />
      <HealthReminders open={showReminders} onOpenChange={setShowReminders} portal="reneu" />
    </div>
  );
};

export default Reneu;
