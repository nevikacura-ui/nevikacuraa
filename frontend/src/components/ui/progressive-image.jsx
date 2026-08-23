import React, { useState, useEffect, useRef } from 'react';

/**
 * Progressive Image Component with Lazy Loading & Blur-up Effect
 * - Shows tiny blurred placeholder first
 * - Loads full image when entering viewport
 * - Smooth fade transition
 */
export const ProgressiveImage = ({
  src,
  alt,
  className = '',
  placeholderColor = '#1a1a1a',
  aspectRatio = '1/1',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Generate tiny placeholder (data URL for instant display)
  const placeholder = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='${encodeURIComponent(placeholderColor)}' width='1' height='1'/%3E%3C/svg%3E`;

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio }}
      {...props}
    >
      {/* Placeholder background */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 animate-pulse"
        style={{
          opacity: isLoaded ? 0 : 1,
          transition: 'opacity 0.3s ease-out'
        }}
      />

      {/* Blurred placeholder shimmer */}
      {!isLoaded && (
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            style={{
              animation: 'shimmer 1.5s infinite',
              transform: 'translateX(-100%)'
            }}
          />
        </div>
      )}

      {/* Actual image - only loads when in view */}
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.4s ease-out',
            filter: isLoaded ? 'none' : 'blur(10px)',
          }}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          loading="lazy"
          decoding="async"
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
          <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  );
};

/**
 * Optimized Image Grid with Virtual Scrolling
 * Only renders visible items for performance
 */
export const VirtualImageGrid = ({
  items,
  renderItem,
  itemHeight = 200,
  columns = 2,
  gap = 16,
  className = '',
}) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const containerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const { scrollTop, clientHeight } = document.documentElement;
      const containerTop = containerRef.current.offsetTop;
      const rowHeight = itemHeight + gap;
      const itemsPerRow = columns;

      // Calculate visible range with buffer
      const startRow = Math.max(0, Math.floor((scrollTop - containerTop - 200) / rowHeight));
      const endRow = Math.ceil((scrollTop - containerTop + clientHeight + 200) / rowHeight);

      setVisibleRange({
        start: startRow * itemsPerRow,
        end: Math.min(items.length, (endRow + 1) * itemsPerRow)
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll);
  }, [items.length, itemHeight, columns, gap]);

  const totalHeight = Math.ceil(items.length / columns) * (itemHeight + gap);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ height: totalHeight }}
    >
      <div
        className="absolute w-full grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          top: Math.floor(visibleRange.start / columns) * (itemHeight + gap),
        }}
      >
        {items.slice(visibleRange.start, visibleRange.end).map((item, idx) => (
          <div key={item.id || visibleRange.start + idx} style={{ height: itemHeight }}>
            {renderItem(item, visibleRange.start + idx)}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Image Preloader - Preloads images in background
 */
export const useImagePreloader = (imageSrcs = []) => {
  useEffect(() => {
    const preloadImages = () => {
      imageSrcs.forEach(src => {
        if (src) {
          const img = new Image();
          img.src = src;
        }
      });
    };

    // Preload after a short delay to not block main thread
    const timer = setTimeout(preloadImages, 1000);
    return () => clearTimeout(timer);
  }, [imageSrcs]);
};

// CSS for shimmer animation (add to App.css or include in component)
export const ImageOptimizationStyles = () => (
  <style>{`
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    .progressive-image-enter {
      opacity: 0;
      filter: blur(20px);
    }
    
    .progressive-image-enter-active {
      opacity: 1;
      filter: blur(0);
      transition: opacity 0.4s ease-out, filter 0.4s ease-out;
    }
  `}</style>
);

export default ProgressiveImage;
