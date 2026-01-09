import React from 'react';
import { Bell, BellOff, Loader2, CheckCircle, XCircle, Send } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { toast } from 'sonner';

export function PushNotificationSettings({ token }) {
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

  const handleSubscribe = async () => {
    const success = await subscribe(token);
    if (success) {
      toast.success('Push notifications enabled! You\'ll receive updates about your orders and appointments.');
    } else {
      toast.error(error || 'Failed to enable notifications');
    }
  };

  const handleUnsubscribe = async () => {
    const success = await unsubscribe();
    if (success) {
      toast.success('Push notifications disabled');
    } else {
      toast.error('Failed to disable notifications');
    }
  };

  const handleTestNotification = async () => {
    if (!token) {
      toast.error('Please log in to test notifications');
      return;
    }
    const success = await sendTestNotification(token);
    if (success) {
      toast.success('Test notification sent!');
    } else {
      toast.error('Failed to send test notification');
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center gap-3 text-gray-500">
          <BellOff className="w-5 h-5" />
          <span>Push notifications are not supported in this browser</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-teal-500" />
          Push Notifications
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Receive instant updates about your orders, appointments, and test results
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status</span>
          <div className="flex items-center gap-2">
            {isSubscribed ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 font-medium">Enabled</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Disabled</span>
              </>
            )}
          </div>
        </div>

        {/* Permission Status */}
        {permission === 'denied' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">
              Notification permission was denied. Please enable notifications in your browser settings.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!isSubscribed ? (
            <button
              onClick={handleSubscribe}
              disabled={isLoading || permission === 'denied'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              Enable Notifications
            </button>
          ) : (
            <>
              <button
                onClick={handleUnsubscribe}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
                Disable
              </button>
              <button
                onClick={handleTestNotification}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
                Test Notification
              </button>
            </>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-gray-400 mt-2">
          <p>You'll receive notifications for:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Order status updates (Pharmacy & Diagnostics)</li>
            <li>Appointment confirmations & reminders</li>
            <li>Important announcements</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PushNotificationSettings;
