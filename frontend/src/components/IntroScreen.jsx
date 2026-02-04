import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Mail, Phone, ArrowRight, Loader2, User, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

// Theme colors matching Mango palette
const THEME = {
  primary: '#1F4F46',
  secondary: '#2E6B5F',
  accent: '#F4A43A',
  accentDark: '#E48C1C',
  light: '#3E8A7A',
  background: '#FFFFFF',
  text: '#2B2B2B',
  textMuted: '#6F7B77'
};

// Carousel slides - service highlights
const CAROUSEL_SLIDES = [
  {
    id: 1,
    title: 'Lab Tests at Home',
    subtitle: 'Get tested in 60 mins',
    icon: '🧪',
    gradient: 'from-[#1F4F46] to-[#2E6B5F]',
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&h=300&fit=crop'
  },
  {
    id: 2,
    title: 'Order Medicines',
    subtitle: 'Delivered to your door',
    icon: '💊',
    gradient: 'from-[#F4A43A] to-[#E48C1C]',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop'
  },
  {
    id: 3,
    title: 'Consult Doctors',
    subtitle: 'Expert care online',
    icon: '👨‍⚕️',
    gradient: 'from-[#2E6B5F] to-[#3E8A7A]',
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=300&fit=crop'
  },
  {
    id: 4,
    title: 'Health Packages',
    subtitle: 'Complete checkups',
    icon: '❤️',
    gradient: 'from-[#E48C1C] to-[#F4A43A]',
    image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop'
  }
];

