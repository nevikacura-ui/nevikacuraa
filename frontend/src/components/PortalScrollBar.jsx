import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, FileText, BarChart3, Heart, Activity, 
  Brain, Baby, Smile, HeartPulse, Shield, Dumbbell, Users, HandHeart
} from 'lucide-react';

// Portal data - 12 Health & Wellness Portals
const portals = [
  // 1. Evara - Women's Health
  {
    id: 'evara',
    name: 'Evara',
    subtitle: "Women's Health",
    path: '/evara',
    logo: '/icons/evara-logo.png',
    bgColor: '#511b63'
  },
  // 2. Glydex - Diabetes Care
  {
    id: 'glydex',
    name: 'Glydex',
    subtitle: 'Diabetes Care',
    path: '/glydex',
    logo: 'https://customer-assets.emergentagent.com/job_healthhelper-7/artifacts/u2dcjapg_file_00000000c85c7209b181fb96372c6521.png',
    bgColor: '#121f33'
  },
  // 3. Thrive Mind - Mental Health (replacing Thrive360)
  {
    id: 'thrivemind',
    name: 'Thrive Mind',
    subtitle: 'Mental Wellness',
    path: '/thrive-mind',
    hasIcon: true,
    icon: Brain,
    bgColor: '#6366f1',
    tagline: 'Strong Minds. Balanced Lives.'
  },
  // 4. Aanya Newborn
  {
    id: 'aanya',
    name: 'Aanya',
    subtitle: 'Newborn Care',
    path: '/aanya',
    logo: 'https://customer-assets.emergentagent.com/job_nevika-health-7/artifacts/or3lea1i_Screenshot_20260128-154553.png',
    bgColor: '#fce4ec',
    fillContainer: true
  },
  // 5. Alyne Kids - Child Care
  {
    id: 'alyne',
    name: 'Alyne Kids',
    subtitle: 'Child Care',
    path: '/alyne',
    logo: 'https://customer-assets.emergentagent.com/job_nevika-health-7/artifacts/d1163tpj_Screenshot_20260128-154605.png',
    bgColor: '#e8f5e9',
    fillContainer: true
  },
  // 6. Cardyra - Heart, BP & Cardiac Risk
  {
    id: 'cardyra',
    name: 'Cardyra',
    subtitle: 'Heart & BP Care',
    path: '/cardyra',
    hasIcon: true,
    icon: HeartPulse,
    bgColor: '#dc2626',
    tagline: 'Strong Hearts. Longer Lives.'
  },
  // 7. Vireya - Preventive & Lifestyle Medicine
  {
    id: 'vireya',
    name: 'Vireya',
    subtitle: 'Preventive Health',
    path: '/vireya',
    hasIcon: true,
    icon: Shield,
    bgColor: '#059669',
    tagline: 'Prevent. Protect. Prosper.'
  },
  // 8. FitLife - Physical Health, Yoga & Physio
  {
    id: 'fitlife',
    name: 'FitLife',
    subtitle: 'Physical Health',
    path: '/fitlife',
    hasIcon: true,
    icon: Dumbbell,
    bgColor: '#f97316',
    tagline: 'Move. Strengthen. Thrive.'
  },
  // 9. Nivara - Senior Care
  {
    id: 'nivara',
    name: 'Nivara',
    subtitle: 'Senior Care',
    path: '/nivara',
    hasIcon: true,
    icon: Users,
    bgColor: '#0891b2',
    tagline: 'Comfort. Care. Dignity.'
  },
  // 10. Reports - Blood Charts
  {
    id: 'reports',
    name: 'Reports',
    subtitle: 'Blood Charts',
    path: '/health-dashboard',
    hasIcon: true,
    icon: FileText,
    bgColor: '#ea580c'
  },
  // 11. Health Log - Weight & Logs
  {
    id: 'healthchart',
    name: 'Health Log',
    subtitle: 'Weight & Logs',
    path: '/my-health',
    hasIcon: true,
    icon: BarChart3,
    bgColor: '#16a34a'
  },
  // 12. PSVN Foundation
  {
    id: 'psvn',
    name: 'PSVN',
    subtitle: 'Foundation',
    path: '/psvn-foundation',
    hasIcon: true,
    icon: HandHeart,
    bgColor: '#7c3aed',
    tagline: 'Care. Compassion. Community.'
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
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={scrollLeft}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-200"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
      )}

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={scrollRight}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-200"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      )}

      {/* Scrollable Container - 12 portals */}
      <div
        ref={scrollRef}
        className="flex items-center gap-3 px-4 py-3 overflow-x-auto scroll-smooth"
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
                  ? 'scale-105 ring-3 ring-teal-500 ring-offset-2 ring-offset-[#F5F5F4] rounded-2xl' 
                  : 'hover:scale-105 hover:shadow-xl'
              }`}
              data-testid={`portal-btn-${portal.id}`}
              title={portal.name}
            >
              {/* Logo/Icon Container - 72x72 for 12 to fit better */}
              <div 
                className="w-[72px] h-[72px] md:w-[76px] md:h-[76px] rounded-2xl flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300"
                style={{ backgroundColor: portal.bgColor }}
              >
                {portal.hasIcon ? (
                  <IconComponent className="w-9 h-9 text-white" />
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
                    className="w-full h-full object-contain p-1"
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
