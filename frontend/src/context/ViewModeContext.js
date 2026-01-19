import React, { createContext, useState, useContext, useEffect } from 'react';

const ViewModeContext = createContext();

// View modes: 'auto', 'desktop', 'tablet', 'mobile'
export const VIEW_MODES = {
  AUTO: 'auto',
  DESKTOP: 'desktop',
  TABLET: 'tablet',
  MOBILE: 'mobile'
};

// Breakpoints
const BREAKPOINTS = {
  mobile: 640,   // < 640px
  tablet: 1024,  // 640px - 1024px
  desktop: 1025  // > 1024px
};

export const ViewModeProvider = ({ children }) => {
  const [viewMode, setViewMode] = useState(() => {
    // Load from localStorage or default to auto
    return localStorage.getItem('viewMode') || VIEW_MODES.AUTO;
  });
  
  const [screenSize, setScreenSize] = useState('desktop');
  
  // Detect actual screen size
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.mobile) {
        setScreenSize('mobile');
      } else if (width < BREAKPOINTS.desktop) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };
    
    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);
  
  // Save view mode to localStorage
  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);
  
  // Get effective view mode (considering auto mode)
  const effectiveViewMode = viewMode === VIEW_MODES.AUTO ? screenSize : viewMode;
  
  // Helper functions for responsive checks
  const isMobile = effectiveViewMode === 'mobile';
  const isTablet = effectiveViewMode === 'tablet';
  const isDesktop = effectiveViewMode === 'desktop';
  
  // Get responsive class names based on view mode
  const getResponsiveClasses = (config) => {
    const { mobile = '', tablet = '', desktop = '' } = config;
    if (isMobile) return mobile;
    if (isTablet) return tablet;
    return desktop;
  };
  
  // Get responsive value based on view mode
  const getResponsiveValue = (config) => {
    const { mobile, tablet, desktop } = config;
    if (isMobile) return mobile;
    if (isTablet) return tablet;
    return desktop;
  };

  return (
    <ViewModeContext.Provider value={{
      viewMode,
      setViewMode,
      effectiveViewMode,
      screenSize,
      isMobile,
      isTablet,
      isDesktop,
      getResponsiveClasses,
      getResponsiveValue,
      VIEW_MODES
    }}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};

export default ViewModeContext;
