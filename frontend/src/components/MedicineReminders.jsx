import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Pill, Clock, Plus, Check, X, Bell, AlertTriangle,
  RefreshCw, Loader2, Calendar, TrendingUp, ChevronRight,
  Package, History
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

const MedicineReminders = () => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [reminders, setReminders] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [stats, setStats] = useState({});
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [adherenceHistory, setAdherenceHistory] = useState([]);
  
  // Form states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newReminder, setNewReminder] = useState({
    medicine_name: '',
    dosage: '',
    frequency: 'once_daily',
    time_slots: ['09:00'],
    start_date: new Date().toISOString().split('T')[0],
    total_quantity: 30
  });

  const headers = { Authorization: `Bearer ${token}` };

  // Fetch all data
  const fetchData = useCallback(async (showRefresh = false) => {
    if (!token) return;
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
  }, [token, headers]);

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
      await axios.post(`${API}/api/medicine-reminders/create`, newReminder, { headers });
      toast.success('Reminder created successfully');
      setShowAddDialog(false);
      setNewReminder({
        medicine_name: '',
        dosage: '',
        frequency: 'once_daily',
        time_slots: ['09:00'],
        start_date: new Date().toISOString().split('T')[0],
        total_quantity: 30
      });
      fetchData(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create reminder');
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
      
      toast.success(skipped ? 'Marked as skipped' : 'Marked as taken');
      fetchData(true);
    } catch (error) {
      toast.error('Failed to log');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading reminders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Pill className="w-6 h-6 text-green-600" />
            Medicine Reminders
          </h2>
          <p className="text-sm text-gray-500">Track your medications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-1" />
                Add Medicine
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Medicine Reminder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Medicine Name</label>
                  <Input
                    placeholder="e.g., Metformin 500mg"
                    value={newReminder.medicine_name}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, medicine_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Dosage</label>
                  <Input
                    placeholder="e.g., 1 tablet"
                    value={newReminder.dosage}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, dosage: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Frequency</label>
                  <Select value={newReminder.frequency} onValueChange={handleFrequencyChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once_daily">Once Daily</SelectItem>
                      <SelectItem value="twice_daily">Twice Daily</SelectItem>
                      <SelectItem value="thrice_daily">Three Times</SelectItem>
                      <SelectItem value="four_times">Four Times</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Time Slots</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {newReminder.time_slots.map((slot, idx) => (
                      <Badge key={idx} variant="outline">{slot}</Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={newReminder.start_date}
                      onChange={(e) => setNewReminder(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantity</label>
                    <Input
                      type="number"
                      placeholder="30"
                      value={newReminder.total_quantity}
                      onChange={(e) => setNewReminder(prev => ({ ...prev, total_quantity: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <Button onClick={handleCreateReminder} className="w-full bg-green-600 hover:bg-green-700">
                  Create Reminder
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <Pill className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-700">Active</p>
                <p className="text-2xl font-bold text-green-800">{stats.total_active || 0}</p>
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
                <p className="text-sm text-blue-700">Adherence</p>
                <p className="text-2xl font-bold text-blue-800">{stats.adherence_rate_7d || 0}%</p>
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
                <p className="text-sm text-purple-700">Taken (7d)</p>
                <p className="text-2xl font-bold text-purple-800">{stats.doses_taken_7d || 0}</p>
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
                <p className={`text-sm ${stats.low_stock_count > 0 ? 'text-red-700' : 'text-gray-600'}`}>Low Stock</p>
                <p className={`text-2xl font-bold ${stats.low_stock_count > 0 ? 'text-red-800' : 'text-gray-700'}`}>{stats.low_stock_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Low Stock Alert
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

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Today's Schedule
          </CardTitle>
          <CardDescription>
            {todaySchedule.filter(s => s.status === 'taken').length} of {todaySchedule.length} doses taken
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todaySchedule.length > 0 ? (
            <div className="space-y-2">
              {todaySchedule.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg border ${getStatusStyle(item.status)}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 text-center">
                      <p className="font-bold">{item.time_slot}</p>
                    </div>
                    <div>
                      <p className="font-medium">{item.medicine_name}</p>
                      <p className="text-sm opacity-80">{item.dosage}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.remaining_quantity !== undefined && (
                      <Badge variant="outline" className="text-xs">
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
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleLogMedicine(item.reminder_id, false)}
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
            <div className="text-center py-8 text-gray-500">
              <Pill className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No medicines scheduled for today</p>
              <Button variant="outline" className="mt-2" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Medicine
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adherence History */}
      {adherenceHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              Adherence History (14 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-24">
              {adherenceHistory.slice(0, 14).reverse().map((day, idx) => (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center"
                  title={`${day.date}: ${day.adherence_rate}%`}
                >
                  <div
                    className={`w-full rounded-t ${
                      day.adherence_rate >= 80 ? 'bg-green-500' :
                      day.adherence_rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ height: `${day.adherence_rate}%`, minHeight: '4px' }}
                  />
                  <span className="text-[8px] text-gray-400 mt-1">
                    {day.date.slice(-2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Reminders List */}
      {reminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Active Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reminders.map((reminder, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Pill className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{reminder.medicine_name}</p>
                      <p className="text-sm text-gray-500">
                        {reminder.dosage} • {reminder.frequency.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm">
                      <p className="text-gray-600">{reminder.time_slots?.join(', ')}</p>
                      {reminder.remaining_quantity && (
                        <p className={reminder.remaining_quantity <= 5 ? 'text-red-500' : 'text-gray-400'}>
                          {reminder.remaining_quantity} remaining
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
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

export default MedicineReminders;
