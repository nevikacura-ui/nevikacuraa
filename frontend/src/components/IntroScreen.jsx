import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Mail, Phone, ArrowRight, Loader2, User, X, Calendar, FlaskConical, Package, Lock, MessageCircle, CheckCircle2, Download, Stethoscope, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LuxuryNotification from './LuxuryNotification';
import { successPattern, errorPattern, bookingConfirmed } from '@/utils/haptics';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Theme colors
const THEME = {
  primary: '#1F4F46',
  secondary: '#2E6B5F',
  accent: '#F4A43A',
  accentDark: '#E48C1C',
  orange: '#FF5733',
  light: '#3E8A7A',
  text: '#2B2B2B',
  textMuted: '#2B3A36',
  border: '#D2DAD7'
};

// ISD Country Codes
const ISD_CODES = [
  { code: '+91', country: 'IN', label: 'India', flag: '🇮🇳', digits: 10 },
  { code: '+1', country: 'US', label: 'USA / Canada', flag: '🇺🇸', digits: 10 },
  { code: '+44', country: 'GB', label: 'United Kingdom', flag: '🇬🇧', digits: 10 },
  { code: '+971', country: 'AE', label: 'UAE', flag: '🇦🇪', digits: 9 },
  { code: '+966', country: 'SA', label: 'Saudi Arabia', flag: '🇸🇦', digits: 9 },
  { code: '+65', country: 'SG', label: 'Singapore', flag: '🇸🇬', digits: 8 },
  { code: '+61', country: 'AU', label: 'Australia', flag: '🇦🇺', digits: 9 },
  { code: '+49', country: 'DE', label: 'Germany', flag: '🇩🇪', digits: 11 },
  { code: '+33', country: 'FR', label: 'France', flag: '🇫🇷', digits: 9 },
  { code: '+81', country: 'JP', label: 'Japan', flag: '🇯🇵', digits: 10 },
  { code: '+86', country: 'CN', label: 'China', flag: '🇨🇳', digits: 11 },
  { code: '+82', country: 'KR', label: 'South Korea', flag: '🇰🇷', digits: 10 },
  { code: '+60', country: 'MY', label: 'Malaysia', flag: '🇲🇾', digits: 10 },
  { code: '+63', country: 'PH', label: 'Philippines', flag: '🇵🇭', digits: 10 },
  { code: '+64', country: 'NZ', label: 'New Zealand', flag: '🇳🇿', digits: 9 },
  { code: '+27', country: 'ZA', label: 'South Africa', flag: '🇿🇦', digits: 9 },
  { code: '+234', country: 'NG', label: 'Nigeria', flag: '🇳🇬', digits: 10 },
  { code: '+254', country: 'KE', label: 'Kenya', flag: '🇰🇪', digits: 9 },
  { code: '+977', country: 'NP', label: 'Nepal', flag: '🇳🇵', digits: 10 },
  { code: '+94', country: 'LK', label: 'Sri Lanka', flag: '🇱🇰', digits: 9 },
  { code: '+880', country: 'BD', label: 'Bangladesh', flag: '🇧🇩', digits: 10 },
  { code: '+92', country: 'PK', label: 'Pakistan', flag: '🇵🇰', digits: 10 },
  { code: '+974', country: 'QA', label: 'Qatar', flag: '🇶🇦', digits: 8 },
  { code: '+968', country: 'OM', label: 'Oman', flag: '🇴🇲', digits: 8 },
  { code: '+973', country: 'BH', label: 'Bahrain', flag: '🇧🇭', digits: 8 },
  { code: '+965', country: 'KW', label: 'Kuwait', flag: '🇰🇼', digits: 8 },
  { code: '+39', country: 'IT', label: 'Italy', flag: '🇮🇹', digits: 10 },
  { code: '+34', country: 'ES', label: 'Spain', flag: '🇪🇸', digits: 9 },
  { code: '+55', country: 'BR', label: 'Brazil', flag: '🇧🇷', digits: 11 },
  { code: '+52', country: 'MX', label: 'Mexico', flag: '🇲🇽', digits: 10 },
];

// Enhanced Carousel slides with detailed content
const CAROUSEL_SLIDES = [
  {
    id: 1,
    taglinePart1: '35,000+ Patients.',
    taglineHighlight: 'Trusted Beyond Measure.',
    icon: Calendar,
    image: '/icons/intro-carousel-1.jpg',
    gradient: 'from-[#1F4F46] to-[#2E6B5F]',
    highlightColor: '#4ADE80'
  },
  {
    id: 2,
    taglinePart1: '4,000+ Genuine Medicines.',
    taglineHighlight: '100% Assured Authenticity.',
    icon: Package,
    image: '/icons/intro-carousel-2.jpg',
    gradient: 'from-[#f97316] to-[#ea580c]',
    highlightColor: '#FEF08A'
  },
  {
    id: 3,
    taglinePart1: 'NABL • CAP • ISO Certified.',
    taglineHighlight: 'Precision Without Compromise.',
    icon: FlaskConical,
    image: '/icons/intro-carousel-3.jpg',
    gradient: 'from-[#F4A43A] to-[#E48C1C]',
    highlightColor: '#FEF08A'
  },
  {
    id: 4,
    taglinePart1: 'Nine Personalised Portals.',
    taglineHighlight: 'Care, Effortlessly Yours.',
    icon: Calendar,
    image: '/icons/intro-carousel-4.jpg',
    gradient: 'from-[#1e3a5f] to-[#2c5282]',
    highlightColor: '#93C5FD'
  }
];

