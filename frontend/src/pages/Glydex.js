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
import { SugarTrendChart, DailySummaryBar } from '@/components/HealthCharts';
import { HbA1cRing, MedicationAdherence } from '@/components/HealthRings';
import {
  ArrowLeft, Activity, AlertTriangle, Droplets, Apple, Calendar,
  TrendingDown, Check, Target, Crown, Lock, Clock, Phone, Utensils,
  TestTube, Shield, Zap, AlertCircle, Star, ChevronRight, Bell, Stethoscope
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FOOD_IMAGES = {
  veg_breakfast: 'https://images.unsplash.com/photo-1644289450169-bc58aa16bacb?w=400&q=80',
  veg_lunch: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
  salad: 'https://images.unsplash.com/photo-1622205705740-c8ac6eff77d1?w=400&q=80',
  healthy: 'https://images.unsplash.com/photo-1723985021773-d1f4c4ebfdd1?w=400&q=80',
};

// ==================== STATIC DATA ====================
const DIET_PLANS = {
  vegetarian: {
    breakfast: [
      { item: "Oats Upma with vegetables", portion: "1 bowl", calories: "180", benefit: "High fiber" },
      { item: "Moong Dal Chilla", portion: "2 pieces", calories: "150", benefit: "Protein-rich" },
      { item: "Besan Cheela + mint chutney", portion: "2 pieces", calories: "160", benefit: "Low GI" },
      { item: "Ragi Dosa + coconut chutney", portion: "2 dosas", calories: "180", benefit: "Calcium & fiber" },
      { item: "Sprouts Salad", portion: "1 cup", calories: "120", benefit: "Protein boost" },
    ],
    lunch: [
      { item: "Brown Rice + Dal + Sabzi", portion: "1 bowl", calories: "350", benefit: "Balanced meal" },
      { item: "2 Roti + Palak Paneer + Raita", portion: "Regular", calories: "380", benefit: "Iron & protein" },
      { item: "Quinoa Pulao + Curd", portion: "1 bowl", calories: "320", benefit: "Low GI" },
      { item: "Bajra Roti + Mixed Veg Curry", portion: "2 rotis", calories: "340", benefit: "Controls sugar" },
    ],
    dinner: [
      { item: "Vegetable Soup + 1 Roti", portion: "Light", calories: "250", benefit: "Light dinner" },
      { item: "Moong Dal Khichdi", portion: "1 bowl", calories: "280", benefit: "Easy to digest" },
      { item: "Grilled Paneer Salad", portion: "1 plate", calories: "220", benefit: "Low carb" },
      { item: "Dalia with Vegetables", portion: "1 bowl", calories: "240", benefit: "Fiber-rich" },
    ],
    snacks: [
      { item: "Roasted Chana", portion: "30g", calories: "80", benefit: "Protein snack" },
      { item: "Mixed Nuts", portion: "10-12 pcs", calories: "100", benefit: "Good fats" },
      { item: "Makhana (Fox Nuts)", portion: "1/2 cup", calories: "50", benefit: "Low calorie" },
      { item: "Green Tea", portion: "1 cup", calories: "0", benefit: "Antioxidants" },
    ],
  },
  nonVegetarian: {
    breakfast: [
      { item: "Egg White Omelette + Toast", portion: "3 whites", calories: "200", benefit: "Pure protein" },
      { item: "Boiled Eggs + Vegetables", portion: "2 eggs", calories: "180", benefit: "Complete protein" },
      { item: "Oats with Scrambled Egg", portion: "1 bowl", calories: "220", benefit: "Fiber + protein" },
    ],
    lunch: [
      { item: "Grilled Chicken + Brown Rice", portion: "100g", calories: "400", benefit: "Lean protein" },
      { item: "Fish Curry + 2 Roti + Vegs", portion: "100g", calories: "420", benefit: "Omega-3 rich" },
      { item: "Tandoori Chicken + Salad", portion: "2 pcs", calories: "320", benefit: "Grilled, healthy" },
    ],
    dinner: [
      { item: "Grilled Fish + Steamed Vegs", portion: "100g", calories: "280", benefit: "Light protein" },
      { item: "Chicken Salad + Olive Oil", portion: "1 plate", calories: "250", benefit: "Low carb" },
      { item: "Fish Tikka + Mint Chutney", portion: "4-5 pcs", calories: "220", benefit: "Healthy grilled" },
    ],
    snacks: [
      { item: "Boiled Egg", portion: "1 egg", calories: "70", benefit: "Quick protein" },
      { item: "Chicken Soup (clear)", portion: "1 cup", calories: "80", benefit: "Warm & filling" },
    ],
  }
};

const WARNING_SIGNS = [
  { sign: "Excessive Thirst", desc: "Feeling thirsty all the time", action: "Track water intake, check sugar", icon: Droplets, bg: "bg-blue-50", clr: "text-blue-500" },
  { sign: "Frequent Urination", desc: "Urinating more often at night", action: "Note frequency, check UTI", icon: AlertCircle, bg: "bg-yellow-50", clr: "text-yellow-600" },
  { sign: "Unexplained Weight Loss", desc: "Losing weight without trying", action: "Consult doctor immediately", icon: TrendingDown, bg: "bg-red-50", clr: "text-red-500" },
  { sign: "Extreme Fatigue", desc: "Very tired despite rest", action: "Check sugar levels", icon: Zap, bg: "bg-purple-50", clr: "text-purple-500" },
  { sign: "Blurred Vision", desc: "Difficulty seeing clearly", action: "Get eye checkup", icon: AlertTriangle, bg: "bg-amber-50", clr: "text-amber-500" },
  { sign: "Slow Wound Healing", desc: "Cuts take longer to heal", action: "See doctor", icon: Shield, bg: "bg-green-50", clr: "text-green-500" },
  { sign: "Tingling/Numbness", desc: "Tingling in hands or feet", action: "Nerve damage sign", icon: Zap, bg: "bg-rose-50", clr: "text-rose-500" },
];

const EMERGENCY_STEPS = [
  { step: 1, title: "Recognize Symptoms", desc: "Sweating, trembling, hunger, dizziness, fast heartbeat, confusion" },
  { step: 2, title: "Check Blood Sugar", desc: "If below 70 mg/dL, it's hypoglycemia. Act immediately." },
  { step: 3, title: "15-15 Rule", desc: "Eat 15g fast-acting carbs: 3-4 glucose tablets, 1/2 cup juice, or 1 tbsp honey" },
  { step: 4, title: "Wait 15 Minutes", desc: "Recheck blood sugar after 15 minutes" },
  { step: 5, title: "Repeat if Needed", desc: "If still below 70 mg/dL, repeat step 3" },
  { step: 6, title: "Eat a Snack", desc: "Once stable, eat a small meal with protein and carbs" },
];

const DIABETIC_TESTS = [
  { name: "HbA1c", frequency: "Every 3 months", purpose: "3-month average sugar", target: "Below 7%" },
  { name: "Fasting Blood Sugar", frequency: "Weekly/Monthly", purpose: "Morning sugar level", target: "70-100 mg/dL" },
  { name: "Post-Meal Sugar", frequency: "Daily/Weekly", purpose: "2hrs after eating", target: "Below 140 mg/dL" },
  { name: "Kidney Function (KFT)", frequency: "Every 6 months", purpose: "Check kidney health", target: "Normal range" },
  { name: "Lipid Profile", frequency: "Every 6 months", purpose: "Cholesterol levels", target: "LDL < 100" },
  { name: "Eye Exam", frequency: "Yearly", purpose: "Diabetic retinopathy", target: "No changes" },
  { name: "Foot Exam", frequency: "Yearly", purpose: "Nerve damage check", target: "Normal sensation" },
];

const MealCard = ({ meal, items }) => (
  <div className="space-y-2">
    <h4 className="font-semibold text-gray-700 text-sm capitalize flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-blue-500" /> {meal}</h4>
    {items.map((item, i) => (<div key={i} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between"><div className="flex-1"><p className="text-sm font-medium text-gray-700">{item.item}</p><p className="text-xs text-gray-500">{item.portion} · {item.benefit}</p></div><Badge className="bg-blue-50 text-blue-600 text-[10px]">{item.calories} cal</Badge></div>))}
  </div>
);

// ==================== MAIN COMPONENT ====================
const Glydex = () => {
  const navigate = useNavigate();
  const { isSubscribed, trial, gate, canAccess, startTrial } = useSubscriptionRedirect();

  const [showDiet, setShowDiet] = useState(false);
  const [showSugarLog, setShowSugarLog] = useState(false);
  const [showTests, setShowTests] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReminders, setShowReminders] = useState(false);

  const [sugarLogs, setSugarLogs] = useState([]);
  const [newLog, setNewLog] = useState({ type: 'fbs', value: '', date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5) });

  const token = localStorage.getItem('token') || localStorage.getItem('patientToken') || localStorage.getItem('staffToken');

  useEffect(() => { if (token) fetchSugarLogs(); }, [token]);

  const fetchSugarLogs = async () => {
    try { const res = await fetch(`${API_URL}/api/glydex/sugar-logs`, { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) { const data = await res.json(); setSugarLogs(data.logs || []); } } catch (e) {}
  };

  const addSugarLog = async () => {
    if (!newLog.value) { toast.error('Please enter blood sugar value'); return; }
    try { const res = await fetch(`${API_URL}/api/glydex/sugar-log`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(newLog) }); if (res.ok) { toast.success('Blood sugar logged'); fetchSugarLogs(); setNewLog({ ...newLog, value: '' }); } } catch (e) { toast.error('Failed to log'); }
  };

  const getSugarStatus = (value, type) => {
    const v = parseInt(value);
    if (type === 'fbs') { if (v < 70) return { label: 'Low', color: 'bg-red-100 text-red-600' }; if (v <= 100) return { label: 'Normal', color: 'bg-green-100 text-green-600' }; if (v <= 125) return { label: 'Pre-diabetic', color: 'bg-amber-100 text-amber-600' }; return { label: 'High', color: 'bg-red-100 text-red-600' }; }
    if (v < 70) return { label: 'Low', color: 'bg-red-100 text-red-600' }; if (v <= 140) return { label: 'Normal', color: 'bg-green-100 text-green-600' }; if (v <= 199) return { label: 'Pre-diabetic', color: 'bg-amber-100 text-amber-600' }; return { label: 'High', color: 'bg-red-100 text-red-600' };
  };

  const latestLog = sugarLogs[0];
  const latestStatus = latestLog ? getSugarStatus(latestLog.value, latestLog.type) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-indigo-50" data-testid="glydex-portal">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-gray-100" data-testid="glydex-back-btn"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"><Activity className="w-4 h-4 text-white" /></div>
            <span className="font-bold text-gray-800 text-lg">Glydex</span>
            <span className="text-[9px] text-gray-400 font-medium ml-1">A Nevika Cura Company</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowReminders(true)} className="p-2 rounded-xl hover:bg-gray-100" data-testid="glydex-bell-btn"><Bell className="w-5 h-5 text-gray-500" /></button>
            {isSubscribed && <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[10px] px-2 border-0"><Crown className="w-3 h-3 mr-1" />Pro</Badge>}
            {trial?.active && !isSubscribed && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 border border-emerald-200">{trial.days_remaining}d trial</Badge>}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pb-24 pt-5 space-y-6">
        {/* Hero Banner - Rich Warm Premium */}
        <div className="bg-gradient-to-br from-[#1a3a7a] via-[#2952a3] to-[#3b6acc] rounded-2xl p-5 text-white shadow-xl relative overflow-hidden" data-testid="glydex-hero">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
          <div className="relative z-10">
            <p className="text-blue-200/90 font-medium tracking-wide uppercase text-[11px]">Diabetes Care Portal</p>
            <h1 className="text-2xl font-bold mt-1">Manage Your Sugar, Smart</h1>
            <p className="text-xs text-white/60 mt-2">Diet plans, sugar tracking, tests & emergency guides</p>
            {latestLog && (
              <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-3 inline-flex items-center gap-3 border border-white/10">
                <Activity className="w-5 h-5" />
                <div><p className="text-[10px] text-white/50">Last Reading</p><p className="text-lg font-bold">{latestLog.value} mg/dL</p></div>
                <Badge className={`${latestStatus?.color} text-[10px]`}>{latestStatus?.label}</Badge>
              </div>
            )}
            <div className="flex gap-4 mt-4">
              <div className="text-center"><p className="text-xl font-bold">{sugarLogs.length}</p><p className="text-[10px] text-white/50">Readings</p></div>
              <div className="w-px bg-white/15" />
              <div className="text-center"><p className="text-xl font-bold">&lt;100</p><p className="text-[10px] text-white/50">FBS Target</p></div>
              <div className="w-px bg-white/15" />
              <div className="text-center"><p className="text-xl font-bold">&lt;7%</p><p className="text-[10px] text-white/50">HbA1c</p></div>
            </div>
          </div>
        </div>

        {/* Health Insight Rings - Always Visible */}
        <div className="space-y-3">
          <HbA1cRing currentHbA1c={7.2} target={7.0} />
          <MedicationAdherence weekData={[true, true, false, true, true, null, null]} />
        </div>

        {/* Data Visualization */}
        {sugarLogs.length > 0 && (
          <div className="space-y-3" data-testid="glydex-charts">
            <DailySummaryBar logs={sugarLogs} />
            <SugarTrendChart logs={sugarLogs} period={30} />
          </div>
        )}

        {/* Feature Cards - Alyne Style 2x2 Grid */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Health Tools</h2>
          <p className="text-sm text-gray-400 mb-4">Track, plan, and manage diabetes</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={gate(() => setShowDiet(true), 'diet_plans', 'glydex')} className="bg-gradient-to-br from-emerald-400 via-green-400 to-teal-400 text-white p-4 rounded-2xl text-left hover:opacity-90 transition-all hover:scale-105 shadow-lg relative" data-testid="glydex-diet-plans">
              <Utensils className="w-8 h-8 mb-2" />
              <h4 className="font-bold text-sm">Diet Plans</h4>
              <p className="text-[10px] text-white/70 mt-1">Veg & Non-Veg meals</p>
              {!canAccess('diet_plans', 'glydex') && <Lock className="absolute top-3 right-3 w-4 h-4 text-white/40" />}
            </button>
            <button onClick={gate(() => setShowSugarLog(true), 'sugar_log', 'glydex')} className="bg-gradient-to-br from-blue-400 via-indigo-400 to-violet-400 text-white p-4 rounded-2xl text-left hover:opacity-90 transition-all hover:scale-105 shadow-lg relative" data-testid="glydex-sugar-log">
              <Activity className="w-8 h-8 mb-2" />
              <h4 className="font-bold text-sm">Sugar Logger</h4>
              <p className="text-[10px] text-white/70 mt-1">Track FBS, PP, Random</p>
              {!isSubscribed && canAccess('sugar_log', 'glydex') && <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-white/25">TRIAL</span>}
              {!canAccess('sugar_log', 'glydex') && <Lock className="absolute top-3 right-3 w-4 h-4 text-white/40" />}
            </button>
            <button onClick={gate(() => setShowTests(true), 'essential_tests', 'glydex')} className="bg-gradient-to-br from-purple-400 via-violet-500 to-fuchsia-500 text-white p-4 rounded-2xl text-left hover:opacity-90 transition-all hover:scale-105 shadow-lg relative" data-testid="glydex-tests">
              <TestTube className="w-8 h-8 mb-2" />
              <h4 className="font-bold text-sm">Essential Tests</h4>
              <p className="text-[10px] text-white/70 mt-1">HbA1c, KFT, Lipid</p>
              {!canAccess('essential_tests', 'glydex') && <Lock className="absolute top-3 right-3 w-4 h-4 text-white/40" />}
            </button>
            <button onClick={gate(() => setShowWarnings(true), 'warnings', 'glydex')} className="bg-gradient-to-br from-amber-400 via-orange-400 to-red-400 text-white p-4 rounded-2xl text-left hover:opacity-90 transition-all hover:scale-105 shadow-lg relative" data-testid="glydex-warnings">
              <AlertTriangle className="w-8 h-8 mb-2" />
              <h4 className="font-bold text-sm">Warning Signs</h4>
              <p className="text-[10px] text-white/70 mt-1">7 key symptoms</p>
              {!isSubscribed && canAccess('warnings', 'glydex') && <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-white/25">TRIAL</span>}
              {!canAccess('warnings', 'glydex') && <Lock className="absolute top-3 right-3 w-4 h-4 text-white/40" />}
            </button>
            {/* Emergency - Always Free, spans full width */}
            <button onClick={() => setShowEmergency(true)} className="col-span-2 bg-gradient-to-r from-red-400 via-rose-400 to-pink-400 text-white p-4 rounded-2xl text-left hover:opacity-90 transition-all hover:scale-105 shadow-lg flex items-center gap-4" data-testid="glydex-emergency">
              <Zap className="w-10 h-10 flex-shrink-0" />
              <div><h4 className="font-bold text-sm">Hypo Emergency Guide</h4><p className="text-[10px] text-white/70 mt-0.5">Step-by-step for low blood sugar — Always Free</p></div>
              <ChevronRight className="w-5 h-5 text-white/50 ml-auto" />
            </button>
          </div>
        </div>

        {/* Consult CTA */}
        <button onClick={() => window.location.href = '/appointment-calendar'} className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-4 rounded-2xl flex items-center gap-3 hover:opacity-90 transition-all shadow-lg" data-testid="glydex-consult-cta">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Stethoscope className="w-5 h-5" /></div>
          <div className="flex-1 text-left"><h4 className="font-bold text-sm">Consult a Diabetologist</h4><p className="text-[10px] text-white/70">Book appointment at DiaGyn Healthcare</p></div>
          <ChevronRight className="w-5 h-5 text-white/60" />
        </button>

        {/* Food Section */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Diabetic-Friendly Food</h2>
          <p className="text-sm text-gray-400 mb-4">Low GI, high fiber, balanced nutrition</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { img: FOOD_IMAGES.veg_breakfast, title: "Vegetarian", desc: "Dal, roti, sabzi" },
              { img: FOOD_IMAGES.salad, title: "Salads", desc: "Low calorie, filling" },
              { img: FOOD_IMAGES.healthy, title: "Snacks", desc: "Nuts, seeds, fruits" },
              { img: FOOD_IMAGES.veg_lunch, title: "Full Meals", desc: "Balanced thali" },
            ].map((m) => (
              <button key={m.title} onClick={gate(() => setShowDiet(true), 'diet_plans', 'glydex')} className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg hover:scale-105 transition-all text-left border border-gray-100" data-testid={`glydex-food-${m.title.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="h-24 overflow-hidden"><img src={m.img} alt={m.title} className="w-full h-full object-cover" loading="lazy" /></div>
                <div className="p-3"><h4 className="font-semibold text-gray-800 text-sm">{m.title}</h4><p className="text-[10px] text-gray-500">{m.desc}</p></div>
              </button>
            ))}
          </div>
        </div>

        {/* Trial / Subscribe CTA */}
        {!isSubscribed && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5 text-center" data-testid="glydex-subscribe-cta">
            <Crown className="w-10 h-10 text-blue-500 mx-auto mb-3" />
            {trial?.active ? (
              <><h3 className="text-lg font-bold text-gray-800">Trial Active — {trial.days_remaining} days left</h3><p className="text-sm text-gray-500 mt-1 mb-4">Upgrade to unlock diet plans, tests & full access</p></>
            ) : (
              <><h3 className="text-lg font-bold text-gray-800">Unlock Full Diabetes Care</h3><p className="text-sm text-gray-500 mt-1 mb-4">Premium diet plans, sugar tracker & health tools</p></>
            )}
            <div className="flex gap-3 justify-center flex-wrap">
              {!trial?.active && <Button onClick={startTrial} className="rounded-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md" data-testid="glydex-trial-btn"><Zap className="w-4 h-4 mr-2" /> 7-Day Free Trial</Button>}
              <Button onClick={() => setShowCheckout(true)} className="rounded-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg" data-testid="glydex-subscribe-btn"><Crown className="w-4 h-4 mr-2" /> Subscribe Now</Button>
            </div>
          </div>
        )}

        {/* Emergency Quick Access */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3" data-testid="glydex-emergency-quick">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><Phone className="w-5 h-5 text-red-500" /></div>
          <div className="flex-1"><h4 className="font-semibold text-gray-800 text-sm">Sugar below 70?</h4><p className="text-xs text-gray-500">Act immediately</p></div>
          <button onClick={() => setShowEmergency(true)} className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold shadow-md hover:bg-red-600" data-testid="glydex-emergency-btn">Guide</button>
        </div>
      </div>

      {/* ==================== DIALOGS ==================== */}
      {/* Diet Plans */}
      <Dialog open={showDiet} onOpenChange={setShowDiet}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 rounded-2xl border-0">
          <div className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 p-5 text-white">
            <DialogHeader><DialogTitle className="text-xl text-white flex items-center gap-2"><Utensils className="w-6 h-6" /> Diabetic Diet Plans</DialogTitle></DialogHeader>
          </div>
          <ScrollArea className="max-h-[65vh] px-5 py-4">
            <Tabs defaultValue="veg">
              <TabsList className="grid grid-cols-2 mb-4"><TabsTrigger value="veg">Vegetarian</TabsTrigger><TabsTrigger value="nonveg">Non-Vegetarian</TabsTrigger></TabsList>
              <TabsContent value="veg" className="space-y-5">
                <div className="rounded-xl overflow-hidden mb-2"><img src={FOOD_IMAGES.veg_breakfast} alt="Veg food" className="w-full h-32 object-cover rounded-xl" /></div>
                {['breakfast', 'lunch', 'dinner', 'snacks'].map((meal) => (<MealCard key={meal} meal={meal} items={DIET_PLANS.vegetarian[meal]} />))}
              </TabsContent>
              <TabsContent value="nonveg" className="space-y-5">
                <div className="rounded-xl overflow-hidden mb-2"><img src={FOOD_IMAGES.veg_lunch} alt="Non-veg" className="w-full h-32 object-cover rounded-xl" /></div>
                {['breakfast', 'lunch', 'dinner', 'snacks'].map((meal) => (<MealCard key={meal} meal={meal} items={DIET_PLANS.nonVegetarian[meal]} />))}
              </TabsContent>
            </Tabs>
            <div className="mt-4 bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <h4 className="text-sm font-semibold text-emerald-700">Golden Rules</h4>
              <ul className="mt-2 space-y-1.5 text-xs text-gray-600">{["Eat at fixed times daily", "Never skip breakfast", "Choose whole grains over refined", "Half plate = vegetables"].map((r, i) => (<li key={i} className="flex gap-2"><Check className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />{r}</li>))}</ul>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Blood Sugar Logger */}
      <Dialog open={showSugarLog} onOpenChange={setShowSugarLog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 rounded-2xl border-0">
          <div className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 p-5 text-white">
            <DialogHeader><DialogTitle className="text-xl text-white flex items-center gap-2"><Activity className="w-6 h-6" /> Blood Sugar Log</DialogTitle></DialogHeader>
          </div>
          <ScrollArea className="max-h-[65vh] px-5 py-4">
            <Tabs defaultValue="add">
              <TabsList className="grid grid-cols-2 mb-4"><TabsTrigger value="add">Add Reading</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>
              <TabsContent value="add" className="space-y-4">
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">Reading Type</label><div className="grid grid-cols-3 gap-2">{[{ v: 'fbs', l: 'Fasting' }, { v: 'ppbs', l: 'Post-Meal' }, { v: 'random', l: 'Random' }].map((t) => (<button key={t.v} onClick={() => setNewLog({...newLog, type: t.v})} className={`py-2.5 rounded-xl text-sm font-medium transition-all ${newLog.type === t.v ? 'bg-blue-100 text-blue-600 border-2 border-blue-300' : 'bg-gray-50 text-gray-600 border-2 border-transparent'}`}>{t.l}</button>))}</div></div>
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">Blood Sugar (mg/dL)</label><Input type="number" placeholder="Enter value" value={newLog.value} onChange={(e) => setNewLog({...newLog, value: e.target.value})} className="text-lg" data-testid="sugar-value-input" />{newLog.value && <div className="mt-2"><Badge className={`${getSugarStatus(newLog.value, newLog.type).color} text-xs px-3 py-1`}>{getSugarStatus(newLog.value, newLog.type).label}</Badge></div>}</div>
                <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-medium text-gray-700 mb-1 block">Date</label><Input type="date" value={newLog.date} onChange={(e) => setNewLog({...newLog, date: e.target.value})} /></div><div><label className="text-sm font-medium text-gray-700 mb-1 block">Time</label><Input type="time" value={newLog.time} onChange={(e) => setNewLog({...newLog, time: e.target.value})} /></div></div>
                <Button onClick={addSugarLog} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl py-3" data-testid="sugar-log-btn"><Check className="w-4 h-4 mr-2" /> Log Reading</Button>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200"><h4 className="text-sm font-semibold text-blue-700 mb-2">Normal Ranges</h4><div className="space-y-1.5 text-xs text-gray-600">{[["Fasting", "70-100 mg/dL"], ["Post-Meal", "70-140 mg/dL"], ["Random", "70-140 mg/dL"], ["HbA1c", "Below 7%"]].map(([k, v], i) => (<div key={i} className="flex justify-between"><span>{k}</span><span className="font-medium text-gray-800">{v}</span></div>))}</div></div>
              </TabsContent>
              <TabsContent value="history" className="space-y-3">
                {sugarLogs.length > 0 ? sugarLogs.slice(0, 10).map((log, i) => { const status = getSugarStatus(log.value, log.type); return (<div key={i} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><Activity className="w-5 h-5 text-blue-500" /></div><div className="flex-1"><div className="flex items-center gap-2"><p className="text-sm font-bold text-gray-800">{log.value} mg/dL</p><Badge className={`${status.color} text-[10px]`}>{status.label}</Badge></div><p className="text-xs text-gray-500">{log.type === 'fbs' ? 'Fasting' : log.type === 'ppbs' ? 'Post-Meal' : 'Random'} · {log.date}</p></div></div>); }) : (<div className="text-center py-8"><Activity className="w-12 h-12 mx-auto mb-2 text-gray-200" /><p className="text-sm text-gray-400">No readings yet</p></div>)}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Essential Tests */}
      <Dialog open={showTests} onOpenChange={setShowTests}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 rounded-2xl border-0">
          <div className="bg-gradient-to-r from-purple-400 via-violet-500 to-fuchsia-500 p-5 text-white">
            <DialogHeader><DialogTitle className="text-xl text-white flex items-center gap-2"><TestTube className="w-6 h-6" /> Essential Tests</DialogTitle></DialogHeader>
            <p className="text-purple-100 text-sm mt-2">Regular testing prevents complications</p>
          </div>
          <ScrollArea className="max-h-[60vh] px-5 py-4 space-y-3">
            {DIABETIC_TESTS.map((test, i) => (<div key={i} className="bg-gray-50 rounded-xl p-4 mb-3"><div className="flex items-center justify-between mb-2"><h4 className="text-sm font-bold text-gray-700">{test.name}</h4><Badge className="bg-purple-100 text-purple-700 text-[10px]">{test.frequency}</Badge></div><p className="text-xs text-gray-500">{test.purpose}</p><div className="flex items-center gap-1 mt-2"><Target className="w-3 h-3 text-purple-500" /><span className="text-xs text-purple-600 font-medium">Target: {test.target}</span></div></div>))}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Warning Signs */}
      <Dialog open={showWarnings} onOpenChange={setShowWarnings}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 rounded-2xl border-0">
          <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 p-5 text-white">
            <DialogHeader><DialogTitle className="text-xl text-white flex items-center gap-2"><AlertTriangle className="w-6 h-6" /> Warning Signs</DialogTitle></DialogHeader>
          </div>
          <ScrollArea className="max-h-[60vh] px-5 py-4 space-y-3">
            {WARNING_SIGNS.map((w, i) => (<div key={i} className={`rounded-xl p-4 mb-3 flex items-start gap-3 ${w.bg}`}><div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0`}><w.icon className={`w-5 h-5 ${w.clr}`} /></div><div><h4 className="text-sm font-semibold text-gray-700">{w.sign}</h4><p className="text-xs text-gray-500 mt-0.5">{w.desc}</p><p className="text-xs text-blue-600 font-medium mt-1">{w.action}</p></div></div>))}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Emergency Guide - ALWAYS accessible */}
      <Dialog open={showEmergency} onOpenChange={setShowEmergency}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 rounded-2xl border-0">
          <div className="bg-gradient-to-r from-red-400 via-rose-400 to-pink-400 p-5 text-white">
            <DialogHeader><DialogTitle className="text-xl text-white flex items-center gap-2"><Zap className="w-6 h-6" /> Hypoglycemia Emergency</DialogTitle></DialogHeader>
            <p className="text-red-100 text-sm mt-2">If blood sugar drops below 70 mg/dL</p>
          </div>
          <ScrollArea className="max-h-[60vh] px-5 py-4 space-y-3">
            {EMERGENCY_STEPS.map((s) => (<div key={s.step} className="flex items-start gap-3 mb-3"><div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0"><span className="text-sm font-bold text-red-600">{s.step}</span></div><div><h4 className="text-sm font-semibold text-gray-700">{s.title}</h4><p className="text-xs text-gray-500 mt-0.5">{s.desc}</p></div></div>))}
            <div className="bg-red-50 rounded-xl p-4 border border-red-200 mt-2">
              <h4 className="text-sm font-semibold text-red-700">Call Emergency If:</h4>
              <ul className="mt-2 space-y-1.5 text-xs text-gray-600">{["Person is unconscious or confused", "Sugar doesn't rise after 2 attempts", "Person has seizures"].map((s, i) => (<li key={i} className="flex gap-2"><AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />{s}</li>))}</ul>
              <a href="tel:112" className="mt-3 block w-full text-center py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold shadow-md hover:bg-red-600">Call 112 Emergency</a>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <PortalCheckout open={showCheckout} onOpenChange={setShowCheckout} portalName="Glydex" accentGradient="from-blue-500 to-indigo-600" />
      <HealthReminders open={showReminders} onOpenChange={setShowReminders} portal="glydex" />
    </div>
  );
};

export default Glydex;
