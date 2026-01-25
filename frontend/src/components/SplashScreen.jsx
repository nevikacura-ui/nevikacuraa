import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Pill, Calendar, TestTube, Stethoscope, User, Phone, 
  Loader2, ArrowRight, Building2, LogIn
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const SplashScreen = ({ onComplete, user }) => {
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // login or signup
  const [loading, setLoading] = useState(false);
  
  // OTP Login states
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  
  // Animation state
  const [animationComplete, setAnimationComplete] = useState(false);
  
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
      toast.success(`Welcome, ${response.data.patient.name}!`);
      onComplete();
    } catch (error) {
      toast.error('Invalid OTP');
    }
    setLoading(false);
  };
  
  const handleExplore = () => {
    onComplete();
  };
  
  const handleStaffLogin = () => {
    navigate('/staff');
  };
  
  // Icons animation data - with disappearing effect
  const icons = [
    { Icon: Calendar, color: 'from-blue-500 to-indigo-500', label: 'Appointments', animDelay: '0s' },
    { Icon: Pill, color: 'from-orange-500 to-rose-500', label: 'Pharmacy', animDelay: '0.3s' },
    { Icon: TestTube, color: 'from-purple-500 to-pink-500', label: 'Lab Tests', animDelay: '0.6s' },
  ];
  
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 flex flex-col items-center justify-center p-6">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-md mx-auto">
        {/* Logo/Brand - Oval shaped with white background */}
        <div className="mb-8">
          <div className="bg-white rounded-[40px] px-8 py-6 shadow-xl shadow-black/20">
            <img 
              src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
              alt="Nevika Cura" 
              className="h-20 w-auto object-contain"
            />
          </div>
          <div className="h-1 w-20 bg-gradient-to-r from-teal-300 to-cyan-300 mx-auto rounded-full mt-4"></div>
        </div>
        
        {/* Animated Icons - Disappearing Effect */}
        <div className="flex justify-center gap-6 mb-8">
          {icons.map(({ Icon, color, label, animDelay }, idx) => (
            <div 
              key={idx}
              className="flex flex-col items-center gap-2 icon-disappear"
              style={{ animationDelay: animDelay }}
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center shadow-lg shadow-black/20 transform hover:scale-110 transition-transform`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              <span className="text-xs text-white/80 font-medium">{label}</span>
            </div>
          ))}
        </div>
        
        {/* Caption */}
        <p className="text-xl text-white/90 font-medium mb-10">
          Your own <span className="text-teal-200 font-bold">all-in-one</span> healthcare app
        </p>
        
        {/* Action Buttons */}
        {animationComplete && (
          <div className="space-y-4 animate-fade-in">
            {/* Login/Signup Button */}
            <Button
              onClick={() => setShowAuth(true)}
              className="w-full h-14 bg-white text-teal-700 hover:bg-teal-50 rounded-2xl text-lg font-semibold shadow-xl shadow-black/20"
              data-testid="splash-login-btn"
            >
              <User className="w-5 h-5 mr-2" />
              Login / Sign Up
            </Button>
            
            {/* Explore Button */}
            <Button
              onClick={handleExplore}
              variant="ghost"
              className="w-full h-12 text-white/90 hover:text-white hover:bg-white/10 rounded-2xl text-base"
            >
              Explore App
              <ArrowRight className="w-4 h-4 ml-2" />
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
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden z-[10000]">
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
