import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Eye, EyeOff, Shield, Stethoscope, ArrowLeft, Mail, MessageCircle } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

const PatientLogin = () => {
  const navigate = useNavigate();
  
  // Auth method selection
  const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'whatsapp'
  
  // Step tracking: 'choose', 'enter-phone', 'otp', 'password', 'create-password'
  const [step, setStep] = useState('choose');
  
  // Form data
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Flow state
  const [verificationToken, setVerificationToken] = useState('');
  const [flowType, setFlowType] = useState('');
  const [needsEmail, setNeedsEmail] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  // OTP input refs
  const otpRefs = useRef([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // ============ HANDLERS ============

  const handleSelectEmail = () => {
    setAuthMethod('email');
    // Email input is already on the choose screen, just focus it
    document.querySelector('[data-testid="email-input"]')?.focus();
  };

  const handleSelectWhatsApp = () => {
    setAuthMethod('whatsapp');
    setStep('enter-phone');
  };

  const handleSendOTP = async () => {
    if (authMethod === 'email') {
      if (!email || !email.includes('@')) {
        toast.error('Please enter a valid email address');
        return;
      }
    } else {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      if (cleanPhone.length !== 10) {
        toast.error('Please enter a valid 10-digit mobile number');
        return;
      }
    }
    
    setLoading(true);
    try {
      const endpoint = authMethod === 'email' 
        ? `${API}/api/patient-auth/email/send-otp`
        : `${API}/api/patient-auth/whatsapp/send-otp`;
      
      const body = authMethod === 'email' ? { email } : { phone };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success(`OTP sent via ${authMethod === 'email' ? 'Email' : 'WhatsApp'}!`);
        setFlowType(data.flow_type);
        setHasPassword(data.has_password || false);
        
        if (data.mock_otp) {
          toast.info(`Test OTP: ${data.mock_otp}`, { duration: 15000 });
        }
        
        setResendTimer(30);
        
        if (data.flow_type === 'login_with_password' && data.has_password) {
          setStep('password');
        } else {
          setStep('otp');
        }
      } else {
        toast.error(data.detail || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      toast.error('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter complete 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      const endpoint = authMethod === 'email'
        ? `${API}/api/patient-auth/email/verify-otp`
        : `${API}/api/patient-auth/whatsapp/verify-otp`;
      
      const body = authMethod === 'email' 
        ? { email, otp: otpValue }
        : { phone, otp: otpValue };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success(data.message || 'Verified!');
        setVerificationToken(data.verification_token);
        setNeedsEmail(data.needs_email || false);
        
        if (data.needs_password) {
          setStep('create-password');
        } else {
          toast.success('Login successful!');
        }
      } else {
        toast.error(data.detail || 'Invalid OTP');
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }
    
    setLoading(true);
    try {
      const identifier = authMethod === 'email' ? email : phone;
      
      const res = await fetch(`${API}/api/patient-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        if (data.token) {
          localStorage.setItem('patientToken', data.token);
        }
        localStorage.setItem('patientInfo', JSON.stringify(data.user));
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('patientLoginExpiry', (Date.now() + 30 * 24 * 60 * 60 * 1000).toString());
        
        toast.success(data.message || 'Login successful!');
        
        setTimeout(() => {
          navigate('/');
          window.location.reload();
        }, 500);
      } else {
        toast.error(data.detail || 'Invalid password');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePassword = async () => {
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (needsEmail && (!email || !email.includes('@'))) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    try {
      const body = {
        verification_token: verificationToken,
        password,
        name: name || undefined,
        email: needsEmail ? email : undefined
      };
      
      const res = await fetch(`${API}/api/patient-auth/create-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        localStorage.setItem('patientToken', data.token);
        localStorage.setItem('patientInfo', JSON.stringify(data.user));
        localStorage.setItem('patientLoginExpiry', (Date.now() + 30 * 24 * 60 * 60 * 1000).toString());
        localStorage.setItem('user', JSON.stringify(data.user));
        
        toast.success(data.message || 'Account created successfully!');
        
        setTimeout(() => {
          navigate('/');
          window.location.reload();
        }, 500);
      } else {
        toast.error(data.detail || 'Failed to create account');
      }
    } catch (error) {
      console.error('Create password error:', error);
      toast.error('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const goBack = () => {
    if (step === 'enter-phone') {
      setStep('choose');
      setPhone('');
    } else if (step === 'otp' || step === 'password') {
      if (authMethod === 'whatsapp') {
        setStep('enter-phone');
      } else {
        setStep('choose');
      }
      setOtp(['', '', '', '', '', '']);
      setPassword('');
    } else if (step === 'create-password') {
      setStep('otp');
    } else {
      navigate('/');
    }
  };

  // ============ RENDER ============

  return (
    <div className="min-h-screen bg-[#050510] flex items-center justify-center p-4">
      {/* Glassmorphism Card */}
      <div className="relative w-full max-w-md">
        {/* Glow effects */}
        {step === 'otp' ? (
          <>
            <div className="absolute left-1/4 -bottom-8 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
            <div className="absolute right-1/4 -bottom-4 w-32 h-32 bg-pink-400/15 rounded-full blur-2xl" />
            <div className="absolute -left-4 top-1/4 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl" />
          </>
        ) : (
          <>
            <div className="absolute -left-4 top-1/4 w-32 h-32 bg-teal-500/30 rounded-full blur-3xl" />
            <div className="absolute -left-8 top-1/3 w-24 h-24 bg-cyan-400/20 rounded-full blur-2xl" />
          </>
        )}
        
        {/* Main Card */}
        <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Gradient border effect for OTP screen */}
          {step === 'otp' && (
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-teal-500/20 via-transparent to-purple-500/20 pointer-events-none" />
          )}
          
          <div className="relative z-10">
            
            {/* ========== STEP: CHOOSE ========== */}
            {step === 'choose' && (
              <>
                {/* Header */}
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
                  <p className="text-gray-400 text-sm">Sign in to your account</p>
                </div>

                <div className="space-y-4">
                  {/* Email Input */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Email</label>
                    <div className="relative">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setAuthMethod('email'); }}
                        placeholder="username@gmail.com"
                        className="w-full h-12 bg-[#1a1a1a]/80 border-white/10 rounded-xl text-white placeholder:text-gray-500 pr-14 focus:border-teal-500/50 focus:ring-teal-500/20"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                        data-testid="email-input"
                      />
                      <button
                        onClick={handleSendOTP}
                        disabled={loading || !email}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full flex items-center justify-center hover:from-teal-500 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/30"
                        data-testid="send-otp-btn"
                      >
                        {loading && authMethod === 'email' ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : (
                          <ArrowRight className="w-4 h-4 text-white" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-[#050510] px-4 text-xs text-gray-500 uppercase">Or</span>
                    </div>
                  </div>

                  {/* Login Method Buttons */}
                  <div className="space-y-3">
                    {/* Email Button */}
                    <button
                      onClick={handleSelectEmail}
                      className="w-full h-12 bg-[#1a1a1a]/80 hover:bg-[#252525] border border-white/10 rounded-xl flex items-center justify-between px-4 transition-all group"
                      data-testid="email-login-btn"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-teal-400" />
                        <span className="text-gray-300 text-sm font-medium">Login by Email</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
                    </button>

                    {/* WhatsApp Button */}
                    <button
                      onClick={handleSelectWhatsApp}
                      className="w-full h-12 bg-[#1a1a1a]/80 hover:bg-[#252525] border border-white/10 rounded-xl flex items-center justify-between px-4 transition-all group"
                      data-testid="whatsapp-login-btn"
                    >
                      <div className="flex items-center gap-3">
                        <MessageCircle className="w-5 h-5 text-green-400" />
                        <span className="text-gray-300 text-sm font-medium">Login by WhatsApp</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
                    </button>
                  </div>

                  {/* Sign Up Link */}
                  <p className="text-center text-sm text-gray-400 mt-6">
                    Don't have an account?{' '}
                    <button 
                      onClick={() => toast.info('Enter your email or phone to create an account')}
                      className="text-teal-400 font-semibold hover:text-teal-300 transition-colors"
                    >
                      Sign up
                    </button>
                  </p>

                  {/* Staff & Doctor Portal Links */}
                  <div className="pt-6 mt-4 border-t border-white/10">
                    <p className="text-center text-xs text-gray-500 mb-3">Staff or Healthcare Provider?</p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => navigate('/staff')}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a]/60 hover:bg-[#252525] border border-teal-500/30 rounded-xl text-teal-400 text-sm font-medium transition-all"
                      >
                        <Shield className="w-4 h-4" />
                        Staff Portal
                      </button>
                      <button
                        onClick={() => navigate('/doctor-login')}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a]/60 hover:bg-[#252525] border border-blue-500/30 rounded-xl text-blue-400 text-sm font-medium transition-all"
                      >
                        <Stethoscope className="w-4 h-4" />
                        Doctor Portal
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ========== STEP: ENTER PHONE (WhatsApp) ========== */}
            {step === 'enter-phone' && (
              <>
                {/* Back Button */}
                <button 
                  onClick={goBack}
                  className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Back</span>
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                    <MessageCircle className="w-7 h-7 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-2">WhatsApp Login</h1>
                  <p className="text-gray-400 text-sm">Enter your mobile number to receive OTP</p>
                </div>

                <div className="space-y-4">
                  {/* Phone Input */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Mobile Number</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">+91</div>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="Enter 10-digit number"
                        className="w-full h-14 bg-[#1a1a1a]/80 border-white/10 rounded-xl text-white placeholder:text-gray-500 pl-14 pr-14 focus:border-green-500/50 focus:ring-green-500/20 text-lg"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                        maxLength={10}
                        data-testid="phone-input"
                      />
                      <button
                        onClick={handleSendOTP}
                        disabled={loading || phone.length !== 10}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center hover:from-green-500 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/30"
                        data-testid="send-whatsapp-otp-btn"
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                          <ArrowRight className="w-5 h-5 text-white" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    We'll send a 6-digit verification code via WhatsApp
                  </p>
                </div>
              </>
            )}

            {/* ========== STEP: OTP VERIFICATION ========== */}
            {step === 'otp' && (
              <>
                {/* Back Button */}
                <button 
                  onClick={goBack}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  {authMethod === 'email' ? (
                    <Mail className="w-6 h-6 text-teal-400" />
                  ) : (
                    <MessageCircle className="w-6 h-6 text-green-400" />
                  )}
                  <h1 className="text-2xl font-bold text-white">
                    {authMethod === 'email' ? 'Email' : 'WhatsApp'} verification
                  </h1>
                </div>

                <p className="text-gray-400 text-sm mb-8">
                  We sent a 6-digit code to {authMethod === 'email' ? email : `+91 ${phone}`}. Enter it below to continue.
                </p>

                <div className="space-y-6">
                  {/* OTP Label */}
                  <label className="text-xs text-gray-400 uppercase tracking-wide">6-digit code</label>
                  
                  {/* OTP Inputs */}
                  <div className="flex justify-between gap-2">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        value={digit}
                        onChange={(e) => handleOTPChange(index, e.target.value)}
                        onKeyDown={(e) => handleOTPKeyDown(index, e)}
                        className="w-12 h-14 text-center text-2xl font-bold bg-[#1a1a1a] border-2 border-white/10 rounded-xl text-white focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                        maxLength={1}
                        data-testid={`otp-input-${index}`}
                      />
                    ))}
                  </div>

                  {/* Verify Button - Gradient */}
                  <button
                    onClick={handleVerifyOTP}
                    disabled={loading || otp.join('').length !== 6}
                    className="w-full h-14 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 hover:from-orange-500 hover:via-pink-600 hover:to-purple-600 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20 text-white font-semibold text-lg"
                    data-testid="verify-otp-btn"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
                  </button>

                  {/* Resend Code Button */}
                  <button
                    onClick={handleSendOTP}
                    disabled={loading || resendTimer > 0}
                    className="w-full h-12 bg-[#2a2a2a] hover:bg-[#333] border border-white/5 rounded-xl text-gray-300 font-medium transition-all disabled:opacity-50"
                  >
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
                  </button>

                  {/* Tip */}
                  <p className="text-xs text-gray-500 text-center">
                    Tip: Check Spam or Promotions if you don't see the {authMethod === 'email' ? 'email' : 'message'}.
                  </p>
                </div>
              </>
            )}

            {/* ========== STEP: PASSWORD LOGIN ========== */}
            {step === 'password' && (
              <>
                <button 
                  onClick={goBack}
                  className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Back</span>
                </button>

                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-white mb-2">Enter Password</h1>
                  <p className="text-gray-400 text-sm">Enter your password to continue</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full h-12 bg-[#1a1a1a]/80 border-white/10 rounded-xl text-white placeholder:text-gray-500 pr-14 focus:border-teal-500/50"
                        onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                        data-testid="password-input"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handlePasswordLogin}
                    disabled={loading || !password}
                    className="w-full h-12 bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-500 hover:to-cyan-500 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 shadow-lg shadow-teal-500/20 text-white font-semibold"
                    data-testid="password-login-btn"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
                  </button>

                  <div className="text-center">
                    <button 
                      onClick={() => setStep('otp')}
                      className="text-teal-400 text-sm hover:underline"
                    >
                      Forgot password? Use OTP
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ========== STEP: CREATE PASSWORD ========== */}
            {step === 'create-password' && (
              <>
                <button 
                  onClick={goBack}
                  className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Back</span>
                </button>

                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
                  <p className="text-gray-400 text-sm">Set a password for your account</p>
                </div>

                <div className="space-y-4">
                  {flowType === 'signup' && (
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 uppercase tracking-wide">Your Name</label>
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full h-12 bg-[#1a1a1a]/80 border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-teal-500/50"
                        data-testid="name-input"
                      />
                    </div>
                  )}

                  {needsEmail && (
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 uppercase tracking-wide">Email</label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full h-12 bg-[#1a1a1a]/80 border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-teal-500/50"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password (min 6 chars)"
                        className="w-full h-12 bg-[#1a1a1a]/80 border-white/10 rounded-xl text-white placeholder:text-gray-500 pr-14 focus:border-teal-500/50"
                        data-testid="create-password-input"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Confirm Password</label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full h-12 bg-[#1a1a1a]/80 border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-teal-500/50"
                      data-testid="confirm-password-input"
                    />
                  </div>

                  <button
                    onClick={handleCreatePassword}
                    disabled={loading || password.length < 6 || password !== confirmPassword}
                    className="w-full h-12 bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-500 hover:to-cyan-500 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 shadow-lg shadow-teal-500/20 text-white font-semibold"
                    data-testid="create-account-btn"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientLogin;
