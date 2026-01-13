import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Heart, Activity, Moon, Users, Calendar, FileText, 
  TrendingUp, TrendingDown, Plus, Edit2, Trash2, Download, 
  Clock, Pill, FlaskConical, Loader2, ChevronRight, AlertCircle,
  CheckCircle2, User, Baby, UserPlus, X
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const MyHealth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Health Summary State
  const [healthSummary, setHealthSummary] = useState(null);
  const [timeline, setTimeline] = useState([]);
  
  // Family State
  const [familyMembers, setFamilyMembers] = useState([]);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [familyForm, setFamilyForm] = useState({
    name: '',
    relation: 'spouse',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    phone: '',
    medical_conditions: []
  });
  
  // Blood Sugar Trends State
  const [bloodSugarTrends, setBloodSugarTrends] = useState(null);
  
  useEffect(() => {
    if (user?.id) {
      fetchHealthData();
    }
  }, [user]);
  
  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const [summaryRes, timelineRes, familyRes, trendsRes] = await Promise.all([
        axios.get(`${API}/health-records/summary/${user.id}`).catch(() => ({ data: null })),
        axios.get(`${API}/health-records/timeline/${user.id}?limit=20`).catch(() => ({ data: { timeline: [] } })),
        axios.get(`${API}/health-records/family/${user.id}`).catch(() => ({ data: { family_members: [] } })),
        axios.get(`${API}/health-records/trends/blood-sugar/${user.id}?months=6`).catch(() => ({ data: null }))
      ]);
      
      setHealthSummary(summaryRes.data);
      setTimeline(timelineRes.data?.timeline || []);
      setFamilyMembers(familyRes.data?.family_members || []);
      setBloodSugarTrends(trendsRes.data);
    } catch (error) {
      console.error('Error fetching health data:', error);
    }
    setLoading(false);
  };
  
  const handleAddFamily = async () => {
    if (!familyForm.name.trim()) {
      toast.error('Please enter name');
      return;
    }
    
    try {
      if (editingMember) {
        await axios.put(`${API}/health-records/family/${editingMember.id}`, familyForm);
        toast.success('Family member updated');
      } else {
        await axios.post(`${API}/health-records/family/${user.id}`, familyForm);
        toast.success('Family member added');
      }
      
      setShowAddFamily(false);
      setEditingMember(null);
      setFamilyForm({ name: '', relation: 'spouse', date_of_birth: '', gender: '', blood_group: '', phone: '', medical_conditions: [] });
      fetchHealthData();
    } catch (error) {
      toast.error('Failed to save family member');
    }
  };
  
  const handleDeleteFamily = async (memberId) => {
    if (!window.confirm('Remove this family member?')) return;
    
    try {
      await axios.delete(`${API}/health-records/family/${memberId}`);
      toast.success('Family member removed');
      fetchHealthData();
    } catch (error) {
      toast.error('Failed to remove family member');
    }
  };
  
  const getTimelineIcon = (type) => {
    switch (type) {
      case 'appointment': return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'diagnostic': return <FlaskConical className="w-4 h-4 text-purple-500" />;
      case 'pharmacy': return <Pill className="w-4 h-4 text-orange-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-gray-500 mb-4">Please login to view your health records</p>
          <Button onClick={() => navigate('/')}>Go to Home</Button>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} data-testid="back-btn">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold text-xl text-gray-900">My Health</h1>
                <p className="text-sm text-gray-500">Your complete health dashboard</p>
              </div>
            </div>
            <Heart className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
            <TabsTrigger value="family" data-testid="tab-family">Family</TabsTrigger>
            <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
          </TabsList>
          
          {/* OVERVIEW TAB */}
          <TabsContent value="overview">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-4">
                      <Calendar className="w-6 h-6 mb-2 opacity-80" />
                      <p className="text-2xl font-bold">{healthSummary?.stats?.total_appointments || 0}</p>
                      <p className="text-sm opacity-80">Appointments</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardContent className="p-4">
                      <FlaskConical className="w-6 h-6 mb-2 opacity-80" />
                      <p className="text-2xl font-bold">{healthSummary?.stats?.total_diagnostic_tests || 0}</p>
                      <p className="text-sm opacity-80">Lab Tests</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <CardContent className="p-4">
                      <Pill className="w-6 h-6 mb-2 opacity-80" />
                      <p className="text-2xl font-bold">{healthSummary?.stats?.total_pharmacy_orders || 0}</p>
                      <p className="text-sm opacity-80">Medicine Orders</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardContent className="p-4">
                      <Activity className="w-6 h-6 mb-2 opacity-80" />
                      <p className="text-2xl font-bold">{healthSummary?.stats?.blood_sugar_readings || 0}</p>
                      <p className="text-sm opacity-80">Health Logs</p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-500" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {healthSummary?.appointments?.length > 0 ? (
                      <div className="space-y-3">
                        {healthSummary.appointments.slice(0, 5).map((apt, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">{apt.doctor}</p>
                                <p className="text-sm text-gray-500">{apt.clinic}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{apt.date}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                apt.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                apt.status === 'Booked' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {apt.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No recent activity</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/diagyn')}>
                    <Calendar className="w-6 h-6 text-blue-500" />
                    <span>Book Appointment</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/proton')}>
                    <FlaskConical className="w-6 h-6 text-purple-500" />
                    <span>Book Lab Test</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/pharmacy')}>
                    <Pill className="w-6 h-6 text-orange-500" />
                    <span>Order Medicines</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/health-packages')}>
                    <Heart className="w-6 h-6 text-red-500" />
                    <span>Health Packages</span>
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* TIMELINE TAB */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Health Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                    <div className="space-y-4">
                      {timeline.map((item, idx) => (
                        <div key={idx} className="relative pl-10">
                          <div className="absolute left-2 w-5 h-5 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                            {getTimelineIcon(item.type)}
                          </div>
                          <Card className="p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{item.title}</p>
                                <p className="text-sm text-gray-500">{item.subtitle}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-500">{item.date}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  item.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                  item.status === 'Booked' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {item.status}
                                </span>
                              </div>
                            </div>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No health records yet</p>
                    <p className="text-sm">Your appointments, tests, and orders will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* FAMILY TAB */}
          <TabsContent value="family">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Family Members</h2>
                <Button onClick={() => setShowAddFamily(true)} data-testid="add-family-btn">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Self Card */}
                <Card className="border-2 border-blue-200 bg-blue-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{user?.name}</p>
                        <p className="text-sm text-blue-600">Self (Primary)</p>
                        <p className="text-sm text-gray-500">{user?.phone}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Family Members */}
                {familyMembers.map((member) => (
                  <Card key={member.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xl font-bold">
                          {member.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{member.name}</p>
                          <p className="text-sm text-gray-500 capitalize">{member.relation}</p>
                          {member.blood_group && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              {member.blood_group}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setEditingMember(member);
                              setFamilyForm(member);
                              setShowAddFamily(true);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteFamily(member.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {familyMembers.length === 0 && (
                  <Card className="border-dashed border-2 hover:border-blue-300 cursor-pointer" onClick={() => setShowAddFamily(true)}>
                    <CardContent className="p-8 text-center">
                      <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500">Add family members to book appointments for them</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* TRENDS TAB */}
          <TabsContent value="trends">
            <div className="space-y-6">
              {bloodSugarTrends?.trends ? (
                <>
                  {/* Insights */}
                  {bloodSugarTrends.insights?.length > 0 && (
                    <div className="space-y-3">
                      {bloodSugarTrends.insights.map((insight, idx) => (
                        <Card key={idx} className={`border-l-4 ${
                          insight.type === 'success' ? 'border-l-green-500 bg-green-50' :
                          insight.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50' :
                          'border-l-red-500 bg-red-50'
                        }`}>
                          <CardContent className="p-4 flex items-start gap-3">
                            {insight.type === 'success' ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            )}
                            <p className="text-sm">{insight.message}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {bloodSugarTrends.trends.fbs && (
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-gray-500 mb-1">Fasting Blood Sugar</p>
                          <p className="text-3xl font-bold text-blue-600">{bloodSugarTrends.trends.fbs.average}</p>
                          <p className="text-sm text-gray-500">mg/dL average</p>
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="text-green-600">Min: {bloodSugarTrends.trends.fbs.min}</span>
                            <span className="text-red-600">Max: {bloodSugarTrends.trends.fbs.max}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {bloodSugarTrends.trends.ppbs && (
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-gray-500 mb-1">Post-Meal Sugar</p>
                          <p className="text-3xl font-bold text-purple-600">{bloodSugarTrends.trends.ppbs.average}</p>
                          <p className="text-sm text-gray-500">mg/dL average</p>
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="text-green-600">Min: {bloodSugarTrends.trends.ppbs.min}</span>
                            <span className="text-red-600">Max: {bloodSugarTrends.trends.ppbs.max}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {bloodSugarTrends.trends.hba1c && (
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-gray-500 mb-1">HbA1c</p>
                          <p className="text-3xl font-bold text-orange-600">{bloodSugarTrends.trends.hba1c.average}%</p>
                          <p className="text-sm text-gray-500">3-month average</p>
                          <div className="mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              bloodSugarTrends.trends.hba1c.average < 5.7 ? 'bg-green-100 text-green-700' :
                              bloodSugarTrends.trends.hba1c.average < 6.5 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {bloodSugarTrends.trends.hba1c.average < 5.7 ? 'Normal' :
                               bloodSugarTrends.trends.hba1c.average < 6.5 ? 'Pre-diabetic' : 'Diabetic'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  
                  {/* Recent Readings */}
                  {bloodSugarTrends.logs?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Recent Readings</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {bloodSugarTrends.logs.slice(0, 10).map((log, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm text-gray-600">{log.date}</span>
                              <div className="flex gap-4 text-sm">
                                {log.fbs && <span>FBS: <strong>{log.fbs}</strong></span>}
                                {log.ppbs && <span>PPBS: <strong>{log.ppbs}</strong></span>}
                                {log.hba1c && <span>HbA1c: <strong>{log.hba1c}%</strong></span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="p-8 text-center">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <h3 className="font-semibold mb-2">No Trend Data</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Start logging your blood sugar in Glydex to see trends and insights
                  </p>
                  <Button onClick={() => navigate('/glydex')}>
                    Go to Glydex
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Add/Edit Family Dialog */}
      <Dialog open={showAddFamily} onOpenChange={(open) => {
        setShowAddFamily(open);
        if (!open) {
          setEditingMember(null);
          setFamilyForm({ name: '', relation: 'spouse', date_of_birth: '', gender: '', blood_group: '', phone: '', medical_conditions: [] });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Edit Family Member' : 'Add Family Member'}</DialogTitle>
            <DialogDescription>Add family members to book appointments and track their health</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input 
                value={familyForm.name}
                onChange={(e) => setFamilyForm({...familyForm, name: e.target.value})}
                placeholder="Enter name"
              />
            </div>
            
            <div>
              <Label>Relation</Label>
              <select 
                className="w-full h-10 rounded-md border border-input bg-background px-3"
                value={familyForm.relation}
                onChange={(e) => setFamilyForm({...familyForm, relation: e.target.value})}
              >
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date of Birth</Label>
                <Input 
                  type="date"
                  value={familyForm.date_of_birth}
                  onChange={(e) => setFamilyForm({...familyForm, date_of_birth: e.target.value})}
                />
              </div>
              <div>
                <Label>Gender</Label>
                <select 
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                  value={familyForm.gender}
                  onChange={(e) => setFamilyForm({...familyForm, gender: e.target.value})}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Blood Group</Label>
                <select 
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                  value={familyForm.blood_group}
                  onChange={(e) => setFamilyForm({...familyForm, blood_group: e.target.value})}
                >
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div>
                <Label>Phone</Label>
                <Input 
                  value={familyForm.phone}
                  onChange={(e) => setFamilyForm({...familyForm, phone: e.target.value})}
                  placeholder="Phone number"
                />
              </div>
            </div>
            
            <Button className="w-full" onClick={handleAddFamily}>
              {editingMember ? 'Update Member' : 'Add Member'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyHealth;
