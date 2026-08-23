import React, { useState, useEffect } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { healthTips } from '@/data/homeData';

const HealthTipBanner = () => {
  const [currentTip, setCurrentTip] = useState(healthTips[0]);
  const [tipVisible, setTipVisible] = useState(true);
  
  useEffect(() => {
    // Set initial tip based on day of year
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const tipIndex = dayOfYear % healthTips.length;
    setCurrentTip(healthTips[tipIndex]);
  }, []);
  
  const dismissTip = () => {
    setTipVisible(false);
  };
  
  if (!tipVisible) return null;
  
  return (
    <div 
      className="mb-8 relative overflow-hidden rounded-3xl bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 shadow-xl transition-all duration-500"
      data-testid="health-tip-banner"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/20 to-transparent rounded-full -mr-10 -mt-10"></div>
      <div className="relative p-5 flex items-center gap-4">
        <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg text-2xl">
          {currentTip.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">Tip of the Day • {currentTip.category}</span>
          </div>
          <p className="text-sm text-white/90 leading-relaxed">{currentTip.tip}</p>
        </div>
        <button 
          onClick={dismissTip}
          className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Dismiss tip"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>
    </div>
  );
};

export default HealthTipBanner;
