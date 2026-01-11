import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { 
  ArrowLeft, Heart, Calendar, MessageCircle, Bell, 
  Sparkles, Activity, Baby, Flower2, Users, Send,
  ChevronRight, Plus, Trash2, Clock
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Evara = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showPeriodLog, setShowPeriodLog] = useState(false);
  const [activeProgram, setActiveProgram] = useState(null);
  const [programContent, setProgramContent] = useState(null);
  
  // Onboarding form state
  const [onboardingData, setOnboardingData] = useState({
    age: '',
    marital_status: '',
    pregnancy_status: 'no',
    menstrual_status: 'regular',
    known_conditions: [],
    weight: '',
    height: '',
    lifestyle_goals: [],
    preferred_language: 'English'
  });
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  // Reminders state
  const [reminders, setReminders] = useState([]);
  const [newReminder, setNewReminder] = useState({
    type: 'wellness_checkin',
    title: '',
    message: '',
    scheduled_date: '',
    scheduled_time: '09:00',
    is_recurring: false
  });
  
  // Period tracking state
  const [periodData, setPeriodData] = useState({
    start_date: '',
    flow: 'medium',
    symptoms: [],
    notes: ''
  });
  const [periodHistory, setPeriodHistory] = useState([]);

  const conditions = ['PCOS', 'Thyroid', 'Diabetes', 'Endometriosis', 'Fibroids'];
  const goals = ['Weight Management', 'Stress Relief', 'Better Sleep', 'Hormonal Balance', 'Fertility', 'General Wellness'];
  const symptoms = ['Cramps', 'Bloating', 'Mood Swings', 'Headache', 'Fatigue', 'Back Pain', 'Breast Tenderness'];

  useEffect(() => {
    fetchProfile();
    fetchPrograms();
  }, []);

  const fetchProfile = async () => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/api/evara/profile`, { headers });
      const data = await res.json();
      
      if (data.has_profile) {
        setProfile(data.profile);
        setPrograms(data.programs || []);
      } else {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await fetch(`${API_URL}/api/evara/programs`);
      const data = await res.json();
      if (!profile) {
        setPrograms(data.programs || []);
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  };

  const handleOnboarding = async () => {
    if (!onboardingData.age || !onboardingData.pregnancy_status || !onboardingData.menstrual_status) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
      
      const res = await fetch(`${API_URL}/api/evara/onboarding`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...onboardingData,
          age: parseInt(onboardingData.age),
          weight: onboardingData.weight ? parseFloat(onboardingData.weight) : null,
          height: onboardingData.height ? parseFloat(onboardingData.height) : null
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setPrograms(data.assigned_programs || []);
        setShowOnboarding(false);
        toast.success('Welcome to Evara! Your wellness journey begins now.');
      }
    } catch (error) {
      toast.error('Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const fetchProgramContent = async (programId) => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/api/evara/program/${programId}/content`, { headers });
      const data = await res.json();
      setProgramContent(data);
      setActiveProgram(programId);
    } catch (error) {
      toast.error('Failed to load program content');
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };
      
      const res = await fetch(`${API_URL}/api/evara/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId
        })
      });
      
      const data = await res.json();
      setSessionId(data.session_id);
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setChatLoading(false);
    }
  };

  const fetchReminders = async () => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/api/evara/reminders`, { headers });
      const data = await res.json();
      setReminders(data.reminders || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const createReminder = async () => {
    if (!newReminder.title || !newReminder.scheduled_date) {
      toast.error('Please fill in title and date');
      return;
    }
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      const res = await fetch(`${API_URL}/api/evara/reminders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newReminder)
      });
      
      if (res.ok) {
        toast.success('Reminder created!');
        fetchReminders();
        setNewReminder({
          type: 'wellness_checkin',
          title: '',
          message: '',
          scheduled_date: '',
          scheduled_time: '09:00',
          is_recurring: false
        });
      }
    } catch (error) {
      toast.error('Failed to create reminder');
    }
  };

  const logPeriod = async () => {
    if (!periodData.start_date) {
      toast.error('Please select start date');
      return;
    }
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      const params = new URLSearchParams({
        start_date: periodData.start_date,
        flow: periodData.flow,
        ...(periodData.notes && { notes: periodData.notes })
      });
      
      if (periodData.symptoms.length > 0) {
        periodData.symptoms.forEach(s => params.append('symptoms', s));
      }
      
      const res = await fetch(`${API_URL}/api/evara/period/log?${params}`, {
        method: 'POST',
        headers
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Period logged! Next predicted: ${data.next_predicted}`);
        fetchPeriodHistory();
        setPeriodData({ start_date: '', flow: 'medium', symptoms: [], notes: '' });
      }
    } catch (error) {
      toast.error('Failed to log period');
    }
  };

  const fetchPeriodHistory = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${API_URL}/api/evara/period/history`, { headers });
      const data = await res.json();
      setPeriodHistory(data);
    } catch (error) {
      console.error('Error fetching period history:', error);
    }
  };

  const getProgramIcon = (programId) => {
    const icons = {
      menstrual_health: <Calendar className="w-6 h-6 text-pink-500" />,
      pcos_hormonal: <Activity className="w-6 h-6 text-purple-500" />,
      pregnancy_support: <Baby className="w-6 h-6 text-blue-500" />,
      menopause_care: <Flower2 className="w-6 h-6 text-rose-500" />,
      wellness_community: <Users className="w-6 h-6 text-green-500" />
    };
    return icons[programId] || <Heart className="w-6 h-6 text-pink-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <img src="/icons/evara-logo.png" alt="Evara" className="w-24 h-24 rounded-2xl" />
          <p className="mt-4 text-pink-600">Loading your wellness space...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-pink-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-pink-50 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/icons/evara-logo.png" alt="Evara" className="w-10 h-10 rounded-xl" />
            <div>
              <h1 className="font-semibold text-gray-800">Evara</h1>
              <p className="text-xs text-pink-600">Women's Wellness</p>
            </div>
          </div>
          <button 
            onClick={() => { setShowChat(true); }}
            className="p-2 bg-pink-100 hover:bg-pink-200 rounded-full transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-pink-600" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome Section */}
        {profile && (
          <Card className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-full">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Welcome back!</h2>
                  <p className="text-white/80 text-sm">Your personalized wellness journey continues</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => { setShowChat(true); }}
            className="p-4 bg-white rounded-xl shadow-sm border border-pink-100 hover:border-pink-300 transition-all flex flex-col items-center gap-2"
          >
            <MessageCircle className="w-6 h-6 text-pink-500" />
            <span className="text-xs text-gray-600">Chat with Evara</span>
          </button>
          <button 
            onClick={() => { setShowReminders(true); fetchReminders(); }}
            className="p-4 bg-white rounded-xl shadow-sm border border-pink-100 hover:border-pink-300 transition-all flex flex-col items-center gap-2"
          >
            <Bell className="w-6 h-6 text-purple-500" />
            <span className="text-xs text-gray-600">Reminders</span>
          </button>
          <button 
            onClick={() => { setShowPeriodLog(true); fetchPeriodHistory(); }}
            className="p-4 bg-white rounded-xl shadow-sm border border-pink-100 hover:border-pink-300 transition-all flex flex-col items-center gap-2"
          >
            <Calendar className="w-6 h-6 text-rose-500" />
            <span className="text-xs text-gray-600">Period Tracker</span>
          </button>
        </div>

        {/* My Programs */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Your Programs</h3>
          <div className="space-y-3">
            {programs.map((program) => (
              <Card 
                key={program.id} 
                className="cursor-pointer hover:shadow-md transition-all border-pink-100"
                onClick={() => fetchProgramContent(program.id)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-50 rounded-lg">
                      {getProgramIcon(program.id)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{program.name}</h4>
                      <p className="text-sm text-gray-500">{program.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <p className="text-sm text-amber-800">
              <strong>Disclaimer:</strong> Evara provides wellness education and support. 
              It does not replace professional medical consultation. For any health concerns, 
              please consult a healthcare provider.
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Onboarding Dialog */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Welcome to Evara
            </DialogTitle>
            <DialogDescription>
              Let's personalize your wellness journey. Tell us about yourself.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Age *</Label>
              <Input 
                type="number" 
                placeholder="Your age"
                value={onboardingData.age}
                onChange={(e) => setOnboardingData({...onboardingData, age: e.target.value})}
              />
            </div>
            
            <div>
              <Label>Pregnancy Status *</Label>
              <Select 
                value={onboardingData.pregnancy_status}
                onValueChange={(v) => setOnboardingData({...onboardingData, pregnancy_status: v})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">Not Pregnant</SelectItem>
                  <SelectItem value="yes">Currently Pregnant</SelectItem>
                  <SelectItem value="planning">Planning Pregnancy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Menstrual Status *</Label>
              <Select 
                value={onboardingData.menstrual_status}
                onValueChange={(v) => setOnboardingData({...onboardingData, menstrual_status: v})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular Periods</SelectItem>
                  <SelectItem value="irregular">Irregular Periods</SelectItem>
                  <SelectItem value="menopausal">Menopausal/Post-Menopausal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Known Conditions (Optional)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {conditions.map((condition) => (
                  <label key={condition} className="flex items-center gap-2 text-sm">
                    <Checkbox 
                      checked={onboardingData.known_conditions.includes(condition)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setOnboardingData({...onboardingData, known_conditions: [...onboardingData.known_conditions, condition]});
                        } else {
                          setOnboardingData({...onboardingData, known_conditions: onboardingData.known_conditions.filter(c => c !== condition)});
                        }
                      }}
                    />
                    {condition}
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <Label>Wellness Goals (Optional)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {goals.map((goal) => (
                  <label key={goal} className="flex items-center gap-2 text-sm">
                    <Checkbox 
                      checked={onboardingData.lifestyle_goals.includes(goal)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setOnboardingData({...onboardingData, lifestyle_goals: [...onboardingData.lifestyle_goals, goal]});
                        } else {
                          setOnboardingData({...onboardingData, lifestyle_goals: onboardingData.lifestyle_goals.filter(g => g !== goal)});
                        }
                      }}
                    />
                    {goal}
                  </label>
                ))}
              </div>
            </div>
            
            <Button 
              onClick={handleOnboarding} 
              className="w-full bg-pink-500 hover:bg-pink-600"
              disabled={loading}
            >
              {loading ? 'Setting up...' : 'Start My Journey'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="max-w-md h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b bg-gradient-to-r from-pink-500 to-purple-500 text-white">
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Chat with Evara
            </DialogTitle>
            <DialogDescription className="text-white/80">
              Your compassionate wellness companion
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Heart className="w-12 h-12 mx-auto text-pink-300 mb-2" />
                  <p>Hi! I'm Evara, your wellness companion.</p>
                  <p className="text-sm">Ask me anything about women's health!</p>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-pink-500 text-white rounded-br-sm' 
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                      <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                      <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t flex gap-2">
            <Input 
              placeholder="Type your message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              className="flex-1"
            />
            <Button 
              onClick={sendChatMessage} 
              disabled={chatLoading || !chatInput.trim()}
              className="bg-pink-500 hover:bg-pink-600"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reminders Dialog */}
      <Dialog open={showReminders} onOpenChange={setShowReminders}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-500" />
              Wellness Reminders
            </DialogTitle>
          </DialogHeader>
          
          {user ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <Input 
                  placeholder="Reminder title"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                />
                <Input 
                  type="date"
                  value={newReminder.scheduled_date}
                  onChange={(e) => setNewReminder({...newReminder, scheduled_date: e.target.value})}
                />
                <Button onClick={createReminder} className="w-full bg-purple-500 hover:bg-purple-600">
                  <Plus className="w-4 h-4 mr-2" /> Add Reminder
                </Button>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Your Reminders</h4>
                {reminders.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No reminders yet</p>
                ) : (
                  reminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-500" />
                        <div>
                          <p className="font-medium text-sm">{reminder.title}</p>
                          <p className="text-xs text-gray-500">{reminder.scheduled_date}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">Please login to manage reminders</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Period Tracker Dialog */}
      <Dialog open={showPeriodLog} onOpenChange={setShowPeriodLog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-500" />
              Period Tracker
            </DialogTitle>
          </DialogHeader>
          
          {user ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label>Period Start Date</Label>
                  <Input 
                    type="date"
                    value={periodData.start_date}
                    onChange={(e) => setPeriodData({...periodData, start_date: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>Flow</Label>
                  <Select 
                    value={periodData.flow}
                    onValueChange={(v) => setPeriodData({...periodData, flow: v})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="heavy">Heavy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Symptoms</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {symptoms.map((symptom) => (
                      <label key={symptom} className="flex items-center gap-1 text-sm">
                        <Checkbox 
                          checked={periodData.symptoms.includes(symptom)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPeriodData({...periodData, symptoms: [...periodData.symptoms, symptom]});
                            } else {
                              setPeriodData({...periodData, symptoms: periodData.symptoms.filter(s => s !== symptom)});
                            }
                          }}
                        />
                        {symptom}
                      </label>
                    ))}
                  </div>
                </div>
                
                <Button onClick={logPeriod} className="w-full bg-rose-500 hover:bg-rose-600">
                  Log Period
                </Button>
              </div>
              
              {periodHistory.next_predicted && (
                <Card className="bg-pink-50 border-pink-200">
                  <CardContent className="p-3">
                    <p className="text-sm text-pink-800">
                      <strong>Next predicted period:</strong> {periodHistory.next_predicted}
                    </p>
                    <p className="text-xs text-pink-600">
                      Average cycle: {periodHistory.average_cycle_length || 28} days
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">Please login to track your period</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Program Content Dialog */}
      <Dialog open={!!activeProgram} onOpenChange={() => { setActiveProgram(null); setProgramContent(null); }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          {programContent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getProgramIcon(activeProgram)}
                  {programContent.program?.name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Overview</h4>
                  <p className="text-sm text-gray-600">{programContent.content?.overview}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Tips</h4>
                  <ul className="space-y-2">
                    {programContent.content?.tips?.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-pink-500">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Card className="bg-gradient-to-r from-pink-100 to-purple-100 border-0">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-purple-800">💡 Daily Tip</p>
                    <p className="text-sm text-purple-700">{programContent.content?.daily_tip}</p>
                  </CardContent>
                </Card>
                
                <div className="text-center">
                  <p className="text-sm text-pink-600 italic">{programContent.content?.motivation}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Evara;
