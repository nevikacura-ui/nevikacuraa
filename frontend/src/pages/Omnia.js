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
import { toast } from 'sonner';
import { 
  ArrowLeft, Heart, Activity, AlertTriangle, Droplets, Apple, 
  Calendar, TrendingUp, TrendingDown, Minus, Phone, Pill,
  ClipboardList, BookOpen, Utensils, TestTube, ChevronRight,
  User, Mail, Lock, AlertCircle, CheckCircle, Info
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Diabetic Diet Plans
const DIET_PLANS = {
  vegetarian: {
    breakfast: [
      { item: "Oats Upma with vegetables", portion: "1 bowl", calories: "180" },
      { item: "Moong Dal Chilla (2 pieces)", portion: "Medium", calories: "150" },
      { item: "Vegetable Poha", portion: "1 bowl", calories: "200" },
      { item: "Idli (2) with Sambar", portion: "Medium", calories: "170" },
      { item: "Besan Cheela with mint chutney", portion: "2 pieces", calories: "160" }
    ],
    lunch: [
      { item: "Brown Rice + Dal + Sabzi + Salad", portion: "1 plate", calories: "350" },
      { item: "2 Roti + Palak Paneer + Raita", portion: "Regular", calories: "380" },
      { item: "Quinoa Pulao + Curd + Vegetables", portion: "1 plate", calories: "320" },
      { item: "Bajra Roti + Mixed Vegetable Curry", portion: "2 roti", calories: "340" }
    ],
    dinner: [
      { item: "Vegetable Soup + 1 Roti + Sabzi", portion: "Light", calories: "250" },
      { item: "Khichdi with Vegetables", portion: "1 bowl", calories: "280" },
      { item: "Grilled Paneer Salad", portion: "1 plate", calories: "220" },
      { item: "Dalia with Vegetables", portion: "1 bowl", calories: "240" }
    ],
    snacks: [
      { item: "Roasted Chana", portion: "1/4 cup", calories: "80" },
      { item: "Mixed Nuts (unsalted)", portion: "10-12 pieces", calories: "100" },
      { item: "Cucumber & Carrot sticks", portion: "1 cup", calories: "30" },
      { item: "Buttermilk (Chaas)", portion: "1 glass", calories: "40" },
      { item: "Apple or Guava", portion: "1 medium", calories: "60" }
    ]
  },
  nonVegetarian: {
    breakfast: [
      { item: "Egg White Omelette with Toast", portion: "2 eggs + 1 toast", calories: "200" },
      { item: "Boiled Eggs with Vegetables", portion: "2 eggs", calories: "180" },
      { item: "Oats with Egg", portion: "1 bowl", calories: "220" }
    ],
    lunch: [
      { item: "Grilled Chicken + Brown Rice + Salad", portion: "100g chicken", calories: "400" },
      { item: "Fish Curry + 2 Roti + Vegetables", portion: "Regular", calories: "420" },
      { item: "Chicken Soup + Roti + Sabzi", portion: "1 bowl + 2 roti", calories: "380" }
    ],
    dinner: [
      { item: "Grilled Fish with Steamed Vegetables", portion: "100g fish", calories: "280" },
      { item: "Chicken Salad", portion: "1 plate", calories: "250" },
      { item: "Egg Curry + 1 Roti", portion: "2 eggs", calories: "300" }
    ],
    snacks: [
      { item: "Boiled Egg", portion: "1 egg", calories: "70" },
      { item: "Chicken Soup (clear)", portion: "1 cup", calories: "80" },
      { item: "Fish Tikka (grilled)", portion: "2-3 pieces", calories: "120" }
    ]
  },
  dos: [
    "Eat at regular intervals (every 3-4 hours)",
    "Include fiber-rich foods in every meal",
    "Choose whole grains over refined carbs",
    "Drink plenty of water (8-10 glasses daily)",
    "Include protein in every meal",
    "Use healthy cooking oils (olive, mustard)",
    "Eat fruits with low glycemic index (apple, guava, orange)",
    "Include green leafy vegetables daily"
  ],
  donts: [
    "Avoid white rice, maida, white bread",
    "Limit sugar and sugary drinks completely",
    "Avoid fried and processed foods",
    "Don't skip meals, especially breakfast",
    "Limit fruit juices (eat whole fruits instead)",
    "Avoid high-GI fruits like mango, banana, grapes",
    "Don't eat heavy meals at night",
    "Avoid alcohol or limit strictly"
  ]
};

// Warning Signs
const WARNING_SIGNS = [
  { sign: "Excessive Thirst (Polydipsia)", description: "Feeling thirsty all the time, even after drinking water", icon: "💧" },
  { sign: "Frequent Urination (Polyuria)", description: "Urinating more often, especially at night", icon: "🚽" },
  { sign: "Unexplained Weight Loss", description: "Losing weight without trying or change in diet", icon: "⚖️" },
  { sign: "Extreme Fatigue", description: "Feeling very tired despite adequate rest", icon: "😴" },
  { sign: "Blurred Vision", description: "Difficulty seeing clearly, vision changes", icon: "👁️" },
  { sign: "Slow Wound Healing", description: "Cuts and bruises take longer to heal", icon: "🩹" },
  { sign: "Tingling or Numbness", description: "Tingling sensation in hands or feet", icon: "🖐️" },
  { sign: "Frequent Infections", description: "Recurring skin, gum, or urinary infections", icon: "🦠" }
];

// Hypoglycemia Emergency Guide
const HYPOGLYCEMIA_GUIDE = {
  whatIs: "Hypoglycemia (low blood sugar) occurs when blood glucose drops below 70 mg/dL. It can happen quickly and needs immediate attention.",
  symptoms: [
    { symptom: "Sweating", severity: "early" },
    { symptom: "Trembling/Shaking", severity: "early" },
    { symptom: "Dizziness", severity: "early" },
    { symptom: "Hunger", severity: "early" },
    { symptom: "Fast heartbeat", severity: "moderate" },
    { symptom: "Confusion", severity: "moderate" },
    { symptom: "Irritability", severity: "moderate" },
    { symptom: "Blurred vision", severity: "severe" },
    { symptom: "Difficulty speaking", severity: "severe" },
    { symptom: "Unconsciousness", severity: "danger" }
  ],
  immediateActions: [
    "Take 15-20 grams of fast-acting sugar immediately",
    "Examples: 3-4 glucose tablets, 4 teaspoons sugar in water, 1/2 cup fruit juice, 1 tablespoon honey",
    "Wait 15 minutes and recheck blood sugar if possible",
    "If still low, repeat the sugar intake",
    "Once better, eat a small snack with protein (biscuits with peanut butter, cheese)"
  ],
  dangerSigns: [
    "If person is unconscious - DO NOT give food or drink",
    "Place them on their side (recovery position)",
    "Call emergency services immediately",
    "If available, use glucagon injection (trained person only)"
  ]
};

// Available Diabetic Tests
const DIABETIC_TESTS = [
  { id: "fbs", name: "Fasting Blood Sugar (FBS)", description: "Blood sugar after 8-12 hours fasting", frequency: "Monthly" },
  { id: "ppbs", name: "Post-Prandial Blood Sugar (PPBS)", description: "Blood sugar 2 hours after meal", frequency: "Monthly" },
  { id: "hba1c", name: "HbA1c (Glycated Hemoglobin)", description: "3-month average blood sugar", frequency: "Every 3 months" },
  { id: "lipid", name: "Lipid Profile", description: "Cholesterol and triglyceride levels", frequency: "Every 6 months" },
  { id: "kidney", name: "Kidney Function Test (KFT)", description: "Checks kidney health", frequency: "Yearly" },
  { id: "urine", name: "Urine Microalbumin", description: "Early detection of kidney damage", frequency: "Yearly" }
];

const Omnia = () => {
  const navigate = useNavigate();
  
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('omnia_token'));
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  
  // UI state
  const [showAuth, setShowAuth] = useState(false);
  const [authStep, setAuthStep] = useState('phone'); // phone, otp, register, profile
  const [loading, setLoading] = useState(false);
  
  // Auth form state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [authData, setAuthData] = useState({ name: '', email: '', password: '' });
  const [profileData, setProfileData] = useState({
    diabetesType: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    medications: ''
  });
  
  // Feature dialogs
  const [showDiet, setShowDiet] = useState(false);
  const [showSugarLog, setShowSugarLog] = useState(false);
  const [showTests, setShowTests] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  
  // Sugar log state
  const [sugarLogs, setSugarLogs] = useState([]);
  const [newLog, setNewLog] = useState({ type: 'fbs', value: '', date: new Date().toISOString().split('T')[0], time: '' });

  useEffect(() => {
    if (token) {
      fetchUserData();
      fetchSugarLogs();
    }
  }, [token]);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        fetchProfile();
      } else {
        localStorage.removeItem('omnia_token');
        setToken(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/api/omnia/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
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

  const handleSendOtp = async () => {
    if (!phone || phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, service: 'omnia' })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('OTP sent to your phone');
        setAuthStep('otp');
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      toast.error('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });
      const data = await response.json();
      if (data.valid) {
        if (data.user_exists && data.token) {
          localStorage.setItem('omnia_token', data.token);
          localStorage.setItem('token', data.token);
          setToken(data.token);
          setShowAuth(false);
          toast.success('Welcome back!');
        } else {
          setAuthStep('register');
        }
      } else {
        toast.error('Invalid OTP');
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...authData, phone })
      });
      const data = await response.json();
      if (data.token) {
        localStorage.setItem('omnia_token', data.token);
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setAuthStep('profile');
        toast.success('Account created! Please complete your profile.');
      } else {
        toast.error(data.detail || 'Registration failed');
      }
    } catch (error) {
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileData.diabetesType || !profileData.age || !profileData.gender) {
      toast.error('Please fill required fields');
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
        toast.success('Profile saved successfully!');
        setShowAuth(false);
        fetchProfile();
      } else {
        toast.error('Failed to save profile');
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
        setNewLog({ type: 'fbs', value: '', date: new Date().toISOString().split('T')[0], time: '' });
        fetchSugarLogs();
        
        // Alert for abnormal values
        if (value < 70) {
          toast.error('⚠️ Low sugar detected! Check emergency guidance.', { duration: 5000 });
        } else if (value > 180) {
          toast.warning('⚠️ High sugar reading. Please consult your doctor.', { duration: 5000 });
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
      if (v < 70) return { status: 'Low', color: 'text-red-600', bg: 'bg-red-100' };
      if (v <= 100) return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100' };
      if (v <= 125) return { status: 'Pre-diabetic', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      return { status: 'High', color: 'text-red-600', bg: 'bg-red-100' };
    } else {
      if (v < 70) return { status: 'Low', color: 'text-red-600', bg: 'bg-red-100' };
      if (v <= 140) return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100' };
      if (v <= 199) return { status: 'Pre-diabetic', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      return { status: 'High', color: 'text-red-600', bg: 'bg-red-100' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setProfile(null);
    localStorage.removeItem('omnia_token');
    toast.success('Logged out successfully');
  };

  // If not logged in, show welcome screen
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
        <header className="border-b border-border/50 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/')} data-testid="back-button">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <img 
                  src="https://customer-assets.emergentagent.com/job_healthcare-app-23/artifacts/6hsg4xui_file_00000000c4247207a977591b05d5eb1d%20%281%29.png" 
                  alt="Omnia" 
                  className="h-12 w-auto"
                />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-teal-800 mb-4">Diabetes Care Portal</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your trusted digital companion for diabetes management. Track, understand, and manage your condition safely.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="border-teal-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Blood Sugar Tracking</h3>
                    <p className="text-sm text-gray-600">Log and monitor your FBS & PPBS readings with trend analysis</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-teal-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <Apple className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Diabetic Diet Plans</h3>
                    <p className="text-sm text-gray-600">Indian-friendly diet guidance for vegetarian & non-vegetarian</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-teal-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Emergency Guidance</h3>
                    <p className="text-sm text-gray-600">Hypoglycemia first-aid and emergency protocols</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-teal-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <TestTube className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Book Tests</h3>
                    <p className="text-sm text-gray-600">Easy booking for HbA1c, FBS, PPBS & more via Proton</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button 
              size="lg"
              onClick={() => setShowAuth(true)}
              className="bg-teal-600 hover:bg-teal-700 text-lg px-8 py-6 rounded-full"
              data-testid="omnia-login-btn"
            >
              Login / Sign Up to Continue
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              ⚠️ This portal is for education and tracking only. Always consult your doctor for medical advice.
            </p>
          </div>
        </main>

        {/* Auth Dialog */}
        <Dialog open={showAuth} onOpenChange={setShowAuth}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_healthcare-app-23/artifacts/6hsg4xui_file_00000000c4247207a977591b05d5eb1d%20%281%29.png" 
                  alt="Omnia" 
                  className="h-8 w-auto"
                />
                {authStep === 'profile' ? 'Complete Your Profile' : 'Welcome to Omnia'}
              </DialogTitle>
              <DialogDescription>
                {authStep === 'phone' && 'Enter your mobile number to continue'}
                {authStep === 'otp' && 'Enter the OTP sent to your phone'}
                {authStep === 'register' && 'Create your account'}
                {authStep === 'profile' && 'Help us personalize your experience'}
              </DialogDescription>
            </DialogHeader>

            {authStep === 'phone' && (
              <div className="space-y-4">
                <div>
                  <Label>Mobile Number</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 bg-gray-100 rounded-lg">
                      <span className="text-gray-600">+91</span>
                    </div>
                    <Input 
                      type="tel"
                      placeholder="Enter 10-digit number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="flex-1"
                    />
                  </div>
                </div>
                <Button onClick={handleSendOtp} disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700">
                  {loading ? 'Sending...' : 'Send OTP'}
                </Button>
              </div>
            )}

            {authStep === 'otp' && (
              <div className="space-y-4">
                <div>
                  <Label>Enter OTP</Label>
                  <Input 
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAuthStep('phone')} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleVerifyOtp} disabled={loading} className="flex-1 bg-teal-600 hover:bg-teal-700">
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </Button>
                </div>
              </div>
            )}

            {authStep === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input 
                    required
                    value={authData.name}
                    onChange={(e) => setAuthData({...authData, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={authData.email}
                    onChange={(e) => setAuthData({...authData, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Password *</Label>
                  <Input 
                    type="password"
                    required
                    value={authData.password}
                    onChange={(e) => setAuthData({...authData, password: e.target.value})}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700">
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            )}

            {authStep === 'profile' && (
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
                    <Label>Age *</Label>
                    <Input 
                      type="number"
                      value={profileData.age}
                      onChange={(e) => setProfileData({...profileData, age: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Gender *</Label>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Height (cm)</Label>
                    <Input 
                      type="number"
                      placeholder="e.g., 165"
                      value={profileData.height}
                      onChange={(e) => setProfileData({...profileData, height: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Weight (kg)</Label>
                    <Input 
                      type="number"
                      placeholder="e.g., 70"
                      value={profileData.weight}
                      onChange={(e) => setProfileData({...profileData, weight: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Current Medications (optional)</Label>
                  <Input 
                    placeholder="e.g., Metformin 500mg"
                    value={profileData.medications}
                    onChange={(e) => setProfileData({...profileData, medications: e.target.value})}
                  />
                </div>
                <Button onClick={handleSaveProfile} disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700">
                  {loading ? 'Saving...' : 'Save & Continue'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Logged in view
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <header className="border-b border-border/50 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/')} data-testid="back-button">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img 
                src="https://customer-assets.emergentagent.com/job_healthcare-app-23/artifacts/6hsg4xui_file_00000000c4247207a977591b05d5eb1d%20%281%29.png" 
                alt="Omnia" 
                className="h-10 w-auto"
              />
            </div>
            <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Card */}
        <Card className="mb-8 bg-gradient-to-r from-teal-500 to-teal-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">Welcome, {user?.name || 'User'}!</h2>
                <p className="text-teal-100">
                  {profile?.diabetesType === 'type1' && 'Type 1 Diabetes'}
                  {profile?.diabetesType === 'type2' && 'Type 2 Diabetes'}
                  {profile?.diabetesType === 'gestational' && 'Gestational Diabetes'}
                  {profile?.diabetesType === 'prediabetes' && 'Pre-diabetes'}
                  {profile?.diabetesType === 'notsure' && 'Diabetes Type: Not specified'}
                  {!profile?.diabetesType && 'Complete your profile for personalized guidance'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-teal-100">Today's Date</p>
                <p className="text-lg font-semibold">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Alert Banner */}
        <Card className="mb-6 border-red-300 bg-red-50 cursor-pointer hover:shadow-md transition-all" onClick={() => setShowEmergency(true)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-800">Hypoglycemia Emergency Guide</p>
                <p className="text-sm text-red-600">Know what to do when blood sugar drops low - Tap to view</p>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all border-teal-200 hover:border-teal-400"
            onClick={() => setShowSugarLog(true)}
            data-testid="log-sugar-btn"
          >
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-teal-100 flex items-center justify-center">
                <Droplets className="w-6 h-6 text-teal-600" />
              </div>
              <p className="font-medium text-gray-800">Log Sugar</p>
              <p className="text-xs text-gray-500">Track readings</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all border-green-200 hover:border-green-400"
            onClick={() => setShowDiet(true)}
            data-testid="diet-plan-btn"
          >
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-green-100 flex items-center justify-center">
                <Utensils className="w-6 h-6 text-green-600" />
              </div>
              <p className="font-medium text-gray-800">Diet Plan</p>
              <p className="text-xs text-gray-500">Meal guidance</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all border-purple-200 hover:border-purple-400"
            onClick={() => setShowTests(true)}
            data-testid="book-tests-btn"
          >
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-purple-100 flex items-center justify-center">
                <TestTube className="w-6 h-6 text-purple-600" />
              </div>
              <p className="font-medium text-gray-800">Book Tests</p>
              <p className="text-xs text-gray-500">HbA1c, FBS...</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all border-amber-200 hover:border-amber-400"
            onClick={() => setShowWarnings(true)}
            data-testid="warning-signs-btn"
          >
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-amber-100 flex items-center justify-center">
                <Info className="w-6 h-6 text-amber-600" />
              </div>
              <p className="font-medium text-gray-800">Warning Signs</p>
              <p className="text-xs text-gray-500">Know symptoms</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sugar Logs */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              Recent Sugar Readings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sugarLogs.length > 0 ? (
              <div className="space-y-3">
                {sugarLogs.slice(0, 5).map((log, idx) => {
                  const status = getSugarStatus(log.value, log.type);
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${status.bg} flex items-center justify-center`}>
                          {status.status === 'Normal' ? <CheckCircle className={`w-5 h-5 ${status.color}`} /> : 
                           status.status === 'Low' ? <TrendingDown className={`w-5 h-5 ${status.color}`} /> :
                           <TrendingUp className={`w-5 h-5 ${status.color}`} />}
                        </div>
                        <div>
                          <p className="font-medium">{log.value} mg/dL</p>
                          <p className="text-xs text-gray-500">{log.type.toUpperCase()} • {log.date}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                        {status.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Droplets className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No readings logged yet</p>
                <Button size="sm" className="mt-3 bg-teal-600" onClick={() => setShowSugarLog(true)}>
                  Log Your First Reading
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Medicine Section */}
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Pill className="w-7 h-7 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">Order Diabetic Medicines</h3>
                  <p className="text-sm text-gray-600">Get monthly medicines delivered via Orange Pharmacy</p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/pharmacy')}
                className="bg-orange-500 hover:bg-orange-600"
                data-testid="order-medicine-btn"
              >
                Order Now
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
              <Label>Reading Type</Label>
              <Select value={newLog.type} onValueChange={(v) => setNewLog({...newLog, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fbs">FBS (Fasting Blood Sugar)</SelectItem>
                  <SelectItem value="ppbs">PPBS (Post-Prandial)</SelectItem>
                  <SelectItem value="random">Random</SelectItem>
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
              <CardContent className="p-3 text-sm">
                <p className="font-medium text-teal-800 mb-1">Reference Ranges:</p>
                <p className="text-teal-700">FBS: 70-100 mg/dL (Normal)</p>
                <p className="text-teal-700">PPBS: 70-140 mg/dL (Normal)</p>
              </CardContent>
            </Card>
            
            <Button onClick={handleAddSugarLog} disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700">
              {loading ? 'Saving...' : 'Save Reading'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diet Plan Dialog */}
      <Dialog open={showDiet} onOpenChange={setShowDiet}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 bg-gradient-to-r from-green-500 to-teal-500 text-white">
            <DialogTitle className="flex items-center gap-2">
              <Utensils className="w-5 h-5" />
              Diabetic Diet Plan
            </DialogTitle>
            <DialogDescription className="text-green-100">
              Indian-friendly meal guidance for diabetes management
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="veg" className="flex-1 overflow-hidden">
            <TabsList className="w-full justify-start px-4 pt-2 bg-gray-50">
              <TabsTrigger value="veg">Vegetarian</TabsTrigger>
              <TabsTrigger value="nonveg">Non-Vegetarian</TabsTrigger>
              <TabsTrigger value="tips">Do's & Don'ts</TabsTrigger>
            </TabsList>
            
            <ScrollArea className="flex-1 h-[400px]">
              <TabsContent value="veg" className="p-4 space-y-4">
                {['breakfast', 'lunch', 'dinner', 'snacks'].map(meal => (
                  <Card key={meal} className="border-green-200">
                    <CardHeader className="py-3">
                      <CardTitle className="text-base capitalize text-green-700">{meal}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      {DIET_PLANS.vegetarian[meal].map((item, idx) => (
                        <div key={idx} className="flex justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium text-sm">{item.item}</p>
                            <p className="text-xs text-gray-500">{item.portion}</p>
                          </div>
                          <span className="text-xs text-gray-500">{item.calories} cal</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="nonveg" className="p-4 space-y-4">
                {['breakfast', 'lunch', 'dinner', 'snacks'].map(meal => (
                  <Card key={meal} className="border-orange-200">
                    <CardHeader className="py-3">
                      <CardTitle className="text-base capitalize text-orange-700">{meal}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      {DIET_PLANS.nonVegetarian[meal].map((item, idx) => (
                        <div key={idx} className="flex justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium text-sm">{item.item}</p>
                            <p className="text-xs text-gray-500">{item.portion}</p>
                          </div>
                          <span className="text-xs text-gray-500">{item.calories} cal</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="tips" className="p-4 space-y-4">
                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base text-green-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Do's
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    {DIET_PLANS.dos.map((tip, idx) => (
                      <p key={idx} className="text-sm py-1 text-green-800">✓ {tip}</p>
                    ))}
                  </CardContent>
                </Card>
                
                <Card className="border-red-200 bg-red-50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Don'ts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    {DIET_PLANS.donts.map((tip, idx) => (
                      <p key={idx} className="text-sm py-1 text-red-800">✗ {tip}</p>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
          
          <div className="p-3 bg-amber-50 border-t border-amber-200">
            <p className="text-xs text-amber-700 text-center">
              ⚠️ This is general guidance only. Please consult a dietitian for personalized diet plans.
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
              Tests are booked via Proton Diagnostics, our partner lab.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {DIABETIC_TESTS.map(test => (
              <Card key={test.id} className="border-purple-200 hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{test.name}</p>
                      <p className="text-sm text-gray-500">{test.description}</p>
                      <p className="text-xs text-purple-600 mt-1">Recommended: {test.frequency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Button 
            onClick={() => { setShowTests(false); navigate('/proton'); }}
            className="w-full bg-purple-600 hover:bg-purple-700 mt-4"
          >
            Book Tests via Proton Diagnostics
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            Nevika Cura does not conduct tests directly. All tests are performed by partner labs.
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
              Recognize these symptoms early and consult your doctor.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {WARNING_SIGNS.map((item, idx) => (
              <Card key={idx} className="border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-medium text-gray-800">{item.sign}</p>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card className="bg-blue-50 border-blue-200 mt-4">
            <CardContent className="p-4 text-center">
              <p className="text-blue-800 font-medium">
                🩺 If these symptoms persist, please consult your doctor immediately.
              </p>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Emergency Hypoglycemia Dialog */}
      <Dialog open={showEmergency} onOpenChange={setShowEmergency}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 bg-gradient-to-r from-red-500 to-red-600 text-white">
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Hypoglycemia Emergency Guide
            </DialogTitle>
            <DialogDescription className="text-red-100">
              What to do when blood sugar drops low
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 space-y-4">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-red-800 mb-2">What is Hypoglycemia?</h4>
                <p className="text-sm text-red-700">{HYPOGLYCEMIA_GUIDE.whatIs}</p>
              </CardContent>
            </Card>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Symptoms to Watch</h4>
              <div className="grid grid-cols-2 gap-2">
                {HYPOGLYCEMIA_GUIDE.symptoms.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2 rounded-lg text-sm ${
                      item.severity === 'danger' ? 'bg-red-100 text-red-800 font-medium' :
                      item.severity === 'severe' ? 'bg-orange-100 text-orange-800' :
                      item.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.symptom}
                  </div>
                ))}
              </div>
            </div>
            
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="py-3">
                <CardTitle className="text-base text-green-700">🚨 What To Do Immediately</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                {HYPOGLYCEMIA_GUIDE.immediateActions.map((action, idx) => (
                  <p key={idx} className="text-sm py-1 text-green-800">
                    {idx + 1}. {action}
                  </p>
                ))}
              </CardContent>
            </Card>
            
            <Card className="bg-red-100 border-red-300">
              <CardHeader className="py-3">
                <CardTitle className="text-base text-red-700">⚠️ If Person is Unconscious</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                {HYPOGLYCEMIA_GUIDE.dangerSigns.map((action, idx) => (
                  <p key={idx} className="text-sm py-1 text-red-800 font-medium">
                    • {action}
                  </p>
                ))}
              </CardContent>
            </Card>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 border-red-300 text-red-600"
                onClick={() => window.open('tel:112', '_self')}
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Emergency
              </Button>
              <Button 
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => window.open('tel:9403890429', '_self')}
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Clinic
              </Button>
            </div>
          </div>
          
          <div className="p-3 bg-gray-100 border-t">
            <p className="text-xs text-gray-600 text-center">
              ⚠️ This is emergency first-aid guidance, not medical treatment. Always seek professional help.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Omnia;
