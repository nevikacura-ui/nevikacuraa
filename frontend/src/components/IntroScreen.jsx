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
  Pill, Calendar, TestTube, User, 
  Loader2, ArrowRight, Building2, Fingerprint
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const IntroScreen = ({ onComplete, user }) => {
  const navigate = useNavigate();
  const { setPatientAuth } = useAuth();
  
  // Start with 'init' to prevent flash, then go to 'loading'
  const [phase, setPhase] = useState('init');
  const [wordIndex, setWordIndex] = useState(-1);
  
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
  
  const words = ['Book.', 'Order.', 'Test.', 'Care.'];
  
  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  
  // Check biometric
  useEffect(() => {
    const setup = localStorage.getItem('biometricEnabled');
    const savedMobile = localStorage.getItem('biometricMobile');
    if (setup === 'true' && savedMobile) setHasBiometricSetup(true);
  }, []);
  
  // Check logged in
  useEffect(() => {
    const token = localStorage.getItem('patientToken');
    if (token || user) onComplete();
  }, [user, onComplete]);
  
  // Initialize - start the loading phase
  useEffect(() => {
    // Small delay to ensure component is mounted
    const initTimer = setTimeout(() => {
      setPhase('loading');
    }, 50);
    return () => clearTimeout(initTimer);
  }, []);
  
  // Loading animation - show words then switch to splash
  useEffect(() => {
    if (phase !== 'loading') return;
    
    // Show each word
    const wordTimer = setInterval(() => {
      setWordIndex(prev => {
        if (prev >= words.length - 1) {
          clearInterval(wordTimer);
          // Switch to splash after all words shown
          setTimeout(() => setPhase('splash'), 300);
          return prev;
        }
        return prev + 1;
      });
    }, 250);
    
    return () => clearInterval(wordTimer);
  }, [phase]);
  
  // Auth handlers
  const handleSendOtp = async () => {
    if (mobile.length < 10) { toast.error('Enter valid 10-digit number'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/patients/portal/send-otp?mobile=${mobile}`);
      setOtpSent(true);
      setMockOtp(res.data.mock_otp || '');
      toast.success('OTP sent!');
    } catch (e) {
      toast.error(e.response?.status === 404 ? 'Mobile not registered' : 'Failed to send OTP');
    }
    setLoading(false);
  };
  
  const handleVerifyOtp = async () => {
    if (otp.length < 6) { toast.error('Enter 6-digit OTP'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/patients/portal/verify-otp?mobile=${mobile}&otp=${otp}`);
      localStorage.setItem('patientToken', res.data.token);
      localStorage.setItem('biometricMobile', mobile);
      if (setPatientAuth) setPatientAuth(res.data.token, res.data.patient);
      toast.success(`Welcome, ${res.data.patient.name}!`);
      onComplete();
    } catch { toast.error('Invalid OTP'); }
    setLoading(false);
  };
  
  const handleBiometricLogin = async () => {
    const savedMobile = localStorage.getItem('biometricMobile');
    if (!savedMobile) { toast.error('Login with OTP first'); return; }
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
      
      // Auto login
      const otpRes = await axios.post(`${API}/patients/portal/send-otp?mobile=${savedMobile}`);
      const verifyRes = await axios.post(`${API}/patients/portal/verify-otp?mobile=${savedMobile}&otp=${otpRes.data.mock_otp}`);
      localStorage.setItem('patientToken', verifyRes.data.token);
      if (setPatientAuth) setPatientAuth(verifyRes.data.token, verifyRes.data.patient);
      toast.success(`Welcome back!`);
      onComplete();
    } catch { toast.error('Fingerprint failed'); }
    setBiometricLoading(false);
  };

  // RENDER LOADING PHASE
  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(165deg, #5eead4 0%, #2dd4bf 20%, #14b8a6 40%, #0d9488 60%, #0891b2 80%, #06b6d4 100%)' }}>
        
        {/* Logo */}
        <div className="mb-8">
          <div className="bg-white rounded-[32px] px-6 py-4 shadow-2xl">
            <img src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
              alt="Nevika Cura" className="h-16 w-auto" />
          </div>
        </div>
        
        {/* Words */}
        <div className="flex gap-2">
          {words.map((word, i) => (
            <span key={word} 
              className={`text-2xl sm:text-3xl font-bold text-white transition-all duration-300 ${i <= wordIndex ? 'opacity-100' : 'opacity-0'}`}
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
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

  // RENDER SPLASH PHASE
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-6"
      style={{ background: 'linear-gradient(165deg, #5eead4 0%, #2dd4bf 20%, #14b8a6 40%, #0d9488 60%, #0891b2 80%, #06b6d4 100%)' }}>
      
      {/* Skip */}
      <button onClick={onComplete} data-testid="skip-btn"
        className="absolute top-4 right-4 flex items-center gap-1 px-4 py-2 text-white/90 hover:text-white rounded-full text-sm font-medium">
        Skip <ArrowRight className="w-4 h-4" />
      </button>
      
      <div className="text-center max-w-md mx-auto">
        {/* Logo */}
        <div className="mb-6">
          <div className="bg-white rounded-[40px] px-8 py-5 shadow-xl inline-block">
            <img src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
              alt="Nevika Cura" className="h-20 w-auto" />
          </div>
        </div>
        
        {/* Icons */}
        <div className="flex justify-center gap-6 mb-6">
          {[
            { Icon: Calendar, bg: 'bg-blue-200/80', color: 'text-blue-600', label: 'Appointments' },
            { Icon: Pill, bg: 'bg-orange-200/80', color: 'text-orange-600', label: 'Pharmacy' },
            { Icon: TestTube, bg: 'bg-purple-200/80', color: 'text-purple-600', label: 'Lab Tests' },
          ].map(({ Icon, bg, color, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className={`${bg} rounded-2xl w-[72px] h-[72px] flex items-center justify-center shadow-lg border border-white/40`}>
                <Icon className={`w-9 h-9 ${color}`} />
              </div>
              <span className="text-sm text-white font-medium">{label}</span>
            </div>
          ))}
        </div>
        
        {/* Tagline */}
        <p className="text-lg text-white/90 font-medium mb-6">
          All your care. <span className="text-teal-100 font-bold">One app.</span>
        </p>
        
        {/* Buttons */}
        <div className="space-y-4 max-w-xs mx-auto">
          {hasBiometricSetup && (
            <Button onClick={handleBiometricLogin} disabled={biometricLoading}
              className="w-full h-14 bg-white/20 text-white hover:bg-white/30 rounded-2xl text-lg font-semibold border border-white/30">
              {biometricLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Fingerprint className="w-6 h-6 mr-2" />Fingerprint</>}
            </Button>
          )}
          
          <Button onClick={() => setShowAuth(true)} data-testid="splash-login-btn"
            className="w-full h-14 bg-white text-teal-700 hover:bg-teal-50 rounded-2xl text-lg font-semibold shadow-xl">
            <User className="w-5 h-5 mr-2" />
            {hasBiometricSetup ? 'Login with OTP' : 'Login / Sign Up'}
          </Button>
          
          <div className="pt-6 border-t border-white/20">
            <button onClick={() => { onComplete(); setTimeout(() => navigate('/staff'), 100); }}
              className="flex items-center justify-center gap-2 text-sm text-white/70 hover:text-white mx-auto">
              <Building2 className="w-4 h-4" /> Staff Login
            </button>
          </div>
        </div>
      </div>
      
      {/* Auth Dialog */}
      <Dialog open={showAuth} onOpenChange={setShowAuth}>
        <DialogContent className="max-w-sm rounded-3xl p-0" style={{ zIndex: 100000 }}>
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <User className="w-6 h-6" /> Patient Login
            </DialogTitle>
            <DialogDescription className="text-white/80 mt-1">Enter your registered mobile</DialogDescription>
          </div>
          
          <div className="p-6 space-y-4">
            {!otpSent ? (
              <>
                <div>
                  <Label>Mobile Number</Label>
                  <div className="flex mt-1.5">
                    <div className="flex items-center px-3 bg-gray-100 rounded-l-xl border border-r-0">+91</div>
                    <Input type="tel" placeholder="Enter mobile" value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="rounded-l-none rounded-r-xl h-12" />
                  </div>
                </div>
                <Button onClick={handleSendOtp} disabled={loading || mobile.length < 10}
                  className="w-full h-12 bg-teal-600 hover:bg-teal-700 rounded-xl">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
                </Button>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <p>OTP sent to <strong>+91 {mobile}</strong></p>
                  <button onClick={() => { setOtpSent(false); setOtp(''); }} className="text-teal-600 text-sm underline">Change</button>
                </div>
                {mockOtp && <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <p className="text-xs text-amber-700">Test OTP: <strong className="text-lg">{mockOtp}</strong></p>
                </div>}
                <Input type="text" placeholder="Enter OTP" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-12 text-center text-xl tracking-widest rounded-xl" maxLength={6} />
                <Button onClick={handleVerifyOtp} disabled={loading || otp.length < 6}
                  className="w-full h-12 bg-teal-600 hover:bg-teal-700 rounded-xl">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntroScreen;
