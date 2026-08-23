import React, { useState, useEffect } from 'react';

const LoadingScreen = ({ onComplete }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [fadeOut, setFadeOut] = useState(false);
  
  const words = [
    { text: 'Book.', color: '#ffffff' },      // white
    { text: 'Order.', color: '#fef3c7' },     // amber-100
    { text: 'Test.', color: '#e0f2fe' },      // sky-100
    { text: 'Care.', color: '#fce7f3' },      // pink-100
  ];
  
  useEffect(() => {
    // Lock body scroll
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);
  
  useEffect(() => {
    // Animate words sequentially
    const wordInterval = 200; // 200ms per word
    const totalDuration = 1100; // 1.1 seconds total
    
    // Start showing words
    const wordTimers = words.map((_, index) => {
      return setTimeout(() => {
        setCurrentWordIndex(index);
      }, index * wordInterval);
    });
    
    // Start fade out
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, totalDuration - 200);
    
    // Complete and transition
    const completeTimer = setTimeout(() => {
      onComplete();
    }, totalDuration);
    
    return () => {
      wordTimers.forEach(timer => clearTimeout(timer));
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);
  
  return (
    <div 
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center transition-opacity duration-200 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ 
        background: 'linear-gradient(165deg, #5eead4 0%, #2dd4bf 20%, #14b8a6 40%, #0d9488 60%, #0891b2 80%, #06b6d4 100%)'
      }}
    >
      {/* Logo Container */}
      <div className="mb-8">
        <div className="rounded-[32px] px-6 py-4">
          <img 
            src="https://customer-assets.emergentagent.com/job_4625448c-b743-44eb-9c92-5eb654622ad3/artifacts/bbwpw7kq_Screenshot_20260220-043004.png" 
            alt="Nevika Cura" 
            className="h-20 w-auto object-contain"
          />
        </div>
      </div>
      
      {/* Words Container */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap px-4">
        {words.map((word, index) => (
          <span
            key={word.text}
            className={`text-2xl sm:text-3xl md:text-4xl font-bold transition-all duration-300 ${
              index <= currentWordIndex 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-4'
            }`}
            style={{ 
              color: word.color,
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transitionDelay: `${index * 50}ms`
            }}
          >
            {word.text}
          </span>
        ))}
      </div>
      
      {/* Subtle loading indicator */}
      <div className="mt-8">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-white/80"
              style={{
                animation: 'loadingDot 0.8s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`
              }}
            />
          ))}
        </div>
      </div>
      
      <style>{`
        @keyframes loadingDot {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
