import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Baby, Plus, ArrowLeft, Calendar, Syringe, TrendingUp, FileText, 
  Bell, Heart, User, Shield, Activity, Scale, Ruler, 
  CheckCircle, Clock, AlertTriangle, ChevronRight, Trash2, Edit,
  Upload, Download, Eye, X, Settings, MessageCircle, Send,
  ShoppingCart, Package, Stethoscope, Thermometer, Search, Star,
  Filter, Minus, BookOpen, GraduationCap, Phone, Video, Pill, 
  Droplets, Eye as EyeIcon, Hand
} from 'lucide-react';
import Footer from '@/components/Footer';

const API = process.env.REACT_APP_BACKEND_URL;

// ALYNE Logo (same as home page)
const ALYNE_LOGO = "https://customer-assets.emergentagent.com/job_kids-health-portal/artifacts/mrmio3uk_file_000000006cd87207b39dc03d0e62d1ad%20%281%29.png";

const Alyne = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [activeSection, setActiveSection] = useState(null); // 'symptoms', 'chat', 'shop', 'education', 'dashboard', 'vaccines'

  // Form state for new child
  const [newChild, setNewChild] = useState({
    name: '',
    date_of_birth: '',
    gender: 'male',
    blood_group: '',
    region: 'india',
    aadhaar_number: '',
    uhid: '',
    insurance_provider: '',
    insurance_id: ''
  });

  useEffect(() => {
    if (user) {
      fetchChildren();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchChildren = async () => {
    try {
      const response = await fetch(`${API}/api/alyne/children/${user.id}`);
      const data = await response.json();
      setChildren(data.children || []);
      if (data.children && data.children.length > 0) {
        setSelectedChild(data.children[0]);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChild = async () => {
    if (!newChild.name || !newChild.date_of_birth) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const response = await fetch(`${API}/api/alyne/children?user_id=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChild)
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`${newChild.name}'s profile created!`);
        setShowAddChild(false);
        setNewChild({
          name: '', date_of_birth: '', gender: 'male', blood_group: '', region: 'india',
          aadhaar_number: '', uhid: '', insurance_provider: '', insurance_id: ''
        });
        fetchChildren();
      }
    } catch (error) {
      toast.error('Failed to add child');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => activeSection ? setActiveSection(null) : navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img src={ALYNE_LOGO} alt="ALYNE" className="h-10 w-auto" />
            </div>
            
            <div className="flex items-center gap-2">
              {user && children.length > 0 && (
                <Select 
                  value={selectedChild?.id || ''} 
                  onValueChange={(id) => setSelectedChild(children.find(c => c.id === id))}
                >
                  <SelectTrigger className="w-[150px] bg-teal-50 border-teal-200 rounded-full text-sm">
                    <SelectValue placeholder="Select child" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map(child => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.gender === 'male' ? '👦' : '👧'} {child.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {user && (
                <Button 
                  onClick={() => setShowAddChild(true)}
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 rounded-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Child
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
          </div>
        ) : activeSection ? (
          // Show selected section
          <div>
            {activeSection === 'symptoms' && <SymptomsSection child={selectedChild} />}
            {activeSection === 'chat' && <AIChatSection child={selectedChild} user={user} />}
            {activeSection === 'shop' && <KidsShopSection user={user} />}
            {activeSection === 'education' && <EducationSection />}
            {activeSection === 'dashboard' && selectedChild && <DashboardSection child={selectedChild} />}
            {activeSection === 'vaccines' && selectedChild && <VaccinationsSection child={selectedChild} />}
          </div>
        ) : (
          // Main toggle grid
          <div className="space-y-8">
            {/* Welcome Banner */}
            <div className="text-center">
              {selectedChild ? (
                <div className="p-4 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl text-white">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl">{selectedChild.gender === 'male' ? '👦' : '👧'}</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-white/80">Managing health for</p>
                      <h2 className="text-xl font-bold">{selectedChild.name}</h2>
                      <p className="text-xs text-white/70">{selectedChild.age_display} • {selectedChild.region === 'india' ? '🇮🇳 India' : '🇺🇸 USA'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Kids Health & Care</h1>
                  <p className="text-gray-500 text-sm mt-1">Your complete pediatric health companion</p>
                </div>
              )}
            </div>

            {/* Main Feature Toggles - Colorful Cards */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-4">What would you like help with?</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <FeatureToggle 
                  icon={<Stethoscope className="w-6 h-6" />}
                  title="Advice on"
                  subtitle="symptoms"
                  color="bg-gradient-to-br from-rose-400 to-pink-500"
                  onClick={() => setActiveSection('symptoms')}
                />
                <FeatureToggle 
                  icon={<Pill className="w-6 h-6" />}
                  title="Medication"
                  subtitle="guidance"
                  color="bg-gradient-to-br from-violet-400 to-purple-500"
                  onClick={() => setActiveSection('chat')}
                />
                <FeatureToggle 
                  icon={<Heart className="w-6 h-6" />}
                  title="Breast-feeding"
                  subtitle="support"
                  color="bg-gradient-to-br from-pink-400 to-rose-500"
                  onClick={() => setActiveSection('education')}
                />
                <FeatureToggle 
                  icon={<Thermometer className="w-6 h-6" />}
                  title="Fever & illness"
                  subtitle="care"
                  color="bg-gradient-to-br from-amber-400 to-orange-500"
                  onClick={() => setActiveSection('symptoms')}
                />
                <FeatureToggle 
                  icon={<Hand className="w-6 h-6" />}
                  title="Skin & nails"
                  subtitle="issues"
                  color="bg-gradient-to-br from-teal-400 to-cyan-500"
                  onClick={() => setActiveSection('symptoms')}
                />
                <FeatureToggle 
                  icon={<EyeIcon className="w-6 h-6" />}
                  title="Eyes & Vision"
                  subtitle="concerns"
                  color="bg-gradient-to-br from-blue-400 to-indigo-500"
                  onClick={() => setActiveSection('symptoms')}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <QuickAction 
                  icon={<MessageCircle className="w-5 h-5 text-amber-600" />}
                  title="Chat with ALYNE"
                  subtitle="24/7 AI Assistant"
                  bgColor="bg-amber-50"
                  borderColor="border-amber-200"
                  onClick={() => setActiveSection('chat')}
                />
                <QuickAction 
                  icon={<ShoppingCart className="w-5 h-5 text-teal-600" />}
                  title="Kids Shop"
                  subtitle="Baby essentials"
                  bgColor="bg-teal-50"
                  borderColor="border-teal-200"
                  onClick={() => setActiveSection('shop')}
                />
                <QuickAction 
                  icon={<BookOpen className="w-5 h-5 text-purple-600" />}
                  title="Health Education"
                  subtitle="Learn & grow"
                  bgColor="bg-purple-50"
                  borderColor="border-purple-200"
                  onClick={() => setActiveSection('education')}
                />
                <QuickAction 
                  icon={<Phone className="w-5 h-5 text-red-600" />}
                  title="Emergency"
                  subtitle="Get help now"
                  bgColor="bg-red-50"
                  borderColor="border-red-200"
                  onClick={() => navigate('/emergency')}
                />
              </div>
            </div>

            {/* Personalized Features - Only if child is added */}
            <div className="p-5 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl border border-teal-100">
              <h3 className="text-sm font-semibold text-teal-700 mb-4 flex items-center gap-2">
                <Baby className="w-4 h-4" />
                Personalized Child Health
              </h3>
              
              {selectedChild ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <PersonalizedCard 
                    icon={<Syringe className="w-5 h-5" />}
                    title="Vaccinations"
                    subtitle={`${selectedChild.region === 'india' ? 'IAP' : 'CDC'} Schedule`}
                    color="bg-blue-500"
                    onClick={() => setActiveSection('vaccines')}
                  />
                  <PersonalizedCard 
                    icon={<TrendingUp className="w-5 h-5" />}
                    title="Growth Tracker"
                    subtitle="WHO Percentiles"
                    color="bg-green-500"
                    onClick={() => setActiveSection('dashboard')}
                  />
                  <PersonalizedCard 
                    icon={<FileText className="w-5 h-5" />}
                    title="Documents"
                    subtitle="Health records"
                    color="bg-indigo-500"
                    onClick={() => setActiveSection('dashboard')}
                  />
                  <PersonalizedCard 
                    icon={<Bell className="w-5 h-5" />}
                    title="Reminders"
                    subtitle="Appointments"
                    color="bg-pink-500"
                    onClick={() => setActiveSection('dashboard')}
                  />
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <Baby className="w-7 h-7 text-teal-500" />
                  </div>
                  <p className="text-gray-600 text-sm mb-3">Add your child's profile to unlock personalized tracking</p>
                  {user ? (
                    <Button onClick={() => setShowAddChild(true)} className="bg-teal-600 hover:bg-teal-700 rounded-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Child Profile
                    </Button>
                  ) : (
                    <Button onClick={() => navigate('/')} className="bg-teal-600 hover:bg-teal-700 rounded-full">
                      Login to Get Started
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add Child Dialog */}
      <AddChildDialog 
        open={showAddChild} 
        onClose={() => setShowAddChild(false)}
        newChild={newChild}
        setNewChild={setNewChild}
        onSubmit={handleAddChild}
      />

      <Footer />
    </div>
  );
};

// Feature Toggle Card (Colorful)
const FeatureToggle = ({ icon, title, subtitle, color, onClick }) => (
  <button 
    onClick={onClick}
    className={`${color} text-white p-5 rounded-2xl text-left hover:opacity-90 transition-all hover:scale-105 shadow-lg`}
  >
    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
      {icon}
    </div>
    <p className="font-bold text-lg">{title}</p>
    <p className="text-sm text-white/80">{subtitle}</p>
  </button>
);

// Quick Action Card
const QuickAction = ({ icon, title, subtitle, bgColor, borderColor, onClick }) => (
  <button 
    onClick={onClick}
    className={`${bgColor} ${borderColor} border p-4 rounded-xl text-left hover:shadow-md transition-all`}
  >
    <div className="mb-2">{icon}</div>
    <p className="font-medium text-sm text-gray-800">{title}</p>
    <p className="text-xs text-gray-500">{subtitle}</p>
  </button>
);

// Personalized Card
const PersonalizedCard = ({ icon, title, subtitle, color, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white p-4 rounded-xl text-left hover:shadow-md transition-all border"
  >
    <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center text-white mb-2`}>
      {icon}
    </div>
    <p className="font-medium text-sm text-gray-800">{title}</p>
    <p className="text-xs text-gray-500">{subtitle}</p>
  </button>
);

// Add Child Dialog
const AddChildDialog = ({ open, onClose, newChild, setNewChild, onSubmit }) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center">
            <Baby className="w-5 h-5 text-white" />
          </div>
          Add Child Profile
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setNewChild({...newChild, region: 'india'})}
            className={`p-4 rounded-xl border-2 transition-all ${newChild.region === 'india' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}
          >
            <span className="text-3xl block mb-1">🇮🇳</span>
            <span className="font-medium">India</span>
            <p className="text-xs text-gray-500">IAP Schedule</p>
          </button>
          <button
            onClick={() => setNewChild({...newChild, region: 'usa'})}
            className={`p-4 rounded-xl border-2 transition-all ${newChild.region === 'usa' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}
          >
            <span className="text-3xl block mb-1">🇺🇸</span>
            <span className="font-medium">USA</span>
            <p className="text-xs text-gray-500">CDC Schedule</p>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Child's Name *</Label>
            <Input value={newChild.name} onChange={(e) => setNewChild({...newChild, name: e.target.value})} placeholder="Enter name" />
          </div>
          <div>
            <Label>Date of Birth *</Label>
            <Input type="date" value={newChild.date_of_birth} onChange={(e) => setNewChild({...newChild, date_of_birth: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Gender</Label>
            <Select value={newChild.gender} onValueChange={(v) => setNewChild({...newChild, gender: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">👦 Male</SelectItem>
                <SelectItem value="female">👧 Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Blood Group</Label>
            <Select value={newChild.blood_group} onValueChange={(v) => setNewChild({...newChild, blood_group: v})}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                  <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />Add Child
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Symptoms Section
const SymptomsSection = ({ child }) => {
  const [symptoms, setSymptoms] = useState([]);
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [symptomDetails, setSymptomDetails] = useState(null);

  useEffect(() => { fetchSymptoms(); }, []);

  const fetchSymptoms = async () => {
    try {
      const res = await fetch(`${API}/api/alyne/symptoms`);
      const data = await res.json();
      setSymptoms(data.symptoms || []);
    } catch (e) { console.error(e); }
  };

  const fetchDetails = async (id) => {
    try {
      const region = child?.region || 'india';
      const res = await fetch(`${API}/api/alyne/symptoms/${id}?region=${region}`);
      const data = await res.json();
      setSymptomDetails(data);
      setSelectedSymptom(id);
    } catch (e) { console.error(e); }
  };

  const colors = {
    sore_throat: 'bg-gradient-to-br from-orange-400 to-orange-500',
    cough: 'bg-gradient-to-br from-blue-400 to-blue-500',
    skin_rash: 'bg-gradient-to-br from-red-400 to-red-500',
    fever: 'bg-gradient-to-br from-amber-400 to-yellow-500',
    vomiting: 'bg-gradient-to-br from-purple-400 to-purple-500',
    diarrhea: 'bg-gradient-to-br from-teal-400 to-teal-500'
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">Symptom Checker</h2>
        <p className="text-sm text-gray-500">Select a symptom to get guidance</p>
      </div>

      <div className="p-3 bg-amber-50 rounded-xl text-center">
        <p className="text-xs text-amber-700">⚠️ This is general guidance only. Always consult your pediatrician.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {symptoms.map((s) => (
          <button
            key={s.id}
            onClick={() => fetchDetails(s.id)}
            className={`${colors[s.id] || 'bg-gray-400'} text-white p-5 rounded-2xl text-left hover:opacity-90 transition-all hover:scale-105 shadow-lg ${selectedSymptom === s.id ? 'ring-4 ring-white ring-offset-2' : ''}`}
          >
            <span className="text-3xl block mb-2">{s.icon}</span>
            <p className="font-bold">{s.name}</p>
            <p className="text-xs text-white/80">{s.description}</p>
          </button>
        ))}
      </div>

      {symptomDetails && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{symptomDetails.symptom.icon}</span>
              {symptomDetails.symptom.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">🏠 Home Care Tips</h4>
              <ul className="space-y-2">
                {symptomDetails.symptom.home_care.map((tip, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-red-50 rounded-xl">
              <h4 className="font-semibold text-sm text-red-700 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                When to See a Doctor
              </h4>
              <ul className="space-y-1">
                {symptomDetails.symptom.when_to_see_doctor.map((item, i) => (
                  <li key={i} className="text-sm text-red-600">• {item}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-teal-50 rounded-xl">
              <h4 className="font-semibold text-sm text-teal-700 mb-2">
                {child?.region === 'usa' ? '🇺🇸 CDC Guidelines' : '🇮🇳 IAP Guidelines'}
              </h4>
              <p className="text-sm text-gray-600">{symptomDetails.primary_guidelines}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// AI Chat Section
const AIChatSection = ({ child, user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`chat_${Date.now()}`);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/alyne/chat?user_id=${user?.id || 'guest'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, child_id: child?.id, session_id: sessionId })
      });
      const data = await res.json();
      if (data.success) setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (e) { toast.error('Chat unavailable'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Chat with ALYNE
          </CardTitle>
          <CardDescription className="text-white/80">24/7 AI pediatric health assistant</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[400px] overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <MessageCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                <p className="text-gray-600">Hi! I'm ALYNE. Ask me anything about child health!</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {["Signs of teething?", "How to handle fever?", "When to start solids?"].map((q, i) => (
                    <button key={i} onClick={() => setInput(q)} className="text-xs px-3 py-2 bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200">{q}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-amber-500 text-white rounded-br-none' : 'bg-white border rounded-bl-none'}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border p-3 rounded-2xl rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about child health..." onKeyPress={(e) => e.key === 'Enter' && sendMessage()} />
              <Button onClick={sendMessage} disabled={loading} className="bg-amber-500 hover:bg-amber-600"><Send className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Kids Shop Section
const KidsShopSection = ({ user }) => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => { fetchCategories(); fetchProducts(); }, []);

  const fetchCategories = async () => {
    try { const res = await fetch(`${API}/api/alyne/shop/categories`); const data = await res.json(); setCategories(data.categories || []); } catch (e) {}
  };

  const fetchProducts = async (cat = null) => {
    setLoading(true);
    try { 
      const url = cat ? `${API}/api/alyne/shop/products?category=${cat}` : `${API}/api/alyne/shop/products`;
      const res = await fetch(url); const data = await res.json(); setProducts(data.products || []); 
    } catch (e) {}
    finally { setLoading(false); }
  };

  const addToCart = (p) => {
    setCart(prev => {
      const ex = prev.find(x => x.id === p.id);
      if (ex) return prev.map(x => x.id === p.id ? {...x, quantity: x.quantity + 1} : x);
      return [...prev, {...p, quantity: 1}];
    });
    toast.success('Added to cart');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Kids Shop</h2>
          <p className="text-sm text-gray-500">by Orange Pharmacy</p>
        </div>
        <Button variant="outline" onClick={() => setShowCart(true)} className="relative">
          <ShoppingCart className="w-4 h-4 mr-1" />Cart
          {cart.length > 0 && <Badge className="absolute -top-2 -right-2 bg-rose-500">{cart.reduce((s, i) => s + i.quantity, 0)}</Badge>}
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => { setSelectedCat(null); fetchProducts(); }} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${!selectedCat ? 'bg-teal-600 text-white' : 'bg-white border'}`}>All</button>
        {categories.map(c => (
          <button key={c.id} onClick={() => { setSelectedCat(c.id); fetchProducts(c.id); }} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap flex items-center gap-1 ${selectedCat === c.id ? 'bg-teal-600 text-white' : 'bg-white border'}`}>
            <span>{c.icon}</span>{c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading ? [...Array(8)].map((_, i) => <div key={i} className="bg-gray-100 rounded-xl h-40 animate-pulse"></div>) : products.map(p => (
          <Card key={p.id} className="border shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-3">
              <div className="w-full h-16 bg-gray-100 rounded-lg mb-2 flex items-center justify-center"><Package className="w-8 h-8 text-gray-300" /></div>
              {p.bestseller && <Badge className="bg-rose-500 text-xs mb-1">Bestseller</Badge>}
              <h4 className="font-medium text-xs line-clamp-2">{p.name}</h4>
              <p className="text-xs text-gray-400">{p.brand}</p>
              <div className="flex items-center justify-between mt-2">
                <div><p className="font-bold text-teal-600">₹{p.price}</p><p className="text-xs text-gray-400 line-through">₹{p.mrp}</p></div>
                <Button size="sm" onClick={() => addToCart(p)} className="bg-teal-600 h-7 w-7 p-0"><Plus className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent>
          <DialogHeader><DialogTitle>Your Cart</DialogTitle></DialogHeader>
          {cart.length === 0 ? (
            <div className="text-center py-8"><ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Cart is empty</p></div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"><Package className="w-8 h-8 text-gray-400" /><div className="flex-1"><p className="font-medium text-sm">{item.name}</p><p className="text-xs text-gray-500">₹{item.price} × {item.quantity}</p></div><p className="font-bold">₹{item.price * item.quantity}</p></div>)}
              <div className="border-t pt-3 flex justify-between font-bold"><span>Total</span><span className="text-teal-600">₹{cart.reduce((s, i) => s + i.price * i.quantity, 0)}</span></div>
              <Button className="w-full bg-teal-600" onClick={() => { toast.success('Order placed!'); setCart([]); setShowCart(false); }}>Place Order</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Education Section
const EducationSection = () => {
  const topics = [
    { title: "Newborn Care", icon: "👶", desc: "Essential care tips", articles: 12 },
    { title: "Breastfeeding", icon: "🍼", desc: "Benefits & techniques", articles: 8 },
    { title: "Starting Solids", icon: "🥣", desc: "6+ months guide", articles: 15 },
    { title: "Sleep Training", icon: "😴", desc: "Healthy sleep habits", articles: 10 },
    { title: "Milestones", icon: "🎯", desc: "Development tracker", articles: 20 },
    { title: "Common Illnesses", icon: "🏥", desc: "What to know", articles: 25 },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">Health Education</h2>
        <p className="text-sm text-gray-500">Learn about child health & development</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {topics.map((t, i) => (
          <Card key={i} className="hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-4">
              <span className="text-3xl block mb-2">{t.icon}</span>
              <h3 className="font-semibold text-sm">{t.title}</h3>
              <p className="text-xs text-gray-500">{t.desc}</p>
              <p className="text-xs text-purple-600 mt-2">{t.articles} articles</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Dashboard Section
const DashboardSection = ({ child }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboard(); }, [child.id]);

  const fetchDashboard = async () => {
    try { const res = await fetch(`${API}/api/alyne/dashboard/${child.id}`); const data = await res.json(); setDashboard(data); } catch (e) {}
    finally { setLoading(false); }
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  const vax = dashboard?.vaccination_stats || { done: 0, due: 0, overdue: 0, total: 0 };
  const progress = vax.total > 0 ? Math.round((vax.done / vax.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-3xl">{child.gender === 'male' ? '👦' : '👧'}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{child.name}</h2>
              <p className="text-white/80 text-sm">{child.age_display}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{progress}%</p>
              <p className="text-xs text-white/80">Vaccinated</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-3">
        <div className="text-center p-4 bg-green-50 rounded-xl"><CheckCircle className="w-6 h-6 text-green-500 mx-auto" /><p className="text-xl font-bold text-green-600">{vax.done}</p><p className="text-xs text-gray-500">Done</p></div>
        <div className="text-center p-4 bg-yellow-50 rounded-xl"><Clock className="w-6 h-6 text-yellow-500 mx-auto" /><p className="text-xl font-bold text-yellow-600">{vax.due}</p><p className="text-xs text-gray-500">Due</p></div>
        <div className="text-center p-4 bg-red-50 rounded-xl"><AlertTriangle className="w-6 h-6 text-red-500 mx-auto" /><p className="text-xl font-bold text-red-600">{vax.overdue}</p><p className="text-xs text-gray-500">Overdue</p></div>
        <div className="text-center p-4 bg-blue-50 rounded-xl"><FileText className="w-6 h-6 text-blue-500 mx-auto" /><p className="text-xl font-bold text-blue-600">{dashboard?.document_count || 0}</p><p className="text-xs text-gray-500">Docs</p></div>
      </div>

      {dashboard?.latest_growth && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-teal-50 rounded-xl text-center"><Ruler className="w-5 h-5 text-teal-600 mx-auto" /><p className="text-lg font-bold text-teal-700">{dashboard.latest_growth.height_cm || '--'} cm</p><p className="text-xs text-gray-500">Height</p></div>
          <div className="p-4 bg-amber-50 rounded-xl text-center"><Scale className="w-5 h-5 text-amber-600 mx-auto" /><p className="text-lg font-bold text-amber-700">{dashboard.latest_growth.weight_kg || '--'} kg</p><p className="text-xs text-gray-500">Weight</p></div>
          <div className="p-4 bg-gray-50 rounded-xl text-center"><Calendar className="w-5 h-5 text-gray-600 mx-auto" /><p className="text-sm font-bold text-gray-700">{dashboard.latest_growth.date}</p><p className="text-xs text-gray-500">Recorded</p></div>
        </div>
      )}
    </div>
  );
};

// Vaccinations Section
const VaccinationsSection = ({ child }) => {
  const [vaccinations, setVaccinations] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchVaccinations(); }, [child.id]);

  const fetchVaccinations = async () => {
    try { const res = await fetch(`${API}/api/alyne/vaccinations/${child.id}`); const data = await res.json(); setVaccinations(data.vaccinations || []); setStats(data.stats || {}); } catch (e) {}
    finally { setLoading(false); }
  };

  const updateVax = async (id, status) => {
    try {
      await fetch(`${API}/api/alyne/vaccinations/${id}?status=${status}&administered_date=${new Date().toISOString().split('T')[0]}`, { method: 'PUT' });
      toast.success('Updated!');
      fetchVaccinations();
    } catch (e) {}
  };

  const filtered = filter === 'all' ? vaccinations : vaccinations.filter(v => v.status === filter);
  const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex justify-between mb-2"><span className="font-medium">Progress</span><span className="font-bold text-teal-600">{progress}%</span></div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {['all', 'due', 'overdue', 'done'].map(f => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className={filter === f ? 'bg-teal-600' : ''}>
            {f.charAt(0).toUpperCase() + f.slice(1)} {f !== 'all' && `(${stats[f] || 0})`}
          </Button>
        ))}
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {loading ? <p className="text-center py-8">Loading...</p> : filtered.length === 0 ? <p className="text-center py-8 text-gray-500">No vaccinations</p> : (
          filtered.slice(0, 20).map((v) => (
            <Card key={v.id} className={`border-l-4 ${v.status === 'overdue' ? 'border-red-500' : v.status === 'due' ? 'border-yellow-500' : v.status === 'done' ? 'border-green-500' : 'border-blue-500'}`}>
              <CardContent className="p-3 flex items-center gap-3">
                <Syringe className={`w-5 h-5 ${v.status === 'done' ? 'text-green-500' : v.status === 'overdue' ? 'text-red-500' : 'text-yellow-500'}`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{v.vaccine_name} <Badge variant="outline" className="ml-1 text-xs">{v.dose}</Badge></p>
                  <p className="text-xs text-gray-500">{v.scheduled_date}</p>
                </div>
                {v.status !== 'done' && <Button size="sm" onClick={() => updateVax(v.id, 'done')} className="bg-green-500 text-xs">Done</Button>}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Alyne;
