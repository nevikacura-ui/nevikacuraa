import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Mail, Phone, ArrowRight, Loader2, User, X, Calendar, FlaskConical, Package, Lock, MessageCircle } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

// Theme colors
const THEME = {
  primary: '#1F4F46',
  secondary: '#2E6B5F',
  accent: '#F4A43A',
  accentDark: '#E48C1C',
  orange: '#FF5733',
  light: '#3E8A7A',
  text: '#2B2B2B',
  textMuted: '#6F7B77'
};

// Enhanced Carousel slides with detailed content
const CAROUSEL_SLIDES = [
  {
    id: 1,
    taglinePart1: '35,000+ Patients.',
    taglineHighlight: 'Trusted Beyond Measure.',
    icon: Calendar,
    image: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=600&h=400&fit=crop',
    gradient: 'from-[#1F4F46] to-[#2E6B5F]',
    highlightColor: '#4ADE80'
  },
  {
    id: 2,
    taglinePart1: '4,000+ Genuine Medicines.',
    taglineHighlight: '100% Assured Authenticity.',
    icon: Package,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&h=400&fit=crop',
    gradient: 'from-[#f97316] to-[#ea580c]',
    highlightColor: '#FEF08A'
  },
  {
    id: 3,
    taglinePart1: 'NABL • CAP • ISO Certified.',
    taglineHighlight: 'Precision Without Compromise.',
    icon: FlaskConical,
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&h=400&fit=crop',
    gradient: 'from-[#F4A43A] to-[#E48C1C]',
    highlightColor: '#FEF08A'
  },
  {
    id: 4,
    taglinePart1: 'Nine Personalised Portals.',
    taglineHighlight: 'Care, Effortlessly Yours.',
    icon: Calendar,
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop',
    gradient: 'from-[#1e3a5f] to-[#2c5282]',
    highlightColor: '#93C5FD'
  }
];

