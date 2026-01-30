import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import AuthDialogV2 from './AuthDialogV2';
import { 
  Pill, Calendar, TestTube, User, 
  ArrowRight, Building2, Fingerprint, Loader2
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

// Refined Teal Theme - Premium Medical Trust
const THEME = {
  gradientTop: '#4FE3C1',      // Fresh, welcoming teal
  gradientBottom: '#0F9D8C',    // Deep, medical trust teal
  accent: '#0F6F66',            // CTA text - deep teal
  iconColors: {
    appointments: '#E6F4FF',    // Soft blue
    pharmacy: '#FFF4D6',        // Warm cream
    labTests: '#F0E9FF',        // Light lavender
  }
};

const IntroScreen = ({ onComplete, user }) => {
  const navigate = useNavigate();
  const { setPatientAuth } = useAuth();
  
  // Start with 'init' to prevent flash, then go to 'loading'
  const [phase, setPhase] = useState('init');
  const [wordIndex, setWordIndex] = useState(-1);
  
  // Auth dialog state
  const [showAuth, setShowAuth] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [hasBiometricSetup, setHasBiometricSetup] = useState(false);
  
  const words = ['Book.', 'Order.', 'Test.', 'Care.'];
  
  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  
  // Check biometric setup
  useEffect(() => {
    const setup = localStorage.getItem('biometricEnabled');
    const savedEmail = localStorage.getItem('authUser');
    if (setup === 'true' && savedEmail) setHasBiometricSetup(true);
  }, []);
  
  // Check if already logged in
  useEffect(() => {
    // Check for new auth token first, then legacy token
    const authToken = localStorage.getItem('authToken');
    const patientToken = localStorage.getItem('patientToken');
    if (authToken || patientToken || user) {
      onComplete();
    }
  }, [user, onComplete]);
  
  // Initialize - start the loading phase
  useEffect(() => {
    const initTimer = setTimeout(() => {
      setPhase('loading');
    }, 50);
    return () => clearTimeout(initTimer);
  }, []);
  
  // Loading animation - show words then switch to splash
  useEffect(() => {
    if (phase !== 'loading') return;
    
    const wordTimer = setInterval(() => {
      setWordIndex(prev => {
        if (prev >= words.length - 1) {
          clearInterval(wordTimer);
          setTimeout(() => setPhase('splash'), 300);
          return prev;
        }
        return prev + 1;
      });
    }, 250);
    
    return () => clearInterval(wordTimer);
  }, [phase]);
  
  // Handle successful authentication
  const handleAuthSuccess = (userData, token, isGuest) => {
    if (isGuest) {
      // Guest users get temporary access
      toast.success('Guest session started! Complete your order.');
      onComplete();
    } else {
      // Registered users get full access
      if (setPatientAuth) {
        setPatientAuth(token, userData);
      }
      // Also store as legacy token for backward compatibility
      localStorage.setItem('patientToken', token);
      onComplete();
    }
  };
  
  // Biometric login handler
  const handleBiometricLogin = async () => {
    const savedUser = localStorage.getItem('authUser');
    if (!savedUser) {
      toast.error('Please login first');
      return;
    }
    
    setBiometricLoading(true);
    try {
      if (!window.PublicKeyCredential) throw new Error('Not supported');
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) throw new Error('Not available');
      
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const storedId = localStorage.getItem('biometricCredentialId');
      
      if (storedId) {
        const arr = Uint8Array.from(atob(storedId), c => c.charCodeAt(0));
        await navigator.credentials.get({
          publicKey: { challenge, rpId: window.location.hostname, userVerification: "required", allowCredentials: [{ id: arr, type: "public-key" }] }
        });
      }
      
      // If biometric succeeds, use existing token
      const token = localStorage.getItem('authToken');
      if (token) {
        toast.success('Welcome back!');
        onComplete();
      } else {
        throw new Error('No saved session');
      }
    } catch (e) {
      toast.error('Biometric login failed. Please use login.');
    }
    setBiometricLoading(false);
  };

  // RENDER INIT PHASE - refined teal gradient
  if (phase === 'init') {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
        style={{ background: `linear-gradient(180deg, ${THEME.gradientTop} 0%, ${THEME.gradientBottom} 100%)` }}>
      </div>
    );
  }

  // RENDER LOADING PHASE - Refined Teal with premium feel
  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
        style={{ background: `linear-gradient(180deg, ${THEME.gradientTop} 0%, ${THEME.gradientBottom} 100%)` }}>
        
        {/* Logo - Elevated with depth */}
        <div className="mb-8">
          <div className="bg-white rounded-[36px] px-6 py-4"
            style={{ 
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid rgba(255,255,255,0.25)'
            }}>
            <img src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
              alt="Nevika Cura" className="h-16 w-auto" />
          </div>
        </div>
        
        {/* Words */}
        <div className="flex gap-2">
          {words.map((word, i) => (
            <span key={word} 
              className={`text-2xl sm:text-3xl font-bold text-white transition-all duration-300 ${i <= wordIndex ? 'opacity-100' : 'opacity-0'}`}
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              {word}
            </span>
          ))}
        </div>
        
        {/* Loading dots */}
        <div className="mt-6 flex gap-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-white/70 animate-pulse" 
              style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  // RENDER SPLASH PHASE - Refined Premium Teal
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-6"
      style={{ background: `linear-gradient(180deg, ${THEME.gradientTop} 0%, ${THEME.gradientBottom} 100%)` }}>
      
      {/* Skip - Improved opacity 90% + accessibility */}
      <button onClick={onComplete} data-testid="skip-btn"
        className="absolute top-4 right-4 flex items-center gap-1 px-4 py-2 text-white/90 hover:text-white rounded-full text-sm font-medium transition-colors">
        Skip <ArrowRight className="w-4 h-4" />
      </button>
      
      <div className="text-center max-w-md mx-auto">
        {/* Logo Card - Elevated with depth, +4px radius */}
        <div className="mb-6">
          <div className="bg-white rounded-[44px] px-8 py-5 inline-block"
            style={{ 
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid rgba(255,255,255,0.25)'
            }}>
            <img src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
              alt="Nevika Cura" className="h-20 w-auto" />
          </div>
        </div>
        
        {/* Icons - Softer pastel medical tones */}
        <div className="flex justify-center gap-5 mb-6">
          {[
            { Icon: Calendar, bg: THEME.iconColors.appointments, emoji: '📅', label: 'Appointments' },
            { Icon: Pill, bg: THEME.iconColors.pharmacy, emoji: '💊', label: 'Pharmacy' },
            { Icon: TestTube, bg: THEME.iconColors.labTests, emoji: '🧪', label: 'Lab Tests' },
          ].map(({ emoji, bg, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="rounded-full w-[72px] h-[72px] flex items-center justify-center border-4 border-white/30"
                style={{ backgroundColor: bg, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <span className="text-4xl">{emoji}</span>
              </div>
              <span className="text-sm text-white font-bold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>{label}</span>
            </div>
          ))}
        </div>
        
        {/* Tagline - +2px font, 1.2 line height for elderly-friendly */}
        <p className="text-[1.375rem] text-white font-bold mb-6" style={{ lineHeight: '1.2' }}>
          All your care. <span className="text-yellow-200">One app.</span>
        </p>
        
        {/* Buttons */}
        <div className="space-y-4 max-w-xs mx-auto">
          {hasBiometricSetup && (
            <Button onClick={handleBiometricLogin} disabled={biometricLoading}
              className="w-full h-14 bg-white/20 text-white hover:bg-white/30 rounded-full text-lg font-bold border-2 border-white/40 transition-all">
              {biometricLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Fingerprint className="w-6 h-6 mr-2" />Fingerprint</>}
            </Button>
          )}
          
          {/* CTA Button - Deep teal text, font-weight 600, faint inner shadow */}
          <Button onClick={() => setShowAuth(true)} data-testid="splash-login-btn"
            className="w-full h-14 bg-white hover:bg-gray-50 rounded-full text-lg font-semibold transition-all"
            style={{ 
              color: THEME.accent,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15), inset 0 1px 2px rgba(0,0,0,0.05)'
            }}>
            <User className="w-5 h-5 mr-2" />
            Login / Sign Up
          </Button>
          
          <div className="pt-6 border-t border-white/20">
            <button onClick={() => { onComplete(); setTimeout(() => navigate('/staff'), 100); }}
              className="flex items-center justify-center gap-2 text-sm text-white/80 hover:text-white mx-auto transition-colors">
              <Building2 className="w-4 h-4" /> Staff Login
            </button>
          </div>
        </div>
      </div>
      
      {/* New Auth Dialog V2 */}
      <AuthDialogV2 
        open={showAuth}
        onOpenChange={setShowAuth}
        onAuthSuccess={handleAuthSuccess}
        mode="default"
      />
    </div>
  );
};

export default IntroScreen;
