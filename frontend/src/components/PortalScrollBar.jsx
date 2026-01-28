import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star, FileText, BarChart3 } from 'lucide-react';

// Portal data with original logos - Health & Wellness focused
const portals = [
  {
    id: 'evara',
    name: 'Evara',
    subtitle: "Women's Health",
    path: '/evara',
    logo: '/icons/evara-logo.png',
    bgColor: '#511b63'
  },
  {
    id: 'glydex',
    name: 'Glydex',
    subtitle: 'Diabetes Care',
    path: '/glydex',
    logo: 'https://customer-assets.emergentagent.com/job_healthhelper-7/artifacts/u2dcjapg_file_00000000c85c7209b181fb96372c6521.png',
    bgColor: '#121f33'
  },
  {
    id: 'thrive360',
    name: 'Thrive360',
    subtitle: 'Wellness',
    path: '/thrive360',
    logo: 'https://customer-assets.emergentagent.com/job_healspace-26/artifacts/iijsipxg_file_00000000290072089f3c35fe8c1b2b05.png',
    bgColor: '#1e1b4b'
  },
  {
    id: 'alyne',
    name: 'Alyne',
    subtitle: 'Child Care',
    path: '/alyne',
    logo: 'https://customer-assets.emergentagent.com/job_alynehealth/artifacts/llhgc3hn_Blue%20White%20Professional%20Minimal%20Brand%20Logo_20260114_042449_0002.png',
    bgColor: '#0a1628'
  },
  {
    id: 'aanya',
    name: 'Aanya',
    subtitle: 'Newborn',
    path: '/aanya',
    hasIcon: true,
    icon: Star,
    bgColor: '#db2777'
  },
  {
    id: 'reports',
    name: 'Reports',
    subtitle: 'Blood Charts',
    path: '/health-dashboard',
    hasIcon: true,
    icon: FileText,
    bgColor: '#ea580c'
  },
  {
    id: 'healthchart',
    name: 'Health Log',
    subtitle: 'Weight Logs',
    path: '/my-health',
    hasIcon: true,
    icon: BarChart3,
    bgColor: '#059669'
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
      scrollRef.current.scrollBy({ left: -180, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 180, behavior: 'smooth' });
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
    <div className="relative bg-white border-b border-slate-200 sticky top-[60px] z-40 shadow-sm" data-testid="portal-scroll-bar">
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={scrollLeft}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur shadow-lg rounded-full flex items-center justify-center hover:bg-white transition-all border border-slate-200"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
      )}

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={scrollRight}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur shadow-lg rounded-full flex items-center justify-center hover:bg-white transition-all border border-slate-200"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      )}

      {/* Scrollable Container - 2x bigger */}
      <div
        ref={scrollRef}
        className="flex items-center gap-3 px-4 py-3 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {portals.map((portal) => {
          const isActive = activePortal === portal.id;
          const IconComponent = portal.icon;
          
          return (
            <button
              key={portal.id}
              onClick={() => navigate(portal.path)}
              className={`flex-shrink-0 flex flex-col items-center gap-2 px-2 py-2 rounded-2xl transition-all duration-300 min-w-[80px] ${
                isActive 
                  ? 'bg-slate-100 shadow-lg scale-105 ring-2 ring-teal-500' 
                  : 'hover:bg-slate-50 hover:scale-102'
              }`}
              data-testid={`portal-btn-${portal.id}`}
            >
              {/* Logo/Icon Container - 2x bigger (64x64) */}
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shadow-md transition-all duration-300"
                style={{ backgroundColor: portal.bgColor }}
              >
                {portal.hasIcon ? (
                  <IconComponent className="w-8 h-8 text-white" />
                ) : (
                  <img 
                    src={portal.logo} 
                    alt={portal.name}
                    className="w-14 h-14 object-contain"
                    loading="lazy"
                  />
                )}
              </div>
              
              {/* Name */}
              <span className={`text-xs font-semibold leading-tight text-center ${
                isActive ? 'text-teal-600' : 'text-slate-700'
              }`}>
                {portal.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Gradient Fades */}
      {showLeftArrow && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none"></div>
      )}
      {showRightArrow && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
      )}
    </div>
  );
};

export default PortalScrollBar;
