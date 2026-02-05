import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  User, Mail, Phone, Loader2, ArrowRight, 
  CheckCircle2, ShoppingBag, UserPlus, LogIn, MessageCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

// Refined Teal Theme
const THEME = {
  gradientTop: '#4FE3C1',
  gradientBottom: '#0F9D8C',
  accent: '#0F6F66',
};

/**
 * AuthDialogV2 - Two-Tiered Authentication
 * 
 * Props:
 * - open: boolean - Dialog visibility
 * - onOpenChange: (open: boolean) => void
 * - onAuthSuccess: (user, token, isGuest) => void
 * - mode: 'default' | 'guest' | 'signup' | 'login' - Initial mode
 * - guestContext: string - What the guest is checking out for (e.g., "Lab Test", "Medicine Order")
 */
const AuthDialogV2 = ({ 
  open, 
  onOpenChange, 
  onAuthSuccess, 
  mode = 'default',
  guestContext = ''
}) => {
  const [activeTab, setActiveTab] = useState(mode === 'guest' ? 'guest' : 'signup');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input'); // input, otp, success
  
  // Guest mode state
  const [guestPhone, setGuestPhone] = useState('');
  const [guestOtp, setGuestOtp] = useState('');
  const [guestMockOtp, setGuestMockOtp] = useState('');
  
  // Signup mode state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [signupMockOtp, setSignupMockOtp] = useState('');
  
  // Login mode state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginMockOtp, setLoginMockOtp] = useState('');
  const [loginUserName, setLoginUserName] = useState('');

  // Reset state when dialog opens/closes
  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setStep('input');
      setGuestPhone('');
      setGuestOtp('');
      setGuestMockOtp('');
      setSignupEmail('');
      setSignupName('');
      setSignupPhone('');
      setSignupOtp('');
      setSignupMockOtp('');
      setLoginEmail('');
      setLoginOtp('');
      setLoginMockOtp('');
    }
    onOpenChange(isOpen);
  };

  // ============ GUEST MODE HANDLERS ============
  
  const handleGuestSendOtp = async () => {
    if (guestPhone.length < 10) {
      toast.error('Enter valid 10-digit mobile number');
      return;
    }
    
    setLoading(true);
    try {
      // Use WhatsApp OTP via MSG91
      const res = await axios.post(`${API}/otp/whatsapp/send`, { 
        phone: guestPhone,
        purpose: 'guest_login'
      });
      setStep('otp');
      // Show mock OTP if in test mode
      if (res.data.mock && res.data.otp) {
        setGuestMockOtp(res.data.otp);
      }
      toast.success('OTP sent via WhatsApp!', {
        description: res.data.mock ? `Use code: ${res.data.otp}` : 'Check your WhatsApp'
      });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleGuestVerifyOtp = async () => {
    if (guestOtp.length < 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      // Verify WhatsApp OTP
      const otpRes = await axios.post(`${API}/otp/whatsapp/verify`, { 
        phone: guestPhone, 
        otp: guestOtp 
      });
      
      if (otpRes.data.success) {
        // Create guest session after OTP verification
        const sessionRes = await axios.post(`${API}/auth/v2/guest/create-session`, { 
          phone: guestPhone
        });
        
        // Store guest token
        localStorage.setItem('guestToken', sessionRes.data.session_token);
        localStorage.setItem('guestPhone', guestPhone);
        
        toast.success('Phone verified! You can now complete your order.');
        onAuthSuccess({ phone: guestPhone, type: 'guest' }, sessionRes.data.session_token, true);
        handleOpenChange(false);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Invalid OTP');
    }
    setLoading(false);
  };

  // ============ SIGNUP MODE HANDLERS ============
  
  const handleSignupSendOtp = async () => {
    if (!signupEmail || !signupName || !signupPhone) {
      toast.error('Please fill in name, email and phone number');
      return;
    }
    
    if (signupPhone.length < 10) {
      toast.error('Enter valid 10-digit mobile number');
      return;
    }
    
    setLoading(true);
    try {
      // First send WhatsApp OTP to verify phone
      const res = await axios.post(`${API}/otp/whatsapp/send`, { 
        phone: signupPhone,
        purpose: 'signup'
      });
      setStep('otp');
      // Show mock OTP if in test mode
      if (res.data.mock && res.data.otp) {
        setSignupMockOtp(res.data.otp);
      }
      toast.success('OTP sent via WhatsApp!', {
        description: res.data.mock ? `Use code: ${res.data.otp}` : 'Check your WhatsApp'
      });
    } catch (e) {
      if (e.response?.data?.detail?.includes('already registered')) {
        toast.error('Email already registered. Please login instead.');
        setActiveTab('login');
        setLoginEmail(signupEmail);
        setStep('input');
      } else {
        toast.error(e.response?.data?.detail || 'Failed to send OTP');
      }
    }
    setLoading(false);
  };

  const handleSignupVerifyOtp = async () => {
    if (signupOtp.length < 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      // First verify WhatsApp OTP
      const otpRes = await axios.post(`${API}/otp/whatsapp/verify`, { 
        phone: signupPhone, 
        otp: signupOtp 
      });
      
      if (otpRes.data.success) {
        // Now register the user
        const res = await axios.post(`${API}/auth/v2/signup/register`, { 
          email: signupEmail,
          name: signupName,
          phone: signupPhone
        });
        
        // Store auth token and user
        localStorage.setItem('authToken', res.data.token);
        localStorage.setItem('authUser', JSON.stringify(res.data.user));
        
        toast.success(`Welcome, ${res.data.user.name}! Account created successfully.`);
        onAuthSuccess(res.data.user, res.data.token, false);
        handleOpenChange(false);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Invalid OTP or registration failed');
    }
    setLoading(false);
  };

  // ============ LOGIN MODE HANDLERS ============
  
  const handleLoginSendOtp = async () => {
    if (!loginEmail) {
      toast.error('Please enter your email');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/v2/login/send-otp`, { email: loginEmail });
      setStep('otp');
      setLoginUserName(res.data.name);
      if (res.data.mock_otp) setLoginMockOtp(res.data.mock_otp);
      toast.success('Login code sent to your email!');
    } catch (e) {
      if (e.response?.status === 404) {
        toast.error('Email not registered. Please sign up first.');
        setActiveTab('signup');
        setSignupEmail(loginEmail);
      } else {
        toast.error(e.response?.data?.detail || 'Failed to send login code');
      }
    }
    setLoading(false);
  };

  const handleLoginVerifyOtp = async () => {
    if (loginOtp.length < 6) {
      toast.error('Enter 6-digit login code');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/v2/login/verify-otp`, { 
        email: loginEmail, 
        otp: loginOtp 
      });
      
      // Store auth token and user
      localStorage.setItem('authToken', res.data.token);
      localStorage.setItem('authUser', JSON.stringify(res.data.user));
      
      toast.success(res.data.message || `Welcome back, ${res.data.user.name}!`);
      onAuthSuccess(res.data.user, res.data.token, false);
      handleOpenChange(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Invalid login code');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden" style={{ zIndex: 100000 }}>
        {/* Header */}
        <div className="p-6 text-white"
          style={{ background: `linear-gradient(135deg, ${THEME.gradientTop} 0%, ${THEME.gradientBottom} 100%)` }}>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <User className="w-6 h-6" /> 
            {activeTab === 'guest' ? 'Quick Checkout' : activeTab === 'signup' ? 'Create Account' : 'Welcome Back'}
          </DialogTitle>
          <DialogDescription className="text-white/80 mt-1">
            {activeTab === 'guest' 
              ? `Complete your ${guestContext || 'order'} without creating an account`
              : activeTab === 'signup'
              ? 'Sign up once, access all portals forever'
              : 'Login to your account'}
          </DialogDescription>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setStep('input'); }} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 mx-6 mt-4 rounded-xl" style={{ width: 'calc(100% - 48px)' }}>
            <TabsTrigger value="guest" className="rounded-lg text-xs data-[state=active]:bg-white">
              <ShoppingBag className="w-3 h-3 mr-1" /> Guest
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-lg text-xs data-[state=active]:bg-white">
              <UserPlus className="w-3 h-3 mr-1" /> Sign Up
            </TabsTrigger>
            <TabsTrigger value="login" className="rounded-lg text-xs data-[state=active]:bg-white">
              <LogIn className="w-3 h-3 mr-1" /> Login
            </TabsTrigger>
          </TabsList>
          
          {/* GUEST TAB */}
          <TabsContent value="guest" className="p-6 pt-4 space-y-4">
            {step === 'input' ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  <span><strong>WhatsApp OTP:</strong> Enter your WhatsApp number to receive verification code</span>
                </div>
                <div>
                  <Label className="font-semibold">WhatsApp Number</Label>
                  <div className="flex mt-1.5">
                    <div className="flex items-center px-3 bg-gray-100 rounded-l-xl border border-r-0 font-bold text-gray-600">+91</div>
                    <Input 
                      type="tel" 
                      placeholder="WhatsApp number (10 digits)" 
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="rounded-l-none rounded-r-xl h-12"
                      data-testid="guest-phone-input"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleGuestSendOtp} 
                  disabled={loading || guestPhone.length < 10}
                  className="w-full h-12 rounded-full font-bold"
                  style={{ backgroundColor: THEME.gradientBottom }}
                  data-testid="guest-send-otp-btn"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send OTP <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              </>
            ) : (
              <>
                <div className="text-center mb-2">
                  <p className="text-sm text-gray-600">OTP sent to <strong>+91 {guestPhone}</strong></p>
                  <button onClick={() => setStep('input')} className="text-sm underline font-semibold" style={{ color: THEME.accent }}>Change</button>
                </div>
                {guestMockOtp && (
                  <div className="p-3 bg-teal-50 border-2 border-teal-200 rounded-xl text-center">
                    <p className="text-xs text-teal-700">Test OTP: <strong className="text-lg">{guestMockOtp}</strong></p>
                  </div>
                )}
                <Input 
                  type="text" 
                  placeholder="Enter 6-digit OTP" 
                  value={guestOtp}
                  onChange={(e) => setGuestOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-12 text-center text-xl tracking-widest rounded-xl font-bold" 
                  maxLength={6}
                  data-testid="guest-otp-input"
                />
                <Button 
                  onClick={handleGuestVerifyOtp} 
                  disabled={loading || guestOtp.length < 6}
                  className="w-full h-12 rounded-full font-bold"
                  style={{ backgroundColor: THEME.gradientBottom }}
                  data-testid="guest-verify-otp-btn"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Continue <CheckCircle2 className="w-4 h-4 ml-2" /></>}
                </Button>
              </>
            )}
          </TabsContent>
          
          {/* SIGNUP TAB */}
          <TabsContent value="signup" className="p-6 pt-4 space-y-4">
            {step === 'input' ? (
              <>
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-sm text-teal-800">
                  <strong>Benefits:</strong> Save your details, access all portals, track orders & appointments, earn rewards!
                </div>
                <div>
                  <Label className="font-semibold">Full Name</Label>
                  <Input 
                    type="text" 
                    placeholder="Enter your name" 
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="mt-1.5 h-11 rounded-xl"
                    data-testid="signup-name-input"
                  />
                </div>
                <div>
                  <Label className="font-semibold">Email Address</Label>
                  <Input 
                    type="email" 
                    placeholder="your@email.com" 
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="mt-1.5 h-11 rounded-xl"
                    data-testid="signup-email-input"
                  />
                </div>
                <div>
                  <Label className="font-semibold">Mobile (Optional)</Label>
                  <div className="flex mt-1.5">
                    <div className="flex items-center px-3 bg-gray-100 rounded-l-xl border border-r-0 font-bold text-gray-600">+91</div>
                    <Input 
                      type="tel" 
                      placeholder="For SMS updates" 
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="rounded-l-none rounded-r-xl h-11"
                      data-testid="signup-phone-input"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleSignupSendOtp} 
                  disabled={loading || !signupEmail || !signupName}
                  className="w-full h-12 rounded-full font-bold"
                  style={{ backgroundColor: THEME.gradientBottom }}
                  data-testid="signup-send-otp-btn"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              </>
            ) : (
              <>
                <div className="text-center mb-2">
                  <p className="text-sm text-gray-600">Verification code sent to <strong>{signupEmail}</strong></p>
                  <button onClick={() => setStep('input')} className="text-sm underline font-semibold" style={{ color: THEME.accent }}>Change</button>
                </div>
                {signupMockOtp && (
                  <div className="p-3 bg-teal-50 border-2 border-teal-200 rounded-xl text-center">
                    <p className="text-xs text-teal-700">Test Code: <strong className="text-lg">{signupMockOtp}</strong></p>
                  </div>
                )}
                <Input 
                  type="text" 
                  placeholder="Enter 6-digit code" 
                  value={signupOtp}
                  onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-12 text-center text-xl tracking-widest rounded-xl font-bold" 
                  maxLength={6}
                  data-testid="signup-otp-input"
                />
                <Button 
                  onClick={handleSignupVerifyOtp} 
                  disabled={loading || signupOtp.length < 6}
                  className="w-full h-12 rounded-full font-bold"
                  style={{ backgroundColor: THEME.gradientBottom }}
                  data-testid="signup-verify-otp-btn"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Create Account <CheckCircle2 className="w-4 h-4 ml-2" /></>}
                </Button>
              </>
            )}
          </TabsContent>
          
          {/* LOGIN TAB */}
          <TabsContent value="login" className="p-6 pt-4 space-y-4">
            {step === 'input' ? (
              <>
                <div>
                  <Label className="font-semibold">Email Address</Label>
                  <Input 
                    type="email" 
                    placeholder="your@email.com" 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="mt-1.5 h-11 rounded-xl"
                    data-testid="login-email-input"
                  />
                </div>
                <Button 
                  onClick={handleLoginSendOtp} 
                  disabled={loading || !loginEmail}
                  className="w-full h-12 rounded-full font-bold"
                  style={{ backgroundColor: THEME.gradientBottom }}
                  data-testid="login-send-otp-btn"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Login Code <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
                <p className="text-center text-sm text-gray-500">
                  Don't have an account? <button onClick={() => setActiveTab('signup')} className="font-semibold underline" style={{ color: THEME.accent }}>Sign Up</button>
                </p>
              </>
            ) : (
              <>
                <div className="text-center mb-2">
                  <p className="text-sm text-gray-600">
                    {loginUserName && <span>Hi <strong>{loginUserName}</strong>! </span>}
                    Login code sent to <strong>{loginEmail}</strong>
                  </p>
                  <button onClick={() => setStep('input')} className="text-sm underline font-semibold" style={{ color: THEME.accent }}>Change</button>
                </div>
                {loginMockOtp && (
                  <div className="p-3 bg-teal-50 border-2 border-teal-200 rounded-xl text-center">
                    <p className="text-xs text-teal-700">Test Code: <strong className="text-lg">{loginMockOtp}</strong></p>
                  </div>
                )}
                <Input 
                  type="text" 
                  placeholder="Enter 6-digit code" 
                  value={loginOtp}
                  onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-12 text-center text-xl tracking-widest rounded-xl font-bold" 
                  maxLength={6}
                  data-testid="login-otp-input"
                />
                <Button 
                  onClick={handleLoginVerifyOtp} 
                  disabled={loading || loginOtp.length < 6}
                  className="w-full h-12 rounded-full font-bold"
                  style={{ backgroundColor: THEME.gradientBottom }}
                  data-testid="login-verify-otp-btn"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Login <CheckCircle2 className="w-4 h-4 ml-2" /></>}
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Footer */}
        <div className="px-6 pb-6 pt-2 text-center text-xs text-gray-400">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialogV2;
