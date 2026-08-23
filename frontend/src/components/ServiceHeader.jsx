import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, Stethoscope, FlaskConical, Package, Shield, User, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFestivalTheme } from '@/components/FestivalBanner';
import { useThemeLanguage } from '@/context/ThemeLanguageContext';
import { selectionTap } from '@/utils/haptics';
import NotificationBell from '@/components/NotificationBell';

const serviceThemes = {
  home: {
    name: 'Nevika Cura',
    path: '/',
    headerBg: 'bg-slate-900',
    pageBg: '#0f172a',
    accentColor: '#0D9488',
  },
  diagyn: {
    name: 'Nevika Consult',
    path: '/diagyn',
    headerBg: 'bg-[#0D0D0D]',
    pageBg: '#0D0D0D',
    accentColor: '#3B82F6',
  },
  mango: {
    name: 'Nevika Labs',
    path: '/labs',
    headerBg: 'bg-[#0A0A0A]',
    pageBg: '#0A0A0A',
    accentColor: '#C8F56A',
  },
  orange: {
    name: 'Nevika Pharmacy',
    path: '/orange',
    headerBg: 'bg-[#0a0a0a]',
    pageBg: '#0a0a0a',
    accentColor: '#f97316',
  }
};

const getActiveService = (pathname) => {
  if (pathname.startsWith('/diagyn')) return 'diagyn';
  if (pathname.startsWith('/mango') || pathname.startsWith('/labs') || pathname.startsWith('/nexugene') || pathname.startsWith('/proton')) return 'mango';
  if (pathname.startsWith('/orange') || pathname.startsWith('/pharmacy') || pathname.startsWith('/nutricare')) return 'orange';
  return 'home';
};

// Colorful gradient tabs — each has a vivid gradient + matching page bg
const tabs = [
  {
    id: 'home',
    label: 'Cura',
    prefix: 'Nevika',
    icon: Heart,
    path: '/',
    activeGradient: 'linear-gradient(180deg, #7C3AED 0%, #4C1D95 40%, #050510 100%)',
    inactiveGradient: 'linear-gradient(180deg, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0.03) 100%)',
    iconColor: '#A78BFA',
    pageBg: '#050510',
    fillIcon: true,
    lightActiveGradient: 'linear-gradient(180deg, #7C3AED 0%, #6D28D9 40%, #FFF8F0 100%)',
    lightInactiveGradient: 'linear-gradient(180deg, rgba(124,58,237,0.04) 0%, rgba(255,248,240,0.5) 100%)',
  },
  {
    id: 'diagyn',
    label: 'Consult',
    prefix: 'Nevika',
    icon: Stethoscope,
    path: '/diagyn',
    activeGradient: 'linear-gradient(180deg, #0E7490 0%, #164E63 40%, #0D0D0D 100%)',
    inactiveGradient: 'linear-gradient(180deg, rgba(14,116,144,0.12) 0%, rgba(14,116,144,0.03) 100%)',
    iconColor: '#22D3EE',
    pageBg: '#0D0D0D',
    lightActiveGradient: 'linear-gradient(180deg, #0E7490 0%, #0891B2 40%, #FFF8F0 100%)',
    lightInactiveGradient: 'linear-gradient(180deg, rgba(14,116,144,0.04) 0%, rgba(255,248,240,0.5) 100%)',
  },
  {
    id: 'mango',
    label: 'Labs',
    prefix: 'Nevika',
    icon: FlaskConical,
    path: '/labs',
    activeGradient: 'linear-gradient(180deg, #15803D 0%, #14532D 40%, #0A0A0A 100%)',
    inactiveGradient: 'linear-gradient(180deg, rgba(21,128,61,0.12) 0%, rgba(21,128,61,0.03) 100%)',
    iconColor: '#4ADE80',
    pageBg: '#0A0A0A',
    lightActiveGradient: 'linear-gradient(180deg, #15803D 0%, #16A34A 40%, #FFF8F0 100%)',
    lightInactiveGradient: 'linear-gradient(180deg, rgba(21,128,61,0.04) 0%, rgba(255,248,240,0.5) 100%)',
  },
  {
    id: 'orange',
    label: 'Pharmacy',
    prefix: 'Nevika',
    icon: Package,
    path: '/orange',
    activeGradient: 'linear-gradient(180deg, #C2410C 0%, #7C2D12 40%, #0a0a0a 100%)',
    inactiveGradient: 'linear-gradient(180deg, rgba(194,65,12,0.12) 0%, rgba(194,65,12,0.03) 100%)',
    iconColor: '#FB923C',
    pageBg: '#0a0a0a',
    lightActiveGradient: 'linear-gradient(180deg, #C2410C 0%, #EA580C 40%, #FFF8F0 100%)',
    lightInactiveGradient: 'linear-gradient(180deg, rgba(194,65,12,0.04) 0%, rgba(255,248,240,0.5) 100%)',
  },
];

