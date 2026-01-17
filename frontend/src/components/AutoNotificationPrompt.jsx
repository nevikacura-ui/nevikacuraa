import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { toast } from 'sonner';

export function AutoNotificationPrompt() {
  const {
    isSupported,
    permission,
    isSubscribed,
    subscribe
  } = usePushNotifications();
  
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    // Check if app is installed (PWA) and notification not yet requested
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    
    const notificationRequested = localStorage.getItem('notificationRequested');
    
    // Auto-request immediately for installed PWA or after delay for browser
    const timer = setTimeout(() => {
      if (isSupported && permission === 'default' && !isSubscribed) {
        if (isStandalone && !notificationRequested) {
          // Auto-request for installed app
          handleAutoRequest();
        } else if (!notificationRequested) {
          // Show banner for browser users
          setShowBanner(true);
        }
      }
    }, isStandalone ? 500 : 3000);

    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, permission]);

  const handleAutoRequest = async () => {
    localStorage.setItem('notificationRequested', 'true');
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        const token = localStorage.getItem('token');
        await subscribe(token);
        toast.success('Notifications enabled! 🔔');
      }
    } catch (err) {
      console.log('Notification permission error:', err);
    }
  };

  const handleEnable = async () => {
    localStorage.setItem('notificationRequested', 'true');
    const token = localStorage.getItem('token');
    const success = await subscribe(token);
    if (success) {
      toast.success('Notifications enabled! You\'ll receive updates about your orders and appointments.');
      setShowBanner(false);
    } else {
      toast.error('Failed to enable notifications. Please try again later.');
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('notificationRequested', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] animate-in slide-in-from-top duration-300 max-w-md mx-auto">
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl shadow-2xl overflow-hidden">
        {/* Android-style notification banner */}
        <div className="flex items-center gap-3 p-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Enable Notifications</p>
            <p className="text-xs text-white/80 mt-0.5">
              Get instant updates on orders, appointments & test results
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex border-t border-white/20">
          <button
            onClick={handleDismiss}
            className="flex-1 py-3 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={handleEnable}
            className="flex-1 py-3 text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors"
          >
            Enable Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default AutoNotificationPrompt;
