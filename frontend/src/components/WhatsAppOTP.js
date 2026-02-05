import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { Loader2, MessageCircle, RefreshCw, Check, Phone } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * WhatsApp OTP Verification Component
 * 
 * Props:
 * - phone: Phone number to verify (required)
 * - purpose: Purpose of OTP (signup, guest_login, appointment, lab_booking, pharmacy_order, glydex, evara)
 * - onVerified: Callback when OTP is verified successfully
 * - onCancel: Callback when user cancels
 * - autoSend: Auto send OTP on mount (default: true)
 * - buttonText: Custom button text
 */
const WhatsAppOTP = ({ 
  phone, 
  purpose = 'verification',
  onVerified, 
  onCancel,
  autoSend = true,
  buttonText = 'Verify via WhatsApp'
}) => {
  const [step, setStep] = useState('idle'); // idle, sending, otp_sent, verifying, verified
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [mockOtp, setMockOtp] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState(null);
  const inputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto send OTP on mount if enabled
  useEffect(() => {
    if (autoSend && phone && step === 'idle') {
      sendOTP();
    }
  }, [phone, autoSend]);

  const sendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Valid phone number required');
      return;
    }
    
    setStep('sending');
    setError(null);
    
    try {
      const res = await axios.post(`${API}/api/otp/whatsapp/send`, {
        phone: phone,
        purpose: purpose
      });
      
      setStep('otp_sent');
      setCountdown(30); // 30 seconds before resend
      setMockOtp(res.data.mock ? res.data.otp : null);
      toast.success('OTP sent via WhatsApp!', {
        description: res.data.mock ? `Use code: ${res.data.otp}` : 'Check your WhatsApp'
      });
      
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setStep('idle');
      setError(err.response?.data?.detail || 'Failed to send OTP');
      toast.error('Failed to send OTP');
    }
  };

  const verifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }
    
    setStep('verifying');
    setError(null);
    
    try {
      const res = await axios.post(`${API}/api/otp/whatsapp/verify`, {
        phone: phone,
        otp: otpCode
      });
      
      setStep('verified');
      toast.success('Phone verified successfully!');
      
      if (onVerified) {
        onVerified({
          phone: res.data.phone,
          purpose: res.data.purpose
        });
      }
    } catch (err) {
      setStep('otp_sent');
      setError(err.response?.data?.detail || 'Invalid OTP');
      toast.error(err.response?.data?.detail || 'Invalid OTP');
      // Clear OTP fields
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only digits
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take only last digit
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-verify when all 6 digits entered
    if (index === 5 && value) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        setTimeout(() => verifyOTP(), 100);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
      setOtp(newOtp);
      if (pastedData.length === 6) {
        setTimeout(() => verifyOTP(), 100);
      }
    }
  };

  const resendOTP = async () => {
    setOtp(['', '', '', '', '', '']);
    setError(null);
    await sendOTP();
  };

  // Idle state - show send button
  if (step === 'idle') {
    return (
      <Button 
        onClick={sendOTP}
        className="w-full bg-green-500 hover:bg-green-600"
        data-testid="send-whatsapp-otp-btn"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        {buttonText}
      </Button>
    );
  }

  // Sending state
  if (step === 'sending') {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-green-500 mr-2" />
        <span className="text-gray-600">Sending OTP via WhatsApp...</span>
      </div>
    );
  }

  // Verified state
  if (step === 'verified') {
    return (
      <div className="flex items-center justify-center p-4 bg-green-50 rounded-lg">
        <Check className="w-6 h-6 text-green-500 mr-2" />
        <span className="text-green-700 font-medium">Phone Verified!</span>
      </div>
    );
  }

  // OTP input state
  return (
    <div className="space-y-4">
      {/* Phone number display */}
      <div className="flex items-center justify-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
        <Phone className="w-4 h-4" />
        <span className="text-sm">OTP sent to ******{phone.slice(-4)}</span>
      </div>
      
      {/* Mock OTP display (for testing) */}
      {mockOtp && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <p className="text-xs text-yellow-600 mb-1">Test Mode - Use this OTP:</p>
          <p className="text-2xl font-mono font-bold text-yellow-700 tracking-widest">{mockOtp}</p>
        </div>
      )}
      
      {/* OTP Input boxes */}
      <div className="flex justify-center gap-2">
        {otp.map((digit, index) => (
          <Input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            className="w-12 h-14 text-center text-2xl font-bold border-2 focus:border-green-500"
            data-testid={`otp-input-${index}`}
          />
        ))}
      </div>
      
      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}
      
      {/* Verify button */}
      <Button 
        onClick={verifyOTP}
        disabled={step === 'verifying' || otp.join('').length !== 6}
        className="w-full bg-green-500 hover:bg-green-600"
        data-testid="verify-otp-btn"
      >
        {step === 'verifying' ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            <Check className="w-4 h-4 mr-2" />
            Verify OTP
          </>
        )}
      </Button>
      
      {/* Resend option */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Didn't receive OTP?</span>
        {countdown > 0 ? (
          <span className="text-gray-400">Resend in {countdown}s</span>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resendOTP}
            className="text-green-600 hover:text-green-700"
            data-testid="resend-otp-btn"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Resend OTP
          </Button>
        )}
      </div>
      
      {/* Cancel option */}
      {onCancel && (
        <Button 
          variant="ghost" 
          onClick={onCancel}
          className="w-full text-gray-500"
        >
          Cancel
        </Button>
      )}
    </div>
  );
};

export default WhatsAppOTP;
