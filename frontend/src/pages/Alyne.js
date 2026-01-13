import React, { useState, useEffect } from 'react';
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
  Upload, Download, Eye, X, Settings
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
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Baby className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to ALYNE</h2>
          <p className="text-gray-600 mb-6">Kids Health & Care Portal</p>
          <p className="text-sm text-gray-500 mb-6">Please login to manage your child's health records</p>
          <Button onClick={() => navigate('/')} className="bg-gradient-to-r from-cyan-500 to-blue-500">
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img 
                src="https://customer-assets.emergentagent.com/job_kids-health-portal/artifacts/mrmio3uk_file_000000006cd87207b39dc03d0e62d1ad%20%281%29.png" 
                alt="ALYNE" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                  ALYNE
                </h1>
                <p className="text-xs text-gray-500">Kids Health & Care</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowAddChild(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-full"
              data-testid="add-child-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Child
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          </div>
        ) : children.length === 0 ? (
          <EmptyState onAddChild={() => setShowAddChild(true)} />
        ) : (
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar - Child Selector */}
            <div className="lg:col-span-1">
              <Card className="bg-white/70 backdrop-blur border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-500">My Children</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedChild(child)}
                      className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                        selectedChild?.id === child.id 
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg' 
                          : 'bg-white hover:bg-gray-50'
                      }`}
                      data-testid={`child-card-${child.id}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedChild?.id === child.id ? 'bg-white/20' : 'bg-gradient-to-br from-cyan-100 to-purple-100'
                      }`}>
                        <Baby className={`w-5 h-5 ${selectedChild?.id === child.id ? 'text-white' : 'text-cyan-600'}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">{child.name}</p>
                        <p className={`text-xs ${selectedChild?.id === child.id ? 'text-white/80' : 'text-gray-500'}`}>
                          {child.age_display} • {child.gender === 'male' ? '👦' : '👧'}
                        </p>
                      </div>
                      {child.region === 'india' ? <span className="text-lg">🇮🇳</span> : <span className="text-lg">🇺🇸</span>}
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {selectedChild && (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="bg-white/70 backdrop-blur p-1 rounded-xl mb-6 grid grid-cols-5">
                    <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
                      <Activity className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Dashboard</span>
                    </TabsTrigger>
                    <TabsTrigger value="vaccinations" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
                      <Syringe className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Vaccines</span>
                    </TabsTrigger>
                    <TabsTrigger value="growth" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Growth</span>
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
                      <FileText className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Documents</span>
                    </TabsTrigger>
                    <TabsTrigger value="health-log" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
                      <Heart className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Health Log</span>
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
                  <TabsContent value="documents">
                    <DocumentsTab child={selectedChild} />
                  </TabsContent>
                  <TabsContent value="health-log">
                    <HealthLogTab child={selectedChild} />
                  </TabsContent>
                </Tabs>
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

// Empty State Component
const EmptyState = ({ onAddChild }) => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="w-32 h-32 bg-gradient-to-br from-cyan-100 via-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
      <Baby className="w-16 h-16 text-cyan-500" />
    </div>
    <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to ALYNE!</h2>
    <p className="text-gray-600 mb-6 text-center max-w-md">
      Your one-stop portal for managing your child's health records, vaccinations, growth tracking, and more.
    </p>
    <Button 
      onClick={onAddChild}
      size="lg"
      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-full px-8"
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
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
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
                ? 'border-cyan-500 bg-cyan-50' 
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
                ? 'border-cyan-500 bg-cyan-50' 
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
          className="bg-gradient-to-r from-cyan-500 to-blue-500"
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
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white/50 rounded-xl"></div>)}
      </div>
    </div>;
  }

  const vaxStats = dashboard?.vaccination_stats || { done: 0, due: 0, overdue: 0, total: 0 };
  const progress = vaxStats.total > 0 ? Math.round((vaxStats.done / vaxStats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Child Profile Card */}
      <Card className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white border-0 shadow-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur">
              <span className="text-4xl">{child.gender === 'male' ? '👦' : '👧'}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{child.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-white/90">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {child.age_display}
                </span>
                <span className="flex items-center gap-1">
                  {child.region === 'india' ? '🇮🇳 India' : '🇺🇸 USA'}
                </span>
                {child.blood_group && (
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {child.blood_group}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/80">Vaccination Progress</p>
              <p className="text-3xl font-bold">{progress}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/70 backdrop-blur border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{vaxStats.done}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-white/70 backdrop-blur border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">{vaxStats.due}</p>
            <p className="text-sm text-gray-500">Due Now</p>
          </CardContent>
        </Card>
        <Card className="bg-white/70 backdrop-blur border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{vaxStats.overdue}</p>
            <p className="text-sm text-gray-500">Overdue</p>
          </CardContent>
        </Card>
        <Card className="bg-white/70 backdrop-blur border-0 shadow-lg">
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
        <Card className="bg-white/70 backdrop-blur border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-500" />
              Latest Growth Record
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {dashboard.latest_growth.height_cm && (
                <div className="text-center p-4 bg-cyan-50 rounded-xl">
                  <Ruler className="w-6 h-6 text-cyan-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-cyan-600">{dashboard.latest_growth.height_cm} cm</p>
                  <p className="text-xs text-gray-500">Height</p>
                </div>
              )}
              {dashboard.latest_growth.weight_kg && (
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <Scale className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">{dashboard.latest_growth.weight_kg} kg</p>
                  <p className="text-xs text-gray-500">Weight</p>
                </div>
              )}
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <Calendar className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">{dashboard.latest_growth.date}</p>
                <p className="text-xs text-gray-500">Recorded On</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Reminders */}
      {dashboard?.upcoming_reminders?.length > 0 && (
        <Card className="bg-white/70 backdrop-blur border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-500" />
              Upcoming Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboard.upcoming_reminders.map((reminder, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <Bell className="w-4 h-4 text-yellow-500" />
                  <div className="flex-1">
                    <p className="font-medium">{reminder.title}</p>
                    <p className="text-xs text-gray-500">{reminder.due_date}</p>
                  </div>
                </div>
              ))}
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
    <div className="space-y-6">
      {/* Progress Bar */}
      <Card className="bg-white/70 backdrop-blur border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Vaccination Progress</span>
            <span className="text-lg font-bold text-cyan-600">{progress}%</span>
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
            className={filter === f ? 'bg-cyan-500' : ''}
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
          <Card className="bg-white/70 backdrop-blur border-0 p-8 text-center">
            <p className="text-gray-500">No vaccinations in this category</p>
          </Card>
        ) : (
          filteredVax.map((vax) => (
            <Card key={vax.id} className={`bg-white/70 backdrop-blur border-0 shadow transition-all hover:shadow-lg ${
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
                      <Badge variant={
                        vax.status === 'done' ? 'success' :
                        vax.status === 'overdue' ? 'destructive' :
                        vax.status === 'due' ? 'warning' : 'secondary'
                      } className={
                        vax.status === 'done' ? 'bg-green-100 text-green-700' :
                        vax.status === 'overdue' ? 'bg-red-100 text-red-700' :
                        vax.status === 'due' ? 'bg-yellow-100 text-yellow-700' : ''
                      }>
                        {vax.dose}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{vax.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Scheduled: {vax.scheduled_date}
                      {vax.administered_date && ` • Given: ${vax.administered_date}`}
                    </p>
                  </div>
                  {vax.status !== 'done' && (
                    <Button
                      size="sm"
                      onClick={() => updateVaccination(vax.id, 'done')}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mark Done
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
    head_circumference_cm: '',
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
          weight_kg: newRecord.weight_kg ? parseFloat(newRecord.weight_kg) : null,
          head_circumference_cm: newRecord.head_circumference_cm ? parseFloat(newRecord.head_circumference_cm) : null
        })
      });
      
      if (response.ok) {
        toast.success('Growth record added!');
        setShowAdd(false);
        setNewRecord({ date: new Date().toISOString().split('T')[0], height_cm: '', weight_kg: '', head_circumference_cm: '', notes: '' });
        fetchGrowth();
      }
    } catch (error) {
      toast.error('Failed to add record');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Growth Records</h3>
        <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-cyan-500 to-blue-500">
          <Plus className="w-4 h-4 mr-2" />
          Add Measurement
        </Button>
      </div>

      {/* Latest Stats */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-cyan-400 to-cyan-600 text-white border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <Ruler className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p className="text-3xl font-bold">{records[0].height_cm || '--'}</p>
              <p className="text-sm opacity-80">Height (cm)</p>
              {records[0].height_percentile && (
                <Badge className="mt-2 bg-white/20">{records[0].height_percentile.percentile} percentile</Badge>
              )}
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-400 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <Scale className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p className="text-3xl font-bold">{records[0].weight_kg || '--'}</p>
              <p className="text-sm opacity-80">Weight (kg)</p>
              {records[0].weight_percentile && (
                <Badge className="mt-2 bg-white/20">{records[0].weight_percentile.percentile} percentile</Badge>
              )}
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-pink-400 to-pink-600 text-white border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p className="text-xl font-bold">{child.age_display}</p>
              <p className="text-sm opacity-80">Current Age</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Records List */}
      <Card className="bg-white/70 backdrop-blur border-0 shadow-lg">
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
                  <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-cyan-500" />
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

      {/* Add Record Dialog */}
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
            <div>
              <Label>Notes (optional)</Label>
              <Input 
                value={newRecord.notes}
                onChange={(e) => setNewRecord({...newRecord, notes: e.target.value})}
                placeholder="Any observations..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addGrowthRecord} className="bg-cyan-500">Save Record</Button>
          </DialogFooter>
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

  const documentTypes = [
    { value: 'immunization_record', label: 'Immunization Record', icon: Syringe },
    { value: 'medical_report', label: 'Medical Report', icon: FileText },
    { value: 'school_form', label: 'School Form', icon: FileText },
    { value: 'prescription', label: 'Prescription', icon: FileText },
    { value: 'other', label: 'Other', icon: FileText }
  ];

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Documents</h3>
        <Button onClick={() => setShowUpload(true)} className="bg-gradient-to-r from-cyan-500 to-blue-500">
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {loading ? (
          <div className="col-span-2 text-center py-10">Loading...</div>
        ) : documents.length === 0 ? (
          <Card className="col-span-2 bg-white/70 backdrop-blur border-0 p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No documents uploaded yet</p>
            <p className="text-sm text-gray-400">Upload immunization records, medical reports, and more</p>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} className="bg-white/70 backdrop-blur border-0 shadow-lg hover:shadow-xl transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-cyan-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-xs text-gray-500">{doc.type.replace('_', ' ')} • {doc.file_type?.toUpperCase()}</p>
                    <p className="text-xs text-gray-400">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => deleteDocument(doc.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Upload Dialog */}
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
                placeholder="e.g., Vaccination Certificate 2024"
              />
            </div>
            <div>
              <Label>Document Type</Label>
              <Select value={newDoc.type} onValueChange={(v) => setNewDoc({...newDoc, type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map(dt => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File (PDF, JPG, PNG)</Label>
              <Input 
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="mt-1"
              />
              {newDoc.fileName && (
                <p className="text-sm text-green-600 mt-1">Selected: {newDoc.fileName}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={uploadDocument} disabled={uploading} className="bg-cyan-500">
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Health Log Tab Component
const HealthLogTab = ({ child }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'symptom',
    title: '',
    description: '',
    doctor_name: '',
    medications: []
  });

  useEffect(() => {
    fetchEntries();
  }, [child.id]);

  const fetchEntries = async () => {
    try {
      const response = await fetch(`${API}/api/alyne/health-log/${child.id}`);
      const data = await response.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Error fetching health log:', error);
    } finally {
      setLoading(false);
    }
  };

  const addEntry = async () => {
    if (!newEntry.title) {
      toast.error('Please enter a title');
      return;
    }

    try {
      const response = await fetch(`${API}/api/alyne/health-log/${child.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      });
      
      if (response.ok) {
        toast.success('Entry added!');
        setShowAdd(false);
        setNewEntry({ date: new Date().toISOString().split('T')[0], type: 'symptom', title: '', description: '', doctor_name: '', medications: [] });
        fetchEntries();
      }
    } catch (error) {
      toast.error('Failed to add entry');
    }
  };

  const deleteEntry = async (entryId) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      const response = await fetch(`${API}/api/alyne/health-log/${entryId}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Entry deleted');
        fetchEntries();
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const entryTypes = [
    { value: 'symptom', label: 'Symptom', icon: AlertTriangle, color: 'text-yellow-500 bg-yellow-100' },
    { value: 'doctor_visit', label: 'Doctor Visit', icon: User, color: 'text-blue-500 bg-blue-100' },
    { value: 'medication', label: 'Medication', icon: Heart, color: 'text-pink-500 bg-pink-100' },
    { value: 'note', label: 'General Note', icon: FileText, color: 'text-gray-500 bg-gray-100' }
  ];

  const getTypeStyle = (type) => entryTypes.find(t => t.value === type) || entryTypes[3];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Health Log</h3>
        <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-cyan-500 to-blue-500">
          <Plus className="w-4 h-4 mr-2" />
          Add Entry
        </Button>
      </div>

      {/* Entry Types Quick Filter */}
      <div className="flex gap-2 flex-wrap">
        {entryTypes.map(type => (
          <Badge key={type.value} variant="outline" className="px-3 py-1">
            <type.icon className={`w-3 h-3 mr-1 ${type.color.split(' ')[0]}`} />
            {type.label}
          </Badge>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : entries.length === 0 ? (
          <Card className="bg-white/70 backdrop-blur border-0 p-8 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No health log entries yet</p>
            <p className="text-sm text-gray-400">Record symptoms, doctor visits, and medications</p>
          </Card>
        ) : (
          entries.map((entry) => {
            const typeStyle = getTypeStyle(entry.type);
            return (
              <Card key={entry.id} className="bg-white/70 backdrop-blur border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeStyle.color}`}>
                      <typeStyle.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{entry.title}</p>
                        <Badge variant="outline" className="text-xs">{typeStyle.label}</Badge>
                      </div>
                      {entry.description && <p className="text-sm text-gray-600 mt-1">{entry.description}</p>}
                      {entry.doctor_name && <p className="text-xs text-blue-600 mt-1">Dr. {entry.doctor_name}</p>}
                      <p className="text-xs text-gray-400 mt-2">{entry.date}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteEntry(entry.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Entry Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Health Log Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input 
                  type="date" 
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={newEntry.type} onValueChange={(v) => setNewEntry({...newEntry, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {entryTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Title</Label>
              <Input 
                value={newEntry.title}
                onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
                placeholder="e.g., Mild fever, Regular checkup"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input 
                value={newEntry.description}
                onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                placeholder="Additional details..."
              />
            </div>
            {newEntry.type === 'doctor_visit' && (
              <div>
                <Label>Doctor Name</Label>
                <Input 
                  value={newEntry.doctor_name}
                  onChange={(e) => setNewEntry({...newEntry, doctor_name: e.target.value})}
                  placeholder="Doctor's name"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addEntry} className="bg-cyan-500">Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Alyne;
