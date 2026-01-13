import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Baby, Plus, ArrowLeft, Calendar, Syringe, TrendingUp, FileText, 
  Bell, Heart, User, Shield, Activity, Scale, Ruler, 
  CheckCircle, Clock, AlertTriangle, ChevronRight, Trash2, Edit,
  Upload, Download, Eye, X, Settings, MessageCircle, Send,
  ShoppingCart, Package, Stethoscope, Thermometer, Search, Star,
  Filter, Minus, BookOpen, GraduationCap, Phone, Video
} from 'lucide-react';
import Footer from '@/components/Footer';

const API = process.env.REACT_APP_BACKEND_URL;

// ALYNE Background Image
const ALYNE_BG = "https://customer-assets.emergentagent.com/job_kids-health-portal/artifacts/666xwwy0_file_000000000f6872088a12ba2dede24f49.png";

const Alyne = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

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
    insurance_id: '',
    allergies: [],
    medical_conditions: []
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
        toast.success(`${newChild.name}'s profile created with ${data.vaccinations_count} vaccinations scheduled!`);
        setShowAddChild(false);
        setNewChild({
          name: '', date_of_birth: '', gender: 'male', blood_group: '', region: 'india',
          aadhaar_number: '', uhid: '', insurance_provider: '', insurance_id: '',
          allergies: [], medical_conditions: []
        });
        fetchChildren();
        setActiveTab('dashboard');
      }
    } catch (error) {
      toast.error('Failed to add child');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Hero Section with Background */}
      <div 
        className="relative min-h-[300px] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${ALYNE_BG})` }}
      >
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a1628]"></div>
        
        {/* Header */}
        <header className="relative z-10 px-4 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')} 
              className="text-white hover:bg-white/20 rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-3">
              {user && children.length > 0 && (
                <Select 
                  value={selectedChild?.id || ''} 
                  onValueChange={(id) => {
                    const child = children.find(c => c.id === id);
                    setSelectedChild(child);
                  }}
                >
                  <SelectTrigger className="w-[180px] bg-white/20 border-white/30 text-white rounded-full">
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
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-full"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Child
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Welcome Text on Hero */}
        <div className="relative z-10 text-center pt-8 pb-20 px-4">
          {user && selectedChild ? (
            <div className="text-white">
              <p className="text-white/80 text-sm">Welcome back!</p>
              <h1 className="text-2xl font-bold mt-1">Managing {selectedChild.name}'s Health</h1>
              <p className="text-white/70 text-sm mt-1">{selectedChild.age_display} • {selectedChild.region === 'india' ? '🇮🇳 India' : '🇺🇸 USA'}</p>
            </div>
          ) : (
            <div className="text-white">
              <h1 className="text-2xl font-bold">Kids Health & Care</h1>
              <p className="text-white/80 text-sm mt-2">Your complete pediatric health companion</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Pull up over hero */}
      <main className="max-w-7xl mx-auto px-4 -mt-16 relative z-20 pb-8">
        {/* Quick Action Cards - Always visible */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <QuickActionCard 
            icon={<Stethoscope className="w-5 h-5" />}
            title="Check Symptoms"
            subtitle="IAP & CDC Guidelines"
            color="bg-gradient-to-br from-pink-500 to-rose-500"
            onClick={() => setActiveTab('symptoms')}
          />
          <QuickActionCard 
            icon={<MessageCircle className="w-5 h-5" />}
            title="Chat with ALYNE"
            subtitle="24/7 AI Assistant"
            color="bg-gradient-to-br from-amber-400 to-yellow-500"
            onClick={() => setActiveTab('chat')}
          />
          <QuickActionCard 
            icon={<ShoppingCart className="w-5 h-5" />}
            title="Kids Shop"
            subtitle="Baby essentials"
            color="bg-gradient-to-br from-teal-500 to-emerald-500"
            onClick={() => setActiveTab('shop')}
          />
          <QuickActionCard 
            icon={<BookOpen className="w-5 h-5" />}
            title="Health Education"
            subtitle="Learn & grow"
            color="bg-gradient-to-br from-purple-500 to-violet-500"
            onClick={() => setActiveTab('education')}
          />
        </div>

        {/* Main Tabs */}
        <Card className="bg-white/95 backdrop-blur border-0 shadow-2xl rounded-3xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-gray-100/80 p-1 rounded-none border-b grid grid-cols-7">
              <TabsTrigger value="home" className="rounded-lg text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                <Activity className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Home</span>
              </TabsTrigger>
              <TabsTrigger value="symptoms" className="rounded-lg text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                <Thermometer className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Symptoms</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="rounded-lg text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                <MessageCircle className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">AI Chat</span>
              </TabsTrigger>
              <TabsTrigger value="shop" className="rounded-lg text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                <ShoppingCart className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Shop</span>
              </TabsTrigger>
              <TabsTrigger value="education" className="rounded-lg text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                <BookOpen className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Learn</span>
              </TabsTrigger>
              {selectedChild && (
                <>
                  <TabsTrigger value="dashboard" className="rounded-lg text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                    <Baby className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">My Child</span>
                  </TabsTrigger>
                  <TabsTrigger value="vaccinations" className="rounded-lg text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                    <Syringe className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Vaccines</span>
                  </TabsTrigger>
                </>
              )}
              {!selectedChild && (
                <>
                  <TabsTrigger value="dashboard" disabled className="rounded-lg text-xs opacity-50">
                    <Baby className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">My Child</span>
                  </TabsTrigger>
                  <TabsTrigger value="vaccinations" disabled className="rounded-lg text-xs opacity-50">
                    <Syringe className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Vaccines</span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <div className="p-4 sm:p-6">
              <TabsContent value="home" className="mt-0">
                <HomeTab user={user} selectedChild={selectedChild} onAddChild={() => setShowAddChild(true)} setActiveTab={setActiveTab} />
              </TabsContent>
              <TabsContent value="symptoms" className="mt-0">
                <SymptomsTab child={selectedChild} />
              </TabsContent>
              <TabsContent value="chat" className="mt-0">
                <AIChatTab child={selectedChild} user={user} />
              </TabsContent>
              <TabsContent value="shop" className="mt-0">
                <KidsShopTab user={user} />
              </TabsContent>
              <TabsContent value="education" className="mt-0">
                <EducationTab />
              </TabsContent>
              {selectedChild && (
                <>
                  <TabsContent value="dashboard" className="mt-0">
                    <DashboardTab child={selectedChild} />
                  </TabsContent>
                  <TabsContent value="vaccinations" className="mt-0">
                    <VaccinationsTab child={selectedChild} />
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </Card>
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

// Quick Action Card Component
const QuickActionCard = ({ icon, title, subtitle, color, onClick }) => (
  <button 
    onClick={onClick}
    className={`${color} text-white p-4 rounded-2xl text-left hover:opacity-90 transition-all hover:scale-105 shadow-lg`}
  >
    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-2">
      {icon}
    </div>
    <p className="font-semibold text-sm">{title}</p>
    <p className="text-xs text-white/80">{subtitle}</p>
  </button>
);

// Home Tab - Landing page for ALYNE
const HomeTab = ({ user, selectedChild, onAddChild, setActiveTab }) => {
  const features = [
    { icon: Thermometer, title: "Symptom Checker", desc: "Check common childhood symptoms with IAP & CDC guidelines", color: "bg-rose-100 text-rose-600", tab: "symptoms" },
    { icon: MessageCircle, title: "AI Health Assistant", desc: "24/7 chat with ALYNE for pediatric health questions", color: "bg-amber-100 text-amber-600", tab: "chat" },
    { icon: ShoppingCart, title: "Kids Shop", desc: "Baby food, feeding essentials, supplements & more", color: "bg-teal-100 text-teal-600", tab: "shop" },
    { icon: BookOpen, title: "Health Education", desc: "Learn about child development & nutrition", color: "bg-purple-100 text-purple-600", tab: "education" },
  ];

  const personalizedFeatures = [
    { icon: Syringe, title: "Vaccination Tracker", desc: "Track immunizations with IAP/CDC schedules", color: "bg-blue-100 text-blue-600", tab: "vaccinations" },
    { icon: TrendingUp, title: "Growth Tracking", desc: "Monitor height, weight with WHO percentiles", color: "bg-green-100 text-green-600", tab: "dashboard" },
    { icon: FileText, title: "Health Documents", desc: "Store immunization records & medical reports", color: "bg-indigo-100 text-indigo-600", tab: "dashboard" },
    { icon: Bell, title: "Health Reminders", desc: "Never miss a vaccination or checkup", color: "bg-pink-100 text-pink-600", tab: "dashboard" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">Welcome to ALYNE</h2>
        <p className="text-gray-500 text-sm mt-1">Your complete pediatric health companion</p>
      </div>

      {/* Common Features - Available to All */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
          Explore Health Features
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(feature.tab)}
              className="p-4 bg-white border rounded-xl text-left hover:shadow-md transition-all hover:border-teal-200 group"
            >
              <div className={`w-10 h-10 ${feature.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-5 h-5" />
              </div>
              <h4 className="font-medium text-gray-800 text-sm">{feature.title}</h4>
              <p className="text-xs text-gray-500 mt-1">{feature.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Personalized Features Section */}
      <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl border border-teal-100">
        <h3 className="text-sm font-semibold text-teal-700 mb-3 flex items-center gap-2">
          <Baby className="w-4 h-4" />
          Personalized Child Health Tracking
        </h3>
        
        {selectedChild ? (
          <div className="space-y-3">
            {/* Child Info Card */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center">
                <span className="text-xl">{selectedChild.gender === 'male' ? '👦' : '👧'}</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{selectedChild.name}</p>
                <p className="text-xs text-gray-500">{selectedChild.age_display} • {selectedChild.region === 'india' ? '🇮🇳 IAP Schedule' : '🇺🇸 CDC Schedule'}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActiveTab('dashboard')}>
                View Dashboard
              </Button>
            </div>
            
            {/* Personalized Feature Cards */}
            <div className="grid grid-cols-2 gap-2">
              {personalizedFeatures.map((feature, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTab(feature.tab)}
                  className="p-3 bg-white rounded-lg text-left hover:shadow-sm transition-all flex items-center gap-3"
                >
                  <div className={`w-8 h-8 ${feature.color} rounded-lg flex items-center justify-center`}>
                    <feature.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 text-xs">{feature.title}</h4>
                    <p className="text-xs text-gray-400">{feature.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Baby className="w-8 h-8 text-teal-500" />
            </div>
            <p className="text-gray-600 text-sm mb-1">Add your child's profile to unlock:</p>
            <ul className="text-xs text-gray-500 mb-4 space-y-1">
              <li>• Personalized vaccination schedules (IAP/CDC)</li>
              <li>• Growth tracking with WHO percentiles</li>
              <li>• Health document storage</li>
              <li>• Appointment reminders</li>
            </ul>
            {user ? (
              <Button onClick={onAddChild} className="bg-teal-600 hover:bg-teal-700 rounded-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Child Profile
              </Button>
            ) : (
              <Button onClick={() => window.location.href = '/'} className="bg-teal-600 hover:bg-teal-700 rounded-full">
                Login to Get Started
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Emergency Contact */}
      <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <Phone className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-red-700 text-sm">Pediatric Emergency?</p>
          <p className="text-xs text-red-600">For emergencies, always call your local emergency number</p>
        </div>
        <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-100">
          Emergency
        </Button>
      </div>
    </div>
  );
};

// Education Tab - Child Health Education
const EducationTab = () => {
  const topics = [
    { id: 1, title: "Newborn Care Basics", category: "0-3 months", icon: "👶", desc: "Essential care tips for your newborn", articles: 12 },
    { id: 2, title: "Breastfeeding Guide", category: "Nutrition", icon: "🍼", desc: "Benefits and techniques of breastfeeding", articles: 8 },
    { id: 3, title: "Introduction to Solids", category: "6+ months", icon: "🥣", desc: "When and how to start solid foods", articles: 15 },
    { id: 4, title: "Sleep Training Tips", category: "Development", icon: "😴", desc: "Healthy sleep habits for babies", articles: 10 },
    { id: 5, title: "Milestone Tracker", category: "Development", icon: "🎯", desc: "Key developmental milestones by age", articles: 20 },
    { id: 6, title: "Common Childhood Illnesses", category: "Health", icon: "🏥", desc: "Understanding and managing common conditions", articles: 25 },
    { id: 7, title: "Vaccination Information", category: "Prevention", icon: "💉", desc: "Why vaccines are important for your child", articles: 18 },
    { id: 8, title: "Child Nutrition Guide", category: "Nutrition", icon: "🥗", desc: "Balanced diet for growing children", articles: 14 },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">Health Education</h2>
        <p className="text-gray-500 text-sm mt-1">Learn about child health, development & nutrition</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {topics.map((topic) => (
          <div key={topic.id} className="p-4 bg-white border rounded-xl hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                {topic.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{topic.category}</Badge>
                </div>
                <h3 className="font-semibold text-gray-800">{topic.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{topic.desc}</p>
                <p className="text-xs text-purple-600 mt-2">{topic.articles} articles</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl text-center">
        <GraduationCap className="w-8 h-8 text-purple-500 mx-auto mb-2" />
        <p className="text-sm text-gray-600">More educational content coming soon!</p>
        <p className="text-xs text-gray-400 mt-1">Expert-reviewed articles by pediatricians</p>
      </div>
    </div>
  );
};

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
        <DialogDescription>
          Enter your child's details to unlock personalized health tracking
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        {/* Region Selection */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setNewChild({...newChild, region: 'india'})}
            className={`p-4 rounded-xl border-2 transition-all ${
              newChild.region === 'india' 
                ? 'border-teal-500 bg-teal-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-3xl block mb-1">🇮🇳</span>
            <span className="font-medium">India</span>
            <p className="text-xs text-gray-500">IAP Schedule</p>
          </button>
          <button
            onClick={() => setNewChild({...newChild, region: 'usa'})}
            className={`p-4 rounded-xl border-2 transition-all ${
              newChild.region === 'usa' 
                ? 'border-teal-500 bg-teal-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-3xl block mb-1">🇺🇸</span>
            <span className="font-medium">USA</span>
            <p className="text-xs text-gray-500">CDC Schedule</p>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Child's Name *</Label>
            <Input 
              value={newChild.name}
              onChange={(e) => setNewChild({...newChild, name: e.target.value})}
              placeholder="Enter name"
            />
          </div>
          <div>
            <Label>Date of Birth *</Label>
            <Input 
              type="date"
              value={newChild.date_of_birth}
              onChange={(e) => setNewChild({...newChild, date_of_birth: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Gender</Label>
            <Select value={newChild.gender} onValueChange={(v) => setNewChild({...newChild, gender: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">👦 Male</SelectItem>
                <SelectItem value="female">👧 Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Blood Group</Label>
            <Select value={newChild.blood_group} onValueChange={(v) => setNewChild({...newChild, blood_group: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                  <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Region-specific fields */}
        {newChild.region === 'india' ? (
          <div className="grid grid-cols-2 gap-4 p-3 bg-orange-50 rounded-lg">
            <div>
              <Label className="text-orange-700">Aadhaar Number</Label>
              <Input 
                value={newChild.aadhaar_number}
                onChange={(e) => setNewChild({...newChild, aadhaar_number: e.target.value})}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label className="text-orange-700">UHID</Label>
              <Input 
                value={newChild.uhid}
                onChange={(e) => setNewChild({...newChild, uhid: e.target.value})}
                placeholder="Optional"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg">
            <div>
              <Label className="text-blue-700">Insurance Provider</Label>
              <Input 
                value={newChild.insurance_provider}
                onChange={(e) => setNewChild({...newChild, insurance_provider: e.target.value})}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label className="text-blue-700">Insurance ID</Label>
              <Input 
                value={newChild.insurance_id}
                onChange={(e) => setNewChild({...newChild, insurance_id: e.target.value})}
                placeholder="Optional"
              />
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Child
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Dashboard Tab Component
const DashboardTab = ({ child }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, [child.id]);

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`${API}/api/alyne/dashboard/${child.id}`);
      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-gray-100 rounded-xl"></div></div>;

  const vaxStats = dashboard?.vaccination_stats || { done: 0, due: 0, overdue: 0, total: 0 };
  const progress = vaxStats.total > 0 ? Math.round((vaxStats.done / vaxStats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Child Profile Card */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-3xl">{child.gender === 'male' ? '👦' : '👧'}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{child.name}</h2>
            <p className="text-white/80 text-sm">{child.age_display} • {child.blood_group || 'Blood group not set'}</p>
            <p className="text-white/70 text-xs mt-1">{child.region === 'india' ? '🇮🇳 IAP Schedule' : '🇺🇸 CDC Schedule'}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{progress}%</p>
            <p className="text-xs text-white/80">Vaccinations</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center p-4 bg-green-50 rounded-xl">
          <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-green-600">{vaxStats.done}</p>
          <p className="text-xs text-gray-500">Done</p>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-xl">
          <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-yellow-600">{vaxStats.due}</p>
          <p className="text-xs text-gray-500">Due</p>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-xl">
          <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-600">{vaxStats.overdue}</p>
          <p className="text-xs text-gray-500">Overdue</p>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-xl">
          <FileText className="w-6 h-6 text-blue-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-blue-600">{dashboard?.document_count || 0}</p>
          <p className="text-xs text-gray-500">Docs</p>
        </div>
      </div>

      {/* Latest Growth */}
      {dashboard?.latest_growth && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-teal-50 rounded-xl text-center">
            <Ruler className="w-5 h-5 text-teal-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-teal-700">{dashboard.latest_growth.height_cm || '--'} cm</p>
            <p className="text-xs text-gray-500">Height</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-xl text-center">
            <Scale className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-amber-700">{dashboard.latest_growth.weight_kg || '--'} kg</p>
            <p className="text-xs text-gray-500">Weight</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <Calendar className="w-5 h-5 text-gray-600 mx-auto mb-1" />
            <p className="text-sm font-bold text-gray-700">{dashboard.latest_growth.date}</p>
            <p className="text-xs text-gray-500">Recorded</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Vaccinations Tab Component
const VaccinationsTab = ({ child }) => {
  const [vaccinations, setVaccinations] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVaccinations();
  }, [child.id]);

  const fetchVaccinations = async () => {
    try {
      const response = await fetch(`${API}/api/alyne/vaccinations/${child.id}`);
      const data = await response.json();
      setVaccinations(data.vaccinations || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Error fetching vaccinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateVaccination = async (vaxId, status) => {
    try {
      const response = await fetch(`${API}/api/alyne/vaccinations/${vaxId}?status=${status}&administered_date=${new Date().toISOString().split('T')[0]}`, { method: 'PUT' });
      if (response.ok) {
        toast.success('Vaccination updated!');
        fetchVaccinations();
      }
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const filteredVax = filter === 'all' ? vaccinations : vaccinations.filter(v => v.status === filter);
  const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="p-4 bg-gray-50 rounded-xl">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">Vaccination Progress</span>
          <span className="font-bold text-teal-600">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'due', 'overdue', 'done'].map(f => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className={filter === f ? 'bg-teal-600' : ''}>
            {f.charAt(0).toUpperCase() + f.slice(1)} {f !== 'all' && `(${stats[f] || 0})`}
          </Button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {loading ? <p className="text-center py-8">Loading...</p> : filteredVax.length === 0 ? <p className="text-center py-8 text-gray-500">No vaccinations</p> : (
          filteredVax.slice(0, 20).map((vax) => (
            <div key={vax.id} className={`p-3 bg-white border rounded-xl flex items-center gap-3 ${vax.status === 'overdue' ? 'border-l-4 border-red-500' : vax.status === 'due' ? 'border-l-4 border-yellow-500' : ''}`}>
              <Syringe className={`w-5 h-5 ${vax.status === 'done' ? 'text-green-500' : vax.status === 'overdue' ? 'text-red-500' : 'text-yellow-500'}`} />
              <div className="flex-1">
                <p className="font-medium text-sm">{vax.vaccine_name} <Badge variant="outline" className="ml-2 text-xs">{vax.dose}</Badge></p>
                <p className="text-xs text-gray-500">{vax.scheduled_date}</p>
              </div>
              {vax.status !== 'done' && <Button size="sm" onClick={() => updateVaccination(vax.id, 'done')} className="bg-green-500 hover:bg-green-600 text-xs">Done</Button>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Symptoms Tab Component
const SymptomsTab = ({ child }) => {
  const [symptoms, setSymptoms] = useState([]);
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [symptomDetails, setSymptomDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSymptoms(); }, []);

  const fetchSymptoms = async () => {
    try {
      const response = await fetch(`${API}/api/alyne/symptoms`);
      const data = await response.json();
      setSymptoms(data.symptoms || []);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const fetchSymptomDetails = async (symptomId) => {
    try {
      const region = child?.region || 'india';
      const response = await fetch(`${API}/api/alyne/symptoms/${symptomId}?region=${region}`);
      const data = await response.json();
      setSymptomDetails(data);
      setSelectedSymptom(symptomId);
    } catch (error) { console.error('Error:', error); }
  };

  const colors = { sore_throat: 'bg-orange-100 text-orange-600', cough: 'bg-blue-100 text-blue-600', skin_rash: 'bg-red-100 text-red-600', fever: 'bg-yellow-100 text-yellow-600', vomiting: 'bg-purple-100 text-purple-600', diarrhea: 'bg-teal-100 text-teal-600' };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-800">Symptom Checker</h2>
        <p className="text-xs text-gray-500">Guidelines from IAP & CDC</p>
      </div>

      <div className="p-3 bg-amber-50 rounded-lg text-center">
        <p className="text-xs text-amber-700">⚠️ This is general guidance only. Always consult your pediatrician.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {symptoms.map((s) => (
          <button key={s.id} onClick={() => fetchSymptomDetails(s.id)} className={`p-4 rounded-xl text-left transition-all hover:scale-105 ${selectedSymptom === s.id ? 'ring-2 ring-teal-500' : ''} ${colors[s.id] || 'bg-gray-100'}`}>
            <span className="text-2xl block mb-2">{s.icon}</span>
            <p className="font-medium text-sm">{s.name}</p>
          </button>
        ))}
      </div>

      {symptomDetails && (
        <div className="p-4 bg-white border rounded-xl space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <span className="text-2xl">{symptomDetails.symptom.icon}</span>
            {symptomDetails.symptom.name}
          </h3>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Home Care Tips</h4>
            <ul className="space-y-1">{symptomDetails.symptom.home_care.slice(0, 4).map((tip, i) => <li key={i} className="text-xs flex items-start gap-2"><CheckCircle className="w-3 h-3 text-green-500 mt-0.5" />{tip}</li>)}</ul>
          </div>

          <div className="p-3 bg-red-50 rounded-lg">
            <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />When to See a Doctor</h4>
            <ul className="space-y-1">{symptomDetails.symptom.when_to_see_doctor.slice(0, 4).map((item, i) => <li key={i} className="text-xs text-red-600">• {item}</li>)}</ul>
          </div>

          <div className="p-3 bg-teal-50 rounded-lg">
            <h4 className="text-sm font-medium text-teal-700 mb-1">{child?.region === 'usa' ? '🇺🇸 CDC' : '🇮🇳 IAP'} Guidelines</h4>
            <p className="text-xs text-gray-600">{symptomDetails.primary_guidelines}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// AI Chat Tab Component
const AIChatTab = ({ child, user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`chat_${Date.now()}`);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`${API}/api/alyne/chat?user_id=${user?.id || 'guest'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, child_id: child?.id, session_id: sessionId })
      });
      const data = await response.json();
      if (data.success) setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      else toast.error('Failed to get response');
    } catch (error) { toast.error('Chat unavailable'); }
    finally { setLoading(false); }
  };

  const quickQ = ["Signs of teething?", "How to handle fever?", "When to start solids?", "Normal sleep patterns?"];

  return (
    <div className="space-y-4">
      <div className="bg-teal-600 text-white p-4 rounded-t-xl -mx-4 sm:-mx-6 -mt-4 sm:-mt-6">
        <h2 className="font-bold flex items-center gap-2"><MessageCircle className="w-5 h-5" />Chat with ALYNE</h2>
        <p className="text-xs text-white/80">24/7 AI pediatric health assistant</p>
      </div>

      <div className="h-[350px] overflow-y-auto space-y-3 p-2 bg-gray-50 rounded-xl">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="w-10 h-10 text-teal-500 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">Hi! I'm ALYNE. Ask me anything about child health!</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {quickQ.map((q, i) => <button key={i} onClick={() => setInput(q)} className="text-xs px-3 py-1.5 bg-teal-100 text-teal-700 rounded-full hover:bg-teal-200">{q}</button>)}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-teal-600 text-white rounded-br-none' : 'bg-white border rounded-bl-none'}`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-white border p-3 rounded-2xl rounded-bl-none"><div className="flex gap-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0.1s'}}></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div></div></div></div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about child health..." onKeyPress={(e) => e.key === 'Enter' && sendMessage()} className="flex-1" />
        <Button onClick={sendMessage} disabled={loading} className="bg-teal-600"><Send className="w-4 h-4" /></Button>
      </div>
      <p className="text-xs text-gray-400 text-center">⚠️ AI guidance only. Consult your pediatrician for medical advice.</p>
    </div>
  );
};

// Kids Shop Tab Component
const KidsShopTab = ({ user }) => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => { fetchCategories(); fetchProducts(); }, []);

  const fetchCategories = async () => {
    try { const res = await fetch(`${API}/api/alyne/shop/categories`); const data = await res.json(); setCategories(data.categories || []); } catch (e) { console.error(e); }
  };

  const fetchProducts = async (cat = null) => {
    setLoading(true);
    try { const url = cat ? `${API}/api/alyne/shop/products?category=${cat}` : `${API}/api/alyne/shop/products`; const res = await fetch(url); const data = await res.json(); setProducts(data.products || []); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const addToCart = (product) => {
    setCart(prev => { const ex = prev.find(p => p.id === product.id); if (ex) return prev.map(p => p.id === product.id ? {...p, quantity: p.quantity + 1} : p); return [...prev, {...product, quantity: 1}]; });
    toast.success(`Added to cart`);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Kids Shop</h2>
          <p className="text-xs text-gray-500">by Orange Pharmacy</p>
        </div>
        <Button variant="outline" onClick={() => setShowCart(true)} className="relative">
          <ShoppingCart className="w-4 h-4 mr-1" />Cart
          {cart.length > 0 && <Badge className="absolute -top-2 -right-2 bg-rose-500 text-xs">{cart.reduce((s, i) => s + i.quantity, 0)}</Badge>}
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => { setSelectedCategory(null); fetchProducts(); }} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${!selectedCategory ? 'bg-teal-600 text-white' : 'bg-white border'}`}>All</button>
        {categories.map(c => <button key={c.id} onClick={() => { setSelectedCategory(c.id); fetchProducts(c.id); }} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex items-center gap-1 ${selectedCategory === c.id ? 'bg-teal-600 text-white' : 'bg-white border'}`}><span>{c.icon}</span>{c.name}</button>)}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading ? [...Array(8)].map((_, i) => <div key={i} className="bg-gray-100 rounded-xl p-4 animate-pulse h-40"></div>) : products.map(p => (
          <div key={p.id} className="bg-white border rounded-xl p-3 hover:shadow-md transition-all">
            <div className="w-full h-16 bg-gray-100 rounded-lg mb-2 flex items-center justify-center"><Package className="w-8 h-8 text-gray-300" /></div>
            {p.bestseller && <Badge className="bg-rose-500 text-xs mb-1">Bestseller</Badge>}
            <h4 className="font-medium text-xs line-clamp-2">{p.name}</h4>
            <p className="text-xs text-gray-400">{p.brand}</p>
            <div className="flex items-center justify-between mt-2">
              <div><p className="font-bold text-teal-600 text-sm">₹{p.price}</p><p className="text-xs text-gray-400 line-through">₹{p.mrp}</p></div>
              <Button size="sm" onClick={() => addToCart(p)} className="bg-teal-600 hover:bg-teal-700 h-7 w-7 p-0"><Plus className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Your Cart</DialogTitle></DialogHeader>
          {cart.length === 0 ? <div className="text-center py-8"><ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Cart is empty</p></div> : (
            <div className="space-y-3">
              {cart.map(item => <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"><Package className="w-8 h-8 text-gray-400" /><div className="flex-1"><p className="font-medium text-sm">{item.name}</p><p className="text-xs text-gray-500">₹{item.price} × {item.quantity}</p></div><p className="font-bold">₹{item.price * item.quantity}</p></div>)}
              <div className="border-t pt-3 flex justify-between text-lg font-bold"><span>Total</span><span className="text-teal-600">₹{cartTotal}</span></div>
              <Button className="w-full bg-teal-600" onClick={() => toast.success('Order placed!')}>Place Order</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Alyne;
