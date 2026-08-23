import React from 'react';

// Ultra-light CSS-only page transition — no blocking, no exit animation
const AnimatedPage = ({ children }) => (
  <div className="page-enter">{children}</div>
);

// No-op providers for backwards compatibility
const PageTransitionProvider = ({ children }) => <>{children}</>;

// Lightweight fade-in for sections
const FadeIn = ({ children, delay = 0, className = '' }) => (
  <div className={`page-enter ${className}`} style={{ animationDelay: `${delay}s` }}>
    {children}
  </div>
);

const ScaleIn = ({ children, delay = 0, className = '' }) => (
  <div className={`page-enter ${className}`} style={{ animationDelay: `${delay}s` }}>
    {children}
  </div>
);

const StaggerContainer = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

const StaggerItem = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

export { AnimatedPage, PageTransitionProvider, FadeIn, ScaleIn, StaggerContainer, StaggerItem };
export default AnimatedPage;
