import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, Stethoscope, FlaskConical, Package, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

// Service theme configurations
const serviceThemes = {
  home: {
    name: 'Nevika Cura',
    path: '/',
    bgGradient: 'from-white via-slate-50 to-white',
    headerBg: 'bg-slate-100',
    tabBg: 'bg-slate-200/80',
    isLight: true
  },
  diagyn: {
    name: 'DiaGyn',
    path: '/diagyn',
    bgGradient: 'from-[#102926] via-[#14332E] to-[#1A3E38]',
    headerBg: 'bg-[#1B3A35]',
    tabBg: 'bg-[#14332E]',
    isLight: false
  },
  proton: {
    name: 'Proton',
    path: '/proton',
    bgGradient: 'from-[#0c1e3c] to-[#1a365d]',
    headerBg: 'bg-[#0c1e3c]',
    tabBg: 'bg-[#1a365d]/50',
    isLight: false
  },
  pharmacy: {
    name: 'Orange',
    path: '/pharmacy',
    bgGradient: 'from-orange-100 via-amber-100 to-orange-50',
    headerBg: 'bg-orange-500',
    tabBg: 'bg-orange-600/50',
    isLight: false
  }
};

// Get active service from path
const getActiveService = (pathname) => {
  if (pathname.startsWith('/diagyn')) return 'diagyn';
  if (pathname.startsWith('/proton')) return 'proton';
  if (pathname.startsWith('/pharmacy')) return 'pharmacy';
  return 'home';
};

export const ServiceHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const activeService = getActiveService(location.pathname);
  const currentTheme = serviceThemes[activeService];

  // Tab configuration - distinct colors for each service
  const tabs = [
    { id: 'home', name: 'Nevika Cura', icon: Heart, path: '/', color: '#14B8A6' },      // Teal
    { id: 'diagyn', name: 'DiaGyn', icon: Stethoscope, path: '/diagyn', color: '#134E4A' }, // Dark Teal/Emerald
    { id: 'proton', name: 'Proton', icon: FlaskConical, path: '/proton', color: '#3B82F6' }, // Blue
    { id: 'pharmacy', name: 'Orange', icon: Package, path: '/pharmacy', color: '#F97316' }  // Orange
  ];

  return (
    <header 
      className={`${currentTheme.headerBg} sticky top-0 z-50 transition-all duration-300`}
      style={{
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden'
      }}
    >
      {/* Top Row - Logo + Actions */}
      <div className={`border-b ${currentTheme.isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <img 
              src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
              alt="Nevika Cura" 
              className={`h-10 sm:h-12 w-auto object-contain cursor-pointer ${currentTheme.isLight ? '' : 'bg-white rounded-lg p-1'}`}
              onClick={() => navigate('/')}
              data-testid="main-logo"
            />
            
            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/staff')}
                data-testid="staff-portal-btn"
                className={`hidden sm:flex text-xs font-medium rounded-full ${
                  currentTheme.isLight 
                    ? 'text-slate-600 hover:text-teal-600 hover:bg-teal-50' 
                    : 'text-white/90 hover:text-white hover:bg-white/20'
                }`}
              >
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Staff Portal
              </Button>
              {user ? (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/profile')}
                  data-testid="profile-button"
                  className={`rounded-full flex items-center gap-2 ${currentTheme.isLight ? 'hover:bg-slate-200 text-slate-800' : 'hover:bg-white/20 text-white'}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${currentTheme.isLight ? 'bg-teal-100' : 'bg-white/20'}`}>
                    <User className="w-4 h-4" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                    {user.name || user.email?.split('@')[0] || 'Profile'}
                  </span>
                </Button>
              ) : (
                <Button 
                  size="sm"
                  onClick={() => navigate('/login')} 
                  data-testid="login-button"
                  className={`rounded-full text-xs px-4 ${
                    currentTheme.isLight 
                      ? 'bg-teal-500 hover:bg-teal-600 text-white' 
                      : 'bg-white hover:bg-white/90 text-slate-800'
                  }`}
                >
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 - Service Tabs (Zepto-style with page attachment) */}
      <div className="relative pb-0">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end gap-2 pt-3 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const isActive = activeService === tab.id;
              const Icon = tab.icon;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={`
                    relative flex-shrink-0 px-5 py-3 flex items-center gap-2.5 transition-all duration-200
                    ${isActive 
                      ? 'bg-white text-slate-800 rounded-t-2xl' 
                      : `${currentTheme.tabBg} ${currentTheme.isLight ? 'text-slate-600' : 'text-white'} rounded-2xl hover:opacity-90`
                    }
                  `}
                  data-testid={`nav-${tab.id}`}
                >
                  {/* Tab icon */}
                  <div 
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: tab.color }}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className={`font-semibold text-sm whitespace-nowrap ${isActive ? 'font-bold text-slate-800' : ''}`}>
                    {tab.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* White bar that connects active tab to page content */}
        <div className="h-1 bg-white" />
      </div>
    </header>
  );
};

// Export theme getter for pages to use
export const getServiceTheme = (pathname) => {
  const service = getActiveService(pathname);
  return serviceThemes[service];
};

export default ServiceHeader;
