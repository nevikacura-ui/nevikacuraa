import React, { useEffect, useState, useMemo } from 'react';
import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

export function AutoNotificationPrompt() {
  const { user } = useAuth();
  const {
    isSupported,
    permission,
    isSubscribed,
    subscribe
  } = usePushNotifications();
  
  const [showBanner, setShowBanner] = useState(false);
  
  // Check if dismissed from localStorage
  const isDismissed = useMemo(() => {
    return localStorage.getItem('notificationPromptDismissed') === 'true';
  }, []);

  useEffect(() => {
    if (isDismissed) return;

    // Auto-request notifications for logged-in users after a short delay
    const timer = setTimeout(() => {
      if (isSupported && !isSubscribed && permission === 'default' && user) {
        setShowBanner(true);
      }
    }, 3000); // Show after 3 seconds

    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, permission, user, isDismissed]);

  const handleEnable = async () => {
    const token = localStorage.getItem('token');
    const success = await subscribe(token);
    if (success) {
      toast.success('Notifications enabled! You\'ll receive updates about your orders and appointments.');
      setShowBanner(false);
    } else {
      toast.error('Failed to enable notifications. Please try again from your profile settings.');
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('notificationPromptDismissed', 'true');
  };

  if (!showBanner || isDismissed || !user) return null;

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
