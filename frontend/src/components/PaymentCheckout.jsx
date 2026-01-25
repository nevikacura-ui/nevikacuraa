import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Loader2, Shield, BadgeCheck, ArrowRight, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Fee options for appointments
const CONSULTATION_FEES = {
  "NF": { label: "No Fees (Staff/Follow-up)", amount: 0 },
  "G1": { label: "General - First Visit", amount: 150 },
  "G2": { label: "General - Follow-up", amount: 100 },
  "S1": { label: "Speciality - First Visit", amount: 300 },
  "S2": { label: "Speciality - Follow-up", amount: 200 },
  "D1": { label: "Diabetes - First Visit", amount: 500 },
  "D2": { label: "Diabetes - Follow-up", amount: 400 },
  "D3": { label: "Diabetes - Follow-up (2nd)", amount: 300 },
  "O1": { label: "OBGY - First Visit", amount: 500 },
  "O2": { label: "OBGY - Follow-up", amount: 400 },
  "O3": { label: "OBGY - Follow-up (2nd)", amount: 300 },
  "E1": { label: "Emergency", amount: 600 }
};

// Categorized fee options for better UX
const FEE_CATEGORIES = [
  {
    category: "General Consultation",
    fees: ["G1", "G2"]
  },
  {
    category: "OBGY/Women's Health",
    fees: ["O1", "O2", "O3"]
  },
  {
    category: "Diabetes Care",
    fees: ["D1", "D2", "D3"]
  },
  {
    category: "Speciality",
    fees: ["S1", "S2"]
  },
  {
    category: "Emergency",
    fees: ["E1"]
  },
  {
    category: "Other",
    fees: ["NF"]
  }
];

