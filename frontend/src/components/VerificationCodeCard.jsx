import React, { useState, useEffect } from 'react';
import { Copy, Check, RefreshCw, Shield, Info } from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * VerificationCodeCard - Displays verification codes for bookings
 * 
 * Code Names by Service:
 * - DiaGyn: Appointment Code (for check-in)
 * - Mango: Booking Code (for sample collection)
 * - Orange: Delivery Code (for delivery verification)
 */
const VerificationCodeCard = ({ 
  bookingId, 
  bookingType, // 'diagyn', 'mango', 'orange'
  code: initialCode,
  patientPhone,
  patientName,
  showResend = true,
  compact = false
}) => {
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [codeInfo, setCodeInfo] = useState(null);

  // Theme configurations by service type
  const themes = {
    diagyn: {
      codeName: 'Appointment Code',
      instruction: 'Share with clinic staff at check-in',
      icon: '🏥',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      textColor: 'text-teal-700',
      accentColor: 'bg-teal-600',
      lightAccent: 'text-teal-600'
    },
    mango: {
      codeName: 'Booking Code',
      instruction: 'Share with phlebotomist before sample collection',
      icon: '🧪',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      accentColor: 'bg-green-600',
      lightAccent: 'text-green-600'
    },
    orange: {
      codeName: 'Delivery Code',
      instruction: 'Share with delivery person to confirm delivery',
      icon: '📦',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-700',
      accentColor: 'bg-orange-500',
      lightAccent: 'text-orange-600'
    }
  };

  const theme = themes[bookingType] || themes.diagyn;

  // Fetch code info on mount if no initial code
  useEffect(() => {
    if (!initialCode && bookingId) {
      fetchCode();
    }
  }, [bookingId, initialCode]);

  const fetchCode = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/booking-code/get/${bookingId}`);
      if (response.ok) {
        const data = await response.json();
        setCode(data.code);
        setVerified(data.verified);
        setCodeInfo(data);
      }
    } catch (error) {
      console.error('Failed to fetch code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(`${theme.codeName} copied!`);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const handleResend = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/booking-code/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          booking_type: bookingType,
          patient_phone: patientPhone,
          patient_name: patientName
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCode(data.code);
        setVerified(false);
        toast.success(`New ${theme.codeName} sent!`);
      } else {
        toast.error('Failed to resend code');
      }
    } catch (error) {
      toast.error('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <div className={`${theme.bgColor} ${theme.borderColor} border rounded-xl p-4 ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
          <span className="text-green-700 font-medium">{theme.codeName} Verified</span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`${theme.bgColor} ${theme.borderColor} border rounded-xl p-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={`w-4 h-4 ${theme.lightAccent}`} />
            <span className={`text-sm font-medium ${theme.textColor}`}>{theme.codeName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-bold tracking-widest">{code || '----'}</span>
            <button
              onClick={handleCopy}
              disabled={!code}
              className={`p-1.5 rounded-lg ${theme.bgColor} hover:bg-opacity-80 transition-colors`}
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className={`w-4 h-4 ${theme.lightAccent}`} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${theme.bgColor} ${theme.borderColor} border rounded-2xl overflow-hidden`} data-testid="verification-code-card">
      {/* Header */}
      <div className={`${theme.accentColor} px-4 py-3 flex items-center gap-2`}>
        <Shield className="w-5 h-5 text-white" />
        <span className="text-white font-semibold">{theme.codeName}</span>
      </div>

      {/* Code Display */}
      <div className="p-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-4xl">{theme.icon}</span>
          <div 
            className="font-mono text-4xl font-bold tracking-[0.3em] select-all"
            data-testid="verification-code"
          >
            {loading ? (
              <span className="text-gray-400">----</span>
            ) : (
              code || '----'
            )}
          </div>
          <button
            onClick={handleCopy}
            disabled={!code || loading}
            className={`p-2 rounded-lg ${theme.bgColor} hover:bg-opacity-70 transition-colors disabled:opacity-50`}
            data-testid="copy-code-btn"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <Copy className={`w-5 h-5 ${theme.lightAccent}`} />
            )}
          </button>
        </div>

        {/* Instruction */}
        <div className={`flex items-start gap-2 p-3 rounded-lg bg-white/50 border ${theme.borderColor}`}>
          <Info className={`w-4 h-4 mt-0.5 ${theme.lightAccent} flex-shrink-0`} />
          <p className={`text-sm ${theme.textColor}`}>
            {theme.instruction}
          </p>
        </div>

        {/* Warning */}
        <p className="text-xs text-gray-500 mt-3 text-center">
          ⚠️ Do not share this code with anyone else
        </p>

        {/* Resend Button */}
        {showResend && (
          <button
            onClick={handleResend}
            disabled={loading}
            className={`w-full mt-4 py-2 px-4 rounded-lg border ${theme.borderColor} ${theme.textColor} hover:${theme.bgColor} transition-colors flex items-center justify-center gap-2 disabled:opacity-50`}
            data-testid="resend-code-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Sending...' : `Resend ${theme.codeName}`}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default VerificationCodeCard;
