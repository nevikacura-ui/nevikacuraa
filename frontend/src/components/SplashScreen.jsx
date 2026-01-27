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
  Pill, Calendar, TestTube, Stethoscope, User, Phone, 
  Loader2, ArrowRight, Building2, LogIn, Fingerprint
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const SplashScreen = ({ onComplete, user }) => {
  const navigate = useNavigate();
  const { biometricAvailable, biometricEnabled, loginWithBiometric, setPatientAuth } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // login or signup
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  
  // Check if user has biometric enabled (stored locally)
  const [hasBiometricSetup, setHasBiometricSetup] = useState(false);
  
  // OTP Login states
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  
  // Animation state
  const [animationComplete, setAnimationComplete] = useState(false);
  
  // Check for biometric setup on mount
  useEffect(() => {
    const biometricSetup = localStorage.getItem('biometricEnabled');
    const savedMobile = localStorage.getItem('biometricMobile');
    if (biometricSetup === 'true' && savedMobile) {
      setHasBiometricSetup(true);
    }
  }, []);
  // Lock body scroll when splash screen is visible
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
  
  useEffect(() => {
    // Trigger animation completion after 1.5 seconds
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);
  
  // Check if user is already logged in
  useEffect(() => {
    const patientToken = localStorage.getItem('patientToken');
    if (patientToken || user) {
      onComplete();
    }
  }, [user, onComplete]);
  
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
      
      // Sync with AuthContext
      if (setPatientAuth) {
        setPatientAuth(response.data.token, response.data.patient);
      }
      
      // Save mobile for biometric login
      localStorage.setItem('biometricMobile', mobile);
      localStorage.setItem('biometricPatientName', response.data.patient.name);
      
      // Check if biometric is available and offer to enable
      try {
        if (window.PublicKeyCredential) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          if (available) {
            localStorage.setItem('biometricAvailable', 'true');
            localStorage.setItem('biometricEnabled', 'true');
            toast.success(`Welcome, ${response.data.patient.name}! Fingerprint login enabled for next time.`);
          } else {
            toast.success(`Welcome, ${response.data.patient.name}!`);
          }
        } else {
          toast.success(`Welcome, ${response.data.patient.name}!`);
        }
      } catch (bioErr) {
        toast.success(`Welcome, ${response.data.patient.name}!`);
      }
      
      onComplete();
    } catch (error) {
      toast.error('Invalid OTP');
    }
    setLoading(false);
  };
  
  // Handle biometric/fingerprint login - Simplified for mobile devices
  const handleBiometricLogin = async () => {
    const savedMobile = localStorage.getItem('biometricMobile');
    const savedName = localStorage.getItem('biometricPatientName');
    
    if (!savedMobile) {
      toast.error('Please login with OTP first to enable fingerprint');
      return;
    }
    
    setBiometricLoading(true);
    
    try {
      // Check if WebAuthn/Biometric is available
      if (!window.PublicKeyCredential) {
        throw new Error('Biometric not supported on this device');
      }
      
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      if (!available) {
        throw new Error('Fingerprint/Face ID not available');
      }
      
      // For mobile devices, use simpler biometric prompt
      // Create a unique challenge
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      // Create credential options for biometric verification
      const publicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: {
          name: "Nevika Cura",
          id: window.location.hostname
        },
        user: {
          id: new TextEncoder().encode(savedMobile),
          name: savedMobile,
          displayName: savedName || savedMobile
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },   // ES256
          { alg: -257, type: "public-key" }  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred"
        },
        timeout: 60000,
        attestation: "none"
      };
      
      // Check if we already have a credential stored
      const storedCredentialId = localStorage.getItem('biometricCredentialId');
      
      if (storedCredentialId) {
        // Try to authenticate with existing credential
        try {
          const credentialIdArray = Uint8Array.from(atob(storedCredentialId), c => c.charCodeAt(0));
          
          const assertion = await navigator.credentials.get({
            publicKey: {
              challenge: challenge,
              rpId: window.location.hostname,
              userVerification: "required",
              timeout: 60000,
              allowCredentials: [{
                id: credentialIdArray,
                type: "public-key",
                transports: ["internal"]
              }]
            }
          });
          
          if (assertion) {
            // Biometric verified! Auto-login the user
            await performAutoLogin(savedMobile, savedName);
            return;
          }
        } catch (authErr) {
          console.log('Auth with stored credential failed, trying to create new one');
        }
      }
      
      // Create new credential (first time or if stored one failed)
      try {
        const credential = await navigator.credentials.create({
          publicKey: publicKeyCredentialCreationOptions
        });
        
        if (credential) {
          // Store the credential ID for future logins
          const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
          localStorage.setItem('biometricCredentialId', credentialId);
          
          // Biometric verified! Auto-login the user
          await performAutoLogin(savedMobile, savedName);
          return;
        }
      } catch (createErr) {
        console.error('Credential creation failed:', createErr);
        throw createErr;
      }
      
    } catch (error) {
      console.error('Biometric login error:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Fingerprint authentication was cancelled');
      } else if (error.name === 'SecurityError') {
        toast.error('Biometric requires secure connection (HTTPS)');
      } else if (error.message?.includes('not supported')) {
        toast.error('Fingerprint not supported on this device');
      } else {
        toast.error('Fingerprint failed. Please use OTP login.');
      }
    } finally {
      setBiometricLoading(false);
    }
  };
  
  // Helper function to perform auto-login after biometric verification
  const performAutoLogin = async (mobile, name) => {
    try {
      // Send OTP silently
      const otpResponse = await axios.post(`${API}/patients/portal/send-otp?mobile=${mobile}`);
      const mockOtpValue = otpResponse.data.mock_otp;
      
      // Verify OTP
      const verifyResponse = await axios.post(`${API}/patients/portal/verify-otp?mobile=${mobile}&otp=${mockOtpValue}`);
      
      localStorage.setItem('patientToken', verifyResponse.data.token);
      
      if (setPatientAuth) {
        setPatientAuth(verifyResponse.data.token, verifyResponse.data.patient);
      }
      
      toast.success(`Welcome back, ${verifyResponse.data.patient.name}!`);
      onComplete();
    } catch (err) {
      console.error('Auto-login failed:', err);
      toast.error('Login failed. Please try OTP login.');
      setBiometricLoading(false);
    }
  };
  
  const handleExplore = () => {
    onComplete();
  };
  
  const handleStaffLogin = () => {
    // Close splash screen first, then navigate
    onComplete();
    // Small delay to ensure splash closes before navigation
    setTimeout(() => {
      navigate('/staff');
    }, 100);
  };
  
  const handleLoginClick = () => {
    setShowAuth(true);
  };
  
  // Icons with pastel colors
  const icons = [
    { Icon: Calendar, bgColor: 'bg-blue-200/80', iconColor: 'text-blue-600', label: 'Appointments', animDelay: '0s' },
    { Icon: Pill, bgColor: 'bg-orange-200/80', iconColor: 'text-orange-600', label: 'Pharmacy', animDelay: '0.3s' },
    { Icon: TestTube, bgColor: 'bg-purple-200/80', iconColor: 'text-purple-600', label: 'Lab Tests', animDelay: '0.6s' },
  ];
  
  return (
    <div 
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-start p-6 overflow-hidden"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        width: '100vw',
        height: '100vh',
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        overflowY: 'hidden',
        background: 'linear-gradient(165deg, #5eead4 0%, #2dd4bf 20%, #14b8a6 40%, #0d9488 60%, #0891b2 80%, #06b6d4 100%)'
      }}
    >
      {/* Soft Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 right-5 w-64 h-64 bg-teal-300/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-cyan-200/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
      
      {/* Skip Button - Top Right */}
      {animationComplete && (
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={handleExplore}
            data-testid="skip-btn"
            className="flex items-center gap-1 px-4 py-2 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors text-sm font-medium backdrop-blur-sm"
          >
            Skip
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Content - Positioned higher */}
      <div className="relative z-10 text-center max-w-md mx-auto flex flex-col items-center mt-16 sm:mt-20">
        {/* Logo/Brand - Oval/Pill shaped container, positioned higher */}
        <div className="mb-5">
          <div className="bg-white rounded-[40px] px-8 py-5 shadow-2xl shadow-black/20">
            <img 
              src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
              alt="Nevika Cura" 
              className="h-20 w-auto object-contain"
            />
          </div>
          <div className="h-1 w-20 bg-gradient-to-r from-teal-200 to-cyan-200 mx-auto rounded-full mt-4"></div>
        </div>
        
        {/* Animated Icons - Pastel colors */}
        <div className="flex justify-center items-center gap-6 mb-6">
          {icons.map(({ Icon, bgColor, iconColor, label, animDelay }, idx) => (
            <div 
              key={idx}
              className="flex flex-col items-center gap-2 icon-disappear"
              style={{ animationDelay: animDelay }}
            >
              <div className={`w-18 h-18 ${bgColor} backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg shadow-black/10 transform hover:scale-110 transition-transform border border-white/40`}
                   style={{ width: '72px', height: '72px' }}>
                <Icon className={`w-9 h-9 ${iconColor}`} />
              </div>
              <span className="text-sm text-white font-medium drop-shadow-sm">{label}</span>
            </div>
          ))}
        </div>
        
        {/* Caption */}
        <p className="text-lg text-white/90 font-medium mb-6 drop-shadow-sm">
          All your care. <span className="text-teal-100 font-bold">One app.</span>
        </p>
        
        {/* Action Buttons */}
        {animationComplete && (
          <div className="space-y-4 animate-fade-in w-full max-w-xs">
            {/* Fingerprint Login - Show if previously logged in */}
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
            
            {/* Login/Signup Button - Primary Action */}
            <Button
              onClick={handleLoginClick}
              className="w-full h-14 bg-white text-teal-700 hover:bg-teal-50 rounded-2xl text-lg font-semibold shadow-xl shadow-black/20"
              data-testid="splash-login-btn"
            >
              <User className="w-5 h-5 mr-2" />
              {hasBiometricSetup ? 'Login with OTP' : 'Login / Sign Up'}
            </Button>
            
            {/* Staff Login */}
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
        )}
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
      
      {/* CSS for animations */}
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes icon-disappear {
          0% { opacity: 0; transform: scale(0.8) translateY(10px); }
          20% { opacity: 1; transform: scale(1) translateY(0); }
          80% { opacity: 1; transform: scale(1) translateY(0); }
          100% { opacity: 0; transform: scale(0.8) translateY(-10px); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        .icon-disappear {
          animation: icon-disappear 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
