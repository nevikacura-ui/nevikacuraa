import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Heart, Activity, Sparkles, Baby, Star, FileText, BarChart3 } from 'lucide-react';

// Portal data - Health & Wellness focused portals
const portals = [
  {
    id: 'evara',
    name: 'Evara',
    subtitle: "Women's Health",
    path: '/evara',
    icon: Heart,
    bgColor: '#511b63',
    lightBg: '#f3e8ff'
  },
  {
    id: 'glydex',
    name: 'Glydex',
    subtitle: 'Diabetes Care',
    path: '/glydex',
    icon: Activity,
    bgColor: '#0f766e',
    lightBg: '#ccfbf1'
  },
  {
    id: 'thrive360',
    name: 'Thrive360',
    subtitle: 'Wellness',
    path: '/thrive360',
    icon: Sparkles,
    bgColor: '#4338ca',
    lightBg: '#e0e7ff'
  },
  {
    id: 'alyne',
    name: 'Alyne',
    subtitle: 'Child Care',
    path: '/alyne',
    icon: Baby,
    bgColor: '#0284c7',
    lightBg: '#e0f2fe'
  },
  {
    id: 'aanya',
    name: 'Aanya',
    subtitle: 'Newborn',
    path: '/aanya',
    icon: Star,
    bgColor: '#db2777',
    lightBg: '#fce7f3'
  },
  {
    id: 'reports',
    name: 'Reports',
    subtitle: 'Blood Charts',
    path: '/health-dashboard',
    icon: FileText,
    bgColor: '#ea580c',
    lightBg: '#ffedd5'
  },
  {
    id: 'healthchart',
    name: 'Health Log',
    subtitle: 'Weight & Logs',
    path: '/my-health',
    icon: BarChart3,
    bgColor: '#059669',
    lightBg: '#d1fae5'
  }
];

const PortalScrollBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [activePortal, setActivePortal] = useState(null);

  // Determine active portal based on current path
  useEffect(() => {
    const currentPath = location.pathname;
    const active = portals.find(p => currentPath === p.path || currentPath.startsWith(p.path + '/'));
    setActivePortal(active?.id || null);
  }, [location.pathname]);

  // Handle scroll arrows visibility
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -150, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 150, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      handleScroll();
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="relative bg-slate-50 border-b border-slate-200 sticky top-[60px] z-40" data-testid="portal-scroll-bar">
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white shadow-md rounded-full flex items-center justify-center hover:bg-slate-50 transition-all"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
      )}

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white shadow-md rounded-full flex items-center justify-center hover:bg-slate-50 transition-all"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 px-3 py-2.5 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {portals.map((portal) => {
          const isActive = activePortal === portal.id;
          const IconComponent = portal.icon;
          
          return (
            <button
              key={portal.id}
              onClick={() => navigate(portal.path)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 min-w-[70px] ${
                isActive 
                  ? 'shadow-lg scale-105' 
                  : 'hover:scale-102 hover:shadow-md'
              }`}
              style={{ 
                backgroundColor: isActive ? portal.bgColor : portal.lightBg,
              }}
              data-testid={`portal-btn-${portal.id}`}
            >
              {/* Icon */}
              <div 
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  isActive ? 'bg-white/25' : 'bg-white shadow-sm'
                }`}
              >
                <IconComponent 
                  className="w-5 h-5" 
                  style={{ color: isActive ? '#ffffff' : portal.bgColor }}
                />
              </div>
              
              {/* Name */}
              <span 
                className={`text-[10px] font-semibold leading-tight text-center ${
                  isActive ? 'text-white' : ''
                }`}
                style={{ color: isActive ? '#ffffff' : portal.bgColor }}
              >
                {portal.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Gradient Fades */}
      {showLeftArrow && (
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-50 to-transparent pointer-events-none"></div>
      )}
      {showRightArrow && (
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
      )}
    </div>
  );
};

export default PortalScrollBar;
