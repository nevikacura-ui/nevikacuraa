import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Portal data - only 4 main portals for quick access
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
  const [activePortal, setActivePortal] = useState(null);

  // Determine active portal based on current path
  useEffect(() => {
    const currentPath = location.pathname;
    const active = portals.find(p => currentPath === p.path || currentPath.startsWith(p.path + '/'));
    setActivePortal(active?.id || null);
  }, [location.pathname]);

  return (
    <div className="relative bg-white/95 backdrop-blur-lg border-b border-slate-200/50 sticky top-[60px] z-40 shadow-sm" data-testid="portal-scroll-bar">
      {/* Scrollable Container - Slightly bigger for better touch targets */}
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        {portals.map((portal) => {
          const isActive = activePortal === portal.id;
          
          return (
            <button
              key={portal.id}
              onClick={() => navigate(portal.path)}
              className={`flex-1 flex flex-col items-center gap-1.5 px-2 py-2 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/25 scale-105' 
                  : 'bg-slate-50 hover:bg-slate-100 hover:scale-102'
              }`}
              data-testid={`portal-btn-${portal.id}`}
            >
              {/* Portal Logo - Bigger */}
              <div 
                className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-300 ${
                  isActive ? 'bg-white/25 shadow-inner' : 'bg-white shadow-sm'
                }`}
              >
                <img 
                  src={portal.logo} 
                  alt={portal.name}
                  className="w-7 h-7 object-contain"
                  loading="lazy"
                />
              </div>
              
              {/* Portal Name */}
              <span className={`text-[11px] font-semibold leading-tight text-center ${
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
