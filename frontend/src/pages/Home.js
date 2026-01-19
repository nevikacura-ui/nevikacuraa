import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useViewMode } from '@/context/ViewModeContext';
import { ViewModeSwitcher, ViewModeSettings } from '@/components/ViewModeSwitcher';
import { toast } from 'sonner';
import { User, Menu, X, Download, Smartphone, Search, Heart, FlaskConical, Video, Gift, Lightbulb, AlertTriangle, Activity, Pill, Shield, Package, ChevronRight, Stethoscope, Baby, ThermometerSun, Users, HandHeart, Sparkles, ArrowRight, Calendar, Clock, ChevronLeft, Sun, Moon, Sunrise, Star, Quote, Flame, Trophy, Target, Zap, Timer, MapPin, Phone, Award, CheckCircle2, Settings } from 'lucide-react';
import Footer from '@/components/Footer';

// Health Tips Data - Rotates daily
const healthTips = [
  { tip: "Stay hydrated! Drink at least 8 glasses of water daily for optimal health.", icon: "💧", category: "Hydration" },
  { tip: "A 30-minute walk can boost your mood and improve cardiovascular health.", icon: "🚶", category: "Exercise" },
  { tip: "Get 7-9 hours of quality sleep to help your body repair and rejuvenate.", icon: "😴", category: "Sleep" },
  { tip: "Include colorful vegetables in every meal for essential vitamins and minerals.", icon: "🥗", category: "Nutrition" },
  { tip: "Practice deep breathing for 5 minutes daily to reduce stress and anxiety.", icon: "🧘", category: "Mental Health" },
  { tip: "Regular health check-ups can detect problems early when they're easier to treat.", icon: "🩺", category: "Prevention" },
  { tip: "Limit screen time before bed to improve sleep quality.", icon: "📱", category: "Digital Wellness" },
  { tip: "Wash your hands frequently to prevent the spread of infections.", icon: "🧼", category: "Hygiene" },
  { tip: "Take short breaks every hour if you work at a desk to prevent strain.", icon: "⏰", category: "Work Health" },
  { tip: "Laugh often! It reduces stress hormones and boosts immune function.", icon: "😄", category: "Mental Health" },
  { tip: "Eat breakfast within an hour of waking to kickstart your metabolism.", icon: "🍳", category: "Nutrition" },
  { tip: "Maintain good posture to prevent back pain and improve breathing.", icon: "🧍", category: "Posture" }
];

// Service Spotlight Data
const spotlightServices = [
  {
    id: 'diagyn-appointment',
    title: 'Book Appointment',
    subtitle: 'DiaGyn Healthcare',
    description: 'Skip the queue! Book your doctor appointment online in just 2 minutes',
    cta: 'Book Now',
    path: '/diagyn',
    gradient: 'from-teal-500 to-cyan-500',
    bgImage: 'from-teal-50 to-cyan-100'
  },
  {
    id: 'diagyn-spotlight',
    title: 'Women\'s Health Week',
    subtitle: 'Special consultations at DiaGyn',
    description: 'Comprehensive gynecological care with experienced specialists',
    cta: 'Book Now',
    path: '/diagyn',
    gradient: 'from-pink-500 to-rose-500',
    bgImage: 'from-pink-50 to-rose-100'
  },
  {
    id: 'proton-spotlight',
    title: 'Full Body Checkup',
    subtitle: 'Proton Diagnostics',
    description: 'Complete health screening with 50+ tests at special rates',
    cta: 'View Packages',
    path: '/proton',
    gradient: 'from-blue-500 to-cyan-500',
    bgImage: 'from-blue-50 to-cyan-100'
  },
  {
    id: 'pharmacy-spotlight',
    title: 'Medicine Delivery',
    subtitle: 'Orange Pharmacy',
    description: 'Get your prescriptions delivered within 2 hours',
    cta: 'Order Now',
    path: '/pharmacy',
    gradient: 'from-orange-500 to-amber-500',
    bgImage: 'from-orange-50 to-amber-100'
  },
  {
    id: 'glydex-spotlight',
    title: 'Diabetes Management',
    subtitle: 'Glydex Program',
    description: 'Personalized care plans for better glucose control',
    cta: 'Learn More',
    path: '/glydex',
    gradient: 'from-teal-500 to-emerald-500',
    bgImage: 'from-teal-50 to-emerald-100'
  }
];

// Testimonials Data
const testimonials = [
  {
    id: 1,
    name: "Priya Sharma",
    location: "Mumbai",
    rating: 5,
    text: "Nevika Cura has transformed how I manage my family's health. The medicine delivery is super quick, and booking appointments is so easy!",
    service: "DiaGyn Healthcare",
    avatar: "PS"
  },
  {
    id: 2,
    name: "Rahul Mehta",
    location: "Thane",
    rating: 5,
    text: "The Glydex diabetes program helped me control my sugar levels better than ever. The personalized care plan made all the difference.",
    service: "Glydex",
    avatar: "RM"
  },
  {
    id: 3,
    name: "Anjali Patel",
    location: "Vasai",
    rating: 5,
    text: "As a new mother, Evara's women wellness programs have been invaluable. The doctors are caring and the app makes everything convenient.",
    service: "Evara",
    avatar: "AP"
  },
  {
    id: 4,
    name: "Suresh Kumar",
    location: "Bhayandar",
    rating: 5,
    text: "Got my full body checkup done at Proton. Professional staff, quick results, and the health dashboard helps me track everything.",
    service: "Proton Diagnostics",
    avatar: "SK"
  }
];

