import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Portal data with colors matching their brand identity
const portals = [
  {
    id: 'diagyn',
    name: 'DiaGyn',
    subtitle: 'Doctor Consult',
    path: '/diagyn',
    logo: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/e4jrn2os_6_20260107_021040_0003.jpg',
    bgColor: '#0d9488',
    textColor: '#ffffff'
  },
  {
    id: 'proton',
    name: 'Proton',
    subtitle: 'Lab Tests',
    path: '/proton',
    logo: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/saez5270_5_20260107_021040_0002.jpg',
    bgColor: '#7c3aed',
    textColor: '#ffffff'
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    subtitle: 'Medicines',
    path: '/pharmacy',
    logo: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/n45xwyrx_3_20260107_021040_0000.jpg',
    bgColor: '#f97316',
    textColor: '#ffffff'
  },
  {
    id: 'evara',
    name: 'Evara',
    subtitle: "Women's Health",
    path: '/evara',
    logo: '/icons/evara-logo.png',
    bgColor: '#511b63',
    textColor: '#ffffff'
  },
  {
    id: 'glydex',
    name: 'Glydex',
    subtitle: 'Diabetes Care',
    path: '/glydex',
    logo: 'https://customer-assets.emergentagent.com/job_healthhelper-7/artifacts/u2dcjapg_file_00000000c85c7209b181fb96372c6521.png',
    bgColor: '#121f33',
    textColor: '#ffffff'
  },
  {
    id: 'alyne',
    name: 'ALYNE',
    subtitle: 'Kids Health',
    path: '/alyne',
    logo: 'https://customer-assets.emergentagent.com/job_alynehealth/artifacts/llhgc3hn_Blue%20White%20Professional%20Minimal%20Brand%20Logo_20260114_042449_0002.png',
    bgColor: '#0a1628',
    textColor: '#ffffff'
  },
  {
    id: 'thrive360',
    name: 'Thrive360',
    subtitle: 'Wellness',
    path: '/thrive360',
    logo: 'https://customer-assets.emergentagent.com/job_healspace-26/artifacts/iijsipxg_file_00000000290072089f3c35fe8c1b2b05.png',
    bgColor: '#1e1b4b',
    textColor: '#ffffff'
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

  // Scroll functions
  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial check
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="relative bg-white/80 backdrop-blur-lg border-b border-slate-100 sticky top-[72px] z-40" data-testid="portal-scroll-bar">
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center hover:bg-white transition-all"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
      )}

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center hover:bg-white transition-all"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {portals.map((portal) => {
          const isActive = activePortal === portal.id;
          
          return (
            <button
              key={portal.id}
              onClick={() => navigate(portal.path)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/30 scale-105' 
                  : 'bg-slate-50 hover:bg-slate-100 hover:scale-102'
              }`}
              data-testid={`portal-btn-${portal.id}`}
            >
              {/* Portal Logo */}
              <div 
                className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden ${
                  isActive ? 'bg-white/20' : ''
                }`}
                style={{ backgroundColor: isActive ? 'transparent' : portal.bgColor + '15' }}
              >
                <img 
                  src={portal.logo} 
                  alt={portal.name}
                  className="w-6 h-6 object-contain"
                  loading="lazy"
                />
              </div>
              
              {/* Portal Name & Subtitle */}
              <div className="text-left">
                <p className={`text-xs font-bold leading-tight ${
                  isActive ? 'text-white' : 'text-slate-800'
                }`}>
                  {portal.name}
                </p>
                <p className={`text-[10px] leading-tight ${
                  isActive ? 'text-white/80' : 'text-slate-500'
                }`}>
                  {portal.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Gradient Fades */}
      {showLeftArrow && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/90 to-transparent pointer-events-none"></div>
      )}
      {showRightArrow && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/90 to-transparent pointer-events-none"></div>
      )}
    </div>
  );
};

export default PortalScrollBar;