const IntroScreen = ({ onComplete, user }) => {
  const { setPatientAuth } = useAuth();
  const navigate = useNavigate();
  
  // Splash plays once per session — skip if already played
  const [phase, setPhase] = useState(() => {
    if (sessionStorage.getItem('splash_played')) return 'main';
    return 'splash';
  });
  const [wordIndex, setWordIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  // Wrap onComplete with smooth logo transition
  const handleTransitionToHome = useCallback(() => {
    sessionStorage.setItem('auth_completed_this_session', '1');
    localStorage.setItem('intro_done', '1');
    setTransitioning(true);
    setTimeout(() => onComplete(), 250);
  }, [onComplete]);
  
  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('email'); // 'email' | 'guest'
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [isdCode, setIsdCode] = useState('+91');
  const [showIsdPicker, setShowIsdPicker] = useState(false);
  const [isdSearch, setIsdSearch] = useState('');
  const isdPickerRef = useRef(null);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSentFlash, setOtpSentFlash] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authStep, setAuthStep] = useState('email'); // 'email' | 'otp' | 'password' | 'setPassword' | 'guestMobile' | 'guestOtp'
  const [verificationToken, setVerificationToken] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [otpVerifyState, setOtpVerifyState] = useState('idle'); // 'idle' | 'verifying' | 'success' | 'error'
  const [otpErrorMsg, setOtpErrorMsg] = useState('');
  const [waVerifyState, setWaVerifyState] = useState('idle'); // WhatsApp OTP verify animation
  const [waErrorMsg, setWaErrorMsg] = useState('');
  const [authAnim, setAuthAnim] = useState(null); // { type: 'success'|'error', message: string }
  
  // Guest OTP state
  const [guestOtp, setGuestOtp] = useState(['', '', '', '', '', '']);
  const guestOtpRefs = useRef([]);
  const [whatsappResendTimer, setWhatsappResendTimer] = useState(0);
  
  // ISD code helpers
  const selectedIsd = ISD_CODES.find(c => c.code === isdCode) || ISD_CODES[0];
  const maxMobileDigits = selectedIsd.digits || 10;
  const getFullMobile = () => `${isdCode.replace('+', '')}${mobile}`;

  // Close ISD picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (isdPickerRef.current && !isdPickerRef.current.contains(e.target)) {
        setShowIsdPicker(false);
        setIsdSearch('');
      }
    };
    if (showIsdPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showIsdPicker]);

  const filteredIsdCodes = isdSearch
    ? ISD_CODES.filter(c =>
        c.label.toLowerCase().includes(isdSearch.toLowerCase()) ||
        c.code.includes(isdSearch) ||
        c.country.toLowerCase().includes(isdSearch.toLowerCase())
      )
    : ISD_CODES;

  const splashWords = ['Book.', 'Order.', 'Test.', 'Care.'];
  
  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Capture PWA install prompt globally
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      window.__pwaInstallPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  
  // Only complete intro when user FRESHLY authenticates in this session (not stale tokens)
  useEffect(() => {
    if (user && sessionStorage.getItem('auth_completed_this_session')) {
      handleTransitionToHome();
    }
  }, [user, handleTransitionToHome]);
  
  // Splash word animation — plays every time
  useEffect(() => {
    if (phase !== 'splash') return;
    
    const wordTimer = setInterval(() => {
      setWordIndex(prev => {
        if (prev >= splashWords.length - 1) {
          clearInterval(wordTimer);
          setTimeout(() => {
            sessionStorage.setItem('splash_played', '1');
            setPhase('main');
          }, 400);
          return prev;
        }
        return prev + 1;
      });
    }, 550);
    
    return () => clearInterval(wordTimer);
  }, [phase]);
  
  // Auto-slide carousel
  useEffect(() => {
    if (phase !== 'main') return;
    
    const slideTimer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 4000);
    
    return () => clearInterval(slideTimer);
  }, [phase]);

  // Haptic feedback on auth animations
  useEffect(() => {
    if (authAnim?.type === 'error') errorPattern();
    if (authAnim?.type === 'success') successPattern();
  }, [authAnim]);

  useEffect(() => {
    if (otpVerifyState === 'error' || waVerifyState === 'error') errorPattern();
    if (otpVerifyState === 'success' || waVerifyState === 'success') bookingConfirmed();
  }, [otpVerifyState, waVerifyState]);

  
  // Auth functions - sendOtp now checks for password first
  const sendOtp = async () => {
    await checkEmailAndProceed();
  };
  
  const verifyOtp = async () => {
    if (!otp || otp.length < 4) {
      setAuthAnim({ type: 'error', message: 'Enter valid OTP' });
      setTimeout(() => setAuthAnim(null), 2500);
      return;
    }
    setOtpVerifyState('verifying');
    setOtpErrorMsg('');
    const spinnerStart = Date.now();
    const MIN_SPIN = 1800;
    try {
      const verifyRes = await axios.post(`${API}/api/auth/email-otp/verify`, { email, otp });
      const elapsed = Date.now() - spinnerStart;
      const wait = Math.max(0, MIN_SPIN - elapsed);
      
      if (verifyRes.data.user_exists) {
        if (verifyRes.data.has_password) {
          const loginRes = await axios.post(`${API}/api/auth/email-otp/login`, { 
            email, 
            verification_token: verifyRes.data.verification_token 
          });
          const { token, user: userData } = loginRes.data;
          localStorage.setItem('authToken', token);
          localStorage.setItem('patientToken', token);
          localStorage.setItem('authMethod', 'email');
          if (userData) {
            localStorage.setItem('userData', JSON.stringify(userData));
            setPatientAuth(userData);
          }
          await new Promise(r => setTimeout(r, wait));
          setOtpVerifyState('success');
          toast.dismiss();
          setTimeout(() => handleTransitionToHome(), 1800);
          return;
        } else {
          await new Promise(r => setTimeout(r, wait));
          setOtpVerifyState('success');
          setTimeout(() => {
            setOtpVerifyState('idle');
            setVerificationToken(verifyRes.data.verification_token);
            setAuthStep('setPassword');
          }, 1800);
        }
      } else {
        await new Promise(r => setTimeout(r, wait));
        setOtpVerifyState('success');
        setTimeout(() => {
          setOtpVerifyState('idle');
          setVerificationToken(verifyRes.data.verification_token);
          setAuthStep('setPassword');
        }, 1800);
      }
    } catch (error) {
      const elapsed = Date.now() - spinnerStart;
      const wait = Math.max(0, MIN_SPIN - elapsed);
      await new Promise(r => setTimeout(r, wait));
      const msg = error.response?.data?.detail || 'Verification failed';
      setOtpErrorMsg(msg);
      setOtpVerifyState('error');
      setTimeout(() => {
        setOtpVerifyState('idle');
        setOtp('');
      }, 1800);
    }
  };
  
  // Set password after OTP verification (for new users or users without password)
  const setNewPassword = async () => {
    if (!password || password.length < 6) {
      setAuthAnim({ type: 'error', message: 'Password must be at least 6 characters' });
      setTimeout(() => setAuthAnim(null), 2000);
      return;
    }
    if (password !== confirmPassword) {
      setAuthAnim({ type: 'error', message: 'Passwords do not match' });
      setTimeout(() => setAuthAnim(null), 2000);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/auth/patient/set-password`, {
        email,
        verification_token: verificationToken,
        password
      });
      const { token, user: userData } = res.data;
      localStorage.setItem('authToken', token);
      localStorage.setItem('patientToken', token);
      if (userData) {
        localStorage.setItem('userData', JSON.stringify(userData));
        setPatientAuth(userData);
      }
      toast.dismiss();
      setAuthAnim({ type: 'success', message: 'Account created! Welcome!' });
      setTimeout(() => handleTransitionToHome(), 1800);
      return;
    } catch (error) {
      setAuthAnim({ type: 'error', message: error.response?.data?.detail || 'Failed to set password' });
      setTimeout(() => setAuthAnim(null), 2000);
    }
    setLoading(false);
  };
  
  // Password login for returning users
  const loginWithPassword = async () => {
    if (!password) {
      setAuthAnim({ type: 'error', message: 'Enter your password' });
      setTimeout(() => setAuthAnim(null), 2500);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/auth/patient/login`, { email, password });
      const { token, user: userData } = res.data;
      localStorage.setItem('authToken', token);
      localStorage.setItem('patientToken', token);
      if (userData) {
        localStorage.setItem('userData', JSON.stringify(userData));
        setPatientAuth(userData);
      }
      toast.dismiss();
      setAuthAnim({ type: 'success', message: 'Login successful!' });
      setTimeout(() => handleTransitionToHome(), 1800);
      return;
    } catch (error) {
      if (error.response?.status === 404) {
        setAuthAnim({ type: 'error', message: 'Email not registered. Please sign up first.' });
        setTimeout(() => { setAuthAnim(null); setAuthStep('email'); }, 2500);
      } else if (error.response?.status === 401) {
        setAuthAnim({ type: 'error', message: 'Incorrect password' });
        setTimeout(() => setAuthAnim(null), 2500);
      } else {
        setAuthAnim({ type: 'error', message: error.response?.data?.detail || 'Login failed' });
        setTimeout(() => setAuthAnim(null), 2500);
      }
    }
    setLoading(false);
  };
  
  // Check if email exists and has password
  const checkEmailAndProceed = async () => {
    if (!email || !email.includes('@')) {
      setAuthAnim({ type: 'error', message: 'Enter valid email' });
      setTimeout(() => setAuthAnim(null), 2500);
      return;
    }
    setLoading(true);
    try {
      await sendOtpInternal();
    } catch (error) {
      setAuthAnim({ type: 'error', message: 'Failed to send OTP. Please try again.' });
      setTimeout(() => setAuthAnim(null), 2500);
    }
    setLoading(false);
  };
  
  const sendOtpInternal = async () => {
    try {
      const res = await axios.post(`${API}/api/auth/email-otp/send`, { email });
      setOtpSent(true);
      setAuthStep('otp');
      setOtpSentFlash(true);
      setTimeout(() => setOtpSentFlash(false), 2500);
      if (res.data.mock_otp) {
        console.log('Test OTP:', res.data.mock_otp);
      }
    } catch (error) {
      setAuthAnim({ type: 'error', message: error.response?.data?.detail || 'Failed to send OTP' });
      setTimeout(() => setAuthAnim(null), 2500);
    }
  };
  
  // WhatsApp resend timer countdown
  useEffect(() => {
    if (whatsappResendTimer > 0) {
      const t = setTimeout(() => setWhatsappResendTimer(whatsappResendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [whatsappResendTimer]);
  
  // WhatsApp OTP - Send OTP via WhatsApp
  const sendWhatsAppOtp = async () => {
    if (!mobile || mobile.length < 4) {
      setAuthAnim({ type: 'error', message: 'Enter a valid phone number' });
      setTimeout(() => setAuthAnim(null), 2500);
      return;
    }
    
    setLoading(true);
    try {
      const fullPhone = getFullMobile();
      const res = await axios.post(`${API}/api/otp/sms/send`, { 
        phone: fullPhone, 
        purpose: 'login' 
      });
      setAuthStep('whatsappOtp');
      setWhatsappResendTimer(10);
      setOtpSentFlash(true);
      setTimeout(() => setOtpSentFlash(false), 2500);
      if (res.data.mock && res.data.otp) {
        console.log('Test OTP:', res.data.otp);
        toast.info(`Test OTP: ${res.data.otp}`, { duration: 10000 });
      }
      setTimeout(() => guestOtpRefs.current[0]?.focus(), 100);
    } catch (error) {
      setAuthAnim({ type: 'error', message: error.response?.data?.detail || 'Failed to send OTP' });
      setTimeout(() => setAuthAnim(null), 2500);
    }
    setLoading(false);
  };
  
  const handleGuestOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...guestOtp];
    newOtp[index] = value.slice(-1);
    setGuestOtp(newOtp);
    
    if (value && index < 5) {
      guestOtpRefs.current[index + 1]?.focus();
    }
    
    // Auto-verify when all 6 digits entered
    if (index === 5 && value && newOtp.join('').length === 6) {
      setTimeout(() => verifyWhatsAppOtp(newOtp.join('')), 100);
    }
  };
  
  // WhatsApp OTP - Verify OTP and login
  const verifyWhatsAppOtp = async (otpValue = null) => {
    const otp = otpValue || guestOtp.join('');
    if (otp.length !== 6) {
      setAuthAnim({ type: 'error', message: 'Enter 6-digit OTP' });
      setTimeout(() => setAuthAnim(null), 2500);
      return;
    }
    
    setWaVerifyState('verifying');
    setWaErrorMsg('');
    const spinnerStart = Date.now();
    const MIN_SPIN = 1800;
    const fullPhone = getFullMobile();
    try {
      const res = await axios.post(`${API}/api/otp/sms/verify`, { 
        phone: fullPhone, 
        otp: otp 
      });
      const elapsed = Date.now() - spinnerStart;
      const wait = Math.max(0, MIN_SPIN - elapsed);
      
      if (res.data.success) {
        if (res.data.token) {
          localStorage.setItem('guestMobile', fullPhone);
          localStorage.setItem('authToken', res.data.token);
          localStorage.setItem('patientToken', res.data.token);
          localStorage.setItem('phoneVerified', 'true');
          localStorage.setItem('authMethod', 'whatsapp');
          localStorage.setItem('patientInfo', JSON.stringify({
            phone: fullPhone, mobile: fullPhone,
            name: res.data.user?.name || '', verified: true
          }));
          if (res.data.user) {
            localStorage.setItem('userData', JSON.stringify(res.data.user));
            setPatientAuth(res.data.user);
          }
          await new Promise(r => setTimeout(r, wait));
          setWaVerifyState('success');
          toast.dismiss();
          setTimeout(() => handleTransitionToHome(), 1800);
          return;
        } else if (res.data.needs_password || res.data.needs_email) {
          await new Promise(r => setTimeout(r, wait));
          setWaVerifyState('success');
          setTimeout(() => {
            setWaVerifyState('idle');
            setVerificationToken(res.data.verification_token);
            setAuthStep('setPassword');
          }, 1800);
        } else {
          try {
            const profileRes = await axios.post(`${API}/api/patients/auto-profile`, { phone: fullPhone, name: '' });
            if (profileRes.data.token) {
              localStorage.setItem('authToken', profileRes.data.token);
              localStorage.setItem('patientToken', profileRes.data.token);
            }
          } catch {}
          localStorage.setItem('guestMobile', fullPhone);
          localStorage.setItem('phoneVerified', 'true');
          localStorage.setItem('authMethod', 'whatsapp');
          localStorage.setItem('patientInfo', JSON.stringify({
            phone: fullPhone, mobile: fullPhone, name: '', verified: true
          }));
          const elapsed2 = Date.now() - spinnerStart;
          await new Promise(r => setTimeout(r, Math.max(0, MIN_SPIN - elapsed2)));
          setWaVerifyState('success');
          toast.dismiss();
          setTimeout(() => handleTransitionToHome(), 1800);
          return;
        }
      } else {
        await new Promise(r => setTimeout(r, wait));
        setWaErrorMsg('Invalid OTP');
        setWaVerifyState('error');
        setTimeout(() => {
          setWaVerifyState('idle');
          setGuestOtp(['', '', '', '', '', '']);
          guestOtpRefs.current[0]?.focus();
        }, 1800);
      }
    } catch (error) {
      const elapsed = Date.now() - spinnerStart;
      await new Promise(r => setTimeout(r, Math.max(0, MIN_SPIN - elapsed)));
      const msg = error.response?.data?.detail || 'Invalid OTP';
      setWaErrorMsg(msg);
      setWaVerifyState('error');
      setTimeout(() => {
        setWaVerifyState('idle');
        setGuestOtp(['', '', '', '', '', '']);
        guestOtpRefs.current[0]?.focus();
      }, 1800);
    }
  };

  // ========== SPLASH SCREEN (No tagline) ==========
  if (phase === 'splash') {
    const wordColors = ['#14B8A6', '#F97316', '#4ADE80', '#A855F7'];
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white overflow-hidden">
        <style>{`
          @keyframes heartbeat { 0%,100% { transform: scale(1); } 14% { transform: scale(1.08); } 28% { transform: scale(1); } 42% { transform: scale(1.05); } 56% { transform: scale(1); } }
          @keyframes logoReveal { from { opacity:0; transform: scale(0.8); filter: blur(8px); } to { opacity:1; transform: scale(1); filter: blur(0); } }
        `}</style>
        {/* Logo reveal */}
        <img 
          src="/nevika-splash-icon.png" 
          alt="Nevika Cura" 
          className="w-40 h-40 mb-8 object-contain"
          style={{ animation: 'logoReveal 0.6s ease-out both, heartbeat 1.5s ease-in-out 0.6s infinite' }}
        />
        {/* Animated Words with color shift */}
        <div className="flex flex-col items-center gap-1">
          {splashWords.map((word, i) => {
            const isLast = i === splashWords.length - 1;
            const isCurrent = i === wordIndex;
            return (
              <span
                key={word}
                className={`text-4xl font-bold transition-all duration-500 ${
                  i <= wordIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ 
                  color: isCurrent ? wordColors[i] : i < wordIndex ? '#1a1a2e' : 'transparent',
                  textShadow: isCurrent ? `0 0 20px ${wordColors[i]}30` : 'none',
                  transitionDelay: `${i * 80}ms`,
                  animation: (isLast && i <= wordIndex) ? 'heartbeat 1.2s ease-in-out 0.3s 2' : 'none',
                }}>
                {word}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // Current slide data
  const slide = CAROUSEL_SLIDES[currentSlide];
  const SlideIcon = slide.icon;

  // ========== MAIN SCREEN ==========
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-[#FAFAF8]">
      
      {/* Shared-element transition overlay */}
      {transitioning && (
        <div className="fixed inset-0 z-[100000] bg-white flex items-center justify-center" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <img src="/nevika-cura-dark-logo.png" alt="Nevika Cura" className="h-10 object-contain" style={{ animation: 'logoZoomOut 0.6s cubic-bezier(0.22,1,0.36,1) forwards' }} />
        </div>
      )}
      <style>{`
        @keyframes logoZoomOut { from { opacity:1; transform:scale(1); } to { opacity:0; transform:scale(2.5); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>
      
      {/* ===== CAROUSEL SECTION (65% screen) ===== */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: '65vh' }}>
        
        {/* Background gradient */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} transition-all duration-700`}
          style={{ opacity: 0.95 }}
        />
        
        {/* Content - Centered Layout */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 py-8">
          
          {/* Circular Image - Center */}
          <div className="w-56 h-56 rounded-full overflow-hidden shadow-2xl border-4 border-white/30 mb-8">
            <img 
              src={slide.image} 
              alt={slide.taglinePart1}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Tagline - Below Circle with Dual Color */}
          <div className="text-center">
            <h1 className="text-2xl font-bold leading-tight">
              <span className="text-white">{slide.taglinePart1}</span>
              <br />
              <span style={{ color: slide.highlightColor }}>{slide.taglineHighlight}</span>
            </h1>
          </div>
        </div>
        
        {/* Carousel Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {CAROUSEL_SLIDES.map((_, i) => (
            <button 
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* ===== AUTH SECTION (30% screen) - Light Theme ===== */}
      <div className="bg-white px-6 py-5 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]" style={{ minHeight: '30vh' }}>
        
        {/* Logo - Transparent Nevika Cura Logo */}
        <div className="text-center mb-3">
          <p className="text-sm text-gray-500">Welcome to</p>
          <img 
            src="/nevika-cura-dark-logo.png" 
            alt="Nevika Cura" 
            className="h-[58px] mx-auto object-contain mt-1"
          />
        </div>
        
        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-3 mb-3 px-2">
          {[
            { val: '35K+', label: 'Patients' },
            { val: 'NABL', label: 'Certified' },
            { val: '4000+', label: 'Medicines' },
            { val: '100+', label: 'Lab Tests' },
          ].map((b, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-[10px] font-black text-gray-800">{b.val}</span>
              <span className="text-[8px] text-gray-400">{b.label}</span>
            </div>
          ))}
        </div>
        
        {/* Three buttons in a row: Install | Login/Sign Up | Guest */}
        <div className="flex gap-2 mb-3">
          <Button 
            onClick={() => {
              const deferredPrompt = window.__pwaInstallPrompt;
              if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choice) => {
                  if (choice.outcome === 'accepted') {
                    toast.success('App installed!');
                    if ('caches' in window) caches.keys().then(n => n.forEach(k => caches.delete(k)));
                    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(r => r.forEach(x => x.update()));
                  }
                  window.__pwaInstallPrompt = null;
                });
              } else if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
                toast.info('Updating app...');
                if ('caches' in window) caches.keys().then(n => Promise.all(n.map(k => caches.delete(k))).then(() => { toast.success('Updated!'); setTimeout(() => window.location.reload(true), 800); }));
              } else {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                toast.info(isIOS ? 'Tap Share > "Add to Home Screen"' : 'Tap menu (3 dots) > "Install App"', { duration: 5000 });
              }
            }}
            className="h-12 rounded-xl font-semibold text-xs text-white flex flex-col items-center justify-center gap-0.5"
            style={{ background: 'linear-gradient(135deg, #1F4F46, #2E6B5F)', flex: '0.8' }}
            data-testid="install-app-btn">
            <Download className="w-4 h-4" />
            Install
          </Button>
          
          <Button 
            onClick={() => { setShowAuthModal(true); setAuthStep('loginOptions'); }}
            className="flex-1 h-12 rounded-xl font-semibold text-xs text-white flex flex-col items-center justify-center gap-0.5 bg-orange-500 hover:bg-orange-600"
            data-testid="login-register-btn">
            <Lock className="w-4 h-4" />
            Login
          </Button>
          
          <Button 
            onClick={() => { setShowAuthModal(true); setAuthStep('whatsappLogin'); }}
            className="flex-1 h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1F4F46, #2E6B5F)', border: '1px solid rgba(255,255,255,0.15)' }}
            data-testid="guest-btn">
            <Smartphone className="w-4 h-4" />
            Continue
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ animation: 'shimmer 2s infinite' }} />
          </Button>
        </div>
        <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
        
        {/* T&C */}
        <p className="text-center text-xs text-gray-500">
          By continuing you accept our{' '}
          <span className="font-medium text-teal-600">T&C</span>
          {' '}and{' '}
          <span className="font-medium text-teal-600">Privacy Policy</span>
        </p>
      </div>
      
      {/* ===== AUTH MODAL - Glassmorphism + Mango Green ===== */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100000] flex items-end justify-center">
          {/* Backdrop blur */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xl" onClick={() => {
            setShowAuthModal(false); setOtpSent(false); setEmail(''); setMobile('');
            setOtp(''); setPassword(''); setConfirmPassword(''); setAuthStep('loginOptions');
            setHasPassword(false); setGuestOtp(['', '', '', '', '', '']); setAuthAnim(null);
          }} />
          
          {/* Glassmorphism sheet with gradient */}
          <div 
            className="relative w-full rounded-t-[2rem] p-6 animate-slide-up overflow-y-auto intro-auth-modal"
            style={{ 
              maxHeight: '75vh',
              background: 'linear-gradient(165deg, rgba(255,255,255,0.55) 0%, rgba(220,245,235,0.45) 40%, rgba(31,79,70,0.15) 100%)',
              backdropFilter: 'blur(40px) saturate(1.8)',
              WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
              borderTop: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 -8px 40px rgba(31,79,70,0.15), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(31,79,70,0.25)' }} />
            </div>
            
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold" style={{ color: THEME.primary, fontFamily: 'Outfit, sans-serif' }}>
                {authStep === 'loginOptions' && 'Choose Login Method'}
                {authStep === 'staffPortalSelect' && 'Staff Portals'}
                {authStep === 'email' && 'Login with Email'}
                {authStep === 'emailPassword' && 'Login with Password'}
                {authStep === 'password' && 'Welcome Back'}
                {authStep === 'otp' && 'Verify OTP'}
                {authStep === 'setPassword' && 'Create Password'}
                {authStep === 'whatsappLogin' && 'Login with Phone'}
                {authStep === 'whatsappOtp' && 'Verify SMS OTP'}
              </h3>
              <button 
                onClick={() => { 
                  setShowAuthModal(false); setOtpSent(false); setEmail(''); setMobile('');
                  setOtp(''); setPassword(''); setConfirmPassword(''); setAuthStep('loginOptions');
                  setHasPassword(false); setGuestOtp(['', '', '', '', '', '']); setAuthAnim(null);
                  setIsdCode('+91'); setShowIsdPicker(false); setIsdSearch('');
                  if (authStep === 'staffPortalSelect') { setAuthStep('loginOptions'); return; }
                }}
                className="p-2.5 rounded-full transition-colors"
                style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)' }}
                data-testid="auth-modal-close"
              >
                <X className="w-5 h-5" style={{ color: THEME.primary }} />
              </button>
            </div>
            
            {/* Auth Lock Animation Overlay */}
            {authAnim && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-t-[2rem]"
                style={{ 
                  background: 'linear-gradient(165deg, rgba(255,255,255,0.97) 0%, rgba(220,245,235,0.92) 40%, rgba(31,79,70,0.35) 100%)',
                  backdropFilter: 'blur(40px)',
                  WebkitBackdropFilter: 'blur(40px)',
                }}
                data-testid="auth-lock-overlay">
                <style>{`
                  @keyframes authShackleUp { 0% { transform: translateY(0); } 100% { transform: translateY(-10px) rotate(-25deg); } }
                  @keyframes authDotFill { 0% { opacity: 0; transform: scale(0.3); } 60% { transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
                  @keyframes authShake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-5px)} 40%,80%{transform:translateX(5px)} }
                  @keyframes authXPop { 0% { opacity: 0; transform: scale(0); } 60% { transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
                  @keyframes authTextSlide { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }
                  @media (pointer: coarse) {
                    @keyframes authShake { 0%,100%{transform:translateX(0)} 10%{transform:translateX(-8px)} 20%{transform:translateX(8px)} 30%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 50%{transform:translateX(-4px)} 60%{transform:translateX(4px)} 70%{transform:translateX(-2px)} 80%{transform:translateX(2px)} }
                  }
                `}</style>
                <div className="relative mb-5" style={authAnim.type === 'error' ? { animation: 'authShake 0.5s ease-out 0.3s both' } : undefined}>
                  <svg width="56" height="64" viewBox="0 0 56 64" fill="none">
                    <g style={{
                      transform: authAnim.type === 'success' ? 'translateY(-10px) rotate(-25deg)' : 'translateY(0) rotate(0deg)',
                      transformOrigin: '14px 26px',
                      transformBox: 'fill-box',
                      WebkitTransformBox: 'fill-box',
                      transition: authAnim.type === 'success' ? 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
                    }}>
                      <path d="M14 26V18C14 10.268 20.268 4 28 4C35.732 4 42 10.268 42 18V26" 
                        stroke={authAnim.type === 'success' ? '#0D9488' : '#DC2626'}
                        strokeWidth="4" strokeLinecap="round" fill="none"
                        style={{ transition: 'stroke 0.4s ease' }} />
                    </g>
                    <rect x="8" y="26" width="40" height="30" rx="6" 
                      style={{ fill: authAnim.type === 'success' ? '#0D9488' : '#DC2626', transition: 'fill 0.5s ease' }} />
                    <circle cx="28" cy="38" r="4" fill="rgba(255,255,255,0.85)" />
                    <rect x="26.5" y="40" width="3" height="6" rx="1.5" fill="rgba(255,255,255,0.85)" />
                  </svg>
                  {authAnim.type === 'error' && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2" style={{ animation: 'authXPop 0.35s ease-out 0.4s both' }}>
                      <svg width="26" height="26" viewBox="0 0 26 26">
                        <circle cx="13" cy="13" r="12" fill="#DC2626" stroke="white" strokeWidth="1.5" />
                        <line x1="9" y1="9" x2="17" y2="17" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="17" y1="9" x2="9" y2="17" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2.5 mb-5">
                  {[0,1,2,3,4,5].map(i => {
                    const delay = i * 200;
                    const dotColor = authAnim.type === 'success' ? '#0D9488' : '#DC2626';
                    return (
                      <div key={i} className="relative w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ border: `2px solid ${dotColor}`, transition: `border-color 0.3s ease ${delay}ms`, background: 'rgba(255,255,255,0.15)' }}>
                        <span className="text-base font-black" style={{ color: dotColor, animation: `authDotFill 0.3s ease-out ${delay}ms both` }}>*</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm font-semibold tracking-wide" 
                  style={{ color: authAnim.type === 'success' ? '#0D9488' : '#DC2626', animation: 'authTextSlide 0.35s ease-out 0.3s both' }}>
                  {authAnim.message}
                </p>
              </div>
            )}
            
            {/* Login Options - WhatsApp, Email, Doctor, Staff */}
            {authStep === 'loginOptions' && (
              <div className="space-y-3">
                {/* Social Proof */}
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-white" style={{ background: `hsl(${i * 80}, 60%, 65%)` }} />
                    ))}
                  </div>
                  <p className="text-xs font-semibold" style={{ color: '#1A2B28' }}>
                    <span className="font-bold">35,000+</span> patients trust us
                  </p>
                </div>
                
                <Button 
                  onClick={() => setAuthStep('whatsappLogin')}
                  className="w-full h-14 rounded-2xl font-bold text-white shadow-lg btn-press"
                  style={{ background: 'linear-gradient(135deg, #1F4F46 0%, #2E6B5F 100%)', boxShadow: '0 4px 24px rgba(31,79,70,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' }}
                  data-testid="whatsapp-login-option">
                  <Smartphone className="w-5 h-5 mr-2" />
                  SMS OTP
                </Button>
                
                {/* Doctor & Staff Portal - two small buttons side by side */}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => { setShowAuthModal(false); onComplete(); setTimeout(() => navigate('/doctor-login'), 100); }}
                    className="flex-1 h-12 rounded-2xl font-bold text-white text-xs"
                    style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.85) 0%, rgba(139,92,246,0.75) 100%)', border: '1px solid rgba(255,255,255,0.2)' }}
                    data-testid="doctor-login-option">
                    <Stethoscope className="w-4 h-4 mr-1.5" />
                    Doctor Portal
                  </Button>
                  
                  <Button 
                    onClick={() => setAuthStep('staffPortalSelect')}
                    className="flex-1 h-12 rounded-2xl font-bold text-white text-xs"
                    style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.85) 0%, rgba(234,88,12,0.75) 100%)', border: '1px solid rgba(255,255,255,0.2)' }}
                    data-testid="staff-login-option">
                    <Lock className="w-4 h-4 mr-1.5" />
                    Staff Portal
                  </Button>
                </div>
                
                <p className="text-center text-xs" style={{ color: THEME.textMuted }}>
                  Quick & secure verification
                </p>
              </div>
            )}
            
            {/* Staff Portal Selection - Animated Wheel */}
            {authStep === 'staffPortalSelect' && (
              <div className="flex flex-col items-center">
                <p className="text-sm font-semibold mb-6" style={{ color: '#1A2B28' }}>
                  Select Staff Portal
                </p>
                <style>{`
                  @keyframes staffOrbIn { from { opacity:0; transform:scale(0.5) translateY(20px); } to { opacity:1; transform:scale(1) translateY(0); } }
                  @keyframes staffOrbFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
                `}</style>
                <div className="flex justify-center gap-8 mb-8">
                  {[
                    { label: 'DiaGyn', icon: Stethoscope, color: '#E88D2A', bg: 'linear-gradient(135deg, #E88D2A, #D4790F)', route: '/staff', testId: 'diagyn-staff-option' },
                    { label: 'Mango', icon: FlaskConical, color: '#16A34A', bg: 'linear-gradient(135deg, #22C55E, #16A34A)', route: '/mango-staff', testId: 'mango-staff-option' },
                    { label: 'Orange', icon: Package, color: '#F97316', bg: 'linear-gradient(135deg, #F97316, #EA580C)', route: '/orange-staff', testId: 'orange-staff-option' },
                  ].map((portal, i) => (
                    <button 
                      key={portal.label}
                      onClick={() => { setShowAuthModal(false); onComplete(); setTimeout(() => navigate(portal.route), 100); }}
                      className="flex flex-col items-center gap-2.5 transition-all active:scale-90"
                      style={{ animation: `staffOrbIn 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 100}ms both` }}
                      data-testid={portal.testId}>
                      <div className="w-20 h-20 rounded-full flex items-center justify-center relative"
                        style={{ background: portal.bg, boxShadow: `0 8px 28px ${portal.color}50`, animation: `staffOrbFloat 3s ease-in-out ${i * 0.3}s infinite` }}>
                        <portal.icon className="w-8 h-8 text-white" />
                        <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%)', pointerEvents: 'none' }} />
                      </div>
                      <span className="text-sm font-bold" style={{ color: portal.color }}>{portal.label}</span>
                    </button>
                  ))}
                </div>
                
                <button onClick={() => setAuthStep('loginOptions')} 
                  className="text-center text-sm font-medium" style={{ color: THEME.secondary }}>
                  Back to options
                </button>
              </div>
            )}
            
            {/* Step 1: Email Input */}
            {authStep === 'email' && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: THEME.textMuted }}>
                  Enter your email to continue
                </p>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#1F4F46' }} />
                  <Input 
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="h-14 pl-12 rounded-2xl text-base border"
                    style={{ borderColor: 'rgba(31,79,70,0.3)', color: '#1A2B28', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}
                    data-testid="email-input"
                  />
                </div>
                <Button 
                  onClick={sendOtp} disabled={loading || !email || !email.includes('@')}
                  className="w-full h-14 rounded-2xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, rgba(31,79,70,0.85) 0%, rgba(46,107,95,0.7) 100%)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 24px rgba(31,79,70,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                  data-testid="continue-btn">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
                </Button>
                <button onClick={() => { setAuthStep('loginOptions'); setEmail(''); }} 
                  className="w-full text-center text-sm font-medium" style={{ color: THEME.secondary }}>
                  Back to options
                </button>
              </div>
            )}
            
            {/* Step 2a: Password Login (for returning users) */}
            {authStep === 'password' && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: THEME.textMuted }}>
                  Enter your password for <span className="font-medium" style={{ color: THEME.primary }}>{email}</span>
                </p>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#1F4F46' }} />
                  <Input 
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="h-14 pl-12 rounded-2xl text-base border"
                    style={{ borderColor: 'rgba(31,79,70,0.3)', color: '#1A2B28', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}
                    data-testid="password-input"
                  />
                </div>
                <Button 
                  onClick={loginWithPassword} disabled={loading || !password}
                  className="w-full h-14 rounded-2xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, rgba(31,79,70,0.85) 0%, rgba(46,107,95,0.7) 100%)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 24px rgba(31,79,70,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                  data-testid="login-btn">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
                </Button>
                <button onClick={() => { setAuthStep('email'); sendOtpInternal(); }} className="w-full text-center text-sm font-medium" style={{ color: THEME.secondary }}>
                  Login with OTP instead
                </button>
                <button onClick={() => { setAuthStep('emailPassword'); setEmail(''); setPassword(''); }} className="w-full text-center text-sm" style={{ color: THEME.textMuted }}>
                  Change Email
                </button>
              </div>
            )}

            {/* Email + Password: Enter Email first */}
            {authStep === 'emailPassword' && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: THEME.textMuted }}>
                  Enter your email and password
                </p>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#1F4F46' }} />
                  <Input 
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="h-14 pl-12 rounded-2xl text-base border"
                    style={{ borderColor: 'rgba(31,79,70,0.3)', color: '#1A2B28', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}
                    data-testid="email-password-email-input"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#1F4F46' }} />
                  <Input 
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="h-14 pl-12 rounded-2xl text-base border"
                    style={{ borderColor: 'rgba(31,79,70,0.3)', color: '#1A2B28', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}
                    data-testid="email-password-password-input"
                  />
                </div>
                <Button 
                  onClick={loginWithPassword} disabled={loading || !email || !email.includes('@') || !password}
                  className="w-full h-14 rounded-2xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, rgba(31,79,70,0.85) 0%, rgba(46,107,95,0.7) 100%)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 24px rgba(31,79,70,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                  data-testid="email-password-login-btn">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
                </Button>
                <p className="text-center text-xs" style={{ color: THEME.textMuted }}>
                  Don't have an account? Use <button onClick={() => { setAuthStep('email'); setPassword(''); }} className="font-semibold underline" style={{ color: THEME.secondary }}>Email + OTP</button> to register
                </p>
                <button onClick={() => { setAuthStep('loginOptions'); setEmail(''); setPassword(''); }} 
                  className="w-full text-center text-sm font-medium" style={{ color: THEME.secondary }}>
                  Back to options
                </button>
              </div>
            )}
            
            {/* Step 2b: OTP Verification (for new users or OTP flow) */}
            {authStep === 'otp' && (
              <div className="space-y-4">
                {otpVerifyState === 'idle' ? (
                  <>
                    <p className="text-sm" style={{ color: THEME.textMuted }}>
                      OTP sent to <span className="font-medium" style={{ color: THEME.primary }}>{email}</span>
                    </p>
                    {otpSentFlash && (
                      <p className="text-xs font-semibold text-center py-1.5 rounded-lg" 
                        style={{ color: '#0D9488', background: 'rgba(13,148,136,0.08)', animation: 'authTextSlide 0.3s ease-out' }}
                        data-testid="otp-sent-flash">
                        OTP sent successfully!
                      </p>
                    )}
                    <Input 
                      type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter OTP"
                      className="h-14 rounded-2xl text-center text-2xl font-bold tracking-widest border"
                      style={{ borderColor: 'rgba(31,79,70,0.3)', color: '#1A2B28', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}
                      maxLength={6} data-testid="otp-input"
                    />
                    <Button 
                      onClick={verifyOtp} disabled={loading || otp.length < 4}
                      className="w-full h-14 rounded-2xl font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, rgba(31,79,70,0.85) 0%, rgba(46,107,95,0.7) 100%)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 24px rgba(31,79,70,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                      data-testid="verify-otp-btn">
                      Verify OTP
                    </Button>
                    <button onClick={() => sendOtpInternal()} className="w-full text-center text-sm font-medium" style={{ color: THEME.secondary }}>Resend OTP</button>
                    <button onClick={() => { setAuthStep('email'); setOtp(''); setOtpSent(false); }} className="w-full text-center text-sm" style={{ color: THEME.textMuted }}>Change Email</button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8" data-testid="otp-verify-animation">
                    <style>{`
                      @keyframes lockShackleUp { 0% { transform: translateY(0) rotate(0deg); } 40% { transform: translateY(-14px) rotate(-30deg); } 100% { transform: translateY(-16px) rotate(-35deg); } }
                      @keyframes lockColorSuccess { 0% { fill: #5B8A82; } 100% { fill: #0D9488; } }
                      @keyframes lockColorError { 0% { fill: #5B8A82; } 100% { fill: #DC2626; } }
                      @keyframes lockGlow { 0% { filter: drop-shadow(0 0 0px transparent); } 100% { filter: drop-shadow(0 0 12px rgba(13,148,136,0.5)); } }
                      @keyframes dotFillIn { 0% { opacity: 0; transform: scale(0.3); } 60% { transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
                      @keyframes otpTextIn { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }
                      @keyframes otpShake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-5px)} 40%,80%{transform:translateX(5px)} }
                      @keyframes alertBadgePop { 0% { opacity: 0; transform: scale(0); } 60% { transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
                      @keyframes dotPulseWait { 0%,100% { opacity: 0.35; } 50% { opacity: 0.6; } }
                      @keyframes dotSendWave { 0%,100% { transform: translateY(0); opacity: 0.35; } 40% { transform: translateY(-14px); opacity: 1; } 60% { transform: translateY(-14px); opacity: 1; } }
                      @media (pointer: coarse) {
                        @keyframes otpShake { 0%,100%{transform:translateX(0)} 10%{transform:translateX(-8px)} 20%{transform:translateX(8px)} 30%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 50%{transform:translateX(-4px)} 60%{transform:translateX(4px)} 70%{transform:translateX(-2px)} 80%{transform:translateX(2px)} }
                      }
                    `}</style>

                    {/* Lock Icon */}
                    <div className="relative mb-5" style={otpVerifyState === 'error' ? { animation: 'otpShake 0.5s ease-out 0.3s both' } : otpVerifyState === 'success' ? { animation: 'lockGlow 0.6s ease-out 0.3s forwards' } : undefined}>
                      <svg width="56" height="64" viewBox="0 0 56 64" fill="none">
                        {/* Shackle - using CSS transition for reliable cross-browser unlock */}
                        <g style={{
                          transform: otpVerifyState === 'success' ? 'translateY(-16px) rotate(-35deg)' : 'translateY(0) rotate(0deg)',
                          transformOrigin: '14px 26px',
                          transformBox: 'fill-box',
                          WebkitTransformBox: 'fill-box',
                          transition: otpVerifyState === 'success' ? 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
                        }}>
                          <path d="M14 26V18C14 10.268 20.268 4 28 4C35.732 4 42 10.268 42 18V26" 
                            stroke={otpVerifyState === 'success' ? '#0D9488' : otpVerifyState === 'error' ? '#DC2626' : '#5B8A82'}
                            strokeWidth="4" strokeLinecap="round" fill="none"
                            style={{ transition: 'stroke 0.4s ease' }} />
                        </g>
                        {/* Lock body */}
                        <rect x="8" y="26" width="40" height="30" rx="6" 
                          style={{ fill: otpVerifyState === 'success' ? '#0D9488' : otpVerifyState === 'error' ? '#DC2626' : '#5B8A82', transition: 'fill 0.5s ease' }} />
                        {/* Keyhole */}
                        <circle cx="28" cy="38" r="4" fill="rgba(255,255,255,0.85)" />
                        <rect x="26.5" y="40" width="3" height="6" rx="1.5" fill="rgba(255,255,255,0.85)" />
                      </svg>
                      {/* Error alert badge */}
                      {otpVerifyState === 'error' && (
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2" style={{ animation: 'alertBadgePop 0.35s ease-out 0.4s both' }}>
                          <svg width="26" height="26" viewBox="0 0 26 26">
                            <circle cx="13" cy="13" r="12" fill="#DC2626" stroke="white" strokeWidth="1.5" />
                            <line x1="9" y1="9" x2="17" y2="17" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                            <line x1="17" y1="9" x2="9" y2="17" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* 6 Dots */}
                    <div className="flex items-center gap-2.5 mb-5">
                      {[0,1,2,3,4,5].map(i => {
                        const filled = otpVerifyState !== 'idle';
                        const delay = i * 250;
                        const dotColor = otpVerifyState === 'success' ? '#0D9488' : otpVerifyState === 'error' ? '#DC2626' : '#5B8A82';
                        return (
                          <div key={i} className="relative w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ border: `2px solid ${filled ? dotColor : 'rgba(91,138,130,0.3)'}`, transition: `border-color 0.3s ease ${delay}ms`, background: 'rgba(255,255,255,0.15)' }}>
                            {filled && (
                              <span className="text-base font-black" style={{ color: dotColor, animation: `dotFillIn 0.3s ease-out ${delay}ms both` }}>*</span>
                            )}
                            {!filled && (
                              <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(91,138,130,0.5)', animation: `dotSendWave 1.2s ease-in-out ${i * 150}ms infinite` }} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Status Text */}
                    {otpVerifyState === 'verifying' && (
                      <p className="text-sm font-medium tracking-wide" style={{ color: '#5B8A82' }}>Verifying...</p>
                    )}
                    {otpVerifyState === 'success' && (
                      <p className="text-sm font-semibold tracking-wide" style={{ color: '#0D9488', animation: 'otpTextIn 0.35s ease-out 0.3s both' }}>Verified</p>
                    )}
                    {otpVerifyState === 'error' && (
                      <p className="text-sm font-semibold tracking-wide" style={{ color: '#DC2626', animation: 'otpTextIn 0.35s ease-out 0.3s both' }}>{otpErrorMsg || 'Verification Failed'}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Step 3: Set Password (for new users after OTP) */}
            {authStep === 'setPassword' && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: THEME.textMuted }}>Set a password for future logins</p>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#1F4F46' }} />
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password (min 6 chars)"
                    className="h-14 pl-12 rounded-2xl text-base border"
                    style={{ borderColor: 'rgba(31,79,70,0.3)', color: '#1A2B28', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}
                    data-testid="new-password-input" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#1F4F46' }} />
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="h-14 pl-12 rounded-2xl text-base border"
                    style={{ borderColor: 'rgba(31,79,70,0.3)', color: '#1A2B28', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}
                    data-testid="confirm-password-input" />
                </div>
                <Button 
                  onClick={setNewPassword} disabled={loading || password.length < 6 || password !== confirmPassword}
                  className="w-full h-14 rounded-2xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, rgba(31,79,70,0.85) 0%, rgba(46,107,95,0.7) 100%)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 24px rgba(31,79,70,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                  data-testid="set-password-btn">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                </Button>
              </div>
            )}
            
            {/* WhatsApp Login: Enter Phone */}
            {authStep === 'whatsappLogin' && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(31,79,70,0.8) 0%, rgba(46,107,95,0.6) 100%)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 20px rgba(31,79,70,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
                    <Smartphone className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#1A2B28' }}>
                    Enter your mobile number to receive SMS OTP
                  </p>
                </div>
                <div className="relative flex items-center" ref={isdPickerRef}>
                  {/* Country code button */}
                  <button
                    type="button"
                    onClick={() => setShowIsdPicker(!showIsdPicker)}
                    className="flex items-center gap-1.5 px-3 h-14 rounded-l-2xl border border-r-0 transition-colors shrink-0"
                    style={{ 
                      borderColor: 'rgba(31,79,70,0.3)', 
                      background: 'rgba(245,245,245,0.85)', 
                      backdropFilter: 'blur(8px)',
                      minWidth: '88px'
                    }}
                    data-testid="isd-code-selector"
                  >
                    <span className="text-base">{selectedIsd.flag}</span>
                    <span className="text-sm font-semibold" style={{ color: '#1A2B28' }}>{isdCode}</span>
                    <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {/* Dropdown */}
                  {showIsdPicker && (
                    <div className="absolute top-full left-0 mt-1 w-full max-h-52 bg-white border rounded-2xl shadow-2xl z-50 overflow-hidden" 
                      style={{ borderColor: 'rgba(31,79,70,0.15)', backdropFilter: 'blur(20px)' }}
                      data-testid="isd-picker-dropdown">
                      <div className="p-2 border-b" style={{ borderColor: 'rgba(31,79,70,0.1)' }}>
                        <input
                          type="text"
                          placeholder="Search country..."
                          value={isdSearch}
                          onChange={(e) => setIsdSearch(e.target.value)}
                          className="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none"
                          style={{ borderColor: 'rgba(31,79,70,0.2)', color: '#1A2B28' }}
                          autoFocus
                          data-testid="isd-search-input"
                        />
                      </div>
                      <div className="overflow-y-auto max-h-40">
                        {filteredIsdCodes.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setIsdCode(c.code);
                              setShowIsdPicker(false);
                              setIsdSearch('');
                              setMobile('');
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left"
                            style={{ background: isdCode === c.code ? 'rgba(31,79,70,0.08)' : 'transparent' }}
                            data-testid={`isd-option-${c.country}`}
                          >
                            <span className="text-base">{c.flag}</span>
                            <span className="text-sm flex-1" style={{ color: '#1A2B28' }}>{c.label}</span>
                            <span className="text-xs font-mono" style={{ color: THEME.textMuted }}>{c.code}</span>
                          </button>
                        ))}
                        {filteredIsdCodes.length === 0 && (
                          <p className="text-sm text-center py-4" style={{ color: THEME.textMuted }}>No country found</p>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Phone input */}
                  <Input type="tel" value={mobile} 
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, maxMobileDigits))}
                    placeholder={`${maxMobileDigits}-digit number`}
                    className="h-14 rounded-r-2xl rounded-l-none text-base border flex-1"
                    style={{ borderColor: 'rgba(31,79,70,0.3)', color: '#1A2B28', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}
                    maxLength={maxMobileDigits} data-testid="whatsapp-mobile-input" />
                </div>
                <Button 
                  onClick={sendWhatsAppOtp} disabled={mobile.length < 4 || loading}
                  className="w-full h-14 rounded-2xl font-bold text-white shadow-lg"
                  style={{ background: 'linear-gradient(135deg, rgba(31,79,70,0.85) 0%, rgba(46,107,95,0.7) 100%)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 24px rgba(31,79,70,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                  data-testid="whatsapp-send-otp-btn">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Send OTP
                  </>}
                </Button>
                <button onClick={() => { setAuthStep('loginOptions'); setMobile(''); setIsdCode('+91'); }} 
                  className="w-full text-center text-sm font-medium" style={{ color: THEME.secondary }}>
                  Back to options
                </button>
              </div>
            )}
            
            {/* WhatsApp OTP Verification */}
            {authStep === 'whatsappOtp' && (
              <div className="space-y-4">
                {waVerifyState === 'idle' ? (
                  <>
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, rgba(31,79,70,0.8) 0%, rgba(46,107,95,0.6) 100%)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 20px rgba(31,79,70,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
                        <Smartphone className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-sm font-medium" style={{ color: '#1A2B28' }}>Enter the OTP sent to</p>
                      <p className="font-bold text-lg" style={{ color: THEME.primary }}>{isdCode} {mobile}</p>
                      {otpSentFlash && (
                        <p className="text-xs font-semibold mt-1.5 py-1.5 rounded-lg" 
                          style={{ color: '#0D9488', background: 'rgba(13,148,136,0.08)', animation: 'authTextSlide 0.3s ease-out' }}
                          data-testid="wa-otp-sent-flash">
                          OTP sent via SMS!
                        </p>
                      )}
                    </div>
                    
                    <div className="flex justify-center gap-2">
                      {guestOtp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => (guestOtpRefs.current[index] = el)}
                          type="text" inputMode="numeric" value={digit}
                          onChange={(e) => handleGuestOtpChange(index, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Backspace' && !guestOtp[index] && index > 0) guestOtpRefs.current[index - 1]?.focus(); }}
                          className="w-12 h-14 text-center text-xl font-bold rounded-xl outline-none transition-all"
                          style={{ 
                            border: digit ? '2px solid #1F4F46' : '2px solid rgba(31,79,70,0.3)',
                            color: '#1A2B28',
                            background: 'rgba(255,255,255,0.7)',
                            backdropFilter: 'blur(8px)',
                            boxShadow: digit ? '0 0 0 3px rgba(31,79,70,0.1)' : 'none'
                          }}
                          maxLength={1} data-testid={`whatsapp-otp-${index}`}
                        />
                      ))}
                    </div>
                    
                    <Button 
                      onClick={() => verifyWhatsAppOtp()}
                      disabled={guestOtp.join('').length !== 6 || loading}
                      className="w-full h-14 rounded-2xl font-bold text-white shadow-lg"
                      style={{ background: 'linear-gradient(135deg, rgba(31,79,70,0.85) 0%, rgba(46,107,95,0.7) 100%)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 24px rgba(31,79,70,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                      data-testid="whatsapp-verify-otp-btn">
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Verify & Login
                    </Button>
                    
                    <div className="flex justify-center gap-4 text-sm">
                      {whatsappResendTimer > 0 ? (
                        <span style={{ color: THEME.textMuted }}>Resend OTP in {whatsappResendTimer}s</span>
                      ) : (
                        <button onClick={sendWhatsAppOtp} disabled={loading}
                          className="font-medium hover:underline" style={{ color: THEME.secondary }}
                          data-testid="whatsapp-resend-otp">Resend OTP</button>
                      )}
                      <span style={{ color: THEME.textMuted }}>|</span>
                      <button onClick={() => { setAuthStep('whatsappLogin'); setGuestOtp(['', '', '', '', '', '']); }}
                        className="font-medium hover:underline" style={{ color: THEME.textMuted }}>Change Number</button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8" data-testid="wa-otp-verify-animation">
                    {/* Lock Icon */}
                    <div className="relative mb-5" style={waVerifyState === 'error' ? { animation: 'otpShake 0.5s ease-out 0.3s both' } : waVerifyState === 'success' ? { animation: 'lockGlow 0.6s ease-out 0.3s forwards' } : undefined}>
                      <svg width="56" height="64" viewBox="0 0 56 64" fill="none">
                        <g style={{
                          transform: waVerifyState === 'success' ? 'translateY(-16px) rotate(-35deg)' : 'translateY(0) rotate(0deg)',
                          transformOrigin: '14px 26px',
                          transformBox: 'fill-box',
                          WebkitTransformBox: 'fill-box',
                          transition: waVerifyState === 'success' ? 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
                        }}>
                          <path d="M14 26V18C14 10.268 20.268 4 28 4C35.732 4 42 10.268 42 18V26" 
                            stroke={waVerifyState === 'success' ? '#0D9488' : waVerifyState === 'error' ? '#DC2626' : '#5B8A82'}
                            strokeWidth="4" strokeLinecap="round" fill="none"
                            style={{ transition: 'stroke 0.4s ease' }} />
                        </g>
                        <rect x="8" y="26" width="40" height="30" rx="6" 
                          style={{ fill: waVerifyState === 'success' ? '#0D9488' : waVerifyState === 'error' ? '#DC2626' : '#5B8A82', transition: 'fill 0.5s ease' }} />
                        <circle cx="28" cy="38" r="4" fill="rgba(255,255,255,0.85)" />
                        <rect x="26.5" y="40" width="3" height="6" rx="1.5" fill="rgba(255,255,255,0.85)" />
                      </svg>
                      {waVerifyState === 'error' && (
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2" style={{ animation: 'alertBadgePop 0.35s ease-out 0.4s both' }}>
                          <svg width="26" height="26" viewBox="0 0 26 26">
                            <circle cx="13" cy="13" r="12" fill="#DC2626" stroke="white" strokeWidth="1.5" />
                            <line x1="9" y1="9" x2="17" y2="17" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                            <line x1="17" y1="9" x2="9" y2="17" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* 6 Dots */}
                    <div className="flex items-center gap-2.5 mb-5">
                      {[0,1,2,3,4,5].map(i => {
                        const filled = waVerifyState !== 'idle';
                        const delay = i * 250;
                        const dotColor = waVerifyState === 'success' ? '#0D9488' : waVerifyState === 'error' ? '#DC2626' : '#5B8A82';
                        return (
                          <div key={i} className="relative w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ border: `2px solid ${filled ? dotColor : 'rgba(91,138,130,0.3)'}`, transition: `border-color 0.3s ease ${delay}ms`, background: 'rgba(255,255,255,0.15)' }}>
                            {filled && (
                              <span className="text-base font-black" style={{ color: dotColor, animation: `dotFillIn 0.3s ease-out ${delay}ms both` }}>*</span>
                            )}
                            {!filled && (
                              <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(91,138,130,0.5)', animation: `dotSendWave 1.2s ease-in-out ${i * 150}ms infinite` }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {waVerifyState === 'verifying' && (
                      <p className="text-sm font-medium tracking-wide" style={{ color: '#5B8A82' }}>Verifying...</p>
                    )}
                    {waVerifyState === 'success' && (
                      <p className="text-sm font-semibold tracking-wide" style={{ color: '#0D9488', animation: 'otpTextIn 0.35s ease-out 0.3s both' }}>Verified</p>
                    )}
                    {waVerifyState === 'error' && (
                      <p className="text-sm font-semibold tracking-wide" style={{ color: '#DC2626', animation: 'otpTextIn 0.35s ease-out 0.3s both' }}>{waErrorMsg || 'Verification Failed'}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .intro-auth-modal input::placeholder {
          color: #2B4A44 !important;
          opacity: 1 !important;
          font-weight: 500 !important;
        }
        @keyframes authTextSlide { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default IntroScreen;
