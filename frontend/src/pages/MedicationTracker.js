import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Pill, Plus, Check, X, Clock, Calendar,
  Bell, TrendingUp, AlertTriangle, Settings, Loader2,
  Sun, Moon, Sunrise, Sunset, SkipForward, History,
  Award, Target, Edit, Trash2, CheckCircle, AlertCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const MedicationTracker = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('today');
  const [loading, setLoading] = useState(true);
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [medications, setMedications] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [history, setHistory] = useState(null);
  const [refillAlerts, setRefillAlerts] = useState([]);
  const [showAddMed, setShowAddMed] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  
  // New medication form
  const [medForm, setMedForm] = useState({
    name: '',
    dosage: '',
    frequency: 'once_daily',
    times: ['09:00'],
    instructions: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    quantity: '',
    refill_reminder_days: 3,
    notes: '',
    color: '#14b8a6'
  });
  
  const frequencies = [
    { value: 'once_daily', label: 'Once Daily', times: ['09:00'] },
    { value: 'twice_daily', label: 'Twice Daily', times: ['09:00', '21:00'] },
    { value: 'thrice_daily', label: 'Three Times Daily', times: ['08:00', '14:00', '20:00'] },
    { value: 'four_times', label: 'Four Times Daily', times: ['06:00', '12:00', '18:00', '22:00'] },
    { value: 'as_needed', label: 'As Needed', times: [] },
    { value: 'custom', label: 'Custom', times: [] }
  ];
  
  const instructions = [
    { value: '', label: 'No specific instructions' },
    { value: 'before_meal', label: 'Before meals' },
    { value: 'after_meal', label: 'After meals' },
    { value: 'with_meal', label: 'With meals' },
    { value: 'empty_stomach', label: 'On empty stomach' },
    { value: 'bedtime', label: 'At bedtime' }
  ];
  
  const colors = ['#14b8a6', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#6366f1'];
  
  useEffect(() => {
    if (user?.id) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [scheduleRes, medsRes, statsRes, alertsRes] = await Promise.all([
        axios.get(`${API}/medication-tracker/today/${user.id}`),
        axios.get(`${API}/medication-tracker/medications/${user.id}`),
        axios.get(`${API}/medication-tracker/statistics/${user.id}`),
        axios.get(`${API}/medication-tracker/refill-alerts/${user.id}`)
      ]);
      
      setTodaySchedule(scheduleRes.data);
      setMedications(medsRes.data?.medications || []);
      setStatistics(statsRes.data);
      setRefillAlerts(alertsRes.data?.alerts || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };
  
  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API}/medication-tracker/history/${user.id}?days=7`);
      setHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };
  
  const handleLogMedication = async (medicationId, scheduledTime, action) => {
    try {
      await axios.post(`${API}/medication-tracker/log/${user.id}`, {
        medication_id: medicationId,
        scheduled_time: scheduledTime,
        action: action
      });
      toast.success(action === 'taken' ? 'Medication logged!' : action === 'skipped' ? 'Dose skipped' : 'Snoozed');
      fetchData();
    } catch (error) {
      toast.error('Failed to log medication');
    }
  };
  
  const handleAddMedication = async () => {
    if (!medForm.name.trim() || !medForm.dosage.trim()) {
      toast.error('Please fill in medication name and dosage');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/medication-tracker/medications/${user.id}`, medForm);
      toast.success('Medication added!');
      setShowAddMed(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to add medication');
    }
    setLoading(false);
  };
  
  const handleUpdateMedication = async () => {
    if (!editingMed) return;
    
    setLoading(true);
    try {
      await axios.put(`${API}/medication-tracker/medications/${user.id}/${editingMed.id}`, medForm);
      toast.success('Medication updated!');
      setEditingMed(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to update medication');
    }
    setLoading(false);
  };
  
  const handleDeleteMedication = async (medicationId) => {
    if (!window.confirm('Remove this medication from tracking?')) return;
    
    try {
      await axios.delete(`${API}/medication-tracker/medications/${user.id}/${medicationId}`);
      toast.success('Medication removed');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove medication');
    }
  };
  
  const resetForm = () => {
    setMedForm({
      name: '',
      dosage: '',
      frequency: 'once_daily',
      times: ['09:00'],
      instructions: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      quantity: '',
      refill_reminder_days: 3,
      notes: '',
      color: '#14b8a6'
    });
  };
  
  const openEditMed = (med) => {
    setMedForm({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      times: med.times || ['09:00'],
      instructions: med.instructions || '',
      start_date: med.start_date,
      end_date: med.end_date || '',
      quantity: med.quantity || '',
      refill_reminder_days: med.refill_reminder_days || 3,
      notes: med.notes || '',
      color: med.color || '#14b8a6'
    });
    setEditingMed(med);
  };
  
  const handleFrequencyChange = (value) => {
    const freq = frequencies.find(f => f.value === value);
    setMedForm(prev => ({
      ...prev,
      frequency: value,
      times: freq?.times || prev.times
    }));
  };
  
  const addTime = () => {
    setMedForm(prev => ({ ...prev, times: [...prev.times, '12:00'] }));
  };
  
  const removeTime = (index) => {
    setMedForm(prev => ({ ...prev, times: prev.times.filter((_, i) => i !== index) }));
  };
  
  const updateTime = (index, value) => {
    setMedForm(prev => ({
      ...prev,
      times: prev.times.map((t, i) => i === index ? value : t)
    }));
  };
  
  const getTimeIcon = (time) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 5 && hour < 12) return <Sunrise className="w-4 h-4 text-orange-400" />;
    if (hour >= 12 && hour < 17) return <Sun className="w-4 h-4 text-yellow-500" />;
    if (hour >= 17 && hour < 21) return <Sunset className="w-4 h-4 text-orange-500" />;
    return <Moon className="w-4 h-4 text-indigo-400" />;
  };
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'taken': return <Badge className="bg-green-100 text-green-700"><Check className="w-3 h-3 mr-1" />Taken</Badge>;
      case 'skipped': return <Badge className="bg-gray-100 text-gray-600"><SkipForward className="w-3 h-3 mr-1" />Skipped</Badge>;
      case 'overdue': return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
      case 'pending': return <Badge className="bg-blue-100 text-blue-700"><Clock className="w-3 h-3 mr-1" />Upcoming</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <Pill className="w-12 h-12 mx-auto text-teal-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Medication Tracker</h2>
            <p className="text-gray-600 mb-4">Please login to track your medications and set reminders.</p>
            <Button onClick={() => navigate('/')}>Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Pill className="w-6 h-6 text-teal-600" />
                  Medication Tracker
                </h1>
                <p className="text-gray-500 text-sm">Track your medications & adherence</p>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setShowAddMed(true); }} data-testid="add-medication-btn">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Stats */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <Pill className="w-6 h-6 mx-auto text-teal-500 mb-1" />
                <p className="text-2xl font-bold">{statistics.active_medications}</p>
                <p className="text-xs text-gray-500">Active Meds</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 mx-auto text-green-500 mb-1" />
                <p className="text-2xl font-bold">{statistics.adherence_rate}%</p>
                <p className="text-xs text-gray-500">Adherence</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Award className="w-6 h-6 mx-auto text-yellow-500 mb-1" />
                <p className="text-2xl font-bold">{statistics.current_streak}</p>
                <p className="text-xs text-gray-500">Day Streak</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="w-6 h-6 mx-auto text-blue-500 mb-1" />
                <p className="text-2xl font-bold">{statistics.doses_taken}</p>
                <p className="text-xs text-gray-500">Doses Taken</p>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Refill Alerts */}
        {refillAlerts.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-orange-700 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5" />
                Refill Needed
              </h3>
              <div className="space-y-2">
                {refillAlerts.map((alert) => (
                  <div key={alert.medication_id} className="flex items-center justify-between bg-white p-2 rounded">
                    <span>{alert.medication_name}</span>
                    <Badge variant={alert.urgency === 'high' ? 'destructive' : 'outline'}>
                      {alert.days_left} days left
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === 'history') fetchHistory(); }}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="today">
              <Clock className="w-4 h-4 mr-1" />
              Today
            </TabsTrigger>
            <TabsTrigger value="medications">
              <Pill className="w-4 h-4 mr-1" />
              My Meds
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-1" />
              History
            </TabsTrigger>
          </TabsList>
          
          {/* Today's Schedule */}
          <TabsContent value="today" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
              </div>
            ) : todaySchedule?.schedule?.length > 0 ? (
              <>
                {/* Adherence Progress */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Today's Progress</span>
                      <span className="font-semibold">{todaySchedule.summary.adherence_rate}%</span>
                    </div>
                    <Progress value={todaySchedule.summary.adherence_rate} className="h-2" />
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>{todaySchedule.summary.taken} taken</span>
                      <span>{todaySchedule.summary.pending} pending</span>
                      <span>{todaySchedule.summary.overdue} overdue</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Schedule List */}
                {todaySchedule.schedule.map((item, idx) => (
                  <Card key={idx} className="overflow-hidden" style={{ borderLeftColor: item.color, borderLeftWidth: '4px' }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getTimeIcon(item.scheduled_time)}
                          <div>
                            <p className="font-semibold">{item.medication_name}</p>
                            <p className="text-sm text-gray-500">{item.dosage} • {item.scheduled_time}</p>
                            {item.instructions && (
                              <p className="text-xs text-gray-400">{item.instructions.replace('_', ' ')}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === 'taken' || item.status === 'skipped' ? (
                            getStatusBadge(item.status)
                          ) : (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-green-500 hover:bg-green-600 h-10 w-10"
                                onClick={() => handleLogMedication(item.medication_id, item.scheduled_time, 'taken')}
                                data-testid={`take-med-${idx}`}
                              >
                                <Check className="w-5 h-5" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-10 w-10"
                                onClick={() => handleLogMedication(item.medication_id, item.scheduled_time, 'skipped')}
                              >
                                <SkipForward className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Pill className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Medications Today</h3>
                  <p className="text-gray-500 mb-4">Add your medications to start tracking</p>
                  <Button onClick={() => setShowAddMed(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Medication
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* My Medications */}
          <TabsContent value="medications" className="mt-4 space-y-3">
            {medications.length > 0 ? (
              medications.map((med) => (
                <Card key={med.id} style={{ borderLeftColor: med.color || '#14b8a6', borderLeftWidth: '4px' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{med.name}</h3>
                        <p className="text-sm text-gray-500">{med.dosage}</p>
                        <p className="text-xs text-gray-400">
                          {frequencies.find(f => f.value === med.frequency)?.label || med.frequency}
                          {med.times?.length > 0 && ` • ${med.times.join(', ')}`}
                        </p>
                        {med.instructions && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {med.instructions.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEditMed(med)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteMedication(med.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {med.remaining_quantity !== undefined && med.quantity && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Remaining</span>
                          <span>{med.remaining_quantity}/{med.quantity}</span>
                        </div>
                        <Progress value={(med.remaining_quantity / med.quantity) * 100} className="h-1" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Pill className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Medications Added</h3>
                  <p className="text-gray-500 mb-4">Start by adding your medications</p>
                  <Button onClick={() => setShowAddMed(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Medication
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* History */}
          <TabsContent value="history" className="mt-4 space-y-3">
            {history ? (
              <>
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">Last 7 Days Summary</h3>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-green-50 p-2 rounded">
                        <p className="text-lg font-bold text-green-600">{history.statistics.doses_taken}</p>
                        <p className="text-xs text-gray-500">Taken</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-lg font-bold text-gray-600">{history.statistics.doses_skipped}</p>
                        <p className="text-xs text-gray-500">Skipped</p>
                      </div>
                      <div className="bg-blue-50 p-2 rounded">
                        <p className="text-lg font-bold text-blue-600">{history.statistics.adherence_rate}%</p>
                        <p className="text-xs text-gray-500">Adherence</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Daily breakdown */}
                {Object.entries(history.history || {}).map(([date, data]) => (
                  <Card key={date}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{new Date(date).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                          <p className="text-sm text-gray-500">{data.taken}/{data.total} doses taken</p>
                        </div>
                        <Progress value={(data.taken / data.total) * 100} className="w-24 h-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Add/Edit Medication Dialog */}
      <Dialog open={showAddMed || editingMed !== null} onOpenChange={(open) => { if (!open) { setShowAddMed(false); setEditingMed(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMed ? 'Edit Medication' : 'Add New Medication'}</DialogTitle>
            <DialogDescription>
              {editingMed ? 'Update medication details' : 'Enter your medication details to start tracking'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Name & Dosage */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Medication Name *</Label>
                <Input 
                  placeholder="e.g., Metformin"
                  value={medForm.name}
                  onChange={(e) => setMedForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Dosage *</Label>
                <Input 
                  placeholder="e.g., 500mg"
                  value={medForm.dosage}
                  onChange={(e) => setMedForm(prev => ({ ...prev, dosage: e.target.value }))}
                />
              </div>
            </div>
            
            {/* Frequency */}
            <div>
              <Label>Frequency</Label>
              <Select value={medForm.frequency} onValueChange={handleFrequencyChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Times */}
            {medForm.frequency !== 'as_needed' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Reminder Times</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addTime}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Time
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {medForm.times.map((time, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => updateTime(idx, e.target.value)}
                        className="w-28"
                      />
                      {medForm.times.length > 1 && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeTime(idx)}>
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Instructions */}
            <div>
              <Label>Instructions</Label>
              <Select value={medForm.instructions} onValueChange={(v) => setMedForm(prev => ({ ...prev, instructions: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select instruction" />
                </SelectTrigger>
                <SelectContent>
                  {instructions.map((inst) => (
                    <SelectItem key={inst.value} value={inst.value}>{inst.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input 
                  type="date"
                  value={medForm.start_date}
                  onChange={(e) => setMedForm(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Date (Optional)</Label>
                <Input 
                  type="date"
                  value={medForm.end_date}
                  onChange={(e) => setMedForm(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
            
            {/* Quantity & Refill */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total Quantity</Label>
                <Input 
                  type="number"
                  placeholder="e.g., 30 tablets"
                  value={medForm.quantity}
                  onChange={(e) => setMedForm(prev => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
              <div>
                <Label>Refill Reminder (days before)</Label>
                <Input 
                  type="number"
                  value={medForm.refill_reminder_days}
                  onChange={(e) => setMedForm(prev => ({ ...prev, refill_reminder_days: parseInt(e.target.value) || 3 }))}
                />
              </div>
            </div>
            
            {/* Color */}
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full ${medForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setMedForm(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>
            
            {/* Notes */}
            <div>
              <Label>Notes (Optional)</Label>
              <Input 
                placeholder="Any additional notes"
                value={medForm.notes}
                onChange={(e) => setMedForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            
            <Button 
              onClick={editingMed ? handleUpdateMedication : handleAddMedication} 
              className="w-full"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingMed ? 'Update Medication' : 'Add Medication'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicationTracker;
