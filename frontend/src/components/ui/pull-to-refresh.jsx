import React, { useState, useCallback } from 'react';
import { Pill, FlaskConical, Stethoscope, RefreshCw } from 'lucide-react';

/**
 * Pull-to-Refresh Hook and Component
 * Custom branded refresh animation for different sections
 */

// Hook for pull-to-refresh functionality
export const usePullToRefresh = (onRefresh, options = {}) => {
  const {
    threshold = 80,
    maxPull = 120,
  } = options;

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    
    if (diff > 0 && window.scrollY === 0) {
      // Apply resistance
      const distance = Math.min(diff * 0.5, maxPull);
      setPullDistance(distance);
      
      if (distance > threshold) {
        // Visual feedback that refresh will trigger
      }
    }
  }, [isPulling, isRefreshing, startY, threshold, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    if (pullDistance > threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60); // Keep some distance during refresh
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    
    setIsPulling(false);
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  return {
    pullDistance,
    isRefreshing,
    isPulling,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
};

// Refresh indicator component
export const RefreshIndicator = ({ 
  pullDistance, 
  isRefreshing, 
  threshold = 80,
  type = 'generic' // 'pharmacy', 'lab', 'diagyn', 'generic'
}) => {
  const progress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance > threshold;
  
  // Type-specific configuration
  const config = {
    pharmacy: {
      icon: Pill,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100',
      label: 'Refreshing medicines...',
    },
    lab: {
      icon: FlaskConical,
      color: 'text-green-500',
      bgColor: 'bg-green-100',
      label: 'Updating tests...',
    },
    diagyn: {
      icon: Stethoscope,
      color: 'text-teal-500',
      bgColor: 'bg-teal-100',
      label: 'Loading doctors...',
    },
    generic: {
      icon: RefreshCw,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
      label: 'Refreshing...',
    },
  };
  
  const { icon: Icon, color, bgColor, label } = config[type] || config.generic;
  
  if (pullDistance <= 0 && !isRefreshing) return null;
  
  return (
    <div 
      className="flex flex-col items-center justify-center py-4 transition-all duration-200"
      style={{ 
        height: `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px`,
        opacity: progress,
      }}
    >
      <div 
        className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center transition-transform duration-200`}
        style={{
          transform: `scale(${0.5 + progress * 0.5}) rotate(${pullDistance * 3}deg)`,
        }}
      >
        <Icon 
          className={`w-6 h-6 ${color} ${isRefreshing ? 'animate-spin' : ''}`}
          style={{
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
          }}
        />
      </div>
      
      {(shouldTrigger || isRefreshing) && (
        <p className={`text-xs ${color} mt-2 font-medium transition-opacity duration-200`}>
          {isRefreshing ? label : 'Release to refresh'}
        </p>
      )}
    </div>
  );
};

// Wrapper component that adds pull-to-refresh to any scrollable content
export const PullToRefreshContainer = ({ 
  children, 
  onRefresh, 
  type = 'generic',
  className = '',
}) => {
  const { pullDistance, isRefreshing, handlers } = usePullToRefresh(onRefresh);
  
  return (
    <div 
      className={`relative ${className}`}
      {...handlers}
    >
      <RefreshIndicator 
        pullDistance={pullDistance} 
        isRefreshing={isRefreshing}
        type={type}
      />
      <div 
        style={{ 
          transform: `translateY(${isRefreshing ? 0 : Math.max(0, pullDistance - 60)}px)`,
          transition: isRefreshing ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefreshContainer;
