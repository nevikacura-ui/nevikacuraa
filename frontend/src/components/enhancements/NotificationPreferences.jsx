import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Phone, Check, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';

const API = process.env.REACT_APP_BACKEND_URL;

// Multi-channel Notification Preferences (#49)
const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState({
    appointments: { push: true, sms: true, email: true, whatsapp: true },
    reminders: { push: true, sms: false, email: true, whatsapp: true },
    promotions: { push: false, sms: false, email: true, whatsapp: false },
    reports: { push: true, sms: false, email: true, whatsapp: true },
    queue: { push: true, sms: true, email: false, whatsapp: true },
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const channels = [
    { id: 'push', name: 'Push', icon: Bell, color: 'text-blue-600' },
    { id: 'sms', name: 'SMS', icon: Phone, color: 'text-green-600' },
    { id: 'email', name: 'Email', icon: Mail, color: 'text-red-600' },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, color: 'text-green-500' },
  ];

  const notificationTypes = [
    { id: 'appointments', name: 'Appointment Updates', description: 'Booking confirmations, cancellations' },
    { id: 'reminders', name: 'Reminders', description: 'Appointment reminders, medicine alerts' },
    { id: 'promotions', name: 'Offers & Updates', description: 'Health packages, discounts' },
    { id: 'reports', name: 'Reports & Results', description: 'Lab reports, prescriptions' },
    { id: 'queue', name: 'Queue Updates', description: 'Real-time queue position' },
  ];

  const togglePreference = (type, channel) => {
    setPreferences({
      ...preferences,
      [type]: {
        ...preferences[type],
        [channel]: !preferences[type][channel]
      }
    });
    setSaved(false);
  };

  const savePreferences = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('patientToken');
      await fetch(`${API}/api/patient/notification-preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(preferences)
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="notification-preferences">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-teal-600" />
          Notification Settings
        </h2>
        <Button onClick={savePreferences} disabled={loading || saved}>
          {saved ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Saved
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>

      {/* Channel Legend */}
      <div className="flex gap-4 p-3 bg-gray-50 rounded-lg">
        {channels.map(({ id, name, icon: Icon, color }) => (
          <div key={id} className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${color}`} />
            <span className="text-sm">{name}</span>
          </div>
        ))}
      </div>

      {/* Notification Types */}
      <div className="space-y-3">
        {notificationTypes.map((type) => (
          <Card key={type.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{type.name}</h3>
                  <p className="text-sm text-gray-500">{type.description}</p>
                </div>
              </div>
              <div className="flex gap-6">
                {channels.map(({ id, icon: Icon, color }) => (
                  <div key={id} className="flex items-center gap-2">
                    <Switch
                      checked={preferences[type.id][id]}
                      onCheckedChange={() => togglePreference(type.id, id)}
                    />
                    <Icon className={`w-4 h-4 ${preferences[type.id][id] ? color : 'text-gray-300'}`} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            const allOn = {};
            notificationTypes.forEach(t => {
              allOn[t.id] = { push: true, sms: true, email: true, whatsapp: true };
            });
            setPreferences(allOn);
          }}
        >
          Enable All
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            const allOff = {};
            notificationTypes.forEach(t => {
              allOff[t.id] = { push: false, sms: false, email: false, whatsapp: false };
            });
            setPreferences(allOff);
          }}
        >
          Disable All
        </Button>
      </div>
    </div>
  );
};

export default NotificationPreferences;
