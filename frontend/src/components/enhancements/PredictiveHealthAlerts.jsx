import React, { useState, useEffect } from 'react';
import { Bell, Calendar, AlertCircle, CheckCircle, Clock, Heart, Pill, TestTube, ChevronRight, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const PredictiveHealthAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [settings, setSettings] = useState({
    checkup_reminders: true,
    medication_refills: true,
    health_screenings: true,
    vaccination_alerts: true
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    // Mock predictive alerts based on health history
    setAlerts([
      {
        id: '1',
        type: 'checkup',
        title: 'Diabetes Checkup Due',
        message: 'It has been 6 months since your last HbA1c test. Regular monitoring helps manage diabetes effectively.',
        priority: 'high',
        dueIn: '2 weeks overdue',
        action: 'Book HbA1c Test',
        icon: TestTube,
        color: 'red'
      },
      {
        id: '2',
        type: 'medication',
        title: 'Medication Refill Needed',
        message: 'Your Metformin supply will run out in 5 days. Order now to avoid interruption.',
        priority: 'medium',
        dueIn: '5 days',
        action: 'Order Refill',
        icon: Pill,
        color: 'orange'
      },
      {
        id: '3',
        type: 'screening',
        title: 'Annual Health Screening',
        message: 'Based on your age and health profile, we recommend an annual comprehensive health checkup.',
        priority: 'low',
        dueIn: '1 month',
        action: 'Book Checkup',
        icon: Heart,
        color: 'blue'
      },
      {
        id: '4',
        type: 'vaccination',
        title: 'Flu Vaccine Reminder',
        message: 'Flu season is approaching. Get your annual flu vaccine to stay protected.',
        priority: 'low',
        dueIn: '2 months',
        action: 'Schedule Vaccine',
        icon: Calendar,
        color: 'green'
      }
    ]);
  };

  const dismissAlert = (alertId) => {
    setAlerts(alerts.filter(a => a.id !== alertId));
    toast.success('Alert dismissed');
  };

  const snoozeAlert = (alertId) => {
    toast.success('Alert snoozed for 1 week');
    setAlerts(alerts.filter(a => a.id !== alertId));
  };

  const handleAction = (alert) => {
    toast.success(`Redirecting to ${alert.action}...`);
  };

  const getColorClass = (color) => {
    const colors = {
      red: 'bg-red-100 text-red-700 border-red-200',
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      green: 'bg-green-100 text-green-700 border-green-200'
    };
    return colors[color] || colors.blue;
  };

  const getIconBgClass = (color) => {
    const colors = {
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-4" data-testid="predictive-health-alerts">
      {/* Header */}
      <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Health Alerts</h2>
              <p className="text-amber-100 text-sm">Personalized health reminders</p>
            </div>
            <Badge className="ml-auto bg-white/20">{alerts.length} Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <div className="space-y-3">
        {alerts.map(alert => {
          const IconComponent = alert.icon;
          return (
            <Card key={alert.id} className={`border-l-4 ${
              alert.color === 'red' ? 'border-l-red-500' :
              alert.color === 'orange' ? 'border-l-orange-500' :
              alert.color === 'blue' ? 'border-l-blue-500' : 'border-l-green-500'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getIconBgClass(alert.color)}`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{alert.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => dismissAlert(alert.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge className={getColorClass(alert.color)}>
                        <Clock className="w-3 h-3 mr-1" />
                        {alert.dueIn}
                      </Badge>
                      <div className="flex-1" />
                      <Button variant="ghost" size="sm" onClick={() => snoozeAlert(alert.id)}>
                        Snooze
                      </Button>
                      <Button size="sm" onClick={() => handleAction(alert)}>
                        {alert.action} <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {alerts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="font-semibold text-lg">All Caught Up!</h3>
            <p className="text-gray-500">No health alerts at the moment. Keep up the good work!</p>
          </CardContent>
        </Card>
      )}

      {/* Alert Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Alert Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'checkup_reminders', label: 'Checkup Reminders', desc: 'Get reminded about due health checkups' },
            { key: 'medication_refills', label: 'Medication Refills', desc: 'Alerts when medicines are running low' },
            { key: 'health_screenings', label: 'Health Screenings', desc: 'Age-appropriate screening recommendations' },
            { key: 'vaccination_alerts', label: 'Vaccination Alerts', desc: 'Vaccine and booster reminders' }
          ].map(setting => (
            <div key={setting.key} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-sm">{setting.label}</p>
                <p className="text-xs text-gray-500">{setting.desc}</p>
              </div>
              <Switch
                checked={settings[setting.key]}
                onCheckedChange={(checked) => setSettings({...settings, [setting.key]: checked})}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictiveHealthAlerts;
