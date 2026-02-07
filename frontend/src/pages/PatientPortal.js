import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { 
  ArrowLeft, User, Phone, Loader2, LogOut, 
  FileText, Receipt, History, Gift, 
  ChevronRight, Heart, Bell, HelpCircle, Share2, Info, Shield,
  Cake, CreditCard, MapPin, Star, Bookmark, MessageCircle,
  RefreshCw, Package, Calendar, FlaskConical, Pill, X
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

// 30 days in milliseconds
const LOGIN_EXPIRY_DAYS = 30;
const LOGIN_EXPIRY_MS = LOGIN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

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
  const [loginStep, setLoginStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef([]);
  
  // Data states
  const [orders, setOrders] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [savedDoctors, setSavedDoctors] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingData, setLoadingData] = useState(false);
  
  // UI states
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showDoctorsModal, setShowDoctorsModal] = useState(false);
  const [showPrescriptionsModal, setShowPrescriptionsModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showLabTestsModal, setShowLabTestsModal] = useState(false);
  const [birthday, setBirthday] = useState('');
  const [newAddress, setNewAddress] = useState({ label: '', address: '', pincode: '' });
  const [ordersTab, setOrdersTab] = useState('all'); // all, pharmacy, appointments
  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  
  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);
  
  // Check for existing 30-day session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const savedToken = localStorage.getItem('patientToken');
      const loginExpiry = localStorage.getItem('patientLoginExpiry');
      const savedPatient = localStorage.getItem('patientInfo');
      
      // Check if login has expired
      if (loginExpiry && new Date().getTime() > parseInt(loginExpiry)) {
        // Session expired - clear everything
        localStorage.removeItem('patientToken');
        localStorage.removeItem('patientLoginExpiry');
        localStorage.removeItem('patientInfo');
        return;
      }
      
      if (savedToken && savedPatient) {
        try {
          const patient = JSON.parse(savedPatient);
          // Verify token is still valid with backend
          const response = await axios.get(`${API}/patients/portal/me`, {
            headers: { 'Authorization': `Bearer ${savedToken}` }
          });
          
          setPatientInfo(response.data);
          setToken(savedToken);
          setIsAuthenticated(true);
          fetchAllData(response.data.patient_id, savedToken);
        } catch (error) {
          // Token invalid - clear storage
          localStorage.removeItem('patientToken');
          localStorage.removeItem('patientLoginExpiry');
          localStorage.removeItem('patientInfo');
        }
      }
    };
    
    checkExistingSession();
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
        
        // Store with 30-day expiry
        const expiryTime = new Date().getTime() + LOGIN_EXPIRY_MS;
        localStorage.setItem('patientToken', newToken);
        localStorage.setItem('patientLoginExpiry', expiryTime.toString());
        localStorage.setItem('patientInfo', JSON.stringify(patient));
        
        setToken(newToken);
        setPatientInfo(patient);
        setIsAuthenticated(true);
        
        if (setPatientAuth) {
          setPatientAuth(newToken, patient);
        }
        
        toast.success(`Welcome, ${patient.name}!`);
        fetchAllData(patient.patient_id, newToken);
      } catch (profileError) {
        // Create guest profile with phone - still keep them logged in
        const guestPatient = { mobile: phone, name: 'Guest User', patient_id: `GUEST-${phone}` };
        const expiryTime = new Date().getTime() + LOGIN_EXPIRY_MS;
        localStorage.setItem('patientLoginExpiry', expiryTime.toString());
        localStorage.setItem('patientInfo', JSON.stringify(guestPatient));
        
        setPatientInfo(guestPatient);
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

  const fetchAllData = async (patientId, authToken) => {
    setLoadingData(true);
    try {
      // Fetch all user data in parallel
      const headers = { 'Authorization': `Bearer ${authToken}` };
      
      const [historyRes] = await Promise.all([
        axios.get(`${API}/patients/portal/${patientId}/history`, { headers }).catch(() => ({ data: {} })),
      ]);
      
      if (historyRes.data) {
        setOrders(historyRes.data.pharmacy_orders || []);
        setAppointments(historyRes.data.appointments || []);
        setLabTests(historyRes.data.lab_tests || []);
        setPrescriptions(historyRes.data.prescriptions || []);
      }
    } catch (error) {
      console.error('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('patientToken');
    localStorage.removeItem('patientLoginExpiry');
    localStorage.removeItem('patientInfo');
    setIsAuthenticated(false);
    setPatientInfo(null);
    setToken(null);
    setOrders([]);
    setAppointments([]);
    setLabTests([]);
    setPrescriptions([]);
    setPhone('');
    setOtp(['', '', '', '', '', '']);
    setLoginStep('phone');
    if (authLogout) authLogout();
    toast.success('Logged out successfully');
  };
  
  const saveBirthday = async () => {
    if (!birthday) {
      toast.error('Please select your birthday');
      return;
    }
    // Save to localStorage for now
    const updatedPatient = { ...patientInfo, birthday };
    localStorage.setItem('patientInfo', JSON.stringify(updatedPatient));
    setPatientInfo(updatedPatient);
    setShowBirthdayModal(false);
    toast.success('Birthday saved!');
  };
  
  const addAddress = () => {
    if (!newAddress.address || !newAddress.pincode) {
      toast.error('Please fill all fields');
      return;
    }
    const updatedAddresses = [...addresses, { ...newAddress, id: Date.now() }];
    setAddresses(updatedAddresses);
    localStorage.setItem('savedAddresses', JSON.stringify(updatedAddresses));
    setNewAddress({ label: '', address: '', pincode: '' });
    toast.success('Address saved!');
  };
  
  const handleShare = async () => {
    const shareData = {
      title: 'Nevika Cura',
      text: 'Check out Nevika Cura - Your complete healthcare companion!',
      url: window.location.origin
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      navigator.clipboard.writeText(window.location.origin);
      toast.success('Link copied to clipboard!');
    }
  };

  // Quick Actions
  const quickActions = [
    { 
      icon: Receipt, 
      label: 'My Orders', 
      count: orders.length + appointments.length, 
      onClick: () => setShowOrdersModal(true) 
    },
    { 
      icon: FlaskConical, 
      label: 'Lab Tests', 
      count: labTests.length, 
      onClick: () => setShowLabTestsModal(true) 
    },
    { 
      icon: CreditCard, 
      label: 'Wallet', 
      balance: `₹${walletBalance}`, 
      onClick: () => setShowWalletModal(true) 
    },
  ];
  
  // Your Information
  const yourInfo = [
    { icon: MapPin, label: 'Address Book', count: addresses.length, onClick: () => setShowAddressModal(true) },
    { icon: Bookmark, label: 'Saved Doctors', count: savedDoctors.length, onClick: () => setShowDoctorsModal(true) },
    { icon: FileText, label: 'Your Prescriptions', count: prescriptions.length, onClick: () => setShowPrescriptionsModal(true) },
    { icon: Heart, label: 'Health Records', onClick: () => navigate('/') },
  ];
  
  // Payment & Coupons - Cashfree integrated
  const paymentOptions = [
    { icon: CreditCard, label: 'Saved Cards', onClick: () => toast.info('Manage cards in payment flow') },
    { icon: Gift, label: 'Your Coupons', onClick: () => toast.info('No coupons available') },
    { icon: Star, label: 'Rewards Points', badge: '0 pts', onClick: () => toast.info('Earn points on every order!') },
  ];
  
  // Other Info
  const otherInfo = [
    { icon: Share2, label: 'Share the App', onClick: handleShare },
    { icon: Bell, label: 'Notification Settings', onClick: () => toast.info('Manage in phone settings') },
    { icon: Info, label: 'About Nevika Cura', onClick: () => toast.info('Your trusted healthcare partner since 2020') },
    { icon: Shield, label: 'Privacy Policy', onClick: () => window.open('/privacy', '_blank') },
    { icon: LogOut, label: 'Log Out', onClick: handleLogout, danger: true },
  ];

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
          <div className="flex items-center gap-4 px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2" data-testid="back-btn">
              <ArrowLeft className="w-6 h-6 text-gray-800" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800">Profile</h1>
          </div>
        </header>
        
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
                  Stay logged in for {LOGIN_EXPIRY_DAYS} days
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

  // Authenticated Profile Screen
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
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
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
          <User className="w-10 h-10 text-white" />
        </div>
        <h2 className="mt-3 text-xl font-bold text-gray-900">{patientInfo?.name || 'Your Account'}</h2>
        <p className="text-gray-500">+91 {patientInfo?.mobile || phone}</p>
        <p className="text-xs text-green-600 mt-1">Logged in for {LOGIN_EXPIRY_DAYS} days</p>
      </div>
      
      {/* Birthday Banner */}
      {!patientInfo?.birthday && (
        <div 
          className="mx-4 mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl flex items-center justify-between cursor-pointer"
          onClick={() => setShowBirthdayModal(true)}
          data-testid="birthday-banner"
        >
          <div>
            <h3 className="font-semibold text-gray-800">Add your birthday</h3>
            <p className="text-teal-600 text-sm font-medium">Get special offers!</p>
          </div>
          <Cake className="w-12 h-12 text-orange-300" />
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
        {quickActions.map((item, idx) => (
          <button
            key={idx}
            onClick={item.onClick}
            className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col items-center gap-2 hover:shadow-md transition-all active:scale-95"
            data-testid={`quick-action-${idx}`}
          >
            <item.icon className="w-6 h-6 text-teal-600" />
            <span className="text-xs text-gray-700 font-medium text-center">{item.label}</span>
            {item.count !== undefined && (
              <span className="text-xs text-teal-600 font-semibold">{item.count}</span>
            )}
            {item.balance && (
              <span className="text-xs text-teal-600 font-semibold">{item.balance}</span>
            )}
          </button>
        ))}
      </div>
      
      {/* Your Information Section */}
      <div className="mx-4 mt-6">
        <h3 className="text-base font-bold text-gray-900 mb-3 px-1">Your Information</h3>
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {yourInfo.map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
              data-testid={`info-item-${idx}`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.count !== undefined && item.count > 0 && (
                  <span className="bg-teal-100 text-teal-700 text-xs px-2 py-0.5 rounded-full">{item.count}</span>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Payment & Coupons */}
      <div className="mx-4 mt-6">
        <h3 className="text-base font-bold text-gray-900 mb-3 px-1">Payment & Rewards</h3>
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {paymentOptions.map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
              data-testid={`payment-item-${idx}`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className="text-xs text-gray-500">{item.badge}</span>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Other Information */}
      <div className="mx-4 mt-6 mb-8">
        <h3 className="text-base font-bold text-gray-900 mb-3 px-1">Other</h3>
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {otherInfo.map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:bg-gray-100 ${item.danger ? 'text-red-500' : ''}`}
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
            <Input 
              type="date" 
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="h-12 rounded-xl" 
              data-testid="birthday-input" 
            />
            <Button 
              className="w-full h-12 bg-teal-500 hover:bg-teal-600 rounded-xl" 
              onClick={saveBirthday}
            >
              Save Birthday
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Orders Modal */}
      <Dialog open={showOrdersModal} onOpenChange={setShowOrdersModal}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Your Orders</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {appointments.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Appointments ({appointments.length})
                </h4>
                {appointments.map((apt, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl mb-2">
                    <p className="font-medium">{apt.doctor_name || 'Doctor Visit'}</p>
                    <p className="text-sm text-gray-500">{apt.date} - {apt.status}</p>
                  </div>
                ))}
              </div>
            )}
            {orders.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <Pill className="w-4 h-4" /> Pharmacy Orders ({orders.length})
                </h4>
                {orders.map((order, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl mb-2">
                    <p className="font-medium">Order #{order.order_id?.slice(-6) || idx + 1}</p>
                    <p className="text-sm text-gray-500">₹{order.total} - {order.status}</p>
                  </div>
                ))}
              </div>
            )}
            {labTests.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4" /> Lab Tests ({labTests.length})
                </h4>
                {labTests.map((test, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl mb-2">
                    <p className="font-medium">{test.test_name || 'Lab Test'}</p>
                    <p className="text-sm text-gray-500">{test.date} - {test.status}</p>
                  </div>
                ))}
              </div>
            )}
            {appointments.length === 0 && orders.length === 0 && labTests.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No orders yet</p>
                <p className="text-sm">Book an appointment or order medicines!</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Address Book Modal */}
      <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Address Book
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {addresses.map((addr, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-xl flex justify-between items-start">
                <div>
                  <p className="font-medium">{addr.label || 'Home'}</p>
                  <p className="text-sm text-gray-500">{addr.address}</p>
                  <p className="text-sm text-gray-500">PIN: {addr.pincode}</p>
                </div>
                <button onClick={() => {
                  const updated = addresses.filter((_, i) => i !== idx);
                  setAddresses(updated);
                  localStorage.setItem('savedAddresses', JSON.stringify(updated));
                }}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ))}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Add New Address</h4>
              <Input 
                placeholder="Label (Home, Work, etc.)"
                value={newAddress.label}
                onChange={(e) => setNewAddress({...newAddress, label: e.target.value})}
                className="mb-2"
              />
              <Input 
                placeholder="Full Address"
                value={newAddress.address}
                onChange={(e) => setNewAddress({...newAddress, address: e.target.value})}
                className="mb-2"
              />
              <Input 
                placeholder="PIN Code"
                value={newAddress.pincode}
                onChange={(e) => setNewAddress({...newAddress, pincode: e.target.value.replace(/\D/g, '').slice(0, 6)})}
                className="mb-2"
              />
              <Button onClick={addAddress} className="w-full bg-teal-500 hover:bg-teal-600">
                Add Address
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Prescriptions Modal */}
      <Dialog open={showPrescriptionsModal} onOpenChange={setShowPrescriptionsModal}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Your Prescriptions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {prescriptions.length > 0 ? (
              prescriptions.map((rx, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-xl">
                  <p className="font-medium">{rx.doctor_name || 'Prescription'}</p>
                  <p className="text-sm text-gray-500">{rx.date}</p>
                  {rx.file_url && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => window.open(rx.file_url, '_blank')}
                    >
                      View PDF
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No prescriptions</p>
                <p className="text-sm">Upload or receive prescriptions from doctors</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Saved Doctors Modal */}
      <Dialog open={showDoctorsModal} onOpenChange={setShowDoctorsModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="w-5 h-5" /> Saved Doctors
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {savedDoctors.length > 0 ? (
              savedDoctors.map((doc, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-xl flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-gray-500">{doc.specialization}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Heart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No saved doctors</p>
                <p className="text-sm">Save your favorite doctors for quick booking</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientPortal;
