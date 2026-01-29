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
  // 3. Serena - Mental Health & Meditation (formerly Thrive Mind)
  {
    id: 'serena',
    name: 'Serena',
    subtitle: 'Mental Wellness',
    path: '/serena',
    logo: 'https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/9lxbdskl_90.png',
    bgColor: '#1a2e35',
    fillContainer: true,
    tagline: 'Find Your Calm.'
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
  // 6. Corvia - Heart, Hypertension & Cholesterol (formerly Cardyra)
  {
    id: 'corvia',
    name: 'Corvia',
    subtitle: 'Heart & BP Care',
    path: '/corvia',
    logo: 'https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/p3zt5ovj_Pink%20Simple%20Charity%20Logo_20260128_183244_0000.png',
    bgColor: '#c8f56a',
    fillContainer: true,
    tagline: 'Healthy Heart & Prevention.'
  },
  // 7. Reneu - Preventive & Lifestyle Medicine (formerly Vireya)
  {
    id: 'reneu',
    name: 'Reneu',
    subtitle: 'Preventive Health',
    path: '/reneu',
    logo: 'https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/uy8wpc27_file_00000000caf871fdae54ae4c4854bbd4.png',
    bgColor: '#f5f5f5',
    fillContainer: true,
    containLogo: true,
    needsBorder: true,
    tagline: 'Renew Health, Stay Ahead.'
  },
  // 8. Thrive360 - Fitness Portal (formerly FitLife)
  {
    id: 'thrive360',
    name: 'Thrive360',
    subtitle: 'Mind. Body. Life.',
    path: '/thrive360',
    logo: 'https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/qb3buukl_91.png',
    bgColor: '#1a1a3e',
    fillContainer: true,
    tagline: 'Mind. Body. Life.'
  },
  // 9. Senova - Senior Care (formerly Nivara)
  {
    id: 'senova',
    name: 'Senova',
    subtitle: 'Senior Care',
    path: '/senova',
    logo: 'https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/nz0rdwvp_file_000000000dfc7230a4605006a1e3131a.png',
    bgColor: '#f0f4f8',
    fillContainer: true,
    tagline: "Care for Life's Next Chapter."
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
    logo: 'https://customer-assets.emergentagent.com/job_medportal-nevika/artifacts/gg3hluvl_Screenshot_20260129-011553%20%281%29.png',
    bgColor: '#ffffff',
    fillContainer: true,
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
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Determine active portal based on current path
  useEffect(() => {
    const currentPath = location.pathname;
    const active = portals.find(p => currentPath === p.path || currentPath.startsWith(p.path + '/'));
    setActivePortal(active?.id || null);
  }, [location.pathname]);

  // Handle page scroll to hide/show portal bar - OPTIMIZED with RAF
  useEffect(() => {
    let ticking = false;
    
    const handlePageScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          // Show bar when scrolling up or near top
          if (currentScrollY < 100 || currentScrollY < lastScrollY.current) {
            setIsVisible(true);
          } else if (currentScrollY > lastScrollY.current && currentScrollY > 150) {
            // Hide bar when scrolling down
            setIsVisible(false);
          }
          
          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handlePageScroll, { passive: true });
    return () => window.removeEventListener('scroll', handlePageScroll);
  }, []);

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
    <div 
      className="relative bg-[#F5F5F4] border-b border-slate-200/50 sticky top-[60px] z-40 overflow-hidden"
      style={{ 
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        opacity: isVisible ? 1 : 0,
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-out',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        perspective: 1000,
        WebkitPerspective: 1000
      }}
      data-testid="portal-scroll-bar"
    >
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={scrollLeft}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-200"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6 text-slate-600" />
        </button>
      )}

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={scrollRight}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-200"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6 text-slate-600" />
        </button>
      )}

      {/* Scrollable Container - 4 on mobile, 12 on desktop */}
      <div
        ref={scrollRef}
        className="flex items-center lg:justify-center gap-3 sm:gap-3 md:gap-2 lg:gap-3 xl:gap-4 px-2 md:px-4 py-4 overflow-x-auto scroll-smooth"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth'
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
                  : 'hover:scale-110 hover:shadow-2xl'
              }`}
              data-testid={`portal-btn-${portal.id}`}
              title={portal.name}
            >
              {/* Logo/Icon Container - Mobile: 4 icons visible (~82px), Desktop: all 12 fit */}
              <div 
                className={`w-[82px] h-[82px] sm:w-[88px] sm:h-[88px] md:w-[95px] md:h-[95px] lg:w-[108px] lg:h-[108px] xl:w-[120px] xl:h-[120px] 2xl:w-[135px] 2xl:h-[135px] rounded-2xl flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300 ${
                  portal.needsBorder ? 'border-2 border-gray-200' : ''
                }`}
                style={portal.useGradient ? { background: portal.bgColor } : { backgroundColor: portal.bgColor }}
              >
                {portal.hasIcon ? (
                  <IconComponent className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 text-white" />
                ) : portal.fillContainer ? (
                  <img 
                    src={portal.logo} 
                    alt={portal.name}
                    className={`${portal.containLogo ? 'w-full h-full object-contain p-2' : 'w-full h-full object-cover'}`}
                    style={portal.scale ? { transform: `scale(${portal.scale})` } : {}}
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
