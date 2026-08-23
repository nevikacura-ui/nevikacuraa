import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * Unified Authentication Hook
 * Consolidates all auth methods into a single, simple interface for booking flows
 * 
 * Usage:
 *   const { 
 *     isVerified, 
 *     userInfo, 
 *     sendOtp, 
 *     verifyOtp, 
 *     reset 
 *   } = useUnifiedAuth();
 */
export const useUnifiedAuth = () => {
  const { user, setPatientAuth } = useAuth();
  
  // State
  const [isVerified, setIsVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [userInfo, setUserInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    verificationToken: null,
  });
  const [error, setError] = useState(null);

  // Start resend timer countdown
  const startResendTimer = useCallback(() => {
    setResendTimer(10);
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Send OTP via WhatsApp
   * @param {string} phone - 10-digit phone number
   * @param {string} purpose - 'appointment', 'pharmacy_order', 'lab_booking', etc.
   */
  const sendOtp = useCallback(async (phone, purpose = 'generic') => {
    setLoading(true);
    setError(null);
    
    try {
      // Clean phone number
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      
      if (cleanPhone.length !== 10) {
        throw new Error('Please enter a valid 10-digit phone number');
      }
      
      const response = await axios.post(`${API}/otp/sms/send`, {
        phone: cleanPhone,
        purpose
      });
      
      setOtpSent(true);
      setUserInfo(prev => ({ ...prev, phone: cleanPhone }));
      startResendTimer();
      
      toast.success('OTP sent via SMS!');
      
      return {
        success: true,
        message: response.data.message,
        phone: cleanPhone
      };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to send OTP';
      setError(errorMsg);
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [startResendTimer]);

  /**
   * Resend OTP
   */
  const resendOtp = useCallback(async (purpose = 'generic') => {
    if (resendTimer > 0) {
      toast.error(`Please wait ${resendTimer}s before resending`);
      return { success: false, error: 'Resend cooldown active' };
    }
    return sendOtp(userInfo.phone, purpose);
  }, [resendTimer, userInfo.phone, sendOtp]);

  /**
   * Verify OTP
   * @param {string} otp - 6-digit OTP code
   */
  const verifyOtp = useCallback(async (otp) => {
    setLoading(true);
    setError(null);
    
    try {
      const cleanOtp = otp.replace(/\D/g, '');
      
      if (cleanOtp.length !== 6) {
        throw new Error('Please enter a valid 6-digit OTP');
      }
      
      const response = await axios.post(`${API}/otp/sms/verify`, {
        phone: userInfo.phone,
        otp: cleanOtp
      });
      
      if (response.data.success) {
        setIsVerified(true);
        setUserInfo(prev => ({
          ...prev,
          verificationToken: `whatsapp_verified_${userInfo.phone}_${Date.now()}`
        }));
        
        toast.success('Phone verified successfully!');
        
        return {
          success: true,
          phone: userInfo.phone,
          verificationToken: `whatsapp_verified_${userInfo.phone}_${Date.now()}`
        };
      }
      
      throw new Error('Verification failed');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Invalid OTP';
      setError(errorMsg);
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [userInfo.phone]);

  /**
   * Update user info (name, email)
   */
  const updateUserInfo = useCallback((updates) => {
    setUserInfo(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Get complete user info for booking
   */
  const getBookingInfo = useCallback(() => {
    return {
      name: userInfo.name,
      phone: userInfo.phone,
      email: userInfo.email,
      verificationToken: userInfo.verificationToken,
      isVerified
    };
  }, [userInfo, isVerified]);

  /**
   * Reset auth state
   */
  const reset = useCallback(() => {
    setIsVerified(false);
    setOtpSent(false);
    setLoading(false);
    setResendTimer(0);
    setError(null);
    setUserInfo({
      name: user?.name || '',
      phone: user?.phone || '',
      email: user?.email || '',
      verificationToken: null,
    });
  }, [user]);

  /**
   * Quick auth check - if user is already logged in and verified
   */
  const isUserLoggedIn = Boolean(user);
  const canSkipVerification = Boolean(user?.phone && user?.verificationToken);

  return {
    // State
    isVerified,
    otpSent,
    loading,
    resendTimer,
    userInfo,
    error,
    isUserLoggedIn,
    canSkipVerification,
    
    // Actions
    sendOtp,
    resendOtp,
    verifyOtp,
    updateUserInfo,
    getBookingInfo,
    reset,
  };
};

/**
 * Guest Auth Component
 * A ready-to-use component for collecting user info and OTP verification
 */
export const GuestAuthForm = ({ 
  onVerified, 
  purpose = 'generic',
  showEmail = true,
  submitLabel = 'Continue'
}) => {
  const {
    isVerified,
    otpSent,
    loading,
    resendTimer,
    userInfo,
    sendOtp,
    resendOtp,
    verifyOtp,
    updateUserInfo
  } = useUnifiedAuth();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  
  const handleSendOtp = async () => {
    if (!userInfo.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    const result = await sendOtp(userInfo.phone, purpose);
    if (result.success) {
      // Focus first OTP input
      document.querySelector('[data-otp-index="0"]')?.focus();
    }
  };
  
  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');
    const result = await verifyOtp(otpValue);
    if (result.success && onVerified) {
      onVerified({
        name: userInfo.name,
        phone: userInfo.phone,
        email: userInfo.email,
        verificationToken: result.verificationToken
      });
    }
  };
  
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    
    if (value && index < 5) {
      document.querySelector(`[data-otp-index="${index + 1}"]`)?.focus();
    }
  };
  
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.querySelector(`[data-otp-index="${index - 1}"]`)?.focus();
    }
  };
  
  if (isVerified) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-gray-800">Phone Verified!</p>
        <p className="text-gray-500 text-sm">+91 {userInfo.phone}</p>
      </div>
    );
  }
  
  if (!otpSent) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input
            type="text"
            value={userInfo.name}
            onChange={(e) => updateUserInfo({ name: e.target.value })}
            placeholder="Enter your name"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            data-testid="guest-name-input"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number *</label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
              +91
            </span>
            <input
              type="tel"
              value={userInfo.phone}
              onChange={(e) => updateUserInfo({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              placeholder="10-digit number"
              className="flex-1 px-4 py-3 rounded-r-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              data-testid="guest-phone-input"
            />
          </div>
        </div>
        
        {showEmail && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
            <input
              type="email"
              value={userInfo.email}
              onChange={(e) => updateUserInfo({ email: e.target.value })}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              data-testid="guest-email-input"
            />
          </div>
        )}
        
        <button
          onClick={handleSendOtp}
          disabled={loading || !userInfo.name || userInfo.phone.length < 10}
          className="w-full py-4 rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-700 transition-colors"
          data-testid="send-otp-btn"
        >
          {loading ? 'Sending...' : submitLabel}
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <p className="text-gray-600">Enter the 6-digit code sent to</p>
        <p className="font-semibold">+91 {userInfo.phone}</p>
      </div>
      
      <div className="flex justify-center gap-2">
        {otp.map((digit, index) => (
          <input
            key={index}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(index, e)}
            data-otp-index={index}
            className="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            data-testid={`otp-input-${index}`}
          />
        ))}
      </div>
      
      <button
        onClick={handleVerifyOtp}
        disabled={loading || otp.join('').length !== 6}
        className="w-full py-4 rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-700 transition-colors"
        data-testid="verify-otp-btn"
      >
        {loading ? 'Verifying...' : 'Verify & Continue'}
      </button>
      
      <div className="text-center">
        {resendTimer > 0 ? (
          <p className="text-gray-500 text-sm">Resend OTP in {resendTimer}s</p>
        ) : (
          <button
            onClick={() => resendOtp(purpose)}
            disabled={loading}
            className="text-teal-600 text-sm font-medium hover:underline"
            data-testid="resend-otp-btn"
          >
            Resend OTP
          </button>
        )}
      </div>
    </div>
  );
};

export default useUnifiedAuth;
