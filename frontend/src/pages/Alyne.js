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
  Filter, Minus
} from 'lucide-react';
import Footer from '@/components/Footer';

const API = process.env.REACT_APP_BACKEND_URL;

const Alyne = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

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
    }
  }, [user]);

  const fetchChildren = async () => {
    try {
      const response = await fetch(`${API}/api/alyne/children/${user.id}`);
      const data = await response.json();
      setChildren(data.children || []);
      if (data.children && data.children.length > 0 && !selectedChild) {
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
      }
    } catch (error) {
      toast.error('Failed to add child');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#e8f5f3] via-white to-[#fef6e8] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 border-0 shadow-xl bg-white/80 backdrop-blur">
          <div className="w-24 h-24 mx-auto mb-6 bg-[#2d7a6d] rounded-full flex items-center justify-center">
            <Baby className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to ALYNE</h2>
          <p className="text-[#2d7a6d] font-medium mb-4">Kids Health & Care</p>
          <p className="text-sm text-gray-500 mb-6">Please login to manage your child's health records</p>
          <Button onClick={() => navigate('/')} className="bg-[#2d7a6d] hover:bg-[#245f55] rounded-full px-8">
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e8f5f3] via-white to-[#fef6e8]">
      {/* Header - Teal theme matching reference */}
      <header className="bg-[#2d7a6d] text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img 
                src="https://customer-assets.emergentagent.com/job_kids-health-portal/artifacts/mrmio3uk_file_000000006cd87207b39dc03d0e62d1ad%20%281%29.png" 
                alt="ALYNE" 
                className="h-10 w-auto"
              />
            </div>
            <Button 
              onClick={() => setShowAddChild(true)}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-full"
              data-testid="add-child-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Child
            </Button>
          </div>
        </div>
      </header>

      {/* Welcome Banner - Personalized */}
      {selectedChild && (
        <div className="bg-[#2d7a6d] text-white pb-8 pt-2">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-3xl">{selectedChild.gender === 'male' ? '👦' : '👧'}</span>
              </div>
              <div>
                <p className="text-white/80 text-sm">Welcome back,</p>
                <h1 className="text-2xl font-bold">{user.name}!</h1>
                <p className="text-white/80 text-sm">Managing {selectedChild.name}'s health</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6 -mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d7a6d]"></div>
          </div>
        ) : children.length === 0 ? (
          <EmptyState onAddChild={() => setShowAddChild(true)} />
        ) : (
          <div className="space-y-6">
            {/* Child Selector - Horizontal Pills */}
            {children.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChild(child)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                      selectedChild?.id === child.id 
                        ? 'bg-[#2d7a6d] text-white shadow-lg' 
                        : 'bg-white text-gray-700 hover:bg-gray-50 border'
                    }`}
                  >
                    <span>{child.gender === 'male' ? '👦' : '👧'}</span>
                    <span className="font-medium">{child.name}</span>
                    <span className="text-xs opacity-70">{child.age_display}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick Action Cards - Matching Reference Design */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickActionCard 
                icon={<Calendar className="w-5 h-5" />}
                title="Book a visit"
                subtitle="in clinic or virtual"
                color="bg-[#e85a7b]"
                onClick={() => navigate('/diagyn')}
              />
              <QuickActionCard 
                icon={<MessageCircle className="w-5 h-5" />}
                title="Chat with"
                subtitle="ALYNE 24/7"
                color="bg-[#f4c156]"
                onClick={() => setActiveTab('chat')}
              />
              <QuickActionCard 
                icon={<Stethoscope className="w-5 h-5" />}
                title="Check"
                subtitle="symptoms"
                color="bg-[#e85a7b]"
                onClick={() => setActiveTab('symptoms')}
              />
              <QuickActionCard 
                icon={<TrendingUp className="w-5 h-5" />}
                title="Manage your"
                subtitle="visits"
                color="bg-[#f4c156]"
                onClick={() => setActiveTab('dashboard')}
              />
            </div>

            {/* Main Tabs */}
            {selectedChild && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white/70 backdrop-blur p-1 rounded-xl grid grid-cols-7 gap-1">
                  <TabsTrigger value="dashboard" className="rounded-lg text-xs data-[state=active]:bg-[#2d7a6d] data-[state=active]:text-white">
                    <Activity className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </TabsTrigger>
                  <TabsTrigger value="vaccinations" className="rounded-lg text-xs data-[state=active]:bg-[#2d7a6d] data-[state=active]:text-white">
                    <Syringe className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Vaccines</span>
                  </TabsTrigger>
                  <TabsTrigger value="growth" className="rounded-lg text-xs data-[state=active]:bg-[#2d7a6d] data-[state=active]:text-white">
                    <TrendingUp className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Growth</span>
                  </TabsTrigger>
                  <TabsTrigger value="symptoms" className="rounded-lg text-xs data-[state=active]:bg-[#2d7a6d] data-[state=active]:text-white">
                    <Thermometer className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Symptoms</span>
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="rounded-lg text-xs data-[state=active]:bg-[#2d7a6d] data-[state=active]:text-white">
                    <MessageCircle className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">AI Chat</span>
                  </TabsTrigger>
                  <TabsTrigger value="shop" className="rounded-lg text-xs data-[state=active]:bg-[#2d7a6d] data-[state=active]:text-white">
                    <ShoppingCart className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Shop</span>
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="rounded-lg text-xs data-[state=active]:bg-[#2d7a6d] data-[state=active]:text-white">
                    <FileText className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Docs</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard">
                  <DashboardTab child={selectedChild} />
                </TabsContent>
                <TabsContent value="vaccinations">
                  <VaccinationsTab child={selectedChild} />
                </TabsContent>
                <TabsContent value="growth">
                  <GrowthTab child={selectedChild} />
                </TabsContent>
                <TabsContent value="symptoms">
                  <SymptomsTab child={selectedChild} />
                </TabsContent>
                <TabsContent value="chat">
                  <AIChatTab child={selectedChild} user={user} />
                </TabsContent>
                <TabsContent value="shop">
                  <KidsShopTab user={user} />
                </TabsContent>
                <TabsContent value="documents">
                  <DocumentsTab child={selectedChild} />
                </TabsContent>
              </Tabs>
            )}
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

// Empty State Component
const EmptyState = ({ onAddChild }) => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="w-32 h-32 bg-[#2d7a6d]/10 rounded-full flex items-center justify-center mb-6">
      <Baby className="w-16 h-16 text-[#2d7a6d]" />
    </div>
    <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to ALYNE!</h2>
    <p className="text-gray-600 mb-6 text-center max-w-md">
      Your one-stop portal for managing your child's health records, vaccinations, growth tracking, and more.
    </p>
    <Button 
      onClick={onAddChild}
      size="lg"
      className="bg-[#2d7a6d] hover:bg-[#245f55] rounded-full px-8"
      data-testid="add-first-child-btn"
    >
      <Plus className="w-5 h-5 mr-2" />
      Add Your First Child
    </Button>
  </div>
);

// Add Child Dialog
const AddChildDialog = ({ open, onClose, newChild, setNewChild, onSubmit }) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[#2d7a6d] flex items-center justify-center">
            <Baby className="w-5 h-5 text-white" />
          </div>
          Add Child Profile
        </DialogTitle>
        <DialogDescription>
          Enter your child's details to create their health profile
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        {/* Region Selection */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setNewChild({...newChild, region: 'india'})}
            className={`p-4 rounded-xl border-2 transition-all ${
              newChild.region === 'india' 
                ? 'border-[#2d7a6d] bg-[#2d7a6d]/10' 
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
                ? 'border-[#2d7a6d] bg-[#2d7a6d]/10' 
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
              data-testid="child-name-input"
            />
          </div>
          <div>
            <Label>Date of Birth *</Label>
            <Input 
              type="date"
              value={newChild.date_of_birth}
              onChange={(e) => setNewChild({...newChild, date_of_birth: e.target.value})}
              data-testid="child-dob-input"
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
                placeholder="12 digits (optional)"
              />
            </div>
            <div>
              <Label className="text-orange-700">UHID</Label>
              <Input 
                value={newChild.uhid}
                onChange={(e) => setNewChild({...newChild, uhid: e.target.value})}
                placeholder="Hospital ID (optional)"
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
                placeholder="e.g., Blue Cross"
              />
            </div>
            <div>
              <Label className="text-blue-700">Insurance ID</Label>
              <Input 
                value={newChild.insurance_id}
                onChange={(e) => setNewChild({...newChild, insurance_id: e.target.value})}
                placeholder="Policy number"
              />
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          onClick={onSubmit}
          className="bg-[#2d7a6d] hover:bg-[#245f55]"
          data-testid="submit-add-child"
        >
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

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-white/50 rounded-xl"></div>
    </div>;
  }

  const vaxStats = dashboard?.vaccination_stats || { done: 0, due: 0, overdue: 0, total: 0 };
  const progress = vaxStats.total > 0 ? Math.round((vaxStats.done / vaxStats.total) * 100) : 0;

  return (
    <div className="space-y-6 mt-4">
      {/* Child Profile Card - Yellow Theme like reference */}
      <Card className="bg-[#f4c156] text-gray-800 border-0 shadow-xl overflow-hidden rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center">
                <span className="text-3xl">{child.gender === 'male' ? '👦' : '👧'}</span>
              </div>
              <div>
                <p className="text-sm text-gray-700">{child.gender === 'male' ? 'Boy' : 'Girl'}, {child.age_display}</p>
                <h2 className="text-2xl font-bold">{child.name}</h2>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-700">Vaccinations progress:</p>
              <div className="flex items-center gap-2 mt-1">
                {['0-6', '6-12', '12-18', '18-24'].map((range, idx) => (
                  <div key={range} className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx < Math.floor(progress / 25) ? 'bg-[#e85a7b] text-white' : 'bg-white/50 text-gray-600'
                  }`}>
                    {range}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{vaxStats.done}</p>
            <p className="text-sm text-gray-500">Done</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">{vaxStats.due}</p>
            <p className="text-sm text-gray-500">Due Now</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{vaxStats.overdue}</p>
            <p className="text-sm text-gray-500">Overdue</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{dashboard?.document_count || 0}</p>
            <p className="text-sm text-gray-500">Documents</p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Growth */}
      {dashboard?.latest_growth && (
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#2d7a6d]" />
              Latest Growth Record
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {dashboard.latest_growth.height_cm && (
                <div className="text-center p-4 bg-[#2d7a6d]/10 rounded-xl">
                  <Ruler className="w-6 h-6 text-[#2d7a6d] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#2d7a6d]">{dashboard.latest_growth.height_cm} cm</p>
                  <p className="text-xs text-gray-500">Height</p>
                </div>
              )}
              {dashboard.latest_growth.weight_kg && (
                <div className="text-center p-4 bg-[#f4c156]/20 rounded-xl">
                  <Scale className="w-6 h-6 text-[#d4a84a] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#d4a84a]">{dashboard.latest_growth.weight_kg} kg</p>
                  <p className="text-xs text-gray-500">Weight</p>
                </div>
              )}
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <Calendar className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">{dashboard.latest_growth.date}</p>
                <p className="text-xs text-gray-500">Recorded</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
      const response = await fetch(`${API}/api/alyne/vaccinations/${vaxId}?status=${status}&administered_date=${new Date().toISOString().split('T')[0]}`, {
        method: 'PUT'
      });
      if (response.ok) {
        toast.success('Vaccination updated!');
        fetchVaccinations();
      }
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const filteredVax = filter === 'all' 
    ? vaccinations 
    : vaccinations.filter(v => v.status === filter);

  const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="space-y-6 mt-4">
      {/* Progress Bar */}
      <Card className="bg-white border-0 shadow-lg rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Vaccination Progress</span>
            <span className="text-lg font-bold text-[#2d7a6d]">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="flex justify-between mt-4 text-sm">
            <span className="text-green-600">{stats.done} Done</span>
            <span className="text-yellow-600">{stats.due} Due</span>
            <span className="text-red-600">{stats.overdue} Overdue</span>
            <span className="text-blue-600">{stats.upcoming} Upcoming</span>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'due', 'overdue', 'done', 'upcoming'].map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? 'bg-[#2d7a6d]' : ''}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && ` (${stats[f] || 0})`}
          </Button>
        ))}
      </div>

      {/* Vaccination List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : filteredVax.length === 0 ? (
          <Card className="bg-white border-0 p-8 text-center rounded-2xl">
            <p className="text-gray-500">No vaccinations in this category</p>
          </Card>
        ) : (
          filteredVax.slice(0, 15).map((vax) => (
            <Card key={vax.id} className={`bg-white border-0 shadow transition-all hover:shadow-lg rounded-2xl ${
              vax.status === 'overdue' ? 'border-l-4 border-red-500' :
              vax.status === 'due' ? 'border-l-4 border-yellow-500' :
              vax.status === 'done' ? 'border-l-4 border-green-500' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    vax.status === 'done' ? 'bg-green-100' :
                    vax.status === 'overdue' ? 'bg-red-100' :
                    vax.status === 'due' ? 'bg-yellow-100' : 'bg-blue-100'
                  }`}>
                    <Syringe className={`w-6 h-6 ${
                      vax.status === 'done' ? 'text-green-500' :
                      vax.status === 'overdue' ? 'text-red-500' :
                      vax.status === 'due' ? 'text-yellow-500' : 'text-blue-500'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{vax.vaccine_name}</p>
                      <Badge variant="outline" className="text-xs">
                        {vax.dose}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{vax.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Scheduled: {vax.scheduled_date}
                    </p>
                  </div>
                  {vax.status !== 'done' && (
                    <Button
                      size="sm"
                      onClick={() => updateVaccination(vax.id, 'done')}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Done
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

// Growth Tab Component
const GrowthTab = ({ child }) => {
  const [records, setRecords] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    height_cm: '',
    weight_kg: '',
    notes: ''
  });

  useEffect(() => {
    fetchGrowth();
  }, [child.id]);

  const fetchGrowth = async () => {
    try {
      const response = await fetch(`${API}/api/alyne/growth/${child.id}`);
      const data = await response.json();
      setRecords(data.records || []);
    } catch (error) {
      console.error('Error fetching growth:', error);
    } finally {
      setLoading(false);
    }
  };

  const addGrowthRecord = async () => {
    if (!newRecord.height_cm && !newRecord.weight_kg) {
      toast.error('Please enter at least height or weight');
      return;
    }

    try {
      const response = await fetch(`${API}/api/alyne/growth/${child.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRecord,
          height_cm: newRecord.height_cm ? parseFloat(newRecord.height_cm) : null,
          weight_kg: newRecord.weight_kg ? parseFloat(newRecord.weight_kg) : null
        })
      });
      
      if (response.ok) {
        toast.success('Growth record added!');
        setShowAdd(false);
        setNewRecord({ date: new Date().toISOString().split('T')[0], height_cm: '', weight_kg: '', notes: '' });
        fetchGrowth();
      }
    } catch (error) {
      toast.error('Failed to add record');
    }
  };

  return (
    <div className="space-y-6 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Growth Records</h3>
        <Button onClick={() => setShowAdd(true)} className="bg-[#2d7a6d] hover:bg-[#245f55]">
          <Plus className="w-4 h-4 mr-2" />
          Add Measurement
        </Button>
      </div>

      {records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-[#2d7a6d] text-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6 text-center">
              <Ruler className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p className="text-3xl font-bold">{records[0].height_cm || '--'}</p>
              <p className="text-sm opacity-80">Height (cm)</p>
            </CardContent>
          </Card>
          <Card className="bg-[#f4c156] text-gray-800 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6 text-center">
              <Scale className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p className="text-3xl font-bold">{records[0].weight_kg || '--'}</p>
              <p className="text-sm opacity-80">Weight (kg)</p>
            </CardContent>
          </Card>
          <Card className="bg-[#e85a7b] text-white border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6 text-center">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p className="text-xl font-bold">{child.age_display}</p>
              <p className="text-sm opacity-80">Current Age</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-white border-0 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6">Loading...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No growth records yet. Add your first measurement!
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-[#2d7a6d]/10 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#2d7a6d]" />
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Date</p>
                      <p className="font-medium">{record.date}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Height</p>
                      <p className="font-medium">{record.height_cm ? `${record.height_cm} cm` : '--'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Weight</p>
                      <p className="font-medium">{record.weight_kg ? `${record.weight_kg} kg` : '--'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Age</p>
                      <p className="font-medium">{record.age_months}m</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Growth Measurement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input 
                type="date" 
                value={newRecord.date}
                onChange={(e) => setNewRecord({...newRecord, date: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Height (cm)</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={newRecord.height_cm}
                  onChange={(e) => setNewRecord({...newRecord, height_cm: e.target.value})}
                  placeholder="e.g., 75.5"
                />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={newRecord.weight_kg}
                  onChange={(e) => setNewRecord({...newRecord, weight_kg: e.target.value})}
                  placeholder="e.g., 9.2"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addGrowthRecord} className="bg-[#2d7a6d]">Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Symptoms Tab Component
const SymptomsTab = ({ child }) => {
  const [symptoms, setSymptoms] = useState([]);
  const [selectedSymptom, setSelectedSymptom] = useState(null);
  const [symptomDetails, setSymptomDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSymptoms();
  }, []);

  const fetchSymptoms = async () => {
    try {
      const response = await fetch(`${API}/api/alyne/symptoms`);
      const data = await response.json();
      setSymptoms(data.symptoms || []);
    } catch (error) {
      console.error('Error fetching symptoms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSymptomDetails = async (symptomId) => {
    try {
      const response = await fetch(`${API}/api/alyne/symptoms/${symptomId}?region=${child.region}`);
      const data = await response.json();
      setSymptomDetails(data);
      setSelectedSymptom(symptomId);
    } catch (error) {
      console.error('Error fetching symptom details:', error);
    }
  };

  const symptomColors = {
    'sore_throat': 'bg-orange-100 text-orange-600',
    'cough': 'bg-blue-100 text-blue-600',
    'skin_rash': 'bg-red-100 text-red-600',
    'fever': 'bg-yellow-100 text-yellow-600',
    'vomiting': 'bg-purple-100 text-purple-600',
    'diarrhea': 'bg-teal-100 text-teal-600'
  };

  return (
    <div className="space-y-6 mt-4">
      <Card className="bg-white border-0 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-[#2d7a6d]" />
            Symptoms Checker
          </CardTitle>
          <CardDescription>
            Find guidance based on {child.region === 'india' ? 'IAP' : 'CDC'} guidelines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-4 p-2 bg-yellow-50 rounded-lg">
            ⚠️ This is general guidance only. Please consult your pediatrician for medical advice.
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {symptoms.map((symptom) => (
              <button
                key={symptom.id}
                onClick={() => fetchSymptomDetails(symptom.id)}
                className={`p-4 rounded-xl text-left transition-all hover:scale-105 ${
                  selectedSymptom === symptom.id ? 'ring-2 ring-[#2d7a6d]' : ''
                } ${symptomColors[symptom.id] || 'bg-gray-100'}`}
              >
                <span className="text-2xl block mb-2">{symptom.icon}</span>
                <p className="font-medium text-sm">{symptom.name}</p>
                <p className="text-xs opacity-70">{symptom.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {symptomDetails && (
        <Card className="bg-white border-0 shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{symptomDetails.symptom.icon}</span>
              {symptomDetails.symptom.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Causes */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Common Causes</h4>
              <div className="flex flex-wrap gap-2">
                {symptomDetails.symptom.causes.map((cause, idx) => (
                  <Badge key={idx} variant="outline">{cause}</Badge>
                ))}
              </div>
            </div>

            {/* Home Care */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Home Care Tips</h4>
              <ul className="space-y-2">
                {symptomDetails.symptom.home_care.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* When to See Doctor */}
            <div className="p-4 bg-red-50 rounded-xl">
              <h4 className="font-medium text-sm text-red-700 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                When to See a Doctor
              </h4>
              <ul className="space-y-1">
                {symptomDetails.symptom.when_to_see_doctor.map((item, idx) => (
                  <li key={idx} className="text-sm text-red-600">• {item}</li>
                ))}
              </ul>
            </div>

            {/* Guidelines */}
            <div className="p-4 bg-[#2d7a6d]/10 rounded-xl">
              <h4 className="font-medium text-sm text-[#2d7a6d] mb-2">
                {child.region === 'india' ? '🇮🇳 IAP Guidelines' : '🇺🇸 CDC Guidelines'}
              </h4>
              <p className="text-sm text-gray-700">{symptomDetails.primary_guidelines}</p>
            </div>
          </CardContent>
        </Card>
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`${API}/api/alyne/chat?user_id=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          child_id: child?.id,
          session_id: sessionId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        toast.error('Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Chat service unavailable');
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    "What are the signs of teething?",
    "How to handle a fever at home?",
    "When should I start solid foods?",
    "Is my child's sleep pattern normal?"
  ];

  return (
    <div className="space-y-4 mt-4">
      <Card className="bg-white border-0 shadow-lg rounded-2xl">
        <CardHeader className="bg-[#2d7a6d] text-white rounded-t-2xl">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Chat with ALYNE
          </CardTitle>
          <CardDescription className="text-white/80">
            24/7 AI-powered pediatric health assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Chat Messages */}
          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#2d7a6d]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-[#2d7a6d]" />
                </div>
                <p className="text-gray-600 mb-4">Hi! I'm ALYNE, your pediatric health assistant.</p>
                <p className="text-sm text-gray-500 mb-4">Ask me anything about your child's health!</p>
                
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(q)}
                      className="text-xs px-3 py-2 bg-[#2d7a6d]/10 text-[#2d7a6d] rounded-full hover:bg-[#2d7a6d]/20 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-[#2d7a6d] text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your child's health..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={loading} className="bg-[#2d7a6d]">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              ⚠️ AI guidance only. Consult your pediatrician for medical advice.
            </p>
          </div>
        </CardContent>
      </Card>
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

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API}/api/alyne/shop/categories`);
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async (category = null) => {
    setLoading(true);
    try {
      const url = category 
        ? `${API}/api/alyne/shop/products?category=${category}`
        : `${API}/api/alyne/shop/products`;
      const response = await fetch(url);
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? {...p, quantity: p.quantity + 1} : p);
      }
      return [...prev, {...product, quantity: 1}];
    });
    toast.success(`${product.name} added to cart`);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="space-y-6 mt-4">
      {/* Header with Cart */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Kids Shop</h3>
          <p className="text-sm text-gray-500">by Orange Pharmacy</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowCart(true)}
          className="relative"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Cart
          {cart.length > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-[#e85a7b]">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </Badge>
          )}
        </Button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => { setSelectedCategory(null); fetchProducts(); }}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
            !selectedCategory ? 'bg-[#2d7a6d] text-white' : 'bg-white border hover:bg-gray-50'
          }`}
        >
          All Products
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setSelectedCategory(cat.id); fetchProducts(cat.id); }}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedCategory === cat.id ? 'bg-[#2d7a6d] text-white' : 'bg-white border hover:bg-gray-50'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="w-full h-32 bg-gray-200 rounded-lg mb-3"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))
        ) : (
          products.map(product => (
            <Card key={product.id} className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all">
              <div className="p-4">
                <div className="w-full h-24 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  <Package className="w-12 h-12 text-gray-300" />
                </div>
                {product.bestseller && (
                  <Badge className="bg-[#e85a7b] text-xs mb-2">Bestseller</Badge>
                )}
                <h4 className="font-medium text-sm line-clamp-2">{product.name}</h4>
                <p className="text-xs text-gray-500">{product.brand} • {product.unit}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs text-gray-600">{product.rating}</span>
                  <span className="text-xs text-gray-400">({product.reviews})</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="font-bold text-[#2d7a6d]">₹{product.price}</p>
                    <p className="text-xs text-gray-400 line-through">₹{product.mrp}</p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => addToCart(product)}
                    className="bg-[#2d7a6d] hover:bg-[#245f55] rounded-full"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Your Cart</DialogTitle>
          </DialogHeader>
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">₹{item.price} × {item.quantity}</p>
                  </div>
                  <p className="font-bold">₹{item.price * item.quantity}</p>
                </div>
              ))}
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-[#2d7a6d]">₹{cartTotal}</span>
                </div>
                {cartTotal < 500 && (
                  <p className="text-xs text-orange-500 mt-1">Add ₹{500 - cartTotal} more for free delivery</p>
                )}
              </div>
              <Button className="w-full bg-[#2d7a6d]" onClick={() => toast.success('Order placed!')}>
                Place Order
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Documents Tab Component
const DocumentsTab = ({ child }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: '', type: 'immunization_record', file: null });

  useEffect(() => {
    fetchDocuments();
  }, [child.id]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API}/api/alyne/documents/${child.id}`);
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setNewDoc({...newDoc, file: reader.result, fileName: file.name, fileType: file.type.split('/')[1]});
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadDocument = async () => {
    if (!newDoc.name || !newDoc.file) {
      toast.error('Please provide document name and file');
      return;
    }

    setUploading(true);
    try {
      const response = await fetch(`${API}/api/alyne/documents/${child.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDoc.name,
          type: newDoc.type,
          file_data: newDoc.file,
          file_type: newDoc.fileType || 'pdf'
        })
      });
      
      if (response.ok) {
        toast.success('Document uploaded!');
        setShowUpload(false);
        setNewDoc({ name: '', type: 'immunization_record', file: null });
        fetchDocuments();
      }
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      const response = await fetch(`${API}/api/alyne/documents/${docId}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Document deleted');
        fetchDocuments();
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-6 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Documents</h3>
        <Button onClick={() => setShowUpload(true)} className="bg-[#2d7a6d]">
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {loading ? (
          <div className="col-span-2 text-center py-10">Loading...</div>
        ) : documents.length === 0 ? (
          <Card className="col-span-2 bg-white border-0 p-8 text-center rounded-2xl">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No documents uploaded yet</p>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} className="bg-white border-0 shadow-lg rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#2d7a6d]/10 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[#2d7a6d]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-xs text-gray-500">{doc.type.replace('_', ' ')}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteDocument(doc.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document Name</Label>
              <Input 
                value={newDoc.name}
                onChange={(e) => setNewDoc({...newDoc, name: e.target.value})}
                placeholder="e.g., Vaccination Certificate"
              />
            </div>
            <div>
              <Label>Document Type</Label>
              <Select value={newDoc.type} onValueChange={(v) => setNewDoc({...newDoc, type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immunization_record">Immunization Record</SelectItem>
                  <SelectItem value="medical_report">Medical Report</SelectItem>
                  <SelectItem value="school_form">School Form</SelectItem>
                  <SelectItem value="prescription">Prescription</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={uploadDocument} disabled={uploading} className="bg-[#2d7a6d]">
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Alyne;
