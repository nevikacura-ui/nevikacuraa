import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useViewMode } from '@/context/ViewModeContext';
import { useLanguage } from '@/context/LanguageContext';
import { ViewModeSwitcher, ViewModeSettings } from '@/components/ViewModeSwitcher';
import { toast } from 'sonner';
import { User, Menu, X, Download, Smartphone, Search, Heart, FlaskConical, Video, Gift, Lightbulb, AlertTriangle, Activity, Pill, Shield, Package, ChevronRight, Stethoscope, Baby, ThermometerSun, Users, HandHeart, Sparkles, ArrowRight, Calendar, Clock, ChevronLeft, Sun, Moon, Sunrise, Star, Quote, Flame, Trophy, Target, Zap, Timer, MapPin, Phone, Award, CheckCircle2, Settings, FileText, Home as HomeIcon, TestTube, History, Plus, Navigation } from 'lucide-react';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import GlobalSearch from '@/components/GlobalSearch';
import QuickActions from '@/components/QuickActions';
import PersonalizedActions from '@/components/PersonalizedActions';
import GamificationWidget from '@/components/GamificationWidget';
import HealthScoreWidget from '@/components/HealthScoreWidget';
import SmartHomeFeed from '@/components/SmartHomeFeed';
import PortalScrollBar from '@/components/PortalScrollBar';
import { 
  healthTips, 
  spotlightServices, 
  testimonials, 
  whyChooseUs, 
  featuredDoctors, 
  certifications, 
  howItWorksSteps, 
  clinicLocations
} from '@/data/homeData';
import {
  TrustBadges,
  QuickActionCards
} from '@/components/home';
import NevikaCuraOneBanner from '@/components/home/NevikaCuraOneBanner';

