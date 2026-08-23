import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Heart, Plus, X, Stethoscope, FlaskConical, Pill, Compass, Wallet, ShoppingCart, Package, ChevronRight, Scan, ListOrdered } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useFestivalTheme } from '@/components/FestivalBanner';
import { useThemeLanguage } from '@/context/ThemeLanguageContext';
import { selectionTap, mediumTap } from '@/utils/haptics';

const API = process.env.REACT_APP_BACKEND_URL;

// Pages where bottom nav should be completely hidden (Labs & Pharmacy pages)
const HIDDEN_NAV_PATHS = [
  '/', '/home',
  '/mango', '/proton', '/nexugene', '/labs',
  '/pharmacy', '/orange', '/orange-generics', '/nutricare',
  '/orange-select', '/trusted-formulary',
];

const shouldHideNav = (pathname) => {
  return HIDDEN_NAV_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
};

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();
  const festival = useFestivalTheme();
  const { isDarkMode } = useThemeLanguage();
  const { getTotalCartCount, getPharmacyCartCount, getLabCartCount, getPharmacyTotal, getLabTotal, calculateDiscount, hasEligibleItems } = useCart();
  const [isScrolling, setIsScrolling] = useState(false);
  const [bookExpanded, setBookExpanded] = useState(false);

  const isLoggedIn = authUser || (typeof window !== 'undefined' && (localStorage.getItem('patientToken') || localStorage.getItem('guestMobile')));

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/' || path === '/home') return 'home';
    if (path === '/my-cura') return 'mycura';
    if (path.includes('/diagyn') || path.includes('/mango') || path.includes('/pharmacy')) return 'none';
    if (path === '/portals') return 'portals';
    if (path === '/cura-wallet' || path === '/cura-one') return 'curaone';
    if (path.includes('/profile') || path.includes('/patient-profile') || path.includes('/prescriptions') || path.includes('/my-orders') || path.includes('/cart')) return 'home';
    return 'home';
  };
  const activeTab = getActiveTab();

  useEffect(() => {
    let t;
    const onScroll = () => { setIsScrolling(true); clearTimeout(t); t = setTimeout(() => setIsScrolling(false), 300); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(t); };
  }, []);

  useEffect(() => { setBookExpanded(false); }, [location.pathname]);

  const totalCartCount = getTotalCartCount();

  // Hide nav on Labs & Pharmacy pages (after all hooks)
  if (shouldHideNav(location.pathname)) return <div className="md:hidden h-0" />;
  if (typeof document === 'undefined') return null;

  /* Simplified: Home + My Cura (Portal & CuraOne are now toggles on Home page) */
  const leftTabs = [
    { id: 'home', label: 'Home', icon: HomeIcon, path: '/' },
    { id: 'mycura', label: 'My Cura', icon: Heart, path: '/my-cura' },
  ];
  const rightTabs = [];

  const bookOptions = [
    { label: 'Consult', icon: Stethoscope, path: '/diagyn/book', color: '#06B6D4', bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.35)' },
    { label: 'Scan Rx', icon: Scan, path: '/pharmacy?scan=1', color: '#F97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.35)' },
    { label: 'Quick Order', icon: ListOrdered, path: '/pharmacy?quickorder=1', color: '#22C55E', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.35)' },
  ];

  const renderTab = (tab) => {
    const isActive = activeTab === tab.id;
    const Icon = tab.icon;
    return (
      <button
        key={tab.id}
        onClick={() => { selectionTap(); navigate(tab.path); }}
        className="relative flex items-center justify-center transition-all duration-300 ease-out"
        style={{
          background: isActive ? (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') : 'transparent',
          borderRadius: '18px',
          padding: isActive ? '7px 14px' : '7px 10px',
          gap: isActive ? '5px' : '0',
          minWidth: isActive ? '82px' : '40px',
        }}
        data-testid={`nav-${tab.id}`}
      >
        {tab.isCuraOne ? (
          <div className="relative">
            <img
              src="/images/curaone-nav-icon.png"
              alt="CuraOne"
              className="w-[20px] h-[24px] object-contain transition-all duration-200"
              style={{ opacity: isActive ? 1 : 0.35, filter: isActive ? 'brightness(1.4) drop-shadow(0 0 6px rgba(255,200,50,0.5))' : (isDarkMode ? 'grayscale(0.5)' : 'grayscale(0.5) brightness(0.6)') }}
              draggable={false}
            />
            {isActive && <div className="absolute -inset-1.5 rounded-full blur-[6px] -z-10" style={{ background: 'rgba(255,200,50,0.2)' }} />}
          </div>
        ) : (
          <Icon
            className="w-[19px] h-[19px] flex-shrink-0 transition-all duration-200"
            style={{
              color: isActive ? (isDarkMode ? '#fff' : '#0d9488') : (isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'),
              strokeWidth: isActive ? 2.2 : 1.5,
              fill: tab.id === 'mycura' && isActive ? (isDarkMode ? '#fff' : '#0d9488') : 'none',
            }}
          />
        )}
        {isActive && (
          <span
            className="text-[10.5px] font-bold whitespace-nowrap overflow-hidden"
            style={{ color: isDarkMode ? '#fff' : '#0d9488', animation: 'navLabelIn 0.25s cubic-bezier(0.22,1,0.36,1) both', maxWidth: '54px' }}
          >
            {tab.label}
          </span>
        )}
        {tab.id === 'home' && totalCartCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: '#F43F5E', boxShadow: '0 2px 6px rgba(244,63,94,0.4)' }}>{totalCartCount}</span>
        )}
      </button>
    );
  };

  return (
    <>
      {createPortal(
        <>
          {/* ── Expanded Book Bubble Menu ── */}
          {bookExpanded && (
            <div className="fixed inset-0 z-[9998]" onClick={() => setBookExpanded(false)} data-testid="book-overlay">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" style={{ animation: 'navFadeIn 0.2s ease-out' }} />
              <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-6" style={{ animation: 'navBubbleUp 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
                {bookOptions.map((opt, i) => (
                  <button
                    key={opt.label}
                    onClick={(e) => { e.stopPropagation(); mediumTap(); navigate(opt.path); setBookExpanded(false); }}
                    className="flex flex-col items-center gap-2.5"
                    style={{ animation: `navBubbleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) ${i * 60}ms both` }}
                    data-testid={`book-${opt.label.toLowerCase().replace(' ', '-')}`}
                  >
                    <div
                      className="w-[60px] h-[60px] rounded-full flex items-center justify-center"
                      style={{
                        background: opt.bg,
                        border: `2px solid ${opt.border}`,
                        backdropFilter: 'blur(20px)',
                        boxShadow: `0 8px 32px ${opt.bg}, 0 0 0 1px rgba(255,255,255,0.04)`,
                      }}
                    >
                      <opt.icon className="w-6 h-6" style={{ color: opt.color }} />
                    </div>
                    <span className="text-[11px] font-bold text-white" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Bottom Nav Container ── */}
          <nav
            className={`md:hidden fixed bottom-0 left-0 right-0 z-[9999] transition-transform duration-300 ${isScrolling && !bookExpanded ? 'translate-y-full' : 'translate-y-0'}`}
            style={{ transform: 'translateZ(0)' }}
            data-testid="persistent-footer"
          >
            <div className="px-4 pb-3 pt-1 relative">
              {/* ── Elevated Book FAB — floats above the bar ── */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-5 z-10">
                <button
                  onClick={() => { mediumTap(); setBookExpanded(!bookExpanded); }}
                  className="relative group"
                  data-testid="nav-book"
                >
                  {/* Outer glow ring */}
                  <div className="absolute inset-0 rounded-full transition-all duration-300" style={{
                    background: bookExpanded ? 'transparent' : 'rgba(244,63,94,0.15)',
                    transform: 'scale(1.35)',
                    filter: 'blur(8px)',
                  }} />
                  {/* Button */}
                  <div
                    className="relative w-[56px] h-[56px] rounded-full flex items-center justify-center transition-all duration-300 active:scale-90"
                    style={{
                      background: bookExpanded
                        ? 'rgba(255,255,255,0.1)'
                        : 'linear-gradient(135deg, #F43F5E 0%, #E11D48 50%, #BE123C 100%)',
                      boxShadow: bookExpanded
                        ? '0 4px 16px rgba(0,0,0,0.3)'
                        : '0 6px 24px rgba(244,63,94,0.45), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
                      border: bookExpanded ? '1px solid rgba(255,255,255,0.15)' : '2px solid rgba(255,255,255,0.15)',
                      transform: bookExpanded ? 'rotate(45deg)' : 'rotate(0)',
                      transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                  >
                    {bookExpanded
                      ? <X className="w-5 h-5 text-white/70" />
                      : <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
                    }
                  </div>
                </button>
              </div>

              {/* ── Glassmorphic bar ── */}
              <div className="rounded-[26px] overflow-hidden" style={{
                background: isDarkMode ? 'rgba(8,8,16,0.88)' : 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(40px) saturate(1.6)',
                WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
                border: isDarkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
                boxShadow: isDarkMode
                  ? '0 -4px 32px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.05)'
                  : '0 -4px 32px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)',
              }}>
                <div className="flex items-center py-2.5 px-3">
                  {/* Left tabs */}
                  <div className="flex items-center gap-1 flex-1 justify-evenly">
                    {leftTabs.map(renderTab)}
                  </div>

                  {/* Center spacer for the FAB */}
                  <div className="w-16 flex-shrink-0" />

                  {/* Right tabs */}
                  <div className="flex items-center gap-1 flex-1 justify-evenly">
                    {rightTabs.map(renderTab)}
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </>,
        document.body
      )}

      {/* Animations */}
      <style>{`
        @keyframes navFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes navBubbleUp { from { opacity: 0; transform: translate(-50%, 40px) scale(0.8); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
        @keyframes navBubbleIn { from { opacity: 0; transform: scale(0.3) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes navLabelIn { from { opacity: 0; max-width: 0; } to { opacity: 1; max-width: 54px; } }
      `}</style>

      {/* Spacer */}
      <div className="md:hidden h-24" />
    </>
  );
};

export default BottomNav;
