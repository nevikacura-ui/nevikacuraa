import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, HeartPulse, Activity, Pill, Stethoscope, AlertTriangle,
  Calendar, Phone, CheckCircle2, Shield, Clock, TrendingUp, Target, Heart,
  Utensils, Apple, Scale, Droplet, LineChart, Plus, ChevronRight, Leaf,
  AlertCircle, ThumbsUp, ThumbsDown, Info
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

  const services = [
    { icon: HeartPulse, title: 'Hypertension Clinic', desc: 'BP monitoring & management programs' },
    { icon: Activity, title: 'Cholesterol Care', desc: 'Lipid profile management & diet plans' },
    { icon: Target, title: 'Cardiac Risk Profiling', desc: 'Heart-age & vascular assessment' },
    { icon: Pill, title: 'Medication Optimization', desc: 'Personalized treatment plans' },
    { icon: TrendingUp, title: 'Lifestyle Programs', desc: 'Diet, exercise & stress management' },
    { icon: Stethoscope, title: 'Post-Event Care', desc: 'Long-term follow-up after cardiac events' }
  ];

  const features = [
    { icon: Shield, text: 'Expert Cardiologists' },
    { icon: Clock, text: '24/7 Emergency' },
    { icon: Activity, text: 'Advanced Diagnostics' },
    { icon: CheckCircle2, text: 'Personalized Care' }
  ];

  // Diet Plans for Heart Health
  const dietPlans = [
    {
      name: 'DASH Diet',
      desc: 'Dietary Approaches to Stop Hypertension',
      duration: '4 weeks',
      foods: ['Fruits', 'Vegetables', 'Whole Grains', 'Lean Proteins'],
      avoid: ['Salt', 'Red Meat', 'Sugary Drinks'],
      benefits: 'Lowers BP by 8-14 mmHg'
    },
    {
      name: 'Mediterranean Diet',
      desc: 'Heart-healthy eating pattern',
      duration: 'Lifestyle',
      foods: ['Olive Oil', 'Fish', 'Nuts', 'Legumes', 'Whole Grains'],
      avoid: ['Processed Foods', 'Red Meat', 'Butter'],
      benefits: 'Reduces heart disease risk by 30%'
    },
    {
      name: 'Low Sodium Diet',
      desc: 'For hypertension control',
      duration: 'Ongoing',
      foods: ['Fresh Fruits', 'Vegetables', 'Herbs & Spices'],
      avoid: ['Canned Foods', 'Pickles', 'Processed Meats'],
      benefits: 'Target: <2300mg sodium/day'
    }
  ];

  // Cholesterol Food Lists
  const cholesterolFoods = {
    good: [
      { name: 'Oats & Barley', benefit: 'Soluble fiber reduces LDL', icon: '🌾' },
      { name: 'Fatty Fish (Salmon)', benefit: 'Omega-3 raises HDL', icon: '🐟' },
      { name: 'Almonds & Walnuts', benefit: 'Healthy fats lower LDL', icon: '🥜' },
      { name: 'Olive Oil', benefit: 'Monounsaturated fats', icon: '🫒' },
      { name: 'Avocado', benefit: 'Reduces LDL & triglycerides', icon: '🥑' },
      { name: 'Beans & Lentils', benefit: 'Fiber binds cholesterol', icon: '🫘' },
      { name: 'Fruits (Apples, Grapes)', benefit: 'Pectin lowers LDL', icon: '🍎' },
      { name: 'Dark Leafy Greens', benefit: 'Lutein prevents plaque', icon: '🥬' }
    ],
    bad: [
      { name: 'Fried Foods', risk: 'Trans fats raise LDL', icon: '🍟' },
      { name: 'Red Meat', risk: 'Saturated fat increases cholesterol', icon: '🥩' },
      { name: 'Full-Fat Dairy', risk: 'High in saturated fat', icon: '🧀' },
      { name: 'Processed Meats', risk: 'Sodium & saturated fat', icon: '🥓' },
      { name: 'Baked Goods', risk: 'Trans fats & sugar', icon: '🧁' },
      { name: 'Coconut Oil', risk: 'High saturated fat', icon: '🥥' },
      { name: 'Egg Yolks (excess)', risk: 'Dietary cholesterol', icon: '🥚' },
      { name: 'Shellfish', risk: 'High cholesterol content', icon: '🦐' }
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

    // Show warning if high
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

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#F5F5F4]" data-testid="corvia-page">
        {/* Header */}
        <header className="bg-gradient-to-r from-[#6b1f54] to-[#7a2560] text-white sticky top-0 z-50">
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
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-[#c8f56a]">
                  <img 
                    src="https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/p3zt5ovj_Pink%20Simple%20Charity%20Logo_20260128_183244_0000.png" 
                    alt="Corvia" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-wide">CORVIA</h1>
                  <p className="text-sm opacity-90">Heart & BP Care</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Emergency Banner */}
        <div className="bg-red-600 text-white py-2 px-4 text-center text-sm">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Chest pain or severe symptoms? Call <a href="tel:112" className="font-bold underline">112</a> immediately
        </div>

        {/* Trust Badges */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center gap-4 overflow-x-auto">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-pink-700" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 whitespace-nowrap">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 py-6">
          {/* Hero */}
          <Card className="p-6 mb-6 bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Heart & Cardiovascular Care</h2>
            <p className="text-slate-600 mb-4">
              Comprehensive care for hypertension, cholesterol, and heart health. Track your BP, 
              follow heart-healthy diets, and get expert cardiology consultations.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Button className="bg-pink-700 hover:bg-pink-800 rounded-xl" data-testid="corvia-book-btn">
                <Calendar className="w-4 h-4 mr-2" />
                Book Consultation
              </Button>
              <Button variant="outline" className="rounded-xl border-pink-300 text-pink-700">
                <Phone className="w-4 h-4 mr-2" />
                Emergency Line
              </Button>
            </div>
          </Card>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {[
              { id: 'diet', label: 'Diet Plans', icon: Utensils },
              { id: 'bp', label: 'BP Log', icon: Activity },
              { id: 'cholesterol', label: 'Cholesterol', icon: Droplet }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? 'bg-pink-700 text-white' 
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Diet Plans Tab */}
          {activeTab === 'diet' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Heart-Healthy Diet Plans</h3>
              {dietPlans.map((plan, idx) => (
                <Card key={idx} className="p-4 hover:shadow-lg transition-all" data-testid={`diet-plan-${idx}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">{plan.name}</h4>
                      <p className="text-sm text-slate-500">{plan.desc}</p>
                    </div>
                    <Badge className="bg-pink-100 text-pink-700">{plan.duration}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> Eat More
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {plan.foods.map((food, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            {food}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                        <ThumbsDown className="w-3 h-3" /> Avoid
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {plan.avoid.map((food, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                            {food}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-pink-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 inline mr-1" />
                      {plan.benefits}
                    </p>
                    <Button size="sm" variant="outline" className="text-pink-700 border-pink-200">
                      Start Plan <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* BP Log Tab */}
          {activeTab === 'bp' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Blood Pressure Log</h3>
              
              {/* Log New Reading */}
              <Card className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-pink-600" />
                  Log New Reading
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Systolic (mmHg)</label>
                    <Input
                      type="number"
                      placeholder="120"
                      value={bpLog.systolic}
                      onChange={(e) => setBpLog({...bpLog, systolic: e.target.value})}
                      className="mt-1"
                      data-testid="bp-systolic"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Diastolic (mmHg)</label>
                    <Input
                      type="number"
                      placeholder="80"
                      value={bpLog.diastolic}
                      onChange={(e) => setBpLog({...bpLog, diastolic: e.target.value})}
                      className="mt-1"
                      data-testid="bp-diastolic"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Pulse (bpm)</label>
                    <Input
                      type="number"
                      placeholder="72"
                      value={bpLog.pulse}
                      onChange={(e) => setBpLog({...bpLog, pulse: e.target.value})}
                      className="mt-1"
                      data-testid="bp-pulse"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleLogBP} className="w-full bg-pink-700 hover:bg-pink-800" data-testid="log-bp-btn">
                      Log BP
                    </Button>
                  </div>
                </div>
              </Card>

              {/* BP Reference */}
              <Card className="p-3 bg-slate-50">
                <p className="text-xs text-slate-600 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span><strong>Normal:</strong> &lt;120/80 | <strong>Elevated:</strong> 120-129/&lt;80 | <strong>High:</strong> ≥130/80 | <strong>Crisis:</strong> ≥180/120</span>
                </p>
              </Card>

              {/* BP History */}
              <h4 className="font-semibold text-slate-800 mt-4">Recent Readings</h4>
              <div className="space-y-2">
                {bpHistory.map((reading, idx) => (
                  <Card key={idx} className="p-3 flex items-center justify-between" data-testid={`bp-reading-${idx}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                        <HeartPulse className="w-5 h-5 text-pink-700" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{reading.systolic}/{reading.diastolic} <span className="text-sm font-normal text-slate-500">mmHg</span></p>
                        <p className="text-xs text-slate-500">{reading.date} • Pulse: {reading.pulse} bpm</p>
                      </div>
                    </div>
                    <Badge className={getBPStatusColor(reading.status)}>
                      {reading.status.charAt(0).toUpperCase() + reading.status.slice(1)}
                    </Badge>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Cholesterol Tab */}
          {activeTab === 'cholesterol' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Cholesterol-Friendly Foods</h3>
              
              {/* Good Foods */}
              <Card className="p-4 border-green-200">
                <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <ThumbsUp className="w-5 h-5" />
                  Foods That LOWER Cholesterol
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {cholesterolFoods.good.map((food, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                      data-testid={`good-food-${idx}`}
                    >
                      <span className="text-2xl">{food.icon}</span>
                      <p className="font-medium text-slate-800 text-sm mt-1">{food.name}</p>
                      <p className="text-xs text-green-600">{food.benefit}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Bad Foods */}
              <Card className="p-4 border-red-200">
                <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                  <ThumbsDown className="w-5 h-5" />
                  Foods to AVOID (High Cholesterol)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {cholesterolFoods.bad.map((food, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                      data-testid={`bad-food-${idx}`}
                    >
                      <span className="text-2xl">{food.icon}</span>
                      <p className="font-medium text-slate-800 text-sm mt-1">{food.name}</p>
                      <p className="text-xs text-red-600">{food.risk}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Tips */}
              <Card className="p-4 bg-amber-50 border-amber-200">
                <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <Leaf className="w-5 h-5" />
                  Quick Tips for Healthy Cholesterol
                </h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Eat 25-30g of fiber daily</li>
                  <li>• Include 2 servings of fatty fish per week</li>
                  <li>• Replace butter with olive oil</li>
                  <li>• Exercise 30 minutes, 5 days a week</li>
                  <li>• Target: LDL &lt;100, HDL &gt;40 (men) / &gt;50 (women)</li>
                </ul>
              </Card>
            </div>
          )}

          {/* Services Grid */}
          <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-4">Cardiology Services</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {services.map((service, idx) => (
              <Card key={idx} className="p-4 hover:shadow-lg transition-all cursor-pointer group" data-testid={`corvia-service-${idx}`}>
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-pink-700 transition-colors">
                  <service.icon className="w-6 h-6 text-pink-700 group-hover:text-white transition-colors" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">{service.title}</h4>
                <p className="text-sm text-slate-500">{service.desc}</p>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default Corvia;
