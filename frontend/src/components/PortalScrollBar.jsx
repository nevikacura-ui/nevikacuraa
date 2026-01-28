import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Portal data - only 4 main portals
const portals = [
  {
    id: 'diagyn',
    name: 'DiaGyn',
    subtitle: 'Doctor Consult',
    path: '/diagyn',
    logo: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/e4jrn2os_6_20260107_021040_0003.jpg',
    bgColor: '#0d9488'
  },
  {
    id: 'proton',
    name: 'Proton',
    subtitle: 'Lab Tests',
    path: '/proton',
    logo: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/saez5270_5_20260107_021040_0002.jpg',
    bgColor: '#7c3aed'
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    subtitle: 'Medicines',
    path: '/pharmacy',
    logo: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/n45xwyrx_3_20260107_021040_0000.jpg',
    bgColor: '#f97316'
  },
  {
    id: 'evara',
    name: 'Evara',
    subtitle: "Women's Health",
    path: '/evara',
    logo: '/icons/evara-logo.png',
    bgColor: '#511b63'
  }
];

const PortalScrollBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef(null);
  const [activePortal, setActivePortal] = useState(null);

  // Determine active portal based on current path
  useEffect(() => {
    const currentPath = location.pathname;
    const active = portals.find(p => currentPath === p.path || currentPath.startsWith(p.path + '/'));
    setActivePortal(active?.id || null);
  }, [location.pathname]);

  return (
    <div className="relative bg-white/90 backdrop-blur-lg border-b border-slate-100 sticky top-[72px] z-40" data-testid="portal-scroll-bar">
      {/* Scrollable Container - Simple horizontal layout */}
      <div
        ref={scrollRef}
        className="flex items-center justify-center gap-3 px-4 py-2.5"
      >
        {portals.map((portal) => {
          const isActive = activePortal === portal.id;
          
          return (
            <button
              key={portal.id}
              onClick={() => navigate(portal.path)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/20' 
                  : 'bg-slate-50 hover:bg-slate-100'
              }`}
              data-testid={`portal-btn-${portal.id}`}
            >
              {/* Portal Logo */}
              <div 
                className={`w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden ${
                  isActive ? 'bg-white/20' : ''
                }`}
                style={{ backgroundColor: isActive ? 'transparent' : portal.bgColor + '15' }}
              >
                <img 
                  src={portal.logo} 
                  alt={portal.name}
                  className="w-5 h-5 object-contain"
                  loading="lazy"
                />
              </div>
              
              {/* Portal Name */}
              <span className={`text-xs font-semibold whitespace-nowrap ${
                isActive ? 'text-white' : 'text-slate-700'
              }`}>
                {portal.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PortalScrollBar;
