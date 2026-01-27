import React, { useState, useEffect } from 'react';
import { Calendar, Pill, TestTube, Stethoscope } from 'lucide-react';

const LoadingScreen = ({ onComplete, minDuration = 3000 }) => {
  const [visibleItems, setVisibleItems] = useState(0);
  
  const items = [
    { Icon: Calendar, bgColor: 'bg-blue-200/80', iconColor: 'text-blue-600', word: 'Book.' },
    { Icon: Pill, bgColor: 'bg-orange-200/80', iconColor: 'text-orange-600', word: 'Order.' },
    { Icon: TestTube, bgColor: 'bg-purple-200/80', iconColor: 'text-purple-600', word: 'Test.' },
    { Icon: Stethoscope, bgColor: 'bg-teal-200/80', iconColor: 'text-teal-600', word: 'Care.' },
  ];
  
  useEffect(() => {
    // Sequentially show items
    const itemTimers = items.map((_, idx) => {
      return setTimeout(() => {
        setVisibleItems(idx + 1);
      }, idx * 500);
    });
    
    // Complete after minimum duration
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, minDuration);
    
    return () => {
      itemTimers.forEach(timer => clearTimeout(timer));
      clearTimeout(completeTimer);
    };
  }, [onComplete, minDuration]);
  
  return (
    <div 
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
      style={{ 
        background: 'linear-gradient(165deg, #5eead4 0%, #2dd4bf 20%, #14b8a6 40%, #0d9488 60%, #0891b2 80%, #06b6d4 100%)'
      }}
    >
      {/* Soft Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 right-5 w-64 h-64 bg-teal-300/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center flex flex-col items-center px-4">
        {/* Logo */}
        <div className="mb-10">
          <div className="bg-white rounded-[40px] px-8 py-5 shadow-2xl shadow-black/20">
            <img 
              src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
              alt="Nevika Cura" 
              className="h-20 w-auto object-contain"
            />
          </div>
        </div>
        
        {/* Sequential Icons with Words - "Book. Order. Test. Care." */}
        <div className="flex justify-center items-center gap-4 sm:gap-6 mb-8">
          {items.map(({ Icon, bgColor, iconColor, word }, idx) => (
            <div 
              key={word}
              className={`flex flex-col items-center gap-2 transition-all duration-500 ${
                idx < visibleItems 
                  ? 'opacity-100 transform translate-y-0' 
                  : 'opacity-0 transform translate-y-6'
              }`}
            >
              <div className={`${bgColor} backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg shadow-black/10 border border-white/40`}
                   style={{ width: '60px', height: '60px' }}>
                <Icon className={`w-7 h-7 ${iconColor}`} />
              </div>
              <span className="text-lg sm:text-xl font-bold text-white drop-shadow-lg">{word}</span>
            </div>
          ))}
        </div>
        
        {/* Loading Dots */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
