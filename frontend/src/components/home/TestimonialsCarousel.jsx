import React, { useState, useEffect } from 'react';
import { Quote, Star } from 'lucide-react';
import { testimonials } from '@/data/homeData';

const TestimonialsCarousel = () => {
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [testimonialTransition, setTestimonialTransition] = useState(false);
  
  // Auto-rotate testimonials carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialTransition(true);
      setTimeout(() => {
        setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
        setTestimonialTransition(false);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const handleDotClick = (idx) => {
    setTestimonialTransition(true);
    setTimeout(() => {
      setTestimonialIndex(idx);
      setTestimonialTransition(false);
    }, 300);
  };
  
  return (
    <div className="mb-16" data-testid="testimonials-carousel">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          <Quote className="w-5 h-5 text-teal-400" />
          What Our Patients Say
        </h2>
        <div className="flex gap-1.5">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleDotClick(idx)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                idx === testimonialIndex ? 'bg-teal-400 w-6' : 'bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to testimonial ${idx + 1}`}
            />
          ))}
        </div>
      </div>
      
      <div className={`relative bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl p-6 sm:p-8 transition-all duration-300 ${
        testimonialTransition ? 'opacity-0 transform translate-x-4' : 'opacity-100 transform translate-x-0'
      }`}>
        <div className="absolute top-6 right-6 text-6xl text-white/10 font-serif">"</div>
        
        <div className="relative flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {testimonials[testimonialIndex].avatar}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-2">
              {[...Array(testimonials[testimonialIndex].rating)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            
            <p className="text-white text-base sm:text-lg leading-relaxed mb-4">
              "{testimonials[testimonialIndex].text}"
            </p>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{testimonials[testimonialIndex].name}</p>
                <p className="text-sm text-gray-400">{testimonials[testimonialIndex].location}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-500/20 text-teal-400 border border-teal-500/30">
                {testimonials[testimonialIndex].service}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialsCarousel;
