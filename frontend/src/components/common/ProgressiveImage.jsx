import React, { useState, useRef, useEffect } from 'react';

/**
 * ProgressiveImage Component
 * Provides lazy loading with blur-up effect for images
 * 
 * Features:
 * - IntersectionObserver-based lazy loading
 * - Smooth blur-to-clear transition
 * - Fallback placeholder support
 * - Error handling with fallback
 * 
 * Usage:
 * <ProgressiveImage 
 *   src="/high-res.jpg"
 *   alt="Description"
 *   className="w-full h-48 object-cover"
 * />
 */
export const ProgressiveImage = ({
  src,
  alt = '',
  className = '',
  placeholderColor = '#1E293B', // Slate 800
  fallbackSrc = null,
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setHasError(true);
    if (fallbackSrc && e.target.src !== fallbackSrc) {
      e.target.src = fallbackSrc;
    }
    onError?.(e);
  };

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundColor: placeholderColor,
      }}
      data-testid="progressive-image-container"
    >
      {/* Placeholder with shimmer effect */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 animate-pulse"
          style={{ backgroundColor: placeholderColor }}
          data-testid="progressive-image-placeholder"
        >
          <div 
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, ${placeholderColor} 0%, rgba(255,255,255,0.05) 50%, ${placeholderColor} 100%)`,
              animation: 'shimmer 1.5s infinite'
            }}
          />
        </div>
      )}
      
      {/* Actual image */}
      {isInView && (
        <img
          src={hasError && fallbackSrc ? fallbackSrc : src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
          data-testid="progressive-image"
          {...props}
        />
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

/**
 * ProgressiveAvatar - Circular avatar with progressive loading
 */
export const ProgressiveAvatar = ({
  src,
  alt = '',
  size = 'md',
  className = '',
  fallbackInitials = '',
  ...props
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-xl',
    '2xl': 'w-28 h-28 text-2xl'
  };

  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const showFallback = hasError || !src;

  return (
    <div 
      className={`relative rounded-full overflow-hidden flex-shrink-0 ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: '#1E293B' }}
      data-testid="progressive-avatar"
    >
      {showFallback ? (
        <div 
          className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-500 to-teal-600 text-white font-semibold"
          data-testid="avatar-fallback"
        >
          {fallbackInitials || alt?.charAt(0)?.toUpperCase() || '?'}
        </div>
      ) : (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 animate-pulse bg-slate-700" />
          )}
          <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            loading="lazy"
            {...props}
          />
        </>
      )}
    </div>
  );
};

/**
 * ProgressiveBackground - Background image with progressive loading
 */
export const ProgressiveBackground = ({
  src,
  children,
  className = '',
  overlay = true,
  overlayOpacity = 0.5,
  placeholderColor = '#0F172A',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.src = src;
  }, [isInView, src]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: placeholderColor }}
      data-testid="progressive-background"
      {...props}
    >
      {/* Background image */}
      {isInView && src && (
        <div
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundImage: `url(${src})` }}
        />
      )}
      
      {/* Overlay */}
      {overlay && (
        <div 
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default ProgressiveImage;