// Icon mapping for data-driven components
const iconMap = {
  Trophy,
  Users,
  Clock,
  Shield,
  Calendar,
  Stethoscope,
  Heart
};

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isMobile, isTablet, isDesktop, getResponsiveClasses } = useViewMode();
  const { language, setLanguage, t, languages } = useLanguage();
  const [showAuth, setShowAuth] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  // Active Service Tab for Zepto-style theming
  const [activeService, setActiveService] = useState('home');
  
  // Service theme configurations
  const serviceThemes = {
    home: {
      name: 'Nevika Cura',
      bgGradient: 'from-teal-100 via-cyan-50 to-teal-50',
      headerBg: 'bg-gradient-to-r from-teal-500 to-teal-600',
      headerTextColor: 'text-white',
      accentColor: 'teal',
      iconBg: 'from-teal-600 to-cyan-600',
      isLight: false
    },
    diagyn: {
      name: 'DiaGyn',
      bgGradient: 'from-teal-100 via-cyan-100 to-teal-50',
      headerBg: 'bg-gradient-to-r from-teal-600 to-cyan-600',
      headerTextColor: 'text-white',
      accentColor: 'teal',
      iconBg: 'from-teal-600 to-cyan-600',
      isLight: false
    },
    mango: {
      name: 'Mango',
      bgGradient: 'from-orange-100 via-amber-100 to-orange-50',
      headerBg: 'bg-gradient-to-r from-orange-500 to-amber-500',
      headerTextColor: 'text-white',
      accentColor: 'orange',
      iconBg: 'from-orange-500 to-amber-500',
      isLight: false
    },
    pharmacy: {
      name: 'Orange Pharmacy',
      bgGradient: 'from-orange-100 via-amber-100 to-orange-50',
      headerBg: 'bg-gradient-to-r from-orange-500 to-amber-500',
      headerTextColor: 'text-white',
      accentColor: 'orange',
      iconBg: 'from-orange-500 to-amber-500',
      isLight: false
    }
  };
  
  const currentTheme = serviceThemes[activeService];
  
  // Health Tip of the Day - Changes daily based on date
  const [currentTip, setCurrentTip] = useState(healthTips[0]);
  const [tipVisible, setTipVisible] = useState(true);
  
  // Service Spotlight Carousel
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Testimonials Carousel
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [testimonialTransition, setTestimonialTransition] = useState(false);
  
  // Health Stats (for logged-in users)
  const [healthStats, setHealthStats] = useState({
    lastCheckup: null,
    activePrescriptions: 0,
    upcomingAppointments: 0,
    healthStreak: 0
  });
  
  // Live Queue Status
  const [queueStatus, setQueueStatus] = useState([
    { clinic: 'DiaGyn', waitTime: '~0 min', patients: 0, status: 'low' },
    { clinic: 'Mango', waitTime: '~0 min', patients: 0, status: 'low' }
  ]);
  
  // PWA Install Prompt
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  
  // Bottom Navigation
  const [activeTab, setActiveTab] = useState('home');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  
  // Hide bottom nav while scrolling
  useEffect(() => {
    let scrollTimeout;
    
    const handleScroll = () => {
      setIsScrolling(true);
      
      // Clear existing timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // Show nav again after scrolling stops (300ms delay)
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 300);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, []);
  
  // Get greeting based on time of day
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', icon: Sunrise };
    if (hour < 17) return { text: 'Good Afternoon', icon: Sun };
    return { text: 'Good Evening', icon: Moon };
  }, []);
  
  const [greeting] = useState(getGreeting());
  
  // API URL
  const API = process.env.REACT_APP_BACKEND_URL;

  // Fetch health stats for logged-in user
  useEffect(() => {
    if (user) {
      // Simulate fetching health stats - in real app, call API
      const storedStreak = localStorage.getItem(`healthStreak_${user.id}`) || '0';
      const lastActivity = localStorage.getItem(`lastHealthActivity_${user.id}`);
      
      // Check if streak is still valid (activity within last 24 hours)
      let streak = parseInt(storedStreak);
      if (lastActivity) {
        const hoursSinceActivity = (Date.now() - parseInt(lastActivity)) / (1000 * 60 * 60);
        if (hoursSinceActivity > 48) {
          streak = 0; // Reset streak if more than 48 hours
          localStorage.setItem(`healthStreak_${user.id}`, '0');
        }
      }
      
      setHealthStats({
        lastCheckup: '15 days ago',
        activePrescriptions: 2,
        upcomingAppointments: 1,
        healthStreak: streak
      });
    }
  }, [user]);
  
  // Fetch live queue status
  useEffect(() => {
    const fetchQueueStatus = async () => {
      try {
        // Fetch queue status for each clinic
        const clinics = ['diagyn', 'mango'];
        const results = [];
        
        for (const clinic of clinics) {
          try {
            const response = await fetch(`${API}/api/live-queue/status/${clinic}`);
            if (response.ok) {
              const data = await response.json();
              results.push({
                clinic: clinic === 'diagyn' ? 'DiaGyn' : 'Mango',
                waitTime: `~${data.estimated_wait || 0} min`,
                patients: data.waiting || 0,
                status: (data.waiting || 0) > 5 ? 'high' : (data.waiting || 0) > 2 ? 'moderate' : 'low'
              });
            }
          } catch (e) {
            // Use default for this clinic
            results.push({
              clinic: clinic === 'diagyn' ? 'DiaGyn' : 'Mango',
              waitTime: '~0 min',
              patients: 0,
              status: 'low'
            });
          }
        }
        
        if (results.length > 0) {
          setQueueStatus(results);
        }
      } catch (err) {
        // Use default values on error
      }
    };
    
    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [API]);

  // Set daily health tip based on date
  useEffect(() => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const tipIndex = dayOfYear % healthTips.length;
    setCurrentTip(healthTips[tipIndex]);
  }, []);
  
  // Auto-rotate spotlight carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setSpotlightIndex((prev) => (prev + 1) % spotlightServices.length);
        setIsTransitioning(false);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Auto-rotate testimonials carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialTransition(true);
      setTimeout(() => {
        setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
        setTestimonialTransition(false);
      }, 300);
    }, 6000);
    return () => clearInterval(interval);
  }, []);
  
  // Log health activity (for streak)
  const logHealthActivity = () => {
    if (user) {
      const currentStreak = parseInt(localStorage.getItem(`healthStreak_${user.id}`) || '0');
      const newStreak = currentStreak + 1;
      localStorage.setItem(`healthStreak_${user.id}`, newStreak.toString());
      localStorage.setItem(`lastHealthActivity_${user.id}`, Date.now().toString());
      setHealthStats(prev => ({ ...prev, healthStreak: newStreak }));
      toast.success(`Health streak: ${newStreak} days! Keep it up!`);
    }
  };
  
  // Navigate spotlight
  const goToSpotlight = (direction) => {
    setIsTransitioning(true);
    setTimeout(() => {
      if (direction === 'next') {
        setSpotlightIndex((prev) => (prev + 1) % spotlightServices.length);
      } else {
        setSpotlightIndex((prev) => (prev - 1 + spotlightServices.length) % spotlightServices.length);
      }
      setIsTransitioning(false);
    }, 300);
  };

  // Detect if running as installed app (standalone mode)
  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);
    return () => {
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkStandalone);
    };
  }, []);
  
  // PWA Install Prompt Handler
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Show banner if not already installed and not dismissed recently
      const dismissed = localStorage.getItem('installBannerDismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
      if (hoursSinceDismissed > 24) {
        setShowInstallBanner(true);
      }
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check if already installed
    window.addEventListener('appinstalled', () => {
      setInstallPrompt(null);
      setShowInstallBanner(false);
      toast.success('App installed successfully! 🎉');
    });
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  // Handle Install App
  const handleInstallApp = async () => {
    if (!installPrompt) {
      // For iOS or browsers that don't support beforeinstallprompt
      toast.info('To install: tap Share button → Add to Home Screen');
      return;
    }
    
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setShowInstallBanner(false);
    }
  };
  
  // Dismiss Install Banner
  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('installBannerDismissed', Date.now().toString());
  };

  // Modern Service Cards - Logo background matches card background
  // Featured services (Top 3): DiaGyn, Proton, Pharmacy - All white background horizontal cards
  // Secondary services (Bottom grid): Evara, Glydex, Alyne, Thrive360, Serena, Corvia, Reneu, Senova
  const services = [
    // Featured - Top 3 (All white background)
    {
      id: 'diagyn',
      name: 'DiaGyn Healthcare',
      description: 'Book appointments with expert doctors',
      logo: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/e4jrn2os_6_20260107_021040_0003.jpg',
      path: '/diagyn',
      bgColor: '#ffffff',
      isDark: false,
      featured: true
    },
    {
      id: 'mango',
      name: 'Mango Health Labs',
      description: 'Book lab tests & health checkups',
      logo: 'https://customer-assets.emergentagent.com/job_c3c7c000-c0b8-475a-b79b-a8334b822713/artifacts/1o2w2pps_Purple%20White%20Modern%20Medical%20Laboratory%20Professional%20Banner%20%28Business%20Card%20%28_20260211_062110_0001.png',
      path: '/mango',
      bgColor: '#ffffff',
      isDark: false,
      featured: true
    },
    {
      id: 'pharmacy',
      name: 'Orange Pharmacy',
      description: 'Order medicines with fast delivery',
      logo: 'https://customer-assets.emergentagent.com/job_healthportal-48/artifacts/mtdgm1zn_Black%20%26%20White%20Lizard%20Lab%20Logo_20260205_012714_0000%20%281%29.png',
      path: '/pharmacy',
      bgColor: '#ffffff',
      isDark: false,
      featured: true
    },
    // Secondary - Bottom grid (8 portals) - Using full branded logos
    {
      id: 'evara',
      name: 'Evara',
      description: "Women's Health",
      logo: '/icons/evara-logo.png',
      path: '/evara',
      bgColor: '#511b63',
      isDark: true,
      fillLogo: true
    },
    {
      id: 'glydex',
      name: 'Glydex',
      description: 'Diabetes Care',
      logo: 'https://customer-assets.emergentagent.com/job_healthhelper-7/artifacts/u2dcjapg_file_00000000c85c7209b181fb96372c6521.png',
      path: '/glydex',
      bgColor: '#121f33',
      isDark: true,
      fillLogo: true
    },
    {
      id: 'alyne',
      name: 'ALYNE',
      description: 'Kids Health',
      logo: 'https://customer-assets.emergentagent.com/job_alynehealth/artifacts/llhgc3hn_Blue%20White%20Professional%20Minimal%20Brand%20Logo_20260114_042449_0002.png',
      path: '/alyne',
      bgColor: '#0a1628',
      isDark: true,
      fillLogo: true
    },
    {
      id: 'thrive360',
      name: 'Thrive360',
      description: 'Mind. Body. Life.',
      logo: 'https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/qb3buukl_91.png',
      path: '/thrive360',
      bgColor: '#1a1a3e',
      isDark: true,
      fillLogo: true
    },
    {
      id: 'serena',
      name: 'Serena',
      description: 'Mental Wellness',
      logo: 'https://customer-assets.emergentagent.com/job_medportal-nevika/artifacts/rnobb9t9_90.png',
      path: '/serena',
      bgColor: '#1a2e35',
      isDark: true,
      fillLogo: true,
      imagePosition: 'center 5%'
    },
    {
      id: 'corvia',
      name: 'Corvia',
      description: 'Heart & BP Care',
      logo: 'https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/p3zt5ovj_Pink%20Simple%20Charity%20Logo_20260128_183244_0000.png',
      path: '/corvia',
      bgColor: '#c8f56a',
      isDark: false,
      fillLogo: true
    },
    {
      id: 'reneu',
      name: 'Reneu',
      description: 'Preventive Health',
      logo: 'https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/uy8wpc27_file_00000000caf871fdae54ae4c4854bbd4.png',
      path: '/reneu',
      bgColor: '#f5f5f5',
      isDark: false,
      fillLogo: true
    },
    {
      id: 'senova',
      name: 'Senova',
      description: 'Senior Care',
      logo: 'https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/fb3a722w_file_000000000dfc7230a4605006a1e3131a.png',
      path: '/senova',
      bgColor: '#f0f4f8',
      isDark: false,
      fillLogo: true
    },
    {
      id: 'innerscore',
      name: 'InnerScore',
      description: 'Health Intelligence',
      logo: 'https://customer-assets.emergentagent.com/job_55d2778b-393f-4c6f-a4f0-366c7890154e/artifacts/gj9y2saj_file_00000000e9b472089087d7c50ce82a55.png',
      path: '/innerscore',
      bgColor: '#0f172a',
      isDark: true,
      fillLogo: true
    },
    {
      id: 'faithcare',
      name: 'FaithCare',
      description: 'Cultural Health Sync',
      logo: 'https://customer-assets.emergentagent.com/job_c3c7c000-c0b8-475a-b79b-a8334b822713/artifacts/52amv6l6_file_00000000e2a47209b2515ab5afe77eeb.png',
      path: '/faithcare',
      bgColor: '#0a0a0a',
      isDark: true,
      fillLogo: true,
      containImage: true,
      scale: 1.45
    }
  ];
  
  // Separate featured and secondary services
  const featuredServices = services.filter(s => s.featured);
  const secondaryServices = services.filter(s => !s.featured);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.bgGradient} relative font-body transition-all duration-500`} style={{ contentVisibility: 'auto' }}>
      {/* Subtle Background Pattern - Themed */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className={`absolute top-20 -left-32 w-96 h-96 bg-gradient-to-br ${currentTheme.bgGradient} opacity-50 rounded-full blur-3xl`} style={{animationDuration: '8s'}}></div>
        <div className={`absolute top-1/3 -right-32 w-80 h-80 bg-gradient-to-br ${currentTheme.bgGradient} opacity-30 rounded-full blur-3xl`} style={{animationDuration: '10s'}}></div>
        <div className={`absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-br ${currentTheme.bgGradient} opacity-30 rounded-full blur-3xl`} style={{animationDuration: '12s'}}></div>
      </div>

      {/* Header - Zepto/Blinkit Style with Service Tabs */}
      <header 
        className={`${currentTheme.headerBg} sticky top-0 z-50 ${currentTheme.isLight ? 'shadow-sm' : 'shadow-lg'} transition-all duration-500`}
        style={{
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden'
        }}
      >
        {/* Top Row - Logo + Actions */}
        <div className={`${currentTheme.isLight ? '' : 'border-b border-white/10'}`}>
          <div className="max-w-7xl mx-auto px-4 py-2.5">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <img 
                src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
                alt="Nevika Cura" 
                className={`h-10 sm:h-12 w-auto object-contain cursor-pointer ${currentTheme.isLight ? '' : 'bg-white rounded-lg p-1'}`}
                onClick={() => setActiveService('home')}
                data-testid="main-logo"
                loading="eager"
                fetchPriority="high"
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

        {/* Row 2 - Main Service Tabs (Zepto style) */}
        <div className={`${currentTheme.isLight ? 'bg-slate-50/50' : 'bg-white/10 backdrop-blur-sm'}`}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-2 py-2 overflow-x-auto scrollbar-hide">
              {/* Nevika Cura / Home */}
              <button
                onClick={() => { setActiveService('home'); navigate('/'); }}
                className={`flex-shrink-0 px-4 py-2 rounded-full flex items-center gap-2 transition-all ${
                  activeService === 'home' 
                    ? (currentTheme.isLight ? 'bg-teal-500 text-white shadow-lg' : 'bg-white text-teal-600 shadow-lg')
                    : (currentTheme.isLight ? 'bg-white border border-slate-200 text-slate-700 hover:border-teal-300' : 'bg-white/20 text-white hover:bg-white/30')
                }`}
                data-testid="nav-nevikacura"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${activeService === 'home' ? 'bg-red-500' : 'bg-gradient-to-br from-red-500 to-pink-500'}`}>
                  <Heart className="w-4 h-4 text-white" fill="white" />
                </div>
                <span className="font-bold text-sm whitespace-nowrap">Nevika Cura</span>
              </button>
              
              {/* DiaGyn - Navigate to /diagyn */}
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
              
              {/* Mango - Navigate to /mango */}
              <button
                onClick={() => navigate('/mango')}
                className={`flex-shrink-0 px-4 py-2 rounded-full flex items-center gap-2 transition-all ${
                  activeService === 'mango' 
                    ? 'bg-white text-orange-600 shadow-lg'
                    : (currentTheme.isLight ? 'bg-white border border-slate-200 text-slate-700 hover:border-orange-300' : 'bg-white/20 text-white hover:bg-white/30')
                }`}
                data-testid="nav-mango"
              >
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${activeService === 'mango' ? 'from-orange-500 to-amber-500' : 'from-orange-400 to-amber-500'} flex items-center justify-center`}>
                  <FlaskConical className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-sm whitespace-nowrap">Mango</span>
              </button>
              
              {/* Orange Pharmacy - Navigate to /pharmacy */}
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

      {/* Portal Scroll Bar - Blinkit/Zepto style horizontal toggle */}
      <PortalScrollBar />

      {/* Trust Badges - Blinkit/Practo style */}
      <TrustBadges />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 overflow-x-hidden">

        {/* Personalized Dashboard Cards - For logged-in users */}
        {user && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="personalized-dashboard">
            {/* Upcoming Appointment Card */}
            <div 
              onClick={() => navigate('/profile')}
              className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border border-teal-200/50 cursor-pointer hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-teal-600 font-medium">Upcoming</p>
              <p className="text-lg font-bold text-slate-800">{healthStats.upcomingAppointments || 0}</p>
              <p className="text-[10px] text-slate-500">Appointments</p>
            </div>
            
            {/* Active Prescriptions Card */}
            <div 
              onClick={() => navigate('/pharmacy')}
              className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-200/50 cursor-pointer hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Pill className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-orange-600 font-medium">Medicines</p>
              <p className="text-lg font-bold text-slate-800">{healthStats.activePrescriptions || 0}</p>
              <p className="text-[10px] text-slate-500">Active Orders</p>
            </div>
            
            {/* Health Streak Card */}
            <div 
              onClick={logHealthActivity}
              className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl border border-purple-200/50 cursor-pointer hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-purple-600 font-medium">Health Streak</p>
              <p className="text-lg font-bold text-slate-800">{healthStats.healthStreak || 0}</p>
              <p className="text-[10px] text-slate-500">Day Streak 🔥</p>
            </div>
            
            {/* Complete Profile Nudge Card */}
            <div 
              onClick={() => navigate('/patient-portal')}
              className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-200/50 cursor-pointer hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-pink-600 font-medium">My Health</p>
              <p className="text-lg font-bold text-slate-800">Profile</p>
              <p className="text-[10px] text-slate-500">View Records →</p>
            </div>
          </div>
        )}

        {/* Quick Actions - One-tap access */}
        <div className="mb-6">
          <QuickActions />
        </div>

        {/* Quick Action Cards - Call, WhatsApp, Upload, Packages */}
        <QuickActionCards />

        {/* Personalized Quick Actions - Reorder & Book Again */}
        <PersonalizedActions className="mb-6" />

        {/* Gamification - Streak, Points, Referral */}
        <GamificationWidget compact className="mb-6" />

        {/* Smart Home Feed - For logged in users */}
        {user && (
          <div className="mb-8">
            <SmartHomeFeed user={user} />
          </div>
        )}

        {/* Install App Banner - Enhanced Design */}
        {showInstallBanner && !isStandalone && (
          <div className="mb-6 relative overflow-hidden rounded-2xl shadow-xl animate-fadeIn" data-testid="install-banner">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600"></div>
            
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-8 -mb-8"></div>
            
            <div className="relative p-5">
              <button 
                onClick={dismissInstallBanner}
                className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4 text-white/80" />
              </button>
              
              <div className="flex items-center gap-4">
                {/* App Icon Preview */}
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center overflow-hidden">
                    <img 
                      src="/icons/icon-72x72.png" 
                      alt="Nevika Cura" 
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                  {/* Install Badge */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                    <Download className="w-3 h-3 text-white" />
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 text-white min-w-0">
                  <h3 className="font-bold text-base sm:text-lg mb-0.5">Get the App!</h3>
                  <p className="text-xs sm:text-sm text-white/90 mb-2">Install for faster access & notifications</p>
                  
                  {/* Benefits */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full">
                      <Zap className="w-3 h-3" /> Faster
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full">
                      <Shield className="w-3 h-3" /> Secure
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full">
                      <Smartphone className="w-3 h-3" /> Offline
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Install Button */}
              <Button 
                onClick={handleInstallApp}
                className="mt-4 w-full bg-white text-teal-600 hover:bg-white/95 rounded-xl py-3 font-bold shadow-lg transition-all hover:scale-[1.02]"
                data-testid="install-app-btn"
              >
                <Download className="w-5 h-5 mr-2" />
                Add to Home Screen
              </Button>
            </div>
          </div>
        )}

        {/* Personalized Greeting Banner - For logged in users */}
        {user && (
          <div className="mb-8 p-5 bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-blue-500/10 backdrop-blur-xl rounded-3xl border border-teal-200/30 shadow-sm animate-fadeIn" data-testid="personalized-greeting">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg">
                {React.createElement(greeting.icon, { className: "w-7 h-7 text-white" })}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">
                  {greeting.text}, {user.name?.split(' ')[0] || 'there'}! 👋
                </h2>
                <p className="text-sm text-slate-600">Welcome back to Nevika Cura. How can we help you today?</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/profile')}
                className="hidden sm:flex rounded-full border-teal-200 hover:bg-teal-50"
              >
                <Calendar className="w-4 h-4 mr-2" />
                My Appointments
              </Button>
            </div>
          </div>
        )}
        
        {/* Quick Health Stats Widget - For logged in users */}
        {user && (
          <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="health-stats-widget">
            <div className="p-4 bg-white/70 backdrop-blur rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Last Checkup</p>
                  <p className="text-sm font-semibold text-slate-700">{healthStats.lastCheckup || 'Not yet'}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white/70 backdrop-blur rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Pill className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Prescriptions</p>
                  <p className="text-sm font-semibold text-slate-700">{healthStats.activePrescriptions} active</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white/70 backdrop-blur rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Upcoming</p>
                  <p className="text-sm font-semibold text-slate-700">{healthStats.upcomingAppointments} appt</p>
                </div>
              </div>
            </div>
            
            {/* Health Streak - Gamification */}
            <button 
              onClick={logHealthActivity}
              className="p-4 bg-gradient-to-br from-amber-50 to-orange-100 backdrop-blur rounded-2xl border border-amber-200/50 shadow-sm hover:shadow-md transition-all group"
              data-testid="health-streak-btn"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-amber-600">Health Streak</p>
                  <p className="text-sm font-bold text-amber-700">{healthStats.healthStreak} days 🔥</p>
                </div>
              </div>
            </button>
          </div>
        )}
        
        {/* Health Score Widget - Gamification (for logged in users) */}
        {user && (
          <div className="mb-8">
            <HealthScoreWidget user={user} />
          </div>
        )}
        
        {/* Live Queue Status Preview */}
        <div className="mb-8 p-4 bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/50 shadow-sm" data-testid="live-queue-preview">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Timer className="w-4 h-4 text-teal-500" />
              Live Queue Status
            </h3>
            <button 
              onClick={() => navigate('/queue')}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              View All →
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {queueStatus.map((queue, idx) => (
              <div 
                key={idx}
                className={`flex-shrink-0 px-4 py-2 rounded-xl flex items-center gap-3 ${
                  queue.status === 'low' ? 'bg-green-50 border border-green-200' :
                  queue.status === 'moderate' ? 'bg-amber-50 border border-amber-200' :
                  'bg-red-50 border border-red-200'
                }`}
              >
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  queue.status === 'low' ? 'bg-green-500' :
                  queue.status === 'moderate' ? 'bg-amber-500' :
                  'bg-red-500'
                }`}></div>
                <div>
                  <p className="text-sm font-medium text-slate-700">{queue.clinic}</p>
                  <p className={`text-xs ${
                    queue.status === 'low' ? 'text-green-600' :
                    queue.status === 'moderate' ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {queue.waitTime} • {queue.patients} waiting
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Health Tip of the Day */}
        <div 
          className={`mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border border-amber-200/50 shadow-sm transition-all duration-500 ${tipVisible ? 'opacity-100' : 'opacity-0'}`}
          data-testid="health-tip-banner"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-full -mr-10 -mt-10"></div>
          <div className="relative p-4 sm:p-5 flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg text-2xl sm:text-3xl">
              {currentTip.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Tip of the Day • {currentTip.category}</span>
              </div>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{currentTip.tip}</p>
            </div>
            <button 
              onClick={() => setTipVisible(false)}
              className="flex-shrink-0 p-2 hover:bg-amber-100 rounded-full transition-colors"
              aria-label="Dismiss tip"
            >
              <X className="w-4 h-4 text-amber-600" />
            </button>
          </div>
        </div>

        {/* Service Spotlight Carousel */}
        <div className="mb-12 relative" data-testid="service-spotlight-carousel">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Featured Services
            </h2>
            <div className="flex items-center gap-2">
              {/* Carousel Dots */}
              <div className="flex gap-1.5 mr-2">
                {spotlightServices.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setIsTransitioning(true);
                      setTimeout(() => {
                        setSpotlightIndex(idx);
                        setIsTransitioning(false);
                      }, 300);
                    }}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      idx === spotlightIndex ? 'bg-teal-500 w-6' : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
              {/* Navigation Arrows */}
              <button 
                onClick={() => goToSpotlight('prev')}
                className="p-2 rounded-full bg-white/80 hover:bg-white shadow-sm border border-slate-200 transition-all hover:scale-105"
                aria-label="Previous"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button 
                onClick={() => goToSpotlight('next')}
                className="p-2 rounded-full bg-white/80 hover:bg-white shadow-sm border border-slate-200 transition-all hover:scale-105"
                aria-label="Next"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
          
          {/* Spotlight Card */}
          <div 
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${spotlightServices[spotlightIndex].bgImage} border border-white/50 shadow-lg transition-all duration-300 ${isTransitioning ? 'opacity-0 transform translate-x-4' : 'opacity-100 transform translate-x-0'}`}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/40 to-transparent rounded-full -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-white/30 to-transparent rounded-full -ml-16 -mb-16"></div>
            
            <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex-1">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${spotlightServices[spotlightIndex].gradient} mb-3`}>
                  {spotlightServices[spotlightIndex].subtitle}
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
                  {spotlightServices[spotlightIndex].title}
                </h3>
                <p className="text-slate-600 mb-4 max-w-md">
                  {spotlightServices[spotlightIndex].description}
                </p>
                <Button 
                  onClick={() => navigate(spotlightServices[spotlightIndex].path)}
                  className={`rounded-full bg-gradient-to-r ${spotlightServices[spotlightIndex].gradient} hover:opacity-90 shadow-lg px-6`}
                  data-testid={`spotlight-cta-${spotlightServices[spotlightIndex].id}`}
                >
                  {spotlightServices[spotlightIndex].cta}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              
              {/* Decorative Element */}
              <div className={`hidden sm:flex w-32 h-32 rounded-3xl bg-gradient-to-br ${spotlightServices[spotlightIndex].gradient} items-center justify-center shadow-2xl`}>
                <Stethoscope className="w-16 h-16 text-white/90" />
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section - Modern Asymmetric */}
        <div className="relative mb-16 md:mb-20">
          <div className="text-center md:text-left md:max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-100 to-cyan-100 border border-teal-200/50 rounded-full text-teal-700 text-sm font-medium mb-6 shadow-sm">
              <Sparkles className="w-4 h-4" />
              Your Health, Our Priority
            </div>
            
            {/* Main Heading */}
            <h1 className="font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight mb-6 text-slate-800 leading-[1.1]">
              Complete Healthcare
              <br />
              <span className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 bg-clip-text text-transparent">
                At Your Fingertips
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg text-slate-600 max-w-xl mx-auto md:mx-0 leading-relaxed mb-8">
              Book appointments, order medicines, get diagnostic tests - all from one trusted platform designed for your wellness journey.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button 
                size="lg"
                onClick={() => setShowAuth(true)}
                data-testid="hero-get-started-btn"
                className="rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-lg shadow-teal-500/30 text-base px-8 py-6 transition-all duration-300 hover:scale-105"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => navigate('/queue')}
                data-testid="hero-live-queue-btn"
                className="rounded-full border-2 border-slate-200 hover:border-slate-300 text-base px-8 py-6 hover:bg-slate-50"
              >
                View Live Queue
              </Button>
            </div>
          </div>
        </div>

        {/* Services Grid - New Layout */}
        <div className="mb-16 overflow-hidden">
          <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center md:text-left">Our Services</h2>
          <p className="text-slate-500 mb-8 text-center md:text-left">Complete healthcare at your fingertips</p>
          
          {/* Featured Services - DiaGyn, Proton, Pharmacy (Horizontal Cards) */}
          <div className="space-y-4 mb-6">
            {featuredServices.map((service) => (
              <div
                key={service.id}
                className={`group relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl ${
                  service.isDark ? 'shadow-lg' : 'shadow-md border border-gray-100'
                }`}
                style={{ backgroundColor: service.bgColor }}
                onClick={() => navigate(service.path)}
                data-testid={`service-card-featured-${service.id}`}
              >
                {/* Popular Badge */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                    <Star className="w-3 h-3" />
                    Popular
                  </span>
                </div>
                
                {/* Decorative circles */}
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 transition-transform duration-500 group-hover:scale-150 ${
                  service.isDark ? 'bg-white/10' : 'bg-gray-100/50'
                }`}></div>
                
                <div className="relative flex items-center p-5 sm:p-6 min-h-[140px] lg:min-h-[160px]">
                  <div className={`flex-shrink-0 mr-4 sm:mr-5 flex items-center justify-center ${service.id === 'mango' ? 'w-32 sm:w-40 lg:w-48 h-20 sm:h-24 lg:h-28 bg-white rounded-xl shadow-sm' : 'w-28 sm:w-36 lg:w-44'}`}>
                    <img 
                      src={service.logo} 
                      alt={service.name} 
                      className={`object-contain transition-transform duration-300 group-hover:scale-110 ${service.containImage ? 'rounded-xl' : ''} ${service.id === 'mango' ? 'max-w-[90%] max-h-[85%]' : 'w-full h-auto'}`}
                      style={service.id === 'mango' ? { transform: 'scale(1.35)' } : {}}
                      data-testid={`service-logo-featured-${service.id}`}
                      loading="eager"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 
                      className={`text-lg sm:text-xl lg:text-2xl font-bold mb-1 tracking-tight ${service.isDark ? 'text-white' : 'text-slate-800'}`}
                      style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}
                    >
                      {service.name}
                    </h3>
                    <p 
                      className={`text-sm lg:text-base mb-3 ${service.isDark ? 'text-white/70' : 'text-slate-500'}`}
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                    >
                      {service.description}
                    </p>
                    <Button
                      onClick={(e) => { e.stopPropagation(); navigate(service.path); }}
                      size="sm"
                      className={`rounded-xl font-semibold transition-all duration-300 lg:px-6 lg:py-2 ${
                        service.isDark 
                          ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30' 
                          : 'bg-teal-500 hover:bg-teal-600 text-white'
                      }`}
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                    >
                      {service.id === 'diagyn' ? 'Book Now' : service.id === 'mango' ? 'Book Test' : 'Order Now'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Secondary Services - 2x4 Grid (Evara, Glydex, Alyne, Thrive360, Serena, Corvia, Reneu, Senova) */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 lg:gap-6 mt-6">
            {secondaryServices.map((service) => (
              <div
                key={service.id}
                className={`group rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl ${
                  service.isDark ? 'shadow-lg' : 'shadow-md border border-gray-200'
                }`}
                style={service.useGradient ? { background: service.bgColor } : { backgroundColor: service.bgColor }}
                onClick={() => navigate(service.path)}
                data-testid={`service-card-${service.id}`}
              >
                {/* Card Content */}
                <div className="h-[200px] sm:h-[220px] lg:h-[260px] flex flex-col">
                  {/* Logo Section - Fills the card */}
                  <div className="flex-1 overflow-hidden">
                    {service.useIcon ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-white" />
                      </div>
                    ) : (
                      <img 
                        src={service.logo} 
                        alt={service.name} 
                        className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${
                          service.containImage ? 'object-contain p-4' : 'object-cover'
                        }`}
                        style={{
                          ...(service.imagePosition ? { objectPosition: service.imagePosition } : {}),
                          ...(service.scale ? { transform: `scale(${service.scale})` } : {})
                        }}
                        data-testid={`service-logo-${service.id}`}
                        loading="lazy"
                      />
                    )}
                  </div>
                  
                  {/* Explore Button - Fixed at bottom with gradient */}
                  <div className="p-3 lg:p-4 flex-shrink-0">
                    <Button
                      onClick={(e) => { e.stopPropagation(); navigate(service.path); }}
                      data-testid={`service-button-${service.id}`}
                      className="w-full rounded-xl font-semibold transition-all duration-300 shadow-lg py-2 lg:py-3 text-white border-0"
                      style={{
                        background: service.isDark 
                          ? 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)' 
                          : 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)',
                        backdropFilter: service.isDark ? 'blur(10px)' : 'none'
                      }}
                    >
                      Explore
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats - Glassmorphism */}
        <div className="mb-16">
          <div className={`grid gap-4 ${
            isTablet ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'
          }`}>
            {[
              { value: '6', label: 'Services', color: 'from-violet-500 to-purple-500' },
              { value: '2', label: 'Clinic Locations', color: 'from-sky-500 to-blue-500' },
              { value: '4000+', label: 'Medicines', color: 'from-orange-500 to-amber-500' },
              { value: '100+', label: 'Lab Tests', color: 'from-pink-500 to-rose-500' }
            ].map((stat, idx) => (
              <div key={idx} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl -z-10" style={{background: `linear-gradient(to right, var(--tw-gradient-stops))`}}></div>
                <div className={`text-center bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50 shadow-sm hover:shadow-lg transition-all duration-300 ${
                  isTablet ? 'p-8' : 'p-6'
                }`}>
                  <p className={`font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent ${
                    isTablet ? 'text-4xl' : 'text-3xl'
                  }`}>{stat.value}</p>
                  <p className={`text-slate-500 mt-1 ${isTablet ? 'text-base' : 'text-sm'}`}>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* More Features Section - Modern Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center md:text-left">Quick Actions</h2>
          <div className={`grid gap-4 ${
            isTablet ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
          }`}>
            {/* Emergency - Highlighted */}
            <button
              onClick={() => navigate('/emergency')}
              className={`bg-gradient-to-br from-red-50 to-rose-100 backdrop-blur rounded-2xl border border-red-200/50 hover:shadow-lg hover:scale-[1.02] transition-all text-center group ${
                isTablet ? 'p-6' : 'p-5'
              }`}
              data-testid="emergency-btn"
            >
              <div className={`mx-auto mb-3 rounded-2xl bg-red-100 flex items-center justify-center group-hover:scale-110 transition-transform ${
                isTablet ? 'w-14 h-14' : 'w-12 h-12'
              }`}>
                <AlertTriangle className={isTablet ? 'w-7 h-7 text-red-500' : 'w-6 h-6 text-red-500'} />
              </div>
              <span className={`font-semibold text-red-700 ${isTablet ? 'text-base' : 'text-sm'}`}>Emergency SOS</span>
            </button>
            
            <button
              onClick={() => navigate('/smart-reminders')}
              className="p-5 bg-gradient-to-br from-teal-50 to-emerald-100 backdrop-blur rounded-2xl border border-teal-200/50 hover:shadow-lg hover:scale-[1.02] transition-all text-center group"
              data-testid="smart-reminders-btn"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-teal-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Pill className="w-6 h-6 text-teal-500" />
              </div>
              <span className="text-sm font-semibold text-teal-700">Smart Reminders</span>
            </button>
            
            <button
              onClick={() => navigate('/health-assessment')}
              className="p-5 bg-white/60 backdrop-blur rounded-2xl border border-white/50 hover:shadow-lg hover:scale-[1.02] transition-all text-center group"
              data-testid="health-assessment-btn"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6 text-indigo-500" />
              </div>
              <span className="text-sm font-semibold text-slate-700">Risk Assessment</span>
            </button>
            
            <button
              onClick={() => navigate('/health-dashboard')}
              className="p-5 bg-gradient-to-br from-rose-50 to-pink-100 backdrop-blur rounded-2xl border border-rose-200/50 hover:shadow-lg hover:scale-[1.02] transition-all text-center group"
              data-testid="my-health-btn"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-rose-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Heart className="w-6 h-6 text-rose-500" />
              </div>
              <span className="text-sm font-semibold text-rose-700">Health Dashboard</span>
            </button>
            
            <button
              onClick={() => navigate('/health-packages')}
              className="p-5 bg-white/60 backdrop-blur rounded-2xl border border-white/50 hover:shadow-lg hover:scale-[1.02] transition-all text-center group"
              data-testid="health-packages-btn"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FlaskConical className="w-6 h-6 text-purple-500" />
              </div>
              <span className="text-sm font-semibold text-slate-700">Health Packages</span>
            </button>
            
            <button
              onClick={() => navigate('/quick-reorder')}
              className="p-5 bg-gradient-to-br from-emerald-50 to-green-100 backdrop-blur rounded-2xl border border-emerald-200/50 hover:shadow-lg hover:scale-[1.02] transition-all text-center group"
              data-testid="quick-reorder-btn"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ChevronRight className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-emerald-700">Quick Reorder</span>
            </button>
            
            <button
              onClick={() => navigate('/teleconsult')}
              className="p-5 bg-gradient-to-br from-blue-50 to-sky-100 backdrop-blur rounded-2xl border border-blue-200/50 hover:shadow-lg hover:scale-[1.02] transition-all text-center group"
              data-testid="teleconsult-btn"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-blue-700">Video Consult</span>
            </button>
            
            <button
              onClick={() => navigate('/health-tips')}
              className="p-5 bg-white/60 backdrop-blur rounded-2xl border border-white/50 hover:shadow-lg hover:scale-[1.02] transition-all text-center group"
              data-testid="health-tips-btn"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Lightbulb className="w-6 h-6 text-amber-500" />
              </div>
              <span className="text-sm font-semibold text-slate-700">Health Tips</span>
            </button>
          </div>
        </div>

        {/* Testimonials Carousel */}
        <div className="mb-16" data-testid="testimonials-carousel">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Quote className="w-6 h-6 text-teal-500" />
              What Our Patients Say
            </h2>
            <div className="flex gap-1.5">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTestimonialTransition(true);
                    setTimeout(() => {
                      setTestimonialIndex(idx);
                      setTestimonialTransition(false);
                    }, 300);
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    idx === testimonialIndex ? 'bg-teal-500 w-6' : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to testimonial ${idx + 1}`}
                />
              ))}
            </div>
          </div>
          
          <div className={`relative bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200/50 shadow-lg p-6 sm:p-8 transition-all duration-300 ${
            testimonialTransition ? 'opacity-0 transform translate-x-4' : 'opacity-100 transform translate-x-0'
          }`}>
            <div className="absolute top-6 right-6 text-6xl text-teal-100 font-serif">"</div>
            
            <div className="relative flex flex-col sm:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {testimonials[testimonialIndex].avatar}
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(testimonials[testimonialIndex].rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                
                <p className="text-slate-700 text-base sm:text-lg leading-relaxed mb-4">
                  "{testimonials[testimonialIndex].text}"
                </p>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{testimonials[testimonialIndex].name}</p>
                    <p className="text-sm text-slate-500">{testimonials[testimonialIndex].location}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                    {testimonials[testimonialIndex].service}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why Choose Nevika Cura */}
        <div className="mb-16" data-testid="why-choose-us">
          <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">Why Choose Nevika Cura?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {whyChooseUs.map((item, idx) => {
              const IconComponent = iconMap[item.icon] || Trophy;
              return (
                <div 
                  key={idx}
                  className="relative group p-6 bg-white/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-lg transition-all text-center overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
                  <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{item.value}</p>
                  <p className="text-sm text-slate-500">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* How It Works - Compact Horizontal */}
        <div className="mb-12" data-testid="how-it-works">
          <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">How It Works</h2>
          <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
            {howItWorksSteps.map((step, idx) => (
              <div key={idx} className="flex items-center">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full border border-slate-200 shadow-sm">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-bold text-sm`}>
                    {step.step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                    <p className="text-xs text-slate-500 hidden sm:block">{step.description}</p>
                  </div>
                </div>
                {idx < 2 && (
                  <ArrowRight className="w-5 h-5 text-slate-300 mx-1 sm:mx-2 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Featured Doctors */}
        <div className="mb-16" data-testid="featured-doctors">
          <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">Meet Our Doctors</h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {featuredDoctors.map((doctor) => (
              <div 
                key={doctor.id}
                className="bg-white/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-lg transition-all overflow-hidden group"
              >
                {/* Doctor Avatar */}
                <div className={`h-32 bg-gradient-to-br ${doctor.color} flex items-center justify-center relative`}>
                  <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl font-bold border-4 border-white/30">
                    {doctor.avatar}
                  </div>
                </div>
                
                {/* Doctor Info */}
                <div className="p-4 text-center">
                  <h3 className="font-bold text-slate-800">{doctor.name}</h3>
                  <p className="text-sm text-teal-600 font-medium">{doctor.specialization}</p>
                  {doctor.experience && (
                    <p className="text-xs text-pink-600 font-medium">{doctor.experience}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">{doctor.qualification}</p>
                  <Button 
                    size="sm"
                    onClick={() => navigate('/diagyn')}
                    className={`mt-3 w-full rounded-full bg-gradient-to-r ${doctor.color} hover:opacity-90 text-white text-xs`}
                  >
                    Book Appointment
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications & Accreditations */}
        <div className="mb-16" data-testid="certifications">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Trusted & Certified</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {certifications.map((cert, idx) => (
              <div 
                key={idx}
                className={`px-5 py-3 rounded-full ${cert.color} font-semibold text-sm flex items-center gap-2 shadow-sm`}
                title={cert.fullName}
              >
                <Award className="w-4 h-4" />
                {cert.name}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-500 mt-4">Quality healthcare you can trust</p>
        </div>

        {/* Our Clinics - Redesigned */}
        <div className="mb-16" data-testid="clinic-locations">
          <div className="text-center mb-8">
            <span className="inline-block px-4 py-1.5 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-full text-teal-600 text-sm font-medium mb-3">
              Visit Us
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Our Clinic Locations</h2>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">Experience quality healthcare at our state-of-the-art facilities</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {clinicLocations.map((clinic, index) => (
              <div 
                key={clinic.id}
                className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Clinic Header with Gradient */}
                <div className={`h-32 relative ${index === 0 ? 'bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400' : 'bg-gradient-to-br from-teal-400 via-cyan-400 to-blue-400'}`}>
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <img 
                      src={clinic.logo} 
                      alt={clinic.name}
                      className="max-h-24 max-w-[80%] object-contain drop-shadow-sm"
                    />
                  </div>
                  {/* Decorative corner */}
                  <div className={`absolute top-0 right-0 w-20 h-20 ${index === 0 ? 'bg-orange-500/20' : 'bg-teal-500/20'} rounded-bl-full`}></div>
                </div>
                
                {/* Clinic Details */}
                <div className="p-5">
                  <h3 className="font-bold text-lg text-slate-800 mb-3 group-hover:text-teal-600 transition-colors">
                    {clinic.name}
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Address */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 leading-relaxed">{clinic.address}</p>
                        <p className="text-sm text-slate-500">{clinic.city}</p>
                      </div>
                    </div>
                    
                    {/* Phone */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-green-600" />
                      </div>
                      <a href={`tel:${clinic.phone}`} className="text-sm text-slate-700 hover:text-teal-600 font-medium transition-colors">
                        {clinic.phone}
                      </a>
                    </div>
                    
                    {/* Hours */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-sm text-slate-600">{clinic.hours}</p>
                    </div>
                  </div>
                  
                  {/* Services Tags */}
                  {clinic.services && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                      {clinic.services.map((service, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-slate-50 text-slate-600 text-xs font-medium rounded-full">
                          {service}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Get Directions Button */}
                  <a 
                    href={clinic.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      index === 0 
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-lg hover:shadow-orange-500/25' 
                        : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-teal-500/25'
                    }`}
                  >
                    <Navigation className="w-4 h-4" />
                    Get Directions
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Help Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-white/70 backdrop-blur-xl border border-white/50 rounded-full px-6 py-4 shadow-sm">
            <span className="text-slate-600">Need Help?</span>
            <a 
              href="https://wa.me/919403890429" 
              target="_blank" 
              rel="noopener noreferrer"
              data-testid="whatsapp-link"
              className="font-semibold text-teal-600 hover:text-teal-700 hover:underline transition-colors"
            >
              Contact us on WhatsApp
            </a>
          </div>
        </div>
      </main>

      {/* Download App Section - Modern Gradient */}
      {!isStandalone && (
        <section className="py-10 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-center sm:text-left">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <Smartphone className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl">Get Nevika Cura App</h3>
                  <p className="text-white/80 text-sm">Healthcare at your fingertips</p>
                </div>
              </div>
              <a
                href="https://customer-assets.emergentagent.com/job_caresuite/artifacts/q8j4m5st_Nevika%20Cura.apk"
                download="Nevika Cura.apk"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-teal-600 font-bold rounded-full hover:bg-teal-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
                data-testid="download-apk-btn"
              >
                <Download className="w-5 h-5" />
                Download Android App
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Floating Install Button - Shows when banner is dismissed but app is installable */}
      {installPrompt && !showInstallBanner && !isStandalone && (
        <button
          onClick={handleInstallApp}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full shadow-2xl hover:shadow-xl hover:scale-105 transition-all animate-bounce-slow"
          data-testid="floating-install-btn"
        >
          <Download className="w-5 h-5" />
          <span className="font-semibold text-sm">Install App</span>
        </button>
      )}

      {/* Footer */}
      <Footer />

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      
      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <Settings className="w-5 h-5 text-[#5FA8D3]" />
              Settings
            </DialogTitle>
            <DialogDescription>
              Customize your app experience
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ViewModeSettings />
          </div>
        </DialogContent>
      </Dialog>

      {/* Book Appointment Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-rose-500 p-6 text-white">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Book Now
            </DialogTitle>
            <DialogDescription className="text-white/80 mt-1">
              Choose your booking type
            </DialogDescription>
          </div>
          <div className="p-6 space-y-4">
            {/* Doctor Appointment */}
            <button
              onClick={() => {
                setShowBookingModal(false);
                navigate('/diagyn');
              }}
              className="w-full p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-2xl border border-blue-100 flex items-center gap-4 transition-all group"
              data-testid="book-doctor-btn"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Stethoscope className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-bold text-slate-800">Doctor Appointment</h3>
                <p className="text-sm text-slate-500">Consult with our specialists</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>
            
            {/* Sonography */}
            <button
              onClick={() => {
                setShowBookingModal(false);
                navigate('/diagyn?service=sonography');
              }}
              className="w-full p-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-2xl border border-purple-100 flex items-center gap-4 transition-all group"
              data-testid="book-sonography-btn"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Baby className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-bold text-slate-800">Sonography</h3>
                <p className="text-sm text-slate-500">Ultrasound & imaging scans</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation - Mobile Only - Using Portal for proper fixed positioning */}
      {typeof document !== 'undefined' && createPortal(
        <nav className={`md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 z-[9999] pb-safe transition-transform duration-300 ${
          isScrolling ? 'translate-y-full' : 'translate-y-0'
        }`}>
          <div className="flex items-center justify-around py-2 px-4">
            {/* Option B: Single-colored icons, active icon becomes colorful */}
            
            {/* Home */}
            <button
              onClick={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex flex-col items-center gap-1 px-2 py-1.5 transition-all"
              data-testid="nav-home"
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                activeTab === 'home' 
                  ? 'bg-teal-500 shadow-lg shadow-teal-500/40 scale-110' 
                  : 'bg-slate-100'
              }`}>
                <HomeIcon className={`w-5 h-5 ${activeTab === 'home' ? 'text-white' : 'text-slate-500'}`} />
              </div>
              <span className={`text-[10px] font-semibold ${activeTab === 'home' ? 'text-teal-600' : 'text-slate-500'}`}>Home</span>
            </button>
            
            {/* Pharmacy */}
            <button
              onClick={() => {
                setActiveTab('pharmacy');
                window.location.href = '/pharmacy';
              }}
              className="flex flex-col items-center gap-1 px-2 py-1.5 transition-all"
              data-testid="nav-pharmacy"
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                activeTab === 'pharmacy' 
                  ? 'bg-orange-500 shadow-lg shadow-orange-500/40 scale-110' 
                  : 'bg-slate-100'
              }`}>
                <Pill className={`w-5 h-5 ${activeTab === 'pharmacy' ? 'text-white' : 'text-slate-500'}`} />
              </div>
              <span className={`text-[10px] font-semibold ${activeTab === 'pharmacy' ? 'text-orange-600' : 'text-slate-500'}`}>Pharmacy</span>
            </button>
            
            {/* Book - Center (Always prominent) */}
            <button
              onClick={() => setShowBookingModal(true)}
              className="relative -mt-4 flex flex-col items-center"
              data-testid="nav-book-appointment"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/40 hover:scale-105 transition-all ring-3 ring-white">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <span className="mt-1 text-[10px] font-bold text-rose-600">Book</span>
            </button>
            
            {/* Lab Tests */}
            <button
              onClick={() => {
                setActiveTab('lab');
                window.location.href = '/mango';
              }}
              className="flex flex-col items-center gap-1 px-2 py-1.5 transition-all"
              data-testid="nav-lab"
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                activeTab === 'lab' 
                  ? 'bg-purple-500 shadow-lg shadow-purple-500/40 scale-110' 
                  : 'bg-slate-100'
              }`}>
                <TestTube className={`w-5 h-5 ${activeTab === 'lab' ? 'text-white' : 'text-slate-500'}`} />
              </div>
              <span className={`text-[10px] font-semibold ${activeTab === 'lab' ? 'text-purple-600' : 'text-slate-500'}`}>Lab Tests</span>
            </button>
            
            {/* Login/Profile */}
            <button
              onClick={() => {
                setActiveTab('profile');
                window.location.href = '/patient-portal';
              }}
              className="flex flex-col items-center gap-1 px-2 py-1.5 transition-all"
              data-testid="nav-profile"
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                activeTab === 'profile' 
                  ? 'bg-blue-500 shadow-lg shadow-blue-500/40 scale-110' 
                  : 'bg-slate-100'
              }`}>
                <User className={`w-5 h-5 ${activeTab === 'profile' ? 'text-white' : 'text-slate-500'}`} />
              </div>
              <span className={`text-[10px] font-semibold ${activeTab === 'profile' ? 'text-blue-600' : 'text-slate-500'}`}>{user ? 'Profile' : 'Login'}</span>
            </button>
          </div>
        </nav>,
        document.body
      )}
      
      {/* Bottom padding for mobile nav */}
      <div className="md:hidden h-20"></div>
    </div>
  );
};

export default Home;
