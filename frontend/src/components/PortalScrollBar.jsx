import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FileText, BarChart3 } from 'lucide-react';

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
    name: 'Alyne Kids',
    path: '/alyne',
    logo: 'https://customer-assets.emergentagent.com/job_nevika-health-7/artifacts/d1163tpj_Screenshot_20260128-154605.png',
    bgColor: '#e8f5e9',
    fillContainer: true
  },
  {
    id: 'aanya',
    name: 'Aanya Newborn',
    path: '/aanya',
    logo: 'https://customer-assets.emergentagent.com/job_nevika-health-7/artifacts/or3lea1i_Screenshot_20260128-154553.png',
    bgColor: '#fce4ec',
    fillContainer: true
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
      handleScroll();
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="relative bg-[#F5F5F4] border-b border-slate-200/50 sticky top-[60px] z-40" data-testid="portal-scroll-bar">
      {/* Left Arrow - Positioned outside scroll area */}
      {showLeftArrow && (
        <button
          onClick={scrollLeft}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-200"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
      )}

      {/* Right Arrow - Positioned outside scroll area */}
      {showRightArrow && (
        <button
          onClick={scrollRight}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-200"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      )}

      {/* Scrollable Container - Extra padding to prevent arrow overlap */}
      <div
        ref={scrollRef}
        className="flex items-center gap-3 px-12 py-3 overflow-x-auto scroll-smooth"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
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
                  ? 'scale-105 ring-2 ring-teal-500 ring-offset-2 ring-offset-[#F5F5F4] rounded-2xl' 
                  : 'hover:scale-105'
              }`}
              data-testid={`portal-btn-${portal.id}`}
              title={portal.name}
            >
              {/* Logo/Icon Container - 80x80 with larger logos inside */}
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300"
                style={{ backgroundColor: portal.bgColor }}
              >
                {portal.hasIcon ? (
                  <IconComponent className="w-10 h-10 text-white" />
                ) : portal.fillContainer ? (
                  <img 
                    src={portal.logo} 
                    alt={portal.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <img 
                    src={portal.logo} 
                    alt={portal.name}
                    className="w-[72px] h-[72px] object-contain"
                    loading="lazy"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Gradient Fades - Wider to match arrow positions */}
      {showLeftArrow && (
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#F5F5F4] to-transparent pointer-events-none z-10"></div>
      )}
      {showRightArrow && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#F5F5F4] to-transparent pointer-events-none z-10"></div>
      )}

      {/* Hide scrollbar */}
      <style>{`
        [data-testid="portal-scroll-bar"] > div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default PortalScrollBar;