const IntroScreen = ({ onComplete, user }) => {
  const { setPatientAuth } = useAuth();
  
  // Phases: 'splash' -> 'main'
  const [phase, setPhase] = useState('splash');
  const [wordIndex, setWordIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('email'); // 'email' | 'guest'
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authStep, setAuthStep] = useState('email'); // 'email' | 'otp' | 'password' | 'setPassword' | 'guestMobile' | 'guestOtp'
  const [verificationToken, setVerificationToken] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  
  // Guest OTP state
  const [guestOtp, setGuestOtp] = useState(['', '', '', '', '', '']);
  const [mockOtpGuest, setMockOtpGuest] = useState('');
  const guestOtpRefs = useRef([]);
  
  const splashWords = ['Book.', 'Order.', 'Test.', 'Care.'];
  
  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  
  // Check if already logged in
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    const patientToken = localStorage.getItem('patientToken');
    const guestMode = localStorage.getItem('guestMode');
    const skippedLogin = localStorage.getItem('skippedLogin');
    if (authToken || patientToken || guestMode || skippedLogin || user) {
      onComplete();
    }
  }, [user, onComplete]);
  
  // Splash word animation
  useEffect(() => {
    if (phase !== 'splash') return;
    
    const wordTimer = setInterval(() => {
      setWordIndex(prev => {
        if (prev >= splashWords.length - 1) {
          clearInterval(wordTimer);
          setTimeout(() => setPhase('main'), 400);
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
  
  // Auth functions - sendOtp now checks for password first
  const sendOtp = async () => {
    await checkEmailAndProceed();
  };
  
  const verifyOtp = async () => {
    if (!otp || otp.length < 4) {
      toast.error('Enter valid OTP');
      return;
    }
    setLoading(true);
    try {
      // First verify the OTP
      const verifyRes = await axios.post(`${API}/auth/email-otp/verify`, { email, otp });
      
      if (verifyRes.data.user_exists) {
        // Existing user - check if they have a password set
        if (verifyRes.data.has_password) {
          // User has password - prompt for password login next time
          // For now, complete OTP login
          const loginRes = await axios.post(`${API}/auth/email-otp/login`, { 
            email, 
            verification_token: verifyRes.data.verification_token 
          });
          const { token, user: userData } = loginRes.data;
          localStorage.setItem('authToken', token);
          localStorage.setItem('patientToken', token);
          if (userData) {
            localStorage.setItem('userData', JSON.stringify(userData));
            setPatientAuth(userData);
          }
          toast.success('Login successful!');
          onComplete();
        } else {
          // Existing user without password - prompt to set password
          setVerificationToken(verifyRes.data.verification_token);
          setAuthStep('setPassword');
          toast.info('Set a password for easier future logins');
        }
      } else {
        // New user - prompt to set password (registration)
        setVerificationToken(verifyRes.data.verification_token);
        setAuthStep('setPassword');
        toast.info('Create a password to complete registration');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verification failed');
    }
    setLoading(false);
  };
  
  // Set password after OTP verification (for new users or users without password)
  const setNewPassword = async () => {
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/patient/set-password`, {
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
      toast.success('Account created! Welcome!');
      onComplete();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to set password');
    }
    setLoading(false);
  };
  
  // Password login for returning users
  const loginWithPassword = async () => {
    if (!password) {
      toast.error('Enter your password');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/patient/login`, { email, password });
      const { token, user: userData } = res.data;
      localStorage.setItem('authToken', token);
      localStorage.setItem('patientToken', token);
      if (userData) {
        localStorage.setItem('userData', JSON.stringify(userData));
        setPatientAuth(userData);
      }
      toast.success('Login successful!');
      onComplete();
    } catch (error) {
      if (error.response?.status === 404) {
        // User doesn't exist - go back to email step
        toast.error('Email not registered. Please sign up first.');
        setAuthStep('email');
      } else if (error.response?.status === 401) {
        toast.error('Incorrect password');
      } else {
        toast.error(error.response?.data?.detail || 'Login failed');
      }
    }
    setLoading(false);
  };
  
  // Check if email exists and has password
  const checkEmailAndProceed = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Enter valid email');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/patient/check-email`, { email });
      if (res.data.exists && res.data.has_password) {
        // User exists with password - show password login
        setHasPassword(true);
        setAuthStep('password');
      } else {
        // New user or user without password - send OTP
        await sendOtpInternal();
      }
    } catch (error) {
      // If check fails, fall back to OTP flow
      await sendOtpInternal();
    }
    setLoading(false);
  };
  
  const sendOtpInternal = async () => {
    try {
      const res = await axios.post(`${API}/auth/email-otp/send`, { email });
      setOtpSent(true);
      setAuthStep('otp');
      toast.success('OTP sent to your email!');
      if (res.data.mock_otp) {
        console.log('Test OTP:', res.data.mock_otp);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    }
  };
  
  // Guest login - direct access without OTP
  const continueAsGuest = async () => {
    if (!mobile || mobile.length !== 10) {
      toast.error('Enter valid 10-digit WhatsApp number');
      return;
    }
    
    setLoading(true);
    try {
      // Create guest session directly without OTP verification
      const sessionRes = await axios.post(`${API}/auth/v2/guest/create-session`, { 
        phone: mobile
      });
      
      localStorage.setItem('guestToken', sessionRes.data.session_token);
      localStorage.setItem('guestMobile', mobile);
      localStorage.setItem('guestMode', 'true');
      toast.success('Welcome to Nevika Cura!');
      onComplete();
    } catch (error) {
      // If session creation fails, still allow guest access
      localStorage.setItem('guestMobile', mobile);
      localStorage.setItem('guestMode', 'true');
      toast.success('Welcome to Nevika Cura!');
      onComplete();
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
      setTimeout(() => verifyGuestOtp(newOtp.join('')), 100);
    }
  };
  
  const verifyGuestOtp = async (otpValue = null) => {
    const otp = otpValue || guestOtp.join('');
    if (otp.length !== 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/otp/whatsapp/verify`, { 
        phone: mobile, 
        otp: otp 
      });
      
      if (res.data.success) {
        // Create guest session
        const sessionRes = await axios.post(`${API}/auth/v2/guest/create-session`, { 
          phone: mobile
        });
        
        localStorage.setItem('guestToken', sessionRes.data.session_token);
        localStorage.setItem('guestMobile', mobile);
        localStorage.setItem('guestMode', 'true');
        toast.success('Phone verified! Welcome to Nevika Cura');
        onComplete();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
      setGuestOtp(['', '', '', '', '', '']);
      guestOtpRefs.current[0]?.focus();
    }
    setLoading(false);
  };
  
  const skipToApp = () => {
    localStorage.setItem('guestMode', 'true');
    localStorage.setItem('skippedLogin', 'true');
    toast.success('Welcome!');
    onComplete();
  };

  // ========== SPLASH SCREEN (No tagline) ==========
  if (phase === 'splash') {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white">
        {/* Animated Words */}
        <div className="flex flex-col items-center gap-1">
          {splashWords.map((word, i) => (
            <span
              key={word}
              className={`text-4xl font-bold transition-all duration-500 ${
                i <= wordIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ 
                color: i === wordIndex ? THEME.accent : THEME.primary,
                transitionDelay: `${i * 80}ms`
              }}>
              {word}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Current slide data
  const slide = CAROUSEL_SLIDES[currentSlide];
  const SlideIcon = slide.icon;

  // ========== MAIN SCREEN ==========
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-white">
      
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
      
      {/* ===== AUTH SECTION (30% screen) ===== */}
      <div className="bg-white px-6 py-5 shadow-[0_-8px_30px_rgba(0,0,0,0.1)]" style={{ minHeight: '30vh' }}>
        
        {/* Logo - Reduced gap */}
        <div className="text-center mb-4">
          <p className="text-sm" style={{ color: THEME.textMuted }}>Welcome to</p>
          <img 
            src="https://customer-assets.emergentagent.com/job_healthportal-48/artifacts/hoal6fvj_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260204_171806_0000%20%282%29.png" 
            alt="NevikaCura" 
            className="h-[72px] mx-auto object-contain mt-1"
          />
        </div>
        
        {/* 2x1 Toggle Buttons */}
        <div className="flex gap-3 mb-3">
          <Button 
            onClick={() => { setAuthMode('email'); setAuthStep('email'); setShowAuthModal(true); }}
            className="flex-1 h-12 rounded-xl font-semibold text-sm"
            style={{ background: THEME.accent, color: 'white' }}
            data-testid="login-register-btn">
            <Mail className="w-4 h-4 mr-2" />
            Login / Register
          </Button>
          
          <Button 
            onClick={() => { setAuthMode('guest'); setAuthStep('guestMobile'); setShowAuthModal(true); }}
            variant="outline"
            className="flex-1 h-12 rounded-xl font-semibold text-sm border-2"
            style={{ borderColor: THEME.primary, color: THEME.primary }}
            data-testid="guest-btn">
            <User className="w-4 h-4 mr-2" />
            Guest
          </Button>
        </div>
        
        {/* T&C */}
        <p className="text-center text-xs" style={{ color: THEME.textMuted }}>
          By continuing you accept our{' '}
          <span className="font-medium" style={{ color: THEME.accent }}>T&C</span>
          {' '}and{' '}
          <span className="font-medium" style={{ color: THEME.accent }}>Privacy Policy</span>
        </p>
      </div>
      
      {/* ===== AUTH MODAL ===== */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100000] bg-black/50 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-3xl p-6 animate-slide-up" style={{ maxHeight: '70vh' }}>
            
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold" style={{ color: THEME.text }}>
                {authStep === 'email' && 'Login / Register'}
                {authStep === 'password' && 'Welcome Back'}
                {authStep === 'otp' && 'Verify OTP'}
                {authStep === 'setPassword' && 'Create Password'}
                {authStep === 'guestMobile' && 'Continue as Guest'}
              </h3>
              <button 
                onClick={() => { 
                  setShowAuthModal(false); 
                  setOtpSent(false); 
                  setEmail(''); 
                  setMobile('');
                  setOtp(''); 
                  setPassword(''); 
                  setConfirmPassword('');
                  setAuthStep('email');
                  setHasPassword(false);
                }}
                className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" style={{ color: THEME.textMuted }} />
              </button>
            </div>
            
            {/* Step 1: Email Input */}
            {authStep === 'email' && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: THEME.textMuted }}>
                  Enter your email to continue
                </p>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: THEME.textMuted }} />
                  <Input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="h-14 pl-12 rounded-2xl text-base border-2"
                    data-testid="email-input"
                  />
                </div>
                <Button 
                  onClick={sendOtp}
                  disabled={loading || !email || !email.includes('@')}
                  className="w-full h-14 rounded-2xl font-bold"
                  style={{ background: THEME.accent }}
                  data-testid="continue-btn">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
                </Button>
              </div>
            )}
            
            {/* Step 2a: Password Login (for returning users) */}
            {authStep === 'password' && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: THEME.textMuted }}>
                  Enter your password for <span className="font-medium">{email}</span>
                </p>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: THEME.textMuted }} />
                  <Input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="h-14 pl-12 rounded-2xl text-base border-2"
                    data-testid="password-input"
                  />
                </div>
                <Button 
                  onClick={loginWithPassword}
                  disabled={loading || !password}
                  className="w-full h-14 rounded-2xl font-bold"
                  style={{ background: THEME.accent }}
                  data-testid="login-btn">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
                </Button>
                <button 
                  onClick={() => sendOtpInternal()} 
                  className="w-full text-center text-sm" 
                  style={{ color: THEME.secondary }}>
                  Login with OTP instead
                </button>
                <button 
                  onClick={() => { setAuthStep('email'); setEmail(''); setPassword(''); }} 
                  className="w-full text-center text-sm" 
                  style={{ color: THEME.textMuted }}>
                  Change Email
                </button>
              </div>
            )}
            
            {/* Step 2b: OTP Verification (for new users or OTP flow) */}
            {authStep === 'otp' && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: THEME.textMuted }}>
                  OTP sent to <span className="font-medium">{email}</span>
                </p>
                <Input 
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter OTP"
                  className="h-14 rounded-2xl text-center text-2xl font-bold tracking-widest border-2"
                  maxLength={6}
                  data-testid="otp-input"
                />
                <Button 
                  onClick={verifyOtp}
                  disabled={loading || otp.length < 4}
                  className="w-full h-14 rounded-2xl font-bold"
                  style={{ background: THEME.accent }}
                  data-testid="verify-otp-btn">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify OTP'}
                </Button>
                <button 
                  onClick={() => sendOtpInternal()} 
                  className="w-full text-center text-sm" 
                  style={{ color: THEME.secondary }}>
                  Resend OTP
                </button>
                <button 
                  onClick={() => { setAuthStep('email'); setOtp(''); setOtpSent(false); }} 
                  className="w-full text-center text-sm" 
                  style={{ color: THEME.textMuted }}>
                  Change Email
                </button>
              </div>
            )}
            
            {/* Step 3: Set Password (for new users after OTP) */}
            {authStep === 'setPassword' && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: THEME.textMuted }}>
                  Set a password for future logins
                </p>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: THEME.textMuted }} />
                  <Input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password (min 6 chars)"
                    className="h-14 pl-12 rounded-2xl text-base border-2"
                    data-testid="new-password-input"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: THEME.textMuted }} />
                  <Input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="h-14 pl-12 rounded-2xl text-base border-2"
                    data-testid="confirm-password-input"
                  />
                </div>
                <Button 
                  onClick={setNewPassword}
                  disabled={loading || password.length < 6 || password !== confirmPassword}
                  className="w-full h-14 rounded-2xl font-bold"
                  style={{ background: THEME.accent }}
                  data-testid="set-password-btn">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                </Button>
              </div>
            )}
            
            {/* Guest: Quick Entry */}
            {authStep === 'guestMobile' && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: THEME.textMuted }}>
                  Enter your WhatsApp number to continue
                </p>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: THEME.textMuted }} />
                  <Input 
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="WhatsApp number (10 digits)"
                    className="h-14 pl-12 rounded-2xl text-base border-2"
                    maxLength={10}
                    data-testid="guest-mobile-input"
                  />
                </div>
                <Button 
                  onClick={continueAsGuest}
                  disabled={mobile.length !== 10 || loading}
                  className="w-full h-14 rounded-2xl font-bold"
                  style={{ background: '#25D366' }}
                  data-testid="guest-continue-btn">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Continue
                  </>}
                </Button>
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
      `}</style>
    </div>
  );
};

export default IntroScreen;
