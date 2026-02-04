import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Mail, Phone, ArrowRight, Loader2, User, X, Calendar, FlaskConical, Package } from 'lucide-react';
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
    tagline: 'Skip the Queue. See the Doctor.',
    icon: Calendar,
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&h=400&fit=crop',
    gradient: 'from-[#1F4F46] to-[#2E6B5F]'
  },
  {
    id: 2,
    tagline: 'Lab Tests at Your Doorstep.',
    icon: FlaskConical,
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&h=400&fit=crop',
    gradient: 'from-[#F4A43A] to-[#E48C1C]'
  },
  {
    id: 3,
    tagline: 'Genuine Medicines. Delivered Fast.',
    icon: Package,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&h=400&fit=crop',
    gradient: 'from-[#FF5733] to-[#E84118]'
  },
  {
    id: 4,
    tagline: 'All Your Health. One Place.',
    icon: Calendar,
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop',
    gradient: 'from-[#2E6B5F] to-[#3E8A7A]'
  }
];

const IntroScreen = ({ onComplete, user }) => {
  const { setPatientAuth } = useAuth();
  
  // Skip splash - go directly to main
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [mobile, setMobile] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  
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
  
  // Auto-slide carousel
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 4000);
    
    return () => clearInterval(slideTimer);
  }, []);
  
  // Auth functions
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
      toast.success('Welcome!');
      onComplete();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    }
    setLoading(false);
  };
  
  const guestLogin = () => {
    if (!mobile || mobile.length !== 10) {
      toast.error('Enter valid 10-digit mobile');
      return;
    }
    localStorage.setItem('guestMobile', mobile);
    localStorage.setItem('guestMode', 'true');
    toast.success('Welcome!');
    onComplete();
  };

  // Current slide data
  const slide = CAROUSEL_SLIDES[currentSlide];
  const SlideIcon = slide.icon;

  // ========== MAIN SCREEN (No splash phase) ==========
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-white">
      
      {/* ===== CAROUSEL SECTION (65% screen) ===== */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: '65vh' }}>
        
        {/* Background gradient */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} transition-all duration-700`}
          style={{ opacity: 0.95 }}
        />
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col px-6 pt-10 pb-4">
          
          {/* Icon */}
          <div className="mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <SlideIcon className="w-7 h-7 text-white" />
            </div>
          </div>
          
          {/* Tagline - Simple & Bold */}
          <h1 className="text-3xl font-bold text-white leading-tight mb-8">
            {slide.tagline}
          </h1>
          
          {/* Image - Centered & Prominent */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-[300px] h-48 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
              <img 
                src={slide.image} 
                alt={slide.tagline}
                className="w-full h-full object-cover"
              />
            </div>
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
        
        {/* Welcome Text */}
        <div className="text-center mb-4">
          <p className="text-base" style={{ color: THEME.textMuted }}>Welcome to</p>
          <h2 className="text-2xl font-bold">
            <span style={{ color: THEME.accent }}>Nevika</span>
            <span style={{ color: THEME.primary }}>Cura</span>
          </h2>
          <p className="text-xs mt-1" style={{ color: THEME.textMuted }}>Your Health, On Demand</p>
        </div>
        
        {/* 2x1 Toggle Buttons */}
        <div className="flex gap-3 mb-3">
          <Button 
            onClick={() => { setAuthMode('email'); setShowAuthModal(true); }}
            className="flex-1 h-12 rounded-xl font-semibold text-sm"
            style={{ background: THEME.accent, color: 'white' }}>
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          
          <Button 
            onClick={() => { setAuthMode('guest'); setShowAuthModal(true); }}
            variant="outline"
            className="flex-1 h-12 rounded-xl font-semibold text-sm border-2"
            style={{ borderColor: THEME.primary, color: THEME.primary }}>
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
                {authMode === 'email' ? 'Login with Email' : 'Guest Access'}
              </h3>
              <button 
                onClick={() => { setShowAuthModal(false); setOtpSent(false); setEmail(''); setOtp(''); setMobile(''); }}
                className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" style={{ color: THEME.textMuted }} />
              </button>
            </div>
            
            {/* Email Form */}
            {authMode === 'email' && !otpSent && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: THEME.textMuted }}>
                  Enter your email to receive OTP
                </p>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: THEME.textMuted }} />
                  <Input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="h-14 pl-12 rounded-2xl text-base border-2"
                  />
                </div>
                <Button 
                  onClick={sendOtp}
                  disabled={loading || !email}
                  className="w-full h-14 rounded-2xl font-bold"
                  style={{ background: THEME.accent }}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
                </Button>
              </div>
            )}
            
            {/* OTP Form */}
            {authMode === 'email' && otpSent && (
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
                />
                <Button 
                  onClick={verifyOtp}
                  disabled={loading || otp.length < 4}
                  className="w-full h-14 rounded-2xl font-bold"
                  style={{ background: THEME.accent }}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
                </Button>
                <button onClick={() => setOtpSent(false)} className="w-full text-center text-sm" style={{ color: THEME.secondary }}>
                  Change Email
                </button>
              </div>
            )}
            
            {/* Guest Form */}
            {authMode === 'guest' && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: THEME.textMuted }}>
                  Enter mobile number to continue (No OTP required)
                </p>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: THEME.textMuted }} />
                  <span className="absolute left-12 top-1/2 -translate-y-1/2 font-medium" style={{ color: THEME.textMuted }}>+91</span>
                  <Input 
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="h-14 pl-24 rounded-2xl text-base border-2"
                    maxLength={10}
                  />
                </div>
                <Button 
                  onClick={guestLogin}
                  disabled={mobile.length !== 10}
                  className="w-full h-14 rounded-2xl font-bold"
                  style={{ background: THEME.primary }}>
                  Continue as Guest
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
