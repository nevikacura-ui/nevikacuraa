import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { lightTap } from '@/utils/haptics';

/**
 * AdCarousel Component for Orange Pharmacy
 * Displays rotating advertisement banners - ONE slide at a time
 */
const AdCarousel = ({ ads = [], autoPlayInterval = 4000, className = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Default ads if none provided - Pharmaceutical ads
  const defaultAds = [
    {
      id: 1,
      image: 'https://customer-assets.emergentagent.com/job_6fdeafa1-1318-478c-b10e-666f4e2b670d/artifacts/dycozdlb_Screenshot_20260214-053506.png',
      alt: 'Prohance - Up to 15% Off',
      title: '',
      subtitle: ''
    },
    {
      id: 2,
      image: 'https://customer-assets.emergentagent.com/job_6fdeafa1-1318-478c-b10e-666f4e2b670d/artifacts/oofwresx_Screenshot_20260214-110931.png',
      alt: 'Wellman Vitabiotics - Flat 20% Off',
      title: '',
      subtitle: ''
    },
    {
      id: 3,
      image: 'https://customer-assets.emergentagent.com/job_6fdeafa1-1318-478c-b10e-666f4e2b670d/artifacts/5okby9co_Screenshot_20260214-110843.png',
      alt: 'Lilly Cipla - Win Over Weight',
      title: '',
      subtitle: ''
    }
  ];

  const carouselAds = ads.length > 0 ? ads : defaultAds;

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || carouselAds.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselAds.length);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [isAutoPlaying, carouselAds.length, autoPlayInterval]);

  // Navigation handlers with haptic feedback
  const goToNext = useCallback(() => {
    lightTap();
    setCurrentIndex((prev) => (prev + 1) % carouselAds.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, [carouselAds.length]);

  const goToPrev = useCallback(() => {
    lightTap();
    setCurrentIndex((prev) => (prev - 1 + carouselAds.length) % carouselAds.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, [carouselAds.length]);

  const goToSlide = useCallback((index) => {
    lightTap();
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, []);

  if (carouselAds.length === 0) return null;

  return (
    <div 
      className={`relative w-full overflow-hidden rounded-2xl shadow-lg ${className}`}
      data-testid="ad-carousel"
    >
      {/* Carousel Container */}
      <div 
        className="relative h-48 sm:h-56 md:h-64"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        {/* Single Slide Display - Show only current ad */}
        <div className="w-full h-full relative">
          {carouselAds.map((ad, index) => (
            <div 
              key={ad.id || index}
              className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
                index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img
                src={ad.image}
                alt={ad.alt || `Advertisement ${index + 1}`}
                className="w-full h-full object-contain bg-white"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
              {/* Overlay gradient - only if there's text */}
              {(ad.title || ad.subtitle) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              )}
              
              {/* Ad Content Overlay */}
              {(ad.title || ad.subtitle) && (
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
                  {ad.title && (
                    <h3 className="text-lg sm:text-xl font-bold mb-1 drop-shadow-lg">
                      {ad.title}
                    </h3>
                  )}
                  {ad.subtitle && (
                    <p className="text-sm sm:text-base text-white/90 drop-shadow">
                      {ad.subtitle}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {carouselAds.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow-lg flex items-center justify-center transition-all active:scale-95"
              data-testid="carousel-prev"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5 text-orange-600" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow-lg flex items-center justify-center transition-all active:scale-95"
              data-testid="carousel-next"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5 text-orange-600" />
            </button>
          </>
        )}

        {/* Dot Indicators */}
        {carouselAds.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {carouselAds.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex
                    ? 'w-6 h-2 bg-orange-500'
                    : 'w-2 h-2 bg-white/60 hover:bg-white/80'
                }`}
                data-testid={`carousel-dot-${index}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdCarousel;
