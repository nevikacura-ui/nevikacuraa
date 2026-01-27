import React, { useState, useEffect } from 'react';

const LoadingScreen = ({ onComplete, minDuration = 2500 }) => {
  const [visibleWords, setVisibleWords] = useState(0);
  const words = ['Book.', 'Order.', 'Test.', 'Care.'];
  
  useEffect(() => {
    // Sequentially show words with smooth fade-in
    const wordTimers = words.map((_, idx) => {
      return setTimeout(() => {
        setVisibleWords(idx + 1);
      }, 400 + idx * 400); // Start after 400ms, each word 400ms apart
    });
    
    // Complete after minimum duration
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, minDuration);
    
    return () => {
      wordTimers.forEach(timer => clearTimeout(timer));
      clearTimeout(completeTimer);
    };
  }, [onComplete, minDuration]);
  
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white">
      {/* Logo */}
      <div className="mb-8">
        <div className="bg-white rounded-[32px] px-6 py-4 shadow-lg border border-gray-100">
          <img 
            src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
            alt="Nevika Cura" 
            className="h-16 w-auto object-contain"
          />
        </div>
      </div>
      
      {/* Sequential Words: Book. Order. Test. Care. */}
      <div className="flex justify-center items-center gap-3">
        {words.map((word, idx) => (
          <span 
            key={word}
            className={`text-2xl sm:text-3xl font-bold transition-all duration-500 ease-out ${
              idx < visibleWords 
                ? 'opacity-100 transform translate-y-0' 
                : 'opacity-0 transform translate-y-3'
            }`}
            style={{
              color: idx === 3 ? '#f97316' : '#0d9488' // Orange for "Care.", Teal for others
            }}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
};

export default LoadingScreen;
