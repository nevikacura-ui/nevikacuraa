import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { 
  ArrowLeft, User, Phone, Calendar, Loader2, LogOut, Mail,
  FileText, Pill, FlaskConical, Receipt, History, Clock, Gift, Package,
  ChevronRight, Settings, Heart, Bell, HelpCircle, Share2, Info, Shield,
  Sun, Moon, Cake, CreditCard, MapPin, Star, Bookmark, MessageCircle,
  RefreshCw
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const PatientPortal = () => {
  const navigate = useNavigate();
  const { setPatientAuth, logout: authLogout } = useAuth();
  
  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  const [token, setToken] = useState(null);
  
  // Login states
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loginStep, setLoginStep] = useState('phone'); // 'phone' | 'otp'
  const [loading, setLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef([]);
  
  // Data states
  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // UI states
  const [theme, setTheme] = useState('light');
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  
  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);
  
  // Check for existing session
  useEffect(() => {
    const verifyExistingToken = async (savedToken) => {
      try {
        const response = await axios.get(`${API}/patients/portal/me`, {
          headers: { 'Authorization': `Bearer ${savedToken}` }
        });
        setPatientInfo(response.data);
        setToken(savedToken);
        setIsAuthenticated(true);
        fetchHistory(response.data.patient_id, savedToken);
      } catch (error) {
        localStorage.removeItem('patientToken');
      }
    };
    
    const savedToken = localStorage.getItem('patientToken');
    if (savedToken) {
      verifyExistingToken(savedToken);
    }
  }, []);
  
  const sendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/otp/whatsapp/send`, {
        phone: phone,
        purpose: 'patient_portal'
      });
      
      setLoginStep('otp');
      setCountdown(30);
      setMockOtp(res.data.mock ? res.data.otp : '');
      toast.success('OTP sent via WhatsApp!', {
        description: res.data.mock ? `Use code: ${res.data.otp}` : 'Check your WhatsApp'
      });
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };
  
  const verifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/otp/whatsapp/verify`, {
        phone: phone,
        otp: otpCode
      });
      
      // OTP verified, try to get patient profile
      try {
        const profileRes = await axios.post(`${API}/patients/portal/login-mobile`, {
          mobile: phone
        });
        
        const { token: newToken, patient } = profileRes.data;
        
        localStorage.setItem('patientToken', newToken);
        setToken(newToken);
        setPatientInfo(patient);
        setIsAuthenticated(true);
        
        if (setPatientAuth) {
          setPatientAuth(newToken, patient);
        }
        
        toast.success(`Welcome, ${patient.name}!`);
        fetchHistory(patient.patient_id, newToken);
      } catch (profileError) {
        // Create guest profile with phone
        setPatientInfo({ mobile: phone, name: 'Guest User' });
        setIsAuthenticated(true);
        toast.info('Welcome! Complete your profile at the clinic.');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };
  
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (index === 5 && value && newOtp.join('').length === 6) {
      setTimeout(() => verifyOTP(), 100);
    }
  };
  
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const fetchHistory = async (patientId, authToken) => {
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${API}/patients/portal/${patientId}/history`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      setHistory(response.data);
    } catch (error) {
      console.error('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('patientToken');
    setIsAuthenticated(false);
    setPatientInfo(null);
    setToken(null);
    setHistory(null);
    setPhone('');
    setOtp(['', '', '', '', '', '']);
    setLoginStep('phone');
    if (authLogout) authLogout();
    toast.success('Logged out successfully');
  };

  // Menu Items for Blinkit-style layout
  const quickActions = [
    { icon: Receipt, label: 'Your Orders', count: history?.appointments?.length || 0, onClick: () => navigate('/') },
    { icon: CreditCard, label: 'Nevika Wallet', balance: '₹0', onClick: () => toast.info('Coming soon!') },
    { icon: HelpCircle, label: 'Need Help?', onClick: () => toast.info('Contact: +91 98765 43210') },
  ];
  
  const yourInfo = [
    { icon: MapPin, label: 'Address Book', onClick: () => toast.info('Coming soon!') },
    { icon: Bookmark, label: 'Saved Doctors', onClick: () => toast.info('Coming soon!') },
    { icon: Heart, label: 'Your Wishlist', onClick: () => toast.info('Coming soon!') },
    { icon: FileText, label: 'Your Prescriptions', onClick: () => navigate('/') },
    { icon: Gift, label: 'E-gift Cards', onClick: () => toast.info('Coming soon!') },
  ];
  
  const paymentOptions = [
    { icon: CreditCard, label: 'Wallet', onClick: () => toast.info('Coming soon!') },
    { icon: Settings, label: 'Payment Settings', onClick: () => toast.info('Coming soon!') },
    { icon: Gift, label: 'Claim Gift Card', onClick: () => toast.info('Coming soon!') },
    { icon: Star, label: 'Your Rewards', onClick: () => toast.info('Coming soon!') },
  ];
  
  const otherInfo = [
    { icon: Share2, label: 'Share the App', onClick: () => {
      if (navigator.share) {
        navigator.share({ title: 'Nevika Cura', url: window.location.origin });
      } else {
        toast.info('Share link copied!');
      }
    }},
    { icon: Info, label: 'About Us', onClick: () => toast.info('Nevika Cura Healthcare') },
    { icon: Shield, label: 'Account Privacy', onClick: () => toast.info('Coming soon!') },
    { icon: Bell, label: 'Notification Preferences', onClick: () => toast.info('Coming soon!') },
    { icon: LogOut, label: 'Log Out', onClick: handleLogout, danger: true },
  ];

  // Login Screen (Blinkit style)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
          <div className="flex items-center gap-4 px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2" data-testid="back-btn">
              <ArrowLeft className="w-6 h-6 text-gray-800" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800">Profile</h1>
          </div>
        </header>
        
        {/* Login Card */}
        <div className="p-4">
          <div className="bg-gradient-to-br from-teal-500 to-cyan-500 rounded-3xl p-6 text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <User className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Welcome Back</h2>
            <p className="text-white/80 text-sm">Login to view your health records</p>
          </div>
          
          <div className="mt-6 space-y-4">
            {loginStep === 'phone' ? (
              <>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">WhatsApp Number</label>
                  <div className="flex">
                    <div className="flex items-center px-4 bg-gray-100 rounded-l-xl border border-r-0 border-gray-200">
                      <span className="text-gray-600 font-medium">+91</span>
                    </div>
                    <Input
                      type="tel"
                      placeholder="Enter your mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="rounded-l-none rounded-r-xl h-12 text-lg border-gray-200"
                      data-testid="login-phone-input"
                    />
                  </div>
                </div>
                
                <Button
                  onClick={sendOTP}
                  disabled={loading || phone.length < 10}
                  className="w-full h-12 bg-green-500 hover:bg-green-600 rounded-xl text-base font-medium"
                  data-testid="send-otp-btn"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Send OTP via WhatsApp
                    </>
                  )}
                </Button>
                
                <p className="text-center text-xs text-gray-500">
                  Not registered? Visit our clinic to create your patient profile.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 text-gray-600 bg-gray-50 p-3 rounded-xl">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">OTP sent to +91 ******{phone.slice(-4)}</span>
                </div>
                
                {mockOtp && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-yellow-600 mb-1">Test Mode - Use this OTP:</p>
                    <p className="text-2xl font-mono font-bold text-yellow-700 tracking-widest">{mockOtp}</p>
                  </div>
                )}
                
                <div className="flex justify-center gap-2">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={el => otpRefs.current[index] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 focus:border-green-500 rounded-lg"
                      data-testid={`otp-input-${index}`}
                    />
                  ))}
                </div>
                
                <Button
                  onClick={verifyOTP}
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full h-12 bg-green-500 hover:bg-green-600 rounded-xl text-base font-medium"
                  data-testid="verify-otp-btn"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
                </Button>
                
                <div className="flex items-center justify-between text-sm">
                  <button
                    onClick={() => { setLoginStep('phone'); setOtp(['', '', '', '', '', '']); }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Change number
                  </button>
                  {countdown > 0 ? (
                    <span className="text-gray-400">Resend in {countdown}s</span>
                  ) : (
                    <button
                      onClick={sendOTP}
                      disabled={loading}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Resend OTP
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Profile Screen (Blinkit style)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center gap-4 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2" data-testid="back-btn">
            <ArrowLeft className="w-6 h-6 text-gray-800" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Profile</h1>
        </div>
      </header>
      
      {/* Profile Avatar */}
      <div className="bg-white pt-6 pb-4 text-center">
        <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
          <User className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="mt-3 text-xl font-bold text-gray-900">Your Account</h2>
        <p className="text-gray-500">+91 {patientInfo?.mobile || phone}</p>
      </div>
      
      {/* Birthday Banner */}
      <div 
        className="mx-4 mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl flex items-center justify-between cursor-pointer"
        onClick={() => setShowBirthdayModal(true)}
        data-testid="birthday-banner"
      >
        <div>
          <h3 className="font-semibold text-gray-800">Add your birthday</h3>
          <p className="text-teal-600 text-sm font-medium">Enter details ▸</p>
        </div>
        <div className="w-16 h-16">
          <Cake className="w-full h-full text-orange-300" />
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
        {quickActions.map((item, idx) => (
          <button
            key={idx}
            onClick={item.onClick}
            className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col items-center gap-2 hover:shadow-md transition-all"
            data-testid={`quick-action-${idx}`}
          >
            <item.icon className="w-6 h-6 text-gray-600" />
            <span className="text-xs text-gray-700 font-medium text-center">{item.label}</span>
            {item.count !== undefined && (
              <span className="text-xs text-gray-400">{item.count}</span>
            )}
          </button>
        ))}
      </div>
      
      {/* Appearance Toggle */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Sun className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-700">Appearance</span>
          </div>
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-600"
          >
            {theme === 'light' ? 'LIGHT' : 'DARK'} ▾
          </button>
        </div>
      </div>
      
      {/* Your Information Section */}
      <div className="mx-4 mt-6">
        <h3 className="text-base font-bold text-gray-900 mb-3 px-1">Your Information</h3>
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {yourInfo.map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              data-testid={`info-item-${idx}`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">{item.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>
      
      {/* Payment & Coupons Section */}
      <div className="mx-4 mt-6">
        <h3 className="text-base font-bold text-gray-900 mb-3 px-1">Payment and Coupons</h3>
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {paymentOptions.map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              data-testid={`payment-item-${idx}`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">{item.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>
      
      {/* Other Information Section */}
      <div className="mx-4 mt-6 mb-8">
        <h3 className="text-base font-bold text-gray-900 mb-3 px-1">Other Information</h3>
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {otherInfo.map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${item.danger ? 'text-red-500' : ''}`}
              data-testid={`other-item-${idx}`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${item.danger ? 'text-red-500' : 'text-gray-500'}`} />
                <span className={item.danger ? 'text-red-500' : 'text-gray-700'}>{item.label}</span>
              </div>
              <ChevronRight className={`w-5 h-5 ${item.danger ? 'text-red-400' : 'text-gray-400'}`} />
            </button>
          ))}
        </div>
      </div>
      
      {/* Birthday Modal */}
      <Dialog open={showBirthdayModal} onOpenChange={setShowBirthdayModal}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cake className="w-5 h-5 text-orange-500" />
              Add Your Birthday
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input type="date" className="h-12 rounded-xl" data-testid="birthday-input" />
            <Button className="w-full h-12 bg-teal-500 hover:bg-teal-600 rounded-xl" onClick={() => { setShowBirthdayModal(false); toast.success('Birthday saved!'); }}>
              Save Birthday
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientPortal;
