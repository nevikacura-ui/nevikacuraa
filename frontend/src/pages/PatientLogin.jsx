import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Mail, Lock, MessageCircle, Loader2, ArrowLeft, CheckCircle2, 
  Eye, EyeOff, Phone, User, ChevronRight, Shield
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

const PatientLogin = () => {
  const navigate = useNavigate();
  
  // Auth method selection
  const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'whatsapp'
  
  // Step tracking
  const [step, setStep] = useState('choose'); // 'choose', 'otp', 'password', 'create-password'
  
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
  const [flowType, setFlowType] = useState(''); // 'signup', 'set_password', 'login_with_password'
  const [needsEmail, setNeedsEmail] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  // OTP input refs
  const otpRefs = useRef([]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Focus first OTP input when step changes to OTP
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // ============ HANDLERS ============

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
        
        // Handle flow type
        setFlowType(data.flow_type);
        setHasPassword(data.has_password || false);
        
        // Show mock OTP in dev
        if (data.mock_otp) {
          toast.info(`Test OTP: ${data.mock_otp}`, { duration: 15000 });
        }
        
        setResendTimer(30);
        
        // If user has password and is logging in, show password form
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
        
        // If needs password, go to password creation
        if (data.needs_password) {
          setStep('create-password');
        } else {
          // Should not happen normally, but handle it
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
        // Save auth data
        localStorage.setItem('patientToken', data.token);
        localStorage.setItem('patientInfo', JSON.stringify(data.user));
        localStorage.setItem('patientLoginExpiry', (Date.now() + 30 * 24 * 60 * 60 * 1000).toString());
        
        // Also set for compatibility with existing auth context
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        toast.success(data.message || 'Login successful!');
        
        // Navigate to home or intended destination
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
    
    // For WhatsApp signups, validate email
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
        // Save auth data
        localStorage.setItem('patientToken', data.token);
        localStorage.setItem('patientInfo', JSON.stringify(data.user));
        localStorage.setItem('patientLoginExpiry', (Date.now() + 30 * 24 * 60 * 60 * 1000).toString());
        
        // Also set for compatibility
        localStorage.setItem('token', data.token);
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

  const handleOTPPaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    paste.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    if (paste.length === 6) {
      otpRefs.current[5]?.focus();
    }
  };

  const goBack = () => {
    if (step === 'otp' || step === 'password') {
      setStep('choose');
      setOtp(['', '', '', '', '', '']);
      setPassword('');
    } else if (step === 'create-password') {
      setStep('otp');
    } else {
      navigate('/');
    }
  };

  // ============ RENDER HELPERS ============

  const renderChooseMethod = () => (
    <div className="space-y-6">
      {/* Auth Method Toggle */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setAuthMethod('email')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
            authMethod === 'email' 
              ? 'bg-white text-teal-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
          data-testid="auth-method-email"
        >
          <Mail className="w-4 h-4" />
          Email
        </button>
        <button
          onClick={() => setAuthMethod('whatsapp')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
            authMethod === 'whatsapp' 
              ? 'bg-white text-green-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
          data-testid="auth-method-whatsapp"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </button>
      </div>

      {/* Input Field */}
      {authMethod === 'email' ? (
        <div className="space-y-2">
          <Label className="text-slate-700">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="pl-11 py-6 text-base"
              data-testid="email-input"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-slate-700">Mobile Number</Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-slate-500 font-medium">
              +91
            </div>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Enter 10-digit number"
              className="pl-14 py-6 text-base"
              maxLength={10}
              data-testid="phone-input"
            />
          </div>
        </div>
      )}

      {/* Continue Button */}
      <Button
        onClick={handleSendOTP}
        disabled={loading}
        className={`w-full py-6 text-base font-semibold rounded-xl ${
          authMethod === 'email'
            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600'
            : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
        }`}
        data-testid="send-otp-btn"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Continue
            <ChevronRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>

      <p className="text-xs text-center text-slate-500">
        {authMethod === 'email' 
          ? 'We\'ll send a verification code to your email'
          : 'We\'ll send a verification code via WhatsApp'
        }
      </p>
    </div>
  );

  const renderOTPInput = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
          authMethod === 'email' ? 'bg-teal-100' : 'bg-green-100'
        }`}>
          {authMethod === 'email' ? (
            <Mail className="w-8 h-8 text-teal-600" />
          ) : (
            <MessageCircle className="w-8 h-8 text-green-600" />
          )}
        </div>
        <h2 className="text-xl font-bold text-slate-800">Enter Verification Code</h2>
        <p className="text-slate-500 mt-1">
          Sent to {authMethod === 'email' ? email : `+91 ${phone}`}
        </p>
      </div>

      {/* OTP Input */}
      <div className="flex justify-center gap-3" onPaste={handleOTPPaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (otpRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            value={digit}
            onChange={(e) => handleOTPChange(index, e.target.value)}
            onKeyDown={(e) => handleOTPKeyDown(index, e)}
            className="w-12 h-14 text-center text-2xl font-bold border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
            maxLength={1}
            data-testid={`otp-input-${index}`}
          />
        ))}
      </div>

      <Button
        onClick={handleVerifyOTP}
        disabled={loading || otp.join('').length !== 6}
        className={`w-full py-6 text-base font-semibold rounded-xl ${
          authMethod === 'email'
            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600'
            : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
        }`}
        data-testid="verify-otp-btn"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Verify & Continue
          </>
        )}
      </Button>

      {/* Resend OTP */}
      <div className="text-center">
        {resendTimer > 0 ? (
          <p className="text-slate-500 text-sm">
            Resend code in <span className="font-semibold text-teal-600">{resendTimer}s</span>
          </p>
        ) : (
          <button
            onClick={handleSendOTP}
            className="text-teal-600 font-semibold text-sm hover:underline"
            disabled={loading}
          >
            Resend Code
          </button>
        )}
      </div>
    </div>
  );

  const renderPasswordLogin = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Lock className="w-8 h-8 text-slate-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Welcome Back!</h2>
        <p className="text-slate-500 mt-1">
          Enter your password to login
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-700">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="pl-11 pr-11 py-6 text-base"
            data-testid="password-input"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <Button
        onClick={handlePasswordLogin}
        disabled={loading || !password}
        className="w-full py-6 text-base font-semibold rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900"
        data-testid="password-login-btn"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Lock className="w-5 h-5 mr-2" />
            Login
          </>
        )}
      </Button>

      {/* Forgot Password - Use OTP */}
      <div className="text-center">
        <button
          onClick={() => setStep('otp')}
          className="text-teal-600 font-medium text-sm hover:underline"
        >
          Forgot password? Login with OTP
        </button>
      </div>
    </div>
  );

  const renderCreatePassword = () => (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 flex items-center justify-center">
          <User className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">
          {flowType === 'signup' ? 'Create Your Account' : 'Set Your Password'}
        </h2>
        <p className="text-slate-500 mt-1">
          {flowType === 'signup' 
            ? 'Complete your profile to get started'
            : 'Create a password for quick login'
          }
        </p>
      </div>

      {/* Name (for new signups) */}
      {flowType === 'signup' && (
        <div className="space-y-2">
          <Label className="text-slate-700">Your Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="pl-11 py-5"
              data-testid="name-input"
            />
          </div>
        </div>
      )}

      {/* Email (for WhatsApp signups) */}
      {needsEmail && (
        <div className="space-y-2">
          <Label className="text-slate-700">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="pl-11 py-5"
              data-testid="email-collect-input"
            />
          </div>
          <p className="text-xs text-slate-500">We'll use this for order updates and receipts</p>
        </div>
      )}

      {/* Password */}
      <div className="space-y-2">
        <Label className="text-slate-700">Create Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password (min 6 chars)"
            className="pl-11 pr-11 py-5"
            data-testid="create-password-input"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label className="text-slate-700">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            className="pl-11 py-5"
            data-testid="confirm-password-input"
          />
        </div>
        {confirmPassword && password !== confirmPassword && (
          <p className="text-xs text-red-500">Passwords do not match</p>
        )}
      </div>

      <Button
        onClick={handleCreatePassword}
        disabled={loading || password.length < 6 || password !== confirmPassword}
        className="w-full py-6 text-base font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
        data-testid="create-account-btn"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 mr-2" />
            {flowType === 'signup' ? 'Create Account' : 'Set Password & Login'}
          </>
        )}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={goBack}
              className="flex items-center gap-2 text-slate-600 hover:text-teal-600 transition-colors"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            <img 
              src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
              alt="Nevika Cura" 
              className="h-10 w-auto object-contain cursor-pointer"
              onClick={() => navigate('/')}
            />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        {/* Title Section */}
        {step === 'choose' && (
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              Login or Sign Up
            </h1>
            <p className="text-slate-500">
              Access your health records, bookings & more
            </p>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          {step === 'choose' && renderChooseMethod()}
          {step === 'otp' && renderOTPInput()}
          {step === 'password' && renderPasswordLogin()}
          {step === 'create-password' && renderCreatePassword()}
        </div>

        {/* Staff Login - Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-3">Staff or Healthcare Provider?</p>
            <Button
              variant="ghost"
              onClick={() => navigate('/staff')}
              className="text-slate-600 hover:text-teal-600 hover:bg-teal-50"
              data-testid="staff-login-footer-btn"
            >
              <Shield className="w-4 h-4 mr-2" />
              Staff Portal Login
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-slate-400 mt-8">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </main>
    </div>
  );
};

export default PatientLogin;
