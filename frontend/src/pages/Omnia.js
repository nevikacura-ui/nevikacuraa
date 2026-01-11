import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { 
  ArrowLeft, Heart, Activity, AlertTriangle, Droplets, Apple, 
  Calendar, TrendingUp, TrendingDown, Pill, Phone,
  Utensils, TestTube, ChevronRight, Info, CheckCircle, AlertCircle,
  LineChart, Target, Trash2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Diabetic Diet Plans - Detailed
const DIET_PLANS = {
  vegetarian: {
    breakfast: [
      { item: "Oats Upma with vegetables", portion: "1 bowl (150g)", calories: "180", benefits: "High fiber, keeps sugar stable" },
      { item: "Moong Dal Chilla (2 pieces)", portion: "Medium size", calories: "150", benefits: "Protein-rich, low GI" },
      { item: "Vegetable Poha (flattened rice)", portion: "1 bowl (150g)", calories: "200", benefits: "Light, easy to digest" },
      { item: "Idli (2) with Sambar", portion: "2 medium idlis", calories: "170", benefits: "Fermented, good for gut" },
      { item: "Besan Cheela with mint chutney", portion: "2 pieces", calories: "160", benefits: "High protein, low carb" },
      { item: "Ragi Dosa with coconut chutney", portion: "2 dosas", calories: "180", benefits: "Rich in calcium & fiber" },
      { item: "Sprouts Salad", portion: "1 cup", calories: "120", benefits: "Protein & fiber boost" }
    ],
    lunch: [
      { item: "Brown Rice + Dal + Sabzi + Salad", portion: "1 roti rice + 1 bowl dal", calories: "350", benefits: "Complete balanced meal" },
      { item: "2 Roti + Palak Paneer + Raita", portion: "Regular serving", calories: "380", benefits: "Iron & protein rich" },
      { item: "Quinoa Pulao + Curd + Vegetables", portion: "1 bowl quinoa", calories: "320", benefits: "Complete protein, low GI" },
      { item: "Bajra Roti + Mixed Vegetable Curry", portion: "2 rotis", calories: "340", benefits: "Millets control sugar" },
      { item: "Jowar Roti + Bhindi Sabzi + Dal", portion: "2 rotis", calories: "330", benefits: "High fiber millet" },
      { item: "Vegetable Khichdi + Kadhi", portion: "1 bowl", calories: "300", benefits: "Easy to digest, balanced" }
    ],
    dinner: [
      { item: "Vegetable Soup + 1 Roti + Sabzi", portion: "Light serving", calories: "250", benefits: "Light dinner, good sleep" },
      { item: "Moong Dal Khichdi", portion: "1 bowl", calories: "280", benefits: "Easy on stomach" },
      { item: "Grilled Paneer Salad", portion: "1 large plate", calories: "220", benefits: "High protein, low carb" },
      { item: "Dalia (Broken Wheat) with Vegetables", portion: "1 bowl", calories: "240", benefits: "Fiber-rich grain" },
      { item: "Mixed Vegetable Clear Soup + Chapati", portion: "1 bowl + 1 roti", calories: "200", benefits: "Light & nutritious" },
      { item: "Stuffed Capsicum with Paneer", portion: "2 pieces", calories: "230", benefits: "Protein without carbs" }
    ],
    snacks: [
      { item: "Roasted Chana (Chickpeas)", portion: "1/4 cup (30g)", calories: "80", benefits: "Protein snack" },
      { item: "Mixed Nuts (unsalted)", portion: "10-12 pieces", calories: "100", benefits: "Good fats, filling" },
      { item: "Cucumber & Carrot sticks", portion: "1 cup", calories: "30", benefits: "Zero sugar, hydrating" },
      { item: "Buttermilk (Chaas)", portion: "1 glass", calories: "40", benefits: "Probiotic, cooling" },
      { item: "Apple or Guava", portion: "1 medium", calories: "60", benefits: "Low GI fruits" },
      { item: "Makhana (Fox Nuts)", portion: "1/2 cup", calories: "50", benefits: "Low calorie, crunchy" },
      { item: "Sprouts Chaat", portion: "1/2 cup", calories: "70", benefits: "Protein boost" },
      { item: "Green Tea (unsweetened)", portion: "1 cup", calories: "0", benefits: "Antioxidants" }
    ]
  },
  nonVegetarian: {
    breakfast: [
      { item: "Egg White Omelette (3 whites) + Toast", portion: "3 egg whites + 1 toast", calories: "200", benefits: "Pure protein start" },
      { item: "Boiled Eggs with Vegetables", portion: "2 whole eggs", calories: "180", benefits: "Complete protein" },
      { item: "Oats with Scrambled Egg", portion: "1 bowl", calories: "220", benefits: "Fiber + protein combo" },
      { item: "Chicken Sandwich (whole wheat)", portion: "1 sandwich", calories: "250", benefits: "Lean protein" }
    ],
    lunch: [
      { item: "Grilled Chicken Breast + Brown Rice + Salad", portion: "100g chicken", calories: "400", benefits: "Lean protein meal" },
      { item: "Fish Curry + 2 Roti + Vegetables", portion: "100g fish", calories: "420", benefits: "Omega-3 rich" },
      { item: "Chicken Soup + Roti + Sabzi", portion: "1 bowl + 2 roti", calories: "380", benefits: "Light & filling" },
      { item: "Egg Curry + Brown Rice", portion: "2 eggs", calories: "350", benefits: "Budget protein" },
      { item: "Tandoori Chicken + Salad + Raita", portion: "2 pieces", calories: "320", benefits: "Grilled, not fried" }
    ],
    dinner: [
      { item: "Grilled Fish with Steamed Vegetables", portion: "100g fish", calories: "280", benefits: "Light protein dinner" },
      { item: "Chicken Salad with Olive Oil", portion: "1 large plate", calories: "250", benefits: "Low carb dinner" },
      { item: "Egg Curry + 1 Roti", portion: "2 eggs", calories: "300", benefits: "Simple & nutritious" },
      { item: "Fish Tikka + Mint Chutney", portion: "4-5 pieces", calories: "220", benefits: "Grilled, healthy" },
      { item: "Chicken Clear Soup", portion: "1 large bowl", calories: "150", benefits: "Very light option" }
    ],
    snacks: [
      { item: "Boiled Egg", portion: "1 egg", calories: "70", benefits: "Quick protein" },
      { item: "Chicken Soup (clear)", portion: "1 cup", calories: "80", benefits: "Warm & filling" },
      { item: "Fish Tikka (grilled)", portion: "2-3 pieces", calories: "120", benefits: "Lean protein snack" },
      { item: "Egg Bhurji (dry)", portion: "1 egg", calories: "90", benefits: "Spiced protein" }
    ]
  },
  dos: [
    "Eat at regular intervals - every 3-4 hours to maintain stable sugar",
    "Include fiber-rich foods in every meal (vegetables, whole grains)",
    "Choose whole grains over refined carbs (brown rice, whole wheat)",
    "Drink plenty of water - 8-10 glasses daily",
    "Include protein in every meal to slow sugar absorption",
    "Use healthy cooking oils sparingly (olive, mustard, coconut)",
    "Eat low glycemic fruits - apple, guava, orange, papaya",
    "Include green leafy vegetables daily (spinach, methi, palak)",
    "Have dinner at least 2-3 hours before sleeping",
    "Chew food slowly - helps in better digestion",
    "Monitor portion sizes - use smaller plates",
    "Include cinnamon, fenugreek in diet - helps control sugar"
  ],
  donts: [
    "Avoid white rice, maida (refined flour), white bread",
    "Limit sugar and sugary drinks completely - including packaged juices",
    "Avoid fried and processed foods - samosas, pakoras, chips",
    "Don't skip meals, especially breakfast - causes sugar spikes later",
    "Limit fruit juices - eat whole fruits instead for fiber",
    "Avoid high-GI fruits in excess - mango, banana, grapes, chikoo",
    "Don't eat heavy meals at night - light dinner is best",
    "Avoid alcohol or limit strictly - affects sugar control",
    "Don't eat when stressed - affects digestion",
    "Avoid late night snacking",
    "Don't consume honey thinking it's healthy - it still raises sugar",
    "Avoid sweetened yogurt - choose plain curd instead"
  ],
  timings: {
    breakfast: "7:00 AM - 8:30 AM",
    midMorning: "10:30 AM - 11:00 AM",
    lunch: "12:30 PM - 1:30 PM",
    eveningSnack: "4:00 PM - 5:00 PM",
    dinner: "7:00 PM - 8:00 PM (latest by 8:30 PM)"
  }
};

// Warning Signs
const WARNING_SIGNS = [
  { sign: "Excessive Thirst (Polydipsia)", description: "Feeling thirsty all the time, even after drinking water", icon: "💧", action: "Track water intake, check sugar levels" },
  { sign: "Frequent Urination (Polyuria)", description: "Urinating more often, especially at night (3+ times)", icon: "🚽", action: "Note frequency, check for UTI" },
  { sign: "Unexplained Weight Loss", description: "Losing weight without trying or change in diet", icon: "⚖️", action: "Urgent - consult doctor immediately" },
  { sign: "Extreme Fatigue", description: "Feeling very tired despite adequate rest and sleep", icon: "😴", action: "Check sugar levels, rest adequately" },
  { sign: "Blurred Vision", description: "Difficulty seeing clearly, vision changes", icon: "👁️", action: "Get eye checkup, control sugar" },
  { sign: "Slow Wound Healing", description: "Cuts and bruises take longer than usual to heal", icon: "🩹", action: "Keep wounds clean, see doctor" },
  { sign: "Tingling or Numbness", description: "Tingling sensation in hands or feet (neuropathy sign)", icon: "🖐️", action: "Important - nerve damage sign" },
  { sign: "Frequent Infections", description: "Recurring skin, gum, or urinary infections", icon: "🦠", action: "Maintain hygiene, consult doctor" }
];

// Hypoglycemia Emergency Guide - Complete
const HYPOGLYCEMIA_GUIDE = {
  whatIs: "Hypoglycemia (low blood sugar) occurs when blood glucose drops below 70 mg/dL. It can happen quickly and needs immediate attention. It's more common in people taking insulin or certain diabetes medications.",
  causes: [
    "Skipping or delaying meals",
    "Taking too much insulin or diabetes medication",
    "Exercising more than usual without eating",
    "Drinking alcohol without food",
    "Not eating enough carbohydrates"
  ],
  symptoms: {
    early: [
      { symptom: "Sweating", description: "Sudden cold sweats, clammy skin" },
      { symptom: "Trembling/Shaking", description: "Hands trembling, feeling shaky" },
      { symptom: "Hunger", description: "Sudden intense hunger" },
      { symptom: "Dizziness", description: "Feeling lightheaded or unsteady" },
      { symptom: "Fast heartbeat", description: "Heart pounding or racing" }
    ],
    moderate: [
      { symptom: "Confusion", description: "Difficulty thinking clearly" },
      { symptom: "Irritability", description: "Sudden mood changes, anxiety" },
      { symptom: "Weakness", description: "Feeling weak, difficulty standing" },
      { symptom: "Headache", description: "Sudden headache" },
      { symptom: "Pale skin", description: "Looking pale or grey" }
    ],
    severe: [
      { symptom: "Blurred vision", description: "Cannot see properly" },
      { symptom: "Difficulty speaking", description: "Slurred speech" },
      { symptom: "Seizures", description: "Convulsions - EMERGENCY" },
      { symptom: "Unconsciousness", description: "Passing out - CALL 112" }
    ]
  },
  rule15: {
    title: "The 15-15 Rule",
    steps: [
      "Check blood sugar if possible",
      "If below 70 mg/dL or feeling symptoms:",
      "Take 15 grams of fast-acting carbohydrates",
      "Wait 15 minutes",
      "Recheck blood sugar",
      "If still low, repeat",
      "Once normal, eat a small snack"
    ]
  },
  fastSugarOptions: [
    { item: "Glucose tablets", amount: "3-4 tablets", grams: "15g" },
    { item: "Sugar in water", amount: "4 teaspoons sugar in 1/2 glass water", grams: "15g" },
    { item: "Fruit juice (no sugar added)", amount: "1/2 cup (120ml)", grams: "15g" },
    { item: "Regular soda (not diet)", amount: "1/2 cup (120ml)", grams: "15g" },
    { item: "Honey", amount: "1 tablespoon", grams: "15g" },
    { item: "Candy (hard)", amount: "5-6 pieces", grams: "15g" },
    { item: "Raisins", amount: "2 tablespoons", grams: "15g" }
  ],
  unconsciousPerson: [
    "DO NOT give anything by mouth - choking risk!",
    "Place person on their side (recovery position)",
    "Call emergency services immediately - 112",
    "If available and trained - use glucagon injection",
    "Stay with the person until help arrives",
    "Note the time symptoms started"
  ],
  prevention: [
    "Never skip meals, especially if on medication",
    "Always carry fast-acting sugar with you",
    "Check sugar before driving or exercise",
    "Wear a medical ID bracelet",
    "Inform family and colleagues about symptoms",
    "Don't drink alcohol on empty stomach"
  ]
};

// Diabetic Tests
const DIABETIC_TESTS = [
  { id: "fbs", name: "Fasting Blood Sugar (FBS)", description: "Blood sugar after 8-12 hours fasting. Normal: 70-100 mg/dL", frequency: "Monthly", price: "₹80-150" },
  { id: "ppbs", name: "Post-Prandial Blood Sugar (PPBS)", description: "Blood sugar 2 hours after meal. Normal: <140 mg/dL", frequency: "Monthly", price: "₹80-150" },
  { id: "hba1c", name: "HbA1c (Glycated Hemoglobin)", description: "3-month average blood sugar. Target: <7% for diabetics", frequency: "Every 3 months", price: "₹400-600" },
  { id: "lipid", name: "Lipid Profile", description: "Cholesterol and triglyceride levels. Important for heart health", frequency: "Every 6 months", price: "₹400-700" },
  { id: "kidney", name: "Kidney Function Test (KFT)", description: "Checks kidney health - creatinine, urea, eGFR", frequency: "Every 6-12 months", price: "₹500-800" },
  { id: "urine", name: "Urine Microalbumin", description: "Early detection of kidney damage in diabetes", frequency: "Yearly", price: "₹300-500" },
  { id: "liver", name: "Liver Function Test (LFT)", description: "Checks liver health - important if on medications", frequency: "Yearly", price: "₹400-700" }
];

const Omnia = () => {
  const navigate = useNavigate();
  const { user, token: authToken } = useAuth();
  
  // Use main app auth
  const token = authToken || localStorage.getItem('token');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  
  // Feature dialogs
  const [showDiet, setShowDiet] = useState(false);
  const [showSugarLog, setShowSugarLog] = useState(false);
  const [showTests, setShowTests] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  
  // Sugar log state
  const [sugarLogs, setSugarLogs] = useState([]);
  const [newLog, setNewLog] = useState({ 
    type: 'fbs', 
    value: '', 
    date: new Date().toISOString().split('T')[0], 
    time: new Date().toTimeString().slice(0, 5)
  });
  
  // Profile setup
  const [profileData, setProfileData] = useState({
    diabetesType: '',
    age: '',
    gender: ''
  });

  // HbA1c tracking state
  const [showHbA1c, setShowHbA1c] = useState(false);
  const [hba1cLogs, setHba1cLogs] = useState([]);
  const [hba1cTrend, setHba1cTrend] = useState(null);
  const [hba1cAnalysis, setHba1cAnalysis] = useState(null);
  const [newHba1c, setNewHba1c] = useState({
    value: '',
    date: new Date().toISOString().split('T')[0],
    lab_name: '',
    notes: ''
  });

  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchSugarLogs();
      fetchHba1cData();
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/api/omnia/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        if (!data.profile) {
          setShowProfileSetup(true);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchSugarLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/omnia/sugar-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSugarLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching sugar logs:', error);
    }
  };

  const fetchHba1cData = async () => {
    try {
      const [logsRes, trendRes] = await Promise.all([
        fetch(`${API_URL}/api/omnia/hba1c-logs`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/omnia/hba1c-trend`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      if (logsRes.ok) {
        const data = await logsRes.json();
        setHba1cLogs(data.logs || []);
      }
      
      if (trendRes.ok) {
        const data = await trendRes.json();
        setHba1cTrend(data.trend || []);
        setHba1cAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Error fetching HbA1c data:', error);
    }
  };

  const handleAddHba1c = async () => {
    if (!newHba1c.value || !newHba1c.date) {
      toast.error('Please enter HbA1c value and date');
      return;
    }
    const value = parseFloat(newHba1c.value);
    if (isNaN(value) || value < 3 || value > 20) {
      toast.error('Please enter a valid HbA1c value (3-20%)');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/omnia/hba1c-logs`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({...newHba1c, value})
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`HbA1c logged! Status: ${data.status}`);
        setNewHba1c({
          value: '',
          date: new Date().toISOString().split('T')[0],
          lab_name: '',
          notes: ''
        });
        fetchHba1cData();
      }
    } catch (error) {
      toast.error('Failed to log HbA1c');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHba1c = async (logId) => {
    try {
      const response = await fetch(`${API_URL}/api/omnia/hba1c-logs/${logId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('HbA1c log deleted');
        fetchHba1cData();
      }
    } catch (error) {
      toast.error('Failed to delete log');
    }
  };

  const getHba1cStatus = (value) => {
    if (value < 5.7) return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100' };
    if (value < 6.5) return { status: 'Pre-diabetic', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (value < 7) return { status: 'Good Control', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (value < 8) return { status: 'Fair Control', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { status: 'Needs Attention', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const handleSaveProfile = async () => {
    if (!profileData.diabetesType) {
      toast.error('Please select your diabetes type');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/omnia/profile`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      if (response.ok) {
        toast.success('Profile saved!');
        setShowProfileSetup(false);
        fetchProfile();
      }
    } catch (error) {
      toast.error('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSugarLog = async () => {
    if (!newLog.value || !newLog.date) {
      toast.error('Please enter sugar value and date');
      return;
    }
    const value = parseInt(newLog.value);
    if (isNaN(value) || value < 20 || value > 600) {
      toast.error('Please enter a valid sugar value (20-600 mg/dL)');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/omnia/sugar-logs`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newLog)
      });
      if (response.ok) {
        toast.success('Sugar reading logged!');
        setNewLog({ 
          type: 'fbs', 
          value: '', 
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5)
        });
        fetchSugarLogs();
        
        // Alert for abnormal values
        if (value < 70) {
          toast.error('⚠️ LOW SUGAR! Check emergency guidance immediately.', { duration: 8000 });
          setShowEmergency(true);
        } else if (value > 250) {
          toast.warning('⚠️ Very high sugar. Please consult your doctor today.', { duration: 5000 });
        } else if (value > 180) {
          toast.warning('Sugar is high. Monitor closely and follow diet.', { duration: 5000 });
        }
      }
    } catch (error) {
      toast.error('Failed to log reading');
    } finally {
      setLoading(false);
    }
  };

  const getSugarStatus = (value, type) => {
    const v = parseInt(value);
    if (type === 'fbs') {
      if (v < 70) return { status: 'Low', color: 'text-red-600', bg: 'bg-red-100', icon: TrendingDown };
      if (v <= 100) return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle };
      if (v <= 125) return { status: 'Pre-diabetic', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertCircle };
      return { status: 'High', color: 'text-red-600', bg: 'bg-red-100', icon: TrendingUp };
    } else {
      if (v < 70) return { status: 'Low', color: 'text-red-600', bg: 'bg-red-100', icon: TrendingDown };
      if (v <= 140) return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle };
      if (v <= 199) return { status: 'Pre-diabetic', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertCircle };
      return { status: 'High', color: 'text-red-600', bg: 'bg-red-100', icon: TrendingUp };
    }
  };

  // If not logged in, show welcome screen with login prompt
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50">
        <header className="border-b border-border/50 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/')} data-testid="back-button">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img 
                src="https://customer-assets.emergentagent.com/job_healthcare-app-23/artifacts/8vlnp1xf_file_00000000c4247207a977591b05d5eb1d%20%281%29.png" 
                alt="Omnia" 
                className="h-12 w-auto"
              />
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 rounded-full text-teal-700 text-sm font-medium mb-6">
              <Heart className="w-4 h-4" />
              Diabetes Care Portal
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Take Control of Your <span className="text-teal-600">Diabetes</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              Track blood sugar, follow diet plans, and stay prepared for emergencies.
            </p>
          </div>

          <Card className="max-w-md mx-auto p-8 bg-white shadow-xl">
            <div className="text-center mb-6">
              <Activity className="w-16 h-16 mx-auto text-teal-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Login Required</h2>
              <p className="text-gray-600">Please login to access Omnia Diabetes Care features</p>
            </div>
            <Button 
              onClick={() => navigate('/')}
              className="w-full bg-teal-600 hover:bg-teal-700 text-lg py-6"
            >
              Go to Home & Login
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  // Logged in - Show Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50">
      <header className="border-b border-border/50 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/')} data-testid="back-button">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img 
                src="https://customer-assets.emergentagent.com/job_healthcare-app-23/artifacts/8vlnp1xf_file_00000000c4247207a977591b05d5eb1d%20%281%29.png" 
                alt="Omnia" 
                className="h-10 w-auto"
              />
            </div>
            <span className="text-sm text-gray-500">Welcome, {user?.name || 'User'}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Emergency Alert Banner - Always Visible */}
        <Card 
          className="mb-6 border-red-300 bg-gradient-to-r from-red-50 to-red-100 cursor-pointer hover:shadow-lg transition-all" 
          onClick={() => setShowEmergency(true)}
          data-testid="emergency-banner"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-red-800">Hypoglycemia Emergency Guide</p>
                <p className="text-sm text-red-600">Know what to do when blood sugar drops low - Tap to view</p>
              </div>
              <ChevronRight className="w-6 h-6 text-red-400" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all border-teal-200 hover:border-teal-400 active:scale-95"
            onClick={() => setShowSugarLog(true)}
            data-testid="log-sugar-btn"
          >
            <CardContent className="p-5 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg">
                <Droplets className="w-7 h-7 text-white" />
              </div>
              <p className="font-semibold text-gray-800">Log Sugar</p>
              <p className="text-xs text-gray-500 mt-1">FBS & PPBS</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all border-green-200 hover:border-green-400 active:scale-95"
            onClick={() => setShowDiet(true)}
            data-testid="diet-plan-btn"
          >
            <CardContent className="p-5 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
                <Apple className="w-7 h-7 text-white" />
              </div>
              <p className="font-semibold text-gray-800">Diet Plan</p>
              <p className="text-xs text-gray-500 mt-1">Veg & Non-Veg</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all border-purple-200 hover:border-purple-400 active:scale-95"
            onClick={() => setShowTests(true)}
            data-testid="book-tests-btn"
          >
            <CardContent className="p-5 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg">
                <TestTube className="w-7 h-7 text-white" />
              </div>
              <p className="font-semibold text-gray-800">Book Tests</p>
              <p className="text-xs text-gray-500 mt-1">HbA1c, Lipid</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all border-amber-200 hover:border-amber-400 active:scale-95"
            onClick={() => setShowWarnings(true)}
            data-testid="warning-signs-btn"
          >
            <CardContent className="p-5 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                <Info className="w-7 h-7 text-white" />
              </div>
              <p className="font-semibold text-gray-800">Warning Signs</p>
              <p className="text-xs text-gray-500 mt-1">Know symptoms</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all border-indigo-200 hover:border-indigo-400 active:scale-95"
            onClick={() => setShowHbA1c(true)}
            data-testid="hba1c-trend-btn"
          >
            <CardContent className="p-5 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-lg">
                <LineChart className="w-7 h-7 text-white" />
              </div>
              <p className="font-semibold text-gray-800">HbA1c Trend</p>
              <p className="text-xs text-gray-500 mt-1">3-month control</p>
            </CardContent>
          </Card>
        </div>

        {/* HbA1c Trend Chart Card */}
        {hba1cAnalysis && (
          <Card className="mb-6 border-indigo-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LineChart className="w-5 h-5 text-indigo-600" />
                  HbA1c Trend
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowHbA1c(true)}>
                  + Log HbA1c
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-700">{hba1cAnalysis.latest}%</p>
                  <p className="text-xs text-indigo-600">Latest</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-700">{hba1cAnalysis.average}%</p>
                  <p className="text-xs text-gray-600">Average</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{hba1cAnalysis.lowest}%</p>
                  <p className="text-xs text-green-600">Lowest</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{hba1cAnalysis.highest}%</p>
                  <p className="text-xs text-red-600">Highest</p>
                </div>
              </div>

              {/* Visual Chart */}
              {hba1cTrend && hba1cTrend.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-end justify-between h-32 gap-1">
                    {hba1cTrend.slice(-10).map((log, idx) => {
                      const height = Math.min(100, Math.max(20, ((log.value - 4) / 10) * 100));
                      const status = getHba1cStatus(log.value);
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs font-medium text-gray-600">{log.value}%</span>
                          <div 
                            className={`w-full rounded-t-lg ${status.bg} transition-all`}
                            style={{ height: `${height}%` }}
                            title={`${log.date}: ${log.value}%`}
                          />
                          <span className="text-[10px] text-gray-400">{log.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Target line reference */}
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100"></span> &lt;6.5% Excellent</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100"></span> &lt;7% Good</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100"></span> &lt;8% Fair</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100"></span> &gt;8% Needs Work</span>
                  </div>
                </div>
              )}

              {/* Trend Direction */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {hba1cAnalysis.trend_direction === 'improving' && (
                    <><TrendingDown className="w-5 h-5 text-green-500" /><span className="text-green-600 font-medium">Improving</span></>
                  )}
                  {hba1cAnalysis.trend_direction === 'worsening' && (
                    <><TrendingUp className="w-5 h-5 text-red-500" /><span className="text-red-600 font-medium">Needs Attention</span></>
                  )}
                  {hba1cAnalysis.trend_direction === 'stable' && (
                    <><Target className="w-5 h-5 text-blue-500" /><span className="text-blue-600 font-medium">Stable</span></>
                  )}
                </div>
                <span className="text-sm text-gray-500">{hba1cAnalysis.total_tests} tests recorded</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Sugar Logs */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-teal-600" />
                Recent Sugar Readings
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowSugarLog(true)}>
                + Add New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {sugarLogs.length > 0 ? (
              <div className="space-y-2">
                {sugarLogs.slice(0, 5).map((log, idx) => {
                  const status = getSugarStatus(log.value, log.type);
                  const StatusIcon = status.icon;
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${status.bg} flex items-center justify-center`}>
                          <StatusIcon className={`w-5 h-5 ${status.color}`} />
                        </div>
                        <div>
                          <p className="font-bold text-lg">{log.value} <span className="text-sm font-normal text-gray-500">mg/dL</span></p>
                          <p className="text-xs text-gray-500">{log.type.toUpperCase()} • {log.date} {log.time && `at ${log.time}`}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}>
                        {status.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Droplets className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 mb-3">No readings logged yet</p>
                <Button onClick={() => setShowSugarLog(true)} className="bg-teal-600 hover:bg-teal-700">
                  Log Your First Reading
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Medicine CTA */}
        <Card className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white overflow-hidden">
          <CardContent className="p-6 relative">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Pill className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Order Diabetic Medicines</h3>
                  <p className="text-orange-100 text-sm">Get monthly supplies delivered home</p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/pharmacy')}
                className="bg-white text-orange-600 hover:bg-orange-50 font-semibold px-6 w-full sm:w-auto"
                data-testid="order-medicine-btn"
              >
                Order from Orange Pharmacy
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Sugar Log Dialog */}
      <Dialog open={showSugarLog} onOpenChange={setShowSugarLog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-teal-600" />
              Log Blood Sugar Reading
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reading Type *</Label>
              <Select value={newLog.type} onValueChange={(v) => setNewLog({...newLog, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fbs">FBS (Fasting - Empty Stomach)</SelectItem>
                  <SelectItem value="ppbs">PPBS (2 Hours After Meal)</SelectItem>
                  <SelectItem value="random">Random (Anytime)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sugar Value (mg/dL) *</Label>
              <Input 
                type="number"
                placeholder="e.g., 120"
                value={newLog.value}
                onChange={(e) => setNewLog({...newLog, value: e.target.value})}
                className="text-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input 
                  type="date"
                  value={newLog.date}
                  onChange={(e) => setNewLog({...newLog, date: e.target.value})}
                />
              </div>
              <div>
                <Label>Time</Label>
                <Input 
                  type="time"
                  value={newLog.time}
                  onChange={(e) => setNewLog({...newLog, time: e.target.value})}
                />
              </div>
            </div>
            
            <Card className="bg-teal-50 border-teal-200">
              <CardContent className="p-3">
                <p className="font-medium text-teal-800 text-sm mb-2">Reference Ranges:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white rounded p-2">
                    <p className="font-semibold text-teal-700">FBS (Fasting)</p>
                    <p className="text-green-600">Normal: 70-100</p>
                    <p className="text-yellow-600">Pre-diabetic: 100-125</p>
                    <p className="text-red-600">Diabetic: 126+</p>
                  </div>
                  <div className="bg-white rounded p-2">
                    <p className="font-semibold text-teal-700">PPBS (After Meal)</p>
                    <p className="text-green-600">Normal: 70-140</p>
                    <p className="text-yellow-600">Pre-diabetic: 140-199</p>
                    <p className="text-red-600">Diabetic: 200+</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Button onClick={handleAddSugarLog} disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 py-6 text-lg">
              {loading ? 'Saving...' : 'Save Reading'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diet Plan Dialog - Detailed */}
      <Dialog open={showDiet} onOpenChange={setShowDiet}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 bg-gradient-to-r from-green-500 to-teal-500 text-white">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Utensils className="w-6 h-6" />
              Diabetic Diet Plan
            </DialogTitle>
            <DialogDescription className="text-green-100">
              Indian-friendly meal guidance • General guidance only - consult dietitian
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="veg" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full justify-start px-4 pt-2 bg-gray-50 flex-shrink-0">
              <TabsTrigger value="veg" className="flex-1">🥗 Vegetarian</TabsTrigger>
              <TabsTrigger value="nonveg" className="flex-1">🍗 Non-Veg</TabsTrigger>
              <TabsTrigger value="tips" className="flex-1">📋 Tips</TabsTrigger>
            </TabsList>
            
            <ScrollArea className="flex-1">
              <TabsContent value="veg" className="p-4 space-y-4 m-0">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Recommended Timings:</strong> Breakfast {DIET_PLANS.timings.breakfast} | Lunch {DIET_PLANS.timings.lunch} | Dinner {DIET_PLANS.timings.dinner}
                    </p>
                  </CardContent>
                </Card>
                
                {['breakfast', 'lunch', 'dinner', 'snacks'].map(meal => (
                  <Card key={meal} className="border-green-200">
                    <CardHeader className="py-3 bg-green-50">
                      <CardTitle className="text-base capitalize text-green-700 flex items-center gap-2">
                        {meal === 'breakfast' && '🌅'}
                        {meal === 'lunch' && '☀️'}
                        {meal === 'dinner' && '🌙'}
                        {meal === 'snacks' && '🥜'}
                        {meal}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      {DIET_PLANS.vegetarian[meal].map((item, idx) => (
                        <div key={idx} className="py-2 border-b last:border-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.item}</p>
                              <p className="text-xs text-gray-500">{item.portion}</p>
                            </div>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{item.calories} cal</span>
                          </div>
                          <p className="text-xs text-green-600 mt-1">✓ {item.benefits}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="nonveg" className="p-4 space-y-4 m-0">
                {['breakfast', 'lunch', 'dinner', 'snacks'].map(meal => (
                  <Card key={meal} className="border-orange-200">
                    <CardHeader className="py-3 bg-orange-50">
                      <CardTitle className="text-base capitalize text-orange-700">{meal}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      {DIET_PLANS.nonVegetarian[meal].map((item, idx) => (
                        <div key={idx} className="py-2 border-b last:border-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.item}</p>
                              <p className="text-xs text-gray-500">{item.portion}</p>
                            </div>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{item.calories} cal</span>
                          </div>
                          <p className="text-xs text-orange-600 mt-1">✓ {item.benefits}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="tips" className="p-4 space-y-4 m-0">
                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base text-green-700 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" /> Do's - Follow These
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    {DIET_PLANS.dos.map((tip, idx) => (
                      <p key={idx} className="text-sm py-1.5 text-green-800 border-b border-green-100 last:border-0">
                        ✓ {tip}
                      </p>
                    ))}
                  </CardContent>
                </Card>
                
                <Card className="border-red-200 bg-red-50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" /> Don'ts - Avoid These
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    {DIET_PLANS.donts.map((tip, idx) => (
                      <p key={idx} className="text-sm py-1.5 text-red-800 border-b border-red-100 last:border-0">
                        ✗ {tip}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
          
          <div className="p-3 bg-amber-50 border-t border-amber-200 flex-shrink-0">
            <p className="text-xs text-amber-700 text-center">
              ⚠️ This is general guidance only. Please consult a dietitian for personalized diet plans based on your condition.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Book Tests Dialog */}
      <Dialog open={showTests} onOpenChange={setShowTests}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-purple-600" />
              Book Diabetic Tests
            </DialogTitle>
            <DialogDescription>
              Book tests via Proton Diagnostics - Our partner lab
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {DIABETIC_TESTS.map(test => (
              <Card key={test.id} className="border-purple-100 hover:border-purple-300 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{test.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{test.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">{test.frequency}</span>
                        <span className="text-xs text-gray-500">{test.price}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Button 
            onClick={() => { setShowTests(false); navigate('/proton'); }}
            className="w-full bg-purple-600 hover:bg-purple-700 py-6 text-lg mt-4"
          >
            Book Tests at Proton Diagnostics
          </Button>
          
          <p className="text-xs text-gray-500 text-center mt-2">
            Sample collection available at home. Tests conducted by certified labs.
          </p>
        </DialogContent>
      </Dialog>

      {/* Warning Signs Dialog */}
      <Dialog open={showWarnings} onOpenChange={setShowWarnings}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-amber-600" />
              Warning Signs of Diabetes
            </DialogTitle>
            <DialogDescription>
              Recognize these symptoms early and consult your doctor
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {WARNING_SIGNS.map((item, idx) => (
              <Card key={idx} className="border-amber-100 hover:border-amber-300 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{item.sign}</p>
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                      <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-2 py-1 rounded inline-block">
                        💡 {item.action}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card className="bg-blue-50 border-blue-200 mt-4">
            <CardContent className="p-4 text-center">
              <p className="text-blue-800 font-medium">
                🩺 If any of these symptoms persist, please consult your doctor immediately.
              </p>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Emergency Hypoglycemia Dialog - Complete */}
      <Dialog open={showEmergency} onOpenChange={setShowEmergency}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 bg-gradient-to-r from-red-500 to-red-600 text-white flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="w-6 h-6" />
              Hypoglycemia Emergency Guide
            </DialogTitle>
            <DialogDescription className="text-red-100">
              What to do when blood sugar drops low - Save this information!
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* What is it */}
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <h4 className="font-bold text-red-800 mb-2">What is Hypoglycemia?</h4>
                  <p className="text-sm text-red-700">{HYPOGLYCEMIA_GUIDE.whatIs}</p>
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-red-800 mb-1">Common Causes:</p>
                    <div className="flex flex-wrap gap-1">
                      {HYPOGLYCEMIA_GUIDE.causes.map((cause, idx) => (
                        <span key={idx} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                          {cause}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Symptoms by Severity */}
              <div>
                <h4 className="font-bold text-gray-800 mb-3">Symptoms to Watch</h4>
                
                <Card className="mb-2 border-yellow-200">
                  <CardHeader className="py-2 bg-yellow-50">
                    <CardTitle className="text-sm text-yellow-700">⚡ Early Symptoms</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="grid grid-cols-2 gap-2">
                      {HYPOGLYCEMIA_GUIDE.symptoms.early.map((item, idx) => (
                        <div key={idx} className="text-xs p-2 bg-yellow-50 rounded">
                          <p className="font-medium">{item.symptom}</p>
                          <p className="text-gray-500">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="mb-2 border-orange-200">
                  <CardHeader className="py-2 bg-orange-50">
                    <CardTitle className="text-sm text-orange-700">⚠️ Moderate Symptoms</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="grid grid-cols-2 gap-2">
                      {HYPOGLYCEMIA_GUIDE.symptoms.moderate.map((item, idx) => (
                        <div key={idx} className="text-xs p-2 bg-orange-50 rounded">
                          <p className="font-medium">{item.symptom}</p>
                          <p className="text-gray-500">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-red-300 bg-red-50">
                  <CardHeader className="py-2 bg-red-100">
                    <CardTitle className="text-sm text-red-700">🚨 SEVERE - Call 112 Immediately</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="grid grid-cols-2 gap-2">
                      {HYPOGLYCEMIA_GUIDE.symptoms.severe.map((item, idx) => (
                        <div key={idx} className="text-xs p-2 bg-red-100 rounded">
                          <p className="font-bold text-red-700">{item.symptom}</p>
                          <p className="text-red-600">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* 15-15 Rule */}
              <Card className="border-green-300 bg-green-50">
                <CardHeader className="py-3 bg-green-100">
                  <CardTitle className="text-base text-green-800">✅ The 15-15 Rule - What To Do</CardTitle>
                </CardHeader>
                <CardContent className="py-3">
                  {HYPOGLYCEMIA_GUIDE.rule15.steps.map((step, idx) => (
                    <p key={idx} className="text-sm py-1 text-green-800">
                      {idx + 1}. {step}
                    </p>
                  ))}
                </CardContent>
              </Card>
              
              {/* Fast Sugar Options */}
              <Card className="border-blue-200">
                <CardHeader className="py-2 bg-blue-50">
                  <CardTitle className="text-sm text-blue-700">🍬 Fast-Acting Sugar Options (15g each)</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-2 gap-2">
                    {HYPOGLYCEMIA_GUIDE.fastSugarOptions.map((option, idx) => (
                      <div key={idx} className="text-xs p-2 bg-blue-50 rounded border border-blue-100">
                        <p className="font-medium text-blue-800">{option.item}</p>
                        <p className="text-blue-600">{option.amount}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* If Unconscious */}
              <Card className="border-red-400 bg-red-100">
                <CardHeader className="py-3 bg-red-200">
                  <CardTitle className="text-base text-red-800">🚨 If Person is UNCONSCIOUS</CardTitle>
                </CardHeader>
                <CardContent className="py-3">
                  {HYPOGLYCEMIA_GUIDE.unconsciousPerson.map((action, idx) => (
                    <p key={idx} className="text-sm py-1.5 text-red-800 font-medium border-b border-red-200 last:border-0">
                      {idx + 1}. {action}
                    </p>
                  ))}
                </CardContent>
              </Card>
              
              {/* Prevention */}
              <Card className="border-teal-200">
                <CardHeader className="py-2 bg-teal-50">
                  <CardTitle className="text-sm text-teal-700">🛡️ Prevention Tips</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  {HYPOGLYCEMIA_GUIDE.prevention.map((tip, idx) => (
                    <p key={idx} className="text-xs py-1 text-teal-700">✓ {tip}</p>
                  ))}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
          
          <div className="p-4 bg-gray-100 border-t flex-shrink-0">
            <div className="flex gap-3 mb-3">
              <Button 
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => window.open('tel:112', '_self')}
              >
                <Phone className="w-4 h-4 mr-2" />
                Emergency 112
              </Button>
              <Button 
                variant="outline"
                className="flex-1 border-teal-600 text-teal-600"
                onClick={() => window.open('tel:9403890429', '_self')}
              >
                <Phone className="w-4 h-4 mr-2" />
                Clinic: 9403890429
              </Button>
            </div>
            <p className="text-xs text-gray-600 text-center">
              ⚠️ This is emergency first-aid guidance, not medical treatment. Always seek professional help.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Setup Dialog */}
      <Dialog open={showProfileSetup} onOpenChange={setShowProfileSetup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Diabetes Profile</DialogTitle>
            <DialogDescription>Help us personalize your experience</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Diabetes Type *</Label>
              <Select value={profileData.diabetesType} onValueChange={(v) => setProfileData({...profileData, diabetesType: v})}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="type1">Type 1 Diabetes</SelectItem>
                  <SelectItem value="type2">Type 2 Diabetes</SelectItem>
                  <SelectItem value="gestational">Gestational Diabetes</SelectItem>
                  <SelectItem value="prediabetes">Pre-diabetes</SelectItem>
                  <SelectItem value="notsure">Not Sure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Age</Label>
                <Input 
                  type="number"
                  placeholder="e.g., 45"
                  value={profileData.age}
                  onChange={(e) => setProfileData({...profileData, age: e.target.value})}
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={profileData.gender} onValueChange={(v) => setProfileData({...profileData, gender: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSaveProfile} disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700">
              {loading ? 'Saving...' : 'Save & Continue'}
            </Button>
            <Button variant="ghost" onClick={() => setShowProfileSetup(false)} className="w-full">
              Skip for now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Omnia;