export const ServiceHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useThemeLanguage();
  const lightMode = !isDarkMode;
  
  const activeService = getActiveService(location.pathname);
  const activeTab = tabs.find(t => t.id === activeService);

  return (
    <>
    <header 
      className="sticky top-0 z-50 glass-crystal"
      style={{ 
        background: lightMode ? 'rgba(255,248,240,0.85)' : 'rgba(10,11,20,0.6)',
        backdropFilter: 'blur(24px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
        borderBottom: lightMode ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.06)',
        transition: 'background 0.5s ease, border-bottom 0.5s ease',
        transform: 'translateZ(0)', 
        backfaceVisibility: 'hidden',
      }}
    >
      {/* Top Row */}
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <img 
            src="/nevika-cura-dark-logo.png" 
            alt="Nevika Cura" 
            className="h-12 w-auto object-contain cursor-pointer -ml-1 transition-all duration-500"
            style={lightMode ? { filter: 'brightness(0.55) saturate(1.4) contrast(1.1)' } : {}}
            width="120"
            height="48"
            fetchPriority="high"
            onClick={() => navigate('/')}
            data-testid="main-logo"
          />
          <div className="flex items-center gap-1">
            {/* Theme Toggle — Sun/Moon */}
            <button
              onClick={() => { selectionTap(); toggleDarkMode(); }}
              className="relative p-2 rounded-full transition-all duration-300"
              style={{
                background: lightMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)',
              }}
              data-testid="theme-toggle-btn"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? (
                <Sun className="w-[20px] h-[20px] transition-all duration-300" style={{ color: '#FBBF24' }} />
              ) : (
                <Moon className="w-[20px] h-[20px] transition-all duration-300" style={{ color: '#6366F1' }} />
              )}
            </button>

            {/* Notifications */}
            <NotificationBell lightMode={lightMode} />

            {/* Profile */}
            <button
              onClick={() => { selectionTap(); navigate(user ? '/profile' : '/login'); }}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              data-testid={user ? 'profile-button' : 'login-button'}
            >
              <User className="w-[20px] h-[20px] transition-colors duration-500" style={{ color: lightMode ? '#57534e' : 'rgba(255,255,255,0.7)' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Clean Gradient Tabs */}
      <div className="relative">
        <div className="flex items-stretch gap-1.5 px-3 pb-2">
          {tabs.map((tab) => {
            const isActive = activeService === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => { selectionTap(); navigate(tab.path); }}
                className="relative flex-1 min-w-0 rounded-2xl overflow-hidden"
                style={{
                  background: isActive
                    ? (lightMode ? tab.lightActiveGradient : tab.activeGradient)
                    : (lightMode ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.65)'),
                  border: isActive
                    ? `1.5px solid ${tab.iconColor}40`
                    : (lightMode ? '1.5px solid rgba(0,0,0,0.04)' : '1.5px solid rgba(255,255,255,0.08)'),
                  padding: '12px 4px 10px',
                  transition: 'all 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                data-testid={`nav-${tab.id}`}
              >
                {/* Top glow bar for active */}
                {isActive && (
                  <div className="absolute inset-x-2 top-0 h-[2px] rounded-b-full" style={{ background: tab.iconColor, opacity: 0.7 }} />
                )}

                {/* Icon */}
                <div
                  className="w-9 h-9 mx-auto rounded-xl flex items-center justify-center mb-1.5"
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${tab.iconColor}30, ${tab.iconColor}15)`
                      : (lightMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.1)'),
                    border: isActive ? `1px solid ${tab.iconColor}35` : 'none',
                    boxShadow: isActive ? `0 0 16px ${tab.iconColor}20` : 'none',
                    transition: 'all 0.35s ease',
                  }}
                >
                  <Icon
                    className="w-[18px] h-[18px]"
                    style={{
                      color: isActive ? (lightMode ? tab.iconColor : tab.iconColor) : (lightMode ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.45)'),
                      fill: tab.fillIcon && isActive ? tab.iconColor : 'none',
                      filter: isActive ? `drop-shadow(0 0 6px ${tab.iconColor})` : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  />
                </div>

                {/* Label — single line, bold */}
                <div className="text-center leading-none">
                  <span className="block text-[7px] font-medium tracking-widest uppercase"
                    style={{
                      color: isActive
                        ? (lightMode ? `${tab.iconColor}90` : `${tab.iconColor}80`)
                        : (lightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.35)'),
                      transition: 'color 0.4s ease',
                    }}>
                    NEVIKA
                  </span>
                  <span className="block text-[11px] font-extrabold mt-0.5"
                    style={{
                      color: isActive
                        ? (lightMode ? '#1c1917' : '#fff')
                        : (lightMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.55)'),
                      transition: 'color 0.4s ease',
                    }}>
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </header>
    </>
  );
};

export const getServiceTheme = (pathname) => {
  const service = getActiveService(pathname);
  return serviceThemes[service];
};

export { serviceThemes };
export default ServiceHeader;
