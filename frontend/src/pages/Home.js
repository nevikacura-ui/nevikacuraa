import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { User, Menu, X, Download, Smartphone, Search, Heart, FlaskConical, Video, Gift, Lightbulb, AlertTriangle, Activity, Pill, Shield, Package, ChevronRight, Stethoscope, Baby, ThermometerSun, Users } from 'lucide-react';
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
      fillCard: false
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
      tallerCard: true
    },
    {
      id: 'alyne',
      name: 'ALYNE',
      logo: '',
      description: 'Kids Health & Care',
      bgColor: '',
      accentColor: 'border-transparent',
      path: '/alyne',
      logoBg: '',
      customBg: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)',
      hideDecoration: false,
      fillCard: false,
      tallerCard: true,
      logoScale: 1.5,
      isGradient: true,
      hasSparkles: true,
      useTextLogo: true
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

        {/* Services Grid - 6 cards (Logo + Tagline only) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className={`group relative h-full ${service.tallerCard ? 'min-h-[320px]' : 'min-h-[260px]'} flex flex-col justify-between ${service.tallerCard ? 'p-6' : 'p-5'} rounded-2xl transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl border ${service.accentColor} ${service.bgColor} cursor-pointer overflow-hidden`}
              style={service.isGradient ? { background: service.customBg } : (service.customBg ? { backgroundColor: service.customBg } : {})}
              onClick={() => navigate(service.path)}
              data-testid={`service-card-${service.id}`}
            >
              {/* Sparkle/Star decorations for ALYNE */}
              {service.hasSparkles && (
                <>
                  <div className="absolute top-4 left-4 w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                  <div className="absolute top-8 right-8 w-1.5 h-1.5 bg-white/50 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
                  <div className="absolute top-16 left-12 w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
                  <div className="absolute bottom-20 right-6 w-2 h-2 bg-white/50 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="absolute bottom-32 left-6 w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <div className="absolute top-24 right-4 w-1 h-1 bg-white/60 rounded-full animate-pulse" style={{animationDelay: '0.8s'}}></div>
                  <div className="absolute bottom-28 right-12 w-1 h-1 bg-white/50 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  <div className="absolute top-1/2 left-3 w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse" style={{animationDelay: '0.7s'}}></div>
                </>
              )}
              
              {/* Background decoration - hidden for cards with hideDecoration */}
              {!service.hideDecoration && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150"></div>
              )}
              
              {/* Logo - takes most space */}
              <div 
                className={`flex items-center justify-center flex-1 overflow-hidden ${service.id === 'evara' || service.id === 'glydex' || service.id === 'alyne' ? 'px-0' : 'rounded-xl p-2'} ${service.logoBg}`}
              >
                {service.useTextLogo ? (
                  <div className="text-center">
                    <h2 className="text-5xl font-black text-white tracking-wide" style={{fontFamily: 'system-ui, -apple-system, sans-serif', textShadow: '0 2px 10px rgba(0,0,0,0.2)'}}>ALYNE</h2>
                    <p className="text-white/80 text-sm mt-2 font-medium">Kids by Nevika Cura</p>
                  </div>
                ) : service.logo ? (
                  <img 
                    src={service.logo} 
                    alt={service.name} 
                    className={`transition-transform group-hover:scale-105 ${
                      service.fillCard ? 'w-full h-full object-cover absolute inset-0 rounded-2xl' :
                      service.id === 'evara' ? 'w-full h-auto max-h-32 sm:max-h-36 object-contain' :
                      service.id === 'alyne' ? 'w-auto max-h-44 object-contain rounded-2xl shadow-lg' :
                      service.stretchLogo ? 'absolute inset-0 w-full h-full object-cover' :
                      service.logoRounded ? 'w-auto max-h-28 rounded-xl shadow-md object-contain' :
                      'w-auto max-h-28 mix-blend-multiply object-contain'
                    }`}
                    style={{
                      ...(service.logoScale ? { transform: `scale(${service.logoScale})` } : {}),
                      ...(service.id === 'alyne' ? { filter: 'brightness(1.1) contrast(1.05)' } : {})
                    }}
                    data-testid={`service-logo-${service.id}`}
                  />
                ) : null}
              </div>
              
              {/* Tagline only - no name (hide for fillCard items) */}
              {!service.fillCard && (
                <p className={`text-center text-sm relative z-10 ${service.tallerCard ? 'mt-4' : 'mt-3'} ${service.customBg || service.isGradient ? 'text-white/90' : 'text-gray-600'}`}>
                  {service.description}
                </p>
              )}
              
              <Button
                onClick={(e) => { e.stopPropagation(); navigate(service.path); }}
                data-testid={`service-button-${service.id}`}
                className={`${service.tallerCard ? 'mt-4' : 'mt-2'} w-full rounded-xl py-5 font-medium shadow-lg hover:shadow-xl transition-all duration-300 relative z-10 ${
                  (service.customBg || service.isGradient)
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
            <p className="text-3xl font-bold text-brand-teal">6</p>
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

        {/* More Features Section */}
        {user && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-center mb-6">More Features</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {/* Emergency - Highlighted */}
              <button
                onClick={() => navigate('/emergency')}
                className="p-4 bg-red-50 backdrop-blur rounded-xl border border-red-200 hover:shadow-md transition-all text-center"
                data-testid="emergency-btn"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-sm font-medium text-red-700">Emergency SOS</span>
              </button>
              <button
                onClick={() => navigate('/medication-tracker')}
                className="p-4 bg-white/70 backdrop-blur rounded-xl border hover:shadow-md transition-all text-center"
                data-testid="medication-tracker-btn"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-teal-100 flex items-center justify-center">
                  <Pill className="w-5 h-5 text-teal-500" />
                </div>
                <span className="text-sm font-medium">Pill Tracker</span>
              </button>
              <button
                onClick={() => navigate('/health-assessment')}
                className="p-4 bg-white/70 backdrop-blur rounded-xl border hover:shadow-md transition-all text-center"
                data-testid="health-assessment-btn"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-indigo-500" />
                </div>
                <span className="text-sm font-medium">Risk Assessment</span>
              </button>
              <button
                onClick={() => navigate('/my-health')}
                className="p-4 bg-white/70 backdrop-blur rounded-xl border hover:shadow-md transition-all text-center"
                data-testid="my-health-btn"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-red-100 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-sm font-medium">My Health</span>
              </button>
              <button
                onClick={() => navigate('/health-packages')}
                className="p-4 bg-white/70 backdrop-blur rounded-xl border hover:shadow-md transition-all text-center"
                data-testid="health-packages-btn"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-purple-100 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-purple-500" />
                </div>
                <span className="text-sm font-medium">Health Packages</span>
              </button>
              <button
                onClick={() => navigate('/teleconsult')}
                className="p-4 bg-white/70 backdrop-blur rounded-xl border hover:shadow-md transition-all text-center"
                data-testid="teleconsult-btn"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-blue-100 flex items-center justify-center">
                  <Video className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-sm font-medium">Video Consult</span>
              </button>
              <button
                onClick={() => navigate('/referral')}
                className="p-4 bg-white/70 backdrop-blur rounded-xl border hover:shadow-md transition-all text-center"
                data-testid="referral-btn"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-pink-100 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-pink-500" />
                </div>
                <span className="text-sm font-medium">Refer & Earn</span>
              </button>
              <button
                onClick={() => navigate('/health-tips')}
                className="p-4 bg-white/70 backdrop-blur rounded-xl border hover:shadow-md transition-all text-center"
                data-testid="health-tips-btn"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                </div>
                <span className="text-sm font-medium">Health Tips</span>
              </button>
            </div>
          </div>
        )}

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
                href="https://customer-assets.emergentagent.com/job_caresuite/artifacts/q8j4m5st_Nevika%20Cura.apk"
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
  const { sendAuthOtp, verifyAuthOtp, loginWithOtp, registerWithOtp, login, fetchUser, biometricAvailable, biometricEnabled, loginWithBiometric } = useAuth();
  const [loading, setLoading] = useState(false);
  // Steps: method-select, email-otp, email-otp-verify, phone-otp, phone-otp-verify, password-login, register, interests, password-failed
  const [step, setStep] = useState('method-select');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [mockOtp, setMockOtp] = useState('');
  const [otpMethod, setOtpMethod] = useState(''); // 'email' or 'sms' or 'mock'
  const [userExists, setUserExists] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verificationToken, setVerificationToken] = useState('');
  const [passwordLogin, setPasswordLogin] = useState({ email: '', password: '', rememberMe: true });
  const [registerForm, setRegisterForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [authMethod, setAuthMethod] = useState(''); // 'email-otp', 'password', 'phone-otp', 'google', 'biometric'
  const [loginError, setLoginError] = useState('');
  const otpRefs = React.useRef([]);
  const API = process.env.REACT_APP_BACKEND_URL;

  // Available interests
  const availableInterests = [
    { id: 'evara', name: 'Evara', description: "Women's Wellness & Care", icon: '🌸', color: 'pink' },
    { id: 'glydex', name: 'Glydex', description: 'Diabetes Care Portal', icon: '💚', color: 'teal' },
    { id: 'diagyn', name: 'DiaGyn Healthcare', description: 'Doctor Appointments', icon: '👨‍⚕️', color: 'blue' },
    { id: 'proton', name: 'Proton Diagnostics', description: 'Lab Tests & Checkups', icon: '🔬', color: 'indigo' },
    { id: 'pharmacy', name: 'Orange Pharmacy', description: 'Medicine Orders', icon: '💊', color: 'orange' },
  ];

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setStep('method-select');
      setEmail('');
      setPhone('');
      setOtp(['', '', '', '', '', '']);
      setMockOtp('');
      setUserExists(false);
      setResendTimer(0);
      setVerificationToken('');
      setPasswordLogin({ email: '', password: '', rememberMe: true });
      setRegisterForm({ name: '', phone: '', email: '', password: '' });
      setSelectedInterests([]);
      setAuthMethod('');
      setLoginError('');
    }
  }, [open]);

  // Send Email OTP for signup/login
  const handleSendEmailOtp = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/auth/email-otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (data.success) {
        setOtpMethod(data.method || 'email');
        if (data.mock_otp) setMockOtp(data.mock_otp);
        setStep('email-otp-verify');
        setResendTimer(60);
        toast.success('Verification code sent to your email!');
      } else {
        toast.error(data.detail || 'Failed to send OTP');
      }
    } catch (error) {
      toast.error('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };
  
  // Send Phone SMS OTP
  const handleSendPhoneOtp = async (e) => {
    e.preventDefault();
    if (!phone || phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    try {
      const response = await sendAuthOtp(phone);
      setOtpMethod(response.method || 'sms');
      if (response.mock_otp) setMockOtp(response.mock_otp);
      setStep('phone-otp-verify');
      setResendTimer(30);
      toast.success(response.method === 'sms' ? 'OTP sent to your phone!' : 'OTP generated!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Verify Email OTP
  const handleVerifyEmailOtp = async (otpString) => {
    if (otpString.length !== 6) return;
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/auth/email-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpString })
      });
      const data = await response.json();
      if (data.success && data.verified) {
        setVerificationToken(data.verification_token);
        setUserExists(data.user_exists);
        if (data.user_exists) {
          // User exists - login directly with email OTP (passwordless)
          try {
            const loginRes = await fetch(`${API}/api/auth/email-otp/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, verification_token: data.verification_token })
            });
            const loginData = await loginRes.json();
            if (loginRes.ok && loginData.token) {
              localStorage.setItem('token', loginData.token);
              if (fetchUser) await fetchUser();
              toast.success('Logged in successfully!');
              onClose();
            } else {
              // Fall back to password login
              setPasswordLogin({ ...passwordLogin, email });
              setStep('password-login');
              toast.success('Account found! Please enter your password.');
            }
          } catch (err) {
            setPasswordLogin({ ...passwordLogin, email });
            setStep('password-login');
            toast.success('Account found! Please enter your password.');
          }
        } else {
          // New user - go to registration
          setRegisterForm({ ...registerForm, email });
          setStep('register');
          toast.success('Email verified! Complete your registration.');
        }
      } else {
        toast.error(data.detail || 'Invalid verification code');
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };
  
  // Verify Phone SMS OTP
  const handleVerifyPhoneOtp = async (otpString) => {
    if (otpString.length !== 6) return;
    setLoading(true);
    try {
      const response = await verifyAuthOtp(phone, otpString);
      setUserExists(response.user_exists);
      if (response.verification_token) {
        setVerificationToken(response.verification_token);
      }
      
      if (response.user_exists) {
        // User exists - login directly
        await loginWithOtp(phone, otpString);
        toast.success('Logged in successfully!');
        onClose();
      } else {
        // New user - show registration form
        setRegisterForm({ ...registerForm, phone });
        setStep('register');
        toast.success('Phone verified! Complete your registration.');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!passwordLogin.email || !passwordLogin.password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    setLoginError('');
    try {
      await login(passwordLogin.email, passwordLogin.password, passwordLogin.rememberMe);
      toast.success('Login successful!');
      onClose();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Login failed. Check your password.';
      setLoginError(errorMsg);
      toast.error(errorMsg);
      // Show password-failed step with SMS OTP option
      setStep('password-failed');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle Biometric login
  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      await loginWithBiometric();
      toast.success('Logged in with biometric!');
      onClose();
    } catch (error) {
      toast.error('Biometric login failed. Please try another method.');
    } finally {
      setLoading(false);
    }
  };

  // Complete Registration
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    if (!registerForm.name || !registerForm.password) {
      toast.error('Please fill all required fields');
      return;
    }
    // Require either email or phone
    if (!registerForm.email && !registerForm.phone && !email && !phone) {
      toast.error('Email or phone is required');
      return;
    }
    setLoading(true);
    try {
      const regEmail = registerForm.email || email;
      const regPhone = registerForm.phone || phone;
      
      const response = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerForm.name,
          email: regEmail,
          password: registerForm.password,
          phone: regPhone,
          verification_token: verificationToken
        })
      });
      const data = await response.json();
      if (response.ok) {
        // Auto-login after registration
        try {
          await login(regEmail, registerForm.password);
          toast.success('Account created! Now customize your experience.');
          setStep('interests');
        } catch (loginErr) {
          toast.success('Account created! Please login.');
          setPasswordLogin({ email: regEmail, password: '' });
          setStep('password-login');
        }
      } else {
        toast.error(data.detail || 'Registration failed');
      }
    } catch (error) {
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle saving interests
  const handleSaveInterests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/api/user/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          interests: selectedInterests,
          onboarding_complete: true
        })
      });
      
      if (response.ok) {
        toast.success('Preferences saved! Welcome to Nevika Cura.');
        if (fetchUser) await fetchUser();
        onClose();
      } else {
        toast.error('Failed to save preferences');
      }
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interestId) => {
    setSelectedInterests(prev => 
      prev.includes(interestId) 
        ? prev.filter(i => i !== interestId)
        : [...prev, interestId]
    );
  };

  // Resend timer
  React.useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

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
          <DialogTitle className="font-heading text-2xl">
            {step === 'interests' ? 'Customize Your Experience' : 'Welcome to Nevika Cura'}
          </DialogTitle>
          <DialogDescription className="font-body">
            {step === 'method-select' && 'Choose how you want to sign in'}
            {step === 'email-otp' && 'Enter your email to receive a verification code'}
            {step === 'email-otp-verify' && 'Enter the verification code sent to your email'}
            {step === 'phone-otp' && 'Enter your phone number to receive an SMS'}
            {step === 'phone-otp-verify' && 'Enter the verification code sent to your phone'}
            {step === 'register' && 'Complete your registration'}
            {step === 'password-login' && 'Enter your password to login'}
            {step === 'interests' && 'Select the services you\'re interested in'}
          </DialogDescription>
        </DialogHeader>

        {/* Method Selection - Primary Step */}
        {step === 'method-select' && (
          <div className="space-y-4">
            {/* Email OTP - Most Preferred */}
            <button
              onClick={() => {
                setAuthMethod('email-otp');
                setStep('email-otp');
              }}
              className="w-full p-4 border-2 border-teal-200 bg-teal-50 rounded-xl hover:border-teal-400 hover:bg-teal-100 transition-all text-left group"
              data-testid="auth-method-email-otp"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-lg group-hover:bg-teal-200">
                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Email + OTP</p>
                  <p className="text-xs text-gray-500">Recommended • No password needed</p>
                </div>
                <span className="ml-auto bg-teal-500 text-white text-xs px-2 py-1 rounded-full">Best</span>
              </div>
            </button>
            
            {/* Email + Password */}
            <button
              onClick={() => {
                setAuthMethod('password');
                setStep('password-login');
              }}
              className="w-full p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
              data-testid="auth-method-password"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Email + Password</p>
                  <p className="text-xs text-gray-500">Traditional login</p>
                </div>
              </div>
            </button>
            
            {/* Phone OTP - Least Preferred */}
            <button
              onClick={() => {
                setAuthMethod('phone-otp');
                setStep('phone-otp');
              }}
              className="w-full p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all text-left opacity-80"
              data-testid="auth-method-phone-otp"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Phone + SMS OTP</p>
                  <p className="text-xs text-gray-500">SMS charges may apply</p>
                </div>
              </div>
            </button>
            
            {/* Biometric Login - Only show if available and enabled */}
            {biometricAvailable && biometricEnabled && (
              <button
                onClick={handleBiometricLogin}
                disabled={loading}
                className="w-full p-4 border-2 border-purple-200 bg-purple-50 rounded-xl hover:border-purple-400 hover:bg-purple-100 transition-all text-left"
                data-testid="auth-method-biometric"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Use Fingerprint / Face ID</p>
                    <p className="text-xs text-gray-500">Quick biometric login</p>
                  </div>
                </div>
              </button>
            )}
            
            <p className="text-xs text-center text-gray-400 mt-2">
              Email OTP is free and doesn't require SMS charges
            </p>
          </div>
        )}

        {/* Email OTP Entry */}
        {step === 'email-otp' && (
          <form onSubmit={handleSendEmailOtp} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required 
                data-testid="auth-email-input"
                className="h-12 rounded-xl"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full rounded-full h-12 bg-teal-600 hover:bg-teal-700" 
              disabled={loading || !email}
              data-testid="send-email-otp-button"
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </Button>
            <p className="text-xs text-center text-gray-500">
              We'll send a free verification code to your email
            </p>
            <div className="text-center">
              <button 
                type="button"
                onClick={() => setStep('method-select')}
                className="text-sm text-gray-500 hover:underline"
              >
                ← Back to login options
              </button>
            </div>
          </form>
        )}
        
        {/* Phone OTP Entry */}
        {step === 'phone-otp' && (
          <form onSubmit={handleSendPhoneOtp} className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">
                <strong>Note:</strong> SMS charges may apply. Email OTP is free!
              </p>
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium px-3 py-2 bg-gray-100 rounded-l-xl">+91</span>
                <Input 
                  id="phone" 
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number"
                  required 
                  data-testid="auth-phone-input"
                  className="h-12 rounded-r-xl rounded-l-none flex-1"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full rounded-full h-12" 
              disabled={loading || phone.length !== 10}
              data-testid="send-phone-otp-button"
            >
              {loading ? 'Sending...' : 'Send OTP via SMS'}
            </Button>
            <div className="text-center">
              <button 
                type="button"
                onClick={() => setStep('method-select')}
                className="text-sm text-gray-500 hover:underline"
              >
                ← Back to login options
              </button>
            </div>
          </form>
        )}

        {/* Email OTP Verification */}
        {step === 'email-otp-verify' && (
          <div className="space-y-4">
            {otpMethod === 'mock' && mockOtp && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  <strong>Test Mode:</strong> Your verification code is <span className="font-mono font-bold">{mockOtp}</span>
                </p>
              </div>
            )}
            <p className="text-sm text-gray-600 text-center">
              Code sent to <strong>{email}</strong>
            </p>
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (otpRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => {
                    handleOtpChange(index, e.target.value);
                    if (e.target.value && index < 5) {
                      otpRefs.current[index + 1]?.focus();
                    }
                    // Auto verify when complete
                    const newOtp = [...otp];
                    newOtp[index] = e.target.value;
                    if (newOtp.join('').length === 6) {
                      handleVerifyEmailOtp(newOtp.join(''));
                    }
                  }}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl"
                  data-testid={`otp-input-${index}`}
                />
              ))}
            </div>
            <div className="flex justify-between items-center">
              <button 
                onClick={() => {
                  setStep('email-otp');
                  setOtp(['', '', '', '', '', '']);
                }} 
                className="text-sm text-gray-500 hover:underline"
              >
                Change email
              </button>
              <button 
                onClick={async () => {
                  if (resendTimer > 0) return;
                  setLoading(true);
                  try {
                    const response = await fetch(`${API}/api/auth/email-otp/send`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email })
                    });
                    const data = await response.json();
                    if (data.mock_otp) setMockOtp(data.mock_otp);
                    setResendTimer(60);
                    toast.success('New code sent!');
                  } catch (error) {
                    toast.error('Failed to resend');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={resendTimer > 0 || loading}
                className="text-sm text-brand-teal hover:underline disabled:text-gray-400"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
              </button>
            </div>
          </div>
        )}
        
        {/* Phone OTP Verification */}
        {step === 'phone-otp-verify' && (
          <div className="space-y-4">
            {otpMethod === 'mock' && mockOtp && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  <strong>Test Mode:</strong> Your verification code is <span className="font-mono font-bold">{mockOtp}</span>
                </p>
              </div>
            )}
            <p className="text-sm text-gray-600 text-center">
              Code sent to <strong>+91 {phone}</strong>
            </p>
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (otpRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => {
                    handleOtpChange(index, e.target.value);
                    if (e.target.value && index < 5) {
                      otpRefs.current[index + 1]?.focus();
                    }
                    // Auto verify when complete
                    const newOtp = [...otp];
                    newOtp[index] = e.target.value;
                    if (newOtp.join('').length === 6) {
                      handleVerifyPhoneOtp(newOtp.join(''));
                    }
                  }}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl"
                  data-testid={`phone-otp-input-${index}`}
                />
              ))}
            </div>
            <div className="flex justify-between items-center">
              <button 
                onClick={() => {
                  setStep('phone-otp');
                  setOtp(['', '', '', '', '', '']);
                }} 
                className="text-sm text-gray-500 hover:underline"
              >
                Change number
              </button>
              <button 
                onClick={async () => {
                  if (resendTimer > 0) return;
                  await handleResendOtp();
                }}
                disabled={resendTimer > 0 || loading}
                className="text-sm text-brand-teal hover:underline disabled:text-gray-400"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>
          </div>
        )}

        {/* Registration Form */}
        {step === 'register' && (
          <form onSubmit={handleCompleteRegistration} className="space-y-4">
            {(email || registerForm.email) && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">✓ Email verified: <strong>{email || registerForm.email}</strong></p>
              </div>
            )}
            {(phone || registerForm.phone) && !email && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">✓ Phone verified: <strong>+91 {phone || registerForm.phone}</strong></p>
              </div>
            )}
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input 
                id="name" 
                value={registerForm.name}
                onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                placeholder="Enter your full name"
                required 
                className="h-12 rounded-xl"
                data-testid="register-name-input"
              />
            </div>
            {!email && (
              <div>
                <Label htmlFor="reg-email">Email Address *</Label>
                <Input 
                  id="reg-email" 
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                  placeholder="your@email.com"
                  required 
                  className="h-12 rounded-xl"
                />
              </div>
            )}
            {!phone && (
              <div>
                <Label htmlFor="reg-phone">Phone Number (Optional)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium px-3 py-2 bg-gray-100 rounded-l-xl">+91</span>
                  <Input 
                    id="reg-phone" 
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                    placeholder="For appointment SMS"
                    className="h-12 rounded-r-xl rounded-l-none flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Required only for appointment SMS notifications</p>
              </div>
            )}
            <div>
              <Label htmlFor="password">Create Password *</Label>
              <Input 
                id="password" 
                type="password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                placeholder="Min 6 characters"
                required 
                minLength={6}
                className="h-12 rounded-xl"
                data-testid="register-password-input"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full rounded-full h-12" 
              disabled={loading}
              data-testid="register-submit-button"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
            <div className="text-center">
              <button 
                type="button"
                onClick={() => setStep('method-select')}
                className="text-sm text-gray-500 hover:underline"
              >
                ← Back to login options
              </button>
            </div>
          </form>
        )}

        {/* Password Login */}
        {step === 'password-login' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <Label htmlFor="login-email">Email</Label>
              <Input 
                id="login-email" 
                type="email"
                value={passwordLogin.email}
                onChange={(e) => setPasswordLogin({...passwordLogin, email: e.target.value})}
                placeholder="your@email.com"
                required 
                className="h-12 rounded-xl"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label htmlFor="login-password">Password</Label>
              <Input 
                id="login-password" 
                type="password"
                value={passwordLogin.password}
                onChange={(e) => setPasswordLogin({...passwordLogin, password: e.target.value})}
                placeholder="Enter your password"
                required 
                className="h-12 rounded-xl"
                data-testid="login-password-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember-me"
                checked={passwordLogin.rememberMe}
                onChange={(e) => setPasswordLogin({...passwordLogin, rememberMe: e.target.checked})}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                data-testid="remember-me-checkbox"
              />
              <label htmlFor="remember-me" className="text-sm text-gray-600">
                Remember me for 30 days
              </label>
            </div>
            <Button 
              type="submit" 
              className="w-full rounded-full h-12" 
              disabled={loading}
              data-testid="password-login-button"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            <div className="flex justify-between text-sm">
              <button 
                type="button"
                onClick={() => setStep('method-select')}
                className="text-gray-500 hover:underline"
              >
                ← Other login options
              </button>
              <button 
                type="button"
                onClick={() => {
                  setEmail(passwordLogin.email);
                  setStep('email-otp');
                  toast.info('Enter your email to receive a password reset code');
                }}
                className="text-brand-teal hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </form>
        )}
        
        {/* Password Failed - SMS OTP Recovery Option */}
        {step === 'password-failed' && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-semibold text-red-700">Login Failed</p>
                  <p className="text-sm text-red-600">{loginError || 'Invalid email or password'}</p>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 text-center">
              Don't worry! You can still login using SMS OTP
            </p>
            
            <button
              onClick={() => {
                setAuthMethod('phone-otp');
                setStep('phone-otp');
              }}
              className="w-full p-4 border-2 border-orange-200 bg-orange-50 rounded-xl hover:border-orange-400 hover:bg-orange-100 transition-all text-left"
              data-testid="fallback-phone-otp"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Login with Phone + SMS OTP</p>
                  <p className="text-xs text-gray-500">We'll send a code to your registered phone</p>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => {
                setEmail(passwordLogin.email);
                setStep('email-otp');
              }}
              className="w-full p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Reset Password via Email</p>
                  <p className="text-xs text-gray-500">Get a verification code to reset your password</p>
                </div>
              </div>
            </button>
            
            <div className="text-center">
              <button 
                type="button"
                onClick={() => {
                  setLoginError('');
                  setStep('password-login');
                }}
                className="text-sm text-gray-500 hover:underline"
              >
                ← Try password again
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Interest Selection (Profile Customization) */}
        {step === 'interests' && (
          <div className="space-y-4">
            <div className="p-3 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg text-center">
              <p className="text-sm text-green-700">🎉 Account created successfully!</p>
            </div>
            
            <p className="text-sm text-gray-600 text-center">
              Help us personalize your experience by selecting services you're interested in:
            </p>

            <div className="grid gap-3">
              {availableInterests.map(interest => (
                <div
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                    selectedInterests.includes(interest.id)
                      ? 'border-brand-teal bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  data-testid={`interest-${interest.id}`}
                >
                  <span className="text-2xl">{interest.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{interest.name}</p>
                    <p className="text-xs text-gray-500">{interest.description}</p>
                  </div>
                  {selectedInterests.includes(interest.id) && (
                    <span className="text-brand-teal text-xl">✓</span>
                  )}
                </div>
              ))}
            </div>

            <Button 
              onClick={handleSaveInterests}
              className="w-full rounded-full h-12" 
              disabled={loading}
              data-testid="save-interests-button"
            >
              {loading ? 'Saving...' : selectedInterests.length > 0 ? 'Continue' : 'Skip for now'}
            </Button>
            
            <p className="text-xs text-center text-gray-400">
              You can always change these later in your profile
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default Home;
