import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Mail, Lock, MessageCircle, Shield, Loader2, 
  ArrowLeft, CheckCircle2, Clock 
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

const LoginPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('email-otp');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [userName, setUserName] = useState('');
  
  // Form states
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');

  // Email OTP Flow
  const handleSendEmailOTP = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    try {
      // Try login first (for existing users)
      const res = await fetch(`${API}/api/auth/v2/login/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('OTP sent to your email');
        setOtpSent(true);
        setIsNewUser(false);
        // Show mock OTP if provided (dev mode)
        if (data.mock_otp) {
          toast.info(`Dev OTP: ${data.mock_otp}`, { duration: 10000 });
        }
      } else if (data.detail?.includes('not found') || data.detail?.includes('not registered')) {
        // User doesn't exist - need to sign up
        toast.info('New user? Please provide your name to register.');
        setIsNewUser(true);
      } else {
        toast.error(data.detail || 'Failed to send OTP');
      }
    } catch (error) {
      toast.error('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/v2/signup/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      
      const data = await res.json();
      
      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('Login successful!');
        navigate('/');
        window.location.reload();
      } else {
        toast.error(data.detail || 'Invalid OTP');
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Email + Password Flow
  const handleEmailPasswordLogin = async () => {
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('Login successful!');
        navigate('/');
        window.location.reload();
      } else {
        toast.error(data.detail || 'Invalid credentials');
      }
    } catch (error) {
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const loginMethods = [
    {
      id: 'email-otp',
      title: 'Email + OTP',
      subtitle: 'Recommended • No password needed',
      icon: Mail,
      color: 'teal',
      badge: 'Best'
    },
    {
      id: 'email-password',
      title: 'Email + Password',
      subtitle: 'Traditional login',
      icon: Lock,
      color: 'slate'
    },
    {
      id: 'whatsapp-otp',
      title: 'WhatsApp + OTP',
      subtitle: 'Coming Soon',
      icon: MessageCircle,
      color: 'green',
      disabled: true,
      badge: 'Soon'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-600 hover:text-teal-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Home</span>
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
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome to Nevika Cura</h1>
          <p className="text-slate-600">Choose how you want to sign in</p>
        </div>

        {/* Login Method Selection */}
        <div className="space-y-3 mb-6">
          {loginMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => !method.disabled && setActiveTab(method.id)}
              disabled={method.disabled}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                method.disabled 
                  ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                  : activeTab === method.id
                    ? method.color === 'teal'
                      ? 'border-teal-500 bg-teal-50'
                      : method.color === 'green'
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-400 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
              data-testid={`login-method-${method.id}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  method.color === 'teal' ? 'bg-teal-100' :
                  method.color === 'green' ? 'bg-green-100' : 'bg-slate-100'
                }`}>
                  <method.icon className={`w-6 h-6 ${
                    method.color === 'teal' ? 'text-teal-600' :
                    method.color === 'green' ? 'text-green-600' : 'text-slate-600'
                  }`} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-800">{method.title}</p>
                  <p className="text-sm text-slate-500">{method.subtitle}</p>
                </div>
              </div>
              {method.badge && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  method.badge === 'Best' 
                    ? 'bg-teal-500 text-white'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {method.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Login Forms */}
        <Card className="border-2 border-slate-200">
          <CardContent className="p-6">
            {/* Email + OTP Form */}
            {activeTab === 'email-otp' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-700">Email Address</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="mt-1.5"
                    disabled={otpSent}
                    data-testid="email-input"
                  />
                </div>
                
                {otpSent && (
                  <div>
                    <Label className="text-slate-700">Enter OTP</Label>
                    <Input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit OTP"
                      className="mt-1.5 text-center text-xl tracking-widest"
                      maxLength={6}
                      data-testid="otp-input"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      OTP sent to {email}. <button onClick={() => setOtpSent(false)} className="text-teal-600 hover:underline">Change email</button>
                    </p>
                  </div>
                )}
                
                <Button
                  onClick={otpSent ? handleVerifyEmailOTP : handleSendEmailOTP}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                  data-testid="submit-btn"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : otpSent ? (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  {otpSent ? 'Verify & Login' : 'Send OTP'}
                </Button>
                
                <p className="text-xs text-center text-slate-500">
                  Email OTP is free and doesn't require SMS charges
                </p>
              </div>
            )}

            {/* Email + Password Form */}
            {activeTab === 'email-password' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-700">Email Address</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="mt-1.5"
                    data-testid="email-input"
                  />
                </div>
                
                <div>
                  <Label className="text-slate-700">Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="mt-1.5"
                    data-testid="password-input"
                  />
                </div>
                
                <Button
                  onClick={handleEmailPasswordLogin}
                  disabled={loading}
                  className="w-full bg-slate-800 hover:bg-slate-900"
                  data-testid="submit-btn"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4 mr-2" />
                  )}
                  Login
                </Button>
                
                <p className="text-xs text-center text-slate-500">
                  Don't have an account? Use Email + OTP to create one
                </p>
              </div>
            )}

            {/* WhatsApp OTP - Coming Soon */}
            {activeTab === 'whatsapp-otp' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Coming Soon!</h3>
                <p className="text-slate-600 text-sm">
                  WhatsApp OTP login will be available soon. 
                  Please use Email + OTP for now.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Login Section */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-3">Are you a staff member?</p>
            <Button
              variant="outline"
              onClick={() => navigate('/staff')}
              className="border-2 border-slate-300 hover:border-teal-500 hover:bg-teal-50"
              data-testid="staff-login-btn"
            >
              <Shield className="w-4 h-4 mr-2 text-teal-600" />
              Staff Portal Login
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-center text-slate-400 mt-8">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </main>
    </div>
  );
};

export default LoginPage;
