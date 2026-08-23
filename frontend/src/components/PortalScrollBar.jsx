import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, FileText, BarChart3, Heart, Activity, 
  Brain, Baby, Smile, HeartPulse, Shield, Dumbbell, Users, HandHeart, Calendar
} from 'lucide-react';

// Portal data - Core Services + 4 Portals + 2 Special Features
const portals = [
  // Core Services
  {
    id: 'diagyn',
    name: 'DiaGyn',
    subtitle: 'Healthcare',
    path: '/diagyn',
    logo: 'https://customer-assets.emergentagent.com/job_9e8d9b3c-7dc9-4711-89c9-8c62a2076713/artifacts/bng70qyp_Green%20and%20Blue%20Cross%20Medical%20Consultation%20Logo_20260220_182331_0002.png',
    bgColor: '#f5f5f5',
    fillContainer: true,
    containLogo: true
  },
  {
    id: 'nevika-labs',
    name: 'Mango',
    subtitle: 'Health Labs',
    path: '/mango',
    logo: 'https://customer-assets.emergentagent.com/job_9e8d9b3c-7dc9-4711-89c9-8c62a2076713/artifacts/ed8oc0g0_file_00000000e87072088292092d9333f740%20%281%29.png',
    bgColor: '#f5f5f5',
    fillContainer: true,
    containLogo: true
  },
  {
    id: 'proton-diagnostics',
    name: 'Proton',
    subtitle: 'Diagnostics',
    path: '/mango/ultrasound',
    logo: 'https://customer-assets.emergentagent.com/job_0057b5ba-9311-4e6b-8f3c-1683dcbd0649/artifacts/p8vk4fal_file_000000002ab872088062c5eefaa511b9.png',
    bgColor: '#e8eef6',
    fillContainer: true,
    containLogo: false
  },
  {
    id: 'nexugene',
    name: 'Nexugene',
    subtitle: 'Genetic Testing',
    path: '/nexugene',
    logo: 'https://customer-assets.emergentagent.com/job_0057b5ba-9311-4e6b-8f3c-1683dcbd0649/artifacts/w5y7zt1o_file_000000009420720880d6c2f519c3d746.png',
    bgColor: '#0c0a2a',
    fillContainer: true,
    containLogo: false
  },
  {
    id: 'orange-healthplus',
    name: 'Orange',
    subtitle: 'HealthPlus',
    path: '/nutricare',
    logo: 'https://customer-assets.emergentagent.com/job_9e8d9b3c-7dc9-4711-89c9-8c62a2076713/artifacts/ggkh90wn_1068-removebg-preview.png',
    bgColor: '#1a1a2e',
    fillContainer: true,
    containLogo: true
  },
  {
    id: 'pharmacy',
    name: 'Orange',
    subtitle: 'Pharmacy',
    path: '/pharmacy',
    logo: 'https://customer-assets.emergentagent.com/job_9e8d9b3c-7dc9-4711-89c9-8c62a2076713/artifacts/lr4uhupz_file_000000009974720b9b0298afaa32caf8%20%281%29.png',
    bgColor: '#f5f5f5',
    fillContainer: true,
    containLogo: true
  },
  // 4 Core Portals
  {
    id: 'evara',
    name: 'Evara',
    subtitle: "Women's Health",
    path: '/evara',
    logo: '/icons/evara-logo.png',
    bgColor: '#6b2f82',
    fillContainer: true
  },
  {
    id: 'glydex',
    name: 'Glydex',
    subtitle: 'Diabetes Care',
    path: '/glydex',
    logo: 'https://customer-assets.emergentagent.com/job_healthhelper-7/artifacts/u2dcjapg_file_00000000c85c7209b181fb96372c6521.png',
    bgColor: '#1e3a5f',
    fillContainer: true,
    scale: 1.3
  },
  {
    id: 'reneu',
    name: 'Reneu',
    subtitle: 'Wellness & Fitness',
    path: '/reneu',
    logo: 'https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/uy8wpc27_file_00000000caf871fdae54ae4c4854bbd4.png',
    bgColor: '#f5f5f5',
    fillContainer: true,
    containLogo: true,
    needsBorder: true
  },
  {
    id: 'alyne',
    name: 'ALYNE',
    subtitle: 'Kids Health',
    path: '/alyne',
    logo: 'https://customer-assets.emergentagent.com/job_alynehealth/artifacts/llhgc3hn_Blue%20White%20Professional%20Minimal%20Brand%20Logo_20260114_042449_0002.png',
    bgColor: '#162d4a',
    fillContainer: true,
    scale: 1.3
  },
  // Special Features - accessible via footer only
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
      className="relative z-40 overflow-hidden"
      style={{ 
        background: 'linear-gradient(180deg, #0f172a 0%, #0A0A0F 100%)',
        willChange: 'auto',
      }}
      data-testid="portal-scroll-bar"
    >
      {/* "Our Brands" Label */}
      <div className="px-4 pt-4 pb-1 flex items-center gap-2">
        <h3 className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Our Brands</h3>
        <div className="flex-1 h-px bg-white/8"></div>
        <span className="text-[10px] text-white font-medium tracking-wide">A Nevika Cura Company</span>
      </div>
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={scrollLeft}
          className="absolute left-1 top-1/2 z-20 w-8 h-8 bg-white/10 backdrop-blur-md shadow-lg rounded-full flex items-center justify-center hover:bg-white/20 border border-white/10"
          style={{ transform: 'translateY(-50%) translateZ(0)' }}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
      )}

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={scrollRight}
          className="absolute right-1 top-1/2 z-20 w-8 h-8 bg-white/10 backdrop-blur-md shadow-lg rounded-full flex items-center justify-center hover:bg-white/20 border border-white/10"
          style={{ transform: 'translateY(-50%) translateZ(0)' }}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex items-start lg:justify-center gap-5 px-4 py-4 overflow-x-auto"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
          scrollSnapType: 'x mandatory',
        }}
      >
        {portals.map((portal) => {
          const isActive = activePortal === portal.id;
          
          return (
            <button
              key={portal.id}
              onClick={() => navigate(portal.path)}
              className="flex-shrink-0 flex flex-col items-center gap-2 group"
              style={{ scrollSnapAlign: 'start' }}
              data-testid={`portal-btn-${portal.id}`}
              title={portal.name}
            >
              {/* Logo Container with ring effect */}
              <div 
                className={`w-[72px] h-[72px] sm:w-[76px] sm:h-[76px] md:w-[84px] md:h-[84px] lg:w-[92px] lg:h-[92px] rounded-2xl flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl ${
                  portal.needsBorder ? 'border-2 border-gray-200' : ''
                } ${isActive ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-[#0A0A0F]' : 'ring-1 ring-white/10'}`}
                style={{
                  backgroundColor: portal.bgColor,
                }}
              >
                {portal.fillContainer ? (
                  <img 
                    src={portal.logo} 
                    alt={portal.name}
                    className={`${portal.containLogo ? 'w-full h-full object-contain p-1' : 'w-full h-full object-cover'}`}
                    style={portal.scale ? { transform: `scale(${portal.scale})` } : { transform: 'scale(1.15)' }}
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
              {/* Label */}
            </button>
          );
        })}
      </div>

      {/* Gradient Fades */}
      {showLeftArrow && (
        <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[#0f172a] to-transparent pointer-events-none z-10"></div>
      )}
      {showRightArrow && (
        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#0A0A0F] to-transparent pointer-events-none z-10"></div>
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
