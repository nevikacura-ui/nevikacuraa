import React, { useState, useRef, useEffect } from 'react';

/**
 * OptimizedImage - Lazy loading image with blur placeholder
 * Usage: <OptimizedImage src="/path/to/image.jpg" alt="desc" className="..." />
 */
const OptimizedImage = ({ src, alt, className = '', width, height, style = {} }) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height, ...style }}
    >
      {/* Blur placeholder */}
      {!loaded && (
        <div
          className="absolute inset-0 skeleton"
          style={{ borderRadius: 'inherit' }}
        />
      )}
      {/* Actual image */}
      {inView && (
        <img
          src={src}
          alt={alt || ''}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-400 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ borderRadius: 'inherit' }}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
