import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useSubscriptionRedirect } from '@/hooks/useSubscriptionRedirect';
import PortalCheckout from '@/components/PortalCheckout';
import HealthReminders from '@/components/HealthReminders';
import { CycleTrendChart, SymptomFrequency, PeriodCalendar } from '@/components/HealthCharts';
import { FertilityWindow } from '@/components/HealthRings';
import {
  ArrowLeft, Heart, Calendar, Sparkles, Activity, Baby, Flower2,
  ChevronRight, Clock, Apple, Dumbbell, X, Check, Crown, Lock,
  Sun, Moon, Droplets, Brain, Shield, Share2, AlertTriangle, Phone,
  Star, Zap, Bell, Stethoscope
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ==================== STATIC DATA ====================
const PMS_EDUCATION = {
  overview: "Premenstrual Syndrome affects about 75% of women. Symptoms occur 1-2 weeks before your period.",
  symptoms: {
    physical: ["Bloating", "Breast tenderness", "Headaches", "Fatigue", "Muscle aches", "Acne", "Digestive issues"],
    emotional: ["Mood swings", "Irritability", "Anxiety", "Depression", "Difficulty concentrating", "Changes in appetite"]
  },
  tips: [
    { title: "Exercise Regularly", desc: "30 minutes of moderate exercise daily reduces cramps and improves mood" },
    { title: "Reduce Salt & Sugar", desc: "Both can worsen bloating and mood swings. Limit processed foods" },
    { title: "Stay Hydrated", desc: "Drink 8-10 glasses of water daily. Herbal teas like chamomile help" },
    { title: "Get Enough Sleep", desc: "7-9 hours of quality sleep helps manage hormonal fluctuations" },
    { title: "Calcium & Magnesium", desc: "1200mg calcium and 300-400mg magnesium daily may reduce symptoms" }
  ]
};

const PCOS_EDUCATION = {
  overview: "Polycystic Ovary Syndrome affects 1 in 10 women. It's a hormonal disorder causing enlarged ovaries with small cysts.",
  symptoms: ["Irregular or missed periods", "Excess hair growth (hirsutism)", "Acne and oily skin", "Weight gain", "Thinning hair", "Darkening of skin"],
  diet: [
    { category: "Proteins", items: "Lean chicken, fish, eggs, tofu, legumes, Greek yogurt" },
    { category: "Complex Carbs", items: "Quinoa, brown rice, oats, sweet potatoes, whole grain bread" },
    { category: "Healthy Fats", items: "Avocado, olive oil, nuts, seeds, fatty fish (salmon)" },
    { category: "Vegetables", items: "Leafy greens, broccoli, cauliflower, bell peppers, tomatoes" },
    { category: "Fruits (low GI)", items: "Berries, apples, pears, oranges, cherries" },
    { category: "Anti-inflammatory", items: "Turmeric, ginger, green tea, dark chocolate (70%+)" }
  ],
  exercises: [
    { name: "Brisk Walking", duration: "30 min/day", benefit: "Improves insulin sensitivity" },
    { name: "Yoga", duration: "20-30 min", benefit: "Reduces stress, balances hormones" },
    { name: "Strength Training", duration: "3x/week", benefit: "Builds muscle, boosts metabolism" },
    { name: "Swimming", duration: "30 min", benefit: "Full body, low impact exercise" },
    { name: "Cycling", duration: "20-30 min", benefit: "Cardio without joint stress" }
  ]
};

const PREGNANCY_WEEKS = [
  { week: "1-4", size: "Poppy seed", detail: "Fertilization occurs, cells begin dividing", mom: "May not know yet, fatigue begins" },
  { week: "5-8", size: "Raspberry", detail: "Heart begins beating, limbs forming", mom: "Morning sickness, breast tenderness" },
  { week: "9-12", size: "Lime", detail: "All major organs formed, fingers and toes", mom: "Nausea may peak, mood swings" },
  { week: "13-16", size: "Avocado", detail: "Gender may be visible, baby moves", mom: "Energy returns, appetite increases" },
  { week: "17-20", size: "Banana", detail: "You may feel first kicks!", mom: "Growing belly, backaches may start" },
  { week: "21-24", size: "Corn", detail: "Baby hears sounds, sleep cycles form", mom: "Braxton Hicks contractions may begin" },
  { week: "25-28", size: "Cauliflower", detail: "Eyes open, brain developing rapidly", mom: "Leg cramps, heartburn common" },
  { week: "29-32", size: "Squash", detail: "Baby gaining weight, bones hardening", mom: "Shortness of breath, frequent urination" },
  { week: "33-36", size: "Pineapple", detail: "Lungs maturing, baby may turn head-down", mom: "Pelvic pressure, Braxton Hicks increase" },
  { week: "37-40", size: "Watermelon", detail: "Full term! Ready for birth", mom: "Nesting instinct, cervix may dilate" },
];

const MENOPAUSE_TIPS = [
  { title: "Stay Cool", desc: "Dress in layers, keep room cool, avoid spicy food triggers" },
  { title: "Bone Health", desc: "1200mg calcium + Vitamin D daily. Weight-bearing exercises" },
  { title: "Heart Health", desc: "Monitor cholesterol, blood pressure. Maintain healthy weight" },
  { title: "Sleep Hygiene", desc: "Cool bedroom, moisture-wicking fabrics, avoid caffeine after noon" },
  { title: "Stay Active", desc: "Regular exercise reduces hot flashes and improves mood" }
];

// ==================== MAIN COMPONENT ====================
const Evara = () => {
  const navigate = useNavigate();
  const { isSubscribed, trial, gate, canAccess, startTrial } = useSubscriptionRedirect();

  const [showPeriodTracker, setShowPeriodTracker] = useState(false);
  const [showPCOS, setShowPCOS] = useState(false);
  const [showPregnancy, setShowPregnancy] = useState(false);
  const [showMenopause, setShowMenopause] = useState(false);
  const [showPMS, setShowPMS] = useState(false);
  const [showDiet, setShowDiet] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReminders, setShowReminders] = useState(false);

  const [periodData, setPeriodData] = useState({ start_date: '', flow: 'medium', symptoms: [], notes: '' });
  const [periodHistory, setPeriodHistory] = useState({ history: [], average_cycle_length: 28, next_predicted: null });
  const symptomsList = ['Cramps', 'Bloating', 'Mood Swings', 'Headache', 'Fatigue', 'Back Pain', 'Breast Tenderness'];

  const token = localStorage.getItem('token') || localStorage.getItem('evara_token') || localStorage.getItem('staffToken');

  useEffect(() => { if (token) fetchPeriodHistory(); }, [token]);

  const fetchPeriodHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/evara/period-history`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPeriodHistory(await res.json());
    } catch (e) {}
  };

  const logPeriod = async () => {
    if (!periodData.start_date) { toast.error('Please select start date'); return; }
    try {
      const res = await fetch(`${API_URL}/api/evara/period-log`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(periodData)
      });
      if (res.ok) { toast.success('Period logged successfully'); fetchPeriodHistory(); setPeriodData({ start_date: '', flow: 'medium', symptoms: [], notes: '' }); }
    } catch (e) { toast.error('Failed to log period'); }
  };

  const shareOnWhatsApp = (type) => {
    const msgs = { pcos: "Understanding PCOS - Learn about symptoms, diet & exercises. Download Nevika Cura!", pregnancy: "Pregnancy Week-by-Week Guide. Download Nevika Cura!" };
    window.open(`https://wa.me/?text=${encodeURIComponent(msgs[type] || '')}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-pink-50" data-testid="evara-portal">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-gray-100" data-testid="evara-back-btn">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-800 text-lg">Evara</span>
            <span className="text-[9px] text-gray-400 font-medium ml-1">A Nevika Cura Company</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowReminders(true)} className="p-2 rounded-xl hover:bg-gray-100" data-testid="evara-bell-btn"><Bell className="w-5 h-5 text-gray-500" /></button>
            {isSubscribed && <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] px-2 border-0"><Crown className="w-3 h-3 mr-1" />Pro</Badge>}
            {trial?.active && !isSubscribed && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 border border-emerald-200">{trial.days_remaining}d trial</Badge>}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pb-24 pt-5 space-y-6">
        {/* Hero Banner - Rich Warm Premium */}
        <div className="bg-gradient-to-br from-[#7a1b4e] via-[#a83279] to-[#c44895] rounded-2xl p-5 text-white shadow-xl relative overflow-hidden" data-testid="evara-hero">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
          <div className="relative z-10">
            <p className="text-rose-200/90 font-medium tracking-wide uppercase text-[11px]">Women's Health Portal</p>
            <h1 className="text-2xl font-bold mt-1">Your Health, Your Journey</h1>
            <p className="text-xs text-white/60 mt-2">Complete care for every stage of womanhood</p>
            <div className="flex gap-4 mt-4">
              <div className="text-center"><p className="text-xl font-bold">{periodHistory.average_cycle_length || 28}d</p><p className="text-[10px] text-white/50">Avg Cycle</p></div>
              <div className="w-px bg-white/15" />
              <div className="text-center"><p className="text-xl font-bold">{periodHistory.history?.length || 0}</p><p className="text-[10px] text-white/50">Cycles Logged</p></div>
              <div className="w-px bg-white/15" />
              {periodHistory.next_predicted ? (
                <div className="text-center"><p className="text-xl font-bold">{periodHistory.next_predicted.slice(5)}</p><p className="text-[10px] text-white/50">Next Period</p></div>
              ) : (
                <div className="text-center"><p className="text-xl font-bold">24/7</p><p className="text-[10px] text-white/50">Helpline</p></div>
              )}
            </div>
          </div>
        </div>

        {/* Fertility Insight - Always Visible */}
        <FertilityWindow cycleDay={14} cycleLength={periodHistory.cycle_length || 28} />

        {/* Data Visualization */}
        {periodHistory.history?.length > 0 && (
          <div className="space-y-3" data-testid="evara-charts">
            <PeriodCalendar history={periodHistory.history} />
            <CycleTrendChart history={periodHistory.history} />
            <SymptomFrequency history={periodHistory.history} />
          </div>
        )}

        {/* Feature Cards - Alyne Style 2x2 Grid */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Health Tools</h2>
          <p className="text-sm text-gray-400 mb-4">Track, learn, and manage your health</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Period Tracker */}
            <button onClick={gate(() => setShowPeriodTracker(true), 'period_tracker', 'evara')} className="bg-gradient-to-br from-rose-400 via-pink-400 to-red-400 text-white p-4 rounded-2xl text-left hover:opacity-90 transition-all hover:scale-105 shadow-lg relative" data-testid="evara-period-tracker">
              <Droplets className="w-8 h-8 mb-2" />
              <h4 className="font-bold text-sm">Period Tracker</h4>
              <p className="text-[10px] text-white/70 mt-1">Log cycle & symptoms</p>
              {!isSubscribed && canAccess('period_tracker', 'evara') && <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-white/25">TRIAL</span>}
              {!canAccess('period_tracker', 'evara') && <Lock className="absolute top-3 right-3 w-4 h-4 text-white/40" />}
            </button>
            {/* PCOS Guide */}
            <button onClick={gate(() => setShowPCOS(true), 'pcos_guide', 'evara')} className="bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-500 text-white p-4 rounded-2xl text-left hover:opacity-90 transition-all hover:scale-105 shadow-lg relative" data-testid="evara-pcos-guide">
              <Shield className="w-8 h-8 mb-2" />
              <h4 className="font-bold text-sm">PCOS Guide</h4>
              <p className="text-[10px] text-white/70 mt-1">Diet, exercise, symptoms</p>
              {!isSubscribed && canAccess('pcos_guide', 'evara') && <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-white/25">TRIAL</span>}
              {!canAccess('pcos_guide', 'evara') && <Lock className="absolute top-3 right-3 w-4 h-4 text-white/40" />}
            </button>
            {/* Pregnancy Guide */}
            <button onClick={gate(() => setShowPregnancy(true), 'pregnancy_guide', 'evara')} className="bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-400 text-white p-4 rounded-2xl text-left hover:opacity-90 transition-all hover:scale-105 shadow-lg relative" data-testid="evara-pregnancy-guide">
              <Baby className="w-8 h-8 mb-2" />
              <h4 className="font-bold text-sm">Pregnancy Guide</h4>
              <p className="text-[10px] text-white/70 mt-1">Week by week tracking</p>
              {!isSubscribed && canAccess('pregnancy_guide', 'evara') && <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-white/25">TRIAL</span>}
              {!canAccess('pregnancy_guide', 'evara') && <Lock className="absolute top-3 right-3 w-4 h-4 text-white/40" />}
            </button>
            {/* PMS Education */}
            <button onClick={gate(() => setShowPMS(true), 'pms_education', 'evara')} className="bg-gradient-to-br from-emerald-400 via-green-400 to-teal-400 text-white p-4 rounded-2xl text-left hover:opacity-90 transition-all hover:scale-105 shadow-lg relative" data-testid="evara-pms-education">
              <Brain className="w-8 h-8 mb-2" />
              <h4 className="font-bold text-sm">PMS Education</h4>
              <p className="text-[10px] text-white/70 mt-1">Relief & self-care tips</p>
              {!isSubscribed && canAccess('pms_education', 'evara') && <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-white/25">TRIAL</span>}
              {!canAccess('pms_education', 'evara') && <Lock className="absolute top-3 right-3 w-4 h-4 text-white/40" />}
            </button>
            {/* Menopause Care - PREMIUM ONLY */}
            <button onClick={gate(() => setShowMenopause(true), 'menopause_care', 'evara')} className="bg-gradient-to-br from-amber-400 via-orange-400 to-red-400 text-white p-4 rounded-2xl text-left hover:opacity-90 transition-all hover:scale-105 shadow-lg relative" data-testid="evara-menopause-care">
              <Flower2 className="w-8 h-8 mb-2" />
              <h4 className="font-bold text-sm">Menopause Care</h4>
              <p className="text-[10px] text-white/70 mt-1">Symptom management</p>
              {!canAccess('menopause_care', 'evara') && <Lock className="absolute top-3 right-3 w-4 h-4 text-white/40" />}
            </button>
            {/* Diet - PREMIUM ONLY */}
            <button onClick={gate(() => setShowDiet(true), 'diet_nutrition', 'evara')} className="bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-400 text-white p-4 rounded-2xl text-left hover:opacity-90 transition-all hover:scale-105 shadow-lg relative" data-testid="evara-diet-nutrition">
              <Apple className="w-8 h-8 mb-2" />
              <h4 className="font-bold text-sm">Nutrition Guide</h4>
              <p className="text-[10px] text-white/70 mt-1">Healthy meal plans</p>
              {!canAccess('diet_nutrition', 'evara') && <Lock className="absolute top-3 right-3 w-4 h-4 text-white/40" />}
            </button>
          </div>
        </div>

        {/* Consult Gynecologist CTA */}
        <button onClick={() => window.location.href = '/appointment-calendar'} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 rounded-2xl flex items-center gap-3 hover:opacity-90 transition-all shadow-lg" data-testid="evara-consult-cta">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Stethoscope className="w-5 h-5" /></div>
          <div className="flex-1 text-left"><h4 className="font-bold text-sm">Consult a Gynecologist</h4><p className="text-[10px] text-white/70">Book appointment at DiaGyn Healthcare</p></div>
          <ChevronRight className="w-5 h-5 text-white/60" />
        </button>

        {/* Trial / Subscribe CTA */}
        {!isSubscribed && (
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-200 rounded-2xl p-5 text-center" data-testid="evara-subscribe-cta">
            <Crown className="w-10 h-10 text-rose-400 mx-auto mb-3" />
            {trial?.active ? (
              <><h3 className="text-lg font-bold text-gray-800">Trial Active — {trial.days_remaining} days left</h3><p className="text-sm text-gray-500 mt-1 mb-4">Upgrade to unlock diet plans & menopause care</p></>
            ) : (
              <><h3 className="text-lg font-bold text-gray-800">Unlock All Features</h3><p className="text-sm text-gray-500 mt-1 mb-4">Premium access to all health tools & guides</p></>
            )}
            <div className="flex gap-3 justify-center flex-wrap">
              {!trial?.active && (
                <Button onClick={startTrial} className="rounded-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md" data-testid="evara-trial-btn">
                  <Zap className="w-4 h-4 mr-2" /> 7-Day Free Trial
                </Button>
              )}
              <Button onClick={() => setShowCheckout(true)} className="rounded-full px-6 py-3 bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-md hover:shadow-lg" data-testid="evara-subscribe-btn">
                <Crown className="w-4 h-4 mr-2" /> Subscribe Now
              </Button>
            </div>
          </div>
        )}

        {/* Emergency */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3" data-testid="evara-emergency">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><Phone className="w-5 h-5 text-red-500" /></div>
          <div className="flex-1"><h4 className="font-semibold text-gray-800 text-sm">Emergency? Call Now</h4><p className="text-xs text-gray-500">24/7 women's helpline</p></div>
          <a href="tel:181" className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold shadow-md hover:bg-red-600">181</a>
        </div>
      </div>

      {/* ==================== DIALOGS ==================== */}
      {/* Period Tracker */}
      <Dialog open={showPeriodTracker} onOpenChange={setShowPeriodTracker}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 rounded-2xl border-0">
          <div className="bg-gradient-to-r from-rose-400 via-pink-400 to-red-400 p-5 text-white">
            <DialogHeader><DialogTitle className="text-xl text-white flex items-center gap-2"><Droplets className="w-6 h-6" /> Period Tracker</DialogTitle></DialogHeader>
          </div>
          <ScrollArea className="max-h-[65vh] px-5 py-4">
            <Tabs defaultValue="log">
              <TabsList className="grid grid-cols-3 mb-4"><TabsTrigger value="log">Log</TabsTrigger><TabsTrigger value="history">History</TabsTrigger><TabsTrigger value="tips">Tips</TabsTrigger></TabsList>
              <TabsContent value="log" className="space-y-4">
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">Period Start Date</label><Input type="date" value={periodData.start_date} onChange={(e) => setPeriodData({...periodData, start_date: e.target.value})} data-testid="period-start-date" /></div>
                <div><label className="text-sm font-medium text-gray-700 mb-2 block">Flow Intensity</label><div className="flex gap-2">{['light', 'medium', 'heavy'].map((f) => (<button key={f} onClick={() => setPeriodData({...periodData, flow: f})} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${periodData.flow === f ? 'bg-rose-100 text-rose-600 border-2 border-rose-300' : 'bg-gray-50 text-gray-600 border-2 border-transparent'}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>))}</div></div>
                <div><label className="text-sm font-medium text-gray-700 mb-2 block">Symptoms</label><div className="flex flex-wrap gap-2">{symptomsList.map((s) => (<button key={s} onClick={() => { const syms = periodData.symptoms.includes(s) ? periodData.symptoms.filter(x => x !== s) : [...periodData.symptoms, s]; setPeriodData({...periodData, symptoms: syms}); }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${periodData.symptoms.includes(s) ? 'bg-rose-100 text-rose-600 border border-rose-300' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>{s}</button>))}</div></div>
                <Input placeholder="Notes (optional)" value={periodData.notes} onChange={(e) => setPeriodData({...periodData, notes: e.target.value})} />
                <Button onClick={logPeriod} className="w-full bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-xl py-3" data-testid="period-log-btn"><Check className="w-4 h-4 mr-2" /> Log Period</Button>
              </TabsContent>
              <TabsContent value="history" className="space-y-3">
                {periodHistory.next_predicted && (<div className="bg-rose-50 rounded-xl p-4 border border-rose-100"><p className="text-sm text-rose-600 font-medium">Next Predicted Period</p><p className="text-lg font-bold text-rose-700 mt-1">{new Date(periodHistory.next_predicted).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</p></div>)}
                {periodHistory.history?.length > 0 ? periodHistory.history.slice(0, 6).map((entry, i) => (<div key={i} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center"><Calendar className="w-5 h-5 text-rose-500" /></div><div><p className="text-sm font-medium text-gray-700">{new Date(entry.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p><p className="text-xs text-gray-500">Flow: {entry.flow}</p></div></div>)) : (<div className="text-center py-8 text-gray-400"><Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" /><p className="text-sm">No history yet</p></div>)}
              </TabsContent>
              <TabsContent value="tips" className="space-y-3">
                {[{ title: "Stay Hydrated", desc: "Warm water with lemon reduces bloating", icon: Droplets, bg: "bg-blue-50", clr: "text-blue-500" }, { title: "Heat Therapy", desc: "Heating pad for cramps", icon: Sun, bg: "bg-amber-50", clr: "text-amber-500" }, { title: "Light Exercise", desc: "Yoga or walking helps", icon: Dumbbell, bg: "bg-green-50", clr: "text-green-500" }, { title: "Sleep Well", desc: "8+ hours during period", icon: Moon, bg: "bg-indigo-50", clr: "text-indigo-500" }, { title: "Iron-Rich Foods", desc: "Spinach, dates, lentils", icon: Apple, bg: "bg-red-50", clr: "text-red-500" }].map((t, i) => (<div key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3"><div className={`w-9 h-9 rounded-lg ${t.bg} flex items-center justify-center flex-shrink-0`}><t.icon className={`w-4 h-4 ${t.clr}`} /></div><div><h4 className="text-sm font-semibold text-gray-700">{t.title}</h4><p className="text-xs text-gray-500">{t.desc}</p></div></div>))}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* PCOS Guide */}
      <Dialog open={showPCOS} onOpenChange={setShowPCOS}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 rounded-2xl border-0">
          <div className="bg-gradient-to-r from-violet-400 via-purple-500 to-indigo-500 p-5 text-white">
            <DialogHeader><DialogTitle className="text-xl text-white flex items-center gap-2"><Shield className="w-6 h-6" /> PCOS Guide</DialogTitle></DialogHeader>
            <p className="text-purple-100 text-sm mt-2">{PCOS_EDUCATION.overview}</p>
          </div>
          <ScrollArea className="max-h-[60vh] px-5 py-4">
            <Tabs defaultValue="overview"><TabsList className="grid grid-cols-3 mb-4"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="diet">Diet</TabsTrigger><TabsTrigger value="exercise">Exercise</TabsTrigger></TabsList>
              <TabsContent value="overview" className="space-y-3">
                {PCOS_EDUCATION.symptoms.map((s, i) => (<div key={i} className="flex items-center gap-2 bg-purple-50 rounded-xl p-3"><AlertTriangle className="w-4 h-4 text-purple-500 flex-shrink-0" /><span className="text-sm text-gray-700">{s}</span></div>))}
                <button onClick={() => shareOnWhatsApp('pcos')} className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-600 rounded-xl text-sm font-medium mt-2 hover:bg-green-100"><Share2 className="w-4 h-4" /> Share on WhatsApp</button>
              </TabsContent>
              <TabsContent value="diet" className="space-y-3">
                <div className="rounded-xl overflow-hidden mb-3"><img src="https://images.unsplash.com/photo-1622205705740-c8ac6eff77d1?w=400&q=80" alt="Diet" className="w-full h-32 object-cover rounded-xl" /></div>
                {PCOS_EDUCATION.diet.map((d, i) => (<div key={i} className="bg-gray-50 rounded-xl p-3"><h5 className="text-sm font-semibold text-purple-600">{d.category}</h5><p className="text-xs text-gray-600 mt-1">{d.items}</p></div>))}
              </TabsContent>
              <TabsContent value="exercise" className="space-y-3">
                {PCOS_EDUCATION.exercises.map((e, i) => (<div key={i} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"><Dumbbell className="w-5 h-5 text-purple-500" /></div><div><h5 className="text-sm font-semibold text-gray-700">{e.name}</h5><p className="text-xs text-gray-500">{e.duration} · {e.benefit}</p></div></div>))}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Pregnancy Guide */}
      <Dialog open={showPregnancy} onOpenChange={setShowPregnancy}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 rounded-2xl border-0">
          <div className="bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 p-5 text-white">
            <DialogHeader><DialogTitle className="text-xl text-white flex items-center gap-2"><Baby className="w-6 h-6" /> Pregnancy Guide</DialogTitle></DialogHeader>
            <p className="text-white/80 text-sm mt-2">Track your baby's growth week by week</p>
          </div>
          <ScrollArea className="max-h-[60vh] px-5 py-4 space-y-3">
            {PREGNANCY_WEEKS.map((w, i) => (<div key={i} className="bg-gray-50 rounded-xl p-4 mb-3"><div className="flex items-center justify-between mb-2"><Badge className="bg-teal-100 text-teal-700 font-semibold text-[11px]">Week {w.week}</Badge><span className="text-xs text-gray-400">Size: {w.size}</span></div><h4 className="text-sm font-semibold text-gray-700 mb-1">Baby: {w.detail}</h4><p className="text-xs text-gray-500">Mom: {w.mom}</p></div>))}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Menopause Care */}
      <Dialog open={showMenopause} onOpenChange={setShowMenopause}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 rounded-2xl border-0">
          <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 p-5 text-white">
            <DialogHeader><DialogTitle className="text-xl text-white flex items-center gap-2"><Flower2 className="w-6 h-6" /> Menopause Care</DialogTitle></DialogHeader>
          </div>
          <ScrollArea className="max-h-[60vh] px-5 py-4 space-y-3">
            {MENOPAUSE_TIPS.map((tip, i) => (<div key={i} className="bg-gray-50 rounded-xl p-4 mb-3 flex items-start gap-3"><div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0"><Sparkles className="w-4 h-4 text-amber-500" /></div><div><h4 className="text-sm font-semibold text-gray-700">{tip.title}</h4><p className="text-xs text-gray-500 mt-1">{tip.desc}</p></div></div>))}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 mt-2">
              <h4 className="text-sm font-semibold text-amber-700 mb-2">When to See a Doctor</h4>
              <ul className="space-y-1.5 text-xs text-gray-600">
                {["Heavy or prolonged bleeding", "Severe mood changes", "Bone pain or fractures", "Heart palpitations"].map((s, i) => (<li key={i} className="flex gap-2"><AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />{s}</li>))}
              </ul>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* PMS Education */}
      <Dialog open={showPMS} onOpenChange={setShowPMS}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 rounded-2xl border-0">
          <div className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 p-5 text-white">
            <DialogHeader><DialogTitle className="text-xl text-white flex items-center gap-2"><Brain className="w-6 h-6" /> PMS Education</DialogTitle></DialogHeader>
            <p className="text-white/80 text-sm mt-2">{PMS_EDUCATION.overview}</p>
          </div>
          <ScrollArea className="max-h-[60vh] px-5 py-4">
            <h4 className="font-semibold text-gray-700 mb-3 text-sm">Management Tips</h4>
            <div className="space-y-3">{PMS_EDUCATION.tips.map((tip, i) => (<div key={i} className="bg-gray-50 rounded-xl p-3 flex items-start gap-3"><div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0"><Check className="w-4 h-4 text-teal-500" /></div><div><h5 className="text-sm font-semibold text-gray-700">{tip.title}</h5><p className="text-xs text-gray-500 mt-0.5">{tip.desc}</p></div></div>))}</div>
            <h4 className="font-semibold text-gray-700 mt-5 mb-3 text-sm">Physical Symptoms</h4>
            <div className="flex flex-wrap gap-2">{PMS_EDUCATION.symptoms.physical.map((s, i) => (<span key={i} className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full text-xs font-medium">{s}</span>))}</div>
            <h4 className="font-semibold text-gray-700 mt-4 mb-3 text-sm">Emotional Symptoms</h4>
            <div className="flex flex-wrap gap-2 mb-4">{PMS_EDUCATION.symptoms.emotional.map((s, i) => (<span key={i} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">{s}</span>))}</div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Diet Plan */}
      <Dialog open={showDiet} onOpenChange={setShowDiet}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 rounded-2xl border-0">
          <div className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 p-5 text-white">
            <DialogHeader><DialogTitle className="text-xl text-white flex items-center gap-2"><Apple className="w-6 h-6" /> Nutrition Guide</DialogTitle></DialogHeader>
          </div>
          <ScrollArea className="max-h-[60vh] px-5 py-4">
            <div className="rounded-xl overflow-hidden mb-4"><img src="https://images.unsplash.com/photo-1644289450169-bc58aa16bacb?w=400&q=80" alt="Food" className="w-full h-36 object-cover rounded-xl" /></div>
            <div className="space-y-4">{PCOS_EDUCATION.diet.map((d, i) => (<div key={i} className="bg-gray-50 rounded-xl p-3"><h5 className="text-sm font-semibold text-indigo-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {d.category}</h5><p className="text-xs text-gray-600 mt-1">{d.items}</p></div>))}</div>
            <div className="mt-4 bg-indigo-50 rounded-xl p-4 border border-indigo-100"><h5 className="text-sm font-semibold text-indigo-700">Daily Water Intake</h5><p className="text-xs text-gray-600 mt-1">Aim for 8-10 glasses (2-2.5L) daily.</p></div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <PortalCheckout open={showCheckout} onOpenChange={setShowCheckout} portalName="Evara" accentGradient="from-rose-400 to-pink-500" />
      <HealthReminders open={showReminders} onOpenChange={setShowReminders} portal="evara" />
    </div>
  );
};

export default Evara;
