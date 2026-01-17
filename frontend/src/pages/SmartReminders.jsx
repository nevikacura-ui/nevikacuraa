import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import Footer from '@/components/Footer';
import {
  ArrowLeft, Pill, Clock, Plus, Check, X, Bell, AlertTriangle,
  RefreshCw, Loader2, Calendar, TrendingUp, ChevronRight,
  Package, History, Sun, Moon, Sunrise, Sunset, BellRing,
  Activity, Target, Award, Sparkles, FileText, Import
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Status colors
const getStatusStyle = (status) => {
  switch (status) {
    case 'taken': return 'bg-green-100 text-green-700 border-green-300';
    case 'skipped': return 'bg-red-100 text-red-700 border-red-300';
    case 'missed': return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'pending': return 'bg-blue-100 text-blue-700 border-blue-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

// Time of day icon
const getTimeIcon = (time) => {
  const hour = parseInt(time.split(':')[0]);
  if (hour >= 5 && hour < 12) return <Sunrise className="w-4 h-4 text-amber-500" />;
  if (hour >= 12 && hour < 17) return <Sun className="w-4 h-4 text-yellow-500" />;
  if (hour >= 17 && hour < 21) return <Sunset className="w-4 h-4 text-orange-500" />;
  return <Moon className="w-4 h-4 text-indigo-500" />;
};

const SmartReminders = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('today');
  
  // Data states
  const [reminders, setReminders] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [stats, setStats] = useState({});
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [adherenceHistory, setAdherenceHistory] = useState([]);
  
  // Form states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [prescriptionId, setPrescriptionId] = useState('');
  const [importing, setImporting] = useState(false);
  const [newReminder, setNewReminder] = useState({
    medicine_name: '',
    dosage: '',
    frequency: 'once_daily',
    time_slots: ['09:00'],
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
    total_quantity: 30
  });

  const headers = { Authorization: `Bearer ${token}` };

  // Fetch all data
  const fetchData = useCallback(async (showRefresh = false) => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (showRefresh) setRefreshing(true);
    
    try {
      const [remindersRes, scheduleRes, historyRes] = await Promise.all([
        axios.get(`${API}/api/medicine-reminders/my-reminders`, { headers }),
        axios.get(`${API}/api/medicine-reminders/today`, { headers }),
        axios.get(`${API}/api/medicine-reminders/adherence-history?days=14`, { headers })
      ]);
      
      setReminders(remindersRes.data.reminders || []);
      setStats(remindersRes.data.stats || {});
      setLowStockAlerts(remindersRes.data.low_stock_alerts || []);
      setTodaySchedule(scheduleRes.data.schedule || []);
      setAdherenceHistory(historyRes.data.history || []);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
      if (showRefresh) toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create new reminder
  const handleCreateReminder = async () => {
    if (!newReminder.medicine_name || !newReminder.dosage) {
      toast.error('Please fill in medicine name and dosage');
      return;
    }
    
    try {
      await axios.post(`${API}/api/medicine-reminders/create`, {
        ...newReminder,
        end_date: newReminder.end_date || null
      }, { headers });
      toast.success('Reminder created successfully!');
      setShowAddDialog(false);
      setNewReminder({
        medicine_name: '',
        dosage: '',
        frequency: 'once_daily',
        time_slots: ['09:00'],
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        notes: '',
        total_quantity: 30
      });
      fetchData(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create reminder');
    }
  };

  // Import from prescription
  const handleImportFromPrescription = async () => {
    if (!prescriptionId.trim()) {
      toast.error('Please enter a prescription or order ID');
      return;
    }
    
    setImporting(true);
    try {
      const res = await axios.post(`${API}/api/medicine-reminders/from-prescription/${prescriptionId.trim()}`, {}, { headers });
      toast.success(res.data.message || 'Reminders imported successfully!');
      setShowImportDialog(false);
      setPrescriptionId('');
      fetchData(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to import from prescription');
    } finally {
      setImporting(false);
    }
  };

  // Log medicine taken/skipped
  const handleLogMedicine = async (reminderId, skipped = false, skipReason = '') => {
    try {
      await axios.post(`${API}/api/medicine-reminders/log`, {
        reminder_id: reminderId,
        skipped,
        skip_reason: skipReason
      }, { headers });
      
      toast.success(skipped ? 'Marked as skipped' : 'Marked as taken!');
      fetchData(true);
    } catch (error) {
      toast.error('Failed to log');
    }
  };

  // Delete reminder
  const handleDeleteReminder = async (reminderId) => {
    if (!window.confirm('Delete this reminder?')) return;
    
    try {
      await axios.delete(`${API}/api/medicine-reminders/${reminderId}`, { headers });
      toast.success('Reminder deleted');
      fetchData(true);
    } catch (error) {
      toast.error('Failed to delete reminder');
    }
  };

  // Update frequency and time slots
  const handleFrequencyChange = (freq) => {
    let slots = ['09:00'];
    switch (freq) {
      case 'twice_daily':
        slots = ['09:00', '21:00'];
        break;
      case 'thrice_daily':
        slots = ['08:00', '14:00', '20:00'];
        break;
      case 'four_times':
        slots = ['08:00', '12:00', '16:00', '20:00'];
        break;
      default:
        slots = ['09:00'];
    }
    setNewReminder(prev => ({ ...prev, frequency: freq, time_slots: slots }));
  };

  // Calculate today's progress
  const todayProgress = todaySchedule.length > 0 
    ? Math.round((todaySchedule.filter(s => s.status === 'taken').length / todaySchedule.length) * 100)
    : 0;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
        <header className="bg-white border-b sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} data-testid="back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg text-teal-700">Smart Medicine Reminders</h1>
              <p className="text-sm text-gray-500">Never miss a dose</p>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <Pill className="w-16 h-16 mx-auto mb-4 text-teal-500" />
            <h2 className="text-xl font-bold mb-2">Login Required</h2>
            <p className="text-gray-600 mb-6">Please login to manage your medicine reminders</p>
            <Button onClick={() => navigate('/')} className="bg-teal-600 hover:bg-teal-700">
              Go to Login
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your reminders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} data-testid="back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg text-teal-700 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Smart Reminders
              </h1>
              <p className="text-sm text-gray-500">AI-powered medicine tracking</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => fetchData(true)} disabled={refreshing} data-testid="refresh-btn">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setShowAddDialog(true)} className="bg-teal-600 hover:bg-teal-700" data-testid="add-reminder-btn">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Today's Progress Hero */}
        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white overflow-hidden relative">
          <div className="absolute right-0 top-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute left-0 bottom-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-sm mb-1">Today's Progress</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{todayProgress}%</span>
                  <span className="text-teal-200">completed</span>
                </div>
                <p className="text-teal-100 mt-2">
                  {todaySchedule.filter(s => s.status === 'taken').length} of {todaySchedule.length} doses taken
                </p>
              </div>
              <div className="text-right">
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
                  {todayProgress === 100 ? (
                    <Award className="w-12 h-12 text-amber-300" />
                  ) : (
                    <Target className="w-12 h-12 text-white" />
                  )}
                </div>
              </div>
            </div>
            <Progress value={todayProgress} className="mt-4 h-2 bg-white/30" />
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <Pill className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-green-700">Active</p>
                  <p className="text-xl font-bold text-green-800">{stats.total_active || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-blue-700">Adherence</p>
                  <p className="text-xl font-bold text-blue-800">{stats.adherence_rate_7d || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-purple-700">Taken (7d)</p>
                  <p className="text-xl font-bold text-purple-800">{stats.doses_taken_7d || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className={`bg-gradient-to-br ${stats.low_stock_count > 0 ? 'from-red-50 to-red-100 border-red-200' : 'from-gray-50 to-gray-100 border-gray-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${stats.low_stock_count > 0 ? 'bg-red-500' : 'bg-gray-400'} flex items-center justify-center`}>
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className={`text-xs ${stats.low_stock_count > 0 ? 'text-red-700' : 'text-gray-600'}`}>Low Stock</p>
                  <p className={`text-xl font-bold ${stats.low_stock_count > 0 ? 'text-red-800' : 'text-gray-700'}`}>{stats.low_stock_count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alerts */}
        {lowStockAlerts.length > 0 && (
          <Card className="border-red-300 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-800 flex items-center gap-2 text-base">
                <AlertTriangle className="w-5 h-5" />
                Refill Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {lowStockAlerts.map((alert, idx) => (
                  <Badge key={idx} variant="destructive" className="flex items-center gap-1">
                    <Pill className="w-3 h-3" />
                    {alert.medicine_name}: {alert.remaining_quantity} left
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="today" className="flex items-center gap-1" data-testid="tab-today">
              <Clock className="w-4 h-4" />
              Today
            </TabsTrigger>
            <TabsTrigger value="medicines" className="flex items-center gap-1" data-testid="tab-medicines">
              <Pill className="w-4 h-4" />
              Medicines
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1" data-testid="tab-history">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Today's Schedule Tab */}
          <TabsContent value="today" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-teal-600" />
                      Today's Schedule
                    </CardTitle>
                    <CardDescription>
                      {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)} data-testid="import-btn">
                    <Import className="w-4 h-4 mr-1" />
                    Import
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {todaySchedule.length > 0 ? (
                  <div className="space-y-3">
                    {todaySchedule.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${getStatusStyle(item.status)}`}
                        data-testid={`schedule-item-${idx}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center min-w-[60px]">
                            {getTimeIcon(item.time_slot)}
                            <p className="font-bold text-lg">{item.time_slot}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-lg">{item.medicine_name}</p>
                            <p className="text-sm opacity-80">{item.dosage}</p>
                            {item.notes && <p className="text-xs opacity-60 mt-1">{item.notes}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.remaining_quantity !== undefined && item.remaining_quantity !== null && (
                            <Badge variant="outline" className="text-xs hidden sm:flex">
                              {item.remaining_quantity} left
                            </Badge>
                          )}
                          {item.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:bg-red-100"
                                onClick={() => handleLogMedicine(item.reminder_id, true, 'Skipped')}
                                data-testid={`skip-btn-${idx}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleLogMedicine(item.reminder_id, false)}
                                data-testid={`take-btn-${idx}`}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Take
                              </Button>
                            </>
                          )}
                          {item.status === 'taken' && (
                            <Badge className="bg-green-500">
                              <Check className="w-3 h-3 mr-1" />
                              Taken
                            </Badge>
                          )}
                          {item.status === 'skipped' && (
                            <Badge className="bg-red-500">Skipped</Badge>
                          )}
                          {item.status === 'missed' && (
                            <Badge className="bg-orange-500">Missed</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-teal-100 rounded-full flex items-center justify-center">
                      <Pill className="w-10 h-10 text-teal-500" />
                    </div>
                    <h3 className="font-semibold text-gray-700 mb-2">No Medicines Scheduled</h3>
                    <p className="text-gray-500 mb-4">Add your first medicine reminder to get started</p>
                    <Button onClick={() => setShowAddDialog(true)} className="bg-teal-600 hover:bg-teal-700">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Medicine
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Medicines Tab */}
          <TabsContent value="medicines" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>All Active Reminders</CardTitle>
                <CardDescription>{reminders.length} medicine(s) being tracked</CardDescription>
              </CardHeader>
              <CardContent>
                {reminders.length > 0 ? (
                  <div className="space-y-3">
                    {reminders.map((reminder, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        data-testid={`medicine-item-${idx}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                            <Pill className="w-6 h-6 text-teal-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{reminder.medicine_name}</p>
                            <p className="text-sm text-gray-500">
                              {reminder.dosage} • {reminder.frequency?.replace('_', ' ')}
                            </p>
                            <div className="flex gap-1 mt-1">
                              {reminder.time_slots?.map((slot, i) => (
                                <Badge key={i} variant="outline" className="text-xs px-1.5 py-0">
                                  {slot}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            {reminder.remaining_quantity !== undefined && reminder.remaining_quantity !== null && (
                              <p className={`text-sm ${reminder.remaining_quantity <= 5 ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                                {reminder.remaining_quantity} left
                              </p>
                            )}
                            {reminder.end_date && (
                              <p className="text-xs text-gray-400">Until {reminder.end_date}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteReminder(reminder.id)}
                            data-testid={`delete-medicine-${idx}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No active reminders</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  Adherence History (14 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {adherenceHistory.length > 0 ? (
                  <div>
                    {/* Bar Chart */}
                    <div className="flex items-end gap-1 h-32 mb-4 px-2">
                      {adherenceHistory.slice(0, 14).reverse().map((day, idx) => (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center group"
                          title={`${day.date}: ${day.adherence_rate}%`}
                        >
                          <div className="relative w-full flex justify-center">
                            <span className="absolute -top-5 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              {day.adherence_rate}%
                            </span>
                          </div>
                          <div
                            className={`w-full rounded-t-md transition-all ${
                              day.adherence_rate >= 80 ? 'bg-green-500' :
                              day.adherence_rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            } hover:opacity-80`}
                            style={{ height: `${Math.max(day.adherence_rate, 4)}%` }}
                          />
                          <span className="text-[10px] text-gray-400 mt-1">
                            {day.date.slice(-2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Daily breakdown */}
                    <div className="space-y-2 mt-6">
                      {adherenceHistory.slice(0, 7).map((day, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              day.adherence_rate >= 80 ? 'bg-green-500' :
                              day.adherence_rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            <span className="text-sm font-medium">
                              {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500">
                              {day.taken}/{day.total} doses
                            </span>
                            <Badge variant={day.adherence_rate >= 80 ? 'default' : day.adherence_rate >= 50 ? 'secondary' : 'destructive'}>
                              {day.adherence_rate}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No history yet. Start logging your medicines!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Medicine Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-teal-600" />
              Add Medicine Reminder
            </DialogTitle>
            <DialogDescription>Set up reminders to never miss a dose</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Medicine Name *</Label>
              <Input
                placeholder="e.g., Metformin 500mg"
                value={newReminder.medicine_name}
                onChange={(e) => setNewReminder(prev => ({ ...prev, medicine_name: e.target.value }))}
                data-testid="medicine-name-input"
              />
            </div>
            <div>
              <Label>Dosage *</Label>
              <Input
                placeholder="e.g., 1 tablet"
                value={newReminder.dosage}
                onChange={(e) => setNewReminder(prev => ({ ...prev, dosage: e.target.value }))}
                data-testid="dosage-input"
              />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={newReminder.frequency} onValueChange={handleFrequencyChange}>
                <SelectTrigger data-testid="frequency-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once_daily">Once Daily</SelectItem>
                  <SelectItem value="twice_daily">Twice Daily</SelectItem>
                  <SelectItem value="thrice_daily">Three Times Daily</SelectItem>
                  <SelectItem value="four_times">Four Times Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Time Slots</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {newReminder.time_slots.map((slot, idx) => (
                  <Badge key={idx} variant="outline" className="text-sm">
                    {getTimeIcon(slot)}
                    <span className="ml-1">{slot}</span>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newReminder.start_date}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, start_date: e.target.value }))}
                  data-testid="start-date-input"
                />
              </div>
              <div>
                <Label>End Date (Optional)</Label>
                <Input
                  type="date"
                  value={newReminder.end_date}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, end_date: e.target.value }))}
                  data-testid="end-date-input"
                />
              </div>
            </div>
            <div>
              <Label>Quantity (for refill alerts)</Label>
              <Input
                type="number"
                placeholder="30"
                value={newReminder.total_quantity}
                onChange={(e) => setNewReminder(prev => ({ ...prev, total_quantity: parseInt(e.target.value) || 0 }))}
                data-testid="quantity-input"
              />
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Input
                placeholder="e.g., Take with food"
                value={newReminder.notes}
                onChange={(e) => setNewReminder(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="notes-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateReminder} className="bg-teal-600 hover:bg-teal-700" data-testid="create-reminder-btn">
              <BellRing className="w-4 h-4 mr-1" />
              Create Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from Prescription Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Import from Prescription
            </DialogTitle>
            <DialogDescription>
              Auto-create reminders from your pharmacy order or prescription
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Prescription/Order ID</Label>
              <Input
                placeholder="Enter your order ID"
                value={prescriptionId}
                onChange={(e) => setPrescriptionId(e.target.value)}
                data-testid="prescription-id-input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Find your order ID in your pharmacy order confirmation
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleImportFromPrescription} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={importing}
              data-testid="import-prescription-btn"
            >
              {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Import className="w-4 h-4 mr-1" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default SmartReminders;
