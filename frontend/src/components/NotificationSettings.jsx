import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Bell, BellOff, Calendar, Pill, FlaskConical, MessageSquare,
  Loader2, Check, Settings, Smartphone, Mail, Volume2
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NotificationSettings = () => {
  const { user, token } = useAuth();
  const [preferences, setPreferences] = useState({
    appointment_reminders: true,
    reminder_24h: true,
    reminder_1h: true,
    medicine_refill: true,
    lab_results: true,
    promotional: false,
    preferred_channel: 'sms'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user && token) {
      fetchPreferences();
    }
  }, [user, token]);

  const fetchPreferences = async () => {
    try {
      const response = await axios.get(`${API}/features/notifications/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreferences(response.data);
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/features/notifications/preferences`, preferences, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Notification settings saved');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Notification Settings
            </h2>
            <p className="text-sm text-slate-500">Manage how you receive updates</p>
          </div>
        </div>
        {hasChanges && (
          <Button
            onClick={savePreferences}
            disabled={saving}
            className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        )}
      </div>

      {/* Notification Channel */}
      <Card className="p-5 rounded-2xl">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-teal-500" />
          Notification Channel
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'sms', label: 'SMS', icon: Smartphone },
            { value: 'email', label: 'Email', icon: Mail },
            { value: 'all', label: 'All', icon: Bell }
          ].map((channel) => (
            <button
              key={channel.value}
              onClick={() => updatePreference('preferred_channel', channel.value)}
              className={`p-4 rounded-xl border-2 transition-all ${
                preferences.preferred_channel === channel.value
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              <channel.icon className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-medium">{channel.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Appointment Reminders */}
      <Card className="p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Appointment Reminders</h3>
              <p className="text-sm text-slate-500">Get reminded about upcoming appointments</p>
            </div>
          </div>
          <Switch
            checked={preferences.appointment_reminders}
            onCheckedChange={(checked) => updatePreference('appointment_reminders', checked)}
          />
        </div>
        
        {preferences.appointment_reminders && (
          <div className="pl-13 space-y-3 border-t pt-4 ml-13">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-600">24 hours before</span>
              <Switch
                checked={preferences.reminder_24h}
                onCheckedChange={(checked) => updatePreference('reminder_24h', checked)}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-600">1 hour before</span>
              <Switch
                checked={preferences.reminder_1h}
                onCheckedChange={(checked) => updatePreference('reminder_1h', checked)}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Medicine Refill */}
      <Card className="p-5 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Medicine Refill Alerts</h3>
              <p className="text-sm text-slate-500">Get alerted when medicines are running low</p>
            </div>
          </div>
          <Switch
            checked={preferences.medicine_refill}
            onCheckedChange={(checked) => updatePreference('medicine_refill', checked)}
          />
        </div>
      </Card>

      {/* Lab Results */}
      <Card className="p-5 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Lab Results</h3>
              <p className="text-sm text-slate-500">Notify when lab results are ready</p>
            </div>
          </div>
          <Switch
            checked={preferences.lab_results}
            onCheckedChange={(checked) => updatePreference('lab_results', checked)}
          />
        </div>
      </Card>

      {/* Promotional */}
      <Card className="p-5 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Promotional Messages</h3>
              <p className="text-sm text-slate-500">Receive offers and health tips</p>
            </div>
          </div>
          <Switch
            checked={preferences.promotional}
            onCheckedChange={(checked) => updatePreference('promotional', checked)}
          />
        </div>
      </Card>

      {/* Save Button (Mobile Fixed) */}
      {hasChanges && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <Button
            onClick={savePreferences}
            disabled={saving}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl h-12"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            Save Notification Settings
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
