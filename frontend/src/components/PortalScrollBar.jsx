import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star, FileText, BarChart3 } from 'lucide-react';

// Portal data with original logos - Health & Wellness focused
const portals = [
  {
    id: 'evara',
    name: 'Evara',
    path: '/evara',
    logo: '/icons/evara-logo.png',
    bgColor: '#511b63'
  },
  {
    id: 'glydex',
    name: 'Glydex',
    path: '/glydex',
    logo: 'https://customer-assets.emergentagent.com/job_healthhelper-7/artifacts/u2dcjapg_file_00000000c85c7209b181fb96372c6521.png',
    bgColor: '#121f33'
  },
  {
    id: 'thrive360',
    name: 'Thrive360',
    path: '/thrive360',
    logo: 'https://customer-assets.emergentagent.com/job_healspace-26/artifacts/iijsipxg_file_00000000290072089f3c35fe8c1b2b05.png',
    bgColor: '#1e1b4b'
  },
  {
    id: 'alyne',
    name: 'Alyne',
    path: '/alyne',
    logo: 'https://customer-assets.emergentagent.com/job_alynehealth/artifacts/llhgc3hn_Blue%20White%20Professional%20Minimal%20Brand%20Logo_20260114_042449_0002.png',
    bgColor: '#0a1628'
  },
  {
    id: 'aanya',
    name: 'Aanya',
    path: '/aanya',
    hasIcon: true,
    icon: Star,
    bgColor: '#db2777'
  },
  {
    id: 'reports',
    name: 'Reports',
    path: '/health-dashboard',
    hasIcon: true,
    icon: FileText,
    bgColor: '#ea580c'
  },
  {
    id: 'healthchart',
    name: 'Health Log',
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
    <div className="relative bg-[#F5F5F4] border-b border-slate-200/50 sticky top-[60px] z-40" data-testid="portal-scroll-bar">
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={scrollLeft}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/80 backdrop-blur shadow-md rounded-full flex items-center justify-center hover:bg-white transition-all"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
      )}

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={scrollRight}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/80 backdrop-blur shadow-md rounded-full flex items-center justify-center hover:bg-white transition-all"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      )}

      {/* Scrollable Container - Reduced by 0.2x (52x52 icons) */}
      <div
        ref={scrollRef}
        className="flex items-center gap-3 px-4 py-2.5 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {portals.map((portal) => {
          const isActive = activePortal === portal.id;
          const IconComponent = portal.icon;
          
          return (
            <button
              key={portal.id}
              onClick={() => navigate(portal.path)}
              className={`flex-shrink-0 transition-all duration-300 ${
                isActive 
                  ? 'scale-110 ring-2 ring-teal-500 ring-offset-2 ring-offset-[#F5F5F4]' 
                  : 'hover:scale-105'
              }`}
              data-testid={`portal-btn-${portal.id}`}
              title={portal.name}
            >
              {/* Logo/Icon Container - 52x52 (reduced by 0.2x from 64) */}
              <div 
                className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300"
                style={{ backgroundColor: portal.bgColor }}
              >
                {portal.hasIcon ? (
                  <IconComponent className="w-6 h-6 text-white" />
                ) : (
                  <img 
                    src={portal.logo} 
                    alt={portal.name}
                    className="w-11 h-11 object-contain"
                    loading="lazy"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Gradient Fades */}
      {showLeftArrow && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#F5F5F4] to-transparent pointer-events-none"></div>
      )}
      {showRightArrow && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#F5F5F4] to-transparent pointer-events-none"></div>
      )}
    </div>
  );
};

export default PortalScrollBar;
