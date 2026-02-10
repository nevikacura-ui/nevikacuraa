import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Calendar, Moon, Sun, Heart, AlertTriangle, CheckCircle2, 
  FlaskConical, Pill, Bell, MapPin, Users, Globe, Droplets, Clock,
  ChevronRight, Settings, RefreshCw, Shield, Sparkles, Activity
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Theme colors for religions (soft, respectful palettes)
const RELIGION_THEMES = {
  hindu: {
    primary: '#FF6B35',
    secondary: '#FFF3E0',
    gradient: 'from-orange-500/20 to-amber-500/20',
    accent: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700'
  },
  muslim: {
    primary: '#2E7D32',
    secondary: '#E8F5E9',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    accent: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700'
  },
  default: {
    primary: '#1976D2',
    secondary: '#E3F2FD',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    accent: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700'
  }
};

// Festival type icons and colors
const FESTIVAL_TYPE_CONFIG = {
  FASTING: { icon: '🌙', color: 'bg-purple-100 text-purple-700', label: 'Fasting' },
  CELEBRATION: { icon: '🎉', color: 'bg-amber-100 text-amber-700', label: 'Celebration' },
  NIGHT_VIGIL: { icon: '🌟', color: 'bg-indigo-100 text-indigo-700', label: 'Night Vigil' },
  DRY_FAST: { icon: '💧', color: 'bg-rose-100 text-rose-700', label: 'Dry Fast' },
  VEGETARIAN_PERIOD: { icon: '🌿', color: 'bg-green-100 text-green-700', label: 'Vegetarian' }
};

// Alert priority colors
const ALERT_PRIORITY = {
  1: { color: 'border-red-500 bg-red-50', icon: 'text-red-500' },
  2: { color: 'border-amber-500 bg-amber-50', icon: 'text-amber-500' },
  3: { color: 'border-blue-500 bg-blue-50', icon: 'text-blue-500' }
};

