import React, { useEffect, useState, useCallback } from 'react';
import { Bell, X, Pill, Calendar, ShoppingBag, Heart, CheckCircle2, Sparkles, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { toast } from 'sonner';

// ============ FULL SCREEN NOTIFICATION PROMPT ============
export function FullScreenNotificationPrompt({ onComplete }) {
  const { isSupported, permission, isSubscribed, subscribe } = usePushNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Don't show on staff/admin/doctor pages
    const isStaffPage = window.location.pathname.startsWith('/staff') || 
                        window.location.pathname.startsWith('/admin') ||
                        window.location.pathname.startsWith('/doctor');
    
    // Show full screen prompt on first visit if notifications not enabled
    const hasSeenFullPrompt = localStorage.getItem('hasSeenFullNotificationPrompt');
    const notificationEnabled = permission === 'granted';
    
    if (!isStaffPage && !hasSeenFullPrompt && isSupported && !notificationEnabled && !isSubscribed) {
      // Show after a brief delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission, isSubscribed]);

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const success = await subscribe(token);
      if (success) {
        toast.success('🎉 Notifications enabled! You\'re all set!');
        localStorage.setItem('hasSeenFullNotificationPrompt', 'true');
        localStorage.setItem('notificationEnabled', 'true');
        setIsVisible(false);
        onComplete?.();
      } else {
        toast.error('Could not enable notifications. Please try again.');
      }
    } catch (err) {
      console.error('Notification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenFullNotificationPrompt', 'true');
    localStorage.setItem('notificationSkipCount', '1');
    localStorage.setItem('lastNotificationSkip', Date.now().toString());
    setIsVisible(false);
    onComplete?.();
  };

  if (!isVisible) return null;

  const benefits = [
    { icon: Pill, text: 'Medicine reminders - Never miss a dose', color: 'text-green-400' },
    { icon: Calendar, text: 'Appointment alerts - Stay on schedule', color: 'text-blue-400' },
    { icon: ShoppingBag, text: 'Order updates - Track your deliveries', color: 'text-orange-400' },
    { icon: Heart, text: 'Health tips - Daily wellness insights', color: 'text-pink-400' },
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-3xl" />
      
      {/* Main content */}
      <div className="max-w-md w-full text-center relative">
        {/* Bell icon with pulse animation */}
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
          <div className="relative w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Bell className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-bounce">
            <span className="text-white text-xs font-bold">!</span>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Stay Connected!
        </h1>
        <p className="text-white/80 text-lg mb-8">
          Enable notifications to get the most out of Nevika Cura
        </p>

        {/* Benefits list */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-8 text-left">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <span className="text-white font-semibold">What you&apos;ll get:</span>
          </div>
          <div className="space-y-3">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ${benefit.color}`}>
                  <benefit.icon className="w-4 h-4" />
                </div>
                <span className="text-white/90 text-sm">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badge */}
        <div className="flex items-center justify-center gap-2 mb-6 text-white/60 text-sm">
          <Shield className="w-4 h-4" />
          <span>We respect your privacy. Unsubscribe anytime.</span>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleEnable}
            disabled={isLoading}
            className="w-full py-6 text-lg font-semibold bg-white text-teal-700 hover:bg-white/90 rounded-xl shadow-lg"
            data-testid="enable-notifications-btn"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                Enabling...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Enable Notifications
              </span>
            )}
          </Button>
          
          <button
            onClick={handleSkip}
            className="w-full py-3 text-white/60 hover:text-white/80 text-sm transition-colors"
            data-testid="skip-notifications-btn"
          >
            I&apos;ll do this later
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ ACTION-TRIGGERED NOTIFICATION PROMPT ============
export function ActionNotificationPrompt({ 
  isOpen, 
  onClose, 
  actionType = 'appointment',
  onSuccess 
}) {
  const { isSupported, permission, isSubscribed, subscribe } = usePushNotifications();
  const [isLoading, setIsLoading] = useState(false);

  // Don't show if already subscribed or not supported
  if (!isOpen || !isSupported || permission === 'granted' || isSubscribed) {
    return null;
  }

  const actionMessages = {
    appointment: {
      title: 'Never Miss Your Appointment!',
      subtitle: 'Get reminders before your scheduled visits',
      icon: Calendar,
      benefit: 'We\'ll remind you 1 hour before your appointment',
      color: 'from-blue-500 to-blue-600'
    },
    medicine: {
      title: 'Medicine Reminder Set!',
      subtitle: 'Enable notifications to get timely alerts',
      icon: Pill,
      benefit: 'Get reminded exactly when it\'s time to take your medicine',
      color: 'from-green-500 to-emerald-600'
    },
    order: {
      title: 'Track Your Order!',
      subtitle: 'Get instant updates on your delivery',
      icon: ShoppingBag,
      benefit: 'Know when your medicines are out for delivery',
      color: 'from-orange-500 to-orange-600'
    },
    test: {
      title: 'Get Your Results First!',
      subtitle: 'Be notified when reports are ready',
      icon: CheckCircle2,
      benefit: 'Receive alerts as soon as your test results are available',
      color: 'from-purple-500 to-purple-600'
    }
  };

  const message = actionMessages[actionType] || actionMessages.appointment;
  const IconComponent = message.icon;

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const success = await subscribe(token);
      if (success) {
        toast.success('🔔 Notifications enabled!');
        localStorage.setItem('notificationEnabled', 'true');
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      console.error('Notification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLater = () => {
    // Track skip count for re-prompting logic
    const skipCount = parseInt(localStorage.getItem('notificationSkipCount') || '0');
    localStorage.setItem('notificationSkipCount', (skipCount + 1).toString());
    localStorage.setItem('lastNotificationSkip', Date.now().toString());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-500">
        {/* Header */}
        <div className={`bg-gradient-to-r ${message.color} p-6 text-white text-center relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconComponent className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold">{message.title}</h2>
            <p className="text-white/80 mt-1">{message.subtitle}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 mb-6">
            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bell className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <p className="text-gray-800 font-medium text-sm">{message.benefit}</p>
              <p className="text-gray-500 text-xs mt-1">You can disable this anytime in settings</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleEnable}
              disabled={isLoading}
              className="w-full py-5 bg-teal-600 hover:bg-teal-700 rounded-xl font-semibold"
              data-testid="action-enable-notifications-btn"
            >
              {isLoading ? 'Enabling...' : 'Yes, Notify Me!'}
            </Button>
            <button
              onClick={handleLater}
              className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm"
              data-testid="action-skip-notifications-btn"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ SMART BANNER (Re-prompts after skips) ============
export function SmartNotificationBanner() {
  const { isSupported, permission, isSubscribed, subscribe } = usePushNotifications();
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if we should re-prompt
    const shouldShowBanner = () => {
      if (!isSupported || permission === 'granted' || isSubscribed) return false;
      
      const skipCount = parseInt(localStorage.getItem('notificationSkipCount') || '0');
      const lastSkip = parseInt(localStorage.getItem('lastNotificationSkip') || '0');
      const now = Date.now();
      const hoursSinceSkip = (now - lastSkip) / (1000 * 60 * 60);
      
      // Re-prompt logic:
      // - After 1st skip: wait 24 hours
      // - After 2nd skip: wait 3 days
      // - After 3rd+ skip: wait 7 days
      // - After 5+ skips: stop prompting
      
      if (skipCount >= 5) return false;
      if (skipCount === 0) return true;
      if (skipCount === 1 && hoursSinceSkip >= 24) return true;
      if (skipCount === 2 && hoursSinceSkip >= 72) return true;
      if (skipCount >= 3 && hoursSinceSkip >= 168) return true;
      
      return false;
    };

    const timer = setTimeout(() => {
      if (shouldShowBanner()) {
        setShowBanner(true);
      }
    }, 5000); // Show after 5 seconds on page

    return () => clearTimeout(timer);
  }, [isSupported, permission, isSubscribed]);

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const success = await subscribe(token);
      if (success) {
        toast.success('🔔 Notifications enabled!');
        localStorage.setItem('notificationEnabled', 'true');
        localStorage.removeItem('notificationSkipCount');
        setShowBanner(false);
      }
    } catch (err) {
      console.error('Notification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    const skipCount = parseInt(localStorage.getItem('notificationSkipCount') || '0');
    localStorage.setItem('notificationSkipCount', (skipCount + 1).toString());
    localStorage.setItem('lastNotificationSkip', Date.now().toString());
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] max-w-md mx-auto animate-in slide-in-from-bottom duration-500">
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">Don&apos;t miss important updates!</p>
              <p className="text-white/80 text-sm mt-0.5">
                Enable notifications for medicine reminders & appointment alerts
              </p>
            </div>
            <button onClick={handleDismiss} className="text-white/60 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 text-white/80 hover:text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              Later
            </button>
            <Button
              onClick={handleEnable}
              disabled={isLoading}
              className="flex-1 bg-white text-teal-700 hover:bg-white/90 rounded-lg font-medium"
              data-testid="smart-banner-enable-btn"
            >
              {isLoading ? 'Enabling...' : 'Enable Now'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ HOOK FOR ACTION-BASED PROMPTS ============
export function useNotificationPrompt() {
  const [promptState, setPromptState] = useState({ isOpen: false, actionType: 'appointment' });
  const { permission, isSubscribed } = usePushNotifications();

  const showPromptAfterAction = useCallback((actionType = 'appointment') => {
    // Only show if notifications not already enabled
    if (permission !== 'granted' && !isSubscribed) {
      // Check if we've already prompted too many times
      const skipCount = parseInt(localStorage.getItem('notificationSkipCount') || '0');
      if (skipCount < 3) {
        setPromptState({ isOpen: true, actionType });
      }
    }
  }, [permission, isSubscribed]);

  const closePrompt = useCallback(() => {
    setPromptState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    promptState,
    showPromptAfterAction,
    closePrompt,
    ActionPrompt: () => (
      <ActionNotificationPrompt
        isOpen={promptState.isOpen}
        actionType={promptState.actionType}
        onClose={closePrompt}
      />
    )
  };
}

export default FullScreenNotificationPrompt;
