import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Truck, Clock, Zap } from 'lucide-react';
import { AD_BANNERS } from '@/lib/pharmacy-constants';

export const FamilyCareBanner = ({ onSelectCategory }) => (
  <div className="max-w-7xl mx-auto px-4 py-4">
    <div className="relative overflow-hidden rounded-2xl shadow-md border border-stone-200">
      <img 
        src="/banners/family_care_banner.png" 
        alt="Family Care - Kids Nutrition & Care, Adult Wellness, Elderly Care"
        className="w-full h-auto object-contain brightness-90"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute bottom-0 left-0 right-0 flex">
        <button 
          onClick={() => onSelectCategory({ id: 'baby', label: 'Baby Care', filter: 'baby' })}
          className="flex-1 h-20 md:h-28 hover:bg-orange-500/10 transition-colors"
          aria-label="Kids Nutrition & Care"
        />
        <button 
          onClick={() => onSelectCategory({ id: 'vitamins', label: 'Vitamins', filter: 'vitamin' })}
          className="flex-1 h-20 md:h-28 hover:bg-orange-500/10 transition-colors"
          aria-label="Adult Wellness"
        />
        <button 
          onClick={() => onSelectCategory({ id: 'bone', label: 'Bone & Joint', filter: 'bone' })}
          className="flex-1 h-20 md:h-28 hover:bg-orange-500/10 transition-colors"
          aria-label="Elderly Care"
        />
      </div>
    </div>
  </div>
);

export const PromoBannerCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const carouselRef = useRef(null);
  
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % AD_BANNERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);
  
  const goToSlide = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };
  
  const nextSlide = () => goToSlide((currentSlide + 1) % AD_BANNERS.length);
  const prevSlide = () => goToSlide((currentSlide - 1 + AD_BANNERS.length) % AD_BANNERS.length);
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="relative overflow-hidden rounded-2xl shadow-md border border-stone-200" ref={carouselRef}>
        <div 
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {AD_BANNERS.map((banner) => (
            <div key={banner.id} className="w-full flex-shrink-0">
              <img 
                src={banner.image} 
                alt={banner.alt}
                className="w-full h-40 md:h-56 lg:h-64 object-cover rounded-2xl"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        
        <button 
          onClick={prevSlide}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-orange-500 transition-colors border border-stone-200 hover:border-orange-500"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button 
          onClick={nextSlide}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-orange-500 transition-colors border border-stone-200 hover:border-orange-500"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
        
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {AD_BANNERS.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide 
                  ? 'bg-orange-500 w-6' 
                  : 'bg-white/30 w-2 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const DeliveryBanner = () => (
  <div className="max-w-7xl mx-auto px-4 py-3">
    <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Truck className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm">Free Delivery</p>
          <p className="text-xs text-zinc-400">On orders above ₹1,000</p>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 px-4 py-2 rounded-full">
        <Zap className="w-4 h-4 text-orange-400" />
        <span className="text-orange-400 text-xs font-bold">2-4 hours</span>
      </div>
    </div>
  </div>
);