const IntroScreen = ({ onComplete, user }) => {
  const { setPatientAuth } = useAuth();
  
  // Phases: 'splash' -> 'carousel' -> 'auth'
  const [phase, setPhase] = useState('splash');
  const [textIndex, setTextIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Auth state
  const [authMode, setAuthMode] = useState('select');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [mobile, setMobile] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const carouselRef = useRef(null);
  const splashTexts = ['Book Tests...', 'Order Medicines...', 'Consult Doctors...', 'Care at Home...'];
  
  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  
  // Check if already logged in
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    const patientToken = localStorage.getItem('patientToken');
    const guestMobile = localStorage.getItem('guestMobile');
    if (authToken || patientToken || guestMobile || user) {
      onComplete();
    }
  }, [user, onComplete]);
  
  // Splash text animation
  useEffect(() => {
    if (phase !== 'splash') return;
    
    const textTimer = setInterval(() => {
      setTextIndex(prev => {
        if (prev >= splashTexts.length - 1) {
          clearInterval(textTimer);
          setTimeout(() => setPhase('carousel'), 400);
          return prev;
        }
        return prev + 1;
      });
    }, 700);
    
    return () => clearInterval(textTimer);
  }, [phase]);
  
  // Cursor blink
  useEffect(() => {
    const cursorTimer = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(cursorTimer);
  }, []);
  
  // Auto-slide carousel
  useEffect(() => {
    if (phase !== 'carousel') return;
    
    const slideTimer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 3000);
    
    return () => clearInterval(slideTimer);
  }, [phase]);
  
  // Send OTP to email
  const sendOtp = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Enter valid email');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/send-otp`, { email });
      setOtpSent(true);
      toast.success('OTP sent to your email!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    }
    setLoading(false);
  };
  
  // Verify OTP and login
  const verifyOtp = async () => {
    if (!otp || otp.length < 4) {
      toast.error('Enter valid OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/verify-otp`, { email, otp });
      const { token, user: userData } = res.data;
      localStorage.setItem('authToken', token);
      localStorage.setItem('authUser', email);
      if (setPatientAuth) setPatientAuth(token, userData);
      toast.success('Welcome to Nevika Cura!');
      onComplete();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    }
    setLoading(false);
  };
  
  // Guest login with mobile
  const guestLogin = async () => {
    if (!mobile || mobile.length !== 10) {
      toast.error('Enter valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    localStorage.setItem('guestMobile', mobile);
    localStorage.setItem('guestMode', 'true');
    toast.success('Guest session started!');
    setLoading(false);
    onComplete();
  };

  // ========== SPLASH SCREEN - White Background ==========
  if (phase === 'splash') {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white">
        
        {/* Logo - Centered with clean look */}
        <div className="mb-10">
          <img 
            src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
            alt="Nevika Cura" 
            className="h-24 w-auto"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(31, 79, 70, 0.15))' }}
          />
        </div>
        
        {/* Animated Text */}
        <div className="h-10 flex items-center justify-center">
          <span className="text-2xl font-bold tracking-wide"
            style={{ 
              color: THEME.primary,
              animation: 'fadeInUp 0.4s ease-out'
            }}>
            {splashTexts[textIndex]}
            <span className={`ml-1 ${showCursor ? 'opacity-100' : 'opacity-0'}`} 
              style={{ color: THEME.accent }}>|</span>
          </span>
        </div>
        
        {/* Progress dots */}
        <div className="absolute bottom-24 flex gap-2">
          {splashTexts.map((_, i) => (
            <div key={i} 
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i <= textIndex ? 'scale-100' : 'scale-75'
              }`}
              style={{ 
                backgroundColor: i <= textIndex ? THEME.primary : '#E6ECEA'
              }} />
          ))}
        </div>
        
        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ========== CAROUSEL + AUTH SCREEN ==========
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-white">
      
      {/* Top Section - Logo */}
      <div className="flex justify-center pt-8 pb-4">
        <img 
          src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
          alt="Nevika Cura" 
          className="h-12 w-auto"
        />
      </div>
      
      {/* Carousel Section */}
      <div className="px-4 mb-4">
        <div className="relative overflow-hidden rounded-3xl" style={{ height: '200px' }}>
          {/* Slides */}
          <div 
            ref={carouselRef}
            className="flex transition-transform duration-500 ease-out h-full"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
            {CAROUSEL_SLIDES.map((slide) => (
              <div key={slide.id} className="min-w-full h-full relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} rounded-3xl overflow-hidden`}>
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 right-4 text-8xl">{slide.icon}</div>
                  </div>
                  
                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-center p-6 text-white">
                    <span className="text-4xl mb-3">{slide.icon}</span>
                    <h3 className="text-2xl font-bold mb-1">{slide.title}</h3>
                    <p className="text-white/80 text-sm">{slide.subtitle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {CAROUSEL_SLIDES.map((_, i) => (
              <button 
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentSlide ? 'w-6 bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Auth Section */}
      <div className="flex-1 px-6 pb-8 overflow-y-auto">
        
        {/* Selection Mode */}
        {authMode === 'select' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold" style={{ color: THEME.text }}>
                Get Started
              </h2>
              <p className="text-sm mt-1" style={{ color: THEME.textMuted }}>
                Your complete healthcare companion
              </p>
            </div>
            
            {/* Email Login */}
            <Button 
              onClick={() => setAuthMode('email')}
              className="w-full h-14 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-3"
              style={{ background: THEME.primary }}>
              <Mail className="w-5 h-5" />
              Continue with Email
              <ArrowRight className="w-5 h-5 ml-auto" />
            </Button>
            
            {/* Divider */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm" style={{ color: THEME.textMuted }}>or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            
            {/* Guest Login */}
            <Button 
              onClick={() => setAuthMode('guest')}
              variant="outline"
              className="w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-3 border-2"
              style={{ borderColor: THEME.accent, color: THEME.accent }}>
              <User className="w-5 h-5" />
              Continue as Guest
              <ArrowRight className="w-5 h-5 ml-auto" />
            </Button>
            
            <p className="text-center text-xs mt-6" style={{ color: THEME.textMuted }}>
              By continuing, you agree to our Terms & Privacy Policy
            </p>
          </div>
        )}
        
        {/* Email + OTP Mode */}
        {authMode === 'email' && (
          <div className="space-y-4">
            <button onClick={() => { setAuthMode('select'); setOtpSent(false); setEmail(''); setOtp(''); }}
              className="text-sm font-medium mb-2" style={{ color: THEME.secondary }}>
              ← Back
            </button>
            
            <h2 className="text-xl font-bold mb-6" style={{ color: THEME.text }}>
              {otpSent ? 'Enter OTP' : 'Enter your Email'}
            </h2>
            
            {!otpSent ? (
              <>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: THEME.textMuted }} />
                  <Input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="h-14 pl-12 rounded-2xl text-base border-2 border-gray-200 focus:border-teal-500"
                  />
                </div>
                
                <Button 
                  onClick={sendOtp}
                  disabled={loading || !email}
                  className="w-full h-14 rounded-2xl text-white font-bold text-base"
                  style={{ background: THEME.accent }}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm mb-4" style={{ color: THEME.textMuted }}>
                  OTP sent to <span className="font-medium" style={{ color: THEME.text }}>{email}</span>
                </p>
                
                <Input 
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="h-14 rounded-2xl text-center text-2xl font-bold tracking-widest border-2 border-gray-200 focus:border-teal-500"
                  maxLength={6}
                />
                
                <Button 
                  onClick={verifyOtp}
                  disabled={loading || otp.length < 4}
                  className="w-full h-14 rounded-2xl text-white font-bold text-base"
                  style={{ background: THEME.accent }}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
                </Button>
                
                <button onClick={sendOtp} disabled={loading}
                  className="w-full text-center text-sm font-medium mt-2" style={{ color: THEME.secondary }}>
                  Resend OTP
                </button>
              </>
            )}
          </div>
        )}
        
        {/* Guest Mode */}
        {authMode === 'guest' && (
          <div className="space-y-4">
            <button onClick={() => { setAuthMode('select'); setMobile(''); }}
              className="text-sm font-medium mb-2" style={{ color: THEME.secondary }}>
              ← Back
            </button>
            
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5" style={{ color: THEME.accent }} />
              <h2 className="text-xl font-bold" style={{ color: THEME.text }}>
                Quick Guest Access
              </h2>
            </div>
            
            <p className="text-sm mb-4" style={{ color: THEME.textMuted }}>
              Enter your mobile number to continue. No OTP required!
            </p>
            
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: THEME.textMuted }} />
              <span className="absolute left-12 top-1/2 -translate-y-1/2 font-medium" style={{ color: THEME.textMuted }}>+91</span>
              <Input 
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                className="h-14 pl-24 rounded-2xl text-base border-2 border-gray-200 focus:border-teal-500"
                maxLength={10}
              />
            </div>
            
            <Button 
              onClick={guestLogin}
              disabled={loading || mobile.length !== 10}
              className="w-full h-14 rounded-2xl text-white font-bold text-base"
              style={{ background: THEME.accent }}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <User className="w-5 h-5 mr-2" />
                  Continue as Guest
                </>
              )}
            </Button>
            
            <p className="text-center text-xs mt-4" style={{ color: THEME.textMuted }}>
              Guest users can browse and place orders
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntroScreen;