// Why Choose Us Data
const whyChooseUs = [
  { icon: Trophy, value: '20+', label: 'Years Experience', color: 'from-amber-400 to-orange-500' },
  { icon: Users, value: '50,000+', label: 'Happy Patients', color: 'from-blue-400 to-cyan-500' },
  { icon: Clock, value: 'Same Day', label: 'Appointments', color: 'from-teal-400 to-emerald-500' },
  { icon: Shield, value: '24/7', label: 'Support Available', color: 'from-purple-400 to-pink-500' }
];

// Featured Doctors Data - Only clinic-associated doctors
const featuredDoctors = [
  {
    id: 1,
    name: 'Dr. Vikas Jha',
    specialization: 'Physician & Diabetologist',
    experience: '',
    qualification: 'M.B.B.S (Mumbai), C. Diabetology (Delhi), Dip. in Diabetology (UK)',
    image: null,
    avatar: 'VJ',
    color: 'from-teal-400 to-emerald-500',
    clinic: 'DiaGyn Healthcare'
  },
  {
    id: 2,
    name: 'Dr. Neha Patel',
    specialization: 'Obstetrician & Gynaecologist',
    experience: 'Infertility Specialist & Laproscopic Surgeon',
    qualification: 'M.B.B.S (Mumbai), DGO (Mumbai), FMAS (Delhi)',
    image: null,
    avatar: 'NP',
    color: 'from-pink-400 to-rose-500',
    clinic: 'DiaGyn Healthcare'
  }
];

// Certifications Data
const certifications = [
  { name: 'Govt Registered Clinic', fullName: 'Government Registered Healthcare Facility', color: 'bg-teal-100 text-teal-700' },
  { name: 'Govt Certified Sonography Centre', fullName: 'Government Registered Sonography Facility', color: 'bg-blue-100 text-blue-700' },
  { name: 'CAP Certified Lab', fullName: 'College of American Pathologists Certified', color: 'bg-purple-100 text-purple-700' },
  { name: 'FSSAI Approved Pharmacy', fullName: 'Food Safety and Standards Authority of India Approved', color: 'bg-orange-100 text-orange-700' },
  { name: 'ISO 9001', fullName: 'Quality Management Certified', color: 'bg-green-100 text-green-700' }
];

// How It Works Steps
const howItWorksSteps = [
  {
    step: 1,
    title: 'Book',
    description: 'Choose service & schedule online',
    icon: Calendar,
    color: 'from-teal-400 to-cyan-500'
  },
  {
    step: 2,
    title: 'Visit or Deliver',
    description: 'Visit clinic or doorstep delivery',
    icon: Stethoscope,
    color: 'from-blue-400 to-indigo-500'
  },
  {
    step: 3,
    title: 'Get Healthy',
    description: 'Track your health journey',
    icon: Heart,
    color: 'from-pink-400 to-rose-500'
  }
];

