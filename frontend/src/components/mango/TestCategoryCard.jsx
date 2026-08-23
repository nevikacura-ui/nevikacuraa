import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const TestCategoryCard = ({ icon: Icon, title, count, color, isActive, onClick }) => (
  <button
    onClick={onClick}
    data-testid={`test-category-${title.toLowerCase().replace(/\s+/g, '-')}`}
    className={`
      p-4 rounded-2xl border-2 transition-all duration-300 ease-out text-left w-full group relative
      active:scale-95 active:shadow-inner
      ${isActive 
        ? 'border-green-700 bg-green-700 shadow-lg shadow-green-200 scale-[1.02] ring-2 ring-green-300' 
        : 'border-green-200 hover:border-green-400 bg-green-500 hover:bg-green-600 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5'
      }
    `}
  >
    {/* Shimmer effect on hover */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden rounded-2xl">
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </div>
    
    <div className="flex items-center gap-3 relative">
      <div 
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${isActive ? 'bg-white/20' : 'bg-white/30'}`}
      >
        <Icon className="w-6 h-6 text-white transition-transform duration-300 group-hover:scale-110" />
      </div>
      <div>
        <h3 className="font-semibold text-white transition-colors" style={{ fontFamily: 'Outfit, sans-serif' }}>{title}</h3>
        <p className="text-xs text-white/80 transition-all group-hover:tracking-wide">{count} tests</p>
      </div>
      {isActive && (
        <div className="ml-auto">
          <CheckCircle2 className="w-5 h-5 text-white animate-bounce" />
        </div>
      )}
    </div>
  </button>
);

export default TestCategoryCard;
