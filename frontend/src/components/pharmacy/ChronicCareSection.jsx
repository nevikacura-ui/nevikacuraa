import React from 'react';
import { ChevronRight } from 'lucide-react';
import { CHRONIC_CARE_CATEGORIES, COMMON_CONCERNS } from '@/lib/pharmacy-constants';

export const ChronicCareSection = ({ onSelectCategory }) => (
  <div className="max-w-7xl mx-auto px-4 py-6">
    <h2 className="text-xl font-bold text-stone-900 mb-5" style={{ fontFamily: 'Outfit, sans-serif' }}>
      Chronic <span className="text-orange-500">care</span>
    </h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {CHRONIC_CARE_CATEGORIES.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelectCategory(cat)}
          className="relative overflow-hidden rounded-2xl h-36 md:h-44 hover:shadow-xl transition-all group shadow-md hover:-translate-y-1 active:scale-[0.98] border border-stone-200 hover:border-orange-400"
          data-testid={`chronic-${cat.id}`}
        >
          <img 
            src={cat.image} 
            alt={cat.label}
            className="w-full h-full object-cover brightness-75 group-hover:brightness-90 group-hover:scale-105 transition-all duration-300"
          />
          <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/60 to-transparent p-3 pt-10">
            <span className="font-bold text-sm md:text-base text-white flex items-center gap-1">
              {cat.label}
              <ChevronRight className="w-4 h-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
            </span>
          </span>
        </button>
      ))}
    </div>
  </div>
);

export const CommonConcernsSection = ({ onSelectCategory }) => (
  <div className="max-w-7xl mx-auto px-4 py-6">
    <h2 className="text-xl font-bold text-stone-900 mb-5" style={{ fontFamily: 'Outfit, sans-serif' }}>
      Shop by <span className="text-orange-500">common concerns</span>
    </h2>
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
      {COMMON_CONCERNS.map(concern => (
        <button
          key={concern.id}
          onClick={() => onSelectCategory(concern)}
          className="flex-shrink-0 w-32 md:w-40 h-44 md:h-52 rounded-2xl overflow-hidden hover:shadow-xl transition-all group relative shadow-md hover:-translate-y-1 active:scale-[0.98] border border-stone-200 hover:border-orange-400"
          data-testid={`concern-${concern.id}`}
        >
          <img 
            src={concern.image} 
            alt={concern.label}
            className="w-full h-full object-cover brightness-75 group-hover:brightness-90 group-hover:scale-105 transition-all duration-300"
          />
          <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/60 to-transparent p-3 pt-10">
            <span className="font-bold text-sm text-white block">{concern.label}</span>
          </span>
        </button>
      ))}
    </div>
  </div>
);
