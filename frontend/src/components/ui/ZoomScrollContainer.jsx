import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * ZoomScrollContainer — Two distinct modes:
 * 
 * mode="snap"   → Full-screen vertical swipe with mandatory snap + dramatic zoom (Mango/Orange)
 * mode="smooth"  → Visible parallax zoom on scroll (DiaGyn/Home)
 */
export const ZoomScrollContainer = ({ children, className = '', mode = 'snap' }) => {
  const containerRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sections = container.querySelectorAll('[data-zoom-section]');
    if (!sections.length) return;

    const animate = () => {
      const vh = window.innerHeight;
      const viewCenter = vh / 2;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 2;
        const dist = Math.abs(sectionCenter - viewCenter) / vh;
        const clamped = Math.min(dist, 1.2);

        if (mode === 'snap') {
          // DRAMATIC zoom — no blur, clean zoom + fade
          const scale = 1 - clamped * 0.12;
          const opacity = 1 - clamped * 0.4;
          const borderRadius = clamped * 24;

          section.style.transform = `scale(${Math.max(scale, 0.85)})`;
          section.style.opacity = Math.max(opacity, 0.5);
          section.style.borderRadius = `${borderRadius}px`;
          section.style.filter = 'none';
        } else {
          // SMOOTH — subtle parallax, no cloudiness
          const scale = 1 - clamped * 0.03;            // 1.0 → 0.964
          const opacity = 1 - clamped * 0.08;           // 1.0 → 0.904

          section.style.transform = `scale(${Math.max(scale, 0.96)})`;
          section.style.opacity = Math.max(opacity, 0.92);
          section.style.borderRadius = '0px';
          section.style.filter = 'none';
        }
      });
    };

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount
    animate();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [children, mode]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

/**
 * ZoomSection — each content block that participates in the zoom effect.
 */
export const ZoomSection = ({ children, className = '' }) => {
  return (
    <div
      data-zoom-section
      className={className}
      style={{
        willChange: 'transform, opacity, filter, border-radius',
        transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.35s ease-out, filter 0.35s ease-out, border-radius 0.35s ease-out',
        transformOrigin: 'center center',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
};
