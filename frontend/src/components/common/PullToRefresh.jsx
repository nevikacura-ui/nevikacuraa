import React, { useState, useRef, useCallback } from 'react';

const PullToRefresh = ({ onRefresh, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const scrollRef = useRef(null);
  const threshold = 80;

  const handleTouchStart = useCallback((e) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    } else {
      startY.current = 0;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!startY.current || refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0 && scrollRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, 120));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > threshold && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh?.();
      } catch (e) {}
      setTimeout(() => {
        setRefreshing(false);
        setPullDistance(0);
      }, 600);
    } else {
      setPullDistance(0);
    }
    startY.current = 0;
  }, [pullDistance, refreshing, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = pullDistance * 2;

  return (
    <div
      ref={scrollRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-y-auto"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Pull indicator */}
      <div
        className="flex justify-center items-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance > 5 ? `${pullDistance}px` : '0px' }}
      >
        <div className="flex flex-col items-center gap-1">
          {/* Stethoscope icon */}
          <svg
            viewBox="0 0 64 64"
            className={`w-10 h-10 ${refreshing ? 'ptr-stethoscope' : ''}`}
            style={{ transform: `rotate(${rotation}deg) scale(${0.6 + progress * 0.4})`, opacity: progress }}
          >
            <path
              d="M24 8 C20 8 12 12 12 24 C12 34 16 38 20 40 L20 48 C20 54 24 56 28 56 C32 56 36 54 36 48 L36 40 C40 38 44 34 44 24 C44 12 36 8 32 8"
              fill="none"
              stroke="#14b8a6"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="28" cy="48" r="4" fill="#14b8a6" />
            <circle cx="16" cy="8" r="3" fill="#14b8a6" stroke="#0d9488" strokeWidth="1" />
            <circle cx="36" cy="8" r="3" fill="#14b8a6" stroke="#0d9488" strokeWidth="1" />
          </svg>
          <span className="text-[10px] text-teal-500/60 font-medium">
            {refreshing ? 'Refreshing...' : pullDistance > threshold ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
};

export default PullToRefresh;
