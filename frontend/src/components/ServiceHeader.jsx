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
    headerBg: 'bg-white border-b border-slate-200',
    tabBg: 'bg-slate-100',
    activeTabBg: 'bg-white',
    isLight: true
  },
  diagyn: {
    name: 'DiaGyn',
    path: '/diagyn',
    bgGradient: 'from-[#102926] via-[#14332E] to-[#1A3E38]',
    headerBg: 'bg-gradient-to-r from-[#1B3A35] to-[#162F2B]',
    tabBg: 'bg-[#1B3A35]',
    activeTabBg: 'bg-white',
    isLight: false
  },
  proton: {
    name: 'Proton',
    path: '/proton',
    bgGradient: 'from-blue-600 via-blue-700 to-blue-800',
    headerBg: 'bg-gradient-to-r from-blue-500 to-blue-600',
    tabBg: 'bg-blue-500',
    activeTabBg: 'bg-white',
    isLight: false
  },
  pharmacy: {
    name: 'Orange',
    path: '/pharmacy',
    bgGradient: 'from-orange-100 via-amber-100 to-orange-50',
    headerBg: 'bg-gradient-to-r from-orange-500 to-amber-500',
    tabBg: 'bg-orange-500',
    activeTabBg: 'bg-white',
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

  // Tab configuration
  const tabs = [
    { id: 'home', name: 'Nevika Cura', icon: Heart, path: '/', color: 'teal' },
    { id: 'diagyn', name: 'DiaGyn', icon: Stethoscope, path: '/diagyn', color: 'teal' },
    { id: 'proton', name: 'Proton', icon: FlaskConical, path: '/proton', color: 'blue' },
    { id: 'pharmacy', name: 'Orange', icon: Package, path: '/pharmacy', color: 'orange' }
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
      <div className={`border-b ${currentTheme.isLight ? 'border-slate-100' : 'border-white/20'}`}>
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
                  className={`rounded-full flex items-center gap-2 ${currentTheme.isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-white/20 text-white'}`}
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
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end gap-1.5 pt-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const isActive = activeService === tab.id;
              const Icon = tab.icon;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={`
                    relative flex-shrink-0 px-4 py-2.5 flex items-center gap-2 transition-all
                    ${isActive 
                      ? 'bg-white text-slate-800 rounded-t-2xl shadow-sm z-10' 
                      : `${currentTheme.isLight ? 'bg-slate-200/70 text-slate-600' : 'bg-white/20 text-white'} rounded-xl hover:bg-white/30`
                    }
                  `}
                  data-testid={`nav-${tab.id}`}
                  style={isActive ? {
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                  } : {}}
                >
                  {/* Tab icon */}
                  <div className={`
                    w-7 h-7 rounded-lg flex items-center justify-center
                    ${isActive 
                      ? `bg-${tab.color}-500` 
                      : `bg-gradient-to-br from-${tab.color}-400 to-${tab.color}-500`
                    }
                  `}
                  style={isActive ? {
                    backgroundColor: tab.color === 'teal' ? '#14B8A6' : tab.color === 'blue' ? '#3B82F6' : '#F97316'
                  } : {}}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className={`font-semibold text-sm whitespace-nowrap ${isActive ? 'font-bold' : ''}`}>
                    {tab.name}
                  </span>
                  
                  {/* Active tab connector - creates the "page attached" effect */}
                  {isActive && (
                    <>
                      {/* Left curve connector */}
                      <div 
                        className="absolute -bottom-0 -left-3 w-3 h-3 bg-white"
                        style={{
                          borderBottomRightRadius: '12px',
                          boxShadow: '6px 0 0 0 white'
                        }}
                      />
                      <div 
                        className={`absolute -bottom-0 -left-3 w-3 h-3 ${currentTheme.isLight ? 'bg-slate-100' : currentTheme.tabBg}`}
                      />
                      {/* Right curve connector */}
                      <div 
                        className="absolute -bottom-0 -right-3 w-3 h-3 bg-white"
                        style={{
                          borderBottomLeftRadius: '12px',
                          boxShadow: '-6px 0 0 0 white'
                        }}
                      />
                      <div 
                        className={`absolute -bottom-0 -right-3 w-3 h-3 ${currentTheme.isLight ? 'bg-slate-100' : currentTheme.tabBg}`}
                      />
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
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