// Clinic Locations - Updated addresses from live queue
const clinicLocations = [
  {
    id: 'pushpa',
    name: 'Pushpa Clinic',
    logo: 'https://customer-assets.emergentagent.com/job_medhealth-portal/artifacts/x55478bz_5_20260102_012214_0001.png',
    address: 'A-1, Sai Darshan, Near Don Bosco High School',
    city: 'Naigaon East, Maharashtra',
    phone: '+91 9403890429',
    hours: '11 AM - 2 PM, 6 PM - 10 PM',
    mapLink: 'https://maps.google.com/?q=Pushpa+Clinic+Naigaon',
    services: ['Consultations', 'Sonography', 'Lab Tests']
  },
  {
    id: 'amnion',
    name: 'Amnion General & Speciality Clinic',
    logo: 'https://customer-assets.emergentagent.com/job_medhealth-portal/artifacts/jc4rkjh4_9_20260102_012214_0005.png',
    address: 'G-7, Rashmi Star City Phase 5, Opp Thakur School',
    city: 'Naigaon East, Maharashtra',
    phone: '+91 9403890429',
    hours: '11 AM - 2 PM, 6 PM - 10 PM',
    mapLink: 'https://maps.google.com/?q=Amnion+Clinic+Naigaon',
    services: ['Consultations', 'Pharmacy', 'Diagnostics']
  }
];

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isMobile, isTablet, isDesktop, getResponsiveClasses } = useViewMode();
  const [showAuth, setShowAuth] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
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
    { clinic: 'Proton', waitTime: '~0 min', patients: 0, status: 'low' }
  ]);
  
  // PWA Install Prompt
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  
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
        const clinics = ['diagyn', 'proton'];
        const results = [];
        
        for (const clinic of clinics) {
          try {
            const response = await fetch(`${API}/api/live-queue/status/${clinic}`);
            if (response.ok) {
              const data = await response.json();
              results.push({
                clinic: clinic === 'diagyn' ? 'DiaGyn' : 'Proton',
                waitTime: `~${data.estimated_wait || 0} min`,
                patients: data.waiting || 0,
                status: (data.waiting || 0) > 5 ? 'high' : (data.waiting || 0) > 2 ? 'moderate' : 'low'
              });
            }
          } catch (e) {
            // Use default for this clinic
            results.push({
              clinic: clinic === 'diagyn' ? 'DiaGyn' : 'Proton',
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
  const services = [
    {
      id: 'diagyn',
      name: 'DiaGyn Healthcare',
      logo: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/e4jrn2os_6_20260107_021040_0003.jpg',
      path: '/diagyn',
      bgColor: '#ffffff', // White to match logo bg
      isDark: false
    },
    {
      id: 'proton',
      name: 'Proton Diagnostics',
      logo: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/saez5270_5_20260107_021040_0002.jpg',
      path: '/proton',
      bgColor: '#ffffff', // White to match logo bg
      isDark: false
    },
    {
      id: 'pharmacy',
      name: 'Orange Pharmacy',
      logo: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/n45xwyrx_3_20260107_021040_0000.jpg',
      path: '/pharmacy',
      bgColor: '#ffffff', // White to match logo bg
      isDark: false
    },
    {
      id: 'evara',
      name: 'Evara',
      logo: '/icons/evara-logo.png',
      path: '/evara',
      bgColor: '#511b63', // Purple to match logo bg
      isDark: true,
      fillLogo: true,
      logoScale: 0.85 // Slightly smaller to match other cards
    },
    {
      id: 'glydex',
      name: 'Glydex',
      logo: '/glydex-logo.png',
      path: '/glydex',
      bgColor: '#121f33', // Dark navy to match logo bg
      isDark: true,
      fillLogo: true
    },
    {
      id: 'alyne',
      name: 'ALYNE',
      logo: 'https://customer-assets.emergentagent.com/job_alynehealth/artifacts/llhgc3hn_Blue%20White%20Professional%20Minimal%20Brand%20Logo_20260114_042449_0002.png',
      path: '/alyne',
      bgColor: '#0a1628', // Dark to match logo bg
      isDark: true,
      fillLogo: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 relative overflow-hidden" style={{ contentVisibility: 'auto' }}>
      {/* Floating Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-20 -left-32 w-96 h-96 bg-gradient-to-br from-violet-200/40 to-fuchsia-200/40 rounded-full blur-3xl animate-pulse" style={{animationDuration: '8s'}}></div>
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-gradient-to-br from-teal-200/40 to-cyan-200/40 rounded-full blur-3xl animate-pulse" style={{animationDuration: '10s', animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-br from-orange-200/30 to-amber-200/30 rounded-full blur-3xl animate-pulse" style={{animationDuration: '12s', animationDelay: '4s'}}></div>
        <div className="absolute -bottom-20 right-1/4 w-64 h-64 bg-gradient-to-br from-pink-200/30 to-rose-200/30 rounded-full blur-3xl animate-pulse" style={{animationDuration: '9s', animationDelay: '1s'}}></div>
      </div>

      {/* Header - Glassmorphism */}
      <header className="border-b border-white/50 bg-white/60 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Logo on left */}
            <div className="flex items-center">
              <img 
                src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
                alt="Nevika Cura" 
                className="h-14 sm:h-16 w-auto object-contain"
                data-testid="main-logo"
                loading="eager"
                fetchPriority="high"
              />
            </div>
            
            {/* Navigation on right */}
            <div className="hidden md:flex items-center gap-3">
              {/* View Mode Switcher */}
              <ViewModeSwitcher compact />
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/track')}
                data-testid="track-orders-button"
                className="font-medium rounded-full hover:bg-slate-100"
              >
                <Search className="w-4 h-4 mr-2" />
                Track Orders
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/patient-portal')}
                data-testid="patient-portal-button"
                className="font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                My Records
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/senior-care')}
                data-testid="give-back-button"
                className="font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-full"
              >
                <HandHeart className="w-4 h-4 mr-2" />
                Give Back
              </Button>
              {user ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/profile')}
                    data-testid="profile-button"
                    className="font-medium rounded-full hover:bg-slate-100"
                  >
                    <User className="w-4 h-4 mr-2" />
                    {user.name}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    data-testid="settings-button"
                    className="rounded-full hover:bg-slate-100"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={logout}
                    data-testid="logout-button"
                    className="rounded-full border-slate-200"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button 
                  size="sm"
                  onClick={() => setShowAuth(true)} 
                  data-testid="login-button"
                  className="rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-lg shadow-teal-500/25 transition-all duration-300"
                >
                  Login / Sign Up
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-xl bg-white/50 hover:bg-white/80 transition-colors"
              onClick={() => setShowMenu(!showMenu)}
              data-testid="mobile-menu-button"
            >
              {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu - Glassmorphism */}
      {showMenu && (
        <div className="md:hidden fixed top-24 left-4 right-4 bg-white/90 backdrop-blur-xl border border-white/50 shadow-xl rounded-2xl z-40 p-4 space-y-2" data-testid="mobile-menu">
          <Button 
            variant="ghost" 
            onClick={() => { navigate('/track'); setShowMenu(false); }}
            className="w-full justify-start rounded-xl"
          >
            <Search className="w-4 h-4 mr-2" />
            Track Orders
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => { navigate('/senior-care'); setShowMenu(false); }}
            className="w-full justify-start text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl"
          >
            <HandHeart className="w-4 h-4 mr-2" />
            Give Back
          </Button>
          {user ? (
            <>
              <Button 
                variant="ghost" 
                onClick={() => { navigate('/profile'); setShowMenu(false); }}
                className="w-full justify-start rounded-xl"
              >
                <User className="w-4 h-4 mr-2" />
                {user.name}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => { setShowSettings(true); setShowMenu(false); }}
                className="w-full justify-start rounded-xl"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button 
                variant="outline" 
                onClick={() => { logout(); setShowMenu(false); }}
                className="w-full rounded-xl"
              >
                Logout
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => { setShowAuth(true); setShowMenu(false); }}
              className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500"
            >
              Login / Sign Up
            </Button>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">

        {/* Welcome Message - For all users */}
        <div className="mb-6 text-center md:text-left">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
            Welcome to Nevika Cura 🏥
          </h2>
          <p className="text-slate-600">Your trusted partner for complete healthcare services</p>
        </div>

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

        {/* Services Grid - Seamless Logo & Background */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center md:text-left">Our Services</h2>
          
          {/* Responsive Grid: Mobile=2cols, Tablet=3cols (larger cards), Desktop=6cols */}
          <div className={`grid gap-4 md:gap-5 ${
            isMobile ? 'grid-cols-2' : 
            isTablet ? 'grid-cols-3' : 
            'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
          }`}>
            {services.map((service) => (
              <div
                key={service.id}
                className={`group relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl ${
                  service.isDark ? 'shadow-lg' : 'shadow-md border border-gray-100'
                }`}
                style={{ backgroundColor: service.bgColor }}
                onClick={() => navigate(service.path)}
                data-testid={`service-card-${service.id}`}
              >
                {/* Decorative circles */}
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-150 ${
                  service.isDark ? 'bg-white/10' : 'bg-gray-100/50'
                }`}></div>
                <div className={`absolute bottom-0 left-0 w-20 h-20 rounded-full -ml-10 -mb-10 transition-transform duration-500 group-hover:scale-150 ${
                  service.isDark ? 'bg-white/10' : 'bg-gray-100/50'
                }`}></div>
                
                {/* Card Content - Tablet has larger cards */}
                <div className={`relative h-full flex flex-col ${
                  isTablet ? 'min-h-[280px]' : 'min-h-[200px] sm:min-h-[240px]'
                }`}>
                  {/* Logo - Fill entire card for fillLogo items */}
                  {service.fillLogo ? (
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                      <img 
                        src={service.logo} 
                        alt={service.name} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        style={service.logoScale ? { transform: `scale(${service.logoScale})` } : {}}
                        data-testid={`service-logo-${service.id}`}
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-3">
                      <img 
                        src={service.logo} 
                        alt={service.name} 
                        className={`w-auto object-contain transition-transform duration-300 group-hover:scale-105 ${
                          isTablet ? 'h-28' : 'h-20 sm:h-24'
                        }`}
                        data-testid={`service-logo-${service.id}`}
                        loading="lazy"
                      />
                    </div>
                  )}
                  
                  {/* Explore Button - Larger on tablet */}
                  <div className={`${service.fillLogo ? 'absolute bottom-0 left-0 right-0 p-3' : 'mt-auto p-3 pt-0'}`}>
                    <Button
                      onClick={(e) => { e.stopPropagation(); navigate(service.path); }}
                      data-testid={`service-button-${service.id}`}
                      className={`w-full rounded-xl font-semibold transition-all duration-300 relative z-10 shadow-lg ${
                        isTablet ? 'py-5 text-base' : 'py-4'
                      } ${
                        service.isDark 
                          ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30' 
                          : 'bg-slate-800 hover:bg-slate-900 text-white'
                      }`}
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
            {whyChooseUs.map((item, idx) => (
              <div 
                key={idx}
                className="relative group p-6 bg-white/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-lg transition-all text-center overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
                <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{item.value}</p>
                <p className="text-sm text-slate-500">{item.label}</p>
              </div>
            ))}
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

        {/* Our Clinics */}
        <div className="mb-16" data-testid="clinic-locations">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Our Clinic Locations</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {clinicLocations.map((clinic) => (
              <div 
                key={clinic.id}
                className="bg-white/70 backdrop-blur-xl rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Clinic Logo */}
                <div className="h-24 bg-white flex items-center justify-center p-3">
                  <img 
                    src={clinic.logo} 
                    alt={clinic.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                
                <div className="p-3">
                  <h3 className="font-bold text-sm text-slate-800 mb-1">{clinic.name}</h3>
                  <div className="space-y-1 text-xs">
                    <p className="text-slate-600 flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                      {clinic.address}, {clinic.city}
                    </p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {clinic.phone}
                    </p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {clinic.hours}
                    </p>
                  </div>
                  
                  <a 
                    href={clinic.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
                  >
                    <MapPin className="w-3 h-3" />
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
    </div>
  );
};

const AuthModal = ({ open, onClose }) => {
  const { sendAuthOtp, verifyAuthOtp, loginWithOtp, registerWithOtp, login, fetchUser, biometricAvailable, biometricEnabled, loginWithBiometric } = useAuth();
  const [loading, setLoading] = useState(false);
  // Steps: method-select, email-otp, email-otp-verify, phone-otp, phone-otp-verify, password-login, register, interests, password-failed
  const [step, setStep] = useState('method-select');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [mockOtp, setMockOtp] = useState('');
  const [otpMethod, setOtpMethod] = useState(''); // 'email' or 'sms' or 'mock'
  const [userExists, setUserExists] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verificationToken, setVerificationToken] = useState('');
  const [passwordLogin, setPasswordLogin] = useState({ email: '', password: '', rememberMe: true });
  const [registerForm, setRegisterForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [authMethod, setAuthMethod] = useState(''); // 'email-otp', 'password', 'phone-otp', 'google', 'biometric'
  const [loginError, setLoginError] = useState('');
  const otpRefs = React.useRef([]);
  const API = process.env.REACT_APP_BACKEND_URL;

  // Available interests
  const availableInterests = [
    { id: 'evara', name: 'Evara', description: "Women's Wellness & Care", icon: '🌸', color: 'pink' },
    { id: 'glydex', name: 'Glydex', description: 'Diabetes Care Portal', icon: '💚', color: 'teal' },
    { id: 'diagyn', name: 'DiaGyn Healthcare', description: 'Doctor Appointments', icon: '👨‍⚕️', color: 'blue' },
    { id: 'proton', name: 'Proton Diagnostics', description: 'Lab Tests & Checkups', icon: '🔬', color: 'indigo' },
    { id: 'pharmacy', name: 'Orange Pharmacy', description: 'Medicine Orders', icon: '💊', color: 'orange' },
  ];

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setStep('method-select');
      setEmail('');
      setPhone('');
      setOtp(['', '', '', '', '', '']);
      setMockOtp('');
      setUserExists(false);
      setResendTimer(0);
      setVerificationToken('');
      setPasswordLogin({ email: '', password: '', rememberMe: true });
      setRegisterForm({ name: '', phone: '', email: '', password: '' });
      setSelectedInterests([]);
      setAuthMethod('');
      setLoginError('');
    }
  }, [open]);

  // Send Email OTP for signup/login
  const handleSendEmailOtp = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/auth/email-otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (data.success) {
        setOtpMethod(data.method || 'email');
        if (data.mock_otp) setMockOtp(data.mock_otp);
        setStep('email-otp-verify');
        setResendTimer(60);
        toast.success('Verification code sent to your email!');
      } else {
        toast.error(data.detail || 'Failed to send OTP');
      }
    } catch (error) {
      toast.error('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };
  
  // Send Phone SMS OTP
  const handleSendPhoneOtp = async (e) => {
    e.preventDefault();
    if (!phone || phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    try {
      const response = await sendAuthOtp(phone);
      setOtpMethod(response.method || 'sms');
      if (response.mock_otp) setMockOtp(response.mock_otp);
      setStep('phone-otp-verify');
      setResendTimer(30);
      toast.success(response.method === 'sms' ? 'OTP sent to your phone!' : 'OTP generated!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Verify Email OTP
  const handleVerifyEmailOtp = async (otpString) => {
    if (otpString.length !== 6) return;
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/auth/email-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpString })
      });
      const data = await response.json();
      if (data.success && data.verified) {
        setVerificationToken(data.verification_token);
        setUserExists(data.user_exists);
        if (data.user_exists) {
          // User exists - login directly with email OTP (passwordless)
          try {
            const loginRes = await fetch(`${API}/api/auth/email-otp/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, verification_token: data.verification_token })
            });
            const loginData = await loginRes.json();
            if (loginRes.ok && loginData.token) {
              localStorage.setItem('token', loginData.token);
              if (fetchUser) await fetchUser();
              toast.success('Logged in successfully!');
              onClose();
            } else {
              // Fall back to password login
              setPasswordLogin({ ...passwordLogin, email });
              setStep('password-login');
              toast.success('Account found! Please enter your password.');
            }
          } catch (err) {
            setPasswordLogin({ ...passwordLogin, email });
            setStep('password-login');
            toast.success('Account found! Please enter your password.');
          }
        } else {
          // New user - go to registration
          setRegisterForm({ ...registerForm, email });
          setStep('register');
          toast.success('Email verified! Complete your registration.');
        }
      } else {
        toast.error(data.detail || 'Invalid verification code');
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };
  
  // Verify Phone SMS OTP
  const handleVerifyPhoneOtp = async (otpString) => {
    if (otpString.length !== 6) return;
    setLoading(true);
    try {
      const response = await verifyAuthOtp(phone, otpString);
      setUserExists(response.user_exists);
      if (response.verification_token) {
        setVerificationToken(response.verification_token);
      }
      
      if (response.user_exists) {
        // User exists - login directly
        await loginWithOtp(phone, otpString);
        toast.success('Logged in successfully!');
        onClose();
      } else {
        // New user - show registration form
        setRegisterForm({ ...registerForm, phone });
        setStep('register');
        toast.success('Phone verified! Complete your registration.');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!passwordLogin.email || !passwordLogin.password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    setLoginError('');
    try {
      await login(passwordLogin.email, passwordLogin.password, passwordLogin.rememberMe);
      toast.success('Login successful!');
      onClose();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Login failed. Check your password.';
      setLoginError(errorMsg);
      toast.error(errorMsg);
      // Show password-failed step with SMS OTP option
      setStep('password-failed');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle Biometric login
  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      await loginWithBiometric();
      toast.success('Logged in with biometric!');
      onClose();
    } catch (error) {
      toast.error('Biometric login failed. Please try another method.');
    } finally {
      setLoading(false);
    }
  };

  // Complete Registration
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    if (!registerForm.name || !registerForm.password) {
      toast.error('Please fill all required fields');
      return;
    }
    // Require either email or phone
    if (!registerForm.email && !registerForm.phone && !email && !phone) {
      toast.error('Email or phone is required');
      return;
    }
    setLoading(true);
    try {
      const regEmail = registerForm.email || email;
      const regPhone = registerForm.phone || phone;
      
      const response = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerForm.name,
          email: regEmail,
          password: registerForm.password,
          phone: regPhone,
          verification_token: verificationToken
        })
      });
      const data = await response.json();
      if (response.ok) {
        // Auto-login after registration
        try {
          await login(regEmail, registerForm.password);
          toast.success('Account created! Now customize your experience.');
          setStep('interests');
        } catch (loginErr) {
          toast.success('Account created! Please login.');
          setPasswordLogin({ email: regEmail, password: '' });
          setStep('password-login');
        }
      } else {
        toast.error(data.detail || 'Registration failed');
      }
    } catch (error) {
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle saving interests
  const handleSaveInterests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/user/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          interests: selectedInterests,
          onboarding_complete: true
        })
      });
      
      if (response.ok) {
        toast.success('Preferences saved! Welcome to Nevika Cura.');
        if (fetchUser) await fetchUser();
        onClose();
      } else {
        toast.error('Failed to save preferences');
      }
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interestId) => {
    setSelectedInterests(prev => 
      prev.includes(interestId) 
        ? prev.filter(i => i !== interestId)
        : [...prev, interestId]
    );
  };

  // Resend timer
  React.useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter complete 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const response = await verifyAuthOtp(phone, otpValue);
      setUserExists(response.user_exists);
      
      // Store verification token for registration
      if (response.verification_token) {
        setVerificationToken(response.verification_token);
      }
      
      if (response.user_exists) {
        // User exists - login directly
        await loginWithOtp(phone, otpValue);
        toast.success('Logged in successfully!');
        onClose();
      } else {
        // New user - show registration form
        setStep('register');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const otpValue = otp.join('');
    try {
      await registerWithOtp(
        phone,
        otpValue,
        formData.get('email'),
        formData.get('password'),
        formData.get('name'),
        verificationToken  // Pass the verification token
      );
      toast.success('Account created successfully!');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const response = await sendAuthOtp(phone);
      setMockOtp(response.mock_otp || '');
      setOtpMethod(response.method || 'mock');
      setOtp(['', '', '', '', '', '']);
      setResendTimer(30);
      toast.success(response.method === 'sms' ? 'OTP sent to your phone!' : 'OTP resent successfully!');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="auth-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            {step === 'interests' ? 'Customize Your Experience' : 'Welcome to Nevika Cura'}
          </DialogTitle>
          <DialogDescription className="font-body">
            {step === 'method-select' && 'Choose how you want to sign in'}
            {step === 'email-otp' && 'Enter your email to receive a verification code'}
            {step === 'email-otp-verify' && 'Enter the verification code sent to your email'}
            {step === 'phone-otp' && 'Enter your phone number to receive an SMS'}
            {step === 'phone-otp-verify' && 'Enter the verification code sent to your phone'}
            {step === 'register' && 'Complete your registration'}
            {step === 'password-login' && 'Enter your password to login'}
            {step === 'interests' && 'Select the services you\'re interested in'}
          </DialogDescription>
        </DialogHeader>

        {/* Method Selection - Primary Step */}
        {step === 'method-select' && (
          <div className="space-y-4">
            {/* Email OTP - Most Preferred */}
            <button
              onClick={() => {
                setAuthMethod('email-otp');
                setStep('email-otp');
              }}
              className="w-full p-4 border-2 border-teal-200 bg-teal-50 rounded-xl hover:border-teal-400 hover:bg-teal-100 transition-all text-left group"
              data-testid="auth-method-email-otp"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-lg group-hover:bg-teal-200">
                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Email + OTP</p>
                  <p className="text-xs text-gray-500">Recommended • No password needed</p>
                </div>
                <span className="ml-auto bg-teal-500 text-white text-xs px-2 py-1 rounded-full">Best</span>
              </div>
            </button>
            
            {/* Email + Password */}
            <button
              onClick={() => {
                setAuthMethod('password');
                setStep('password-login');
              }}
              className="w-full p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
              data-testid="auth-method-password"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Email + Password</p>
                  <p className="text-xs text-gray-500">Traditional login</p>
                </div>
              </div>
            </button>
            
            {/* Phone OTP - Least Preferred */}
            <button
              onClick={() => {
                setAuthMethod('phone-otp');
                setStep('phone-otp');
              }}
              className="w-full p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all text-left opacity-80"
              data-testid="auth-method-phone-otp"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Phone + SMS OTP</p>
                  <p className="text-xs text-gray-500">SMS charges may apply</p>
                </div>
              </div>
            </button>
            
            {/* Biometric Login - Only show if available and enabled */}
            {biometricAvailable && biometricEnabled && (
              <button
                onClick={handleBiometricLogin}
                disabled={loading}
                className="w-full p-4 border-2 border-purple-200 bg-purple-50 rounded-xl hover:border-purple-400 hover:bg-purple-100 transition-all text-left"
                data-testid="auth-method-biometric"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Use Fingerprint / Face ID</p>
                    <p className="text-xs text-gray-500">Quick biometric login</p>
                  </div>
                </div>
              </button>
            )}
            
            <p className="text-xs text-center text-gray-400 mt-2">
              Email OTP is free and doesn't require SMS charges
            </p>
          </div>
        )}

        {/* Email OTP Entry */}
        {step === 'email-otp' && (
          <form onSubmit={handleSendEmailOtp} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required 
                data-testid="auth-email-input"
                className="h-12 rounded-xl"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full rounded-full h-12 bg-teal-600 hover:bg-teal-700" 
              disabled={loading || !email}
              data-testid="send-email-otp-button"
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </Button>
            <p className="text-xs text-center text-gray-500">
              We'll send a free verification code to your email
            </p>
            <div className="text-center">
              <button 
                type="button"
                onClick={() => setStep('method-select')}
                className="text-sm text-gray-500 hover:underline"
              >
                ← Back to login options
              </button>
            </div>
          </form>
        )}
        
        {/* Phone OTP Entry */}
        {step === 'phone-otp' && (
          <form onSubmit={handleSendPhoneOtp} className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">
                <strong>Note:</strong> SMS charges may apply. Email OTP is free!
              </p>
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium px-3 py-2 bg-gray-100 rounded-l-xl">+91</span>
                <Input 
                  id="phone" 
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number"
                  required 
                  data-testid="auth-phone-input"
                  className="h-12 rounded-r-xl rounded-l-none flex-1"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full rounded-full h-12" 
              disabled={loading || phone.length !== 10}
              data-testid="send-phone-otp-button"
            >
              {loading ? 'Sending...' : 'Send OTP via SMS'}
            </Button>
            <div className="text-center">
              <button 
                type="button"
                onClick={() => setStep('method-select')}
                className="text-sm text-gray-500 hover:underline"
              >
                ← Back to login options
              </button>
            </div>
          </form>
        )}

        {/* Email OTP Verification */}
        {step === 'email-otp-verify' && (
          <div className="space-y-4">
            {otpMethod === 'mock' && mockOtp && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  <strong>Test Mode:</strong> Your verification code is <span className="font-mono font-bold">{mockOtp}</span>
                </p>
              </div>
            )}
            <p className="text-sm text-gray-600 text-center">
              Code sent to <strong>{email}</strong>
            </p>
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (otpRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => {
                    handleOtpChange(index, e.target.value);
                    if (e.target.value && index < 5) {
                      otpRefs.current[index + 1]?.focus();
                    }
                    // Auto verify when complete
                    const newOtp = [...otp];
                    newOtp[index] = e.target.value;
                    if (newOtp.join('').length === 6) {
                      handleVerifyEmailOtp(newOtp.join(''));
                    }
                  }}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl"
                  data-testid={`otp-input-${index}`}
                />
              ))}
            </div>
            <div className="flex justify-between items-center">
              <button 
                onClick={() => {
                  setStep('email-otp');
                  setOtp(['', '', '', '', '', '']);
                }} 
                className="text-sm text-gray-500 hover:underline"
              >
                Change email
              </button>
              <button 
                onClick={async () => {
                  if (resendTimer > 0) return;
                  setLoading(true);
                  try {
                    const response = await fetch(`${API}/api/auth/email-otp/send`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email })
                    });
                    const data = await response.json();
                    if (data.mock_otp) setMockOtp(data.mock_otp);
                    setResendTimer(60);
                    toast.success('New code sent!');
                  } catch (error) {
                    toast.error('Failed to resend');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={resendTimer > 0 || loading}
                className="text-sm text-brand-teal hover:underline disabled:text-gray-400"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
              </button>
            </div>
          </div>
        )}
        
        {/* Phone OTP Verification */}
        {step === 'phone-otp-verify' && (
          <div className="space-y-4">
            {otpMethod === 'mock' && mockOtp && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  <strong>Test Mode:</strong> Your verification code is <span className="font-mono font-bold">{mockOtp}</span>
                </p>
              </div>
            )}
            <p className="text-sm text-gray-600 text-center">
              Code sent to <strong>+91 {phone}</strong>
            </p>
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (otpRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => {
                    handleOtpChange(index, e.target.value);
                    if (e.target.value && index < 5) {
                      otpRefs.current[index + 1]?.focus();
                    }
                    // Auto verify when complete
                    const newOtp = [...otp];
                    newOtp[index] = e.target.value;
                    if (newOtp.join('').length === 6) {
                      handleVerifyPhoneOtp(newOtp.join(''));
                    }
                  }}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl"
                  data-testid={`phone-otp-input-${index}`}
                />
              ))}
            </div>
            <div className="flex justify-between items-center">
              <button 
                onClick={() => {
                  setStep('phone-otp');
                  setOtp(['', '', '', '', '', '']);
                }} 
                className="text-sm text-gray-500 hover:underline"
              >
                Change number
              </button>
              <button 
                onClick={async () => {
                  if (resendTimer > 0) return;
                  await handleResendOtp();
                }}
                disabled={resendTimer > 0 || loading}
                className="text-sm text-brand-teal hover:underline disabled:text-gray-400"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>
          </div>
        )}

        {/* Registration Form */}
        {step === 'register' && (
          <form onSubmit={handleCompleteRegistration} className="space-y-4">
            {(email || registerForm.email) && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">✓ Email verified: <strong>{email || registerForm.email}</strong></p>
              </div>
            )}
            {(phone || registerForm.phone) && !email && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">✓ Phone verified: <strong>+91 {phone || registerForm.phone}</strong></p>
              </div>
            )}
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input 
                id="name" 
                value={registerForm.name}
                onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                placeholder="Enter your full name"
                required 
                className="h-12 rounded-xl"
                data-testid="register-name-input"
              />
            </div>
            {!email && (
              <div>
                <Label htmlFor="reg-email">Email Address *</Label>
                <Input 
                  id="reg-email" 
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                  placeholder="your@email.com"
                  required 
                  className="h-12 rounded-xl"
                />
              </div>
            )}
            {!phone && (
              <div>
                <Label htmlFor="reg-phone">Phone Number (Optional)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium px-3 py-2 bg-gray-100 rounded-l-xl">+91</span>
                  <Input 
                    id="reg-phone" 
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                    placeholder="For appointment SMS"
                    className="h-12 rounded-r-xl rounded-l-none flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Required only for appointment SMS notifications</p>
              </div>
            )}
            <div>
              <Label htmlFor="password">Create Password *</Label>
              <Input 
                id="password" 
                type="password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                placeholder="Min 6 characters"
                required 
                minLength={6}
                className="h-12 rounded-xl"
                data-testid="register-password-input"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full rounded-full h-12" 
              disabled={loading}
              data-testid="register-submit-button"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
            <div className="text-center">
              <button 
                type="button"
                onClick={() => setStep('method-select')}
                className="text-sm text-gray-500 hover:underline"
              >
                ← Back to login options
              </button>
            </div>
          </form>
        )}

        {/* Password Login */}
        {step === 'password-login' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <Label htmlFor="login-email">Email</Label>
              <Input 
                id="login-email" 
                type="email"
                value={passwordLogin.email}
                onChange={(e) => setPasswordLogin({...passwordLogin, email: e.target.value})}
                placeholder="your@email.com"
                required 
                className="h-12 rounded-xl"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label htmlFor="login-password">Password</Label>
              <Input 
                id="login-password" 
                type="password"
                value={passwordLogin.password}
                onChange={(e) => setPasswordLogin({...passwordLogin, password: e.target.value})}
                placeholder="Enter your password"
                required 
                className="h-12 rounded-xl"
                data-testid="login-password-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember-me"
                checked={passwordLogin.rememberMe}
                onChange={(e) => setPasswordLogin({...passwordLogin, rememberMe: e.target.checked})}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                data-testid="remember-me-checkbox"
              />
              <label htmlFor="remember-me" className="text-sm text-gray-600">
                Remember me for 30 days
              </label>
            </div>
            <Button 
              type="submit" 
              className="w-full rounded-full h-12" 
              disabled={loading}
              data-testid="password-login-button"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            <div className="flex justify-between text-sm">
              <button 
                type="button"
                onClick={() => setStep('method-select')}
                className="text-gray-500 hover:underline"
              >
                ← Other login options
              </button>
              <button 
                type="button"
                onClick={() => {
                  setEmail(passwordLogin.email);
                  setStep('email-otp');
                  toast.info('Enter your email to receive a password reset code');
                }}
                className="text-brand-teal hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </form>
        )}
        
        {/* Password Failed - SMS OTP Recovery Option */}
        {step === 'password-failed' && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-semibold text-red-700">Login Failed</p>
                  <p className="text-sm text-red-600">{loginError || 'Invalid email or password'}</p>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 text-center">
              Don't worry! You can still login using SMS OTP
            </p>
            
            <button
              onClick={() => {
                setAuthMethod('phone-otp');
                setStep('phone-otp');
              }}
              className="w-full p-4 border-2 border-orange-200 bg-orange-50 rounded-xl hover:border-orange-400 hover:bg-orange-100 transition-all text-left"
              data-testid="fallback-phone-otp"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Login with Phone + SMS OTP</p>
                  <p className="text-xs text-gray-500">We'll send a code to your registered phone</p>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => {
                setEmail(passwordLogin.email);
                setStep('email-otp');
              }}
              className="w-full p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Reset Password via Email</p>
                  <p className="text-xs text-gray-500">Get a verification code to reset your password</p>
                </div>
              </div>
            </button>
            
            <div className="text-center">
              <button 
                type="button"
                onClick={() => {
                  setLoginError('');
                  setStep('password-login');
                }}
                className="text-sm text-gray-500 hover:underline"
              >
                ← Try password again
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Interest Selection (Profile Customization) */}
        {step === 'interests' && (
          <div className="space-y-4">
            <div className="p-3 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg text-center">
              <p className="text-sm text-green-700">🎉 Account created successfully!</p>
            </div>
            
            <p className="text-sm text-gray-600 text-center">
              Help us personalize your experience by selecting services you're interested in:
            </p>

            <div className="grid gap-3">
              {availableInterests.map(interest => (
                <div
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                    selectedInterests.includes(interest.id)
                      ? 'border-brand-teal bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  data-testid={`interest-${interest.id}`}
                >
                  <span className="text-2xl">{interest.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{interest.name}</p>
                    <p className="text-xs text-gray-500">{interest.description}</p>
                  </div>
                  {selectedInterests.includes(interest.id) && (
                    <span className="text-brand-teal text-xl">✓</span>
                  )}
                </div>
              ))}
            </div>

            <Button 
              onClick={handleSaveInterests}
              className="w-full rounded-full h-12" 
              disabled={loading}
              data-testid="save-interests-button"
            >
              {loading ? 'Saving...' : selectedInterests.length > 0 ? 'Continue' : 'Skip for now'}
            </Button>
            
            <p className="text-xs text-center text-gray-400">
              You can always change these later in your profile
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default Home;
