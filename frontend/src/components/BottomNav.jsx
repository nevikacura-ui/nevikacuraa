import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Pill, Calendar, TestTube, User, MessageCircle, Loader2, Check, RefreshCw, Phone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { selectionTap, mediumTap } from '@/utils/haptics';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setPatientAuth } = useAuth();
  const [isScrolling, setIsScrolling] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  // WhatsApp OTP Login State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginStep, setLoginStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [mockOtp, setMockOtp] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef([]);
  
  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Determine active tab based on current path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/' || path === '/home') return 'home';
    if (path.includes('/pharmacy')) return 'pharmacy';
    if (path.includes('/diagyn')) return 'diagyn';
    if (path.includes('/mango')) return 'lab';
    if (path.includes('/patient-portal') || path.includes('/profile')) return 'profile';
    return 'home';
  };

  const activeTab = getActiveTab();

  // Theme colors based on active page
  const getThemeColors = () => {
    switch (activeTab) {
      case 'diagyn':
        return {
          primary: 'teal',
          activeBg: 'bg-teal-500',
          activeShadow: 'shadow-teal-500/40',
          activeText: 'text-teal-600'
        };
      case 'pharmacy':
        return {
          primary: 'orange',
          activeBg: 'bg-orange-500',
          activeShadow: 'shadow-orange-500/40',
          activeText: 'text-orange-600'
        };
      case 'lab':
        return {
          primary: 'blue',
          activeBg: 'bg-blue-500',
          activeShadow: 'shadow-blue-500/40',
          activeText: 'text-blue-600'
        };
      default:
        return {
          primary: 'teal',
          activeBg: 'bg-teal-500',
          activeShadow: 'shadow-teal-500/40',
          activeText: 'text-teal-600'
        };
    }
  };

  const theme = getThemeColors();

  // Hide bottom nav while scrolling
  useEffect(() => {
    let scrollTimeout;
    
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => setIsScrolling(false), 300);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, []);

  const navItems = [
    { 
      id: 'home', 
      label: 'Home', 
      icon: HomeIcon, 
      path: '/',
      color: 'teal'
    },
    { 
      id: 'pharmacy', 
      label: 'Pharmacy', 
      icon: Pill, 
      path: '/pharmacy',
      color: 'orange'
    },
    { 
      id: 'book', 
      label: 'Book', 
      icon: Calendar, 
      isCenter: true,
      color: 'rose'
    },
    { 
      id: 'lab', 
      label: 'Lab Tests', 
      icon: TestTube, 
      path: '/mango',
      color: 'blue'
    },
    { 
      id: 'profile', 
      label: user ? 'Profile' : 'Login', 
      icon: User, 
      path: '/patient-portal',
      color: 'slate'
    }
  ];

  const handleNavClick = (item) => {
    // Haptic feedback on navigation
    selectionTap();
    
    if (item.id === 'book') {
      setShowBookingModal(true);
    } else if (item.id === 'profile' && !user) {
      // Show WhatsApp OTP login modal for non-logged-in users
      setShowLoginModal(true);
      setLoginStep('phone');
      setPhone('');
      setOtp(['', '', '', '', '', '']);
      setMockOtp(null);
    } else if (item.path) {
      navigate(item.path);
    }
  };
  
  // WhatsApp OTP Functions
  const sendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/otp/whatsapp/send`, {
        phone: phone,
        purpose: 'profile_login'
      });
      
      setLoginStep('otp');
      setCountdown(30);
      setMockOtp(res.data.mock ? res.data.otp : null);
      toast.success('OTP sent via WhatsApp!', {
        description: res.data.mock ? `Use code: ${res.data.otp}` : 'Check your WhatsApp'
      });
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };
  
  const verifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/otp/whatsapp/verify`, {
        phone: phone,
        otp: otpCode
      });
      
      // Login successful - try to get/create patient profile
      try {
        const profileRes = await axios.post(`${API}/api/patients/portal/login-mobile`, {
          mobile: phone
        });
        
        if (profileRes.data.token) {
          localStorage.setItem('patientToken', profileRes.data.token);
          setPatientAuth({
            ...profileRes.data.patient,
            token: profileRes.data.token
          });
        }
      } catch (profileErr) {
        // Profile doesn't exist - create guest profile
        localStorage.setItem('guestPhone', phone);
      }
      
      toast.success('Login successful!');
      setShowLoginModal(false);
      navigate('/patient-portal');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };
  
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (index === 5 && value && newOtp.join('').length === 6) {
      setTimeout(() => verifyOTP(), 100);
    }
  };
  
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const getIconStyle = (item) => {
    const isActive = activeTab === item.id;
    
    if (isActive) {
      // Active item gets its own color
      const colorMap = {
        teal: 'bg-teal-500 shadow-teal-500/40',
        orange: 'bg-orange-500 shadow-orange-500/40',
        blue: 'bg-blue-500 shadow-blue-500/40',
        slate: 'bg-slate-600 shadow-slate-600/40'
      };
      return `${colorMap[item.color]} shadow-lg scale-110`;
    }
    
    return 'bg-slate-100';
  };

  const getTextStyle = (item) => {
    const isActive = activeTab === item.id;
    
    if (isActive) {
      const colorMap = {
        teal: 'text-teal-600',
        orange: 'text-orange-600',
        blue: 'text-blue-600',
        slate: 'text-slate-700'
      };
      return colorMap[item.color];
    }
    
    return 'text-slate-500';
  };

  if (typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(
        <nav className={`md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 z-[9999] pb-safe transition-transform duration-300 ${
          isScrolling ? 'translate-y-full' : 'translate-y-0'
        }`}>
          <div className="flex items-center justify-around py-2 px-4">
            {navItems.map((item) => (
              item.isCenter ? (
                // Center Book Button - Always prominent
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className="relative -mt-4 flex flex-col items-center"
                  data-testid="nav-book-appointment"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/40 hover:scale-105 transition-all ring-3 ring-white">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="mt-1 text-[10px] font-bold text-rose-600">{item.label}</span>
                </button>
              ) : (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className="flex flex-col items-center gap-1 px-2 py-1.5 transition-all"
                  data-testid={`nav-${item.id}`}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${getIconStyle(item)}`}>
                    <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <span className={`text-[10px] font-semibold ${getTextStyle(item)}`}>{item.label}</span>
                </button>
              )
            ))}
          </div>
        </nav>,
        document.body
      )}

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-slate-800">
              Book Appointment
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Button
              onClick={() => {
                mediumTap();
                setShowBookingModal(false);
                navigate('/diagyn');
              }}
              className="h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-2xl"
              data-testid="book-doctor-btn"
            >
              <User className="w-8 h-8" />
              <span className="text-sm font-semibold">Doctor Appointment</span>
            </Button>
            <Button
              onClick={() => {
                mediumTap();
                setShowBookingModal(false);
                navigate('/diagyn?type=sonography');
              }}
              className="h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 rounded-2xl"
              data-testid="book-sonography-btn"
            >
              <Calendar className="w-8 h-8" />
              <span className="text-sm font-semibold">Sonography</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom padding spacer */}
      <div className="md:hidden h-20" />
    </>
  );
};

export default BottomNav;