export const FeeSelector = ({ selectedFee, onFeeSelect, doctorSpecialty }) => {
  // Suggest fee based on doctor specialty
  const getSuggestedFees = () => {
    if (doctorSpecialty?.toLowerCase().includes('diabetes')) {
      return ["D1", "D2", "D3"];
    }
    if (doctorSpecialty?.toLowerCase().includes('obgy') || doctorSpecialty?.toLowerCase().includes('gynec')) {
      return ["O1", "O2", "O3"];
    }
    return ["G1", "G2"];
  };

  const suggestedFees = getSuggestedFees();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
        <Shield className="w-4 h-4 text-teal-500" />
        <span>Select consultation type for fee</span>
      </div>

      <RadioGroup value={selectedFee} onValueChange={onFeeSelect} className="space-y-3">
        {FEE_CATEGORIES.map((cat) => (
          <div key={cat.category} className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {cat.category}
            </p>
            {cat.fees.map((code) => {
              const fee = CONSULTATION_FEES[code];
              const isSuggested = suggestedFees.includes(code);
              return (
                <div 
                  key={code}
                  className={`relative flex items-center p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedFee === code 
                      ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20' 
                      : 'border-slate-200 hover:border-teal-300 bg-white'
                  }`}
                  onClick={() => onFeeSelect(code)}
                >
                  <RadioGroupItem value={code} id={code} className="sr-only" />
                  <Label 
                    htmlFor={code} 
                    className="flex-1 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedFee === code ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
                      }`}>
                        {selectedFee === code && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-slate-800">{fee.label}</span>
                        {isSuggested && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-teal-100 text-teal-700 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`font-bold ${fee.amount === 0 ? 'text-green-600' : 'text-slate-800'}`}>
                      {fee.amount === 0 ? 'Free' : `₹${fee.amount}`}
                    </span>
                  </Label>
                </div>
              );
            })}
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

export const PaymentCheckout = ({ 
  paymentType, // 'appointment', 'pharmacy', 'lab_test'
  referenceId,
  feeCode,
  amount,
  patientName,
  patientPhone,
  description,
  onPaymentComplete,
  onPaymentCancel,
  onSkipPayment
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);

  const initiatePayment = async () => {
    if (amount === 0) {
      // No payment required
      onSkipPayment?.();
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/payments/create-checkout`, {
        payment_type: paymentType,
        reference_id: referenceId,
        fee_code: feeCode,
        origin_url: window.location.origin,
        patient_name: patientName,
        patient_phone: patientPhone
      });

      if (response.data.success) {
        if (!response.data.payment_required) {
          // No payment needed
          onSkipPayment?.();
        } else {
          // Redirect to Stripe checkout
          window.location.href = response.data.checkout_url;
        }
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      toast.error('Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 border-slate-200 rounded-2xl">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-teal-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Payment Summary</h3>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Consultation Fee</span>
          <span className="text-2xl font-bold text-slate-800 flex items-center">
            <IndianRupee className="w-5 h-5" />
            {amount}
          </span>
        </div>
      </div>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-4 mb-6 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-green-500" />
          Secure Payment
        </div>
        <div className="flex items-center gap-1">
          <BadgeCheck className="w-3 h-3 text-blue-500" />
          Stripe Powered
        </div>
      </div>

      <div className="space-y-3">
        {amount > 0 ? (
          <Button
            onClick={initiatePayment}
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white py-5 rounded-full font-semibold"
            data-testid="pay-now-btn"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Pay ₹{amount} Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => onSkipPayment?.()}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-5 rounded-full font-semibold"
            data-testid="continue-free-btn"
          >
            Continue (No Payment Required)
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {onPaymentCancel && (
          <Button
            variant="ghost"
            onClick={onPaymentCancel}
            className="w-full text-slate-500 hover:text-slate-700"
          >
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
};

// Payment result pages
export const PaymentSuccess = () => {
  const [status, setStatus] = useState('loading');
  const [paymentDetails, setPaymentDetails] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');

      if (!sessionId) {
        setStatus('error');
        return;
      }

      try {
        const response = await axios.get(`${API}/api/payments/status/${sessionId}`);
        if (response.data.payment_status === 'paid') {
          setStatus('success');
          setPaymentDetails(response.data);
        } else {
          setStatus('pending');
        }
      } catch (error) {
        console.error('Payment verification failed:', error);
        setStatus('error');
      }
    };

    verifyPayment();
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 p-4">
        <Card className="max-w-md w-full p-8 text-center rounded-3xl">
          <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BadgeCheck className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Payment Successful!</h1>
          <p className="text-slate-600 mb-6">
            Your payment of ₹{paymentDetails?.amount} has been received.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-sm text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Transaction ID</span>
              <span className="font-mono text-slate-700">{paymentDetails?.metadata?.reference_id?.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount</span>
              <span className="font-bold text-green-600">₹{paymentDetails?.amount}</span>
            </div>
          </div>
          <Button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-5 rounded-full"
          >
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50 p-4">
      <Card className="max-w-md w-full p-8 text-center rounded-3xl">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Payment Status</h1>
        <p className="text-slate-600 mb-6">
          {status === 'pending' 
            ? 'Your payment is being processed. Please wait.'
            : 'Unable to verify payment. Please contact support if amount was deducted.'}
        </p>
        <Button
          onClick={() => window.location.href = '/'}
          className="w-full bg-slate-800 text-white py-5 rounded-full"
        >
          Back to Home
        </Button>
      </Card>
    </div>
  );
};

export const PaymentCancel = () => {
  const params = new URLSearchParams(window.location.search);
  const paymentType = params.get('type');
  const referenceId = params.get('id');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-amber-50 p-4">
      <Card className="max-w-md w-full p-8 text-center rounded-3xl">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CreditCard className="w-10 h-10 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Payment Cancelled</h1>
        <p className="text-slate-600 mb-6">
          Your payment was cancelled. No amount has been charged.
        </p>
        <div className="space-y-3">
          <Button
            onClick={() => {
              if (paymentType === 'appointment') {
                window.location.href = '/diagyn';
              } else if (paymentType === 'pharmacy') {
                window.location.href = '/pharmacy';
              } else if (paymentType === 'lab_test') {
                window.location.href = '/proton';
              } else {
                window.location.href = '/';
              }
            }}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-5 rounded-full"
          >
            Try Again
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/'}
            className="w-full text-slate-500"
          >
            Back to Home
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PaymentCheckout;
