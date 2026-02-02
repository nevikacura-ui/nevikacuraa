import React, { useState, useEffect } from 'react';
import { Bell, Clock, Calendar, Pill, MessageSquare, Phone, Mail, Settings, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Smart Appointment Reminders (#1) & Medication Reminders
const SmartReminders = () => {
  const [reminders, setReminders] = useState([]);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reminderSettings, setReminderSettings] = useState({
    appointmentReminders: {
      enabled: true,
      timing: ['24h', '1h'],
      channels: { whatsapp: true, sms: true, push: true }
    },
    medicationReminders: {
      enabled: true,
      channels: { whatsapp: true, sms: false, push: true }
    }
  });

  const [newReminder, setNewReminder] = useState({
    type: 'medication',
    name: '',
    time: '08:00',
    frequency: 'daily',
    channels: { push: true, whatsapp: false, sms: false }
  });

  const sampleReminders = [
    {
      id: 1,
      type: 'appointment',
      title: 'Dr. Vikas Jha Consultation',
      datetime: '2026-01-28 10:30 AM',
      location: 'Pushpa Clinic',
      status: 'upcoming',
      reminders: ['24h', '1h']
    },
    {
      id: 2,
      type: 'medication',
      title: 'Metformin 500mg',
      time: '08:00 AM',
      frequency: 'Daily - Morning',
      status: 'active',
      lastTaken: '2026-01-27 08:05 AM'
    },
    {
      id: 3,
      type: 'medication',
      title: 'Vitamin D3',
      time: '09:00 AM',
      frequency: 'Daily - After Breakfast',
      status: 'active',
      lastTaken: null
    },
    {
      id: 4,
      type: 'labtest',
      title: 'HbA1c Test',
      datetime: '2026-01-30 07:30 AM',
      location: 'Mango Health Labs',
      status: 'upcoming',
      instructions: 'Fasting required - 8 hours'
    }
  ];

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/patient/reminders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders || sampleReminders);
      } else {
        setReminders(sampleReminders);
      }
    } catch (error) {
      setReminders(sampleReminders);
    } finally {
      setLoading(false);
    }
  };

  const markMedicationTaken = async (reminderId) => {
    setReminders(prev => prev.map(r => 
      r.id === reminderId 
        ? { ...r, lastTaken: new Date().toLocaleString() }
        : r
    ));
    toast.success('Medication marked as taken! ✓');
  };

  const addReminder = async () => {
    const reminder = {
      id: Date.now(),
      type: newReminder.type,
      title: newReminder.name,
      time: newReminder.time,
      frequency: newReminder.frequency === 'daily' ? 'Daily' : 
                 newReminder.frequency === 'twice' ? 'Twice Daily' : 'Weekly',
      status: 'active',
      lastTaken: null
    };
    setReminders(prev => [...prev, reminder]);
    setShowAddReminder(false);
    setNewReminder({
      type: 'medication',
      name: '',
      time: '08:00',
      frequency: 'daily',
      channels: { push: true, whatsapp: false, sms: false }
    });
    toast.success('Reminder added successfully!');
  };

  const deleteReminder = (id) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    toast.success('Reminder deleted');
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'appointment': return Calendar;
      case 'medication': return Pill;
      case 'labtest': return AlertCircle;
      default: return Bell;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'appointment': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'medication': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'labtest': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="smart-reminders">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6 text-teal-600" />
          Smart Reminders
        </h2>
        <Button size="sm" onClick={() => setShowAddReminder(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3 text-center">
            <Calendar className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <p className="text-lg font-bold text-blue-700">
              {reminders.filter(r => r.type === 'appointment').length}
            </p>
            <p className="text-xs text-blue-600">Appointments</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-3 text-center">
            <Pill className="w-5 h-5 mx-auto text-orange-600 mb-1" />
            <p className="text-lg font-bold text-orange-700">
              {reminders.filter(r => r.type === 'medication').length}
            </p>
            <p className="text-xs text-orange-600">Medications</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-3 text-center">
            <AlertCircle className="w-5 h-5 mx-auto text-purple-600 mb-1" />
            <p className="text-lg font-bold text-purple-700">
              {reminders.filter(r => r.type === 'labtest').length}
            </p>
            <p className="text-xs text-purple-600">Lab Tests</p>
          </CardContent>
        </Card>
      </div>

      {/* Reminder Settings Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            Reminder Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm">Appointment Reminders</span>
            </div>
            <Switch 
              checked={reminderSettings.appointmentReminders.enabled}
              onCheckedChange={(checked) => setReminderSettings(prev => ({
                ...prev,
                appointmentReminders: { ...prev.appointmentReminders, enabled: checked }
              }))}
            />
          </div>
          {reminderSettings.appointmentReminders.enabled && (
            <div className="ml-6 flex gap-2">
              <Badge variant="outline" className="text-xs">24h before</Badge>
              <Badge variant="outline" className="text-xs">1h before</Badge>
              <Badge className="text-xs bg-green-100 text-green-700">WhatsApp</Badge>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-orange-600" />
              <span className="text-sm">Medication Reminders</span>
            </div>
            <Switch 
              checked={reminderSettings.medicationReminders.enabled}
              onCheckedChange={(checked) => setReminderSettings(prev => ({
                ...prev,
                medicationReminders: { ...prev.medicationReminders, enabled: checked }
              }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reminders List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700">Active Reminders</h3>
        {reminders.map((reminder) => {
          const TypeIcon = getTypeIcon(reminder.type);
          return (
            <Card key={reminder.id} className={`overflow-hidden border-l-4 ${getTypeColor(reminder.type)}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      reminder.type === 'appointment' ? 'bg-blue-100' :
                      reminder.type === 'medication' ? 'bg-orange-100' : 'bg-purple-100'
                    }`}>
                      <TypeIcon className={`w-5 h-5 ${
                        reminder.type === 'appointment' ? 'text-blue-600' :
                        reminder.type === 'medication' ? 'text-orange-600' : 'text-purple-600'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-semibold">{reminder.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{reminder.datetime || reminder.time}</span>
                        {reminder.frequency && <span>• {reminder.frequency}</span>}
                      </div>
                      {reminder.location && (
                        <p className="text-sm text-gray-500 mt-1">{reminder.location}</p>
                      )}
                      {reminder.instructions && (
                        <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {reminder.instructions}
                        </p>
                      )}
                      {reminder.lastTaken && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Last taken: {reminder.lastTaken}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {reminder.type === 'medication' && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => markMedicationTaken(reminder.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Taken
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => deleteReminder(reminder.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {reminders.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No reminders yet</p>
            <Button className="mt-4" onClick={() => setShowAddReminder(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Reminder
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Reminder Dialog */}
      <Dialog open={showAddReminder} onOpenChange={setShowAddReminder}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-teal-600" />
              Add Reminder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Reminder Type</Label>
              <Select 
                value={newReminder.type} 
                onValueChange={(v) => setNewReminder(prev => ({ ...prev, type: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="appointment">Appointment</SelectItem>
                  <SelectItem value="labtest">Lab Test</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Name / Title</Label>
              <Input
                placeholder={newReminder.type === 'medication' ? 'e.g., Metformin 500mg' : 'e.g., Dr. Visit'}
                value={newReminder.name}
                onChange={(e) => setNewReminder(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Time</Label>
              <Input
                type="time"
                value={newReminder.time}
                onChange={(e) => setNewReminder(prev => ({ ...prev, time: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Frequency</Label>
              <Select 
                value={newReminder.frequency} 
                onValueChange={(v) => setNewReminder(prev => ({ ...prev, frequency: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="twice">Twice Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notification Channels</Label>
              <div className="flex gap-3 mt-2">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={newReminder.channels.push}
                    onChange={(e) => setNewReminder(prev => ({
                      ...prev,
                      channels: { ...prev.channels, push: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">Push</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={newReminder.channels.whatsapp}
                    onChange={(e) => setNewReminder(prev => ({
                      ...prev,
                      channels: { ...prev.channels, whatsapp: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">WhatsApp</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={newReminder.channels.sms}
                    onChange={(e) => setNewReminder(prev => ({
                      ...prev,
                      channels: { ...prev.channels, sms: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">SMS</span>
                </label>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={addReminder}
              disabled={!newReminder.name}
            >
              Add Reminder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmartReminders;
