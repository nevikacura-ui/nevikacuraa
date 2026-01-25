import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { 
  Bell, BellOff, BellRing, Smartphone, Shield, 
  Loader2, Check, AlertCircle, RefreshCw, Zap,
  MessageSquare, Calendar, Pill, FlaskConical
} from 'lucide-react';

const PushNotificationManager = () => {
  const { user, token } = useAuth();
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification
  } = usePushNotifications();

  const [testing, setTesting] = useState(false);

  const handleSubscribe = async () => {
    const success = await subscribe(token);
    if (success) {
      toast.success('Push notifications enabled! You\'ll receive updates even when the app is closed.');
    }
  };

  const handleUnsubscribe = async () => {
    if (window.confirm('Are you sure? You won\'t receive important health reminders.')) {
      const success = await unsubscribe(token);
      if (success) {
        toast.info('Push notifications disabled');
      }
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    try {
      await sendTestNotification();
      toast.success('Test notification sent! Check your notification panel.');
    } catch (err) {
      toast.error('Failed to send test notification');
    } finally {
      setTesting(false);
    }
  };

  // Not supported message
  if (!isSupported) {
    return (
      <Card className="p-5 rounded-2xl bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">Push Notifications Not Available</h3>
            <p className="text-sm text-amber-700 mt-1">
              Your browser doesn't support push notifications. Try using Chrome, Firefox, or Edge on desktop, 
              or install our app on mobile for the best experience.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Toggle Card */}
      <Card className="p-5 rounded-2xl overflow-hidden relative">
        {/* Background Decoration */}
        {isSubscribed && (
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-2xl" />
        )}
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isSubscribed 
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white' 
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {isSubscribed ? <BellRing className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Push Notifications</h3>
                <p className="text-sm text-slate-500">
                  {isSubscribed ? 'Enabled - You\'ll receive instant alerts' : 'Disabled - Enable for reminders'}
                </p>
              </div>
            </div>
            <Switch
              checked={isSubscribed}
              onCheckedChange={isSubscribed ? handleUnsubscribe : handleSubscribe}
              disabled={isLoading}
            />
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={`${
              permission === 'granted' 
                ? 'bg-emerald-100 text-emerald-700' 
                : permission === 'denied'
                ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-700'
            }`}>
              {permission === 'granted' ? '✓ Permission Granted' : 
               permission === 'denied' ? '✗ Permission Denied' : 
               'Permission Required'}
            </Badge>
            {isSubscribed && (
              <Badge className="bg-teal-100 text-teal-700">
                <Zap className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              {error}
            </div>
          )}

          {/* Permission Denied Help */}
          {permission === 'denied' && (
            <div className="mt-4 p-4 bg-amber-50 rounded-xl">
              <h4 className="font-medium text-amber-800 mb-2">How to Enable Notifications</h4>
              <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                <li>Click the lock icon in your browser's address bar</li>
                <li>Find "Notifications" in the permissions list</li>
                <li>Change it from "Block" to "Allow"</li>
                <li>Refresh this page and try again</li>
              </ol>
            </div>
          )}
        </div>
      </Card>

      {/* Test Notification */}
      {isSubscribed && (
        <Card className="p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-800">Test Notifications</h4>
              <p className="text-sm text-slate-500">Send a test to verify everything works</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestNotification}
              disabled={testing}
              className="rounded-lg"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-1" />
                  Send Test
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* What You'll Receive */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800">What You'll Receive</h3>
        
        <div className="grid gap-3">
          {[
            {
              icon: Calendar,
              title: 'Appointment Reminders',
              description: '24 hours and 1 hour before your appointment',
              color: 'bg-blue-100 text-blue-600'
            },
            {
              icon: Pill,
              title: 'Medicine Alerts',
              description: 'When your medicines are running low',
              color: 'bg-orange-100 text-orange-600'
            },
            {
              icon: FlaskConical,
              title: 'Lab Results Ready',
              description: 'Instant notification when results are available',
              color: 'bg-purple-100 text-purple-600'
            },
            {
              icon: MessageSquare,
              title: 'Important Updates',
              description: 'Slot cancellations, waitlist notifications',
              color: 'bg-teal-100 text-teal-600'
            }
          ].map((item, idx) => (
            <Card key={idx} className="p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-800">{item.title}</h4>
                  <p className="text-sm text-slate-500">{item.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Privacy Note */}
      <Card className="p-4 rounded-xl bg-slate-50">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-slate-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-slate-700">Privacy First</h4>
            <p className="text-sm text-slate-500">
              We only send notifications for your health appointments and orders. 
              No marketing spam. You can disable anytime.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PushNotificationManager;
