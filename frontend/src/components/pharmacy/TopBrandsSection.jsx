import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TOP_BRANDS } from '@/lib/pharmacy-constants';

export const TopBrandsSection = ({ onSelectBrand }) => {
  const scrollContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setShowLeftArrow(container.scrollLeft > 10);
    setShowRightArrow(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
  };

  const scrollLeft = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: -250, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: 250, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      checkScrollButtons();
      return () => container.removeEventListener('scroll', checkScrollButtons);
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6" data-testid="top-brands-section">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-stone-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Top <span className="text-orange-500">brands</span> for you
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={scrollLeft}
            className={`w-9 h-9 rounded-full bg-white border border-stone-200 shadow-sm flex items-center justify-center transition-all ${showLeftArrow ? 'hover:bg-orange-500 hover:border-orange-500 hover:shadow-md' : 'opacity-40 cursor-default'}`}
            disabled={!showLeftArrow}
            data-testid="brands-scroll-left"
          >
            <ChevronLeft className="w-5 h-5 text-stone-500" />
          </button>
          <button 
            onClick={scrollRight}
            className={`w-9 h-9 rounded-full bg-white border border-stone-200 shadow-sm flex items-center justify-center transition-all ${showRightArrow ? 'hover:bg-orange-500 hover:border-orange-500 hover:shadow-md' : 'opacity-40 cursor-default'}`}
            disabled={!showRightArrow}
            data-testid="brands-scroll-right"
          >
            <ChevronRight className="w-5 h-5 text-stone-500" />
          </button>
        </div>
      </div>
      <div 
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent"
        style={{ scrollbarWidth: 'thin' }}
      >
        {TOP_BRANDS.map(brand => (
          <button
            key={brand.id}
            onClick={() => onSelectBrand(brand)}
            className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl bg-white border-2 border-stone-100 shadow-sm hover:shadow-lg hover:border-orange-400 hover:-translate-y-1 transition-all duration-200 flex items-center justify-center group active:scale-95 overflow-hidden"
            data-testid={`brand-${brand.id}`}
          >
            <div className="w-full h-full bg-white rounded-lg m-1.5 flex items-center justify-center p-1.5">
              <img 
                src={brand.logo} 
                alt={brand.name}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                loading="lazy"
                decoding="async"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
              <span className="hidden text-sm font-semibold text-zinc-700 text-center">{brand.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
