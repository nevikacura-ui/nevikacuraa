import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { User, Menu, X, Download, Smartphone, Search } from 'lucide-react';
import Footer from '@/components/Footer';

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Detect if running as installed app (standalone mode)
  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);
    return () => {
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkStandalone);
    };
  }, []);

  const services = [
    {
      id: 'diagyn',
      name: 'DiaGyn Healthcare',
      logo: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/e4jrn2os_6_20260107_021040_0003.jpg',
      description: 'Book appointments with our expert doctors',
      bgColor: 'bg-blue-50',
      accentColor: 'border-brand-blue',
      path: '/diagyn',
      logoBg: 'bg-blue-50'
    },
    {
      id: 'proton',
      name: 'Proton Diagnostics',
      logo: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/saez5270_5_20260107_021040_0002.jpg',
      description: 'Comprehensive diagnostic tests and health checkups',
      bgColor: 'bg-indigo-50',
      accentColor: 'border-brand-indigo',
      path: '/proton',
      logoBg: 'bg-indigo-50'
    },
    {
      id: 'pharmacy',
      name: 'Orange Pharmacy',
      logo: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/n45xwyrx_3_20260107_021040_0000.jpg',
      description: 'Order medicines with doorstep delivery',
      bgColor: 'bg-orange-50',
      accentColor: 'border-brand-orange',
      path: '/pharmacy',
      logoBg: 'bg-orange-50'
    },
    {
      id: 'evara',
      name: 'Evara',
      logo: '/icons/evara-logo.png',
      description: "Women's Wellness & Care Program",
      bgColor: '',
      accentColor: 'border-transparent',
      path: '/evara',
      logoBg: '',
      customBg: '#511b63',
      hideDecoration: true,
      fillCard: true
    },
    {
      id: 'glydex',
      name: 'Glydex',
      logo: '/glydex-logo.png',
      description: 'Diabetes Care Portal',
      bgColor: '',
      accentColor: 'border-transparent',
      path: '/glydex',
      logoBg: '',
      customBg: '#121f33',
      hideDecoration: true,
      fillCard: true,
      extraBottomPadding: true
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Logo on left */}
            <div className="flex items-center">
              <img 
                src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
                alt="Nevika Cura" 
                className="h-14 sm:h-16 w-auto object-contain"
                data-testid="main-logo"
              />
            </div>
            
            {/* Navigation on right */}
            <div className="hidden md:flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/track')}
                data-testid="track-orders-button"
                className="font-heading"
              >
                <Search className="w-4 h-4 mr-2" />
                Track Orders
              </Button>
              {user ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/profile')}
                    data-testid="profile-button"
                    className="font-heading"
                  >
                    <User className="w-4 h-4 mr-2" />
                    {user.name}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={logout}
                    data-testid="logout-button"
                    className="rounded-full"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button 
                  size="sm"
                  onClick={() => setShowAuth(true)} 
                  data-testid="login-button"
                  className="rounded-full bg-brand-teal hover:bg-brand-teal/90"
                >
                  Login / Sign Up
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setShowMenu(!showMenu)}
              data-testid="mobile-menu-button"
            >
              {showMenu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {showMenu && (
        <div className="md:hidden fixed top-24 left-0 right-0 bg-white border-b shadow-lg z-40 p-4 space-y-3" data-testid="mobile-menu">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/track')}
            className="w-full justify-start"
          >
            <Search className="w-4 h-4 mr-2" />
            Track Orders
          </Button>
          {user ? (
            <>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/profile')}
                className="w-full justify-start"
              >
                <User className="w-4 h-4 mr-2" />
                {user.name}
              </Button>
              <Button 
                variant="outline" 
                onClick={logout}
                className="w-full"
              >
                Logout
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => setShowAuth(true)} 
              className="w-full bg-brand-teal hover:bg-brand-teal/90"
            >
              Login / Sign Up
            </Button>
          )}
        </div>
      )}

      {/* Main Content */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {/* Hero Section */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-teal/10 border border-brand-teal/20 rounded-full text-brand-teal text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-brand-teal rounded-full animate-pulse"></span>
            Your Health, Our Priority
          </div>
          <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl tracking-tight mb-6 text-foreground leading-tight">
            Complete Healthcare<br/>
            <span className="bg-gradient-to-r from-brand-teal to-cyan-500 bg-clip-text text-transparent">At Your Fingertips</span>
          </h1>
          <p className="font-body text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Book appointments, order medicines, get diagnostic tests - all from one trusted platform
          </p>
        </div>

        {/* Services Grid - 5 cards (Logo + Tagline only) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className={`group relative h-full min-h-[260px] flex flex-col justify-between p-5 rounded-2xl transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl border ${service.accentColor} ${service.bgColor} cursor-pointer overflow-hidden`}
              style={service.customBg ? { backgroundColor: service.customBg } : {}}
              onClick={() => navigate(service.path)}
              data-testid={`service-card-${service.id}`}
            >
              {/* Background decoration - hidden for cards with hideDecoration */}
              {!service.hideDecoration && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150"></div>
              )}
              
              {/* Logo - takes most space */}
              <div 
                className={`flex items-center justify-center flex-1 ${service.id === 'evara' || service.id === 'glydex' ? '' : 'rounded-xl p-2'} ${service.logoBg}`}
                style={service.customBg ? { backgroundColor: service.customBg } : {}}
              >
                <img 
                  src={service.logo} 
                  alt={service.name} 
                  className={`transition-transform group-hover:scale-105 ${
                    service.fillCard ? 'w-full h-full object-cover absolute inset-0 rounded-2xl' :
                    service.id === 'evara' || service.id === 'glydex' ? 'w-full h-auto max-h-32 object-contain' : 
                    service.stretchLogo ? 'absolute inset-0 w-full h-full object-cover' :
                    service.logoRounded ? 'w-auto max-h-28 rounded-xl shadow-md object-contain' :
                    'w-auto max-h-28 mix-blend-multiply object-contain'
                  }`}
                  style={service.logoScale ? { transform: `scale(${service.logoScale})` } : {}}
                  data-testid={`service-logo-${service.id}`}
                />
              </div>
              
              {/* Tagline only - no name */}
              <p className={`text-center text-sm relative z-10 ${service.extraBottomPadding ? 'mt-1' : 'mt-3'} ${service.customBg ? 'text-white/90' : 'text-gray-600'}`}>
                {service.description}
              </p>
              
              <Button
                onClick={(e) => { e.stopPropagation(); navigate(service.path); }}
                data-testid={`service-button-${service.id}`}
                className={`mt-2 w-full rounded-xl py-5 font-medium shadow-lg hover:shadow-xl transition-all duration-300 relative z-10 ${
                  service.customBg 
                    ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30' 
                    : 'bg-brand-teal hover:bg-brand-teal/90 text-white'
                }`}
              >
                Get Started
              </Button>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white/50 backdrop-blur rounded-xl border">
            <p className="text-3xl font-bold text-brand-teal">5+</p>
            <p className="text-sm text-gray-500">Services</p>
          </div>
          <div className="text-center p-4 bg-white/50 backdrop-blur rounded-xl border">
            <p className="text-3xl font-bold text-brand-blue">2</p>
            <p className="text-sm text-gray-500">Clinic Locations</p>
          </div>
          <div className="text-center p-4 bg-white/50 backdrop-blur rounded-xl border">
            <p className="text-3xl font-bold text-brand-orange">1000+</p>
            <p className="text-sm text-gray-500">Medicines</p>
          </div>
          <div className="text-center p-4 bg-white/50 backdrop-blur rounded-xl border">
            <p className="text-3xl font-bold text-purple-600">100+</p>
            <p className="text-sm text-gray-500">Lab Tests</p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-xl border border-border/50 rounded-full px-6 py-3">
            <span className="font-body text-muted-foreground">Need Help?</span>
            <a 
              href="https://wa.me/919403890429" 
              target="_blank" 
              rel="noopener noreferrer"
              data-testid="whatsapp-link"
              className="font-heading font-medium text-brand-teal hover:underline"
            >
              Contact us on WhatsApp
            </a>
          </div>
        </div>
      </main>

      {/* Download App Section - Hidden when running as standalone app */}
      {!isStandalone && (
        <section className="py-8 bg-gradient-to-r from-teal-500 to-teal-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Get Nevika Cura App</h3>
                  <p className="text-teal-100 text-sm">Healthcare at your fingertips</p>
                </div>
              </div>
              <a
                href="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/8qn5gihk_Nevika%20Cura.apk"
                download="Nevika Cura.apk"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-600 font-semibold rounded-full hover:bg-teal-50 transition-all shadow-lg hover:shadow-xl"
                data-testid="download-apk-btn"
              >
                <Download className="w-5 h-5" />
                Download Android App
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <Footer />

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
};

const AuthModal = ({ open, onClose }) => {
  const { sendAuthOtp, verifyAuthOtp, loginWithOtp, registerWithOtp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('phone'); // phone, otp, register
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [mockOtp, setMockOtp] = useState('');
  const [otpMethod, setOtpMethod] = useState(''); // 'sms' or 'mock'
  const [userExists, setUserExists] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verificationToken, setVerificationToken] = useState(''); // Store verification token
  const otpRefs = React.useRef([]);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setStep('phone');
      setPhone('');
      setOtp(['', '', '', '', '', '']);
      setMockOtp('');
      setUserExists(false);
      setResendTimer(0);
      setVerificationToken('');
    }
  }, [open]);

  // Resend timer
  React.useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    try {
      const response = await sendAuthOtp(phone);
      setMockOtp(response.mock_otp || '');
      setOtpMethod(response.method || 'mock');
      setStep('otp');
      setResendTimer(30);
      toast.success(response.method === 'sms' ? 'OTP sent to your phone!' : 'OTP sent successfully!');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter complete 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const response = await verifyAuthOtp(phone, otpValue);
      setUserExists(response.user_exists);
      
      // Store verification token for registration
      if (response.verification_token) {
        setVerificationToken(response.verification_token);
      }
      
      if (response.user_exists) {
        // User exists - login directly
        await loginWithOtp(phone, otpValue);
        toast.success('Logged in successfully!');
        onClose();
      } else {
        // New user - show registration form
        setStep('register');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const otpValue = otp.join('');
    try {
      await registerWithOtp(
        phone,
        otpValue,
        formData.get('email'),
        formData.get('password'),
        formData.get('name'),
        verificationToken  // Pass the verification token
      );
      toast.success('Account created successfully!');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const response = await sendAuthOtp(phone);
      setMockOtp(response.mock_otp || '');
      setOtpMethod(response.method || 'mock');
      setOtp(['', '', '', '', '', '']);
      setResendTimer(30);
      toast.success(response.method === 'sms' ? 'OTP sent to your phone!' : 'OTP resent successfully!');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="auth-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Welcome to Nevika Cura</DialogTitle>
          <DialogDescription className="font-body">
            {step === 'phone' && 'Enter your phone number to login or create an account'}
            {step === 'otp' && 'Enter the OTP sent to your phone'}
            {step === 'register' && 'Complete your registration'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Phone Number */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">+91</span>
                <Input 
                  id="phone" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter 10-digit mobile number"
                  required 
                  data-testid="auth-phone-input"
                  className="h-12 rounded-xl flex-1"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full rounded-full h-12" 
              disabled={loading || phone.length < 10}
              data-testid="send-otp-button"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <div className="space-y-4">
            {/* Mock OTP Display - Only shown in test mode */}
            {mockOtp && otpMethod === 'mock' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Test Mode:</strong> Your OTP is <strong className="text-lg">{mockOtp}</strong>
                </p>
              </div>
            )}
            
            {/* SMS Sent Confirmation */}
            {otpMethod === 'sms' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✓ OTP sent via SMS to +91 {phone}
                </p>
              </div>
            )}
            
            <div>
              <Label className="block text-center mb-3">Enter 6-digit OTP</Label>
              <div className="flex justify-center gap-2">
                {otp.map((digit, idx) => (
                  <Input
                    key={idx}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl"
                    maxLength={1}
                    data-testid={`otp-input-${idx}`}
                  />
                ))}
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Did not receive OTP?{' '}
              {resendTimer > 0 ? (
                <span>Resend in {resendTimer}s</span>
              ) : (
                <button 
                  onClick={handleResendOtp} 
                  className="text-brand-teal font-medium hover:underline"
                  disabled={loading}
                >
                  Resend OTP
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setStep('phone')} 
                className="flex-1 rounded-full"
                disabled={loading}
              >
                Back
              </Button>
              <Button 
                onClick={handleVerifyOtp}
                className="flex-1 rounded-full" 
                disabled={loading || otp.join('').length !== 6}
                data-testid="verify-otp-button"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Registration Form (for new users) */}
        {step === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Phone <strong>+91 {phone}</strong> verified! Complete your profile.
            </p>
            <div>
              <Label htmlFor="register-name">Full Name</Label>
              <Input 
                id="register-name" 
                name="name" 
                required 
                data-testid="register-name-input"
                className="h-12 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="register-email">Email</Label>
              <Input 
                id="register-email" 
                name="email" 
                type="email" 
                required 
                data-testid="register-email-input"
                className="h-12 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="register-password">Password</Label>
              <Input 
                id="register-password" 
                name="password" 
                type="password" 
                required 
                data-testid="register-password-input"
                className="h-12 rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                type="button"
                variant="outline"
                onClick={() => setStep('otp')} 
                className="flex-1 rounded-full"
                disabled={loading}
              >
                Back
              </Button>
              <Button 
                type="submit" 
                className="flex-1 rounded-full" 
                disabled={loading}
                data-testid="register-submit-button"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default Home;
