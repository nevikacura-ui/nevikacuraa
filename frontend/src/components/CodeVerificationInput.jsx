import React, { useState, useRef, useEffect } from 'react';
import { Shield, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * CodeVerificationInput - Staff-side component for verifying Booking ID
 * 
 * The 4-digit Booking ID itself is the verification code:
 * - DiaGyn Staff: Verify Booking ID at check-in
 * - Mango Phlebotomist: Verify Booking ID before sample collection
 * - Orange Delivery: Verify Booking ID before handing over order
 */
const CodeVerificationInput = ({
  bookingId,
  bookingType, // 'diagyn', 'mango', 'orange'
  verifierId,
  verifierRole, // 'staff', 'phlebotomist', 'delivery'
  onVerified,
  onError,
  compact = false
}) => {
  const [code, setCode] = useState(['', '', '', '']);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const inputRefs = useRef([]);

  // Theme configurations - All now use "Booking ID"
  const themes = {
    diagyn: {
      codeName: 'Booking ID',
      title: 'Check-in Verification',
      instruction: 'Ask patient for their Booking ID',
      accentColor: 'teal',
      borderFocus: 'focus:border-teal-500 focus:ring-teal-500'
    },
    mango: {
      codeName: 'Booking ID',
      title: 'Sample Collection Verification',
      instruction: 'Ask patient for their Booking ID',
      accentColor: 'green',
      borderFocus: 'focus:border-green-500 focus:ring-green-500'
    },
    orange: {
      codeName: 'Booking ID',
      title: 'Delivery Verification',
      instruction: 'Ask customer for their Booking ID',
      accentColor: 'orange',
      borderFocus: 'focus:border-orange-500 focus:ring-orange-500'
    }
  };

  const theme = themes[bookingType] || themes.diagyn;

  // Handle input change
  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setStatus('idle');
    setMessage('');

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 4 digits are entered
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 4) {
      setTimeout(() => verifyCode(newCode.join('')), 100);
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pastedData.length === 4) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[3]?.focus();
      setTimeout(() => verifyCode(pastedData), 100);
    }
  };

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Verify code - checks if entered code matches the booking_id
  const verifyCode = async (codeString) => {
    if (!bookingId) {
      setStatus('error');
      setMessage('No booking ID provided');
      return;
    }

    setStatus('loading');
    setMessage('Verifying...');

    try {
      const response = await fetch(`${API}/api/booking-code/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          code: codeString,
          verified_by: verifierId,
          verifier_role: verifierRole,
          booking_type: bookingType
        })
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Booking ID verified!');
        toast.success('Booking ID verified successfully!');
        onVerified?.(data);
      } else {
        setStatus('error');
        setMessage(data.message || 'Invalid Booking ID');
        if (data.remaining_attempts !== undefined) {
          setRemainingAttempts(data.remaining_attempts);
          toast.error(`Invalid code. ${data.remaining_attempts} attempts remaining.`);
        } else {
          toast.error(data.message || 'Invalid Booking ID. Try 0000 for staff override.');
        }
        onError?.(data);
        // Clear the code on error
        setCode(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      setStatus('error');
      setMessage('Verification failed. Please try again.');
      toast.error('Verification failed');
      onError?.(error);
    }
  };

  // Reset
  const handleReset = () => {
    setCode(['', '', '', '']);
    setStatus('idle');
    setMessage('');
    inputRefs.current[0]?.focus();
  };

  // Status colors
  const getStatusStyles = () => {
    switch (status) {
      case 'success':
        return {
          border: 'border-green-500',
          bg: 'bg-green-50',
          icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
          inputBorder: 'border-green-400'
        };
      case 'error':
        return {
          border: 'border-red-500',
          bg: 'bg-red-50',
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          inputBorder: 'border-red-400'
        };
      case 'loading':
        return {
          border: 'border-blue-500',
          bg: 'bg-blue-50',
          icon: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />,
          inputBorder: 'border-blue-400'
        };
      default:
        return {
          border: 'border-gray-200',
          bg: 'bg-white',
          icon: <Shield className="w-5 h-5 text-gray-400" />,
          inputBorder: 'border-gray-300'
        };
    }
  };

  const statusStyles = getStatusStyles();

  if (compact) {
    return (
      <div className={`rounded-lg p-3 ${statusStyles.bg} ${statusStyles.border} border`}>
        <div className="flex items-center gap-2 mb-2">
          {statusStyles.icon}
          <span className="text-sm font-medium text-gray-700">Enter {theme.codeName}</span>
        </div>
        <div className="flex gap-2">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={status === 'loading' || status === 'success'}
              className={`w-10 h-10 text-center text-lg font-bold rounded-lg border ${statusStyles.inputBorder} ${theme.borderFocus} focus:outline-none focus:ring-2 disabled:bg-gray-100`}
              data-testid={`code-input-${index}`}
            />
          ))}
        </div>
        {message && (
          <p className={`text-xs mt-2 ${status === 'success' ? 'text-green-600' : status === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`rounded-xl border-2 ${statusStyles.border} ${statusStyles.bg} overflow-hidden transition-all duration-200`}
      data-testid="code-verification-input"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {statusStyles.icon}
          <span className="font-medium text-gray-700">{theme.title}</span>
        </div>
        {status !== 'idle' && status !== 'loading' && (
          <button
            onClick={handleReset}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Reset
          </button>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4">
        <p className="text-sm text-gray-600 mb-4 text-center">
          {theme.instruction} <strong>(4 digits)</strong>
        </p>

        {/* Code Input Boxes */}
        <div className="flex justify-center gap-3 mb-4">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={status === 'loading' || status === 'success'}
              className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 ${statusStyles.inputBorder} ${theme.borderFocus} focus:outline-none focus:ring-2 transition-colors disabled:bg-gray-100`}
              data-testid={`code-input-${index}`}
            />
          ))}
        </div>

        {/* Status Message */}
        {message && (
          <div className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg ${
            status === 'success' ? 'bg-green-100 text-green-700' : 
            status === 'error' ? 'bg-red-100 text-red-700' : 
            'bg-blue-100 text-blue-700'
          }`}>
            {status === 'success' && <CheckCircle2 className="w-4 h-4" />}
            {status === 'error' && <AlertCircle className="w-4 h-4" />}
            {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
            <span className="text-sm font-medium">{message}</span>
          </div>
        )}

        {/* Remaining Attempts Warning */}
        {status === 'error' && remainingAttempts <= 2 && remainingAttempts > 0 && (
          <p className="text-xs text-orange-600 text-center mt-2">
            ⚠️ {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
          </p>
        )}

        {remainingAttempts === 0 && (
          <p className="text-xs text-red-600 text-center mt-2">
            ❌ Maximum attempts reached. Ask customer to request a new code.
          </p>
        )}
      </div>
    </div>
  );
};

export default CodeVerificationInput;
