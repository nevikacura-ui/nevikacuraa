import React, { useState, useEffect } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Check if already dismissed recently (within 24 hours)
    const dismissedTime = localStorage.getItem('pwaPromptDismissed');
    if (dismissedTime) {
      const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        return; // Don't show if dismissed within 24 hours
      }
    }

    // Listen for beforeinstallprompt event (Android/Desktop Chrome)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after 3 seconds
      setTimeout(() => {
        if (!standalone) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS, show custom prompt after delay
    if (ios && !standalone) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwaPromptDismissed', Date.now().toString());
  };

  // Don't show if already installed
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header with app icon */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 flex items-center gap-3">
          <img 
            src="/icons/icon-72x72.png" 
            alt="Nevika Cura" 
            className="w-12 h-12 rounded-xl shadow-lg"
          />
          <div className="flex-1 text-white">
            <h3 className="font-bold text-lg">Install Nevika Cura</h3>
            <p className="text-teal-100 text-sm">Get the app experience</p>
          </div>
          <button 
            onClick={handleDismiss}
            className="text-white/80 hover:text-white p-1"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isIOS ? (
            // iOS Instructions
            <div className="space-y-3">
              <p className="text-gray-600 text-sm">
                Install this app on your iPhone for quick access:
              </p>
              <div className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                <Share className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span>Tap the <strong>Share</strong> button in Safari</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                <Plus className="w-5 h-5 text-gray-500 flex-shrink-0 border border-gray-400 rounded" />
                <span>Then tap <strong>"Add to Home Screen"</strong></span>
              </div>
              <button
                onClick={handleDismiss}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Got it
              </button>
            </div>
          ) : (
            // Android/Desktop
            <div className="space-y-3">
              <p className="text-gray-600 text-sm">
                Install our app for faster access, offline support, and push notifications!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleInstall}
                  className="flex-1 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Install App
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default PWAInstallPrompt;
