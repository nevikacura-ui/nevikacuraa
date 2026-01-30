import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, HeartPulse, Activity, AlertTriangle,
  Calendar, Phone, CheckCircle2, Clock, Heart,
  Plus, ChevronRight, Info
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const Corvia = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('diet');
  
  // BP Log state
  const [bpLog, setBpLog] = useState({ systolic: '', diastolic: '', pulse: '', notes: '' });
  const [bpHistory, setBpHistory] = useState([
    { date: '2026-01-29', systolic: 120, diastolic: 80, pulse: 72, status: 'normal' },
    { date: '2026-01-28', systolic: 135, diastolic: 88, pulse: 78, status: 'elevated' },
    { date: '2026-01-27', systolic: 118, diastolic: 76, pulse: 70, status: 'normal' }
  ]);

  // Hero images
  const images = {
    hero: 'https://images.unsplash.com/photo-1708698750460-ecacf75a9d9a?w=800',
    heart: 'https://images.unsplash.com/photo-1690785884403-2bff26562857?w=400',
    bp: 'https://images.pexels.com/photos/32210639/pexels-photo-32210639.jpeg',
    stethoscope: 'https://images.unsplash.com/photo-1705516508687-68bb8cfe8554?w=400'
  };

  // Services with heart theme
  const services = [
    { emoji: '❤️', title: 'Hypertension Clinic', desc: 'BP monitoring & management programs', color: 'bg-red-50' },
    { emoji: '📊', title: 'Cholesterol Care', desc: 'Lipid profile management & diet plans', color: 'bg-orange-50' },
    { emoji: '🎯', title: 'Cardiac Risk Profiling', desc: 'Heart-age & vascular assessment', color: 'bg-purple-50' },
    { emoji: '💊', title: 'Medication Optimization', desc: 'Personalized treatment plans', color: 'bg-blue-50' },
    { emoji: '🏃', title: 'Lifestyle Programs', desc: 'Diet, exercise & stress management', color: 'bg-green-50' },
    { emoji: '🩺', title: 'Post-Event Care', desc: 'Long-term follow-up after cardiac events', color: 'bg-pink-50' }
  ];

  // Diet Plans with visual appeal
  const dietPlans = [
    {
      name: 'DASH Diet',
      desc: 'Dietary Approaches to Stop Hypertension',
      duration: '4 weeks',
      emoji: '🥗',
      color: 'from-green-400 to-emerald-500',
      foods: ['Fruits', 'Vegetables', 'Whole Grains', 'Lean Proteins'],
      avoid: ['Salt', 'Red Meat', 'Sugary Drinks'],
      benefits: 'Lowers BP by 8-14 mmHg'
    },
    {
      name: 'Mediterranean Diet',
      desc: 'Heart-healthy eating pattern',
      duration: 'Lifestyle',
      emoji: '🫒',
      color: 'from-amber-400 to-orange-500',
      foods: ['Olive Oil', 'Fish', 'Nuts', 'Legumes', 'Whole Grains'],
      avoid: ['Processed Foods', 'Red Meat', 'Butter'],
      benefits: 'Reduces heart disease risk by 30%'
    },
    {
      name: 'Low Sodium Diet',
      desc: 'For hypertension control',
      duration: 'Ongoing',
      emoji: '🧂',
      color: 'from-blue-400 to-cyan-500',
      foods: ['Fresh Fruits', 'Vegetables', 'Herbs & Spices'],
      avoid: ['Canned Foods', 'Pickles', 'Processed Meats'],
      benefits: 'Target: <2300mg sodium/day'
    }
  ];

  // Cholesterol Foods with better visuals
  const cholesterolFoods = {
    good: [
      { name: 'Oats & Barley', benefit: 'Soluble fiber reduces LDL', emoji: '🌾' },
      { name: 'Fatty Fish', benefit: 'Omega-3 raises HDL', emoji: '🐟' },
      { name: 'Almonds & Walnuts', benefit: 'Healthy fats lower LDL', emoji: '🥜' },
      { name: 'Olive Oil', benefit: 'Monounsaturated fats', emoji: '🫒' },
      { name: 'Avocado', benefit: 'Reduces LDL & triglycerides', emoji: '🥑' },
      { name: 'Beans & Lentils', benefit: 'Fiber binds cholesterol', emoji: '🫘' },
      { name: 'Apples & Grapes', benefit: 'Pectin lowers LDL', emoji: '🍎' },
      { name: 'Dark Leafy Greens', benefit: 'Lutein prevents plaque', emoji: '🥬' }
    ],
    bad: [
      { name: 'Fried Foods', risk: 'Trans fats raise LDL', emoji: '🍟' },
      { name: 'Red Meat', risk: 'Saturated fat increases cholesterol', emoji: '🥩' },
      { name: 'Full-Fat Dairy', risk: 'High in saturated fat', emoji: '🧀' },
      { name: 'Processed Meats', risk: 'Sodium & saturated fat', emoji: '🥓' },
      { name: 'Baked Goods', risk: 'Trans fats & sugar', emoji: '🧁' },
      { name: 'Coconut Oil', risk: 'High saturated fat', emoji: '🥥' },
      { name: 'Egg Yolks (excess)', risk: 'Dietary cholesterol', emoji: '🥚' },
      { name: 'Shellfish', risk: 'High cholesterol content', emoji: '🦐' }
    ]
  };

  // Log BP reading
  const handleLogBP = async () => {
    if (!bpLog.systolic || !bpLog.diastolic) {
      toast.error('Please enter systolic and diastolic values');
      return;
    }

    const systolic = parseInt(bpLog.systolic);
    const diastolic = parseInt(bpLog.diastolic);
    
    let status = 'normal';
    if (systolic >= 180 || diastolic >= 120) status = 'crisis';
    else if (systolic >= 140 || diastolic >= 90) status = 'high';
    else if (systolic >= 130 || diastolic >= 80) status = 'elevated';

    const newLog = {
      date: new Date().toISOString().split('T')[0],
      systolic,
      diastolic,
      pulse: parseInt(bpLog.pulse) || 0,
      notes: bpLog.notes,
      status
    };

    setBpHistory([newLog, ...bpHistory]);
    setBpLog({ systolic: '', diastolic: '', pulse: '', notes: '' });
    toast.success('BP reading logged successfully!');

    if (status === 'crisis') {
      toast.error('⚠️ CRITICAL: Please seek immediate medical attention!', { duration: 10000 });
    } else if (status === 'high') {
      toast.warning('Your BP is high. Please consult a doctor.');
    }
  };

  const getBPStatusColor = (status) => {
    switch(status) {
      case 'normal': return 'bg-green-100 text-green-700';
      case 'elevated': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'crisis': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getBPStatusEmoji = (status) => {
    switch(status) {
      case 'normal': return '✅';
      case 'elevated': return '⚠️';
      case 'high': return '🔶';
      case 'crisis': return '🚨';
      default: return '❓';
    }
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-white" data-testid="corvia-page">
        {/* Header - Heart Theme */}
        <header className="bg-gradient-to-r from-rose-600 to-red-600 text-white sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-full bg-white/20 hover:bg-white/30 text-white"
                data-testid="corvia-back-btn"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-white">
                  <img 
                    src="https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/p3zt5ovj_Pink%20Simple%20Charity%20Logo_20260128_183244_0000.png" 
                    alt="Corvia" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
                    CORVIA <Heart className="w-5 h-5 text-pink-300 fill-pink-300" />
                  </h1>
                  <p className="text-sm text-rose-200">Heart & BP Care</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Emergency Banner */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white py-3 px-4">
          <div className="max-w-5xl mx-auto flex items-center justify-center gap-3">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-medium">Chest pain or severe symptoms?</span>
            <a href="tel:112" className="bg-white text-red-600 px-4 py-1.5 rounded-full font-bold text-sm hover:bg-red-50 transition-all">
              Call 112 Now
            </a>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-rose-100">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center gap-3 overflow-x-auto">
              {[
                { emoji: '👨‍⚕️', text: 'Expert Cardiologists', bg: 'bg-rose-50 text-rose-700' },
                { emoji: '🚨', text: '24/7 Emergency', bg: 'bg-red-50 text-red-700' },
                { emoji: '🔬', text: 'Advanced Diagnostics', bg: 'bg-purple-50 text-purple-700' },
                { emoji: '💝', text: 'Personalized Care', bg: 'bg-pink-50 text-pink-700' }
              ].map((feature, idx) => (
                <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-full flex-shrink-0 ${feature.bg}`}>
                  <span className="text-lg">{feature.emoji}</span>
                  <span className="text-xs font-semibold whitespace-nowrap">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 py-6">
          {/* Hero Section with Heart Image */}
          <Card className="overflow-hidden mb-6 border-0 shadow-xl">
            <div className="relative h-56 sm:h-64">
              <img 
                src={images.hero}
                alt="Heart Health"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-rose-900/80 via-red-900/60 to-transparent" />
              <div className="absolute inset-0 p-6 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">❤️</span>
                  <span className="text-3xl">📊</span>
                  <span className="text-3xl">💪</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Heart & Cardiovascular Care
                </h2>
                <p className="text-rose-100 text-sm sm:text-base max-w-md mb-4">
                  Comprehensive care for hypertension, cholesterol, and heart health. Track BP, follow heart-healthy diets, and get expert consultations.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Button className="bg-white text-rose-700 hover:bg-rose-50 rounded-full shadow-lg" data-testid="corvia-book-btn">
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Consultation
                  </Button>
                  <Button variant="outline" className="rounded-full border-white/50 text-white hover:bg-white/20">
                    <Phone className="w-4 h-4 mr-2" />
                    Emergency Line
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabs - Heart Theme */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'diet', label: 'Diet Plans', emoji: '🥗' },
              { id: 'bp', label: 'BP Log', emoji: '📊' },
              { id: 'cholesterol', label: 'Cholesterol', emoji: '🩸' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg shadow-rose-200' 
                    : 'bg-white text-gray-600 hover:bg-rose-50 border border-rose-100'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <span className="text-lg">{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Diet Plans Tab - Visual Cards */}
          {activeTab === 'diet' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🥗</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Heart-Healthy Diet Plans</h3>
                  <p className="text-sm text-gray-500">Nutrition programs for cardiovascular health</p>
                </div>
              </div>
              
              {dietPlans.map((plan, idx) => (
                <Card key={idx} className="overflow-hidden hover:shadow-xl transition-all" data-testid={`diet-plan-${idx}`}>
                  {/* Gradient Header */}
                  <div className={`h-20 bg-gradient-to-r ${plan.color} flex items-center justify-between px-5`}>
                    <div className="flex items-center gap-3">
                      <span className="text-5xl">{plan.emoji}</span>
                      <div className="text-white">
                        <h4 className="font-bold text-lg">{plan.name}</h4>
                        <p className="text-sm opacity-90">{plan.desc}</p>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white border-white/30">{plan.duration}</Badge>
                  </div>
                  
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
                          <span>✅</span> Eat More
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {plan.foods.map((food, i) => (
                            <Badge key={i} className="text-xs bg-green-100 text-green-700 border-green-200">
                              {food}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1">
                          <span>❌</span> Avoid
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {plan.avoid.map((food, i) => (
                            <Badge key={i} className="text-xs bg-red-100 text-red-700 border-red-200">
                              {food}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-rose-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">{plan.benefits}</span>
                      </div>
                      <Button size="sm" className="rounded-full bg-rose-600 hover:bg-rose-700">
                        Start Plan <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* BP Log Tab - Modern UI */}
          {activeTab === 'bp' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">📊</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Blood Pressure Log</h3>
                  <p className="text-sm text-gray-500">Track and monitor your BP readings</p>
                </div>
              </div>
              
              {/* Log New Reading */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-rose-500 to-red-500 px-5 py-3 flex items-center gap-3">
                  <Plus className="w-5 h-5 text-white" />
                  <h4 className="font-bold text-white">Log New Reading</h4>
                </div>
                <div className="p-5 bg-gradient-to-br from-rose-50 to-white">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">Systolic (mmHg)</label>
                      <Input
                        type="number"
                        placeholder="120"
                        value={bpLog.systolic}
                        onChange={(e) => setBpLog({...bpLog, systolic: e.target.value})}
                        className="text-center text-lg font-bold"
                        data-testid="bp-systolic"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">Diastolic (mmHg)</label>
                      <Input
                        type="number"
                        placeholder="80"
                        value={bpLog.diastolic}
                        onChange={(e) => setBpLog({...bpLog, diastolic: e.target.value})}
                        className="text-center text-lg font-bold"
                        data-testid="bp-diastolic"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">Pulse (bpm)</label>
                      <Input
                        type="number"
                        placeholder="72"
                        value={bpLog.pulse}
                        onChange={(e) => setBpLog({...bpLog, pulse: e.target.value})}
                        className="text-center text-lg font-bold"
                        data-testid="bp-pulse"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleLogBP} className="w-full h-10 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 rounded-full" data-testid="log-bp-btn">
                        <HeartPulse className="w-4 h-4 mr-2" /> Log BP
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* BP Reference Chart */}
              <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold text-blue-800 mb-2">BP Reference Guide</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="flex items-center gap-2">
                        <span>✅</span>
                        <span className="text-gray-700"><strong>Normal:</strong> &lt;120/80</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>⚠️</span>
                        <span className="text-gray-700"><strong>Elevated:</strong> 120-129/&lt;80</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🔶</span>
                        <span className="text-gray-700"><strong>High:</strong> ≥130/80</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🚨</span>
                        <span className="text-gray-700"><strong>Crisis:</strong> ≥180/120</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* BP History */}
              <h4 className="font-bold text-gray-800 mt-6 flex items-center gap-2">
                <span className="text-xl">📋</span> Recent Readings
              </h4>
              <div className="space-y-2">
                {bpHistory.map((reading, idx) => (
                  <Card key={idx} className="p-4 flex items-center justify-between hover:shadow-lg transition-all" data-testid={`bp-reading-${idx}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-rose-100 to-pink-100 rounded-2xl flex items-center justify-center">
                        <HeartPulse className="w-7 h-7 text-rose-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold text-gray-800">{reading.systolic}/{reading.diastolic}</p>
                          <span className="text-sm text-gray-500">mmHg</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{reading.date}</span>
                          <span>•</span>
                          <span>Pulse: {reading.pulse} bpm</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getBPStatusEmoji(reading.status)}</span>
                      <Badge className={getBPStatusColor(reading.status)}>
                        {reading.status.charAt(0).toUpperCase() + reading.status.slice(1)}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Cholesterol Tab - Visual Food Guide */}
          {activeTab === 'cholesterol' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🩸</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Cholesterol Food Guide</h3>
                  <p className="text-sm text-gray-500">What to eat and avoid for healthy cholesterol</p>
                </div>
              </div>
              
              {/* Good Foods */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-5 py-3 flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  <h4 className="font-bold text-white">Foods That LOWER Cholesterol</h4>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {cholesterolFoods.good.map((food, idx) => (
                      <div 
                        key={idx} 
                        className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl hover:shadow-lg transition-all text-center group"
                        data-testid={`good-food-${idx}`}
                      >
                        <span className="text-4xl mb-2 block group-hover:scale-110 transition-transform">{food.emoji}</span>
                        <p className="font-bold text-gray-800 text-sm">{food.name}</p>
                        <p className="text-xs text-green-600 mt-1">{food.benefit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Bad Foods */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-rose-500 px-5 py-3 flex items-center gap-2">
                  <span className="text-2xl">❌</span>
                  <h4 className="font-bold text-white">Foods to AVOID (High Cholesterol)</h4>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {cholesterolFoods.bad.map((food, idx) => (
                      <div 
                        key={idx} 
                        className="p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl hover:shadow-lg transition-all text-center group"
                        data-testid={`bad-food-${idx}`}
                      >
                        <span className="text-4xl mb-2 block group-hover:scale-110 transition-transform">{food.emoji}</span>
                        <p className="font-bold text-gray-800 text-sm">{food.name}</p>
                        <p className="text-xs text-red-600 mt-1">{food.risk}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Quick Tips */}
              <Card className="p-5 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
                <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  Quick Tips for Healthy Cholesterol
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { tip: 'Eat 25-30g of fiber daily', emoji: '🌾' },
                    { tip: '2 servings of fatty fish per week', emoji: '🐟' },
                    { tip: 'Replace butter with olive oil', emoji: '🫒' },
                    { tip: 'Exercise 30 min, 5 days/week', emoji: '🏃' },
                    { tip: 'Target: LDL <100 mg/dL', emoji: '📉' },
                    { tip: 'Target: HDL >40 (men) / >50 (women)', emoji: '📈' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-xl">
                      <span className="text-2xl">{item.emoji}</span>
                      <span className="text-sm text-gray-700">{item.tip}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Services Grid */}
          <h3 className="text-xl font-bold text-gray-800 mt-10 mb-4 flex items-center gap-2">
            <span className="text-2xl">🏥</span>
            Cardiology Services
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {services.map((service, idx) => (
              <Card key={idx} className={`p-4 hover:shadow-xl transition-all cursor-pointer group ${service.color}`} data-testid={`corvia-service-${idx}`}>
                <span className="text-4xl mb-3 block group-hover:scale-110 transition-transform">{service.emoji}</span>
                <h4 className="font-bold text-gray-800 mb-1">{service.title}</h4>
                <p className="text-sm text-gray-600">{service.desc}</p>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default Corvia;
