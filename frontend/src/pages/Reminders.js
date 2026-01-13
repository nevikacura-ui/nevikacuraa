import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Bell, Calendar, Clock, Plus, Trash2,
  Loader2, AlertCircle, CheckCircle, User, Phone, Mail,
  Pill, Stethoscope, Heart, MessageSquare, BellRing, BellOff
} from 'lucide-react';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const REMINDER_TYPES = {
  follow_up: { label: 'Follow-up', icon: Stethoscope, color: 'bg-blue-100 text-blue-700' },
  appointment: { label: 'Appointment', icon: Calendar, color: 'bg-green-100 text-green-700' },
  medicine_refill: { label: 'Medicine Refill', icon: Pill, color: 'bg-orange-100 text-orange-700' },
  subscription_expiry: { label: 'Subscription', icon: Heart, color: 'bg-pink-100 text-pink-700' },
  custom: { label: 'Custom', icon: MessageSquare, color: 'bg-gray-100 text-gray-700' }
};

const formatDateUtil = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
};

const getReminderTypeInfo = (type) => {
  return REMINDER_TYPES[type] || REMINDER_TYPES.custom;
};

const ReminderCard = ({ reminder, showActions = true, onCancel }) => {
  const typeInfo = getReminderTypeInfo(reminder.reminder_type);
  const Icon = typeInfo.icon;
  
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${typeInfo.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">{reminder.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{reminder.message}</p>
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {reminder.patient_name}
                </span>
                {reminder.patient_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {reminder.patient_phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDateUtil(reminder.scheduled_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {reminder.scheduled_time}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
            {showActions && reminder.status === 'scheduled' && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(reminder.id)}
                className="text-red-500 hover:text-red-700"
                data-testid={`cancel-reminder-${reminder.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        {reminder.repeat && (
          <Badge variant="outline" className="mt-2 text-xs">
            Repeats: {reminder.repeat}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};

const Reminders = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState([]);
  const [pendingToday, setPendingToday] = useState([]);
  const [pendingTomorrow, setPendingTomorrow] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('scheduled');
  
  // Create reminder dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newReminder, setNewReminder] = useState({
    reminder_type: 'custom',
    patient_name: '',
    patient_phone: '',
    patient_email: '',
    title: '',
    message: '',
    scheduled_date: '',
    scheduled_time: '09:00',
    repeat: 'none'
  });
  const [creating, setCreating] = useState(false);
  
  const fetchPendingReminders = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/reminders/pending`);
      setPendingToday(res.data.today || []);
      setPendingTomorrow(res.data.tomorrow || []);
    } catch (error) {
      console.error('Failed to fetch pending reminders:', error);
    }
  }, []);
  
  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, status: filterStatus };
      if (filterType !== 'all') params.reminder_type = filterType;
      
      const res = await axios.get(`${API}/reminders/list`, { params });
      setReminders(res.data.reminders || []);
      setTotalPages(res.data.pages || 1);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    }
    setLoading(false);
  }, [page, filterType, filterStatus]);
  
  useEffect(() => {
    fetchPendingReminders();
    fetchReminders();
  }, [fetchPendingReminders, fetchReminders]);
  
  const handleCreateReminder = async () => {
    if (!newReminder.title.trim() || !newReminder.scheduled_date || !newReminder.patient_name) {
      toast.error('Please fill in required fields');
      return;
    }
    
    setCreating(true);
    try {
      await axios.post(`${API}/reminders/create`, {
        ...newReminder,
        repeat: newReminder.repeat === 'none' ? null : newReminder.repeat,
        user_id: user?.id
      });
      toast.success('Reminder created successfully!');
      setShowCreateDialog(false);
      setNewReminder({
        reminder_type: 'custom',
        patient_name: '',
        patient_phone: '',
        patient_email: '',
        title: '',
        message: '',
        scheduled_date: '',
        scheduled_time: '09:00',
        repeat: 'none'
      });
      fetchReminders();
      fetchPendingReminders();
    } catch (error) {
      toast.error('Failed to create reminder');
    }
    setCreating(false);
  };
  
  const handleCancelReminder = async (reminderId) => {
    if (!window.confirm('Are you sure you want to cancel this reminder?')) return;
    
    try {
      await axios.delete(`${API}/reminders/${reminderId}`);
      toast.success('Reminder cancelled');
      fetchReminders();
      fetchPendingReminders();
    } catch (error) {
      toast.error('Failed to cancel reminder');
    }
  };
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };
  
  const getReminderTypeInfo = (type) => {
    return REMINDER_TYPES[type] || REMINDER_TYPES.custom;
  };
  
  const ReminderCard = ({ reminder, showActions = true }) => {
    const typeInfo = getReminderTypeInfo(reminder.reminder_type);
    const Icon = typeInfo.icon;
    
    return (
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">{reminder.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{reminder.message}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {reminder.patient_name}
                  </span>
                  {reminder.patient_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {reminder.patient_phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(reminder.scheduled_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {reminder.scheduled_time}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
              {showActions && reminder.status === 'scheduled' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancelReminder(reminder.id)}
                  className="text-red-500 hover:text-red-700"
                  data-testid={`cancel-reminder-${reminder.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          {reminder.repeat && (
            <Badge variant="outline" className="mt-2 text-xs">
              Repeats: {reminder.repeat}
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg text-teal-700">Reminders & Scheduler</h1>
              <p className="text-sm text-gray-500">Manage automated reminders</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-teal-600 hover:bg-teal-700"
            data-testid="create-reminder-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Reminder
          </Button>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BellRing className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{pendingToday.length}</p>
                <p className="text-xs text-blue-600">Due Today</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Bell className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-700">{pendingTomorrow.length}</p>
                <p className="text-xs text-orange-600">Due Tomorrow</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">
                  {reminders.filter(r => r.status === 'sent').length}
                </p>
                <p className="text-xs text-green-600">Sent</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <BellOff className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-700">
                  {reminders.filter(r => r.status === 'cancelled').length}
                </p>
                <p className="text-xs text-gray-600">Cancelled</p>
              </div>
            </div>
          </Card>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              <Clock className="w-4 h-4 mr-2" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all">
              <Bell className="w-4 h-4 mr-2" />
              All Reminders
            </TabsTrigger>
          </TabsList>
          
          {/* Upcoming Tab */}
          <TabsContent value="upcoming">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today */}
              <div>
                <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  Today
                </h3>
                {pendingToday.length === 0 ? (
                  <Card className="p-6 text-center text-gray-500">
                    <BellOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No reminders due today</p>
                  </Card>
                ) : (
                  pendingToday.map(reminder => (
                    <ReminderCard key={reminder.id} reminder={reminder} />
                  ))
                )}
              </div>
              
              {/* Tomorrow */}
              <div>
                <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  Tomorrow
                </h3>
                {pendingTomorrow.length === 0 ? (
                  <Card className="p-6 text-center text-gray-500">
                    <BellOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No reminders due tomorrow</p>
                  </Card>
                ) : (
                  pendingTomorrow.map(reminder => (
                    <ReminderCard key={reminder.id} reminder={reminder} />
                  ))
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* All Reminders Tab */}
          <TabsContent value="all">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div>
                <Label className="text-xs text-gray-500">Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(REMINDER_TYPES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
                <p className="text-gray-500 mt-2">Loading reminders...</p>
              </div>
            ) : reminders.length === 0 ? (
              <Card className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-700 mb-2">No reminders found</h3>
                <p className="text-gray-500 mb-4">Create a reminder to get started</p>
                <Button onClick={() => setShowCreateDialog(true)} className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Reminder
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {reminders.map(reminder => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button 
                  variant="outline" 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button 
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Create Reminder Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Reminder</DialogTitle>
            <DialogDescription>Set up a new automated reminder</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reminder Type</Label>
                <Select 
                  value={newReminder.reminder_type} 
                  onValueChange={(v) => setNewReminder(prev => ({ ...prev, reminder_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REMINDER_TYPES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Repeat</Label>
                <Select 
                  value={newReminder.repeat} 
                  onValueChange={(v) => setNewReminder(prev => ({ ...prev, repeat: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Patient Name *</Label>
              <Input
                value={newReminder.patient_name}
                onChange={(e) => setNewReminder(prev => ({ ...prev, patient_name: e.target.value }))}
                placeholder="Enter patient name"
                data-testid="reminder-patient-name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input
                  value={newReminder.patient_phone}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, patient_phone: e.target.value }))}
                  placeholder="10-digit mobile"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newReminder.patient_email}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, patient_email: e.target.value }))}
                  placeholder="patient@email.com"
                />
              </div>
            </div>
            
            <div>
              <Label>Title *</Label>
              <Input
                value={newReminder.title}
                onChange={(e) => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Reminder title"
                data-testid="reminder-title"
              />
            </div>
            
            <div>
              <Label>Message</Label>
              <Textarea
                value={newReminder.message}
                onChange={(e) => setNewReminder(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Reminder message content..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={newReminder.scheduled_date}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  data-testid="reminder-date"
                />
              </div>
              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={newReminder.scheduled_time}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, scheduled_time: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateReminder}
              disabled={creating}
              className="bg-teal-600 hover:bg-teal-700"
              data-testid="submit-reminder-btn"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
};

export default Reminders;
