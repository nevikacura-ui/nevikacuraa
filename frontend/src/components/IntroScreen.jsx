import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { 
  Pill, Calendar, TestTube, User, Phone, 
  Loader2, ArrowRight, Building2, Fingerprint
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const IntroScreen = ({ onComplete, user }) => {
  const navigate = useNavigate();
  const { setPatientAuth } = useAuth();
  
  // Phase: 'loading' -> 'splash'
  const [phase, setPhase] = useState('loading');
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  
  // Auth states
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [hasBiometricSetup, setHasBiometricSetup] = useState(false);
  
  // OTP states
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  
  const words = [
    { text: 'Book.', color: '#ffffff' },
    { text: 'Order.', color: '#fef3c7' },
    { text: 'Test.', color: '#e0f2fe' },
    { text: 'Care.', color: '#fce7f3' },
  ];
  
  const icons = [
    { Icon: Calendar, bgColor: 'bg-blue-200/80', iconColor: 'text-blue-600', label: 'Appointments' },
    { Icon: Pill, bgColor: 'bg-orange-200/80', iconColor: 'text-orange-600', label: 'Pharmacy' },
    { Icon: TestTube, bgColor: 'bg-purple-200/80', iconColor: 'text-purple-600', label: 'Lab Tests' },
  ];
  
  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);
  
  // Check biometric setup
  useEffect(() => {
    const biometricSetup = localStorage.getItem('biometricEnabled');
    const savedMobile = localStorage.getItem('biometricMobile');
    if (biometricSetup === 'true' && savedMobile) {
      setHasBiometricSetup(true);
    }
  }, []);
  
  // Check if already logged in
  useEffect(() => {
    const patientToken = localStorage.getItem('patientToken');
    if (patientToken || user) {
      onComplete();
    }
  }, [user, onComplete]);
  
  // Loading phase animation
  useEffect(() => {
    if (phase !== 'loading') return;
    
    const wordInterval = 220;
    const loadingDuration = 1200;
    
    // Animate words
    const wordTimers = words.map((_, index) => {
      return setTimeout(() => {
        setCurrentWordIndex(index);
      }, index * wordInterval);
    });
    
    // Transition to splash
    const transitionTimer = setTimeout(() => {
      setPhase('splash');
    }, loadingDuration);
    
    return () => {
      wordTimers.forEach(timer => clearTimeout(timer));
      clearTimeout(transitionTimer);
    };
  }, [phase]);
  
  // Auth handlers
  const handleSendOtp = async () => {
    if (mobile.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/patients/portal/send-otp?mobile=${mobile}`);
      setOtpSent(true);
      setMockOtp(response.data.mock_otp || '');
      toast.success('OTP sent to your mobile');
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Mobile not registered. Please visit clinic to register.');
      } else {
        toast.error('Failed to send OTP');
      }
    }
    setLoading(false);
  };
  
  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      toast.error('Please enter valid 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/patients/portal/verify-otp?mobile=${mobile}&otp=${otp}`);
      localStorage.setItem('patientToken', response.data.token);
      
      if (setPatientAuth) {
        setPatientAuth(response.data.token, response.data.patient);
      }
      
      localStorage.setItem('biometricMobile', mobile);
      localStorage.setItem('biometricPatientName', response.data.patient.name);
      
      toast.success(`Welcome, ${response.data.patient.name}!`);
      onComplete();
    } catch (error) {
      toast.error('Invalid OTP');
    }
    setLoading(false);
  };
  
  const handleBiometricLogin = async () => {
    const savedMobile = localStorage.getItem('biometricMobile');
    const savedName = localStorage.getItem('biometricPatientName');
    
    if (!savedMobile) {
      toast.error('Please login with OTP first to enable fingerprint');
      return;
    }
    
    setBiometricLoading(true);
    
    try {
      if (!window.PublicKeyCredential) {
        throw new Error('Biometric not supported');
      }
      
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        throw new Error('Fingerprint/Face ID not available');
      }
      
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const storedCredentialId = localStorage.getItem('biometricCredentialId');
      
      if (storedCredentialId) {
        try {
          const credentialIdArray = Uint8Array.from(atob(storedCredentialId), c => c.charCodeAt(0));
          const assertion = await navigator.credentials.get({
            publicKey: {
              challenge: challenge,
              rpId: window.location.hostname,
              userVerification: "required",
              timeout: 60000,
              allowCredentials: [{ id: credentialIdArray, type: "public-key", transports: ["internal"] }]
            }
          });
          
          if (assertion) {
            await performAutoLogin(savedMobile, savedName);
            return;
          }
        } catch (authErr) {
          console.log('Auth failed, creating new credential');
        }
      }
      
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: { name: "Nevika Cura", id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(savedMobile),
            name: savedMobile,
            displayName: savedName || savedMobile
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 60000,
          attestation: "none"
        }
      });
      
      if (credential) {
        const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        localStorage.setItem('biometricCredentialId', credentialId);
        await performAutoLogin(savedMobile, savedName);
      }
    } catch (error) {
      console.error('Biometric error:', error);
      toast.error('Fingerprint failed. Please use OTP login.');
    } finally {
      setBiometricLoading(false);
    }
  };
  
  const performAutoLogin = async (mobile, name) => {
    try {
      const otpResponse = await axios.post(`${API}/patients/portal/send-otp?mobile=${mobile}`);
      const verifyResponse = await axios.post(`${API}/patients/portal/verify-otp?mobile=${mobile}&otp=${otpResponse.data.mock_otp}`);
      
      localStorage.setItem('patientToken', verifyResponse.data.token);
      if (setPatientAuth) {
        setPatientAuth(verifyResponse.data.token, verifyResponse.data.patient);
      }
      
      toast.success(`Welcome back, ${verifyResponse.data.patient.name}!`);
      onComplete();
    } catch (err) {
      toast.error('Login failed. Please try OTP login.');
      setBiometricLoading(false);
    }
  };
  
  const handleStaffLogin = () => {
    onComplete();
    setTimeout(() => navigate('/staff'), 100);
  };
  
  return (
    <div 
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-6 overflow-hidden"
      style={{ 
        background: 'linear-gradient(165deg, #5eead4 0%, #2dd4bf 20%, #14b8a6 40%, #0d9488 60%, #0891b2 80%, #06b6d4 100%)'
      }}
    >
      {/* Skip Button */}
      <div className={`absolute top-4 right-4 z-50 transition-opacity duration-300 ${phase === 'splash' ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={onComplete}
          data-testid="skip-btn"
          className="flex items-center gap-1 px-4 py-2 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors text-sm font-medium"
        >
          Skip
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      
      {/* Content Container */}
      <div className="relative z-10 text-center max-w-md mx-auto flex flex-col items-center">
        
        {/* Logo - Always visible */}
        <div className="mb-6">
          <div className="bg-white rounded-[40px] px-8 py-5 shadow-xl">
            <img 
              src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
              alt="Nevika Cura" 
              className="h-20 w-auto object-contain"
            />
          </div>
          <div className={`h-1 w-20 bg-gradient-to-r from-teal-200 to-cyan-200 mx-auto rounded-full mt-3 transition-opacity duration-500 ${phase === 'splash' ? 'opacity-100' : 'opacity-0'}`}></div>
        </div>
        
        {/* LOADING PHASE: Words */}
        <div className={`transition-all duration-500 ${phase === 'loading' ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
          <div className="flex items-center justify-center gap-2 mb-6">
            {words.map((word, index) => (
              <span
                key={word.text}
                className={`text-2xl sm:text-3xl font-bold transition-all duration-300 ${
                  index <= currentWordIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ color: word.color, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
              >
                {word.text}
              </span>
            ))}
          </div>
          
          {/* Loading dots */}
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-white/80"
                style={{
                  animation: 'loadingDot 0.8s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`
                }}
              />
            ))}
          </div>
        </div>
        
        {/* SPLASH PHASE: Icons & Actions */}
        <div className={`transition-all duration-500 ${phase === 'splash' ? 'opacity-100' : 'opacity-0'}`}>
          {/* Icons */}
          <div className="flex justify-center items-center gap-6 mb-6">
            {icons.map(({ Icon, bgColor, iconColor, label }, idx) => (
              <div 
                key={label} 
                className="flex flex-col items-center gap-2"
                style={{
                  animation: phase === 'splash' ? 'fadeInUp 0.4s ease-out forwards' : 'none',
                  animationDelay: `${idx * 0.1}s`,
                  opacity: 0
                }}
              >
                <div className={`${bgColor} rounded-2xl flex items-center justify-center shadow-lg border border-white/40 w-[72px] h-[72px]`}>
                  <Icon className={`w-9 h-9 ${iconColor}`} />
                </div>
                <span className="text-sm text-white font-medium">{label}</span>
              </div>
            ))}
          </div>
          
          {/* Tagline */}
          <p className="text-lg text-white/90 font-medium mb-6">
            All your care. <span className="text-teal-100 font-bold">One app.</span>
          </p>
          
          {/* Action Buttons */}
          <div className="space-y-4 w-full max-w-xs mx-auto">
            {hasBiometricSetup && (
              <Button
                onClick={handleBiometricLogin}
                disabled={biometricLoading}
                className="w-full h-14 bg-white/20 backdrop-blur text-white hover:bg-white/30 rounded-2xl text-lg font-semibold border border-white/30 shadow-lg"
                data-testid="biometric-login-btn"
              >
                {biometricLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Fingerprint className="w-6 h-6 mr-2" />
                    Login with Fingerprint
                  </>
                )}
              </Button>
            )}
            
            <Button
              onClick={() => setShowAuth(true)}
              className="w-full h-14 bg-white text-teal-700 hover:bg-teal-50 rounded-2xl text-lg font-semibold shadow-xl"
              data-testid="splash-login-btn"
            >
              <User className="w-5 h-5 mr-2" />
              {hasBiometricSetup ? 'Login with OTP' : 'Login / Sign Up'}
            </Button>
            
            <div className="pt-6 border-t border-white/20">
              <button
                onClick={handleStaffLogin}
                className="flex items-center justify-center gap-2 text-sm text-white/70 hover:text-white transition-colors mx-auto"
              >
                <Building2 className="w-4 h-4" />
                Staff Login
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Auth Dialog */}
      <Dialog open={showAuth} onOpenChange={setShowAuth}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden" style={{ zIndex: 100000 }}>
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <User className="w-6 h-6" />
              Patient Login
            </DialogTitle>
            <DialogDescription className="text-white/80 mt-1">
              Enter your registered mobile number
            </DialogDescription>
          </div>
          
          <div className="p-6 space-y-4">
            {!otpSent ? (
              <>
                <div>
                  <Label className="text-gray-600">Mobile Number</Label>
                  <div className="flex gap-2 mt-1.5">
                    <div className="flex items-center px-3 bg-gray-100 rounded-l-xl border border-r-0 border-gray-200">
                      <span className="text-gray-500 text-sm">+91</span>
                    </div>
                    <Input
                      type="tel"
                      placeholder="Enter mobile number"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="rounded-l-none rounded-r-xl h-12"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleSendOtp}
                  disabled={loading || mobile.length < 10}
                  className="w-full h-12 bg-teal-600 hover:bg-teal-700 rounded-xl"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
                </Button>
                
                <p className="text-center text-sm text-gray-500">
                  Not registered? Visit our clinic to create your profile.
                </p>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <p className="text-gray-600">OTP sent to <strong>+91 {mobile}</strong></p>
                  <button 
                    onClick={() => { setOtpSent(false); setOtp(''); }}
                    className="text-teal-600 text-sm underline mt-1"
                  >
                    Change number
                  </button>
                </div>
                
                {mockOtp && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <p className="text-xs text-amber-700">Test OTP: <strong className="text-lg">{mockOtp}</strong></p>
                  </div>
                )}
                
                <div>
                  <Label className="text-gray-600">Enter OTP</Label>
                  <Input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-12 text-center text-xl tracking-widest rounded-xl mt-1.5"
                    maxLength={6}
                  />
                </div>
                
                <Button 
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length < 6}
                  className="w-full h-12 bg-teal-600 hover:bg-teal-700 rounded-xl"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes loadingDot {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default IntroScreen;
