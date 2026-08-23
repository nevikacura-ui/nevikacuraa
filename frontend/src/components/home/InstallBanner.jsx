import React, { useState, useEffect } from 'react';
import { Download, X, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const InstallBanner = ({ isStandalone = false }) => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Show banner if not already installed and not dismissed recently
      const dismissed = localStorage.getItem('installBannerDismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
      if (hoursSinceDismissed > 24) {
        setShowBanner(true);
      }
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check if already installed
    window.addEventListener('appinstalled', () => {
      setInstallPrompt(null);
      setShowBanner(false);
      toast.success('App installed successfully! 🎉');
    });
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  const handleInstallApp = async () => {
    if (!installPrompt) {
      // For iOS or browsers that don't support beforeinstallprompt
      toast.info('To install: tap Share button → Add to Home Screen');
      return;
    }
    
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setShowBanner(false);
    }
  };
  
  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('installBannerDismissed', Date.now().toString());
  };
  
  if (!showBanner || isStandalone) return null;
  
  return (
    <div className="mb-6 relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-500/20 to-cyan-500/20 backdrop-blur-xl border border-teal-500/30 shadow-xl animate-fadeIn" data-testid="install-banner">
      <div className="relative p-5">
        <button 
          onClick={dismissBanner}
          className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-white/80" />
        </button>
        
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center overflow-hidden border border-white/20">
              <img 
                src="/icons/icon-72x72.png" 
                alt="Nevika Cura" 
                className="w-12 h-12 object-contain"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
              <Download className="w-3 h-3 text-white" />
            </div>
          </div>
          
          <div className="flex-1 text-white min-w-0">
            <h3 className="font-bold text-base sm:text-lg mb-0.5">Get the App!</h3>
            <p className="text-xs sm:text-sm text-white/70 mb-2">Install for faster access & notifications</p>
            
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-full border border-white/10">
                <Zap className="w-3 h-3" /> Faster
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-full border border-white/10">
                <Shield className="w-3 h-3" /> Secure
              </span>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={handleInstallApp}
          className="mt-4 w-full bg-white text-teal-600 hover:bg-white/95 rounded-xl py-3 font-bold shadow-lg transition-all hover:scale-[1.02]"
          data-testid="install-app-btn"
        >
          <Download className="w-5 h-5 mr-2" />
          Add to Home Screen
        </Button>
      </div>
    </div>
  );
};

export default InstallBanner;
