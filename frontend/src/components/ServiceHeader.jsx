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
    isLight: true
  },
  diagyn: {
    name: 'DiaGyn',
    path: '/diagyn',
    bgGradient: 'from-teal-100 via-cyan-100 to-teal-50',
    headerBg: 'bg-gradient-to-r from-teal-600 to-cyan-600',
    isLight: false
  },
  proton: {
    name: 'Proton',
    path: '/proton',
    bgGradient: 'from-blue-100 via-indigo-100 to-blue-50',
    headerBg: 'bg-gradient-to-r from-blue-600 to-indigo-600',
    isLight: false
  },
  pharmacy: {
    name: 'Orange',
    path: '/pharmacy',
    bgGradient: 'from-orange-100 via-amber-100 to-orange-50',
    headerBg: 'bg-gradient-to-r from-orange-500 to-amber-500',
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

  return (
    <header 
      className={`${currentTheme.headerBg} sticky top-0 z-50 ${currentTheme.isLight ? 'shadow-sm' : 'shadow-lg'} transition-all duration-300`}
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
                  className={`rounded-full ${currentTheme.isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-white/20 text-white'}`}
                >
                  <User className="w-4 h-4" />
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

      {/* Row 2 - Service Tabs */}
      <div className={`${currentTheme.isLight ? 'bg-slate-50/50' : 'bg-white/10 backdrop-blur-sm'}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 py-2 overflow-x-auto scrollbar-hide">
            {/* Nevika Cura / Home */}
            <button
              onClick={() => navigate('/')}
              className={`flex-shrink-0 px-4 py-2 rounded-full flex items-center gap-2 transition-all ${
                activeService === 'home' 
                  ? (currentTheme.isLight ? 'bg-teal-500 text-white shadow-lg' : 'bg-white text-teal-600 shadow-lg')
                  : (currentTheme.isLight ? 'bg-white border border-slate-200 text-slate-700 hover:border-teal-300' : 'bg-white/20 text-white hover:bg-white/30')
              }`}
              data-testid="nav-nevikacura"
            >
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${activeService === 'home' ? 'from-white/30 to-white/10' : 'from-teal-500 to-cyan-500'} flex items-center justify-center`}>
                <Heart className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm whitespace-nowrap">Nevika Cura</span>
            </button>
            
            {/* DiaGyn */}
            <button
              onClick={() => navigate('/diagyn')}
              className={`flex-shrink-0 px-4 py-2 rounded-full flex items-center gap-2 transition-all ${
                activeService === 'diagyn' 
                  ? 'bg-white text-teal-600 shadow-lg'
                  : (currentTheme.isLight ? 'bg-white border border-slate-200 text-slate-700 hover:border-teal-300' : 'bg-white/20 text-white hover:bg-white/30')
              }`}
              data-testid="nav-diagyn"
            >
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${activeService === 'diagyn' ? 'from-teal-500 to-cyan-500' : 'from-teal-400 to-cyan-500'} flex items-center justify-center`}>
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm whitespace-nowrap">DiaGyn</span>
            </button>
            
            {/* Proton */}
            <button
              onClick={() => navigate('/proton')}
              className={`flex-shrink-0 px-4 py-2 rounded-full flex items-center gap-2 transition-all ${
                activeService === 'proton' 
                  ? 'bg-white text-blue-600 shadow-lg'
                  : (currentTheme.isLight ? 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300' : 'bg-white/20 text-white hover:bg-white/30')
              }`}
              data-testid="nav-proton"
            >
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${activeService === 'proton' ? 'from-blue-500 to-indigo-500' : 'from-blue-400 to-indigo-500'} flex items-center justify-center`}>
                <FlaskConical className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm whitespace-nowrap">Proton</span>
            </button>
            
            {/* Orange Pharmacy */}
            <button
              onClick={() => navigate('/pharmacy')}
              className={`flex-shrink-0 px-4 py-2 rounded-full flex items-center gap-2 transition-all ${
                activeService === 'pharmacy' 
                  ? 'bg-white text-orange-600 shadow-lg'
                  : (currentTheme.isLight ? 'bg-white border border-slate-200 text-slate-700 hover:border-orange-300' : 'bg-white/20 text-white hover:bg-white/30')
              }`}
              data-testid="nav-orange"
            >
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${activeService === 'pharmacy' ? 'from-orange-500 to-amber-500' : 'from-orange-400 to-amber-500'} flex items-center justify-center`}>
                <Package className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm whitespace-nowrap">Orange</span>
            </button>
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
