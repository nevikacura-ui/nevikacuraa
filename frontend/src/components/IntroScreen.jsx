import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Mail, Phone, ArrowRight, Loader2, User, Sparkles } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

// Theme colors matching Mango palette
const THEME = {
  primary: '#1F4F46',
  secondary: '#2E6B5F',
  accent: '#F4A43A',
  accentDark: '#E48C1C',
  light: '#3E8A7A',
  background: '#F7F9F8',
  text: '#2B2B2B',
  textMuted: '#6F7B77'
};

const IntroScreen = ({ onComplete, user }) => {
  const { setPatientAuth } = useAuth();
  
  // Phases: 'splash' -> 'auth'
  const [phase, setPhase] = useState('splash');
  const [textIndex, setTextIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  
  // Auth state
  const [authMode, setAuthMode] = useState('select'); // 'select', 'email', 'guest'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [mobile, setMobile] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const splashTexts = ['Book Tests...', 'Order Medicines...', 'Consult Doctors...', 'Health at Home...'];
  
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
          setTimeout(() => setPhase('auth'), 500);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
    
    return () => clearInterval(textTimer);
  }, [phase]);
  
  // Cursor blink
  useEffect(() => {
    const cursorTimer = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(cursorTimer);
  }, []);
  
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
    try {
      // Store guest mobile locally
      localStorage.setItem('guestMobile', mobile);
      localStorage.setItem('guestMode', 'true');
      toast.success('Guest session started!');
      onComplete();
    } catch (error) {
      toast.error('Something went wrong');
    }
    setLoading(false);
  };

  // ========== SPLASH SCREEN ==========
  if (phase === 'splash') {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.secondary} 50%, ${THEME.light} 100%)` }}>
        
        {/* Logo */}
        <div className="mb-10 animate-pulse">
          <div className="bg-white rounded-3xl px-6 py-4 shadow-2xl">
            <img src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
              alt="Nevika Cura" className="h-20 w-auto" />
          </div>
        </div>
        
        {/* Animated Text */}
        <div className="h-12 flex items-center justify-center">
          <span className="text-2xl sm:text-3xl font-bold text-white tracking-wide"
            style={{ 
              textShadow: '0 4px 16px rgba(0,0,0,0.3)',
              animation: 'fadeInUp 0.5s ease-out'
            }}>
            {splashTexts[textIndex]}
            <span className={`ml-1 ${showCursor ? 'opacity-100' : 'opacity-0'}`}>|</span>
          </span>
        </div>
        
        {/* Loading dots at bottom */}
        <div className="absolute bottom-20 flex gap-2">
          {splashTexts.map((_, i) => (
            <div key={i} 
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i <= textIndex ? 'bg-white scale-100' : 'bg-white/30 scale-75'
              }`} />
          ))}
        </div>
        
        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ========== AUTH SCREEN ==========
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col"
      style={{ background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.secondary} 100%)` }}>
      
      {/* Top Section - Logo & Welcome */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-10">
        {/* Logo */}
        <div className="mb-6">
          <div className="bg-white rounded-3xl px-5 py-3 shadow-xl">
            <img src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
              alt="Nevika Cura" className="h-14 w-auto" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Welcome to Nevika Cura</h1>
        <p className="text-white/70 text-sm mb-8">Your complete healthcare companion</p>
        
        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {['Lab Tests', 'Medicines', 'Doctors', 'Clinics'].map((item) => (
            <span key={item} className="px-3 py-1 bg-white/10 rounded-full text-white text-xs font-medium">
              {item}
            </span>
          ))}
        </div>
      </div>
      
      {/* Bottom Section - Auth Form */}
      <div className="bg-white rounded-t-[32px] px-6 py-8 shadow-2xl" style={{ minHeight: '50vh' }}>
        
        {/* Selection Mode */}
        {authMode === 'select' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center mb-6" style={{ color: THEME.text }}>
              Get Started
            </h2>
            
            {/* Email Login */}
            <Button 
              onClick={() => setAuthMode('email')}
              className="w-full h-14 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-3"
              style={{ background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.secondary} 100%)` }}>
              <Mail className="w-5 h-5" />
              Continue with Email
              <ArrowRight className="w-5 h-5 ml-auto" />
            </Button>
            
            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-400">or</span>
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
            
            <p className="text-center text-xs text-gray-400 mt-6">
              By continuing, you agree to our Terms of Service & Privacy Policy
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
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                <p className="text-sm text-gray-500 mb-4">
                  OTP sent to <span className="font-medium">{email}</span>
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
            
            <p className="text-sm text-gray-500 mb-4">
              Enter your mobile number to continue as guest. No OTP required!
            </p>
            
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <span className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-400 font-medium">+91</span>
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
              style={{ background: `linear-gradient(135deg, ${THEME.accent} 0%, ${THEME.accentDark} 100%)` }}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <User className="w-5 h-5 mr-2" />
                  Continue as Guest
                </>
              )}
            </Button>
            
            <p className="text-center text-xs text-gray-400 mt-4">
              Guest users can browse and place orders. Sign up for full features.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntroScreen;