const FaithCare = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [religions, setReligions] = useState([]);
  const [communities, setCommunities] = useState([]);
  
  // Setup form state
  const [selectedReligion, setSelectedReligion] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [locationType, setLocationType] = useState('INDIA');
  const [chronicConditions, setChronicConditions] = useState([]);
  const [fastingPreference, setFastingPreference] = useState(true);
  
  // User ID (from localStorage or context)
  const userId = localStorage.getItem('patientToken') || localStorage.getItem('guestMobile') || 'guest_user';
  
  const theme = RELIGION_THEMES[selectedReligion] || RELIGION_THEMES.default;

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    setLoading(true);
    try {
      // Initialize LifeAlign data (seed data)
      await axios.post(`${API}/api/lifealign/init`);
      
      // Fetch religions
      const religionsRes = await axios.get(`${API}/api/lifealign/religions`);
      setReligions(religionsRes.data);
      
      // Fetch dashboard
      await fetchDashboard();
    } catch (error) {
      console.error('Error initializing LifeAlign:', error);
    }
    setLoading(false);
  };

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API}/api/lifealign/dashboard/${userId}`);
      setDashboard(res.data);
      
      if (res.data.setup_required) {
        setShowSetup(true);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setShowSetup(true);
    }
  };

  const handleReligionChange = async (religionId) => {
    setSelectedReligion(religionId);
    setSelectedCommunity('');
    
    if (religionId) {
      try {
        const res = await axios.get(`${API}/api/lifealign/communities/${religionId}`);
        setCommunities(res.data);
      } catch (error) {
        setCommunities([]);
      }
    } else {
      setCommunities([]);
    }
  };

  const saveProfile = async () => {
    if (!selectedReligion) {
      toast.error('Please select your tradition');
      return;
    }
    
    try {
      await axios.post(`${API}/api/lifealign/user/profile?user_id=${userId}`, {
        religion_id: selectedReligion,
        community_id: selectedCommunity || null,
        location_type: locationType,
        chronic_conditions: chronicConditions,
        fasting_preference: fastingPreference
      });
      
      toast.success('Profile saved successfully');
      setShowSetup(false);
      await fetchDashboard();
    } catch (error) {
      toast.error('Failed to save profile');
    }
  };

  const toggleCondition = (condition) => {
    setChronicConditions(prev => 
      prev.includes(condition) 
        ? prev.filter(c => c !== condition)
        : [...prev, condition]
    );
  };

  const currentTheme = dashboard?.user_religion 
    ? RELIGION_THEMES[dashboard.user_religion.toLowerCase()] || RELIGION_THEMES.default
    : RELIGION_THEMES.default;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading FaithCare...</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" data-testid="faithcare-page">
        {/* Header */}
        <header className={`sticky top-0 z-50 bg-slate-900 border-b border-slate-800`}>
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/')}
                  className="rounded-full text-white hover:bg-slate-800"
                  data-testid="faithcare-back-btn"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <img 
                  src="https://customer-assets.emergentagent.com/job_55d2778b-393f-4c6f-a4f0-366c7890154e/artifacts/rbodxuxv_file_00000000e2a47209b2515ab5afe77eeb.png"
                  alt="FaithCare"
                  className="h-12 w-auto object-contain"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSetup(true)}
                className="rounded-full text-white hover:bg-slate-800"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6">
          {/* Setup Required State */}
          {dashboard?.setup_required && (
            <Card className="p-8 text-center border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-slate-50">
              <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-4">
                <img 
                  src="https://customer-assets.emergentagent.com/job_55d2778b-393f-4c6f-a4f0-366c7890154e/artifacts/rbodxuxv_file_00000000e2a47209b2515ab5afe77eeb.png"
                  alt="FaithCare"
                  className="h-16 w-auto object-contain"
                />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Personalize Your Experience</h2>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Set up your cultural preferences to receive personalized health guidance during festivals and observances.
              </p>
              <Button 
                onClick={() => setShowSetup(true)}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Get Started
              </Button>
            </Card>
          )}

          {/* Dashboard Content */}
          {!dashboard?.setup_required && dashboard && (
            <div className="space-y-6">
              {/* User Context Card */}
              <Card className={`p-4 bg-gradient-to-r ${currentTheme.gradient} border-0`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center">
                      <Users className={`w-6 h-6 ${currentTheme.accent}`} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Your Profile</p>
                      <p className="font-bold text-slate-800">
                        {dashboard.user_religion}
                        {dashboard.user_community && ` • ${dashboard.user_community}`}
                      </p>
                    </div>
                  </div>
                  <Badge className={`${dashboard.location_type === 'INDIA' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                    {dashboard.location_type === 'INDIA' ? <MapPin className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                    {dashboard.location_type}
                  </Badge>
                </div>
              </Card>

              {/* Health Readiness Score */}
              <Card className="p-6 border-0 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-500" />
                    Health Readiness Score
                  </h3>
                  <span className={`text-3xl font-bold ${
                    dashboard.health_readiness_score >= 80 ? 'text-emerald-500' :
                    dashboard.health_readiness_score >= 50 ? 'text-amber-500' : 'text-red-500'
                  }`}>
                    {dashboard.health_readiness_score}%
                  </span>
                </div>
                <Progress 
                  value={dashboard.health_readiness_score} 
                  className="h-3 mb-4"
                />
                {dashboard.risk_flags.length > 0 && (
                  <div className="space-y-2">
                    {dashboard.risk_flags.map((flag, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded-lg">
                        <AlertTriangle className="w-4 h-4" />
                        {flag}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Active Festivals */}
              {dashboard.active_festivals.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-500" />
                    Currently Active
                  </h3>
                  {dashboard.active_festivals.map((festival) => {
                    const config = FESTIVAL_TYPE_CONFIG[festival.festival_type] || FESTIVAL_TYPE_CONFIG.CELEBRATION;
                    return (
                      <Card key={festival.festival_date_id} className="p-4 mb-3 border-l-4 border-l-purple-500 bg-purple-50/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{config.icon}</span>
                            <div>
                              <h4 className="font-bold text-slate-800">{festival.festival_name}</h4>
                              <p className="text-xs text-slate-500">
                                {festival.start_date} - {festival.end_date}
                              </p>
                            </div>
                          </div>
                          <Badge className={config.color}>{config.label}</Badge>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Health Alerts */}
              {dashboard.health_alerts.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-500" />
                    Health Alerts
                  </h3>
                  <div className="space-y-3">
                    {dashboard.health_alerts.slice(0, 5).map((alert) => {
                      const priorityConfig = ALERT_PRIORITY[alert.priority] || ALERT_PRIORITY[3];
                      return (
                        <Card key={alert.alert_id} className={`p-4 border-l-4 ${priorityConfig.color}`}>
                          <div className="flex items-start gap-3">
                            <AlertTriangle className={`w-5 h-5 mt-0.5 ${priorityConfig.icon}`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-slate-800">{alert.title}</h4>
                                {alert.festival_name && (
                                  <Badge variant="outline" className="text-xs">{alert.festival_name}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-600">{alert.message}</p>
                              {alert.tests && alert.tests.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {alert.tests.map((test, idx) => (
                                    <Badge key={idx} className="bg-teal-100 text-teal-700 text-xs">
                                      {test}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upcoming Festivals */}
              {dashboard.upcoming_festivals.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-teal-500" />
                    Upcoming Festivals
                  </h3>
                  <div className="space-y-3">
                    {dashboard.upcoming_festivals.map((festival) => {
                      const config = FESTIVAL_TYPE_CONFIG[festival.festival_type] || FESTIVAL_TYPE_CONFIG.CELEBRATION;
                      return (
                        <Card key={festival.festival_date_id} className="p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">
                                {config.icon}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800">{festival.festival_name}</h4>
                                <p className="text-xs text-slate-500">{festival.start_date}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={config.color}>{config.label}</Badge>
                              <p className="text-xs text-slate-500 mt-1">
                                {festival.days_remaining === 0 ? 'Today' : `${festival.days_remaining} days`}
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recommended Tests */}
              {dashboard.recommended_tests.length > 0 && (
                <Card className="p-4 border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-amber-600" />
                    Recommended Lab Tests
                  </h3>
                  <div className="space-y-2 mb-4">
                    {dashboard.recommended_tests.map((test, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl">
                        <div>
                          <p className="font-medium text-slate-800">{test.name}</p>
                          <p className="text-xs text-slate-500">{test.reason}</p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-amber-500" />
                      </div>
                    ))}
                  </div>
                  <Button 
                    onClick={() => navigate('/mango')}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                  >
                    Book Lab Tests
                  </Button>
                </Card>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => navigate('/mango')}
                  className="h-14 rounded-xl bg-amber-600 hover:bg-amber-700"
                >
                  <FlaskConical className="w-5 h-5 mr-2" />
                  Lab Tests
                </Button>
                <Button 
                  onClick={() => navigate('/pharmacy')}
                  className="h-14 rounded-xl bg-orange-500 hover:bg-orange-600"
                >
                  <Pill className="w-5 h-5 mr-2" />
                  Medicines
                </Button>
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-slate-400 text-center mt-8">
                FaithCare provides health guidance only. Always consult a healthcare professional for medical advice.
              </p>
            </div>
          )}
        </main>

        {/* Setup Dialog */}
        <Dialog open={showSetup} onOpenChange={setShowSetup}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-500" />
                Setup LifeAlign
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Religion Selection */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Your Tradition</label>
                <Select value={selectedReligion} onValueChange={handleReligionChange}>
                  <SelectTrigger data-testid="religion-select">
                    <SelectValue placeholder="Select your tradition" />
                  </SelectTrigger>
                  <SelectContent>
                    {religions.map((r) => (
                      <SelectItem key={r.religion_id} value={r.religion_id}>
                        {r.religion_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Community Selection */}
              {communities.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Community (Optional)</label>
                  <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                    <SelectTrigger data-testid="community-select">
                      <SelectValue placeholder="Select community" />
                    </SelectTrigger>
                    <SelectContent>
                      {communities.map((c) => (
                        <SelectItem key={c.community_id} value={c.community_id}>
                          {c.community_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Location Toggle */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Location</label>
                <div className="flex gap-2">
                  <Button
                    variant={locationType === 'INDIA' ? 'default' : 'outline'}
                    className={locationType === 'INDIA' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                    onClick={() => setLocationType('INDIA')}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    India
                  </Button>
                  <Button
                    variant={locationType === 'ABROAD' ? 'default' : 'outline'}
                    className={locationType === 'ABROAD' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                    onClick={() => setLocationType('ABROAD')}
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Abroad
                  </Button>
                </div>
              </div>

              {/* Health Conditions */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Health Conditions (for personalized guidance)</label>
                <div className="flex flex-wrap gap-2">
                  {['DIABETES', 'HYPERTENSION', 'CKD', 'HEART_DISEASE', 'PREGNANCY', 'ELDERLY'].map((condition) => (
                    <button
                      key={condition}
                      onClick={() => toggleCondition(condition)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        chronicConditions.includes(condition)
                          ? 'bg-red-100 border-red-300 text-red-700'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      {condition.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fasting Preference */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700">Fasting Preference</p>
                  <p className="text-xs text-slate-500">Receive fasting-related guidance</p>
                </div>
                <Switch 
                  checked={fastingPreference} 
                  onCheckedChange={setFastingPreference}
                />
              </div>

              <Button onClick={saveProfile} className="w-full bg-teal-600 hover:bg-teal-700">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
              
              <p className="text-xs text-slate-400 text-center">
                Your preferences help us provide culturally-relevant health guidance. 
                No theological commentary is provided.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AnimatedPage>
  );
};

export default LifeAlign;
